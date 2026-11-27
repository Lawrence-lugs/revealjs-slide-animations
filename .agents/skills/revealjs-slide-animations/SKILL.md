---
name: revealjs-slide-animations
description: Plan and implement presenter-controlled animation for a complete Reveal.js or Quarto deck. Inventory slides, discover teaching demonstrations, synchronize explanatory text with figures, and verify the rendered deck.
---

# Animated technical slides

The lecturer owns the pace. Use motion to explain a change, direct attention, or stage an explanation. Keep reading targets still between clicks.

## Read first

- [Worked decisions for text-heavy slides](references/demonstration-design.md)
- [Deck inventory and click plan](references/step-sheet.md)
- [Animation devices](references/animation-devices.md) and [attention rules](references/motion-purpose.md)
- [Integration and QA](references/quarto-and-qa.md), [API and examples](references/api.md), and [Mermaid and plots](references/mermaid-and-plots.md)

## Plan every slide before editing

1. Read the entire deck in source order. Make one inventory row per slide, including dividers and slides that already have fragments. Distinguish live diagrams and code from literal examples. Inventory the prose beside each figure. Verify equations and check operational claims against executable configuration, such as CI workflow rules and Make targets.
2. For every slide, ask what the lecturer could demonstrate that the finished slide only states. Look for cause and effect, command and output, source and rendering, rule and exception, symptom and fix, or stages of a calculation. Sketch the concrete example before choosing a disposition. Name an object the learner can track, its initial state, the operation, and the visible result. If the slide has only bullets, construct that example from the facts already on the slide. The author can supply a small illustrative file, tree, diff, preview or branch diagram. Fit it by replacing redundant prose or using the same area across clicks. Keep the source claims and layout limits. Reference material, videos and dividers can stay static with a short reason.
3. For each selected demonstration, plan what the viewer sees initially and what changes on each click. Name the exact text that appears or gains emphasis, the related figure state, and the material that remains visible. Use one focal teaching change per click. Separate question, discussion and answer.
4. Make a working pass through every selected slide before polishing individual effects. Implement the change in the example itself. For conversion, transform a sample input into its output. For a decision, take the alternative branches and show their consequences. Use fragments to drive those changes and to cue the related text. A bullet entrance, color change or diagram focus walk earns credit for reading order or synchronization only. For a mechanism, inspect what happens to the tracked object across clicks. If rendering or selector trouble blocks a slide, record the issue, keep a legible static state, and continue the pass.
5. Review the proposed static and adequate slides together before declaring coverage complete. For each procedure, transformation or decision among them, revisit the concrete example. Text density, an existing ordered list, or the absence of artwork explains a layout constraint. Record the specific instructional reason to keep it static or implement a compact demonstration. Group operations into meaningful clicks. Avoid one click per bullet by default.
6. Reconcile the rendered deck against the inventory. Confirm the implemented, already adequate, deliberately static and blocked slides. Verify that synchronized text and visuals advance and restore together. Review screenshots for framing, label clipping and readability, including intermediate states where geometry moves.

## Implementation

Use native fragments for ordered reading and text–figure pairing, Auto-Animate for continuity, and `sa-focus-plain` for focus without changing typography or surfaces. Use `bindElements` for a fixed Mermaid or SVG layout and `bindState` for numerical drivers. Compute all dependent values and marks from the same driver. Use Magic Move for compatible geometry, math or code after checking the intermediate states.

Keep the supplied theme file intact. Scope new styles to the affected deck or diagram. Preserve source figures and slide structure. Prefer stable IDs and inspect the SVG emitted by the actual renderer before writing selectors.
