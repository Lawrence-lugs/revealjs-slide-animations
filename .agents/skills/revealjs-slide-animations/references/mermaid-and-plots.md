# Existing figures: Mermaid and scientific plots

## Mermaid
Preserve the original Mermaid syntax and one full graph. Assign stable class names to nodes (e.g. class A sa-input) and inspect the actual rendered SVG. Select edges by explicit semantic edge ID if the installed Mermaid version supports it; otherwise scope a selector to the actual path ID or source/target classes. Never guess numeric suffixes or rely on visible label text. Edge labels are separate elements and must be included in reveal/focus groups where relevant. Group related nodes and edges under semantic target names.

Use SlideAnimations.bindElements(scope,{targets,initial,steps}) or the [JSON configuration](api.md). Each state specifies show, focus, flow; omitted show means all and omitted focus means none dimmed. Native fragments own click timing. Do not repeatedly render smaller Mermaid diagrams, since layout moves and attention is lost. For structure changes that actually need a new layout, use consecutive slides and test the resulting transition, not an assumed node morph.

Verify data-sa-ready=true and data-sa-missing="" on the scope; inspect actual node and edge visibility, focus and flow on each click. Reverse, jump, rapidly navigate, resize and leave the slide. The adapter handles delayed inline SVG and SVG replacement, not images/iframes or arbitrary Mermaid diagram-type semantics. Unsupported diagrams can still use inspected CSS selectors or ordinary slide states. A static full diagram is the safe fallback.

### Clipped HTML labels in Quarto

Inspect the rendered SVG first. If the label is inside a `foreignObject` and the last glyph is clipped, opt in on this figure only:

```markdown
::: {.sa-mermaid style="--sa-mermaid-max-width: 900px"}
[Mermaid cell]
:::
```

The utility allows HTML labels to overflow their `foreignObject` and overrides Mermaid's inline maximum width. Its default is `100%`. Check that the text fits the **node** after the override and that the diagram fits beside surrounding content. This utility does not change node geometry.

In Quarto 1.9.38, the deck-level `mermaid.theme` reaches the initializer through metadata, while nested `flowchart` and `themeVariables` in that block may be ignored. Read the DOM to see which label mode and font actually rendered. For plain SVG text, `config` in Mermaid's diagram front matter is a separate path. Set `htmlLabels: false` there and verify that the output uses SVG `text` before relying on it.

## Scientific plots
Keep Matplotlib/Seaborn or the project's existing renderer. A geometric interpolation between endpoint paths is generally NOT a physically correct intermediate state. Phase, frequency, amplitude, bias, thresholds and other meaningful variables must be animated as numerical drivers; regenerate all dependent paths, markers and status from them. Use stable artist gid, inline SVG, and a correct data-to-SVG mapping for linear axes (see the [Matplotlib example](https://lawrence-lugs.github.io/revealjs-slide-animations/examples.html#/mpl-phase)). Nonlinear transforms need renderer-specific mapping. Keep axes and legends unchanged unless they are part of the explanation.

Magic Move remains optional for code, math and compatible static SVG states; qualification requires inspecting both endpoints and intermediate frames for every focal mark. A static transition or state-driven update is preferable to a false scientific morph. For plots check data-space values at intermediate steps, not merely that screenshots differ.

## Acceptance checks
- Original diagram/plot source remains editable.
- Each fragment has a stable settled state and correct reverse navigation.
- All intended targets actually change, and unrelated geometry remains still.
- No flicker, duplicate arrows, label drift, or paths that warp into mathematically invalid shapes.
- No new graphing/diagram library or slide timeline.

## Distinguish bindings, labels and node geometry

Start with [the flowchart adapter recipe](../assets/examples/scenes/publish.qmd). Prefer authored node classes. Inspect path and label IDs for the actual renderer before mapping an edge. The targeted QA report distinguishes unresolved or ambiguous bindings from clipping at a `foreignObject`, text that extends outside a node shape, and SVG viewport clipping. Geometry runs after fonts are ready.

With Quarto 1.9.38, deck-level nested `themeVariables` and `flowchart.htmlLabels` were observed to have no effect in the affected deck. Inspect whether its labels are SVG `text` or HTML in a `foreignObject` and use the computed font when diagnosing. A scoped `foreignObject { overflow: visible }` adjustment can restore the last glyph when the label otherwise fits its node. The legacy `.sa-mermaid` utility also overrides max width. When the lecture theme supplies figure scaling, use only a diagram-scoped label rule or explicitly set the existing intended figure width. If the box itself clips, repair the viewBox or layout and recheck. Redraw an unreliable figure when the geometry still fails or the required teaching action needs a different composition.
