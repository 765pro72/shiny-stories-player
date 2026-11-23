/* ═══════════════════════════════════════════════════════════════════════════
   283 PRISM GLASS — Persistent Apple App Shell Runtime
   Spring Pill Navigation · Keep-Alive Stage · Dynamic Island · Spotlight
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const MODULES = [
    {
      page: 'index.html',
      label: '事务所',
      tip: '事务所 · 看板',
      accent: '#0ea5e9',
      icon: '<svg viewBox="0 0 24 24"><path d="M3.5 10.6 12 3.5l8.5 7.1V19.5a1.5 1.5 0 0 1-1.5 1.5H14.5v-5.5a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1V21H5a1.5 1.5 0 0 1-1.5-1.5v-8.9z"/></svg>'
    },
    {
      page: 'guide.html',
      label: '剧情',
      tip: '剧情馆',
      accent: '#ec4899',
      icon: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17.5H6.5A2.5 2.5 0 0 0 4 22V5.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v17.5h5.5A2.5 2.5 0 0 1 20 22V5.5z"/></svg>'
    },
    {
      page: 'card-gallery.html',
      label: '相册',
      tip: '卡片相册',
      accent: '#f59e0b',
      icon: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M20.5 15.8 15.6 11l-7.8 8.5"/></svg>'
    },
    {
      page: 'voice-gallery.html',
      label: '语音',
      tip: '语音馆',
      accent: '#8b5cf6',
      icon: '<svg viewBox="0 0 24 24"><path d="M4 12v0M8 8.5v7M12 5v14M16 8.5v7M20 12v0"/></svg>'
    },
    {
      page: 'model-picker.html',
      label: '衣装',
      tip: '衣装室',
      accent: '#10b981',
      icon: '<svg viewBox="0 0 24 24"><path d="M12 3a2.5 2.5 0 0 1 2.2 3.7L12 8.5l8 4.6a1.5 1.5 0 0 1-.75 2.8H4.75A1.5 1.5 0 0 1 4 13.1l8-4.6"/><path d="M9.8 5.2A2.5 2.5 0 0 1 12 3"/><path d="M6.5 16v3.5a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V16"/></svg>'
    },
    {
      page: 'music.html',
      label: '音乐',
      tip: '音乐馆 · Jukebox',
      accent: '#f43f5e',
      icon: '<svg viewBox="0 0 24 24"><path d="M9 18V6.2l10.5-2.2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17" cy="16" r="2.5"/></svg>'
    },
    {
      page: 'arcade.html',
      label: '游乐厅',
      tip: '283 游乐厅 · 大富豪与小游戏',
      accent: '#14b8a6',
      icon: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6.5" width="19" height="11" rx="4.5"/><path d="M7.5 10v4M5.5 12h4"/><circle cx="15.5" cy="11" r="1"/><circle cx="18" cy="13" r="1"/></svg>'
    },
    {
      page: 'custom-story.html',
      label: '怪文书',
      tip: '怪文书工坊',
      accent: '#6366f1',
      icon: '<svg viewBox="0 0 24 24"><path d="M17.5 3.5a2.8 2.8 0 0 1 4 4L9.2 19.8 4 21l1.2-5.2L17.5 3.5z"/><path d="M14.5 6.5l3 3"/></svg>'
    }
  ];

  const PAGE_ORDER = MODULES.map(m => m.page);
  const $ = s => document.querySelector(s);

  const elBoot = $('#shellBoot');
  const elHeader = $('#shellHeader');
  const elBrand = $('#prismBrand');
  const elDock = $('#prismDock');
  const elPill = $('#dockPill');
  const elStage = $('#shellStage');
  const elTip = $('#shellTip');
  const elBtnSpotlight = $('#btnSpotlight');
  const elBtnTheme = $('#btnTheme');
  const elBtnContinue = $('#btnContinue');

  // Dynamic Island elements
  const elPopBackdrop = $('#shellPopBackdrop');
  const elIslandAnchor = $('#islandAnchor');
  const elIsland = $('#dynamicIsland');
  const elIslandCoverBtn = $('#islandCoverBtn');
  const elIslandInfoBtn = $('#islandInfoBtn');
  const elIslandCover = $('#islandCover');
  const elIslandTitle = $('#islandTitle');
  const elIslandTitleTrack = $('#islandTitleTrack');
  const updateIslandTitleMarquee = (rawTitle) => {
    if (!elIslandTitle) return;
    const text = String(rawTitle || '').trim();
    const track = elIslandTitleTrack || elIslandTitle.querySelector('.island-title-track');
    if (track) {
      if (track.textContent !== text) track.textContent = text;
    } else {
      elIslandTitle.textContent = text;
      return;
    }
    elIslandTitle.title = text;
    requestAnimationFrame(() => {
      if (!elIslandTitle.isConnected || !track.isConnected) return;
      const boxW = elIslandTitle.clientWidth;
      const textW = track.scrollWidth;
      const overflow = Math.ceil(textW - boxW);
      if (boxW > 8 && overflow > 2) {
        const shift = -(overflow + 8);
        const dur = Math.max(4.8, Math.min(15, (overflow + 44) / 20)).toFixed(2);
        elIslandTitle.style.setProperty('--it-shift', `${shift}px`);
        elIslandTitle.style.setProperty('--it-dur', `${dur}s`);
        elIslandTitle.classList.add('is-marquee');
      } else {
        elIslandTitle.classList.remove('is-marquee');
        elIslandTitle.style.removeProperty('--it-shift');
        elIslandTitle.style.removeProperty('--it-dur');
      }
    });
  };
  if (elIslandTitle && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      const cur = (elIslandTitleTrack?.textContent || elIslandTitle.title || '').trim();
      if (cur) updateIslandTitleMarquee(cur);
    }).observe(elIslandTitle);
  }
  const elIslandMiniNext = $('#islandMiniNext');
  const elIslandMiniPlay = $('#islandMiniPlay');
  const elIslandProgressCircle = $('#islandProgressCircle');
  const elIslandPopover = $('#islandPopover');
  const elIpArt = $('#ipArt');
  const elIpTitle = $('#ipTitle');
  const elIpArtist = $('#ipArtist');
  const elIpFavBtn = $('#ipFavBtn');
  const elIpOpenMusicBtn = $('#ipOpenMusicBtn');
  const elIpLyric = $('#ipLyric');
  const elIpLyricJp = $('#ipLyricJp');
  const elIpLyricZh = $('#ipLyricZh');
  const elIpCurTime = $('#ipCurTime');
  const elIpDurTime = $('#ipDurTime');
  const elIpSeek = $('#ipSeek');
  const elIpModeBtn = $('#ipModeBtn');
  const elIpModeTag = $('#ipModeTag');
  const elIpPrevBtn = $('#ipPrevBtn');
  const elIpPlayBtn = $('#ipPlayBtn');
  const elIpNextBtn = $('#ipNextBtn');
  const elIpMuteBtn = $('#ipMuteBtn');
  const elIpVolume = $('#ipVolume');
  const elIpVolText = $('#ipVolText');
  const elIpQualitySelect = $('#ipQualitySelect');
  const elIpFxSelect = $('#ipFxSelect');
  const elIpQueueSection = $('#ipQueueSection');
  const elIpQueueTitle = $('#ipQueueTitle');
  const elIpQueueToggle = $('#ipQueueToggle');
  const elIpQueueTopBtn = $('#ipQueueTopBtn');
  const elIpQueueList = $('#ipQueueList');
  let lastIpQueueSig = '';
  let ipQueueExpanded = false;
  const setIpQueueExpanded = (open) => {
    ipQueueExpanded = !!open;
    if (elIpQueueSection) {
      elIpQueueSection.hidden = !ipQueueExpanded || !(Array.isArray(musicState.queuePreview) && musicState.queuePreview.length);
      elIpQueueSection.classList.toggle('is-collapsed', !ipQueueExpanded);
    }
    if (elIpQueueList) elIpQueueList.setAttribute('aria-hidden', ipQueueExpanded ? 'false' : 'true');
    if (elIpQueueToggle) {
      elIpQueueToggle.textContent = ipQueueExpanded ? '收起' : '展开';
      elIpQueueToggle.setAttribute('aria-expanded', ipQueueExpanded ? 'true' : 'false');
    }
    if (elIpQueueTopBtn) {
      elIpQueueTopBtn.classList.toggle('is-active', ipQueueExpanded);
      elIpQueueTopBtn.setAttribute('aria-expanded', ipQueueExpanded ? 'true' : 'false');
      elIpQueueTopBtn.dataset.tip = ipQueueExpanded ? '收起待播列表' : (musicState.queueTitle ? `展开：${musicState.queueTitle}` : '展开待播列表');
    }
  };
  elIpQueueTopBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    setIpQueueExpanded(!ipQueueExpanded);
  });
  elIpQueueToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    setIpQueueExpanded(false);
  });

  // Spotlight elements
  const elSpBackdrop = $('#spotlightBackdrop');
  const elSpInput = $('#spotlightInput');
  const elSpResults = $('#spotlightResults');

  const frames = new Map(); // pageKey -> { iframe, url, ready }
  const dockButtons = new Map();
  let activePage = null;
  let bootDismissed = false;
  let islandPopoverOpen = false;
  let islandSeeking = false;
  let musicState = {
    song: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    lyricJp: '',
    lyricZh: '',
    isFav: false,
    playMode: (() => {
      try {
        const m = localStorage.getItem('shiny.musicPlayMode');
        return (m === 'shuffle' || m === 'single') ? m : 'loop';
      } catch { return 'loop'; }
    })(),
    volume: (() => {
      try {
        const saved = localStorage.getItem('shiny.musicVolume');
        if (saved === null || saved === '') return 50;
        const v = Number(saved);
        return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 50;
      } catch { return 50; }
    })()
  };
  let lastNonZeroVolume = 50;

  function syncPopBackdrop() {
    if (!elPopBackdrop) return;
    const envOpen = !$('#envPopover')?.hidden;
    elPopBackdrop.hidden = !(islandPopoverOpen || envOpen);
  }

  function closeAllPopovers() {
    if (islandPopoverOpen) closeIslandPopover();
    const envPop = $('#envPopover');
    const envBtn = $('#shellEnvCapsule');
    if (envPop && !envPop.hidden) {
      envPop.hidden = true;
      envBtn?.setAttribute('aria-expanded', 'false');
    }
    syncPopBackdrop();
  }

  /* ── 1. URL Normalization ───────────────────────────────────────────── */
  function parseTarget(rawUrl) {
    try {
      const u = new URL(rawUrl || 'index.html', location.origin + '/');
      let name = u.pathname.split('/').pop() || 'index.html';
      if (name === 'shell.html' || name === '') name = 'index.html';
      if (name === 'library.html') name = 'guide.html';
      const rel = name + u.search + u.hash;
      return { page: name, rel, url: '/' + rel, search: u.search, hash: u.hash };
    } catch {
      return { page: 'index.html', rel: 'index.html', url: '/index.html', search: '', hash: '' };
    }
  }

  /* ── 2. Real Spring-Physics Sliding Liquid Glass Pill ─────────────────── */
  const pillSpring = {
    x: 0, vx: 0, tx: 0,
    w: 0, vw: 0, tw: 0,
    initialized: false,
    raf: 0,
    lastTime: 0
  };

  const isMobileShell = (() => {
    const ua = navigator.userAgent || '';
    const m = /ShinyStoriesAndroid|Android|iPhone|iPad|iPod|Mobile|HarmonyOS|JoyTrans|Droitong/i.test(ua)
      || document.documentElement.dataset.android === '1'
      || document.documentElement.dataset.joytrans === '1';
    if (m) document.documentElement.dataset.mobile = '1';
    return m;
  })();

  function measureActivePill(immediate = false) {
    const btn = dockButtons.get(activePage);
    if (!btn) return;
    const tx = btn.offsetLeft;
    const tw = btn.offsetWidth;
    if (tw <= 0) return;
    pillSpring.tx = tx;
    pillSpring.tw = tw;
    // On mobile, skip 60fps JS spring physics loop and use lightweight CSS transition directly!
    if (!pillSpring.initialized || immediate || isMobileShell) {
      pillSpring.x = tx;
      pillSpring.w = tw;
      pillSpring.vx = 0;
      pillSpring.vw = 0;
      pillSpring.initialized = true;
      elPill.style.opacity = '1';
      elPill.style.width = `${tw}px`;
      elPill.style.transform = `translate3d(${tx}px, 0, 0)`;
      elPill.classList.remove('is-gliding');
      return;
    }
    if (!pillSpring.raf) {
      pillSpring.lastTime = performance.now();
      pillSpring.raf = requestAnimationFrame(stepPillSpring);
    }
  }

  function stepPillSpring(now) {
    const dt = Math.min(0.032, Math.max(0.004, (now - pillSpring.lastTime) / 1000));
    pillSpring.lastTime = now;

    // Continuously track target geometry while active label expands smoothly
    const btn = dockButtons.get(activePage);
    if (btn && btn.offsetWidth > 0) {
      pillSpring.tx = btn.offsetLeft;
      pillSpring.tw = btn.offsetWidth;
    }

    const k = 440; // Lively Apple spring stiffness with crisp overshoot
    const d = 24;  // Fluid under-damped liquid glass settle

    const ax = (pillSpring.tx - pillSpring.x) * k - pillSpring.vx * d;
    pillSpring.vx += ax * dt;
    pillSpring.x += pillSpring.vx * dt;

    const aw = (pillSpring.tw - pillSpring.w) * k - pillSpring.vw * d;
    pillSpring.vw += aw * dt;
    pillSpring.w += pillSpring.vw * dt;

    // Volume-preserving liquid droplet stretch & squash proportional to velocity!
    const speed = Math.abs(pillSpring.vx);
    const stretchX = 1 + Math.min(0.24, speed * 0.00022);
    const squashY = 1 / Math.sqrt(stretchX);

    elPill.style.opacity = '1';
    elPill.style.width = `${Math.max(36, pillSpring.w)}px`;
    elPill.style.transform = `translate3d(${pillSpring.x}px, 0, 0) scale(${stretchX.toFixed(4)}, ${squashY.toFixed(4)})`;
    elPill.classList.toggle('is-gliding', speed > 32);

    const settled =
      Math.abs(pillSpring.tx - pillSpring.x) < 0.25 &&
      Math.abs(pillSpring.vx) < 1.5 &&
      Math.abs(pillSpring.tw - pillSpring.w) < 0.25 &&
      Math.abs(pillSpring.vw) < 1.5;

    if (settled) {
      pillSpring.x = pillSpring.tx;
      pillSpring.w = pillSpring.tw;
      pillSpring.vx = 0;
      pillSpring.vw = 0;
      elPill.style.width = `${pillSpring.tw}px`;
      elPill.style.transform = `translate3d(${pillSpring.tx}px, 0, 0)`;
      elPill.classList.remove('is-gliding');
      pillSpring.raf = 0;
    } else {
      pillSpring.raf = requestAnimationFrame(stepPillSpring);
    }
  }

  /* ── 3. Build Fluid Dock (macOS Gaussian Wave + Sliding Hover Glass Pill + Spring Ripple) ── */
  function buildDock() {
    const hoverPill = document.createElement('div');
    hoverPill.className = 'dock-hover-pill';
    hoverPill.setAttribute('aria-hidden', 'true');
    elDock.appendChild(hoverPill);

    for (const mod of MODULES) {
      const a = document.createElement('a');
      a.className = 'dock-item';
      a.href = mod.page;
      a.dataset.page = mod.page;
      a.dataset.tip = mod.tip;
      a.style.setProperty('--item-accent', mod.accent);
      a.setAttribute('aria-label', mod.tip);
      a.innerHTML = `${mod.icon}<span class="dock-label">${mod.label}</span>`;
      a.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        // Tactile spring pop + liquid ripple pulse on click
        a.classList.remove('is-popping');
        void a.offsetWidth;
        a.classList.add('is-popping');
        setTimeout(() => a.classList.remove('is-popping'), 440);
        navigate(mod.page);
      });
      elDock.appendChild(a);
      dockButtons.set(mod.page, a);
    }

    elBrand.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('index.html');
    });

    // Live Specular Cursor Sheen + Sliding Hover Pill + macOS Dock Gaussian Wave Magnification
    elDock.addEventListener('pointermove', (e) => {
      const r = elDock.getBoundingClientRect();
      elDock.style.setProperty('--dock-mx', `${e.clientX - r.left}px`);
      elDock.style.setProperty('--dock-my', `${e.clientY - r.top}px`);
      elDock.style.setProperty('--dock-glow', '1');

      const hoveredBtn = e.target.closest('.dock-item');
      if (hoveredBtn && !hoveredBtn.classList.contains('is-active')) {
        // Hover pill disabled to prevent click ripple artifacts
      }

      for (const btn of dockButtons.values()) {
        const br = btn.getBoundingClientRect();
        const cx = br.left + br.width / 2;
        const dx = e.clientX - cx;
        const sigma = 54;
        const wave = Math.exp(-(dx * dx) / (2 * sigma * sigma));
        if (wave > 0.08 && !btn.classList.contains('is-active')) {
          const lift = -(wave * 2.6);
          const sc = 1 + wave * 0.14;
          const pullX = (dx / 54) * wave * 2.4;
          btn.style.transform = `translate3d(${pullX.toFixed(2)}px, ${lift.toFixed(2)}px, 0) scale(${sc.toFixed(3)})`;
        } else {
          btn.style.transform = '';
        }
      }
    }, { passive: true });

    elDock.addEventListener('pointerleave', () => {
      elDock.style.setProperty('--dock-glow', '0');
      hoverPill.style.opacity = '0';
      for (const btn of dockButtons.values()) btn.style.transform = '';
    }, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => measureActivePill(false));
      ro.observe(elDock);
      for (const btn of dockButtons.values()) ro.observe(btn);
    }
    window.addEventListener('resize', () => measureActivePill(true));
  }

  /* ── 4. Tooltip Engine ──────────────────────────────────────────────── */
  let tipTimer = 0;
  function setupTooltips() {
    document.addEventListener('pointerover', (e) => {
      const target = e.target.closest('[data-tip]');
      clearTimeout(tipTimer);
      if (!target || target.classList.contains('is-active')) {
        elTip.classList.remove('is-visible');
        return;
      }
      const text = target.dataset.tip;
      if (!text) return;
      tipTimer = setTimeout(() => {
        const r = target.getBoundingClientRect();
        elTip.textContent = text;
        const left = Math.min(window.innerWidth - 70, Math.max(70, r.left + r.width / 2));
        elTip.style.left = `${left}px`;
        elTip.style.top = `${r.bottom + 8}px`;
        elTip.classList.add('is-visible');
      }, 220);
    }, { passive: true });

    document.addEventListener('pointerout', (e) => {
      if (e.target.closest('[data-tip]')) {
        clearTimeout(tipTimer);
        elTip.classList.remove('is-visible');
      }
    }, { passive: true });

    document.addEventListener('pointerdown', () => {
      clearTimeout(tipTimer);
      elTip.classList.remove('is-visible');
    }, { passive: true });
  }

  /* ── 5. Keep-Alive Spatial Frame Stage ──────────────────────────────── */
  function syncFrameThemeAndFont(iframe) {
    try {
      const doc = iframe.contentDocument;
      if (!doc || !doc.documentElement) return;
      const el = doc.documentElement;
      if (!el.classList.contains('in-shell')) el.classList.add('in-shell');
      const wantTheme = document.documentElement.dataset.theme || 'light';
      if (el.dataset.theme !== wantTheme) el.dataset.theme = wantTheme;
      const dc = document.documentElement.dataset.desktopChrome;
      if (dc && el.dataset.desktopChrome !== dc) el.dataset.desktopChrome = dc;
    } catch {}
  }

  function notifyFrameVisibility(pageKey, isVisible) {
    const entry = frames.get(pageKey);
    if (!entry) return;
    try {
      entry.iframe.contentWindow?.postMessage({ type: 'shiny-shell-visibility', active: isVisible }, location.origin);
    } catch {}
  }

  function pauseMusicPolitely() {
    const musicEntry = frames.get('music.html');
    try {
      musicEntry?.iframe.contentWindow?.__musicAPI?.pause?.();
    } catch {}
  }

  let initialFrameLoadedResolve = null;
  const initialFrameLoaded = new Promise(resolve => { initialFrameLoadedResolve = resolve; });

  function setBootProgress(pct, text) {
    const fill = document.getElementById('bootBarFill');
    const pctEl = document.getElementById('bootPercent');
    const stEl = document.getElementById('bootStageText');
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    if (fill) fill.style.width = clamped + '%';
    if (pctEl) pctEl.textContent = clamped + '%';
    if (stEl && text) stEl.textContent = text;
  }

  function dismissBoot() {
    if (bootDismissed) return;
    bootDismissed = true;
    setBootProgress(100, '准备就绪，欢迎回到 283 事务所');
    setTimeout(() => {
      elBoot?.classList.add('is-done');
      setTimeout(() => { elBoot?.remove(); }, 560);
    }, 180);
  }

  async function preloadRandomDynamicCards() {
    try {
      // Warm core catalog datasets in parallel so navigating to any tab hits instant warm cache
      const warmJsons = [
        '/data/catalog.json',
        '/data/voice-index.json',
        '/music-catalog.json',
        '/home-assets/catalog.json',
        '/portraits.json',
        '/guide-groups.json'
      ].map(u => fetch(u).then(r => r.ok ? r.text() : null).catch(() => null));

      const r = await fetch('/data/card-media.json');
      if (!r.ok) { await Promise.allSettled(warmJsons); return; }
      const rows = await r.json();
      const movieCards = rows.filter(c => !c.metadataPending && !c.name?.includes('白いツバサ') && Array.isArray(c.movies) && c.movies.length && Array.isArray(c.images) && c.images.length);
      if (!movieCards.length) { await Promise.allSettled(warmJsons); return; }

      // Pick 4 distinct random dynamic cards (cards, guide, voice, wardrobe)
      const shuffled = movieCards.slice().sort(() => Math.random() - 0.5);
      const keys = ['cards', 'guide', 'voice', 'wardrobe'];
      const picked = {};
      keys.forEach((k, idx) => {
        const c = shuffled[idx % shuffled.length];
        picked[k] = {
          cardId: c.id,
          name: c.name,
          idol: c.idol,
          imagePath: c.images[0].path,
          moviePath: c.movies[0].path
        };
      });
      try { sessionStorage.setItem('shiny.preloadedBanners', JSON.stringify(picked)); } catch {}

      // Actively preload ALL 4 poster images + ALL 4 dynamic hero card videos during boot!
      const imgTasks = keys.map(k => new Promise(res => {
        const im = new Image();
        im.onload = im.onerror = () => res();
        im.src = '/asset-original/' + picked[k].imagePath;
        setTimeout(res, 2200);
      }));
      const vidTasks = keys.map(k => new Promise(res => {
        const v = document.createElement('video');
        v.muted = true;
        v.preload = 'auto';
        const done = () => { v.onloadeddata = v.oncanplay = v.onerror = null; res(); };
        v.onloadeddata = v.oncanplay = v.onerror = done;
        v.src = '/asset-original/' + picked[k].moviePath;
        v.load();
        setTimeout(done, 3600);
      }));
      await Promise.all([...warmJsons, ...imgTasks, ...vidTasks]);
    } catch {}
  }

  function warmBackgroundFramesDuringBoot(initialPage) {
    const ua = navigator.userAgent || '';
    const isLiteDevice = /ShinyStoriesAndroid|Android|JoyTrans|Droitong|HarmonyOS/i.test(ua)
      || document.documentElement.dataset.android === '1'
      || document.documentElement.dataset.joytrans === '1';
    if (isLiteDevice) return Promise.resolve();

    // Eagerly pre-mount key pages on desktop during boot so their dynamic banner <video> is ALREADY decoded & ready on first click!
    const preloadPages = ['card-gallery.html', 'guide.html', 'voice-gallery.html', 'model-picker.html']
      .filter(p => p !== initialPage);

    return Promise.all(preloadPages.map(p => new Promise(res => {
      const target = parseTarget(p);
      const entry = getOrCreateFrame(target, true);
      if (entry.ready) return res();
      const onDone = () => { clearTimeout(t); res(); };
      entry.iframe.addEventListener('load', onDone, { once: true });
      const t = setTimeout(onDone, 3600);
    })));
  }

  function getOrCreateFrame(target, hiddenLoad = false) {
    let entry = frames.get(target.page);
    if (!entry) {
      const iframe = document.createElement('iframe');
      iframe.className = 'stage-frame';
      iframe.dataset.page = target.page;
      iframe.setAttribute('allow', 'autoplay; fullscreen');
      iframe.title = MODULES.find(m => m.page === target.page)?.tip || target.page;
      entry = { iframe, url: target.url, ready: false };
      frames.set(target.page, entry);
      iframe.addEventListener('load', () => {
        entry.ready = true;
        syncFrameThemeAndFont(iframe);
        if (target.page === activePage) {
          syncDocumentTitle(iframe);
          notifyFrameVisibility(target.page, true);
        } else if (hiddenLoad) {
          notifyFrameVisibility(target.page, false);
        }
        if (target.page === 'index.html' || activePage === target.page) {
          if (initialFrameLoadedResolve) {
            initialFrameLoadedResolve(iframe);
            initialFrameLoadedResolve = null;
          }
        }
      });
      iframe.src = target.url;
      elStage.appendChild(iframe);
    } else if (entry.url !== target.url) {
      // Same module with new query or hash (e.g. guide.html?mode=favorites#archive)
      const prevUrl = new URL(entry.url, location.origin);
      const nextUrl = new URL(target.url, location.origin);
      entry.url = target.url;
      if (prevUrl.pathname === nextUrl.pathname && prevUrl.search === nextUrl.search && nextUrl.hash) {
        try { entry.iframe.contentWindow.location.hash = nextUrl.hash; } catch { entry.iframe.src = target.url; }
      } else {
        entry.iframe.src = target.url;
      }
    }
    return entry;
  }

  function syncDocumentTitle(iframe) {
    try {
      const t = iframe?.contentDocument?.title;
      if (t) document.title = t;
    } catch {}
  }

  function navigate(rawUrl, options = {}) {
    const target = parseTarget(rawUrl);
    const prevPage = activePage;
    const isSamePage = prevPage === target.page;

    closeIslandPopover();

    // Update dock active state immediately for 0ms tactile response
    activePage = target.page;
    document.documentElement.dataset.activePage = activePage;
    for (const [page, btn] of dockButtons.entries()) {
      const isActive = page === activePage;
      btn.classList.toggle('is-active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    }
    measureActivePill(prevPage === null);

    // Never pause the user's jukebox song when returning to Home!
    // Instead, tell Home office to keep its built-in BGM muted while the user's song is playing.
    if (target.page === 'index.html' && musicState.isPlaying) {
      try {
        frames.get('index.html')?.iframe?.contentWindow?.postMessage(
          { type: 'shiny-home-bgm-pause', playing: true },
          location.origin
        );
      } catch {}
    }

    const nextEntry = getOrCreateFrame(target);

    if (isSamePage) {
      syncDocumentTitle(nextEntry.iframe);
      return;
    }

    const prevEntry = prevPage ? frames.get(prevPage) : null;
    const isMusicMorph = !!(prevEntry && musicState.song && (prevPage === 'music.html' || target.page === 'music.html'));
    const morphDirection = prevPage === 'music.html' ? 'to-capsule' : 'to-dock';
    const musicEntryForMorph = prevPage === 'music.html' ? prevEntry : (target.page === 'music.html' ? nextEntry : null);
    // Capture capsule & bottom .player-dock geometry BEFORE hiding/swapping anything
    const preCapRect = isMusicMorph && morphDirection === 'to-dock' ? captureCapsuleRect() : null;
    const preCoverRect = isMusicMorph && morphDirection === 'to-dock' ? captureCapsuleCoverRect() : null;
    const preDockData = isMusicMorph && morphDirection === 'to-capsule' ? measureMusicDockRect(musicEntryForMorph?.iframe) : null;
    const navToken = target.page + ':' + Date.now();
    elStage.dataset.navToken = navToken;
    const isLiteShell = document.documentElement.dataset.android === '1' || document.documentElement.dataset.joytrans === '1';

    const commitSwap = () => {
      if (elStage.dataset.navToken !== navToken || activePage !== target.page) return;

      // Atomic 1-frame swap: ZERO delayed underlay timers (no 220ms/450ms/180ms post-switch mutations!)
      for (const e of frames.values()) {
        clearTimeout(e.underlayTimer);
        if (e !== nextEntry) {
          e.iframe.classList.remove('is-active', 'is-underlay', 'is-priming', 'is-preraster');
        }
      }

      if (prevEntry && prevEntry !== nextEntry) {
        notifyFrameVisibility(prevPage, false);
      }

      nextEntry.iframe.classList.remove('is-underlay', 'is-priming', 'is-preraster');
      syncFrameThemeAndFont(nextEntry.iframe);
      nextEntry.iframe.classList.add('is-active');
      syncDocumentTitle(nextEntry.iframe);
      notifyFrameVisibility(target.page, true);

      // Pure overlay shared-element Music Capsule <-> Bottom .player-dock pill glide (Desktop full morph; mobile skips heavy overlay for 60fps)
      if (isMusicMorph && !isMobileShell) {
        playMusicCapsuleMorph(morphDirection, musicEntryForMorph?.iframe, {
          capRect: preCapRect,
          coverRect: preCoverRect,
          dockData: preDockData
        });
      }

      // Android / JoyTrans RAM Guard: keep up to 7 tabs warm so pre-rendered tabs switch instantaneously!
      if (isLiteShell) {
        const keep = new Set(['index.html', 'music.html', activePage].filter(Boolean));
        for (const [pg, entry] of [...frames.entries()]) {
          if (!keep.has(pg) && frames.size > 7) {
            try { entry.iframe.remove(); } catch {}
            frames.delete(pg);
          }
        }
      }
    };

    const waitChildPaint = (cb) => {
      try {
        const cw = nextEntry.iframe.contentWindow;
        if (cw && typeof cw.requestAnimationFrame === 'function') {
          cw.requestAnimationFrame(() => cw.requestAnimationFrame(cb));
          return;
        }
      } catch {}
      requestAnimationFrame(() => requestAnimationFrame(cb));
    };

    // Wait for a newly created iframe's first paint before swapping (ZERO cold-load blank flash)
    if (prevEntry && !nextEntry.ready) {
      let swapped = false;
      const done = () => {
        if (swapped) return;
        swapped = true;
        waitChildPaint(commitSwap);
      };
      nextEntry.iframe.addEventListener('load', done, { once: true });
      setTimeout(done, 520);
    } else {
      commitSwap();
    }

    if (!options.skipHistory) {
      try {
        const nextHash = '#/' + target.rel;
        if (location.hash !== nextHash) history.pushState({ url: target.rel }, '', nextHash);
      } catch {}
    }

    // Update Dynamic Island visibility (hide only if no track ever loaded)
    updateIslandVisibility();
  }

  /* ── 6. Dynamic Island Controller ───────────────────────────────────── */
  function fmtTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function updateIslandVisibility() {
    const hasSong = !!musicState.song;
    // Show Dynamic Island whenever a song is loaded & user isn't currently on full music page
    // (or even on music page if playing? Keeping it hidden on music.html avoids duplicate player!)
    const show = hasSong && activePage !== 'music.html';
    elIslandAnchor.hidden = !show;
    if (!show) closeIslandPopover();
  }

  const PLAY_MODE_META = {
    loop: {
      label: '列表循环',
      short: '顺序',
      svg: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>'
    },
    shuffle: {
      label: '随机播放',
      short: '随机',
      svg: '<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>'
    },
    single: {
      label: '单曲循环',
      short: '单曲',
      svg: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="14.5" font-size="8.5" font-weight="bold" text-anchor="middle" fill="currentColor">1</text>'
    }
  };

  function updateIslandPlacement() {
    if (!elHeader || !elDock || !elIslandAnchor || elIslandAnchor.hidden) return;
    // On narrow portrait phones (< 680px wide), float island cleanly centered below header so nothing collides
    if (window.innerWidth < 680) {
      elHeader.classList.add('island-below');
      elIslandAnchor.style.removeProperty('--island-max-w');
      elIsland.classList.remove('is-compact');
      return;
    }
    // On compact landscape phones / tablets (<= 1240px or height <= 540px), the header is pure single-row flex
    // so Prism Dock and Dynamic Island can NEVER overlap — keep island inline cleanly!
    if (window.innerWidth <= 1240 || window.innerHeight <= 540) {
      elHeader.classList.remove('island-below');
      elIslandAnchor.style.removeProperty('--island-max-w');
      elIsland.classList.toggle('is-compact', window.innerWidth < 960);
      captureCapsuleRect();
      return;
    }
    // Always keep the Music Capsule inline in the top bar on desktop by computing exact available room
    // between the centered nav dock and the right-hand utility pills — NEVER dropping onto the office sidebar!
    elHeader.classList.remove('island-below');
    const dockR = elDock.getBoundingClientRect();
    const utilsEl = elHeader.querySelector('.shell-utils');
    const utilsR = utilsEl ? utilsEl.getBoundingClientRect() : null;
    if (dockR.width > 0 && utilsR && utilsR.width > 0) {
      const avail = Math.floor(utilsR.left - dockR.right - 16);
      if (avail >= 108) {
        const clamped = Math.min(220, avail);
        elIslandAnchor.style.setProperty('--island-max-w', `${clamped}px`);
        elIsland.classList.toggle('is-compact', clamped < 156);
        captureCapsuleRect();
        return;
      }
      // Only on genuinely cramped windows where < 108px remains, float cleanly top-center (away from sidebars)
      elIslandAnchor.style.removeProperty('--island-max-w');
      elIsland.classList.remove('is-compact');
      elHeader.classList.add('island-below');
      return;
    }
    elIslandAnchor.style.removeProperty('--island-max-w');
    elIsland.classList.remove('is-compact');
  }

  function renderIslandModeAndVolume() {
    const m = PLAY_MODE_META[musicState.playMode] || PLAY_MODE_META.loop;
    const isAccent = musicState.playMode !== 'loop';
    if (elIpModeBtn) {
      elIpModeBtn.innerHTML = `<svg viewBox="0 0 24 24">${m.svg}</svg>`;
      elIpModeBtn.dataset.tip = `播放顺序：${m.label}`;
      elIpModeBtn.classList.toggle('is-accent', isAccent);
    }
    if (elIpModeTag) elIpModeTag.textContent = m.short;

    const vol = Math.max(0, Math.min(100, Math.round(Number(musicState.volume ?? 50))));
    if (vol > 0) lastNonZeroVolume = vol;
    if (elIpVolume) {
      elIpVolume.value = String(vol);
      elIpVolume.style.setProperty('--vol-pct', `${vol}%`);
    }
    if (elIpVolText) elIpVolText.textContent = `${vol}%`;
    if (elIpMuteBtn) elIpMuteBtn.classList.toggle('is-muted', vol === 0);

    // Sync platform-specific Quality & Sound FX dropdowns in Music Capsule
    if (elIpQualitySelect) {
      if (Array.isArray(musicState.qualityOptions) && musicState.qualityOptions.length) {
        const sig = musicState.qualityOptions.map(o => o.value + ':' + o.label).join('|');
        if (elIpQualitySelect.dataset.sig !== sig) {
          elIpQualitySelect.dataset.sig = sig;
          elIpQualitySelect.innerHTML = musicState.qualityOptions
            .map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
            .join('');
        }
      }
      const curQ = musicState.quality || (() => { try { return localStorage.getItem('shiny.musicQuality') || 'jymaster'; } catch { return 'jymaster'; } })();
      if (elIpQualitySelect.value !== curQ && [...elIpQualitySelect.options].some(o => o.value === curQ)) {
        elIpQualitySelect.value = curQ;
      }
    }
    if (elIpFxSelect) {
      if (Array.isArray(musicState.fxOptions) && musicState.fxOptions.length) {
        const sig = musicState.fxOptions.map(o => o.value + ':' + o.label).join('|');
        if (elIpFxSelect.dataset.sig !== sig) {
          elIpFxSelect.dataset.sig = sig;
          elIpFxSelect.innerHTML = musicState.fxOptions
            .map(o => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`)
            .join('');
        }
      }
      const curFx = musicState.fxPreset || (musicState.fxEnabled ? 'ai_master' : 'off');
      if (elIpFxSelect.value !== curFx && [...elIpFxSelect.options].some(o => o.value === curFx)) {
        elIpFxSelect.value = curFx;
      }
    }
    syncShellMarqueeSelect(elIpQualitySelect);
    syncShellMarqueeSelect(elIpFxSelect);
  }

  function syncShellMarqueeSelect(sel) {
    if (!sel) return;
    let host = sel.closest('.mq-select-shell');
    if (!host) {
      host = document.createElement('span');
      host.className = 'mq-select-shell';
      sel.parentNode.insertBefore(host, sel);
      host.appendChild(sel);
      const view = document.createElement('span');
      view.className = 'mq-select-view';
      view.innerHTML = '<span class="mq-viewport"><span class="mq-text"></span></span><svg class="mq-caret" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
      host.insertBefore(view, sel);
      sel.addEventListener('change', () => syncShellMarqueeSelect(sel));
    }
    const textEl = host.querySelector('.mq-text');
    const vp = host.querySelector('.mq-viewport');
    if (!textEl || !vp) return;
    const label = sel.options[sel.selectedIndex]?.textContent || sel.value || '';
    textEl.textContent = label;
    requestAnimationFrame(() => {
      const overflow = Math.ceil(textEl.scrollWidth - vp.clientWidth);
      if (overflow > 4) {
        host.classList.add('is-marquee');
        textEl.style.setProperty('--mq-shift', `-${overflow + 10}px`);
        textEl.style.setProperty('--mq-dur', `${Math.max(4.2, Math.min(10, (overflow + 40) / 22)).toFixed(1)}s`);
      } else {
        host.classList.remove('is-marquee');
        textEl.style.removeProperty('--mq-shift');
      }
    });
  }

  function cycleShellPlayMode() {
    const order = ['loop', 'shuffle', 'single'];
    const cur = musicState.playMode || 'loop';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    musicState.playMode = next;
    try { localStorage.setItem('shiny.musicPlayMode', next); } catch {}
    renderIslandModeAndVolume();
    withMusicAPI(api => api.setMode?.(next));
  }

  function setShellVolume(pct) {
    const v = Math.max(0, Math.min(100, Math.round(Number(pct))));
    musicState.volume = v;
    try { localStorage.setItem('shiny.musicVolume', String(v)); } catch {}
    renderIslandModeAndVolume();
    withMusicAPI(api => api.setVolume?.(v));
  }

  function renderIsland() {
    const { song, isPlaying, currentTime, duration, lyricJp, lyricZh, isFav } = musicState;
    updateIslandVisibility();
    if (!song) return;

    const cover = song.cover || '/app-icon.png';
    const title = song.title || 'Unknown Track';
    const artist = song.unitName || song.vocalists || '283 Production';
    const accent = song.color || '#f472b6';

    elIsland.style.setProperty('--island-accent', accent);
    elIslandPopover.style.setProperty('--island-accent', accent);

    if (elIslandCover.getAttribute('src') !== cover) elIslandCover.src = cover;
    if (elIpArt.getAttribute('src') !== cover) elIpArt.src = cover;
    updateIslandTitleMarquee(title);
    elIpTitle.textContent = title;
    elIpArtist.textContent = song.titleZh ? `${song.titleZh} · ${artist}` : artist;

    elIsland.classList.toggle('is-playing', !!isPlaying);
    elIslandPopover.classList.toggle('is-playing', !!isPlaying);
    elIpFavBtn.classList.toggle('is-fav', !!isFav);
    const nowPlayingSig = `${isPlaying ? 1 : 0}|${title}|${artist}`;
    if (window.__lastNowPlayingSig !== nowPlayingSig) {
      window.__lastNowPlayingSig = nowPlayingSig;
      const npPayload = { playing: !!isPlaying, title, artist, accent, bpm: Number(song.bpm) || 124 };
      try { localStorage.setItem('shiny.nowPlaying', JSON.stringify(npPayload)); } catch {}
      try {
        window.__companionSyncCh = window.__companionSyncCh || new BroadcastChannel('shiny-companion-sync');
        window.__companionSyncCh.postMessage({ type: 'music-state', state: npPayload });
      } catch {}
    }
    if (window.__lastBroadcastPlaying !== !!isPlaying) {
      window.__lastBroadcastPlaying = !!isPlaying;
      try { localStorage.setItem('shiny.musicPlaying', isPlaying ? '1' : '0'); } catch {}
      const arcEntry = frames.get('arcade.html');
      try { arcEntry?.iframe?.contentWindow?.postMessage({ type: 'shiny-music-state', playing: !!isPlaying }, location.origin); } catch {}
    }

    const dur = duration > 0 ? duration : (song.duration || 180);
    const pct = dur > 0 ? Math.max(0, Math.min(1, currentTime / dur)) : 0;
    const circumference = 100.53;
    elIslandProgressCircle.style.strokeDashoffset = String(circumference * (1 - pct));

    elIpCurTime.textContent = fmtTime(currentTime);
    elIpDurTime.textContent = fmtTime(dur);
    if (!islandSeeking) {
      elIpSeek.value = String((pct * 100).toFixed(1));
    }

    if (lyricJp || lyricZh) {
      elIpLyric.classList.remove('is-empty');
      elIpLyricJp.textContent = lyricJp || '';
      elIpLyricZh.textContent = lyricZh || '';
    } else {
      elIpLyric.classList.add('is-empty');
    }
    renderIslandModeAndVolume();
    // Render Music Capsule upcoming queue (collapsed completely by default; expanded via top playlist icon!)
    if (elIpQueueSection && elIpQueueList) {
      const items = Array.isArray(musicState.queuePreview) ? musicState.queuePreview : [];
      if (elIpQueueTopBtn) {
        elIpQueueTopBtn.hidden = !items.length;
        elIpQueueTopBtn.dataset.tip = ipQueueExpanded ? '收起待播列表' : (musicState.queueTitle ? `展开：${musicState.queueTitle}` : '展开待播列表');
      }
      elIpQueueSection.hidden = !items.length || !ipQueueExpanded;
      if (elIpQueueTitle && musicState.queueTitle) elIpQueueTitle.textContent = musicState.queueTitle;
      const sig = `${musicState.queueTitle || ''}|${items.map(x => `${x.index}:${x.isCurrent ? 1 : 0}:${x.id}`).join(',')}`;
      if (items.length && sig !== lastIpQueueSig) {
        lastIpQueueSig = sig;
        const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        elIpQueueList.innerHTML = items.map(it => `
          <button type="button" class="ip-queue-row ${it.isCurrent ? 'is-current' : ''}" data-q-idx="${it.index}" data-q-id="${esc(it.id)}">
            <img src="${esc(it.cover || '/app-icon.png')}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='/app-icon.png'">
            <span class="ip-queue-text">
              <strong>${it.isCurrent ? '▶ ' : ''}${esc(it.title)}</strong>
              <small>${esc(it.artist)}</small>
            </span>
          </button>
        `).join('');
        elIpQueueList.querySelectorAll('.ip-queue-row').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = Number(btn.dataset.qIdx);
            const id = btn.dataset.qId || '';
            withMusicAPI(api => api.playAtIndex?.(idx, id));
          });
        });
      }
    }
    requestAnimationFrame(updateIslandPlacement);
  }

  function openIslandPopover() {
    // Close weather popover if open
    const envPop = $('#envPopover');
    if (envPop && !envPop.hidden) {
      envPop.hidden = true;
      $('#shellEnvCapsule')?.setAttribute('aria-expanded', 'false');
    }
    islandPopoverOpen = true;
    elIsland.classList.add('is-expanded-parent');
    elIslandPopover.classList.remove('is-closing');
    elIslandPopover.classList.add('is-open');
    elIslandPopover.setAttribute('aria-hidden', 'false');
    syncPopBackdrop();
  }

  function closeIslandPopover() {
    if (!islandPopoverOpen && !elIslandPopover.classList.contains('is-open')) return;
    islandPopoverOpen = false;
    elIsland.classList.remove('is-expanded-parent');
    elIslandPopover.classList.remove('is-open');
    elIslandPopover.classList.add('is-closing');
    elIslandPopover.setAttribute('aria-hidden', 'true');
    syncPopBackdrop();
  }

  async function withMusicAPI(fn) {
    let entry = frames.get('music.html');
    if (!entry) {
      entry = getOrCreateFrame(parseTarget('music.html'), true);
    }
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const api = entry.iframe.contentWindow?.__musicAPI;
      if (api) return fn(api);
      await new Promise(r => setTimeout(r, 60));
    }
  }

  let lastCapsuleRect = null;
  let lastCapsuleCoverRect = null;
  function captureCapsuleRect() {
    if (!elIsland) return lastCapsuleRect;
    const r = elIsland.getBoundingClientRect();
    if (r.width > 24 && r.height > 12) {
      lastCapsuleRect = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }
    return lastCapsuleRect;
  }

  function captureCapsuleCoverRect() {
    const img = elIslandCover || elIslandCoverBtn;
    if (!img) return lastCapsuleCoverRect;
    const r = img.getBoundingClientRect();
    if (r.width > 10 && r.height > 10) {
      lastCapsuleCoverRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
    return lastCapsuleCoverRect;
  }

  function measureMusicDockRect(musicIframe) {
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;
    try {
      const doc = musicIframe?.contentDocument;
      if (doc) {
        const dockEl = doc.querySelector('.player-dock');
        const thumbEl = doc.getElementById('dockThumbImg');
        if (dockEl) {
          const dr = dockEl.getBoundingClientRect();
          if (dr.width > 120 && dr.height > 36) {
            const tr = thumbEl?.getBoundingClientRect?.();
            return {
              dock: { left: dr.left, top: dr.top, width: dr.width, height: dr.height },
              thumb: (tr && tr.width > 16 && tr.height > 16)
                ? { left: tr.left, top: tr.top, width: tr.width, height: tr.height }
                : { left: dr.left + 16, top: dr.top + Math.max(8, (dr.height - 42) / 2), width: 42, height: 42 }
            };
          }
        }
      }
    } catch {}
    const w = Math.min(960, Math.round(vw - 48));
    const h = 84;
    const left = Math.round((vw - w) / 2);
    const top = Math.round(vh - h - 16);
    return {
      dock: { left, top, width: w, height: h },
      thumb: { left: left + 18, top: top + 14, width: 42, height: 42 }
    };
  }

  // Zero-flicker shared-element Music Capsule <-> Bottom Player Dock pill glide (pure GPU overlay ONLY — NEVER touches any <iframe>!)
  let activeMorphNodes = [];
  let absorbTimer = 0;
  function playMusicCapsuleMorph(direction, musicIframe, cached = {}) {
    try {
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced || !musicState.song) return;

      // Clean any previous morph overlays immediately
      for (const n of activeMorphNodes) {
        try { n.remove(); } catch {}
      }
      activeMorphNodes = [];

      const run = () => {
        const vw = window.innerWidth || 1280;
        const cap = (direction === 'to-dock' ? (cached.capRect || captureCapsuleRect()) : (captureCapsuleRect() || cached.capRect))
          || { left: vw - 290, top: 14, width: 168, height: 38 };
        const cov = (direction === 'to-dock' ? (cached.coverRect || captureCapsuleCoverRect()) : (captureCapsuleCoverRect() || cached.coverRect))
          || { left: cap.left + 6, top: cap.top + Math.max(4, (cap.height - 28) / 2), width: 28, height: 28 };
        const measured = (direction === 'to-capsule' ? cached.dockData : null) || measureMusicDockRect(musicIframe);
        const dock = measured.dock;
        const thumb = measured.thumb;

        const accent = musicState.song.color || '#f472b6';
        const coverSrc = musicState.song.cover || '/app-icon.png';

        // Layer 1: Pill-to-Pill Glide Ghost (Top-Right Music Capsule <-> Bottom .player-dock Bar, NOT fullscreen!)
        const pill = document.createElement('div');
        pill.className = 'music-morph-ghost';
        pill.setAttribute('aria-hidden', 'true');
        pill.style.setProperty('--morph-accent', accent);
        pill.style.width = `${Math.round(dock.width)}px`;
        pill.style.height = `${Math.round(dock.height)}px`;
        pill.style.transformOrigin = 'top left';
        pill.innerHTML = '<span class="mmg-sheen"></span>';

        const sx = Math.max(0.08, cap.width / Math.max(1, dock.width));
        const sy = Math.max(0.22, cap.height / Math.max(1, dock.height));
        const atCap = `translate3d(${cap.left.toFixed(1)}px, ${cap.top.toFixed(1)}px, 0) scale3d(${sx.toFixed(4)}, ${sy.toFixed(4)}, 1)`;
        const atDock = `translate3d(${dock.left.toFixed(1)}px, ${dock.top.toFixed(1)}px, 0) scale3d(1, 1, 1)`;

        // Layer 2: Shared-Element Cover Thumbnail gliding directly into #dockThumbImg <-> Capsule Cover
        const art = document.createElement('img');
        art.className = 'music-morph-art-ghost';
        art.setAttribute('aria-hidden', 'true');
        art.referrerPolicy = 'no-referrer';
        art.src = coverSrc;
        art.onerror = () => { art.src = '/app-icon.png'; };

        const artBaseSize = Math.max(32, Math.round(thumb.width));
        art.style.width = `${artBaseSize}px`;
        art.style.height = `${artBaseSize}px`;
        art.style.transformOrigin = 'top left';

        const covScale = Math.max(0.35, cov.width / artBaseSize);
        const toCovTransform = `translate3d(${cov.left.toFixed(1)}px, ${cov.top.toFixed(1)}px, 0) scale(${covScale.toFixed(4)})`;
        const toThumbTransform = `translate3d(${thumb.left.toFixed(1)}px, ${thumb.top.toFixed(1)}px, 0) scale(1)`;

        document.body.appendChild(pill);
        document.body.appendChild(art);
        activeMorphNodes.push(pill, art);

        const cleanupNode = (el) => {
          try { el.remove(); } catch {}
          activeMorphNodes = activeMorphNodes.filter(x => x !== el);
        };

        if (direction === 'to-dock') {
          const pillAnim = pill.animate([
            { transform: atCap, opacity: 0.96 },
            { transform: atDock, opacity: 0.92, offset: 0.78 },
            { transform: atDock, opacity: 0 }
          ], {
            duration: 360,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards'
          });
          const artAnim = art.animate([
            { transform: toCovTransform, borderRadius: '50%', opacity: 1 },
            { transform: toThumbTransform, borderRadius: '10px', opacity: 0.98, offset: 0.78 },
            { transform: toThumbTransform, borderRadius: '10px', opacity: 0 }
          ], {
            duration: 360,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards'
          });
          pillAnim.finished.then(() => cleanupNode(pill), () => cleanupNode(pill));
          artAnim.finished.then(() => cleanupNode(art), () => cleanupNode(art));
          setTimeout(() => { cleanupNode(pill); cleanupNode(art); }, 440);
        } else {
          const pillAnim = pill.animate([
            { transform: atDock, opacity: 0.92 },
            { transform: atCap, opacity: 0.96, offset: 0.82 },
            { transform: atCap, opacity: 0 }
          ], {
            duration: 320,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards'
          });
          const artAnim = art.animate([
            { transform: toThumbTransform, borderRadius: '10px', opacity: 0.96 },
            { transform: toCovTransform, borderRadius: '50%', opacity: 1, offset: 0.82 },
            { transform: toCovTransform, borderRadius: '50%', opacity: 0 }
          ], {
            duration: 320,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards'
          });
          pillAnim.finished.then(() => cleanupNode(pill), () => cleanupNode(pill));
          artAnim.finished.then(() => cleanupNode(art), () => cleanupNode(art));
          setTimeout(() => { cleanupNode(pill); cleanupNode(art); }, 400);

          // Tactile Apple Dynamic Island liquid swallow-bounce right as the pill docks back into top capsule
          if (elIsland) {
            clearTimeout(absorbTimer);
            elIsland.classList.remove('is-absorbing');
            absorbTimer = setTimeout(() => {
              requestAnimationFrame(() => {
                if (!elIsland || elIslandAnchor.hidden) return;
                elIsland.classList.add('is-absorbing');
                setTimeout(() => elIsland.classList.remove('is-absorbing'), 460);
              });
            }, 220);
          }
        }
      };

      // For 'to-capsule', wait 1 rAF so updateIslandVisibility() has unhidden #islandAnchor and we measure its exact rect
      if (direction === 'to-capsule') requestAnimationFrame(run);
      else run();
    } catch {}
  }

  function setupIsland() {
    // Music Capsule (Dynamic Island) enabled by default on launch
    try {
      if (localStorage.getItem('shiny.bgMusicEnabled') === null) {
        localStorage.setItem('shiny.bgMusicEnabled', 'true');
      }
      const enabled = localStorage.getItem('shiny.bgMusicEnabled') !== 'false';
      const saved = JSON.parse(localStorage.getItem('shiny.bgMusicCurrentSong') || 'null');
      const savedMode = localStorage.getItem('shiny.musicPlayMode');
      if (savedMode === 'shuffle' || savedMode === 'single' || savedMode === 'loop') {
        musicState.playMode = savedMode;
      }
      const savedVol = localStorage.getItem('shiny.musicVolume');
      if (savedVol !== null && savedVol !== '' && Number.isFinite(Number(savedVol))) {
        musicState.volume = Math.max(0, Math.min(100, Math.round(Number(savedVol))));
      }
      if (enabled) {
        musicState.song = (saved && saved.title) ? saved : {
          title: 'Spread the Wings!!',
          titleZh: '283 音乐馆',
          vocalists: '283 Production',
          cover: '/app-icon.png',
          duration: 240
        };
        musicState.isPlaying = false;
        musicState.duration = musicState.song.duration || 180;
        renderIsland();
      }
    } catch {}

    let lastPopToggleTime = 0;
    const togglePop = (e) => {
      if (e.target.closest('#islandMiniNext') || e.target.closest('#islandMiniPlay') || e.target.closest('#islandCoverBtn')) return;
      e.stopPropagation();
      const now = Date.now();
      if (now - lastPopToggleTime < 280) return;
      lastPopToggleTime = now;
      if (islandPopoverOpen) closeIslandPopover();
      else openIslandPopover();
    };

    // Clicking the vinyl record / cover art jumps directly into full-screen music hall!
    const jumpToMusicFromCover = (e) => {
      e.stopPropagation();
      e.preventDefault();
      closeIslandPopover();
      navigate('music.html');
    };
    elIslandCoverBtn?.addEventListener('click', jumpToMusicFromCover);

    elIsland.addEventListener('click', togglePop);
    elIslandInfoBtn?.addEventListener('click', togglePop);

    // Double-clicking the capsule jumps directly to music.html!
    elIsland.addEventListener('dblclick', (e) => {
      if (e.target.closest('#islandMiniNext') || e.target.closest('#islandMiniPlay')) return;
      e.stopPropagation();
      closeIslandPopover();
      navigate('music.html');
    });

    // Clicking the song title / artist / cover inside the Music Capsule jumps straight to music.html!
    const jumpToMusicHall = (e) => {
      e.stopPropagation();
      closeIslandPopover();
      navigate('music.html');
    };
    elIpTitle?.addEventListener('click', jumpToMusicHall);
    elIpArtist?.addEventListener('click', jumpToMusicHall);
    elIpArt?.addEventListener('click', jumpToMusicHall);

    // 2-in-1 Quality & Sound FX compact toggle button (replaces redundant Open Music Hall icon to shorten capsule!)
    const elIpTuneToggleBtn = $('#ipTuneToggleBtn');
    const elIpAudioTuning = $('#ipAudioTuning');
    elIpTuneToggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!elIpAudioTuning) return;
      const willOpen = elIpAudioTuning.hidden;
      elIpAudioTuning.hidden = !willOpen;
      elIpTuneToggleBtn.classList.toggle('is-active', willOpen);
      elIpTuneToggleBtn.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) {
        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
      }
    });

    elIslandMiniNext?.addEventListener('click', (e) => {
      e.stopPropagation();
      withMusicAPI(api => api.next());
    });
    elIslandMiniPlay.addEventListener('click', (e) => {
      e.stopPropagation();
      withMusicAPI(api => api.togglePlay());
    });
    elIpModeBtn?.addEventListener('click', () => cycleShellPlayMode());
    elIpPlayBtn.addEventListener('click', () => withMusicAPI(api => api.togglePlay()));
    elIpPrevBtn.addEventListener('click', () => withMusicAPI(api => api.prev()));
    elIpNextBtn.addEventListener('click', () => withMusicAPI(api => api.next()));
    elIpFavBtn?.addEventListener('click', () => withMusicAPI(api => api.toggleFav()));
    elIpOpenMusicBtn?.addEventListener('click', () => {
      closeIslandPopover();
      navigate('music.html');
    });

    elIpVolume?.addEventListener('input', () => setShellVolume(elIpVolume.value));
    elIpMuteBtn?.addEventListener('click', () => {
      const cur = Number(musicState.volume ?? 50);
      setShellVolume(cur > 0 ? 0 : (lastNonZeroVolume || 50));
    });
    elIpQualitySelect?.addEventListener('change', () => {
      const q = elIpQualitySelect.value;
      musicState.quality = q;
      try {
        localStorage.setItem('shiny.musicQuality', q);
        localStorage.setItem('shiny.musicQualityExplicit', '1');
      } catch {}
      withMusicAPI(api => api.setQuality?.(q));
    });
    elIpFxSelect?.addEventListener('change', () => {
      const fx = elIpFxSelect.value;
      musicState.fxEnabled = fx !== 'off';
      musicState.fxPreset = fx;
      withMusicAPI(api => api.setFxPreset?.(fx));
    });

    elIpSeek.addEventListener('pointerdown', () => { islandSeeking = true; });
    elIpSeek.addEventListener('change', () => {
      const pct = parseFloat(elIpSeek.value) / 100;
      islandSeeking = false;
      withMusicAPI(api => api.seekPercent(pct));
    });

    // Click ANYWHERE outside (including over the iframe page!) closes popovers immediately
    elPopBackdrop?.addEventListener('pointerdown', (e) => {
      if (Date.now() - lastPopToggleTime < 260) return;
      closeAllPopovers();
    });
    document.addEventListener('pointerdown', (e) => {
      if (Date.now() - lastPopToggleTime < 260) return;
      if (islandPopoverOpen && !e.target.closest('#islandAnchor')) {
        closeIslandPopover();
      }
      const envPop = $('#envPopover');
      if (envPop && !envPop.hidden && !e.target.closest('#envAnchor')) {
        envPop.hidden = true;
        $('#shellEnvCapsule')?.setAttribute('aria-expanded', 'false');
        syncPopBackdrop();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAllPopovers();
    });
    window.addEventListener('resize', () => requestAnimationFrame(updateIslandPlacement));
    if (typeof ResizeObserver !== 'undefined') {
      const iro = new ResizeObserver(() => updateIslandPlacement());
      iro.observe(elHeader);
      iro.observe(elDock);
    }
  }

  /* ── 7. Atmosphere Theme Toggle + Auto Sunrise/Sunset Day-Night Switch ── */
  let themeSyncTimer = 0;
  let themeFreezeTimer = 0;

  // NOAA solar equation for accurate daily sunrise/sunset (defaults to local timezone longitude, ~35°N)
  function computeSunTimes(date = new Date()) {
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((date - startOfYear) / 86400000);
    const tzHours = -date.getTimezoneOffset() / 60; // e.g. +8 for China
    const lat = 35.0; // Central/Eastern China default latitude
    const lon = tzHours * 15 - 4; // ~116°E for UTC+8
    const rad = Math.PI / 180;
    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
    const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
    const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
    const cosHa = (Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl))) - Math.tan(lat * rad) * Math.tan(decl);
    const clamped = Math.max(-1, Math.min(1, cosHa));
    const haDeg = Math.acos(clamped) / rad;
    const sunriseMin = Math.round(720 - 4 * (lon + haDeg) - eqtime + tzHours * 60);
    const sunsetMin = Math.round(720 - 4 * (lon - haDeg) - eqtime + tzHours * 60);
    const fmt = (m) => {
      const mm = ((m % 1440) + 1440) % 1440;
      return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
    };
    return { sunriseMin, sunsetMin, sunriseStr: fmt(sunriseMin), sunsetStr: fmt(sunsetMin) };
  }

  function isAutoThemeEnabled() {
    try { return localStorage.getItem('shiny.autoTheme') !== '0'; } catch { return true; }
  }

  function getSolarSlot(date = new Date()) {
    const sun = computeSunTimes(date);
    const nowMin = date.getHours() * 60 + date.getMinutes();
    const isDay = nowMin >= sun.sunriseMin && nowMin < sun.sunsetMin;
    const dayKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return { theme: isDay ? 'light' : 'dark', slot: `${dayKey}:${isDay ? 'day' : 'night'}`, sun };
  }

  function applySolarThemeIfNeeded(immediateAll = false) {
    if (!isAutoThemeEnabled()) return;
    const { theme, slot } = getSolarSlot(new Date());
    try {
      if (localStorage.getItem('shiny.themeManualSlot') === slot) return;
    } catch {}
    if ((document.documentElement.dataset.theme || 'light') !== theme) {
      setTheme(theme, immediateAll);
    }
  }

  function setAutoTheme(enabled) {
    try {
      localStorage.setItem('shiny.autoTheme', enabled ? '1' : '0');
      if (enabled) localStorage.removeItem('shiny.themeManualSlot');
    } catch {}
    if (enabled) applySolarThemeIfNeeded(false);
  }

  let themeHiddenQueueTimer = 0;

  function setTheme(theme, immediateAll = false, gentleHome = false, holdFreezeMs = 0) {
    const next = theme === 'dark' ? 'dark' : 'light';
    const root = document.documentElement;
    const activeEntry = frames.get(activePage);
    const activeDoc = activeEntry?.iframe?.contentDocument;

    if (gentleHome) {
      // Gentle slow crossfade for Home office & top shell bar (no abrupt snap!)
      root.classList.remove('is-theme-switching');
      root.classList.add('is-theme-gentle');
    } else {
      // Freeze per-card CSS transitions on dense gallery pages during theme swap
      root.classList.add('is-theme-switching');
      try { activeDoc?.documentElement?.classList.add('is-theme-switching'); } catch {}
    }

    root.dataset.theme = next;
    try { localStorage.setItem('shiny.theme', next); } catch {}

    if (activeEntry) {
      syncFrameThemeAndFont(activeEntry.iframe);
      try {
        activeEntry.iframe.contentWindow?.postMessage({ type: 'shiny-shell-theme', theme: next }, location.origin);
      } catch {}
    }

    const releaseFreeze = () => {
      root.classList.remove('is-theme-switching', 'is-theme-gentle');
      if (activeDoc?.documentElement) {
        try { activeDoc.documentElement.classList.remove('is-theme-switching'); } catch {}
      }
    };

    clearTimeout(themeFreezeTimer);
    themeFreezeTimer = setTimeout(releaseFreeze, holdFreezeMs > 0 ? holdFreezeMs : (gentleHome ? 1450 : 580));

    // Sync hidden pooled iframes AFTER the visible theme animation finishes, staggered 1-by-1 so ZERO main-thread freeze occurs!
    // (If user switches to any hidden tab sooner, commitSwap() already calls syncFrameThemeAndFont() immediately.)
    clearTimeout(themeSyncTimer);
    clearTimeout(themeHiddenQueueTimer);
    const hiddenKeys = [...frames.keys()].filter(k => k !== activePage);
    const syncOneHidden = (pageKey) => {
      const entry = frames.get(pageKey);
      if (!entry?.iframe) return;
      const docEl = entry.iframe.contentDocument?.documentElement;
      if (docEl && docEl.dataset.theme === next) return;
      try { docEl?.classList.add('is-theme-switching'); } catch {}
      syncFrameThemeAndFont(entry.iframe);
      try {
        entry.iframe.contentWindow?.postMessage({ type: 'shiny-shell-theme', theme: next }, location.origin);
      } catch {}
      setTimeout(() => {
        try { entry.iframe.contentDocument?.documentElement?.classList.remove('is-theme-switching'); } catch {}
      }, 60);
    };
    if (immediateAll) {
      for (const k of hiddenKeys) syncOneHidden(k);
    } else if (hiddenKeys.length) {
      const startDelay = holdFreezeMs > 0 ? holdFreezeMs + 80 : (gentleHome ? 1520 : 620);
      const stepHidden = (idx) => {
        if (idx >= hiddenKeys.length || root.dataset.theme !== next) return;
        const run = () => {
          if (root.dataset.theme !== next) return;
          syncOneHidden(hiddenKeys[idx]);
          themeHiddenQueueTimer = setTimeout(() => stepHidden(idx + 1), 140);
        };
        if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 300 });
        else run();
      };
      themeSyncTimer = setTimeout(() => stepHidden(0), startDelay);
    }
    return releaseFreeze;
  }

  function setupUtils() {
    applySolarThemeIfNeeded(true);
    setInterval(() => applySolarThemeIfNeeded(false), 60000);

    elBtnTheme.addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      // Record manual override for current day/night period so auto-theme won't fight the user until next sunrise/sunset
      try { localStorage.setItem('shiny.themeManualSlot', getSolarSlot(new Date()).slot); } catch {}
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // On Home (index.html): keep the dreamy 1.45s slow crossfade!
      if (activePage === 'index.html' || reduced) {
        setTheme(next, false, !reduced);
        return;
      }
      // On all other pages: smooth GPU circular ripple expanding outward from the theme button!
      if (typeof document.startViewTransition === 'function') {
        try {
          const rect = elBtnTheme.getBoundingClientRect();
          const x = Math.round(rect.left + rect.width / 2);
          const y = Math.round(rect.top + rect.height / 2);
          const endRadius = Math.ceil(Math.hypot(
            Math.max(x, (window.innerWidth || 1280) - x),
            Math.max(y, (window.innerHeight || 720) - y)
          ));
          let releaseFn = null;
          const vt = document.startViewTransition(() => {
            releaseFn = setTheme(next, false, false, 600);
          });
          vt.ready.then(() => {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`
                ]
              },
              {
                duration: 500,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                pseudoElement: '::view-transition-new(root)'
              }
            );
          }).catch(() => {});
          vt.finished.finally(() => {
            clearTimeout(themeFreezeTimer);
            if (typeof releaseFn === 'function') releaseFn();
          });
          return;
        } catch {}
      }
      setTheme(next, false, false, 160);
    });

    elBtnContinue.addEventListener('click', () => {
      let recent = [];
      try {
        recent = JSON.parse(window.desktop?.getState()?.recent || localStorage.getItem('recent') || '[]');
      } catch {}
      const target = recent[0]
        ? `guide.html?story=${encodeURIComponent(recent[0])}#archive`
        : 'guide.html?mode=recent#archive';
      navigate(target);
    });

    elBtnSpotlight.addEventListener('click', openSpotlight);
  }

  /* ── 8. Apple macOS Spotlight Command Palette (Ctrl+K) ──────────────── */
  let spDataLoaded = false;
  let spIdols = [];
  let spSongs = [];
  let spItems = [];
  let spSelected = 0;

  async function ensureSpotlightData() {
    if (spDataLoaded) return;
    spDataLoaded = true;
    try {
      const [portraitsRes, musicRes, frRes] = await Promise.allSettled([
        fetch('/portraits.json').then(r => r.ok ? r.json() : null),
        fetch('/music-catalog.json').then(r => r.ok ? r.json() : null),
        fetch('/franchise-catalogs.json').then(r => r.ok ? r.json() : null)
      ]);
      if (portraitsRes.status === 'fulfilled' && portraitsRes.value) {
        const raw = portraitsRes.value;
        const list = Array.isArray(raw) ? raw : Object.values(raw);
        spIdols = list.filter(x => x && (x.name || x.chinese || x.jp)).map(x => ({
          name: x.chinese || x.name || x.jp,
          unit: x.unit || x.group || '283 Production',
          portrait: (x.path || x.portrait) ? ('/asset-original/' + (x.path || x.portrait)) : '/app-icon.png'
        }));
      }
      const seen = new Set();
      const pushSongs = (arr) => {
        if (!Array.isArray(arr)) return;
        for (const s of arr) {
          if (!s || !s.title || seen.has(s.id || s.title)) continue;
          seen.add(s.id || s.title);
          spSongs.push(s);
        }
      };
      if (musicRes.status === 'fulfilled' && musicRes.value) {
        pushSongs(Array.isArray(musicRes.value) ? musicRes.value : musicRes.value.songs);
      }
      if (frRes.status === 'fulfilled' && frRes.value && typeof frRes.value === 'object') {
        for (const val of Object.values(frRes.value)) {
          pushSongs(val?.songs);
        }
      }
    } catch {}
  }

  function openSpotlight() {
    closeIslandPopover();
    elSpBackdrop.hidden = false;
    elSpInput.value = '';
    spSelected = 0;
    renderSpotlight('');
    requestAnimationFrame(() => elSpInput.focus());
    ensureSpotlightData().then(() => {
      if (!elSpBackdrop.hidden) renderSpotlight(elSpInput.value);
    });
  }

  function closeSpotlight() {
    elSpBackdrop.hidden = true;
  }

  function renderSpotlight(query) {
    const q = (query || '').trim().toLowerCase();
    const groups = [];
    spItems = [];

    // 1. Modules
    const modMatches = MODULES.filter(m => !q || m.label.toLowerCase().includes(q) || m.tip.toLowerCase().includes(q) || m.page.includes(q));
    if (modMatches.length) {
      groups.push({
        title: '前往模块',
        items: modMatches.map(m => ({
          icon: m.icon,
          title: m.tip,
          sub: m.page,
          badge: '模块',
          run: () => navigate(m.page)
        }))
      });
    }

    // 2. Quick Actions
    const actions = [
      {
        title: document.documentElement.dataset.theme === 'dark' ? '切换至晨光琉璃（浅色）' : '切换至星夜剧场（深色）',
        sub: '外观氛围',
        badge: '外观',
        icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2"/></svg>',
        run: () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
      },
      {
        title: '继续阅读最近剧情',
        sub: '剧情馆 · 最近记录',
        badge: '直达',
        icon: '<svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
        run: () => elBtnContinue.click()
      }
    ].filter(a => !q || a.title.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q));
    if (actions.length && (!q || q.length <= 6)) {
      groups.push({ title: '快捷操作', items: actions });
    }

    // 3. Idols
    if (spIdols.length && q) {
      const idolMatches = spIdols
        .filter(i => i.name.toLowerCase().includes(q) || (i.unit || '').toLowerCase().includes(q))
        .slice(0, 6);
      if (idolMatches.length) {
        groups.push({
          title: '283 偶像',
          items: idolMatches.map(i => ({
            img: i.portrait,
            title: i.name,
            sub: `${i.unit} · 查看她的剧情与卡片`,
            badge: '剧情',
            run: () => navigate(`guide.html?idol=${encodeURIComponent(i.name)}#archive`)
          }))
        });
      }
    }

    // 4. Songs (Play directly in Dynamic Island!)
    if (spSongs.length && q) {
      const songMatches = spSongs
        .filter(s =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.titleZh || '').toLowerCase().includes(q) ||
          (s.vocalists || '').toLowerCase().includes(q) ||
          (s.unitName || '').toLowerCase().includes(q)
        )
        .slice(0, 8);
      if (songMatches.length) {
        groups.push({
          title: '即刻点播曲目',
          items: songMatches.map(s => ({
            img: s.cover || '/app-icon.png',
            title: s.title,
            sub: `${s.titleZh ? s.titleZh + ' · ' : ''}${s.unitName || s.vocalists || '283PRO'}`,
            badge: '▶ 播放',
            run: () => {
              withMusicAPI(api => api.playSongById(s.id, s));
            }
          }))
        });
      }
    }

    if (!groups.length) {
      elSpResults.innerHTML = '<div class="sp-empty">未找到匹配结果，试试输入偶像名、歌名或模块名</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    for (const g of groups) {
      const heading = document.createElement('div');
      heading.className = 'sp-group-title';
      heading.textContent = g.title;
      frag.appendChild(heading);

      for (const item of g.items) {
        const idx = spItems.length;
        spItems.push(item);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sp-item' + (idx === spSelected ? ' is-selected' : '');
        btn.dataset.idx = String(idx);
        const thumbHtml = item.img
          ? `<img src="${item.img}" alt="" loading="lazy">`
          : item.icon;
        btn.innerHTML = `
          <span class="sp-thumb">${thumbHtml}</span>
          <span class="sp-item-text">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.sub)}</small>
          </span>
          <span class="sp-badge">${escapeHtml(item.badge)}</span>
        `;
        btn.addEventListener('mouseenter', () => {
          spSelected = idx;
          highlightSpotlightSelection();
        });
        btn.addEventListener('click', () => {
          closeSpotlight();
          item.run();
        });
        frag.appendChild(btn);
      }
    }

    elSpResults.replaceChildren(frag);
    if (spSelected >= spItems.length) spSelected = 0;
    highlightSpotlightSelection();
  }

  function highlightSpotlightSelection() {
    elSpResults.querySelectorAll('.sp-item').forEach((el, i) => {
      const sel = i === spSelected;
      el.classList.toggle('is-selected', sel);
      if (sel) el.scrollIntoView({ block: 'nearest' });
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function setupSpotlight() {
    elSpBackdrop.addEventListener('click', (e) => {
      if (e.target === elSpBackdrop) closeSpotlight();
    });

    elSpInput.addEventListener('input', () => {
      spSelected = 0;
      renderSpotlight(elSpInput.value);
    });

    elSpInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (spItems.length) {
          spSelected = (spSelected + 1) % spItems.length;
          highlightSpotlightSelection();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (spItems.length) {
          spSelected = (spSelected - 1 + spItems.length) % spItems.length;
          highlightSpotlightSelection();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = spItems[spSelected];
        if (item) {
          closeSpotlight();
          item.run();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeSpotlight();
      }
    });
  }

  /* ── 9. Global Keyboard Shortcuts & Message Bridge ──────────────────── */
  let currentZoomFactor = (() => {
    try {
      const v = parseFloat(localStorage.getItem('shiny.zoomFactor'));
      return (Number.isFinite(v) && v >= 0.7 && v <= 2.2) ? v : 1.0;
    } catch { return 1.0; }
  })();
  let zoomToastTimer = 0;
  function showZoomToast(text) {
    if (!elTip) return;
    clearTimeout(zoomToastTimer);
    elTip.textContent = text;
    elTip.style.left = `${window.innerWidth / 2}px`;
    elTip.style.top = `64px`;
    elTip.classList.add('is-visible');
    zoomToastTimer = setTimeout(() => {
      elTip.classList.remove('is-visible');
    }, 1200);
  }
  function applyZoom(factor, notify = true) {
    const clamped = Math.max(0.7, Math.min(2.0, Math.round(factor * 100) / 100));
    currentZoomFactor = clamped;
    try { localStorage.setItem('shiny.zoomFactor', String(clamped)); } catch {}
    if (window.desktop?.setZoomFactor) {
      window.desktop.setZoomFactor(clamped);
    } else {
      document.documentElement.style.zoom = clamped;
    }
    try {
      for (const entry of frames.values()) {
        if (entry.iframe?.contentWindow) {
          entry.iframe.contentWindow.postMessage({ type: 'shiny-set-zoom', zoom: clamped }, location.origin);
        }
      }
    } catch {}
    if (notify) {
      showZoomToast(`界面缩放: ${Math.round(clamped * 100)}% (Ctrl+0 恢复默认)`);
    }
  }
  if (currentZoomFactor !== 1.0) {
    applyZoom(currentZoomFactor, false);
  }

  function handleKeyShortcut(e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
      e.preventDefault();
      applyZoom(currentZoomFactor + 0.1);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
      e.preventDefault();
      applyZoom(currentZoomFactor - 0.1);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') {
      e.preventDefault();
      applyZoom(1.0);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (elSpBackdrop.hidden) openSpotlight();
      else closeSpotlight();
      return;
    }
    if (e.key === 'Escape') {
      if (!elSpBackdrop.hidden) { closeSpotlight(); return; }
      if (islandPopoverOpen) { closeIslandPopover(); return; }
    }
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '7') {
      const idx = Number(e.key) - 1;
      if (MODULES[idx]) {
        e.preventDefault();
        navigate(MODULES[idx].page);
      }
    }
  }

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) applyZoom(currentZoomFactor + 0.05);
      else if (e.deltaY > 0) applyZoom(currentZoomFactor - 0.05);
    }
  }, { passive: false });

  window.addEventListener('keydown', handleKeyShortcut);

  function applyIncomingMusicState(partial) {
    const prevPlaying = !!musicState.isPlaying;
    Object.assign(musicState, partial || {});
    renderIsland();
    if (!!musicState.isPlaying !== prevPlaying || musicState.isPlaying) {
      try {
        frames.get('index.html')?.iframe?.contentWindow?.postMessage(
          { type: 'shiny-home-bgm-pause', playing: !!musicState.isPlaying },
          location.origin
        );
      } catch {}
    }
  }

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data) return;
    const msg = e.data;
    if (msg.type === 'shiny-shell-navigate' && msg.url) {
      navigate(msg.url);
    } else if (msg.type === 'shiny-shell-music') {
      applyIncomingMusicState(msg.state);
    } else if (msg.type === 'shiny-home-voice') {
      // Duck playing jukebox music to 25% when an idol speaks on Home, restore smoothly when finished!
      try {
        frames.get('music.html')?.iframe?.contentWindow?.__musicAPI?.setVoiceDuck?.(!!msg.speaking);
      } catch {}
    } else if (msg.type === 'shiny-shell-story-open') {
      pauseMusicPolitely();
      try {
        frames.get('index.html')?.iframe?.contentWindow?.postMessage(
          { type: 'shiny-home-bgm-pause', playing: true },
          location.origin
        );
      } catch {}
    } else if (msg.type === 'shiny-shell-spotlight') {
      openSpotlight();
    } else if (msg.type === 'shiny-shell-chrome-hidden') {
      elHeader.classList.toggle('is-hidden', !!msg.hidden);
    } else if (msg.type === 'shiny-auto-theme') {
      setAutoTheme(!!msg.enabled);
    }
  });

  window.addEventListener('popstate', (e) => {
    const hashUrl = location.hash.startsWith('#/') ? location.hash.slice(2) : (e.state?.url || 'index.html');
    navigate(hashUrl, { skipHistory: true });
  });

  /* ── 10. Public Shell API + Mobile Touch Swipe Helper ───────────────── */
  let elSwipeHint = null;
  function getNeighborModule(delta) {
    const idx = MODULES.findIndex(m => m.page === activePage);
    if (idx < 0) return null;
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= MODULES.length) return null;
    return MODULES[nextIdx];
  }

  function stepPage(delta) {
    const targetMod = getNeighborModule(delta);
    if (!targetMod) return false;
    setSwipeHint(0, '');
    navigate(targetMod.page);
    return true;
  }

  function setSwipeHint(dir, label = '') {
    if (!elSwipeHint) {
      elSwipeHint = document.createElement('div');
      elSwipeHint.className = 'swipe-page-hint';
      elSwipeHint.id = 'swipePageHint';
      elSwipeHint.setAttribute('aria-hidden', 'true');
      document.body.appendChild(elSwipeHint);
    }
    if (!dir || !label) {
      elSwipeHint.classList.remove('is-visible', 'from-left', 'from-right');
      return;
    }
    elSwipeHint.textContent = dir < 0 ? `‹ ${label}` : `${label} ›`;
    elSwipeHint.classList.toggle('from-left', dir < 0);
    elSwipeHint.classList.toggle('from-right', dir > 0);
    elSwipeHint.classList.add('is-visible');
  }

  // Bind touch swipe on shell host itself (subpage iframes bind matching handler in navigation.js)
  if (isMobileShell || 'ontouchstart' in window || navigator.maxTouchPoints > 0) {
    let sx = 0, sy = 0, st = 0, lock = '', activeSwipe = false;
    const isBlockedTarget = (el) => {
      if (!el || !el.closest) return false;
      return !!el.closest('input, textarea, select, button, .prism-dock, .island-popover.is-open, .env-popover:not([hidden]), .spotlight-backdrop:not([hidden])');
    };
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1 || isBlockedTarget(e.target)) { activeSwipe = false; return; }
      const t = e.touches[0];
      sx = t.clientX; sy = t.clientY; st = Date.now(); lock = ''; activeSwipe = true;
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (!activeSwipe || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (!lock) {
        if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
        lock = Math.abs(dx) > Math.abs(dy) * 1.65 ? 'h' : 'v';
      }
      if (lock !== 'h') return;
      const delta = dx < 0 ? 1 : -1;
      const mod = getNeighborModule(delta);
      if (mod && Math.abs(dx) >= 28) setSwipeHint(delta, mod.label);
      else setSwipeHint(0, '');
    }, { passive: true });
    const endSwipe = (e) => {
      if (!activeSwipe) return;
      activeSwipe = false;
      if (lock === 'h' && e.changedTouches && e.changedTouches.length) {
        const dx = e.changedTouches[0].clientX - sx;
        const dt = Date.now() - st;
        if (Math.abs(dx) >= 68 || (Math.abs(dx) >= 46 && dt < 260)) {
          stepPage(dx < 0 ? 1 : -1);
          return;
        }
      }
      setSwipeHint(0, '');
    };
    window.addEventListener('touchend', endSwipe, { passive: true });
    window.addEventListener('touchcancel', () => { activeSwipe = false; setSwipeHint(0, ''); }, { passive: true });
  }

  window.__shinyShell = {
    version: '2026.11.20-prism',
    navigate,
    stepPage,
    getNeighborLabel: (delta) => getNeighborModule(delta)?.label || '',
    setSwipeHint,
    openSpotlight,
    setTheme,
    setAutoTheme,
    isAutoThemeEnabled,
    getSunTimes: () => computeSunTimes(new Date()),
    getTheme: () => document.documentElement.dataset.theme || 'light',
    getMusicState: () => musicState,
    activePage: () => activePage,
    activeWindow: () => frames.get(activePage)?.iframe?.contentWindow || window,
    updateMusic(partial) {
      applyIncomingMusicState(partial);
    },
    pauseMusic: pauseMusicPolitely
  };

  /* ── 10.5 Weather · Location · Clock · 283 Calendar Capsule ─────────── */
  function setupEnvCapsule() {
    const capBtn = $('#shellEnvCapsule');
    const pop = $('#envPopover');
    if (!capBtn || !pop) return;

    const BIRTHDAYS = {
      '01-04': '芹泽朝日', '01-16': '三峰结华', '01-31': '斑鸠路加',
      '02-24': '园田智代子', '02-25': '月冈恋钟',
      '03-04': '风野灯织', '03-17': '市川雏菜', '03-25': '田中摩美美',
      '04-11': '铃木羽那', '04-18': '桑山千雪', '04-25': '樱木真乃',
      '05-04': '浅仓透',
      '06-23': '八宫巡', '06-27': '白濑咲耶',
      '07-03': '七草叶月', '07-26': '七草日花', '07-29': '小宫果穗',
      '08-02': '和泉爱依', '08-16': '有栖川夏叶',
      '09-08': '绯田美琴', '09-20': '幽谷雾子',
      '10-02': '郁田春希', '10-19': '杜野凛世', '10-27': '樋口圆香',
      '11-11': '福丸小糸', '11-26': '西城树里',
      '12-04': '黛冬优子', '12-25': '大崎甘奈 · 大崎甜花'
    };
    const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    let calYear = new Date().getFullYear();
    let calMonth = new Date().getMonth();

    function tickClock() {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      const mo = d.getMonth() + 1;
      const dd = d.getDate();
      const wd = WEEKDAYS[d.getDay()];
      const clockEl = $('#envClockText');
      const dateEl = $('#envDateText');
      const bigEl = $('#envPopClockBig');
      if (clockEl) clockEl.textContent = `${hh}:${mm}`;
      if (dateEl) dateEl.textContent = `${mo}/${dd} ${wd}`;
      if (bigEl) bigEl.textContent = `${hh}:${mm}:${ss}`;
    }

    function renderCalendar() {
      const monthTitle = $('#envCalMonth');
      const grid = $('#envCalGrid');
      const note = $('#envCalBdayNote');
      if (!grid) return;
      if (monthTitle) monthTitle.textContent = `${calYear}年 ${calMonth + 1}月`;

      const today = new Date();
      const firstDow = new Date(calYear, calMonth, 1).getDay();
      const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
      const mPad = String(calMonth + 1).padStart(2, '0');
      const cells = [];
      const monthBdays = [];

      for (let i = 0; i < firstDow; i++) cells.push('<span class="env-cal-day is-muted"></span>');
      for (let day = 1; day <= daysInMonth; day++) {
        const dPad = String(day).padStart(2, '0');
        const mmdd = `${mPad}-${dPad}`;
        const bday = BIRTHDAYS[mmdd];
        if (bday) monthBdays.push(`${calMonth + 1}/${day} ${bday}`);
        const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate();
        cells.push(`<span class="env-cal-day ${isToday ? 'is-today' : ''} ${bday ? 'has-bday' : ''}" title="${bday ? '🎂 ' + bday + ' 生日' : ''}">${day}</span>`);
      }
      grid.innerHTML = cells.join('');
      if (note) {
        note.textContent = monthBdays.length
          ? `🎂 本月 283 生日：${monthBdays.join(' · ')}`
          : '本月暂无 283 角色生日';
      }
    }

    async function loadWeather(customCityOverride) {
      let savedCity = '';
      try {
        if (typeof customCityOverride === 'string') {
          savedCity = customCityOverride.trim();
          if (savedCity) localStorage.setItem('shiny.weatherCity', savedCity);
          else localStorage.removeItem('shiny.weatherCity');
        } else {
          savedCity = (localStorage.getItem('shiny.weatherCity') || '').trim();
        }
      } catch {}
      const proxyHint = $('#envProxyHint');
      try {
        const url = savedCity ? `/api/weather?city=${encodeURIComponent(savedCity)}` : '/api/weather';
        const r = await fetch(url);
        const j = await r.json();
        if (!j || !j.ok) {
          if (proxyHint && j?.message) { proxyHint.textContent = j.message; proxyHint.hidden = false; }
          const cityEl = $('#envCityText');
          if (cityEl && !savedCity) cityEl.textContent = '283';
          return;
        }
        const icon = j.isRaining ? '🌧' : (j.isDay === false ? '🌙' : '☀');
        const desc = j.isRaining ? '雨天' : (j.isDay === false ? '夜晚' : '晴朗');
        const city = (j.city || savedCity || '本地').trim();
        const temp = Number.isFinite(j.temp) ? `${j.temp}°` : '--°';
        const wEl = $('#envWeatherText');
        const cEl = $('#envCityText');
        const popCity = $('#envPopCity');
        const popSub = $('#envPopWeatherSub');
        if (wEl) wEl.textContent = `${icon} ${temp}`;
        if (cEl) cEl.textContent = city;
        if (popCity) popCity.textContent = `${city} · ${icon} ${desc} ${temp}C`;
        const sr = j.sunrise ? j.sunrise.slice(11, 16) : '';
        const ss = j.sunset ? j.sunset.slice(11, 16) : '';
        const isDomestic = String(j.source || '').startsWith('domestic');
        const srcTag = savedCity ? '已锁定城市' : (isDomestic ? '国内直连定位' : j.source === 'win-geo' ? '系统定位' : 'IP定位');
        if (popSub) popSub.textContent = (sr && ss ? `日出 ${sr} · 日落 ${ss} · ` : '') + srcTag;

        // Detect Global/TUN VPN timezone mismatch vs PC OS timezone
        const osTz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } })();
        if (proxyHint) {
          if (!savedCity && j.timezone && osTz && j.timezone !== osTz && !isDomestic && j.source !== 'win-geo') {
            proxyHint.textContent = `检测到全局/TUN代理（IP在 ${city}，本机时区 ${osTz}），建议上方输入并锁定你的真实城市`;
            proxyHint.hidden = false;
          } else {
            proxyHint.hidden = true;
          }
        }
        // Notify 283 Office iframe so sunset/rain updates to the same city
        try {
          frames.get('index.html')?.iframe?.contentWindow?.postMessage({ type: 'shiny-weather-city-changed', city: savedCity }, location.origin);
        } catch {}
      } catch {}
    }

    const applyInputCity = () => {
      const val = ($('#envCityInput')?.value || '').trim();
      if (val) loadWeather(val);
    };
    $('#btnEnvCitySet')?.addEventListener('click', applyInputCity);
    $('#envCityInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyInputCity(); });
    $('#btnEnvCityAuto')?.addEventListener('click', () => {
      const inp = $('#envCityInput');
      if (inp) inp.value = '';
      loadWeather('');
    });
    pop.querySelectorAll('.env-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        const inp = $('#envCityInput');
        if (inp) inp.value = ch.dataset.city;
        loadWeather(ch.dataset.city);
      });
    });

    const savedAtmo = (() => { try { return localStorage.getItem('shiny.officeAtmosphere') || 'auto'; } catch { return 'auto'; } })();
    pop.querySelectorAll('.env-atmo-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.atmo === savedAtmo);
      btn.addEventListener('click', () => {
        const mode = btn.dataset.atmo;
        pop.querySelectorAll('.env-atmo-btn').forEach(b => b.classList.toggle('active', b === btn));
        try { localStorage.setItem('shiny.officeAtmosphere', mode); } catch {}
        const homeFrame = frames.get('index.html')?.iframe;
        try { homeFrame?.contentWindow?.postMessage({ type: 'shiny-office-atmosphere', mode }, location.origin); } catch {}
      });
    });

    $('#envCalPrev')?.addEventListener('click', () => {
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCalendar();
    });
    $('#envCalNext')?.addEventListener('click', () => {
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      renderCalendar();
    });

    capBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = pop.hidden;
      if (willOpen && islandPopoverOpen) closeIslandPopover();
      pop.hidden = !willOpen;
      capBtn.setAttribute('aria-expanded', String(willOpen));
      syncPopBackdrop();
      if (willOpen) {
        const now = new Date();
        calYear = now.getFullYear();
        calMonth = now.getMonth();
        renderCalendar();
      }
    });

    document.addEventListener('click', (e) => {
      if (!pop.hidden && !$('#envAnchor')?.contains(e.target)) {
        pop.hidden = true;
        capBtn.setAttribute('aria-expanded', 'false');
      }
    });

    tickClock();
    setInterval(tickClock, 1000);
    renderCalendar();
    loadWeather();
    setInterval(loadWeather, 25 * 60 * 1000);
  }

  /* ── 11. Boot Sequence ──────────────────────────────────────────────── */
  function boot() {
    buildDock();
    setupEnvCapsule();
    setupTooltips();
    setupIsland();
    setupUtils();
    setupSpotlight();

    // Wire 283PRISM Live Stage FX Intensity Toggle (全力拉满 <-> 柔光)
    const btnFx = $('#btnStageFx');
    const syncStageFxBtn = () => {
      const mode = document.documentElement.dataset.stageFx === 'soft' ? 'soft' : 'full';
      if (btnFx) {
        btnFx.classList.toggle('is-on', mode === 'full');
        btnFx.dataset.tip = mode === 'full'
          ? '舞台灯光秀：全力拉满（点击切换柔光）'
          : '舞台灯光秀：柔光模式（点击恢复全力拉满）';
      }
    };
    syncStageFxBtn();
    btnFx?.addEventListener('click', () => {
      const next = document.documentElement.dataset.stageFx === 'soft' ? 'full' : 'soft';
      document.documentElement.dataset.stageFx = next;
      try { localStorage.setItem('shiny.stageFxMode', next); } catch {}
      syncStageFxBtn();
      for (const entry of frames.values()) {
        try { entry.iframe.contentWindow?.postMessage({ type: 'shiny-stage-fx-mode', mode: next }, location.origin); } catch {}
      }
    });

    const params = new URLSearchParams(location.search);
    const hashTarget = location.hash.startsWith('#/') ? location.hash.slice(2) : '';
    const initial = params.get('page') || hashTarget || 'index.html';
    const bootStart = Date.now();
    setBootProgress(18, '正在唤醒 283 事务所…');
    navigate(initial, { skipHistory: true });

    // Hard safety cap (9.2s, strictly < 10s) so serialized boot pre-warms & GPU-rasterizes all tabs cleanly!
    const maxCapTimer = setTimeout(dismissBoot, 9200);

    (async () => {
      try {
        // 1. Preload all 4 official 283 office backgrounds immediately so day/night switch never flashes
        for (const src of [
          'home-assets/office.jpg',
          'home-assets/office-evening.jpg',
          'home-assets/office-night.jpg',
          'home-assets/office-rain.jpg'
        ]) {
          const img = new Image();
          img.decoding = 'async';
          img.src = src;
        }

        // 2. Wait for initial active page (usually Home Office + Spine idol)
        const iframe = await Promise.race([initialFrameLoaded, new Promise(r => setTimeout(() => r(null), 2200))]);
        setBootProgress(32, '正在加载 283 事务所立绘与动效…');
        if (iframe?.contentWindow && initial === 'index.html') {
          await new Promise(resolve => {
            try {
              if (iframe.contentWindow.homeReady || iframe.contentDocument?.querySelector('#idol')?.dataset?.sceneReady === 'true') {
                return resolve();
              }
              const done = () => { clearTimeout(t); resolve(); };
              iframe.contentWindow.addEventListener('home-scene-ready', done, { once: true });
              const t = setTimeout(done, 1600);
            } catch { resolve(); }
          });
        }

        // 3. SERIALIZED (1-at-a-time!) pre-warm + 2-frame GPU pre-rasterization during boot splash!
        //    Why sequential? Chromium limits localhost HTTP/1.1 to 6 connections: loading 1 iframe at a time
        //    gives each tab full bandwidth (zero black screens / zero stalled assets!) AND pre-rasterizes
        //    every tab's GPU layers before the splash lifts, eliminating the first-click stutter completely!
        const isConstrained = document.documentElement.dataset.android === '1' || document.documentElement.dataset.joytrans === '1';
        const prewarmPages = isConstrained
          ? ['index.html', 'music.html']
          : ['index.html', 'music.html', 'guide.html', 'card-gallery.html', 'voice-gallery.html', 'model-picker.html', 'arcade.html', 'custom-story.html'];
        const toWarm = prewarmPages.filter(pg => !frames.has(pg) && pg !== activePage);

        for (let i = 0; i < toWarm.length; i++) {
          if (Date.now() - bootStart > 8200) break;
          const pg = toWarm[i];
          const modLabel = MODULES.find(m => m.page === pg)?.label || pg;
          const pct = Math.min(92, 38 + Math.round(((i + 1) / toWarm.length) * 52));
          setBootProgress(pct, `正在预热 ${modLabel}…`);
          await new Promise(resolve => {
            try {
              const entry = getOrCreateFrame(parseTarget(pg), true);
              if (!entry || !entry.iframe) return resolve();
              let settled = false;
              const finish = () => {
                if (settled) return;
                settled = true;
                // Force 2 compositor frames behind the opaque boot splash so GPU textures & fonts are warm!
                entry.iframe.classList.add('is-preraster');
                requestAnimationFrame(() => requestAnimationFrame(() => {
                  entry.iframe.classList.remove('is-preraster');
                  resolve();
                }));
              };
              entry.iframe.addEventListener('load', () => setTimeout(finish, 90), { once: true });
              setTimeout(finish, 1150);
            } catch { resolve(); }
          });
        }

        // Hover-to-prewarm on Desktop; quiet staggered idle pre-render on Mobile/Huawei so tab switches are instant!
        if (!isConstrained) {
          let hoverWarmTimer = 0;
          for (const [pg, btn] of dockButtons.entries()) {
            btn.addEventListener('pointerenter', (e) => {
              if (e.pointerType !== 'mouse' || frames.has(pg) || pg === activePage) return;
              clearTimeout(hoverWarmTimer);
              hoverWarmTimer = setTimeout(() => {
                if (!frames.has(pg)) {
                  try { getOrCreateFrame(parseTarget(pg), true); } catch {}
                }
              }, 140);
            });
            btn.addEventListener('pointerleave', () => clearTimeout(hoverWarmTimer));
          }
        } else {
          const idleQueue = ['guide.html', 'arcade.html', 'card-gallery.html', 'voice-gallery.html', 'model-picker.html'];
          const warmNextIdle = (idx) => {
            if (idx >= idleQueue.length) return;
            const pg = idleQueue[idx];
            if (frames.has(pg) || pg === activePage) {
              setTimeout(() => warmNextIdle(idx + 1), 300);
              return;
            }
            const run = () => {
              if (document.hidden || frames.has(pg)) { setTimeout(() => warmNextIdle(idx + 1), 1500); return; }
              try {
                const entry = getOrCreateFrame(parseTarget(pg), true);
                if (entry?.iframe) {
                  entry.iframe.addEventListener('load', () => {
                    if (activePage !== pg) notifyFrameVisibility(pg, false);
                    setTimeout(() => warmNextIdle(idx + 1), 1200);
                  }, { once: true });
                } else {
                  setTimeout(() => warmNextIdle(idx + 1), 1200);
                }
              } catch { setTimeout(() => warmNextIdle(idx + 1), 1200); }
            };
            if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 2200 });
            else setTimeout(run, 1200);
          };
          setTimeout(() => warmNextIdle(0), 2200);
        }

        setBootProgress(96, '全部模块准备就绪，即将进入…');
        const elapsed = Date.now() - bootStart;
        if (elapsed < 520) await new Promise(r => setTimeout(r, 520 - elapsed));
      } catch {}
      clearTimeout(maxCapTimer);
      dismissBoot();
    })();
  }

  // Transparent Desktop Companion Launcher + Normal-Mode Hourly Chime Toast
  (() => {
    const btnCompanion = $('#btnCompanion');
    const isMob = document.documentElement.dataset.mobile === '1';
    if (btnCompanion) {
      if (isMob) {
        btnCompanion.hidden = true;
      } else {
        btnCompanion.addEventListener('click', async () => {
          if (window.desktop?.toggleCompanion) {
            try {
              const res = await window.desktop.toggleCompanion();
              btnCompanion.classList.toggle('is-on', !!res?.open);
            } catch {}
          } else {
            window.open('/companion.html', 'shinyCompanion', 'width=360,height=500,resizable=yes');
          }
        });
        try {
          window.desktop?.onCompanionState?.(st => {
            btnCompanion.classList.toggle('is-on', !!st?.open);
          });
        } catch {}
      }
    }

    // Normal-mode gentle hourly chime toast (respects shiny.companionConfig.hourlyChime !== false)
    let lastShellChimeKey = '';
    const showHourlyToast = (hh, text) => {
      let el = document.getElementById('shellHourlyToast');
      if (!el) {
        el = document.createElement('div');
        el.id = 'shellHourlyToast';
        el.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%) translateY(-10px);z-index:9999;padding:10px 18px;border-radius:999px;background:rgba(15,23,42,0.88);color:#f8fafc;border:1px solid rgba(56,189,248,0.42);box-shadow:0 16px 40px rgba(2,6,23,0.45);font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px;opacity:0;transition:opacity .35s ease,transform .35s ease;pointer-events:none;backdrop-filter:blur(14px);';
        document.body.appendChild(el);
      }
      el.textContent = `🔔 ${hh}:00 整点报时 · ${text}`;
      requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'translateX(-50%) translateY(0)'; });
      clearTimeout(el.__hideTimer);
      el.__hideTimer = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(-50%) translateY(-10px)'; }, 6200);
    };
    setInterval(() => {
      try {
        const cfg = JSON.parse(localStorage.getItem('shiny.companionConfig') || '{}');
        if (cfg.hourlyChime === false) return;
      } catch {}
      const now = new Date();
      if (now.getMinutes() !== 0) return;
      const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
      if (key === lastShellChimeKey) return;
      lastShellChimeKey = key;
      const h = now.getHours();
      const hh = String(h).padStart(2, '0');
      const greet = h < 11 ? '早安制作人，283 事务所元气满满的一天开始啦！'
        : h < 17 ? '排练辛苦啦，记得起身喝口水放松一下哦！'
        : h < 22 ? '傍晚好制作人，要不要听首歌或重温一篇剧情？'
        : '夜深了制作人，早点休息明天会更闪耀哦。';
      showHourlyToast(hh, greet);
    }, 20000);
  })();

  boot();
})();
