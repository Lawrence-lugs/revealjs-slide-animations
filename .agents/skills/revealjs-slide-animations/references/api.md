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
