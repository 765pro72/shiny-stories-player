/* ═══════════════════════════════════════════════════════════════════════════
   283 Virtual Live Concert Stage Runtime
   Audio-reactive spotlights · Glowstick Ocean · Synced Lyrics · Tap/Key Cheer
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const PALETTES = [
    { id: 'rainbow', name: '283 彩虹', colors: ['#38bdf8', '#f472b6', '#facc15', '#a855f7', '#10b981', '#f97316'] },
    { id: 'illumination', name: 'illumination', colors: ['#f472b6', '#38bdf8', '#facc15'] },
    { id: 'lantica', name: "L'Antica", colors: ['#a855f7', '#6366f1', '#c084fc'] },
    { id: 'houkago', name: '放课后', colors: ['#ef4444', '#f59e0b', '#0ea5e9', '#22c55e', '#f472b6'] },
    { id: 'alstroemeria', name: 'ALSTROEMERIA', colors: ['#ec4899', '#f9a8d4', '#fdf2f8'] },
    { id: 'straylight', name: 'Straylight', colors: ['#f43f5e', '#10b981', '#ec4899'] },
    { id: 'noctchill', name: 'noctchill', colors: ['#0ea5e9', '#38bdf8', '#a78bfa', '#fde047'] },
    { id: 'shhis', name: 'SHHis', colors: ['#10b981', '#dc2626', '#34d399'] },
    { id: 'cometik', name: 'CoMETIK', colors: ['#94a3b8', '#f59e0b', '#e2e8f0'] }
  ];

  const CALLS = ['＼最高ー！／', '＼283！／', '✦ Encore! ✦', '♪ Fu-Fu!! ♪', '★ 闪耀吧！★', '♥ 应援！♥', '＼もう一回！／'];

  const isLowPower = () => document.documentElement.dataset.joytrans === '1'
    || document.documentElement.dataset.kirin === '1'
    || window.innerWidth < 520;

  let overlay = null;
  let canvas = null;
  let ctx = null;
  let rafId = 0;
  let isOpen = false;
  let activePalette = PALETTES[0];
  let combo = 0;
  let W = 0, H = 0, dpr = 1;
  let t = 0;
  let cheerBoost = 0;

  const sticks = [];
  const particles = [];
  const danmaku = [];

  function initSticks() {
    sticks.length = 0;
    const low = isLowPower();
    const count = low ? 34 : Math.min(84, Math.max(46, Math.floor(W / 18)));
    for (let i = 0; i < count; i++) {
      const row = i % 2;
      sticks.push({
        xFrac: (i + 0.5) / count,
        row,
        phase: Math.random() * Math.PI * 2,
        speed: 0.85 + Math.random() * 0.35,
        len: (row === 0 ? 58 : 44) + Math.random() * 16,
        colorIdx: i
      });
    }
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, isLowPower() ? 1.25 : 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initSticks();
  }

  function spawnCheerBurst(cx, cy) {
    combo += 1;
    cheerBoost = Math.min(1.6, cheerBoost + 0.45);
    const elCombo = document.getElementById('vlsComboPill');
    if (elCombo) elCombo.textContent = `✦ 应援连击 ${combo}`;

    const cols = activePalette.colors;
    const count = isLowPower() ? 14 : 26;
    for (let i = 0; i < count; i++) {
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = 2.2 + Math.random() * 6.4;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 1.4,
        r: 2.2 + Math.random() * 3.8,
        life: 1,
        decay: 0.016 + Math.random() * 0.014,
        color: cols[i % cols.length]
      });
    }
    danmaku.push({
      text: CALLS[combo % CALLS.length],
      x: cx,
      y: cy - 12,
      vy: -1.4 - Math.random() * 0.8,
      life: 1,
      color: cols[combo % cols.length]
    });
  }

  function readMusicSnapshot() {
    const title = document.getElementById('heroSongTitle')?.textContent?.trim() || '283 Production Live';
    const artist = document.getElementById('heroSongArtists')?.textContent?.trim() || '283 Production';
    const cover = document.getElementById('albumCoverImg')?.getAttribute('src') || '/app-icon.png';
    const audio = document.querySelector('audio');
    const playing = audio ? !audio.paused : false;
    const curTime = audio ? (audio.currentTime || 0) : 0;

    // Grab current active lyric line from music.html's synced lyrics view
    let jp = '';
    let zh = '';
    const activeLine = document.querySelector('#lyricsScrollBox .lyric-line.active, #fsLyricsList .fs-lyric-line.active');
    if (activeLine) {
      jp = activeLine.querySelector('.lyric-jp, .fs-lyric-jp')?.textContent?.trim()
        || activeLine.childNodes[0]?.textContent?.trim() || '';
      zh = activeLine.querySelector('.lyric-zh, .fs-lyric-zh')?.textContent?.trim() || '';
    }
    return { title, artist, cover, playing, curTime, jp, zh };
  }

  function syncHud() {
    const snap = readMusicSnapshot();
    const bg = document.getElementById('vlsBgCover');
    const mini = document.getElementById('vlsCoverMini');
    const titleEl = document.getElementById('vlsTitle');
    const artistEl = document.getElementById('vlsArtist');
    const jpEl = document.getElementById('vlsLyricJp');
    const zhEl = document.getElementById('vlsLyricZh');
    const playBtn = document.getElementById('vlsPlayPauseBtn');

    if (bg && bg.dataset.cover !== snap.cover) {
      bg.dataset.cover = snap.cover;
      bg.style.backgroundImage = `url("${snap.cover}")`;
    }
    if (mini && mini.getAttribute('src') !== snap.cover) mini.src = snap.cover;
    if (titleEl && titleEl.textContent !== snap.title) titleEl.textContent = snap.title;
    if (artistEl && artistEl.textContent !== snap.artist) artistEl.textContent = snap.artist;
    if (jpEl) jpEl.textContent = snap.jp || (snap.playing ? '♪ 正在演出中 · 点击舞台或按空格打 Call 应援 ♪' : '点击下方播放按钮，点亮 283 虚拟 Live 舞台');
    if (zhEl) zhEl.textContent = snap.zh || '';
    if (playBtn) playBtn.textContent = snap.playing ? '⏸ 暂停' : '▶ 播放';
    return snap;
  }

  function draw() {
    if (!isOpen) return;
    rafId = requestAnimationFrame(draw);
    t += 0.016;
    cheerBoost *= 0.94;

    const snap = syncHud();
    const cols = activePalette.colors;
    const low = isLowPower();

    // Synthesize smooth audio-reactive energy synced to audio.currentTime (or real analyser if exposed)
    let energy = 0.25 + cheerBoost * 0.45;
    if (snap.playing) {
      const beatPhase = (snap.curTime * 2.1) * Math.PI * 2;
      const kick = Math.pow(Math.max(0, Math.sin(beatPhase)), 4);
      const shimmer = 0.5 + 0.5 * Math.sin(t * 3.4);
      energy = Math.min(1.5, 0.42 + kick * 0.65 + shimmer * 0.14 + cheerBoost * 0.45);
    }

    ctx.clearRect(0, 0, W, H);

    // 1. Sweeping Volumetric Stage Spotlights from top truss
    const beamCount = low ? 4 : 6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < beamCount; i++) {
      const bx = (W / (beamCount + 1)) * (i + 1);
      const sway = Math.sin(t * (0.9 + i * 0.17) + i * 1.4) * (0.38 + energy * 0.18);
      const col = cols[i % cols.length];
      const len = H * 1.08;
      const spread = W * (low ? 0.12 : 0.15);
      const endX = bx + Math.sin(sway) * len;
      const grad = ctx.createLinearGradient(bx, -20, endX, H * 0.92);
      grad.addColorStop(0, col + '55');
      grad.addColorStop(0.55, col + '18');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(bx - 12, -20);
      ctx.lineTo(bx + 12, -20);
      ctx.lineTo(endX + spread, H);
      ctx.lineTo(endX - spread, H);
      ctx.closePath();
      ctx.fill();
    }

    // 2. Center Audio-Reactive Prism Ring
    const cx = W * 0.5;
    const cy = H * 0.44;
    const baseR = Math.min(W, H) * 0.18 + energy * 22;
    const bars = low ? 32 : 64;
    for (let i = 0; i < bars; i++) {
      const ang = (Math.PI * 2 * i) / bars + t * 0.25;
      const wave = Math.abs(Math.sin(i * 0.45 + t * 4.2)) * (snap.playing ? 34 : 10) * energy;
      const x1 = cx + Math.cos(ang) * baseR;
      const y1 = cy + Math.sin(ang) * baseR;
      const x2 = cx + Math.cos(ang) * (baseR + 8 + wave);
      const y2 = cy + Math.sin(ang) * (baseR + 8 + wave);
      ctx.strokeStyle = cols[i % cols.length] + 'aa';
      ctx.lineWidth = low ? 2.2 : 2.8;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Glowstick Ocean at bottom
    const floorY = H - 72;
    for (let i = 0; i < sticks.length; i++) {
      const st = sticks[i];
      const sx = st.xFrac * W;
      const sy = floorY + (st.row === 0 ? 18 : -6);
      const swingRate = snap.playing ? 5.6 : 1.8;
      const angle = Math.sin(t * swingRate * st.speed + st.phase) * (0.48 + energy * 0.24);
      const tipX = sx + Math.sin(angle) * st.len;
      const tipY = sy - Math.cos(angle) * st.len;
      const col = cols[st.colorIdx % cols.length];

      ctx.save();
      ctx.lineCap = 'round';
      if (!low) {
        ctx.shadowColor = col;
        ctx.shadowBlur = 12 + energy * 8;
      }
      ctx.strokeStyle = col;
      ctx.lineWidth = st.row === 0 ? 6 : 4.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Bright core filament
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffffcc';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(sx + (tipX - sx) * 0.2, sy + (tipY - sy) * 0.2);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Cheering Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Floating Call-out Danmaku
    ctx.save();
    ctx.font = '800 16px "HarmonyOS Sans SC", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    for (let i = danmaku.length - 1; i >= 0; i--) {
      const d = danmaku[i];
      d.y += d.vy;
      d.life -= 0.015;
      if (d.life <= 0) { danmaku.splice(i, 1); continue; }
      ctx.globalAlpha = d.life;
      ctx.fillStyle = d.color;
      ctx.fillText(d.text, d.x, d.y);
    }
    ctx.restore();
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'virtualLiveStageOverlay';
    overlay.className = 'vls-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="vls-bg-cover" id="vlsBgCover"></div>
      <canvas id="vlsCanvas"></canvas>
      <header class="vls-top-hud">
        <div class="vls-now-playing">
          <img class="vls-cover-mini" id="vlsCoverMini" src="/app-icon.png" alt="">
          <div class="vls-meta">
            <small>283 VIRTUAL LIVE STAGE</small>
            <strong id="vlsTitle">283 Production Live</strong>
            <span id="vlsArtist">283 Production</span>
          </div>
        </div>
        <div class="vls-top-actions">
          <span class="vls-combo-pill" id="vlsComboPill">✦ 应援连击 0</span>
          <button type="button" class="vls-hud-btn" id="vlsCloseBtn">退出舞台 ×</button>
        </div>
      </header>
      <div class="vls-center-stage">
        <p class="vls-lyric-jp" id="vlsLyricJp"></p>
        <p class="vls-lyric-zh" id="vlsLyricZh"></p>
      </div>
      <footer class="vls-bottom-hud">
        <div class="vls-color-bar" id="vlsColorBar"></div>
        <div class="vls-transport-row">
          <button type="button" class="vls-hud-btn" id="vlsPrevBtn">⏮ 上一首</button>
          <button type="button" class="vls-hud-btn" id="vlsPlayPauseBtn">▶ 播放</button>
          <button type="button" class="vls-hud-btn" id="vlsNextBtn">下一首 ⏭</button>
          <button type="button" class="vls-cheer-btn" id="vlsCheerBtn">✨ 挥舞荧光棒应援 (Space)</button>
        </div>
        <div class="vls-hint">点击舞台任意处或按 Space / Z / X 触发应援光效 · ESC 退出虚拟 Live 舞台</div>
      </footer>
    `;
    document.body.appendChild(overlay);
    canvas = document.getElementById('vlsCanvas');
    ctx = canvas.getContext('2d');

    // Render unit glowstick color chips
    const bar = document.getElementById('vlsColorBar');
    for (const pal of PALETTES) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'vls-color-chip' + (pal === activePalette ? ' active' : '');
      chip.innerHTML = `<i style="background:${pal.colors[0]}"></i>${pal.name}`;
      chip.addEventListener('click', () => {
        activePalette = pal;
        bar.querySelectorAll('.vls-color-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        spawnCheerBurst(W * 0.5, H * 0.55);
      });
      bar.appendChild(chip);
    }

    canvas.addEventListener('pointerdown', e => {
      spawnCheerBurst(e.clientX, e.clientY);
    });
    document.getElementById('vlsCheerBtn')?.addEventListener('click', () => {
      spawnCheerBurst(W * (0.25 + Math.random() * 0.5), H * (0.35 + Math.random() * 0.3));
    });
    document.getElementById('vlsCloseBtn')?.addEventListener('click', closeStage);
    document.getElementById('vlsPlayPauseBtn')?.addEventListener('click', () => {
      document.getElementById('btnPlayPause')?.click();
    });
    document.getElementById('vlsPrevBtn')?.addEventListener('click', () => {
      document.getElementById('btnPrevTrack')?.click();
    });
    document.getElementById('vlsNextBtn')?.addEventListener('click', () => {
      document.getElementById('btnNextTrack')?.click();
    });

    window.addEventListener('resize', () => { if (isOpen) resize(); });
    window.addEventListener('keydown', e => {
      if (!isOpen) return;
      if (e.key === 'Escape') { closeStage(); return; }
      if (e.code === 'Space' || e.key === 'z' || e.key === 'Z' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        spawnCheerBurst(W * (0.2 + Math.random() * 0.6), H * (0.3 + Math.random() * 0.35));
      }
    });
    return overlay;
  }

  function openStage() {
    ensureOverlay();
    isOpen = true;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    resize();
    syncHud();
    spawnCheerBurst(W * 0.5, H * 0.52);
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(draw);
  }

  function closeStage() {
    isOpen = false;
    cancelAnimationFrame(rafId);
    if (overlay) {
      overlay.classList.remove('is-open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function mountTrigger() {
    const toolbar = document.querySelector('.music-icon-toolbar');
    if (!toolbar || document.getElementById('btnOpenVirtualLive')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnOpenVirtualLive';
    btn.className = 'vls-trigger-btn';
    btn.title = '进入 283 虚拟应援 Live 舞台（荧光棒海洋 + 实时打 Call）';
    btn.innerHTML = '🎤 虚拟 Live';
    btn.addEventListener('click', openStage);
    toolbar.prepend(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountTrigger);
  } else {
    mountTrigger();
  }

  window.VirtualLiveStage = { open: openStage, close: closeStage };
})();
