# Existing figures: Mermaid and scientific plots

## Mermaid
Preserve the original Mermaid syntax and one full graph. Assign stable class names to nodes (e.g. class A sa-input) and inspect the actual rendered SVG. Select edges by explicit semantic edge ID if the installed Mermaid version supports it; otherwise scope a selector to the actual path ID or source/target classes. Never guess numeric suffixes or rely on visible label text. Edge labels are separate elements and must be included in reveal/focus groups where relevant. Group related nodes and edges under semantic target names.

Use SlideAnimations.bindElements(scope,{targets,initial,steps}) or the JSON configuration documented in docs/usage-guide.qmd. Each state specifies show, focus, flow; omitted show means all and omitted focus means none dimmed. Native fragments own click timing. Do not repeatedly render smaller Mermaid diagrams, since layout moves and attention is lost. For structure changes that actually need a new layout, use consecutive slides and test the resulting transition, not an assumed node morph.

Verify data-sa-ready=true and data-sa-missing="" on the scope; inspect actual node and edge visibility, focus and flow on each click. Reverse, jump, rapidly navigate, resize and leave the slide. The adapter handles delayed inline SVG and SVG replacement, not images/iframes or arbitrary Mermaid diagram-type semantics. Unsupported diagrams can still use inspected CSS selectors or ordinary slide states. A static full diagram is the safe fallback.

## Scientific plots
Keep Matplotlib/Seaborn or the project's existing renderer. A geometric interpolation between endpoint paths is generally NOT a physically correct intermediate state. Phase, frequency, amplitude, bias, thresholds and other meaningful variables must be animated as numerical drivers; regenerate all dependent paths, markers and status from them. Use stable artist gid, inline SVG, and a correct data-to-SVG mapping for linear axes (see Matplotlib example). Nonlinear transforms need renderer-specific mapping. Keep axes and legends unchanged unless they are part of the explanation.

Magic Move remains optional for code, math and compatible static SVG states; qualification requires inspecting both endpoints and intermediate frames for every focal mark. A static transition or state-driven update is preferable to a false scientific morph. For plots check data-space values at intermediate steps, not merely that screenshots differ.

## Acceptance checks
- Original diagram/plot source remains editable.
- Each fragment has a stable settled state and correct reverse navigation.
- All intended targets actually change, and unrelated geometry remains still.
- No flicker, duplicate arrows, label drift, or paths that warp into mathematically invalid shapes.
- No new graphing/diagram library or slide timeline.
