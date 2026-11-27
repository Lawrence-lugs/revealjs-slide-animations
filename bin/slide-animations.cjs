#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash, randomUUID } = require('node:crypto');
const { parseArgs } = require('node:util');
const root = path.resolve(__dirname, '..');
const pkg = require('../package.json');
const name = 'revealjs-slide-animations';
const skill = '.agents/skills/' + name;
const runtime = '_extensions/Lawrence-lugs/slide-animations';
const receipt = '.slide-animations-lock.json';

function files(dir, prefix = '') {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const rel = prefix + entry.name;
    if (entry.name === 'node_modules') return [];
    if (entry.isDirectory()) return files(path.join(dir, entry.name), rel + '/');
    if (!entry.isFile()) throw Error('Unexpected package entry: ' + rel);
    return [rel];
  });
}
function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function read(file) {
  try { return fs.readFileSync(file); }
  catch (e) { if (e.code !== 'ENOENT') throw e; return null; }
}
function projectRoot(dir) {
  for (let p = dir; ; p = path.dirname(p)) {
    if (['_quarto.yml','_quarto.yaml'].some(name => fs.existsSync(path.join(p,name)))) return p;
    if (path.dirname(p) === p || fs.existsSync(path.join(p,'.git'))) return dir;
  }
}
// Do not follow downstream symlinks when replacing managed files.
function destination(project, rel) {
  let p = project;
  for (const part of rel.split('/')) {
    if (!part || part === '..' || part === '.' || /[\\:]/.test(part)) throw Error('Invalid path: ' + rel);
    p = path.join(p, part);
    if (fs.lstatSync(p, {throwIfNoEntry:false})?.isSymbolicLink()) throw Error('Linked path: ' + p);
  }
  return p;
}
function duplicateSkills(project) {
  const paths = new Set();
  const scan = dir => {
    for (const location of ['.opencode/skills','.claude/skills','.agents/skills']) {
      paths.add(path.join(dir, location, name, 'SKILL.md'));
    }
  };
  scan(os.homedir());
  paths.add(path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'opencode/skills', name, 'SKILL.md'));
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    scan(dir);
    if (dir === project || dir === path.dirname(dir) || fs.existsSync(path.join(dir,'.git'))) break;
  }
  scan(project);
  paths.delete(path.join(project, skill, 'SKILL.md'));
  return [...paths].filter(p => fs.existsSync(p));
}
function main() {
  const {values, positionals} = parseArgs({allowPositionals:true, options:{
    project:{type:'string'}, 'replace-existing':{type:'boolean'}, help:{type:'boolean'}
  }});
  const command = positionals[0] || 'install';
  if (values.help) return console.log('slide-animations [install|check] [--project DIR] [--replace-existing]');
  if (positionals.length > 1 || !['install','check'].includes(command)) throw Error('Use --help for usage');
  const project = fs.realpathSync(values.project || projectRoot(process.cwd()));
  if (command === 'check') return syncKit(project, command, values);
  const guard = path.join(project, '.slide-animations-installing');
  try { fs.mkdirSync(guard); }
  catch (error) {
    if (error.code === 'EEXIST') throw Error('Another install is in progress. If it was interrupted, remove '+guard+' and retry.');
    throw error;
  }
  try { syncKit(project, command, values); } finally { fs.rmdirSync(guard); }
}

function syncKit(project, command, values) {
  const inputs = new Map();
  for (const [source,target] of [[skill,skill],['_extensions/slide-animations',runtime]]) {
    for (const rel of files(path.join(root,source))) {
      inputs.set(target+'/'+rel, fs.readFileSync(path.join(root,source,rel)));
    }
  }
  const hashes = Object.fromEntries([...inputs].map(([rel,bytes]) => [rel,digest(bytes)]));
  const manifest = Buffer.from(JSON.stringify({package:pkg.name,version:pkg.version,files:hashes},null,2)+'\n');
  const lockPath = destination(project,receipt);
  const previous = read(lockPath);
  const old = previous ? JSON.parse(previous) : {package:pkg.name, files:{}};
  if (old.package !== pkg.name || !old.files || typeof old.files !== 'object') throw Error('Invalid install receipt');
  const changes = [];
  const conflicts = [];
  for (const rel of new Set([...inputs.keys(),...Object.keys(old.files)])) {
    if (!rel.startsWith(skill+'/') && !rel.startsWith(runtime+'/')) throw Error('Unexpected managed path: '+rel);
    const target = destination(project, rel);
    const before = read(target);
    const after = inputs.get(rel) ?? null;
    if (before === null ? after === null : after && before.equals(after)) continue;
    changes.push({target,before,after});
    if (before && old.files[rel] !== digest(before)) conflicts.push(rel);
  }
  console.log(`Project: ${project}\nSkill: ${skill}\nExtension: ${runtime}\nKit: ${pkg.version}`);
  for (const duplicate of duplicateSkills(project)) console.warn('Also found skill: '+duplicate);
  if (!previous?.equals(manifest)) changes.push({target:lockPath,before:previous,after:manifest});
  if (command === 'check') {
    for (const item of changes) console.error('Differs: '+path.relative(project,item.target));
    if (changes.length) process.exitCode = 1;
    else console.log('Installed files match this package.');
    return;
  }
  if (conflicts.length && !values['replace-existing']) throw Error('Existing files differ. Review before using --replace-existing:\n'+conflicts.join('\n'));
  // Stage siblings before renaming so a failed write cannot truncate a managed file.
  const staged = [], applied = [];
  try {
    for (const item of changes) {
      fs.mkdirSync(path.dirname(item.target),{recursive:true});
      item.tmp = item.target+'.'+randomUUID()+'.tmp';
      staged.push(item);
      if (item.after) fs.writeFileSync(item.tmp,item.after,{flag:'wx'});
    }
    for (const item of staged) {
      if (item.after) fs.renameSync(item.tmp,item.target);
      else fs.unlinkSync(item.target);
      applied.push(item);
    }
  } catch (e) {
    for (const item of applied.reverse()) {
      if (item.before) fs.writeFileSync(item.target,item.before);
      else fs.rmSync(item.target,{force:true});
    }
    throw e;
  } finally {
    for (const item of staged) fs.rmSync(item.tmp,{force:true});
  }
  console.log(changes.length ? 'Installed runtime, skill, examples and QA runner.' : 'Already installed.');
  console.log('Enable slide-animations under format.revealjs.revealjs-plugins in your deck.');
}
try { main(); } catch (e) { console.error(e.message); process.exitCode=1; }
