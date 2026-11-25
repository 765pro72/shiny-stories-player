(()=>{
  const $ = s => document.querySelector(s);
  let catalog = [], current = null, model = null, app = null, serial = 0, lastVoice = null, graph = null, lipFrame = 0, bounds = null;

  function fit() {
    if (!app || !model || !bounds) return;
    const host = $('#previewModel'), width = Math.max(100, host.clientWidth), height = Math.max(100, host.clientHeight);
    if (app.renderer.width !== width || app.renderer.height !== height) app.renderer.resize(width, height);
    
    const isFs = !!document.fullscreenElement;
    const zoom = (Number($('#previewZoom')?.value) || 125) / 100;
    
    // Scale proportionally to height and zoom, avoiding harsh width-clamp
    const baseScale = isFs 
      ? (height * 0.94) / Math.max(1, bounds.height)
      : (height * 0.88) / Math.max(1, bounds.height);
    const scale = baseScale * (zoom / 1.15);
    
    model.scale.set(scale);
    
    // Position head gracefully near the top, scaling downwards and outwards
    const topPad = isFs ? Math.max(24, height * 0.05) : Math.max(12, height * 0.03);
    model.position.set(
      width / 2 - (bounds.x + bounds.width / 2) * scale,
      topPad - bounds.y * scale
    );
  }

  const resize = new ResizeObserver(fit);
  resize.observe($('#previewModel'));

  // Restore saved character size
  const savedZoom = localStorage.getItem('voice_preview_zoom');
  if (savedZoom && $('#previewZoom')) {
    $('#previewZoom').value = savedZoom;
    if ($('#previewZoomValue')) $('#previewZoomValue').textContent = savedZoom + '%';
  }

  $('#previewZoom').oninput = () => {
    const val = $('#previewZoom').value;
    $('#previewZoomValue').textContent = val + '%';
    localStorage.setItem('voice_preview_zoom', val);
    fit();
  };

  $('#previewExpand').onclick = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      $('#voicePreview').requestFullscreen().catch(() => {});
    }
  };

  document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    $('#voicePreview')?.classList.toggle('in-fullscreen', isFs);
    if ($('#previewExpand')) {
      $('#previewExpand').textContent = isFs ? '✕ 退出全屏' : '⛶ 放大全屏';
      $('#previewExpand').title = isFs ? '退出全屏 (Esc)' : '放大偶像全屏试听';
    }
    setTimeout(fit, 50);
  });

  function audioGraph(audio) {
    try {
      if (!graph) {
        const context = new AudioContext(), source = context.createMediaElementSource(audio), analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        analyser.connect(context.destination);
        graph = { context, analyser, samples: new Uint8Array(analyser.fftSize) };
      }
      graph.context.resume().catch(() => {});
    } catch {}
  }

  function genericLip(audio) {
    cancelAnimationFrame(lipFrame);
    if (!model || !graph) return;
    const lip = ['lip_smile', 'lip_smile2', 'lip_trouble'].find(n => model.spineData.animations.some(a => a.name === n));
    if (!lip) return;
    let talking = false, lastSound = 0;
    const target = model;
    function tick() {
      if (target !== model || audio.paused || audio.ended) return;
      graph.analyser.getByteTimeDomainData(graph.samples);
      let power = 0;
      for (const x of graph.samples) power += ((x - 128) / 128) ** 2;
      const now = performance.now();
      if (Math.sqrt(power / graph.samples.length) > 0.012) lastSound = now;
      const active = now - lastSound < 120;
      if (active !== talking) {
        talking = active;
        $('#previewModel').dataset.speaking = String(active);
        if (active) target.state.setAnimation(4, lip, true);
        else target.state.setEmptyAnimation(4, 0.1);
      }
      lipFrame = requestAnimationFrame(tick);
    }
    tick();
  }

  const ready = fetch('/home-assets/catalog.json').then(r => r.json()).then(c => catalog = c);

  const actionNames = {
    wait: '待机', smile: '微笑', shy: '害羞', anger: '生气', sad: '难过', surp: '惊讶',
    yes: '点头', no: '摇头', hello: '打招呼', salute: '敬礼', think: '思考', touch: '触碰反应',
    sleep: '休息', skill: '演出', arm_down: '放下手臂', arm_up: '抬起手臂',
    face_wait: '平常', face_smile: '微笑', face_shy: '害羞', face_anger: '生气',
    face_sad: '难过', face_surp: '惊讶', face_cry: '哭泣', face_close: '闭眼',
    face_serious: '认真', face_trouble: '困扰', face_doya: '得意'
  };

  const label = n => {
    if (!n) return '';
    const base = n.replace(/\d+$/, '');
    return (actionNames[base] || n) + (actionNames[base] ? n.slice(base.length) : '');
  };

  function actionOptions() {
    if (!model) return;
    const names = model.spineData.animations.map(a => a.name), action = $('#previewAction').value, face = $('#previewFace').value;
    $('#previewAction').replaceChildren(new Option('按语音资料', ''), ...names.filter(n => !/^face_|^eye_|^lip_|^blank$/.test(n)).map(n => new Option(label(n), n)));
    $('#previewFace').replaceChildren(new Option('默认表情', ''), ...names.filter(n => /^face_/.test(n)).map(n => new Option(label(n), n)));
    if (names.includes(action)) $('#previewAction').value = action;
    if (names.includes(face)) $('#previewFace').value = face;
  }

  function perform() {
    if (!model) return;
    const action = $('#previewAction').value, face = $('#previewFace').value;
    if (action && model.spineData.animations.some(a => a.name === action)) {
      model.state.setAnimation(0, action, /^wait/.test(action));
      if (!/^wait/.test(action)) {
        const wait = model.spineData.animations.find(a => a.name === 'wait1')?.name || model.spineData.animations.find(a => a.name.startsWith('wait'))?.name;
        if (wait) model.state.addAnimation(0, wait, true, 0);
      }
    }
    if (face && model.spineData.animations.some(a => a.name === face)) {
      model.state.setAnimation(1, face, true);
    }
  }

  $('#previewAction').onchange = () => {
    perform();
    const txt = $('#previewAction').selectedOptions[0]?.textContent || '';
    $('#previewStatus').textContent = txt ? '指定动作 · ' + txt : '动作跟随语音资料';
  };
  $('#previewFace').onchange = perform;
  $('#performAction').onclick = perform;

  function idle() {
    cancelAnimationFrame(lipFrame);
    if (!model) return;
    const a = model.spineData.animations.map(a => a.name);
    const wait = a.includes('wait1') ? 'wait1' : a.find(n => n.startsWith('wait'));
    if (wait) model.state.setAnimation(0, wait, true);
    for (let i = 1; i < model.state.tracks.length; i++) {
      if (model.state.getCurrent(i)) model.state.setEmptyAnimation(i, 0.2);
    }
  }

  async function load(choice) {
    const token = ++serial;
    $('#previewStatus').textContent = '正在加载服装…';
    try {
      const _vds = document.documentElement.dataset;
      const _vRes = (_vds.joytrans === '1' || _vds.kirin === '1') ? 1.5 : ((_vds.mobile === '1' || _vds.android === '1' || _vds.platform === 'android' || /Android|iPhone|iPad|Mobile|HarmonyOS/i.test(navigator.userAgent)) ? Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5)) : Math.min(3, Math.max(2, (window.devicePixelRatio || 1) * 2)));
      if (window.PIXI?.settings && window.PIXI?.MIPMAP_MODES) PIXI.settings.MIPMAP_TEXTURES = PIXI.MIPMAP_MODES.ON;
      app ??= new PIXI.Application({ width: 900, height: 1000, transparent: true, antialias: true, resolution: _vRes, autoDensity: true });
      if (!app.view.parentNode) {
        app.view.style.width = '100%';
        app.view.style.height = '100%';
        app.view.style.objectFit = 'contain';
        $('#previewModel').append(app.view);
        window.ShinyAnime4K?.attach(app, { fill: true });
        window.ShinyAnime4K?.mountControl(document.querySelector('.preview-actions'));
      }
      const loader = new PIXI.Loader();
      const r = await new Promise((resolve, reject) => {
        loader.onError.add(reject);
        loader.add('model', '/asset-original/' + choice.path).load((_, res) => res.model?.spineData ? resolve(res.model) : reject(Error('模型不可用')));
      });
      if (token !== serial) return;
      const next = new PIXI.spine.Spine(r.spineData);
      try { next.skeleton.setSkinByName('normal'); } catch {}
      next.stateData.defaultMix = 0.25;
      if (model) {
        app.stage.removeChild(model);
        model.destroy({ children: true, texture: false, baseTexture: false });
      }
      model = next;
      model.autoUpdate = true;
      app.stage.addChild(model);
      actionOptions();
      idle();
      model.update(0);
      bounds = model.getLocalBounds().clone();
      fit();
      {
        const fading = model;
        let elapsed = 0;
        fading.alpha = 0;
        const fade = delta => {
          if (model !== fading) { app.ticker.remove(fade); return; }
          elapsed += delta / 60;
          fading.alpha = Math.min(1, elapsed / 0.2);
          if (fading.alpha === 1) app.ticker.remove(fade);
        };
        app.ticker.add(fade);
      }
      $('#previewStatus').textContent = '已载入：' + choice.label;
      $('#voiceWardrobe').href = 'model-picker.html?' + new URLSearchParams({ target: 'voice', idol: current.id, outfit: choice.key, kind: document.querySelector('#kind').value });
    } catch (e) {
      if (token === serial) $('#previewStatus').textContent = '模型加载失败，可换装重试；语音仍可播放。';
    }
  }

  async function select(id) {
    await ready;
    const p = catalog.find(p => p.id === (Number(id) === 91 ? 'staff' : String(Number(id))));
    if (!p) return;
    if (current === p) return;
    current = p;
    $('#previewName').textContent = p.name;
    $('#previewOutfit').replaceChildren(...p.outfits.map(o => new Option(o.label, o.key)));
    const requested = new URLSearchParams(location.search).get('outfit');
    const choice = p.outfits.find(o => o.key === requested) || p.outfits[0];
    $('#previewOutfit').value = choice.key;
    await load(choice);
  }

  // Intelligent matching of voice to Spine animation & expression
  function getVoiceAnimations(v) {
    if (!v || !model) return null;
    const avail = model.spineData.animations.map(a => a.name);
    
    // 0. Check voice entry's own official animations directly
    if (v.animations?.length) {
      const body = v.animations.find(a => a && !a.startsWith('face_') && !a.startsWith('lip_') && a !== 'blank' && avail.includes(a));
      const face = v.animations.find(a => a && a.startsWith('face_') && avail.includes(a));
      const lip = v.lip && avail.includes(v.lip) ? v.lip : 'lip_smile';
      return { body, face, lip, isNative: true };
    }

    // 1. Check exact catalog metadata
    const known = [...(current?.voices || []), ...(current?.castingVoices || []), ...(current?.outfits?.flatMap(o => o.homeVoices || []) || [])].find(x => x.path === v.key);
    if (known?.animations?.length) {
      const body = known.animations.find(a => a && !a.startsWith('face_') && !a.startsWith('lip_') && a !== 'blank' && avail.includes(a));
      const face = known.animations.find(a => a && a.startsWith('face_') && avail.includes(a));
      const lip = known.lip && avail.includes(known.lip) ? known.lip : 'lip_smile';
      return { body, face, lip, isNative: true };
    }

    // 2. Intelligent semantic inference from filename, title, original and translation text
    const text = ((v.title || '') + ' ' + (v.key || '') + ' ' + (v.original || '') + ' ' + (v.translation || '')).toLowerCase();
    let body = '', face = '', lip = 'lip_smile';

    if (/agree|yes|nod|そう|はい|了解|点头|赞同/.test(text)) {
      body = avail.find(a => /^smile|^wait2|^yes/.test(a));
      face = avail.find(a => /^face_smile|^face_wait/.test(a));
    } else if (/anger|angry|怒|ぷん|だめ|生氣/.test(text)) {
      body = avail.find(a => /^anger/.test(a));
      face = avail.find(a => /^face_anger/.test(a));
    } else if (/sad|cry|泪|泣|悲|辛|ごめん|抱歉|难过/.test(text)) {
      body = avail.find(a => /^sad/.test(a));
      face = avail.find(a => /^face_sad/.test(a));
    } else if (/surp|shock|えっ|驚|惊|哇|本当|真的/.test(text)) {
      body = avail.find(a => /^surp/.test(a));
      face = avail.find(a => /^face_surp/.test(a));
    } else if (/shy|blush|照れ|恥|害羞|脸红|えへへ/.test(text)) {
      body = avail.find(a => /^shy/.test(a));
      face = avail.find(a => /^face_shy/.test(a));
    } else if (/greet|hello|morning|aisatsu|おはよう|こんにちは|你好|问候|早安/.test(text)) {
      body = avail.find(a => /^hello|^salute|^smile/.test(a));
      face = avail.find(a => /^face_smile/.test(a));
    } else if (/think|puzzle|worry|考え|うーん|思考|想想/.test(text)) {
      body = avail.find(a => /^think/.test(a));
      face = avail.find(a => /^face_trouble|^face_serious/.test(a));
    } else if (/smile|happy|glad|笑|喜|嬉|开心|高兴|喜欢|♪|♡/.test(text)) {
      body = avail.find(a => /^smile/.test(a));
      face = avail.find(a => /^face_smile/.test(a));
    } else if (/touch|reaction|触|碰/.test(text)) {
      body = avail.find(a => /^touch|^shy/.test(a));
      face = avail.find(a => /^face_shy|^face_smile/.test(a));
    } else {
      const candidates = avail.filter(a => /^(smile\d*|wait\d+|shy\d*|think\d*)/.test(a));
      if (candidates.length) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) & 0xffff;
        body = candidates[hash % candidates.length];
      }
      face = avail.find(a => /^face_smile|^face_wait/.test(a));
    }

    body ||= avail.find(a => a === 'wait1') || avail.find(a => a.startsWith('wait')) || '';
    face ||= avail.find(a => a === 'face_wait') || avail.find(a => a.startsWith('face_')) || '';
    if (!avail.includes(lip)) lip = avail.find(a => a.startsWith('lip_')) || '';

    return { body, face, lip, isNative: false };
  }

  function animate(v, audio) {
    if (!model) return;
    idle();
    const anim = getVoiceAnimations(v);
    const userAction = $('#previewAction')?.value;
    const userFace = $('#previewFace')?.value;

    const actionToPlay = userAction || anim?.body;
    const faceToPlay = userFace || anim?.face;

    if (actionToPlay && model.spineData.animations.some(a => a.name === actionToPlay)) {
      model.state.setAnimation(0, actionToPlay, /^wait/.test(actionToPlay));
      if (!/^wait/.test(actionToPlay)) {
        const wait = model.spineData.animations.find(a => a.name === 'wait1')?.name || model.spineData.animations.find(a => a.name.startsWith('wait'))?.name;
        if (wait) model.state.addAnimation(0, wait, true, 0);
      }
    }

    if (faceToPlay && model.spineData.animations.some(a => a.name === faceToPlay)) {
      model.state.setAnimation(1, faceToPlay, true);
    }

    if (anim?.lip && model.spineData.animations.some(a => a.name === anim.lip)) {
      model.state.setAnimation(4, anim.lip, true);
    } else {
      genericLip(audio);
    }

    const actionDesc = (userAction || anim?.body) ? ` · 动作 [${label(userAction || anim?.body)}]` : '';
    $('#previewStatus').textContent = anim?.isNative 
      ? `原声播放中 · 原版专属动作${actionDesc}` 
      : `原声播放中 · 智能匹配动作${actionDesc}`;
  }

  $('#previewOutfit').onchange = () => load(current.outfits.find(o => o.key === $('#previewOutfit').value));

  let playSerial = 0;
  window.voicePreview = {
    select,
    async play(v, audio) {
      const token = ++playSerial;
      audioGraph(audio);
      lastVoice = v;
      window.currentGalleryVoice = v;
      audio.pause();
      await select(v.characterId);
      if (token !== playSerial) return;
      const getOverride = (voice) => {
        try {
          const map = JSON.parse(localStorage.getItem('overrides') || '{}');
          return (map['home:voices'] || {})[voice.key] || (map['home:voices'] || {})[voice.id] || (map['home:voices'] || {})[voice.original] || (map['voice:key'] || {})[voice.key] || '';
        } catch { return ''; }
      };
      const override = getOverride(v);
      const text = override || v.translation || v.original || '此语音字幕尚未收录。';
      $('#previewSubtitle').textContent = text;
      const editBtn = $('#editGallerySubtitle');
      if (editBtn) editBtn.disabled = false;
      $('#previewAudio').append(audio);
      audio.src = '/asset/' + v.key;
      audio.onplaying = () => animate(v, audio);
      audio.onended = () => { idle(); $('#previewStatus').textContent = '播放结束'; };
      audio.onpause = () => idle();
      try {
        await audio.play();
      } catch {
        $('#previewStatus').textContent = '请点击播放器重试';
      }
    },
    stop() {
      playSerial++;
      idle();
    }
  };

  function openGalleryEditor() {
    const v = lastVoice || window.currentGalleryVoice;
    const sub = $('#previewSubtitle');
    const box = $('#galleryEditBox');
    const area = $('#galleryEditText');
    const origRow = $('#galleryEditOrigRow');
    const origText = $('#galleryEditOrigText');
    if (!box || !area) return;

    let initial = '';
    if (v) {
      const map = JSON.parse(localStorage.getItem('overrides') || '{}');
      const ov = (map['home:voices'] || {})[v.key] || (map['home:voices'] || {})[v.id] || (map['home:voices'] || {})[v.original] || (map['voice:key'] || {})[v.key] || '';
      initial = ov || v.translation || (v.original ? v.original : '');
    } else {
      initial = sub ? sub.textContent.trim() : '';
      if (initial.includes('尚未收录')) initial = '';
    }

    if (v && v.original) {
      origText.textContent = v.original;
      origRow.hidden = false;
    } else {
      origRow.hidden = true;
    }

    area.value = initial;
    if (!box.hidden) {
      closeGalleryEditor();
      return;
    }
    box.hidden = false;
    setTimeout(() => { area.focus(); area.select(); }, 50);

    const onDocClick = (e) => {
      if (box.hidden) return;
      if (e.target.closest('#galleryEditBox') || e.target.closest('#editGallerySubtitle')) return;
      closeGalleryEditor();
      document.removeEventListener('pointerdown', onDocClick);
    };
    setTimeout(() => {
      document.addEventListener('pointerdown', onDocClick);
    }, 60);
  }

  function closeGalleryEditor() {
    const box = $('#galleryEditBox');
    if (box) box.hidden = true;
  }

  async function saveGalleryEdit() {
    const area = $('#galleryEditText');
    if (!area) return;
    const newText = area.value.trim();
    if (!newText) {
      area.focus();
      return;
    }
    const v = lastVoice || window.currentGalleryVoice;
    const all = JSON.parse(localStorage.getItem('overrides') || '{}');
    all['home:voices'] = all['home:voices'] || {};
    all['voice:key'] = all['voice:key'] || {};

    if (v) {
      if (v.key) {
        all['voice:key'][v.key] = newText;
        all['home:voices'][v.key] = newText;
      }
      if (v.id) all['home:voices'][v.id] = newText;
      if (v.original) all['home:voices'][v.original] = newText;
      v.translation = newText;
    }

    const jsonStr = JSON.stringify(all);
    localStorage.setItem('overrides', jsonStr);
    window.desktop?.saveState?.({ overrides: jsonStr });

    try {
      fetch('/api/save-subtitle-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          id: v?.id,
          key: v?.key,
          original: v?.original,
          translation: newText,
          speaker: v?.speaker || v?.idol,
          path: v?.key
        })
      }).catch(() => {});
    } catch {}

    const sub = $('#previewSubtitle');
    if (sub) sub.textContent = newText;
    closeGalleryEditor();
    window.dispatchEvent(new CustomEvent('translation-overrides-changed', { detail: all }));
  }

  const gEditBtn = $('#editGallerySubtitle');
  if (gEditBtn) gEditBtn.onclick = openGalleryEditor;
  const gSaveBtn = $('#galleryEditSave');
  if (gSaveBtn) gSaveBtn.onclick = saveGalleryEdit;
  const gCancelBtn = $('#galleryEditCancel');
  if (gCancelBtn) gCancelBtn.onclick = closeGalleryEditor;
  const subEl = $('#previewSubtitle');
  if (subEl) {
    subEl.ondblclick = openGalleryEditor;
    subEl.title = '双击或点击右侧铅笔可直接编辑此语音字幕';
  }
  const areaEl = $('#galleryEditText');
  if (areaEl) {
    areaEl.onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveGalleryEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeGalleryEditor();
      }
    };
  }

  window.addEventListener('translation-overrides-changed', () => {
    const v = lastVoice || window.currentGalleryVoice;
    if (!v) return;
    try {
      const map = JSON.parse(localStorage.getItem('overrides') || '{}');
      const ov = (map['home:voices'] || {})[v.key] || (map['home:voices'] || {})[v.id] || (map['home:voices'] || {})[v.original] || (map['voice:key'] || {})[v.key] || '';
      if (ov && $('#previewSubtitle')) $('#previewSubtitle').textContent = ov;
    } catch {}
  });

  window.addEventListener('pagehide', () => {
    serial++;
    resize.disconnect();
    app?.destroy(false, { children: true, texture: false, baseTexture: false });
  });
})();