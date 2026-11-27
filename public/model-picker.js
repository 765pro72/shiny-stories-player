(() => {
  const $ = s => document.querySelector(s), params = new URLSearchParams(location.search);
  const target = params.get('target') === 'voice' ? 'voice' : 'home', slot = Math.max(0, Math.min(4, Number(params.get('slot')) || 0));
  let prefs = {}; try { prefs = JSON.parse(window.desktop?.getState()?.home || localStorage.getItem('home') || '{}'); } catch {}
  let catalog = [], chibiByOwner = new Map(), signatures = {}, owner, choices = [], filtered = [], page = 0, selected, serial = 0, cardIndex = new Map();
  const pageSize = 12; let previewObserver, drawSerial = 0;
  let chibiApp = null, chibiModel = null;
  const isConstrained = document.documentElement.dataset.joytrans === '1' || document.documentElement.dataset.android === '1';

  const voiceReturn = () => 'voice-gallery.html?' + new URLSearchParams({ idol: owner.id === 'staff' ? '91' : owner.id, outfit: selected.key, kind: params.get('kind') || '' });
  $('#back').href = target === 'voice' ? 'voice-gallery.html' : 'index.html';
  $('#applyHint').textContent = target === 'voice' ? '应用到语音试听角色。' : `应用到大厅位置 ${slot + 1}，其他位置保持当前选择。`;
  const isChibi = choice => choice && (choice.kind === 'cb' || choice.kind === 'cb_costume');
  const kind = choice => isChibi(choice) ? choice.kind : (/stand_costume|concert/.test(choice.path) ? 'stage' : choice.source === 'story-model' || choice.key.startsWith('story:') || /support_idols|characters|sub_characters/.test(choice.path) ? 'story' : 'daily');
  const rarity = c => { if (c.rarity && c.rarity !== 'other') return c.rarity; const card = cardIndex.get(c.preludeCardId || c.id); return card ? CardTaxonomy.rarity(card) : 'other'; };

  function destroyChibiStage() {
    if (chibiApp) {
      try { chibiApp.destroy(true, { children: true, texture: false, baseTexture: false }); } catch {}
      chibiApp = null;
      chibiModel = null;
    }
    const wrap = $('#chibiStageWrap');
    if (wrap) { wrap.replaceChildren(); wrap.hidden = true; }
    const motionsEl = $('#chibiMotions');
    if (motionsEl) { motionsEl.replaceChildren(); motionsEl.hidden = true; }
  }
  window.addEventListener('pagehide', destroyChibiStage);

  function renderChibiPreview(choice, token) {
    destroyChibiStage();
    const wrap = $('#chibiStageWrap');
    const motionsEl = $('#chibiMotions');
    if (!wrap || !window.PIXI?.spine?.Spine) {
      $('#previewHint').textContent = 'PIXI-Spine 运行时未就绪，请刷新重试。';
      return;
    }
    wrap.hidden = false;
    $('#selectedImage').hidden = true;
    $('#previewHint').hidden = false;
    $('#previewHint').textContent = '正在加载两头身动态小人…';

    const url = '/asset-original/' + choice.path;
    const loader = new PIXI.Loader();
    const resKey = 'chibi_' + token;
    loader.add(resKey, url).load((l, res) => {
      if (token !== serial) return;
      const spineData = res[resKey]?.spineData;
      if (!spineData) {
        $('#previewHint').textContent = '小人模型加载失败，请检查网络或缓存后重试。';
        return;
      }
      const app = new PIXI.Application({
        width: 280,
        height: 280,
        backgroundAlpha: 0,
        antialias: !isConstrained,
        resolution: isConstrained ? 1.25 : Math.min(2, window.devicePixelRatio || 1.5),
        autoDensity: true
      });
      if (isConstrained) app.ticker.maxFPS = 30;
      chibiApp = app;
      wrap.replaceChildren(app.view);

      const spine = new PIXI.spine.Spine(spineData);
      try { spine.skeleton.setSkinByName('normal'); } catch {
        if (spine.spineData.skins.some(s => s.name === 'default')) spine.skeleton.setSkinByName('default');
      }
      spine.skeleton.setToSetupPose();
      spine.stateData.defaultMix = 0.2;
      chibiModel = spine;
      app.stage.addChild(spine);

      const anims = (spine.spineData.animations || []).map(a => a.name);
      const firstAnim = anims.includes('wait') ? 'wait'
        : anims.includes('wait_01') ? 'wait_01'
        : anims.includes('pattern1') ? 'pattern1'
        : (anims[0] || '');
      if (firstAnim) spine.state.setAnimation(0, firstAnim, true);
      try { spine.update(0.016); } catch {}

      const b = spine.getLocalBounds();
      const bw = Math.max(40, b.width || 180);
      const bh = Math.max(40, b.height || 240);
      const scale = Math.min(220 / bw, 230 / bh);
      spine.scale.set(scale);
      spine.position.set(140 - (b.x + bw / 2) * scale, 255 - (b.y + bh) * scale);

      $('#previewHint').hidden = true;
      if (motionsEl && anims.length) {
        motionsEl.hidden = false;
        motionsEl.replaceChildren();
        for (const name of anims) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = name;
          if (name === firstAnim) btn.classList.add('active');
          btn.onclick = () => {
            if (!chibiModel) return;
            motionsEl.querySelectorAll('button').forEach(x => x.classList.remove('active'));
            btn.classList.add('active');
            try { chibiModel.state.setAnimation(0, name, true); } catch {}
          };
          motionsEl.append(btn);
        }
      }
    });
    loader.onError.add(() => {
      if (token === serial) $('#previewHint').textContent = '小人在线预览暂不可用，请重试。';
    });
  }

  function pick(choice) {
    selected = choice; const token = ++serial;
    window.ModuleDirectory?.wardrobeCover(owner, choice.preludeCardId || choice.id);
    $('#selectedName').textContent = owner.name;
    $('#selectedLabel').textContent = choice.label;

    const signEl = $('#selectedSign');
    if (signEl) {
      const signPath = signatures[owner.id];
      if (signPath) {
        signEl.src = '/asset-original/' + signPath;
        signEl.hidden = false;
        signEl.onerror = () => { signEl.hidden = true; };
      } else {
        signEl.hidden = true;
      }
    }

    document.querySelectorAll('.model-card').forEach(button => button.classList.toggle('active', button.dataset.key === choice.key));

    const chibi = isChibi(choice);
    const btnCompanion = $('#setCompanionChibi');
    const btnMini = $('#openMiniStage');
    if (btnCompanion) btnCompanion.hidden = !chibi;
    if (btnMini) btnMini.hidden = !chibi;

    if (chibi) {
      $('#applyModel').disabled = true;
      $('#applyModel').hidden = true;
      $('#applyHint').textContent = '两头身小人可一键设为桌面敲键盘桌宠，或加入 5 人迷你排练/LIVE 舞台。';
      renderChibiPreview(choice, token);
      return;
    }

    destroyChibiStage();
    $('#applyModel').hidden = false;
    $('#applyModel').disabled = false;
    $('#applyHint').textContent = target === 'voice' ? '应用到语音试听角色。' : `应用到大厅位置 ${slot + 1}，其他位置保持当前选择。`;
    $('#selectedImage').hidden = true;
    $('#previewHint').hidden = false;
    $('#previewHint').textContent = '正在准备模型预览…';

    modelThumbnails.get(choice.path, { priority: 100, valid: () => token === serial }).then(image => {
      if (token !== serial) return;
      $('#selectedImage').src = image;
      $('#selectedImage').hidden = false;
      $('#previewHint').hidden = true;
    }).catch(() => {
      if (token === serial) $('#previewHint').textContent = '预览暂未载入；可重选重试，在线预览需要网络或已下载模型。';
    });
  }

  function applyOutfit(choice) {
    if (!choice || isChibi(choice)) return;
    if (target === 'voice') { location.href = voiceReturn(); return; }
    const members = Array.isArray(prefs.members) && prefs.members.length ? prefs.members.map(m => ({ ...m })) : [{ idol: prefs.idol || '1', outfit: prefs.outfit }];
    while (members.length <= slot) members.push({ ...members[0] });
    members[slot] = { idol: owner.id, outfit: choice.key }; prefs.members = members; prefs.count = Math.max(prefs.count || 1, members.length);
    if (slot === 0) { prefs.idol = owner.id; prefs.outfit = choice.key; }
    const value = JSON.stringify(prefs); localStorage.setItem('home', value); window.desktop?.saveState({ home: value }); location.href = 'index.html';
  }

  async function applyAsCompanionChibi(choice) {
    if (!choice) return;
    let cmpCfg = {};
    try { cmpCfg = JSON.parse(localStorage.getItem('shiny.companionConfig') || '{}'); } catch {}
    cmpCfg.mode = cmpCfg.mode === 'chibi-stage' ? 'chibi-stage' : 'chibi-desk';
    cmpCfg.chibiOwnerId = owner.id;
    cmpCfg.chibiPath = choice.path;
    cmpCfg.chibiLabel = choice.label;
    cmpCfg.chibiIcon = choice.icon || '';
    const val = JSON.stringify(cmpCfg);
    try { localStorage.setItem('shiny.companionConfig', val); } catch {}
    try { window.desktop?.saveState?.({ 'shiny.companionConfig': val }); } catch {}
    try {
      await window.desktop?.notifyCompanionOutfit?.({
        ownerId: owner.id,
        ownerName: owner.name,
        path: choice.path,
        label: choice.label,
        icon: choice.icon || ''
      });
      const isOpen = await window.desktop?.isCompanionOpen?.();
      if (!isOpen && window.desktop?.toggleCompanion) {
        await window.desktop.toggleCompanion();
      }
    } catch {}
    $('#applyHint').textContent = `✓ 已设为桌面敲键盘小人：${choice.label}`;
  }

  function draw() {
    const version = ++drawSerial; previewObserver?.disconnect(); $('#modelGrid').replaceChildren();
    previewObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { previewObserver.unobserve(entry.target); entry.target.loadPreview(); }
    }, { rootMargin: '180px' });
    for (const choice of filtered.slice(page * pageSize, (page + 1) * pageSize)) {
      const card = document.createElement('article'); card.className = 'model-card'; card.dataset.key = choice.key;
      if (window.ShinyNewBadges?.isNew('models', choice.path)) {
        card.classList.add('has-new-badge');
        card.append(window.ShinyNewBadges.badgeEl('models'));
      }
      const cardBody = document.createElement('div'); cardBody.className = 'model-card-body';
      const art = document.createElement('div'); art.className = 'art'; const loading = document.createElement('span'); loading.className = 'loading'; loading.textContent = '正在准备模型预览…'; art.append(loading);
      const label = document.createElement('strong'); label.textContent = choice.label;
      const meta = document.createElement('small'); meta.textContent = (rarity(choice) === 'other' ? (isChibi(choice) ? '两头身小人' : '其他模型') : rarity(choice)) + ' · ' + (choice.id || choice.key);
      cardBody.append(art, label, meta);
      cardBody.onclick = () => { window.ShinyNewBadges?.markSeen('models', choice.path, card); pick(choice); };

      const applyBtn = document.createElement('button');
      applyBtn.type = 'button';
      applyBtn.className = 'card-apply-btn';
      applyBtn.textContent = isChibi(choice) ? '桌宠' : '使用';
      applyBtn.title = isChibi(choice) ? `设为桌面小人：${choice.label}` : `使用 ${choice.label}`;
      applyBtn.onclick = (e) => {
        e.stopPropagation();
        pick(choice);
        if (isChibi(choice)) applyAsCompanionChibi(choice);
        else applyOutfit(choice);
      };

      card.append(cardBody, applyBtn);
      $('#modelGrid').append(card);
      card.loadPreview = () => {
        if (isChibi(choice) && choice.icon) {
          const img = new Image();
          img.onload = () => { if (card.isConnected && version === drawSerial) art.replaceChildren(img); };
          img.onerror = () => {
            modelThumbnails.get(choice.path, { priority: 1, valid: () => card.isConnected && version === drawSerial })
              .then(image => { if (!card.isConnected) return; const im = new Image(); im.src = image; im.alt = choice.label; art.replaceChildren(im); })
              .catch(() => { if (card.isConnected) loading.textContent = '点击右侧预览动态小人'; });
          };
          img.alt = choice.label;
          img.src = '/asset-original/' + choice.icon;
          return;
        }
        modelThumbnails.get(choice.path, { priority: 1, valid: () => card.isConnected && version === drawSerial })
          .then(image => { if (!card.isConnected) return; const img = new Image(); img.src = image; img.alt = choice.label; art.replaceChildren(img); })
          .catch(() => { if (card.isConnected) loading.textContent = isChibi(choice) ? '点击右侧预览动态小人' : '预览暂不可用 · 点击重试'; });
      };
      previewObserver.observe(card);
    }
    window.UIFlow?.enter($('#modelGrid')); const count = Math.max(1, Math.ceil(filtered.length / pageSize)); $('#page').textContent = `${page + 1} / ${count}`; $('#previous').disabled = page === 0; $('#next').disabled = page + 1 === count;
    $('#modelCount').textContent = `${owner.name} · ${filtered.length} 套模型与服装`;
    document.querySelectorAll('.model-card').forEach(card => card.classList.toggle('active', card.dataset.key === selected?.key));
  }

  function filter() {
    const query = $('#modelSearch').value.toLowerCase(), type = $('#modelType').value, level = $('#modelRarity').value;
    document.querySelectorAll('#wardrobeScopes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.scope === type)));
    filtered = choices.filter(c => (!type || kind(c) === type) && (!level || rarity(c) === level) && `${c.label} ${c.id} ${c.key}`.toLowerCase().includes(query));
    page = 0; draw();
  }

  function chooseOwner(person) {
    owner = person;
    if (person.id !== 'special') window.ModuleDirectory?.wardrobe(person);
    const unique = new Map();
    for (const choice of (person.outfits || [])) if (!unique.has(choice.path)) unique.set(choice.path, choice);
    for (const cbChoice of (chibiByOwner.get(String(person.id)) || [])) if (!unique.has(cbChoice.path)) unique.set(cbChoice.path, cbChoice);
    choices = [...unique.values()];
    document.querySelectorAll('#idolIndex button').forEach(button => button.classList.toggle('active', button.dataset.id === person.id));
    $('#modelSearch').value = ''; $('#modelType').value = ''; $('#modelRarity').value = '';
    for (const option of $('#modelRarity').options) {
      if (!option.value) continue;
      const n = choices.filter(c => rarity(c) === option.value).length;
      option.textContent = (option.value === 'other' ? '其他模型' : option.value) + ' · ' + n;
      option.disabled = !n;
    }
    selected = null; filter();
    const previous = target === 'home' ? prefs.members?.[slot]?.outfit || prefs.outfit : params.get('outfit');
    const firstPick = choices.find(c => c.key === previous) || choices[0];
    if (firstPick) pick(firstPick);
  }

  $('#modelSearch').oninput = filter; $('#modelType').onchange = filter; $('#modelRarity').onchange = filter;
  $('#previous').onclick = () => { page--; draw(); }; $('#next').onclick = () => { page++; draw(); };
  document.querySelectorAll('#wardrobeScopes button').forEach(b => b.onclick = () => { $('#modelType').value = b.dataset.scope; filter(); });
  $('#applyModel').onclick = () => applyOutfit(selected);
  $('#setCompanionChibi')?.addEventListener('click', () => applyAsCompanionChibi(selected));
  $('#openMiniStage')?.addEventListener('click', () => {
    if (!selected) return;
    const url = `mini-stage.html?idol=${encodeURIComponent(owner.id)}&chibi=${encodeURIComponent(selected.path)}`;
    if (window.parent?.__shinyShell?.navigate) window.parent.__shinyShell.navigate(url);
    else location.href = url;
  });

  Promise.all([
    (window.fetchDataset ? window.fetchDataset('/home-assets/catalog.json') : fetch('/home-assets/catalog.json').then(r => r.json())),
    (window.fetchDataset ? window.fetchDataset('/data/card-media.json') : fetch('/data/card-media.json').then(r => r.json())),
    fetch('/data/chibi-catalog.json').then(r => (r.ok ? r.json() : [])).catch(() => []),
    fetch('/data/official-extras.json').then(r => (r.ok ? r.json() : {})).catch(() => ({}))
  ]).then(async ([rows, cards, chibiRows, extras]) => {
    cardIndex = new Map(cards.map(c => [c.id, c])); window.ModuleDirectory?.setCards(cards);
    signatures = extras?.signatures || {};
    for (const g of (Array.isArray(chibiRows) ? chibiRows : [])) {
      chibiByOwner.set(String(g.id), g.outfits || []);
    }
    const allWithSpecial = [...rows];
    const specialGroup = chibiRows.find(g => g.id === 'special');
    if (specialGroup && !allWithSpecial.some(p => p.id === 'special')) {
      allWithSpecial.push({ id: 'special', name: '283 特别小人', outfits: [] });
    }

    const every = [...new Map([
      ...rows.flatMap(p => p.outfits),
      ...chibiRows.flatMap(g => g.outfits || [])
    ].map(o => [o.path, o])).values()];
    window.ModuleDirectory?.stats('wardrobe', [
      [every.length, '套衣装与模型'],
      [allWithSpecial.length, '位可选角色'],
      [every.filter(o => kind(o) === 'daily').length, '套日常衣装'],
      [every.filter(o => kind(o) === 'stage' || kind(o) === 'cb_costume').length, '套舞台/演出服']
    ]);
    if (window.ShinyNewBadges) {
      await window.ShinyNewBadges.ready;
      window.ShinyNewBadges.reconcile('models', every.map(o => o.path));
      window.ShinyNewBadges.mountClearButton(document.querySelector('.model-results .collection-heading'), 'models', () => draw());
    }
    catalog = allWithSpecial;
    for (const person of catalog) {
      const button = document.createElement('button');
      button.dataset.id = person.id;
      button.textContent = person.name;
      button.onclick = () => chooseOwner(person);
      $('#idolIndex').append(button);
    }
    const id = params.get('idol') || prefs.members?.[slot]?.idol || prefs.idol || '1';
    chooseOwner(catalog.find(p => p.id === id) || catalog[0]);
  }).catch(error => $('#modelCount').textContent = error.message);
})();
