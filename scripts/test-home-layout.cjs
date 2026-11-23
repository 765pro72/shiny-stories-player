const assert=require('node:assert/strict');
const HomeLayout=require('../public/home-layout.js');

const viewport={width:1920,height:1080};
const short={x:-240,y:-12,width:480,height:800};
const tall={x:-270,y:-8,width:540,height:920};
const scale=HomeLayout.sharedScale([short,tall],viewport,'middle');
const shortPlace=HomeLayout.place(short,0,2,viewport,'middle',scale);
const tallPlace=HomeLayout.place(tall,1,2,viewport,'middle',scale);
assert.equal(shortPlace.scale,tallPlace.scale,'characters share one camera scale; no per-idol bio-height guess');
assert.ok(tallPlace.top<shortPlace.top,'native model bounds retain authored height differences');
assert.equal(shortPlace.bottom,tallPlace.bottom,'feet align to a common ground line');

const modes={short:[1.5,210],middle:[1,0],long:[.7,-200],super_long:[.65,-160]};
for(const [name,[ratio,offset]] of Object.entries(modes)){
  assert.equal(HomeLayout.distances[name].scale,ratio,`${name} official zoom scale`);
  assert.equal(HomeLayout.distances[name].offset,offset,`${name} official camera offset`);
  const placed=HomeLayout.place(short,0,2,viewport,name,scale*ratio);
  assert.equal(placed.distance,name);
  assert.equal(placed.bottom,HomeLayout.frame(viewport.width,viewport.height).top+HomeLayout.frame(viewport.width,viewport.height).height+14+offset);
}
assert.equal(HomeLayout.distanceForCount(1),'short');
assert.equal(HomeLayout.distanceForCount(2),'middle');
assert.equal(HomeLayout.distanceForCount(3),'long');
assert.equal(HomeLayout.distanceForCount(5),'super_long');
assert.ok(HomeLayout.place(short,0,2,viewport,'middle',scale).center<HomeLayout.place(tall,1,2,viewport,'middle',scale).center,'members keep distinct left-to-right positions');

console.log('PASS official home zoom presets, shared character scale, native height differences, and aligned feet.');
