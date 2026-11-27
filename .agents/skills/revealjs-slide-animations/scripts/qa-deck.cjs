#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {parseArgs} = require('node:util');
const {chromium} = require('@playwright/test');
const inspectGeometry = require('./geometry.cjs');
const changedSlides = require('./changed-slides.cjs');

const usage = `Usage: npm run qa:deck -- <deck.html|URL> [options]
  --out DIR           Screenshots and JSON report (default test-results/deck-qa)
  --full              Run navigation, second viewport, reduced-motion and print checks
  --slide ID|H-V      Repeat to select slide IDs or Reveal coordinates
  --steps LIST        Comma-separated fragment indices, including initial
  --changed-only REF  Compare QMD against this Git ref (requires --source)
  --source FILE       QMD associated with the rendered deck
  --no-print          Skip the full run’s print pass
  --viewport WxH      Repeat to override the viewport (default 1280x720, plus 1024x768 in full mode)
  --settle-ms N       Wait after navigation (default two frames, or 1000 ms with --full)
  --timeout-ms N      Readiness timeout for deck and bindings (default 15000)
  --expect-count N    Expected number of slides, including title and dividers
  --screenshots       Save screenshots (enabled by default with --full)
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
      full: {type: 'boolean'},
      slide: {type: 'string', multiple: true},
      steps: {type: 'string'},
      'changed-only': {type: 'string'},
      source: {type: 'string'},
      'no-print': {type: 'boolean'},
      viewport: {type: 'string', multiple: true},
      'settle-ms': {type: 'string'},
      'timeout-ms': {type: 'string', default: '15000'},
      'expect-count': {type: 'string'},
      screenshots: {type: 'boolean'},
      'no-screenshots': {type: 'boolean'},
      chromium: {type: 'string'}
    }
  });
  if (values.help) return null;
  if (positionals.length !== 1) throw new Error(usage);
  const [input] = positionals;
  const url = /^https?:\/\//i.test(input) ? new URL(input) : pathToFileURL(path.resolve(input));
  url.hash = '';
  const full = Boolean(values.full);
  const sizes = values.viewport ?? (full ? ['1280x720', '1024x768'] : ['1280x720']);
  const viewports = sizes.map(size => {
    if (!/^\d+x\d+$/.test(size)) throw new Error(`Invalid viewport ${size}`);
    const [width, height] = size.split('x').map(dimension => integer(dimension, 'viewport dimension', 1));
    return {width, height};
  });
  return {
    url, viewports, full, out: path.resolve(values.out),
    selectors: values.slide,
    steps: values.steps?.split(',').map(step => {
      step = step.trim();
      return step === 'initial' ? -1 : integer(step, '--steps index', 0);
    }),
    changed: values['changed-only'] === undefined ? null : changedSlides(values['changed-only'], values.source),
    print: full && !values['no-print'],
    settle: integer(values['settle-ms'] ?? (full ? '1000' : '0'), '--settle-ms', 0),
    timeout: integer(values['timeout-ms'], '--timeout-ms', 1),
    expectedCount: values['expect-count'] === undefined ? undefined :
      integer(values['expect-count'], '--expect-count', 1),
    screenshots: !values['no-screenshots'] && (full || values.screenshots),
    executablePath: values.chromium
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
  const slides = await page.evaluate(listSlides);
  const coordinates = url.searchParams.has('print-pdf') ? null :
    selectSlides(slides, options).map(({h, v}) => [h, v]);
  function unresolved(selection) {
    const sections = selection?.map(([h, v]) => Reveal.getSlide(h, v));
    return [...document.querySelectorAll('[data-sa-ready="false"], script[data-sa-bound="false"]')]
      .filter(el => {
        if (!sections) return true;
        let scope = el;
        if (el.localName === 'script') {
          try {
            scope = document.querySelector(JSON.parse(el.textContent).scope) ?? el;
          } catch { /* Retain the script's own scope for malformed config. */ }
        }
        return sections.some(section => section?.contains(scope));
      }).map(el => el.localName === 'script' ? el.textContent.trim()
        : `${el.id || el.localName}: ${el.dataset.saBindDetails || el.dataset.saMissing}`);
  }
  // Pending diagrams may emit an SVG later. Broken config scripts already
  // produced a console diagnostic and cannot recover, so avoid waiting on them.
  await page.waitForFunction(selection => {
    const sections = selection?.map(([h, v]) => Reveal.getSlide(h, v)) ?? [document];
    return sections.every(section => section &&
      !section.matches?.('[data-sa-ready="false"]') && !section.querySelector('[data-sa-ready="false"]'));
  }, coordinates, {timeout: options.timeout}).catch(error => {
    if (error.name !== 'TimeoutError') throw error;
  });
  const broken = await page.evaluate(unresolved, coordinates);
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

function selectSlides(slides, options) {
  const bySelector = selector => slides.find(slide => slide.id === selector.replace(/^#/, '')) ??
    slides.find(slide => `${slide.h}-${slide.v}` === selector);
  const explicit = options.selectors?.map(selector => {
    const slide = bySelector(selector);
    if (!slide) throw new Error(`Unknown slide ${selector}`);
    return slide;
  });
  let changed = options.changed?.map(id => bySelector('#' + id));
  if (changed?.some(slide => !slide)) {
    console.warn('The rendered deck lacks a changed QMD ID. Scanning the requested deck scope.');
    changed = null;
  }
  return [...new Set((explicit ?? slides).filter(slide => !changed || changed.includes(slide)))];
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

function auditFragments() {
  const slide = Reveal.getCurrentSlide();
  const beats = JSON.parse(slide.dataset.saBeats || '{}');
  const fragments = [...slide.querySelectorAll('.fragment[data-fragment-index]')];
  const indices = new Set(fragments.map(el => Number(el.dataset.fragmentIndex)));
  const bindings = [...slide.querySelectorAll('[data-sa-steps]')];
  if (slide.hasAttribute('data-sa-steps')) bindings.push(slide);
  const driven = new Set(bindings.flatMap(el => (el.dataset.saSteps || '').split(',').filter(Boolean).map(Number)));
  const findings = [];
  for (const [beat, index] of Object.entries(beats)) {
    const group = fragments.filter(el => Number(el.dataset.fragmentIndex) === index);
    if (!group.length || group.some(el => (el.dataset.saBeat ?? el.dataset.saGeneratedBeat ?? beat) !== beat)) {
      findings.push({severity: 'error', message: `Beat ${beat} is missing or grouped at the wrong index ${index}`});
    }
    if (group.length && group.every(el => el.matches('.sa-trigger')) && !driven.has(index)) {
      findings.push({severity: 'error', message: `Beat ${beat} creates an empty click at index ${index}`});
    }
  }
  for (const binding of bindings) {
    if (binding.dataset.saStepConflicts) {
      findings.push({severity: 'error', message: `Binding ${binding.id || binding.localName} repeats step ${binding.dataset.saStepConflicts}`});
    }
  }
  for (const index of driven) {
    if (!indices.has(index)) findings.push({severity: 'error', message: `Binding step ${index} has no fragment group`});
  }
  for (const index of indices) {
    if (index > 0 && !indices.has(index - 1)) {
      findings.push({severity: 'error', message: `Fragment index gap before ${index}`});
    }
  }
  for (const el of fragments) {
    if (el.matches('[data-sa-beat], [data-sa-generated-beat], [data-sa-purpose], .sa-trigger') ||
        driven.has(Number(el.dataset.fragmentIndex))) continue;
    findings.push({severity: 'review', message: `Check purpose of ${el.id || el.localName} at index ${el.dataset.fragmentIndex}`});
  }
  return findings;
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
  const pause = () => options.settle
    ? page.waitForTimeout(options.settle)
    : page.evaluate(() => new Promise(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
  const selection = selectSlides(slides, options);
  const fixed = new Map();
  for (const slide of selection) {
    const number = slides.indexOf(slide);
    const key = slide.id ? `#${slide.id} (${slide.h}-${slide.v})` : `${slide.h}-${slide.v}`;
    const states = [];
    const layouts = [];
    const requested = options.steps ? [...new Set(options.steps)].sort((a, b) => a - b) : slide.steps;
    const steps = requested.filter(step => slide.steps.includes(step));
    if (requested.length !== steps.length && options.selectors?.length === 1) {
      fail(`${key} has no step(s) ${requested.filter(step => !steps.includes(step)).join(', ')}`);
    }
    if (!steps.length) continue;
    result.slides.push({...slide, states, layouts, checkedSteps: steps});
    await jump(slide, -1);
    const fragments = await page.evaluate(auditFragments);
    result.slides.at(-1).fragments = fragments;
    for (const finding of fragments) {
      if (finding.severity === 'error') fail(`${key} ${finding.message}`);
    }
    for (const [index, step] of steps.entries()) {
      if (options.steps) await jump(slide, step);
      else if (index) await page.evaluate(() => Reveal.nextFragment());
      await pause();
      const state = await page.evaluate(readState);
      if (state.indices.h !== slide.h || state.indices.v !== slide.v || state.indices.f !== step) {
        fail(`${key} forward step ${step} reached ${JSON.stringify(state.indices)}`);
      }
      if (state.unresolved.length) fail(`${key} step ${step} has unresolved targets: ${JSON.stringify(state.unresolved)}`);
      if (mode === 'screen') {
        const layout = await page.evaluate(inspectGeometry);
        for (const item of layout.fixed) {
          const baseline = fixed.get(item.name);
          if (!baseline) fixed.set(item.name, {...item, slide: key, step});
          else {
            const drift = Math.max(...item.bounds.map((value, i) => Math.abs(value - baseline.bounds[i])));
            if (drift > 3) layout.problems.push({type: 'layout-drift', element: item.name, pixels: Math.round(drift),
              baselineSlide: baseline.slide, baselineStep: baseline.step});
          }
        }
        layouts.push({step, ...layout});
        if (layout.problems.length) fail(`${key} step ${step} geometry: ${JSON.stringify(layout.problems)}`);
      }
      if (mode === 'reduced') {
        const moving = await page.evaluate(checkMotion, false);
        if (moving.length) fail(`${key} step ${step} has motion in reduced mode: ${moving.join(', ')}`);
      }
      states.push(state);
      await capture(`slide-${slide.h}-${slide.v}-step-${slide.steps.indexOf(step)}.png`);
    }

    // Exercise navigation separately so the saved screenshots are the forward sequence.
    if (!options.full || options.steps || mode !== 'screen') continue;
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
  const report = {url: options.url.href, mode: options.full ? 'full' : 'smoke', runs: []};
  console.log(`Running ${report.mode} deck checks`);

  async function check(name, viewport, mode) {
    const result = {name, viewport, problems: [], slides: []};
    report.runs.push(result);
    const fail = message => {
      if (!result.problems.includes(message)) result.problems.push(message);
    };
    const folder = path.join(options.out, name);
    const reducedMotion = !options.full || mode === 'reduced' ? 'reduce' : 'no-preference';
    const page = await browser.newPage({viewport, reducedMotion});
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
      if (!options.full) {
        // Smoke checks inspect settled layout. Reveal's Auto-Animate can still run
        // while prefers-reduced-motion is set, so disable its slide transitions.
        await page.evaluate(() => Reveal.configure({autoAnimate: false, transition: 'none'}));
      }
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
    if (options.full) {
      await check('reduced-motion', options.viewports[0], 'reduced');
      if (options.print) await check('print', options.viewports[0], 'print');
    }
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
