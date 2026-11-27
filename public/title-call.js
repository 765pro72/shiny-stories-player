/* 283 Production Official Startup Title Call ("アイドルマスター シャイニーカラーズ！") */
(() => {
  'use strict';

  const ENABLED_KEY = 'shiny.titleCall';
  const LAST_ID_KEY = 'shiny.lastTitleCallId';
  const MANIFEST_URL = '/home-assets/title-calls/index.json';

  let manifestPromise = null;
  let currentAudio = null;
  let playing = false;
  let bootPlayedThisSession = false;
  let pendingUnlockCleanup = null;

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function safeSet(key, val) {
    try { localStorage.setItem(key, val); } catch {}
    try { window.desktop?.saveState?.({ [key]: val }); } catch {}
  }

  function isEnabled() {
    const raw = safeGet(ENABLED_KEY);
    if (raw === '0' || raw === 'false') return false;
    try {
      const ds = window.desktop?.getState?.();
      if (ds && (ds[ENABLED_KEY] === '0' || ds[ENABLED_KEY] === 'false')) return false;
    } catch {}
    return true;
  }

  function setEnabled(flag) {
    const val = flag ? '1' : '0';
    safeSet(ENABLED_KEY, val);
    return !!flag;
  }

  function getPreferredVolume() {
    try {
      const home = JSON.parse(safeGet('home') || 'null') || {};
      const v = Number(home.volume);
      if (Number.isFinite(v)) {
        if (v <= 0) return 0;
        return Math.max(0.28, Math.min(0.92, v / 100));
      }
    } catch {}
    return 0.78;
  }

  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(MANIFEST_URL)
        .then(r => (r.ok ? r.json() : []))
        .then(list => (Array.isArray(list) ? list : []))
        .catch(() => []);
    }
    return manifestPromise;
  }

  function pickRandom(list) {
    if (!list.length) return null;
    if (list.length === 1) return list[0];
    const lastId = safeGet(LAST_ID_KEY);
    const pool = lastId ? list.filter(x => x.id !== lastId) : list;
    const chosen = (pool.length ? pool : list)[Math.floor(Math.random() * (pool.length ? pool.length : list.length))];
    if (chosen?.id) {
      try { localStorage.setItem(LAST_ID_KEY, chosen.id); } catch {}
    }
    return chosen;
  }

  function clearUnlockListeners() {
    if (pendingUnlockCleanup) {
      pendingUnlockCleanup();
      pendingUnlockCleanup = null;
    }
  }

  function stop() {
    clearUnlockListeners();
    if (currentAudio) {
      try {
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch {}
      currentAudio = null;
    }
    playing = false;
    window.__shinyTitleCallPlaying = false;
  }

  async function play(opts = {}) {
    const { force = false, onPick = null, onPlay = null, onEnd = null } = opts;
    if (!force) {
      if (bootPlayedThisSession) return null;
      if (!isEnabled()) return null;
      bootPlayedThisSession = true;
    }

    const vol = getPreferredVolume();
    if (!force && vol <= 0) return null;

    const list = await loadManifest();
    const pick = pickRandom(list);
    if (!pick) return null;

    stop();

    const primaryUrl = `/home-assets/title-calls/${pick.file}`;
    const fallbackUrl = pick.fallbackAsset ? `/asset/${pick.fallbackAsset}` : '';

    const audio = new Audio(primaryUrl);
    audio.preload = 'auto';
    audio.volume = force ? Math.max(0.45, vol || 0.78) : vol;
    currentAudio = audio;

    let retriedFallback = false;
    const finish = () => {
      if (currentAudio === audio) {
        currentAudio = null;
      }
      playing = false;
      window.__shinyTitleCallPlaying = false;
      try { onEnd?.(pick); } catch {}
    };

    audio.onended = finish;
    audio.onerror = () => {
      if (!retriedFallback && fallbackUrl) {
        retriedFallback = true;
        audio.src = fallbackUrl;
        audio.play().catch(finish);
      } else {
        finish();
      }
    };

    try { onPick?.(pick); } catch {}

    const tryStart = async () => {
      try {
        playing = true;
        window.__shinyTitleCallPlaying = true;
        await audio.play();
        clearUnlockListeners();
        try { onPlay?.(pick); } catch {}
        return true;
      } catch (err) {
        playing = false;
        window.__shinyTitleCallPlaying = false;
        // Standard web browser autoplay policy fallback: replay on first user gesture within 15s
        if (!force && err && (err.name === 'NotAllowedError' || /user gesture|not allowed|interact/i.test(String(err.message || '')))) {
          const startedAt = Date.now();
          const unlock = () => {
            clearUnlockListeners();
            if (Date.now() - startedAt > 15000) {
              finish();
              return;
            }
            if (currentAudio !== audio) return;
            playing = true;
            window.__shinyTitleCallPlaying = true;
            audio.play().then(() => {
              try { onPlay?.(pick); } catch {}
            }).catch(finish);
          };
          const cleanup = () => {
            window.removeEventListener('pointerdown', unlock, true);
            window.removeEventListener('keydown', unlock, true);
          };
          pendingUnlockCleanup = cleanup;
          window.addEventListener('pointerdown', unlock, { capture: true, once: true });
          window.addEventListener('keydown', unlock, { capture: true, once: true });
          return false;
        }
        finish();
        return false;
      }
    };

    await tryStart();
    return pick;
  }

  window.ShinyTitleCall = {
    isEnabled,
    setEnabled,
    isPlaying: () => playing,
    loadManifest,
    play,
    stop
  };
})();
