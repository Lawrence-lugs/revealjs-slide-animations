#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cd "$root"
archive="$(npm pack --silent --pack-destination "$tmp")"
mkdir -p "$tmp/course/lectures"
cd "$tmp/course"
printf 'project:\n  type: default\n' > _quarto.yml
cd lectures
kit=(npx --offline --yes --package "$tmp/$archive" -- slide-animations)
"${kit[@]}" install
"${kit[@]}" check
"${kit[@]}" install
cd ..
skill=.agents/skills/revealjs-slide-animations
test -f "$skill/scripts/qa-deck.cjs"
node - "$skill" <<'JS'
const fs = require('node:fs'), path = require('node:path');
const skill = process.argv[2];
for (const name of ['SKILL.md', ...fs.readdirSync(skill+'/references').map(p=>'references/'+p)]) {
  const file = path.join(skill,name);
  for (const [,link] of fs.readFileSync(file,'utf8').matchAll(/\]\(([^\s)]+)\)/g)) {
    if (/^(https?:|#)/.test(link)) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file),link.split('#')[0]))) throw Error(file+' -> '+link);
  }
}
JS
cp "$skill"/assets/examples/scene-direction.{css,qmd} lectures/
quarto render lectures/scene-direction.qmd
grep -q 'motion.js' lectures/scene-direction.html
if [[ "${1:-}" == --browser ]]; then
  shift
  (cd "$skill" && npm install && node scripts/qa-deck.cjs "$tmp/course/lectures/scene-direction.html" --expect-count 14 --out "$tmp/qa" "$@")
  node - "$tmp/qa/report.json" <<'JS'
const assert = require('node:assert/strict');
const {mode, runs} = require(process.argv[2]);
assert.equal(mode, 'smoke');
assert.deepEqual(runs.map(run => run.name), ['screen-1280x720']);
assert(runs[0].slides.every(slide => slide.states.length === slide.steps.length));
JS
fi
echo 'local edit' >> "$skill/SKILL.md"
if "${kit[@]}" install; then exit 1; fi
if "${kit[@]}" check; then exit 1; fi
"${kit[@]}" install --replace-existing
"${kit[@]}" check
