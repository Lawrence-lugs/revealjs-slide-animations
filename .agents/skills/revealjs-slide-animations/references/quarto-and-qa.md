# Quarto integration and QA

## Smoke test in the target project

1. Find the active `_quarto.yml` using `quarto inspect`. Install `slide-animations` once at that root and enable it under the deck's `revealjs-plugins`. A nested independent project owns its own extensions.
2. Render a small deck or temporary test slide with a `.fragment.sa-enter-up` from the project root. Check the emitted HTML for `motion.js`. In the browser, check that `Reveal.getPlugin("slide-animations")` and `window.SlideAnimations` exist, then advance the fragment.
3. If `quarto render path/to/deck.qmd` cannot resolve the installed extension, try a full `quarto render` from the active root. Check the project's render list and plugin slug before changing directory structure. Keep a single extension copy per project.
4. Set `output-dir` at the project level or use `--output-dir` for a project render. For a single document, `--output` takes a basename. Inspect `git status` before and after the build. Some project cleanup targets may delete tracked rendered HTML. Review those deletions and keep a backup or use an isolated checkout if the build cleans tracked outputs.

For inline SVG, use a Pandoc raw HTML fence (`{=html}`) around the entire SVG. Blank lines in bare HTML can break the SVG into separate Pandoc blocks.

## Targeted geometry checks

Use a rendered HTML file or the project's existing preview URL. Run a single scene while composing and a whole-deck smoke check when the inventory is complete.

The Quarto extension runs with its bundled CSS and JS. The [QA runner](../scripts/qa-deck.cjs) ships beside the installed examples. From the installed skill directory, set up its Node 22 dependencies and run:

```sh
npm install
npx playwright install chromium
npm run qa:deck -- http://localhost:8000/slides/deck.html --out test-results/deck
```

The smoke scan walks each forward state once at 1280×720. It uses reduced motion and disables Reveal's slide transitions for quick layout and binding checks. It writes a report with console errors, unresolved bindings, fragment consistency and slide-space measurements. Geometry checks include viewport and internal clipping, SVG node text, mid-token wraps and fixed-container drift. Screenshots are optional diagnostics. Use `--settle-ms` for a deck with custom timed changes.

```sh
npm run qa:deck -- path/to/deck.html --slide '#publish-flow' --steps initial,0,1 --viewport 1280x720
```

Repeat `--slide` for IDs or Reveal coordinates such as `6-3`. The first click is index 0. `--no-print` skips the print pass in full mode. Compare a stable QMD with Git using `--changed-only HEAD --source path/to/deck.qmd` from its repository. The runner widens to the requested deck scope when source IDs, slide boundaries, or shared changes prevent mapping.

Use `data-sa-qa-token` for a marked filename or long identifier, `data-sa-qa-node` with `data-sa-qa-label` and `data-sa-qa-shape` for custom SVG nodes, and `data-sa-qa-fixed="destination"` on a fixed object across steps or slides. Add `data-sa-qa-budget` to a fixed-height panel for its available and occupied height. Mark intentional scroll regions with `data-sa-qa-scroll`. Use `data-sa-purpose` for manual fragments when their teaching purpose requires review. An intentional group sharing an index is valid. A local HTML path works with relative assets. Use the project's preview URL for root-relative assets, fetched data or embedded media.

For the renderer regression suite, pass `--full`. It exercises reverse, jump, rapid clicks and re-entry at two viewports, then checks reduced motion and print. Full mode waits 1 second after navigation by default and saves screenshots unless you pass `--no-screenshots`. Use `--settle-ms` to cover longer author-defined transitions. Add `data-sa-qa` to compare a custom element's attributes and text after navigation, or `data-sa-qa-ignore-overflow` for intentional bleed. Check intended normal-speed motion through its state changes and compare final states against the storyboard.

Compare the installed runtime and skill with a pinned kit by running its npx installer with the `check` command. Review reported paths and duplicate skill definitions before updating.
