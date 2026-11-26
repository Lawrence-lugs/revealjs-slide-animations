#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../docs"
mkdir -p _extensions
cp -R ../_extensions/slide-animations _extensions/
if [[ ! -d _extensions/emilhvitfeldt/magic-move ]]; then
  quarto add emilhvitfeldt/quarto-revealjs-magic-move --no-prompt
fi
quarto render
cp index.html _site/index.html
