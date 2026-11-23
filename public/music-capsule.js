/**
 * 283 Jukebox Floating Music Capsule & Cross-Page Background Player
 * (跨页面悬浮音乐胶囊与后台播放服务)
 * 支持手机与电脑全端后台播放，MediaSession 锁屏控制，实时双语歌词浮窗
 */
(() => {
  // Yield to the Persistent Apple Shell Dynamic Island when embedded inside shell.html
  try {
    if (window.self !== window.top && window.parent?.__shinyShell) return;
  } catch {}

  // Do not show mini capsule on the full music.html page
  const isMusicPage = location.pathname.endsWith('music.html');
  const isHomePage = location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname === '';
  const isPlayerPage = location.pathname.includes('/player/') || location.pathname.includes('player.html');

  // Load CSS dynamically if not present
  if (!document.getElementById('musicCapsuleStyles')) {
    const link = document.createElement('link');
    link.id = 'musicCapsuleStyles';
    link.rel = 'stylesheet';
    link.href = '/music-capsule.css';
    document.head.appendChild(link);
  }

  // Audio & State
  let audio = null;
  let currentSong = null;
  let parsedLyrics = [];
  let currentLyricIndex = -1;
  let isCapsulePlaying = false;
  let isLyricsOpen = false;
  let isMinimized = false;
  let capsulePlayMode = (() => {
    try {
      const m = localStorage.getItem('shiny.musicPlayMode');
      return (m === 'shuffle' || m === 'single') ? m : 'loop';
    } catch { return 'loop'; }
  })();
  let capsuleVolume = (() => {
    try {
      const saved = localStorage.getItem('shiny.musicVolume');
      if (saved === null || saved === '') return 50;
      const v = Number(saved);
      return Number.isFinite(v) && v >= 0 && v <= 100 ? v : 50;
    } catch { return 50; }
  })();

  // Read preferences (默认开启，跨页面随身听，用户亦可在音乐馆手动关闭)
  function getBgMusicEnabled() {
    return localStorage.getItem('shiny.bgMusicEnabled') !== 'false';
  }

  function setBgMusicEnabled(enabled) {
    localStorage.setItem('shiny.bgMusicEnabled', String(enabled));
  }

  function getCurrentSongData() {
    try {
      return JSON.parse(localStorage.getItem('shiny.bgMusicCurrentSong') || 'null');
    } catch {
      return null;
    }
  }

  // Save playback progress on page exit
  window.addEventListener('beforeunload', () => {
    if (audio && !audio.paused) {
      localStorage.setItem('shiny.bgMusicCurrentTime', String(audio.currentTime));
      localStorage.setItem('shiny.bgMusicPlaying', 'true');
    } else {
      localStorage.setItem('shiny.bgMusicPlaying', 'false');
    }
  });

  // If on music.html, export a global helper so music.js can sync state
  if (isMusicPage) {
    window.syncToCapsuleState = (song, isPlaying, currentTime) => {
      if (song) {
        localStorage.setItem('shiny.bgMusicCurrentSong', JSON.stringify(song));
      }
      localStorage.setItem('shiny.bgMusicPlaying', String(isPlaying));
      if (typeof currentTime === 'number') {
        localStorage.setItem('shiny.bgMusicCurrentTime', String(currentTime));
      }
      if (isPlaying) {
        localStorage.setItem('shiny.bgMusicEnabled', 'true');
      }
    };
    return;
  }

  // On other pages (index, guide, card-gallery, voice-gallery, etc.)
  function initBackgroundPlayer() {
    if (!getBgMusicEnabled()) {
      return; // "默认不开启，需要自己打开"
    }

    currentSong = getCurrentSongData();
    if (!currentSong) {
      currentSong = {
        id: 'track_2609071020',
        title: 'Spread the Wings!!',
        titleZh: '展翅高飞',
        vocalists: 'シャイニーカラーズ',
        unitName: '283PRO',
        neteaseId: 2609071020,
        audioUrl: 'https://music.163.com/song/media/outer/url?id=2609071020.mp3',
        cover: '/app-icon.png'
      };
      localStorage.setItem('shiny.bgMusicCurrentSong', JSON.stringify(currentSong));
    }

    // Create Audio Element
    audio = document.createElement('audio');
    audio.id = 'bgCapsuleAudio';
    audio.preload = 'auto';
    audio.setAttribute('playsinline', 'true');
    document.body.appendChild(audio);

    // Build Capsule DOM
    createCapsuleDOM();

    // Load Song into audio
    const savedTime = parseFloat(localStorage.getItem('shiny.bgMusicCurrentTime') || '0');
    let wasPlaying = localStorage.getItem('shiny.bgMusicPlaying') === 'true';

    // User requirement: 仅在打开剧情播放器时自动暂停音乐；回到主界面不暂停歌，并自动在偶像对话时压低音量
    if (isPlayerPage) {
      wasPlaying = false;
      localStorage.setItem('shiny.bgMusicPlaying', 'false');
    }

    loadSong(currentSong, wasPlaying, savedTime);

    // Audio Events
    let capsuleDucked = false;
    const isDuckEnabled = () => {
      try { return localStorage.getItem('shiny.duckMusicOnVoice') !== '0'; } catch { return true; }
    };
    const applyCapsuleVol = () => {
      if (!audio) return;
      audio.volume = Math.max(0, Math.min(1, (capsuleVolume / 100) * (capsuleDucked && isDuckEnabled() ? 0.25 : 1)));
    };
    window.addEventListener('home-voice', (ev) => {
      capsuleDucked = ev.detail === true;
      applyCapsuleVol();
    });
    window.addEventListener('home-voice-duck-pref', () => {
      applyCapsuleVol();
    });
    applyCapsuleVol();
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', () => setPlayingUI(true));
    audio.addEventListener('pause', () => setPlayingUI(false));
    audio.addEventListener('ended', () => {
      if (capsulePlayMode === 'single') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        playNextTrack();
      }
    });

    // Setup MediaSession for lock screen & background controls on mobile & PC
    setupMediaSession(currentSong);
  }

  function createCapsuleDOM() {
    if (document.getElementById('miniMusicCapsuleWrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'miniMusicCapsuleWrap';
    wrap.className = 'mini-music-capsule-wrap';

    wrap.innerHTML = `
      <!-- Floating Synced Lyrics Panel -->
      <div class="capsule-lyrics-panel hidden" id="capsuleLyricsPanel">
        <div class="capsule-lyrics-header">
          <span class="capsule-lyrics-title" id="capsuleLyricsTitle">${escapeHtml(currentSong?.title || '歌词跟随')}</span>
          <button class="capsule-lyrics-close-btn" id="btnCloseCapsuleLyrics" title="关闭歌词浮窗">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div class="capsule-lyrics-body" id="capsuleLyricsBody">
          <div class="capsule-lrc-line active">歌词载入中...</div>
        </div>
      </div>

      <!-- Main Capsule Pill -->
      <div class="mini-music-capsule" id="miniMusicCapsule" role="region" aria-label="后台音乐胶囊">
        <div class="capsule-thumb-box" id="capsuleThumbBtn" title="点击返回音乐馆">
          <img class="capsule-thumb-img" id="capsuleThumbImg" src="${currentSong?.cover || '/app-icon.png'}" alt="Cover">
        </div>
        <div class="capsule-info-box" id="capsuleInfoBtn" title="点击返回音乐馆">
          <span class="capsule-title" id="capsuleTitle">${escapeHtml(currentSong?.title || '未选择曲目')}</span>
          <span class="capsule-artist" id="capsuleArtist">${escapeHtml(currentSong?.vocalists || currentSong?.unitName || '283PRO')}</span>
        </div>
        <div class="capsule-controls">
          <button class="capsule-btn" id="btnCapsuleMode" title="播放顺序：列表循环">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
          </button>
          <button class="capsule-btn" id="btnCapsulePrev" title="上一曲">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
          </button>
          <button class="capsule-btn capsule-play-btn" id="btnCapsulePlayPause" title="播放 / 暂停">
            <svg id="capsuleIconPlay" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            <svg id="capsuleIconPause" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </button>
          <button class="capsule-btn" id="btnCapsuleNext" title="下一曲">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
          </button>
          <div class="capsule-vol-wrap" style="position:relative;display:inline-flex;align-items:center;">
            <button class="capsule-btn" id="btnCapsuleVol" title="音量、音质与音效调节">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            </button>
            <div class="capsule-vol-pop" id="capsuleVolPop" hidden style="position:absolute;bottom:calc(100% + 10px);right:-12px;padding:10px 12px;border-radius:16px;background:rgba(16,17,24,0.95);border:1px solid rgba(230,194,122,0.38);box-shadow:0 14px 32px rgba(0,0,0,0.48);display:flex;flex-direction:column;gap:8px;min-width:210px;z-index:10;color:#f5e6c4;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;opacity:0.8;min-width:26px;">音量</span>
                <input type="range" id="capsuleVolRange" min="0" max="100" value="${capsuleVolume}" style="flex:1;height:6px;accent-color:#e6c27a;cursor:pointer;" aria-label="音量">
                <span id="capsuleVolVal" style="font-size:11px;color:#fff;min-width:30px;text-align:right;">${capsuleVolume}%</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;opacity:0.8;min-width:26px;">音质</span>
                <select id="capsuleQualitySelect" style="flex:1;padding:4px 6px;border-radius:8px;background:#1e1d28;color:#fff;border:1px solid rgba(230,194,122,0.35);font-size:11px;">
                  <option value="jymaster">母带 (24bit Master)</option>
                  <option value="sky">环绕声 (Surround 5.1)</option>
                  <option value="jyeffect">全景声 (Spatial)</option>
                  <option value="hires">臻音 (Hi-Res)</option>
                  <option value="flac">无损 (SQ FLAC)</option>
                  <option value="320">极高 (320kbps)</option>
                  <option value="128">标准 (128kbps)</option>
                </select>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:11px;opacity:0.8;min-width:26px;">音效</span>
                <select id="capsuleFxSelect" style="flex:1;padding:4px 6px;border-radius:8px;background:#1e1d28;color:#fff;border:1px solid rgba(230,194,122,0.35);font-size:11px;">
                  <option value="off">原声直出 (关闭音效)</option>
                  <option value="ai_master">✨ AI 母带调音</option>
                  <option value="surround_51">沉浸环绕 5.1</option>
                  <option value="surround_8d">8D 环绕</option>
                  <option value="surround_360">360° 环绕</option>
                  <option value="vocal_clear">清澈人声</option>
                  <option value="megabass">超重低音</option>
                  <option value="live283">283 Live 现场</option>
                </select>
              </div>
            </div>
          </div>
          <button class="capsule-btn capsule-lrc-toggle" id="btnCapsuleLrc" title="查看歌词">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          </button>
          <button class="capsule-btn capsule-close-btn" id="btnCapsuleClose" title="收起 / 最小化">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(wrap);

    // Create restore dot badge (hidden by default)
    const restoreDot = document.createElement('div');
    restoreDot.id = 'capsuleRestoreDot';
    restoreDot.className = 'capsule-restore-dot hidden';
    restoreDot.title = '展开音乐胶囊';
    restoreDot.innerHTML = `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="var(--capsule-theme, #ff4e78)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
    `;
    document.body.appendChild(restoreDot);

    // Event Bindings
    function syncCapsuleModeUI() {
      const btn = document.getElementById('btnCapsuleMode');
      if (!btn) return;
      const meta = capsulePlayMode === 'shuffle'
        ? { title: '播放顺序：随机播放（点击切换）', svg: '<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>' }
        : capsulePlayMode === 'single'
        ? { title: '播放顺序：单曲循环（点击切换）', svg: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="14.5" font-size="8.5" font-weight="bold" text-anchor="middle" fill="currentColor">1</text>' }
        : { title: '播放顺序：列表循环（点击切换）', svg: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>' };
      btn.title = meta.title;
      btn.innerHTML = `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">${meta.svg}</svg>`;
      btn.style.color = capsulePlayMode === 'loop' ? '' : 'var(--capsule-theme, #ff4e78)';
    }
    syncCapsuleModeUI();
    document.getElementById('btnCapsuleMode').addEventListener('click', (e) => {
      e.stopPropagation();
      const order = ['loop', 'shuffle', 'single'];
      capsulePlayMode = order[(order.indexOf(capsulePlayMode) + 1) % order.length];
      try { localStorage.setItem('shiny.musicPlayMode', capsulePlayMode); } catch {}
      syncCapsuleModeUI();
    });
    const volBtn = document.getElementById('btnCapsuleVol');
    const volPop = document.getElementById('capsuleVolPop');
    const volRange = document.getElementById('capsuleVolRange');
    const volVal = document.getElementById('capsuleVolVal');
    volBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (volPop) volPop.hidden = !volPop.hidden;
    });
    volRange?.addEventListener('input', () => {
      capsuleVolume = Math.max(0, Math.min(100, Number(volRange.value)));
      if (audio) audio.volume = capsuleVolume / 100;
      if (volVal) volVal.textContent = capsuleVolume + '%';
      try { localStorage.setItem('shiny.musicVolume', String(capsuleVolume)); } catch {}
    });
    const capQSel = document.getElementById('capsuleQualitySelect');
    const capFxSel = document.getElementById('capsuleFxSelect');
    try {
      const savedQ = localStorage.getItem('shiny.musicQuality') || 'jymaster';
      if (capQSel && [...capQSel.options].some(o => o.value === savedQ)) capQSel.value = savedQ;
      const savedFx = JSON.parse(localStorage.getItem('shiny.musicFxState') || 'null');
      const curFx = savedFx?.enabled ? (savedFx.preset || 'ai_master') : 'off';
      if (capFxSel && [...capFxSel.options].some(o => o.value === curFx)) capFxSel.value = curFx;
    } catch {}
    capQSel?.addEventListener('change', () => {
      try {
        localStorage.setItem('shiny.musicQuality', capQSel.value);
        localStorage.setItem('shiny.musicQualityExplicit', '1');
      } catch {}
    });
    capFxSel?.addEventListener('change', () => {
      try {
        const cur = JSON.parse(localStorage.getItem('shiny.musicFxState') || '{}');
        cur.enabled = capFxSel.value !== 'off';
        if (capFxSel.value !== 'off') cur.preset = capFxSel.value;
        localStorage.setItem('shiny.musicFxState', JSON.stringify(cur));
      } catch {}
    });
    document.addEventListener('pointerdown', (e) => {
      if (volPop && !volPop.hidden && !e.target.closest('.capsule-vol-wrap')) volPop.hidden = true;
      if (isLyricsOpen && !e.target.closest('#miniMusicCapsuleWrap')) toggleLyricsPanel(false);
    });
    document.getElementById('btnCapsulePlayPause').addEventListener('click', togglePlayPause);
    document.getElementById('btnCapsulePrev').addEventListener('click', playPrevTrack);
    document.getElementById('btnCapsuleNext').addEventListener('click', playNextTrack);
    document.getElementById('btnCapsuleLrc').addEventListener('click', toggleLyricsPanel);
    document.getElementById('btnCloseCapsuleLyrics').addEventListener('click', () => toggleLyricsPanel(false));
    document.getElementById('btnCapsuleClose').addEventListener('click', minimizeCapsule);
    restoreDot.addEventListener('click', restoreCapsule);

    // Jump to full music page
    document.getElementById('capsuleThumbBtn').addEventListener('click', () => { location.href = 'music.html'; });
    document.getElementById('capsuleInfoBtn').addEventListener('click', () => { location.href = 'music.html'; });

    // Enable drag on the capsule
    makeDraggable(document.getElementById('miniMusicCapsule'), wrap);
  }

  function loadSong(song, autoPlay = false, seekTime = 0) {
    if (!song || !audio) return;
    currentSong = song;

    const themeColor = song.color || '#ff4e78';
    document.documentElement.style.setProperty('--capsule-theme', themeColor);

    const elTitle = document.getElementById('capsuleTitle');
    const elArtist = document.getElementById('capsuleArtist');
    const elThumb = document.getElementById('capsuleThumbImg');
    const elLrcTitle = document.getElementById('capsuleLyricsTitle');

    if (elTitle) elTitle.textContent = song.title;
    if (elArtist) elArtist.textContent = song.vocalists || song.unitName || 'THE IDOLM@STER';
    if (elThumb) elThumb.src = song.cover || '/app-icon.png';
    if (elLrcTitle) elLrcTitle.textContent = `${song.title} - ${song.vocalists || song.unitName || ''}`;

    // Resolve audio stream (全网全音源支持与自动兜底)
    if (song.audioUrl && !song.audioUrl.includes('preview')) {
      audio.src = song.audioUrl;
    } else if (song.neteaseId && location.protocol.startsWith('http')) {
      audio.src = `/api/music-stream?id=${song.neteaseId}&title=${encodeURIComponent(song.title || '')}&artist=${encodeURIComponent(song.vocalists || song.unitName || '')}`;
    } else if (song.neteaseId) {
      audio.src = `https://music.163.com/song/media/outer/url?id=${song.neteaseId}.mp3`;
    } else {
      audio.src = song.audioUrl || '';
    }
    audio.load();

    if (seekTime > 0) {
      audio.currentTime = seekTime;
    }

    // Load song lyrics
    fetchLyrics(song);

    if (autoPlay) {
      audio.play().then(() => {
        setPlayingUI(true);
      }).catch(err => {
        console.warn('Capsule auto-play note:', err);
        setPlayingUI(false);
      });
    }

    setupMediaSession(song);
  }

  function setPlayingUI(isPlaying) {
    isCapsulePlaying = isPlaying;
    const capsuleEl = document.getElementById('miniMusicCapsule');
    const iconPlay = document.getElementById('capsuleIconPlay');
    const iconPause = document.getElementById('capsuleIconPause');

    if (capsuleEl) capsuleEl.classList.toggle('playing', isPlaying);
    if (iconPlay) iconPlay.style.display = isPlaying ? 'none' : 'block';
    if (iconPause) iconPause.style.display = isPlaying ? 'block' : 'none';

    localStorage.setItem('shiny.bgMusicPlaying', String(isPlaying));
  }

  function togglePlayPause() {
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setPlayingUI(true)).catch(() => {});
    } else {
      audio.pause();
      setPlayingUI(false);
    }
  }

  function playPrevTrack() {
    navigateTrack(-1);
  }

  function playNextTrack() {
    navigateTrack(1);
  }

  // Navigate track using franchise catalog
  async function navigateTrack(delta) {
    try {
      const activeFr = localStorage.getItem('shiny.activeFranchise') || 'sc';
      const res = await fetch('franchise-catalogs.json');
      const fc = await res.json();
      const songs = fc[activeFr]?.songs || [];
      if (!songs.length) return;

      let idx = songs.findIndex(s => s.id === currentSong?.id || s.neteaseId === currentSong?.neteaseId);
      if (idx === -1) idx = 0;
      let nextIdx;
      if (capsulePlayMode === 'shuffle' && songs.length > 1) {
        nextIdx = Math.floor(Math.random() * songs.length);
        if (nextIdx === idx) nextIdx = (nextIdx + 1) % songs.length;
      } else {
        nextIdx = (idx + delta + songs.length) % songs.length;
      }
      const nextSong = songs[nextIdx];

      localStorage.setItem('shiny.bgMusicCurrentSong', JSON.stringify(nextSong));
      localStorage.setItem('shiny.bgMusicCurrentTime', '0');
      loadSong(nextSong, true, 0);
    } catch (e) {
      console.warn('Track navigation note:', e);
    }
  }

  // Setup Mobile & Desktop Background MediaSession
  function setupMediaSession(song) {
    if (!('mediaSession' in navigator) || !song) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.vocalists || song.unitName || 'THE IDOLM@STER',
        album: song.album || 'THE IDOLM@STER Collection',
        artwork: [
          { src: song.cover || '/app-icon.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (audio) { audio.play(); setPlayingUI(true); }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (audio) { audio.pause(); setPlayingUI(false); }
      });
      navigator.mediaSession.setActionHandler('previoustrack', playPrevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', playNextTrack);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audio && details.seekTime) { audio.currentTime = details.seekTime; }
      });
    } catch (err) {
      console.warn('MediaSession note:', err);
    }
  }

  // Lyrics Parser & Synchronization
  async function fetchLyrics(song) {
    parsedLyrics = [];
    currentLyricIndex = -1;
    const body = document.getElementById('capsuleLyricsBody');
    if (body) body.innerHTML = '<div class="capsule-lrc-line active">歌词同步中...</div>';

    try {
      // 1. Try local cache
      const cacheRes = await fetch('music-lyrics.json');
      const cache = await cacheRes.json();
      const lrcObj = cache[song.title] || cache[song.cleanTitle] || cache[song.neteaseId];
      if (lrcObj && lrcObj.lines) {
        parsedLyrics = lrcObj.lines;
        renderCapsuleLyrics();
        return;
      }
    } catch {}

    // 2. Fallback to NetEase API
    if (song.neteaseId) {
      try {
        const neteaseRes = await fetch(`/api/music-proxy?url=${encodeURIComponent('https://music.163.com/api/song/lyric?os=pc&id=' + song.neteaseId + '&lv=-1&tv=-1')}`);
        const json = await neteaseRes.json();
        const jpLrc = json.lrc?.lyric || '';
        const zhLrc = json.tlyric?.lyric || '';
        parsedLyrics = mergeLrc(jpLrc, zhLrc);
        renderCapsuleLyrics();
        return;
      } catch {}
    }

    if (body) {
      body.innerHTML = `
        <div class="capsule-lrc-line active">${escapeHtml(song.title)}</div>
        <div class="capsule-lrc-zh">${escapeHtml(song.vocalists || song.unitName || '283 Production')}</div>
      `;
    }
  }

  function renderCapsuleLyrics() {
    const body = document.getElementById('capsuleLyricsBody');
    if (!body) return;
    if (!parsedLyrics.length) {
      body.innerHTML = '<div class="capsule-lrc-line active">纯音乐 / 暂无歌词</div>';
      return;
    }
    body.innerHTML = parsedLyrics.map((item, idx) => `
      <div class="capsule-lrc-line" data-idx="${idx}">
        <div class="capsule-lrc-jp">${escapeHtml(item.jp || item.text || '')}</div>
        ${item.zh ? `<div class="capsule-lrc-zh">${escapeHtml(item.zh)}</div>` : ''}
      </div>
    `).join('');
  }

  function onTimeUpdate() {
    if (!audio || !parsedLyrics.length) return;
    const ct = audio.currentTime;

    let activeIdx = -1;
    for (let i = 0; i < parsedLyrics.length; i++) {
      if (ct >= parsedLyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== currentLyricIndex) {
      currentLyricIndex = activeIdx;
      const body = document.getElementById('capsuleLyricsBody');
      if (!body) return;

      const lines = body.querySelectorAll('.capsule-lrc-line');
      lines.forEach(el => el.classList.remove('active'));

      if (activeIdx >= 0 && lines[activeIdx]) {
        const activeEl = lines[activeIdx];
        activeEl.classList.add('active');

        // Center line strictly in capsule lyrics container
        const targetScroll = activeEl.offsetTop - (body.clientHeight / 2) + (activeEl.clientHeight / 2);
        body.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
      }
    }
  }

  function toggleLyricsPanel(forceOpen) {
    const panel = document.getElementById('capsuleLyricsPanel');
    const btn = document.getElementById('btnCapsuleLrc');
    if (!panel) return;

    if (typeof forceOpen === 'boolean') {
      isLyricsOpen = forceOpen;
    } else {
      isLyricsOpen = !isLyricsOpen;
    }

    panel.classList.toggle('hidden', !isLyricsOpen);
    if (btn) btn.classList.toggle('active', isLyricsOpen);

    if (isLyricsOpen && currentLyricIndex >= 0) {
      setTimeout(() => {
        const body = document.getElementById('capsuleLyricsBody');
        const activeEl = body?.querySelector(`.capsule-lrc-line[data-idx="${currentLyricIndex}"]`);
        if (activeEl && body) {
          const targetScroll = activeEl.offsetTop - (body.clientHeight / 2) + (activeEl.clientHeight / 2);
          body.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
        }
      }, 60);
    }
  }

  function minimizeCapsule() {
    isMinimized = true;
    const wrap = document.getElementById('miniMusicCapsuleWrap');
    const restoreDot = document.getElementById('capsuleRestoreDot');
    if (wrap) wrap.classList.add('hidden');
    if (restoreDot) restoreDot.classList.remove('hidden');
  }

  function restoreCapsule() {
    isMinimized = false;
    const wrap = document.getElementById('miniMusicCapsuleWrap');
    const restoreDot = document.getElementById('capsuleRestoreDot');
    if (wrap) wrap.classList.remove('hidden');
    if (restoreDot) restoreDot.classList.add('hidden');
  }

  // Simple parser helpers
  function parseLrcLines(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split('\n');
    const result = [];
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
    for (const raw of lines) {
      const line = raw.trim();
      let match;
      timeReg.lastIndex = 0;
      while ((match = timeReg.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
        const time = min * 60 + sec + ms / 1000;
        const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
        if (text && !text.startsWith('by:')) {
          result.push({ time, text });
        }
      }
    }
    return result.sort((a, b) => a.time - b.time);
  }

  function mergeLrc(jpLrc, zhLrc) {
    const jpList = parseLrcLines(jpLrc);
    const zhList = parseLrcLines(zhLrc);
    return jpList.map(item => {
      let closestZh = '';
      let minDiff = 0.8;
      for (const z of zhList) {
        const diff = Math.abs(z.time - item.time);
        if (diff < minDiff) {
          minDiff = diff;
          closestZh = z.text;
        }
      }
      return { time: item.time, jp: item.text, zh: closestZh };
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // Draggable logic for mini capsule
  function makeDraggable(handle, container) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let origRight = 24, origBottom = 24;

    function onPointerDown(e) {
      if (e.target.closest('button')) return; // let buttons click normally
      isDragging = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      startY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const rect = container.getBoundingClientRect();
      origRight = window.innerWidth - rect.right;
      origBottom = window.innerHeight - rect.bottom;
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const cx = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const cy = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const dx = cx - startX;
      const dy = cy - startY;
      const newRight = Math.max(10, Math.min(window.innerWidth - 100, origRight - dx));
      const newBottom = Math.max(10, Math.min(window.innerHeight - 80, origBottom - dy));
      container.style.right = `${newRight}px`;
      container.style.bottom = `${newBottom}px`;
    }

    function onPointerUp() {
      isDragging = false;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    }

    handle.addEventListener('pointerdown', onPointerDown);
  }

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBackgroundPlayer);
  } else {
    initBackgroundPlayer();
  }
})();
