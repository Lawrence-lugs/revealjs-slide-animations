const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function explicitSections(source) {
  const sections = new Map();
  let id = '', fence = '', preamble = '';
  for (const line of source.split(/\r?\n/)) {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (marker && (!fence || (marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()))) {
      fence = fence ? '' : marker[1];
    } else if (!fence && /^ {0,3}#{1,2}\s/.test(line)) {
      id = line.match(/\{[^}]*#([\w.-]+)(?:\s|\})/)?.[1];
      if (!id || sections.has(id)) throw new Error('level 1 and 2 headings need distinct explicit IDs');
      sections.set(id, '');
    } else if (!fence && /^ {0,3}(?:---+|\*\s*\*\s*\*)\s*$/.test(line) && id) {
      throw new Error('unlabeled slide separators prevent accurate mapping');
    }
    if (id) sections.set(id, sections.get(id) + line + '\n');
    else preamble += line + '\n';
  }
  if (!sections.size || fence) throw new Error('could not partition the QMD');
  return {preamble, sections};
}

function affectsOtherSlides(id, section) {
  if (/<style\b/i.test(section)) return true;
  const scriptCount = [...section.matchAll(/<script\b/gi)].length;
  const scripts = [...section.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  if (scriptCount !== scripts.length) return true;
  return scripts.some(([, attributes, body]) => {
    if (!/\btype=["']application\/json["']/i.test(attributes) ||
        !/\sdata-sa-(?:beats|elements|mermaid|tokens|timeline)(?:\s|=|$)/i.test(attributes)) return true;
    let scope;
    try { scope = JSON.parse(body).scope; }
    catch { return true; }
    if (typeof scope !== 'string' || !/^#[\w.-]+$/.test(scope)) return true;
    // Only trust a local, plainly authored ID. Complex selectors and includes
    // can resolve to another slide in the rendered document.
    const name = scope.slice(1);
    if (name === id) return false;
    return ![...section.matchAll(/\bid=["']([\w.-]+)["']|\{[^}]*#([\w.-]+)(?:\s|\})/g)]
      .some(([, htmlId, markdownId]) => (htmlId ?? markdownId) === name);
  });
}

module.exports = function changedSlides(ref, input) {
  const git = (...args) => execFileSync('git', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
  try {
    if (!input) throw new Error('--source is required for QMD mapping');
    const source = path.resolve(input);
    if (!source.endsWith('.qmd')) throw new Error('--source must be a QMD');
    const root = git('rev-parse', '--show-toplevel').trim();
    const file = path.relative(root, source).split(path.sep).join('/');
    const base = git('rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`).trim();
    const changes = new Set([
      ...git('-C', root, 'diff', '--name-only', '-z', base, '--').split('\0').filter(Boolean),
      ...git('-C', root, 'ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(Boolean)
    ]);
    if ([...changes].some(name => name !== file)) throw new Error('files outside the QMD changed');
    const oldText = git('-C', root, 'show', `${base}:${file}`);
    const newText = fs.readFileSync(source, 'utf8');
    if (/\{\{<\s+include\b|^\s*slide-level\s*:/m.test(oldText + '\n' + newText)) {
      throw new Error('includes or custom slide boundaries require a full scan');
    }
    const before = explicitSections(oldText), after = explicitSections(newText);
    if (before.preamble !== after.preamble ||
      JSON.stringify([...before.sections.keys()]) !== JSON.stringify([...after.sections.keys()])) {
      throw new Error('deck metadata or slide order changed');
    }
    if ([...before.sections, ...after.sections].some(([id, section]) => affectsOtherSlides(id, section))) {
      throw new Error('inline styles or scripts may affect multiple slides');
    }
    return [...after.sections].filter(([id, section]) => before.sections.get(id) !== section).map(([id]) => id);
  } catch (error) {
    console.warn(`Changed-slide selection unavailable (${error.message}). Scanning the requested deck scope.`);
    return null;
  }
};
