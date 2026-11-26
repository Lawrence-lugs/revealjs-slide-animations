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
  const api={id:"slide-animations",init(reveal){
    deck=reveal;
    const refresh=(animate)=>{for(const b of bindings)sync(b,animate);};
    reveal.on("ready",()=>refresh(false));
    reveal.on("slidechanged",()=>refresh(false));
    reveal.on("fragmentshown",()=>refresh(true));
    reveal.on("fragmenthidden",()=>refresh(true));
    if(reveal.isReady())refresh(false);
  },clamp,lerp,ease,interpolate,tween,attrs,moveAlongPath,bindState};
  root.SlideAnimations=api;
  if(typeof module!=="undefined")module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
