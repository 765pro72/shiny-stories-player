/* ═══════════════════════════════════════════════════════════════════════════
   283 OFFICE DYNAMIC ATMOSPHERE — Real Sunset, Night & Local Weather Rain
   Strictly uses official 283-Window Office backgrounds (Day / Evening / Night)
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  if (!document.body?.classList.contains('page-home')) return;

  const MODES = ['auto', 'day', 'evening', 'night', 'rain'];
  const MODE_LABELS = {
    auto: '自动',
    day: '白天',
    evening: '傍晚',
    night: '夜晚',
    rain: '雨天'
  };

  const p4kRev = (() => {
    try { return localStorage.getItem('shiny.pack4kRev') || ''; } catch { return ''; }
  })();
  const p4kQ = p4kRev ? '?p4k=' + encodeURIComponent(p4kRev) : '';

  const BG_URLS = {
    day: `url('home-assets/office.jpg${p4kQ}')`,
    evening: `url('home-assets/office-evening.jpg${p4kQ}')`,
    night: `url('home-assets/office-night.jpg${p4kQ}')`,
    rain: `url('home-assets/office-rain.jpg${p4kQ}')`
  };

  let userMode = 'auto';
  try {
    const saved = localStorage.getItem('shiny.officeAtmosphere');
    if (MODES.includes(saved)) userMode = saved;
  } catch {}

  let weatherData = null;
  let rainCanvas = null;
  let rainCtx = null;
  let rainRaf = 0;
  let rainDrops = [];
  let rainActive = false;
  let pillBtn = null;

  function parseMinutes(isoStr) {
    if (!isoStr || typeof isoStr !== 'string') return null;
    const m = isoStr.match(/T(\d{2}):(\d{2})/);
    if (!m) return null;
    return Number(m[1]) * 60 + Number(m[2]);
  }

  function resolveAutoState() {
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    const sunriseMin = parseMinutes(weatherData?.sunrise) ?? (6 * 60 + 15);
    const sunsetMin = parseMinutes(weatherData?.sunset) ?? (17 * 60 + 45);

    let timeSlot = 'day';
    if (curMin >= sunsetMin - 45 && curMin <= sunsetMin + 25) {
      timeSlot = 'evening';
    } else if (curMin > sunsetMin + 25 || curMin < sunriseMin) {
      timeSlot = 'night';
    }

    const isRaining = !!weatherData?.isRaining;
    return { timeSlot, isRaining, sunsetMin };
  }

  function isOfficeBindThemeEnabled() {
    try { return localStorage.getItem('shiny.bindOfficeTheme') !== '0'; } catch { return true; }
  }

  function computeEffectiveState() {
    const isDarkTheme = document.documentElement.dataset.theme === 'dark';
    const bindTheme = isOfficeBindThemeEnabled();
    if (userMode === 'day') return { bg: 'day', rain: false, nightRain: false, label: '☀ 白天' };
    if (userMode === 'evening') return { bg: 'evening', rain: false, nightRain: false, label: '🌇 傍晚' };
    if (userMode === 'night') return { bg: 'night', rain: false, nightRain: false, label: '🌙 夜晚' };
    if (userMode === 'rain') {
      const nightOverride = bindTheme && isDarkTheme;
      return { bg: nightOverride ? 'night' : 'rain', rain: !nightOverride, nightRain: false, label: nightOverride ? '🌙 夜晚' : '🌧 雨天' };
    }

    // Auto mode:
    // - When bindOfficeTheme is OFF (default): Office background follows real local time & weather independently of Light/Dark UI theme!
    // - When bindOfficeTheme is ON: Dark UI theme forces Night office, Light UI theme follows Day/Evening office.
    const auto = resolveAutoState();
    const isNight = bindTheme ? isDarkTheme : (auto.timeSlot === 'night');
    const rain = !isNight && auto.isRaining;
    const bg = isNight ? 'night' : (rain ? 'rain' : (bindTheme && auto.timeSlot === 'night' ? 'day' : auto.timeSlot));

    let icon = bg === 'night' ? '🌙' : (bg === 'evening' ? '🌇' : '☀');
    if (rain) icon = '🌧';
    const tempStr = (weatherData?.ok && Number.isFinite(weatherData.temp)) ? ` ${weatherData.temp}°C` : '';
    const text = rain ? '雨天' : (bg === 'night' ? '夜晚' : (bg === 'evening' ? '傍晚' : '晴朗'));
    return { bg, rain, nightRain: false, label: `${icon} ${text}${tempStr}` };
  }

  window.addEventListener('shiny-office-bind-changed', () => applyAtmosphere());

  let currentBgKey = '';
  let currentCustomUrl = '';
  let bgFadeLayer = null;
  let bgFadeAnim = null;

  const BG_MODE_KEY = 'shiny.officeBgMode';
  const BG_CUSTOM_KEY = 'shiny.officeCustomBg';
  const BG_FAV_KEY = 'shiny.officeFavoriteBgs';
  let officeBgMode = (() => {
    try {
      const m = localStorage.getItem(BG_MODE_KEY);
      return ['classic', 'contextual', 'random-hourly', 'custom'].includes(m) ? m : 'classic';
    } catch { return 'classic'; }
  })();
  let officeCustomBg = (() => {
    try { return localStorage.getItem(BG_CUSTOM_KEY) || ''; } catch { return ''; }
  })();
  let officialBgs = null;
  let officialBgsPromise = null;
  let pickedPoolUrl = '';
  let lastPoolBucket = '';
  let bgLoadSerial = 0;

  function loadOfficialBgs() {
    if (officialBgs) return Promise.resolve(officialBgs);
    if (!officialBgsPromise) {
      officialBgsPromise = fetch('/data/official-extras.json')
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          officialBgs = Array.isArray(d?.backgrounds) ? d.backgrounds : [];
          return officialBgs;
        })
        .catch(() => { officialBgs = []; return []; });
    }
    return officialBgsPromise;
  }

  function pickBgForMode(list, state, forceNew = false) {
    if (!list.length) return null;
    if (officeBgMode === 'custom' && officeCustomBg) {
      const hit = list.find(x => x.bg === officeCustomBg);
      if (hit) return hit;
    }
    const now = new Date();
    const hourKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
    const musicPlaying = localStorage.getItem('shiny.musicPlaying') === '1' ? '1' : '0';
    const bucket = officeBgMode === 'contextual'
      ? `${hourKey}:${state.bg}:${musicPlaying}`
      : `${hourKey}:hourly`;
    if (!forceNew && pickedPoolUrl && lastPoolBucket === bucket) {
      const existing = list.find(x => ('/asset-original/' + x.bg) === pickedPoolUrl);
      if (existing) return existing;
    }
    lastPoolBucket = bucket;
    if (officeBgMode === 'contextual') {
      // Spread cleanly across the 215-entry official catalog by season + timeSlot + music state
      const month = now.getMonth();
      const seedStr = `${bucket}:${month}:${forceNew ? Math.random() : 'stable'}`;
      let hash = 2166136261;
      for (let i = 0; i < seedStr.length; i++) {
        hash = Math.imul(hash ^ seedStr.charCodeAt(i), 16777619);
      }
      const idx = Math.abs(hash) % list.length;
      return list[idx];
    }
    return list[Math.floor(Math.random() * list.length)];
  }

  function ensureBgFadeLayer(screen) {
    if (bgFadeLayer && bgFadeLayer.isConnected) return bgFadeLayer;
    bgFadeLayer = document.createElement('div');
    bgFadeLayer.id = 'officeBgCrossfade';
    bgFadeLayer.setAttribute('aria-hidden', 'true');
    Object.assign(bgFadeLayer.style, {
      position: 'absolute',
      inset: '0',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      pointerEvents: 'none',
      zIndex: '0',
      opacity: '0',
      willChange: 'opacity'
    });
    screen.prepend(bgFadeLayer);
    return bgFadeLayer;
  }

  function crossfadeToBg(screen, nextUrl, nextKey) {
    const prevUrl = currentCustomUrl || BG_URLS[currentBgKey] || BG_URLS.day;
    if (currentBgKey && prevUrl !== nextUrl) {
      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced) {
        const layer = ensureBgFadeLayer(screen);
        if (bgFadeAnim) { try { bgFadeAnim.cancel(); } catch {} bgFadeAnim = null; }
        layer.style.backgroundImage = prevUrl;
        layer.style.opacity = '1';
        screen.style.backgroundImage = nextUrl;
        try {
          bgFadeAnim = layer.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 1450, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' }
          );
          bgFadeAnim.onfinish = () => {
            layer.style.opacity = '0';
            bgFadeAnim = null;
          };
        } catch {
          layer.style.opacity = '0';
        }
      } else {
        screen.style.backgroundImage = nextUrl;
      }
    } else {
      screen.style.backgroundImage = nextUrl;
    }
    currentBgKey = nextKey;
    currentCustomUrl = nextUrl;
  }

  function updateOfficeBgHint(label) {
    const hint = document.getElementById('officeBgCurrentHint');
    if (hint) hint.textContent = label;
  }

  function applyAtmosphere(forceNew = false) {
    const screen = document.querySelector('.screen');
    if (!screen) return;
    const state = computeEffectiveState();
    screen.dataset.officeTime = state.bg;
    screen.dataset.officeRain = state.rain ? '1' : '0';
    screen.dataset.officeNightRain = state.nightRain ? '1' : '0';

    if (officeBgMode !== 'classic') {
      const serial = ++bgLoadSerial;
      loadOfficialBgs().then(list => {
        if (serial !== bgLoadSerial || officeBgMode === 'classic') return;
        const picked = pickBgForMode(list, state, forceNew);
        if (!picked) {
          crossfadeToBg(screen, BG_URLS[state.bg] || BG_URLS.day, state.bg);
          return;
        }
        const rawUrl = '/asset-original/' + picked.bg;
        const cssUrl = `url('${rawUrl}')`;
        pickedPoolUrl = rawUrl;
        const pre = new Image();
        pre.onload = () => {
          if (serial !== bgLoadSerial || officeBgMode === 'classic') return;
          crossfadeToBg(screen, cssUrl, `official:${picked.id}`);
          updateOfficeBgHint(`当前：官方场景 #${picked.id}（${officeBgMode === 'contextual' ? '智能情境' : officeBgMode === 'random-hourly' ? '每小时随机' : '自选固定'}）`);
        };
        pre.onerror = () => {
          if (serial !== bgLoadSerial) return;
          crossfadeToBg(screen, BG_URLS[state.bg] || BG_URLS.day, state.bg);
        };
        pre.src = rawUrl;
      });
    } else {
      bgLoadSerial++;
      const nextUrl = BG_URLS[state.bg] || BG_URLS.day;
      crossfadeToBg(screen, nextUrl, state.bg);
      updateOfficeBgHint(`当前：经典 283 事务所窗口（${state.label}）`);
    }

    if (pillBtn) {
      const modeTag = userMode === 'auto' ? '' : ` · ${MODE_LABELS[userMode]}`;
      const sunsetStr = weatherData?.sunset ? ` · 日落 ${weatherData.sunset.slice(11, 16)}` : '';
      const cityStr = weatherData?.city ? `${weatherData.city} ` : '';
      pillBtn.textContent = state.label;
      pillBtn.title = `${cityStr}当前：${state.label}${sunsetStr}${modeTag}\n点击切换：自动 / 白天 / 傍晚 / 夜晚 / 雨天`;
    }

    if (state.rain) startRain();
    else stopRain();
  }

  /* ── GPU-Light Animated Raindrop Layer Over the 283 Office Window ───── */
  function ensureRainCanvas() {
    if (rainCanvas) return rainCanvas;
    const screen = document.querySelector('.screen');
    if (!screen) return null;
    rainCanvas = document.createElement('canvas');
    rainCanvas.id = 'officeRainCanvas';
    rainCanvas.setAttribute('aria-hidden', 'true');
    Object.assign(rainCanvas.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '1',
      opacity: '0',
      transition: 'opacity 0.6s ease'
    });
    // Place behind #idol canvas so rain falls across the office window behind the character
    const idol = document.getElementById('idol');
    if (idol) screen.insertBefore(rainCanvas, idol);
    else screen.prepend(rainCanvas);

    rainCtx = rainCanvas.getContext('2d');
    const resize = () => {
      if (!rainCanvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      rainCanvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
      rainCanvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
      initDrops();
    };
    window.addEventListener('resize', resize, { passive: true });
    resize();
    return rainCanvas;
  }

  function initDrops() {
    if (!rainCanvas) return;
    const w = rainCanvas.width;
    const h = rainCanvas.height;
    rainDrops = Array.from({ length: 84 }, () => ({
      x: Math.random() * w * 0.72 + w * 0.04,
      y: Math.random() * h * 0.44,
      len: 14 + Math.random() * 22,
      speed: 7 + Math.random() * 9,
      alpha: 0.22 + Math.random() * 0.36
    }));
  }

  function tickRain() {
    if (!rainActive || !rainCtx || !rainCanvas) { rainRaf = 0; return; }
    const w = rainCanvas.width;
    const h = rainCanvas.height;
    // Clip rain streaks strictly to the 283 window glass rectangle (approx x: 5%..70%, y: 4%..38%)
    rainCtx.clearRect(0, 0, w, h);
    rainCtx.save();
    rainCtx.beginPath();
    rainCtx.rect(w * 0.05, h * 0.04, w * 0.66, h * 0.35);
    rainCtx.clip();

    rainCtx.lineWidth = 1.3;
    rainCtx.lineCap = 'round';
    const isNight = document.querySelector('.screen')?.dataset.officeTime === 'night';
    for (const d of rainDrops) {
      d.x -= d.speed * 0.22;
      d.y += d.speed;
      if (d.y > h * 0.42 || d.x < w * 0.03) {
        d.x = Math.random() * w * 0.70 + w * 0.06;
        d.y = h * 0.02 - Math.random() * 30;
      }
      rainCtx.strokeStyle = isNight
        ? `rgba(220, 232, 255, ${d.alpha})`
        : `rgba(215, 234, 252, ${d.alpha + 0.1})`;
      rainCtx.beginPath();
      rainCtx.moveTo(d.x, d.y);
      rainCtx.lineTo(d.x - d.len * 0.22, d.y + d.len);
      rainCtx.stroke();
    }
    rainCtx.restore();
    rainRaf = requestAnimationFrame(tickRain);
  }

  function startRain() {
    // Keep official rainy 283 office background (office-rain.jpg) pure without animated raindrop canvas streaks
    stopRain();
  }

  function stopRain() {
    rainActive = false;
    if (rainCanvas) rainCanvas.style.opacity = '0';
    if (rainRaf) {
      cancelAnimationFrame(rainRaf);
      rainRaf = 0;
    }
  }

  function mountWeatherPill() {
    // When running inside shell.html, the persistent Weather + Location + Clock + Calendar capsule lives in the top shell bar
    if (window.parent !== window) return;
    const status = document.querySelector('header.home-status');
    if (!status || document.getElementById('officeAtmoBtn')) return;
    pillBtn = document.createElement('button');
    pillBtn.id = 'officeAtmoBtn';
    pillBtn.type = 'button';
    pillBtn.className = 'office-atmo-pill';
    pillBtn.textContent = '☀ 自动';
    pillBtn.addEventListener('click', () => {
      const idx = (MODES.indexOf(userMode) + 1) % MODES.length;
      userMode = MODES[idx];
      try { localStorage.setItem('shiny.officeAtmosphere', userMode); } catch {}
      applyAtmosphere();
    });
    status.appendChild(pillBtn);
  }

  async function fetchWeather() {
    try {
      const savedCity = (() => { try { return (localStorage.getItem('shiny.weatherCity') || '').trim(); } catch { return ''; } })();
      const url = savedCity ? `/api/weather?city=${encodeURIComponent(savedCity)}` : '/api/weather';
      const r = await fetch(url);
      if (r.ok) {
        const j = await r.json();
        if (j && j.ok) {
          weatherData = j;
          applyAtmosphere();
        }
      }
    } catch {}
  }

  async function openOfficeBgGallery() {
    let dlg = document.getElementById('officeBgGalleryDialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'officeBgGalleryDialog';
      dlg.style.cssText = 'width:min(920px,94vw);max-height:88vh;padding:18px 20px;border-radius:22px;background:rgba(15,23,42,0.96);color:#f8fafc;border:1px solid rgba(125,211,252,0.28);box-shadow:0 24px 64px rgba(0,0,0,0.65);';
      dlg.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
          <div>
            <strong style="font-size:16px;">🖼️ 283 官方主页背景库（215+ 场景）</strong>
            <div style="font-size:12px;color:#94a3b8;margin-top:2px;">点击任意场景立即设为事务所背景，或开启智能情境自动轮换</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="search" id="officeBgSearch" placeholder="搜索编号…" style="height:32px;padding:0 10px;border-radius:8px;border:1px solid rgba(148,163,184,0.3);background:rgba(30,41,59,0.8);color:#fff;width:120px;">
            <button type="button" id="officeBgClassicBtn" style="height:32px;padding:0 12px;border-radius:8px;border:1px solid rgba(148,163,184,0.3);background:rgba(56,189,248,0.16);color:#bae6fd;cursor:pointer;">恢复经典窗口</button>
            <button type="button" id="officeBgCloseBtn" style="height:32px;padding:0 12px;border-radius:8px;border:1px solid rgba(148,163,184,0.3);background:rgba(255,255,255,0.08);color:#fff;cursor:pointer;">关闭 ×</button>
          </div>
        </div>
        <div id="officeBgGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;overflow-y:auto;max-height:66vh;padding-right:4px;"></div>
      `;
      document.body.appendChild(dlg);
      dlg.querySelector('#officeBgCloseBtn')?.addEventListener('click', () => dlg.close());
      dlg.querySelector('#officeBgClassicBtn')?.addEventListener('click', () => {
        officeBgMode = 'classic';
        try { localStorage.setItem(BG_MODE_KEY, 'classic'); } catch {}
        const sel = document.getElementById('officeBgModeSelect');
        if (sel) sel.value = 'classic';
        applyAtmosphere();
        dlg.close();
      });
    }
    const grid = dlg.querySelector('#officeBgGrid');
    const search = dlg.querySelector('#officeBgSearch');
    if (grid) grid.innerHTML = '<div style="grid-column:1/-1;padding:24px;text-align:center;color:#94a3b8;">正在加载官方背景索引…</div>';
    dlg.showModal();
    const list = await loadOfficialBgs();
    const render = () => {
      if (!grid) return;
      const q = (search?.value || '').trim().toLowerCase();
      const rows = q ? list.filter(b => b.id.toLowerCase().includes(q)) : list;
      grid.replaceChildren();
      for (const b of rows) {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isCur = officeBgMode === 'custom' && officeCustomBg === b.bg;
        btn.style.cssText = `display:flex;flex-direction:column;gap:5px;padding:6px;border-radius:12px;border:1.5px solid ${isCur ? '#38bdf8' : 'rgba(148,163,184,0.22)'};background:${isCur ? 'rgba(56,189,248,0.18)' : 'rgba(30,41,59,0.55)'};color:#e2e8f0;cursor:pointer;text-align:left;`;
        btn.innerHTML = `<img src="/asset-original/${b.thumb}" loading="lazy" alt="背景 #${b.id}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#0f172a;"><span style="font-size:11.5px;font-weight:700;">官方场景 #${b.id}${isCur ? ' · 使用中' : ''}</span>`;
        btn.onclick = () => {
          officeBgMode = 'custom';
          officeCustomBg = b.bg;
          try {
            localStorage.setItem(BG_MODE_KEY, 'custom');
            localStorage.setItem(BG_CUSTOM_KEY, b.bg);
          } catch {}
          const sel = document.getElementById('officeBgModeSelect');
          if (sel) sel.value = 'custom';
          applyAtmosphere();
          render();
        };
        grid.appendChild(btn);
      }
    };
    if (search) search.oninput = render;
    render();
  }

  function bindOfficeBgControls() {
    const sel = document.getElementById('officeBgModeSelect');
    const shuffleBtn = document.getElementById('btnShuffleOfficeBg');
    const galleryBtn = document.getElementById('btnOpenOfficeBgGallery');
    if (sel) {
      sel.value = officeBgMode;
      sel.addEventListener('change', () => {
        officeBgMode = sel.value || 'classic';
        try { localStorage.setItem(BG_MODE_KEY, officeBgMode); } catch {}
        applyAtmosphere(true);
      });
    }
    shuffleBtn?.addEventListener('click', () => {
      if (officeBgMode === 'classic' || officeBgMode === 'custom') {
        officeBgMode = 'random-hourly';
        try { localStorage.setItem(BG_MODE_KEY, officeBgMode); } catch {}
        if (sel) sel.value = officeBgMode;
      }
      applyAtmosphere(true);
    });
    galleryBtn?.addEventListener('click', () => openOfficeBgGallery());
  }

  function init() {
    mountWeatherPill();
    bindOfficeBgControls();
    applyAtmosphere();
    fetchWeather();

    // Background-preload all 4 official 283 office backgrounds into browser image memory
    // so day <-> evening <-> night <-> rain crossfades have zero decode stutter!
    const preloadOfficeBgs = () => {
      for (const src of [
        `home-assets/office.jpg${p4kQ}`,
        `home-assets/office-evening.jpg${p4kQ}`,
        `home-assets/office-night.jpg${p4kQ}`,
        `home-assets/office-rain.jpg${p4kQ}`
      ]) {
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
      }
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(preloadOfficeBgs, { timeout: 2500 });
    else setTimeout(preloadOfficeBgs, 1200);

    // React immediately when Dark/Light theme toggles
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => applyAtmosphere()).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
      });
    }

    // Re-evaluate sunset / weather periodically (every 5 minutes)
    setInterval(applyAtmosphere, 5 * 60 * 1000);
    setInterval(fetchWeather, 25 * 60 * 1000);

    // Pause rain animation when hidden in shell frame pool & listen for atmosphere mode switches from shell capsule
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.type === 'shiny-shell-visibility') {
        if (!e.data.active) stopRain();
        else applyAtmosphere();
      } else if (e.data.type === 'shiny-office-atmosphere' && MODES.includes(e.data.mode)) {
        userMode = e.data.mode;
        try { localStorage.setItem('shiny.officeAtmosphere', userMode); } catch {}
        applyAtmosphere();
      } else if (e.data.type === 'shiny-weather-city-changed') {
        fetchWeather();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
