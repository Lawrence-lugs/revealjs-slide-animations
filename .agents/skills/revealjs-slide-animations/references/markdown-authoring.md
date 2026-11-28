# Editable Markdown scenes

Use these recipes after deciding what the audience should see and what each click changes. Copy from the [editable scene deck](../assets/examples/markdown-scenes.qmd). Put the content, commands, links, code, and math in the QMD once. Add layout and timing through the slide and subsection attributes.

Enable both contributions from the installed extension. Add these entries to the deck's existing lists.

```yaml
format:
  revealjs:
    revealjs-plugins: [slide-animations]
    filters: [slide-animations]
```

Use a heading at the deck's Reveal `slide-level` for each recipe. A subsection is one heading level deeper. Deeper headings stay inside that subsection. Include ordinary Markdown and native Quarto elements in subsection bodies. Speaker notes written as `.notes` stay outside the visible sequence.

## Four common recipes

| Slide class | Source | Clicks |
|---|---|---|
| `.sa-exhibits` | A subsection for each independent exhibit | The cards are readable on entry. Each click outlines the next card. |
| `.sa-walkthrough` | Subsections in operation order. Add `.sa-source` to a persistent first panel, `.sa-command` to a terminal, and `.sa-result` to an output panel. | The first subsection is visible on entry. Each later subsection is a click. Later stages replace each other by default. Add `sa-layout="accumulate"` on the slide to keep previous stages in view. |
| `.sa-quiz` | A question heading with the answer in its subsection body | The first question opens the slide. Advance to reveal its answer. Each following question and answer has its own click. |
| `.sa-mermaid-steps` | A Mermaid diagram followed by an ordered list. Start each item with `[Explanation]{sa-node="nodeId"}`. | The first item opens the scene. Each click adds its node and explanation together. Add `sa-mode="focus"` to keep the whole diagram present and dim unrelated elements as the notes advance. Use the Mermaid node ID from the source. |

A native callout at the end of an exhibits or walkthrough slide gets the final click. On the last subsection heading, add `sa-callout="with-step"` to show the callout with that subsection. An earlier callout belongs to its enclosing subsection.

A progressive Mermaid scene reveals a unique rendered edge and its label between consecutive nodes. On a branch item, set `sa-from="earlierNodeId"` to connect from an earlier explanation. For parallel edges or endpoints whose IDs contain underscores, set `sa-edge="edgeId"` and optionally `sa-edge-label="edgeId"`. Declare the edge ID in Mermaid if the renderer supports explicit IDs. Use focus mode when the complete topology should remain visible before discussion. Selectors and unusual diagram mappings can use the [runtime API](api.md).

## File trees and card spacing

In a walkthrough source or placement destination, write a Markdown bullet list with each file name in backticks. End directory names with `/` and indent child entries as a nested list. The filter lays out the files and folders as a tree. Add `.sa-filetree` to another subsection heading to use the same layout there.

```markdown
### Submitted archive {.sa-source}

- `overview.md`
- `images/`
  - `branch-map.svg`
```

Set `--sa-panel-padding` in deck CSS for tighter cards. For a deeper placement tree, set `--sa-dropzone-size` to the same value on both slides so the destination frame stays aligned while the file moves.

## Shared objects and custom motion

For cross-slide placement, put `.sa-placement sa-destination="materials"` on both slide headings. Write two subsections on each slide and mark the fixed one `.sa-destination`. Put an inline span such as `[devices/]{sa-object="moving-folder"}` in the incoming column on one slide and in the destination column on the next. The filter sets up native Auto-Animate, a stable destination, and the geometry check. Set `sa-object` on a subsection heading to match the whole panel across slides with Auto-Animate. Use a different destination ID for an unrelated pair.

Use `.sa-cues` when a custom plot or diagram needs a stable event name. Put the figure before the subsections and add `sa-cue="raise-bias"` to the heading that describes the change. Put the geometry in a small include and bind the same cue from a companion script using `bindState` or `bindTokens`. See [junction figure](../assets/examples/scenes/junction-figure.qmd) and [junction motion](../assets/examples/scenes/junction-motion.js). Keep the prose in QMD and geometry or equations used for interpolation with the figure.

Routine steps get generated beat names. Use explicit cues when a companion asset needs to refer to a click. A later quiz question with cue `review` has answer cue `review-answer`. An opening state is visible before the first click, so it has no named click. Reserve slide-level manual fragment control for slides using the low-level runtime directly.

## Verify an edit

After rendering, edit a command, insert a subsection, or reword a diagram explanation in the QMD. Run targeted browser QA on that slide at 1280×720 and 1024×768. Confirm the edited content, forward order, and the expected visual state. A missing Mermaid node surfaces in binding diagnostics with its first explanation number. A malformed recipe or duplicate named cue produces a render error with the slide ID.
