# Quarto integration and QA

## Smoke test in the target project

1. Find the active `_quarto.yml` using `quarto inspect`. Install `slide-animations` once at that root and enable it under the deck's `revealjs-plugins`. A nested independent project owns its own extensions.
2. Render a small deck or temporary test slide with a `.fragment.sa-enter-up` from the project root. Check the emitted HTML for `motion.js`. In the browser, check that `Reveal.getPlugin("slide-animations")` and `window.SlideAnimations` exist, then advance the fragment.
3. If `quarto render path/to/deck.qmd` cannot resolve the installed extension, try a full `quarto render` from the active root. Check the project's render list and plugin slug before changing directory structure. Keep a single extension copy per project.
4. Set `output-dir` at the project level or use `--output-dir` for a project render. For a single document, `--output` takes a basename. Inspect `git status` before and after the build. Some project cleanup targets may delete tracked rendered HTML. Review those deletions and keep a backup or use an isolated checkout if the build cleans tracked outputs.

For inline SVG, use a Pandoc raw HTML fence (`{=html}`) around the entire SVG. Blank lines in bare HTML can break the SVG into separate Pandoc blocks.

## Reusable browser QA

The Quarto extension runs with its bundled CSS and JS. The QA runner lives in the [upstream repository](https://github.com/Lawrence-lugs/revealjs-slide-animations) and uses Node 22 and Playwright. From a checkout of that repository:

```sh
npm install
npx playwright install chromium
npm run qa:deck -- http://localhost:8000/slides/deck.html --out test-results/deck
```

A local HTML path also works for self-contained output with relative assets. Use the project's preview URL for root-relative assets, fetched data or embedded media. Try `--help` for viewport, expected slide count, settle time and browser overrides. Increase `--settle-ms` for authored transitions longer than a second. Add `data-sa-qa` to a custom element to compare its attributes and text after navigation. Mark a specific intentional bleed with `data-sa-qa-ignore-overflow`.

The runner uses each rendered slide's horizontal and vertical Reveal indices. It captures initial and forward states at 1280×720 and 1024×768, checks state after reverse, jump, rapid fragment changes and re-entry, and checks reduced-motion and Reveal PDF layouts. The report flags overflow outside the viewport, page errors and unresolved bindings. Review screenshots for clipped text inside figures, visual overlap and whether the finished slide teaches the intended idea. Add deck-specific assertions for content, prints and custom animations.

Compare an installed copy against the current reference checkout with:

```sh
npm run check:extension -- /path/to/project/_extensions/Lawrence-lugs/slide-animations
```

The script prints both manifest versions and checks the runtime files byte for byte. Update the reference checkout first when checking against upstream. Review local customizations before replacing the vendored files.
