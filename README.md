# Reveal.js slide animations

A small CSS/JS library and an agent skill for meaningful presenter-controlled technical animation.

## Documentation

- [Examples](https://lawrence-lugs.github.io/revealjs-slide-animations/examples.html)
- [Usage guide](https://lawrence-lugs.github.io/revealjs-slide-animations/usage-guide.html)

## Install

```sh
quarto add Lawrence-lugs/revealjs-slide-animations
quarto add emilhvitfeldt/quarto-revealjs-magic-move
```

Enable `revealjs-plugins: [slide-animations, magic-move]` under the Reveal.js format. Magic Move is optional. For plain Reveal.js, use the CSS and JS in `_extensions/slide-animations` and register `SlideAnimations` as a plugin.

The agent skill lives at `.agents/skills/revealjs-slide-animations`. Copy it to your project's skills folder; use the usage guide as its API reference.

## Local development

Install Quarto, Python and Node. Run `pip install -r requirements.txt`, `npm install`, `bash scripts/build.sh`, `npm test`, then `npx playwright install chromium` and `npm run test:browser`.

GitHub Pages: set Settings → Pages → Build and deployment → Source to GitHub Actions. The workflow renders both decks, runs tests and deploys main.

The bundled docs stylesheet currently reproduces the supplied theme's relevant heading, layout and fragment rules. The core library is independent of the theme.

## Nested lecture files
Install from the directory containing the active _quarto.yml, not the shell workspace root unless it is a Quarto project. Quarto resolves ancestor extensions up to the project root. Render with `quarto render lectures/week01.qmd` from that root. A nested _quarto.yml is an independent project and needs its own installation; do not copy the extension into each lecture folder. See the usage guide and nested-project CI fixture.

Mermaid uses its existing renderer. The generic `bindElements` adapter applies reveal, focus and flow states to selected SVG elements, including late-rendered diagrams. For scientific plots, `samplePath` with `bindState` animates actual parameters; Magic Move is not a physics-aware interpolator.

## Deck QA

The extension runs in Quarto with CSS and JavaScript. Install the optional Node
22 and Playwright tools in a checkout of this repository to review any rendered
deck:

```sh
npm install
npx playwright install chromium
npm run qa:deck -- http://localhost:8000/slides/deck.html --expect-count 12
npm run check:extension -- /path/to/project/_extensions/Lawrence-lugs/slide-animations
```

QA writes screenshots and a JSON report to `test-results/deck-qa` and returns a
nonzero exit code for detected problems. Use `--help` for local HTML, viewport,
settle-time, and output options. The project preview URL is preferable for
decks with root-relative assets or media. See the
[installed skill's setup and QA instructions](.agents/skills/revealjs-slide-animations/references/quarto-and-qa.md)
for integration and print notes.
