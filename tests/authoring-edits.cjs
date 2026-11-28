const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {spawnSync, execFileSync} = require('node:child_process');
const {parseArgs} = require('node:util');
const {chromium} = require('@playwright/test');

const {positionals: [input], values} = parseArgs({
  allowPositionals: true,
  strict: false,
  options: {chromium: {type: 'string'}}
});
const source = path.resolve(input);
const directory = path.dirname(source);
const original = fs.readFileSync(source, 'utf8');

function edited(text, before, after) {
  assert(text.includes(before), `Missing edit anchor: ${before}`);
  return text.replace(before, after);
}

function render(name, text) {
  const file = path.join(directory, name + '.qmd');
  fs.writeFileSync(file, text);
  execFileSync('quarto', ['render', file], {stdio: 'inherit'});
  return pathToFileURL(path.join(directory, name + '.html')).href;
}

async function main() {
  let update = edited(original, 'branch-naming --dry-run', 'branch-naming --check');
  update = edited(update, '### Inspect the report', '### Check the generated files\n\nOpen `conventions.qmd`.\n\n### Inspect the report');
  update = edited(update, '### Place\n\nPut the lab next to its prerequisites.\n\n### Label\n\nUse the page title to tell learners what they will measure.',
    '### Label\n\nUse the page title to tell learners what they will measure.\n\n### Place\n\nPut the lab next to its prerequisites.');
  update = edited(update, 'Local preview"]', 'Preview the sample site"]');
  update = edited(update, 'Open them from the rendered page.', 'Open every link from the rendered page.');
  update = edited(update, 'For this illustrative model,', 'See the [junction notes](https://example.org/junction). For this illustrative model,');
  update = edited(update, '### Increase the reverse bias', '### Move to a larger reverse voltage');
  const updated = render('maintenance-update', update);
  const missing = render('missing-diagram-target', edited(original, 'sa-node="stop"', 'sa-node="missing"'));
  const customLevel = render('custom-slide-level', original
    .replace('    filters: [slide-animations]', '    filters: [slide-animations]\n    slide-level: 3\n    incremental: true')
    .replace(/^(#{2,3}) /gm, '#$1 '));
  const invalid = path.join(directory, 'duplicate-cue.qmd');
  fs.writeFileSync(invalid, edited(original, 'sa-cue="return-bias"', 'sa-cue="raise-bias"'));
  const failed = spawnSync('quarto', ['render', invalid], {encoding: 'utf8'});
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /\[editable-junction\]: duplicate cue 'raise-bias'/);

  const browser = await chromium.launch({executablePath: values.chromium, args: ['--allow-file-access-from-files']});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 720}, reducedMotion: 'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    async function go(url, id) {
      await page.goto(url + '#/' + id);
      await page.waitForFunction(slide => window.Reveal?.isReady() && Reveal.getCurrentSlide().id === slide, id);
      await page.evaluate(() => {
        const {h, v} = Reveal.getIndices();
        Reveal.slide(h, v, -1);
      });
    }
    async function next() {
      assert.equal(await page.evaluate(() => Reveal.nextFragment()), true);
    }
    const current = () => page.locator('section.present .current-fragment').first();
    await go(updated, 'editable-folder-check');
    assert.equal(await page.locator('#editable-folder-check aside.notes').count(), 1);
    const sourcePanel = page.locator('#editable-folder-check .sa-walkthrough-columns > .sa-panel');
    const chrome = await sourcePanel.evaluate(panel => {
      const style = getComputedStyle(panel);
      return {padding: parseFloat(style.paddingInlineStart), border: style.borderInlineStartWidth};
    });
    assert(chrome.padding > 12, 'Reveal reset removed the card padding');
    assert.equal(chrome.border, '1px');
    assert.equal(await sourcePanel.locator('.sa-filetree .sa-directory').textContent().then(text => text.trim()), 'images/');
    assert.equal(await sourcePanel.locator('.sa-filetree li > ul .sa-file').textContent().then(text => text.trim()), 'branch-map.svg');
    await next();
    assert.match(await current().textContent(), /branch-naming --check/);
    await next();
    assert.match(await current().textContent(), /Check the generated files/);
    await next();
    assert.match(await current().textContent(), /Inspect the report/);
    assert.equal(await current().locator('pre.numberSource').count(), 1);
    await next();
    assert.match(await current().textContent(), /Read warnings/);

    await go(updated, 'editable-curator');
    await next();
    assert.match(await current().textContent(), /Choose/);
    await next();
    assert.match(await current().textContent(), /Label/);

    await go(updated, 'editable-publish');
    await page.waitForFunction(() => document.querySelector('#editable-publish-diagram').dataset.saReady === 'true');
    assert.match(await page.locator('#editable-publish-diagram svg').textContent(), /Preview the sample site/);
    assert.equal(await page.locator('#editable-publish-diagram .node.sa-element-hidden').count(), 3);
    await next();
    assert.match(await current().textContent(), /Open every link/);
    await next();
    assert.equal(await page.locator('#editable-publish-diagram path.sa-element-hidden').count(), 1);
    assert.equal(await page.locator('#editable-publish-diagram #approved.sa-element:not(.sa-element-hidden)').count(), 1);
    assert.equal(await page.locator('#editable-publish-diagram .edgeLabel.sa-element:not(.sa-element-hidden)').filter({hasText: 'Verified'}).count(), 1);
    await next();
    assert.equal(await page.locator('#editable-publish-diagram path.sa-element-hidden').count(), 0);

    await page.emulateMedia({reducedMotion: 'no-preference'});
    await go(updated, 'editable-place-before');
    const origin = await page.locator('#editable-place-before [data-id="moving-devices"]').boundingBox();
    const fixed = await page.locator('#editable-place-before [data-sa-qa-fixed="materials"]').boundingBox();
    await page.evaluate(() => Reveal.next());
    await page.waitForFunction(() =>
      Reveal.getCurrentSlide().id === 'editable-place-after' &&
      Reveal.getCurrentSlide().querySelector('[data-id="moving-devices"]').hasAttribute('data-auto-animate-target')
    );
    await page.waitForFunction(x => Reveal.getCurrentSlide().querySelector('[data-id="moving-devices"]')
      .getBoundingClientRect().left > x + 150, origin.x);
    const settled = await page.locator('#editable-place-after [data-sa-qa-fixed="materials"]').boundingBox();
    assert.equal(await page.locator('#editable-place-after .sa-filetree [data-id="moving-devices"]').count(), 1);
    for (const dimension of Object.keys(fixed)) assert(Math.abs(fixed[dimension] - settled[dimension]) < 1);
    await page.emulateMedia({reducedMotion: 'reduce'});

    await go(updated, 'editable-quiz');
    assert.equal(await page.locator('#editable-quiz math').isVisible(), false);
    await next();
    await next();
    await next();
    assert.equal(await page.locator('#editable-quiz math').isVisible(), true);
    assert.equal(await page.getByRole('link', {name: 'junction notes'}).getAttribute('href'), 'https://example.org/junction');

    await go(updated, 'editable-junction');
    await next();
    assert.match(await current().textContent(), /Move to a larger reverse voltage/);
    assert.equal(await page.locator('#editable-junction-plot').getAttribute('data-width'), '164');

    await go(missing, 'editable-publish');
    await page.waitForSelector('#editable-publish-diagram svg', {state: 'attached'});
    assert.equal(await page.locator('#editable-publish-diagram').getAttribute('data-sa-ready'), 'false');
    assert.match(await page.locator('#editable-publish-diagram').getAttribute('data-sa-bind-details'), /node missing \(explanation 4\)/);

    await go(customLevel, 'editable-folder-check');
    await next();
    assert.match(await current().textContent(), /dry run/);
    assert.equal(await page.locator('#editable-folder-check .sa-panel li.fragment').count(), 0);
    assert.equal(await page.locator('#editable-reference .sa-author-scene').count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
  console.log('Markdown maintenance edits, diagnostic cases, and custom slide level passed.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
