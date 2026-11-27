# Deck inventory and slide click plan

Fill the inventory in source order before implementing motion.

| Slide ID or heading | Teaching claim | Assets and corresponding prose | Demonstration or reading choice | Disposition |
|---|---|---|---|---|
| Folder structure | Each type of contribution has a destination | File tree and three bullets | Focus each bullet and its tree row together | Synchronize |
| Diagrams and math | Source edges create visible connections | Live Mermaid, literal Mermaid source, equation | Pair each source edge with its rendered edge | Animate |
| CI behavior | Trigger determines whether a deployment runs | Static comparison table | Focus each scenario and its result | Animate |
| Links | Where to find the full procedure | Reference links | Leave accessible throughout | Deliberately static |

Use **animate**, **synchronize**, **already adequate**, or **deliberately static**. If implementation is blocked, keep the intended treatment and record the blocker. Missing assets or unresolved selectors should be visible in the handoff.

For a selected slide, record the initial view and fill the click plan.

| Click | Focal visual change | Exact text revealed or focused | Text that stays visible | Fragment index |
|---|---|---|---|---|
| Initial | Empty contribution folder | Slide title | Destination folder name | None |
| 1 | Focus the Markdown files | One Markdown file per page | Title and folder | 0 |
| 2 | Focus the image subfolder | Put figures in `images/` | Title and folder | 1 |

Check that the final state retains the information learners need. Define what backward navigation, direct jumps and print should show. Test shared indices in rendered HTML after any Lua filters have run.

For each process or choice, add a trace such as `sample.md with an H1 → convert → sample.qmd with front matter`. Record where the viewer sees the same object before and after the operation. Include the referenced text at the same index. Record new demonstrations, staged reading, cues added to existing visuals, and restyled existing fragments separately in the final inventory. Navigation checks verify playback. Manually compare the delivered states to each planned trace.

Complete a simple teaching pass across the inventory before refining individual motion. On delivery, reconcile every slide and live figure against the original inventory and explain any partial or blocked treatment.

Before locking the inventory, sketch adjacent compositions as a sequence. Record the example object, arrangement of cards or panels, what the viewer sees enter or move, matched IDs carried to the next slide, text beneath or beside the focal visual, and the final callout. Review all classification, metaphor and quiz slides for visual treatments too.

## Storyboard before editing

Use one row per source slide. Account for slides that are already adequate and give intentionally static slides a concrete reason. Include the names of any continuation slides on the source row.

| Source slide | Teaching purpose | Most informative frame | Clicks and synchronized text | Disposition or static reason |
|---|---|---|---|---|
| Curator | Distinguish selection, placement and labeling | Three independently legible exhibits, with the current responsibility emphasized | Select → place → label → takeaway | Exhibit cards |
| Folder check | Show what a dry run produces | Archive and command beside warnings and candidate files | Unpack → show command → show warning and output together | File tree and terminal |
| Walkthrough video | Offer a complete narrated demonstration | Existing linked video | Open the walkthrough | The video already performs the demonstration |

For each distinct composition, sketch the initial, intermediate and settled frames in Markdown or HTML. Use boxes, labels and arrows to state what moves, what stays fixed and where text appears. No screenshots are needed. Example trace across neighboring slides:

```text
submission.zip → overview.md → dry run → overview.qmd + warning
                                         ↓
                             materials/devices/overview.qmd
```

Design one representative scene and measure it at both target sizes. Then implement the other inventoried scenes before tuning individual visuals. Reconcile planned and actual click order and confirm that source cross-references survive.
