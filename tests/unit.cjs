const {test}=require('node:test');const assert=require('node:assert/strict');const m=require('../_extensions/slide-animations/motion.js');
test('interpolation and coupled state',()=>{assert.equal(m.lerp(2,6,.25),3);assert.deepEqual(m.interpolate({x:0,y:[2,4]},{x:10,y:[4,8]},.5),{x:5,y:[3,6]});});
test('zero-duration transition settles',()=>{let state;m.tween({from:0,to:4,duration:0,update:x=>state=x});assert.equal(state,4);});
test('non-numerical state switches at endpoint',()=>{assert.equal(m.interpolate('a','b',.5),'a');assert.equal(m.interpolate('a','b',1),'b');});

test('samplePath regenerates mathematical values in SVG coordinates',()=>{assert.equal(m.samplePath(x=>x*x,{from:0,to:2,samples:3,map:[10,20,2,-3]}),'M10.0000 20.0000 L12.0000 17.0000 L14.0000 8.0000');});
