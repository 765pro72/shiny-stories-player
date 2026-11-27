(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const isConstrained = document.documentElement.dataset.joytrans === '1'
    || document.documentElement.dataset.android === '1'
    || document.documentElement.dataset.mobile === '1';

  const UNIT_PRESETS = [
    { name: 'illumination STARS', ids: ['1', '2', '3'] },
    { name: "L'Antica", ids: ['4', '5', '6', '7', '8'] },
    { name: '放课后 Climax Girls', ids: ['9', '10', '11', '12', '13'] },
    { name: 'ALSTROEMERIA', ids: ['14', '15', '16'] },
    { name: 'Straylight', ids: ['17', '18', '19'] },
    { name: 'noctchill', ids: ['20', '21', '22', '23'] },
    { name: 'SHHis', ids: ['24', '25'] },
    { name: 'CoMETIK', ids: ['26', '27', '28'] }
  ];

  const LESSON_ANIMS = {
    wait: ['wait', 'wait_01', 'talk_wait'],
    vocal: ['vocal_wait', 'vocal_ok', 'live_dance_01'],
    dance: ['dance_wait', 'dance_ok', 'live_dance_01'],
    visual: ['visual_wait', 'visual_ok', 'live_dance_02'],
    talk: ['talk_wait', 'talk_ok', 'talk_wait_01'],
    radio: ['radio_wait', 'radio_ok', 'talk_ok'],
    photo: ['photo_wait', 'photo_ok', 'photo_ok_01'],
    tea: ['sales_tea', 'pr', 'sleep', 'wait']
  };

  const LIVE_ANIMS = {
    startup: ['live_startup_01', 'setin', 'wait'],
    dance1: ['live_dance_01', 'dance_ok', 'wait'],
    dance2: ['live_dance_02', 'dance_wait', 'wait'],
    dance4: ['live_dance_04', 'live_dance_01', 'wait'],
    appeal: ['appeal', 'photo_ok_01', 'ok'],
    skill: ['skill', 'kiai', 'jump'],
    kiai: ['kiai', 'appeal', 'ok'],
    win: ['win', 'ok', 'jump']
  };

  const DEFAULT_REHEARSAL_BG = 'images/event/bg/00014.jpg';
  const DEFAULT_LIVE_BG = 'images/event/bg/00015.jpg';

  let chibiCatalog = [];
  let backgrounds = [];
  let customBgPath = '';
  let stageMode = 'rehearsal'; // 'rehearsal' | 'live'
  let squadCount = 5;
  let currentLesson = 'wait';
  let currentLive = 'dance1';
  let slots = []; // [{ ownerId, path }]
  let pixiApp = null;
  let stoolLayer = null;
  let spineLayer = null;
  const slotInstances = new Array(5).fill(null); // [{ spine, stool, anims, currentAnim, bounds }]
  let slotTokens = [0, 0, 0, 0, 0];

  const elHost = $('#msPixiHost');
  const elStatus = $('#msStageStatus');
  const elStageCard = $('#msStageCard');
  const elStageBg = $('#msStageBg');
  const elCountSel = $('#msCountSelect');
  const elSlotsGrid = $('#msSlotsGrid');

  function applyStageBackground() {
    if (!elStageBg) return;
    const bgPath = customBgPath || (stageMode === 'live' ? DEFAULT_LIVE_BG : DEFAULT_REHEARSAL_BG);
    elStageBg.style.backgroundImage = `url('/asset-original/${bgPath}')`;
  }

  function drawStudioStool(g, cx, footY, visH) {
    if (!g) return;
    g.clear();
    const w = Math.max(visH * 0.36, 38);
    const seatY = footY - visH * 0.27;
    const padH = Math.max(7, visH * 0.065);
    const rimH = Math.max(3.5, visH * 0.032);
    const legTopY = seatY + padH * 0.6;
    const legSpreadTop = w * 0.32;
    const legSpreadBot = w * 0.41;
    const legW = Math.max(3, w * 0.09);

    g.beginFill(0x0f172a, 0.24);
    g.drawEllipse(cx, footY + 2, w * 0.54, Math.max(3.5, padH * 0.45));
    g.endFill();

    g.lineStyle(legW, 0x8b5a2b, 1);
    g.moveTo(cx - legSpreadTop, legTopY);
    g.lineTo(cx - legSpreadBot, footY);
    g.moveTo(cx + legSpreadTop, legTopY);
    g.lineTo(cx + legSpreadBot, footY);
    g.lineStyle(Math.max(2, legW * 0.72), 0xa47148, 0.95);
    const braceY = legTopY + (footY - legTopY) * 0.56;
    const braceHalf = legSpreadTop + (legSpreadBot - legSpreadTop) * 0.56;
    g.moveTo(cx - braceHalf, braceY);
    g.lineTo(cx + braceHalf, braceY);

    g.lineStyle(0);
    g.beginFill(0x9c6644, 1);
    g.drawRoundedRect(cx - w * 0.48, seatY + padH * 0.45, w * 0.96, rimH + 3, 4);
    g.endFill();

    g.beginFill(0xfaf4e8, 1);
    g.lineStyle(1.3, 0xd4a373, 0.85);
    g.drawRoundedRect(cx - w * 0.5, seatY, w, padH, Math.min(8, padH * 0.5));
    g.endFill();
    g.lineStyle(0);
    g.beginFill(0xffffff, 0.65);
    g.drawRoundedRect(cx - w * 0.4, seatY + 2, w * 0.8, Math.max(2, padH * 0.3), 3);
    g.endFill();
  }

  function ensurePixiApp() {
    if (pixiApp) return pixiApp;
    const w = Math.max(640, elHost?.clientWidth || 960);
    const h = Math.max(260, elHost?.clientHeight || 360);
    pixiApp = new PIXI.Application({
      width: w,
      height: h,
      backgroundAlpha: 0,
      antialias: !isConstrained,
      resolution: isConstrained ? 1.25 : Math.min(2, window.devicePixelRatio || 1.5),
      autoDensity: true
    });
    if (isConstrained) pixiApp.ticker.maxFPS = 30;
    stoolLayer = new PIXI.Container();
    spineLayer = new PIXI.Container();
    pixiApp.stage.addChild(stoolLayer, spineLayer);
    elHost?.replaceChildren(pixiApp.view);
    window.addEventListener('resize', layoutAllSpines, { passive: true });
    window.addEventListener('pagehide', () => {
      try { pixiApp?.destroy(true, { children: true, texture: false, baseTexture: false }); } catch {}
      pixiApp = null;
      stoolLayer = null;
      spineLayer = null;
    });
    return pixiApp;
  }

  function pickBestPathForOwner(ownerId, preferStage) {
    const grp = chibiCatalog.find(g => String(g.id) === String(ownerId)) || chibiCatalog[0];
    if (!grp || !grp.outfits?.length) return '';
    if (preferStage) {
      const st = grp.outfits.find(o => o.kind === 'cb_costume') || grp.outfits[0];
      return st.path;
    }
    const base = grp.outfits.find(o => o.subKind === 'char_cb' && o.kind === 'cb')
      || grp.outfits.find(o => o.kind === 'cb')
      || grp.outfits[0];
    return base?.path || '';
  }

  function playOnSlot(idx, candidates, loop = true, fallbackLoopCandidates = null) {
    const inst = slotInstances[idx];
    if (!inst || !inst.spine || !inst.anims?.length) return;
    const hit = candidates.find(n => inst.anims.includes(n)) || inst.anims[0];
    if (!hit) return;
    try {
      inst.spine.state.setAnimation(0, hit, loop);
      inst.currentAnim = hit;
      if (inst.stool) inst.stool.visible = inst.spine.visible && (hit === 'sales_tea');
      if (!loop && fallbackLoopCandidates) {
        const back = fallbackLoopCandidates.find(n => inst.anims.includes(n)) || inst.anims[0];
        if (back) inst.spine.state.addAnimation(0, back, true, 0);
      }
    } catch {}
  }

  function playAll(candidates, loop = true, fallbackLoop = null) {
    for (let i = 0; i < squadCount; i++) {
      playOnSlot(i, candidates, loop, fallbackLoop);
    }
  }

  function layoutAllSpines() {
    if (!pixiApp || !elHost) return;
    const w = Math.max(480, elHost.clientWidth || 960);
    const h = Math.max(240, elHost.clientHeight || 360);
    if (pixiApp.renderer.width !== w || pixiApp.renderer.height !== h) {
      pixiApp.renderer.resize(w, h);
    }
    const activeCount = Math.max(1, squadCount);
    const slotW = w / activeCount;
    for (let i = 0; i < 5; i++) {
      const inst = slotInstances[i];
      if (!inst || !inst.spine) continue;
      inst.spine.visible = i < squadCount;
      if (i >= squadCount) {
        if (inst.stool) inst.stool.visible = false;
        continue;
      }
      const b = inst.bounds;
      const maxH = h * 0.72;
      const maxW = Math.min(slotW * 0.85, 220);
      const scale = Math.min(maxW / b.w, maxH / b.h);
      inst.spine.scale.set(scale);
      const cx = slotW * (i + 0.5);
      const baseY = h * 0.9;
      inst.spine.position.set(cx - (b.x + b.w / 2) * scale, baseY - (b.y + b.h) * scale);
      if (inst.stool) {
        drawStudioStool(inst.stool, cx, baseY, b.h * scale);
        inst.stool.visible = (inst.currentAnim === 'sales_tea');
      }
    }
  }

  function loadSlotSpine(idx) {
    const app = ensurePixiApp();
    const slot = slots[idx];
    if (!slot || !slot.path) return;
    const token = ++slotTokens[idx];

    if (slotInstances[idx]?.spine) {
      try {
        spineLayer?.removeChild(slotInstances[idx].spine);
        slotInstances[idx].spine.destroy({ children: true, texture: false, baseTexture: false });
      } catch {}
      try {
        if (slotInstances[idx].stool) {
          stoolLayer?.removeChild(slotInstances[idx].stool);
          slotInstances[idx].stool.destroy();
        }
      } catch {}
      slotInstances[idx] = null;
    }

    const loader = new PIXI.Loader();
    loader.add(`s_${idx}_${token}`, '/asset-original/' + slot.path).load((l, res) => {
      if (token !== slotTokens[idx]) return;
      const data = res[`s_${idx}_${token}`]?.spineData;
      if (!data) return;
      const spine = new PIXI.spine.Spine(data);
      try { spine.skeleton.setSkinByName('normal'); } catch {
        if (spine.spineData.skins.some(s => s.name === 'default')) spine.skeleton.setSkinByName('default');
      }
      spine.skeleton.setToSetupPose();
      spine.stateData.defaultMix = 0.22;
      const anims = (spine.spineData.animations || []).map(a => a.name);
      const firstCands = stageMode === 'live' ? (LIVE_ANIMS[currentLive] || LIVE_ANIMS.dance1) : (LESSON_ANIMS[currentLesson] || LESSON_ANIMS.wait);
      const first = firstCands.find(n => anims.includes(n)) || anims[0];
      if (first) spine.state.setAnimation(0, first, true);
      try { spine.update(0.016); } catch {}
      const b = spine.getLocalBounds();
      const stool = new PIXI.Graphics();
      stool.visible = (first === 'sales_tea');
      stoolLayer?.addChild(stool);
      spineLayer?.addChild(spine);
      slotInstances[idx] = {
        spine,
        stool,
        anims,
        currentAnim: first || '',
        bounds: { x: b.x, y: b.y, w: Math.max(40, b.width || 160), h: Math.max(40, b.height || 200) }
      };
      layoutAllSpines();
      if (elStatus) elStatus.textContent = `${stageMode === 'live' ? '5人 LIVE 舞台' : '培育排练室'} · 已加载 ${squadCount} 位小偶像`;
    });
  }

  function renderSlotCards() {
    if (!elSlotsGrid) return;
    elSlotsGrid.replaceChildren();
    for (let i = 0; i < squadCount; i++) {
      const slot = slots[i];
      const grp = chibiCatalog.find(g => String(g.id) === String(slot.ownerId)) || chibiCatalog[0];
      const card = document.createElement('div');
      card.className = 'ms-slot-card';
      const title = document.createElement('strong');
      title.textContent = `席位 ${i + 1}`;
      const selOwner = document.createElement('select');
      for (const g of chibiCatalog) {
        selOwner.append(new Option(g.name, g.id, false, String(g.id) === String(slot.ownerId)));
      }
      const selOutfit = document.createElement('select');
      const fillOutfits = () => {
        const curGrp = chibiCatalog.find(g => String(g.id) === String(slot.ownerId)) || chibiCatalog[0];
        selOutfit.replaceChildren();
        for (const o of (curGrp?.outfits || []).slice(0, 80)) {
          selOutfit.append(new Option(o.label, o.path, false, o.path === slot.path));
        }
      };
      fillOutfits();
      selOwner.onchange = () => {
        slot.ownerId = selOwner.value;
        slot.path = pickBestPathForOwner(slot.ownerId, stageMode === 'live');
        fillOutfits();
        loadSlotSpine(i);
      };
      selOutfit.onchange = () => {
        slot.path = selOutfit.value;
        loadSlotSpine(i);
      };
      card.append(title, selOwner, selOutfit);
      elSlotsGrid.append(card);
    }
  }

  function applySquadIds(ids) {
    squadCount = Math.max(1, Math.min(5, ids.length));
    if (elCountSel) elCountSel.value = String(squadCount);
    for (let i = 0; i < 5; i++) {
      const ownerId = ids[i] || slots[i]?.ownerId || String((i % 28) + 1);
      slots[i] = {
        ownerId,
        path: pickBestPathForOwner(ownerId, stageMode === 'live')
      };
    }
    renderSlotCards();
    for (let i = 0; i < squadCount; i++) loadSlotSpine(i);
    layoutAllSpines();
  }

  function switchStageMode(nextMode) {
    stageMode = nextMode === 'live' ? 'live' : 'rehearsal';
    document.querySelectorAll('.ms-tab').forEach(b => {
      const active = b.dataset.stageMode === stageMode;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    $('#msRehearsalCtrls').hidden = stageMode !== 'rehearsal';
    $('#msLiveCtrls').hidden = stageMode !== 'live';
    elStageCard?.classList.toggle('is-live', stageMode === 'live');

    // Auto switch outfits toward stage costumes in LIVE mode or casual in Rehearsal mode
    for (let i = 0; i < squadCount; i++) {
      const nextP = pickBestPathForOwner(slots[i].ownerId, stageMode === 'live');
      if (nextP && nextP !== slots[i].path) {
        slots[i].path = nextP;
        loadSlotSpine(i);
      } else {
        const cands = stageMode === 'live' ? LIVE_ANIMS[currentLive] : LESSON_ANIMS[currentLesson];
        playOnSlot(i, cands, true);
      }
    }
    renderSlotCards();
    applyStageBackground();
  }

  // Wire controls
  document.querySelectorAll('.ms-tab').forEach(btn => {
    btn.onclick = () => switchStageMode(btn.dataset.stageMode);
  });

  elCountSel?.addEventListener('change', () => {
    squadCount = Math.max(1, Math.min(5, Number(elCountSel.value) || 5));
    renderSlotCards();
    for (let i = 0; i < squadCount; i++) {
      if (!slotInstances[i]) loadSlotSpine(i);
    }
    layoutAllSpines();
  });

  $('#btnMsRandomSquad')?.addEventListener('click', () => {
    const pool = chibiCatalog.filter(g => /^\d+$/.test(String(g.id)) && Number(g.id) <= 28);
    const shuffled = pool.slice().sort(() => Math.random() - 0.5).slice(0, squadCount);
    applySquadIds(shuffled.map(g => g.id));
  });

  document.querySelectorAll('[data-lesson]').forEach(btn => {
    btn.onclick = () => {
      currentLesson = btn.dataset.lesson;
      document.querySelectorAll('[data-lesson]').forEach(x => x.classList.toggle('active', x === btn));
      playAll(LESSON_ANIMS[currentLesson] || LESSON_ANIMS.wait, true);
    };
  });

  document.querySelectorAll('[data-react]').forEach(btn => {
    btn.onclick = () => {
      const r = btn.dataset.react;
      const base = LESSON_ANIMS[currentLesson] || LESSON_ANIMS.wait;
      if (r === 'ok') {
        const map = { vocal: 'vocal_ok', dance: 'dance_ok', visual: 'visual_ok', talk: 'talk_ok', radio: 'radio_ok', photo: 'photo_ok' };
        playAll([map[currentLesson] || 'ok', 'ok', 'win'], false, base);
      } else if (r === 'ng') {
        const map = { vocal: 'vocal_ng', dance: 'dance_ng', visual: 'visual_ng', talk: 'talk_ng', radio: 'radio_ng', photo: 'photo_ng' };
        playAll([map[currentLesson] || 'ng', 'ng', 'sad'], false, base);
      } else {
        playAll(['touch', 'jump', 'ok'], false, base);
      }
    };
  });

  document.querySelectorAll('[data-live]').forEach(btn => {
    btn.onclick = () => {
      currentLive = btn.dataset.live;
      document.querySelectorAll('[data-live]').forEach(x => x.classList.toggle('active', x === btn));
      const oneShot = ['startup', 'appeal', 'skill', 'kiai', 'win'].includes(currentLive);
      playAll(LIVE_ANIMS[currentLive] || LIVE_ANIMS.dance1, !oneShot, oneShot ? LIVE_ANIMS.dance1 : null);
    };
  });

  const elPresets = $('#msUnitPresets');
  for (const u of UNIT_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ms-act-btn';
    b.textContent = u.name;
    b.onclick = () => applySquadIds(u.ids);
    elPresets?.append(b);
  }

  // Official 215+ Background Picker
  const bgDlg = $('#msBgDialog');
  $('#btnMsBgPicker')?.addEventListener('click', () => {
    const grid = $('#msBgGrid');
    if (grid && !grid.children.length) {
      for (const b of backgrounds) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ms-bg-item';
        btn.innerHTML = `<img src="/asset-original/${b.thumb}" loading="lazy" alt=""><span>场景 #${b.id}</span>`;
        btn.onclick = () => {
          customBgPath = b.bg;
          applyStageBackground();
          bgDlg?.close();
        };
        grid.append(btn);
      }
    }
    bgDlg?.showModal();
  });
  $('#btnMsBgClose')?.addEventListener('click', () => bgDlg?.close());
  $('#btnMsBgReset')?.addEventListener('click', () => {
    customBgPath = '';
    applyStageBackground();
    bgDlg?.close();
  });

  Promise.all([
    fetch('/data/chibi-catalog.json').then(r => r.json()),
    fetch('/data/official-extras.json').then(r => (r.ok ? r.json() : {})).catch(() => ({}))
  ]).then(([rows, extras]) => {
    chibiCatalog = Array.isArray(rows) ? rows : [];
    backgrounds = Array.isArray(extras?.backgrounds) ? extras.backgrounds : [];

    // Default squad: illumination STARS (1,2,3) + Nichika (24) + Madoka (21), or respect URL params ?idol=...&chibi=...
    const qIdol = params.get('idol');
    const qChibi = params.get('chibi');
    const initialIds = ['1', '2', '3', '24', '21'];
    if (qIdol && chibiCatalog.some(g => String(g.id) === String(qIdol))) {
      initialIds[0] = String(qIdol);
    }
    for (let i = 0; i < 5; i++) {
      slots[i] = {
        ownerId: initialIds[i],
        path: (i === 0 && qChibi) ? qChibi : pickBestPathForOwner(initialIds[i], false)
      };
    }
    renderSlotCards();
    for (let i = 0; i < squadCount; i++) loadSlotSpine(i);
    applyStageBackground();
  }).catch(e => {
    if (elStatus) elStatus.textContent = '加载小人目录失败：' + e.message;
  });
})();
