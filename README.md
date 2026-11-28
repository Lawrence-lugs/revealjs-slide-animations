# Reveal.js slide animations

A small CSS/JS library and an agent skill for meaningful presenter-controlled technical animation.

## Documentation

- [Examples](https://lawrence-lugs.github.io/revealjs-slide-animations/examples.html)
- [Usage guide](https://lawrence-lugs.github.io/revealjs-slide-animations/usage-guide.html)

## Editable Markdown scenes

The optional authoring filter turns decorated slide headings and ordinary Markdown into staged cards, walkthroughs, quizzes, and synchronized Mermaid diagrams. To enable it, add `slide-animations` to both `filters` and `revealjs-plugins` in the deck's Reveal format. The existing install command includes the filter.

The gallery includes Markdown-only placement scenes and a junction animation wired to named cues. [Rendered examples](https://lawrence-lugs.github.io/revealjs-slide-animations/markdown-scenes.html) · [Authoring syntax](.agents/skills/revealjs-slide-animations/references/markdown-authoring.md)

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

GitHub Pages: set Settings → Pages → Build and deployment → Source to GitHub Actions. The workflow renders the documentation decks, runs tests and publishes main.

The bundled docs stylesheet currently reproduces the supplied theme's relevant heading, layout and fragment rules. The core library is independent of the theme.

## Nested lecture files
Install from the directory containing the active _quarto.yml, not the shell workspace root unless it is a Quarto project. Quarto resolves ancestor extensions up to the project root. Render with `quarto render lectures/week01.qmd` from that root. A nested _quarto.yml is an independent project and needs its own installation; do not copy the extension into each lecture folder. See the usage guide and nested-project CI fixture.

Mermaid uses its existing renderer. `bindMermaid` resolves flowchart nodes, edges and labels and applies reveal, focus and flow states after Mermaid renders. The generic `bindElements` adapter handles arbitrary selectors. For scientific plots, `samplePath` with `bindState` animates actual parameters; Magic Move is not a physics-aware interpolator.

## Deck QA

For routine slide review, use the targeted geometry checks and compare the results with the storyboard. Set up the browser tooling from the installed kit directory.

```sh
npm install
npx playwright install chromium
npm run qa:deck -- http://localhost:8000/slides/deck.html
```

The smoke scan checks forward states at one viewport and writes a JSON report to
`test-results/deck-qa`. Add `--screenshots` to capture each state. Use `--full`
for navigation, multiple viewports, reduced motion and print checks. The project
preview URL is preferable for decks with root-relative assets or media.

## Reusable scenes

The [scene gallery](https://lawrence-lugs.github.io/revealjs-slide-animations/scene-gallery.html) includes file intake, terminal and web mockups, folder placement, a synchronized Mermaid flowchart, a branching timeline, and examples for architecture, circuits and device physics. The installer ships the editable recipes and storyboard guidance with the runtime. Named beats keep the explanatory text, diagram and token motion on the same click.

Run targeted DOM geometry checks while composing a scene.

```sh
npm run qa:deck -- path/to/deck.html --slide '#publish-flow' --steps initial,0,1
```

The report includes internal clipping, broken filenames, fixed destination drift and unreachable fragment states.
