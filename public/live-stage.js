/* ═══════════════════════════════════════════════════════════════════════════
   283PRISM LIVE STAGE ENGINE — 60fps Volumetric Concert Spotlights,
   Penlight Bokeh & Prism Stars, Click Star-Bursts, 3D SSR Holographic Foil
   Card Tilt, Parallax & Kinetic Reveal Choreography
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  // Skip story viewer iframe so official dialogue playback stays 100% pure
  if (location.pathname.includes('/player/')) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;

  const isHomePage = document.body?.classList.contains('page-home');
  const isShellHost = document.body?.classList.contains('shell-host') || location.pathname.endsWith('shell.html');

  // Detect Android, Huawei HarmonyOS, Kirin/Maleoon GPU & JoyTrans (卓易通) for hardware-aware tuning
  const runtimeProfile = (() => {
    const ua = navigator.userAgent || '';
    let isAndroid = /ShinyStoriesAndroid|Android/i.test(ua);
    let isJoyTrans = /JoyTrans|Droitong|HarmonyOS|HUAWEI|HONOR/i.test(ua);
    let isHarmony = /HarmonyOS|OHOS/i.test(ua);
    let isKirin = /KirinSoC|Kirin|HiSilicon|Maleoon/i.test(ua);
    let isTablet = /TabletDevice/i.test(ua);
    let isMobile = isAndroid || isJoyTrans || isHarmony || isKirin || /iPhone|iPad|iPod|Mobile/i.test(ua);
    try {
      const bridge = window.ShinyAndroid || window.parent?.ShinyAndroid;
      if (bridge?.getRuntimeProfile) {
        const p = JSON.parse(bridge.getRuntimeProfile() || '{}');
        if (p.isAndroid) { isAndroid = true; isMobile = true; }
        if (p.isJoyTrans) { isJoyTrans = true; isMobile = true; }
        if (p.isHarmonyOS) { isHarmony = true; isMobile = true; }
        if (p.isKirin) { isKirin = true; isMobile = true; }
        if (p.isTablet) isTablet = true;
      }
    } catch {}
    if (!isKirin && (isAndroid || isHarmony || isJoyTrans || /Mobile/i.test(ua))) {
      try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
        const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
        const ren = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
        if (/maleoon|kirin|hisilicon/i.test(ren)) { isKirin = true; isMobile = true; }
      } catch {}
    }
    const r = document.documentElement;
    if (isMobile) r.dataset.mobile = '1';
    if (isAndroid) r.dataset.android = '1';
    if (isJoyTrans) r.dataset.joytrans = '1';
    if (isHarmony) r.dataset.harmony = '1';
    if (isKirin) r.dataset.kirin = '1';
    if (isTablet) r.dataset.tablet = '1';
    return { isAndroid, isJoyTrans, isHarmony, isKirin, isTablet, isMobile };
  })();
  const isLiteGpu = runtimeProfile.isMobile || runtimeProfile.isJoyTrans || runtimeProfile.isAndroid || runtimeProfile.isKirin || runtimeProfile.isHarmony;

  // Sync saved stage FX intensity ('full' default | 'soft')
  function syncFxMode() {
    try {
      const m = localStorage.getItem('shiny.stageFxMode') || 'full';
      document.documentElement.dataset.stageFx = m === 'soft' ? 'soft' : 'full';
    } catch {
      document.documentElement.dataset.stageFx = 'full';
    }
  }
  syncFxMode();

  // Keep Home Office (283 事务所) pure, AND on Mobile/Android/Harmony skip heavy 60fps particle/spotlight canvas & 3D hover tilt!
  if (isHomePage || isLiteGpu) return;

  /* ── 1. Volumetric Concert Spotlight & Penlight Particle Canvas ─────── */
  let canvas = null;
  let ctx = null;
  let W = 0;
  let H = 0;
  let dpr = 1;
  let rafId = 0;
  let pageActive = !document.hidden;
  let lastTs = 0;
  let clock = 0;

  const mouse = { x: -999, y: -999, tx: -999, ty: -999, nx: 0, ny: 0, active: false };
  const PALETTE = [
    { r: 34,  g: 211, b: 238 }, // Prism Cyan (Noctchill / 283 Sky)
    { r: 244, g: 114, b: 182 }, // Idol Rose (Alstroemeria)
    { r: 168, g: 85,  b: 247 }, // Concert Violet (L'Antica)
    { r: 251, g: 191, b: 36  }, // Stage Champagne Gold (Illumination)
    { r: 96,  g: 165, b: 250 }  // Starlight Blue
  ];

  let particles = [];
  let bursts = [];
  let rings = [];

  // Pre-render bokeh glow sprites ONCE at boot -> 10x faster than per-frame createRadialGradient (huge win on Huawei JoyTrans!)
  const bokehSprites = PALETTE.map((c) => {
    const sc = document.createElement('canvas');
    sc.width = 48;
    sc.height = 48;
    const sctx = sc.getContext('2d');
    const g = sctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, `rgba(${c.r},${c.g},${c.b},1)`);
    g.addColorStop(0.42, `rgba(${c.r},${c.g},${c.b},0.38)`);
    g.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 48, 48);
    return sc;
  });

  function spawnParticle(randomY = true) {
    const ci = Math.floor(Math.random() * PALETTE.length);
    const c = PALETTE[ci];
    const isStar = Math.random() < 0.36;
    const z = 0.35 + Math.random() * 0.65;
    return {
      x: Math.random() * (W || window.innerWidth),
      y: randomY ? Math.random() * (H || window.innerHeight) : (H || window.innerHeight) + 20,
      vx: (Math.random() - 0.5) * 14 * z,
      vy: -(10 + Math.random() * 24) * z,
      size: isStar ? (2.2 + Math.random() * 3.8) * z : (1.8 + Math.random() * 5.2) * z,
      z,
      isStar,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 1.4 + Math.random() * 2.8,
      baseAlpha: isStar ? (0.38 + Math.random() * 0.52) : (0.16 + Math.random() * 0.30),
      ci,
      c
    };
  }

  function resizeCanvas() {
    if (!canvas) return;
    // Cap DPR at 1.0 on Android/Huawei JoyTrans (cuts container GPU fill-rate by >55% with zero softness loss!)
    dpr = isLiteGpu ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const targetCount = isLiteGpu
      ? (isHomePage ? 26 : 38)
      : (isHomePage ? 64 : (isShellHost ? 32 : 88));
    if (particles.length < targetCount) {
      while (particles.length < targetCount) particles.push(spawnParticle(true));
    } else if (particles.length > targetCount) {
      particles.length = targetCount;
    }
  }

  function drawFourPointStar(x, y, radius, rot, alpha, c) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
    ctx.beginPath();
    const inner = radius * 0.24;
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? radius : inner;
      const a = (i * Math.PI) / 4;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawStageBeams(isDark, isSoft) {
    if (isSoft) return;
    const beamAlphaScale = isHomePage ? (isDark ? 0.18 : 0.11) : (isDark ? 0.28 : 0.16);
    const beams = [
      { ox: W * 0.10, oy: -40, baseAngle: 1.15, swing: 0.28, speed: 0.38, width: W * 0.32, len: H * 1.22, c: PALETTE[0], phase: 0.0 },
      { ox: W * 0.90, oy: -40, baseAngle: 1.99, swing: 0.26, speed: 0.33, width: W * 0.32, len: H * 1.22, c: PALETTE[1], phase: 1.7 },
      { ox: W * 0.36, oy: -60, baseAngle: 1.46, swing: 0.30, speed: 0.27, width: W * 0.27, len: H * 1.12, c: PALETTE[2], phase: 3.1 },
      { ox: W * 0.66, oy: -60, baseAngle: 1.68, swing: 0.28, speed: 0.35, width: W * 0.26, len: H * 1.12, c: PALETTE[3], phase: 4.6 }
    ];

    ctx.save();
    ctx.globalCompositeOperation = isDark ? 'lighter' : 'screen';
    for (const b of beams) {
      const angle = b.baseAngle + Math.sin(clock * b.speed + b.phase) * b.swing + mouse.nx * 0.16;
      const ex = b.ox + Math.cos(angle) * b.len;
      const ey = b.oy + Math.sin(angle) * b.len;
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);

      // Single-pass volumetric cone on Android/JoyTrans (saves 3x overdraw) vs 3-layer feathered cone on desktop
      const layers = isLiteGpu
        ? [{ wScale: 0.92, aScale: 0.85 }]
        : [
            { wScale: 1.18, aScale: 0.42 },
            { wScale: 0.62, aScale: 0.68 },
            { wScale: 0.26, aScale: 0.55 }
          ];
      for (const ly of layers) {
        const halfW = b.width * 0.5 * ly.wScale;
        const perpX = nx * halfW;
        const perpY = ny * halfW;
        const a = beamAlphaScale * ly.aScale;
        const grad = ctx.createLinearGradient(b.ox, b.oy, ex, ey);
        grad.addColorStop(0, `rgba(${b.c.r},${b.c.g},${b.c.b},${a * 1.2})`);
        grad.addColorStop(0.45, `rgba(${b.c.r},${b.c.g},${b.c.b},${a * 0.52})`);
        grad.addColorStop(1, `rgba(${b.c.r},${b.c.g},${b.c.b},0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(b.ox - perpX * 0.14, b.oy - perpY * 0.14);
        ctx.lineTo(b.ox + perpX * 0.14, b.oy + perpY * 0.14);
        ctx.lineTo(ex + perpX, ey + perpY);
        ctx.lineTo(ex - perpX, ey - perpY);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function spawnClickBurst(x, y) {
    if (document.documentElement.dataset.stageFx === 'soft') return;
    const baseC = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const secondC = PALETTE[(Math.floor(Math.random() * PALETTE.length) + 1) % PALETTE.length];
    rings.push({ x, y, r: 6, maxR: 72, alpha: 0.85, c: baseC });
    rings.push({ x, y, r: 2, maxR: 46, alpha: 0.72, c: secondC });
    for (let i = 0; i < 22; i++) {
      const ang = (Math.PI * 2 * i) / 22 + (Math.random() - 0.5) * 0.35;
      const spd = 90 + Math.random() * 190;
      bursts.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 2.8 + Math.random() * 4.4,
        life: 1,
        decay: 1.35 + Math.random() * 0.85,
        rot: Math.random() * Math.PI,
        c: PALETTE[(i + Math.floor(Math.random() * 3)) % PALETTE.length]
      });
    }
    if (bursts.length > 220) bursts.splice(0, bursts.length - 220);
  }

  let lastTrailAt = 0;
  function spawnCursorTrail(x, y) {
    if (document.documentElement.dataset.stageFx === 'soft') return;
    const now = performance.now();
    if (now - lastTrailAt < 34) return;
    lastTrailAt = now;
    bursts.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 28,
      vy: -14 - Math.random() * 24,
      size: 2.0 + Math.random() * 2.6,
      life: 0.82,
      decay: 1.65,
      rot: Math.random() * Math.PI,
      c: PALETTE[Math.floor(Math.random() * PALETTE.length)]
    });
    if (bursts.length > 220) bursts.splice(0, bursts.length - 220);
  }

  function tick(ts) {
    if (!pageActive) { rafId = 0; return; }
    const dt = lastTs ? Math.min(0.05, Math.max(0.0005, (ts - lastTs) / 1000)) : 0.016;
    lastTs = ts;
    clock += dt;

    // Frame-rate independent smooth cursor damping (consistent from 60Hz to 360Hz+ uncapped!)
    if (mouse.active) {
      const damp = 1 - Math.exp(-9.2 * dt);
      mouse.x += (mouse.tx - mouse.x) * damp;
      mouse.y += (mouse.ty - mouse.y) * damp;
      mouse.nx = W > 0 ? ((mouse.x / W) - 0.5) * 2 : 0;
      mouse.ny = H > 0 ? ((mouse.y / H) - 0.5) * 2 : 0;
    }

    const isDark = document.documentElement.dataset.theme === 'dark';
    const isSoft = document.documentElement.dataset.stageFx === 'soft';

    ctx.clearRect(0, 0, W, H);

    // 1. Volumetric Sweeping Stage Beams
    drawStageBeams(isDark, isSoft);

    // 2. Interactive Cursor Stage Spotlight
    if (mouse.active && !isSoft) {
      const rad = isDark ? 240 : 210;
      const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, rad);
      const a0 = isDark ? 0.14 : 0.09;
      g.addColorStop(0, `rgba(34, 211, 238, ${a0})`);
      g.addColorStop(0.45, `rgba(244, 114, 182, ${a0 * 0.55})`);
      g.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.save();
      ctx.globalCompositeOperation = isDark ? 'lighter' : 'source-over';
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Penlight Bokeh & 4-Point Prism Stars with Z-Depth Parallax
    const maxDraw = isSoft ? Math.min(18, particles.length) : particles.length;
    for (let i = 0; i < maxDraw; i++) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < -28 || p.x < -40 || p.x > W + 40) {
        particles[i] = spawnParticle(false);
        continue;
      }
      const px = p.x + mouse.nx * 44 * p.z;
      const py = p.y + mouse.ny * 30 * p.z;
      const twinkle = 0.5 + 0.5 * Math.sin(clock * p.twinkleSpeed + p.phase);
      const alpha = p.baseAlpha * (0.45 + 0.55 * twinkle) * (isDark ? 1.05 : 0.82);

      if (p.isStar) {
        drawFourPointStar(px, py, p.size * (0.8 + 0.35 * twinkle), clock * 0.5 + p.phase, alpha, p.c);
      } else {
        const r = p.size * 2.4;
        ctx.globalAlpha = alpha;
        ctx.drawImage(bokehSprites[p.ci || 0], px - r, py - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      }
    }

    // 4. Click Holographic Shockwave Rings
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += (r.maxR - r.r) * Math.min(1, dt * 8.5);
      r.alpha -= dt * 1.65;
      if (r.alpha <= 0.01) { rings.splice(i, 1); continue; }
      ctx.save();
      ctx.strokeStyle = `rgba(${r.c.r},${r.c.g},${r.c.b},${r.alpha})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Click Diamond Star-Burst Sparks
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= Math.pow(0.08, dt);
      b.vy *= Math.pow(0.08, dt);
      b.vy += 45 * dt;
      b.life -= b.decay * dt;
      if (b.life <= 0) { bursts.splice(i, 1); continue; }
      drawFourPointStar(b.x, b.y, b.size * b.life * 1.4, b.rot + clock * 3, b.life * 0.9, b.c);
    }

    rafId = requestAnimationFrame(tick);
  }

  function startCanvasLoop() {
    if (!canvas || rafId || !pageActive) return;
    lastTs = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stopCanvasLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function mountCanvas() {
    if (document.getElementById('prismLiveCanvas')) return;
    canvas = document.createElement('canvas');
    canvas.id = 'prismLiveCanvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    startCanvasLoop();
  }

  /* ── 2. Delegated 3D SSR Holographic Foil Card Tilt & Hero Parallax ─── */
  const HOLO_SELECTOR = '.gallery-item, .model-card, .collection-stat, .story-item, .podcast-card, .fx-card';
  let activeTiltEl = null;

  function clearTilt(el) {
    if (!el) return;
    el.classList.remove('is-tilting');
    el.style.transform = '';
    el.style.removeProperty('--mx');
    el.style.removeProperty('--my');
  }

  function bindInteractiveMotion() {
    window.addEventListener('pointermove', (e) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
      if (!mouse.active) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.active = true;
      }

      if (document.documentElement.dataset.stageFx === 'soft') {
        if (activeTiltEl) { clearTilt(activeTiltEl); activeTiltEl = null; }
        return;
      }

      spawnCursorTrail(e.clientX, e.clientY);

      // Home Office 3D Diorama Camera Parallax
      if (isHomePage && document.documentElement.dataset.stageFx !== 'soft') {
        const scr = document.querySelector('.screen');
        if (scr) {
          const hpx = ((e.clientX / Math.max(1, window.innerWidth)) - 0.5) * -28;
          const hpy = ((e.clientY / Math.max(1, window.innerHeight)) - 0.5) * -18;
          scr.style.setProperty('--home-px', `${hpx.toFixed(1)}px`);
          scr.style.setProperty('--home-py', `${hpy.toFixed(1)}px`);
        }
      }

      // 3D Holographic Card Tilt (MAX 3D Depth)
      const card = e.target?.closest?.(HOLO_SELECTOR);
      if (card !== activeTiltEl) {
        if (activeTiltEl) clearTilt(activeTiltEl);
        activeTiltEl = card || null;
      }
      if (card) {
        card.classList.add('ls-holo-card', 'is-tilting');
        const rect = card.getBoundingClientRect();
        if (rect.width > 10 && rect.height > 10) {
          const rx = (e.clientX - rect.left) / rect.width;
          const ry = (e.clientY - rect.top) / rect.height;
          const rotY = (rx - 0.5) * 14;
          const rotX = (0.5 - ry) * 11;
          card.style.setProperty('--mx', `${(rx * 100).toFixed(1)}%`);
          card.style.setProperty('--my', `${(ry * 100).toFixed(1)}%`);
          card.style.transform = `perspective(820px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateY(-6px) scale(1.028)`;
        }
      }

      // Hero Banner Artwork Depth Parallax (MAX Depth)
      const hero = e.target?.closest?.('.collection-overview');
      if (hero) {
        const rect = hero.getBoundingClientRect();
        const px = (((e.clientX - rect.left) / Math.max(1, rect.width)) - 0.5) * -30;
        const py = (((e.clientY - rect.top) / Math.max(1, rect.height)) - 0.5) * -20;
        hero.style.setProperty('--px', `${px.toFixed(1)}px`);
        hero.style.setProperty('--py', `${py.toFixed(1)}px`);
      }
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
      if (activeTiltEl) { clearTilt(activeTiltEl); activeTiltEl = null; }
    });

    window.addEventListener('pointerdown', (e) => {
      if (e.button === 0 || e.pointerType === 'touch') {
        spawnClickBurst(e.clientX, e.clientY);
      }
    }, { passive: true });
  }

  /* ── 3. Kinetic Scroll Reveal Choreography ──────────────────────────── */
  let revealObs = null;

  function tagHoloAndReveal(root = document) {
    if (isHomePage || isShellHost) return;
    const nodes = root.querySelectorAll?.(
      '.collection-stat, .collection-overview, .gallery-item, .model-card, .podcast-card'
    );
    if (!nodes || !nodes.length) return;
    let idx = 0;
    nodes.forEach((el) => {
      if (!el.classList.contains('ls-holo-card') && el.matches(HOLO_SELECTOR)) {
        el.classList.add('ls-holo-card');
      }
      if (!el.dataset.lsObserved) {
        el.dataset.lsObserved = '1';
        el.classList.add('ls-reveal');
        el.style.setProperty('--ls-delay', `${Math.min(idx * 32, 260)}ms`);
        idx++;
        if (revealObs) revealObs.observe(el);
        else el.classList.add('is-in');
      }
    });
  }

  function setupRevealObserver() {
    if (isHomePage || isShellHost) return;
    if (typeof IntersectionObserver === 'function') {
      revealObs = new IntersectionObserver((entries) => {
        for (const ent of entries) {
          if (ent.isIntersecting) {
            ent.target.classList.add('is-in');
            revealObs.unobserve(ent.target);
          }
        }
      }, { rootMargin: '40px 0px', threshold: 0.04 });
    }
    tagHoloAndReveal(document);
    // Catch dynamically loaded galleries / cards cleanly
    if (typeof MutationObserver === 'function') {
      let pending = 0;
      new MutationObserver(() => {
        if (pending) return;
        pending = requestAnimationFrame(() => {
          pending = 0;
          tagHoloAndReveal(document);
        });
      }).observe(document.body, { childList: true, subtree: true });
    }
  }

  /* ── 4. Visibility & Cross-Frame Sync ───────────────────────────────── */
  document.addEventListener('visibilitychange', () => {
    pageActive = !document.hidden;
    if (pageActive) startCanvasLoop();
    else stopCanvasLoop();
  });

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'shiny-shell-visibility') {
      pageActive = !!e.data.active && !document.hidden;
      if (pageActive) startCanvasLoop();
      else stopCanvasLoop();
    } else if (e.data.type === 'shiny-stage-fx-mode') {
      document.documentElement.dataset.stageFx = e.data.mode === 'soft' ? 'soft' : 'full';
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'shiny.stageFxMode') syncFxMode();
  });

  function boot() {
    mountCanvas();
    bindInteractiveMotion();
    setupRevealObserver();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
