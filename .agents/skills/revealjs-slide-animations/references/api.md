# SlideAnimations authoring reference

Enable `slide-animations` under `revealjs-plugins`. The [usage guide](https://lawrence-lugs.github.io/revealjs-slide-animations/usage-guide.html) and [example deck](https://lawrence-lugs.github.io/revealjs-slide-animations/examples.html) show the extension in context.

| Purpose | API |
|---|---|
| Brief entrance | `.fragment.sa-enter-up`, `.sa-enter-left`, or `.sa-enter-scale` |
| Focus in place | `.fragment.custom.sa-focus-plain` dims inactive items. Use `.sa-card` and `.fragment.custom.sa-focus` for cards with accent chrome. |
| Draw a path on a click | `.fragment.sa-draw` on an SVG path with `pathLength="1"` |
| Indicate flow direction | `.sa-flow` on an SVG path |
| Fixed SVG or Mermaid layout | `SlideAnimations.bindElements(scope, {targets, initial, steps})` |
| Continuous value or shape | `SlideAnimations.bindState(scope, {initial, steps, render, duration})`. Each step is `{index, state}`. Derive labels and shapes in `render(state)`. |
| Sample a plotted function | `SlideAnimations.samplePath(fn, {from, to, samples, map: [x0, y0, sx, sy]})` |

## Pair text and diagrams

Use the same `data-fragment-index` for a visible explanation and its diagram step. A visible fragment drives the step itself. For groups built through Markdown, check the resulting DOM after rendering and after any filters have run. This pattern works across columns.

````markdown
:::: {.columns}
::: {.column width="48%"}
<div class="fragment sa-enter-up" data-fragment-index="0">The item reaches inspection.</div>
:::

::: {.column width="48%"}
<div id="diagram">

```{=html}
<svg class="sa-svg" viewBox="0 0 250 40" role="img" aria-label="Intake leads to inspection">
  <text x="0" y="25">Intake</text>
  <text id="inspection" x="100" y="25">→ Inspection</text>
</svg>
```

</div>
:::
::::

<script type="application/json" data-sa-elements>
{
  "scope": "#diagram",
  "targets": {"inspection": "#inspection"},
  "initial": {"show": []},
  "steps": [{"index": 0, "state": {"show": ["inspection"]}}]
}
</script>
````

Each element step is a complete state. Omit `show` to display all targets and omit `focus` to dim none. `flow` lists the active path targets. Check `data-sa-ready="true"` and empty `data-sa-missing` on the scope. Add a browser assertion for both the text and the diagram at each shared index.

## Print the instructional result

The extension prints all bound elements, removes dimming, disables flow, and completes draw-on paths. A custom style driven by `.current-fragment` needs an explicit final state in print, since Reveal can lay out PDF pages without that marker. Scope the fallback to the affected demo. Choose whichever result was intended for the handout and check the actual `?print-pdf` page.

```css
.reveal .style-demo .page-rule.current-fragment ~ .preview {
  color: #1f9d55;
}

@media print {
  .reveal .style-demo .preview {
    color: #1f9d55;
  }
}
```

## Lane sequence

Use one coordinate system for a baseline lane, an alternate lane, events and a decision gate. Keep the baseline available for orientation. Put the branch path and its first event in one fragment, then reveal the gate and return path on later clicks. Pair any prose with those indices.

````markdown
```{=html}
<svg class="sa-svg" viewBox="0 0 580 160" role="img" aria-label="An item leaves the main lane, passes inspection and returns">
  <path d="M20 35H555" fill="none" stroke="currentColor"/>
  <g class="fragment" data-fragment-index="0">
    <path class="fragment sa-draw" data-fragment-index="0" pathLength="1"
          d="M100 35Q135 35 165 105H280" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="200" cy="105" r="5" fill="currentColor"/>
    <text x="180" y="138">Divert</text>
  </g>
  <g class="fragment" data-fragment-index="1">
    <rect x="280" y="83" width="110" height="44" rx="5" fill="none" stroke="currentColor"/>
    <text x="335" y="112" text-anchor="middle">Inspect</text>
  </g>
  <g class="fragment" data-fragment-index="2">
    <path class="fragment sa-draw" data-fragment-index="2" pathLength="1"
          d="M390 105H420Q450 105 490 35" fill="none" stroke="currentColor" stroke-width="2"/>
    <text x="455" y="138">Return</text>
  </g>
</svg>
```
````

## Named scene beats

Declare one sequence per slide. Mark the explanatory text and related fragments with `data-sa-beat="inspect"`. The plugin assigns the matching Reveal index and inserts a hidden trigger only if the group is otherwise empty.

```html
<script type="application/json" data-sa-beats>
{"scope":"#conversion","beats":["inspect","convert","warn"]}
</script>
```

Call `bindBeats(scope, {beats, start: 0})` to declare the same sequence in JavaScript. In `bindState` and `bindElements`, a step accepts `{beat: "convert", state: ...}` alongside the existing numeric index API. Declare beats before creating named bindings. For pre-existing fragments outside the declared sequence, assign explicit contiguous indices and set `start` to the next free index. Use `.sa-note-slot` and `.sa-current-note` for notes which replace each other. They appear in order in print.

## Routes and tokens

Use `bindPath(scope, {path: "#route", stops: {start: 0, check: "#check-marker", end: 1}})` to name stops on an SVG path. A numeric stop is a fraction of path length. A selector stop projects the center of an SVG marker onto the path. `route.progress("check")` returns the fraction and `route.point(fraction, svgGroup)` gives coordinates in the destination group. Split a route into path segments when it crosses itself or offers multiple plausible nearest points.

Use `bindTokens(scope, {paths, tokens, initial, steps, duration})`, or `bindTimeline(scope, {beats, start, paths, tokens, initial, steps, duration})` to declare the beats and bind together. The same options work in `data-sa-tokens` and `data-sa-timeline` JSON scripts. See the [branching timeline](../assets/examples/scenes/timeline.qmd) for a complete example.

- `paths` maps route names to `{path, stops}`. `tokens` maps token names to selectors for SVG groups or `{selector, print: true}` to retain a marker in print.
- `initial` describes all tokens using `{path, stop, visible?, opacity?, fill?}`. A step's `tokens` map updates individual properties and carries other values forward. Place hidden branch tokens at a shared stop in the prior state, then move them down their own routes while hiding the parent.
- A token follows its path between stops. When changing routes, identify the same physical junction on both routes and assign the junction on the change beat. Opacity interpolates along the same route. Fill changes at the settled beat.
- Reduced motion settles immediately. Print applies the last state and shows path geometry. SVG authored with `.sa-draw` also prints with its complete stroke. Temporary markers are hidden. For custom `bindState` renderers, use `printFinal: true` to render the last declared state. Use `.sa-print-final` for additional print-only markup or deck CSS for custom properties derived from `.current-fragment`.

## Mermaid flowcharts

`bindMermaid(scope, {nodes, edges, labels, selectors, initial, steps})` and the `data-sa-mermaid` JSON form use the same `show`, `focus` and `flow` states as `bindElements`. Map semantic keys to authored node classes or Mermaid node IDs and to rendered/authored edge IDs. Use `{selector: "..."}` or the `selectors` map for output IDs or edge labels that require a renderer-specific selector. Each target must resolve to exactly one element. `data-sa-ready`, `data-sa-missing`, `data-sa-ambiguous`, and `data-sa-bind-details` report resolution after the diagram renders or is replaced.
