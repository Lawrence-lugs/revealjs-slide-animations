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
