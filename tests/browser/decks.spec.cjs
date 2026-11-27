const {test,expect}=require('@playwright/test');
for(const deck of ['examples','usage-guide'])test(deck+' navigates',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/'+deck+'.html');await page.waitForFunction(()=>window.Reveal?.isReady());
 await expect(page.locator('.reveal')).toBeVisible();
 expect(await page.evaluate(()=>!!window.SlideAnimations)).toBe(true);
 const count=await page.evaluate(()=>Reveal.getTotalSlides());expect(count).toBeGreaterThan(4);
 for(let i=0;i<120;i++){const end=await page.evaluate(()=>Reveal.isLastSlide()&&!Reveal.availableFragments().next);if(end)break;await page.evaluate(()=>Reveal.next());}
 await page.evaluate(()=>Reveal.slide(0,0,-1));expect(await page.evaluate(()=>Reveal.getIndices().h)).toBe(0);
 expect(errors).toEqual([]);
});
test('focus cards and bias state restore',async({page})=>{
 await page.goto('/examples.html');await page.waitForFunction(()=>window.Reveal?.isReady());
 await page.evaluate(()=>{let s=document.querySelector('#mos-regimes');let i=Reveal.getIndices(s);Reveal.slide(i.h,i.v,0);});
 await expect(page.locator('#mos-regimes .sa-card math')).toHaveCount(3);
 await expect(page.locator('#mos-regimes .sa-focus.current-fragment')).toHaveCount(1);
 await page.evaluate(()=>Reveal.nextFragment());await expect(page.locator('#mos-regimes .sa-focus.current-fragment')).toContainText('Depletion');
 await page.evaluate(()=>Reveal.prevFragment());await expect(page.locator('#mos-regimes .sa-focus.current-fragment')).toContainText('Accumulation');
 await page.evaluate(()=>{let s=document.querySelector('#small-signal');let i=Reveal.getIndices(s);Reveal.slide(i.h,i.v,1);});
 await expect(page.locator('#small-signal svg')).toHaveAttribute('data-amplitude','0.1');
 await page.evaluate(()=>Reveal.prevFragment());await expect(page.locator('#small-signal svg')).toHaveAttribute('data-amplitude','0.35');
});

test('Matplotlib phase updates both traces from one driver',async({page})=>{
 await page.goto('/examples.html');await page.waitForFunction(()=>window.Reveal?.isReady());
 await page.evaluate(()=>{const i=Reveal.getIndices(document.querySelector('#mpl-phase'));Reveal.slide(i.h,i.v,-1);});
 const p=page.locator('#mpl-phase-plot');await expect(p).toHaveAttribute('data-phase','0');
 const a=p.locator('#sa-mpl-input path'),b=p.locator('#sa-mpl-output path');
 const a0=await a.getAttribute('d'),b0=await b.getAttribute('d');
 await page.evaluate(()=>Reveal.nextFragment());
 await expect(p).toHaveAttribute('data-phase',String(Math.PI/2));
 expect(await a.getAttribute('d')).not.toBe(a0);expect(await b.getAttribute('d')).not.toBe(b0);
 const error=await page.evaluate(()=>{
  const el=document.querySelector('#mpl-phase-plot'),m=el.dataset.map.split(',').map(Number),phase=Number(el.dataset.phase);
  const first=id=>Number(el.querySelector(id).getAttribute('d').match(/^M[-\d.]+ ([-\d.]+)/)[1]);
  return Math.max(Math.abs(first('#sa-mpl-input path')-(m[1]+m[3]*Math.sin(phase))),Math.abs(first('#sa-mpl-output path')-(m[1]-.7*m[3]*Math.sin(phase))));
 });expect(error).toBeLessThan(.001);
 await page.evaluate(()=>Reveal.prevFragment());await expect(p).toHaveAttribute('data-phase','0');
 await expect(a).toHaveAttribute('d',a0);await expect(b).toHaveAttribute('d',b0);
});
test('Mermaid progressive reveal and focus',async({page})=>{
 await page.goto('/examples.html');await page.waitForFunction(()=>window.Reveal?.isReady());
 await page.evaluate(()=>{const i=Reveal.getIndices(document.querySelector('#mermaid-build'));Reveal.slide(i.h,i.v,-1);});
 const diagram=page.locator('#mermaid-pipeline');
 await expect(diagram).toHaveAttribute('data-sa-ready','true',{timeout:15000});
 await expect(diagram.locator('.node.sa-decode')).toHaveClass(/sa-element-hidden/);
 await page.evaluate(()=>Reveal.nextFragment());
 await expect(diagram.locator('.node.sa-decode')).not.toHaveClass(/sa-element-hidden/);
 await expect(diagram.locator('path.sa-element-flow')).toHaveCount(1);
 await page.evaluate(()=>Reveal.prevFragment());await expect(diagram.locator('.node.sa-decode')).toHaveClass(/sa-element-hidden/);
 await page.evaluate(()=>{for(let i=0;i<4;i++)Reveal.nextFragment();});
 await expect(diagram.locator('.node.sa-fetch')).toHaveClass(/sa-element-dim/);
 await expect(diagram.locator('.node.sa-decode')).not.toHaveClass(/sa-element-dim/);
});

test('converter demonstrates each edit with its explanation', async ({page}) => {
  await page.goto('/usage-guide.html#/document-conversion');
  const slide = page.locator('#document-conversion');
  const output = slide.locator('#conversion-output code');
  await expect(output).toHaveText('# Bias\n[Notes](notes.md)');
  await page.evaluate(() => Reveal.nextFragment());
  await expect(output).toHaveText('---\ntitle: Bias\n---\n[Notes](notes.md)');
  await expect(slide.locator('.current-fragment')).toContainText('metadata');
  await page.evaluate(() => Reveal.nextFragment());
  await expect(output).toHaveText('---\ntitle: Bias\n---\n[Notes](notes.qmd)');
  await expect(slide.locator('.current-fragment')).toContainText('Retarget');
  await page.evaluate(() => Reveal.prevFragment());
  await expect(output).toHaveText('---\ntitle: Bias\n---\n[Notes](notes.md)');
});

test('publishing builds each stage with its own note', async ({page}) => {
  await page.goto('/scene-direction.html#/publish-to-main');
  await page.waitForFunction(() => Reveal.isReady());
  const slide = page.locator('#publish-to-main');
  const stages = slide.locator('svg g.fragment.visible');
  const note = slide.locator('.lesson-notes .current-fragment');
  for (const [i, expected] of ['checks', 'contributor', 'main', 'pipeline', 'location'].entries()) {
    await page.evaluate(() => Reveal.nextFragment());
    await expect(stages).toHaveCount(i + 1);
    await expect(note).toContainText(expected);
  }
  await page.evaluate(() => Reveal.prevFragment());
  await expect(stages).toHaveCount(4);
  await expect(note).toContainText('pipeline');
});

test('folder moves into its destination across placement slides', async ({page}) => {
  await page.goto('/scene-direction.html#/choose-the-placement');
  const folder = page.locator('section.present .folder-chip');
  const start = await folder.boundingBox();
  await page.evaluate(() => Reveal.next());
  await expect(page.locator('section.present.placed, section.present .placed')).toHaveCount(1);
  await expect.poll(async () => (await folder.boundingBox()).x).toBeGreaterThan(start.x + 150);
  await expect(page.locator('section.present .destination')).toContainText('devices/');
});
