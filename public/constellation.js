/* ═══════════════════════════════════════════════════════════════════════════
   283 STORY CONSTELLATION ENGINE
   Interactive Prism Galaxy · Cross-Unit Bonds · Supernova Motif Resonance
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const canvas = document.getElementById('constellationCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const isJoyTrans = document.documentElement.dataset.joytrans === '1'
    || /JoyTrans|Droitong/i.test(navigator.userAgent || '');
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

  const UNIT_COLORS = [
    '#38bdf8', // illumination STARS
    '#a855f7', // L'Antica
    '#f97316', // 放课后
    '#ec4899', // ALSTROEMERIA
    '#f43f5e', // Straylight
    '#0ea5e9', // noctchill
    '#10b981', // SHHis
    '#818cf8'  // CoMETIK
  ];

  // State
  let W = window.innerWidth, H = window.innerHeight, DPR = Math.min(window.devicePixelRatio || 1, isJoyTrans ? 1.25 : 2);
  let catalog = [];
  let units = [];
  let nodes = [];       // 28 idol star nodes
  let edges = [];       // intra-unit + cross-unit story bond edges
  let pulses = [];      // traveling photon energy pulses along edges
  let ripples = [];     // supernova shockwave ripples on click / motif ignite
  let meteors = [];     // shooting stars
  let bgStars = [];     // 3-layer parallax background starfield
  let portraits = new Map();

  let autoOrbit = !isJoyTrans;
  let orbitAngle = 0;
  let activeNodeId = null;
  let activeUnitIdx = -1;
  let activeMotif = '';
  let motifHits = new Map(); // idolName -> matched stories[]
  let hoveredNode = null;

  // Smooth spring camera
  const cam = { x: 0, y: 0, zoom: 1, tx: 0, ty: 0, tzoom: 1 };

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, isJoyTrans ? 1.25 : 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Generate 3-layer twinkling starfield
  const bgCount = isJoyTrans ? 90 : (isMobile ? 160 : 260);
  for (let i = 0; i < bgCount; i++) {
    bgStars.push({
      x: (Math.random() - 0.5) * 2600,
      y: (Math.random() - 0.5) * 2000,
      r: Math.random() * 1.6 + 0.4,
      depth: Math.random() * 0.65 + 0.15,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.8 + 0.6,
      hue: [195, 220, 270, 330, 45][(Math.random() * 5) | 0]
    });
  }

  function spawnRipple(wx, wy, color, maxR = 420) {
    ripples.push({ x: wx, y: wy, r: 10, maxR, color, alpha: 0.92 });
  }

  function spawnMeteor() {
    if (isJoyTrans || meteors.length > 3) return;
    const angle = Math.PI * (0.14 + Math.random() * 0.22);
    const speed = 620 + Math.random() * 480;
    meteors.push({
      x: (Math.random() - 0.3) * W,
      y: -40 + Math.random() * (H * 0.4),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: 90 + Math.random() * 110,
      life: 1,
      color: UNIT_COLORS[(Math.random() * UNIT_COLORS.length) | 0]
    });
  }

  function worldToScreen(wx, wy) {
    const cx = (W - (W > 900 && !document.getElementById('cnInspector')?.classList.contains('is-collapsed') ? 320 : 0)) * 0.5;
    const cy = H * 0.52;
    return {
      x: (wx - cam.x) * cam.zoom + cx,
      y: (wy - cam.y) * cam.zoom + cy
    };
  }

  function screenToWorld(sx, sy) {
    const cx = (W - (W > 900 && !document.getElementById('cnInspector')?.classList.contains('is-collapsed') ? 320 : 0)) * 0.5;
    const cy = H * 0.52;
    return {
      x: (sx - cx) / cam.zoom + cam.x,
      y: (sy - cy) / cam.zoom + cam.y
    };
  }

  function getNodePos(n) {
    const cos = Math.cos(orbitAngle);
    const sin = Math.sin(orbitAngle);
    const rx = n.bx * cos - n.by * sin;
    const ry = n.bx * sin + n.by * cos;
    return { x: rx, y: ry };
  }

  // Load real 283 data: units, stories, portraits
  async function initData() {
    const [groups, cat, portRows] = await Promise.all([
      fetch('/guide-groups.json').then(r => r.json()),
      fetch('/data/catalog.json').then(r => r.json()),
      fetch('/portraits.json').then(r => r.json()).catch(() => [])
    ]);

    catalog = Array.isArray(cat) ? cat : [];

    // Preload circular portrait images
    const pIndex = new Map();
    for (const row of (portRows || [])) {
      if (!row || !row.path) continue;
      for (const k of [row.name, ...(row.aliases || [])]) {
        if (k) pIndex.set(String(k), row);
      }
    }

    const coreUnits = groups.slice(0, 8);
    units = coreUnits.map((g, uIdx) => ({
      idx: uIdx,
      icon: g[0],
      name: g[1],
      members: g[2],
      color: UNIT_COLORS[uIdx % UNIT_COLORS.length]
    }));

    // Arrange 8 unit constellations in a lush golden-ratio spiral galaxy
    const galaxyRadius = Math.min(W, H) * (isMobile ? 0.36 : 0.34);
    const storyByIdol = new Map();
    const idolsByGroup = new Map();

    for (const s of catalog) {
      if (!s.idol) continue;
      if (!storyByIdol.has(s.idol)) storyByIdol.set(s.idol, []);
      storyByIdol.get(s.idol).push(s);
      if (s.group) {
        if (!idolsByGroup.has(s.group)) idolsByGroup.set(s.group, new Set());
        idolsByGroup.get(s.group).add(s.idol);
      }
    }

    units.forEach((u, uIdx) => {
      const baseAngle = (uIdx / units.length) * Math.PI * 2 - Math.PI * 0.5;
      const ringR = galaxyRadius * (uIdx % 2 === 0 ? 0.88 : 1.16);
      const ucx = Math.cos(baseAngle) * ringR;
      const ucy = Math.sin(baseAngle) * ringR * 0.78;
      u.cx = ucx;
      u.cy = ucy;

      const count = u.members.length;
      const localR = count <= 2 ? 42 : (count === 3 ? 54 : 68);
      const unitNodeIds = [];

      u.members.forEach((member, mIdx) => {
        const a = baseAngle + (mIdx / count) * Math.PI * 2 + 0.35;
        const bx = ucx + Math.cos(a) * localR;
        const by = ucy + Math.sin(a) * localR;
        const stories = storyByIdol.get(member) || [];
        const node = {
          id: member,
          name: member,
          unitIdx: uIdx,
          unitName: u.name,
          color: u.color,
          bx, by,
          radius: 17 + Math.min(7, Math.sqrt(stories.length) * 0.45),
          stories,
          phase: Math.random() * Math.PI * 2,
          img: null
        };
        const pRow = pIndex.get(member);
        if (pRow && pRow.path) {
          const im = new Image();
          im.decoding = 'async';
          im.onload = () => { node.img = im; };
          im.src = '/asset-original/' + pRow.path;
        }
        nodes.push(node);
        unitNodeIds.push(node);
      });

      // Intra-unit constellation polygon edges
      for (let i = 0; i < unitNodeIds.length; i++) {
        const a = unitNodeIds[i];
        const b = unitNodeIds[(i + 1) % unitNodeIds.length];
        if (a !== b) edges.push({ a, b, type: 'unit', weight: 2, color: u.color, shared: [] });
      }
    });

    // Cross-unit shared story bonds (same group / event / crossover)
    const nodeByName = new Map(nodes.map(n => [n.name, n]));
    const crossPairMap = new Map();
    for (const [grp, idolSet] of idolsByGroup.entries()) {
      const arr = [...idolSet].filter(name => nodeByName.has(name));
      if (arr.length < 2 || arr.length > 10) continue;
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const nA = nodeByName.get(arr[i]);
          const nB = nodeByName.get(arr[j]);
          if (nA.unitIdx === nB.unitIdx) continue;
          const pk = nA.name < nB.name ? `${nA.name}||${nB.name}` : `${nB.name}||${nA.name}`;
          if (!crossPairMap.has(pk)) crossPairMap.set(pk, { a: nA, b: nB, shared: [] });
          crossPairMap.get(pk).shared.push(grp);
        }
      }
    }
    for (const item of crossPairMap.values()) {
      edges.push({
        a: item.a,
        b: item.b,
        type: 'cross',
        weight: Math.min(3, 0.8 + item.shared.length * 0.35),
        color: '#7dd3fc',
        shared: item.shared
      });
    }

    // Seed flowing energy photon pulses along unit edges
    const pulseCount = isJoyTrans ? 16 : 42;
    for (let i = 0; i < pulseCount; i++) {
      const e = edges[i % edges.length];
      pulses.push({
        edge: e,
        t: Math.random(),
        speed: 0.22 + Math.random() * 0.32,
        dir: Math.random() < 0.5 ? 1 : -1
      });
    }

    buildUnitLegend();
    renderOverviewInspector();
    spawnRipple(0, 0, '#38bdf8', 580);
  }

  function buildUnitLegend() {
    const host = document.getElementById('cnUnitLegend');
    if (!host) return;
    host.innerHTML = '';
    units.forEach((u, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cn-unit-pill';
      btn.style.setProperty('--u-color', u.color);
      btn.innerHTML = `<i></i><span>${u.name}</span>`;
      btn.onclick = () => focusUnit(idx);
      host.append(btn);
    });
  }

  function openStoryInGuide(storyKey) {
    const url = 'guide.html?story=' + encodeURIComponent(storyKey);
    try {
      if (window.parent && window.parent !== window && window.parent.__shinyShell?.navigate) {
        window.parent.__shinyShell.navigate(url);
        return;
      }
    } catch {}
    location.href = url;
  }

  function getWatchedSet() {
    try { return new Set(JSON.parse(localStorage.getItem('shiny.watchedStories') || '[]')); }
    catch { return new Set(); }
  }

  function renderOverviewInspector() {
    const insp = document.getElementById('cnInspector');
    insp?.classList.remove('is-collapsed');
    const avatar = document.getElementById('cnInspAvatar');
    avatar.textContent = '✦';
    document.getElementById('cnInspSub').textContent = '283 PRODUCTION · GALAXY OVERVIEW';
    document.getElementById('cnInspTitle').textContent = '283 全员星系总览';

    const watched = getWatchedSet();
    const totalDone = catalog.filter(s => watched.has(s.key)).length;
    document.getElementById('cnInspStats').innerHTML = `
      <span class="cn-stat-pill">28 位星辰偶像</span>
      <span class="cn-stat-pill">${catalog.length.toLocaleString()} 篇剧情</span>
      <span class="cn-stat-pill">${edges.filter(e => e.type === 'cross').length} 条跨组羁绊</span>
      <span class="cn-stat-pill">已观看 ${totalDone} 篇</span>
    `;
    document.getElementById('cnInspBonds').innerHTML = '';
    const storiesHost = document.getElementById('cnInspStories');
    storiesHost.innerHTML = '<p style="font-size:12.5px;color:#94a3b8;line-height:1.7;margin:6px 2px;">点击星图上的任意一位偶像星辰，即可拉近镜头点亮她的所有跨组羁绊连线；或点击上方「伏笔意象」关键词（如 翼、夏、雨、舞台），触发全星系共振检索！</p>';
  }

  function focusNode(node) {
    activeNodeId = node.id;
    activeUnitIdx = node.unitIdx;
    activeMotif = '';
    motifHits.clear();
    document.querySelectorAll('.cn-motif-chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.cn-unit-pill').forEach((p, i) => p.classList.toggle('active', i === node.unitIdx));

    const pos = getNodePos(node);
    cam.tx = pos.x;
    cam.ty = pos.y;
    cam.tzoom = 1.55;
    spawnRipple(pos.x, pos.y, node.color, 380);

    const insp = document.getElementById('cnInspector');
    insp?.classList.remove('is-collapsed');

    const avatar = document.getElementById('cnInspAvatar');
    if (node.img) {
      avatar.innerHTML = `<img src="${node.img.src}" alt="${node.name}">`;
    } else {
      avatar.textContent = node.name.slice(0, 1);
    }
    document.getElementById('cnInspSub').textContent = `${node.unitName} · CONSTELLATION NODE`;
    document.getElementById('cnInspTitle').textContent = node.name;

    const watched = getWatchedSet();
    const doneCount = node.stories.filter(s => watched.has(s.key)).length;
    const pct = node.stories.length ? Math.round((doneCount / node.stories.length) * 100) : 0;

    // Cross-unit bonded idols
    const bonded = [];
    for (const e of edges) {
      if (e.a === node) bonded.push({ other: e.b, count: e.shared.length, type: e.type });
      else if (e.b === node) bonded.push({ other: e.a, count: e.shared.length, type: e.type });
    }
    bonded.sort((x, y) => (y.type === 'cross' ? 1 : 0) - (x.type === 'cross' ? 1 : 0) || y.count - x.count);

    document.getElementById('cnInspStats').innerHTML = `
      <span class="cn-stat-pill">${node.stories.length} 篇剧情</span>
      <span class="cn-stat-pill">已看 ${doneCount} 篇 (${pct}%)</span>
      <span class="cn-stat-pill">${bonded.length} 位羁绊星辰</span>
    `;

    const bondsHost = document.getElementById('cnInspBonds');
    bondsHost.innerHTML = '';
    bonded.slice(0, 10).forEach(b => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cn-bond-chip';
      chip.textContent = b.type === 'cross' ? `✦ ${b.other.name} (${b.count})` : `• ${b.other.name}`;
      chip.onclick = () => focusNode(b.other);
      bondsHost.append(chip);
    });

    const storiesHost = document.getElementById('cnInspStories');
    storiesHost.innerHTML = '';
    node.stories.slice(0, 40).forEach(s => {
      const a = document.createElement('a');
      a.className = 'cn-story-item';
      a.href = 'guide.html?story=' + encodeURIComponent(s.key);
      a.innerHTML = `<strong>${watched.has(s.key) ? '✓ ' : ''}${s.title}</strong><small>${s.category} · ${s.group}</small>`;
      a.onclick = (e) => { e.preventDefault(); openStoryInGuide(s.key); };
      storiesHost.append(a);
    });
  }

  function focusUnit(uIdx) {
    activeNodeId = null;
    activeUnitIdx = uIdx;
    activeMotif = '';
    motifHits.clear();
    document.querySelectorAll('.cn-motif-chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.cn-unit-pill').forEach((p, i) => p.classList.toggle('active', i === uIdx));

    const u = units[uIdx];
    if (!u) return;
    const cos = Math.cos(orbitAngle), sin = Math.sin(orbitAngle);
    const rx = u.cx * cos - u.cy * sin;
    const ry = u.cx * sin + u.cy * cos;
    cam.tx = rx;
    cam.ty = ry;
    cam.tzoom = 1.4;
    spawnRipple(rx, ry, u.color, 420);

    const unitNodes = nodes.filter(n => n.unitIdx === uIdx);
    const insp = document.getElementById('cnInspector');
    insp?.classList.remove('is-collapsed');
    document.getElementById('cnInspAvatar').textContent = u.icon || '✦';
    document.getElementById('cnInspSub').textContent = 'UNIT CONSTELLATION';
    document.getElementById('cnInspTitle').textContent = u.name;
    const allStories = unitNodes.flatMap(n => n.stories);
    document.getElementById('cnInspStats').innerHTML = `
      <span class="cn-stat-pill">${unitNodes.length} 位成员</span>
      <span class="cn-stat-pill">${allStories.length} 篇剧情</span>
    `;
    const bondsHost = document.getElementById('cnInspBonds');
    bondsHost.innerHTML = '';
    unitNodes.forEach(n => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cn-bond-chip';
      chip.textContent = `✦ ${n.name}`;
      chip.onclick = () => focusNode(n);
      bondsHost.append(chip);
    });
    const storiesHost = document.getElementById('cnInspStories');
    storiesHost.innerHTML = '';
    allStories.slice(0, 36).forEach(s => {
      const a = document.createElement('a');
      a.className = 'cn-story-item';
      a.href = 'guide.html?story=' + encodeURIComponent(s.key);
      a.innerHTML = `<strong>${s.title}</strong><small>${s.idol} · ${s.group}</small>`;
      a.onclick = (e) => { e.preventDefault(); openStoryInGuide(s.key); };
      storiesHost.append(a);
    });
  }

  function igniteMotif(keyword) {
    const q = String(keyword || '').trim().toLowerCase();
    if (!q) { resetView(); return; }
    activeMotif = q;
    activeNodeId = null;
    activeUnitIdx = -1;
    motifHits.clear();

    const matchedStories = [];
    for (const s of catalog) {
      const hay = `${s.title || ''} ${s.group || ''} ${s.description || ''}`.toLowerCase();
      if (hay.includes(q)) {
        matchedStories.push(s);
        if (s.idol) {
          if (!motifHits.has(s.idol)) motifHits.set(s.idol, []);
          motifHits.get(s.idol).push(s);
        }
      }
    }

    cam.tx = 0; cam.ty = 0; cam.tzoom = 0.96;
    spawnRipple(0, 0, '#f472b6', 760);
    spawnRipple(0, 0, '#38bdf8', 540);

    document.querySelectorAll('.cn-motif-chip').forEach(c => c.classList.toggle('active', c.dataset.motif === keyword));
    document.querySelectorAll('.cn-unit-pill').forEach(p => p.classList.remove('active'));

    const insp = document.getElementById('cnInspector');
    insp?.classList.remove('is-collapsed');
    document.getElementById('cnInspAvatar').textContent = '★';
    document.getElementById('cnInspSub').textContent = 'FORESHADOWING RESONANCE';
    document.getElementById('cnInspTitle').textContent = `伏笔意象「${keyword}」`;
    document.getElementById('cnInspStats').innerHTML = `
      <span class="cn-stat-pill">共鸣偶像 ${motifHits.size} 位</span>
      <span class="cn-stat-pill">关联剧情 ${matchedStories.length} 篇</span>
    `;

    const bondsHost = document.getElementById('cnInspBonds');
    bondsHost.innerHTML = '';
    const nodeByName = new Map(nodes.map(n => [n.name, n]));
    [...motifHits.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 12)
      .forEach(([idol, list]) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cn-bond-chip';
        chip.textContent = `${idol} (${list.length})`;
        chip.onclick = () => { const n = nodeByName.get(idol); if (n) focusNode(n); };
        bondsHost.append(chip);
      });

    const storiesHost = document.getElementById('cnInspStories');
    storiesHost.innerHTML = '';
    matchedStories.slice(0, 50).forEach(s => {
      const a = document.createElement('a');
      a.className = 'cn-story-item';
      a.href = 'guide.html?story=' + encodeURIComponent(s.key);
      a.innerHTML = `<strong>${s.title}</strong><small>${s.idol} · ${s.category} · ${s.group}</small>`;
      a.onclick = (e) => { e.preventDefault(); openStoryInGuide(s.key); };
      storiesHost.append(a);
    });
  }

  function resetView() {
    activeNodeId = null;
    activeUnitIdx = -1;
    activeMotif = '';
    motifHits.clear();
    cam.tx = 0; cam.ty = 0; cam.tzoom = 1;
    document.querySelectorAll('.cn-motif-chip, .cn-unit-pill').forEach(el => el.classList.remove('active'));
    renderOverviewInspector();
    spawnRipple(0, 0, '#38bdf8', 500);
  }

  // Bind HUD controls
  document.getElementById('cnResetView')?.addEventListener('click', resetView);
  document.getElementById('cnInspClose')?.addEventListener('click', () => {
    document.getElementById('cnInspector')?.classList.add('is-collapsed');
  });
  document.getElementById('cnAutoOrbit')?.addEventListener('click', (e) => {
    autoOrbit = !autoOrbit;
    e.currentTarget.classList.toggle('active', autoOrbit);
    e.currentTarget.textContent = autoOrbit ? '✦ 星系公转：开' : '✦ 星系公转：关';
  });
  document.querySelectorAll('.cn-motif-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = btn.dataset.motif;
      document.getElementById('cnKeywordInput').value = m;
      igniteMotif(m);
    });
  });
  const doSearch = () => igniteMotif(document.getElementById('cnKeywordInput')?.value || '');
  document.getElementById('cnSearchBtn')?.addEventListener('click', doSearch);
  document.getElementById('cnKeywordInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
  document.getElementById('cnBackBtn')?.addEventListener('click', (e) => {
    try {
      if (window.parent && window.parent !== window && window.parent.__shinyShell?.navigate) {
        e.preventDefault();
        window.parent.__shinyShell.navigate('guide.html');
      }
    } catch {}
  });

  // Pointer Pan / Zoom / Hit-Test
  let dragging = false, dragMoved = false, lastX = 0, lastY = 0;

  function hitTest(sx, sy) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const p = getNodePos(n);
      const sp = worldToScreen(p.x, p.y);
      const hitR = (n.radius + 7) * cam.zoom;
      const dx = sx - sp.x, dy = sy - sp.y;
      if (dx * dx + dy * dy <= hitR * hitR) return n;
    }
    return null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragMoved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.classList.add('is-dragging');
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });

  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
      cam.tx -= dx / cam.zoom;
      cam.ty -= dy / cam.zoom;
      cam.x = cam.tx;
      cam.y = cam.ty;
      return;
    }
    const h = hitTest(e.clientX, e.clientY);
    hoveredNode = h;
    canvas.classList.toggle('is-hovering', !!h);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('is-dragging');
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    if (!dragMoved) {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) focusNode(hit);
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    cam.tzoom = Math.max(0.45, Math.min(2.6, cam.tzoom * factor));
  }, { passive: false });

  // Main 60/120fps Render Loop
  let lastTime = performance.now();
  let meteorTimer = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { lastTime = now; return; }
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // Smooth camera spring lerp
    cam.x += (cam.tx - cam.x) * 0.1;
    cam.y += (cam.ty - cam.y) * 0.1;
    cam.zoom += (cam.tzoom - cam.zoom) * 0.1;

    if (autoOrbit && !activeNodeId && activeUnitIdx < 0) {
      orbitAngle += dt * 0.045;
    }

    meteorTimer += dt;
    if (meteorTimer > 3.2) {
      meteorTimer = 0;
      if (Math.random() < 0.65) spawnMeteor();
    }

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // 1. Deep Nebula Background
    const bg = ctx.createRadialGradient(W * 0.45, H * 0.5, 40, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
    bg.addColorStop(0, '#0e172f');
    bg.addColorStop(0.55, '#070b18');
    bg.addColorStop(1, '#02040a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 2. Parallax Twinkling Starfield
    for (const s of bgStars) {
      const sx = ((s.x - cam.x * s.depth) * (0.65 + cam.zoom * 0.35) + W * 0.5);
      const sy = ((s.y - cam.y * s.depth) * (0.65 + cam.zoom * 0.35) + H * 0.5);
      if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
      const tw = 0.45 + 0.55 * Math.sin(now * 0.001 * s.speed + s.phase);
      ctx.fillStyle = `hsla(${s.hue}, 85%, 86%, ${(tw * 0.72).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Shooting Meteors
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt * 0.9;
      if (m.life <= 0) { meteors.splice(i, 1); continue; }
      const mag = Math.hypot(m.vx, m.vy) || 1;
      const tx = m.x - (m.vx / mag) * m.len;
      const ty = m.y - (m.vy / mag) * m.len;
      const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
      grad.addColorStop(0, `rgba(255,255,255,${m.life.toFixed(2)})`);
      grad.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    // 4. Supernova Shockwave Ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += dt * 480;
      rp.alpha *= Math.pow(0.08, dt);
      if (rp.r >= rp.maxR || rp.alpha < 0.02) { ripples.splice(i, 1); continue; }
      const sp = worldToScreen(rp.x, rp.y);
      ctx.save();
      ctx.strokeStyle = rp.color;
      ctx.globalAlpha = rp.alpha;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, rp.r * cam.zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Unit Nebula Halos
    const cos = Math.cos(orbitAngle), sin = Math.sin(orbitAngle);
    for (const u of units) {
      const ux = u.cx * cos - u.cy * sin;
      const uy = u.cx * sin + u.cy * cos;
      const sp = worldToScreen(ux, uy);
      const rad = 115 * cam.zoom;
      const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rad);
      const boost = (activeUnitIdx === u.idx) ? 0.24 : 0.1;
      g.addColorStop(0, u.color + Math.round(boost * 255).toString(16).padStart(2, '0'));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Constellation Bond Edges
    for (const e of edges) {
      const isFocusedEdge = activeNodeId
        ? (e.a.id === activeNodeId || e.b.id === activeNodeId)
        : (activeMotif
          ? (motifHits.has(e.a.name) && motifHits.has(e.b.name))
          : (activeUnitIdx >= 0 ? (e.a.unitIdx === activeUnitIdx && e.b.unitIdx === activeUnitIdx) : (e.type === 'unit')));

      if (e.type === 'cross' && !isFocusedEdge) continue;

      const pa = worldToScreen(getNodePos(e.a).x, getNodePos(e.a).y);
      const pb = worldToScreen(getNodePos(e.b).x, getNodePos(e.b).y);
      ctx.save();
      ctx.strokeStyle = isFocusedEdge ? (e.type === 'cross' ? '#7dd3fc' : e.color) : 'rgba(148,163,184,0.16)';
      ctx.globalAlpha = isFocusedEdge ? (e.type === 'cross' ? 0.72 : 0.65) : 0.22;
      ctx.lineWidth = (isFocusedEdge ? 2.1 : 1.1) * Math.min(1.4, cam.zoom);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
      ctx.restore();
    }

    // 7. Flowing Photon Energy Pulses along Active Edges
    for (const p of pulses) {
      p.t += dt * p.speed * p.dir;
      if (p.t > 1) p.t = 0;
      if (p.t < 0) p.t = 1;
      const e = p.edge;
      const show = activeNodeId
        ? (e.a.id === activeNodeId || e.b.id === activeNodeId)
        : (e.type === 'unit');
      if (!show) continue;
      const wa = getNodePos(e.a), wb = getNodePos(e.b);
      const wx = wa.x + (wb.x - wa.x) * p.t;
      const wy = wa.y + (wb.y - wa.y) * p.t;
      const sp = worldToScreen(wx, wy);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = e.color;
      ctx.shadowBlur = isJoyTrans ? 0 : 12;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2.6 * Math.min(1.5, cam.zoom), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. 28 Idol Star Nodes (Portrait + Plasma Corona + Label)
    for (const n of nodes) {
      const wp = getNodePos(n);
      const sp = worldToScreen(wp.x, wp.y);
      const r = n.radius * cam.zoom;
      if (sp.x < -r * 2 || sp.x > W + r * 2 || sp.y < -r * 2 || sp.y > H + r * 2) continue;

      const isSelected = activeNodeId === n.id;
      const isMotifHit = activeMotif && motifHits.has(n.name);
      const isConnected = activeNodeId && edges.some(e => (e.a.id === activeNodeId && e.b.id === n.id) || (e.b.id === activeNodeId && e.a.id === n.id));
      const isUnitMatch = activeUnitIdx >= 0 && n.unitIdx === activeUnitIdx;
      const dimmed = (activeNodeId && !isSelected && !isConnected)
        || (activeMotif && !isMotifHit)
        || (activeUnitIdx >= 0 && !activeNodeId && !isUnitMatch);
      const isHover = hoveredNode === n;

      const pulse = 1 + 0.08 * Math.sin(now * 0.003 + n.phase);
      ctx.save();
      ctx.globalAlpha = dimmed ? 0.24 : 1;

      // Outer plasma halo
      const haloR = r * (isSelected || isMotifHit || isHover ? 2.15 : 1.55) * pulse;
      const hg = ctx.createRadialGradient(sp.x, sp.y, r * 0.6, sp.x, sp.y, haloR);
      hg.addColorStop(0, n.color + '88');
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Circular clipped portrait
      ctx.save();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(sp.x - r, sp.y - r, r * 2, r * 2);
      if (n.img) {
        ctx.drawImage(n.img, sp.x - r, sp.y - r, r * 2, r * 2);
      }
      ctx.restore();

      // Glowing star border ring
      ctx.strokeStyle = (isSelected || isHover || isMotifHit) ? '#ffffff' : n.color;
      ctx.lineWidth = (isSelected || isHover || isMotifHit) ? 2.8 : 1.8;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Name label
      if (!dimmed || isHover) {
        ctx.font = `700 ${Math.max(10, Math.round(11.5 * Math.min(1.25, cam.zoom)))}px "Segoe UI", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(n.name, sp.x, sp.y + r + 14);
        if (isMotifHit) {
          ctx.fillStyle = '#f472b6';
          ctx.fillText(`★ ${motifHits.get(n.name).length} 篇`, sp.x, sp.y + r + 28);
        }
      }

      ctx.restore();
    }
  }

  if (window.innerWidth <= 900) elInspector?.classList.add('is-collapsed');
  initData().then(() => requestAnimationFrame(frame));
})();
