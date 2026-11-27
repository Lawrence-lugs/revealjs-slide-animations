#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/_extensions/Lawrence-lugs" "$tmp/lectures/week01"
cp -R "$root/_extensions/slide-animations" "$tmp/_extensions/Lawrence-lugs/"
printf 'project:\n  type: default\n' > "$tmp/_quarto.yml"
cat > "$tmp/lectures/week01/deck.qmd" <<'EOF'
---
title: "Nested extension smoke test"
html-math-method: mathml
format:
  revealjs:
    revealjs-plugins: [slide-animations]
    transition: none
---
# Parent

## Native fragments

::: {.fragment .sa-enter-up fragment-index="0"}
One shared extension.
:::

::::: {.columns}
::: {.column width="45%"}
<div id="inspect-text" class="fragment custom sa-focus-plain" data-fragment-index="1">Inspect the item.</div>
:::

:::: {.column width="50%"}
::: {.sa-mermaid #fixture-flow style="--sa-mermaid-max-width: 720px"}
```{mermaid}
flowchart LR
  A[Intake] --> B[Inspection]
  class B inspect
```
:::
::::
:::::

<script type="application/json" data-sa-elements>
{
  "scope": "#fixture-flow",
  "targets": {"inspection": ".node.inspect"},
  "initial": {"show": []},
  "steps": [{"index": 1, "state": {"show": ["inspection"]}}]
}
</script>

## Second vertical slide

Return to the diagram to verify re-entry.
EOF
cd "$tmp"
quarto render lectures/week01/deck.qmd
grep -q 'motion.js' lectures/week01/deck.html
grep -q 'SlideAnimations' lectures/week01/deck.html
test ! -e lectures/week01/_extensions

if [[ "${1:-}" == --browser ]]; then
  shift
  node "$root/scripts/qa-deck.cjs" lectures/week01/deck.html \
    --full --expect-count 4 --settle-ms 400 --out "$root/test-results/nested-deck" "$@"
  node - "$root/test-results/nested-deck/report.json" <<'JS'
const assert = require('node:assert/strict');
const report = require(process.argv[2]);
assert.equal(report.runs.at(-1).pages, 4);
for (const run of report.runs.filter(run => run.name.startsWith('screen'))) {
  const slide = run.slides.find(slide => slide.id === 'native-fragments');
  assert.deepEqual(slide.steps, [-1, 0, 1]);
  for (const [index, state] of slide.states.entries()) {
    const text = state.elements.find(element => element.id === 'inspect-text');
    const node = state.elements.find(element => element.id?.startsWith('flowchart-B-'));
    assert.equal(text.current, index === 2);
    assert.equal(node.hidden, index !== 2);
    assert.equal(text.background, 'rgba(0, 0, 0, 0)');
  }
}
JS
fi
