const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{zipSync}=require('fflate');
const {BackgroundUpdates}=require('../update-background.cjs'),{requestBytes}=require('../update-http.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'sc-background-update-'));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value))};
async function transportTests(){
  let attempts=0;const progress=[];
  const bytes=await requestBytes('https://fixture.invalid/slow',{label:'汉化资料',progress:s=>progress.push(s),attempts:2,connectMs:100,idleMs:40,totalMs:500,fetch:async(_url,{signal})=>{
    attempts++;let timer;return new Response(new ReadableStream({start(controller){signal.addEventListener('abort',()=>{clearInterval(timer);controller.error(signal.reason)},{once:true});if(attempts===1)return;let count=0;timer=setInterval(()=>{controller.enqueue(new Uint8Array([65]));if(++count===6){clearInterval(timer);controller.close()}},18)}}))
  }});
  assert.equal(attempts,2);assert.equal(bytes.toString(),'AAAAAA');assert.ok(progress.some(s=>s.includes('重试')),'stalled reads retry, slow progressing reads keep going');
  await assert.rejects(requestBytes('https://fixture.invalid/not-found',{label:'公开剧情目录',fetch:async()=>new Response('missing',{status:404})}),/公开剧情目录.*HTTP 404.*fixture.invalid/);
}
async function backgroundTests(){
 const previous=path.join(root,'previous'),user=path.join(root,'user');
 write(path.join(previous,'catalog.json'),Array.from({length:100},(_,i)=>({key:'produce_events/'+i+'.json',translated:true})));
 for(const [file,value]of Object.entries({'offline-assets.json':[],'home-catalog.json':[],'home-conversations.json':[],'voice-index.json':[],'card-media.json':[],'update-resource-index.json':{stories:[],voices:[],resources:[]}}))write(path.join(previous,file),value);
 write(path.join(user,'active-data.json'),{data:previous});
 const files={'repo/data/comm-story.csv':Buffer.from('text,trans\n'),'repo/data/name.csv':Buffer.from('name,trans\n'),'repo/data/title.csv':Buffer.from('text,trans\n'),'repo/album/test.json':Buffer.from('{"communications":[]}')};
 for(let i=0;i<100;i++)files['repo/data/story/櫻木真乃/WING/'+i+'.csv']=Buffer.from('id,name,text,trans\ninfo,produce_events/'+i+'.json,,\n1,真乃,hello,你好\n');
 const archive=zipSync(files);let revision='a',fail=false,archives=0,activated=0,ticks=0;
 const fetch=async url=>{if(url.includes('shinycolors.enza.fun'))return new Response('unavailable',{status:404});if(url.includes('commits/master.atom'))return new Response('<id>tag:github.com,2008:Grit::Commit/'+revision.repeat(40)+'</id>');assert.ok(url.startsWith('https://codeload.github.com/'));archives++;if(fail)return new Response('failed',{status:404});return new Response(new ReadableStream({start(controller){setTimeout(()=>{controller.enqueue(archive.subarray(0,100));setTimeout(()=>{controller.enqueue(archive.subarray(100));controller.close()},20)},20)}}))};
 const updates=new BackgroundUpdates(user,{fetch,onActivate:()=>activated++});const checking=updates.check();assert.equal(updates.check(),checking,'login checks share a single task');
 const response=updates.start();assert.equal(response.ok,true);assert.equal(response.state.status,'running');assert.equal(updates.start().alreadyRunning,true);
 const timer=setInterval(()=>ticks++,5);await updates.job;clearInterval(timer);
 assert.equal(updates.snapshot().status,'complete',updates.state.message);assert.ok(ticks>5,'main event loop stays available during worker extraction/build');assert.equal(activated,1);assert.equal(archives,2);assert.ok(updates.state.summary.warnings.some(w=>w.source==='official'),'partial source failures remain visible');
 const pointer=fs.readFileSync(path.join(user,'active-data.json'),'utf8');const recovered=new BackgroundUpdates(user,{fetch});assert.equal(recovered.snapshot().status,'complete','status survives renderer/application recreation');
 updates.start();await updates.job;assert.equal(archives,2,'unchanged archives are reused');
 const beforeFailed=fs.readFileSync(path.join(user,'active-data.json'),'utf8');revision='b';fail=true;const bad=new BackgroundUpdates(user,{fetch});bad.start();await bad.job;assert.equal(bad.state.status,'failed');assert.match(bad.state.message,/SCTranslationData.*HTTP 404/);assert.equal(fs.readFileSync(path.join(user,'active-data.json'),'utf8')===pointer,false,'successful second version was activated');const current=fs.readFileSync(path.join(user,'active-data.json'),'utf8');assert.equal(current,beforeFailed,'failed worker must preserve the exact active pointer');assert.ok(JSON.parse(current).data);assert.equal(JSON.parse(fs.readFileSync(path.join(user,'update-status.json'))).status,'failed');
 write(path.join(user,'update-status.json'),{status:'running',history:[]});const interrupted=new BackgroundUpdates(user);assert.equal(interrupted.state.status,'interrupted');
 await Promise.all([updates.dispose(),recovered.dispose(),bad.dispose(),interrupted.dispose()]);
}
(async()=>{try{await transportTests();await backgroundTests();console.log('PASS background worker, streaming bridge, source-labelled timeout/retry, archive reuse, nonblocking main loop, status recovery and atomic activation')}finally{fs.rmSync(root,{recursive:true,force:true})}})().catch(error=>{console.error(error);process.exitCode=1});
