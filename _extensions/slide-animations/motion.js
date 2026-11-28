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
  function tween({from,to,duration=360,update,easing=ease,mix=interpolate}) {
    let id, start, cancelled=false;
    const reduced=typeof matchMedia==="function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(duration<=0 || reduced){update(to,1);return ()=>{};}
    function tick(now) {
      if(cancelled)return;
      start??=now;
      const p=clamp((now-start)/duration);
      update(mix(from,to,easing(p)),p);
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
  const bindings=new Set();
  const elementBindings=new WeakMap();
  let deck=null;
  const printMedia = root.matchMedia?.("print");
  const printing = () => Boolean(printMedia?.matches || new URLSearchParams(root.location?.search).has("print-pdf"));
  function sync(binding, animate) {
    if(!deck)return;
    const slide=binding.element.closest("section");
    const print = printing() && binding.printFinal;
    if(!print && deck.getCurrentSlide()!==slide){binding.cancel?.();binding.cancel=null;binding.active=false;return;}
    const f=print ? Infinity : (deck.getIndices().f??-1);
    let target=binding.initial;
    for(const step of binding.steps)if(step.index<=f)target=step.state;
    if(binding.active && binding.target===target && binding.printing===print) return;
    binding.cancel?.();binding.cancel=null;
    const from=binding.current??binding.initial;
    const immediate=print||!binding.active||!animate;
    binding.active=true;binding.target=target;binding.printing=print;
    const update=(state)=>{binding.current=state;binding.render(state,binding.element);};
    if(immediate)update(target);
    else binding.cancel=tween({from,to:target,duration:binding.duration,update,mix:binding.mix});
  }
  function bindState(element,{initial,steps=[],render,duration=650,mix,printFinal=false}) {
    if(typeof element==="string")element=document.querySelector(element);
    if(!element)throw Error("SlideAnimations: missing element");
    const binding={element,initial,steps:resolveSteps(element,steps),render,duration,mix,printFinal,active:false};
    const local = elementBindings.get(element) ?? new Set();
    function updateAudit() {
      const indices = new Set(), conflicts = new Set();
      for (const attached of local) {
        const own = new Set();
        for (const {index} of attached.steps) {
          if (index < 0) continue;
          if (own.has(index)) conflicts.add(index);
          own.add(index);
          indices.add(index);
        }
      }
      if (indices.size) element.dataset.saSteps = [...indices].join(",");
      else delete element.dataset.saSteps;
      if (conflicts.size) element.dataset.saStepConflicts = [...conflicts].join(",");
      else delete element.dataset.saStepConflicts;
    }
    render(initial,element);
    binding.current=initial;
    bindings.add(binding);
    local.add(binding);
    elementBindings.set(element, local);
    updateAudit();
    sync(binding,false);
    return ()=>{
      binding.cancel?.();
      bindings.delete(binding);
      local.delete(binding);
      updateAudit();
    };
  }
  // Animate existing elements, including asynchronously rendered Mermaid SVG.
  // A target is a scoped CSS selector, not a diagram-specific object model.
  function bindElements(element,{targets,initial={},steps=[],unique=false,optional=[]}) {
    if(typeof element==="string")element=document.querySelector(element);
    if(!element)throw Error("SlideAnimations: missing element scope");
    const optionalTargets = new Set(optional);
    let latest=initial, previous=new Set(), disposed=false, pending=false;
    function apply(){
      if(disposed)return;
      const matches=Object.fromEntries(Object.entries(targets).map(([id,selector])=>[id,[...element.querySelectorAll(selector)]]));
      for (const key of optionalTargets) {
        if (matches[key]?.length !== 1) delete matches[key];
      }
      const missing=Object.keys(matches).filter(id=>!matches[id].length);
      const ambiguous=unique ? Object.keys(matches).filter(id=>matches[id].length>1) : [];
      element.dataset.saMissing=missing.join(",");
      element.dataset.saAmbiguous=ambiguous.join(",");
      element.dataset.saBindDetails=Object.entries(targets).filter(([id]) => missing.includes(id) || ambiguous.includes(id))
        .map(([id, selector]) => `${id}: ${matches[id].length} matches for ${selector}`).join("; ");
      if(missing.length || ambiguous.length){
        for(const el of new Set([...previous, ...Object.values(matches).flat()])) {
          el.classList.remove("sa-element", "sa-element-hidden", "sa-element-dim", "sa-element-flow");
        }
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
    return ()=>{disposed=true;observer.disconnect();unbind();for(const el of previous)el.classList.remove("sa-element","sa-element-hidden","sa-element-dim","sa-element-flow");delete element.dataset.saReady;delete element.dataset.saMissing;delete element.dataset.saAmbiguous;delete element.dataset.saBindDetails;};
  }
  const sceneBeats = new WeakMap();

  function scopeElement(value) {
    const element = typeof value === "string" ? document.querySelector(value) : value;
    if (!element) throw new Error(`SlideAnimations: scope not found (${value})`);
    return element;
  }

  function bindBeats(scope, {beats, start = 0}) {
    const slide = scopeElement(scope).closest("section");
    if (!slide || sceneBeats.has(slide)) throw new Error("Declare one beat sequence per slide");
    if (!Array.isArray(beats) || !beats.length || new Set(beats).size !== beats.length ||
        beats.some(name => typeof name !== "string" || !/^[a-z][a-z0-9-]*$/.test(name)) ||
        !Number.isInteger(start) || start < 0) throw new Error("Invalid beat names or start index");
    const indices = new Map(beats.map((name, index) => [name, start + index]));
    const notes = [...slide.querySelectorAll("[data-sa-beat]")];
    for (const note of notes) {
      const index = indices.get(note.dataset.saBeat);
      if (index === undefined) throw new Error(`Unknown beat ${note.dataset.saBeat}`);
      if (note.hasAttribute("data-fragment-index") && Number(note.dataset.fragmentIndex) !== index) {
        throw new Error(`Conflicting index for beat ${note.dataset.saBeat}`);
      }
    }
    // Materialize the whole sequence before Reveal normalizes fragment indices.
    for (const note of notes) {
      note.classList.add("fragment", "sa-beat");
      note.dataset.fragmentIndex = indices.get(note.dataset.saBeat);
    }
    for (const [name, index] of indices) {
      if ([...slide.querySelectorAll(".fragment")].some(el => el.dataset.fragmentIndex === String(index))) continue;
      const trigger = document.createElement("span");
      trigger.className = "fragment sa-trigger";
      trigger.dataset.fragmentIndex = index;
      trigger.dataset.saGeneratedBeat = name;
      trigger.setAttribute("aria-hidden", "true");
      slide.append(trigger);
    }
    slide.dataset.saBeats = JSON.stringify(Object.fromEntries(indices));
    sceneBeats.set(slide, indices);
    // Sync the current slide when called after ready. Other slides are sorted on entry.
    if (deck?.isReady() && deck.getCurrentSlide() === slide) deck.syncFragments(slide);
    return indices;
  }

  function resolveSteps(element, steps) {
    const indices = sceneBeats.get(element.closest?.("section"));
    return steps.map(step => {
      const index = step.beat === undefined ? step.index : indices?.get(step.beat);
      if (!Number.isInteger(index) || index < -1 || (step.index !== undefined && step.index !== index)) {
        throw new Error(`Invalid step ${step.beat ?? step.index} in ${element.id || element.tagName}`);
      }
      return {...step, index};
    }).sort((a, b) => a.index - b.index);
  }

  function bindMermaid(scope, {nodes = {}, edges = {}, labels = {}, selectors = {}, connections = [], ...states}) {
    const targets = Object.create(null);
    for (const [type, entries] of Object.entries({nodes, edges, labels})) {
      for (const [key, identifier] of Object.entries(entries)) {
        if (Object.hasOwn(targets, key)) throw new Error(`Duplicate Mermaid target ${key}`);
        if (typeof identifier === "object" && identifier?.selector) {
          targets[key] = identifier.selector;
          continue;
        }
        const id = CSS.escape(identifier);
        const prefix = CSS.escape(`flowchart-${identifier}-`);
        targets[key] = type === "nodes"
          ? `svg .node.${id}, svg .node[id^="${prefix}"], svg .node[data-id="${id}"]`
          : type === "edges"
            ? `svg path.flowchart-link:is([id="${id}"], [data-id="${id}"], .${id})`
            : `svg .edgeLabel[id="${id}"], svg .edgeLabel[data-id="${id}"], svg .edgeLabel:has([data-id="${id}"])`;
      }
    }
    const element = scopeElement(scope);
    element.dataset.saMermaid = "";
    for (const key of Object.keys(selectors)) {
      if (Object.hasOwn(targets, key)) throw new Error(`Duplicate Mermaid target ${key}`);
    }
    const optional = [];
    for (const {key, from, to} of connections) {
      if (Object.hasOwn(targets, key)) continue;
      // Underscores are the renderer's endpoint separator. Explicit edge
      // IDs disambiguate nodes whose IDs contain that separator.
      if (from.includes("_") || to.includes("_")) continue;
      const prefix = CSS.escape(`L_${from}_${to}_`);
      const edgeId = `[data-id^="${prefix}"]`;
      targets[key] = `svg path.flowchart-link:is([id^="${prefix}"], ${edgeId})`;
      targets[key + " label"] = `svg .edgeLabel:has(${edgeId})`;
      optional.push(key, key + " label");
    }
    return bindElements(element, {...states, targets: {...targets, ...selectors}, unique: true, optional});
  }

  function pointIn(element, destination, point) {
    if (element === destination) return point;
    const source = element.getScreenCTM();
    const target = destination.getScreenCTM();
    if (!source || !target || source.a * source.d === source.b * source.c ||
        target.a * target.d === target.b * target.c) return point;
    return point.matrixTransform(source).matrixTransform(target.inverse());
  }

  function bindPath(scope, {path, stops}) {
    const element = scopeElement(scope);
    const route = element.querySelector(path);
    if (typeof route?.getTotalLength !== "function") throw new Error(`SVG path unavailable: ${path}`);
    // Transform both the marker and route into the same SVG coordinate space.
    function progress(name) {
      const stop = stops[name];
      if (Number.isFinite(stop) && stop >= 0 && stop <= 1) return stop;
      const marker = typeof stop === "string" && element.querySelector(stop);
      if (!marker) throw new Error(`Invalid stop ${name} on ${path}`);
      const box = marker.getBBox();
      const target = pointIn(marker, route, new DOMPoint(box.x + box.width / 2, box.y + box.height / 2));
      const length = route.getTotalLength();
      if (length === 0) return 0;
      const distance = ratio => {
        const point = route.getPointAtLength(ratio * length);
        return (point.x - target.x) ** 2 + (point.y - target.y) ** 2;
      };
      let best = 0;
      for (let index = 1; index <= 64; index++) {
        const ratio = index / 64;
        if (distance(ratio) < distance(best)) best = ratio;
      }
      let low = Math.max(0, best - 1 / 64);
      let high = Math.min(1, best + 1 / 64);
      for (let i = 0; i < 16; i++) {
        const left = (2 * low + high) / 3;
        const right = (low + 2 * high) / 3;
        if (distance(left) < distance(right)) high = right;
        else low = left;
      }
      const refined = (low + high) / 2;
      return distance(best) <= distance(refined) ? best : refined;
    }
    return {
      progress,
      point(ratio, destination = route.parentElement) {
        return pointIn(route, destination, route.getPointAtLength(ratio * route.getTotalLength()));
      }
    };
  }

  function bindTokens(scope, {paths, tokens, initial, steps, duration}) {
    const element = scopeElement(scope);
    const routes = Object.fromEntries(Object.entries(paths).map(([name, route]) => [name, bindPath(element, route)]));
    const markers = Object.entries(tokens).map(([name, spec]) => {
      const {selector, print = false} = typeof spec === "string" ? {selector: spec} : spec;
      const marker = element.querySelector(selector);
      if (!marker || marker.localName !== "g" || !marker.ownerSVGElement) throw new Error(`Token ${name} needs a dedicated SVG group`);
      marker.dataset.saToken = print ? "persistent" : "transient";
      marker.setAttribute("data-sa-qa", "");
      return {name, marker, transform: marker.getAttribute("transform")};
    });
    const renderedPositions = new WeakMap();
    let targetFrame, targetPositions;
    function resolve(frame) {
      return Object.fromEntries(markers.map(({name}) => {
        const state = frame[name];
        if (!Object.hasOwn(routes, state?.path)) throw new Error(`Token ${name} needs a route in every frame`);
        if (!Object.hasOwn(paths[state.path].stops, state.stop)) {
          throw new Error(`Unknown stop ${state.stop} for token ${name}`);
        }
        const opacity = state.visible === false ? 0 : (state.opacity ?? 1);
        if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
          throw new Error(`Token ${name} opacity must be between 0 and 1`);
        }
        return [name, {...state, opacity}];
      }));
    }
    let authored = initial;
    const first = resolve(initial);
    const frames = resolveSteps(element, steps).map(({tokens: updates, ...step}) => {
      for (const name of Object.keys(updates ?? {})) {
        if (!Object.hasOwn(tokens, name)) throw new Error(`Unknown token ${name}`);
      }
      authored = Object.fromEntries(markers.map(({name}) => [name, {...authored[name], ...updates?.[name]}]));
      return {...step, state: resolve(authored)};
    });
    return bindState(element, {
      initial: first,
      steps: frames,
      duration, printFinal: true,
      mix(from, to, progress) {
        if (progress === 1) {
          targetFrame = undefined;
          return to;
        }
        if (targetFrame !== to) {
          targetFrame = to;
          targetPositions = Object.fromEntries(markers.map(({name}) => {
            const state = to[name];
            return [name, routes[state.path].progress(state.stop)];
          }));
        }
        return Object.fromEntries(markers.map(({name}) => {
          const a = from[name], b = to[name];
          // Separate routes meet at authored stops. Switch route at the endpoint.
          if (a.path !== b.path) return [name, a];
          const begin = a.position ?? renderedPositions.get(from)?.[name] ?? routes[a.path].progress(a.stop);
          const end = targetPositions[name];
          return [name, {...a, position: lerp(begin, end, progress), opacity: lerp(a.opacity, b.opacity, progress)}];
        }));
      },
      render(frame) {
        const rendered = {};
        for (const {name, marker, transform} of markers) {
          const state = frame[name];
          const route = routes[state.path];
          const ratio = state.position ?? route.progress(state.stop);
          rendered[name] = ratio;
          const point = route.point(ratio, marker.parentElement);
          const x = Math.round(point.x * 1000) / 1000;
          const y = Math.round(point.y * 1000) / 1000;
          marker.setAttribute("transform", `translate(${x} ${y})${transform ? ` ${transform}` : ""}`);
          marker.setAttribute("opacity", state.opacity);
          marker.setAttribute("aria-hidden", state.opacity === 0 ? "true" : "false");
          if (state.fill == null) marker.removeAttribute("fill");
          else marker.setAttribute("fill", state.fill);
        }
        renderedPositions.set(frame, rendered);
      }
    });
  }

  function bindTimeline(scope, {beats, start, ...tokens}) {
    bindBeats(scope, {beats, start});
    return bindTokens(scope, tokens);
  }

  function registerConfigs() {
    for (const [kind, bind] of Object.entries({
      beats: bindBeats, timeline: bindTimeline, elements: bindElements, mermaid: bindMermaid, tokens: bindTokens
    })) {
      document.querySelectorAll(`script[type="application/json"][data-sa-${kind}]`).forEach(config => {
        if (config.hasAttribute("data-sa-bound")) return;
        try {
          const {scope, ...options} = JSON.parse(config.textContent);
          bind(scope ?? config.parentElement, options);
          config.dataset.saBound = "true";
        } catch (error) {
          config.dataset.saBound = "false";
          console.error(`SlideAnimations: invalid ${kind} configuration`, error);
        }
      });
    }
  }
  const api={id:"slide-animations",init(reveal){
    deck=reveal;
    registerConfigs();
    const refresh=(animate)=>{for(const b of bindings)sync(b,animate);};
    reveal.on("ready",()=>{registerConfigs();refresh(false);});
    reveal.on("slidechanged",()=>refresh(false));
    reveal.on("fragmentshown",()=>refresh(true));
    reveal.on("fragmenthidden",()=>refresh(true));
    printMedia?.addEventListener?.("change",()=>refresh(false));
    if(reveal.isReady()) refresh(false);
  },clamp,lerp,ease,interpolate,tween,attrs,moveAlongPath,bindState,bindElements,samplePath,
    bindBeats,bindPath,bindTokens,bindTimeline,bindMermaid};
  root.SlideAnimations=api;
  if(typeof module!=="undefined")module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
