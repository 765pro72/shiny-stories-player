/* The directory's shared viewer controls drive a read-only custom-story stage. */
(()=>{'use strict';
 const C=CustomStory,R=CustomStoryReader,$=s=>document.querySelector(s),emit=(type,value)=>parent.postMessage({type,value},location.origin),urls=new Map();
 let project,files,index=0,auto=false,volume=.4,language=new URLSearchParams(location.search).get('lang')||'zh',overrides={},serial=0,timer,voice,loading=false,closed=false,lastAdvance=0,quality;
 const status=text=>{emit('status',text);if(!$('#stageLoading').hidden)$('#stageLoading').textContent=text};
 function resolve(path,asset){const key=asset.source==='builtin'?'builtin/'+path:path;if(files.has(key)){if(!urls.has(key))urls.set(key,URL.createObjectURL(new Blob([files.get(key)])));return urls.get(key)}if(asset.source==='import')throw Error('缺少导入素材：'+path);return'/asset-original/'+path}
 const stage=new CustomStoryStage($('#stageCanvas'),resolve,status,{readOnly:true});
 function subtitles(){if(!project)return;const scene=project.scenes[index],line=C.activeAt(scene.captions,stage.time)||scene,text=R.text(line,language,overrides);if($('#stageText').textContent!==text)$('#stageText').textContent=text}
 function transcript(){emit('lines',R.rows(project).map(r=>({...r,translation:overrides[r.original]||r.translation})))}
 function setVolume(reset=false){for(const a of stage.sounds){if(reset||a.__storyBaseVolume===undefined)a.__storyBaseVolume=a.volume;a.volume=a.__storyBaseVolume*volume}if(stage.music){if(reset||stage.music.__storyBaseVolume===undefined)stage.music.__storyBaseVolume=stage.music.volume;stage.music.volume=stage.music.__storyBaseVolume*volume}}
 function schedule(){clearTimeout(timer);if(!auto||loading||closed)return;const token=serial,check=()=>{if(!auto||closed||token!==serial)return;if(stage.time<project.scenes[index].duration||voice&&!voice.ended&&!voice.paused){timer=setTimeout(check,100);return}if(index<project.scenes.length-1)play(index+1);else{auto=false;stage.playing=false;stage.stopAudio();stage.seek(stage.time,true);emit('auto',false);status('本篇剧情播放完毕。')}};timer=setTimeout(check,100)}
 function exitViewer() {
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
   if (history.length > 1) history.back();
   else location.href = '/';
 }
 $('#stageExitBtn')?.addEventListener('click', exitViewer);
 window.addEventListener('keydown', e => {
   if (e.key === 'Escape' || e.key === 'Esc') {
     exitViewer();
   }
 });

 function showViewerError(msg) {
   auto = false;
   emit('auto', false);
   stage.playing = false;
   stage.stopAudio();
   const l = $('#stageLoading');
   l.hidden = false;
   l.innerHTML = `
     <p style="margin-bottom:16px;line-height:1.6;color:#ecd9e5;max-width:520px;margin-left:auto;margin-right:auto;">播放未能完成：${msg}。<br>可关闭后重试，或查看对话记录。</p>
     <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:14px;flex-wrap:wrap;">
       <button type="button" id="stageErrExit" style="padding:8px 22px;border-radius:999px;background:#c04b78;color:#fff;border:none;font-weight:600;cursor:pointer;font-size:14px;box-shadow:0 4px 12px rgba(192,75,120,0.3);touch-action:manipulation;">返回主页 / 退出</button>
       <button type="button" id="stageErrRetry" style="padding:8px 18px;border-radius:999px;background:rgba(255,255,255,0.18);color:#fff;border:1px solid rgba(255,255,255,0.3);cursor:pointer;font-size:13px;touch-action:manipulation;">重新加载</button>
     </div>
   `;
   l.querySelector('#stageErrExit')?.addEventListener('click', exitViewer);
   l.querySelector('#stageErrRetry')?.addEventListener('click', () => location.reload());
 }

 async function play(at){if(!project||closed)return;clearTimeout(timer);const token=++serial;index=at;loading=true;status('正在准备立绘与声音…');try{voice=await stage.show(project,project.scenes[index],{sound:true});if(token!==serial||closed)return;setVolume(true);subtitles();status('准备完成 · 本机怪文书 · '+(index+1)+' / '+project.scenes.length);emit('scene',index)}catch(e){showViewerError(e.message)}finally{if(token===serial){loading=false;schedule()}}}
 function next(){if(loading||closed||!project||Date.now()-lastAdvance<180)return;lastAdvance=Date.now();if(index<project.scenes.length-1)play(index+1);else{auto=false;emit('auto',false);stage.stopAudio();stage.seek(stage.time,true);status('本篇剧情播放完毕。')}}
 stage.onTime=subtitles;
 $('#storyStage').onclick=next;
 window.addEventListener('keydown',e=>{if([' ','Enter','ArrowRight'].includes(e.key)){e.preventDefault();next()}if(e.key==='ArrowLeft'&&!loading&&index>0){e.preventDefault();play(index-1)}});
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;const {type,value}=e.data||{};if(type==='settings'){overrides=value?.overrides||{};volume=Math.max(0,Math.min(1,Number(value?.volume??.4)));setVolume();if(project){transcript();subtitles()}}else if(type==='next')next();else if(type==='volume'){volume=Math.max(0,Math.min(1,Number(value)||0));setVolume()}else if(type==='lang'&&['zh','jp','both'].includes(value)){language=value;subtitles()}else if(type==='auto'){auto=!auto;emit('auto',auto);schedule()}});
 window.addEventListener('pagehide',()=>{closed=true;serial++;clearTimeout(timer);stage.playing=false;stage.serial++;stage.stopAudio();quality?.destroy();for(const url of urls.values())URL.revokeObjectURL(url);urls.clear()});
 (async()=>{try{const id=new URLSearchParams(location.search).get('work');if(!/^[\w-]{1,80}$/.test(id||''))throw Error('作品编号无效');const r=await fetch('/api/custom-stories/'+id);if(!r.ok)throw Error('作品不存在');({project,files}=R.unpack(new Uint8Array(await r.arrayBuffer()),fflate));quality=ShinyAnime4K.attach(stage.app,{fill:true});let toolbar;try{toolbar=parent.document.querySelector('#viewer .toolbar')}catch{}if(toolbar){toolbar.querySelector('.story-quality-settings')?.remove();const menu=toolbar.ownerDocument.createElement('details');menu.className='story-quality-settings';const summary=toolbar.ownerDocument.createElement('summary');summary.textContent='画质设置';menu.append(summary);toolbar.append(menu);ShinyAnime4K.mountControl(menu,{detailed:true});window.addEventListener('pagehide',()=>menu.remove(),{once:true})}transcript();emit('ready');await play(0);window.CustomStoryViewer={stage,get project(){return project},get index(){return index},get auto(){return auto},get loading(){return loading},next};}catch(e){showViewerError(e.message)}})();
})();
