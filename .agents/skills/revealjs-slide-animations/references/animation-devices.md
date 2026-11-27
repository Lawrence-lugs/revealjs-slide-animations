# Match the animation device to the teaching idea

| Idea | Device | First tool |
|---|---|---|
| Topic introduction | Heading continuity into bullets | Auto-Animate |
| Sequence or comparison | One card per click | fragments + sa-enter-up |
| Focus shift | Current card bright, others dim | sa-focus |
| Flow | Draw connection, move marker or passive dashes | sa-draw / sa-flow / moveAlongPath |
| Threshold | Move event across window, derive validity | bindState |
| Tradeoff | Sweep one parameter, derive all outputs | bindState |
| Budget | Grow proportional regions | tween / bindState |
| Algorithm pass | Highlight nodes in visit order | fragments |
| Hierarchy | Build structure level by level | fragments |
| Variation | Change signal from ideal | bindState |
| Prediction | Reveal question, wait for click, reveal answer | fragments |
| Formula | Reveal or morph terms after demonstration | Magic Move |
| Existing plot change | Preserve scales and marks | Magic Move |
| Abstraction | Preserve identities while expanding | Auto-Animate |
| Circuit cross-section | Build regions and terminals in conceptual order | SVG fragments |

Keep a stable coordinate system and derive geometry, labels and status from the same parameter. For example a small-signal sweep derives nonlinear current, tangent approximation and error from one amplitude. For timing, move the data edge and compute whether it violates setup/hold rather than independently timing a warning.

For existing Mermaid flowcharts, use bindElements to reveal or focus semantic nodes and edges within a fixed layout. For waveform phase, amplitude, or bias, use bindState and recompute from the mathematical parameter; do not morph sampled endpoints. See mermaid-and-plots.md.

[Quarto Magic Move](https://github.com/emilhvitfeldt/quarto-revealjs-magic-move) is an optional extension. Choose it during storyboarding when matching geometry, code or equation terms across slides is central to the explanation. Use native Auto-Animate for shared elements or a numeric driver for a change produced by one parameter.
