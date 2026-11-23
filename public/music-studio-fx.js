/* ═══════════════════════════════════════════════════════════════════════════
   283 JUKEBOX PRO STUDIO SUITE (Inspired by Cloudy × Apple Logic Pro)
   10-Band EQ · 8D/360° Surround · Room Reverb · Comments · MV Cinema · Podcasts
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const EQ_LABELS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

  const AI_STYLES = {
    clear:  { name: '通透', desc: '这首歌调音风格为通透，片段衔接流畅，听感清爽开阔', gains: [2, 2, 1, 0, 1, 2, 3, 4, 4, 3], reverb: 0.14, spatial: 'wide' },
    vibe:   { name: '氛围', desc: '空间层次饱满自然，低频微暖，适合沉浸聆听',         gains: [3, 4, 2, 1, 0, 1, 2, 3, 3, 2], reverb: 0.24, spatial: '360'  },
    vocal:  { name: '人声', desc: '细致勾勒偶像声线与呼吸细节，结像清晰靠前',           gains: [-1, 0, 1, 2, 4, 5, 4, 3, 2, 1], reverb: 0.10, spatial: 'off'  },
    energy: { name: '动感', desc: '节奏瞬态更有弹性，鼓点与低频冲击力更强',             gains: [5, 5, 3, 1, 0, 1, 3, 4, 4, 3], reverb: 0.12, spatial: 'wide' }
  };

  const PRESETS = {
    ai_master:    { name: 'AI调音大师', short: 'AI调音',   tier: 'SVIP', desc: '智能动态母带调音，听感清爽开阔',     theme: 'gold',   gains: [2, 2, 1, 0, 1, 2, 3, 4, 4, 3],     reverb: 0.14, spatial: 'wide', wide: true },
    smart:        { name: '智能音效',   short: '智能音效', tier: 'VIP',  desc: '基于曲风自动匹配最佳音效参数，听感更丰富', theme: 'blue',   gains: [2, 3, 1, 0, 1, 2, 3, 3, 3, 2],     reverb: 0.12, spatial: 'wide', wide: true },
    surround_8d:  { name: '8D环绕',     short: '8D环绕',   tier: 'SVIP', desc: '声音追着耳朵动',                     theme: 'amber',  gains: [3, 3, 1, 0, 1, 2, 3, 3, 4, 3],     reverb: 0.22, spatial: '8d' },
    vocal_hires:  { name: '高解析人声', short: '高解析',   tier: 'VIP',  desc: '放大声音的质感',                     theme: 'indigo', gains: [-1, 0, 0, 1, 3, 4, 5, 4, 3, 2],    reverb: 0.08, spatial: 'off' },
    surround_360: { name: '360°环绕',   short: '360°环绕', tier: 'VIP',  desc: '音乐行星在耳边',                     theme: 'violet', gains: [2, 3, 2, 0, 1, 2, 3, 4, 4, 3],     reverb: 0.28, spatial: '360' },
    megabass:     { name: '超重低音',   short: '超重低音', tier: '',     desc: '适合快节奏歌曲',                     theme: 'ocean',  gains: [7, 6, 5, 2, 0, -1, 0, 1, 2, 2],    reverb: 0.06, spatial: 'off' },
    rock:         { name: '摇滚经典',   short: '摇滚经典', tier: 'VIP',  desc: '适配摇滚歌曲',                       theme: 'cobalt', gains: [5, 4, 2, -1, -1, 1, 3, 5, 5, 4],   reverb: 0.14, spatial: 'wide' },
    vocal_clear:  { name: '清澈人声',   short: '清澈人声', tier: '',     desc: '歌手声音在耳畔',                     theme: 'teal',   gains: [-2, -1, 0, 2, 4, 5, 4, 2, 1, 0],   reverb: 0.07, spatial: 'off' },
    surround_51:  { name: '沉浸环绕5.1', short: '沉浸5.1', tier: 'SVIP', desc: '宽广 5.1 声场与厅堂包围感',           theme: 'aurora', gains: [3, 3, 2, 0, 0, 1, 2, 3, 4, 3],     reverb: 0.34, spatial: 'wide' },
    live283:      { name: '283 Live',   short: '283 Live', tier: '',     desc: '演唱会现场氛围还原',                 theme: 'rose',   gains: [3, 4, 2, 0, -1, 1, 3, 4, 5, 4],    reverb: 0.30, spatial: 'wide' },
    // QQ音乐 银河音效专属
    qq_spatial:   { name: '全景环绕 7.1.4', short: '全景7.1.4', tier: 'SVIP', desc: 'QQ音乐银河 7.1.4 沉浸三维空间声场', theme: 'aurora', gains: [3, 3, 2, 1, 1, 2, 3, 4, 5, 4], reverb: 0.32, spatial: '360', wide: true },
    qq_tube:      { name: '胆机电子管',   short: '胆机暖声', tier: 'VIP',  desc: '温暖偶次谐波与醇厚模拟中频',         theme: 'amber',  gains: [3, 4, 3, 2, 2, 1, 0, -1, 1, 1], reverb: 0.16, spatial: 'off' },
    qq_vinyl:     { name: '黑胶唱机模拟', short: '黑胶模拟', tier: 'VIP',  desc: '复古黑胶温润听感与柔和光泽',         theme: 'gold',   gains: [2, 3, 2, 1, 1, 2, 1, -1, -2, -2], reverb: 0.18, spatial: 'wide' },
    // 酷狗音乐 蝰蛇音效专属
    kg_3d:        { name: '3D 丽音 (Viper 3D)', short: '3D丽音', tier: 'SVIP', desc: '酷狗招牌 3D 空间立体丽音引擎', theme: 'violet', gains: [4, 3, 1, 0, 1, 3, 4, 5, 5, 4], reverb: 0.26, spatial: 'wide', wide: true },
    kg_amp:       { name: '晶体管功放',   short: '晶体功放', tier: 'VIP',  desc: '凌厉瞬态与清脆高频解析力',           theme: 'cobalt', gains: [2, 2, 1, 0, 1, 2, 4, 5, 6, 5], reverb: 0.08, spatial: 'off' },
    // Apple Music 空间音频与母带专属
    am_spatial:   { name: '杜比全景声 Spatial', short: '空间音频', tier: 'SVIP', desc: 'Apple Spatial Audio 头部追踪声场', theme: 'indigo', gains: [2, 2, 1, 0, 1, 2, 3, 4, 4, 4], reverb: 0.28, spatial: '360', wide: true },
    am_latenight: { name: '深夜模式 Late Night', short: '深夜模式', tier: '',     desc: '均衡动态范围，夜间低音量清晰入耳', theme: 'teal',   gains: [2, 2, 1, 2, 3, 3, 2, 1, 0, 0], reverb: 0.06, spatial: 'off' }
  };

  // Platform-Specific Tuning Studio Profiles (每个音乐软件专属调音台)
  const PLATFORM_FX_PROFILES = {
    netease: {
      secHero: '网易云音乐 · 鲸云 SVIP 尊享音效',
      heroName: 'AI调音大师',
      heroTag: 'master',
      heroTier: 'SVIP',
      secGrid: '网易云官方精选音效 · 环绕声场',
      presets: ['smart', 'surround_8d', 'vocal_hires', 'surround_360', 'megabass', 'rock', 'vocal_clear', 'surround_51', 'live283'],
      qualityMap: { sky: 'surround_51', jymaster: 'ai_master', jyeffect: 'surround_360', hires: 'vocal_hires' }
    },
    qq: {
      secHero: 'QQ音乐 · Super Sound 银河音效',
      heroName: '银河 AI 智能音效',
      heroTag: 'Super Sound',
      heroTier: 'SVIP',
      secGrid: 'QQ音乐银河专属调音 · 空间与胆机',
      presets: ['qq_spatial', 'qq_tube', 'qq_vinyl', 'vocal_clear', 'megabass', 'surround_51', 'live283', 'vocal_hires'],
      qualityMap: { sky: 'qq_spatial', jymaster: 'ai_master', jyeffect: 'qq_spatial', hires: 'vocal_hires' }
    },
    kugou: {
      secHero: '酷狗音乐 · Viper 蝰蛇音效引擎',
      heroName: '蝰蛇 3D 丽音大师',
      heroTag: 'Viper HiFi',
      heroTier: 'SVIP',
      secGrid: '酷狗蝰蛇招牌调音 · 丽音与功放',
      presets: ['kg_3d', 'megabass', 'vocal_clear', 'kg_amp', 'surround_51', 'surround_8d', 'live283', 'vocal_hires'],
      qualityMap: { sky: 'kg_3d', jymaster: 'ai_master', jyeffect: 'kg_3d', hires: 'kg_amp' }
    },
    apple: {
      secHero: 'Apple Music · 空间音频与母带均衡',
      heroName: 'Apple Digital Master',
      heroTag: 'Spatial',
      heroTier: 'SVIP',
      secGrid: 'Apple Music 专属空间音频与 EQ 预设',
      presets: ['am_spatial', 'vocal_clear', 'megabass', 'vocal_hires', 'live283', 'am_latenight', 'rock'],
      qualityMap: { sky: 'am_spatial', jymaster: 'ai_master', jyeffect: 'am_spatial', hires: 'vocal_hires' }
    },
    migu: {
      secHero: '咪咕音乐 · 极光音效 Aurora Sound',
      heroName: '极光 AI 至臻调音',
      heroTag: 'Aurora',
      heroTier: 'SVIP',
      secGrid: '咪咕极光精选音效 · 至臻 3D 环绕',
      presets: ['surround_360', 'surround_51', 'vocal_clear', 'megabass', 'vocal_hires', 'live283', 'surround_8d'],
      qualityMap: { sky: 'surround_360', jymaster: 'ai_master', jyeffect: 'surround_51', hires: 'vocal_hires' }
    },
    auto: {
      secHero: '全网智能 · 多平台 HiFi 调音台',
      heroName: '全网智能 HiFi 母带',
      heroTag: 'HiFi',
      heroTier: 'SVIP',
      secGrid: '智能黑胶与胆机精选音效',
      presets: ['qq_vinyl', 'qq_tube', 'kg_3d', 'surround_51', 'vocal_clear', 'megabass', 'live283', 'vocal_hires'],
      qualityMap: { sky: 'surround_51', jymaster: 'ai_master', jyeffect: 'kg_3d', hires: 'qq_vinyl' }
    }
  };

  function getCurrentPlatformKey() {
    if (window.__musicAPI?.getPlatform) return window.__musicAPI.getPlatform();
    const raw = (localStorage.getItem('shiny.activeSourceEngine') || 'netease').toLowerCase();
    if (['qq', 'kugou', 'apple', 'migu', 'auto'].includes(raw)) return raw;
    return 'netease';
  }
  function getPlatformFxProfile(pKey) {
    return PLATFORM_FX_PROFILES[pKey || getCurrentPlatformKey()] || PLATFORM_FX_PROFILES.netease;
  }

  const DEVICES = {
    default: { name: '默认设备',       sub: '原声频响，无额外设备补偿',       ico: '🎧', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    inear:   { name: '入耳式 / TWS',   sub: '柔和齿音，提升低频下潜与包围感', ico: '🎵', gains: [2, 1, 0, 0, 0, 0, -1, -2, 1, 2] },
    overear: { name: '头戴式大耳',     sub: '拓展高频空气感与横向声场',       ico: '🎧', gains: [1, 1, 0, 0, 1, 1, 2, 2, 3, 2] },
    phone:   { name: '手机 / 笔记本',  sub: '补偿中低频厚度并限制破音',       ico: '📱', gains: [-2, 1, 3, 3, 2, 1, 2, 2, 1, 0] },
    speaker: { name: '桌面音箱',       sub: '增强中频结像与立体声纵深',       ico: '🔊', gains: [2, 2, 1, 0, 1, 2, 2, 1, 1, 1] },
    car:     { name: '车载音响',       sub: '抑制车厢驻波，突出人声清晰度',   ico: '🚗', gains: [-2, -2, 0, 2, 3, 3, 2, 2, 1, 0] }
  };

  let fxState = {
    enabled: false,
    preset: 'ai_master',
    aiStyle: 'clear',
    device: 'default',
    gains: [2, 2, 1, 0, 1, 2, 3, 4, 4, 3],
    reverb: 0.14,
    spatialMode: 'wide', // 'off' | '8d' | '360' | 'wide'
    orbitSpeed: 1.0,
    speed: 1
  };

  try {
    const saved = JSON.parse(localStorage.getItem('shiny.musicFxState') || 'null');
    if (saved && Array.isArray(saved.gains) && saved.gains.length === 10) {
      // Migrate legacy v1 state seamlessly
      if (typeof saved.enabled !== 'boolean') {
        saved.enabled = saved.preset !== 'flat' || !!saved.surround8d || Number(saved.reverb || 0) > 0;
      }
      if (!saved.spatialMode) {
        saved.spatialMode = saved.surround8d ? '8d' : 'off';
      }
      if (saved.preset === 'flat') {
        saved.preset = 'ai_master';
        saved.enabled = false;
      } else if (saved.preset === 'surround') {
        saved.preset = 'surround_8d';
      } else if (saved.preset === 'vocal') {
        saved.preset = 'vocal_clear';
      } else if (saved.preset === 'bass') {
        saved.preset = 'megabass';
      }
      fxState = { ...fxState, ...saved };
    }
  } catch {}

  function saveFxState() {
    try { localStorage.setItem('shiny.musicFxState', JSON.stringify(fxState)); } catch {}
  }

  /* ── 1. Web Audio API Studio DSP Graph (10-Band EQ + 8D/360° + 5.1 Widener + Limiter) ── */
  let ctx = null;
  let sourceNode = null;
  let filters = [];
  let dryGain = null;
  let wetGain = null;
  let wideGain = null;
  let wideDelay = null;
  let convolver = null;
  let panner = null;
  let compressor = null;
  let panRaf = 0;
  let panPhase = 0;
  let dspReady = false;

  function buildImpulseResponse(audioCtx, duration = 2.1, decay = 2.6) {
    const rate = audioCtx.sampleRate;
    const len = Math.floor(rate * duration);
    const buf = audioCtx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function ensureSameOriginAudio(audio) {
    try {
      const curSrc = audio.currentSrc || audio.src || '';
      if (!curSrc || curSrc.startsWith('blob:') || curSrc.startsWith('data:')) return;
      const u = new URL(curSrc, location.href);
      if (u.origin !== location.origin && (u.protocol === 'http:' || u.protocol === 'https:')) {
        const wasPlaying = !audio.paused;
        const pos = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
        audio.crossOrigin = 'anonymous';
        audio.src = `/api/music-proxy?url=${encodeURIComponent(curSrc)}`;
        audio.load();
        if (pos > 0.2) {
          audio.addEventListener('loadedmetadata', () => {
            try { audio.currentTime = Math.min(pos, Math.max(0, (audio.duration || pos) - 0.5)); } catch {}
          }, { once: true });
        }
        if (wasPlaying) audio.play().catch(() => {});
      }
    } catch {}
  }

  function ensureDSP() {
    const audio = window.__musicAudio;
    if (audio) ensureSameOriginAudio(audio);
    if (dspReady) {
      if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
      return true;
    }
    if (!audio) return false;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      sourceNode = ctx.createMediaElementSource(audio);

      filters = EQ_BANDS.map((freq, i) => {
        const f = ctx.createBiquadFilter();
        f.type = i === 0 ? 'lowshelf' : (i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking');
        f.frequency.value = freq;
        f.Q.value = 1.2;
        f.gain.value = 0;
        return f;
      });

      panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      convolver = ctx.createConvolver();
      convolver.buffer = buildImpulseResponse(ctx);
      dryGain = ctx.createGain();
      dryGain.gain.value = 1;
      wetGain = ctx.createGain();
      wetGain.gain.value = 0;
      wideDelay = ctx.createDelay(0.05);
      wideDelay.delayTime.value = 0.012;
      wideGain = ctx.createGain();
      wideGain.gain.value = 0;

      // Studio Master Safety Limiter — keeps heavy sub-bass punchy with zero clipping
      compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -8;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.18;

      let tail = sourceNode;
      for (const f of filters) { tail.connect(f); tail = f; }
      if (panner) { tail.connect(panner); tail = panner; }

      tail.connect(dryGain);
      tail.connect(wideDelay);
      wideDelay.connect(wideGain);
      tail.connect(convolver);
      convolver.connect(wetGain);

      dryGain.connect(compressor);
      wideGain.connect(compressor);
      wetGain.connect(compressor);
      compressor.connect(ctx.destination);

      // Always resume AudioContext & guard same-origin whenever playback starts or resumes!
      const onAudioWake = () => {
        ensureSameOriginAudio(audio);
        if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
      };
      audio.addEventListener('play', onAudioWake);
      audio.addEventListener('playing', onAudioWake);

      dspReady = true;
      applyDSPParams();
      return true;
    } catch (e) {
      console.warn('Web Audio DSP init skipped:', e.message);
      return false;
    }
  }

  function getActiveFxShortLabel() {
    if (!fxState.enabled) return '音效';
    if (fxState.preset === 'custom') return '自定义EQ';
    return PRESETS[fxState.preset]?.short || '音效';
  }

  function getActiveFxFullLabel() {
    if (!fxState.enabled) return '原声直出（已关闭）';
    if (fxState.preset === 'ai_master') {
      const st = AI_STYLES[fxState.aiStyle]?.name || '通透';
      return `AI调音大师 · ${st}`;
    }
    if (fxState.preset === 'custom') return '自定义 10 段均衡器';
    return PRESETS[fxState.preset]?.name || '已开启';
  }

  function syncDockFxButton() {
    const btn = document.getElementById('btnOpenFxDialog');
    const lbl = document.getElementById('dockFxLabel');
    if (btn) {
      btn.classList.toggle('is-fx-active', !!fxState.enabled);
      btn.title = fxState.enabled
        ? `当前音效：${getActiveFxFullLabel()}（点击打开音效与环绕声）`
        : '音效与环绕声 · AI调音 / 8D / 360° / 均衡器';
    }
    if (lbl) lbl.textContent = getActiveFxShortLabel();
    const lfoBtn = document.getElementById('lfoFxBtn');
    if (lfoBtn) lfoBtn.classList.toggle('is-fx-active', !!fxState.enabled);
  }

  function applyDSPParams() {
    const audio = window.__musicAudio;
    if (audio) audio.playbackRate = fxState.speed || 1;
    syncDockFxButton();
    if (!dspReady || !ctx) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const on = !!fxState.enabled;
    const devGains = DEVICES[fxState.device]?.gains || [0,0,0,0,0,0,0,0,0,0];

    filters.forEach((f, i) => {
      const targetGain = on
        ? Math.max(-12, Math.min(12, Number(fxState.gains[i] || 0) + Number(devGains[i] || 0)))
        : 0;
      f.gain.setTargetAtTime(targetGain, now, 0.035);
    });

    const wet = on ? Math.max(0, Math.min(0.65, Number(fxState.reverb || 0))) : 0;
    const sp = on ? (fxState.spatialMode || 'off') : 'off';
    const wideAmt = (sp === 'wide' || sp === '360') ? 0.24 : (sp === '8d' ? 0.14 : 0);

    dryGain.gain.setTargetAtTime(1 - wet * 0.32 - wideAmt * 0.22, now, 0.05);
    wetGain.gain.setTargetAtTime(wet, now, 0.05);
    if (wideGain) wideGain.gain.setTargetAtTime(wideAmt, now, 0.05);

    if ((sp === '8d' || sp === '360') && panner) {
      if (!panRaf) {
        let lastPanTs = 0;
        const stepPan = (ts) => {
          const curSp = fxState.enabled ? (fxState.spatialMode || 'off') : 'off';
          if ((curSp !== '8d' && curSp !== '360') || !panner || !ctx) { panRaf = 0; return; }
          const dt = lastPanTs ? Math.min(0.05, Math.max(0.0005, (ts - lastPanTs) / 1000)) : 0.016;
          lastPanTs = ts;
          const playing = window.__musicAudio && !window.__musicAudio.paused;
          if (playing) {
            const spd = Math.max(0.4, Math.min(2.2, Number(fxState.orbitSpeed || 1)));
            panPhase += (curSp === '8d' ? 1.02 : 0.57) * spd * dt;
            const depth = curSp === '8d' ? 0.82 : 0.56;
            panner.pan.setTargetAtTime(Math.sin(panPhase) * depth, ctx.currentTime, 0.06);
          }
          panRaf = requestAnimationFrame(stepPan);
        };
        panRaf = requestAnimationFrame(stepPan);
      }
    } else {
      if (panRaf) { cancelAnimationFrame(panRaf); panRaf = 0; }
      if (panner && ctx) panner.pan.setTargetAtTime(0, ctx.currentTime, 0.08);
    }
  }

  /* ── 2. Sleep Timer (定时关闭) ──────────────────────────────────────── */
  let sleepTimerId = 0;
  let sleepAfterCurrent = false;
  let sleepEndAt = 0;

  function setSleepTimer(mode) {
    clearTimeout(sleepTimerId);
    sleepTimerId = 0;
    sleepAfterCurrent = false;
    sleepEndAt = 0;
    const status = document.getElementById('fxSleepStatus');
    if (mode === 'off') {
      if (status) status.textContent = '未开启定时关闭';
      return;
    }
    if (mode === 'track') {
      sleepAfterCurrent = true;
      if (status) status.textContent = '将在播完当前歌曲后自动暂停';
      return;
    }
    const mins = Number(mode);
    if (mins > 0) {
      sleepEndAt = Date.now() + mins * 60 * 1000;
      if (status) status.textContent = `将在 ${mins} 分钟后自动暂停`;
      sleepTimerId = setTimeout(() => {
        window.__musicAudio?.pause();
        if (status) status.textContent = '定时关闭已触发，已暂停播放';
      }, mins * 60 * 1000);
    }
  }

  /* ── 3. Helper: Current Playing Track Info ──────────────────────────── */
  function getActiveTrack() {
    try {
      const saved = JSON.parse(localStorage.getItem('shiny.bgMusicCurrentSong') || 'null');
      if (saved && saved.title) return saved;
    } catch {}
    return {
      title: document.getElementById('dockTitle')?.textContent || '',
      vocalists: document.getElementById('dockArtist')?.textContent || ''
    };
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ── 4. Build & Inject Studio UI (Buttons, Modals, Podcast Tab) ─────── */
  function injectStudioUI() {
    // A. Add FX Pill + Comments + MV buttons neatly inside the Dock "⋯ More" popover
    const dockActions = document.getElementById('dockMoreActions') || document.querySelector('.dock-aux-controls');
    const dockPills = document.getElementById('dockMorePills') || document.querySelector('.dock-aux-controls');
    if (dockActions && !document.getElementById('btnOpenFxDialog')) {
      const makeBtn = (id, title, svg) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.id = id;
        b.className = 'dock-pill-action-btn dock-icon-only';
        b.title = title;
        b.setAttribute('aria-label', title);
        b.innerHTML = svg;
        return b;
      };
      const btnComments = makeBtn('btnOpenCommentsDialog', '查看歌曲评论区',
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>');
      const btnMv = makeBtn('btnOpenMvDialog', '观看官方 MV',
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><polygon points="10 9 16 12 10 15 10 9" fill="currentColor" stroke="none"/></svg>');
      dockActions.append(btnComments, btnMv);

      // Labeled "音效" pill inside More popover right beside Quality & Source
      const btnFx = document.createElement('button');
      btnFx.type = 'button';
      btnFx.id = 'btnOpenFxDialog';
      btnFx.className = 'quality-badge-btn dock-fx-pill';
      btnFx.title = '音效与环绕声 · AI调音 / 8D / 360° / 均衡器';
      btnFx.setAttribute('aria-label', '音效与环绕声');
      btnFx.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M4 20v-7M4 9V4M12 20v-9M12 7V4M20 20v-5M20 11V4M2 13h4M10 7h4M18 15h4"/></svg>
        <span id="dockFxLabel">音效</span>
      `;
      const qualWrap = dockPills?.querySelector('.quality-selector-wrap');
      if (qualWrap) qualWrap.after(btnFx);
      else dockPills?.append(btnFx);

      btnFx.addEventListener('click', openFxDialog);
      btnComments.addEventListener('click', openCommentsDialog);
      btnMv.addEventListener('click', openMvDialog);
      syncDockFxButton();
    }

    // B. Place EQ / Comments / MV buttons neatly inside Fullscreen "⋯ More" popover
    const lfoMoreActions = document.getElementById('lfoMoreActions') || document.getElementById('lfoSubRow');
    if (lfoMoreActions && !document.getElementById('lfoFxBtn')) {
      const mkLfo = (id, title, svg) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lfo-circle-btn';
        b.id = id;
        b.title = title;
        b.setAttribute('aria-label', title);
        b.innerHTML = svg;
        return b;
      };
      const bFx = mkLfo('lfoFxBtn', '音效与8D环绕', '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>');
      const bCm = mkLfo('lfoCommentsBtn', '歌曲评论区', '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>');
      const bMv = mkLfo('lfoMvBtn', '观看 MV', '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><polygon points="10 9 16 12 10 15 10 9" fill="currentColor" stroke="none"/></svg>');
      lfoMoreActions.append(bFx, bCm, bMv);
      bFx.addEventListener('click', openFxDialog);
    }

    // C. Wire Anti-Misclick Hover-Intent (260ms) + Click Toggle for both "⋯ More" Menus
    const setupMoreMenu = (wrapId, btnId, menuId) => {
      const wrap = document.getElementById(wrapId);
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      if (!wrap || !btn || !menu || wrap.dataset.moreBound === '1') return;
      wrap.dataset.moreBound = '1';

      let openTimer = 0;
      let closeTimer = 0;
      let pinnedByClick = false;

      const hasActiveNested = () => {
        const qd = menu.querySelector('#qualityDropdown');
        if (qd && qd.classList.contains('show')) return true;
        const sd = menu.querySelector('#sourceDropdown');
        if (sd && sd.style.display && sd.style.display !== 'none') return true;
        const ae = document.activeElement;
        if (ae && menu.contains(ae) && ae.tagName === 'SELECT') return true;
        return false;
      };

      const open = () => {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        wrap.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        menu.setAttribute('aria-hidden', 'false');
      };

      const close = (force = false) => {
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        if (!force && hasActiveNested()) return;
        pinnedByClick = false;
        wrap.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
      };

      // Hover intent: only auto-open after resting 260ms on the ⋯ button (prevents accidental popups!)
      btn.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(closeTimer);
        if (wrap.classList.contains('is-open')) return;
        clearTimeout(openTimer);
        openTimer = setTimeout(open, 260);
      });
      btn.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(openTimer);
      });
      wrap.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(closeTimer);
      });
      wrap.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(openTimer);
        if (pinnedByClick) return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => close(false), 260);
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(openTimer);
        clearTimeout(closeTimer);
        if (wrap.classList.contains('is-open')) {
          close(true);
        } else {
          pinnedByClick = true;
          open();
        }
      });

      document.addEventListener('click', (e) => {
        if (!wrap.contains(e.target)) close(true);
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close(true);
      });
    };

    setupMoreMenu('dockMoreWrap', 'btnDockMore', 'dockMoreMenu');
    setupMoreMenu('lfoMoreWrap', 'btnLfoMore', 'lfoMoreMenu');

    // D. Auto-marquee select pills inside fullscreen More menu (scrolls smoothly when text overflows!)
    const syncLfoMarqueeSelect = (sel) => {
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
        sel.addEventListener('change', () => syncLfoMarqueeSelect(sel));
        new MutationObserver(() => syncLfoMarqueeSelect(sel)).observe(sel, { childList: true, subtree: true });
      }
      const textEl = host.querySelector('.mq-text');
      const vp = host.querySelector('.mq-viewport');
      if (!textEl || !vp) return;
      textEl.textContent = sel.options[sel.selectedIndex]?.textContent || sel.value || '';
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
    };
    const lfoSrcSel = document.getElementById('lfoSourceSelect');
    const lfoQualSel = document.getElementById('lfoQualitySelect');
    syncLfoMarqueeSelect(lfoSrcSel);
    syncLfoMarqueeSelect(lfoQualSel);
    document.getElementById('lfoMoreWrap')?.addEventListener('transitionend', () => {
      syncLfoMarqueeSelect(lfoSrcSel);
      syncLfoMarqueeSelect(lfoQualSel);
    });
      document.getElementById('lfoCommentsBtn')?.addEventListener('click', () => {
        // Toggle inline comments <-> lyrics cleanly without any top tab bar
        if (document.getElementById('lfoCommentsPane')) {
          switchLfoTab(activeLfoTab === 'comments' ? 'lyrics' : 'comments');
        } else {
          openCommentsDialog();
        }
      });
      document.getElementById('lfoMvBtn')?.addEventListener('click', openMvDialog);
      document.getElementById('lfoQueueBtn')?.addEventListener('click', () => {
        if (document.getElementById('lfoQueuePane')) {
          switchLfoTab(activeLfoTab === 'queue' ? 'lyrics' : 'queue');
        }
      });

    // B2. Wire Cloudy-inspired Full-Screen Now-Playing Right Column Tabs (歌词 / 律动 / 待播清单 / 评论)
    let activeLfoTab = 'lyrics';
    let lastLfoCommentSongKey = '';
    function switchLfoTab(tabKey) {
      activeLfoTab = tabKey || 'lyrics';
      document.querySelectorAll('#lfoRightTabs .lfo-rtab').forEach(b => {
        b.classList.toggle('active', b.dataset.lfoTab === activeLfoTab);
      });
      document.querySelectorAll('[data-lfo-pane]').forEach(p => {
        p.hidden = p.dataset.lfoPane !== activeLfoTab;
      });
      if (activeLfoTab === 'queue') renderLfoQueue();
      else if (activeLfoTab === 'comments') renderLfoInlineComments(false);
      else if (activeLfoTab === 'rhythm') syncLfoRhythmLyric();
    }
    document.querySelectorAll('#lfoRightTabs .lfo-rtab').forEach(btn => {
      btn.addEventListener('click', () => switchLfoTab(btn.dataset.lfoTab));
    });

    function renderLfoQueue() {
      const pane = document.getElementById('lfoQueuePane');
      if (!pane) return;
      const st = window.__musicAPI?.getPlaylist?.();
      const list = st?.list || [];
      const curIdx = st?.index ?? -1;
      if (!list.length) {
        pane.innerHTML = '<div class="studio-empty">待播清单暂无曲目</div>';
        return;
      }
      pane.innerHTML = list.map((s, idx) => `
        <button type="button" class="lfo-queue-row ${idx === curIdx ? 'active' : ''}" data-q-idx="${idx}">
          <img src="${escapeHtml(s.cover || '/app-icon.png')}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='/app-icon.png'">
          <div class="lfo-queue-meta">
            <strong>${idx === curIdx ? '▶ ' : ''}${escapeHtml(s.title || '')}</strong>
            <span>${escapeHtml(s.vocalists || s.unitName || '')}</span>
          </div>
        </button>
      `).join('');
      pane.querySelectorAll('.lfo-queue-row').forEach(row => {
        row.addEventListener('click', () => {
          const i = Number(row.dataset.qIdx);
          if (list[i] && window.__musicAPI?.playSongById) {
            window.__musicAPI.playSongById(list[i].id, list[i]);
            setTimeout(renderLfoQueue, 80);
          }
        });
      });
      const activeRow = pane.querySelector('.lfo-queue-row.active');
      if (activeRow) try { activeRow.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}
    }

    async function renderLfoInlineComments(force = false) {
      const pane = document.getElementById('lfoCommentsPane');
      const countEl = document.getElementById('lfoCommentCount');
      if (!pane) return;
      const song = getActiveTrack();
      const key = `${song.id || ''}:${song.title || ''}`;
      if (!force && lastLfoCommentSongKey === key && pane.querySelector('.lfo-cmt-item')) return;
      lastLfoCommentSongKey = key;
      pane.innerHTML = '<div class="studio-empty">正在加载歌曲热评…</div>';
      try {
        const nid = song.neteaseId || (song.id && String(song.id).startsWith('track_') ? String(song.id).slice(6) : '');
        const r = await fetch(`/api/private-music/ncm/comments?id=${encodeURIComponent(nid)}&title=${encodeURIComponent(song.title || '')}&artist=${encodeURIComponent(song.vocalists || song.unitName || '')}`);
        const j = await r.json();
        const total = Number(j.total || 0);
        if (countEl) {
          countEl.textContent = total >= 10000 ? `${(total / 10000).toFixed(1)}万` : (total > 0 ? String(total) : '');
        }
        const hot = j.hotComments || [];
        const latest = j.comments || [];
        if (!hot.length && !latest.length) {
          pane.innerHTML = '<div class="studio-empty">该曲目暂无公开评论</div>';
          return;
        }
        const fmtLikes = (n) => n >= 10000 ? `${(n / 10000).toFixed(1)}万` : String(n || 0);
        const renderBlock = (title, items) => items.length ? `
          <div class="lfo-cmt-sec-title">${title}</div>
          ${items.map(c => `
            <div class="lfo-cmt-item">
              <img src="${escapeHtml(c.avatar || '/app-icon.png')}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='/app-icon.png'">
              <div class="lfo-cmt-body">
                <div class="lfo-cmt-top">
                  <span class="lfo-cmt-user">${escapeHtml(c.user || '听众')}</span>
                  <span class="lfo-cmt-likes">👍 ${fmtLikes(c.likedCount)}</span>
                </div>
                <p class="lfo-cmt-text">${escapeHtml(c.content || '')}</p>
                <span class="lfo-cmt-date">${escapeHtml(c.timeStr || '')}</span>
              </div>
            </div>
          `).join('')}
        ` : '';
        pane.innerHTML = renderBlock('精彩热评', hot) + renderBlock('最新评论', latest);
      } catch (e) {
        pane.innerHTML = `<div class="studio-empty">评论加载失败：${escapeHtml(e.message)}</div>`;
      }
    }

    function syncLfoRhythmLyric() {
      const jpEl = document.getElementById('lfoRhythmJp');
      const zhEl = document.getElementById('lfoRhythmZh');
      if (!jpEl) return;
      const activeLine = document.querySelector('#lfoLyricsScroll .lfo-lyric-line.active');
      if (activeLine) {
        jpEl.textContent = activeLine.querySelector('.lfo-lyric-jp')?.textContent || '♪';
        if (zhEl) zhEl.textContent = activeLine.querySelector('.lfo-lyric-zh')?.textContent || '';
      } else {
        const s = getActiveTrack();
        jpEl.textContent = s.title || '♪';
        if (zhEl) zhEl.textContent = s.vocalists || s.unitName || '';
      }
    }

    // Keep Cloudy inline tabs synced as songs play & lyrics advance
    setInterval(() => {
      const ov = document.getElementById('lyricsFullOverlay');
      if (!ov || !ov.classList.contains('is-open')) return;
      if (activeLfoTab === 'rhythm') syncLfoRhythmLyric();
    }, 350);
    window.__musicAudio?.addEventListener('loadedmetadata', () => {
      if (activeLfoTab === 'queue') renderLfoQueue();
      else if (activeLfoTab === 'comments') renderLfoInlineComments(true);
      else if (activeLfoTab === 'rhythm') syncLfoRhythmLyric();
    });

    // C. Add Voice Podcast Tab to Music Content Panel
    const tabGroup = document.querySelector('.tab-buttons-group');
    const songsView = document.getElementById('songsViewContainer');
    if (tabGroup && !document.getElementById('btnPodcastTab')) {
      const podTab = document.createElement('button');
      podTab.type = 'button';
      podTab.id = 'btnPodcastTab';
      podTab.className = 'tab-btn';
      podTab.dataset.tab = 'podcast';
      podTab.title = '声音播客与电台';
      podTab.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>播客';
      tabGroup.appendChild(podTab);

      const podView = document.createElement('div');
      podView.id = 'podcastViewContainer';
      podView.className = 'podcast-view-container';
      podView.hidden = true;
      podView.innerHTML = `
        <div class="podcast-toolbar">
          <div class="podcast-chips">
            <button type="button" class="pod-chip active" data-pq="偶像大师">偶像大师</button>
            <button type="button" class="pod-chip" data-pq="闪耀色彩">闪耀色彩</button>
            <button type="button" class="pod-chip" data-pq="学园偶像大师">学园偶像大师</button>
            <button type="button" class="pod-chip" data-pq="声优广播">声优广播</button>
            <button type="button" class="pod-chip" data-pq="助眠白噪音">助眠白噪音</button>
          </div>
          <div class="podcast-search-box">
            <input type="text" id="podcastSearchInput" placeholder="搜索声音播客 / 电台…" aria-label="搜索播客">
            <button type="button" id="btnPodcastSearch">搜播客</button>
          </div>
        </div>
        <div class="podcast-body" id="podcastBody"></div>
      `;
      songsView?.after(podView);

      // Hide podcast view whenever any other tab is clicked
      tabGroup.querySelectorAll('.tab-btn:not(#btnPodcastTab)').forEach(btn => {
        btn.addEventListener('click', () => {
          podTab.classList.remove('active');
          podView.hidden = true;
          if (songsView) songsView.style.display = '';
        });
      });

      podTab.addEventListener('click', () => {
        tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === podTab));
        if (songsView) songsView.style.display = 'none';
        const lyr = document.getElementById('lyricsViewContainer');
        if (lyr) lyr.style.display = 'none';
        podView.hidden = false;
        if (!podView.dataset.loaded) {
          podView.dataset.loaded = '1';
          loadPodcasts('偶像大师');
        }
      });

      podView.querySelectorAll('.pod-chip').forEach(ch => {
        ch.addEventListener('click', () => {
          podView.querySelectorAll('.pod-chip').forEach(c => c.classList.toggle('active', c === ch));
          loadPodcasts(ch.dataset.pq);
        });
      });

      const doPodSearch = () => {
        const q = (document.getElementById('podcastSearchInput')?.value || '').trim();
        if (q) loadPodcasts(q);
      };
      document.getElementById('btnPodcastSearch')?.addEventListener('click', doPodSearch);
      document.getElementById('podcastSearchInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') doPodSearch();
      });
    }

    // D. Inject 3 Studio Dialogs (NetEase-style FX/Surround Studio, Comments, MV Cinema)
    if (!document.getElementById('fxStudioDialog')) {
      const fxDlg = document.createElement('dialog');
      fxDlg.id = 'fxStudioDialog';
      fxDlg.className = 'music-source-dialog studio-fx-dialog';
      fxDlg.innerHTML = `
        <div class="dialog-content-box studio-fx-box fx-studio-v2">
          <div class="fx-v2-topbar">
            <div class="fx-v2-tabs" role="tablist">
              <button type="button" class="fx-v2-tab active" data-fx-tab="effects" role="tab">音效</button>
              <button type="button" class="fx-v2-tab" data-fx-tab="device" role="tab">设备适配</button>
              <button type="button" class="fx-v2-tab" data-fx-tab="eq" role="tab">均衡器</button>
            </div>
            <div class="fx-v2-status-right">
              <span class="fx-v2-using" id="fxUsingLabel">正在使用：原声直出</span>
              <label class="fx-switch" title="总音效开关">
                <input type="checkbox" id="fxMasterToggle">
                <span class="fx-switch-track"></span>
              </label>
              <button type="button" class="dialog-close-btn" id="btnCloseFxDialog" aria-label="关闭">✕</button>
            </div>
          </div>

          <div class="fx-v2-toast" id="fxV2Toast" hidden></div>

          <!-- Pane 1: 音效 (SVIP AI调音大师 + 官方精选音效卡片) -->
          <div class="fx-v2-pane active" data-fx-pane="effects">
            <div class="fx-sec-label">SVIP 尊享音效</div>
            <div class="fx-ai-banner" id="fxAiBanner">
              <div class="fx-ai-left">
                <div class="fx-ai-title">
                  <strong>AI调音大师</strong>
                  <em>master</em>
                  <span class="qrm-tier-badge svip">SVIP</span>
                </div>
                <p class="fx-ai-desc" id="fxAiDesc">这首歌调音风格为通透，片段衔接流畅，听感清爽开阔</p>
                <div class="fx-ai-actions">
                  <button type="button" class="fx-ai-cta" id="btnFxAiToggle">开启 AI调音</button>
                  <div class="fx-ai-styles" id="fxAiStyles">
                    ${Object.entries(AI_STYLES).map(([k, s]) => `<button type="button" class="fx-ai-style-chip" data-ai-style="${k}">${s.name}</button>`).join('')}
                  </div>
                </div>
              </div>
              <div class="fx-ai-cover-wrap">
                <img id="fxAiCoverImg" src="/app-icon.png" alt="">
                <span class="fx-ai-cover-tag" id="fxAiCoverTag">通透</span>
              </div>
            </div>

            <div class="fx-sec-label">官方精选音效 · 环绕声场</div>
            <div class="fx-cards-grid" id="fxCardsGrid"></div>
          </div>

          <!-- Pane 2: 设备适配 -->
          <div class="fx-v2-pane" data-fx-pane="device">
            <div class="fx-sec-label">声学设备频响补偿（与当前音效叠加生效）</div>
            <div class="fx-device-grid" id="fxDeviceGrid"></div>
          </div>

          <!-- Pane 3: 10段均衡器 & 空间环绕微调 -->
          <div class="fx-v2-pane" data-fx-pane="eq">
            <div class="fx-spatial-row">
              <label class="fx-mini-select">
                <span>空间环绕模式</span>
                <select id="fxSpatialSelect">
                  <option value="off">关闭环绕</option>
                  <option value="8d">8D 环绕（追踪律动）</option>
                  <option value="360">360° 环绕（行星声场）</option>
                  <option value="wide">沉浸环绕声 5.1（宽广声场）</option>
                </select>
              </label>
              <label class="fx-inline-slider">
                <span>环绕速度</span>
                <input type="range" id="fxOrbitSpeedRange" min="40" max="200" value="100">
                <output id="fxOrbitSpeedVal">1.0x</output>
              </label>
              <label class="fx-inline-slider">
                <span>房间混响</span>
                <input type="range" id="fxReverbRange" min="0" max="65" value="0">
                <output id="fxReverbVal">0%</output>
              </label>
            </div>
            <div class="fx-eq-grid" id="fxEqGrid"></div>
            <div class="fx-bottom-row">
              <label class="fx-mini-select">
                <span>播放倍速</span>
                <select id="fxSpeedSelect">
                  <option value="0.75">0.75x</option>
                  <option value="1" selected>1.0x 原速</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2.0x</option>
                </select>
              </label>
              <label class="fx-mini-select">
                <span>定时关闭</span>
                <select id="fxSleepSelect">
                  <option value="off">关闭</option>
                  <option value="15">15 分钟</option>
                  <option value="30">30 分钟</option>
                  <option value="60">60 分钟</option>
                  <option value="track">播完当前歌曲</option>
                </select>
              </label>
              <button type="button" class="dialog-action-btn secondary" id="btnFxReset">重置原声</button>
            </div>
            <p class="pm-status-line" id="fxSleepStatus"></p>
          </div>
        </div>
      `;
      document.body.appendChild(fxDlg);
      fxDlg.addEventListener('click', (e) => {
        if (e.target === fxDlg) fxDlg.close();
      });
      wireFxDialog(fxDlg);
    }

    if (!document.getElementById('commentsDialog')) {
      const cmDlg = document.createElement('dialog');
      cmDlg.id = 'commentsDialog';
      cmDlg.className = 'music-source-dialog studio-comments-dialog';
      cmDlg.innerHTML = `
        <div class="dialog-content-box studio-comments-box">
          <div class="dialog-header">
            <div>
              <h3 id="commentsDialogTitle">歌曲评论区</h3>
              <p class="dialog-sub-note" id="commentsDialogSub">正在加载精彩热评…</p>
            </div>
            <button type="button" class="dialog-close-btn" id="btnCloseCommentsDialog">✕</button>
          </div>
          <div class="comments-scroll-body" id="commentsScrollBody"></div>
        </div>
      `;
      document.body.appendChild(cmDlg);
      document.getElementById('btnCloseCommentsDialog')?.addEventListener('click', () => cmDlg.close());
    }

    if (!document.getElementById('mvDialog')) {
      const mvDlg = document.createElement('dialog');
      mvDlg.id = 'mvDialog';
      mvDlg.className = 'music-source-dialog studio-mv-dialog';
      mvDlg.innerHTML = `
        <div class="dialog-content-box studio-mv-box">
          <div class="dialog-header">
            <div>
              <h3 id="mvDialogTitle">官方 MV 影院</h3>
              <p class="dialog-sub-note" id="mvDialogSub"></p>
            </div>
            <div class="mv-head-actions">
              <div class="mv-res-pills" id="mvResPills"></div>
              <button type="button" class="dialog-close-btn" id="btnCloseMvDialog">✕</button>
            </div>
          </div>
          <div class="mv-stage-wrap">
            <video id="mvVideoPlayer" controls playsinline preload="auto" style="transform:translateZ(0);will-change:transform;"></video>
            <div class="mv-status-overlay" id="mvStatusOverlay">正在检索高清 MV…</div>
          </div>
        </div>
      `;
      document.body.appendChild(mvDlg);
      const resetMvVideo = () => {
        const v = document.getElementById('mvVideoPlayer');
        if (v) {
          v.onerror = null;
          v.oncanplay = null;
          v.pause();
          v.removeAttribute('src');
          v.load();
        }
      };
      document.getElementById('btnCloseMvDialog')?.addEventListener('click', () => { resetMvVideo(); mvDlg.close(); });
      mvDlg.addEventListener('close', resetMvVideo);
    }

    // E. Inject Multi-Platform Account Login Tab into #sourceDialog (QQ / Kugou / Apple / Migu)
    injectMultiPlatformAuthTab();
  }

  /* ── 5. Wire NetEase-style 3-Tab Sound Effects & Surround Studio ────── */
  let fxToastTimer = 0;
  function showFxBannerToast(msg) {
    const el = document.getElementById('fxV2Toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(fxToastTimer);
    fxToastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  let _syncFxUIFn = null;

  function applyPresetByKey(key, { silent = false } = {}) {
    const p = PRESETS[key];
    if (!p) return;
    fxState.enabled = true;
    fxState.preset = key;
    if (key === 'ai_master') {
      const st = AI_STYLES[fxState.aiStyle] || AI_STYLES.clear;
      fxState.gains = st.gains.slice();
      fxState.reverb = st.reverb;
      fxState.spatialMode = st.spatial;
    } else {
      fxState.gains = p.gains.slice();
      fxState.reverb = p.reverb;
      fxState.spatialMode = p.spatial || 'off';
    }
    ensureDSP();
    applyDSPParams();
    _syncFxUIFn?.();
    saveFxState();
    if (!silent) showFxBannerToast(`✦ 已为你开启 ${p.name}`);
  }

  function wireFxDialog(dlg) {
    const cardsGrid = document.getElementById('fxCardsGrid');
    const deviceGrid = document.getElementById('fxDeviceGrid');
    const eqGrid = document.getElementById('fxEqGrid');
    const masterToggle = document.getElementById('fxMasterToggle');
    const usingLabel = document.getElementById('fxUsingLabel');
    const aiBanner = document.getElementById('fxAiBanner');
    const aiDesc = document.getElementById('fxAiDesc');
    const aiCoverTag = document.getElementById('fxAiCoverTag');
    const btnAiToggle = document.getElementById('btnFxAiToggle');
    const spatialSel = document.getElementById('fxSpatialSelect');
    const orbitRange = document.getElementById('fxOrbitSpeedRange');
    const orbitVal = document.getElementById('fxOrbitSpeedVal');
    const revRange = document.getElementById('fxReverbRange');
    const revVal = document.getElementById('fxReverbVal');
    const speedSel = document.getElementById('fxSpeedSelect');
    const sleepSel = document.getElementById('fxSleepSelect');

    // Tab switching
    dlg.querySelectorAll('.fx-v2-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.fxTab;
        dlg.querySelectorAll('.fx-v2-tab').forEach(t => t.classList.toggle('active', t === tab));
        dlg.querySelectorAll('.fx-v2-pane').forEach(p => p.classList.toggle('active', p.dataset.fxPane === target));
      });
    });

    let renderedFxPlat = '';
    const renderPlatformFxCards = (force = false) => {
      const pKey = getCurrentPlatformKey();
      if (!force && renderedFxPlat === pKey && cardsGrid.children.length) return;
      renderedFxPlat = pKey;
      const prof = getPlatformFxProfile(pKey);
      const secLabels = dlg.querySelectorAll('[data-fx-pane="effects"] .fx-sec-label');
      if (secLabels[0]) secLabels[0].textContent = prof.secHero;
      if (secLabels[1]) secLabels[1].textContent = prof.secGrid;
      const aiTitleStrong = dlg.querySelector('.fx-ai-title strong');
      const aiTitleEm = dlg.querySelector('.fx-ai-title em');
      if (aiTitleStrong) aiTitleStrong.textContent = prof.heroName;
      if (aiTitleEm) aiTitleEm.textContent = prof.heroTag;

      cardsGrid.innerHTML = prof.presets
        .filter(k => PRESETS[k])
        .map(k => {
          const p = PRESETS[k];
          return `
            <button type="button" class="fx-card theme-${p.theme} ${p.wide ? 'is-wide' : ''}" data-preset="${k}">
              <div class="fx-card-top">
                ${p.tier ? `<span class="qrm-tier-badge ${p.tier === 'SVIP' ? 'svip' : 'vip'}">${p.tier}</span>` : '<span class="fx-card-dot">✦</span>'}
                <span class="fx-card-check" aria-hidden="true">✓</span>
              </div>
              <div class="fx-card-body">
                <strong>${escapeHtml(p.name)}</strong>
                <span>${escapeHtml(p.desc)}</span>
              </div>
            </button>
          `;
        }).join('');

      cardsGrid.querySelectorAll('.fx-card').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.preset;
          if (fxState.enabled && fxState.preset === key) {
            fxState.enabled = false;
            applyDSPParams();
            syncFxUI();
            saveFxState();
            showFxBannerToast(`已关闭 ${PRESETS[key]?.name || '音效'}`);
          } else {
            applyPresetByKey(key);
          }
        });
      });
    };
    renderPlatformFxCards(true);
    window.addEventListener('shiny-platform-changed', () => {
      renderPlatformFxCards(true);
      syncFxUI();
    });

    // Device adaptation cards
    deviceGrid.innerHTML = Object.entries(DEVICES).map(([k, d]) => `
      <button type="button" class="fx-dev-card" data-device="${k}">
        <span class="fx-dev-ico">${d.ico}</span>
        <div class="fx-dev-meta">
          <strong>${escapeHtml(d.name)}</strong>
          <span>${escapeHtml(d.sub)}</span>
        </div>
        <span class="fx-dev-check" aria-hidden="true">✓</span>
      </button>
    `).join('');

    // 10-band EQ sliders
    eqGrid.innerHTML = EQ_BANDS.map((freq, i) => `
      <div class="fx-eq-col">
        <span class="fx-eq-val" data-eq-val="${i}">${fxState.gains[i] > 0 ? '+' : ''}${fxState.gains[i]}</span>
        <input type="range" class="fx-eq-slider" data-eq-idx="${i}" min="-12" max="12" step="1" value="${fxState.gains[i]}" orient="vertical">
        <span class="fx-eq-hz">${EQ_LABELS[i]}</span>
      </div>
    `).join('');

    const syncFxUI = () => {
      const on = !!fxState.enabled;
      if (masterToggle) masterToggle.checked = on;
      if (usingLabel) usingLabel.textContent = `正在使用：${getActiveFxFullLabel()}`;

      const isAi = on && fxState.preset === 'ai_master';
      aiBanner?.classList.toggle('is-active', isAi);
      const curAi = AI_STYLES[fxState.aiStyle] || AI_STYLES.clear;
      if (aiDesc) aiDesc.textContent = curAi.desc;
      if (aiCoverTag) aiCoverTag.textContent = curAi.name;
      if (btnAiToggle) btnAiToggle.textContent = isAi ? '取消' : '开启 AI调音';
      dlg.querySelectorAll('.fx-ai-style-chip').forEach(ch => {
        ch.classList.toggle('active', ch.dataset.aiStyle === fxState.aiStyle);
      });

      const coverImg = document.getElementById('fxAiCoverImg');
      const dockCover = document.getElementById('dockThumbImg')?.src;
      if (coverImg && dockCover) coverImg.src = dockCover;

      cardsGrid.querySelectorAll('.fx-card').forEach(b => {
        b.classList.toggle('active', on && b.dataset.preset === fxState.preset);
      });
      deviceGrid.querySelectorAll('.fx-dev-card').forEach(b => {
        b.classList.toggle('active', b.dataset.device === (fxState.device || 'default'));
      });
      eqGrid.querySelectorAll('.fx-eq-slider').forEach((sl, i) => {
        sl.value = String(fxState.gains[i] || 0);
        const v = eqGrid.querySelector(`[data-eq-val="${i}"]`);
        if (v) v.textContent = `${fxState.gains[i] > 0 ? '+' : ''}${fxState.gains[i]}`;
      });
      if (spatialSel) spatialSel.value = fxState.spatialMode || 'off';
      if (orbitRange) orbitRange.value = String(Math.round((fxState.orbitSpeed || 1) * 100));
      if (orbitVal) orbitVal.textContent = `${Number(fxState.orbitSpeed || 1).toFixed(1)}x`;
      if (revRange) revRange.value = String(Math.round((fxState.reverb || 0) * 100));
      if (revVal) revVal.textContent = `${Math.round((fxState.reverb || 0) * 100)}%`;
      if (speedSel) speedSel.value = String(fxState.speed || 1);
      syncDockFxButton();
    };
    _syncFxUIFn = syncFxUI;

    masterToggle?.addEventListener('change', () => {
      fxState.enabled = masterToggle.checked;
      if (fxState.enabled) ensureDSP();
      applyDSPParams();
      syncFxUI();
      saveFxState();
      showFxBannerToast(fxState.enabled ? `✦ 已开启 ${getActiveFxFullLabel()}` : '已关闭音效（原声直出）');
    });

    btnAiToggle?.addEventListener('click', () => {
      if (fxState.enabled && fxState.preset === 'ai_master') {
        fxState.enabled = false;
        applyDSPParams();
        syncFxUI();
        saveFxState();
        showFxBannerToast('已取消 AI调音大师');
      } else {
        applyPresetByKey('ai_master');
      }
    });

    dlg.querySelectorAll('.fx-ai-style-chip').forEach(ch => {
      ch.addEventListener('click', () => {
        fxState.aiStyle = ch.dataset.aiStyle || 'clear';
        applyPresetByKey('ai_master');
      });
    });

    deviceGrid.querySelectorAll('.fx-dev-card').forEach(btn => {
      btn.addEventListener('click', () => {
        fxState.device = btn.dataset.device || 'default';
        if (fxState.device !== 'default' && !fxState.enabled) {
          fxState.enabled = true;
        }
        ensureDSP();
        applyDSPParams();
        syncFxUI();
        saveFxState();
        showFxBannerToast(`🎧 已适配：${DEVICES[fxState.device]?.name || '默认设备'}`);
      });
    });

    eqGrid.querySelectorAll('.fx-eq-slider').forEach(sl => {
      sl.addEventListener('input', () => {
        const i = Number(sl.dataset.eqIdx);
        fxState.enabled = true;
        fxState.gains[i] = Number(sl.value);
        fxState.preset = 'custom';
        ensureDSP();
        applyDSPParams();
        syncFxUI();
        saveFxState();
      });
    });

    spatialSel?.addEventListener('change', () => {
      fxState.spatialMode = spatialSel.value || 'off';
      if (fxState.spatialMode !== 'off') fxState.enabled = true;
      ensureDSP();
      applyDSPParams();
      syncFxUI();
      saveFxState();
    });

    orbitRange?.addEventListener('input', () => {
      fxState.orbitSpeed = Number(orbitRange.value) / 100;
      if (orbitVal) orbitVal.textContent = `${fxState.orbitSpeed.toFixed(1)}x`;
      applyDSPParams();
      saveFxState();
    });

    revRange?.addEventListener('input', () => {
      fxState.reverb = Number(revRange.value) / 100;
      if (fxState.reverb > 0) fxState.enabled = true;
      if (revVal) revVal.textContent = `${revRange.value}%`;
      ensureDSP();
      applyDSPParams();
      syncFxUI();
      saveFxState();
    });

    speedSel?.addEventListener('change', () => {
      fxState.speed = Number(speedSel.value) || 1;
      applyDSPParams();
      saveFxState();
    });

    sleepSel?.addEventListener('change', () => setSleepTimer(sleepSel.value));

    document.getElementById('btnFxReset')?.addEventListener('click', () => {
      fxState = {
        enabled: false,
        preset: 'ai_master',
        aiStyle: 'clear',
        device: 'default',
        gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        reverb: 0,
        spatialMode: 'off',
        orbitSpeed: 1.0,
        speed: 1
      };
      applyDSPParams();
      syncFxUI();
      saveFxState();
      showFxBannerToast('已重置为原声直出');
    });

    document.getElementById('btnCloseFxDialog')?.addEventListener('click', () => dlg.close());
    syncFxUI();
  }

  function openFxDialog() {
    ensureDSP();
    _syncFxUIFn?.();
    document.getElementById('fxStudioDialog')?.showModal();
  }

  window.__musicFxAPI = {
    open: openFxDialog,
    getState: () => ({ ...fxState }),
    getPresetOptions: (pKey) => {
      const prof = getPlatformFxProfile(pKey);
      return [
        { value: 'off', label: '原声直出 (关闭音效)' },
        { value: 'ai_master', label: `✨ ${prof.heroName}` },
        ...prof.presets.filter(k => PRESETS[k]).map(k => ({ value: k, label: PRESETS[k].name }))
      ];
    },
    setPreset: (key) => applyPresetByKey(key),
    setEnabled: (on) => {
      fxState.enabled = !!on;
      if (fxState.enabled) ensureDSP();
      applyDSPParams();
      _syncFxUIFn?.();
      saveFxState();
    }
  };

  /* ── 6. Open Live Comments Drawer ───────────────────────────────────── */
  async function openCommentsDialog() {
    const dlg = document.getElementById('commentsDialog');
    const titleEl = document.getElementById('commentsDialogTitle');
    const subEl = document.getElementById('commentsDialogSub');
    const body = document.getElementById('commentsScrollBody');
    if (!dlg || !body) return;
    const song = getActiveTrack();
    if (titleEl) titleEl.textContent = `评论区 · ${song.title || '当前曲目'}`;
    if (subEl) subEl.textContent = '正在加载精彩热评…';
    body.innerHTML = '<div class="studio-empty">正在读取评论…</div>';
    dlg.showModal();

    try {
      const nid = song.neteaseId || (song.id && String(song.id).startsWith('track_') ? String(song.id).slice(6) : '');
      const url = `/api/private-music/ncm/comments?id=${encodeURIComponent(nid)}&title=${encodeURIComponent(song.title || '')}&artist=${encodeURIComponent(song.vocalists || song.unitName || '')}`;
      const r = await fetch(url);
      const j = await r.json();
      if (subEl) subEl.textContent = `共 ${(j.total || 0).toLocaleString()} 条评论`;
      const renderList = (heading, arr) => {
        if (!arr || !arr.length) return '';
        return `<div class="cm-section-title">${heading}</div>` + arr.map(c => `
          <article class="cm-item">
            <img class="cm-avatar" src="${escapeHtml(c.avatar)}" alt="" loading="lazy" onerror="this.src='/app-icon.png'">
            <div class="cm-main">
              <div class="cm-head">
                <strong>${escapeHtml(c.user)}</strong>
                <span>${escapeHtml(c.timeStr)}</span>
              </div>
              <p class="cm-text">${escapeHtml(c.content)}</p>
              <div class="cm-foot">♥ ${Number(c.likedCount || 0).toLocaleString()}</div>
            </div>
          </article>
        `).join('');
      };
      const html = renderList('精彩热评', j.hotComments) + renderList('最新评论', j.comments);
      body.innerHTML = html || '<div class="studio-empty">这首歌暂时还没有公开评论，换一首看看吧</div>';
    } catch (e) {
      body.innerHTML = `<div class="studio-empty">评论加载失败：${escapeHtml(e.message)}</div>`;
    }
  }

  /* ── 7. Open Official MV Cinema Modal (Multi-Resolution & Auto-Fallback) ── */
  async function openMvDialog() {
    const dlg = document.getElementById('mvDialog');
    const titleEl = document.getElementById('mvDialogTitle');
    const subEl = document.getElementById('mvDialogSub');
    const resPills = document.getElementById('mvResPills');
    const video = document.getElementById('mvVideoPlayer');
    const overlay = document.getElementById('mvStatusOverlay');
    if (!dlg || !video) return;

    const song = getActiveTrack();
    if (titleEl) titleEl.textContent = `MV · ${song.title || ''}`;
    if (subEl) subEl.textContent = song.vocalists || song.unitName || '';
    if (resPills) resPills.innerHTML = '';
    if (overlay) { overlay.hidden = false; overlay.textContent = '正在匹配高清 MV…'; }

    // Clear old handlers BEFORE removing src so no spurious error fires
    video.onerror = null;
    video.oncanplay = null;
    video.pause();
    video.removeAttribute('src');
    video.load();
    dlg.showModal();

    // Pause background audio while watching MV
    window.__musicAudio?.pause();

    try {
      const nid = song.neteaseId || (song.id && String(song.id).startsWith('track_') ? String(song.id).slice(6) : '');
      const r = await fetch(`/api/private-music/ncm/mv?id=${encodeURIComponent(nid)}&title=${encodeURIComponent(song.title || '')}&artist=${encodeURIComponent(song.vocalists || song.unitName || '')}`);
      const j = await r.json();
      const sources = Array.isArray(j.sources) && j.sources.length
        ? j.sources
        : (j.streamUrl ? [{ label: 'HD', directUrl: j.directUrl || '', streamUrl: j.streamUrl }] : []);
      if (!j.ok || !sources.length) {
        if (overlay) overlay.textContent = j.message || '未找到该曲目的公开 MV';
        return;
      }
      if (titleEl) titleEl.textContent = `MV · ${j.name || song.title}`;
      if (subEl) subEl.textContent = j.artist || '';

      // Build ordered playback candidates (direct Electron network first, then local proxy, across all resolutions)
      const playCandidateList = (candidates) => {
        let idx = 0;
        const tryNext = () => {
          if (!dlg.open) return;
          if (idx >= candidates.length) {
            if (overlay) {
              overlay.hidden = false;
              const openLink = sources[0]?.directUrl
                ? `<br><a class="mv-ext-link" href="${escapeHtml(sources[0].directUrl)}" target="_blank" rel="noopener">尝试外部浏览器打开</a>`
                : '';
              overlay.innerHTML = `MV 视频流加载失败（可能受网络或版权区域限制）${openLink}`;
            }
            return;
          }
          const cand = candidates[idx++];
          if (overlay) { overlay.hidden = false; overlay.textContent = `正在缓冲 ${cand.label} MV…`; }
          video.onerror = () => tryNext();
          video.oncanplay = () => { if (overlay) overlay.hidden = true; };
          video.src = cand.url;
          video.load();
          video.play().catch(() => {});
        };
        tryNext();
      };

      const buildQueue = (preferredIdx = 0) => {
        const ordered = [sources[preferredIdx], ...sources.filter((_, i) => i !== preferredIdx)].filter(Boolean);
        const list = [];
        // Prefer local domestic-direct proxy FIRST (bypasses system VPN for full domestic CDN speed!)
        for (const s of ordered) {
          if (s.streamUrl) list.push({ label: s.label, url: s.streamUrl });
          if (s.directUrl) list.push({ label: `${s.label} 直连`, url: s.directUrl });
        }
        return list;
      };

      if (resPills && sources.length > 1) {
        resPills.innerHTML = sources.map((s, i) =>
          `<button type="button" class="mv-res-pill ${i === 0 ? 'active' : ''}" data-mv-idx="${i}">${escapeHtml(s.label)}</button>`
        ).join('');
        resPills.querySelectorAll('.mv-res-pill').forEach(btn => {
          btn.addEventListener('click', () => {
            resPills.querySelectorAll('.mv-res-pill').forEach(b => b.classList.toggle('active', b === btn));
            playCandidateList(buildQueue(Number(btn.dataset.mvIdx)));
          });
        });
      }

      playCandidateList(buildQueue(0));
    } catch (e) {
      if (overlay) overlay.textContent = 'MV 加载失败：' + e.message;
    }
  }

  /* ── 7.5 Multi-Platform Account Login Center (QQ / Kugou / Apple / Migu) ── */
  function injectMultiPlatformAuthTab() {
    const dlg = document.getElementById('sourceDialog');
    const tabList = dlg?.querySelector('.pm-source-tabs');
    const ncmPane = dlg?.querySelector('[data-pm-pane="ncm"]');
    if (!dlg || !tabList || !ncmPane || dlg.querySelector('[data-pm-tab="platforms"]')) return;

    const tabBtn = document.createElement('button');
    tabBtn.type = 'button';
    tabBtn.className = 'pm-src-tab';
    tabBtn.dataset.pmTab = 'platforms';
    tabBtn.setAttribute('role', 'tab');
    tabBtn.textContent = 'QQ/酷狗/苹果/咪咕';
    tabList.children[0]?.after(tabBtn);

    const pane = document.createElement('div');
    pane.className = 'pm-src-pane';
    pane.dataset.pmPane = 'platforms';
    pane.innerHTML = `
      <div class="plat-subtabs" role="tablist">
        <button type="button" class="plat-pill active" data-plat="qq">QQ 音乐</button>
        <button type="button" class="plat-pill" data-plat="kugou">酷狗音乐</button>
        <button type="button" class="plat-pill" data-plat="apple">Apple Music</button>
        <button type="button" class="plat-pill" data-plat="migu">咪咕音乐</button>
      </div>

      <!-- QQ Music -->
      <div class="plat-panel active" data-plat-panel="qq">
        <div class="ncm-account-card" id="qqAccountCard" hidden>
          <div class="ncm-account-meta">
            <strong id="qqAccountName">已登录 QQ 音乐</strong>
            <span>播放 QQ 音源时将自动携带本机正版登录凭证</span>
          </div>
          <button type="button" class="dialog-action-btn secondary" id="btnQqLogout">退出登录</button>
        </div>
        <div class="ncm-qr-card" id="qqQrCard" style="padding:20px 16px;text-align:center;">
          <p class="dialog-note" style="margin:0 0 14px;line-height:1.6;">点击下方按钮打开<strong>QQ 音乐官方网页登录窗口</strong>，使用手机 QQ / 微信扫码确认后，系统将自动提取绿钻 / VIP 凭证并关闭窗口。</p>
          <div class="ncm-qr-actions" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">
            <button type="button" class="dialog-action-btn primary" id="btnQqBrowserLogin">🌐 打开 QQ 音乐官方窗口扫码登录</button>
          </div>
          <p class="pm-status-line" id="qqQrStatus" role="status"></p>
        </div>
        <label class="pm-field" style="margin-top:8px;">
          <span>QQ 音乐默认音质等级</span>
          <select class="dialog-input plat-default-quality" data-plat-quality="qq">
            <option value="jymaster">臻品母带 2.0 (SVIP 最高档)</option>
            <option value="sky">臻品全景声 7.1.4 (SVIP)</option>
            <option value="jyeffect">臻品音质 2.0 (VIP)</option>
            <option value="hires">Hi-Res 无损 (VIP)</option>
            <option value="flac">SQ 无损品质 (VIP)</option>
            <option value="320">HQ 高品质 320k (免费)</option>
            <option value="128">标准音质 128k (免费)</option>
          </select>
        </label>
        <details class="pm-adv-details">
          <summary>手动粘贴 QQ 音乐 Cookie（可选）</summary>
          <div class="pm-adv-body">
            <label class="pm-field">
              <span>QQ 音乐网页版 Cookie（含 uin / qm_keyst）</span>
              <input type="password" id="platQqCookie" class="dialog-input" placeholder="从 y.qq.com 复制的 Cookie">
            </label>
            <div class="pm-action-bar">
              <button type="button" class="dialog-action-btn" id="btnSaveQqCookie">保存 QQ 凭证</button>
            </div>
          </div>
        </details>
      </div>

      <!-- Kugou Music -->
      <div class="plat-panel" data-plat-panel="kugou">
        <div class="ncm-account-card" id="kgAccountCard" hidden>
          <div class="ncm-account-meta">
            <strong id="kgAccountName">已绑定酷狗账号</strong>
            <span>播放酷狗音源时将自动携带本机凭证</span>
          </div>
          <button type="button" class="dialog-action-btn secondary" id="btnKgLogout">清除凭证</button>
        </div>
        <div class="ncm-qr-panel" style="padding:16px 14px;">
          <p class="dialog-note" style="margin:0 0 10px;text-align:center;">点击下方按钮直接打开 <b>酷狗音乐官方网页</b> 扫码登录，登录成功后自动提取会员 Cookie 并关闭窗口：</p>
          <button type="button" class="dialog-action-btn primary" id="btnKgBrowserLogin">🌐 打开酷狗音乐官方窗口扫码登录</button>
          <p class="pm-status-line" id="kgBrowserStatus" role="status" style="margin-top:8px;"></p>
        </div>
        <label class="pm-field" style="margin-top:8px;">
          <span>酷狗音乐默认音质等级</span>
          <select class="dialog-input plat-default-quality" data-plat-quality="kugou">
            <option value="jymaster">蝰蛇母带 24bit (SVIP 最高档)</option>
            <option value="sky">蝰蛇全景声 2.0 (SVIP)</option>
            <option value="jyeffect">蝰蛇超清音质 (VIP)</option>
            <option value="hires">Hi-Res 高解析无损 (VIP)</option>
            <option value="flac">无损音质 FLAC (VIP)</option>
            <option value="320">高品音质 320k (免费)</option>
            <option value="128">标准音质 128k (免费)</option>
          </select>
        </label>
        <details class="pm-advanced-box">
          <summary>高级选项：手动粘贴酷狗 Cookie / Token（可选）</summary>
          <div class="pm-advanced-body">
            <label class="pm-field">
              <span>酷狗 Cookie（含 kg_mid / t / KugooID）</span>
              <input type="password" id="platKgCookie" class="dialog-input" placeholder="粘贴酷狗网页版 Cookie">
            </label>
            <div class="pm-field-grid">
              <label class="pm-field">
                <span>Token（可选）</span>
                <input type="password" id="platKgToken" class="dialog-input" placeholder="酷狗账号 token">
              </label>
              <label class="pm-field">
                <span>UserID（可选）</span>
                <input type="text" id="platKgUserid" class="dialog-input" placeholder="酷狗数字 ID">
              </label>
            </div>
            <div class="pm-action-bar">
              <button type="button" class="dialog-action-btn" id="btnSaveKgAuth">保存酷狗凭证</button>
            </div>
          </div>
        </details>
      </div>

      <!-- Apple Music -->
      <div class="plat-panel" data-plat-panel="apple">
        <div class="ncm-account-card" id="apAccountCard" hidden>
          <div class="ncm-account-meta">
            <strong id="apAccountName">已配置 Apple Music</strong>
            <span>区服与正版订阅令牌已保存至本机</span>
          </div>
          <button type="button" class="dialog-action-btn secondary" id="btnApLogout">清除令牌</button>
        </div>
        <div class="ncm-qr-panel" style="padding:16px 14px;">
          <p class="dialog-note" style="margin:0 0 10px;text-align:center;">默认无需登录即可搜索与试听官方高清音频；如需绑定个人订阅，可打开 <b>Apple Music 官方网页</b> 登录：</p>
          <button type="button" class="dialog-action-btn primary" id="btnAppleBrowserLogin">🌐 打开 Apple Music 官方窗口登录</button>
          <p class="pm-status-line" id="appleBrowserStatus" role="status" style="margin-top:8px;"></p>
        </div>
        <label class="pm-field">
          <span>首选曲库区服</span>
          <select id="platApStorefront" class="dialog-input">
            <option value="jp">日本区 (JP · 偶像大师最全)</option>
            <option value="cn">中国大陆区 (CN)</option>
            <option value="us">美国区 (US)</option>
            <option value="hk">香港区 (HK)</option>
          </select>
        </label>
        <label class="pm-field">
          <span>Apple Music 默认音质等级</span>
          <select class="dialog-input plat-default-quality" data-plat-quality="apple">
            <option value="jymaster">Hi-Res Lossless 192kHz/24bit</option>
            <option value="sky">Dolby Atmos 杜比全景声</option>
            <option value="jyeffect">Apple Digital Master 母带</option>
            <option value="hires">Lossless ALAC 无损</option>
            <option value="flac">ALAC 标准无损</option>
            <option value="320">AAC 256k 高效 (免费)</option>
            <option value="128">AAC 128k 省流 (免费)</option>
          </select>
        </label>
        <details class="pm-advanced-box">
          <summary>高级选项：手动粘贴 media-user-token（可选）</summary>
          <div class="pm-advanced-body">
            <label class="pm-field">
              <span>media-user-token（可选，来自 music.apple.com）</span>
              <input type="password" id="platApToken" class="dialog-input" placeholder="可选；留空使用官方公开曲库">
            </label>
          </div>
        </details>
        <div class="pm-action-bar">
          <button type="button" class="dialog-action-btn" id="btnSaveApAuth">保存 Apple Music 配置</button>
        </div>
      </div>

      <!-- Migu Music -->
      <div class="plat-panel" data-plat-panel="migu">
        <div class="ncm-account-card" id="mgAccountCard" hidden>
          <div class="ncm-account-meta">
            <strong id="mgAccountName">已绑定咪咕账号</strong>
            <span>播放咪咕音源时将自动携带本机凭证</span>
          </div>
          <button type="button" class="dialog-action-btn secondary" id="btnMgLogout">清除凭证</button>
        </div>
        <div class="ncm-qr-panel" style="padding:16px 14px;">
          <p class="dialog-note" style="margin:0 0 10px;text-align:center;">点击下方按钮直接打开 <b>咪咕音乐官方网页</b> 扫码登录，登录成功后自动提取会员 Cookie 并关闭窗口：</p>
          <button type="button" class="dialog-action-btn primary" id="btnMgBrowserLogin">🌐 打开咪咕音乐官方窗口扫码登录</button>
          <p class="pm-status-line" id="mgBrowserStatus" role="status" style="margin-top:8px;"></p>
        </div>
        <label class="pm-field" style="margin-top:8px;">
          <span>咪咕音乐默认音质等级</span>
          <select class="dialog-input plat-default-quality" data-plat-quality="migu">
            <option value="jymaster">至臻母带 24bit (SVIP 最高档)</option>
            <option value="sky">至臻全景声 (SVIP)</option>
            <option value="jyeffect">极光至臻 2.0 (VIP)</option>
            <option value="hires">至臻音质 Hi-Res (VIP)</option>
            <option value="flac">SQ 无损格式 (VIP)</option>
            <option value="320">HQ 超清 320k (免费)</option>
            <option value="128">标准音质 128k (免费)</option>
          </select>
        </label>
        <details class="pm-advanced-box">
          <summary>高级选项：手动粘贴咪咕 Cookie（可选）</summary>
          <div class="pm-advanced-body">
            <label class="pm-field">
              <span>咪咕音乐 Cookie</span>
              <input type="password" id="platMgCookie" class="dialog-input" placeholder="粘贴咪咕网页版 Cookie">
            </label>
            <div class="pm-action-bar">
              <button type="button" class="dialog-action-btn" id="btnSaveMgAuth">保存咪咕凭证</button>
            </div>
          </div>
        </details>
      </div>

      <p class="pm-status-line" id="platAuthStatus" role="status"></p>
    `;
    ncmPane.after(pane);

    // Wire top-level tab switching for the injected tab
    tabList.querySelectorAll('.pm-src-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.pmTab;
        tabList.querySelectorAll('.pm-src-tab').forEach(b => b.classList.toggle('active', b === btn));
        dlg.querySelectorAll('.pm-src-pane').forEach(p => p.classList.toggle('active', p.dataset.pmPane === key));
        if (key === 'platforms') refreshPlatformAuthUI();
      });
    });

    // Sub-platform pill switching
    pane.querySelectorAll('.plat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const k = pill.dataset.plat;
        pane.querySelectorAll('.plat-pill').forEach(b => b.classList.toggle('active', b === pill));
        pane.querySelectorAll('.plat-panel').forEach(p => p.classList.toggle('active', p.dataset.platPanel === k));
      });
    });

    const statusEl = document.getElementById('platAuthStatus');
    const setPlatStatus = (msg, ok = true) => {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'pm-status-line ' + (ok ? 'is-ok' : 'is-err');
    };

    async function refreshPlatformAuthUI() {
      try {
        const r = await fetch('/api/private-music/platform-auth');
        const j = await r.json();
        const pl = j.platforms || {};
        // QQ
        const qqCard = document.getElementById('qqAccountCard');
        const qqQr = document.getElementById('qqQrCard');
        if (pl.qq?.enabled && pl.qq?.cookie) {
          if (qqCard) qqCard.hidden = false;
          if (qqQr) qqQr.hidden = true;
          const nm = document.getElementById('qqAccountName');
          if (nm) nm.textContent = pl.qq.nickname || `QQ ${pl.qq.uin || '已登录'}`;
        } else {
          if (qqCard) qqCard.hidden = true;
          if (qqQr) qqQr.hidden = false;
        }
        // Kugou
        const kgCard = document.getElementById('kgAccountCard');
        if (kgCard) kgCard.hidden = !(pl.kugou?.enabled);
        const kgNm = document.getElementById('kgAccountName');
        if (kgNm && pl.kugou?.nickname) kgNm.textContent = pl.kugou.nickname;
        // Apple
        const apCard = document.getElementById('apAccountCard');
        if (apCard) apCard.hidden = !(pl.apple?.enabled);
        const apSf = document.getElementById('platApStorefront');
        if (apSf && pl.apple?.storefront) apSf.value = pl.apple.storefront;
        // Migu
        const mgCard = document.getElementById('mgAccountCard');
        if (mgCard) mgCard.hidden = !(pl.migu?.enabled);
        window.dispatchEvent(new CustomEvent('shiny-auth-changed', { detail: cfg }));
      } catch {}
    }

    async function savePlatformAuth(payload, okMsg) {
      try {
        const r = await fetch('/api/private-music/platform-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const j = await r.json();
        if (j.ok) {
          setPlatStatus(okMsg, true);
          refreshPlatformAuthUI();
        } else {
          setPlatStatus(j.message || '保存失败', false);
        }
      } catch (e) {
        setPlatStatus('保存失败：' + e.message, false);
      }
    }

    // Unified Official Browser Window Login Helper (QQ / 酷狗 / Apple Music / 咪咕)
    function bindBrowserLoginBtn(btnId, statusId, platform, label) {
      document.getElementById(btnId)?.addEventListener('click', async () => {
        const btn = document.getElementById(btnId);
        const st = document.getElementById(statusId);
        if (btn) btn.disabled = true;
        if (st) { st.className = 'pm-status-line'; st.textContent = `已打开 ${label} 官方登录窗口，请扫码/登录后自动关闭并生效…`; }
        try {
          const r = await fetch('/api/private-music/browser-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform })
          });
          const j = await r.json();
          if (j?.ok) {
            if (st) { st.className = 'pm-status-line is-ok'; st.textContent = `✓ ${label} 官方登录成功！`; }
            setPlatStatus(`${label} 官方窗口登录成功！`, true);
            refreshPlatformAuthUI();
          } else {
            if (st) { st.className = 'pm-status-line is-err'; st.textContent = j?.message || '未完成登录'; }
          }
        } catch (e) {
          if (st) { st.className = 'pm-status-line is-err'; st.textContent = '打开登录窗口失败：' + e.message; }
        } finally {
          if (btn) btn.disabled = false;
        }
      });
    }
    bindBrowserLoginBtn('btnQqBrowserLogin', 'qqQrStatus', 'qq', 'QQ 音乐');
    bindBrowserLoginBtn('btnKgBrowserLogin', 'kgBrowserStatus', 'kugou', '酷狗音乐');
    bindBrowserLoginBtn('btnAppleBrowserLogin', 'appleBrowserStatus', 'apple', 'Apple Music');
    bindBrowserLoginBtn('btnMgBrowserLogin', 'mgBrowserStatus', 'migu', '咪咕音乐');

    document.getElementById('btnQqLogout')?.addEventListener('click', () => savePlatformAuth({ platform: 'qq', logout: true }, '已退出 QQ 音乐登录'));
    document.getElementById('btnSaveQqCookie')?.addEventListener('click', () => {
      const ck = document.getElementById('platQqCookie')?.value || '';
      savePlatformAuth({ platform: 'qq', cookie: ck }, 'QQ 音乐凭证已保存');
    });
    document.getElementById('btnSaveKgAuth')?.addEventListener('click', () => {
      savePlatformAuth({
        platform: 'kugou',
        cookie: document.getElementById('platKgCookie')?.value || '',
        token: document.getElementById('platKgToken')?.value || '',
        userid: document.getElementById('platKgUserid')?.value || ''
      }, '酷狗音乐凭证已保存');
    });
    document.getElementById('btnKgLogout')?.addEventListener('click', () => savePlatformAuth({ platform: 'kugou', logout: true }, '已清除酷狗凭证'));
    document.getElementById('btnSaveApAuth')?.addEventListener('click', () => {
      savePlatformAuth({
        platform: 'apple',
        storefront: document.getElementById('platApStorefront')?.value || 'jp',
        mediaUserToken: document.getElementById('platApToken')?.value || ''
      }, 'Apple Music 配置已保存');
    });
    document.getElementById('btnApLogout')?.addEventListener('click', () => savePlatformAuth({ platform: 'apple', logout: true }, '已清除 Apple Music 令牌'));
    document.getElementById('btnSaveMgAuth')?.addEventListener('click', () => {
      savePlatformAuth({ platform: 'migu', cookie: document.getElementById('platMgCookie')?.value || '' }, '咪咕音乐凭证已保存');
    });
    document.getElementById('btnMgLogout')?.addEventListener('click', () => savePlatformAuth({ platform: 'migu', logout: true }, '已清除咪咕凭证'));

    // Wire per-platform default quality dropdowns (QQ / 酷狗 / Apple Music / 咪咕)
    pane.querySelectorAll('.plat-default-quality').forEach(sel => {
      const pKey = sel.dataset.platQuality;
      if (!pKey) return;
      try {
        const saved = localStorage.getItem(`shiny.defaultQuality.${pKey}`);
        if (saved) sel.value = saved;
      } catch {}
      sel.addEventListener('change', () => {
        try { localStorage.setItem(`shiny.defaultQuality.${pKey}`, sel.value); } catch {}
        setPlatStatus(`已保存默认音质：${sel.options[sel.selectedIndex]?.text || sel.value}`, true);
        if (getCurrentPlatformKey() === pKey && window.__musicAPI?.setQuality) {
          window.__musicAPI.setQuality(sel.value);
        }
      });
    });

    refreshPlatformAuthUI();
  }

  /* ── 8. Voice Podcasts & Radio Browser (同时检索「声音单曲」+「播客电台」!) ── */
  async function loadPodcasts(query) {
    const body = document.getElementById('podcastBody');
    if (!body) return;
    body.innerHTML = '<div class="studio-empty">正在检索声音与播客…</div>';
    try {
      const r = await fetch(`/api/private-music/ncm/podcasts?query=${encodeURIComponent(query)}`);
      const j = await r.json();
      const voices = Array.isArray(j.voices) ? j.voices : [];
      const radios = Array.isArray(j.radios) ? j.radios : [];
      if (!voices.length && !radios.length) {
        body.innerHTML = '<div class="studio-empty">未找到相关声音或播客，换个关键词试试</div>';
        return;
      }
      let html = '';
      if (voices.length) {
        html += `<div style="font-size:12.5px;font-weight:700;opacity:0.9;margin:2px 0 8px;">🎙 声音单曲（点击直接播放 · 共 ${voices.length} 条）</div>`;
        html += `<div class="podcast-grid" style="margin-bottom:16px;">${voices.map((v, idx) => `
          <button type="button" class="podcast-card podcast-voice-item" data-v-idx="${idx}">
            <img src="${escapeHtml(v.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='/app-icon.png'">
            <div class="podcast-card-meta">
              <strong>🎙 ${escapeHtml(v.title)}</strong>
              <small style="color:inherit;opacity:0.78;">${escapeHtml(v.vocalists)} · ${escapeHtml(v.album)}</small>
            </div>
          </button>
        `).join('')}</div>`;
      }
      if (radios.length) {
        html += `<div style="font-size:12.5px;font-weight:700;opacity:0.9;margin:4px 0 8px;">📻 播客电台（共 ${radios.length} 个）</div>`;
        html += `<div class="podcast-grid">${radios.map(rad => `
          <button type="button" class="podcast-card podcast-radio-item" data-radio-id="${rad.id}" data-radio-name="${escapeHtml(rad.name)}">
            <img src="${escapeHtml(rad.picUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src='/app-icon.png'">
            <div class="podcast-card-meta">
              <strong>${escapeHtml(rad.name)}</strong>
              <small style="color:inherit;opacity:0.78;">${escapeHtml(rad.dj)} · ${rad.programCount} 期节目</small>
            </div>
          </button>
        `).join('')}</div>`;
      }
      body.innerHTML = html;
      body.querySelectorAll('.podcast-voice-item').forEach(card => {
        card.addEventListener('click', () => {
          const v = voices[Number(card.dataset.vIdx)];
          if (v && window.__musicAPI?.playSongById) {
            window.__musicAPI.playSongById(v.id, v);
            document.getElementById('podcastDialog')?.close();
          }
        });
      });
      body.querySelectorAll('.podcast-radio-item').forEach(card => {
        card.addEventListener('click', () => openPodcastRadio(card.dataset.radioId, card.dataset.radioName, query));
      });
    } catch (e) {
      body.innerHTML = `<div class="studio-empty">播客加载失败：${escapeHtml(e.message)}</div>`;
    }
  }

  async function openPodcastRadio(radioId, radioName, backQuery) {
    const body = document.getElementById('podcastBody');
    if (!body) return;
    body.innerHTML = '<div class="studio-empty">正在加载节目列表…</div>';
    try {
      const r = await fetch(`/api/private-music/ncm/podcast-episodes?radioId=${encodeURIComponent(radioId)}`);
      const j = await r.json();
      const eps = j.episodes || [];
      body.innerHTML = `
        <div class="podcast-ep-head">
          <button type="button" class="pod-back-btn" id="btnPodBack">← 返回播客列表</button>
          <strong>${escapeHtml(radioName)}</strong>
        </div>
        <div class="podcast-ep-list">
          ${eps.length ? eps.map((ep, idx) => `
            <button type="button" class="podcast-ep-row" data-ep-idx="${idx}">
              <img src="${escapeHtml(ep.cover)}" alt="" loading="lazy" onerror="this.src='/app-icon.png'">
              <div class="podcast-ep-info">
                <strong>${escapeHtml(ep.title)}</strong>
                <small>${escapeHtml(ep.vocalists)} · ${Math.floor((ep.duration || 0) / 60)}:${String((ep.duration || 0) % 60).padStart(2, '0')}</small>
              </div>
              <span class="podcast-play-pill">▶ 播放</span>
            </button>
          `).join('') : '<div class="studio-empty">该播客暂无可播放节目</div>'}
        </div>
      `;
      document.getElementById('btnPodBack')?.addEventListener('click', () => loadPodcasts(backQuery));
      body.querySelectorAll('.podcast-ep-row').forEach(row => {
        row.addEventListener('click', () => {
          const ep = eps[Number(row.dataset.epIdx)];
          if (ep && window.__musicAPI?.playSongById) {
            window.__musicAPI.playSongById(ep.id, ep);
          }
        });
      });
    } catch (e) {
      body.innerHTML = `<div class="studio-empty">节目加载失败：${escapeHtml(e.message)}</div>`;
    }
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */
  function boot() {
    injectStudioUI();
    const audio = window.__musicAudio;
    if (audio) {
      audio.playbackRate = fxState.speed || 1;
      audio.addEventListener('play', () => {
        if (fxState.enabled) {
          ensureDSP();
        }
      });
      audio.addEventListener('ended', () => {
        if (sleepAfterCurrent) {
          sleepAfterCurrent = false;
          setTimeout(() => window.__musicAudio?.pause(), 50);
        }
      });
    }
    window.addEventListener('shiny-quality-changed', (e) => {
      const q = e.detail?.quality;
      const pKey = e.detail?.platform || getCurrentPlatformKey();
      const prof = getPlatformFxProfile(pKey);
      const mapped = prof.qualityMap?.[q];
      if (mapped) {
        applyPresetByKey(mapped, { silent: true });
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
