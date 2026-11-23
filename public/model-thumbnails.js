/* Bundled native alpha-transparent stills are the fast path. Only newly indexed
 * models without a baked still need the bounded, lazy Spine renderer below. */
(() => {
  const bundled=fetch('/model-previews/index.json').then(r=>r.ok?r.json():null).then(data=>(data?.version===2||data?.version===1)?data.entries:{}).catch(()=>({})),images=new Map();let engine;
  const stats={bundled:0,fallback:0};
  function script(src){return new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.onload=resolve;tag.onerror=()=>{tag.remove();reject(Error('预览渲染器未载入'))};document.head.append(tag)})}
  async function ensureEngine(){if(window.PIXI?.spine?.Spine)return;engine??=(async()=>{if(!window.PIXI)await script('/player/lib/pixi.js');if(!window.PIXI.spine?.Spine)await script('/player/lib/pixi-spine.umd.js')})().catch(e=>{engine=null;throw e});return engine;}
  function image(url){
    if(images.has(url))return images.get(url);
    const pending=new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(url);
      img.onerror=()=>reject(Error('预览图片未载入'));
      img.src=url;
    });
    images.set(url,pending);if(images.size>80)images.delete(images.keys().next().value);
    pending.catch(()=>images.delete(url));return pending;
  }
  let app, sequence = 0,cleanupTimer;const retired=new Set();
  function cleanup(){if(queue.active||queue.jobs.size){cleanupTimer=setTimeout(cleanup,100);return}for(const atlas of retired){if(!atlas.pages.some(page=>Object.keys(page.baseTexture?._glTextures||{}).some(id=>String(id)!==String(app.renderer.CONTEXT_UID))))atlas.dispose()}retired.clear();}
  async function render(path,{spineData}={}) {
    await ensureEngine();
    app ||= new PIXI.Application({ width: 480, height: 640, resolution: 1, autoStart: false, antialias: true, preserveDrawingBuffer: true, backgroundAlpha: 0 });
    const loader = new PIXI.Loader(), name = 'outfitPreview' + (++sequence);
    let model, resource;
    try {
      resource = spineData?{spineData}:await new Promise((resolve, reject) => {
        loader.onError.once(error => reject(Error(error?.message || '模型加载失败')));
        loader.add(name, '/asset-original/' + path, { timeout: 20000 }).load((_, rows) => rows[name]?.spineData ? resolve(rows[name]) : reject(Error('没有模型数据')));
      });
      model = new PIXI.spine.Spine(resource.spineData);
      try { model.skeleton.setSkinByName('normal'); } catch { /* use default */ }
      const idle = model.spineData.animations.find(a => a.name === 'wait1') || model.spineData.animations.find(a => /^wait/.test(a.name));
      if (idle) model.state.setAnimation(0, idle.name, false);
      model.autoUpdate = false; model.update(.05); app.stage.addChild(model);
      const bounds = model.getLocalBounds(), scale = Math.min(430 / Math.max(1, bounds.width), 595 / Math.max(1, bounds.height));
      model.scale.set(scale); model.position.set(240 - (bounds.x + bounds.width / 2) * scale, 24 - bounds.y * scale);
      app.render(); return app.view.toDataURL('image/webp', .86);
    } finally {
      if (model) { app.stage.removeChild(model); model.destroy({ children: true, texture: false, baseTexture: false }); }
      // This renderer is only used for disposable previews; never dispose the
      // lobby's or voice stage's textures. Each Loader owns these resources.
      // Concurrent loaders may share an atlas. Retire only after the queue drains.
      if(resource?.spineAtlas){retired.add(resource.spineAtlas);clearTimeout(cleanupTimer);cleanupTimer=setTimeout(cleanup,100)}loader.destroy();
    }
  }
  let saveTimer;
  function savePreviews(){clearTimeout(saveTimer);try{let bytes=0;const rows=[];for(const [key,image]of [...queue.cache].reverse()){if(rows.length>=40||bytes+image.length>750000)break;rows.unshift([key,image]);bytes+=image.length}sessionStorage.setItem('outfit-preview-v2',JSON.stringify(rows))}catch{/* UI cache is optional, including when storage is full. */}}
  const queue=new PreviewQueue(async(path,options)=>{const image=await render(path,options);clearTimeout(saveTimer);saveTimer=setTimeout(savePreviews,100);return image},{concurrency:2,capacity:80});
  try{for(const [key,image]of JSON.parse(sessionStorage.getItem('outfit-preview-v2')||'[]'))if(typeof key==='string'&&/^spine\//.test(key)&&typeof image==='string'&&/^data:image\/webp;base64,/.test(image)&&image.length<150000)queue.cache.set(key,image)}catch{}
  window.addEventListener('pagehide',savePreviews);
  window.modelThumbnails={async get(path,options={}){
    const entries=await bundled;if(options.valid&&!options.valid())throw Error('预览请求已过期');
    const entry=entries[path];if(entry&&/^[a-f0-9]{24}\.webp$/.test(entry.file))try{const url=await image('/model-previews/'+entry.file);stats.bundled++;return url}catch{/* Missing/corrupt optional still: retain the actual-model fallback. */}
    stats.fallback++;return queue.get(path,options);
  },stats:Object.assign(queue.stats,{fastPath:stats})};
})();
