# Reveal.js slide animations

A small CSS/JS library and an agent skill for meaningful presenter-controlled technical animation.

## Documentation

- [Examples](https://lawrence-lugs.github.io/revealjs-slide-animations/examples.html)
- [Usage guide](https://lawrence-lugs.github.io/revealjs-slide-animations/usage-guide.html)

## Install or update the complete authoring kit

Run this from the consuming Quarto project with Node 22 and npm to install from the current `main`.

```sh
npx --yes "github:Lawrence-lugs/revealjs-slide-animations#main" install
```

For a reproducible install, replace `#main` with `#<full-commit-sha>` or a release tag. To upgrade a pinned install, run the same command with the new revision.

The installer locates the nearest Quarto project or accepts `--project DIR`. It installs the renderer into `_extensions/Lawrence-lugs/slide-animations/` and the complete authoring kit into `.agents/skills/revealjs-slide-animations/`. Commit both directories and `.slide-animations-lock.json`. The receipt fingerprints the installed source files, including examples and QA. Use `check` in place of `install` to compare a project against a selected package revision. The installer reports duplicate skill copies found in standard locations. Review conflicts before using `--replace-existing` to migrate a modified or unmanaged copy.

Enable the plugin on the decks that use it. Your existing Quarto configuration and theme are preserved:

```yaml
format:
  revealjs:
    revealjs-plugins: [slide-animations]
```

The installed skill contains the editable gallery decks and their CSS under `assets/examples/`. Magic Move is optional for decks that use it. Install that third-party plugin with `quarto add emilhvitfeldt/quarto-revealjs-magic-move`. To install just the renderer, Quarto's native `quarto add Lawrence-lugs/revealjs-slide-animations` remains supported.

## Local development

Install Quarto, Python and Node. Run `pip install -r requirements.txt`, `npm install`, `bash scripts/build.sh`, `npm test`, then `npx playwright install chromium` and `npm run test:browser`.

GitHub Pages: set Settings → Pages → Build and deployment → Source to GitHub Actions. The workflow renders both decks, runs tests and deploys main.

The bundled docs stylesheet currently reproduces the supplied theme's relevant heading, layout and fragment rules. The core library is independent of the theme.

## Nested lecture files
Install from the directory containing the active _quarto.yml, not the shell workspace root unless it is a Quarto project. Quarto resolves ancestor extensions up to the project root. Render with `quarto render lectures/week01.qmd` from that root. A nested _quarto.yml is an independent project and needs its own installation; do not copy the extension into each lecture folder. See the usage guide and nested-project CI fixture.

Mermaid uses its existing renderer. The generic `bindElements` adapter applies reveal, focus and flow states to selected SVG elements, including late-rendered diagrams. For scientific plots, `samplePath` with `bindState` animates actual parameters; Magic Move is not a physics-aware interpolator.

## Deck QA

For routine slide review, walk the rendered deck and follow the [final browser checklist](.agents/skills/revealjs-slide-animations/references/quarto-and-qa.md#final-browser-checklist). For an automated smoke scan, set up the optional browser tooling from the installed skill directory:

```sh
npm install
npx playwright install chromium
npm run qa:deck -- http://localhost:8000/slides/deck.html
```

The smoke scan checks forward states at one viewport and writes a JSON report to
`test-results/deck-qa`. Add `--screenshots` to capture each state. Use `--full`
for navigation, multiple viewports, reduced motion and print checks. The project
preview URL is preferable for decks with root-relative assets or media.
