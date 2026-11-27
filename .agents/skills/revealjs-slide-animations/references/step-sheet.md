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

Complete a simple teaching pass across the inventory before refining individual motion. On delivery, reconcile every slide and live figure against the original inventory and explain any partial or blocked treatment.
