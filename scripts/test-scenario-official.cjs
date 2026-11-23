// Requires the full local mirror. This is additional to portable fixture tests.
const fs=require('fs'),path=require('path'),os=require('os'),vm=require('vm'),assert=require('node:assert/strict'),electron=require('electron');
if(!electron.app){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;process.exit(require('child_process').spawnSync(electron,[__filename],{env,stdio:'inherit'}).status??1)}
const {app,BrowserWindow}=electron,root=path.resolve(__dirname,'..');
app.commandLine.appendSwitch('disable-background-timer-throttling');app.commandLine.appendSwitch('disable-renderer-backgrounding');app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'sc-official-engine-')));process.env.SHINY_OFFLINE='1';let win,service;
app.whenReady().then(async()=>{const timeout=setTimeout(()=>app.exit(1),600000);try{
 const context=vm.createContext({console});vm.runInContext(fs.readFileSync(path.join(root,'public/player/scenario/Constants.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'public/player/scenario/AdvResourceConverter.js'),'utf8')+';globalThis.converter=new AdvResourceConverter()',context);
 const fields=['middleFg','voiceKeep','textWait','command','select','movie','bgEffect:fade','bgEffect:blur','bgEffect:white_add','bgEffect:white_fade','bgEffect:mask','bgEffect:fade_out','textCtrl:n','textCtrl:r','textCtrl:l'];
 const selected=new Map(),coverage={};let totalTracks=0,compiled=0;
 for(const row of require('../data/catalog.json')){const tracks=JSON.parse(fs.readFileSync(path.join(root,'cache/json',row.key)));const converted=context.converter.convertResourcePaths(tracks);assert.equal(converted.length,tracks.length);compiled++;totalTracks+=tracks.length;
  for(const field of fields){const [name,value]=field.split(':');if(tracks.some(t=>value?t[name]===value:!!t[name])){coverage[field]=(coverage[field]||0)+1;const before=selected.get(field);if(!before||tracks.length<before.length)selected.set(field,{key:row.key,length:tracks.length})}}
 }
 const keys=[...new Set([...selected.values()].map(r=>r.key).concat(['game_event_communications/400100102.json','game_event_communications/400103307.json','produce_events/302102601.json']))];
 console.log('Compiled',compiled,'scripts,',totalTracks,'tracks; replaying',keys.length,'representative stories');
 service=await require('../server.cjs').start(path.join(root,'cache'),0);win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{offscreen:true,backgroundThrottling:false}});win.webContents.setFrameRate(60);win.webContents.setAudioMuted(true);
 win.webContents.session.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!d.url.startsWith(service.url+'/')&&!d.url.startsWith('blob:')&&!d.url.startsWith('data:')&&!d.url.startsWith('devtools:')}));
 const js=c=>win.webContents.executeJavaScript(c),rows=[];
 for(const key of keys){const at=Date.now();await win.loadURL(service.url+'/player/main.html?key='+encodeURIComponent(key));let ready=false;
  while(Date.now()-at<50000){const state=await js('({started:window.ScenarioBridge?.started,status:document.querySelector("#loading")?.textContent})');if(state.started){ready=true;break}if(state.status?.includes('未能完成'))throw Error(key+': '+state.status);await new Promise(r=>setTimeout(r,80))}assert.ok(ready,'Preload '+key);
  const originalCount=await js('ScenarioBridge.tracks.length');await js('player._mainController._onTapFast()');
  let selections=0,final;
  while(Date.now()-at<80000){const state=await js(`(()=>{const p=player;return{...ScenarioBridge.inspect(),select:p._selectList.active,selecting:p._selectList._selecting,status:document.querySelector('#loading').textContent}})()`);final=state;if(state.error||state.status.includes('未能完成'))throw Error(key+': '+JSON.stringify(state));if(state.ended)break;if(state.select&&!state.selecting){await js("player._selectList._items[0].emit('pointertap')");selections++}await new Promise(r=>setTimeout(r,40))}
  const result={key,tracks:originalCount,completed:!!final?.ended,elapsedMs:Date.now()-at,selections,status:final?.status,current:final?.current};rows.push(result);console.log(JSON.stringify(result));assert.ok(result.completed,'Story did not complete: '+JSON.stringify(final));
 }
 const report={at:new Date().toISOString(),networkDisabled:true,fullLocalMirror:true,compiledScripts:compiled,compiledTracks:totalTracks,coverage,representativeStories:rows,allRepresentativeStoriesCompleted:rows.every(r=>r.completed),notEveryStoryFullyReplayed:true};fs.writeFileSync(path.join(root,'exports/scenario-official-verification.json'),JSON.stringify(report,null,2));console.log('PASS original script compilation and representative official story playback');
 }catch(e){console.error(e);process.exitCode=1}finally{clearTimeout(timeout);win?.destroy();service?.server.close();app.exit(process.exitCode||0)}});
