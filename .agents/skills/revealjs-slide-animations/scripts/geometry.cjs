// Serialized into the browser by Playwright. Keep helpers local to the scan.
module.exports = function inspectGeometry() {
  const slide = Reveal.getCurrentSlide();
  const scale = Reveal.getScale() || 1;
  const tolerance = 3 * scale;
  const canvasElement = slide.closest('.reveal');
  const canvas = canvasElement.getBoundingClientRect();
  const viewport = {left: canvas.left, top: canvas.top,
    right: Math.min(canvas.right, innerWidth), bottom: Math.min(canvas.bottom, innerHeight)};
  const label = el => el.id ? `#${el.id}` : el.getAttribute('data-id') || el.localName;
  const problems = [];
  const seen = new Map();
  const visible = el => el.checkVisibility?.({checkOpacity: true, checkVisibilityCSS: true}) ?? true;
  const ignored = 'aside.notes, .speaker-notes, .sa-trigger, [data-sa-qa-ignore-overflow], defs';
  const outside = (rect, box, axes = 'xy') => Math.max(
    axes.includes('x') ? Math.max(box.left - rect.left, rect.right - box.right) : 0,
    axes.includes('y') ? Math.max(box.top - rect.top, rect.bottom - box.bottom) : 0);
  function add(type, el, excess, ancestor) {
    if (excess <= tolerance) return;
    const item = {type, element: label(el), pixels: Math.round(excess / scale), ancestor: label(ancestor)};
    const key = JSON.stringify([type, item.element, item.ancestor]);
    if (!seen.has(key)) {
      seen.set(key, item);
      problems.push(item);
    } else {
      seen.get(key).pixels = Math.max(seen.get(key).pixels, item.pixels);
    }
  }
  const rects = new WeakMap();
  const styles = new WeakMap();
  function rect(el) {
    if (!rects.has(el)) rects.set(el, el.getBoundingClientRect());
    return rects.get(el);
  }
  function style(el) {
    if (!styles.has(el)) styles.set(el, getComputedStyle(el));
    return styles.get(el);
  }
  function clip(el) {
    const box = rect(el);
    if (!(el instanceof HTMLElement) || !el.offsetWidth || !el.offsetHeight) return box;
    const sx = box.width / el.offsetWidth, sy = box.height / el.offsetHeight;
    const left = box.left + el.clientLeft * sx, top = box.top + el.clientTop * sy;
    return {left, top, right: left + el.clientWidth * sx, bottom: top + el.clientHeight * sy};
  }
  function check(el, bounds, firstAncestor = el.parentElement) {
    if (!bounds.width || !bounds.height) return;
    let axes = 'xy';
    for (let parent = firstAncestor; parent && parent !== slide; parent = parent.parentElement) {
      const {overflowX, overflowY} = style(parent);
      const scrollable = parent.matches('pre, [data-sa-qa-scroll]');
      const active = (axis, overflow) => axes.includes(axis) && overflow !== 'visible' &&
        !(scrollable && (overflow === 'auto' || overflow === 'scroll'));
      const clipped = (axes.includes('x') && overflowX !== 'visible' ? 'x' : '') +
        (axes.includes('y') && overflowY !== 'visible' ? 'y' : '');
      const report = (active('x', overflowX) ? 'x' : '') + (active('y', overflowY) ? 'y' : '');
      if (report) {
        const type = parent.localName === 'foreignObject' ? 'foreign-object-clip'
          : parent.localName === 'svg' ? 'svg-viewport-clip' : 'internal-clip';
        add(type, el, outside(bounds, clip(parent), report), parent);
      }
      axes = [...axes].filter(axis => !clipped.includes(axis)).join('');
      if (!axes) break;
    }
    if (axes) add('viewport-overflow', el, outside(bounds, viewport, axes), canvasElement);
  }
  const diagramSelector = '[data-sa-mermaid], .sa-mermaid, svg.mermaid-js, svg[id^="mermaid-"]';
  for (const el of slide.querySelectorAll('*')) {
    if (el.closest(ignored) || !visible(el)) continue;
    if (!(el instanceof SVGElement) || el.matches('svg, text, foreignObject, .node > rect, .node > polygon, .node > path, .node > circle, .node > ellipse')) {
      check(el, rect(el));
    }
    if (el instanceof HTMLElement && !el.matches('pre, [data-sa-qa-scroll]')) {
      const {overflowX, overflowY} = style(el);
      if (/(hidden|clip)/.test(overflowX) && el.clientWidth > 0) {
        add('internal-scroll-width', el, (el.scrollWidth - el.clientWidth) * scale, el);
      }
      if (/(hidden|clip)/.test(overflowY) && el.clientHeight > 0) {
        add('internal-scroll-height', el, (el.scrollHeight - el.clientHeight) * scale, el);
      }
    }
  }
  const walker = document.createTreeWalker(slide, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!node.data.trim() || !el || el.closest(`${ignored}, script, style, svg text`) || !visible(el)) continue;
    range.selectNodeContents(node);
    for (const bounds of range.getClientRects()) check(el, bounds, el);
  }
  for (const el of slide.querySelectorAll('[data-sa-qa-token], :not(pre) > code')) {
    if (!visible(el) || el.closest(ignored) || el.closest('pre') || el.children.length || !el.firstChild) continue;
    for (const match of el.textContent.matchAll(/\S+/g)) {
      range.setStart(el.firstChild, match.index);
      range.setEnd(el.firstChild, match.index + match[0].length);
      const lines = new Set([...range.getClientRects()].map(box => Math.round(box.top)));
      if (lines.size > 1) problems.push({type: 'broken-token', element: label(el), token: match[0]});
    }
  }
  for (const node of slide.querySelectorAll('.node, [data-sa-qa-node]')) {
    if (!node.closest(diagramSelector) && !node.hasAttribute('data-sa-qa-node')) continue;
    if (!visible(node) || node.closest(ignored)) continue;
    const shape = node.querySelector(':scope > :is(rect, polygon, path, circle, ellipse), [data-sa-qa-shape]');
    if (!shape) continue;
    for (const text of node.querySelectorAll('text, .nodeLabel, [data-sa-qa-label]')) {
      if (!visible(text)) continue;
      range.selectNodeContents(text);
      const bounds = text instanceof SVGElement ? rect(text) : range.getBoundingClientRect();
      if (bounds.width && bounds.height) add('node-label-overflow', text, outside(bounds, rect(shape)), shape);
    }
  }
  const fixed = [...slide.querySelectorAll('[data-sa-qa-fixed]')].filter(visible).map(el => {
    const {x, y, width, height} = rect(el);
    return {name: el.dataset.saQaFixed || label(el), bounds: [x, y, width, height].map(v => v / scale)};
  });
  const slideBox = rect(slide);
  const title = slide.querySelector(':scope > :is(h1,h2,h3)');
  const top = title ? rect(title).bottom : slideBox.top;
  const bottom = rect(slide.closest('.slides')).top + Reveal.getComputedSlideSize().height * scale;
  const blocks = [...slide.children].filter(el => el !== title && !el.matches(ignored) && visible(el) && rect(el).height);
  const used = Math.max(0, ...blocks.map(el => (rect(el).bottom - top) / scale));
  const budget = [{element: label(slide), available: Math.round((bottom - top) / scale), used: Math.round(used)}];
  for (const panel of slide.querySelectorAll('[data-sa-qa-budget]')) {
    if (visible(panel)) budget.push({element: label(panel), available: panel.clientHeight, used: panel.scrollHeight});
  }
  for (const area of budget) area.remaining = area.available - area.used;
  return {problems: problems.slice(0, 16), budget, fixed};
};
