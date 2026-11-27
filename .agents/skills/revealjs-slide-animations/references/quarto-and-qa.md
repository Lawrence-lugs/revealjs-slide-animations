# Quarto integration and QA

## Smoke test in the target project

1. Find the active `_quarto.yml` using `quarto inspect`. Install `slide-animations` once at that root and enable it under the deck's `revealjs-plugins`. A nested independent project owns its own extensions.
2. Render a small deck or temporary test slide with a `.fragment.sa-enter-up` from the project root. Check the emitted HTML for `motion.js`. In the browser, check that `Reveal.getPlugin("slide-animations")` and `window.SlideAnimations` exist, then advance the fragment.
3. If `quarto render path/to/deck.qmd` cannot resolve the installed extension, try a full `quarto render` from the active root. Check the project's render list and plugin slug before changing directory structure. Keep a single extension copy per project.
4. Set `output-dir` at the project level or use `--output-dir` for a project render. For a single document, `--output` takes a basename. Inspect `git status` before and after the build. Some project cleanup targets may delete tracked rendered HTML. Review those deletions and keep a backup or use an isolated checkout if the build cleans tracked outputs.

For inline SVG, use a Pandoc raw HTML fence (`{=html}`) around the entire SVG. Blank lines in bare HTML can break the SVG into separate Pandoc blocks.

## Final browser checklist

Render the deck once and open it in a regular browser. Walk the changed scenes in order with the expected click plan at hand.

1. Check the initial view, each teaching change and the final view. Match figures and annotations to their text, and confirm the click order and answer reveals.
2. Run motion at normal speed. Follow the moving object through the transition. Look for jumps, clipping, mismatched assets and anything that continues to move while the viewer is reading.
3. Go back one click, then forward again on each distinct interaction. Jump away and return to scenes that keep state. Confirm that the same click restores the same text and visual state.
4. Catch layout problems at the longest labels and densest states. Verify that the changed deck links and assets load. Spot-check print or reduced motion when the deck targets those modes.
5. Report what you checked, including the most complex scenes and anything you could only verify in source. If a browser is unavailable, report that limitation.

## Optional automated smoke scan

The Quarto extension runs with its bundled CSS and JS. The [QA runner](../scripts/qa-deck.cjs) ships beside the installed examples. From the installed skill directory, set up its Node 22 dependencies and run:

```sh
npm install
npx playwright install chromium
npm run qa:deck -- http://localhost:8000/slides/deck.html --out test-results/deck
```

The smoke scan walks each forward state once at 1280×720. It uses reduced motion and disables Reveal's slide transitions for quick layout and binding checks. It writes a report with console errors, unresolved bindings and visible elements outside the viewport. Use `--screenshots` for a contact sheet workflow or `--settle-ms` for a deck with custom timed changes. A local HTML path works with relative assets. Use the project's preview URL for root-relative assets, fetched data or embedded media.

For the renderer regression suite, pass `--full`. It exercises reverse, jump, rapid clicks and re-entry at two viewports, then checks reduced motion and print. Full mode waits 1 second after navigation by default and saves screenshots unless you pass `--no-screenshots`. Use `--settle-ms` to cover longer author-defined transitions. Add `data-sa-qa` to compare a custom element's attributes and text after navigation, or `data-sa-qa-ignore-overflow` for intentional bleed. Review intermediate motion and clipping inside figures in the regular browser.

Compare the installed runtime and skill with a pinned kit by running its npx installer with the `check` command. Review reported paths and duplicate skill definitions before updating.
