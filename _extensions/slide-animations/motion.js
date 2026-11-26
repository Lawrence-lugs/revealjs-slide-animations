/* Native Reveal fragment state adapter. No timeline, no renderer. */
(function(root){
  const clamp = x => Math.max(0,Math.min(1,x));
  const lerp = (a,b,t) => a+(b-a)*t;
  const ease = t => 1-Math.pow(1-t,3);
  function interpolate(a,b,t) {
    if(typeof a==="number" && typeof b==="number") return lerp(a,b,t);
    if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length) return b.map((v,i)=>interpolate(a[i],v,t));
    if(a && b && typeof a==="object" && typeof b==="object" && !Array.isArray(a) && !Array.isArray(b)) return Object.fromEntries(Object.keys(b).map(k=>[k,interpolate(a[k],b[k],t)]));
    return t<1?a:b;
  }
  function tween({from,to,duration=360,update,easing=ease}) {
    let id, start, cancelled=false;
    const reduced=typeof matchMedia==="function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(duration<=0 || reduced){update(to,1);return ()=>{};}
    function tick(now) {
      if(cancelled)return;
      start??=now;
      const p=clamp((now-start)/duration);
      update(interpolate(from,to,easing(p)),p);
      if(p<1&&!cancelled)id=requestAnimationFrame(tick);
    }
    id=requestAnimationFrame(tick);
    return ()=>{cancelled=true;cancelAnimationFrame(id);};
  }
  function attrs(element,values){for(const [key,value] of Object.entries(values))element.setAttribute(key,String(value));return element;}
  function moveAlongPath(element,path,p){const q=path.getPointAtLength(clamp(p)*path.getTotalLength());return attrs(element,{cx:q.x,cy:q.y});}
  // Coordinate mapping for any affine plot/SVG, without a plotting dependency.
  function samplePath(fn,{from=0,to=1,samples=181,map=[0,0,1,1]}={}) {
    if(!Number.isInteger(samples)||samples<2)throw Error("samplePath: samples must be >= 2");
    const [x0,y0,sx,sy]=map;
    return Array.from({length:samples},(_,i)=>{
      const x=lerp(from,to,i/(samples-1)),y=fn(x);
      return (i?"L":"M")+(x0+sx*x).toFixed(4)+" "+(y0+sy*y).toFixed(4);
    }).join(" ");
  }
  const bindings=new Set();let deck=null;
  function sync(binding, animate) {
    if(!deck)return;
    const slide=binding.element.closest("section");
    if(deck.getCurrentSlide()!==slide){binding.cancel?.();binding.cancel=null;binding.active=false;return;}
    const f=deck.getIndices().f??-1;
    let target=binding.initial;
    for(const step of binding.steps)if(step.index<=f)target=step.state;
    if(binding.active&&binding.target===target)return;
    binding.cancel?.();binding.cancel=null;
    const from=binding.current??binding.initial;
    const immediate=!binding.active||!animate;
    binding.active=true;binding.target=target;
    const update=(state)=>{binding.current=state;binding.render(state,binding.element);};
    if(immediate)update(target);
    else binding.cancel=tween({from,to:target,duration:binding.duration,update});
  }
  function bindState(element,{initial,steps=[],render,duration=650}) {
    if(typeof element==="string")element=document.querySelector(element);
    if(!element)throw Error("SlideAnimations: missing element");
    const binding={element,initial,steps:[...steps].sort((a,b)=>a.index-b.index),render,duration,active:false};
    bindings.add(binding);render(initial,element);binding.current=initial;sync(binding,false);
    return ()=>{binding.cancel?.();bindings.delete(binding);};
  }
  // Animate existing elements, including asynchronously rendered Mermaid SVG.
  // A target is a scoped CSS selector, not a diagram-specific object model.
  function bindElements(element,{targets,initial={},steps=[]}) {
    if(typeof element==="string")element=document.querySelector(element);
    if(!element)throw Error("SlideAnimations: missing element scope");
    let latest=initial, previous=new Set(), disposed=false, pending=false;
    function apply(){
      if(disposed)return;
      const matches=Object.fromEntries(Object.entries(targets).map(([id,selector])=>[id,[...element.querySelectorAll(selector)]]));
      const missing=Object.keys(matches).filter(id=>!matches[id].length);
      element.dataset.saMissing=missing.join(",");
      if(missing.length){
        for(const el of previous)el.classList.remove("sa-element-hidden","sa-element-dim","sa-element-flow");
        element.dataset.saReady="false";return;
      }
      element.dataset.saReady="true";
      const visible=latest.show==null?null:new Set(latest.show);
      const focus=latest.focus==null?null:new Set(latest.focus);
      const flow=new Set(latest.flow??[]);
      const flags=new Map();
      for(const [key,els] of Object.entries(matches))for(const el of els){
        const f=flags.get(el)??{show:false,focus:false,flow:false};
        f.show ||= visible===null||visible.has(key);
        f.focus ||= focus===null||focus.has(key);
        f.flow ||= flow.has(key);flags.set(el,f);
      }
      for(const el of previous)if(!flags.has(el))el.classList.remove("sa-element","sa-element-hidden","sa-element-dim","sa-element-flow");
      for(const [el,f] of flags){
        el.classList.add("sa-element");
        el.classList.toggle("sa-element-hidden",!f.show);
        el.classList.toggle("sa-element-dim",f.show&&!f.focus);
        el.classList.toggle("sa-element-flow",f.show&&f.flow);
      }
      previous=new Set(flags.keys());
    }
    const unbind=bindState(element,{initial,steps,duration:0,render:state=>{latest=state;apply();}});
    // Mermaid may render or replace its SVG after Reveal.ready. Observe child
    // changes only; our own class changes must not trigger another scan.
    const observer=new MutationObserver(()=>{
      if(pending)return;pending=true;
      requestAnimationFrame(()=>{pending=false;apply();});
    });
    observer.observe(element,{childList:true,subtree:true});
    return ()=>{disposed=true;observer.disconnect();unbind();for(const el of previous)el.classList.remove("sa-element","sa-element-hidden","sa-element-dim","sa-element-flow");delete element.dataset.saReady;delete element.dataset.saMissing;};
  }
  function registerElements(){
    document.querySelectorAll('script[type="application/json"][data-sa-elements]').forEach(config=>{
      if(config.dataset.saBound)return;
      try{
        const {scope,...options}=JSON.parse(config.textContent);
        bindElements(scope,options);config.dataset.saBound="true";
      }catch(e){console.error("SlideAnimations: invalid element configuration",e);}
    });
  }
  const api={id:"slide-animations",init(reveal){
    deck=reveal;
    const refresh=(animate)=>{for(const b of bindings)sync(b,animate);};
    reveal.on("ready",()=>{registerElements();refresh(false);});
    reveal.on("slidechanged",()=>refresh(false));
    reveal.on("fragmentshown",()=>refresh(true));
    reveal.on("fragmenthidden",()=>refresh(true));
    if(reveal.isReady()){registerElements();refresh(false); }
  },clamp,lerp,ease,interpolate,tween,attrs,moveAlongPath,bindState,bindElements,samplePath};
  root.SlideAnimations=api;
  if(typeof module!=="undefined")module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
