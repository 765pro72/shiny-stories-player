const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
// A slow/failed renderer must not reveal the previous design before enhancement runs.
const pages={index:'page-home',guide:'guide-unified',library:'page-library','card-gallery':'card-archive','voice-gallery':'page-voice','model-picker':'page-wardrobe','memorial-gallery':'page-memorial','custom-story':'page-custom'};
for(const [page,cls] of Object.entries(pages)){
 const html=fs.readFileSync(`public/${page}.html`,'utf8'),head=html.slice(0,html.indexOf('</head>')),body=html.slice(html.indexOf('<body'));
 assert.ok(head.includes('href="interface.css"')&&head.includes('href="navigation.css"')&&head.includes('href="liquid-glass.css"'),page+' critical styles must block first paint');
 assert.ok(head.includes('<script src="navigation.js"></script>'),page+' registers pagereveal before paint');
 assert.ok(body.startsWith(`<body class="${cls}">`));assert.ok(!body.includes('href="interface.css"'));
 assert.ok(body.includes('<header class="site-header">'),page+' has static final navigation');
}
const home=fs.readFileSync('public/index.html','utf8');assert.ok(home.indexOf('id="announcement"')<home.indexOf('src="player/lib/pixi.js"'));assert.ok(!home.includes('<i>☎</i>'));
assert.ok(!home.includes('class="menus ui"'),'lobby uses the same top navigation instead of duplicate bottom entries');
const code=fs.readFileSync('public/navigation.js','utf8');
const node=()=>({isConnected:true,style:{viewTransitionName:''}}),root={dataset:{}},handlers={},pending=[];
let updates=0,skips=0;
const document={documentElement:root,addEventListener:(type,fn)=>handlers[type]=fn,startViewTransition(callback){let finish;const transition={ready:Promise.resolve(),finished:new Promise(r=>finish=r),skipTransition(){skips++;finish()}};pending.push({callback,finish,transition});return transition}};
const window={top:{},self:{},addEventListener:(type,fn)=>handlers[type]=fn,navigation:{activation:{from:{url:'http://local/voice-gallery.html'}}}};
vm.runInNewContext(code,{document,window,URL,location:{href:'http://local/card-gallery.html'}});
const a=node(),b=node();window.UIFlow.morph(a,b,()=>updates++);window.UIFlow.morph(b,a,()=>updates++);
assert.equal(updates,1,'interruption flushes the opening once, before closing');assert.equal(skips,1);
pending[0].callback();pending[1].callback();assert.equal(updates,2,'stale browser callbacks cannot replay a mutation');
pending[1].finish();
(async()=>{
 await Promise.resolve();await Promise.resolve();assert.equal(a.style.viewTransitionName,'');assert.equal(b.style.viewTransitionName,'');assert.ok(!root.dataset.localMotion);
 handlers.pagereveal({viewTransition:{ready:Promise.resolve(),finished:Promise.resolve(),skipTransition(){}}});assert.equal(root.dataset.motionDirection,'back');
 delete document.startViewTransition;window.UIFlow.morph(a,b,()=>updates++);assert.equal(updates,3,'unsupported browser keeps controls working');
 const layout=require('../public/home-layout.js'),boundsList=[{x:-150,y:-532,width:323,height:908},{x:-170,y:-490,width:340,height:480},{x:-90,y:-270,width:180,height:280}];
 for(const viewport of [{width:1280,height:720},{width:3840,height:2160},{width:2560,height:1080},{width:960,height:900}])for(let count=1;count<=5;count++){
  const v=layout.frame(viewport.width,viewport.height);for(const b of boundsList){const positions=Array.from({length:count},(_,i)=>layout.place(b,i,count,viewport));assert.ok(Math.abs(positions.reduce((n,p)=>n+p.center,0)/count-568)<.001,'group centered');for(const p of positions){assert.ok(p.bottom>=v.top+v.height+13,'cropped lower edge stays below frame');assert.ok(p.top>=v.top,'head remains visible')}}
 }
 const actor=boundsList[0];assert.equal(layout.place(actor,0,1,{width:1280,height:720}).scale,layout.place(actor,0,5,{width:1280,height:720}).scale,'The same explicit camera distance keeps native scale across participant counts');
 console.log('PASS: final shell before renderer; interrupted modal updates once; fallback; direction; 1–5 centered layouts and crop guard at four aspect ratios.');
})().catch(e=>{console.error(e);process.exitCode=1});
