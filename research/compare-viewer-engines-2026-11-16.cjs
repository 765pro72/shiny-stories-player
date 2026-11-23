// Read-only investigation. Does not modify or launch the installed application.
const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),assert=require('assert/strict'),electron=require('electron');
if(!electron.app){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;process.exit(require('child_process').spawnSync(electron,[__filename],{env,stdio:'inherit'}).status??1)}
const {app,BrowserWindow}=electron,root=path.resolve(__dirname,'..');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'sc-engine-review-')));
let win,server;
app.whenReady().then(async()=>{const timeout=setTimeout(()=>app.exit(1),60000);try{
 const html='<script src="/lib/pixi.js"></script><script src="/lib/pixi-spine.umd.js"></script><script src="/old.js"></script><script src="/new.js"></script><script src="/policy.js"></script>';
 const explicit={'/old.js':'public/player/scripts/SpineManager.js','/new.js':'research/ShinyScenarioViewer/scripts/CharacterStage.js','/policy.js':'public/home-voice-policy.js'};
 server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost').pathname;if(u==='/'){res.setHeader('Content-Type','text/html');return res.end(html)}let f=explicit[u];if(/^\/lib\/[\w.-]+$/.test(u))f='public/player'+u;if(/^\/model\/data\.(json|atlas|png)$/.test(u))f='vendor/assistant-fixtures/spine/idols/stand/1040010010/'+path.basename(u);if(/^\/gasha\/data\.(json|atlas|png)$/.test(u))f='vendor/assistant-fixtures/spine/idols/stand_gasha/1040250080/'+path.basename(u);if(!f){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'application/javascript':f.endsWith('.png')?'image/png':f.endsWith('.json')?'application/json':'text/plain');res.end(fs.readFileSync(path.join(root,f)))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 win=new BrowserWindow({show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.session.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!d.url.startsWith(url+'/')&&!d.url.startsWith('devtools:')}));
 await win.loadURL(url);
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const loader=PIXI.Loader.shared;await new Promise(r=>loader.add('test','/model/data.json').add('gasha','/gasha/data.json').load(r));
  const data=loader.resources.test.spineData;if(!data)throw Error('Real Spine fixture failed to load');
  const create=()=>{const s=new PIXI.spine.Spine(data);try{s.skeleton.setSkinByName('normal')}catch{s.skeleton.setSkinByName('default')}s.autoUpdate=false;return s};
  const sample=s=>s.skeleton.slots.filter(x=>/^(mouth|mouse|lip)/i.test(x.data.name)).map(x=>[x.data.name,x.attachment?.name||null]);
  let lip,openAt,closed,opened;
  for(const a of data.animations.filter(a=>/^lip_/.test(a.name))){const s=create();s.state.setAnimation(5,a.name,true);s.update(0);const first=sample(s);for(let t=.04;t<Math.min(a.duration,2);t+=.04){s.state.getCurrent(5).trackTime=t;s.update(0);const value=sample(s);if(JSON.stringify(value)!==JSON.stringify(first)){lip=a.name;openAt=t;closed=first;opened=value;break}}if(lip)break}
  if(!lip)throw Error('No changing mouth fixture');
  const a=create(),b=create(),old=new SpineManager();
  old._currSpine={A:{currCharId:'1',currCharCategory:'stand'},B:{currCharId:'2',currCharCategory:'stand'}};old._spineMap.set('A_1_stand',a);old._spineMap.set('B_2_stand',b);
  const ta=old._setCharacterAnimation(lip,true,5,a),tb=old._setCharacterAnimation(lip,true,5,b);old._lipTrack=tb;
  old.stopLipAnimation('A');const oldStop={requested:'A',aTimeScale:ta.timeScale,bTimeScale:tb.timeScale};
  const c=create(),d=create(),next=new CharacterStage();next._currSpine={A:{uid:'a'},B:{uid:'b'}};next._spineMap.set('a',c);next._spineMap.set('b',d);
  const tc=next._setAnim(lip,true,5,c),td=next._setAnim(lip,true,5,d);tc.trackTime=openAt;c.update(0);const before=sample(c);next.stopLipAnimation('A');c.update(0);
  const newStop={requested:'A',aTimeScale:tc.timeScale,bTimeScale:td.timeScale,trackTime:tc.trackTime,legacyTimeAlias:tc.time,closedSample:closed,before,after:sample(c),returnsToInitialMouth:JSON.stringify(sample(c))===JSON.stringify(closed)};
  const anim=data.animations.find(x=>x.timelines.some(t=>t.events?.some(e=>e.data.name==='loop_start'&&e.time>0)));if(!anim)throw Error('No loop_start fixture');
  const event=anim.timelines.flatMap(t=>t.events||[]).find(e=>e.data.name==='loop_start');const e=create(),f=create();
  const oldEntry=old._setCharacterAnimation(anim.name,true,0,e);oldEntry.listener.complete();const oldLoop={trackTime:e.state.getCurrent(0).trackTime,legacyTimeAlias:e.state.getCurrent(0).time};
  const newEntry=next._setAnim(anim.name,true,0,f);newEntry.listener.complete();const newLoop={trackTime:f.state.getCurrent(0).trackTime};
  const g=new PIXI.spine.Spine(loader.resources.gasha.spineData);g.autoUpdate=false;
  const gashaNative=next._setAnim('lip_smile1',true,5,g);
  const beforeCount=g.spineData.animations.length,prepared=HomeVoicePolicy.prepareMouth(g),chosen=HomeVoicePolicy.speakingMouth(g);
  return {fixture:'spine/idols/stand/1040010010/data.json',usesActualBundledSpineRuntime:true,noExternalNetwork:true,lip,openAt,oldStop,newStop,loop:{animation:anim.name,expected:event.time,old:oldLoop,new:newLoop},gasha:{fixture:'spine/idols/stand_gasha/1040250080/data.json',nativeAnimationFound:!!gashaNative,existingHomeCompatibilityAdded:g.spineData.animations.length>beforeCount,prepared,chosen}};
 })()`);
 assert.equal(result.oldStop.aTimeScale,1);assert.equal(result.oldStop.bTimeScale,0);
 assert.equal(result.newStop.aTimeScale,0);assert.equal(result.newStop.bTimeScale,1);
 assert.equal(result.newStop.returnsToInitialMouth,true);
 assert.equal(result.loop.old.trackTime,result.loop.expected);assert.equal(result.loop.new.trackTime,result.loop.expected);
 assert.equal(result.gasha.nativeAnimationFound,false);assert.equal(result.gasha.existingHomeCompatibilityAdded,true);assert.ok(result.gasha.chosen);
 const report={at:new Date().toISOString(),scope:'Isolated component reproductions; not a full story-corpus benchmark',upstreamEventViewer:'ba51fdd6c83d2b0794a393958b1810e546016fbc',shinyScenarioViewer:'66e8d7607eb4380762420bc64a593f7898d586c1',...result};
 fs.writeFileSync(path.join(root,'exports/viewer-engine-component-comparison-2026-11-16.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }catch(e){console.error(e);process.exitCode=1}finally{clearTimeout(timeout);win?.destroy();server?.close();app.exit(process.exitCode||0)}});
