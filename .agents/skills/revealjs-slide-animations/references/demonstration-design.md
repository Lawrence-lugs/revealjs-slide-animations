# Worked decisions for text-heavy slides

A useful planning prompt is “What would I put on the board while explaining this?” Identify the smallest concrete example the audience can follow, work it through, then choose the markup.

| Source material | What the viewer can watch | How to fit it |
|---|---|---|
| A list of converter operations | Start with a two-line source page. Move its heading into the output metadata, remove the duplicate heading, then change the link destination. | Keep the source fixed at left and update the output at right. Pair each change with its original explanatory clause. |
| A warning continues processing and an error stops it | Step the same input through a validator twice. A warning leaves a report and allows the output stage. An error leaves the output stage unreached. | Use a single pipeline, two example inputs and one status line. Verify the actual failure conditions before choosing inputs. |
| A folder arrives as a mix of pages and assets | Trace a page into a converted destination and an attachment into its copied destination. Highlight the corresponding source and destination paths together. | Use one small tree on either side. Group files sharing the same behavior. |
| An ordered list of preview commands | Run the normal command, expose the preview address, then show how a port collision changes the command and resulting address. | Reuse a two-line terminal and address bar. Keep unrelated checks visible as a compact reference. |
| A table compares deployment triggers | Give two events the same starting state. Advance both through the tested stages and show which event reaches deployment. | Keep a single shared stage layout. Reveal the matching table row when the paths diverge. |
| A reference list or a video | Let the viewer choose a link or attend to the walkthrough. | A static disposition is justified by the learner's task. |

During review, try describing the change without words such as “appears”, “highlights”, or “fades”. “The document title becomes metadata and disappears from the body” identifies a testable transformation. “The next bullet appears” describes an entrance. A synchronized entrance is useful when the purpose is reading order. If the planned purpose was to demonstrate conversion, inspect the actual document states.

For a new domain, derive examples from the source and check them against project behavior. A full rehearsal of every bullet is rarely necessary. One representative input and one consequential exception often carry the explanation. The rendered usage guide includes a two-click source-to-output example.
