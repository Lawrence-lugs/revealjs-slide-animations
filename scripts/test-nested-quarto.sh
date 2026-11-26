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
format:
  revealjs:
    revealjs-plugins: [slide-animations]
---
## Native fragments

::: {.fragment .sa-enter-up}
One shared extension.
:::
EOF
cd "$tmp"
quarto render lectures/week01/deck.qmd
grep -q 'SlideAnimations' lectures/week01/deck.html
test ! -e lectures/week01/_extensions
