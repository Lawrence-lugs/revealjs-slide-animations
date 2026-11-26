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
 await expect(page.locator('#mos-regimes .sa-focus.current-fragment')).toHaveCount(1);
 await page.evaluate(()=>Reveal.nextFragment());await expect(page.locator('#mos-regimes .sa-focus.current-fragment')).toContainText('Depletion');
 await page.evaluate(()=>Reveal.prevFragment());await expect(page.locator('#mos-regimes .sa-focus.current-fragment')).toContainText('Accumulation');
 await page.evaluate(()=>{let s=document.querySelector('#small-signal');let i=Reveal.getIndices(s);Reveal.slide(i.h,i.v,1);});
 await expect(page.locator('#small-signal svg')).toHaveAttribute('data-amplitude','0.1');
 await page.evaluate(()=>Reveal.prevFragment());await expect(page.locator('#small-signal svg')).toHaveAttribute('data-amplitude','0.35');
});
