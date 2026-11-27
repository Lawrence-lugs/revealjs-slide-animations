#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {parseArgs} = require('node:util');
const {chromium} = require('@playwright/test');

const usage = `Usage: npm run qa:deck -- <deck.html|URL> [options]
  --out DIR           Screenshots and JSON report (default test-results/deck-qa)
  --viewport WxH      Repeat to override the defaults (1280x720 and 1024x768)
  --settle-ms N       Wait after navigation for custom transitions (default 1000)
  --timeout-ms N      Readiness timeout for deck and bindings (default 15000)
  --expect-count N    Expected number of slides, including title and dividers
  --no-screenshots    Skip screenshots
  --chromium PATH     Use an existing Chromium executable
  --help              Show this message`;

function integer(value, name, minimum) {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}`);
  }
  return Number(value);
}

function readOptions() {
  const {values, positionals} = parseArgs({
    allowPositionals: true,
    options: {
      help: {type: 'boolean'}, out: {type: 'string', default: 'test-results/deck-qa'},
      viewport: {type: 'string', multiple: true, default: ['1280x720', '1024x768']},
      'settle-ms': {type: 'string', default: '1000'},
      'timeout-ms': {type: 'string', default: '15000'},
      'expect-count': {type: 'string'},
      'no-screenshots': {type: 'boolean'},
      chromium: {type: 'string'}
    }
  });
  if (values.help) return null;
  if (positionals.length !== 1) throw new Error(usage);
  const [input] = positionals;
  const url = /^https?:\/\//i.test(input) ? new URL(input) : pathToFileURL(path.resolve(input));
  url.hash = '';
  const viewports = values.viewport.map(size => {
    if (!/^\d+x\d+$/.test(size)) throw new Error(`Invalid viewport ${size}`);
    const [width, height] = size.split('x').map(dimension => integer(dimension, 'viewport dimension', 1));
    return {width, height};
  });
  return {
    url, viewports, out: path.resolve(values.out),
    settle: integer(values['settle-ms'], '--settle-ms', 0),
    timeout: integer(values['timeout-ms'], '--timeout-ms', 1),
    expectedCount: values['expect-count'] === undefined ? undefined :
      integer(values['expect-count'], '--expect-count', 1),
    screenshots: !values['no-screenshots'], executablePath: values.chromium
  };
}

async function loadDeck(page, url, options, fail) {
  page.on('pageerror', error => fail(error.message));
  page.on('console', message => {
    if (message.type() === 'error') fail(message.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) fail(`HTTP ${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') {
      fail(`${request.failure()?.errorText} ${request.url()}`);
    }
  });
  await page.goto(url.href, {timeout: options.timeout, waitUntil: 'load'});
  await page.waitForFunction(() => window.Reveal?.isReady(), null, {timeout: options.timeout});
  assert(await page.evaluate(() => window.SlideAnimations &&
    Reveal.getPlugin('slide-animations')), 'SlideAnimations is missing or unregistered');
  await page.evaluate(() => document.fonts.ready);
  try {
    await page.waitForFunction(() =>
      [...document.querySelectorAll('[data-sa-ready], script[data-sa-elements]')].every(el =>
        el.tagName === 'SCRIPT' ? el.dataset.saBound === 'true' : el.dataset.saReady === 'true'
      ), null, {timeout: options.timeout});
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
  }
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('[data-sa-ready="false"], script[data-sa-elements]:not([data-sa-bound="true"])')].map(el =>
      el.tagName === 'SCRIPT' ? el.textContent.trim() : `${el.id || el.tagName}: ${el.dataset.saMissing}`
    )
  );
  for (const target of broken) fail(`Unresolved animation binding: ${target}`);
}

function listSlides() {
  return Reveal.getSlides().map(slide => {
    const {h, v = 0} = Reveal.getIndices(slide);
    const fragments = [...new Set([...slide.querySelectorAll('.fragment[data-fragment-index]')]
      .map(fragment => Number(fragment.dataset.fragmentIndex)))].sort((a, b) => a - b);
    return {h, v, id: slide.id, title: slide.querySelector('h1, h2, h3')?.textContent.trim(),
      steps: [-1, ...fragments]};
  });
}

function readState() {
  const slide = Reveal.getCurrentSlide();
  const elements = [...slide.querySelectorAll('.fragment, .sa-element, [data-sa-qa]')];
  return {
    indices: {...Reveal.getIndices(), f: Reveal.getIndices().f ?? -1},
    unresolved: [...slide.querySelectorAll('[data-sa-ready="false"]')]
      .map(el => ({id: el.id, missing: el.dataset.saMissing})),
    elements: elements.map(el => {
      const style = getComputedStyle(el);
      const state = {
        id: el.id || null,
        visible: el.classList.contains('visible'),
        current: el.classList.contains('current-fragment'),
        hidden: el.classList.contains('sa-element-hidden'),
        dim: el.classList.contains('sa-element-dim'),
        flow: el.classList.contains('sa-element-flow'),
        opacity: style.opacity, visibility: style.visibility,
        color: style.color, background: style.backgroundColor,
        strokeDashoffset: el.matches('.sa-draw') ? style.strokeDashoffset : undefined
      };
      // Mark an element with data-sa-qa to include custom attributes and text.
      if (el.hasAttribute('data-sa-qa')) {
        state.custom = [...el.attributes].filter(attribute => attribute.name !== 'class')
          .map(attribute => [attribute.name, attribute.value]);
        state.text = el.textContent.trim();
      }
      return state;
    })
  };
}

function findOverflow() {
  const slide = Reveal.getCurrentSlide();
  const frame = document.querySelector('.reveal').getBoundingClientRect();
  const width = Math.min(frame.right, innerWidth);
  const height = Math.min(frame.bottom, innerHeight);
  const overflow = [];
  for (const el of slide.querySelectorAll('*')) {
    if ((el instanceof SVGElement && el.tagName !== 'svg') ||
        el.closest('.speaker-notes, aside.notes, .sa-trigger, [data-sa-qa-ignore-overflow]')) continue;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) continue;
    if (el.checkVisibility && !el.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})) continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    // Ignore descendants clipped by a scroll container. Check the container itself.
    const clipped = el.parentElement?.closest('pre');
    if (clipped && clipped !== el) continue;
    const exceeds = Math.max(frame.left - rect.left, frame.top - rect.top,
      rect.right - width, rect.bottom - height);
    if (exceeds > 3) overflow.push({element: el.id || el.tagName, pixels: Math.round(exceeds)});
    if (overflow.length === 12) break;
  }
  return overflow;
}

function checkMotion(print) {
  const scope = print ? document : Reveal.getCurrentSlide();
  const elements = scope.querySelectorAll('.sa-flow, .sa-element-flow, .sa-draw, .sa-element, .sa-focus, .sa-focus-plain, .sa-highlight, [class*="sa-enter-"]');
  return [...elements].filter(el => {
    const style = getComputedStyle(el);
    if (style.animationName.split(',').some(name => name.trim() === 'sa-flow')) return true;
    if (print) {
      if (el.matches('.sa-draw')) return parseFloat(style.strokeDashoffset) !== 0;
      return el.matches('.sa-element, .sa-focus, .sa-focus-plain') && style.opacity !== '1';
    }
    return style.transitionDuration.split(',').some(duration => parseFloat(duration) > 0);
  }).map(el => el.id || (el.getAttribute('class') ?? el.tagName));
}

async function inspectSlides(page, mode, options, result, fail, capture) {
  const slides = await page.evaluate(listSlides);
  if (options.expectedCount !== undefined && slides.length !== options.expectedCount) {
    fail(`Expected ${options.expectedCount} slides, got ${slides.length}`);
  }
  async function jump(slide, step) {
    await page.evaluate(({h, v, step}) => Reveal.slide(h, v, step), {...slide, step});
  }
  const pause = () => page.waitForTimeout(options.settle);
  for (const [number, slide] of slides.entries()) {
    const key = `${slide.h}-${slide.v}`;
    const states = [];
    result.slides.push({...slide, states});
    await jump(slide, -1);
    for (const [index, step] of slide.steps.entries()) {
      if (index) await page.evaluate(() => Reveal.nextFragment());
      await pause();
      const state = await page.evaluate(readState);
      if (state.indices.h !== slide.h || state.indices.v !== slide.v || state.indices.f !== step) {
        fail(`${key} forward step ${step} reached ${JSON.stringify(state.indices)}`);
      }
      if (state.unresolved.length) fail(`${key} step ${step} has unresolved targets: ${JSON.stringify(state.unresolved)}`);
      const overflow = mode === 'screen' ? await page.evaluate(findOverflow) : [];
      if (overflow.length) fail(`${key} step ${step} overflows: ${JSON.stringify(overflow)}`);
      if (mode === 'reduced') {
        const moving = await page.evaluate(checkMotion, false);
        if (moving.length) fail(`${key} step ${step} has motion in reduced mode: ${moving.join(', ')}`);
      }
      states.push(state);
      await capture(`slide-${key}-step-${index}.png`);
    }

    // Exercise navigation separately so the saved screenshots are the forward sequence.
    if (mode !== 'screen') continue;
    async function compare(index, navigation) {
      await pause();
      const actual = await page.evaluate(readState);
      try {
        assert.deepEqual(actual, states[index]);
      } catch {
        fail(`${key} step ${slide.steps[index]} differs after ${navigation}`);
      }
    }
    for (let index = slide.steps.length - 2; index >= 0; index--) {
      await page.evaluate(() => Reveal.prevFragment());
      await compare(index, 'backward navigation');
    }
    const last = slide.steps.length - 1;
    await jump(slide, slide.steps[last]);
    await compare(last, 'direct fragment jump');
    if (last) {
      await page.evaluate(() => {
        Reveal.prevFragment();
        Reveal.nextFragment();
        Reveal.prevFragment();
      });
      await compare(last - 1, 'rapid clicks');
    }
    if (slides.length > 1) {
      await jump(slides[(number + 1) % slides.length], -1);
      await jump(slide, slide.steps[last]);
      await compare(last, 'slide re-entry');
    }
  }
}

async function run() {
  const options = readOptions();
  if (!options) return console.log(usage);
  await fs.mkdir(options.out, {recursive: true});
  const browser = await chromium.launch({
    executablePath: options.executablePath,
    args: options.url.protocol === 'file:' ? ['--allow-file-access-from-files'] : []
  });
  const report = {url: options.url.href, runs: []};

  async function check(name, viewport, mode) {
    const result = {name, viewport, problems: [], slides: []};
    report.runs.push(result);
    const fail = message => {
      if (!result.problems.includes(message)) result.problems.push(message);
    };
    const folder = path.join(options.out, name);
    const page = await browser.newPage({viewport, reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference'});
    const capture = async (filename, fullPage = false) => {
      if (options.screenshots) {
        await fs.mkdir(folder, {recursive: true});
        await page.screenshot({path: path.join(folder, filename), fullPage});
      }
    };
    try {
      const url = new URL(options.url);
      if (mode === 'print') {
        url.searchParams.set('print-pdf', '');
        await page.emulateMedia({media: 'print'});
      }
      await loadDeck(page, url, options, fail);
      if (mode === 'print') {
        await page.waitForSelector('.pdf-page', {state: 'attached', timeout: options.timeout});
        result.pages = await page.locator('.pdf-page').count();
        const moving = await page.evaluate(checkMotion, true);
        if (moving.length) fail(`Print animation/focus fallback: ${moving.join(', ')}`);
        await capture('print.png', true);
      } else {
        await inspectSlides(page, mode, options, result, fail, capture);
      }
    } catch (error) {
      fail(error.message);
    } finally {
      await page.close();
    }
    const total = mode === 'print' ? `${result.pages ?? 0} PDF pages` : `${result.slides.length} slides`;
    console.log(`${name}: ${total}, ${result.problems.length} problems`);
    for (const problem of result.problems) console.error(`  ${problem}`);
  }
  try {
    for (const viewport of options.viewports) {
      await check(`screen-${viewport.width}x${viewport.height}`, viewport, 'screen');
    }
    await check('reduced-motion', options.viewports[0], 'reduced');
    await check('print', options.viewports[0], 'print');
  } finally {
    await browser.close();
    await fs.writeFile(path.join(options.out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  }
  if (report.runs.some(result => result.problems.length)) process.exitCode = 1;
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
