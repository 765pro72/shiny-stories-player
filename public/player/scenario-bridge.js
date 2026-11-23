/* Local adapter for ShinyScenarioViewer 66e8d76. See scenario/NOTICE.html. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
 let rawKey = (params.get('key') || params.get('story') || '').trim();
 if (rawKey && !rawKey.endsWith('.json')) rawKey += '.json';
 const key = rawKey;
 const isBirthday = params.get('birthday') === 'true';
 if (window.self !== window.top) document.body.classList.add('in-iframe');

 function exitPlayer() {
   try {
     if (window.desktop?.setFullScreen) window.desktop.setFullScreen(false);
     else if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(()=>{});
   } catch (e) {}
   if (window.parent !== window) {
     try {
       parent.postMessage({ type: 'close' }, '*');
       const dlg = window.frameElement?.closest('dialog');
       if (dlg && typeof dlg.close === 'function') { dlg.close(); return; }
     } catch {}
   }
   const from = params.get('from');
   if (from === 'home' || !document.referrer) {
     location.href = '/';
   } else if (history.length > 1) {
     history.back();
   } else {
     location.href = '/';
   }
 }
 $('#playerExitBtn')?.addEventListener('click', exitPlayer);
 window.addEventListener('keydown', e => {
   if (e.key === 'Escape' || e.key === 'Esc') {
     e.preventDefault();
     exitPlayer();
   }
 });
 window.addEventListener('popstate', () => exitPlayer());

 if (isBirthday) {
   const enterFullscreen = async () => {
     try {
       if (window.desktop?.setFullScreen) await window.desktop.setFullScreen(true);
       else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
     } catch (e) {}
   };
   enterFullscreen();
   window.addEventListener('click', enterFullscreen, { once: true });
   window.addEventListener('beforeunload', () => {
     try {
       if (window.desktop?.setFullScreen) window.desktop.setFullScreen(false);
       else if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen().catch(()=>{});
     } catch (e) {}
   });
 }
 let raw=[],tracks=[],lastRows=[],translation={},names={},common={},overrides={},language=params.get('lang')||localStorage.getItem('storySubtitleLanguage')||'zh',volume=1,player,app,converter,disposed=false,started=false,ended=false;
 let hasFailed=false;
 const history=[],finishedVoices=new WeakSet(),knownUnavailable=new Set(),emit=(type,value)=>{if(parent!==window)parent.postMessage({type,value},location.origin)};
 const status=text=>{if(disposed)return;emit('status',text);if(!hasFailed)$('#loading').textContent=text};
 function fail(error){
   if(disposed)return;
   const msg = error?.message || String(error || '');
   if (msg.toLowerCase().includes('transition was skipped') || error?.name === 'AbortError') return;
   hasFailed = true;
   document.body.classList.add('has-error');
   console.error(error);
   $('#loading').style.display='grid';
   $('#loading').innerHTML = `
     <p style="font-size:16px;line-height:1.6;margin-bottom:20px;color:#ecd9e5;max-width:540px;margin-left:auto;margin-right:auto;">
       播放未能完成：${msg}。<br>可重试或换用兼容旧版。
     </p>
     <div class="loading-actions" style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px;flex-wrap:wrap;">
       <button type="button" id="failExitBtn" style="padding:10px 22px;border-radius:999px;background:#c04b78;color:#fff;border:none;font-weight:600;cursor:pointer;font-size:14px;box-shadow:0 4px 12px rgba(192,75,120,0.3);touch-action:manipulation;">返回主页 / 退出</button>
       <button type="button" id="failRetryBtn" style="padding:10px 20px;border-radius:999px;background:rgba(255,255,255,0.18);color:#fff;border:1px solid rgba(255,255,255,0.3);cursor:pointer;font-size:13px;touch-action:manipulation;">重新加载</button>
       <button type="button" id="failLegacyBtn" style="padding:10px 18px;border-radius:999px;background:rgba(255,255,255,0.12);color:#ecd9e5;border:1px solid rgba(255,255,255,0.22);cursor:pointer;font-size:13px;touch-action:manipulation;">换用兼容旧版</button>
     </div>
   `;
   $('#loading #failExitBtn')?.addEventListener('click', exitPlayer);
   $('#loading #failRetryBtn')?.addEventListener('click', () => location.reload());
   $('#loading #failLegacyBtn')?.addEventListener('click', () => location.replace('legacy.html' + location.search));
   player?.pause();
 }
 const json=async url=>{const r=await fetch(url);if(!r.ok)throw Error((await r.text()).slice(0,180));return r.json()};
 function annotate(){
  const result=ScenarioText.annotate(raw,translation,names,common,overrides,language),converted=converter.convertResourcePaths(result.tracks);
  if(!tracks.length)tracks=converted;else for(let i=0;i<tracks.length;i++){if(converted[i].text!==undefined)tracks[i].text=converted[i].text;if(converted[i].select!==undefined)tracks[i].select=converted[i].select}
  lastRows=result.rows||[];emit('lines',lastRows);refreshLanguage();
 }
 function refreshLanguage(){
  if(!player)return;const log=player._scenarioLogLayer;log._tracks=[];
  for(const item of history){const track=typeof item==='number'?tracks[item]:{...item,text:tracks.find(t=>t.select&&t.nextLabel===item.nextLabel)?.select||item.text};log.stackTrackOriginal(track)}
  if(log.isOpen)log._render();
  const current=player._trackManager?.currentTrack;if(current?.text){let content='',previous;
   for(const item of history){if(typeof item!=='number'||!tracks[item]?.text)continue;const t=tracks[item];if(!previous||!['n','r','l'].includes(previous.textCtrl))content='';else if(['r','l'].includes(previous.textCtrl))content+='\n';content+=t.text;previous=t}
   const text=player._scenarioPlayer._textPlayer,ratio=text._content.length?text._index/text._content.length:0;
   text._content=content||current.text;text._index=text.playing?Math.max(0,Math.min(text._content.length-1,Math.floor(ratio*text._content.length))):text._content.length-1;text._elapsedMs=Math.max(0,text._index)*text._charIntervalMs;text._textObj.text=text.playing?text._content.slice(0,text._index+1):text._content;
  }
  if(player._selectList.active){const currentIndex=player._trackManager._current;const options=tracks.slice(Math.max(0,currentIndex-player._selectList._items.length+1),currentIndex+1).filter(t=>t.select);player._selectList._items.forEach((item,i)=>{const text=item.children.find(c=>c instanceof PIXI.Text);if(text&&options[i])text.text=options[i].select})}
  applyFont();
 }
 function applyFont(){
  const family=window.InterfaceFont?.family(language==='jp'?'theFont':'AlimamaShuHeiTi')||[language==='jp'?'theFont':'AlimamaShuHeiTi','theFont'];
  for(const array of [USED_FONT,USED_FONT_UI,USED_FONT_SPEAKER])array.splice(0,array.length,...(Array.isArray(family)?family:[family]));
  function visit(node){if(node instanceof PIXI.Text){if(window.InterfaceFont?.applyPixi)InterfaceFont.applyPixi(node,family);else node.style.fontFamily=family}for(const c of node.children||[])visit(c)}if(app)visit(app.stage);player?._scenarioPlayer._layoutFont?.();
 }
 function resize(){if(!app)return;const scale=Math.min(innerWidth/1136,innerHeight/640);app.view.style.width=1136*scale+'px';app.view.style.height=640*scale+'px'}
 function mountQuality(){
  // Quality is configured once in the board settings (看板设置); the story player
  // only joins the shared Anime4K pipeline and offers no per-page control.
  window.ShinyAnime4K?.attach(app);
 }
 function unlockAudio(){
   try{
     const ctx=PIXI.sound&&PIXI.sound.context;
     if(ctx&&typeof ctx.resume==='function'){
       const r=ctx.resume();
       const tryResumeVoice = ()=>{
         if(player&&!player._soundController?._soundDisabled&&player._trackManager){
           const cur=player._trackManager.currentTrack||player._trackManager.current?.();
           if(cur&&cur.voice){
             const v=player._currentVoice;
             const isVoiceDead=!v||finishedVoices.has(v)||v.paused||(v._source&&v._source.playbackState===3);
             if(isVoiceDead){
               player._currentVoice=player._soundController.control('voice',cur.voice);
             }
           }
           if(cur&&cur.bgm&&!player._soundController?._currentBgm){
             player._soundController.control('bgm',cur.bgm);
           }
         }
       };
       if(r&&typeof r.then==='function'){
         r.then(tryResumeVoice).catch(()=>{});
       } else {
         tryResumeVoice();
       }
     }
     const layer=player&&player._movieLayer;
     if(layer&&typeof layer.unmuteAfterGesture==='function')layer.unmuteAfterGesture();
   }catch(err){}
 }
 for(const type of ['pointerdown','touchstart','mousedown','keydown'])window.addEventListener(type,unlockAudio,{passive:true,capture:true});
 function setVolume(value){unlockAudio();if(!Number.isFinite(value))return;volume=Math.max(0,Math.min(1,value));if(PIXI.sound)PIXI.sound.volumeAll=volume;const layer=player?._movieLayer,movieVolume=player?.soundController._soundDisabled?0:volume;if(layer?._video)layer._video.volume=movieVolume;if(layer?._movieAudio)layer._movieAudio.volume=movieVolume}
 function next(){if(!started||ended||disposed||player._selectList.active||player._paused||player._mode!==SpeedMode.MANUAL)return;player._onTap()}
 function setAuto(enabled){if(!started||ended)return;const ui=player._mainController;ui._isAutoOn=enabled;ui._isFastOn=false;ui._refreshToggleTextures();ui._dispatchCurrent()}
 function configurePlayer(){
  const p=player,stage=p._characterStage,sound=p._soundController;
  p._commandStorageKey=command=>'shinymaster.scenario.command.'+key+'.'+command;
  const forward=p._forward.bind(p);let queued=false,burst=0;
  p._forward=()=>{if(disposed||ended||queued||p._fatalError)return;queued=true;const run=()=>{queued=false;if(!disposed&&!ended&&!p._fatalError)try{forward()}catch(e){fail(e)}};if(++burst<128)queueMicrotask(run);else{burst=0;setTimeout(run,0)}};
  const wait=p._changeToWaiting.bind(p);p._changeToWaiting=()=>{p._detachVoiceEndListener();if(p._currentVoice&&finishedVoices.has(p._currentVoice))p._currentVoice=null;wait()};
  const voice=sound._playVoice.bind(sound);sound._playVoice=(...args)=>{const instance=voice(...args);if(instance&&typeof instance==='object'){finishedVoices.delete(instance);instance.once?.('end',()=>finishedVoices.add(instance));instance.once?.('ended',()=>finishedVoices.add(instance))}return instance};
  const overlay=stage._setOverlayAnim.bind(stage);stage._setOverlayAnim=(name,loop,track,model)=>{if(track===5){HomeVoicePolicy.prepareMouth(model);name=HomeVoicePolicy.speakingMouth(model,name)||name}return overlay(name,loop,track,model)};
  const control=stage.control.bind(stage);stage.control=options=>{const v=options.voiceObj,audible=v&&!p._currentVoiceIsLooping&&!finishedVoices.has(v);const result=control({...options,lipAnim:audible?options.lipAnim:null});if(!audible)stage.stopLipAnimations();return result};
  const controlMode=p._onControl.bind(p);p._mainController.removeAllListeners('control');p._mainController.on('control',preset=>{
   if(preset.opensLog){controlMode(preset);return}const waiting=p._isWaiting();p._detachVoiceEndListener();if(waiting){p._schedule.cancelAll();p._state=State.LOCKED}controlMode(preset);if(waiting)p._changeToWaiting();if(preset.soundDisabled)stage.stopLipAnimations();emit('auto',p._mode===SpeedMode.AUTO);
  });
  const speaker=p._scenarioPlayer.controlSpeaker.bind(p._scenarioPlayer);const producerRe=/^(?:制作人|製作人|プロデューサー|producer|p)(?:[（(].*[）)])?$/i;let producerName='';try{producerName=(localStorage.getItem('shiny.producerName')||'').trim()}catch(e){}const speakerLabel=name=>{const text=names[name]||name;return producerName&&producerRe.test(String(text).replace(/[\s\u3000]/g,''))?producerName:text};p._scenarioPlayer.controlSpeaker=name=>speaker(speakerLabel(name));
  const log=p._scenarioLogLayer;log.stackTrackOriginal=log.stackTrack.bind(log);log.stackTrack=t=>{history.push(Number.isInteger(t?._storyIndex)?t._storyIndex:{...t});if(t&&t.text){const row=Number.isInteger(t._storyIndex)?lastRows.find(r=>r.index===t._storyIndex):null;const rawLine=String(t.text||'').trim();emit('currentLine',{speaker:speakerLabel(t.speaker||row?.speaker||''),original:row?.original||rawLine,translation:row?.translation||rawLine})}log.stackTrackOriginal(t)};
  const movie=p._movieLayer.control.bind(p._movieLayer);p._movieLayer.control=(url,options={})=>{const result=movie(url,{...options,onError:message=>{if(disposed)return;status('一段过场影片暂未取得或无法播放，已跳过；其余剧情继续播放。'+message);$('#loading').style.display='none'}});setVolume(volume);return result};
  const nativePause=p.pause.bind(p),nativeResume=p.resume.bind(p);p.pause=()=>{nativePause();stage._spineMap.forEach(s=>{s.autoUpdate=false})};p.resume=()=>{nativeResume();stage._spineMap.forEach(s=>{s.autoUpdate=true})};
  const fatal=p._handleFatalError.bind(p);p._handleFatalError=(message,error,context)=>{fatal(message,error,context);fail(error||message)};
  p.once('end',()=>{
   ended=true;p._schedule.cancelAll();p._detachVoiceEndListener();p._detachCurrentVoiceEndHandler();sound.removeAll();stage.stopLipAnimations();
   status('本篇剧情播放完毕。');
   $('#loading').style.display='grid';
   const existingActions = $('#loading .loading-actions');
   if (existingActions) existingActions.remove();
   const actions = document.createElement('div');
   actions.className = 'loading-actions';
   actions.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-top:20px;';
   const returnBtn = document.createElement('button');
   returnBtn.type = 'button';
   returnBtn.textContent = '返回主页';
   returnBtn.style.cssText = 'padding:10px 24px;border-radius:999px;background:#c04b78;color:#fff;border:none;font-weight:600;cursor:pointer;font-size:14px;box-shadow:0 4px 12px rgba(192,75,120,0.3);touch-action:manipulation;';
   returnBtn.onclick = exitPlayer;
   actions.append(returnBtn);
   $('#loading').append(actions);
  });
 }
 async function preload(){
  const loader=PIXI.Loader.shared,optional=new Set(),added=new Set(),errors=[];loader.concurrency=8;
  const add=(id,url,isOptional=false)=>{if(isOptional)optional.add(url);if(!added.has(id)&&!loader.resources[id]){added.add(id);loader.add(id,url,{timeout:30000})}};
  for(const [id,url]of [['uiParts',UI_PARTS_URL],['uiCommonParts',UI_COMMON_PARTS_URL],['uiCommonAtlas',UI_COMMON_ATLAS_URL],['uiInitPop','/player/scenario-ui/images/ui/init/parts_pop.json'],[UI_TAP_SE_KEY,UI_TAP_SE_URL],[UI_CANCEL_SE_KEY,UI_CANCEL_SE_URL],[SELECT_ANSWER_SE_KEY,SELECT_ANSWER_SE_URL],[PRODUCER_BUBBLE_KEY,PRODUCER_BUBBLE_URL]])add(id,url,true);
  for(const url of converter.extractResourceList(tracks)){if(/\.mp4(?:\?|$)/.test(url))continue;add(url,url,/\/log_text_frame\/|\/icon_phone\//.test(url))}
  // A run of choices can terminate the script, so count it without a sentinel.
  let run=0,max=0;for(const t of tracks){run=t.select?run+1:0;max=Math.max(max,run)}for(let i=1;i<=Math.min(5,max);i++)add('selectFrame'+i,SELECT_FRAME_URL(i));
  loader.onProgress.add(l=>status('正在准备立绘与声音 '+Math.round(l.progress)+'% · 读取已下载资源'));
  loader.onError.add((error,l,r)=>errors.push(r?.url||String(error)));
  await new Promise(resolve=>loader.load(resolve));if(disposed)return;
  const critical=errors.filter(url=>!optional.has(url)&&!url.includes('/sounds/')&&!knownUnavailable.has(url.replace('/asset-original/','')));if(critical.length)throw Error(critical.length+' 个画面资源加载失败，例如 '+critical[0]);
  return errors;
 }
 async function init(){
  if(!/^\w+\/[\w-]+\.json$/.test(key||''))throw Error('剧情编号无效');status('载入脚本与汉化…');
  const portraitPromise=json('/portraits.json'),missingPromise=json('/data/unresolved-official-resources.json').catch(()=>[]);
  [raw,translation,names,common]=await Promise.all([json('/asset-original/json/'+key),fetch('/data/translations/'+key).then(r=>r.ok?r.json():{rows:[]}),json('/data/names.json'),json('/data/common.json')]);
  if(!Array.isArray(raw)||!raw.length)throw Error('剧情脚本为空');
  for(const item of await missingPromise)if(item.key)knownUnavailable.add(item.key);
  const portraits=await portraitPromise;converter=new AdvResourceConverter();converter._getSpeakerIconPath=sp=>{const id=SPEAKER_ICON_MAIN[sp]||SPEAKER_ICON_SUB[sp],match=portraits.find(p=>String(Number(p.id))===String(Number(id))||p.name===(names[sp]||sp));return match&&!match.crop?'/asset-original/'+match.path:null};
  const convert=converter.convertResourcePaths.bind(converter);converter.convertResourcePaths=input=>convert(input).map(t=>{if(t.logTextFrame){const id=t.logTextFrame.split('/').pop();if(['001.png','002.png','003.png'].includes(id))t.logTextFrame='/player/scenario-ui/images/event/log_text_frame/'+id}return t});
  annotate();emit('ready');const errors=await preload();if(disposed)return;
  PIXI.utils.skipHello();gsap.registerPlugin(PixiPlugin);PixiPlugin.registerPIXI(PIXI);
  app=new PIXI.Application({width:1136,height:640,resolution:1,autoDensity:true,antialias:true,backgroundColor:0x211b26});app.view.id='ShinyColors';document.body.append(app.view);resize();mountQuality();
  player=new AdvPlayer(app,{masterVolume:volume});window.player=player;configurePlayer();app.stage.addChild(player.stageObj);applyFont();
  app.ticker.add(delta=>{if(!disposed)player.update(delta)});started=true;player.start(tracks);setVolume(volume);unlockAudio();
  status('准备完成 · 翻译：'+(translation.translator||'暂无汉化')+(translation.additionalSources?.length?' · 补译来源：'+translation.additionalSources.map(s=>s.credit).join('、'):'')+(errors.length?' · '+errors.length+' 个辅助或音频资源未加载':''));if(!ended)$('#loading').style.display='none';
 }
 addEventListener('resize',resize);
 for(const type of ['pointerdown','touchstart','keydown'])addEventListener(type,unlockAudio,{passive:true,capture:true});addEventListener('interface-font-change',applyFont);
 addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;const {type,value}=e.data||{};
  if(type==='settings'){overrides=value?.overrides||{};setVolume(value?.volume);if(raw.length)annotate()}
  if(type==='next')next();if(type==='volume')setVolume(value);
  if(type==='lang'&&['zh','jp','both'].includes(value)){language=value;if(raw.length)annotate()}
  if(type==='auto')setAuto(player?._mode!==SpeedMode.AUTO);
 });
 addEventListener('pagehide',()=>{disposed=true;if(player){player._schedule.cancelAll();player._deferredTasks=[];player._detachVoiceEndListener();player._detachCurrentVoiceEndHandler();player.soundController.removeAll();player._movieLayer.reset();player._characterStage.stopLipAnimations();player._scenarioPlayer.destroy()}app?.ticker.stop()},{once:true});
 addEventListener('error',e=>{
   const msg = e.error?.message || e.message || String(e.error || '');
   if (msg.toLowerCase().includes('transition was skipped') || e.error?.name === 'AbortError') return;
   fail(e.error||e.message);
 });
 addEventListener('unhandledrejection',e=>{
   const msg = e.reason?.message || String(e.reason || '');
   if (msg.toLowerCase().includes('transition was skipped') || e.reason?.name === 'AbortError') {
     e.preventDefault?.();
     return;
   }
   fail(e.reason);
 });
 window.ScenarioBridge={get player(){return player},get tracks(){return tracks},get raw(){return raw},get history(){return history},get started(){return started},get ended(){return ended},next,setAuto,inspect:()=>({engine:'ShinyScenarioViewer',commit:'66e8d76',key,language,started,ended,volume,current:player?._trackManager?._current,state:player?._state,error:player?._fatalError?.message||null,characters:player?._characterStage._spineMap.size||0})};
 init().catch(fail);
})();

