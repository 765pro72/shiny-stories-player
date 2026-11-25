/* Optional realtime post-processing: never changes Spine textures, layout or hit areas. */
(() => {
  'use strict';
  const KEY = 'anime4k', modes = ['off', 'balanced', 'quality', 'fine', 'max2x', 'ultra', 'artcnn'];
  const labels={balanced:'流畅 S · 2×',quality:'清晰 M · 2×',fine:'精细 L · 2×',max2x:'最高 UL · 2×',ultra:'最高 UL · 4×',artcnn:'ArtCNN · 实时 C4F16 · 2×'};
  const engine=value=>value==='artcnn'?'ArtCNN':'Anime4K';
  let mode='off',corePromise,artPromise;
  const instances = new Set(), controls = new Set();
  let toast, toastTimer;
  function announce(message) {
    if (!toast) {
      toast = document.createElement('aside'); toast.className = 'anime4k-toast';
      toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
      const text = document.createElement('span'), close = document.createElement('button');
      close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', '关闭超分提示');
      close.onclick = () => { toast.hidden = true; clearTimeout(toastTimer); };
      toast.append(text, close); document.body.append(toast);
    }
    toast.firstChild.textContent = message; toast.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 12000);
  }
  try {
    const saved = window.desktop?.getState()?.[KEY] || localStorage.getItem(KEY);
    const initialized = sessionStorage.getItem('anime4k-initialized');
    if (initialized && modes.includes(saved)) mode = saved;
    sessionStorage.setItem('anime4k-initialized', '1');
    localStorage.setItem(KEY, mode);
    if (!initialized) window.desktop?.saveState({ [KEY]: 'off' });
  } catch { /* Private browsing may prohibit storage. */ }

  const PIPELINE='qualityPipeline',defaults=[{id:'artcnn',enabled:false,level:'c16'},{id:'anime4k',enabled:false,level:'max2x'}];
  function normalize(value){const out=[];for(const item of Array.isArray(value)?value:[]){if(!defaults.some(d=>d.id===item.id)||out.some(d=>d.id===item.id))continue;const levels=item.id==='artcnn'?['c16','c32','c164x','c324x']:['balanced','quality','fine','max2x','ultra'];out.push({id:item.id,enabled:item.enabled===true,level:levels.includes(item.level)?item.level:defaults.find(d=>d.id===item.id).level})}for(const d of defaults)if(!out.some(v=>v.id===d.id))out.push({...d});return out}
  let pipeline=defaults.map(d=>({...d}));try{const saved=window.desktop?.getState()?.[PIPELINE]||localStorage.getItem(PIPELINE);if(saved)pipeline=normalize(JSON.parse(saved));else if(mode!=='off')pipeline.forEach(d=>{d.enabled=d.id===(mode==='artcnn'?'artcnn':'anime4k');if(d.id==='anime4k'&&mode!=='artcnn')d.level=mode});if(mode==='off')pipeline.forEach(d=>d.enabled=false)}catch{}
  const enabledStages=()=>pipeline.filter(d=>d.enabled).map(({id,level})=>({id,level}));
  const selectedMode=()=>pipeline.some(d=>d.enabled&&d.id==='artcnn')?'artcnn':pipeline.find(d=>d.enabled&&d.id==='anime4k')?.level||'off';
  mode=selectedMode();
  function setPipeline(value,force=false){const before=JSON.stringify(enabledStages()),next=normalize(value);if(parent!==window&&parent.ShinyAnime4K){parent.ShinyAnime4K.setPipeline(next,force);pipeline=next;if(!force&&before===JSON.stringify(enabledStages()))notify();else applyMode(selectedMode(),true);return}pipeline=next;const encoded=JSON.stringify(pipeline);try{localStorage.setItem(PIPELINE,encoded);localStorage.setItem(KEY,selectedMode());window.desktop?.saveState({[PIPELINE]:encoded,[KEY]:selectedMode()})}catch{}if(!force&&before===JSON.stringify(enabledStages()))notify();else applyMode(selectedMode(),true)}

  function loadCore() {
    return corePromise ||= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/anime4k/core.js';
      script.onload = () => resolve(window.Anime4KCore);
      script.onerror = () => { corePromise = null; script.remove(); reject(Error('超分组件加载失败')); };
      document.head.append(script);
    });
  }
  function loadArt(){return artPromise ||= new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/artcnn.js';script.onload=()=>resolve(window.ArtCNN);script.onerror=()=>{artPromise=null;script.remove();reject(Error('ArtCNN 组件加载失败'))};document.head.append(script)})}
  function notify() {
    for (const control of controls) {
      control.render?.();
      if (control.status) {
        const active = [...instances].find(i => i.active), error = [...instances].find(i => i.error),preparing=[...instances].find(i=>i.message&&!i.error);
        control.status.textContent = active?.effectiveMode==='artcnn' ? ((active.actualStages||enabledStages()).map(s=>(s.id==='artcnn'?'ArtCNN '+s.level:'Anime4K '+s.level)).join(' → ')+' · 实时已启用'+(active.adapted?'（自动降档）':'')) : !control.detailed ? error ? '实际：原图' : active ? '实际：' + labels[active.effectiveMode] : mode === 'off' ? '原图' : preparing?.message||'正在准备…' : error?.error || (active
          ? `${engine(active.effectiveMode)} 已启用 · ${active.output.width} × ${active.output.height} · ${labels[active.effectiveMode]}${active.adapted ? '（帧率过低，自动调整）' : ''}`
          : mode === 'off' ? '使用官方原图。' : preparing?.message||'正在准备实时超分…');
      }
      const actual = [...instances].find(i => i.active || i.error);
      control.status.title = actual?.error || (actual?.active ? '实际档位：' + labels[actual.effectiveMode] : mode==='off' ? '使用官方原图' : '正在准备超分');
      if(control.diagnostic){const state=[...instances].find(i=>i.active)||[...instances][0];control.diagnostic.textContent=state?JSON.stringify(state.diagnostics(),null,2):'当前页面没有动态渲染画布。';}
    }
  }
  function applyMode(value, force = false) {
    if (!modes.includes(value) || (!force && value === mode)) return;
    mode = value;
    for (const instance of instances) instance.configure();
    notify();
  }
  function setMode(value){if(!modes.includes(value))return;const next=pipeline.map(d=>({...d,enabled:value==='artcnn'?d.id==='artcnn':value!=='off'&&d.id==='anime4k',level:d.id==='anime4k'&&value!=='off'&&value!=='artcnn'?value:d.level}));setPipeline(next,true)}
  window.addEventListener('storage',event=>{if(event.key===PIPELINE){try{const before=JSON.stringify(enabledStages());pipeline=normalize(JSON.parse(event.newValue));if(before===JSON.stringify(enabledStages()))notify();else applyMode(selectedMode(),true)}catch{}}});

  function mountControl(host, { floating = false, detailed = false } = {}) {
    const wrapper=document.createElement(detailed?'fieldset':'div');wrapper.className=detailed?'anime4k-panel':'anime4k-control'+(floating?' anime4k-floating':'');
    const title=document.createElement(detailed?'legend':'strong');title.textContent='画质增强 · 从上到下执行';
    const list=document.createElement('div');list.className='quality-pipeline';const rows=new Map();let dragging=null;
    const names={artcnn:'ArtCNN',anime4k:'Anime4K'},levels={artcnn:[['c16','实时 C4F16 · 2×'],['c32','精细 C4F32 · 2×'],['c164x','实时 C4F16 · 4×（两次 2×）'],['c324x','精细 C4F32 · 4×（两次 2×）']],anime4k:[['balanced','流畅 S · 2×'],['quality','清晰 M · 2×'],['fine','精细 L · 2×'],['max2x','最高 UL · 2×'],['ultra','最高 UL · 4×']]};
    const reorder=(id,target)=>{const next=pipeline.map(d=>({...d})),from=next.findIndex(d=>d.id===id),to=next.findIndex(d=>d.id===target);if(from<0||to<0||from===to)return;const [item]=next.splice(from,1);next.splice(to,0,item);setPipeline(next)};
    for(const entry of pipeline){const row=document.createElement('div');row.className='quality-model';row.draggable=true;row.dataset.engine=entry.id;const grip=document.createElement('span');grip.className='quality-grip';grip.textContent='⠿';grip.title='拖动以调整处理顺序';
      const label=document.createElement('label'),toggle=document.createElement('input');toggle.type='checkbox';toggle.setAttribute('aria-label','启用 '+names[entry.id]);label.append(toggle,document.createTextNode(names[entry.id]));const select=document.createElement('select');select.setAttribute('aria-label',names[entry.id]+' 档位');for(const [value,text]of levels[entry.id])select.add(new Option(text,value));
      const change=()=>setPipeline(pipeline.map(d=>d.id===entry.id?{...d,enabled:toggle.checked,level:select.value}:{...d}));toggle.onchange=change;select.onchange=change;
      const up=document.createElement('button'),down=document.createElement('button');up.type=down.type='button';up.textContent='↑';down.textContent='↓';up.setAttribute('aria-label','将 '+names[entry.id]+' 前移');down.setAttribute('aria-label','将 '+names[entry.id]+' 后移');up.onclick=()=>{const i=pipeline.findIndex(d=>d.id===entry.id);if(i>0)reorder(entry.id,pipeline[i-1].id)};down.onclick=()=>{const i=pipeline.findIndex(d=>d.id===entry.id);if(i+1<pipeline.length)reorder(entry.id,pipeline[i+1].id)};
      row.ondragstart=e=>{if(e.target.closest('input,select,button')){e.preventDefault();return}dragging=entry.id;e.dataTransfer.setData('text/plain',entry.id);row.classList.add('dragging')};row.ondragover=e=>{e.preventDefault();e.dataTransfer.dropEffect='move'};row.ondrop=e=>{e.preventDefault();const id=dragging||e.dataTransfer.getData('text/plain');reorder(id,entry.id);dragging=null};row.ondragend=()=>{dragging=null;row.classList.remove('dragging')};row.append(grip,label,select,up,down);rows.set(entry.id,{row,toggle,select,up,down});list.append(row);
    }
    // Do not advance dialogue when changing the rendering setting.
    for (const event of ['click', 'pointerdown', 'touchstart']) wrapper.addEventListener(event, e => e.stopPropagation());
    wrapper.append(title, list);
    if (!document.getElementById('anime4k-vram-warn-style')) {
      const st = document.createElement('style');
      st.id = 'anime4k-vram-warn-style';
      st.textContent = '.anime4k-vram-warn{display:block;flex-basis:100%;margin:6px 0 0;font-size:12px;line-height:1.5;color:#b45309;}html[data-theme="dark"] .anime4k-vram-warn{color:#fbbf24;}.anime4k-floating .anime4k-vram-warn{text-align:right;padding:0 5px;font-size:.78em;margin-top:3px;}#cardDetail .anime4k-vram-warn{display:none;}';
      document.head.append(st);
    }
    let status;
    if (detailed) {
      status = document.createElement('p'); status.setAttribute('role', 'status');
      const hint = document.createElement('p');
      hint.textContent='拖动调整实时处理顺序，关闭项跳过，默认全部关闭。ArtCNN C4F16 优先速度，C4F32 更精细但更耗性能；4×连续运行两次2×。全部在显卡本地处理，无需下载大权重、上传图片或等待图集推理。角色、卡面和视频共用实时链；持续低帧率会降档并提示。';
      const vramWarn = document.createElement('p');
      vramWarn.className = 'anime4k-vram-warn';
      vramWarn.textContent = '⚠️ 显存提示：桌面端 2× 实时超分将以 2K→4.5K 渲染，4× 或双模型串联显存占用较高（建议 ≥8GB 显存，低显存设备可能卡顿或显存不足）；如已开启离线 4K 画质包，原生即 4K 渲染，无需再开实时超分。';
      wrapper.append(status, hint, vramWarn);
    } else {
      status = document.createElement('small'); status.className = 'anime4k-actual';
      const vramWarn = document.createElement('small');
      vramWarn.className = 'anime4k-vram-warn';
      vramWarn.textContent = '⚠️ 桌面 2×(4.5K)/4×/串联较吃显存（建议 ≥8GB）；开离线 4K 包时无需再开。';
      wrapper.append(status, vramWarn);
    }
    host.append(wrapper);
    let diagnostic;
    if(detailed){const details=document.createElement('details');details.className='render-diagnostics';const summary=document.createElement('summary');summary.textContent='渲染诊断（显卡／实际档位／GPU 耗时）';diagnostic=document.createElement('pre');const copy=document.createElement('button');copy.type='button';copy.textContent='复制诊断信息';copy.onclick=()=>navigator.clipboard.writeText(diagnostic.textContent).then(()=>copy.textContent='已复制').catch(()=>copy.textContent='复制失败，可手动选取');details.append(summary,diagnostic,copy);wrapper.append(details);}
    const control={status,detailed,diagnostic,render(){for(const entry of pipeline){const r=rows.get(entry.id);r.toggle.checked=entry.enabled;r.select.value=entry.level;r.row.classList.toggle('disabled',!entry.enabled);r.up.disabled=pipeline[0].id===entry.id;r.down.disabled=pipeline.at(-1).id===entry.id;if(list.children[pipeline.indexOf(entry)]!==r.row)list.insertBefore(r.row,list.children[pipeline.indexOf(entry)]||null)}}};controls.add(control);notify();
    return () => { controls.delete(control); wrapper.remove(); };
  }

  function attach(app, { fill = false, background = null, monitorPerformance = () => !!app.ticker?.started } = {}) {
    const source = app.view, renderer = app.renderer;
    if (!source || !renderer?.on) return null;
    // Drop stale overlay canvases from an earlier attach() on the same host so the
    // home stage never ends up with two upscaled layers stacked on each other.
    if (source.parentElement) source.parentElement.querySelectorAll('.anime4k-output').forEach(node => node.remove());
    let output = document.createElement('canvas');
    output.className = 'anime4k-output';
    output.setAttribute('aria-hidden', 'true');
    output.style.display = 'none';
    source.after(output);
    const initialOpacity = source.style.opacity;
    let passes = [], destroyed = false, generation = 0, backgroundSprite = null, pipelineReady = false;
    let frames = 0, previousFrame = 0, firstFrame = 0, averageInterval = 0, samples = 0;

    let sourceAt=0,sourceInterval=0,lastNoticeAt=0,cpuSubmitMs=0;
    const state = { active: false, error: '', output, frames: 0, effectiveMode: 'off', adapted: false, configure: () => configure(), destroy };
    state.diagnostics=()=>{const metrics=passes[0]?.upscaler?.metrics?.()||{},gl=renderer.gl,debug=!metrics.adapter&&gl?.getExtension('WEBGL_debug_renderer_info');return{显卡:metrics.adapter||(debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'未取得'),首选档位:mode==='artcnn'?enabledStages().map(s=>s.id+' '+s.level).join(' → '):labels[mode]||'原图',实际档位:state.effectiveMode==='artcnn'?(state.actualStages||[]).map(s=>s.id+' '+s.level).join(' → '):labels[state.effectiveMode]||'原图',输入:[source.width,source.height],输出:state.active?[state.output.width,state.output.height]:null,来源帧率:sourceInterval?+(1000/sourceInterval).toFixed(1):null,处理帧率:averageInterval?+(1000/averageInterval).toFixed(1):null,GPU耗时毫秒:passes.length>1||metrics.gpuMs==null?null:+metrics.gpuMs.toFixed(2),处理链:passes.map((p,i)=>({引擎:p.id==='artcnn'?'ArtCNN':'Anime4K',档位:p.level,输出:[p.canvas.width,p.canvas.height],GPU耗时毫秒:i===0&&metrics.gpuMs!=null?+metrics.gpuMs.toFixed(2):null})),CPU提交毫秒:+cpuSubmitMs.toFixed(2),跳过积压帧:metrics.skipped||0,自动降档:state.adapted,错误:state.error||null};};
    instances.add(state);

    // Reuse precisely the existing CSS box, including cover/contain cropping.
    // Changing the canvas pixel buffer must never change model coordinates.
    function syncSize() {
      
      output.style.cssText = source.style.cssText;
      output.style.pointerEvents = 'none';
      output.style.opacity = '1';
      output.style.display = state.active ? 'block' : 'none';
      if (fill) Object.assign(output.style, { position: 'absolute', inset: '0', transform: 'none', width: '100%', height: '100%', objectFit: getComputedStyle(source).objectFit || 'contain' });
    }
    function calcNativeRes() {
      const lw = app.screen?.width || 1136;
      const ds = document.documentElement.dataset;
      if (ds.joytrans === '1' || ds.kirin === '1') return lw >= 1920 ? 1 : Math.min(1.5, 1920 / lw);
      const isMob = ds.mobile === '1' || ds.android === '1' || ds.platform === 'android' || /Android|iPhone|iPad|Mobile|HarmonyOS/i.test(navigator.userAgent);
      if (isMob) return lw >= 2560 ? 1 : Math.min(2, Math.max(1, Math.min(Math.max(1.5, window.devicePixelRatio || 1.5), 2560 / lw)));
      if (lw >= 3840) return 1;
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.max(window.innerWidth || 1920, 1920) * dpr;
      return Math.min(3.375, 3840 / lw, Math.max(1, targetW / lw, 2560 / lw));
    }
    let _inResizeSync = false;
    function applyStageResolution(targetRes) {
      if (_inResizeSync) return;
      try {
        const lw = app.screen?.width, lh = app.screen?.height;
        if (!lw || !lh) return;
        if (Math.abs((renderer.resolution || 1) - targetRes) < 0.02) return;
        renderer.resolution = targetRes;
        renderer.resize(lw, lh);
        if (fill) {
          source.style.width = '100%';
          source.style.height = '100%';
        } else {
          _inResizeSync = true;
          try { window.dispatchEvent(new Event('resize')); } finally { _inResizeSync = false; }
        }
        if (app.ticker && !app.ticker.started) app.render();
      } catch {}
    }
    function reset() {
      pipelineReady = false;state.output=output;state.exportImage=null;state.isReady=null;
      state.active = false; state.effectiveMode = 'off';
      source.style.opacity = initialOpacity;
      output.style.display = 'none';
      if (backgroundSprite) backgroundSprite.visible = false;
      for (const pass of passes) {
        pass.upscaler?.detachSource();
        pass.gl?.getExtension('WEBGL_lose_context')?.loseContext();
      }
      passes = [];
      applyStageResolution(calcNativeRes());
      // Destroy the spare WebGL context too; repeated switches must not exhaust
      // Chromium's active-context limit and evict the actual game renderer.
    }
    function fallback(message) {
      generation++;
      reset(); state.error = message + '，已恢复原图。'; notify();
      announce(engine(mode) + '：' + state.error);
    }
    async function configure(preset = mode, adapted = false, override = null) {
      const token = ++generation;
      state.error = ''; state.message='正在读取内置实时超分组件…';state.adapted = adapted;
      // Recreate the output element after dispose, since lost contexts cannot
      // synchronously be reused. The source canvas and PIXI stage stay intact.
      if (passes.length || state.active) reset();
      if (preset === 'off' || destroyed) { applyStageResolution(calcNativeRes()); notify(); return; }
      try {
        const stages=override|| (preset==='artcnn'?enabledStages():[{id:'anime4k',level:preset}]);
        const totalScale=stages.reduce((acc,s)=>acc*((s.level==='ultra'||s.level==='c324x'||s.level==='c164x')?4:2),1);
        const ds=document.documentElement.dataset;
        const isLowPower=ds.joytrans==='1'||ds.kirin==='1'||ds.mobile==='1'||ds.android==='1'||ds.platform==='android'||/Android|iPhone|iPad|Mobile|HarmonyOS/i.test(navigator.userAgent);
        const lw=app.screen?.width||1136;
        applyStageResolution(!isLowPower&&totalScale<=2&&lw<=1600?2:1);
        state.actualStages=stages.map(s=>({...s}));
        const core=stages.some(s=>s.id==='anime4k')?await loadCore():null,art=stages.some(s=>s.id==='artcnn')?await loadArt():null;
        if(destroyed||token!==generation)return;
        const fresh=document.createElement('canvas');fresh.className=output.className;fresh.setAttribute('aria-hidden','true');output.replaceWith(fresh);output=fresh;state.output=fresh;
        let input=source;for(let index=0;index<stages.length;index++){
          const stage=stages[index],canvas=index===stages.length-1?fresh:document.createElement('canvas');let upscaler,gl;
          if(stage.id==='artcnn'){
            upscaler=await art.Upscaler.create(input,canvas,stage.level,message=>{if(token===generation){state.message=message;notify()}});gl=upscaler.gl;
            if(destroyed||token!==generation){upscaler.detachSource();gl.getExtension('WEBGL_lose_context')?.loseContext();return}
          }else{const highest=[core.Clamp,core.Restore_UL,core.CNN_UL],profile=stage.level==='ultra'?[...highest,core.CNN_UL]:stage.level==='max2x'?highest:[stage.level==='fine'?core.CNN_L:stage.level==='quality'?core.CNN_M:core.CNN_S];upscaler=new core.ImageUpscaler(profile);upscaler.attachSource(input,canvas);gl=canvas.getContext('webgl');}
          passes.push({upscaler,canvas,gl,id:stage.id,level:stage.level});
          if(!gl||gl.isContextLost()||canvas.width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||canvas.height>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('显卡不支持此输出尺寸');
          canvas.addEventListener('webglcontextlost',()=>{if(!destroyed&&state.active&&state.output===fresh)fallback('显卡上下文丢失')},{once:true});input=canvas;
        }
        if (background && !backgroundSprite) {
          backgroundSprite = PIXI.Sprite.from(background);
          backgroundSprite.width = app.screen.width; backgroundSprite.height = app.screen.height;
          backgroundSprite.zIndex = -100000;
          app.stage.addChildAt(backgroundSprite, 0);
        }
        if (backgroundSprite) backgroundSprite.visible = true;
        state.effectiveMode = preset;
        pipelineReady = true;
        frames = 0; previousFrame = firstFrame = averageInterval = samples = 0;
        syncOutputSize();
        if (app.ticker && !app.ticker.started) app.render();
      } catch (error) { if (token === generation && !destroyed) fallback(error.message || '超分无法启动'); }
    }
    function syncOutputSize() {
      if (state.effectiveMode === 'off' && !destroyed && !_inResizeSync) applyStageResolution(calcNativeRes());
      syncSize();
    }
    function postrender() {
      const now=performance.now();if(sourceAt&&now-sourceAt<1000)sourceInterval=sourceInterval?sourceInterval*.85+(now-sourceAt)*.15:now-sourceAt;sourceAt=now;
      if (!pipelineReady || !passes.length || destroyed || document.hidden) return;
      try {
        // Must run in PIXI's postrender callback, before the browser discards the
        // WebGL drawing buffer. A separate RAF can upload a blank frame.
        const submitAt=performance.now();
        for (const pass of passes) {
          if(pass.upscaler.upscale({dropIfBusy:!!app.ticker?.started})===false)return;
          if (frames === 0 && (pass.gl.isContextLost() || pass.gl.getError() !== pass.gl.NO_ERROR)) throw Error('显卡无法处理此超分模式');
        }
        cpuSubmitMs=performance.now()-submitAt;
        frames++; state.frames++;
        if (!state.active) {
          state.active = true; source.style.opacity = '0'; syncOutputSize(); notify();
        }
        // Always try the requested model first; ignore startup compilation and
        // transient stalls. Auto adjustments are local to this view, never saved
        // over the user's quality preference. A fresh view tries it again.
        firstFrame ||= now;
        if (previousFrame) {
          const interval = now - previousFrame;
          // 切页/停帧产生的超长空白间隔（>1.5s）直接重置计时，不污染帧率统计
          if (interval > 1500) {
            resetTiming();
            previousFrame = now;
            if(now-lastNoticeAt>1000){lastNoticeAt=now;notify();}
            return;
          }
          intervalWindow.push(interval);
          if (intervalWindow.length > 31) intervalWindow.shift();
          const sorted = [...intervalWindow].sort((a, b) => a - b);
          averageInterval = sorted[sorted.length >> 1];
          samples++;
          if (monitorPerformance() && now - firstFrame > 3500 && ((samples >= 12 && averageInterval > 100) || (samples >= 3 && averageInterval > 500))) {
            const order = ['ultra', 'max2x', 'fine', 'quality', 'balanced'];
            const next = order[order.indexOf(state.effectiveMode) + 1];
            if(state.effectiveMode==='artcnn'){const current=state.actualStages,nextStages=current.map(s=>({...s,level:s.level==='c324x'?'c32':s.level==='c164x'?'c16':s.level==='c32'?'c16':s.id==='anime4k'?'balanced':s.level}));if(JSON.stringify(nextStages)!==JSON.stringify(current)){announce('持续低帧率，实时处理链已降低档位；首选保持不变。');configure('artcnn',true,nextStages)}else fallback('持续帧率过低');return}
            if (next) {
              announce(`${engine(state.effectiveMode)} 检测到持续低帧率，已从「${labels[state.effectiveMode]}」降为「${labels[next]}」。你选择的画质偏好仍保留。`);
              configure(next, true); notify();
            }
            else fallback('持续帧率过低');
            return;
          }
        }
        previousFrame = now;
        if(now-lastNoticeAt>1000){lastNoticeAt=now;notify();}
      } catch (error) { fallback(error.message || '超分处理失败'); }
    }
    function destroy() {
      if (destroyed) return;
      destroyed = true; generation++; renderer.off('postrender', postrender);
      observer.disconnect(); window.removeEventListener('resize', syncOutputSize); window.removeEventListener('pageshow', syncOutputSize);
      window.removeEventListener('message', onShellVisibility);
      document.removeEventListener('visibilitychange', resetTiming);
      reset();output.remove();
      if (backgroundSprite) { app.stage.removeChild(backgroundSprite); backgroundSprite.destroy({ texture: false, baseTexture: false }); }
      instances.delete(state);
    }
    const observer = new ResizeObserver(syncOutputSize);
    observer.observe(source);
    renderer.on('postrender', postrender);
    window.addEventListener('resize', syncOutputSize);
    window.addEventListener('pageshow', syncOutputSize);
    window.addEventListener('pagehide', destroy, { once: true });
    let intervalWindow = [];
    function resetTiming() { previousFrame = firstFrame = samples = averageInterval = sourceAt = sourceInterval = 0; intervalWindow = []; }
    function onShellVisibility(e) { if (e.data && e.data.type === 'shiny-shell-visibility') resetTiming(); }
    window.addEventListener('message', onShellVisibility);
    document.addEventListener('visibilitychange', resetTiming);
    configure();
    return state;
  }
  window.ShinyAnime4K = { attach, mountControl, setMode, setPipeline,get pipeline(){return pipeline.map(d=>({...d}))},get mode() { return mode; }, get states() { return [...instances]; } };
})();

