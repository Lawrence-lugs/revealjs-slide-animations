# Directing a presenter-controlled explainer

Read the [worked storyboard](https://lawrence-lugs.github.io/revealjs-slide-animations/scene-direction.html) or inspect the [editable slide source](https://github.com/Lawrence-lugs/revealjs-slide-animations/blob/main/docs/scene-direction.qmd). A deck can draw its figures live using ordinary HTML and SVG. Design the content first and choose primitives that can realize it.

| Source idea | Composition and motion to consider |
|---|---|
| Parallel principles, responsibilities, metaphor | Compose a collection of distinct cards. Give each a concrete identity, meaningful grouping and reading order. Keep the collection visible for comparison. |
| Inventory and interpretation | Mock a file browser, instrument panel, schematic legend or equivalent professional artifact. Pair the newly introduced row with its role in an adjacent panel. Use names, values and plausible examples from the lesson. |
| Procedure | Show an input artifact, operation and observable result. Build a connected scene. Let an archive become a tree, a command produce a report, or a parameter alter a curve. |
| Consecutive slides about one object | Carry the tree, report, card, waveform or node across the boundary with matched data-id and Auto-Animate. Change its position or scale to make room for the new explanation. |
| Placement and hierarchy | Move the actual item into its destination. Show the destination before and after. Test at the midpoint so an unexpected crossfade is visible. |
| Export, conversion and alternatives | Mock the source editor and resulting document. Expose the changed representation. Use comparison cards for alternative paths. |
| Workflow and publishing | Build nodes and edges in teaching order, draw or traverse connections, then show the outcome. Put the corresponding existing prose beneath the diagram on the same index. Use a stable note area with one active note. A faint focus shift on a completed diagram is easy to miss. |
| Notes and warnings | Bring a summary, link or takeaway in after its explanation. Place a prerequisite warning before the action when the learner needs it. |
| Cross-check | Design a distinct question surface with a separate answer or worked solution revealed at the lecturer's cue. |

For each teaching section, review a contact sheet of initial, intermediate and final states. Can you recognize the subject and describe the relationship from the scene? Can a viewer see what moved at lecture-room scale? If unrelated subjects all look like the same list with the next line highlighted, redesign their compositions. If a slide already contains a figure, plan the arrival of its associated prose as carefully as its visual state. Keep static reading time within the scene. Retain static references and videos where that serves their use.

Deck QA checks mechanics. Evaluate the agent separately by giving it a different original deck and the normal authoring prompt. Inspect whether it invents appropriate artifacts, plans across slide boundaries and synchronizes prose without the user supplying those designs. Record omitted opportunities and unnecessary motion alongside strong treatments.
