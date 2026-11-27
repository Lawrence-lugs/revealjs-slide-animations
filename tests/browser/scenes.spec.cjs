const {test, expect} = require('@playwright/test');
const inspectGeometry = require('../../.agents/skills/revealjs-slide-animations/scripts/geometry.cjs');

async function go(page, id) {
  await page.goto('/scene-gallery.html#/' + id);
  await page.waitForFunction(() => window.Reveal?.isReady());
}

test('named beats, generated triggers and hand-authored groups share Reveal clicks', async ({page}) => {
  await go(page, 'curate-exhibit');
  const names = await page.evaluate(() => JSON.parse(Reveal.getCurrentSlide().dataset.saBeats));
  expect(names).toEqual({select: 0, place: 1, label: 2, takeaway: 3});
  await page.evaluate(() => {
    Reveal.slide(Reveal.getIndices(document.querySelector('#sample-logic')).h, 0, -1);
  });
  await page.evaluate(() => Reveal.nextFragment());
  await expect(page.locator('#sample-logic .current-fragment')).toHaveCount(2);
  await expect(page.locator('#sample-logic .current-fragment').last()).toContainText('captures a 1');
  const generated = await page.evaluate(() => {
    const target = document.querySelector('#pick-folder');
    const {h,v} = Reveal.getIndices(target);
    Reveal.slide(h,v,-1);
    SlideAnimations.bindBeats(target, {beats: ['hold']});
    let reached = false;
    SlideAnimations.bindState(target, {initial: false, steps: [{beat:'hold', state:true}],
      duration:0, render: step => {reached = step;}});
    Reveal.nextFragment();
    return {reached, triggers: target.querySelectorAll('[data-sa-generated-beat]').length};
  });
  expect(generated).toEqual({reached: true, triggers: 1});
});

test('generated clicks and branch tokens settle after reverse, jump and re-entry', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await go(page, 'branch-timeline');
  const submission = page.locator('#submission-token');
  const live = page.locator('#release-token');
  const reply = page.locator('#reply-token');
  await expect(submission).toHaveAttribute('transform', 'translate(95 115)');
  // Move both the geometry and its named checkpoint. The stop tracks the SVG.
  await page.evaluate(() => {
    document.querySelector('#intake-route').setAttribute('d', 'M 95 115 Q 215 65 415 115');
    document.querySelector('#review-marker').setAttribute('cx', '203.8');
    document.querySelector('#review-marker').setAttribute('cy', '91');
  });
  await page.evaluate(() => Reveal.nextFragment());
  const coordinates = (await submission.getAttribute('transform')).match(/[\d.]+/g).map(Number);
  expect(coordinates[0]).toBeCloseTo(203.8, 0);
  expect(coordinates[1]).toBeCloseTo(91, 0);
  await expect(page.locator('#branch-timeline .current-fragment')).toContainText('local preview');
  await page.evaluate(() => {
    const {h,v} = Reveal.getIndices();
    Reveal.slide(h,v,2);
  });
  await expect(submission).toHaveAttribute('opacity', '0');
  await expect(live).toHaveAttribute('transform', 'translate(800 55)');
  await expect(reply).toHaveAttribute('transform', 'translate(800 175)');
  await expect(page.locator('#branch-timeline .current-fragment')).toContainText('send the live link');
  await page.evaluate(() => Reveal.prevFragment());
  await expect(live).toHaveAttribute('opacity', '0');
  await expect(submission).toHaveAttribute('transform', 'translate(415 115)');
  await page.evaluate(() => {
    const {h,v} = Reveal.getIndices();
    Reveal.slide(h+1,0,-1);
    Reveal.slide(h,v,2);
  });
  await expect(reply).toHaveAttribute('opacity', '1');
});

test('token print state retains the final release and hides transient markers', async ({page}) => {
  await page.emulateMedia({media: 'print'});
  await page.goto('/scene-gallery.html?print-pdf');
  await page.waitForFunction(() => window.Reveal?.isReady());
  await expect(page.locator('.pdf-page').first()).toBeAttached();
  await expect(page.locator('#release-token')).toHaveAttribute('transform', 'translate(800 55)');
  await expect(page.locator('#reply-token')).toHaveCSS('display', 'none');
  await expect(page.locator('#branch-timeline [data-sa-beat="deliver"]')).toHaveCSS('visibility', 'visible');
});

test('Mermaid binds delayed and replaced content and surfaces ambiguous targets', async ({page}) => {
  await go(page, 'publish-flow');
  const diagram = page.locator('#publish-diagram');
  await expect(diagram).toHaveAttribute('data-sa-ready', 'true');
  await page.evaluate(() => Reveal.nextFragment());
  await expect(page.locator('#publish-flow .current-fragment')).toContainText('follow the links');
  await expect(diagram.locator('.node.sa-publish')).toHaveClass(/sa-element-hidden/);
  await expect(diagram.locator('.edgeLabel').filter({hasText: 'Verified'})).toHaveClass(/sa-element-hidden/);
  await page.evaluate(() => {
    const svg = document.querySelector('#publish-diagram svg');
    const copy = svg.cloneNode(true);
    svg.replaceWith(copy);
    copy.querySelector('.node.sa-preview').after(copy.querySelector('.node.sa-preview').cloneNode(true));
  });
  await expect(diagram).toHaveAttribute('data-sa-ambiguous', 'preview');
  await expect(diagram).toHaveAttribute('data-sa-ready', 'false');
  await page.evaluate(() => document.querySelectorAll('#publish-diagram .node.sa-preview')[1].remove());
  await expect(diagram).toHaveAttribute('data-sa-ready', 'true');
  await expect(diagram.locator('.node.sa-publish')).toHaveClass(/sa-element-hidden/);
  await page.evaluate(() => Reveal.nextFragment());
  await expect(diagram.locator('.edgeLabel').filter({hasText: 'Verified'})).not.toHaveClass(/sa-element-hidden/);
});

test('DOM geometry detects clipped menus and labels and broken paths', async ({page}) => {
  await go(page, 'export-document');
  await page.evaluate(() => {
    Reveal.getCurrentSlide().insertAdjacentHTML('beforeend', `
      <div id="menu-box" style="position:relative;width:140px;height:30px;overflow:hidden">
        <div id="clipped-menu" style="position:absolute;top:16px">Export as Markdown</div>
      </div>
      <code id="broken-path" data-sa-qa-token style="display:block;width:90px;overflow-wrap:anywhere">materials/devices/fundamentals.qmd</code>
      <pre id="scrollable-code" style="width:100px;overflow:auto;white-space:pre">An intentionally scrollable line</pre>
      <svg width="400" height="90" data-sa-mermaid>
        <g data-sa-qa-node class="node"><rect width="70" height="32"/><text x="5" y="25">A longer SVG node label</text></g>
        <foreignObject x="130" y="0" width="35" height="24" style="overflow:hidden"><div style="white-space:nowrap">HTML label</div></foreignObject>
      </svg>`);
  });
  const geometry = await page.evaluate(inspectGeometry);
  expect(geometry.problems).toEqual(expect.arrayContaining([
    expect.objectContaining({type: 'internal-clip', element: '#clipped-menu', ancestor: '#menu-box'}),
    expect.objectContaining({type: 'broken-token', element: '#broken-path'}),
    expect.objectContaining({type: 'node-label-overflow', element: 'text'}),
    expect.objectContaining({type: 'foreign-object-clip', ancestor: 'foreignObject'})
  ]));
  expect(geometry.problems.some(problem => problem.element === '#scrollable-code')).toBe(false);
});

test('the matched folder travels while its destination stays put', async ({page}) => {
  await go(page, 'pick-folder');
  const chip = page.locator('section.present [data-id="moving-folder"]');
  const before = await page.evaluate(inspectGeometry);
  const start = await chip.boundingBox();
  await page.evaluate(() => Reveal.next());
  await expect(page.locator('section.present')).toHaveId('drop-folder');
  await expect.poll(async () => (await chip.boundingBox()).x).toBeGreaterThan(start.x + 150);
  const after = await page.evaluate(inspectGeometry);
  expect(after.fixed).toEqual(before.fixed);
});
