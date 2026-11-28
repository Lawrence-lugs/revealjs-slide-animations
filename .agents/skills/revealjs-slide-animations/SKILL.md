---
name: revealjs-slide-animations
description: Plan and implement presenter-controlled animation for a complete Reveal.js or Quarto deck. Inventory slides, discover teaching demonstrations, synchronize explanatory text with figures, and verify the rendered deck.
---

# Animated technical slides

## Creative brief

When asked to animate a lecture deck, act as the visual director of a technical video. The source QMD supplies the lecturer's claims, examples, and order. Design a composition for each teaching beat, including when the source has only bullets. The presenter advances the beats. Design the scene at its most informative click first, then storyboard how the viewer gets there.

Read the [scene direction playbook](references/scene-direction.md) and find a matching composition in the [scene library](references/scene-library.md) before classifying slides. Sketch attention, composition, movement and continuity across neighboring slides before choosing APIs. Preserve the author's theme, claims and links while freely rearranging content into cards, mock interfaces, diagrams or paired panels. Treat intentionally ordered reading as one possible teaching device. A deck-wide fragment formatting pass still needs a visual design pass.

The lecturer owns the pace. Use motion to explain a change, direct attention, or stage an explanation. Keep reading targets still between clicks.

## Installed examples

Read the local [visual storyboard](assets/examples/scene-direction.qmd) and [companion CSS](assets/examples/scene-direction.css) when designing compositions. Use the [technical examples](assets/examples/examples.qmd) for animated Mermaid, scientific plots and circuits, and the [usage guide](assets/examples/usage-guide.qmd) for API patterns. Browser QA ships in [scripts/qa-deck.cjs](scripts/qa-deck.cjs).

## Read first

- [Worked decisions for text-heavy slides](references/demonstration-design.md)
- [Deck inventory and click plan](references/step-sheet.md)
- [Animation devices](references/animation-devices.md) and [attention rules](references/motion-purpose.md)
- [Integration and QA](references/quarto-and-qa.md), [API and examples](references/api.md), and [Mermaid and plots](references/mermaid-and-plots.md)

## Plan every slide before editing

1. Read the entire deck in source order. Make one inventory row per slide, including dividers and slides that already have fragments. Distinguish live diagrams and code from literal examples. Inventory the prose beside each figure. Verify equations and check operational claims against executable configuration, such as CI workflow rules and Make targets.
2. For every slide, ask what the lecturer could demonstrate that the finished slide only states. Look for cause and effect, command and output, source and rendering, rule and exception, symptom and fix, or stages of a calculation. Sketch the concrete example before choosing a disposition. Name an object the learner can track, its initial state, the operation, and the visible result. If the slide has only bullets, construct that example from the facts already on the slide. Author a small illustrative file, tree, diff, preview or branch diagram. Fit it by replacing redundant prose or using the same area across clicks. Keep the source claims and measure the available layout. Reference material, videos and dividers can stay static with a short reason.
3. Before editing the QMD, write [`storyboard.md`](references/step-sheet.md) with exactly one row per source slide. Record its purpose, most informative frame, beats and explanatory text, or a specific reason to keep it static. Add an initial, intermediate and final frame sketch for each distinct composition, and trace objects reused across slides. Share this for review and proceed unless the user asks to approve it first. For each demonstration, plan what the viewer sees initially and what changes on each click. Name the exact text that appears or gains emphasis, the related figure state, and the material that remains visible. Use one focal teaching change per click. A traveling artifact, its destination, and the sentence explaining its arrival can change together. Separate question, discussion and answer.
4. Implement one representative scene and run the targeted geometry checks at 1280×720 and 1024×768. Then make a working pass through every selected slide before polishing individual effects. Implement the change in the example itself. For conversion, transform a sample input into its output. For a decision, take the alternative branches and show their consequences. Use fragments to drive those changes and to cue the related text. Credit bullet entrances, color changes and focus walks for reading order or synchronization. Revisit any mechanism implemented entirely as entrances or focus. Accept independent card scenes when comparison or classification is the lesson. For a mechanism, inspect what happens to the tracked object across clicks. If rendering or selector trouble blocks a slide, record the issue, keep a legible static state, and continue the pass.
5. Review the proposed static and adequate slides together before declaring coverage complete. For each procedure, transformation or decision among them, revisit the concrete example. Text density, an existing ordered list, or the absence of artwork explains a layout constraint. Record the specific instructional reason to keep it static or implement a compact demonstration. Group operations into meaningful clicks. Avoid one click per bullet by default.
6. Reconcile the rendered deck against the inventory. Confirm the implemented, already adequate, deliberately static and blocked slides. Use [targeted QA](references/quarto-and-qa.md#targeted-geometry-checks) while editing, then run one deck-wide smoke check. Check the measured layout and named beat trace against the storyboard. Run full navigation, reduced-motion and print QA for runtime changes or a final regression. Report coverage and any verification limits.

## Implementation

Prefer [editable Markdown recipes](references/markdown-authoring.md) after designing the composition. Maintain prose, links, math, commands and ordinary diagrams in QMD. Let the filter generate layout containers and internal beat indices. For custom geometry or physical state, use a small companion asset keyed to named cues. Test a realistic edit to each new scene type by changing only the QMD and rendering again.

Use native fragments for ordered reading and text–figure pairing, Auto-Animate for continuity, and `sa-focus-plain` for focus without changing typography or surfaces. Use named beats to synchronize prose and visuals, `bindMermaid` for an existing flowchart, and `bindState` for numerical drivers. Compute all dependent values and marks from the same driver. Decide in the storyboard whether a scene needs [Magic Move](references/animation-devices.md), a separate optional extension. Native Auto-Animate handles shared elements, and CSS or numeric drivers handle small known changes.

Keep the supplied theme and its figure scaling intact. Preserve claims, equations, links, cross-references, meaningful figure content and teaching order. Recompose inside slides, redraw an illegible figure faithfully, or add a continuation slide when the teaching action needs one. Fit the presentation by changing the composition and retaining the source references. Use stable IDs and inspect the actual rendered SVG when mapping targets.
