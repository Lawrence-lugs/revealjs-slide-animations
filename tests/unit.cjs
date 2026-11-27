const {test}=require('node:test');const assert=require('node:assert/strict');const m=require('../_extensions/slide-animations/motion.js');
test('interpolation and coupled state',()=>{assert.equal(m.lerp(2,6,.25),3);assert.deepEqual(m.interpolate({x:0,y:[2,4]},{x:10,y:[4,8]},.5),{x:5,y:[3,6]});});
test('zero-duration transition settles',()=>{let state;m.tween({from:0,to:4,duration:0,update:x=>state=x});assert.equal(state,4);});
test('non-numerical state switches at endpoint',()=>{assert.equal(m.interpolate('a','b',.5),'a');assert.equal(m.interpolate('a','b',1),'b');});

test('samplePath regenerates mathematical values in SVG coordinates',()=>{assert.equal(m.samplePath(x=>x*x,{from:0,to:2,samples:3,map:[10,20,2,-3]}),'M10.0000 20.0000 L12.0000 17.0000 L14.0000 8.0000');});

test('changed-only maps explicit slide IDs and widens for shared changes', () => {
  const {execFileSync} = require('node:child_process');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-changed-'));
  try {
    const git = (...args) => execFileSync('git', args, {cwd:root, stdio:'ignore'});
    const source = '---\ntitle: Demo\n---\n\n## Alpha {#alpha}\nBefore\n\n## Beta {#beta}\nSame\n';
    const qmd = path.join(root, 'deck.qmd');
    fs.writeFileSync(qmd, source);
    git('init', '-q');
    git('add', 'deck.qmd');
    git('-c', 'user.name=QA', '-c', 'user.email=qa@example.invalid', 'commit', '-qm', 'Initial');
    const script = path.resolve(__dirname, '../.agents/skills/revealjs-slide-animations/scripts/changed-slides.cjs');
    const changed = () => JSON.parse(execFileSync(process.execPath, [
      '-e', 'console.log(JSON.stringify(require(process.argv[1])("HEAD", process.argv[2])))',
      script, qmd
    ], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}));
    assert.deepEqual(changed(), []);
    fs.writeFileSync(qmd, source.replace('Before', 'After\n```md\n## Not a slide\n```'));
    assert.deepEqual(changed(), ['alpha']);
    fs.writeFileSync(path.join(root, 'theme.scss'), '.reveal{}');
    assert.equal(changed(), null);
  } finally {
    fs.rmSync(root, {recursive:true, force:true});
  }
});
