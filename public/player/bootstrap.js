let player,tracks,translation,names,common,params=new URLSearchParams(location.search),lang=params.get('lang')||localStorage.getItem('storySubtitleLanguage')||'zh',local={};
let rawKey = (params.get('key') || params.get('story') || '').trim();
if (rawKey && !rawKey.endsWith('.json')) rawKey += '.json';
const key = rawKey;
if (window.self !== window.top) document.body.classList.add('in-iframe');
try { window.top?.postMessage({ type: 'shiny-shell-story-open' }, location.origin); } catch {}

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
document.getElementById('playerExitBtn')?.addEventListener('click', exitPlayer);
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    e.preventDefault();
    exitPlayer();
  }
});
window.addEventListener('popstate', () => exitPlayer());

const norm=s=>String(s||'').trim().replace(/\\r?\\n|\\n|\r\n/g,'\n').replace(/\n+/g,'\n');
let hasFailed = false;
const emit=(type,value)=>parent.postMessage({type,value},location.origin);
const status=s=>{if(hasFailed)return;document.querySelector('#loading').textContent=s;emit('status',s);};
const fail=e=>{
  const msg = e?.message || String(e || '');
  if (msg.toLowerCase().includes('transition was skipped') || e?.name === 'AbortError') return;
  hasFailed = true;
  document.body.classList.add('has-error');
  console.error(e?.stack||e);
  const loading = document.querySelector('#loading');
  loading.style.display='grid';
  loading.innerHTML = `
    <p style="font-size:16px;line-height:1.6;margin-bottom:20px;color:#ecd9e5;max-width:540px;margin-left:auto;margin-right:auto;">
      播放未能完成：${msg}。<br>可重试或关闭返回。
    </p>
    <div class="loading-actions" style="display:flex;align-items:center;justify-content:center;gap:12px;margin-top:16px;flex-wrap:wrap;">
      <button type="button" id="failExitBtn" style="padding:10px 22px;border-radius:999px;background:#c04b78;color:#fff;border:none;font-weight:600;cursor:pointer;font-size:14px;box-shadow:0 4px 12px rgba(192,75,120,0.3);touch-action:manipulation;">返回主页 / 退出</button>
      <button type="button" id="failRetryBtn" style="padding:10px 20px;border-radius:999px;background:rgba(255,255,255,0.18);color:#fff;border:1px solid rgba(255,255,255,0.3);cursor:pointer;font-size:13px;touch-action:manipulation;">重新加载</button>
    </div>
  `;
  loading.querySelector('#failExitBtn')?.addEventListener('click', exitPlayer);
  loading.querySelector('#failRetryBtn')?.addEventListener('click', () => location.reload());
};
window.addEventListener('error',e=>{
  const msg = e.error?.message || e.message || String(e.error || '');
  if (msg.toLowerCase().includes('transition was skipped') || e.error?.name === 'AbortError') return;
  fail(e.error||e.message);
});
window.addEventListener('unhandledrejection',e=>{
  const msg = e.reason?.message || String(e.reason || '');
  if (msg.toLowerCase().includes('transition was skipped') || e.reason?.name === 'AbortError') {
    e.preventDefault?.();
    return;
  }
  fail(e.reason);
});
async function json(url){const r=await fetch(url);if(!r.ok)throw Error((await r.text()).slice(0,180));return r.json();}
function annotate(){const byId=new Map(),byText=new Map();for(const r of translation.rows||[]){if(!r.trans?.trim())continue;if(r.id&&!r.exactOnly&&!/^0+$/.test(r.id)&&r.id!=='select'){const a=byId.get(String(r.id))||[];a.push(r);byId.set(String(r.id),a);}byText.set(norm(r.text),norm(r.trans));}let rows=[];for(let i=0;i<tracks.length;i++){const t=tracks[i],text=t.text||t.select;if(!text)continue;const original=norm(text),idMatch=byId.get(String(t.id));const tr=local[original]||local[text]||norm(idMatch?.find(r=>norm(r.text)===original)?.trans)||(!idMatch||idMatch.length!==1?'':norm(idMatch[0].trans))||byText.get(original)||common[original]||'';t.translated_text=lang==='jp'?original:lang==='both'&&tr?tr+'\n'+original:tr||original;rows.push({id:String(t.id||i),trackIndex:i,speaker:names[t.speaker]||t.speaker||'选项',original,translation:tr,previous:norm(tracks.slice(0,i).findLast(x=>x.text)?.text),next:norm(tracks.slice(i+1).find(x=>x.text)?.text)});}emit('lines',rows);return rows;}
function normalize4kTextures(loader){const list=Object.values(loader?.resources||{});for(const res of list){if(!res||!res.texture||res.spineData||res.spritesheet||res.textures)continue;const bt=res.texture.baseTexture;if(!bt)continue;const rw=bt.realWidth||bt.width,rh=bt.realHeight||bt.height;if(!rw||!rh)continue;const url=String(res.url||res.name||'');let scale=1;if((/\/images\/event\/(?:bg|fg|still)\//i.test(url)||/\/images\/content\/[^/]+\/card\//i.test(url))&&rw>1500)scale=rw/1136;else if(/\/images\/event\/text_frame\//i.test(url)&&rw>1200)scale=rw/840;else if(/\/images\/event\/select_frame\//i.test(url)&&rw>600)scale=rw/318;else if(/\/images\/content\/characters\/icon_phone\//i.test(url)&&rw>400)scale=rw/240;else if(/\/images\/(?:event|content\/characters)\/phone_bg\//i.test(url)&&rw>800)scale=rw/542;else if(/\/images\/ui\/phone\/parts/i.test(url)&&rw>1200)scale=rw/729;if(scale>1.05){if(bt.resolution<=1.01){if(typeof bt.setResolution==='function')bt.setResolution(scale);else{bt.resolution=scale;bt.update();}}if(res.texture.orig.width>bt.width+1||res.texture.frame.width>bt.width+1){res.texture.orig=new PIXI.Rectangle(0,0,bt.width,bt.height);res.texture.frame=new PIXI.Rectangle(0,0,bt.width,bt.height);res.texture.updateUvs();}}}}
init=async function(){try{if(!/^\w+\/[\w-]+\.json$/.test(key||''))throw Error('剧情编号无效');status('载入脚本与汉化…');const prefix='/asset-original/';[tracks,translation,names,common]=await Promise.all([json(prefix+'json/'+key),fetch('/data/translations/'+key).then(r=>r.ok?r.json():{rows:[]}),json('/data/names.json'),json('/data/common.json')]);if(!Array.isArray(tracks)||!tracks.length)throw Error('剧情脚本为空');window.storyNames=names;player=new AdvPlayer();window.player=player;await Promise.allSettled([player.LoadFont(usedFont),player.LoadFont(zhcnFont)]);player._tm._autoPlayEnabled=false;player._tm._textManager.languageType=1;player._tm._selectManager._languageType=1;player._tm.setTrack=tracks;annotate();emit('ready');await preload();}catch(e){fail(e);}};
async function preload(){const tm=player._tm,loader=PIXI.Loader.shared,added=new Set();let errors=[];loader.concurrency=8;
const add=(id,p)=>{if(!added.has(id)&&!loader.resources[id]){added.add(id);loader.add(id,'/asset-original/'+p,{timeout:30000});}};
for(const t of tracks){if(t.textFrame&&t.textFrame!=='off')add('textFrame'+t.textFrame,`images/event/text_frame/${t.textFrame}.png`);if(t.bg&&!['fade_out','off'].includes(t.bg))add('bg'+t.bg,`images/event/bg/${t.bg}.jpg`);if(t.fg&&!['off','fade_out'].includes(t.fg))add('fg'+t.fg,`images/event/fg/${t.fg}.png`);for(const [k,dir]of[['se','sounds/se/event'],['voice','sounds/voice/events'],['bgm','sounds/bgm']])if(t[k]&&!['fade_out','off','pause','resume'].includes(t[k]))add(k+t[k],`${dir}/${t[k]}.m4a`);if(t.movie)add('movie'+t.movie,`movies/idols/card/${t.movie}.mp4`);if(t.charId&&t.charLabel){const cat=tm._spineManager.spineAlias[t.charCategory]||'stand';add(`${t.charLabel}_${t.charId}_${cat}`,`spine/${t.charType}/${cat}/${t.charId}/data.json`);}if(t.select){for(let n=1;n<=3;n++)add('selectFrame'+n,`images/event/select_frame/00${n}.png`);}if(t.still&&t.still!=='off')add('still'+t.still,`images/event/still/${t.still}.jpg`);if(t.stillType&&t.stillId&&!(t.stillType==='game_event_communications'&&String(t.stillId)==='400103307'))add('still'+t.stillType+t.stillId,`images/content/${t.stillType}/card/${t.stillId}.jpg`);}
loader.onProgress.add(l=>status(`正在准备立绘与声音 ${Math.round(l.progress)}% · 读取已下载资源`));loader.onError.add((err,l,r)=>errors.push(r?.url||String(err)));
await new Promise(resolve=>loader.load(resolve));
normalize4kTextures(loader);
if(errors.length){const critical=errors.filter(x=>!x.includes('/sounds/'));if(critical.length)throw Error(`${critical.length} 个画面资源加载失败，例如 ${critical[0]}`);}
// Missing audio must not abort the visual track. Preserve the remaining voices.
const sound=tm._soundManager;for(const [method,prefix]of[['_playVoice','voice'],['_playSe','se'],['_playBgm','bgm']]){const fn=sound[method].bind(sound);sound[method]=function(name,...args){if(!['off','fade_out'].includes(name)&&!loader.resources[prefix+name]?.sound){this._voiceDuration=1500;return;}return fn(name,...args);};}
document.querySelector('#loading').style.display='none';const render=tm._renderTrack.bind(tm);tm._renderTrack=function(){if(this._renderQueued||this._stopped)return;this._renderQueued=setTimeout(()=>{this._renderQueued=null;try{render();}catch(e){fail(e);}},0);};const end=tm.endOfEvent.bind(tm);tm.endOfEvent=function(clear=true){clearTimeout(this._renderQueued);this._renderQueued=null;end(clear);if(clear){
  status('本篇剧情播放完毕。');
  document.querySelector('#loading').style.display='grid';
  const existingActions = document.querySelector('#loading .loading-actions');
  if (existingActions) existingActions.remove();
  const actions = document.createElement('div');
  actions.className = 'loading-actions';
  actions.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:12px;margin-top:20px;';
  const returnBtn = document.createElement('button');
  returnBtn.type = 'button';
  returnBtn.textContent = '返回主页';
  returnBtn.style.cssText = 'padding:10px 24px;border-radius:999px;background:#c04b78;color:#fff;border:none;font-weight:600;cursor:pointer;font-size:14px;box-shadow:0 4px 12px rgba(192,75,120,0.3);';
  returnBtn.onclick = exitPlayer;
  actions.append(returnBtn);
  document.querySelector('#loading').append(actions);
}};player._app.stage.interactive=true;player._app.stage.on('click',next);status(`准备完成 · 翻译：${(translation.translator||'暂无汉化')+(translation.additionalSources?.length?' · 补译来源：'+translation.additionalSources.map(s=>s.credit).join('、'):'')}${errors.length?' · '+errors.length+' 个音频未加载':''}`);document.querySelector('#loading').style.display='none';tm._renderTrack();}
let lastAdvance=0;
function next(){const tm=player?._tm;if(!tm||tm._selecting||tm._stopped)return;if(player?._isMoviePlaying){lastAdvance=Date.now();player._movieLayer?.reset();return;}if(tm._autoPlayEnabled||tm._timeoutToClear||tm._renderQueued||Date.now()-lastAdvance<180)return;lastAdvance=Date.now();const text=tm._textManager;if(text._typingEffect){clearInterval(text._typingEffect);text._typingEffect=null;const t=tracks[tm._current-1];if(text.textObj)text.textObj.text=t?.translated_text||t?.text||'';return;}tm._soundManager.stopVoice();tm._renderTrack();}
window.addEventListener('pagehide',()=>{const tm=player?._tm;if(tm){tm._stopped=true;clearTimeout(tm._renderQueued);clearTimeout(tm._timeoutToClear);clearInterval(tm._textManager._typingEffect);tm._soundManager.reset();}});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||!player)return;const {type,value}=e.data,tm=player._tm;if(type==='settings'){local=value.overrides||{};PIXI.sound.volumeAll=value.volume;annotate();}if(type==='next')next();if(type==='volume')PIXI.sound.volumeAll=value;if(type==='lang'){lang=value;annotate();const t=tracks[tm._current-1];if(t?.text&&tm._textManager.textObj){clearInterval(tm._textManager._typingEffect);tm._textManager._typingEffect=null;tm._textManager.textObj.text=t.translated_text;}}if(type==='auto'){tm.toggleAutoplay();emit('auto',tm.autoplay);if(tm.autoplay&&!tm._timeoutToClear&&!tm._selecting&&!tm._stopped)tm._renderTrack();}if(type==='jump'&&Number.isInteger(value)){clearTimeout(tm._renderQueued);tm._renderQueued=null;clearTimeout(tm._timeoutToClear);tm._timeoutToClear=null;clearInterval(tm._textManager?._typingEffect);if(tm._textManager)tm._textManager._typingEffect=null;tm._soundManager?.stopVoice?.();tm._current=value;tm._stopped=false;tm._selecting=false;document.querySelector('#loading').style.display='none';tm._renderTrack();}});

