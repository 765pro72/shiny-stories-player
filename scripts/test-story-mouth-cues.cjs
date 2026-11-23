const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict'),electron=require('electron');
if(!electron.app){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;process.exit(require('child_process').spawnSync(electron,[__filename,...process.argv.slice(2)],{env,stdio:'inherit'}).status??1)}
const {app,BrowserWindow}=electron,root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'sc-mouth-cues-'));
app.setPath('userData',temp);let win,service;
app.whenReady().then(async()=>{const timeout=setTimeout(()=>app.exit(1),90000);try{
 const program=process.argv.indexOf('--program-root'),programRoot=program>=0?path.resolve(process.argv[program+1]):root;
 service=await require(path.join(programRoot,'server.cjs')).start(path.join(root,'cache'),0,()=>path.join(root,'data'),{customStoryRoot:path.join(temp,'stories')});
 win=new BrowserWindow({show:false,width:1400,height:1000,webPreferences:{offscreen:true,backgroundThrottling:false}});win.webContents.setAudioMuted(true);const js=s=>win.webContents.executeJavaScript(s,true);
 const archive=process.argv.indexOf('--archive'),probe=process.argv.includes('--probe');
 if(archive>=0){const response=await fetch(service.url+'/api/custom-stories?import=1',{method:'POST',body:fs.readFileSync(process.argv[archive+1])}),value=await response.json();if(!response.ok)throw Error(value.error);await win.loadURL(service.url+'/custom-story.html?work='+value.id)}
 else await win.loadURL(service.url+'/custom-story.html');
 const result=await js(`(async()=>{
  const W=StoryWorkshop,C=CustomStory,pause=ms=>new Promise(r=>setTimeout(r,ms));
  ${archive>=0?`while(W.project.scenes.length===1&&!W.project.assets.length)await pause(20);`:`const fixture=C.project();fixture.assets=[{id:'n',name:'七草日花 · 日常服装',source:'builtin',kind:'model',path:'spine/idols/stand/1040240010/data.json'},{id:'v',name:'真实语音',source:'builtin',kind:'audio',path:'sounds/voice/characters/024/mypage_talking_duo_0240250010010.m4a'}];fixture.scenes=['lip_wait_s','lip_sad_s','lip_smile_s','lip_smile_s2','lip_shy','missing_lip','lip_shy'].map((name,i)=>({...C.scene(),speaker:'七草日花',text:'嘴型回归检查',voice:'v',duration:8,characters:[{id:'actor-'+i,asset:'n',x:568,y:650,scale:1,animation:'wait1',talking:true,cues:[{channel:'mouth',at:0,duration:8,animation:name,loop:i!==6,enabled:true}]}]}));await W.adopt({project:fixture,files:new Map()});`}
  const p=W.project,stage=W.stage,mouth=n=>n.skeleton.slots.filter(s=>/^(?:mouth|mouse|lip)(?:_|$)/i.test(s.data.name)).map(s=>s.attachment?.name||'').join(','),rows=[];
  ${archive>=0?'':`p.assets.push({id:'m',name:'绯田美琴 · 日常服装',source:'builtin',kind:'model',path:'spine/idols/stand/1040250080/data.json'});for(const name of ['lip_anger1_s','lip_smile1_s','lip_smile2_s']){const s=C.copy(p.scenes[0]);s.id=C.uid();s.speaker='绯田美琴';s.characters[0].asset='m';s.characters[0].cues[0].animation=name;p.scenes.push(s)}`}
  for(const [i,s]of p.scenes.entries()){
   await stage.show(p,s,{sound:true});stage.playing=false;
   if(s.voice){for(let tries=0;tries<100&&stage.activeVoices.every(v=>v.audio.paused||v.audio.readyState<2);tries++)await pause(20)}
   const cues=s.characters.flatMap(c=>(c.cues||[]).filter(q=>q.channel==='mouth').map(q=>({c,q})));
   for(const {c,q}of cues){const node=stage.nodes.find(n=>n.character.id===c.id)?.node;if(!node)continue;
    const voice=stage.activeVoices.find(v=>v.actorId===c.id),duration=voice?.audio.duration||0;
    if(voice&&q.at>=duration)continue;
    const snapshots=[],offset=q.loop===false?2:0;
    for(const delta of [.04,.15,.39,.49,.78,.93,1.12]){const time=q.at+offset+delta;if(time>=q.at+q.duration||voice&&time>=duration)break;stage.seek(time,true);snapshots.push(mouth(node))}
    const talking=Boolean(voice&&!voice.audio.paused&&!voice.audio.ended&&!voice.audio.error&&q.enabled),animation=node.state.getCurrent(4)?.animation?.name||'';
    rows.push({scene:i+1,speaker:s.speaker,cue:q.animation,enabled:q.enabled,loop:q.loop,animation,talking,moves:new Set(snapshots).size>1,closed:snapshots.every(s=>!/open/i.test(s)),sampledWindow:Math.min(q.at+q.duration,duration||q.at+q.duration)-(q.at+offset),snapshots});
   }
   stage.stopAudio();
  }
  const s=C.copy(p.scenes.find(s=>s.voice));s.id=C.uid();s.captions=[];s.characters[0].cues=[{channel:'mouth',at:0,duration:8,animation:'lip_shy',loop:true,enabled:false}];
  await stage.show(p,s,{sound:true});stage.playing=false;await pause(100);stage.seek(.2,true);const disabledClosed=!/open/i.test(mouth(stage.nodes[0].node));
  s.characters[0].cues[0].enabled=true;stage.activeVoices.forEach(v=>v.audio.pause());stage.seek(.3,true);const pausedClosed=!/open/i.test(mouth(stage.nodes[0].node));
  s.voice='';await stage.show(p,s,{sound:true});stage.playing=false;stage.seek(.3,true);const unvoicedClosed=!/open/i.test(mouth(stage.nodes[0].node));stage.stopAudio();
  return{rows,disabledClosed,pausedClosed,unvoicedClosed};
 })()`);
 const report={at:new Date().toISOString(),archive:archive>=0?path.basename(process.argv[archive+1]):undefined,...result};
 fs.writeFileSync(path.join(root,'exports',program>=0?'user-gwa-mouth-legacy-copy.json':archive>=0?'user-gwa-mouth-cues-'+(probe?'before':'after')+'.json':'story-mouth-cues-verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({checked:result.rows.length,speaking:result.rows.filter(r=>r.talking&&r.sampledWindow>=.25).length,still:result.rows.filter(r=>r.talking&&r.sampledWindow>=.25&&!r.moves),listenersClosed:result.rows.filter(r=>!r.talking).every(r=>r.closed),disabledClosed:result.disabledClosed,pausedClosed:result.pausedClosed,unvoicedClosed:result.unvoicedClosed},null,2));
 if(!probe){for(const r of result.rows){if(r.talking&&r.sampledWindow<.25)continue;assert.ok(r.talking?r.moves:r.closed,'Unexpected mouth state: '+JSON.stringify(r))}for(const key of ['disabledClosed','pausedClosed','unvoicedClosed'])assert.ok(result[key],key)}
 }catch(e){console.error(e);process.exitCode=1}finally{clearTimeout(timeout);win?.destroy();service?.server.close();app.exit(process.exitCode||0)}});
