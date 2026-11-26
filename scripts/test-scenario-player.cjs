// Real renderer integration: both old host dialogs and the new playback bridge.
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict'),electron=require('electron');
if(!electron.app){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;process.exit(require('child_process').spawnSync(electron,[__filename,...process.argv.slice(2)],{env,stdio:'inherit'}).status??1)}
const {app,BrowserWindow}=electron,root=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'sc-scenario-player-'));
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
app.setPath('userData',path.join(temp,'profile'));process.env.SHINY_OFFLINE='1';let win,service;
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v))};
app.whenReady().then(async()=>{const timer=setTimeout(()=>app.exit(1),150000);try{
 const arg=process.argv.indexOf('--program-root'),program=arg>=0?path.resolve(process.argv[arg+1]):root,cache=path.join(temp,'cache'),data=path.join(temp,'data');
 fs.cpSync(path.join(program,'vendor/assistant-fixtures'),cache,{recursive:true});
 const base='spine/idols/stand_gasha/',aData=JSON.parse(fs.readFileSync(path.join(cache,base,'1040240080/data.json'))),bData=JSON.parse(fs.readFileSync(path.join(cache,base,'1040250080/data.json'))),idle=j=>Object.keys(j.animations).find(n=>/^wait/.test(n))||Object.keys(j.animations)[0];
 for(const sound of ['voice/events/scenario_a','voice/events/scenario_b','bgm/scenario_bgm','se/event/scenario_se']){const target=path.join(cache,'sounds',sound+'.m4a');fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(program,'public/home-assets/test-voice.m4a'),target)}
 const {PNG}=require('pngjs'),image=new PNG({width:16,height:16});image.data.fill(128);const fg=path.join(cache,'images/event/fg/scenario_fg.png');fs.mkdirSync(path.dirname(fg),{recursive:true});fs.writeFileSync(fg,PNG.sync.write(image));
 const key='produce_events/scenario_bridge_test.json',newKey='produce_events/scenario_after_update.json';
 const source=[
  {bg:'00001',textFrame:'001',charType:'idols',charCategory:'stand_gasha',charId:'1040240080',charLabel:'a',charPosition:{x:380,y:650,order:0},charAnim1:idle(aData)},
  {charType:'idols',charCategory:'stand_gasha',charId:'1040250080',charLabel:'b',charPosition:{x:790,y:650,order:1},charAnim1:idle(bData)},
  {middleFg:'scenario_fg',middleFgEffect:'fade',middleFgEffectTime:10,bgm:'scenario_bgm',bgmFadeTime:10,se:'scenario_se'},
  {bg:'00001',bgEffect:'fade',bgEffectTime:10,waitType:'effect'},
  {waitType:'time',waitTime:10},
  {id:'a1',speaker:'にちか',text:'プロデューサーさん、お疲れさまです。',textCtrl:'p',charLabel:'a',charLipAnim:'lip_wait1',voice:'scenario_a'},
  {id:'p1',speaker:'プロデューサー',text:'お疲れさま。',textCtrl:'p'},
  {id:'b1',speaker:'美琴',text:'話を聞いてくれる？',textCtrl:'p',charLabel:'b',charLipAnim:'lip_wait1',voice:'scenario_b'},
  {select:'はい',nextLabel:'yes'}, {select:'いいえ',nextLabel:'no'},
  {label:'yes',id:'yes',speaker:'にちか',text:'ありがとう。',textCtrl:'p',textWait:180,charType:'idols',charCategory:'stand_gasha',charId:'1040240080',charLabel:'a'},
  {nextLabel:'end'}, {label:'no',speaker:'美琴',text:'またね。',textCtrl:'p'}, {label:'end'}
 ];
 write(path.join(cache,'json',key),source);write(path.join(cache,'json',newKey),[{bg:'00001',textFrame:'001',speaker:'にちか',text:'更新された台詞。',textCtrl:'p'}]);
 write(path.join(data,'catalog.json'),[{key,title:'内核兼容回归',idol:'七草日花',group:'测试',category:'卡片剧情',translated:true}]);
 write(path.join(data,'names.json'),{'にちか':'七草日花','美琴':'绯田美琴','プロデューサー':'制作人'});write(path.join(data,'common.json'),{});
 write(path.join(data,'translations',key),{translator:'模拟测试译文',rows:[{id:'a1',text:source[5].text,trans:'制作人，辛苦了。'},{id:'p1',text:source[6].text,trans:'辛苦了。'},{id:'b1',text:source[7].text,trans:'愿意听我说吗？'},{id:'select',text:'はい',trans:'好'},{id:'select',text:'いいえ',trans:'不了'},{id:'yes',text:'ありがとう。',trans:'谢谢。'}]});
 let active=data;service=await require(path.join(program,'server.cjs')).start(cache,0,()=>active,{customStoryRoot:path.join(temp,'works')});
 win=new BrowserWindow({show:false,width:1450,height:1100,webPreferences:{backgroundThrottling:false,offscreen:true}});win.webContents.setFrameRate(60);win.webContents.setAudioMuted(true);win.webContents.on('console-message',(_,l,m)=>{if(l>=3)console.log('renderer',m.slice(0,300))});
 win.webContents.session.webRequest.onBeforeRequest((d,cb)=>cb({cancel:!d.url.startsWith(service.url+'/')&&!d.url.startsWith('devtools:')&&!d.url.startsWith('data:')&&!d.url.startsWith('blob:')}));
 const js=code=>win.webContents.executeJavaScript(code,true),wait=async(code,label)=>{const at=Date.now();while(!await js(code)){if(Date.now()-at>(label==='branch'?6000:25000))throw Error(label+': '+JSON.stringify(await js('({parent:document.querySelector("#status")?.textContent,child:document.querySelector("iframe")?.contentDocument?.querySelector("#loading")?.textContent,state:document.querySelector("iframe")?.contentWindow?.ScenarioBridge?.inspect(),choices:(()=>{const p=document.querySelector("iframe")?.contentWindow?.player;return{active:p?._selectList?.active,selecting:p?._selectList?._selecting,items:p?._selectList?._items?.length,next:p?._trackManager?._nextLabel,debug:document.querySelector("iframe")?.contentWindow?.choiceDebug,tweens:document.querySelector("iframe")?.contentWindow?.gsap?.globalTimeline.getChildren().map(t=>({time:t.time(),duration:t.duration(),paused:t.paused(),active:t.isActive(),start:t.startTime(),delay:t.delay(),target:t.targets?.().map(x=>x.constructor.name),parentTime:t.parent?.time(),parentScale:t.parent?.timeScale(),ease:String(t.vars.ease)}))}})()})')));await new Promise(r=>setTimeout(r,35))}};
 await win.loadURL(service.url+'/library.html');await wait('typeof openStoryByKey==="function"&&!!document.querySelector("#list button")','library ready');await js(`openStoryByKey(${JSON.stringify(key)})`);
 await wait('document.querySelector("#frame").contentWindow.ScenarioBridge?.started&&document.querySelector("#frame").contentWindow.ScenarioBridge?.player._trackManager._current===5','voice track');
 if(process.argv.includes('--backlog-only')){
  await js(`document.querySelector('#frame').contentWindow.player._mainController._ui.btnLog.emit('pointerup')`);
  await wait('document.querySelector("#frame").contentWindow.player._paused','backlog button');
  await js(`document.querySelector('#frame').contentWindow.player._scenarioLogLayer.close()`);
  await wait('!document.querySelector("#frame").contentWindow.player._paused','log closed');
  await js(`document.querySelector('#frame').contentWindow.player.emit('end')`);
  await wait('document.querySelector("#frame").contentWindow.ScenarioBridge.ended','story end');
  assert.equal(await js('document.querySelector("#frame").contentDocument.querySelector("#loading").style.display'),'none');
  await js(`document.querySelector('#frame').contentWindow.player._mainController._ui.btnLog.emit('pointerup')`);
  await wait('document.querySelector("#frame").contentWindow.player._paused','backlog after story end');
  await js(`(()=>{
   const p=document.querySelector('#frame').contentWindow.player;
   const entry=p._scenarioLogLayer._listHost.children.find(child=>child.buttonMode);
   const event={data:{global:{x:250,y:200}}};
   entry.emit('pointerdown',event);
   entry.emit('pointertap',event);
  })()`);
  await wait('(()=>{const w=document.querySelector("#frame").contentWindow;return !w.ScenarioBridge.ended&&!w.player._paused&&w.player._trackManager._current===5})()','click log to replay');
  assert.equal(await js('!!document.querySelector("#backlog")'),false);
  console.log('Native backlog opens during and after playback, and clicking a line resumes it');
  return;
 }
 const initial=await js(`(()=>{const w=document.querySelector('#frame').contentWindow,p=w.player;return{engine:w.ScenarioBridge.inspect(),translated:w.ScenarioBridge.tracks[5].text,fg:p._middleFgLayer._main.texture.width,characters:p._characterStage._spineMap.size,mouth:[...p._characterStage._spineMap.values()].map(s=>s.state.getCurrent(5)?.animation?.name),menu:!!document.querySelector('.story-engine-settings select'),quality:!!document.querySelector('.story-quality-settings'),transcript:document.querySelector('#transcript').textContent}})()`);
 assert.equal(initial.translated,'制作人，辛苦了。');assert.equal(initial.fg,16);assert.equal(initial.characters,2);assert.ok(initial.mouth.includes('lip_home_compatible'));assert.ok(initial.menu&&initial.quality);assert.match(initial.transcript,/模拟测试译文|制作人，辛苦了/);
 await js(`document.querySelector('.story-engine-settings button').click()`);await wait(`document.querySelector('dialog[aria-label="播放器源码与许可"] iframe')?.contentDocument?.body?.textContent.includes('AGPL')||document.querySelector('dialog[aria-label="播放器源码与许可"] iframe')?.contentDocument?.body?.textContent.includes('Affero')`,'source notice');assert.ok(await js(`document.querySelector('dialog[aria-label="播放器源码与许可"]').open`));await js(`document.querySelector('dialog[aria-label="播放器源码与许可"] button').click()`);
 await js(`send('settings',{overrides:{'プロデューサーさん、お疲れさまです。':'本机补译保留'},volume:.25})`);await wait('document.querySelector("#frame").contentWindow.ScenarioBridge.tracks[5].text==="本机补译保留"','override');
 assert.equal(await js('document.querySelector("#frame").contentWindow.PIXI.sound.volumeAll'),.25);
 await js(`document.querySelector('#lang').value='both';document.querySelector('#lang').dispatchEvent(new Event('change'))`);await wait('document.querySelector("#frame").contentWindow.ScenarioBridge.tracks[5].text.includes("\\nプロデューサー")','bilingual');
 await js(`document.querySelector('#lang').value='jp';document.querySelector('#lang').dispatchEvent(new Event('change'))`);await wait('document.querySelector("#frame").contentWindow.ScenarioBridge.tracks[5].text.startsWith("プロデューサー")','Japanese');
 // Toggle auto while a real decoded voice is active: it must not cut the line.
 await js(`send('auto');send('auto')`);await new Promise(r=>setTimeout(r,80));assert.equal(await js('document.querySelector("#frame").contentWindow.player._trackManager._current'),5);
 await js(`document.querySelector('#frame').contentWindow.player._scenarioPlayer.endText();send('next')`);await wait('document.querySelector("#frame").contentWindow.player._trackManager._current===6','producer');
 const producer=await js(`(()=>{const p=document.querySelector('#frame').contentWindow.player;return{bubble:p._currentVoiceIsLooping,closed:[...p._characterStage._spineMap.values()].every(s=>!s.state.getCurrent(5)||s.state.getCurrent(5).timeScale===0)}})()`);assert.ok(producer.bubble&&producer.closed);
 await js(`document.querySelector('#frame').contentWindow.player._scenarioPlayer.endText();send('next')`);await wait('document.querySelector("#frame").contentWindow.player._trackManager._current===7','second speaker');
 const ownership=await js(`(()=>{const p=document.querySelector('#frame').contentWindow.player,s=p._characterStage,a=s._spineMap.get(s._getUid('a')),b=s._spineMap.get(s._getUid('b'));return{a:a.state.getCurrent(5)?.timeScale||0,b:b.state.getCurrent(5)?.timeScale||0}})()`);assert.equal(ownership.a,0);assert.equal(ownership.b,1);
 await js(`document.querySelector('#frame').contentWindow.player._mainController._ui.btnLog.emit('pointerup')`);await wait('document.querySelector("#frame").contentWindow.player._paused','backlog button');
 await js(`(()=>{const p=document.querySelector('#frame').contentWindow.player;p._replayLogVoice(p._trackManager.currentTrack.voice)})()`);assert.ok(await js('!!document.querySelector("#frame").contentWindow.player.soundController._currentLogVoice'));
 await js(`document.querySelector('#frame').contentWindow.player._scenarioLogLayer.close()`);await wait('document.querySelector("#frame").contentWindow.player._paused===false','log close animation');assert.equal(await js('!!document.querySelector("#frame").contentWindow.player.soundController._currentLogVoice'),false);
 await js(`document.querySelector('#frame').contentWindow.player._scenarioPlayer.endText();send('next')`);await wait('document.querySelector("#frame").contentWindow.player._selectList.active','choices');
 assert.equal(await js('document.querySelector("#frame").contentWindow.player._selectList._items.length'),2);
 await js(`document.querySelector('#frame').contentWindow.player._selectList._items[0].emit('pointertap')`);await wait('document.querySelector("#frame").contentWindow.player._trackManager.currentTrack.label==="yes"','branch');
 await new Promise(r=>setTimeout(r,230));assert.equal(await js('document.querySelector("#frame").contentWindow.player._characterStage._spineMap.size'),2);assert.match(await js('document.querySelector("#frame").contentWindow.player._scenarioPlayer._textPlayer.content'),/ありがとう/);
 await js(`document.querySelector('#frame').contentWindow.player.emit('end')`);
 await wait('document.querySelector("#frame").contentWindow.ScenarioBridge.ended','story end');
 assert.equal(await js('document.querySelector("#frame").contentDocument.querySelector("#loading").style.display'),'none');
 await js(`document.querySelector('#frame').contentWindow.player._mainController._ui.btnLog.emit('pointerup')`);await wait('document.querySelector("#frame").contentWindow.player._paused','backlog after story end');
 // Engine changes and reload use the same host protocol and no extra dialog.
 await js(`(()=>{const s=document.querySelector('.story-engine-settings select');s.value='legacy';s.dispatchEvent(new Event('change'))})()`);await wait('document.querySelector("#frame").contentWindow.location.pathname.endsWith("legacy.html")&&!!document.querySelector("#frame").contentWindow.player?._tm','legacy fallback');
 await js(`(()=>{const s=document.querySelector('.story-engine-settings select');s.value='scenario';s.dispatchEvent(new Event('change'))})()`);await wait('document.querySelector("#frame").contentWindow.ScenarioBridge?.started','return new player');
 assert.equal(await js('document.querySelectorAll(".story-engine-settings").length'),1);assert.equal(await js('document.querySelectorAll(".story-quality-settings").length'),1);
 // Fullscreen and both enhancement backends use the new live canvas.
 await js(`document.querySelector('#storyFullscreen').click()`);await wait('!!document.fullscreenElement','fullscreen');await js('document.exitFullscreen()');
 for(const id of ['anime4k','artcnn']){
  await js(`document.querySelector('#frame').contentWindow.ShinyAnime4K.setPipeline([{id:${JSON.stringify(id)},enabled:true,level:${JSON.stringify(id==='artcnn'?'c16':'2x')}}])`);await wait('document.querySelector("#frame").contentWindow.ShinyAnime4K.states.some(s=>s.active)','live enhancement '+id);await new Promise(r=>setTimeout(r,200));
  const rect=await js('(()=>{const r=document.querySelector("#stage").getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})()'),capture=await win.webContents.capturePage(),png=PNG.sync.read(capture.toPNG());let sum=0,count=0;for(let y=Math.round(rect.y+rect.height*.25);y<Math.min(png.height,rect.y+rect.height*.75);y+=12)for(let x=Math.round(rect.x+rect.width*.1);x<Math.min(png.width,rect.x+rect.width*.9);x+=12){const i=(y*png.width+x)*4;sum+=png.data[i]+png.data[i+1]+png.data[i+2];count+=3}assert.ok(sum/count>45,'Enhanced story must contain the rendered scene, not a black canvas');fs.writeFileSync(path.join(root,'exports/scenario-enhanced-'+id+'.png'),capture.toPNG());
 }
 await js(`document.querySelector('#frame').contentWindow.ShinyAnime4K.setPipeline([])`);
 fs.writeFileSync(path.join(root,'exports/scenario-player-host.png'),(await win.webContents.capturePage()).toPNG());
 const updated=path.join(temp,'updated-data');fs.cpSync(data,updated,{recursive:true});write(path.join(updated,'catalog.json'),[{key:newKey,title:'更新后剧情',idol:'七草日花',group:'新增',category:'卡片剧情',translated:true}]);write(path.join(updated,'translations',newKey),{translator:'更新后测试译文',rows:[{text:'更新された台詞。',trans:'更新后的字幕。'}]});active=updated;
 await js(`document.querySelector('#viewer').close()`);await win.loadURL(service.url+'/library.html');await wait('!!document.querySelector("#list button")','updated catalog');await js(`openStoryByKey(${JSON.stringify(newKey)})`);await wait('document.querySelector("#frame").contentWindow.ScenarioBridge?.started','new story after update');
 assert.equal(await js('document.querySelector("#frame").contentWindow.ScenarioBridge.tracks[0].text'),'更新された台詞。');
 await js(`document.querySelector('#lang').value='zh';document.querySelector('#lang').dispatchEvent(new Event('change'))`);await wait('document.querySelector("#frame").contentWindow.ScenarioBridge.tracks[0].text==="更新后的字幕。"','updated translation');
 write(path.join(updated,'card-media.json'),[{id:'1040240080',type:'idols',name:'关联剧情测试卡',idol:'七草日花',rarity:'SSR',images:[{kind:'card',label:'卡面',path:'images/event/bg/00001.jpg'}],movies:[],stories:[{key:newKey,title:'更新后关联剧情',idol:'七草日花',group:'测试',category:'卡片剧情',translated:true}]}]);
 await win.loadURL(service.url+'/card-gallery.html');await wait('!!document.querySelector("#cardGrid .gallery-item")','card gallery');await js(`document.querySelector('#cardGrid .gallery-item').click()`);await wait('document.querySelector("#cardDetail").open','card detail');await js(`document.querySelector('#cardStoryList .story-item').click()`);await wait('document.querySelector("#frame").contentWindow.ScenarioBridge?.started','card-associated story');assert.equal(await js('document.querySelector("#frame").contentWindow.ScenarioBridge.tracks[0].text'),'更新后的字幕。');assert.equal(await js('document.querySelectorAll("#storyViewer .story-quality-settings").length'),1);
 const report={at:new Date().toISOString(),programRoot:program,networkDisabled:true,fixtureAssetsOnly:true,newDefault:true,legacySelectable:true,hostMessages:true,translations:true,bilingual:true,localOverrides:true,volume:true,effectWaitWithoutValue:true,middleForeground:true,gashaMouth:true,onlySpeakerTalks:true,producerBubble:true,autoModeDoesNotCutVoice:true,choicesAndBranch:true,textWait:true,noDuplicateModel:true,logVoiceReplay:true,fullscreen:true,anime4k:true,artcnn:true,enhancedScenePixels:true,updatedCatalogAndTranslation:true,subtitlePreferencePreserved:true,cardAssociatedStory:true,initial,producer,ownership};fs.writeFileSync(path.join(root,'exports/scenario-player-verification.json'),JSON.stringify(report,null,2));console.log('PASS new scenario engine / existing host / offline / updated data',JSON.stringify(report));
 }catch(e){console.error(e);process.exitCode=1}finally{clearTimeout(timer);win?.destroy();service?.server.close();app.exit(process.exitCode||0)}});
