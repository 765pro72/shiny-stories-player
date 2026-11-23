(() => {
  const toggle = document.querySelector('#musicToggle');
  const volume = document.querySelector('#musicVolume');
  const status = document.querySelector('#musicStatus');
  const duckToggle = document.querySelector('#duckMusicOnVoice');
  const prefs = { enabled: true, volume: 25, duckOnVoice: true };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem('homeMusic') || '{}')); } catch {}
  prefs.volume = Number.isFinite(Number(prefs.volume)) ? Math.max(0, Math.min(100, Number(prefs.volume))) : 25;
  prefs.duckOnVoice = prefs.duckOnVoice !== false;
  try { localStorage.setItem('shiny.duckMusicOnVoice', prefs.duckOnVoice ? '1' : '0'); } catch {}

  function getBgmSource() {
    try {
      const custom = JSON.parse(localStorage.getItem('shiny.customHomeBgm') || 'null');
      if (custom && custom.audioUrl) {
        return {
          src: custom.audioUrl,
          title: custom.title || '自定义音乐',
          artist: custom.artist || '283PRO',
          isCustom: true
        };
      }
    } catch {}
    return {
      src: '/home-assets/home-bgm.m4a',
      title: '闪耀色彩 事务所日常原声',
      artist: '283 Production',
      isCustom: false
    };
  }

  let bgmInfo = getBgmSource();
  const music = document.createElement('audio');
  music.id = 'homeBgm';
  music.src = bgmInfo.src;
  music.loop = true;
  music.preload = 'auto';
  document.body.append(music);
  let speaking = false, starting = false;
  function shouldDuck() { return prefs.duckOnVoice !== false; }
  function applyVolume() { music.volume = prefs.volume / 100 * (speaking && shouldDuck() ? 0.25 : 1); }
  function syncDuckToShell() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'shiny-home-voice', speaking: speaking && shouldDuck() }, location.origin);
      }
    } catch {}
  }
  function save() {
    const value = JSON.stringify(prefs);
    localStorage.setItem('homeMusic', value);
    try { localStorage.setItem('shiny.duckMusicOnVoice', prefs.duckOnVoice ? '1' : '0'); } catch {}
    window.desktop?.saveState({ homeMusic: value });
  }
  function show(message) {
    const playing = !music.paused;
    toggle.textContent = playing ? '♫' : '♩';
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-label', playing ? '关闭背景音乐' : '开启背景音乐');
    const songNote = bgmInfo.isCustom ? ` · 《${bgmInfo.title}》` : '';
    toggle.title = message + songNote + ' · 音量可在看板设置中调整';
    status.textContent = message + songNote;
  }

  window.addEventListener('storage', e => {
    if (e.key === 'shiny.customHomeBgm') {
      const prev = bgmInfo;
      bgmInfo = getBgmSource();
      if (prev.src !== bgmInfo.src) {
        const wasPlaying = !music.paused;
        music.src = bgmInfo.src;
        if (wasPlaying && prefs.enabled) {
          music.play().catch(() => {});
        }
        show(prefs.enabled ? '背景音乐已更新' : '背景音乐已关闭');
      }
    }
  });

  window.addEventListener('set-home-bgm', () => {
    bgmInfo = getBgmSource();
    music.src = bgmInfo.src;
    if (prefs.enabled) {
      music.play().catch(() => {});
    }
    show('背景音乐已切换');
  });
  let shellVisible = true;
  let jukeboxPlaying = false;
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'shiny-shell-visibility') {
      shellVisible = !!e.data.active;
      if (!shellVisible) {
        music.pause();
        show(prefs.enabled ? '背景音乐已暂停' : '背景音乐已关闭');
      } else if (prefs.enabled && !jukeboxPlaying) {
        start();
      }
    } else if (e.data.type === 'shiny-home-bgm-pause') {
      jukeboxPlaying = !!e.data.playing;
      if (jukeboxPlaying) {
        music.pause();
        show('音乐馆播放中 · 事务所音乐已暂停');
      } else if (shellVisible && prefs.enabled) {
        start();
      }
    }
  });
  async function start() {
    if (!prefs.enabled || document.hidden || !shellVisible || jukeboxPlaying || starting || !music.paused) return;
    starting = true;
    try {
      await music.play();
      if (!prefs.enabled || document.hidden || !shellVisible || jukeboxPlaying) music.pause();
      show(music.paused ? '背景音乐已暂停' : '背景音乐播放中 · 循环播放');
    } catch (e) {
      show(e.name === 'NotAllowedError' ? '点击主页任意位置开启背景音乐' : '音乐加载失败，点击音符按钮重试');
    } finally { starting = false; }
  }
  toggle.onclick = () => {
    if (!music.paused) { prefs.enabled = false; music.pause(); show('背景音乐已关闭'); }
    else if (prefs.enabled && document.hidden) { prefs.enabled = false; show('背景音乐已关闭'); }
    else { prefs.enabled = true; start(); }
    save();
  };
  volume.value = prefs.volume;
  volume.oninput = () => { prefs.volume = Number(volume.value); applyVolume(); save(); };
  if (duckToggle) {
    duckToggle.checked = prefs.duckOnVoice;
    duckToggle.onchange = () => {
      prefs.duckOnVoice = duckToggle.checked;
      save();
      applyVolume();
      syncDuckToShell();
      window.dispatchEvent(new CustomEvent('home-voice-duck-pref', { detail: prefs.duckOnVoice }));
    };
  }
  window.addEventListener('home-voice', e => {
    speaking = e.detail === true;
    applyVolume();
    syncDuckToShell();
  });
  const unlock = e => { if (!e.target.closest?.('#musicToggle')) start(); };
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { music.pause(); show(prefs.enabled ? '背景音乐已暂停' : '背景音乐已关闭'); }
    else start();
  });
  window.addEventListener('pagehide', () => music.pause());
  music.addEventListener('error', () => show('音乐加载失败，点击音符按钮重试'));
  applyVolume();
  show(prefs.enabled ? '点击主页任意位置开启背景音乐' : '背景音乐已关闭');
  start();
})();

