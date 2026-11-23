/* ═══════════════════════════════════════════════════════════════════
   283 PRODUCTION JUKEBOX (全偶像大师 5 大企划音乐馆播放引擎)
   Manages Audio Playback, Centered Lyrics, Units & Solo Tabs,
   Dolby Atmos Spatial Audio, Apple Music, Home BGM & Downloader
   Supports: 闪耀色彩 · 学园偶像大师 · 灰姑娘女孩 · 百万现场 · 765本家 (1,530+首)
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  // Platform-Specific Quality Profiles (每个对应音乐软件专属音质体系，不套网易云！)
  const PLATFORM_QUALITY_PROFILES = {
    netease: {
      brand: '网易云音乐 · 鲸云音质',
      sub: 'SVIP 超清母带 · 沉浸环绕声直连',
      tiers: {
        sky:      { label: '环绕声',  title: '沉浸环绕声', en: 'Surround Audio', desc: '环绕音感 最高5.1声道', ico: '〰', badge: '🌌 沉浸环绕声 Surround 5.1', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jymaster: { label: '母带',    title: '超清母带', en: 'Master', desc: '极致细节 192kHz/24bit', ico: '◉', badge: '👑 超清母带 Master 24bit', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jyeffect: { label: '全景声',  title: '臻音全景声 (Audio Vivid)', desc: '沉浸三维空间音频，最高7.1声道', ico: '❖', badge: '✨ 臻音全景声 Audio Vivid', tier: 'SVIP', lx: 'flac24bit' },
        hires:    { label: '臻音',    title: '高清臻音 (Spatial Audio)', desc: '高频细节还原与清晰沉浸感，96kHz/24bit', ico: '⫯', badge: '🎧 高清臻音 Hi-Res 24bit', tier: 'VIP', lx: 'flac24bit' },
        flac:     { label: 'SQ',      title: '无损 (SQ)', desc: '高保真无损音质，最高48kHz/16bit', ico: 'SQ', badge: '💎 无损品质 SQ (FLAC)', tier: 'VIP', lx: 'flac' },
        '320':    { label: '极高',    title: '极高 (HQ)', desc: '近 CD 音质的细节体验，最高320kbps', ico: 'HQ', badge: '🌟 极高音质 HQ (320kbps)', tier: '', lx: '320k' },
        '128':    { label: '标准',    title: '标准', desc: '128kbps 流畅听感', ico: '标', badge: '🎵 标准音质 (128kbps)', tier: '', lx: '128k' }
      }
    },
    qq: {
      brand: 'QQ音乐 · 臻品音质体系',
      sub: '超级会员 · 臻品母带 2.0 / 全景声 2.0',
      tiers: {
        sky:      { label: '臻品全景', title: '臻品全景声 2.0', en: 'Dolby Atmos 7.1.4', desc: 'QQ音乐银河空间声场 7.1.4', ico: '🪐', badge: '🪐 臻品全景声 2.0 (7.1.4)', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jymaster: { label: '臻品母带', title: '臻品母带 2.0', en: 'Master Tape 2.0', desc: '神经网络AI重制 192kHz/24bit', ico: '📼', badge: '📼 臻品母带 2.0 (192kHz)', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jyeffect: { label: '臻品音质', title: '臻品音质 2.0 (Ultra HD)', desc: '96kHz/24bit 空间声学重塑', ico: '✦', badge: '✦ 臻品音质 2.0 (Ultra HD)', tier: 'SVIP', lx: 'flac24bit' },
        hires:    { label: 'Hi-Res',  title: 'Hi-Res 高解析无损', desc: '最高 96kHz/24bit 录音室母源', ico: 'HR', badge: '🎧 QQ Hi-Res 无损', tier: 'VIP', lx: 'flac24bit' },
        flac:     { label: 'SQ无损',  title: 'SQ 无损品质', desc: 'FLAC 无损压缩 48kHz/16bit', ico: 'SQ', badge: '💎 QQ SQ 无损 (FLAC)', tier: 'VIP', lx: 'flac' },
        '320':    { label: 'HQ高品',  title: 'HQ 高品音质', desc: 'OGG / MP3 320kbps', ico: 'HQ', badge: '🌟 QQ HQ 高品 (320k)', tier: 'VIP', lx: '320k' },
        '128':    { label: '标准',    title: '标准品质', desc: 'AAC / MP3 128kbps', ico: '标', badge: '🎵 QQ 标准品质 (128k)', tier: '', lx: '128k' }
      }
    },
    kugou: {
      brand: '酷狗音乐 · 蝰蛇音质体系',
      sub: 'Viper HiFi · 蝰蛇母带 / 蝰蛇全景声',
      tiers: {
        sky:      { label: '蝰蛇全景', title: '蝰蛇全景声 2.0', en: 'Viper Atmos', desc: '蝰蛇多声道全景环绕声场', ico: '🐍', badge: '🐍 蝰蛇全景声 2.0', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jymaster: { label: '蝰蛇母带', title: '蝰蛇母带', en: 'Viper Master', desc: '192kHz/24bit AI超清还原', ico: '👑', badge: '👑 酷狗蝰蛇母带 24bit', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jyeffect: { label: '蝰蛇超清', title: '蝰蛇超清 (Viper Ultra)', desc: '高动态空间解析音质', ico: '⚡', badge: '⚡ 蝰蛇超清 Viper Ultra', tier: 'VIP', lx: 'flac24bit' },
        hires:    { label: 'Hi-Res',  title: 'Hi-Res 高解析无损', desc: '96kHz/24bit 录音室原音', ico: 'HR', badge: '🎧 酷狗 Hi-Res', tier: 'VIP', lx: 'flac24bit' },
        flac:     { label: 'SQ无损',  title: 'SQ 无损音质', desc: 'FLAC 无损原音', ico: 'SQ', badge: '💎 酷狗 SQ 无损', tier: 'VIP', lx: 'flac' },
        '320':    { label: 'HQ超高',  title: 'HQ 超高品', desc: '320kbps 高码率', ico: 'HQ', badge: '🌟 酷狗 HQ 超高品', tier: '', lx: '320k' },
        '128':    { label: '流畅',    title: '流畅标准', desc: '128kbps 流畅听感', ico: '标', badge: '🎵 酷狗标准 (128k)', tier: '', lx: '128k' }
      }
    },
    apple: {
      brand: 'Apple Music · 空间音频与无损',
      sub: 'Dolby Atmos · ALAC 高解析度无损',
      tiers: {
        sky:      { label: '杜比全景', title: '杜比全景声', en: 'Dolby Atmos', desc: 'Apple 空间音频 Spatial Audio', ico: '', badge: ' 杜比全景声 Dolby Atmos', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jymaster: { label: '高解析无损', title: '高解析度无损', en: 'Hi-Res Lossless', desc: 'ALAC 最高 192kHz/24bit', ico: 'AL', badge: ' 高解析度无损 ALAC 24bit', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jyeffect: { label: '空间音频', title: '空间音频 (头部追踪)', desc: 'Dynamic Head Tracking 三维声场', ico: '◎', badge: '◎ Apple 空间音频', tier: 'VIP', lx: 'flac24bit' },
        hires:    { label: '母带版',   title: 'Apple Digital Master', desc: '苹果数字母带认证声学曲线', ico: 'DM', badge: '✦ Apple Digital Master', tier: 'VIP', lx: 'flac24bit' },
        flac:     { label: '无损ALAC', title: '无损音频 (Lossless)', desc: 'ALAC 48kHz/24bit 录音室原声', ico: 'AL', badge: '💎 Apple Lossless (ALAC)', tier: 'VIP', lx: 'flac' },
        '320':    { label: '高质量AAC', title: '高质量 (AAC 256k)', desc: 'Apple 经典 AAC 256kbps', ico: 'AA', badge: '🌟 Apple 高质量 AAC', tier: '', lx: '320k' },
        '128':    { label: '高效AAC', title: '高效 (HE-AAC)', desc: '低数据用量流畅播放', ico: 'HE', badge: '🎵 Apple 高效 HE-AAC', tier: '', lx: '128k' }
      }
    },
    migu: {
      brand: '咪咕音乐 · 至臻音质体系',
      sub: '白金会员 · 至臻 24bit 母带 / 3D 环绕',
      tiers: {
        sky:      { label: '至臻3D',  title: '至臻 3D 环绕', en: 'Migu 3D Surround', desc: '沉浸多维环绕声场', ico: '🌀', badge: '🌀 咪咕至臻 3D 环绕', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jymaster: { label: '至臻母带', title: '至臻 24bit 母带', en: 'Studio Master 24bit', desc: '24bit 录音室至臻原音', ico: '💎', badge: '💎 咪咕至臻 24bit 母带', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jyeffect: { label: '至臻全景', title: '至臻全景声', desc: '三维空间全景声场', ico: '❖', badge: '❖ 咪咕至臻全景声', tier: 'SVIP', lx: 'flac24bit' },
        hires:    { label: 'Hi-Res',  title: 'Hi-Res 至臻原音', desc: '96kHz/24bit 高解析', ico: 'HR', badge: '🎧 咪咕 Hi-Res', tier: 'VIP', lx: 'flac24bit' },
        flac:     { label: 'SQ无损',  title: 'SQ 无损格式', desc: 'FLAC 16bit 无损原盘', ico: 'SQ', badge: '💎 咪咕 SQ 无损', tier: 'VIP', lx: 'flac' },
        '320':    { label: 'HQ超清',  title: 'HQ 超清音质', desc: '320kbps 高清', ico: 'HQ', badge: '🌟 咪咕 HQ 超清', tier: '', lx: '320k' },
        '128':    { label: '标准',    title: '标准音质', desc: '128kbps 流畅', ico: '标', badge: '🎵 咪咕标准 (128k)', tier: '', lx: '128k' }
      }
    },
    auto: {
      brand: '全网智能 · 多平台无损优选',
      sub: '自动优选最佳可用无损与母带音源',
      tiers: {
        sky:      { label: '全景环绕', title: '空间环绕 5.1', en: 'Spatial Surround', desc: '沉浸环绕多声道声场', ico: '〰', badge: '🌌 智能全景环绕', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jymaster: { label: '超清母带', title: '智能母带', en: 'HiFi Master', desc: '192kHz/24bit 母带级还原', ico: '◉', badge: '👑 智能母带 24bit', tier: 'SVIP', hero: true, lx: 'flac24bit' },
        jyeffect: { label: '高清臻音', title: '高清臻音', desc: '空间动态增强 HiFi', ico: '✦', badge: '✦ 智能高清臻音', tier: 'VIP', lx: 'flac24bit' },
        hires:    { label: 'Hi-Res',  title: 'Hi-Res 无损', desc: '96kHz/24bit 高解析', ico: 'HR', badge: '🎧 智能 Hi-Res', tier: 'VIP', lx: 'flac24bit' },
        flac:     { label: 'SQ无损',  title: 'SQ 无损音质', desc: 'FLAC 48kHz/16bit 无损', ico: 'SQ', badge: '💎 智能 SQ 无损', tier: 'VIP', lx: 'flac' },
        '320':    { label: 'HQ高品',  title: 'HQ 高品音质', desc: '320kbps 高品质', ico: 'HQ', badge: '🌟 智能 HQ 高品', tier: '', lx: '320k' },
        '128':    { label: '标准',    title: '标准音质', desc: '128kbps', ico: '标', badge: '🎵 智能标准 (128k)', tier: '', lx: '128k' }
      }
    }
  };

  function getActivePlatformKey(engineOverride) {
    const raw = String(engineOverride || currentSong?.sourceEngine || activeSourceEngine || 'netease').toLowerCase();
    if (raw === 'qq') return 'qq';
    if (raw === 'kugou') return 'kugou';
    if (raw === 'apple') return 'apple';
    if (raw === 'migu') return 'migu';
    if (raw === 'auto') return 'auto';
    return 'netease';
  }

  function getPlatformQualityProfile(engineOverride) {
    return PLATFORM_QUALITY_PROFILES[getActivePlatformKey(engineOverride)] || PLATFORM_QUALITY_PROFILES.netease;
  }

  // Backward-compatible proxy lookup into current active platform's quality map
  const QUALITY_MAP = new Proxy({}, {
    get(_, prop) {
      const tiers = getPlatformQualityProfile().tiers;
      return tiers[prop] || PLATFORM_QUALITY_PROFILES.netease.tiers[prop];
    },
    has(_, prop) {
      return prop in PLATFORM_QUALITY_PROFILES.netease.tiers;
    }
  });

  // 283 Production Units Definition
  const UNITS_DATA = [
    { key: 'all', name: '全员 ALL', color: '#ff4e78', glow: '#ff8246', shadow: 'rgba(255,78,120,0.45)' },
    { key: 'illumination', name: 'illumination STARS', color: '#ffb300', glow: '#ffd54f', shadow: 'rgba(255,179,0,0.45)' },
    { key: 'lantica', name: "L'Antica", color: '#7b1fa2', glow: '#ba68c8', shadow: 'rgba(123,31,162,0.45)' },
    { key: 'climax', name: '放课后CLIMAX GIRLS', color: '#ff6f00', glow: '#ffa000', shadow: 'rgba(255,111,0,0.45)' },
    { key: 'alstroemeria', name: 'ALSTROEMERIA', color: '#e91e63', glow: '#f48fb1', shadow: 'rgba(233,30,99,0.45)' },
    { key: 'straylight', name: 'Straylight', color: '#d32f2f', glow: '#e57373', shadow: 'rgba(211,47,47,0.45)' },
    { key: 'noctchill', name: 'noctchill', color: '#0288d1', glow: '#4fc3f7', shadow: 'rgba(2,136,209,0.45)' },
    { key: 'shhis', name: 'SHHis', color: '#00897b', glow: '#4db6ac', shadow: 'rgba(0,137,123,0.45)' },
    { key: 'cometik', name: 'CoMETIK', color: '#263238', glow: '#607d8b', shadow: 'rgba(38,50,56,0.45)' },
    { key: 'icu', name: "I'm a Cutie Finder (ICU)", color: '#ec4899', glow: '#f9a8d4', shadow: 'rgba(236,72,153,0.45)', crossQuery: "I'm a Cutie Finder シャイニーカラーズ" },
    { key: 'team_stella', name: 'Team.Stella (越境)', color: '#f59e0b', glow: '#fcd34d', shadow: 'rgba(245,158,11,0.45)', crossQuery: 'Team.Stella シャイニーカラーズ' },
    { key: 'team_luna', name: 'Team.Luna (越境)', color: '#6366f1', glow: '#a5b4fc', shadow: 'rgba(99,102,241,0.45)', crossQuery: 'Team.Luna シャイニーカラーズ' },
    { key: 'team_sol', name: 'Team.Sol (越境)', color: '#ef4444', glow: '#fca5a5', shadow: 'rgba(239,68,68,0.45)', crossQuery: 'Team.Sol シャイニーカラーズ' },
    { key: 'cross_unit', name: '其他越境 / 混成组合', color: '#8b5cf6', glow: '#c4b5fd', shadow: 'rgba(139,92,246,0.45)', crossQuery: 'シャイニーカラーズ 越境 ユニット' }
  ];

  // State
  let catalogData = null;
  let scDefaultIdols = [];
  let franchiseCatalogs = null;
  let activeFranchise = localStorage.getItem('shiny.activeFranchise') || 'sc';
  let activeSourceEngine = localStorage.getItem('shiny.activeSourceEngine') || 'netease';
  if (activeSourceEngine === 'apple' || activeSourceEngine === 'kuwo' || activeSourceEngine === 'lx') {
    activeSourceEngine = 'netease';
    localStorage.setItem('shiny.activeSourceEngine', 'netease');
  }
  let lyricsCache = {};
  let currentSong = null;
  let currentPlaylist = [];
  let currentIndex = 0;

  // Per-franchise last selected song memory so switching franchises restores each franchise's track cleanly
  let franchiseLastSongMap = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem('shiny.franchiseLastSong') || '{}');
      return (raw && typeof raw === 'object') ? raw : {};
    } catch { return {}; }
  })();

  function saveFranchiseLastSong(franchiseKey, song) {
    if (!franchiseKey || !song) return;
    const list = franchiseCatalogs?.[franchiseKey]?.songs || (franchiseKey === activeFranchise ? catalogData?.songs : null);
    if (!Array.isArray(list) || !list.length) return;
    let idx = list.indexOf(song);
    if (idx < 0 && song.id != null && song.id !== '') {
      idx = list.findIndex(s => String(s.id) === String(song.id));
    }
    if (idx < 0) return;
    franchiseLastSongMap[franchiseKey] = { id: String(song.id || ''), index: idx };
    try { localStorage.setItem('shiny.franchiseLastSong', JSON.stringify(franchiseLastSongMap)); } catch {}
  }

  function findRememberedFranchiseSongIndex(franchiseKey, list) {
    if (!Array.isArray(list) || !list.length) return -1;
    const saved = franchiseLastSongMap?.[franchiseKey];
    if (saved) {
      if (saved.id) {
        const byId = list.findIndex(s => String(s.id) === String(saved.id));
        if (byId >= 0) return byId;
      }
      if (Number.isInteger(saved.index) && saved.index >= 0 && saved.index < list.length) {
        return saved.index;
      }
    }
    try {
      const last = JSON.parse(localStorage.getItem('shiny.bgMusicCurrentSong') || 'null');
      if (last?.id != null && last.id !== '') {
        const byLast = list.findIndex(s => String(s.id) === String(last.id));
        if (byLast >= 0) return byLast;
      }
    } catch {}
    return 0;
  }
  let selectedUnit = 'all';
  let selectedIdolId = 'all';
  let activeTab = 'all'; // 'all' | 'solo' | 'unit' | 'allstars'
  let activeViewMode = 'songs'; // 'songs' | 'lyrics'
  let playMode = (['loop', 'single', 'shuffle'].includes(localStorage.getItem('shiny.musicPlayMode')))
    ? localStorage.getItem('shiny.musicPlayMode')
    : 'loop'; // 'loop' | 'shuffle' | 'single'
  let searchQuery = '';
  let isSeeking = false;
  let streamRetryCount = 0;
  let baseMusicVolume = (() => {
    try {
      const saved = localStorage.getItem('shiny.musicVolume');
      if (saved === null || saved === '') return 0.5;
      const v = Number(saved);
      return Number.isFinite(v) && v >= 0 && v <= 100 ? v / 100 : 0.5;
    } catch { return 0.5; }
  })();
  let voiceDucked = false;

  function applyEffectiveAudioVolume() {
    if (!audio) return;
    const target = Math.max(0, Math.min(1, baseMusicVolume * (voiceDucked ? 0.25 : 1)));
    audio.volume = target;
  }

  // Preferences from localStorage — Default to Highest Quality Tier (auto-downgrades honestly if non-VIP)
  let currentQuality = (localStorage.getItem('shiny.musicQualityExplicit') === '1' && QUALITY_MAP[localStorage.getItem('shiny.musicQuality')])
    ? localStorage.getItem('shiny.musicQuality')
    : 'jymaster';
  let actualPlayingQuality = null;
  let actualQualityDowngraded = false;
  let actualQualityReason = '';
  let qualityProbeSeq = 0;
  let lxSourceTemplate = localStorage.getItem('shiny.lxSourceTemplate') || '';
  let privateSourcesConfig = {
    preferPrivate: true,
    ncm: { enabled: false, baseUrl: '', cookie: '', level: 'jymaster' },
    subsonic: { enabled: false, baseUrl: '', username: '', password: '' },
    webdav: { enabled: false, baseUrl: '', username: '', password: '' }
  };

  function hasEnabledPrivateSource() {
    return !!(
      (privateSourcesConfig.ncm?.enabled && (privateSourcesConfig.ncm?.cookie || privateSourcesConfig.ncm?.baseUrl)) ||
      (privateSourcesConfig.subsonic?.enabled && privateSourcesConfig.subsonic?.baseUrl) ||
      (privateSourcesConfig.webdav?.enabled && privateSourcesConfig.webdav?.baseUrl)
    );
  }

  // Favorites Storage (网易云红心收藏)
  let favoriteSongIds = new Set();
  try {
    const savedFavs = localStorage.getItem('shiny.musicFavorites');
    if (savedFavs) favoriteSongIds = new Set(JSON.parse(savedFavs));
  } catch (e) {
    favoriteSongIds = new Set();
  }

  // Audio Engine (Same-origin + CORS-safe so Web Audio AI调音 / 8D / EQ NEVER mutes!)
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.preload = 'auto';
  window.__musicAudio = audio;

  // DOM Elements
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));

  let elAurora, elUnitTrack, elIdolTrack, elSongList, elSearchInput, elCountSongs, elCountIdols, elPlaylistSourceAuthor;
  let elVinylDisc, elTonearm, elAlbumCover, elVinylCenterImg, elHeroTitle, elHeroSub, elHeroArtists, elHeroAlbum, elHeroQualityTag, elHeroPlatformTag, elQuickLyricsBox, elQuickJp, elQuickZh;
  let elLyricsContainer, elSongsContainer, elLyricsScroll, elBtnShowSongs, elBtnShowLyrics;
  let elDockThumb, elDockTitle, elDockArtist, elBtnPlayPause, elIconPlay, elIconPause, elBtnPrev, elBtnNext, elBtnMode, elModeIcon, elProgressRange, elCurrentTime, elTotalTime, elVolumeRange;
  let elBtnSetHomeBgm, elBtnDownloadCurrent, elBtnDownloadAllMusic, elBtnCheckMusicUpdate;
  let elBtnDockFav, elDockFavLabel;
  let elBtnQuality, elQualityLabel, elQualityDropdown, elLfoQualityBtn, elLfoQualityBtnText, elLfoQualityDropdown;
  let elBtnCurrentSource, elSourceLabel, elSourceDropdown;
  let elBtnOpenSourceDialog, elSourceDialog, elBtnCloseSourceDialog, elInputPlaylistId, elBtnFetchPlaylist, elInputLxSource, elBtnSaveLxSource;

  function bindElements() {
    elAurora = $('.music-ambient-aurora');
    elUnitTrack = $('#unitCarouselTrack');
    elIdolTrack = $('#idolCarouselTrack');
    elSongList = $('#songListScroll');
    elSearchInput = $('#songSearchInput');
    elCountSongs = $('#countSongs');
    elCountIdols = $('#countIdols');
    elPlaylistSourceAuthor = $('#playlistSourceAuthor');
    elVinylDisc = $('#vinylDisc');
    elTonearm = $('#tonearm');
    elAlbumCover = $('#albumCoverImg');
    elVinylCenterImg = $('#vinylCenterImg');
    elHeroTitle = $('#heroSongTitle');
    elHeroSub = $('#heroSongSub');
    elHeroArtists = $('#heroSongArtists');
    elHeroAlbum = $('#heroSongAlbum');
    elHeroQualityTag = $('#heroQualityTag');
    elHeroPlatformTag = $('#heroPlatformTag');
    elQuickLyricsBox = $('#heroQuickLyricsBox');
    elQuickJp = $('#quickLyricJp');
    elQuickZh = $('#quickLyricZh');
    elLyricsContainer = $('#lyricsViewContainer');
    elSongsContainer = $('#songsViewContainer');
    elLyricsScroll = $('#lyricsScrollBox');
    elBtnShowSongs = $('#btnShowSongs');
    elBtnShowLyrics = $('#btnShowLyrics');
    elDockThumb = $('#dockThumbImg');
    elDockTitle = $('#dockTitle');
    elDockArtist = $('#dockArtist');
    elBtnPlayPause = $('#btnPlayPause');
    elIconPlay = $('#iconPlay');
    elIconPause = $('#iconPause');
    elBtnPrev = $('#btnPrev');
    elBtnNext = $('#btnNext');
    elBtnMode = $('#btnMode');
    elModeIcon = $('#modeIcon');
    elProgressRange = $('#progressRange');
    elCurrentTime = $('#currentTime');
    elTotalTime = $('#totalTime');
    elVolumeRange = $('#volumeRange');

    // Action Buttons
    elBtnSetHomeBgm = $('#btnSetHomeBgm');
    elBtnDownloadCurrent = $('#btnDownloadCurrent');
    elBtnDownloadAllMusic = $('#btnDownloadAllMusic');
    elBtnCheckMusicUpdate = $('#btnCheckMusicUpdate');
    elBtnDockFav = $('#btnDockFav');
    elDockFavLabel = $('#dockFavLabel');

    // Quality Selector
    elBtnQuality = $('#btnQuality');
    elQualityLabel = $('#qualityLabel');
    elQualityDropdown = $('#qualityDropdown');
    elLfoQualityBtn = $('#lfoQualityBtn');
    elLfoQualityBtnText = $('#lfoQualityBtnText');
    elLfoQualityDropdown = $('#lfoQualityDropdown');

    // Source Selector
    elBtnCurrentSource = $('#btnCurrentSource');
    elSourceLabel = $('#sourceLabel');
    elSourceDropdown = $('#sourceDropdown');

    // Source Dialog
    elBtnOpenSourceDialog = $('#btnOpenSourceDialog');
    elSourceDialog = $('#sourceDialog');
    elBtnCloseSourceDialog = $('#btnCloseSourceDialog');
    elInputPlaylistId = $('#inputPlaylistId');
    elBtnFetchPlaylist = $('#btnFetchPlaylist');
    elInputLxSource = $('#inputLxSource');
    elBtnSaveLxSource = $('#btnSaveLxSource');
  }

  // Active Lyrics Parsed Structure
  let parsedLyrics = []; // [{ time: seconds, jp: string, zh: string }]
  let currentLyricIndex = -1;

  // Resolve idol icon path for both http and file protocols
  function getIdolIcon(idolId) {
    const isFile = window.location.protocol === 'file:';
    const prefix = isFile ? '../cache/' : '/asset/';
    return `${prefix}images/content/characters/icon_phone/${String(idolId).padStart(3, '0')}.png`;
  }

  // Format mm:ss
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Floating Toast Notification
  function showToast(msg) {
    let toast = $('#musicToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'musicToast';
      toast.style.cssText = `
        position: fixed;
        bottom: 104px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(23, 27, 34, 0.94);
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        padding: 10px 22px;
        border-radius: 999px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(255,255,255,0.15);
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        text-align: center;
        max-width: 90vw;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2800);
  }

  function normalizeSongKey(str) {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/[\s\-_・!?！？（）()【】\[\]]/g, '')
      .replace(/m@sterversion|gamesize|offvocal|instrumental|remix/gi, '');
  }

  // Match a song title to our master song database (全企划 1,530 首完整无损曲库)
  function findMasterSongByTitle(title) {
    if (!title) return null;
    const clean = normalizeSongKey(title);
    if (!clean) return null;

    if (catalogData && catalogData.songs) {
      const hit = catalogData.songs.find(s => {
        const sc = normalizeSongKey(s.cleanTitle || s.title || '');
        return sc && (sc === clean || sc.includes(clean) || clean.includes(sc));
      });
      if (hit && hit.neteaseId) return hit;
    }
    if (franchiseCatalogs) {
      for (const k of Object.keys(franchiseCatalogs)) {
        const list = franchiseCatalogs[k]?.songs || [];
        const hit = list.find(s => {
          const sc = normalizeSongKey(s.cleanTitle || s.title || '');
          return sc && (sc === clean || sc.includes(clean) || clean.includes(sc));
        });
        if (hit && hit.neteaseId) return hit;
      }
    }
    return null;
  }

  // Audio Stream URL Resolver (全网全音源播放当前 1530 首全曲目企划及搜索曲库)
  function resolveAudioUrl(song, quality = currentQuality, engine = (song?.sourceEngine || activeSourceEngine)) {
    if (!song) return '';
    const qInfo = QUALITY_MAP[quality] || QUALITY_MAP.flac;
    const songTitle = song.title || '';
    const songArtist = song.vocalists || song.unitName || song.artist || '';
    const pmNeteaseId = song.neteaseId || (song.id ? String(song.id).replace('track_', '') : '');

    // Self-hosted / Private Music Server (NetEaseCloudMusicApi / Navidrome / WebDAV)
    if (engine === 'private' || (hasEnabledPrivateSource() && privateSourcesConfig.preferPrivate && !song.sourceEngine)) {
      return `/api/private-music/stream?id=${encodeURIComponent(pmNeteaseId)}&title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}&quality=${encodeURIComponent(quality)}&provider=auto`;
    }

    // Apple Music official preview stream
    if (engine === 'apple' || song.source === 'apple' || song.appleId) {
      const pUrl = song.audioUrl && song.audioUrl.startsWith('/api/apple-stream')
        ? song.audioUrl
        : `/api/apple-stream?title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}`;
      return pUrl;
    }

    // Kugou Music engine or song with kugouHash
    if (engine === 'kugou' || song.source === 'kugou' || song.kugouHash) {
      const hash = song.kugouHash || '';
      const albumId = song.albumId || '';
      return `/api/kugou-stream?hash=${encodeURIComponent(hash)}&albumId=${encodeURIComponent(albumId)}&title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}`;
    }

    // Migu Music engine or song with miguId
    if (engine === 'migu' || song.source === 'migu' || song.miguId) {
      return `/api/kugou-stream?title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}`;
    }

    // QQ Music engine or song with QQ mid
    if (engine === 'qq' || song.source === 'qq' || song.qqMid) {
      if (song.qqMid) {
        return `/api/qq-stream?mid=${encodeURIComponent(song.qqMid)}&title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}`;
      }
    }

    // Custom LX-Music template url or auto-resolved stream
    if (engine === 'lx') {
      if (lxSourceTemplate && lxSourceTemplate.includes('{id}')) {
        const neteaseId = song.neteaseId || (song.id ? String(song.id).replace('track_', '') : '');
        return lxSourceTemplate
          .replace(/\{id\}/g, encodeURIComponent(neteaseId))
          .replace(/\{quality\}/g, qInfo.lx || 'flac');
      }
      return `/api/qq-stream?mid=${encodeURIComponent(song.qqMid || 'auto')}&title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}`;
    }

    // Smart Auto Cascade Engine (优先使用最稳定无损流，严禁走酷我提示音)
    if (engine === 'auto') {
      if (song.neteaseId) {
        return `/api/music-stream?id=${song.neteaseId}&title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}&quality=${encodeURIComponent(quality)}`;
      }
      if (song.qqMid) {
        return `/api/qq-stream?mid=${encodeURIComponent(song.qqMid)}&title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}&quality=${encodeURIComponent(quality)}`;
      }
      return `/api/music-stream?title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}&quality=${encodeURIComponent(quality)}`;
    }

    // Default NetEase Outer Stream API (带自动兜底)
    let neteaseId = song.neteaseId;
    if (!neteaseId) {
      const matched = findMasterSongByTitle(song.title);
      if (matched && matched.neteaseId) {
        neteaseId = matched.neteaseId;
        song.neteaseId = neteaseId;
        if (matched.duration) song.duration = matched.duration;
      }
    }

    if (neteaseId) {
      return `/api/music-stream?id=${neteaseId}&title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}&quality=${encodeURIComponent(quality)}`;
    }
    if (song.audioUrl) return song.audioUrl;
    return `/api/qq-stream?mid=${encodeURIComponent(song.qqMid || 'auto')}&title=${encodeURIComponent(songTitle)}&artist=${encodeURIComponent(songArtist)}`;
  }

  // Parse LRC text
  function parseLrc(lrcText) {
    if (!lrcText) return [];
    const lines = lrcText.split('\n');
    const result = [];
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

    for (const rawLine of lines) {
      const line = rawLine.trim();
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

  // Combine Japanese and Chinese LRC
  function mergeLyrics(jpLrc, zhLrc) {
    const jpList = parseLrc(jpLrc);
    const zhList = parseLrc(zhLrc);

    if (!zhList.length) {
      return jpList.map(item => ({ time: item.time, jp: item.text, zh: '' }));
    }

    return jpList.map(jpItem => {
      const matchZh = zhList.find(zh => Math.abs(zh.time - jpItem.time) < 0.9);
      return {
        time: jpItem.time,
        jp: jpItem.text,
        zh: matchZh ? matchZh.text : ''
      };
    });
  }

  // Load and apply lyrics
  async function loadSongLyrics(song) {
    elLyricsScroll.innerHTML = '<div class="lyric-line-item"><p class="lyric-line-jp">正在加载双语歌词…</p></div>';
    parsedLyrics = [];
    currentLyricIndex = -1;

    let lrcData = lyricsCache[song.neteaseId];
    if (!lrcData && song.neteaseId) {
      try {
        const url = `https://music.163.com/api/song/lyric?os=pc&id=${song.neteaseId}&lv=-1&kv=-1&tv=-1`;
        let json = null;
        try {
          const pRes = await fetch(`/api/music-proxy?url=${encodeURIComponent(url)}`);
          if (pRes.ok) json = await pRes.json();
        } catch {
          const directRes = await fetch(url);
          if (directRes.ok) json = await directRes.json();
        }

        if (json && json.lrc) {
          lrcData = { lrc: json.lrc?.lyric || '', tlyric: json.tlyric?.lyric || '' };
          lyricsCache[song.neteaseId] = lrcData;
        }
      } catch (err) {
        console.warn('Lyric fetch failed:', err);
      }
    }

    if (lrcData && lrcData.lrc) {
      parsedLyrics = mergeLyrics(lrcData.lrc, lrcData.tlyric);
    }

    // Fallback: Query Kuwo LRC API for any song lacking lyrics (such as Jay Chou, popular hits)
    if (!parsedLyrics.length) {
      try {
        const queryParams = new URLSearchParams();
        if (song.kuwoId) queryParams.set('rid', song.kuwoId);
        queryParams.set('title', song.title || '');
        queryParams.set('artist', song.vocalists || song.unitName || song.artist || '');
        const kwLrcRes = await fetch(`/api/kuwo-lrc?${queryParams.toString()}`);
        if (kwLrcRes.ok) {
          const kwLrcJson = await kwLrcRes.json();
          if (kwLrcJson.lrc) {
            parsedLyrics = parseLrc(kwLrcJson.lrc).map(item => ({ time: item.time, jp: item.text, zh: '' }));
          }
        }
      } catch (err) {
        console.warn('Kuwo lyric fetch fallback failed:', err);
      }
    }

    if (!parsedLyrics.length) {
      elLyricsScroll.innerHTML = `
        <div class="lyric-line-item active" style="margin-top: 100px;">
          <p class="lyric-line-jp">${song.title}</p>
          <p class="lyric-line-zh">${song.titleZh || ''}</p>
          <p style="font-size:12px;color:#888;margin-top:12px;">偶像大师官方原声收录 · 纯享伴奏或歌词整理中</p>
        </div>
      `;
      if (elQuickJp) elQuickJp.textContent = song.title;
      if (elQuickZh) elQuickZh.textContent = song.titleZh || songArtistDisplay(song);
      return;
    }

    // Render lyrics lines
    elLyricsScroll.innerHTML = parsedLyrics.map((item, idx) => `
      <div class="lyric-line-item" data-index="${idx}" data-time="${item.time}">
        <p class="lyric-line-jp">${item.jp}</p>
        ${item.zh ? `<p class="lyric-line-zh">${item.zh}</p>` : ''}
      </div>
    `).join('');

    // Attach click to seek
    $$('.lyric-line-item').forEach(el => {
      el.addEventListener('click', () => {
        const time = parseFloat(el.dataset.time);
        if (Number.isFinite(time)) {
          audio.currentTime = time;
          if (audio.paused) {
            audio.play().then(() => setPlayState(true)).catch(() => {});
          }
        }
      });
    });
  }

  // Update sync lyrics with STRICT VERTICAL CENTER ALIGNMENT
  function syncLyrics() {
    if (!parsedLyrics.length) return;
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
      $$('.lyric-line-item').forEach(el => el.classList.remove('active'));

      if (activeIdx >= 0) {
        const activeEl = $(`.lyric-line-item[data-index="${activeIdx}"]`);
        if (activeEl) {
          activeEl.classList.add('active');

          // Mathematical strict center alignment inside the lyrics container only
          const targetScroll = activeEl.offsetTop - (elLyricsScroll.clientHeight / 2) + (activeEl.clientHeight / 2);
          elLyricsScroll.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
        }

        const curItem = parsedLyrics[activeIdx];
        if (elQuickJp) elQuickJp.textContent = curItem.jp;
        if (elQuickZh) elQuickZh.textContent = curItem.zh || songArtistDisplay(currentSong);
      }
      syncFullLyricsActive(activeIdx);
    }
  }

  function songArtistDisplay(s) {
    if (!s) return '';
    return s.unitName || s.vocalists || '283 Production';
  }

  // ── Multi-Platform Cloud Account Playlists & Favorites Sync (网易云 / QQ / 酷狗 / Apple / 咪咕 / 自建) ──
  const PLATFORM_DISPLAY_NAMES = {
    netease: '网易云音乐',
    auto: '网易云音乐',
    qq: 'QQ 音乐',
    kugou: '酷狗音乐',
    apple: 'Apple Music',
    migu: '咪咕音乐',
    private: '自建曲库'
  };
  const accountCacheByPlatform = {};
  function getAccountPlatformKey() {
    const raw = String(activeSourceEngine || 'netease').toLowerCase();
    if (['qq', 'kugou', 'apple', 'migu', 'private'].includes(raw)) return raw;
    return 'netease';
  }
  function getPlatformAccountCache(plat) {
    const k = plat || getAccountPlatformKey();
    if (!accountCacheByPlatform[k]) {
      accountCacheByPlatform[k] = {
        loaded: false, loading: false, platform: k,
        platformName: PLATFORM_DISPLAY_NAMES[k] || k,
        uid: '', nickname: '', avatar: '',
        playlists: [], likedIds: new Set(), likedSongs: [], likedPlaylistId: '', activePlaylist: null
      };
    }
    return accountCacheByPlatform[k];
  }
  function getFavStorageKey(plat) {
    const k = plat || getAccountPlatformKey();
    return k === 'netease' ? 'shiny.musicFavorites' : `shiny.musicFavorites.${k}`;
  }
  const favSetByPlatform = {};
  function getPlatformFavSet(plat) {
    const k = plat || getAccountPlatformKey();
    if (!favSetByPlatform[k]) {
      let arr = [];
      try { arr = JSON.parse(localStorage.getItem(getFavStorageKey(k)) || '[]'); } catch {}
      favSetByPlatform[k] = new Set(Array.isArray(arr) ? arr : []);
    }
    return favSetByPlatform[k];
  }
  function savePlatformFavSet(plat) {
    const k = plat || getAccountPlatformKey();
    try { localStorage.setItem(getFavStorageKey(k), JSON.stringify(Array.from(getPlatformFavSet(k)))); } catch {}
  }

  async function loadNcmAccountData(force = false, platOverride = '') {
    const plat = platOverride || getAccountPlatformKey();
    const cache = getPlatformAccountCache(plat);
    if (cache.loading) return cache;
    if (cache.loaded && !force) return cache;
    cache.loading = true;
    try {
      const r = await fetch(`/api/private-music/account/playlists?platform=${encodeURIComponent(plat)}`);
      const j = await r.json();
      if (j?.ok) {
        cache.loaded = true;
        cache.uid = j.uid || '';
        cache.nickname = j.nickname || cache.platformName;
        cache.avatar = j.avatar || '';
        cache.playlists = Array.isArray(j.playlists) ? j.playlists : [];
        cache.likedIds = new Set((j.likedIds || []).map(String));
        const likedPl = cache.playlists.find(p => p.isLiked) || cache.playlists[0];
        cache.likedPlaylistId = likedPl?.id || '';
        updateFavoriteUI();
      } else {
        cache.loaded = false;
        cache.playlists = [];
        cache.likedIds = new Set();
        cache.likedSongs = [];
        cache.likedPlaylistId = '';
      }
    } catch {} finally {
      cache.loading = false;
    }
    return cache;
  }

  async function openAccountPlaylist(pl, platOverride = '') {
    const plat = platOverride || getAccountPlatformKey();
    const cache = getPlatformAccountCache(plat);
    if (!pl?.id) return;
    cache.activePlaylist = pl;
    if (pl.id.startsWith('__local_fav_')) {
      activeTab = 'fav';
      applyFilters();
      return;
    }
    elSongList.innerHTML = `<div style="text-align:center;padding:52px 20px;color:var(--music-text-muted);"><p style="font-size:14px;font-weight:600;">正在加载 ${cache.platformName} 歌单「${pl.name}」…</p></div>`;
    try {
      const r = await fetch(`/api/private-music/account/playlist-tracks?platform=${encodeURIComponent(plat)}&id=${encodeURIComponent(pl.id)}`);
      const j = await r.json();
      if (!j?.ok || !Array.isArray(j.songs)) {
        showToast(j?.message || '加载账号歌单失败');
        renderAccountPlaylistsView();
        return;
      }
      if (pl.isLiked) cache.likedSongs = j.songs;
      currentPlaylist = j.songs;
      renderSongList(j.songs);
      const bar = document.createElement('div');
      bar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;margin-bottom:8px;border-radius:14px;background:rgba(128,128,128,0.1);';
      bar.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <button type="button" class="dialog-action-btn secondary" id="btnBackAccountPl" style="padding:5px 10px;font-size:12px;">← ${cache.platformName}歌单</button>
          <img src="${pl.cover || '/app-icon.png'}" alt="" style="width:32px;height:32px;border-radius:8px;object-fit:cover;">
          <div style="min-width:0;">
            <div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl.isLiked ? '❤️ ' : '☁ '}${pl.name}</div>
            <div style="font-size:11.5px;opacity:0.7;">${cache.nickname} · ${cache.platformName} · 共 ${j.songs.length} 首</div>
          </div>
        </div>
        <button type="button" class="dialog-action-btn primary" id="btnPlayAccountPlAll" style="padding:5px 12px;font-size:12px;flex:none;">▶ 播放全部</button>
      `;
      elSongList.prepend(bar);
      document.getElementById('btnBackAccountPl')?.addEventListener('click', () => {
        cache.activePlaylist = null;
        renderAccountPlaylistsView();
      });
      document.getElementById('btnPlayAccountPlAll')?.addEventListener('click', () => {
        if (currentPlaylist.length) {
          currentIndex = 0;
          playSong(currentPlaylist[0], true);
        }
      });
    } catch (e) {
      showToast('加载账号歌单失败：' + e.message);
      renderAccountPlaylistsView();
    }
  }

  async function renderAccountPlaylistsView() {
    const plat = getAccountPlatformKey();
    const pName = PLATFORM_DISPLAY_NAMES[plat] || plat;
    elSongList.innerHTML = `<div style="text-align:center;padding:52px 20px;color:var(--music-text-muted);"><p style="font-size:14px;font-weight:600;">正在读取 ${pName} 账号歌单…</p></div>`;
    const acc = await loadNcmAccountData(!getPlatformAccountCache(plat).loaded, plat);
    if (!acc.loaded || !acc.playlists.length) {
      elSongList.innerHTML = `
        <div style="text-align:center;padding:56px 20px;color:var(--music-text-muted);">
          <p style="font-size:30px;margin:0 0 8px;">☁️</p>
          <p style="font-size:15px;font-weight:700;margin:0 0 6px;">登录「${pName}」后即可同步播放该平台账号歌单与喜欢</p>
          <small style="display:block;margin-bottom:16px;">点红心也会同步保存到当前所选平台（${pName}）账号</small>
          <button type="button" class="dialog-action-btn primary" id="btnOpenLoginFromAccount">🌐 立即登录 ${pName} 账号</button>
        </div>
      `;
      document.getElementById('btnOpenLoginFromAccount')?.addEventListener('click', () => {
        document.getElementById('btnOpenSourceDialog')?.click();
      });
      return;
    }
    elSongList.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px 12px;">
        <div style="font-size:13.5px;font-weight:700;">☁ ${acc.nickname} 的 ${pName} 歌单（共 ${acc.playlists.length} 个）</div>
        <button type="button" class="dialog-action-btn secondary" id="btnRefreshAccountPl" style="padding:4px 10px;font-size:12px;">↻ 刷新歌单</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;padding:0 4px 16px;">
        ${acc.playlists.map(pl => `
          <div class="account-pl-card" data-pl-id="${pl.id}" style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:14px;background:rgba(128,128,128,0.09);cursor:pointer;transition:transform 0.15s ease;">
            <img src="${pl.cover || '/app-icon.png'}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:52px;height:52px;border-radius:10px;object-fit:cover;flex:none;">
            <div style="min-width:0;flex:1;">
              <div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pl.isLiked ? '❤️ ' : ''}${pl.name}</div>
              <div style="font-size:11.5px;opacity:0.7;margin-top:3px;">${pl.trackCount} 首 · ${pl.isOwned ? '我创建的' : (pl.creator || '收藏的歌单')}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    document.getElementById('btnRefreshAccountPl')?.addEventListener('click', async () => {
      await loadNcmAccountData(true, plat);
      renderAccountPlaylistsView();
    });
    elSongList.querySelectorAll('.account-pl-card').forEach(card => {
      card.addEventListener('click', () => {
        const pl = acc.playlists.find(p => p.id === card.dataset.plId);
        if (pl) openAccountPlaylist(pl, plat);
      });
    });
  }

  async function renderFavoritesView(localFavSongs) {
    const plat = getAccountPlatformKey();
    const pName = PLATFORM_DISPLAY_NAMES[plat] || plat;
    const acc = await loadNcmAccountData(!getPlatformAccountCache(plat).loaded, plat);
    if (acc.loaded && acc.likedPlaylistId && !acc.likedPlaylistId.startsWith('__local_fav_')) {
      if (!acc.likedSongs.length) {
        try {
          const r = await fetch(`/api/private-music/account/playlist-tracks?platform=${encodeURIComponent(plat)}&id=${encodeURIComponent(acc.likedPlaylistId)}`);
          const j = await r.json();
          if (j?.ok && Array.isArray(j.songs)) acc.likedSongs = j.songs;
        } catch {}
      }
      const seen = new Set();
      const merged = [];
      for (const s of [...acc.likedSongs, ...localFavSongs]) {
        const k = s.qqMid ? `qq_${s.qqMid}` : (s.neteaseId ? `ne_${s.neteaseId}` : String(s.id || s.title));
        if (seen.has(k)) continue;
        seen.add(k);
        merged.push(s);
      }
      currentPlaylist = merged;
      renderSongList(merged);
      const hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin-bottom:6px;border-radius:12px;background:rgba(255,58,58,0.08);font-size:12.5px;';
      hdr.innerHTML = `<span>❤️ 已同步 <b>${acc.nickname}</b> 的 ${pName}「我喜欢的音乐」（共 ${merged.length} 首）</span><button type="button" class="dialog-action-btn secondary" id="btnRefreshAccFav" style="padding:3px 9px;font-size:11.5px;">↻ 同步刷新</button>`;
      elSongList.prepend(hdr);
      document.getElementById('btnRefreshAccFav')?.addEventListener('click', async () => {
        acc.likedSongs = [];
        await loadNcmAccountData(true, plat);
        applyFilters();
      });
      return;
    }
    currentPlaylist = localFavSongs;
    renderSongList(localFavSongs);
    if (localFavSongs.length) {
      const hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 12px;margin-bottom:6px;border-radius:12px;background:rgba(128,128,128,0.08);font-size:12.5px;';
      hdr.innerHTML = `<span>❤️ ${pName} 收藏列表（共 ${localFavSongs.length} 首 · 登录 ${pName} 账号后同步云端）</span>`;
      elSongList.prepend(hdr);
    }
  }

  // ── Favorites Management (按平台隔离 + 自动双向同步到当前所选平台账号) ──
  function isSongFavorited(song) {
    if (!song) return false;
    const plat = getAccountPlatformKey();
    const favSet = getPlatformFavSet(plat);
    const cache = getPlatformAccountCache(plat);
    const sid = String(song.id || '');
    const nid = String(song.neteaseId || '');
    const qmid = String(song.qqMid || '');
    const title = String(song.title || '');
    if (plat === 'netease' && nid && cache.likedIds.has(nid)) return true;
    if (plat === 'qq' && qmid && cache.likedIds.has(qmid)) return true;
    if (plat === 'private' && song.subsonicId && cache.likedIds.has(String(song.subsonicId))) return true;
    return favSet.has(sid) || (nid && favSet.has(nid)) || (qmid && favSet.has(qmid)) || (title && favSet.has(title));
  }

  async function toggleSongFavorite(song) {
    if (!song) return;
    const plat = getAccountPlatformKey();
    const pName = PLATFORM_DISPLAY_NAMES[plat] || plat;
    const favSet = getPlatformFavSet(plat);
    const cache = getPlatformAccountCache(plat);
    const sid = String(song.id || '');
    const nid = String(song.neteaseId || '');
    const qmid = String(song.qqMid || '');
    const title = String(song.title || '');
    const key = sid || qmid || nid || title;
    const isFav = isSongFavorited(song);
    const wantLike = !isFav;
    if (isFav) {
      if (sid) favSet.delete(sid);
      if (nid) { favSet.delete(nid); cache.likedIds.delete(nid); }
      if (qmid) { favSet.delete(qmid); cache.likedIds.delete(qmid); }
      if (title) favSet.delete(title);
      cache.likedSongs = cache.likedSongs.filter(s => String(s.id || '') !== sid && (!nid || String(s.neteaseId || '') !== nid) && (!qmid || String(s.qqMid || '') !== qmid));
    } else {
      favSet.add(key);
      if (plat === 'netease' && nid) cache.likedIds.add(nid);
      if (plat === 'qq' && qmid) cache.likedIds.add(qmid);
    }
    savePlatformFavSet(plat);

    updateFavoriteUI();
    syncFullLyricsSong(song);
    pushShellMusicState(true);

    // Sync heart click directly to the currently selected platform's logged-in account!
    if (isPlatformVipLoggedIn(plat) || plat === 'private') {
      try {
        const r = await fetch('/api/private-music/account/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: plat,
            songId: song.neteaseId || '',
            qqMid: song.qqMid || '',
            qqSongId: song.qqSongId || '',
            subsonicId: song.subsonicId || '',
            title: song.title || '',
            artist: song.vocalists || song.unitName || '',
            like: wantLike
          })
        });
        const j = await r.json();
        if (j?.ok) {
          if (j.songId) {
            song.neteaseId = j.songId;
            if (wantLike) cache.likedIds.add(String(j.songId));
            else cache.likedIds.delete(String(j.songId));
          }
          if (j.qqMid) {
            song.qqMid = j.qqMid;
            if (wantLike) cache.likedIds.add(String(j.qqMid));
            else cache.likedIds.delete(String(j.qqMid));
          }
          cache.likedSongs = [];
          showToast(wantLike
            ? `❤ 已同步喜欢到你的 ${pName} 账号: ${song.title}`
            : `已从你的 ${pName} 账号取消喜欢: ${song.title}`);
        } else {
          showToast(wantLike
            ? `❤ 已加入 ${pName} 收藏: ${song.title}`
            : `已从 ${pName} 收藏移除: ${song.title}`);
        }
      } catch {
        showToast(wantLike ? `❤ 已加入 ${pName} 收藏: ${song.title}` : `已从 ${pName} 收藏移除: ${song.title}`);
      }
    } else {
      showToast(wantLike
        ? `❤ 已加入 ${pName} 本地收藏: ${song.title}（登录 ${pName} 后同步到账号）`
        : `已从 ${pName} 收藏移除: ${song.title}`);
    }

    if (activeTab === 'fav') {
      applyFilters();
    }
  }

  function updateFavoriteUI() {
    if (elBtnDockFav) {
      const isFav = currentSong && isSongFavorited(currentSong);
      elBtnDockFav.classList.toggle('favorited', !!isFav);
      if (elDockFavLabel) {
        elDockFavLabel.textContent = isFav ? '已收藏' : '收藏';
      }
    }
    $$('.row-fav-btn').forEach(btn => {
      const id = btn.dataset.id;
      const s = currentPlaylist.find(x => String(x.id) === String(id));
      if (s) {
        const isFav = isSongFavorited(s);
        btn.classList.toggle('favorited', !!isFav);
        btn.title = isFav ? '取消收藏' : '收藏';
      }
    });
  }

  // Apply Song to UI & Play
  function playSong(song, autoPlay = true) {
    if (!song) return;
    currentSong = song;
    streamRetryCount = 0;

    // Always sync currentIndex to the actual song in currentPlaylist so highlight & next/prev never drift!
    let syncedIdx = currentPlaylist.indexOf(song);
    if (syncedIdx < 0 && song.id != null && song.id !== '') {
      syncedIdx = currentPlaylist.findIndex(s => String(s.id) === String(song.id));
    }
    currentIndex = syncedIdx;
    saveFranchiseLastSong(activeFranchise, song);

    // Immediately persist current song so capsule and navigation never lose it!
    try {
      localStorage.setItem('shiny.bgMusicCurrentSong', JSON.stringify(song));
      localStorage.setItem('shiny.bgMusicPlaying', String(autoPlay));
      localStorage.setItem('shiny.bgMusicCurrentTime', '0');
      if (typeof window.syncToCapsuleState === 'function') {
        window.syncToCapsuleState(song, autoPlay, 0);
      }
    } catch (e) {}

    // Turntable & Hero UI
    elHeroTitle.textContent = song.title;
    elHeroTitle.title = song.title;
    elHeroSub.textContent = song.titleZh || song.cleanTitle;
    elHeroArtists.innerHTML = `<span class="unit-tag">${song.unitName || 'THE IDOLM@STER'}</span> ${song.vocalists || ''}`;
    elHeroArtists.title = song.vocalists || song.unitName || '';
    elHeroAlbum.textContent = `专辑: ${song.album || 'THE IDOLM@STER Collection'}`;

    const coverUrl = song.cover || '/app-icon.png';
    [elAlbumCover, elVinylCenterImg, elDockThumb].forEach(img => {
      if (!img) return;
      img.referrerPolicy = 'no-referrer';
      img.onerror = () => { img.onerror = null; img.src = '/app-icon.png'; };
      img.src = coverUrl;
    });
    elDockTitle.textContent = song.title;
    elDockTitle.title = song.title;
    const cleanArtist = song.unitName || song.vocalists || 'THE IDOLM@STER';
    elDockArtist.textContent = song.titleZh ? `${song.titleZh} · ${cleanArtist}` : cleanArtist;
    elDockArtist.title = song.vocalists ? `${song.titleZh ? song.titleZh + ' · ' : ''}${song.vocalists}` : cleanArtist;

    // Update Dock favorite button state
    updateFavoriteUI();
    syncFullLyricsSong(song);
    pushShellMusicState(true);

    // Update Dock source badge
    if (elSourceLabel) {
      const eng = song.sourceEngine || (hasEnabledPrivateSource() && privateSourcesConfig.preferPrivate ? 'private' : activeSourceEngine);
      const labelMap = { private: '自建源', qq: 'QQ音乐', kugou: '酷狗', apple: '苹果音乐', migu: '咪咕', lx: '模板源', auto: '智能源', netease: '网易云' };
      elSourceLabel.textContent = labelMap[eng] || '网易云';
    }

    // Platform tag: ONLY show franchise badge (283PRO/346PRO/etc.) for actual Idolmaster catalog songs;
    // for external searched / account playlist / podcast songs, show the song's real platform!
    if (elHeroPlatformTag) {
      const sid = String(song.id || '');
      const isExternalSong = /^(ne_|nev_|qq_|mg_|dj_|sub_|kw_|s_wy_)/i.test(sid) || !!song.isVoice;
      if (isExternalSong) {
        const eng = song.sourceEngine || activeSourceEngine || 'netease';
        const srcMap = { netease: '🎵 网易云', qq: '🐧 QQ音乐', kugou: '🐶 酷狗', apple: ' Apple Music', migu: '📱 咪咕', private: '🎵 自建曲库', auto: '🌟 智能' };
        elHeroPlatformTag.textContent = song.isVoice ? '🎙 网易声音' : (srcMap[eng] || '🎵 在线曲库');
      } else {
        const meta = FRANCHISE_META[activeFranchise] || FRANCHISE_META.sc;
        elHeroPlatformTag.textContent = meta.badge;
      }
    }

    // Immediately update total time on UI so dock never shows 00:00 / 00:00
    if (elTotalTime) elTotalTime.textContent = formatTime(song.duration || 186);
    if (elCurrentTime) elCurrentTime.textContent = '00:00';
    if (elProgressRange) elProgressRange.value = 0;

    // Apply song's accent color
    if (song.color) {
      document.documentElement.style.setProperty('--music-theme', song.color);
      document.documentElement.style.setProperty('--music-theme-glow', song.color + '44');
    }

    // Set Audio URL (only reload if URL changed)
    const targetUrl = resolveAudioUrl(song, currentQuality);
    if (audio.src !== targetUrl && !audio.src.endsWith(targetUrl)) {
      audio.src = targetUrl;
      audio.load();
    }
    probeActualStreamQuality(targetUrl, currentQuality, song.id, false);

    // Mark active item in list
    // Highlight ONLY the single row that actually matches `song` (never a stale numeric index from another franchise!)
    let highlightedOnce = false;
    let activeRowEl = null;
    $$('.song-row-item').forEach(row => {
      const rowIdx = Number(row.dataset.index);
      const rowSong = currentPlaylist[rowIdx];
      const refMatch = rowSong === song;
      const idMatch = song.id != null && song.id !== '' && String(row.dataset.id) === String(song.id);
      const isCur = !highlightedOnce && (refMatch || idMatch);
      if (isCur) { highlightedOnce = true; activeRowEl = row; }
      row.classList.toggle('active', isCur);
      const wave = row.querySelector('.eq-bars-wave');
      if (wave) wave.style.display = isCur ? 'flex' : 'none';
    });
    if (activeRowEl && elSongList && elSongList.offsetParent !== null) {
      requestAnimationFrame(() => {
        try { activeRowEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch {}
      });
    }

    loadSongLyrics(song);

    if (autoPlay) {
      audio.play().then(() => {
        setPlayState(true);
      }).catch(err => {
        console.warn('Playback note:', err);
        if (audio.paused) setPlayState(false);
      });
    } else {
      setPlayState(false);
    }
  }

  // Set Play / Pause Visual State
  function setPlayState(isPlaying) {
    if (typeof window.syncToCapsuleState === 'function') {
      window.syncToCapsuleState(currentSong, isPlaying, audio.currentTime);
    }
    pushShellMusicState(true);
    const deck = document.getElementById('turntableDeck');
    if (deck) deck.classList.toggle('is-playing', !!isPlaying);
    vinylTargetSpeed = isPlaying ? 72 : 0;
    updateTonearmAngle(isPlaying);
    if (isPlaying && !vinylRafId && !isMobileMusicEnv() && musicTabVisible) {
      vinylLastTime = performance.now();
      vinylRafId = requestAnimationFrame(stepVinylPhysics);
    }
    if (isPlaying) {
      elVinylDisc.classList.add('playing');
      elTonearm.classList.add('active');
      if (elIconPlay) elIconPlay.style.display = 'none';
      if (elIconPause) elIconPause.style.display = 'block';
      elBtnPlayPause.setAttribute('aria-label', '暂停');
      elBtnPlayPause.setAttribute('title', '暂停 (空格键)');
    } else {
      elVinylDisc.classList.remove('playing');
      elTonearm.classList.remove('active');
      if (elIconPlay) elIconPlay.style.display = 'block';
      if (elIconPause) elIconPause.style.display = 'none';
      elBtnPlayPause.setAttribute('aria-label', '播放');
      elBtnPlayPause.setAttribute('title', '播放 (空格键)');
    }
  }

  // Switch View Mode: 'songs' vs 'lyrics'
  function switchViewMode(mode) {
    activeViewMode = mode;
    if (mode === 'lyrics') {
      elLyricsContainer.style.display = 'flex';
      elSongsContainer.style.display = 'none';
      elBtnShowLyrics.classList.add('active');
      elBtnShowSongs.classList.remove('active');
      setTimeout(syncLyrics, 50);
    } else {
      elLyricsContainer.style.display = 'none';
      elSongsContainer.style.display = 'flex';
      elBtnShowSongs.classList.add('active');
      elBtnShowLyrics.classList.remove('active');
    }
  }

  // Play Next / Previous
  // Deterministic Shuffle Queue so both Music Capsule & Full-Screen Lyrics show the EXACT upcoming random tracks!
  let shuffleOrder = [];
  let shuffleSourceRef = null;
  let shuffleSourceLen = -1;

  function ensureShuffleOrder() {
    if (shuffleSourceRef === currentPlaylist && shuffleSourceLen === currentPlaylist.length && shuffleOrder.length === currentPlaylist.length) {
      return shuffleOrder;
    }
    shuffleSourceRef = currentPlaylist;
    shuffleSourceLen = currentPlaylist.length;
    const arr = currentPlaylist.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    shuffleOrder = arr;
    return shuffleOrder;
  }

  function buildQueuePreview(limit = 30) {
    if (!currentPlaylist || !currentPlaylist.length) return { title: '待播列表', items: [] };
    const tabLabels = { fav: '收藏列表', account: '账号歌单', custom: '自建歌单', solo: '独唱列表', unit: '组合列表', allstars: '合唱列表', all: '当前列表' };
    const baseName = tabLabels[activeTab] || '当前列表';
    const modeLabel = playMode === 'shuffle' ? '随机待播' : (playMode === 'single' ? '单曲循环' : '顺序播放');
    const title = `${baseName} · ${modeLabel} (${currentPlaylist.length}首)`;
    const indices = [];
    const cur = Math.max(0, Math.min(currentIndex, currentPlaylist.length - 1));
    if (playMode === 'shuffle' && currentPlaylist.length > 1) {
      const order = ensureShuffleOrder();
      const pos = Math.max(0, order.indexOf(cur));
      const count = Math.min(limit, order.length);
      for (let k = 0; k < count; k++) indices.push(order[(pos + k) % order.length]);
    } else {
      const count = Math.min(limit, currentPlaylist.length);
      for (let k = 0; k < count; k++) indices.push((cur + k) % currentPlaylist.length);
    }
    const items = indices.map(idx => {
      const s = currentPlaylist[idx];
      const isCur = !!currentSong && (s === currentSong || (currentSong.id != null && currentSong.id !== '' && String(s?.id) === String(currentSong.id)));
      return {
        index: idx,
        id: String(s?.id || ''),
        title: s?.title || '',
        artist: s?.vocalists || s?.unitName || '',
        cover: s?.cover || '/app-icon.png',
        isCurrent: isCur
      };
    });
    return { title, items };
  }

  function nextSong() {
    if (!currentPlaylist.length) return;
    if (playMode === 'shuffle' && currentPlaylist.length > 1) {
      const order = ensureShuffleOrder();
      const pos = order.indexOf(currentIndex);
      currentIndex = order[(pos >= 0 ? pos + 1 : 0) % order.length];
    } else {
      currentIndex = (currentIndex + 1) % currentPlaylist.length;
    }
    playSong(currentPlaylist[currentIndex], true);
  }

  function prevSong() {
    if (!currentPlaylist.length) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    playSong(currentPlaylist[currentIndex], true);
  }

  // 5 Master Franchises Sequence & Metadata
  const FRANCHISE_CYCLE = ['sc', 'gakuen', 'cg', 'ml', 'as'];

  const FRANCHISE_META = {
    sc: { 
      prefix: '283', 
      desc: '闪耀色彩 283PRO 点播台 · 全偶像曲目分类 · 官方海报与双语歌词跟随', 
      logo: '/images/franchise-logos/logo-sc.png', 
      badge: '283PRO', 
      name: '闪耀色彩 (283PRO)',
      themeColor: '#00b4d8',
      themeGlow: 'rgba(0, 180, 216, 0.35)',
      unitLabel: '🌟 组合专区 (8大组合专属曲目)',
      idolLabel: '🌸 偶像个人 (28位小偶像个人独唱)'
    },
    gakuen: { 
      prefix: '初星学园', 
      desc: '学园偶像大师 点播台 · 初星学园全偶像单曲与合唱 · 官方海报与歌词跟随', 
      logo: '/images/franchise-logos/logo-gakuen.png', 
      badge: '初星学園', 
      name: '学园偶像大师 (初星学园)',
      themeColor: '#ff7700',
      themeGlow: 'rgba(255, 119, 0, 0.35)',
      unitLabel: '🌟 学院专区 (初星学园专属分类)',
      idolLabel: '🎓 初星学生 (12位学生偶像专属曲目)'
    },
    cg: { 
      prefix: '346', 
      desc: '灰姑娘女孩 346PRO 点播台 · Cute/Cool/Passion 属性精选与经典组合', 
      logo: '/images/franchise-logos/logo-cg.png', 
      badge: '346PRO', 
      name: '灰姑娘女孩 (346PRO)',
      themeColor: '#2563eb',
      themeGlow: 'rgba(37, 99, 235, 0.35)',
      unitLabel: '👑 属性与组合 (Cute / Cool / Passion / 经典组合)',
      idolLabel: '👠 灰姑娘偶像 (代表偶像专属曲目)'
    },
    ml: { 
      prefix: '765THEATER', 
      desc: '百万现场 765 剧场点播台 · Princess/Fairy/Angel 属性与剧场全员合唱', 
      logo: '/images/franchise-logos/logo-ml.png', 
      badge: '765THEATER', 
      name: '百万现场 (765THEATER)',
      themeColor: '#f59e0b',
      themeGlow: 'rgba(245, 158, 11, 0.35)',
      unitLabel: '🎭 属性与剧场 (Princess / Fairy / Angel / 组合)',
      idolLabel: '🌟 剧场偶像 (代表偶像专属曲目)'
    },
    as: { 
      prefix: '765PRO', 
      desc: '偶像大师本家 765PRO 点播台 · 动画剧场版神曲与13位传奇偶像经典独唱', 
      logo: '/images/franchise-logos/logo-as.png', 
      badge: '765PRO', 
      name: '偶像大师本家 (765PRO)',
      themeColor: '#dc2626',
      themeGlow: 'rgba(220, 38, 38, 0.35)',
      unitLabel: '⭐ 经典专区 (动画/剧场版/个人单曲/合唱)',
      idolLabel: '👑 765 传奇偶像 (13位元祖传奇偶像)'
    }
  };

  // Switch Franchise (5 Master Franchises)
  function switchFranchise(franchiseKey, autoPlay = true) {
    if (!franchiseCatalogs || !franchiseCatalogs[franchiseKey]) {
      fetch('franchise-catalogs.json').then(r => r.json()).then(data => {
        franchiseCatalogs = data;
        switchFranchise(franchiseKey, autoPlay);
      }).catch(err => console.warn('Fetch franchise error:', err));
      return;
    }
    // Remember previous franchise's currently selected song before switching away
    if (activeFranchise && currentSong) {
      saveFranchiseLastSong(activeFranchise, currentSong);
    }
    localStorage.removeItem('shiny.importedCatalog');
    activeFranchise = franchiseKey;
    localStorage.setItem('shiny.activeFranchise', franchiseKey);

    // Sync tab button state
    $$('.franchise-tab-btn').forEach(btn => {
      const isCur = btn.dataset.franchise === franchiseKey;
      btn.classList.toggle('active', isCur);
      btn.setAttribute('aria-selected', isCur ? 'true' : 'false');
    });

    // Set page franchise theme & aurora
    document.body.dataset.franchise = franchiseKey;
    const meta = FRANCHISE_META[franchiseKey] || FRANCHISE_META.sc;
    document.documentElement.style.setProperty('--music-theme', meta.themeColor);
    document.documentElement.style.setProperty('--music-theme-glow', meta.themeGlow);

    // Update Single Hero Brand Logo & Heading
    const elLogo = $('#currentFranchiseLogo');
    const elPrefix = $('#heroFranchisePrefix');
    const elDesc = $('#heroFranchiseDesc');
    const elBadge = $('#heroFranchiseBadge');

    if (elLogo) {
      elLogo.src = meta.logo;
      elLogo.alt = meta.name;
    }
    if (elPrefix) elPrefix.textContent = meta.prefix;
    if (elDesc) elDesc.textContent = meta.desc;
    if (elBadge) elBadge.textContent = meta.badge;

    // Update filter section labels (clean compact Apple pill, details in tooltip)
    const elUnitLabel = $('#filterUnitLabel');
    const elIdolLabel = $('#filterIdolLabel');
    if (elUnitLabel) {
      elUnitLabel.innerHTML = '<span>组合</span>';
      elUnitLabel.title = meta.unitLabel || '组合专区';
    }
    if (elIdolLabel) {
      elIdolLabel.innerHTML = '<span>偶像</span>';
      elIdolLabel.title = meta.idolLabel || '偶像个人';
    }

    const frData = franchiseCatalogs[franchiseKey];
    catalogData.songs = frData.songs;
    catalogData.units = frData.units || {};
    catalogData.idols = (frData.idols && frData.idols.length)
      ? frData.idols
      : (franchiseKey === 'sc' ? scDefaultIdols : []);
    catalogData.playlistTitle = frData.name;
    catalogData.author = frData.creator || '宫水三也';

    const unitRow = elUnitTrack?.closest('.filter-sub-row');
    const idolRow = elIdolTrack?.closest('.filter-sub-row');
    if (unitRow) unitRow.hidden = !(franchiseKey === 'sc' || Object.keys(catalogData.units).length > 0);
    if (idolRow) idolRow.hidden = !(catalogData.idols && catalogData.idols.length > 0);

    if (elPlaylistSourceAuthor) elPlaylistSourceAuthor.textContent = catalogData.author;
    if (elCountSongs) elCountSongs.textContent = frData.songs.length;
    if (elCountIdols) elCountIdols.textContent = (catalogData.idols || []).length;

    // Reset filters
    selectedUnit = 'all';
    selectedIdolId = 'all';
    activeTab = 'all';
    $$('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === 'all'));

    // Re-render unit bar and idol bar for THIS franchise
    renderUnitBar();
    renderIdolBar(catalogData.idols);

    applyFilters();
    if (currentPlaylist.length) {
      const targetIdx = findRememberedFranchiseSongIndex(franchiseKey, currentPlaylist);
      const safeIdx = targetIdx >= 0 ? targetIdx : 0;
      currentIndex = safeIdx;
      playSong(currentPlaylist[safeIdx], autoPlay);
    }
    if (autoPlay) {
      showToast(`✨ 已进入「${meta.name}」专属音乐馆！共收录 ${frData.songs.length} 首曲目`);
    }
  }

  function cycleNextFranchise() {
    let curIdx = FRANCHISE_CYCLE.indexOf(activeFranchise);
    if (curIdx === -1) curIdx = 0;
    const nextKey = FRANCHISE_CYCLE[(curIdx + 1) % FRANCHISE_CYCLE.length];
    switchFranchise(nextKey);
  }

  // Render Row 1: Units Section (组合专区 / 属性专区)
  function renderUnitBar() {
    if (!elUnitTrack) return;
    let unitList = [];
    if (activeFranchise === 'sc') {
      unitList = UNITS_DATA;
    } else {
      const curUnits = catalogData.units || {};
      unitList = Object.entries(curUnits).map(([k, u]) => ({
        key: k,
        name: u.nameZh || u.name,
        color: u.color || 'var(--music-theme)',
        glow: (u.color || '#ff4e78') + '33',
        shadow: (u.color || '#ff4e78') + '22'
      }));
    }

    const pillsHtml = unitList.map(u => `
      <button class="unit-card-pill ${selectedUnit === u.key ? 'active' : ''}" 
              data-unit="${u.key}" 
              style="--unit-color:${u.color};--unit-glow:${u.glow};--unit-shadow:${u.shadow}">
        <span class="unit-icon-dot"></span>
        <span>${u.name}</span>
      </button>
    `).join('');

    if (unitList.length >= 4) {
      elUnitTrack.classList.add('is-marquee');
      elUnitTrack.innerHTML = `
        <div class="unit-marquee-belt">
          <div class="unit-marquee-group">${pillsHtml}</div>
          <div class="unit-marquee-group" aria-hidden="true">${pillsHtml}</div>
        </div>
      `;
    } else {
      elUnitTrack.classList.remove('is-marquee', 'is-dragging');
      elUnitTrack.innerHTML = pillsHtml;
    }

    // Draggable + Hover-Pause + Constant-Speed Seamless Marquee Engine
    if (!elUnitTrack._marqueeCtrl) {
      const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const ctrl = {
        offset: 0,
        halfW: 0,
        speedPxPerSec: 38,
        hovering: false,
        dragging: false,
        dragMoved: false,
        startX: 0,
        lastX: 0,
        velocity: 0,
        lastTs: 0,
        raf: 0,
        resumeTimer: 0
      };

      const wrapOffset = () => {
        if (ctrl.halfW <= 0) return;
        ctrl.offset = ((ctrl.offset % ctrl.halfW) + ctrl.halfW) % ctrl.halfW;
      };

      const measure = () => {
        const grp = elUnitTrack.querySelector('.unit-marquee-group');
        ctrl.halfW = grp ? grp.offsetWidth : 0;
        wrapOffset();
      };

      const applyTransform = () => {
        const belt = elUnitTrack.querySelector('.unit-marquee-belt');
        if (belt) belt.style.transform = `translate3d(${(-ctrl.offset).toFixed(2)}px, 0, 0)`;
      };

      const tick = (now) => {
        ctrl.raf = requestAnimationFrame(tick);
        if (document.hidden || !elUnitTrack.classList.contains('is-marquee')) {
          ctrl.lastTs = now;
          return;
        }
        if (ctrl.halfW <= 0) measure();
        if (ctrl.halfW <= 0) return;

        const dt = ctrl.lastTs ? Math.min(0.05, (now - ctrl.lastTs) / 1000) : 0.016;
        ctrl.lastTs = now;

        if (ctrl.dragging) {
          applyTransform();
          return;
        }

        // Smooth inertia decay right after releasing a drag
        if (Math.abs(ctrl.velocity) > 0.35) {
          ctrl.offset -= ctrl.velocity * dt;
          ctrl.velocity *= Math.pow(0.06, dt);
          wrapOffset();
          applyTransform();
          return;
        } else {
          ctrl.velocity = 0;
        }

        if (!ctrl.hovering && !reducedMotion) {
          ctrl.offset += ctrl.speedPxPerSec * dt;
          wrapOffset();
          applyTransform();
        }
      };

      elUnitTrack.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'mouse') ctrl.hovering = true;
      });
      elUnitTrack.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse') ctrl.hovering = false;
      });

      elUnitTrack.addEventListener('pointerdown', (e) => {
        if (!elUnitTrack.classList.contains('is-marquee')) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        clearTimeout(ctrl.resumeTimer);
        ctrl.dragging = true;
        ctrl.dragMoved = false;
        ctrl.startX = e.clientX;
        ctrl.lastX = e.clientX;
        ctrl.velocity = 0;
        if (ctrl.halfW <= 0) measure();
        elUnitTrack.classList.add('is-dragging');
        try { elUnitTrack.setPointerCapture(e.pointerId); } catch {}
      });

      elUnitTrack.addEventListener('pointermove', (e) => {
        if (!ctrl.dragging) return;
        const dx = e.clientX - ctrl.lastX;
        ctrl.lastX = e.clientX;
        if (Math.abs(e.clientX - ctrl.startX) > 5) ctrl.dragMoved = true;
        ctrl.offset -= dx;
        ctrl.velocity = dx * 28;
        wrapOffset();
        applyTransform();
      });

      const endDrag = (e) => {
        if (!ctrl.dragging) return;
        ctrl.dragging = false;
        elUnitTrack.classList.remove('is-dragging');
        try { elUnitTrack.releasePointerCapture(e.pointerId); } catch {}
        if (e.pointerType !== 'mouse') {
          ctrl.hovering = true;
          clearTimeout(ctrl.resumeTimer);
          ctrl.resumeTimer = setTimeout(() => { ctrl.hovering = false; }, 1200);
        }
        // Reset dragMoved on next microtask so click handler can inspect it
        setTimeout(() => { ctrl.dragMoved = false; }, 40);
      };
      elUnitTrack.addEventListener('pointerup', endDrag);
      elUnitTrack.addEventListener('pointercancel', endDrag);

      // Horizontal wheel scrolling support when hovering over marquee
      elUnitTrack.addEventListener('wheel', (e) => {
        if (!elUnitTrack.classList.contains('is-marquee')) return;
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!delta) return;
        e.preventDefault();
        if (ctrl.halfW <= 0) measure();
        ctrl.offset += delta * 0.7;
        wrapOffset();
        applyTransform();
      }, { passive: false });

      window.addEventListener('resize', measure, { passive: true });
      ctrl.measure = measure;
      elUnitTrack._marqueeCtrl = ctrl;
      ctrl.raf = requestAnimationFrame(tick);
    }

    if (elUnitTrack._marqueeCtrl) {
      requestAnimationFrame(() => elUnitTrack._marqueeCtrl.measure());
    }

    $$('.unit-card-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        if (elUnitTrack._marqueeCtrl?.dragMoved) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        selectUnit(pill.dataset.unit);
      });
    });
  }

  // Select Unit -> Automatically jump to "组合专属" tab
  function selectUnit(unitKey) {
    selectedUnit = unitKey;
    selectedIdolId = 'all';

    $$('.unit-card-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.unit === unitKey);
    });
    $$('.idol-card-pill').forEach(pill => pill.classList.remove('active'));

    activeTab = 'all';
    if (unitKey !== 'all') {
      if (activeFranchise === 'sc') {
        const uInfo = UNITS_DATA.find(u => u.key === unitKey);
        if (uInfo) {
          document.documentElement.style.setProperty('--music-theme', uInfo.color);
          document.documentElement.style.setProperty('--music-theme-glow', uInfo.color + '44');
        }
      } else {
        const curUnits = catalogData.units || {};
        const u = curUnits[unitKey];
        if (u && u.color) {
          document.documentElement.style.setProperty('--music-theme', u.color);
          document.documentElement.style.setProperty('--music-theme-glow', u.color + '44');
        }
      }
    } else {
      const meta = FRANCHISE_META[activeFranchise] || FRANCHISE_META.sc;
      document.documentElement.style.setProperty('--music-theme', meta.themeColor);
      document.documentElement.style.setProperty('--music-theme-glow', meta.themeGlow);
    }

    // Sync active tab buttons visually
    $$('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });

    // Ergonomic Unit -> Member Sub-Drawer: unfold ONLY this unit's 2-5 members (collapse completely on 'all')
    renderIdolBar(catalogData.idols || []);

    applyFilters();
    switchViewMode('songs');
  }

  function unitMatchesIdol(unitKey, idol) {
    if (!unitKey || unitKey === 'all' || !idol || !idol.unit) return false;
    const u = String(idol.unit).toLowerCase();
    const k = String(unitKey).toLowerCase();
    if (u === k) return true;
    const aliases = UNIT_ALIASES_MAP[k] || [k];
    return aliases.some(a => u === String(a).toLowerCase());
  }

  // Ergonomic Inline Member Sub-Drawer (hidden by default; unfolds smoothly inside the selected Unit!)
  function renderIdolBar(idols) {
    if (!elIdolTrack) return;
    const rowEl = elIdolTrack.closest('.idol-carousel-row');
    const unitMembers = (selectedUnit && selectedUnit !== 'all' && Array.isArray(idols))
      ? idols.filter(idol => unitMatchesIdol(selectedUnit, idol))
      : [];

    if (!unitMembers.length) {
      elIdolTrack.innerHTML = '';
      if (rowEl) rowEl.classList.add('is-collapsed');
      return;
    }

    const isSC = activeFranchise === 'sc';
    const allUnitPill = `
      <button class="idol-card-pill idol-unit-all-pill ${selectedIdolId === 'all' ? 'active' : ''}" data-idol="__unit_all__">
        <span class="idol-all-spark">✨</span>
        <span class="idol-name-label">组合全部</span>
      </button>
    `;
    const idolPills = unitMembers.map(idol => {
      const iconPath = isSC ? getIdolIcon(idol.id) : null;
      return `
        <button class="idol-card-pill ${String(selectedIdolId) === String(idol.id) ? 'active' : ''}" data-idol="${idol.id}" style="--idol-color:${idol.color};--idol-glow:${idol.color}55">
          <div class="idol-avatar-wrap" style="background:${idol.color}20;border:1.5px solid ${idol.color}88;">
            ${iconPath ? `<img src="${iconPath}" alt="${idol.name}" onerror="this.onerror=null;this.src='/app-icon.png'">` : `<span style="font-size:12px;font-weight:900;color:${idol.color};">${idol.name.slice(0, 1)}</span>`}
          </div>
          <span class="idol-name-label">${idol.name}</span>
        </button>
      `;
    }).join('');

    elIdolTrack.innerHTML = allUnitPill + idolPills;
    if (rowEl) rowEl.classList.remove('is-collapsed');

    $$('.idol-card-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        if (pill.dataset.idol === '__unit_all__') {
          selectUnit(selectedUnit);
        } else {
          selectIdol(pill.dataset.idol);
        }
      });
    });
  }

  const UNIT_ALIASES_MAP = {
    "illumi": ["illumination", "イルミネーションスターズ", "イルミネ", "illumi"],
    "illumination": ["illumination", "イルミネーションスターズ", "イルミネ", "illumi"],
    "lantica": ["lantica", "l'antica", "アンティーカ", "アンティー"],
    "houkago": ["climax", "hokago", "houkago", "放課後クライマックスガールズ", "放クラ"],
    "climax": ["climax", "hokago", "houkago", "放課後クライマックスガールズ", "放クラ"],
    "alstro": ["alstroemeria", "alstro", "アルストロメリア", "アルスト"],
    "alstroemeria": ["alstroemeria", "alstro", "アルストロメリア", "アルスト"],
    "stray": ["straylight", "stray", "ストレイライト", "ストレイ"],
    "straylight": ["straylight", "stray", "ストレイライト", "ストレイ"],
    "noctchill": ["noctchill", "noct", "ノクチル"],
    "shhis": ["shhis", "シーズ"],
    "cometik": ["cometik", "コメティック"]
  };

  function matchesSongToIdol(s, idol) {
    if (!s || !idol) return false;
    if (Array.isArray(s.idols) && s.idols.includes(String(idol.id))) return true;
    if (s.type === 'solo') {
      const text = ((s.title || '') + ' ' + (s.vocalists || '') + ' ' + (s.unitName || '')).toLowerCase();
      if (idol.keywords && idol.keywords.some(k => text.includes(k.toLowerCase()))) return true;
    }
    if (s.type === 'unit') {
      if (s.unitKey && s.unitKey === idol.unit) return true;
      const aliases = UNIT_ALIASES_MAP[idol.unit] || [idol.unit];
      const uText = ((s.unit || '') + ' ' + (s.unitKey || '') + ' ' + (s.unitName || '')).toLowerCase();
      if (aliases.some(a => uText.includes(a.toLowerCase()))) return true;
    }
    if (s.type === 'all' || s.unit === 'all' || (s.unitName && (s.unitName.includes('ALL STARS') || s.unitName.includes('シャイニーカラーズ')))) {
      return true;
    }
    return false;
  }

  function isSoloSongForIdol(s, idolId) {
    if (s.type !== 'solo') return false;
    if (idolId === 'all') return true;
    const idol = catalogData.idols?.find(i => String(i.id) === String(idolId));
    if (!idol) return false;
    if (Array.isArray(s.idols) && s.idols.includes(String(idol.id))) return true;
    const text = ((s.title || '') + ' ' + (s.vocalists || '') + ' ' + (s.unitName || '')).toLowerCase();
    return idol.keywords && idol.keywords.some(k => text.includes(k.toLowerCase()));
  }

  function isUnitSongForIdol(s, idolId) {
    if (s.type !== 'unit') return false;
    if (idolId === 'all') return true;
    const idol = catalogData.idols?.find(i => String(i.id) === String(idolId));
    if (!idol) return false;
    if (Array.isArray(s.idols) && s.idols.includes(String(idol.id))) return true;
    if (s.unitKey && s.unitKey === idol.unit) return true;
    const aliases = UNIT_ALIASES_MAP[idol.unit] || [idol.unit];
    const uText = ((s.unit || '') + ' ' + (s.unitKey || '') + ' ' + (s.unitName || '')).toLowerCase();
    return aliases.some(a => uText.includes(a.toLowerCase()));
  }

  // Select Idol inside the currently unfolded Unit Sub-Drawer -> show ALL songs sung by this idol!
  function selectIdol(idolId) {
    selectedIdolId = idolId;

    $$('.idol-card-pill').forEach(pill => {
      pill.classList.toggle('active', String(pill.dataset.idol) === String(idolId));
    });

    const idol = catalogData.idols?.find(i => String(i.id) === String(idolId));
    if (idol) {
      document.documentElement.style.setProperty('--music-theme', idol.color);
      document.documentElement.style.setProperty('--music-theme-glow', idol.color + '44');
    }
    activeTab = 'all';

    $$('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });

    applyFilters();
    switchViewMode('songs');
  }

  // Filter Songs
  function applyFilters() {
    if (!catalogData) return;
    let filtered = catalogData.songs.slice();

    // Unit filter (only when viewing whole unit; when a specific idol inside the unit is picked, show ALL songs she sings!)
    if (selectedUnit !== 'all' && selectedIdolId === 'all') {
      const unitInfo = UNITS_DATA.find(u => u.key === selectedUnit);
      if (unitInfo?.crossQuery) {
        // Cross-unit (ICU / Team.Stella / Team.Luna / Team.Sol / etc.): search live across all platforms!
        const kw = unitInfo.crossQuery;
        elSongList.innerHTML = `<div style="text-align:center;padding:52px 20px;color:var(--music-text-muted);"><p style="font-size:14px;font-weight:600;">🔍 正在检索越境组合「${unitInfo.name}」曲目…</p></div>`;
        fetch(`/api/music-search-all?query=${encodeURIComponent(kw)}`).then(r => r.json()).then(hits => {
          if (selectedUnit !== unitInfo.key) return;
          const curEng = activeSourceEngine || 'netease';
          const list = (Array.isArray(hits) ? hits : []).map(item => ({
            id: item.id,
            neteaseId: item.neteaseId,
            qqMid: item.qqMid,
            miguId: item.miguId,
            title: item.title,
            titleZh: '',
            unitName: unitInfo.name,
            type: 'unit',
            idols: ['all'],
            vocalists: item.artist,
            duration: item.duration,
            album: item.album,
            cover: item.cover,
            color: unitInfo.color,
            source: curEng,
            sourceEngine: curEng,
            isVoice: !!item.isVoice
          }));
          currentPlaylist = list;
          renderSongList(list);
        }).catch(() => {
          currentPlaylist = [];
          renderSongList([]);
        });
        return;
      }
      const aliases = UNIT_ALIASES_MAP[selectedUnit] || [selectedUnit];
      filtered = filtered.filter(s => {
        const uText = ((s.unit || '') + ' ' + (s.unitKey || '') + ' ' + (s.unitName || '')).toLowerCase();
        return aliases.some(a => uText.includes(a.toLowerCase()));
      });
    }

    // Idol filter
    if (selectedIdolId !== 'all') {
      const curIdol = catalogData.idols?.find(i => String(i.id) === String(selectedIdolId));
      if (curIdol) {
        filtered = filtered.filter(s => matchesSongToIdol(s, curIdol));
      }
    }

    // Tab filter
    if (activeTab === 'account') {
      renderAccountPlaylistsView();
      return;
    } else if (activeTab === 'custom') {
      renderCustomPlaylistsView();
      return;
    } else if (activeTab === 'solo') {
      filtered = filtered.filter(s => isSoloSongForIdol(s, selectedIdolId));
    } else if (activeTab === 'unit') {
      filtered = filtered.filter(s => isUnitSongForIdol(s, selectedIdolId));
    } else if (activeTab === 'allstars') {
      filtered = filtered.filter(s => s.type === 'all' || s.unit === 'all' || (s.unitName && s.unitName.includes('ALL STARS')) || (s.unitName && s.unitName.includes('シャイニーカラーズ')));
    } else if (activeTab === 'fav') {
      const localFavs = filtered.filter(s => isSongFavorited(s));
      renderFavoritesView(localFavs);
      return;
    }

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.titleZh && s.titleZh.toLowerCase().includes(q)) ||
        (s.unitName && s.unitName.toLowerCase().includes(q)) ||
        (s.vocalists && s.vocalists.toLowerCase().includes(q)) ||
        (s.album && s.album.toLowerCase().includes(q))
      );
    }

    currentPlaylist = filtered;
    renderSongList(filtered);
  }

  function scrollSongListToTop(smooth = true) {
    const targets = [elSongList, document.getElementById('songsViewContainer')];
    for (const el of targets) {
      if (!el) continue;
      try {
        if (smooth && typeof el.scrollTo === 'function') {
          el.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          el.scrollTop = 0;
        }
      } catch {
        el.scrollTop = 0;
      }
    }
  }

  // Render Song List Table (with Individual Download & Set BGM Actions)
  function renderSongList(songs) {
    scrollSongListToTop(true);
    if (!songs.length) {
      elSongList.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--music-text-muted);">
          <p style="font-size:28px;margin:0 0 8px;">${activeTab === 'fav' ? '🤍' : '♪'}</p>
          <p style="font-size:14px;font-weight:600;">${activeTab === 'fav' ? '暂无收藏曲目' : '未找到匹配曲目'}</p>
          <small>${activeTab === 'fav' ? '点击列表中每首歌右侧的「小红心」即可加入我的收藏' : '尝试切换筛选分类或搜索其他歌名'}</small>
        </div>
      `;
      return;
    }

    const engineShortMap = {
      netease: '🎵 网易',
      qq: '🐧 QQ',
      kugou: '🐶 酷狗',
      apple: ' 苹果',
      migu: '📱 咪咕',
      private: '🎵 自建',
      auto: '🌟 智能'
    };
    const engineCycleList = ['netease', 'qq', 'kugou', 'apple', 'migu', 'auto'];

    let renderedActiveOnce = false;
    let matchedActiveIdx = -1;
    elSongList.innerHTML = songs.map((s, idx) => {
      const isCur = !renderedActiveOnce && !!currentSong && (
        s === currentSong ||
        (currentSong.id != null && currentSong.id !== '' && String(s.id) === String(currentSong.id))
      );
      if (isCur) { renderedActiveOnce = true; matchedActiveIdx = idx; }
      const isFav = isSongFavorited(s);
      const curEng = s.isVoice ? 'netease' : (s._pinnedEngine || activeSourceEngine || s.sourceEngine || 'netease');
      const curEngLabel = s.isVoice ? '🎙 声音' : (engineShortMap[curEng] || '🎵 网易');
      const unavail = isSongUnavailable(s, curEng);
      return `
        <div class="song-row-item ${isCur ? 'active' : ''} ${unavail ? 'is-unavailable' : ''}" data-id="${s.id}" data-index="${idx}">
          <div class="song-row-left">
            <span class="song-index-badge">${String(idx + 1).padStart(2, '0')}</span>
            <div class="song-thumb-cover">
              <img src="${s.cover || '/app-icon.png'}" alt="${s.title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/app-icon.png'">
            </div>
            <div class="song-text-meta">
              <div class="song-title-row">
                <span class="song-title-main">${s.title}</span>
                ${s.titleZh ? `<span class="song-title-zh-tag">${s.titleZh}</span>` : ''}
                ${unavail ? '<span class="song-nocopyright-tag">无版权</span>' : ''}
              </div>
              <div class="song-artist-row" title="${s.vocalists || s.unitName || ''}">${s.unitName || 'THE IDOLM@STER'} · ${s.vocalists || ''}</div>
            </div>
          </div>
          <div class="song-row-right">
            <!-- Row Audio Source Badge (Click to cycle source) -->
            <button class="row-source-badge single-source-pill" data-id="${s.id}" data-engine="${curEng}" title="当前音源: ${curEngLabel} (点击切换音源)">
              ${curEngLabel}
            </button>
            <!-- Row Actions: Add to Playlist, Favorite, Set as BGM & Download -->
            <button class="song-row-action-btn row-add-btn" data-id="${s.id}" title="添加到自建歌单" aria-label="添加到自建歌单">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            </button>
            <button class="song-row-action-btn row-fav-btn ${isFav ? 'favorited' : ''}" data-id="${s.id}" title="${isFav ? '取消收藏' : '收藏'}" aria-label="收藏">
              <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </button>
            <button class="song-row-action-btn row-bgm-btn" data-id="${s.id}" title="设为事务所主界面背景音乐" aria-label="设为主页BGM">
              <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            </button>
            <button class="song-row-action-btn row-dl-btn" data-id="${s.id}" title="下载这首歌曲" aria-label="下载歌曲">
              <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            </button>
            <div class="eq-bars-wave" style="display: ${isCur ? 'flex' : 'none'};">
              <div class="eq-bar"></div>
              <div class="eq-bar"></div>
              <div class="eq-bar"></div>
            </div>
            <span class="song-duration-label">${formatTime(s.duration)}</span>
          </div>
        </div>
      `;
    }).join('');
    currentIndex = matchedActiveIdx;

    // Attach click to play (block clicking dimmed no-copyright rows)
    $$('.song-row-item').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.song-row-action-btn') || e.target.closest('.row-source-selector') || e.target.closest('.row-source-badge')) return;
        if (row.classList.contains('is-unavailable')) return;
        const idx = parseInt(row.dataset.index, 10);
        currentIndex = idx;
        playSong(currentPlaylist[idx], true);
      });
    });

    // Attach row source switcher (Cycle source on click)
    $$('.row-source-badge').forEach(badge => {
      badge.addEventListener('click', async (e) => {
        e.stopPropagation();
        const s = songs.find(x => x.id === badge.dataset.id);
        if (!s) return;
        const curEng = s.isVoice ? 'netease' : (s._pinnedEngine || activeSourceEngine || s.sourceEngine || 'netease');
        let nextIdx = (engineCycleList.indexOf(curEng) + 1) % engineCycleList.length;
        const nextEng = engineCycleList[nextIdx];
        s.sourceEngine = nextEng;
        s._pinnedEngine = nextEng;
        const newLabel = engineShortMap[nextEng] || '🎵 网易';
        badge.textContent = newLabel;
        badge.dataset.engine = nextEng;
        badge.title = `当前音源: ${newLabel} (点击切换音源)`;
        showToast(`已切换「${s.title}」音源为 ${newLabel}`);
        if (currentSong && currentSong.id === s.id) {
          await switchCurrentSongSource(nextEng);
        }
      });
    });

    // Attach row Add to Playlist button
    $$('.row-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = songs.find(x => String(x.id) === String(btn.dataset.id));
        if (s) openAddToPlaylistDialog(s);
      });
    });

    // Attach row Favorite button
    $$('.row-fav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = songs.find(x => String(x.id) === String(btn.dataset.id));
        if (s) {
          btn.classList.add('pop-anim');
          setTimeout(() => btn.classList.remove('pop-anim'), 350);
          toggleSongFavorite(s);
        }
      });
    });

    // Attach row BGM button
    $$('.row-bgm-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = songs.find(x => x.id === btn.dataset.id);
        if (s) setAsHomeBgm(s);
      });
    });

    // Attach row Download button
    $$('.row-dl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const s = songs.find(x => x.id === btn.dataset.id);
        if (s) downloadSong(s);
      });
    });
  }

  // Setup Audio Event Listeners
  function setupAudioEvents() {
    audio.addEventListener('play', () => setPlayState(true));
    audio.addEventListener('pause', () => setPlayState(false));

    audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        elTotalTime.textContent = formatTime(audio.duration);
      }
    });

    audio.addEventListener('canplay', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        elTotalTime.textContent = formatTime(audio.duration);
      }
    });

    audio.addEventListener('timeupdate', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        elTotalTime.textContent = formatTime(audio.duration);
      }
      elCurrentTime.textContent = formatTime(audio.currentTime);
      if (!isSeeking && Number.isFinite(audio.duration) && audio.duration > 0) {
        elProgressRange.value = (audio.currentTime / audio.duration) * 100 || 0;
      }
      syncLyrics();
      updateTonearmAngle(!audio.paused);
      syncFullLyricsTime();
      pushShellMusicState(false);
    });

    audio.addEventListener('ended', () => {
      if (playMode === 'single') {
        audio.currentTime = 0;
        audio.play().then(() => setPlayState(true)).catch(() => {});
      } else {
        nextSong();
      }
    });

    audio.addEventListener('error', (e) => {
      console.warn('Audio stream error fallback check:', e);
      const curEng = currentSong?.sourceEngine || activeSourceEngine || 'netease';
      if (curEng === 'netease' && streamRetryCount < 1 && currentSong && currentSong.neteaseId) {
        streamRetryCount++;
        audio.crossOrigin = 'anonymous';
        const directOuter = `https://music.163.com/song/media/outer/url?id=${currentSong.neteaseId}.mp3`;
        if (audio.src.includes('/api/music-stream')) {
          audio.src = `/api/music-proxy?url=${encodeURIComponent(directOuter)}`;
        } else {
          audio.src = `/api/music-stream?id=${currentSong.neteaseId}`;
        }
        audio.load();
        audio.play().then(() => setPlayState(true)).catch(() => {
          markSongUnavailable(currentSong, curEng);
          showToast(`⚠️ 《${currentSong?.title || '曲目'}》在当前音源无版权或不可播，已淡化并跳至下一首`);
          setTimeout(nextSong, 800);
        });
      } else {
        if (currentSong) markSongUnavailable(currentSong, curEng);
        showToast(`⚠️ 《${currentSong?.title || '曲目'}》在当前音源无版权或需会员，已淡化并跳至下一首`);
        setTimeout(nextSong, 800);
      }
    });
  }

  // Probe Real Stream Quality (绝不装开高档位：非VIP/无母源时如实显示自动降档后的真实音质)
  async function probeActualStreamQuality(url, requestedQuality, songId, announceDowngrade = false) {
    const seq = ++qualityProbeSeq;
    actualPlayingQuality = null;
    actualQualityDowngraded = false;
    actualQualityReason = '';
    updateQualityUI();
    if (!url || !url.startsWith('/api/')) return;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (seq !== qualityProbeSeq) return;
      if (currentSong && String(currentSong.id) !== String(songId)) return;
      const realQ = res.headers.get('x-actual-quality');
      const downgraded = res.headers.get('x-quality-downgraded') === '1';
      const reason = res.headers.get('x-quality-reason') || '';
      if (realQ && QUALITY_MAP[realQ]) {
        actualPlayingQuality = realQ;
        actualQualityDowngraded = downgraded || (realQ !== requestedQuality);
        actualQualityReason = reason;
        updateQualityUI();
        if (actualQualityDowngraded) {
          const reqLabel = QUALITY_MAP[requestedQuality]?.label || requestedQuality;
          const actInfo = QUALITY_MAP[realQ];
          const reasonHint = reason === 'public-128'
            ? '未登录VIP账号，已自动降档至'
            : `当前账号/曲目暂不支持「${reqLabel}」，已自动降档至`;
          if (announceDowngrade) {
            showToast(`↓ ${reasonHint} ${actInfo.badge}`);
          }
        }
      }
    } catch {}
  }

  // Track songs that have no copyright / cannot be played on a given engine
  const unavailableSongEngines = new Set();
  function isSongUnavailable(song, engine) {
    if (!song) return false;
    return unavailableSongEngines.has(`${engine || activeSourceEngine || 'netease'}:${song.id}`);
  }
  function markSongUnavailable(song, engine) {
    if (!song) return;
    const eng = engine || activeSourceEngine || 'netease';
    unavailableSongEngines.add(`${eng}:${song.id}`);
    const row = elSongList?.querySelector(`.song-row-item[data-id="${CSS.escape(String(song.id))}"]`);
    if (row) {
      row.classList.add('is-unavailable');
      const titleRow = row.querySelector('.song-title-row');
      if (titleRow && !titleRow.querySelector('.song-nocopyright-tag')) {
        const tag = document.createElement('span');
        tag.className = 'song-nocopyright-tag';
        tag.textContent = '无版权';
        titleRow.appendChild(tag);
      }
    }
  }

  // Check whether the active platform has a logged-in VIP/account session
  function isPlatformVipLoggedIn(pKey) {
    const k = pKey || getActivePlatformKey();
    const cfg = privateSourcesConfig || {};
    const plats = cfg.platforms || {};
    if (k === 'netease' || k === 'private') return !!(cfg.ncm?.enabled && cfg.ncm?.cookie);
    if (k === 'qq') return !!(plats.qq?.enabled && plats.qq?.cookie);
    if (k === 'kugou') return !!(plats.kugou?.enabled && (plats.kugou?.cookie || plats.kugou?.token));
    if (k === 'apple') return !!(plats.apple?.enabled && plats.apple?.mediaUserToken);
    if (k === 'migu') return !!(plats.migu?.enabled && plats.migu?.cookie);
    if (k === 'auto') {
      return !!(cfg.ncm?.enabled && cfg.ncm?.cookie)
        || !!(plats.qq?.enabled && plats.qq?.cookie)
        || !!(plats.kugou?.enabled && (plats.kugou?.cookie || plats.kugou?.token))
        || !!(plats.apple?.enabled && plats.apple?.mediaUserToken)
        || !!(plats.migu?.enabled && plats.migu?.cookie);
    }
    return false;
  }

  // Ensure currentQuality respects free vs VIP lock for the active platform
  function enforceFreeQualityIfUnlogged(pKey, notify = false) {
    const k = pKey || getActivePlatformKey();
    if (isPlatformVipLoggedIn(k)) return false;
    const prof = getPlatformQualityProfile(k);
    const tierObj = prof.tiers[currentQuality];
    if (tierObj && tierObj.tier) {
      currentQuality = '320';
      try { localStorage.setItem('shiny.musicQuality', '320'); } catch {}
      if (notify) {
        showToast(`当前平台未登录会员，已自动切换为免费档位「${prof.tiers['320']?.title || '极高 HQ'}」（会员档位已灰显）`);
      }
      return true;
    }
    return false;
  }

  // Dynamically render the active platform's own quality dropdown (网易云 / QQ / 酷狗 / Apple / 咪咕 / 智能)
  let renderedQualityPlatform = '';
  let renderedQualityVipState = null;
  function renderPlatformQualityMenu(force = false) {
    if (!elQualityDropdown && !elLfoQualityDropdown) return;
    const pKey = getActivePlatformKey();
    const hasVip = isPlatformVipLoggedIn(pKey);
    const hasContent = (elQualityDropdown ? elQualityDropdown.querySelector('.quality-opt-item') : true) &&
                       (elLfoQualityDropdown ? elLfoQualityDropdown.querySelector('.quality-opt-item') : true);
    if (!force && renderedQualityPlatform === pKey && renderedQualityVipState === hasVip && hasContent) return;
    renderedQualityPlatform = pKey;
    renderedQualityVipState = hasVip;
    const prof = getPlatformQualityProfile(pKey);
    const entries = Object.entries(prof.tiers);
    const heroes = entries.filter(([, v]) => v.hero);
    const rows = entries.filter(([, v]) => !v.hero);
    const tierBadge = (t, locked) => {
      if (!t) return '<span class="qrm-tier-badge free">免费</span>';
      if (locked) return `<span class="qrm-tier-badge locked">🔒 ${t}</span>`;
      return t === 'SVIP'
        ? '<span class="qrm-tier-badge svip">SVIP</span>'
        : '<span class="qrm-tier-badge vip">VIP</span>';
    };

    const menuHtml = `
      <div class="qrm-head">
        <strong>${prof.brand}</strong>
        <span>${hasVip ? prof.sub : '未登录会员 · 免费音质可选，VIP/SVIP 档位需登录后解锁'}</span>
      </div>
      <div class="qrm-hero-grid">
        ${heroes.map(([k, item]) => {
          const locked = Boolean(item.tier) && !hasVip;
          return `
          <div class="quality-opt-item qrm-hero-card ${locked ? 'is-locked' : ''}" data-quality="${k}" ${locked ? 'aria-disabled="true"' : ''}>
            <div class="qrm-hero-top">
              <span class="qrm-hero-ico">${item.ico}</span>
              ${tierBadge(item.tier, locked)}
            </div>
            <strong>${item.title}</strong>
            <small class="qrm-en">${item.en || ''}</small>
            <span class="qrm-desc">${locked ? '需登录该平台会员账号解锁' : item.desc}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="qrm-list">
        ${rows.map(([k, item]) => {
          const locked = Boolean(item.tier) && !hasVip;
          return `
          <div class="quality-opt-item qrm-row ${locked ? 'is-locked' : ''}" data-quality="${k}" ${locked ? 'aria-disabled="true"' : ''}>
            <span class="qrm-row-ico">${item.ico}</span>
            <div class="qrm-row-body">
              <div class="qrm-row-title">${item.title} ${tierBadge(item.tier, locked)}</div>
              <div class="qrm-row-sub">${locked ? '需登录该平台会员账号解锁' : item.desc}</div>
            </div>
            <span class="qrm-check" aria-hidden="true">${locked ? '🔒' : '✓'}</span>
          </div>`;
        }).join('')}
      </div>
    `;

    [elQualityDropdown, elLfoQualityDropdown].filter(Boolean).forEach(menu => {
      menu.innerHTML = menuHtml;
      menu.querySelectorAll('.quality-opt-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          if (item.classList.contains('is-locked')) {
            const qTitle = getPlatformQualityProfile().tiers[item.dataset.quality]?.title || '会员音质';
            showToast(`🔒「${qTitle}」需登录当前平台会员，免费档位可直接选择`);
            return;
          }
          selectQuality(item.dataset.quality);
        });
      });
    });
  }

  // Update Quality UI (displays active platform's authentic tier names & actual playing tier)
  function updateQualityUI() {
    renderPlatformQualityMenu(false);
    const effectiveKey = (actualPlayingQuality && QUALITY_MAP[actualPlayingQuality])
      ? actualPlayingQuality
      : currentQuality;
    const qInfo = QUALITY_MAP[effectiveKey] || QUALITY_MAP.jymaster;
    const prefInfo = QUALITY_MAP[currentQuality] || qInfo;
    if (elQualityLabel) {
      elQualityLabel.textContent = actualQualityDowngraded ? `${prefInfo.label}` : qInfo.label;
    }
    if (elBtnQuality) {
      elBtnQuality.classList.toggle('is-downgraded', !!actualQualityDowngraded);
      elBtnQuality.title = actualQualityDowngraded
        ? `当前偏好：${prefInfo.badge}（已开启对应平台空间/母带调音，底层流为 ${qInfo.label}）`
        : `当前音质：${qInfo.badge}`;
    }
    if (elHeroQualityTag) {
      elHeroQualityTag.textContent = actualQualityDowngraded
        ? `${prefInfo.badge}`
        : qInfo.badge;
    }
    $$('.quality-opt-item').forEach(item => {
      item.classList.toggle('active', item.dataset.quality === currentQuality);
    });
    // Sync Full-Screen Immersive Lyrics interactive source & quality selects
    const lfoSrcSel = $('#lfoSourceSelect');
    if (lfoSrcSel) {
      const curEng = currentSong?.sourceEngine || activeSourceEngine || 'netease';
      if ([...lfoSrcSel.options].some(o => o.value === curEng)) lfoSrcSel.value = curEng;
    }
    if (elLfoQualityBtnText) {
      const pKey = getActivePlatformKey();
      const tiers = getPlatformQualityProfile(pKey).tiers;
      const curTier = tiers[currentQuality] || tiers.jymaster;
      elLfoQualityBtnText.textContent = `${curTier?.title || curTier?.label || '超清母带'}${curTier?.tier ? ` (${curTier.tier})` : ' (免费)'}`;
    }
    pushShellMusicState(true);
  }

  // Switch Audio Quality (Zero "暂无音源" error + automatic platform spatial/master DSP engagement!)
  function selectQuality(newQuality) {
    if (!QUALITY_MAP[newQuality]) return;
    currentQuality = newQuality;
    actualPlayingQuality = null;
    actualQualityDowngraded = false;
    actualQualityReason = '';
    localStorage.setItem('shiny.musicQuality', newQuality);
    localStorage.setItem('shiny.musicQualityExplicit', '1');
    updateQualityUI();
    if (elQualityDropdown) elQualityDropdown.classList.remove('show');
    if (elLfoQualityDropdown) elLfoQualityDropdown.classList.remove('show');

    const pKey = getActivePlatformKey();
    window.dispatchEvent(new CustomEvent('shiny-quality-changed', { detail: { quality: newQuality, platform: pKey } }));

    if (currentSong) {
      const prevSrc = audio.currentSrc || audio.src || '';
      const prevTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const wasPlaying = !audio.paused;
      const nextUrl = resolveAudioUrl(currentSong, newQuality);
      const hasReadyBuffer = prevSrc && audio.readyState >= 2 && !audio.error;

      // Only reload stream when user has a VIP/private source that returns distinct higher-bitrate files,
      // or when no audio stream is loaded yet. On public streams, keep current buffer seamless while engaging DSP!
      if (hasEnabledPrivateSource() || !hasReadyBuffer) {
        streamRetryCount = 0;
        const onMeta = () => {
          if (prevTime > 0.3 && Number.isFinite(audio.duration) && prevTime < audio.duration - 0.5) {
            try { audio.currentTime = prevTime; } catch {}
          }
        };
        audio.addEventListener('loadedmetadata', onMeta, { once: true });
        audio.src = nextUrl;
        audio.load();
        if (wasPlaying) {
          audio.play().then(() => setPlayState(true)).catch(() => {});
        }
      }
      probeActualStreamQuality(nextUrl, newQuality, currentSong.id, false);
    }
    showToast(`已切换音质：${QUALITY_MAP[newQuality].badge}`);
  }

  // Switch Current Playing Song Source on the fly (网易云 / QQ音乐 / 酷狗 / 苹果 / 咪咕 / 自建 / 智能)
  async function switchCurrentSongSource(engine) {
    if (engine === 'kuwo' || engine === 'lx') engine = 'netease';
    localStorage.setItem('shiny.activeSourceEngine', engine);
    activeSourceEngine = engine;
    if (currentSong) currentSong.sourceEngine = engine;

    const engineLabels = {
      private: '🎵 我的网易云',
      netease: '🎵 网易云',
      qq: '🐧 QQ音乐',
      kugou: '🐶 酷狗音乐',
      apple: ' Apple Music',
      migu: '📱 咪咕音乐',
      auto: '🌟 全网智能'
    };
    if (elSourceLabel) {
      elSourceLabel.textContent = engineLabels[engine] || '🎵 网易云';
    }

    // Sync header sound engine pill states & bottom source dropdown
    $$('.sound-engine-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.engine === engine);
    });
    $$('.source-opt-item').forEach(item => {
      item.classList.toggle('active', item.dataset.engine === engine);
    });

    // Sync ALL song rows below to match the selected top platform immediately!
    const shortMap = {
      netease: '🎵 网易',
      qq: '🐧 QQ',
      kugou: '🐶 酷狗',
      apple: ' 苹果',
      migu: '📱 咪咕',
      private: '🎵 自建',
      auto: '🌟 智能'
    };
    const shortLabel = shortMap[engine] || '🎵 网易';
    for (const s of currentPlaylist || []) {
      if (s && !s.isVoice) { s.sourceEngine = engine; delete s._pinnedEngine; }
    }
    for (const s of catalogData?.songs || []) {
      if (s && !s.isVoice) { s.sourceEngine = engine; delete s._pinnedEngine; }
    }
    if (franchiseCatalogs) {
      for (const k of Object.keys(franchiseCatalogs)) {
        for (const s of franchiseCatalogs[k]?.songs || []) {
          if (s && !s.isVoice) { s.sourceEngine = engine; delete s._pinnedEngine; }
        }
      }
    }
    $$('.row-source-badge').forEach(badge => {
      if (badge.textContent.includes('声音')) return;
      badge.dataset.engine = engine;
      badge.textContent = shortLabel;
      badge.title = `当前音源: ${shortLabel} (点击切换音源)`;
    });

    // Re-evaluate dimmed no-copyright state for the newly selected platform
    $$('.song-row-item').forEach(row => {
      const sid = row.dataset.id;
      const unavail = unavailableSongEngines.has(`${engine}:${sid}`);
      row.classList.toggle('is-unavailable', unavail);
      const existingTag = row.querySelector('.song-nocopyright-tag');
      if (unavail && !existingTag) {
        const tr = row.querySelector('.song-title-row');
        if (tr) {
          const tag = document.createElement('span');
          tag.className = 'song-nocopyright-tag';
          tag.textContent = '无版权';
          tr.appendChild(tag);
        }
      } else if (!unavail && existingTag) {
        existingTag.remove();
      }
    });

    // Load per-platform saved default quality if configured, then enforce free quality if unlogged
    const pKey = getActivePlatformKey(engine);
    try {
      const savedPlatQ = localStorage.getItem(`shiny.defaultQuality.${pKey}`);
      if (savedPlatQ && getPlatformQualityProfile(pKey).tiers[savedPlatQ]) {
        currentQuality = savedPlatQ;
        localStorage.setItem('shiny.musicQuality', savedPlatQ);
      }
    } catch {}
    const downgradedToFree = enforceFreeQualityIfUnlogged(pKey, false);

    // Switch quality dropdown & Sound FX Studio to match this platform!
    renderPlatformQualityMenu(true);
    updateQualityUI();
    window.dispatchEvent(new CustomEvent('shiny-platform-changed', { detail: { platform: pKey, engine } }));

    // If user is currently viewing 账号歌单 or 收藏, immediately switch to the NEW platform's playlists/favorites!
    if (activeTab === 'account') renderAccountPlaylistsView();
    else if (activeTab === 'fav') applyFilters();

    const vipNote = downgradedToFree
      ? '（未登录会员，已切为免费音质，会员档位已灰显）'
      : (!isPlatformVipLoggedIn(getActivePlatformKey(engine)) ? '（未登录会员，仅免费音质可选）' : '（专属音质与调音台已同步）');

    if (!currentSong) {
      showToast(`已切换音源至：${engineLabels[engine] || engine}${vipNote}`);
      return;
    }

    // If switching to QQ and we don't have qqMid, search for it
    if (engine === 'qq' && !currentSong.qqMid) {
      showToast(`🔍 正在连接 QQ 音乐高品质音源库...`);
      try {
        const searchQ = (currentSong.title || '') + ' ' + (currentSong.vocalists || currentSong.unitName || '');
        const res = await fetch(`/api/qq-search?query=${encodeURIComponent(searchQ)}`);
        const hits = await res.json();
        if (hits && hits.length > 0) {
          currentSong.qqMid = hits[0].qqMid;
          showToast(`✓ 已匹配 QQ 音乐音源！`);
        }
      } catch (e) {
        console.warn('QQ match note:', e);
      }
    }

    const curTime = audio.currentTime || 0;
    const isPlaying = !audio.paused;
    const newUrl = resolveAudioUrl(currentSong, currentQuality, engine);
    audio.addEventListener('loadedmetadata', () => {
      if (curTime > 0.3 && Number.isFinite(audio.duration) && curTime < audio.duration - 0.5) {
        try { audio.currentTime = curTime; } catch {}
      }
    }, { once: true });
    audio.src = newUrl;
    audio.load();
    if (isPlaying) {
      audio.play().catch(() => {});
    }
    showToast(`音源已切换至：${engineLabels[engine] || engine}${vipNote}`);
    pushShellMusicState(true);
  }

  // Refresh quality VIP locks & cloud account playlists immediately when user logs in or out
  $('#lfoSourceSelect')?.addEventListener('change', (e) => {
    const eng = e.target.value;
    if (eng) switchCurrentSongSource(eng);
  });
  window.addEventListener('shiny-auth-changed', (e) => {
    if (e?.detail) privateSourcesConfig = e.detail;
    enforceFreeQualityIfUnlogged(getActivePlatformKey(), false);
    renderPlatformQualityMenu(true);
    updateQualityUI();
    ncmAccountCache.likedSongs = [];
    loadNcmAccountData(true).then(() => {
      if (activeTab === 'account') renderAccountPlaylistsView();
      else if (activeTab === 'fav') applyFilters();
    });
  });
  // Load account liked IDs in background on startup if already logged in
  setTimeout(() => { loadNcmAccountData(false); }, 1200);

  // Unified Multi-Source Search (网易云 + QQ音乐 + 酷我音乐 + 咪咕音乐 + 洛雪)
  let searchDebounceTimer = null;
  async function performUnifiedSearch(query) {
    if (!query) {
      applyFilters();
      return;
    }
    const q = query.trim();
    if (!q) {
      applyFilters();
      return;
    }

    const qLower = q.toLowerCase();
    const localHits = (catalogData.songs || []).filter(s =>
      (s.title && s.title.toLowerCase().includes(qLower)) ||
      (s.titleZh && s.titleZh.toLowerCase().includes(qLower)) ||
      (s.unitName && s.unitName.toLowerCase().includes(qLower)) ||
      (s.vocalists && s.vocalists.toLowerCase().includes(qLower))
    ).map(s => ({ ...s, source: 'netease', sourceName: '🎵 网易云' }));

    if (franchiseCatalogs) {
      for (const k of Object.keys(franchiseCatalogs)) {
        if (k === activeFranchise) continue;
        const otherSongs = franchiseCatalogs[k]?.songs || [];
        for (const os of otherSongs) {
          if (localHits.some(h => h.id === os.id)) continue;
          if (
            (os.title && os.title.toLowerCase().includes(qLower)) ||
            (os.titleZh && os.titleZh.toLowerCase().includes(qLower)) ||
            (os.vocalists && os.vocalists.toLowerCase().includes(qLower))
          ) {
            localHits.push({ ...os, source: 'netease', sourceName: '🎵 网易云' });
          }
        }
      }
    }

    currentPlaylist = localHits;
    renderSongList(localHits);

    // Query All-Source Aggregator API asynchronously (网易云 + QQ + 酷我 + 咪咕)
    try {
      const multiRes = await fetch(`/api/music-search-all?query=${encodeURIComponent(q)}`);
      if (multiRes.ok) {
        const multiHits = await multiRes.json();
        const formatted = (multiHits || []).map(item => ({
          id: item.id,
          neteaseId: item.neteaseId,
          qqMid: item.qqMid,
          kuwoId: item.kuwoId,
          miguId: item.miguId,
          title: item.title,
          titleZh: '',
          cleanTitle: item.title,
          unitName: item.artist,
          type: 'unit',
          idols: ['all'],
          vocalists: item.artist,
          duration: item.duration,
          album: item.album,
          cover: item.cover,
          color: item.source === 'qq' ? '#3388ff' : (item.source === 'kuwo' ? '#10b981' : (item.source === 'migu' ? '#f59e0b' : '#ff4e78')),
          source: item.source,
          sourceName: item.sourceName,
          sourceEngine: item.sourceEngine || item.source,
          isVoice: !!item.isVoice,
          audioUrl: item.audioUrl
        }));

        const merged = [...localHits];
        for (const f of formatted) {
          const existing = merged.find(m => normalizeSongKey(m.title) === normalizeSongKey(f.title) && Boolean(m.isVoice) === Boolean(f.isVoice));
          if (existing) {
            if (f.qqMid && !existing.qqMid) existing.qqMid = f.qqMid;
            if (f.kuwoId && !existing.kuwoId) existing.kuwoId = f.kuwoId;
            if (f.neteaseId && !existing.neteaseId) existing.neteaseId = f.neteaseId;
            if (f.cover && f.cover !== '/app-icon.png' && (!existing.cover || existing.cover === '/app-icon.png')) existing.cover = f.cover;
          } else {
            merged.push(f);
          }
        }
        // Rank exact / high-relevance title matches (including NetEase 声音 tracks!) right to the top
        const qNorm = normalizeSongKey(q);
        const qLow = q.toLowerCase();
        const rankScore = (s) => {
          const tLow = String(s.title || '').toLowerCase();
          const tNorm = normalizeSongKey(s.title || '');
          if (tLow === qLow || (qNorm && tNorm === qNorm)) return 100;
          if (tLow.startsWith(qLow) || (qNorm && tNorm.startsWith(qNorm))) return 80;
          if (tLow.includes(qLow) || (qNorm && tNorm.includes(qNorm))) return 60;
          return 10;
        };
        merged.sort((a, b) => rankScore(b) - rankScore(a));
        currentPlaylist = merged;
        renderSongList(merged);
      }
    } catch (e) {
      console.warn('Multi-source search note:', e);
    }
  }

  // Helper: Trigger File Download
  function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  }

  /* ── Music Download Manager (Real-Time Byte Progress + Format Verification + .lrc) ── */
  let dlPollTimer = 0;
  let dlJobsCache = [];
  let dlRetrySongs = new Map();

  function fmtBytes(n) {
    const v = Number(n || 0);
    if (v >= 1024 * 1024) return `${(v / (1024 * 1024)).toFixed(2)} MB`;
    if (v >= 1024) return `${(v / 1024).toFixed(0)} KB`;
    return `${v} B`;
  }

  function renderDownloadManager(jobs, downloadDir = '') {
    dlJobsCache = Array.isArray(jobs) ? jobs : [];
    const active = dlJobsCache.filter(j => j.status === 'downloading' || j.status === 'queued');
    const badge = $('#dlBadgeCount');
    if (badge) {
      badge.hidden = active.length === 0 && dlJobsCache.length === 0;
      badge.textContent = active.length > 0 ? String(active.length) : String(dlJobsCache.length);
      badge.classList.toggle('is-active', active.length > 0);
    }

    const fp = $('#dlFloatingPill');
    const fpText = $('#dlFloatingText');
    const fpFill = $('#dlFloatingBarFill');
    if (fp) {
      if (active.length > 0) {
        const avgPct = Math.round(active.reduce((s, j) => s + Number(j.percent || 0), 0) / active.length);
        fp.hidden = false;
        if (fpText) fpText.textContent = active.length === 1
          ? `下载中《${active[0].title}》 ${avgPct}%`
          : `正在下载 ${active.length} 首 · ${avgPct}%`;
        if (fpFill) fpFill.style.width = `${avgPct}%`;
      } else {
        fp.hidden = true;
      }
    }

    const sub = $('#dlMgrSub');
    if (sub && downloadDir) {
      sub.textContent = `保存目录：${downloadDir}（自动校验真实音频格式 + 同步 .lrc 歌词）`;
    }

    const listEl = $('#dlMgrList');
    if (!listEl) return;
    if (!dlJobsCache.length) {
      listEl.innerHTML = '<div class="dl-mgr-empty">暂无下载记录，点击歌曲右侧下载按钮即可开始下载并查看实时进度</div>';
      return;
    }

    const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    listEl.innerHTML = dlJobsCache.map(j => {
      const pct = Math.max(0, Math.min(100, Number(j.percent || 0)));
      const qLabel = QUALITY_MAP[j.actualQuality]?.label || QUALITY_MAP[j.requestedQuality]?.label || '';
      const fmtTag = j.actualFormat || (j.ext ? j.ext.toUpperCase() : (qLabel || '音频'));
      const speedTxt = j.status === 'downloading' && j.speedBps > 0 ? ` · ${fmtBytes(j.speedBps)}/s` : '';
      const sizeTxt = j.totalBytes > 0
        ? `${fmtBytes(j.downloadedBytes)} / ${fmtBytes(j.totalBytes)}`
        : (j.downloadedBytes > 0 ? fmtBytes(j.downloadedBytes) : '准备连接…');
      const statusTxt = j.status === 'done'
        ? `✓ 已保存${j.hasLyrics ? ' + LRC' : ''}`
        : j.status === 'error'
          ? `✕ ${j.error || '下载失败'}`
          : `${pct}%${speedTxt}`;

      return `
        <div class="dl-job-card is-${j.status}">
          <img class="dl-job-cover" src="${esc(j.cover || '/app-icon.png')}" referrerpolicy="no-referrer" alt="" onerror="this.src='/app-icon.png'">
          <div class="dl-job-main">
            <div class="dl-job-top">
              <strong class="dl-job-title">${esc(j.title)}</strong>
              <span class="dl-job-tag">${esc(fmtTag)}${j.downgraded ? ' · 自动降档' : ''}</span>
            </div>
            <div class="dl-job-sub">${esc(j.artist)} · ${sizeTxt}</div>
            <div class="dl-progress-track">
              <div class="dl-progress-fill" style="width:${pct}%"></div>
            </div>
            <div class="dl-job-foot">
              <span class="dl-job-status">${esc(statusTxt)}</span>
              ${j.status === 'error' ? `<button type="button" class="dl-retry-btn" data-dl-retry="${esc(j.id)}">重试</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-dl-retry]').forEach(btn => {
      btn.addEventListener('click', () => {
        const song = dlRetrySongs.get(btn.dataset.dlRetry);
        if (song) downloadSong(song);
      });
    });
  }

  async function pollDownloadJobs() {
    try {
      const r = await fetch('/api/music-download/jobs');
      if (!r.ok) return;
      const j = await r.json();
      if (j.ok) {
        renderDownloadManager(j.jobs, j.downloadDir);
        const hasActive = (j.jobs || []).some(x => x.status === 'downloading' || x.status === 'queued');
        if (hasActive && !dlPollTimer) {
          dlPollTimer = setInterval(pollDownloadJobs, 650);
        } else if (!hasActive && dlPollTimer) {
          clearInterval(dlPollTimer);
          dlPollTimer = 0;
        }
      }
    } catch {}
  }

  function openDownloadManager() {
    pollDownloadJobs();
    $('#downloadManagerDialog')?.showModal();
  }

  function initDownloadManagerUI() {
    const dlg = $('#downloadManagerDialog');
    $('#btnOpenDownloads')?.addEventListener('click', openDownloadManager);
    $('#dlFloatingPill')?.addEventListener('click', openDownloadManager);
    $('#btnCloseDownloadMgr')?.addEventListener('click', () => dlg?.close());
    dlg?.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $('#btnDlClearDone')?.addEventListener('click', async () => {
      try {
        const r = await fetch('/api/music-download/clear', { method: 'POST' });
        const j = await r.json();
        if (j.ok) renderDownloadManager(j.jobs);
      } catch {}
    });
    $('#btnDlOpenFolder')?.addEventListener('click', async () => {
      try {
        await fetch('/api/music-download/open-folder', { method: 'POST' });
      } catch {}
    });
    pollDownloadJobs();
  }

  // Download Single Song with Real-Time Progress Bar & Magic-Byte Format Verification
  async function downloadSong(song) {
    if (!song) return;
    const url = resolveAudioUrl(song, currentQuality);
    const lrcText = (song.id && lyricsCache[song.id]) ? lyricsCache[song.id] : '';
    try {
      const res = await fetch('/api/music-download/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          title: song.title || 'song',
          artist: songArtistDisplay(song) || 'artist',
          album: song.album || '',
          cover: song.cover || '/app-icon.png',
          quality: currentQuality,
          lyrics: typeof lrcText === 'string' ? lrcText : ''
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.job) {
          dlRetrySongs.set(json.job.id, song);
          showToast(`⬇ 已加入下载队列《${song.title}》，点击右下角或「下载管理」查看进度`);
          pollDownloadJobs();
          if (!dlPollTimer) dlPollTimer = setInterval(pollDownloadJobs, 650);
          return;
        }
      }
    } catch (e) {
      console.warn('Download manager start failed, falling back:', e);
    }

    const safeTitle = (song.title || 'song').replace(/[\\/:*?"<>|]/g, '_');
    const safeArtist = (songArtistDisplay(song) || 'artist').replace(/[\\/:*?"<>|]/g, '_');
    triggerDownload(url, `${safeTitle} - ${safeArtist}.mp3`);
  }

  // One-Click Download All in Current Playlist
  async function downloadBatchMusic() {
    if (!currentPlaylist.length) {
      showToast('当前列表暂无曲目可供下载');
      return;
    }
    const count = currentPlaylist.length;
    const ok = confirm(`确认一键下载当前列表全部 ${count} 首曲目吗？`);
    if (!ok) return;

    openDownloadManager();
    showToast(`⬇ 正在将 ${count} 首曲目加入下载管理…`);
    for (let i = 0; i < count; i++) {
      await downloadSong(currentPlaylist[i]);
      await new Promise(r => setTimeout(r, 260));
    }
  }

  // Set Song as Main Home Lobby BGM
  function setAsHomeBgm(song) {
    if (!song) return;
    const bgmItem = {
      id: song.id,
      title: song.title,
      titleZh: song.titleZh || song.title,
      artist: songArtistDisplay(song),
      audioUrl: resolveAudioUrl(song, currentQuality),
      cover: song.cover,
      neteaseId: song.neteaseId
    };

    localStorage.setItem('shiny.customHomeBgm', JSON.stringify(bgmItem));

    try {
      const cur = JSON.parse(localStorage.getItem('homeMusic') || '{}');
      cur.enabled = true;
      localStorage.setItem('homeMusic', JSON.stringify(cur));
    } catch {}

    window.dispatchEvent(new CustomEvent('set-home-bgm', { detail: bgmItem }));
    showToast(`🏠 已将《${song.title}》设为事务所主界面背景音乐！回到主界面即可聆听。`);
  }

  // Helper: Fetch via Server Proxy
  async function fetchProxy(url) {
    try {
      const pUrl = `/api/music-proxy?url=${encodeURIComponent(url)}`;
      const res = await fetch(pUrl);
      if (res.ok) return await res.json();
    } catch {}
    const res = await fetch(url);
    return await res.json();
  }

  // Map NetEase Track
  function mapNetEaseTrackToSong(t) {
    const rawArtists = t.ar || t.artists || [];
    const artists = rawArtists.map(a => a.name).filter(Boolean).join('・') || t.artist?.name || 'THE IDOLM@STER';
    const title = t.name;
    const titleZh = (t.alia && t.alia[0]) || (t.tns && t.tns[0]) || (t.transNames && t.transNames[0]) || '';
    const alObj = t.al || t.album || {};
    const album = alObj.name || 'THE IDOLM@STER Collection';
    let pic = alObj.picUrl || alObj.blurPicUrl || t.picUrl || '';
    if (pic) pic = pic.replace('http://', 'https://') + '?param=400y400';
    const cover = pic || '/images/franchise-logos/logo-sc.png';

    let unitName = artists.split('・')[0] || 'THE IDOLM@STER';
    let unitKey = 'all';
    let type = 'unit';
    let idols = ['all'];

    const combo = `${title} ${artists} ${album}`.toLowerCase();
    if (combo.includes('alstroemeria') || combo.includes('大崎') || combo.includes('千雪')) {
      unitName = 'ALSTROEMERIA';
      unitKey = 'alstroemeria';
      idols = ['014', '015', '016'];
    } else if (combo.includes("l'antica") || combo.includes('lantica') || combo.includes('恋钟') || combo.includes('咲耶') || combo.includes('摩美美')) {
      unitName = "L'Antica";
      unitKey = 'lantica';
      idols = ['004', '005', '006', '007', '008'];
    } else if (combo.includes('illumination') || combo.includes('真乃') || combo.includes('灯织') || combo.includes('巡')) {
      unitName = 'illumination STARS';
      unitKey = 'illumination';
      idols = ['001', '002', '003'];
    } else if (combo.includes('climax') || combo.includes('放课后') || combo.includes('果穗') || combo.includes('智代子') || combo.includes('凛世')) {
      unitName = '放课后CLIMAX GIRLS';
      unitKey = 'climax';
      idols = ['009', '010', '011', '012', '013'];
    } else if (combo.includes('straylight') || combo.includes('朝日') || combo.includes('冬优子') || combo.includes('爱依')) {
      unitName = 'Straylight';
      unitKey = 'straylight';
      idols = ['017', '018', '019'];
    } else if (combo.includes('noctchill') || combo.includes('浅仓透') || combo.includes('圆香') || combo.includes('小糸') || combo.includes('雏菜')) {
      unitName = 'noctchill';
      unitKey = 'noctchill';
      idols = ['020', '021', '022', '023'];
    } else if (combo.includes('shhis') || combo.includes('日花') || combo.includes('美琴')) {
      unitName = 'SHHis';
      unitKey = 'shhis';
      idols = ['024', '025'];
    } else if (combo.includes('cometik') || combo.includes('路加') || combo.includes('羽那') || combo.includes('阳葵')) {
      unitName = 'CoMETIK';
      unitKey = 'cometik';
      idols = ['026', '027', '028'];
    }

    if (t.ar && t.ar.length === 1 && !t.ar[0].name.includes('・')) {
      type = 'solo';
    }

    return {
      id: 's_wy_' + t.id,
      neteaseId: t.id,
      title: title,
      titleZh: titleZh,
      cleanTitle: title,
      unit: unitKey,
      unitKey: unitKey,
      unitName: unitName,
      type: type,
      idols: idols,
      vocalists: artists,
      duration: Math.round((t.dt || 180000) / 1000),
      album: album,
      cover: cover,
      color: '#ff4e78'
    };
  }

  // Import NetEase Playlist Action
  async function handleImportPlaylist(playlistRaw) {
    const match = String(playlistRaw).match(/\d+/);
    if (!match) {
      alert('请输入有效的网易云歌单 ID 或链接');
      return;
    }
    const playlistId = match[0];
    elBtnFetchPlaylist.disabled = true;
    elBtnFetchPlaylist.textContent = '正在获取歌单…';

    try {
      const detailUrl = `https://music.163.com/api/v6/playlist/detail?id=${playlistId}`;
      const data = await fetchProxy(detailUrl);

      if (!data || !data.playlist) {
        throw new Error('歌单获取失败，请检查歌单ID或网络连接');
      }

      const pl = data.playlist;
      const author = pl.creator?.nickname || '网络歌单';
      if (elPlaylistSourceAuthor) elPlaylistSourceAuthor.textContent = author;

      let rawTracks = pl.tracks || [];

      if (pl.trackIds && pl.trackIds.length > rawTracks.length) {
        elBtnFetchPlaylist.textContent = `解析中 (共 ${pl.trackIds.length} 首)…`;
        const allIds = pl.trackIds.map(t => t.id);
        const batchSize = 100;
        const fetchedTracks = [];

        for (let i = 0; i < allIds.length; i += batchSize) {
          const slice = allIds.slice(i, i + batchSize);
          const songDetailUrl = `https://music.163.com/api/song/detail?ids=[${slice.join(',')}]`;
          try {
            const songsRes = await fetchProxy(songDetailUrl);
            if (songsRes && songsRes.songs) {
              fetchedTracks.push(...songsRes.songs);
            }
          } catch (err) {
            console.warn('Batch song detail fetch error:', err);
          }
        }

        if (fetchedTracks.length) {
          rawTracks = fetchedTracks;
        }
      }

      const newSongs = rawTracks.map(mapNetEaseTrackToSong);
      catalogData.songs = newSongs;
      catalogData.playlistTitle = pl.name;
      catalogData.author = author;

      localStorage.setItem('shiny.importedCatalog', JSON.stringify({
        songs: newSongs,
        title: pl.name,
        author: author,
        id: playlistId
      }));

      elCountSongs.textContent = newSongs.length;
      applyFilters();
      if (newSongs.length) {
        playSong(newSongs[0], true);
      }

      if (elSourceDialog) elSourceDialog.close();
      showToast(`成功导入「${pl.name}」共 ${newSongs.length} 首！`);
    } catch (err) {
      console.error('Import NetEase playlist error:', err);
      alert('导入失败：' + err.message);
    } finally {
      elBtnFetchPlaylist.disabled = false;
      elBtnFetchPlaylist.textContent = '抓取导入';
    }
  }



  // Automatic Check for Playlist Updates across all 5 franchises
  const FRANCHISE_PLAYLIST_MAP = {
    sc: { id: '8896865808', name: '闪耀色彩 283PRO', author: '宫水三也' },
    gakuen: { id: '10062750532', name: '学园偶像大师', author: '宫水三也' },
    cg: { id: '8880948241', name: '灰姑娘女孩 346PRO', author: '宫水三也' },
    ml: { id: '8304717282', name: '百万现场 765THEATER', author: '宫水三也' },
    as: { id: '7538637874', name: '765PRO本家 ALLSTARS', author: '宫水三也' }
  };

  async function checkMusicUpdates(manual = true) {
    const target = FRANCHISE_PLAYLIST_MAP[activeFranchise] || FRANCHISE_PLAYLIST_MAP.sc;
    if (manual) showToast(`🔍 正在检测【${target.name}】公开歌单最新曲目...`);
    try {
      const detailUrl = `https://music.163.com/api/v6/playlist/detail?id=${target.id}`;
      const data = await fetchProxy(detailUrl);
      if (data && data.playlist && data.playlist.trackIds) {
        const onlineCount = data.playlist.trackIds.length;
        const currentCount = catalogData?.songs?.length || 0;
        if (onlineCount > currentCount) {
          const diff = onlineCount - currentCount;
          showToast(`✨ 检测到【${target.name}】歌单新增 ${diff} 首曲目！正在自动同步收录...`);
          await handleImportPlaylist(target.id);
        } else if (manual) {
          showToast(`✓ 【${target.name}】歌单已是最新版本 (共 ${currentCount} 首，整理者: ${target.author})`);
        }
      }
    } catch (e) {
      if (manual) showToast(`网络连接检查超时，保持本地离线曲目库 (${target.name})`);
    }
  }

  // ── Custom User Playlists (自建歌单系统) ──
  let selectedCustomPlaylistId = null;
  let pendingAddToPlaylistSong = null;

  function getUserPlaylists() {
    try {
      const data = localStorage.getItem('shiny.userPlaylists');
      if (data) {
        const list = JSON.parse(data);
        if (Array.isArray(list) && list.length > 0) return list;
      }
    } catch {}
    const defaultPlaylists = [
      {
        id: 'playlist_default',
        name: '我的自建精选',
        desc: '默认自建歌曲收藏单',
        createdAt: Date.now(),
        cover: '/app-icon.png',
        songs: []
      }
    ];
    localStorage.setItem('shiny.userPlaylists', JSON.stringify(defaultPlaylists));
    return defaultPlaylists;
  }

  function saveUserPlaylists(list) {
    localStorage.setItem('shiny.userPlaylists', JSON.stringify(list));
  }

  function createCustomPlaylist(name, desc = '') {
    const list = getUserPlaylists();
    const newPl = {
      id: 'playlist_' + Date.now(),
      name: name.trim() || `自建歌单 ${list.length + 1}`,
      desc: desc.trim(),
      createdAt: Date.now(),
      cover: '/app-icon.png',
      songs: []
    };
    list.unshift(newPl);
    saveUserPlaylists(list);
    showToast(`✨ 歌单「${newPl.name}」创建成功！`);
    return newPl;
  }

  function deleteCustomPlaylist(playlistId) {
    let list = getUserPlaylists();
    const target = list.find(p => p.id === playlistId);
    if (!target) return;
    if (!confirm(`确定要删除歌单「${target.name}」吗？`)) return;
    list = list.filter(p => p.id !== playlistId);
    if (!list.length) {
      list = [
        {
          id: 'playlist_default',
          name: '我的自建精选',
          desc: '默认自建歌曲收藏单',
          createdAt: Date.now(),
          cover: '/app-icon.png',
          songs: []
        }
      ];
    }
    saveUserPlaylists(list);
    showToast(`已删除歌单「${target.name}」`);
    selectedCustomPlaylistId = null;
    if (activeTab === 'custom') renderCustomPlaylistsView();
  }

  function addSongToCustomPlaylist(playlistId, song) {
    const list = getUserPlaylists();
    const pl = list.find(p => p.id === playlistId);
    if (!pl) return;
    if (!pl.songs) pl.songs = [];
    if (pl.songs.some(s => s.id === song.id || (s.title === song.title && s.artist === (song.artist || song.vocalists)))) {
      showToast(`《${song.title}》已在「${pl.name}」中了`);
      return;
    }
    pl.songs.push(song);
    if (!pl.cover || pl.cover === '/app-icon.png') {
      pl.cover = song.cover || '/app-icon.png';
    }
    saveUserPlaylists(list);
    showToast(`✨ 已将《${song.title}》加入「${pl.name}」！`);
  }

  function removeSongFromCustomPlaylist(playlistId, songId) {
    const list = getUserPlaylists();
    const pl = list.find(p => p.id === playlistId);
    if (!pl || !pl.songs) return;
    pl.songs = pl.songs.filter(s => String(s.id) !== String(songId));
    saveUserPlaylists(list);
    showToast(`已从歌单移除`);
    if (activeTab === 'custom') renderCustomPlaylistsView();
  }

  function openAddToPlaylistDialog(song) {
    pendingAddToPlaylistSong = song;
    const dlg = $('#dialogAddToPlaylist');
    const label = $('#addToPlaylistSongName');
    const listEl = $('#customPlaylistPickerList');
    if (!dlg || !listEl) return;

    if (label) {
      label.textContent = `将《${song.title}》添加到：`;
    }

    const playlists = getUserPlaylists();
    listEl.innerHTML = playlists.map(p => `
      <div class="custom-playlist-picker-item" data-playlist-id="${p.id}">
        <div class="custom-playlist-picker-left">
          <span style="font-size:18px;">📁</span>
          <div>
            <div class="custom-playlist-picker-name">${p.name}</div>
            <div class="custom-playlist-picker-count">${(p.songs || []).length} 首歌曲 · ${p.desc || '自建精选'}</div>
          </div>
        </div>
        <button class="custom-playlist-picker-btn">加入</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.custom-playlist-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const plId = item.dataset.playlistId;
        addSongToCustomPlaylist(plId, pendingAddToPlaylistSong);
        dlg.close();
      });
    });

    dlg.showModal();
  }

  function renderCustomPlaylistsView() {
    const playlists = getUserPlaylists();

    // If viewing a specific custom playlist:
    if (selectedCustomPlaylistId) {
      const pl = playlists.find(p => p.id === selectedCustomPlaylistId);
      if (!pl) {
        selectedCustomPlaylistId = null;
        renderCustomPlaylistsView();
        return;
      }

      currentPlaylist = pl.songs || [];
      if (!currentPlaylist.length) {
        elSongList.innerHTML = `
          <div style="padding:16px 8px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <button class="custom-playlist-act-btn" id="btnBackToAllPlaylists" style="padding:6px 14px;font-size:12px;font-weight:700;border-radius:999px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.1);">← 返回所有自建歌单</button>
              <span style="font-size:14px;font-weight:750;color:#1e293b;">📁 ${pl.name} (0首)</span>
            </div>
            <div style="text-align:center;padding:60px 20px;color:var(--music-text-muted);">
              <p style="font-size:28px;margin:0 0 8px;">📁</p>
              <p style="font-size:14px;font-weight:600;">歌单内暂无曲目</p>
              <small>在全部歌曲、偶像专区或搜索列表中点击歌曲右侧的「➕」按钮即可加入此歌单</small>
            </div>
          </div>
        `;
        $('#btnBackToAllPlaylists')?.addEventListener('click', () => {
          selectedCustomPlaylistId = null;
          renderCustomPlaylistsView();
        });
        return;
      }

      // Render songs in this custom playlist with remove button
      elSongList.innerHTML = `
        <div style="padding:10px 8px 6px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <button class="custom-playlist-act-btn" id="btnBackToAllPlaylists" style="padding:6px 14px;font-size:12px;font-weight:700;border-radius:999px;background:#ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.1);">← 返回所有歌单</button>
              <span style="font-size:14px;font-weight:750;color:#1e293b;">📁 ${pl.name}</span>
              <span style="font-size:12px;color:#64748b;">(共 ${pl.songs.length} 首)</span>
            </div>
            <button class="btn-new-playlist" id="btnPlayAllCustomPlaylist" style="padding:6px 16px;font-size:12px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              播放全部
            </button>
          </div>
        </div>
      `;

      renderSongList(pl.songs);
      $('#btnBackToAllPlaylists')?.addEventListener('click', () => {
        selectedCustomPlaylistId = null;
        renderCustomPlaylistsView();
      });
      $('#btnPlayAllCustomPlaylist')?.addEventListener('click', () => {
        if (pl.songs.length) {
          currentPlaylist = pl.songs;
          currentIndex = 0;
          playSong(pl.songs[0], true);
        }
      });
      return;
    }

    // Otherwise render the grid of all custom playlists
    elSongList.innerHTML = `
      <div class="custom-playlists-container">
        <div class="custom-playlists-header">
          <div class="custom-playlists-title-box">
            <span class="custom-playlists-title">📁 我的自建歌单</span>
            <span style="font-size:12px;color:#64748b;">(${playlists.length} 个歌单)</span>
          </div>
          <button class="btn-new-playlist" id="btnOpenNewPlaylistDialog">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            新建歌单
          </button>
        </div>

        <div class="custom-playlists-grid">
          ${playlists.map(p => `
            <div class="custom-playlist-card" data-playlist-id="${p.id}">
              <img class="custom-playlist-cover" src="${p.cover || '/app-icon.png'}" alt="${p.name}" onerror="this.onerror=null;this.src='/app-icon.png'">
              <div class="custom-playlist-meta">
                <span class="custom-playlist-name">${p.name}</span>
                <span class="custom-playlist-info">${(p.songs || []).length} 首曲目 · ${p.desc || '自建精选'}</span>
              </div>
              <div class="custom-playlist-actions">
                <button class="custom-playlist-act-btn play-pl-btn" data-playlist-id="${p.id}" title="播放此歌单">▶</button>
                <button class="custom-playlist-act-btn delete delete-pl-btn" data-playlist-id="${p.id}" title="删除歌单">🗑️</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    $('#btnOpenNewPlaylistDialog')?.addEventListener('click', () => {
      const dlg = $('#dialogNewPlaylist');
      if (dlg) dlg.showModal();
    });

    $$('.custom-playlist-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.custom-playlist-actions')) return;
        const plId = card.dataset.playlistId;
        selectedCustomPlaylistId = plId;
        renderCustomPlaylistsView();
      });
    });

    $$('.play-pl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pl = playlists.find(p => p.id === btn.dataset.playlistId);
        if (pl && pl.songs && pl.songs.length) {
          currentPlaylist = pl.songs;
          currentIndex = 0;
          playSong(pl.songs[0], true);
          showToast(`正在播放歌单「${pl.name}」`);
        } else {
          showToast(`歌单暂无曲目，请先添加歌曲`);
        }
      });
    });

    $$('.delete-pl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCustomPlaylist(btn.dataset.playlistId);
      });
    });
  }

  // Controls Setup
  function setupControls() {
    // Play / Pause Button with deterministic state & rapid-click lock
    let isPlayPromisePending = false;
    async function togglePlayPause() {
      if (isPlayPromisePending) return;
      if (!audio.src || audio.src === 'about:blank' || (!currentSong && currentPlaylist.length)) {
        if (currentPlaylist.length) {
          playSong(currentPlaylist[0], true);
        }
        return;
      }
      if (audio.paused) {
        try {
          isPlayPromisePending = true;
          await audio.play();
          setPlayState(true);
        } catch (err) {
          console.warn('Audio play failed, retrying direct fallback:', err);
          if (currentSong && currentSong.neteaseId) {
            audio.crossOrigin = 'anonymous';
            audio.src = `/api/music-proxy?url=${encodeURIComponent(`https://music.163.com/song/media/outer/url?id=${currentSong.neteaseId}.mp3`)}`;
            audio.load();
            await audio.play().then(() => setPlayState(true)).catch(() => setPlayState(false));
          } else {
            setPlayState(false);
          }
        } finally {
          isPlayPromisePending = false;
        }
      } else {
        audio.pause();
        setPlayState(false);
      }
    }

    elBtnPlayPause.addEventListener('click', togglePlayPause);
    elBtnPrev.addEventListener('click', prevSong);
    elBtnNext.addEventListener('click', nextSong);

    // Play Mode Sync Helper (shared with Shell Dynamic Island & Floating Capsule)
    function applyPlayMode(mode, notify = true) {
      playMode = (mode === 'single' || mode === 'shuffle') ? mode : 'loop';
      try { localStorage.setItem('shiny.musicPlayMode', playMode); } catch {}
      if (elBtnMode && elModeIcon) {
        if (playMode === 'single') {
          elBtnMode.title = '单曲循环';
          elModeIcon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="14" font-size="8" font-weight="bold" text-anchor="middle" fill="currentColor">1</text>';
        } else if (playMode === 'shuffle') {
          elBtnMode.title = '随机播放';
          elModeIcon.innerHTML = '<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>';
        } else {
          elBtnMode.title = '列表循环';
          elModeIcon.innerHTML = '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>';
        }
      }
      if (notify) {
        const label = playMode === 'single' ? '单曲循环' : playMode === 'shuffle' ? '随机播放' : '列表循环';
        showToast('已切换为：' + label);
      }
      pushShellMusicState(true);
    }

    function cyclePlayMode(notify = true) {
      const order = ['loop', 'shuffle', 'single'];
      const next = order[(order.indexOf(playMode) + 1) % order.length];
      applyPlayMode(next, notify);
      return playMode;
    }

    window.__musicCyclePlayMode = cyclePlayMode;
    window.__musicApplyPlayMode = applyPlayMode;
    applyPlayMode(playMode, false);

    // Play Mode Toggle
    elBtnMode.addEventListener('click', () => cyclePlayMode(true));

    // Toggle View Mode (Songs vs Lyrics)
    if (elBtnShowSongs) elBtnShowSongs.addEventListener('click', () => switchViewMode('songs'));
    if (elBtnShowLyrics) elBtnShowLyrics.addEventListener('click', () => switchViewMode('lyrics'));

    if (elQuickLyricsBox) {
      elQuickLyricsBox.addEventListener('click', () => switchViewMode('lyrics'));
    }

    // Sound Engine Switchers (全网全音源切换)
    $$('.sound-engine-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.engine === activeSourceEngine);
      btn.addEventListener('click', () => {
        const eng = btn.dataset.engine;
        switchCurrentSongSource(eng);
      });
    });

    // Custom Playlist Dialog Controls
    const dlgAddToPlaylist = $('#dialogAddToPlaylist');
    const btnCloseAddToPlaylist = $('#btnCloseAddToPlaylist');
    const inputNewPlaylistInline = $('#inputNewPlaylistInline');
    const btnCreateAndAddInline = $('#btnCreateAndAddInline');

    if (btnCloseAddToPlaylist && dlgAddToPlaylist) {
      btnCloseAddToPlaylist.addEventListener('click', () => dlgAddToPlaylist.close());
    }

    if (btnCreateAndAddInline && inputNewPlaylistInline && dlgAddToPlaylist) {
      btnCreateAndAddInline.addEventListener('click', () => {
        const name = inputNewPlaylistInline.value.trim();
        if (!name) {
          showToast('请输入歌单名称');
          return;
        }
        const newPl = createCustomPlaylist(name);
        inputNewPlaylistInline.value = '';
        if (pendingAddToPlaylistSong) {
          addSongToCustomPlaylist(newPl.id, pendingAddToPlaylistSong);
        }
        dlgAddToPlaylist.close();
      });
    }

    const dlgNewPlaylist = $('#dialogNewPlaylist');
    const btnCloseNewPlaylist = $('#btnCloseNewPlaylist');
    const btnCancelNewPlaylist = $('#btnCancelNewPlaylist');
    const btnConfirmNewPlaylist = $('#btnConfirmNewPlaylist');
    const inputNewPlaylistName = $('#inputNewPlaylistName');
    const inputNewPlaylistDesc = $('#inputNewPlaylistDesc');

    if (btnCloseNewPlaylist && dlgNewPlaylist) {
      btnCloseNewPlaylist.addEventListener('click', () => dlgNewPlaylist.close());
    }
    if (btnCancelNewPlaylist && dlgNewPlaylist) {
      btnCancelNewPlaylist.addEventListener('click', () => dlgNewPlaylist.close());
    }
    if (btnConfirmNewPlaylist && dlgNewPlaylist && inputNewPlaylistName) {
      btnConfirmNewPlaylist.addEventListener('click', () => {
        const name = inputNewPlaylistName.value.trim();
        const desc = inputNewPlaylistDesc ? inputNewPlaylistDesc.value.trim() : '';
        if (!name) {
          showToast('请输入歌单名称');
          return;
        }
        createCustomPlaylist(name, desc);
        inputNewPlaylistName.value = '';
        if (inputNewPlaylistDesc) inputNewPlaylistDesc.value = '';
        dlgNewPlaylist.close();
        if (activeTab === 'custom') {
          renderCustomPlaylistsView();
        }
      });
    }

    // Cross-Page Background Capsule Toggle Button
    const elBtnToggleCapsule = $('#btnToggleCapsule');
    const elCapsuleStatusDot = $('#capsuleStatusDot');
    const elCapsuleStatusText = $('#capsuleStatusText');

    function syncCapsuleButtonUI() {
      const isEnabled = localStorage.getItem('shiny.bgMusicEnabled') !== 'false';
      if (elCapsuleStatusDot) elCapsuleStatusDot.classList.toggle('active', isEnabled);
      if (elCapsuleStatusText) elCapsuleStatusText.textContent = isEnabled ? '后台胶囊: 已开启' : '后台胶囊: 关闭';
      if (elBtnToggleCapsule) elBtnToggleCapsule.classList.toggle('active', isEnabled);
    }

    if (elBtnToggleCapsule) {
      syncCapsuleButtonUI();
      elBtnToggleCapsule.addEventListener('click', () => {
        const cur = localStorage.getItem('shiny.bgMusicEnabled') !== 'false';
        const next = !cur;
        localStorage.setItem('shiny.bgMusicEnabled', String(next));
        syncCapsuleButtonUI();
        if (next) {
          showToast('🎧 跨页面后台播放胶囊已开启！去往事务所、剧情馆等任意页面都可在小胶囊控制播放与看歌词');
          if (currentSong) {
            localStorage.setItem('shiny.bgMusicCurrentSong', JSON.stringify(currentSong));
            localStorage.setItem('shiny.bgMusicPlaying', String(!audio.paused));
            localStorage.setItem('shiny.bgMusicCurrentTime', String(audio.currentTime));
          }
        } else {
          showToast('跨页面后台播放胶囊已关闭');
        }
      });
    }

    // Single Franchise Hero Brand Click to Cycle (图二风格)
    const elBrandBtn = $('#franchiseBrandBtn');
    if (elBrandBtn) {
      elBrandBtn.addEventListener('click', cycleNextFranchise);
      elBrandBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cycleNextFranchise();
        }
      });
    }

    // 5 Master Franchises Tab Navigation (偶像大师 5 大企划专页顶级导航)
    $$('.franchise-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fr = btn.dataset.franchise;
        if (fr && fr !== activeFranchise) {
          switchFranchise(fr);
        }
      });
    });

    // Favorite Button in Player Dock
    if (elBtnDockFav) {
      elBtnDockFav.addEventListener('click', () => {
        if (!currentSong) return;
        elBtnDockFav.classList.add('pop-anim');
        setTimeout(() => elBtnDockFav.classList.remove('pop-anim'), 350);
        toggleSongFavorite(currentSong);
      });
    }

    // Set as Home BGM
    if (elBtnSetHomeBgm) {
      elBtnSetHomeBgm.addEventListener('click', () => {
        if (currentSong) setAsHomeBgm(currentSong);
      });
    }

    // Download Current Song
    if (elBtnDownloadCurrent) {
      elBtnDownloadCurrent.addEventListener('click', () => {
        if (currentSong) downloadSong(currentSong);
      });
    }

    // One-Click Batch Download All Music + Download Manager Modal
    if (elBtnDownloadAllMusic) {
      elBtnDownloadAllMusic.addEventListener('click', downloadBatchMusic);
    }
    initDownloadManagerUI();

    // Check Music Updates
    if (elBtnCheckMusicUpdate) {
      elBtnCheckMusicUpdate.addEventListener('click', () => checkMusicUpdates(true));
    }

    // Quality Selector Dropdown
    if (elBtnQuality && elQualityDropdown) {
      elBtnQuality.addEventListener('click', (e) => {
        e.stopPropagation();
        renderPlatformQualityMenu(false);
        elQualityDropdown.classList.toggle('show');
      });

      $$('.quality-opt-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          selectQuality(item.dataset.quality);
        });
      });

      document.addEventListener('click', () => {
        elQualityDropdown.classList.remove('show');
      });
    }

    // Fullscreen Lyrics Quality Dropdown
    if (elLfoQualityBtn && elLfoQualityDropdown) {
      elLfoQualityBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renderPlatformQualityMenu(true);
        updateQualityUI();
        elLfoQualityDropdown.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#lfoQualityDropdown') && !e.target.closest('#lfoQualityBtn')) {
          elLfoQualityDropdown.classList.remove('show');
        }
      });
    }

    // Audio Source Selector in Dock
    if (elBtnCurrentSource && elSourceDropdown) {
      elBtnCurrentSource.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShow = elSourceDropdown.style.display === 'block';
        elSourceDropdown.style.display = isShow ? 'none' : 'block';
      });

      $$('.source-opt-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const eng = item.dataset.engine;
          switchCurrentSongSource(eng);
          elSourceDropdown.style.display = 'none';
          $$('.source-opt-item').forEach(x => x.classList.toggle('active', x.dataset.engine === eng));
        });
      });

      document.addEventListener('click', () => {
        if (elSourceDropdown) elSourceDropdown.style.display = 'none';
      });
    }

    // Source Dialog Controls
    if (elBtnOpenSourceDialog && elSourceDialog) {
      elBtnOpenSourceDialog.addEventListener('click', () => {
        if (elInputLxSource) elInputLxSource.value = lxSourceTemplate;
        elSourceDialog.showModal();
      });

      if (elBtnCloseSourceDialog) {
        elBtnCloseSourceDialog.addEventListener('click', () => {
          elSourceDialog.close();
        });
      }

      elSourceDialog.addEventListener('click', (e) => {
        if (e.target === elSourceDialog) elSourceDialog.close();
      });

      if (elBtnFetchPlaylist) {
        elBtnFetchPlaylist.addEventListener('click', () => {
          const val = elInputPlaylistId.value.trim();
          handleImportPlaylist(val);
        });
      }

      // Reset to Official Catalog
      const elBtnResetOfficial = $('#btnResetOfficialCatalog');
      if (elBtnResetOfficial) {
        elBtnResetOfficial.addEventListener('click', () => {
          localStorage.removeItem('shiny.importedCatalog');
          if (franchiseCatalogs && franchiseCatalogs[activeFranchise]) {
            switchFranchise(activeFranchise);
          } else {
            fetch('franchise-catalogs.json').then(r => r.json()).then(d => {
              franchiseCatalogs = d;
              switchFranchise(activeFranchise);
            }).catch(() => location.reload());
          }
          if (elSourceDialog) elSourceDialog.close();
          showToast('✓ 已恢复官方全企划内置曲库 (共 1,530 首曲目)！');
        });
      }

      // Save LX Source
      if (elBtnSaveLxSource && elInputLxSource) {
        elBtnSaveLxSource.addEventListener('click', () => {
          const val = elInputLxSource.value.trim();
          lxSourceTemplate = val;
          localStorage.setItem('shiny.lxSourceTemplate', val);
          showToast(val ? '已保存自定义洛雪/无损解析源' : '已恢复内置官方高品质解析线路');
          elSourceDialog.close();
        });
      }
    }

    // Progress Scrubber
    elProgressRange.addEventListener('input', () => {
      isSeeking = true;
      const pct = parseFloat(elProgressRange.value);
      if (Number.isFinite(audio.duration)) {
        elCurrentTime.textContent = formatTime((pct / 100) * audio.duration);
      }
    });

    elProgressRange.addEventListener('change', () => {
      const pct = parseFloat(elProgressRange.value);
      if (Number.isFinite(audio.duration)) {
        audio.currentTime = (pct / 100) * audio.duration;
      }
      isSeeking = false;
    });

    // Volume (persisted, synced with Music Capsule & Home Idol Voice Ducking)
    function applyMusicVolume(val01, persist = true) {
      const clamped = Math.max(0, Math.min(1, Number(val01)));
      if (!Number.isFinite(clamped)) return;
      baseMusicVolume = clamped;
      applyEffectiveAudioVolume();
      const pct = Math.round(clamped * 100);
      if (elVolumeRange) {
        elVolumeRange.value = String(pct);
        elVolumeRange.style.setProperty('--vol-pct', pct + '%');
      }
      const volTxt = $('#volumeValText');
      if (volTxt) volTxt.textContent = `${pct}%`;
      if (persist) {
        try { localStorage.setItem('shiny.musicVolume', String(pct)); } catch {}
      }
      pushShellMusicState(true);
    }
    window.__musicApplyVolume = applyMusicVolume;
    applyMusicVolume(baseMusicVolume, false);
    elVolumeRange.addEventListener('input', () => {
      applyMusicVolume(parseFloat(elVolumeRange.value) / 100, true);
    });

    // Search Input (Unified Multi-Source Search)
    if (elSearchInput) {
      elSearchInput.addEventListener('input', () => {
        searchQuery = elSearchInput.value.trim();
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          performUnifiedSearch(searchQuery);
        }, 300);
      });
    }

    // Filter Tabs
    $$('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        applyFilters();
        scrollSongListToTop(true);
      });
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        elBtnPlayPause.click();
      } else if (e.code === 'ArrowRight') {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
      } else if (e.code === 'ArrowLeft') {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
      }
    });
  }

  // Initialize
  async function init() {
    bindElements();
    setupAudioEvents();
    setupControls();

    // Load persisted login / VIP account config FIRST so VIP quality tiers are unlocked immediately on startup!
    try {
      const cfgRes = await fetch('/api/private-music/config');
      if (cfgRes.ok) {
        privateSourcesConfig = await cfgRes.json();
        fillPrivateForm(privateSourcesConfig);
      }
    } catch {}
    enforceFreeQualityIfUnlogged(getActivePlatformKey(), false);
    renderPlatformQualityMenu(true);
    updateQualityUI();

    try {
      // Preload 5 franchise brand logos
      ['logo-sc.png', 'logo-gakuen.png', 'logo-cg.png', 'logo-ml.png', 'logo-as.png'].forEach(f => {
        const img = new Image();
        img.src = '/images/franchise-logos/' + f;
      });

      // 1. Fetch Lyrics Cache
      fetch('music-lyrics.json').then(r => r.json()).then(data => {
        lyricsCache = data || {};
      }).catch(() => {});

      // Clean up any previously corrupted imported catalogs with app-icon placeholders
      try {
        const checkImport = JSON.parse(localStorage.getItem('shiny.importedCatalog') || 'null');
        if (checkImport && Array.isArray(checkImport.songs) && (checkImport.songs.length === 0 || checkImport.songs.some(s => !s.cover || s.cover === '/app-icon.png'))) {
          localStorage.removeItem('shiny.importedCatalog');
        }
      } catch {}

      // 2. Fetch All Franchise Master Catalogs
      try {
        const frRes = await fetch('franchise-catalogs.json');
        franchiseCatalogs = await frRes.json();
      } catch (err) {
        console.warn('Franchise catalogs load failed:', err);
      }

      // 3. Fetch Initial Catalog
      const res = await fetch('music-catalog.json');
      catalogData = await res.json();
      scDefaultIdols = Array.isArray(catalogData.idols) ? catalogData.idols.slice() : [];

      // Check active franchise & set brand UI
      if (franchiseCatalogs && franchiseCatalogs[activeFranchise]) {
        const fr = franchiseCatalogs[activeFranchise];
        catalogData.songs = fr.songs;
        catalogData.playlistTitle = fr.name;
        catalogData.author = fr.creator || '宫水三也';
        switchFranchise(activeFranchise, false);
      } else {
        elCountSongs.textContent = catalogData.songs.length;
        elCountIdols.textContent = catalogData.idols?.length || 28;
        renderUnitBar();
        renderIdolBar(catalogData.idols || []);
        currentPlaylist = catalogData.songs.slice();
        renderSongList(currentPlaylist);
        if (currentPlaylist.length) {
          const safeIdx = Math.max(0, findRememberedFranchiseSongIndex(activeFranchise, currentPlaylist));
          currentIndex = safeIdx;
          playSong(currentPlaylist[safeIdx], false);
        }
      }

      // Default to songs list view
      if (activeViewMode !== 'lyrics') {
        switchViewMode('songs');
      }

      // Check for updates quietly in background
      setTimeout(() => checkMusicUpdates(false), 3000);
      initStudioTurntable();
      initFullLyricsOverlay();
      initPrivateMusicConfigUI();
      pushShellMusicState(true);
    } catch (err) {
      console.error('Failed to initialize 283 Jukebox:', err);
    }
  }

  /* ── Private & Self-Hosted Music Source Manager UI ── */
  function readPrivateForm() {
    return {
      preferPrivate: !!$('#pmPreferPrivate')?.checked,
      ncm: {
        enabled: !!$('#pmNcmEnabled')?.checked,
        baseUrl: ($('#pmNcmUrl')?.value || '').trim(),
        cookie: ($('#pmNcmCookie')?.value || '').trim(),
        level: $('#pmNcmLevel')?.value || 'lossless'
      },
      subsonic: {
        enabled: !!$('#pmSubEnabled')?.checked,
        baseUrl: ($('#pmSubUrl')?.value || '').trim(),
        username: ($('#pmSubUser')?.value || '').trim(),
        password: $('#pmSubPass')?.value || ''
      },
      webdav: {
        enabled: !!$('#pmDavEnabled')?.checked,
        baseUrl: ($('#pmDavUrl')?.value || '').trim(),
        username: ($('#pmDavUser')?.value || '').trim(),
        password: $('#pmDavPass')?.value || ''
      }
    };
  }

  function fillPrivateForm(cfg) {
    if (!cfg) return;
    if ($('#pmPreferPrivate')) $('#pmPreferPrivate').checked = cfg.preferPrivate !== false;
    if ($('#pmNcmEnabled')) $('#pmNcmEnabled').checked = !!cfg.ncm?.enabled;
    if ($('#pmNcmUrl')) $('#pmNcmUrl').value = cfg.ncm?.baseUrl || '';
    if ($('#pmNcmCookie')) $('#pmNcmCookie').value = cfg.ncm?.cookie || '';
    if ($('#pmNcmLevel')) $('#pmNcmLevel').value = cfg.ncm?.level || 'lossless';
    if ($('#pmSubEnabled')) $('#pmSubEnabled').checked = !!cfg.subsonic?.enabled;
    if ($('#pmSubUrl')) $('#pmSubUrl').value = cfg.subsonic?.baseUrl || '';
    if ($('#pmSubUser')) $('#pmSubUser').value = cfg.subsonic?.username || '';
    if ($('#pmSubPass')) $('#pmSubPass').value = cfg.subsonic?.password || '';
    if ($('#pmDavEnabled')) $('#pmDavEnabled').checked = !!cfg.webdav?.enabled;
    if ($('#pmDavUrl')) $('#pmDavUrl').value = cfg.webdav?.baseUrl || '';
    if ($('#pmDavUser')) $('#pmDavUser').value = cfg.webdav?.username || '';
    if ($('#pmDavPass')) $('#pmDavPass').value = cfg.webdav?.password || '';
    syncNcmAccountUI(cfg);
  }

  let ncmQrPollTimer = 0;

  function stopNcmQrPoll() {
    if (ncmQrPollTimer) {
      clearInterval(ncmQrPollTimer);
      ncmQrPollTimer = 0;
    }
  }

  function syncNcmAccountUI(cfg) {
    const card = $('#ncmAccountCard');
    const qrCard = $('#ncmQrCard');
    const nameEl = $('#ncmAccountName');
    const avEl = $('#ncmAccountAvatar');
    const loggedIn = !!(cfg?.ncm?.cookie && cfg?.ncm?.nickname);
    if (card) card.hidden = !loggedIn;
    if (qrCard) qrCard.hidden = loggedIn;
    if (loggedIn) {
      if (nameEl) nameEl.textContent = `已登录：${cfg.ncm.nickname}`;
      if (avEl) avEl.src = cfg.ncm.avatar || '/app-icon.png';
    }
  }

  async function startNcmQrLogin() {
    stopNcmQrPoll();
    const stage = $('#ncmQrStage');
    const statusEl = $('#ncmQrStatus');
    const btn = $('#btnNcmQrStart');
    if (statusEl) { statusEl.className = 'pm-status-line'; statusEl.textContent = '正在获取网易云二维码…'; }
    if (btn) btn.disabled = true;
    try {
      const r = await fetch('/api/private-music/ncm/qr-create');
      const j = await r.json();
      if (!j?.ok || !j.unikey || !j.qrUrl) {
        if (statusEl) { statusEl.className = 'pm-status-line is-err'; statusEl.textContent = j?.message || '获取二维码失败'; }
        return;
      }
      if (stage && typeof window.qrcode === 'function') {
        const qr = window.qrcode(0, 'M');
        qr.addData(j.qrUrl);
        qr.make();
        stage.innerHTML = qr.createSvgTag({ scalable: true, margin: 2 });
      }
      if (statusEl) { statusEl.className = 'pm-status-line'; statusEl.textContent = '请打开手机网易云 App 扫一扫登录'; }

      const unikey = j.unikey;
      ncmQrPollTimer = setInterval(async () => {
        if (!elSourceDialog?.open) { stopNcmQrPoll(); return; }
        try {
          const cr = await fetch(`/api/private-music/ncm/qr-check?key=${encodeURIComponent(unikey)}`);
          const cj = await cr.json();
          if (cj.code === 800) {
            stopNcmQrPoll();
            if (statusEl) { statusEl.className = 'pm-status-line is-err'; statusEl.textContent = '二维码已过期，请点击下方重新生成'; }
          } else if (cj.code === 802) {
            if (statusEl) { statusEl.className = 'pm-status-line is-ok'; statusEl.textContent = `已扫码${cj.nickname ? ' (' + cj.nickname + ')' : ''}，请在手机上点击确认登录`; }
          } else if (cj.code === 803) {
            stopNcmQrPoll();
            if (statusEl) { statusEl.className = 'pm-status-line is-ok'; statusEl.textContent = `✓ ${cj.message || '登录成功！'}`; }
            const cfgRes = await fetch('/api/private-music/config');
            if (cfgRes.ok) {
              privateSourcesConfig = await cfgRes.json();
              fillPrivateForm(privateSourcesConfig);
              window.dispatchEvent(new CustomEvent('shiny-auth-changed', { detail: privateSourcesConfig }));
            }
            showToast(`🎉 网易云登录成功（${cj.nickname || '会员账号'}）！已自动启用无损通道`);
          }
        } catch {}
      }, 1500);
    } catch (e) {
      if (statusEl) { statusEl.className = 'pm-status-line is-err'; statusEl.textContent = '生成二维码失败：' + e.message; }
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function savePrivateConfig(silent = false) {
    const payload = readPrivateForm();
    try {
      const r = await fetch('/api/private-music/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const j = await r.json();
      if (j?.ok && j.config) {
        privateSourcesConfig = j.config;
        fillPrivateForm(privateSourcesConfig);
        window.dispatchEvent(new CustomEvent('shiny-auth-changed', { detail: j.config }));
        if (!silent) {
          showToast(hasEnabledPrivateSource() ? '✅ 自建 / 私有曲库配置已保存并生效' : '配置已保存');
        }
      }
    } catch (e) {
      if (!silent) showToast('保存失败：' + e.message);
    }
  }

  async function testPrivateProvider(provider, statusElId) {
    const statusEl = $(statusElId);
    if (statusEl) {
      statusEl.className = 'pm-status-line';
      statusEl.textContent = '正在测试连接…';
    }
    const form = readPrivateForm();
    try {
      const r = await fetch('/api/private-music/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, config: form[provider] })
      });
      const j = await r.json();
      if (statusEl) {
        statusEl.className = 'pm-status-line ' + (j.ok ? 'is-ok' : 'is-err');
        statusEl.textContent = (j.ok ? '✓ ' : '✕ ') + (j.message || (j.ok ? '连接成功' : '连接失败'));
      }
    } catch (e) {
      if (statusEl) {
        statusEl.className = 'pm-status-line is-err';
        statusEl.textContent = '✕ 测试请求失败：' + e.message;
      }
    }
  }

  async function initPrivateMusicConfigUI() {
    // Load persisted config from local server & sync VIP quality locks immediately
    try {
      const r = await fetch('/api/private-music/config');
      if (r.ok) {
        privateSourcesConfig = await r.json();
        fillPrivateForm(privateSourcesConfig);
        enforceFreeQualityIfUnlogged(getActivePlatformKey(), false);
        renderPlatformQualityMenu(true);
        updateQualityUI();
      }
    } catch {}

    // Tab switching
    $$('.pm-src-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const key = tab.dataset.pmTab;
        $$('.pm-src-tab').forEach(t => t.classList.toggle('active', t.dataset.pmTab === key));
        $$('.pm-src-pane').forEach(p => p.classList.toggle('active', p.dataset.pmPane === key));
      });
    });

    $('#pmPreferPrivate')?.addEventListener('change', () => savePrivateConfig(true));
    $('#btnSavePrivateSources1')?.addEventListener('click', () => savePrivateConfig(false));
    $('#btnSavePrivateSources2')?.addEventListener('click', () => savePrivateConfig(false));
    $('#btnSavePrivateSources3')?.addEventListener('click', () => savePrivateConfig(false));
    $('#btnTestNcm')?.addEventListener('click', () => testPrivateProvider('ncm', '#pmNcmStatus'));
    $('#btnTestSub')?.addEventListener('click', () => testPrivateProvider('subsonic', '#pmSubStatus'));
    $('#btnTestDav')?.addEventListener('click', () => testPrivateProvider('webdav', '#pmDavStatus'));
    $('#btnNcmQrStart')?.addEventListener('click', startNcmQrLogin);
    $('#btnNcmBrowserLogin')?.addEventListener('click', async () => {
      stopNcmQrPoll();
      const statusEl = $('#ncmQrStatus');
      const btn = $('#btnNcmBrowserLogin');
      if (btn) btn.disabled = true;
      if (statusEl) { statusEl.className = 'pm-status-line'; statusEl.textContent = '已打开网易云官方登录窗口，请扫码或登录后点确认，成功后会自动关闭并生效…'; }
      try {
        const r = await fetch('/api/private-music/browser-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: 'ncm' })
        });
        const j = await r.json();
        if (j?.ok && j.config) {
          privateSourcesConfig = j.config;
          fillPrivateForm(privateSourcesConfig);
          window.dispatchEvent(new CustomEvent('shiny-auth-changed', { detail: j.config }));
          if (statusEl) { statusEl.className = 'pm-status-line is-ok'; statusEl.textContent = `✓ ${j.message || '登录成功！'}`; }
          showToast(`🎉 网易云官方登录成功（${j.nickname || '会员账号'}）！会员音质与账号歌单已解锁`);
        } else {
          if (statusEl) { statusEl.className = 'pm-status-line is-err'; statusEl.textContent = j?.message || '未完成登录'; }
        }
      } catch (e) {
        if (statusEl) { statusEl.className = 'pm-status-line is-err'; statusEl.textContent = '打开登录窗口失败：' + e.message; }
      } finally {
        if (btn) btn.disabled = false;
      }
    });
    $('#btnNcmLogout')?.addEventListener('click', async () => {
      stopNcmQrPoll();
      try {
        const r = await fetch('/api/private-music/ncm/logout', { method: 'POST' });
        const j = await r.json();
        if (j?.config) {
          privateSourcesConfig = j.config;
          fillPrivateForm(privateSourcesConfig);
          window.dispatchEvent(new CustomEvent('shiny-auth-changed', { detail: j.config }));
        }
        showToast('已退出网易云账号');
      } catch {}
    });
    elSourceDialog?.addEventListener('close', stopNcmQrPoll);
  }

  /* ── Full-Screen Immersive Lyrics Overlay Controller ── */
  let lfoOpen = false;
  let lfoSeeking = false;

  function openFullLyrics() {
    const ov = document.getElementById('lyricsFullOverlay');
    if (!ov) return;
    lfoOpen = true;
    ov.classList.add('is-open');
    ov.setAttribute('aria-hidden', 'false');
    syncFullLyricsSong(currentSong);
    renderFullLyricsLines();
    syncFullLyricsTime();
  }

  function closeFullLyrics() {
    const ov = document.getElementById('lyricsFullOverlay');
    if (!ov) return;
    lfoOpen = false;
    ov.classList.remove('is-open');
    ov.setAttribute('aria-hidden', 'true');
  }

  function syncFullLyricsSong(song) {
    if (!song) return;
    const cover = song.cover || '/app-icon.png';
    const bg = document.getElementById('lfoBackdropImg');
    const img = document.getElementById('lfoCoverImg');
    const title = document.getElementById('lfoTitle');
    const sub = document.getElementById('lfoSub');
    const artist = document.getElementById('lfoArtist');
    const album = document.getElementById('lfoAlbum');
    const favBtn = document.getElementById('lfoFavBtn');
    const srcBadge = document.getElementById('lfoSourceBadge');
    const qualBadge = document.getElementById('lfoQualityBadge');
    if (bg) bg.src = cover;
    if (img) img.src = cover;
    if (title) title.textContent = song.title || '';
    if (sub) sub.textContent = song.titleZh || '';
    if (artist) {
      const parts = [song.unitName, song.vocalists].map(x => String(x || '').trim()).filter(Boolean);
      const artistText = [...new Set(parts)].join(' · ');
      artist.textContent = artistText;
      artist.classList.toggle('is-clickable', !!artistText);
      artist.title = artistText ? `点击查看「${artistText}」的作品` : '';
      artist.setAttribute('role', artistText ? 'button' : '');
      artist.tabIndex = artistText ? 0 : -1;
    }
    if (album) {
      const albumText = String(song.album || '').trim();
      album.textContent = albumText ? `专辑 · ${albumText}` : '';
      album.classList.toggle('is-clickable', !!albumText);
      album.title = albumText ? `点击查看专辑「${albumText}」曲目` : '';
      album.setAttribute('role', albumText ? 'button' : '');
      album.tabIndex = albumText ? 0 : -1;
    }
    if (favBtn) favBtn.classList.toggle('is-fav', isSongFavorited(song));
    if (srcBadge && elHeroPlatformTag) srcBadge.textContent = elHeroPlatformTag.textContent;
    if (qualBadge && elQualityLabel) qualBadge.textContent = elQualityLabel.textContent;
  }

  // Auto-hide cursor after 3s of mouse inactivity inside Full-Screen Immersive Lyrics Overlay
  (() => {
    let cursorIdleTimer = 0;
    const armCursorHide = () => {
      const ov = document.getElementById('lyricsFullOverlay');
      if (!ov) return;
      ov.classList.remove('is-cursor-idle');
      clearTimeout(cursorIdleTimer);
      if (!ov.classList.contains('is-open')) return;
      cursorIdleTimer = setTimeout(() => {
        if (ov.classList.contains('is-open')) ov.classList.add('is-cursor-idle');
      }, 3000);
    };
    document.addEventListener('mousemove', armCursorHide, { passive: true });
    document.addEventListener('pointerdown', armCursorHide, { passive: true });
    document.addEventListener('keydown', armCursorHide, { passive: true });

    // Wire Full-Screen Immersive Lyrics Mode / Download / Volume controls (using crisp vector SVGs!)
    const MODE_SVGS = {
      loop: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
      shuffle: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
      single: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>'
    };
    const VOL_SVGS = {
      mute: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
      on: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>'
    };
    const syncLfoExtras = () => {
      const mBtn = document.getElementById('lfoModeBtn');
      if (mBtn) {
        const key = playMode === 'shuffle' ? 'shuffle' : (playMode === 'single' ? 'single' : 'loop');
        if (mBtn.dataset.modeKey !== key) {
          mBtn.dataset.modeKey = key;
          mBtn.innerHTML = MODE_SVGS[key];
        }
        mBtn.title = key === 'shuffle' ? '随机播放（点击切换）' : (key === 'single' ? '单曲循环（点击切换）' : '列表循环（点击切换）');
      }
      const volPct = Math.round((audio.muted ? 0 : audio.volume) * 100);
      const lfoVol = document.getElementById('lfoVolume');
      const lfoVolTxt = document.getElementById('lfoVolText');
      const lfoMute = document.getElementById('lfoMuteBtn');
      if (lfoVol) lfoVol.value = String(volPct);
      if (lfoVolTxt) lfoVolTxt.textContent = `${volPct}%`;
      if (lfoMute) {
        const vKey = volPct === 0 ? 'mute' : 'on';
        if (lfoMute.dataset.vKey !== vKey) {
          lfoMute.dataset.vKey = vKey;
          lfoMute.innerHTML = VOL_SVGS[vKey];
        }
      }
    };
    document.getElementById('lfoModeBtn')?.addEventListener('click', () => {
      if (elBtnMode) elBtnMode.click();
      setTimeout(syncLfoExtras, 30);
    });
    document.getElementById('lfoDlBtn')?.addEventListener('click', () => {
      if (currentSong && typeof downloadSong === 'function') downloadSong(currentSong);
    });
    document.getElementById('lfoMuteBtn')?.addEventListener('click', () => {
      audio.muted = !audio.muted;
      syncLfoExtras();
      pushShellMusicState(true);
    });
    document.getElementById('lfoVolume')?.addEventListener('input', (e) => {
      const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
      audio.muted = pct === 0;
      audio.volume = pct / 100;
      if (elVolumeRange) elVolumeRange.value = String(pct);
      const vt = document.getElementById('volumeValText');
      if (vt) vt.textContent = `${pct}%`;
      try { localStorage.setItem('shiny.musicVolume', String(pct)); } catch {}
      syncLfoExtras();
      pushShellMusicState(true);
    });
    audio.addEventListener('volumechange', syncLfoExtras);
    setInterval(syncLfoExtras, 1200);
    syncLfoExtras();
  })();

  function renderFullLyricsLines() {
    const box = document.getElementById('lfoLyricsScroll');
    if (!box) return;
    if (!parsedLyrics || !parsedLyrics.length) {
      box.innerHTML = '<div class="lfo-empty">暂无同步歌词 · 享受纯粹旋律</div>';
      return;
    }
    box.innerHTML = parsedLyrics.map((line, i) => `
      <div class="lfo-line ${i === currentLyricIndex ? 'active' : ''}" data-lfo-idx="${i}">
        <div class="lfo-line-jp">${line.jp || ''}</div>
        ${line.zh ? `<div class="lfo-line-zh">${line.zh}</div>` : ''}
      </div>
    `).join('');
    box.querySelectorAll('.lfo-line').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.lfoIdx, 10);
        const item = parsedLyrics[idx];
        if (item && Number.isFinite(item.time)) {
          audio.currentTime = item.time;
          if (audio.paused) audio.play().catch(() => {});
          syncLyrics();
        }
      });
    });
    syncFullLyricsActive(currentLyricIndex, true);
  }

  function syncFullLyricsActive(activeIdx, instant = false) {
    const box = document.getElementById('lfoLyricsScroll');
    if (!box) return;
    box.querySelectorAll('.lfo-line').forEach(el => {
      el.classList.toggle('active', parseInt(el.dataset.lfoIdx, 10) === activeIdx);
    });
    if (activeIdx >= 0) {
      const target = box.querySelector(`[data-lfo-idx="${activeIdx}"]`);
      if (target) {
        const top = target.offsetTop - (box.clientHeight / 2) + (target.clientHeight / 2);
        box.scrollTo({ top: Math.max(0, top), behavior: instant ? 'auto' : 'smooth' });
      }
    }
  }

  function syncFullLyricsTime() {
    const ov = document.getElementById('lyricsFullOverlay');
    if (!ov) return;
    const playing = !audio.paused && !audio.ended;
    ov.classList.toggle('is-playing', playing);
    const icPlay = ov.querySelector('.lfo-ic-play');
    const icPause = ov.querySelector('.lfo-ic-pause');
    if (icPlay) icPlay.style.display = playing ? 'none' : 'block';
    if (icPause) icPause.style.display = playing ? 'block' : 'none';
    const cur = document.getElementById('lfoCurTime');
    const durEl = document.getElementById('lfoDurTime');
    const seek = document.getElementById('lfoSeek');
    const dur = (Number.isFinite(audio.duration) && audio.duration > 0) ? audio.duration : (currentSong?.duration || 0);
    if (cur) cur.textContent = formatTime(audio.currentTime || 0);
    if (durEl) durEl.textContent = formatTime(dur);
    if (seek && !lfoSeeking && dur > 0) {
      seek.value = String(((audio.currentTime || 0) / dur) * 100);
    }
  }

  function initFullLyricsOverlay() {
    const trigger = document.getElementById('dockTrackTrigger');
    const closeBtn = document.getElementById('lfoCloseBtn');
    const favBtn = document.getElementById('lfoFavBtn');
    const prevBtn = document.getElementById('lfoPrevBtn');
    const playBtn = document.getElementById('lfoPlayBtn');
    const nextBtn = document.getElementById('lfoNextBtn');
    const seek = document.getElementById('lfoSeek');

    trigger?.addEventListener('click', () => {
      if (lfoOpen) closeFullLyrics();
      else openFullLyrics();
    });
    trigger?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFullLyrics(); }
    });
    closeBtn?.addEventListener('click', closeFullLyrics);

    // Clickable Artist & Album navigation (works from BOTH Full-Screen Player AND Main Turntable Panel!)
    const jumpToArtistFromLfo = () => {
      if (!currentSong) return;
      const artistText = String(currentSong.unitName || currentSong.vocalists || document.getElementById('lfoArtist')?.textContent || '').trim();
      if (!artistText) return;
      if (lfoOpen) closeFullLyrics();
      searchQuery = '';
      if (elSearchInput) elSearchInput.value = '';

      // 1) Try matching a specific Idol first when it's a solo song
      const idols = catalogData?.idols || [];
      const matchIdol = () => {
        if (Array.isArray(currentSong.idols) && currentSong.idols.length === 1 && currentSong.idols[0] !== 'all') {
          const hit = idols.find(i => String(i.id) === String(currentSong.idols[0]));
          if (hit) return hit;
        }
        const hay = ((currentSong.vocalists || '') + ' ' + (currentSong.unitName || '')).toLowerCase();
        return idols.find(i => (i.name && hay.includes(i.name.toLowerCase())) || (Array.isArray(i.keywords) && i.keywords.some(k => k && hay.includes(k.toLowerCase()))));
      };

      // 2) Try matching a Unit pill
      const matchUnitKey = () => {
        const uHay = ((currentSong.unitKey || '') + ' ' + (currentSong.unit || '') + ' ' + (currentSong.unitName || '') + ' ' + (currentSong.vocalists || '')).toLowerCase();
        if (activeFranchise === 'sc') {
          for (const u of UNITS_DATA) {
            if (u.key === 'all') continue;
            const aliases = [u.key, u.name, ...(UNIT_ALIASES_MAP[u.key] || [])].filter(Boolean);
            if (aliases.some(a => uHay.includes(String(a).toLowerCase()))) return u.key;
          }
        } else {
          const curUnits = catalogData?.units || {};
          for (const [k, u] of Object.entries(curUnits)) {
            if (k === 'all') continue;
            if (uHay.includes(k.toLowerCase()) || (u?.name && uHay.includes(u.name.toLowerCase()))) return k;
          }
        }
        return null;
      };

      const matchedIdol = currentSong.type === 'solo' ? matchIdol() : null;
      if (matchedIdol) {
        const uKey = matchedIdol.unit || matchUnitKey() || 'all';
        if (uKey && uKey !== 'all') {
          selectedUnit = uKey;
          $$('.unit-card-pill').forEach(p => p.classList.toggle('active', p.dataset.unit === uKey));
          renderIdolBar(idols);
        }
        selectIdol(matchedIdol.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const matchedUnit = matchUnitKey();
      if (matchedUnit) {
        selectUnit(matchedUnit);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // 3) Fallback: search across local + online catalog by artist name
      selectedUnit = 'all';
      selectedIdolId = 'all';
      activeTab = 'all';
      $$('.unit-card-pill').forEach(p => p.classList.toggle('active', p.dataset.unit === 'all'));
      $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'all'));
      renderIdolBar(idols);
      switchViewMode('songs');
      searchQuery = artistText;
      if (elSearchInput) elSearchInput.value = artistText;
      applyFilters();
      if (!currentPlaylist.length && typeof performUnifiedSearch === 'function') {
        performUnifiedSearch(artistText);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const jumpToAlbumFromLfo = () => {
      const albumName = String(currentSong?.album || '').trim();
      if (!albumName) return;
      if (lfoOpen) closeFullLyrics();
      selectedUnit = 'all';
      selectedIdolId = 'all';
      activeTab = 'all';
      $$('.unit-card-pill').forEach(p => p.classList.toggle('active', p.dataset.unit === 'all'));
      $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'all'));
      renderIdolBar(catalogData?.idols || []);
      switchViewMode('songs');
      searchQuery = albumName;
      if (elSearchInput) elSearchInput.value = albumName;
      applyFilters();
      if (!currentPlaylist.length && typeof performUnifiedSearch === 'function') {
        performUnifiedSearch(albumName);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const lfoArtistEl = document.getElementById('lfoArtist');
    const lfoAlbumEl = document.getElementById('lfoAlbum');
    const bindJump = (el, fn, tip) => {
      if (!el || el.dataset.jumpBound) return;
      el.dataset.jumpBound = '1';
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      if (tip) el.title = tip;
      el.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
      });
    };
    bindJump(lfoArtistEl, jumpToArtistFromLfo, '点击查看该歌手/组合的全部歌曲');
    bindJump(lfoAlbumEl, jumpToAlbumFromLfo, '点击查看该专辑的全部歌曲');
    bindJump(elHeroArtists || document.getElementById('heroSongArtists'), jumpToArtistFromLfo, '点击查看该歌手/组合的全部歌曲');
    bindJump(elHeroAlbum || document.getElementById('heroSongAlbum'), jumpToAlbumFromLfo, '点击查看该专辑的全部歌曲');
    favBtn?.addEventListener('click', () => {
      if (currentSong) {
        toggleSongFavorite(currentSong);
        favBtn.classList.toggle('is-fav', isSongFavorited(currentSong));
      }
    });
    prevBtn?.addEventListener('click', prevSong);
    nextBtn?.addEventListener('click', nextSong);
    playBtn?.addEventListener('click', () => elBtnPlayPause?.click());
    seek?.addEventListener('pointerdown', () => { lfoSeeking = true; });
    seek?.addEventListener('change', () => {
      const dur = (Number.isFinite(audio.duration) && audio.duration > 0) ? audio.duration : (currentSong?.duration || 0);
      if (dur > 0) audio.currentTime = (parseFloat(seek.value) / 100) * dur;
      lfoSeeking = false;
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lfoOpen) {
        e.preventDefault();
        closeFullLyrics();
      }
    });

    // Re-render overlay lyrics whenever #lyricsScrollBox updates
    if (elLyricsScroll && typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => {
        if (lfoOpen) renderFullLyricsLines();
      }).observe(elLyricsScroll, { childList: true });
    }
  }

  /* ── Hi-Fi Studio Turntable Inertia Physics, Groove Tracking & Visualizer ── */
  const isMobileMusicEnv = () => {
    const ds = document.documentElement.dataset;
    return ds.mobile === '1' || ds.android === '1' || ds.joytrans === '1' || ds.harmony === '1' || ds.kirin === '1'
      || /ShinyStoriesAndroid|Android|HarmonyOS|JoyTrans|Droitong|Mobile/i.test(navigator.userAgent || '');
  };
  let musicTabVisible = !document.hidden;
  let vinylAngle = 0;
  let vinylSpeed = 0;
  let vinylTargetSpeed = 0;
  let vinylRafId = 0;
  let vinylLastTime = 0;

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.data?.type !== 'shiny-shell-visibility') return;
    musicTabVisible = !!e.data.active;
    if (!musicTabVisible) {
      if (vinylRafId) { cancelAnimationFrame(vinylRafId); vinylRafId = 0; }
    } else if (!audio.paused && !isMobileMusicEnv() && !vinylRafId) {
      vinylLastTime = performance.now();
      vinylRafId = requestAnimationFrame(stepVinylPhysics);
    }
  });

  function stepVinylPhysics(now) {
    if (!musicTabVisible || isMobileMusicEnv()) {
      vinylRafId = 0;
      return;
    }
    const dt = Math.min(0.05, Math.max(0.004, (now - vinylLastTime) / 1000));
    vinylLastTime = now;
    const accel = vinylTargetSpeed > vinylSpeed ? 3.2 : 2.1; // Organic motor spin-up vs smooth coast-down
    vinylSpeed += (vinylTargetSpeed - vinylSpeed) * Math.min(1, accel * dt);
    vinylAngle = (vinylAngle + vinylSpeed * dt) % 360;
    if (elVinylDisc) {
      elVinylDisc.style.setProperty('--vinyl-deg', `${vinylAngle.toFixed(2)}deg`);
    }
    if (Math.abs(vinylSpeed) > 0.25 || vinylTargetSpeed > 0) {
      vinylRafId = requestAnimationFrame(stepVinylPhysics);
    } else {
      vinylSpeed = 0;
      vinylRafId = 0;
    }
  }

  function updateTonearmAngle(isPlaying) {
    if (!elTonearm) return;
    if (!isPlaying) {
      elTonearm.style.setProperty('--arm-deg', '-28deg');
      return;
    }
    const dur = (Number.isFinite(audio.duration) && audio.duration > 0) ? audio.duration : (currentSong?.duration || 180);
    const pct = dur > 0 ? Math.max(0, Math.min(1, (audio.currentTime || 0) / dur)) : 0;
    const deg = 2 + pct * 14; // Physically tracks across LP groove from +2deg to +16deg
    elTonearm.style.setProperty('--arm-deg', `${deg.toFixed(2)}deg`);
  }

  function initStudioTurntable() {
    if (isMobileMusicEnv()) return; // Mobile uses pure CSS compositor spin & skips 36-bar visualizer ring
    const ring = document.getElementById('vinylVisualizerRing');
    if (ring && !ring.children.length) {
      const count = 36;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const bar = document.createElement('i');
        const angle = (360 / count) * i;
        const h = 12 + ((i * 7) % 13);
        const dur = (0.55 + ((i * 13) % 7) * 0.1).toFixed(2);
        const delay = (-((i * 0.11) % 1.2)).toFixed(2);
        bar.style.transform = `rotate(${angle}deg)`;
        bar.style.setProperty('--vh', `${h}px`);
        bar.style.setProperty('--vd', `${dur}s`);
        bar.style.setProperty('--vdelay', `${delay}s`);
        frag.appendChild(bar);
      }
      ring.appendChild(frag);
    }

    const deck = document.getElementById('turntableDeck');
    const sleeve = document.getElementById('albumJacketSleeve');
    const flipBtn = document.getElementById('btnFlipDeckCover');

    if (elVinylDisc) {
      elVinylDisc.addEventListener('click', () => {
        if (elBtnPlayPause) elBtnPlayPause.click();
      });
    }
    const toggleCover = (e) => {
      e.stopPropagation();
      deck?.classList.toggle('cover-mode');
    };
    sleeve?.addEventListener('click', toggleCover);
    flipBtn?.addEventListener('click', toggleCover);
  }

  /* ── Persistent Apple Shell Dynamic Island Bridge ── */
  let lastShellPush = 0;
  function pushShellMusicState(force = false) {
    if (window.self === window.top) return;
    const now = performance.now();
    if (!force && now - lastShellPush < 220) return;
    lastShellPush = now;
    try {
      const curLyric = (parsedLyrics && currentLyricIndex >= 0 && parsedLyrics[currentLyricIndex]) || null;
      const pKey = getActivePlatformKey();
      const prof = getPlatformQualityProfile(pKey);
      const qualityOptions = Object.entries(prof.tiers).map(([k, v]) => ({ value: k, label: `${v.title} (${v.label})` }));
      const fxApi = window.__musicFxAPI;
      const fxSt = fxApi?.getState?.() || null;
      const fxOptions = fxApi?.getPresetOptions?.(pKey) || [];
      const qPrev = buildQueuePreview(30);
      const payload = {
        song: currentSong,
        isPlaying: !audio.paused && !audio.ended,
        currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        queueTitle: qPrev.title,
        queuePreview: qPrev.items,
        duration: (Number.isFinite(audio.duration) && audio.duration > 0) ? audio.duration : (currentSong?.duration || 0),
        lyricJp: curLyric?.jp || '',
        lyricZh: curLyric?.zh || '',
        isFav: currentSong ? isSongFavorited(currentSong) : false,
        playMode,
        volume: Math.round(baseMusicVolume * 100),
        platform: pKey,
        platformBrand: prof.brand,
        quality: currentQuality,
        qualityOptions,
        fxEnabled: !!fxSt?.enabled,
        fxPreset: fxSt?.enabled ? (fxSt.preset || 'ai_master') : 'off',
        fxOptions
      };
      if (window.parent?.__shinyShell?.updateMusic) {
        window.parent.__shinyShell.updateMusic(payload);
      } else {
        window.parent.postMessage({ type: 'shiny-shell-music', state: payload }, location.origin);
      }
    } catch {}
  }

  window.__musicAPI = {
    getPlaylist() {
      return { list: currentPlaylist, index: currentIndex, current: currentSong };
    },
    playAtIndex(idx, id) {
      if (typeof idx === 'number' && currentPlaylist[idx]) {
        currentIndex = idx;
        playSong(currentPlaylist[idx], true);
        return;
      }
      if (id) {
        const found = currentPlaylist.findIndex(s => String(s.id) === String(id));
        if (found >= 0) { currentIndex = found; playSong(currentPlaylist[found], true); }
      }
    },
    togglePlay() {
      if (elBtnPlayPause) elBtnPlayPause.click();
    },
    pause() {
      if (!audio.paused) {
        audio.pause();
        setPlayState(false);
      }
    },
    prev() {
      prevSong();
    },
    next() {
      nextSong();
    },
    toggleFav() {
      if (currentSong) toggleSongFavorite(currentSong);
    },
    cycleMode() {
      return typeof window.__musicCyclePlayMode === 'function' ? window.__musicCyclePlayMode(false) : playMode;
    },
    setMode(mode) {
      if (typeof window.__musicApplyPlayMode === 'function') window.__musicApplyPlayMode(mode, false);
      return playMode;
    },
    getMode() {
      return playMode;
    },
    setVolume(pct) {
      if (typeof window.__musicApplyVolume === 'function') window.__musicApplyVolume(Number(pct) / 100, true);
      else { baseMusicVolume = Math.max(0, Math.min(1, Number(pct) / 100)); applyEffectiveAudioVolume(); }
    },
    getVolume() {
      return Math.round(baseMusicVolume * 100);
    },
    getQuality() {
      return currentQuality;
    },
    setQuality(q) {
      selectQuality(q);
      pushShellMusicState(true);
    },
    getPlatform() {
      return getActivePlatformKey();
    },
    setFxPreset(presetKey) {
      const fxApi = window.__musicFxAPI;
      if (!fxApi) return;
      if (!presetKey || presetKey === 'off') {
        fxApi.setEnabled(false);
      } else {
        fxApi.setPreset(presetKey);
      }
      pushShellMusicState(true);
    },
    openFxStudio() {
      window.__musicFxAPI?.open?.();
    },
    setVoiceDuck(speaking) {
      voiceDucked = !!speaking;
      applyEffectiveAudioVolume();
    },
    seekPercent(pct) {
      const dur = (Number.isFinite(audio.duration) && audio.duration > 0) ? audio.duration : (currentSong?.duration || 0);
      if (dur > 0) {
        audio.currentTime = Math.max(0, Math.min(dur, dur * pct));
        pushShellMusicState(true);
      }
    },
    openDownloads() {
      openDownloadManager();
    },
    playSongById(id, fallbackSong) {
      let target = (catalogData?.songs || []).find(s => s.id === id);
      if (!target && franchiseCatalogs) {
        for (const fr of Object.values(franchiseCatalogs)) {
          target = (fr?.songs || []).find(s => s.id === id);
          if (target) break;
        }
      }
      if (!target) target = fallbackSong;
      if (target) {
        playSong(target, true);
        pushShellMusicState(true);
      }
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
