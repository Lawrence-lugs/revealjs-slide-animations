# Reusable scene compositions

Copy the relevant QMD section from [the gallery](../assets/examples/scene-gallery.qmd) or the recipe file. Each recipe uses extension CSS and source-editable HTML, Markdown or inline SVG. Copy the scene's configuration script along with its markup. Give IDs unique names when reusing a recipe. The existing [submission-to-publication storyboard](../assets/examples/scene-direction.qmd) shows how to keep objects recognizable through a sequence of slides.

| Teaching task | Recipe |
|---|---|
| Distinguish responsibilities, compare cards or ask a question before revealing the answer | [Exhibits and quiz](../assets/examples/scenes/exhibits.qmd) |
| Unpack files, run a command, read warnings and compare source with a browser preview | [File tree, terminal, editor and browser](../assets/examples/scenes/workspace.qmd) |
| Move a folder into a stable destination | [File chip and dropzone](../assets/examples/scenes/placement.qmd) |
| Open a menu, export a document or show a message thread | [Document and thread](../assets/examples/scenes/document.qmd) |
| Pair diagram stages with an explanation below the diagram | [Mermaid flowchart](../assets/examples/scenes/publish.qmd) |
| Follow an object through checkpoints, then split into parallel routes | [Branching timeline](../assets/examples/scenes/timeline.qmd) |
| Address a byte, update a bit field or forward a dependent result | [Memory, register, pipeline, stack and queue](../assets/examples/scenes/machine.qmd) |
| Sample a logic level, follow drain current or connect layout layers | [Timing, schematic and layout](../assets/examples/scenes/circuits.qmd) |
| Change a semiconductor state and a related plot from the same value | [Junction depletion, electric field and force vectors](../assets/examples/scenes/physics.qmd) |

Use `.sa-scene` as the component scope. `.sa-grid` accepts `--sa-columns`, `--sa-grid-template` for unequal tracks, and `--sa-grid-gap`. Deck classes can override the low-specificity grid and panel defaults. Set `--sa-dropzone-size` on both matched destinations and give the moving object an identical `data-id` across native Auto-Animate slides. Reserve a separate row for the inserted chip. `data-sa-qa-fixed` with the same name on both destinations verifies alignment and dimensions.

Use `.sa-mark` with `.fragment.custom` or `aria-current="step"`. Its underline and weight carry the cue in addition to the accent. Use `.sa-literal` on a filename inside a stylized heading. If a deck directly sets the transform on the literal, scope a rule to that scene, such as `.reveal #placement .sa-literal { text-transform: none; }`. For compact code or paths that must be read as one token, add `data-sa-qa-token`.

Use fenced Markdown divs for prose and math, and raw HTML fences for inline SVG or script blocks. Copy the mechanics from a recipe, then adjust the composition, typography, and pacing to the teaching material.

Use a div or a Quarto callout for visible annotations. Quarto can treat a raw `<aside>` as speaker notes.
