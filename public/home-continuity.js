/* A tab-local original frame bridges the asynchronous Spine reload on return.
   It never downloads assets, persists to disk, or substitutes another outfit. */
(() => {
  const host = document.querySelector('#idol'), key = 'home-transition-frame-v1';
  if (!host) return;
  const signature = prefs => JSON.stringify({idol:prefs.idol||'1',outfit:prefs.outfit||'1040010010-plain',count:prefs.count||1,members:prefs.members||[]});
  let poster, timer, captureTimer, capturedAt = -Infinity;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key)||'null');
    const prefs = JSON.parse(localStorage.getItem('home')||'{}');
    if (saved?.signature === signature(prefs) && /^data:image\/png;base64,/.test(saved.image) && Date.now()-saved.at < 3600000) {
      poster = document.createElement('img'); poster.className = 'home-transition-frame';
      poster.alt = '正在载入当前看板的动态模型'; poster.src = saved.image; host.append(poster);
      host.dataset.continuity = 'preview';
    }
  } catch { /* Storage limits must never block the lobby. */ }
  function reveal() {
    clearTimeout(timer);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!poster) return;
      const old = poster; poster = null; host.dataset.continuity = 'live';
      const animation = old.animate([{opacity:1},{opacity:0}],{duration:220,easing:'ease-out',fill:'forwards'});
      animation.finished.then(()=>old.remove(),()=>old.remove());
    }));
  }
  function capture() {
    const stage = window.homeStage;
    if (!stage || host.dataset.sceneReady !== 'true' || performance.now()-capturedAt < 2000) return;
    try {
      const renderer=stage.app.renderer, screen=renderer.screen;
      const target=PIXI.RenderTexture.create({width:screen.width,height:screen.height,resolution:568/screen.width});
      let image;try{renderer.render(stage.app.stage,{renderTexture:target,clear:true});image=renderer.plugins.extract.canvas(target).toDataURL('image/png')}finally{target.destroy(true)}
      sessionStorage.setItem(key,JSON.stringify({signature:signature(stage.prefs),image,at:Date.now()}));
      capturedAt = performance.now(); host.dataset.continuity = 'saved';
    } catch { /* Context loss/denied storage: normal transition remains usable. */ }
  }
  // Capture ONCE after scene settles (never loop gl.readPixels every 3s which causes periodic Spine GPU stutter!)
  function scheduleCapture(){clearTimeout(captureTimer);captureTimer=setTimeout(()=>{if(document.hidden)return;const work=()=>{if(document.hidden)return;capture()};if(window.requestIdleCallback)window.requestIdleCallback(work,{timeout:2500});else work()},2200)}
  window.addEventListener('home-scene-ready',scheduleCapture);
  window.addEventListener('home-scene-ready',reveal);
  window.addEventListener('home-scene-error',reveal);
  // A failed/slow online load may not leave an apparently live still forever.
  const armTimeout=()=>{clearTimeout(timer);if(poster)timer=setTimeout(reveal,15000)};armTimeout();
  window.addEventListener('pageshow',()=>{armTimeout();scheduleCapture()});
  window.addEventListener('pagehide',()=>{clearTimeout(timer);clearTimeout(captureTimer)});
})();

/* In-memory Spine Data Cache + In-Flight Deduplication: Keep loaded spine skeletons & textures in RAM for 0ms transitions. */
window.__spineDataCache = window.__spineDataCache || new Map();
window.__spineInFlight = window.__spineInFlight || new Map();
window.getSpineData = function(url) {
  if (window.__spineDataCache.has(url)) return Promise.resolve(window.__spineDataCache.get(url));
  if (window.__spineInFlight.has(url)) return window.__spineInFlight.get(url);
  const p = new Promise((resolve, reject) => {
    const loader = new PIXI.Loader();
    let settled = false;
    loader.onError.add(e => { if (!settled) { settled = true; reject(Error(e?.message || '资源不可用')); } });
    loader.add('res_' + Math.random().toString(36).slice(2), url).load((_, r) => {
      if (!settled) {
        settled = true;
        const res = Object.values(r)[0];
        res?.spineData ? resolve(res.spineData) : reject(Error('立绘数据不可用'));
      }
    });
  }).then(data => {
    window.__spineDataCache.set(url, data);
    return data;
  }).finally(() => {
    window.__spineInFlight.delete(url);
  });
  window.__spineInFlight.set(url, p);
  return p;
};

