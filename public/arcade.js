/* ═══════════════════════════════════════════════════════════════════════════
   283 VIP ARCADE ENGINE
   Dou Dizhu (3P) · Guandan (2v2 108-card) · Daifugo (4P) · Voice Quiz · Memory
   Features: AI Thinking Time · Full Voice Completion · 3-Tier Strategic AI
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);

  let portraits = [];
  let voiceIndex = [];
  let daifugoVoiceMap = new Map();
  let cardPool = [];
  let activeAudio = null;

  /* ── Arcade Voice Volume & Strict Foreground Guard (NEVER leaks voices onto other pages!) ── */
  function getArcadeVoiceVolume() {
    try {
      const saved = localStorage.getItem('shiny.arcade.voiceVolume');
      if (saved !== null && saved !== '' && Number.isFinite(Number(saved))) {
        return Math.max(0, Math.min(1, Number(saved) / 100));
      }
    } catch {}
    return 0.78;
  }

  function syncArcadeVoiceVolumeUI() {
    const slider = $('#arcVoiceVolume');
    if (!slider) return;
    slider.value = String(Math.round(getArcadeVoiceVolume() * 100));
  }

  $('#arcVoiceVolume')?.addEventListener('input', (e) => {
    const pct = Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0)));
    try { localStorage.setItem('shiny.arcade.voiceVolume', String(pct)); } catch {}
    try { window.desktop?.saveState?.({ 'shiny.arcade.voiceVolume': String(pct) }); } catch {}
    if (activeAudio) {
      activeAudio.volume = pct / 100;
      if (pct === 0) stopActiveVoice();
    }
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'shiny.arcade.voiceVolume') {
      syncArcadeVoiceVolumeUI();
      if (activeAudio) {
        const v = getArcadeVoiceVolume();
        activeAudio.volume = v;
        if (v <= 0) stopActiveVoice();
      }
    }
  });
  syncArcadeVoiceVolumeUI();

  let arcadeTabVisible = (() => {
    try {
      if (window.parent && window.parent !== window) {
        const ap = window.parent.__shinyShell?.activePage?.();
        if (typeof ap === 'string' && ap) return ap === 'arcade.html';
        if (window.frameElement) return window.frameElement.classList.contains('is-active');
      }
    } catch {}
    return !document.hidden;
  })();
  let fgWaiters = [];

  function isArcadeForeground() {
    if (document.hidden || !arcadeTabVisible) return false;
    try {
      if (window.parent && window.parent !== window) {
        const ap = window.parent.__shinyShell?.activePage?.();
        if (typeof ap === 'string' && ap && ap !== 'arcade.html') return false;
        if (window.frameElement && !window.frameElement.classList.contains('is-active')) return false;
      }
    } catch {}
    return true;
  }

  function stopActiveVoice() {
    if (activeAudio) {
      try { activeAudio.pause(); activeAudio.currentTime = 0; } catch {}
      activeAudio = null;
    }
  }

  function waitUntilArcadeForeground(serial) {
    if (isArcadeForeground()) return Promise.resolve(serial === gameSerial);
    return new Promise(resolve => {
      fgWaiters.push(() => resolve(serial === gameSerial));
    });
  }

  function onArcadeForegroundChange(isFg) {
    arcadeTabVisible = !!isFg;
    if (!arcadeTabVisible) {
      stopActiveVoice();
    } else if (fgWaiters.length) {
      const list = fgWaiters.splice(0, fgWaiters.length);
      for (const fn of list) { try { fn(); } catch {} }
    }
  }

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'shiny-shell-visibility' || e.data.type === 'shiny-shell-active') {
      onArcadeForegroundChange(!!e.data.active);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopActiveVoice();
    else onArcadeForegroundChange(isArcadeForeground());
  });
  window.addEventListener('pagehide', stopActiveVoice);

  /* ── Audio Engine: plays official idol voice ONLY when Arcade is in foreground ── */
  function playVoiceAndWait(key, maxMs = 4200) {
    return new Promise(resolve => {
      const vol = getArcadeVoiceVolume();
      if (!key || !$('#arcVoiceEnabled')?.checked || vol <= 0 || !isArcadeForeground()) return resolve();
      try {
        stopActiveVoice();
        const a = new Audio('/asset/' + key);
        activeAudio = a;
        a.volume = vol;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          if (activeAudio === a) activeAudio = null;
          resolve();
        };
        const timer = setTimeout(finish, maxMs);
        a.onended = finish;
        a.onerror = finish;
        a.onpause = finish;
        a.play().catch(finish);
      } catch {
        resolve();
      }
    });
  }

  function pickIdolVoiceKey(charId, kind) {
    if (!charId) return '';
    const bank = daifugoVoiceMap.get(charId);
    if (!bank) return '';
    const arr = bank[kind]?.length ? bank[kind] : bank.play;
    return arr?.length ? arr[Math.floor(Math.random() * arr.length)] : '';
  }

  /* ── Tab Switcher ───────────────────────────────────────────────────── */
  let currentTab = 'ddz';
  document.querySelectorAll('.lounge-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const g = btn.dataset.game;
      currentTab = g;
      document.querySelectorAll('.lounge-tab').forEach(b => b.classList.toggle('active', b === btn));
      const isCard = ['ddz', 'guandan', 'daifugo'].includes(g);
      $('#panel-cardtable').classList.toggle('active', isCard);
      $('#panel-voicequiz').classList.toggle('active', g === 'voicequiz');
      $('#panel-memory').classList.toggle('active', g === 'memory');
      if (isCard) startCardGame(g, false);
      if (g === 'voicequiz' && !vqInitialized) initVoiceQuiz();
      if (g === 'memory' && !mmInitialized) initMemory();
    });
  });

  /* ── Official Enza Idol Expression Stickers (官服表情包系统) ───────────── */
  const EMOTES = {
    happy:  ['好耶♪', '漂亮！', '哼哼～', '顺手！', '得意♪'],
    panic:  ['别跑啊！', '糟了！', '等等…', '呜哇！', '要被跑掉了！'],
    sad:    ['过不了…', '呜呜…', '下次赢回来！', '饶了我吧…'],
    smug:   ['接招吧！', '炸翻全场！', '看我的！', '稳了♪'],
    cheer:  ['大胜利！', '搭档最棒！', '太开心啦♪']
  };

  function pickOfficialSticker(charId, mood) {
    const num = Number(charId);
    if (!Number.isFinite(num) || num < 1 || num > 31) return null;
    const cid = String(num).padStart(3, '0');
    const pools = {
      cheer: [
        { url: `/asset-original/images/content/characters/memory_roulette_good/${cid}.png`, wide: true },
        { url: `/asset-original/images/content/characters/icon_cb_square/${cid}.png`, wide: false },
        { url: `/asset-original/images/content/characters/icon_endurance_level_1/${cid}.png`, wide: false }
      ],
      happy: [
        { url: `/asset-original/images/content/characters/icon_endurance_level_1/${cid}.png`, wide: false },
        { url: `/asset-original/images/content/characters/icon_cb_square/${cid}.png`, wide: false },
        { url: `/asset-original/images/content/characters/icon_endurance_level_3/${cid}.png`, wide: false }
      ],
      smug: [
        { url: `/asset-original/images/content/characters/icon_endurance_level_2/${cid}.png`, wide: false },
        { url: `/asset-original/images/content/characters/icon_endurance_level_1/${cid}.png`, wide: false }
      ],
      panic: [
        { url: `/asset-original/images/content/characters/icon_endurance_level_4/${cid}.png`, wide: false },
        { url: `/asset-original/images/content/characters/icon_endurance_level_5/${cid}.png`, wide: false }
      ],
      sad: [
        { url: `/asset-original/images/content/characters/memory_roulette_bad/${cid}.png`, wide: true },
        { url: `/asset-original/images/content/characters/icon_endurance_level_5/${cid}.png`, wide: false }
      ]
    };
    const arr = pools[mood] || pools.happy;
    return arr[Math.floor(Math.random() * arr.length)];
  }
  window.ShinyOfficialSticker = pickOfficialSticker;

  function renderEmotePopHtml(emote) {
    if (!emote) return '';
    const imgHtml = emote.stickerUrl
      ? `<img class="emote-sticker ${emote.wide ? 'is-wide' : ''}" src="${emote.stickerUrl}" alt="" onerror="this.remove()">`
      : '';
    return `<div class="idol-emote-pop mood-${emote.mood}">${imgHtml}<span class="emote-caption">${emote.text}</span></div>`;
  }
  window.ShinyRenderEmotePop = renderEmotePopHtml;

  function setEmote(player, mood) {
    if (!player || player.id === 0) return;
    const list = EMOTES[mood] || EMOTES.happy;
    const st = pickOfficialSticker(player.charId, mood);
    player.emote = {
      text: list[Math.floor(Math.random() * list.length)],
      mood,
      stickerUrl: st?.url || '',
      wide: Boolean(st?.wide),
      at: Date.now()
    };
    const snapAt = player.emote.at;
    setTimeout(() => {
      if (player.emote && player.emote.at === snapAt) {
        player.emote = null;
        renderCardTable();
      }
    }, 4500);
  }

  /* ── Data Loader ────────────────────────────────────────────────────── */
  async function loadArcadeData() {
    const [pRes, vRes, cRes] = await Promise.allSettled([
      fetch('/portraits.json').then(r => r.json()),
      fetch('/data/voice-index.json').then(r => r.json()),
      fetch('/data/card-media.json').then(r => r.json())
    ]);
    if (pRes.status === 'fulfilled' && Array.isArray(pRes.value)) {
      portraits = pRes.value.filter(p => /^\d+$/.test(String(p.id)) && Number(p.id) >= 1 && Number(p.id) <= 28);
    }
    if (vRes.status === 'fulfilled' && Array.isArray(vRes.value)) {
      voiceIndex = vRes.value;
      for (const v of voiceIndex) {
        if (!/daifugo/i.test(v.key || '')) continue;
        const cid = String(v.characterId || '').padStart(3, '0');
        if (!daifugoVoiceMap.has(cid)) daifugoVoiceMap.set(cid, { pass: [], clear: [], eight: [], rev: [], play: [] });
        const b = daifugoVoiceMap.get(cid);
        if (/pass/i.test(v.key)) b.pass.push(v.key);
        else if (/clear|win/i.test(v.key)) b.clear.push(v.key);
        else if (/eight/i.test(v.key)) b.eight.push(v.key);
        else if (/revol|kakumei/i.test(v.key)) b.rev.push(v.key);
        else b.play.push(v.key);
      }
    }
    if (cRes.status === 'fulfilled' && Array.isArray(cRes.value)) {
      cardPool = cRes.value.filter(c => !c.metadataPending && Array.isArray(c.images) && c.images.length);
    }
    startCardGame('ddz', true);
  }

  /* ═══════════════════════════════════════════════════════════════════════
     UNIFIED STRATEGIC CARD ENGINE (Dou Dizhu · Guandan 2v2 · Daifugo)
     ═══════════════════════════════════════════════════════════════════════ */
  const SUITS = ['♠', '♥', '♣', '♦'];
  const RANK_DEFS = [
    { label: '3', val: 3 }, { label: '4', val: 4 }, { label: '5', val: 5 },
    { label: '6', val: 6 }, { label: '7', val: 7 }, { label: '8', val: 8 },
    { label: '9', val: 9 }, { label: '10', val: 10 }, { label: 'J', val: 11 },
    { label: 'Q', val: 12 }, { label: 'K', val: 13 }, { label: 'A', val: 14 },
    { label: '2', val: 15 }
  ];

  const MODE_META = {
    ddz: {
      title: '283 斗地主',
      rules: '✨ 本局 AI 并非普通脚本机器人：进阶/大师难度内置开源深度强化学习模型 DouZero（千万局自博弈训练），离线本地神经网络推理。'
    },
    guandan: {
      title: '283 掼蛋 2v2',
      rules: '✨ 本局 AI 并非普通脚本机器人：进阶/大师难度内置开源强化学习模型 DanZero（rlcard-guandan 神经网络），离线本地推理，支持逢人配与进还贡。'
    },
    daifugo: {
      title: '283 大富豪',
      rules: '✨ 4人官方大富豪 · 3最小、2与Joker最大 · 出8触发「8切」清场续出 · 4张同点触发「革命」大小反转。'
    }
  };

  // Mature Guandan pattern tables (our RANK_DEFS: 3..13, A=14, 2=15)
  // Ordered highest -> lowest so wildcard matching always picks the strongest valid sequence!
  const GUANDAN_STRAIGHTS = [
    { vals: [10, 11, 12, 13, 14], high: 14 }, // 10-J-Q-K-A
    { vals: [9, 10, 11, 12, 13],  high: 13 },
    { vals: [8, 9, 10, 11, 12],   high: 12 },
    { vals: [7, 8, 9, 10, 11],    high: 11 },
    { vals: [6, 7, 8, 9, 10],     high: 10 },
    { vals: [5, 6, 7, 8, 9],      high: 9 },
    { vals: [4, 5, 6, 7, 8],      high: 8 },
    { vals: [3, 4, 5, 6, 7],      high: 7 },
    { vals: [15, 3, 4, 5, 6],     high: 6 },  // 2-3-4-5-6
    { vals: [14, 15, 3, 4, 5],    high: 5 }   // A-2-3-4-5 (最小顺子)
  ];
  const GUANDAN_PAIRS = [
    { vals: [12, 13, 14], high: 14 }, { vals: [11, 12, 13], high: 13 },
    { vals: [10, 11, 12], high: 12 }, { vals: [9, 10, 11],  high: 11 },
    { vals: [8, 9, 10],   high: 10 }, { vals: [7, 8, 9],    high: 9 },
    { vals: [6, 7, 8],    high: 8 },  { vals: [5, 6, 7],    high: 7 },
    { vals: [4, 5, 6],    high: 6 },  { vals: [3, 4, 5],    high: 5 },
    { vals: [15, 3, 4],   high: 4 },  { vals: [14, 15, 3],  high: 3 }
  ];
  const GUANDAN_PLANES = [
    { vals: [13, 14], high: 14 }, { vals: [12, 13], high: 13 },
    { vals: [11, 12], high: 12 }, { vals: [10, 11], high: 11 },
    { vals: [9, 10],  high: 10 }, { vals: [8, 9],   high: 9 },
    { vals: [7, 8],   high: 8 },  { vals: [6, 7],   high: 7 },
    { vals: [5, 6],   high: 6 },  { vals: [4, 5],   high: 5 },
    { vals: [3, 4],   high: 4 },  { vals: [15, 3],  high: 3 },
    { vals: [14, 15], high: 2 }
  ];

  // Guandan level progression order: 2(15) -> 3 -> 4 -> ... -> K(13) -> A(14)
  const GUANDAN_LEVEL_SEQ = [15, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  function levelRankLabel(val) {
    if (val === 15) return '2';
    if (val === 14) return 'A';
    if (val === 13) return 'K';
    if (val === 12) return 'Q';
    if (val === 11) return 'J';
    return String(val);
  }
  function advanceGuandanLevel(curVal, steps) {
    const idx = Math.max(0, GUANDAN_LEVEL_SEQ.indexOf(curVal));
    const nextIdx = Math.min(GUANDAN_LEVEL_SEQ.length - 1, idx + steps);
    return GUANDAN_LEVEL_SEQ[nextIdx];
  }

  let gameSerial = 0;
  let ct = {
    mode: 'ddz',
    phase: 'play', // 'bid' | 'play' | 'over'
    players: [],
    turn: 0,
    pile: null, // { owner, cards, combo }
    passCount: 0,
    kitty: [],
    landlord: -1,
    bidStep: 0,
    levelRank: 15, // Guandan active level card (15 = 2, 3..14 = 3..A)
    redLevel: 15,
    blueLevel: 15,
    dealerTeam: 'red',
    lastGuandanFinish: null, // [1st, 2nd, 3rd, 4th] from previous Guandan round for strict tribute & lead order
    tribute: null, // Active Guandan tribute state when phase === 'tribute'
    revolution: false,
    finishOrder: [],
    selected: new Set(),
    prePlayQueued: false, // Pre-selected combo armed to auto-play immediately on player's turn!
    sfReserve: [], // Guandan Straight Flush Reserve Tray: [{ id, cards, combo, suit }]
    sfReserveSeq: 1,
    playedCards: [], // All cards played so far in this round (for Pro Card Tracker!)
    playedByPlayer: [[], [], [], []], // Per-seat played cards (for DouZero / DanZero NN features)
    lastMoveByPlayer: [null, null, null, null], // Most recent play per seat
    actionHistory: [], // Sequence of played card arrays ([] for PASS) for DouZero LSTM
    bombNum: 0, // Bombs played this round (for DouZero)
    trackerEnabled: (() => { try { return localStorage.getItem('shiny.arcade.tracker') !== 'false'; } catch { return true; } })(),
    fastFinish: false,
    wins: Number(localStorage.getItem('shiny.arcade.wins') || 0)
  };

  function isGuandanWild(c, mode = ct.mode) {
    return mode === 'guandan' && !c.joker && c.suit === '♥' && c.val === ct.levelRank;
  }

  function matchGuandanSequence(normals, wildCount, patterns, copiesPerRank) {
    const valCounts = new Map();
    for (const c of normals) {
      valCounts.set(c.val, (valCounts.get(c.val) || 0) + 1);
    }
    for (const pat of patterns) {
      const set = new Set(pat.vals);
      let ok = true;
      for (const [v, cnt] of valCounts.entries()) {
        if (!set.has(v) || cnt > copiesPerRank) { ok = false; break; }
      }
      if (!ok) continue;
      let missing = 0;
      for (const v of pat.vals) missing += copiesPerRank - (valCounts.get(v) || 0);
      if (missing === wildCount) return pat;
    }
    return null;
  }

  function orderGuandanStraightCards(cards, pat) {
    if (!pat) return cards.slice();
    const normals = cards.filter(c => !isGuandanWild(c, 'guandan'));
    const wilds = cards.filter(c => isGuandanWild(c, 'guandan'));
    const out = [];
    const used = new Set();
    let wi = 0;
    for (const v of pat.vals) {
      const hit = normals.find(c => c.val === v && !used.has(c.uid));
      if (hit) {
        used.add(hit.uid);
        out.push(hit);
      } else if (wi < wilds.length) {
        out.push(wilds[wi++]);
      }
    }
    return out;
  }

  function getDifficulty() {
    return $('#arcDifficulty')?.value || 'pro';
  }

  /* ── Unbiased Cryptographic RNG & Fisher-Yates Shuffle (True Random — Zero Player/AI Bias) ── */
  function trueRandomInt(max) {
    if (max <= 1) return 0;
    if (window.crypto?.getRandomValues) {
      const limit = Math.floor(0x100000000 / max) * max;
      const buf = new Uint32Array(1);
      let x = 0;
      do {
        window.crypto.getRandomValues(buf);
        x = buf[0];
      } while (x >= limit);
      return x % max;
    }
    return Math.floor(Math.random() * max);
  }

  function trueShuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = trueRandomInt(i + 1);
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function makeDecks(numDecks = 1) {
    const deck = [];
    let uid = 1;
    for (let d = 0; d < numDecks; d++) {
      for (const s of SUITS) {
        for (const r of RANK_DEFS) {
          deck.push({ uid: uid++, suit: s, label: r.label, val: r.val, red: s === '♥' || s === '♦', joker: 0 });
        }
      }
      deck.push({ uid: uid++, suit: '☆', label: '小王', val: 16, red: false, joker: 1 });
      deck.push({ uid: uid++, suit: '★', label: '大王', val: 17, red: true, joker: 2 });
    }
    return trueShuffle(deck);
  }

  function cardRankScore(c, mode = ct.mode) {
    if (mode === 'daifugo') {
      if (c.joker) return 99;
      return ct.revolution ? (18 - c.val) : c.val;
    }
    if (mode === 'guandan') {
      if (c.joker === 2) return 18;
      if (c.joker === 1) return 17;
      if (c.val === ct.levelRank) return 16; // Current level card ranks just below Jokers
      if (c.val === 15) return 2; // In Guandan, when 2 is NOT the level card, 2 is the smallest rank (below 3)!
      return c.val;
    }
    return c.val; // DDZ: 3..15(2), 16(小王), 17(大王)
  }

  function sortHand(hand, mode = ct.mode) {
    hand.sort((a, b) => {
      const aw = isGuandanWild(a, mode) ? 1 : 0;
      const bw = isGuandanWild(b, mode) ? 1 : 0;
      if (aw !== bw) return bw - aw; // Keep ♥2 逢人配 grouped visibly at left of level cards
      return cardRankScore(b, mode) - cardRankScore(a, mode) || a.suit.localeCompare(b.suit) || a.uid - b.uid;
    });
  }

  /* ── Combo Classifier (DDZ / Guandan w/ 逢人配 & A2345..10JQKA / Daifugo) ── */
  function classifyCombo(cards, mode = ct.mode) {
    if (!cards || !cards.length) return null;
    const n = cards.length;

    // 1. DAIFUGO
    if (mode === 'daifugo') {
      const nonJ = cards.filter(c => !c.joker);
      if (!nonJ.length) return { type: 'same', count: n, main: 99, bomb: 0, isEight: false, isRev: n >= 4, name: n > 1 ? '王牌组' : 'Joker' };
      const v0 = nonJ[0].val;
      if (!nonJ.every(c => c.val === v0)) return null;
      return {
        type: 'same', count: n, main: cardRankScore(nonJ[0], 'daifugo'), bomb: 0,
        isEight: v0 === 8, isRev: n >= 4,
        name: n >= 4 ? '革命四张' : n === 3 ? '三张' : n === 2 ? '对子' : '单张'
      };
    }

    const jokers = cards.filter(c => c.joker > 0);

    // 2. GUANDAN (Mature Standard National Rules + ♥2 逢人配 Wildcard!)
    if (mode === 'guandan') {
      // 四王天王炸 (strongest bomb = 100)
      if (n === 4 && jokers.length === 4) {
        return { type: 'rocket', count: 4, main: 999, bomb: 100, name: '👑 天王炸' };
      }

      const wilds = cards.filter(c => isGuandanWild(c, 'guandan'));
      const normals = cards.filter(c => !isGuandanWild(c, 'guandan'));
      const w = wilds.length;

      // Single
      if (n === 1) {
        return { type: 'single', count: 1, main: cardRankScore(cards[0], 'guandan'), bomb: 0, name: isGuandanWild(cards[0], 'guandan') ? '单张（逢人配）' : '单张' };
      }

      // Pair of identical Jokers (双小王 / 双大王)
      if (n === 2 && jokers.length === 2 && cards[0].joker === cards[1].joker) {
        return { type: 'pair', count: 2, main: cardRankScore(cards[0], 'guandan'), bomb: 0, name: cards[0].joker === 2 ? '双大王' : '双小王' };
      }

      // Non-joker rank map for normals
      const normByRank = new Map();
      for (const c of normals) {
        const rk = cardRankScore(c, 'guandan');
        normByRank.set(rk, (normByRank.get(rk) || 0) + 1);
      }
      const normRanks = [...normByRank.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

      // 6~10 card Bomb (beats Straight Flush!)
      if (jokers.length === 0 && n >= 6 && normRanks.length <= 1) {
        const main = normRanks.length ? normRanks[0][0] : 16;
        return { type: 'bomb', count: n, main, bomb: n * 10, name: `💣 ${n}张超级炸弹` };
      }

      // Straight Flush (同花顺: 5 same suit consecutive A2345..10JQKA, beats 4/5-card bomb -> bomb=55!)
      if (n === 5 && jokers.length === 0) {
        const sameSuit = normals.length === 0 || normals.every(c => c.suit === normals[0].suit);
        if (sameSuit) {
          const sfPat = matchGuandanSequence(normals, w, GUANDAN_STRAIGHTS, 1);
          if (sfPat) {
            return {
              type: 'sf', count: 5, main: sfPat.high, bomb: 55,
              suit: normals[0]?.suit || '♥', pattern: sfPat,
              name: w > 0 ? '🌈 同花顺（配）' : '🌈 同花顺'
            };
          }
        }
      }

      // 4~5 card Bomb (bomb=40 / 50)
      if (jokers.length === 0 && (n === 4 || n === 5) && normRanks.length <= 1) {
        const main = normRanks.length ? normRanks[0][0] : 16;
        return { type: 'bomb', count: n, main, bomb: n * 10, name: n === 5 ? '💣 5张超级炸弹' : '💣 炸弹' };
      }

      // Pair / Triple (non-joker, wildcards allowed)
      if (jokers.length === 0 && n === 2 && normRanks.length <= 1) {
        const main = normRanks.length ? normRanks[0][0] : 16;
        return { type: 'pair', count: 2, main, bomb: 0, name: '对子' };
      }
      if (jokers.length === 0 && n === 3 && normRanks.length <= 1) {
        const main = normRanks.length ? normRanks[0][0] : 16;
        return { type: 'triple', count: 3, main, bomb: 0, name: '三张' };
      }

      // Triple + Pair (三带二 / 夯; allows double identical jokers as kicker pair!)
      if (n === 5 && (jokers.length === 0 || (jokers.length === 2 && jokers[0].joker === jokers[1].joker))) {
        if (jokers.length === 2) {
          // 2 identical jokers MUST be the pair; remaining 3 (normals+wilds) must form 1 triple
          const nonJNormals = normals.filter(c => !c.joker);
          const rkSet = new Set(nonJNormals.map(c => cardRankScore(c, 'guandan')));
          if (rkSet.size <= 1) {
            const main = rkSet.size ? [...rkSet][0] : 16;
            return { type: 'triple2', count: 5, main, bomb: 0, name: '三带二（夯）' };
          }
        } else if (normRanks.length === 2) {
          // Pick highest possible rank as the Triple if wilds can complete it
          const [rA, rB] = normRanks[0][0] >= normRanks[1][0] ? [normRanks[0], normRanks[1]] : [normRanks[1], normRanks[0]];
          for (const [tri, par] of [[rA, rB], [rB, rA]]) {
            if (tri[1] <= 3 && par[1] <= 2 && (3 - tri[1]) + (2 - par[1]) === w) {
              return { type: 'triple2', count: 5, main: tri[0], bomb: 0, name: '三带二（夯）' };
            }
          }
        }
      }

      // Straight (5-card顺子: A2345..10JQKA, mixed suits, wildcards allowed!)
      if (n === 5 && jokers.length === 0) {
        const stPat = matchGuandanSequence(normals, w, GUANDAN_STRAIGHTS, 1);
        if (stPat) {
          return {
            type: 'straight', count: 5, main: stPat.high, bomb: 0, pattern: stPat,
            name: w > 0 ? '🌊 顺子（配）' : '🌊 顺子'
          };
        }
      }

      // 3 Consecutive Pairs (连对 / 木板, 6 cards, A-2-3..Q-K-A, wildcards allowed!)
      if (n === 6 && jokers.length === 0) {
        const prPat = matchGuandanSequence(normals, w, GUANDAN_PAIRS, 2);
        if (prPat) {
          return { type: 'pairs', count: 6, main: prPat.high, bomb: 0, pattern: prPat, name: '连对（木板）' };
        }
        const plPat = matchGuandanSequence(normals, w, GUANDAN_PLANES, 3);
        if (plPat) {
          return { type: 'plane', count: 6, main: plPat.high, bomb: 0, pattern: plPat, name: '钢板' };
        }
      }

      return null;
    }

    // 3. DOU DIZHU (DDZ)
    const counts = new Map();
    for (const c of cards) {
      const k = cardRankScore(c, mode);
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);

    if (n === 2 && jokers.length === 2) {
      return { type: 'rocket', count: 2, main: 999, bomb: 100, name: '🚀 王炸' };
    }
    if (entries.length === 1 && jokers.length === 0 && n >= 4) {
      return { type: 'bomb', count: n, main: entries[0][0], bomb: n * 10, name: '💣 炸弹' };
    }
    if (n === 1) return { type: 'single', count: 1, main: entries[0][0], bomb: 0, name: '单张' };
    if (n === 2 && entries.length === 1) return { type: 'pair', count: 2, main: entries[0][0], bomb: 0, name: '对子' };
    if (n === 3 && entries.length === 1) return { type: 'triple', count: 3, main: entries[0][0], bomb: 0, name: '三张' };
    if (n === 4 && entries[0][1] === 3) return { type: 'triple1', count: 4, main: entries[0][0], bomb: 0, name: '三带一' };
    if (n === 5 && entries.length === 2 && entries[0][1] === 3 && entries[1][1] === 2) {
      return { type: 'triple2', count: 5, main: entries[0][0], bomb: 0, name: '三带二' };
    }
    if (n === 6 && entries[0][1] === 4) return { type: 'four2', count: 6, main: entries[0][0], bomb: 0, name: '四带二' };

    if (jokers.length === 0 && entries.length === n && n >= 5) {
      const vals = cards.map(c => c.val).sort((a, b) => a - b);
      if (vals[vals.length - 1] <= 14 && vals.every((v, i) => i === 0 || v === vals[i - 1] + 1)) {
        return { type: 'straight', count: n, main: vals[vals.length - 1], bomb: 0, name: '🌊 顺子' };
      }
    }
    if (jokers.length === 0 && n >= 6 && n % 2 === 0 && entries.every(e => e[1] === 2)) {
      const vals = [...new Set(cards.map(c => c.val))].sort((a, b) => a - b);
      if (vals[vals.length - 1] <= 14 && vals.every((v, i) => i === 0 || v === vals[i - 1] + 1)) {
        return { type: 'pairs', count: n, main: vals[vals.length - 1], bomb: 0, name: '连对' };
      }
    }
    if (jokers.length === 0 && n >= 6 && n % 3 === 0 && entries.every(e => e[1] === 3)) {
      const vals = [...new Set(cards.map(c => c.val))].sort((a, b) => a - b);
      if (vals[vals.length - 1] <= 14 && vals.every((v, i) => i === 0 || v === vals[i - 1] + 1)) {
        return { type: 'plane', count: n, main: vals[vals.length - 1], bomb: 0, name: '✈ 飞机' };
      }
    }

    // DDZ Plane with Single Wings (飞机带单翅膀: k>=2 consecutive triples 3..A + k singles = 4k cards)
    // and Plane with Pair Wings (飞机带双翅膀: k>=2 consecutive triples 3..A + k pairs = 5k cards)
    if (n >= 8) {
      const valCounts = new Map();
      for (const c of cards) {
        if (!c.joker && c.val <= 14) {
          valCounts.set(c.val, (valCounts.get(c.val) || 0) + 1);
        }
      }
      const tripleVals = [...valCounts.entries()]
        .filter(([, cnt]) => cnt >= 3)
        .map(([v]) => v)
        .sort((a, b) => a - b);

      const findHighestRun = (len) => {
        if (tripleVals.length < len) return null;
        let bestHigh = -1;
        for (let i = 0; i <= tripleVals.length - len; i++) {
          let ok = true;
          for (let j = 1; j < len; j++) {
            if (tripleVals[i + j] !== tripleVals[i + j - 1] + 1) { ok = false; break; }
          }
          if (ok) bestHigh = tripleVals[i + len - 1];
        }
        return bestHigh >= 0 ? bestHigh : null;
      };

      if (n % 4 === 0) {
        const k = n / 4;
        if (k >= 2) {
          const high = findHighestRun(k);
          if (high !== null) {
            return { type: 'plane1', count: n, main: high, bomb: 0, name: '✈ 飞机带单' };
          }
        }
      }

      if (n % 5 === 0) {
        const k = n / 5;
        if (k >= 2 && jokers.length === 0) {
          // Check every candidate consecutive run of length k (highest first) whose remaining cards are all pairs
          for (let i = tripleVals.length - k; i >= 0; i--) {
            let ok = true;
            for (let j = 1; j < k; j++) {
              if (tripleVals[i + j] !== tripleVals[i + j - 1] + 1) { ok = false; break; }
            }
            if (!ok) continue;
            const runSet = new Set(tripleVals.slice(i, i + k));
            const remCounts = new Map(counts);
            for (const rv of runSet) remCounts.set(rv, (remCounts.get(rv) || 0) - 3);
            let pairsOk = true;
            for (const [, rem] of remCounts) {
              if (rem < 0 || rem % 2 !== 0) { pairsOk = false; break; }
            }
            if (pairsOk) {
              return { type: 'plane2', count: n, main: tripleVals[i + k - 1], bomb: 0, name: '✈ 飞机带双' };
            }
          }
        }
      }

      // DDZ Four + Two Pairs (四带两对: 8 cards = 4 of a kind + 2 pairs)
      if (n === 8 && jokers.length === 0) {
        const quadEntries = entries.filter(e => e[1] === 4);
        if (quadEntries.length === 1 && entries.length === 3 && entries[1][1] === 2 && entries[2][1] === 2) {
          return { type: 'four2p', count: 8, main: quadEntries[0][0], bomb: 0, name: '四带两对' };
        }
        if (quadEntries.length === 2) {
          const highQuad = Math.max(quadEntries[0][0], quadEntries[1][0]);
          return { type: 'four2p', count: 8, main: highQuad, bomb: 0, name: '四带两对' };
        }
      }
    }

    return null;
  }

  function canBeatCombo(next, prev) {
    if (!next) return false;
    if (!prev) return true;
    if (next.bomb > prev.bomb) return true;
    if (next.bomb < prev.bomb) return false;
    if (next.type !== prev.type || next.count !== prev.count) return false;
    return next.main > prev.main;
  }

  /* ── Find Straight Flushes in Hand (Pure Natural First, Then ♥2 逢人配) ── */
  function findHandStraightFlushes(hand) {
    const found = [];
    const usedUids = new Set();
    const wildPool = hand.filter(c => isGuandanWild(c, 'guandan'));
    const usedWilds = new Set();

    // Pass 0: natural 0-wild SFs, Pass 1: 1-wild SFs, Pass 2: 2-wild SFs
    for (let maxWild = 0; maxWild <= Math.min(2, wildPool.length); maxWild++) {
      for (const suit of SUITS) {
        for (const pat of GUANDAN_STRAIGHTS) {
          const picked = [];
          let missing = 0;
          for (const v of pat.vals) {
            const c = hand.find(x => !x.joker && !isGuandanWild(x, 'guandan') && x.suit === suit && x.val === v && !usedUids.has(x.uid));
            if (c) picked.push(c);
            else missing++;
          }
          if (missing !== maxWild) continue;
          const availWilds = wildPool.filter(w => !usedWilds.has(w.uid));
          if (availWilds.length < missing) continue;
          const wildsUsed = availWilds.slice(0, missing);
          const allCards = orderGuandanStraightCards([...picked, ...wildsUsed], pat);
          const combo = classifyCombo(allCards, 'guandan');
          if (combo && combo.type === 'sf') {
            allCards.forEach(x => {
              usedUids.add(x.uid);
              if (isGuandanWild(x, 'guandan')) usedWilds.add(x.uid);
            });
            found.push({ cards: allCards, combo, suit, usedWild: missing });
          }
        }
      }
    }
    return found;
  }

  /* ── Find Bombs in Guandan Hand (天王炸 + 4~8张自然炸弹) ── */
  function findHandBombs(hand) {
    const found = [];
    const usedUids = new Set();

    // 1. 天王炸 (4 Jokers)
    const jokers = hand.filter(c => c.joker);
    if (jokers.length === 4) {
      const combo = classifyCombo(jokers, 'guandan');
      if (combo && combo.bomb > 0) {
        jokers.forEach(c => usedUids.add(c.uid));
        found.push({ cards: jokers.slice(), combo, label: '天王炸' });
      }
    }

    // 2. Natural 4~8 Bombs grouped by rank (excluding ♥level wilds unless there are 4+ of the level rank naturally)
    const byVal = new Map();
    for (const c of hand) {
      if (c.joker || usedUids.has(c.uid)) continue;
      if (!byVal.has(c.val)) byVal.set(c.val, []);
      byVal.get(c.val).push(c);
    }
    const entries = [...byVal.entries()].sort((a, b) => {
      if (b[1].length !== a[1].length) return b[1].length - a[1].length;
      return cardRankScore(b[1][0], 'guandan') - cardRankScore(a[1][0], 'guandan');
    });
    for (const [, grp] of entries) {
      // Keep non-wild cards first; include wild cards if they are of the same rank and needed/natural
      const nonWilds = grp.filter(c => !isGuandanWild(c, 'guandan'));
      const pick = nonWilds.length >= 4 ? grp : (grp.length >= 4 ? grp : null);
      if (!pick) continue;
      const combo = classifyCombo(pick, 'guandan');
      if (combo && combo.bomb > 0) {
        pick.forEach(c => usedUids.add(c.uid));
        found.push({ cards: pick.slice(), combo, label: combo.name || `${pick.length}炸` });
      }
    }
    return found;
  }

  /* ── Smart Candidate Generator & 3-Tier Strategic AI ── */
  function generateAllLegalMoves(hand, prevCombo, mode = ct.mode) {
    const byRank = new Map();
    for (const c of hand) {
      const k = cardRankScore(c, mode);
      if (!byRank.has(k)) byRank.set(k, []);
      byRank.get(k).push(c);
    }
    const ranksAsc = [...byRank.keys()].sort((a, b) => a - b);
    const moves = [];
    const seen = new Set();
    const pushIfLegal = (cards) => {
      const combo = classifyCombo(cards, mode);
      if (!combo || !canBeatCombo(combo, prevCombo)) return;
      const sig = `${combo.type}:${combo.count}:${combo.main}:${combo.bomb}:${cards.map(c => c.uid).sort((a, b) => a - b).join(',')}`;
      if (seen.has(sig)) return;
      seen.add(sig);
      moves.push({ cards, combo });
    };

    // Singles, Pairs, Triples, Bombs
    for (const r of ranksAsc) {
      const grp = byRank.get(r);
      for (let k = 1; k <= grp.length; k++) {
        if (k <= 3 || k >= 4) pushIfLegal(grp.slice(0, k));
      }
    }

    if (mode === 'guandan') {
      const wilds = hand.filter(c => isGuandanWild(c, 'guandan'));
      const nonWilds = hand.filter(c => !isGuandanWild(c, 'guandan') && !c.joker);

      // Wild-boosted Bombs (3+1w, 4+1w, 4+2w, etc.)
      if (wilds.length > 0) {
        const byRkNW = new Map();
        for (const c of nonWilds) {
          const rk = cardRankScore(c, 'guandan');
          if (!byRkNW.has(rk)) byRkNW.set(rk, []);
          byRkNW.get(rk).push(c);
        }
        for (const grp of byRkNW.values()) {
          for (let w = 1; w <= wilds.length; w++) {
            if (grp.length + w >= 4) pushIfLegal([...grp, ...wilds.slice(0, w)]);
          }
        }
      }

      // Triple + Pair (夯)
      const triples = ranksAsc.filter(r => byRank.get(r).length >= 3 && r < 17);
      const pairs = ranksAsc.filter(r => byRank.get(r).length === 2);
      for (const tr of triples) {
        const pairK = pairs.find(p => p !== tr) ?? ranksAsc.find(p => p !== tr && byRank.get(p).length >= 2 && byRank.get(p).length < 4);
        if (pairK !== undefined) pushIfLegal([...byRank.get(tr).slice(0, 3), ...byRank.get(pairK).slice(0, 2)]);
      }

      // All 10 Guandan Straight Flush patterns per suit (0..wilds.length wildcards)
      for (const suit of SUITS) {
        for (const pat of GUANDAN_STRAIGHTS) {
          const picked = [];
          let missing = 0;
          for (const v of pat.vals) {
            const c = nonWilds.find(x => x.suit === suit && x.val === v);
            if (c) picked.push(c);
            else missing++;
          }
          if (missing <= wilds.length) {
            pushIfLegal(orderGuandanStraightCards([...picked, ...wilds.slice(0, missing)], pat));
          }
        }
      }

      // All 10 Guandan 5-card Mixed-Suit Straights (A2345..10JQKA, preferring non-wild!)
      const byValNW = new Map();
      for (const c of nonWilds) {
        if (!byValNW.has(c.val)) byValNW.set(c.val, []);
        byValNW.get(c.val).push(c);
      }
      for (const pat of GUANDAN_STRAIGHTS) {
        const picked = [];
        let missing = 0;
        for (const v of pat.vals) {
          const list = byValNW.get(v);
          if (list && list.length) {
            // Pick a card with different suit from first card if available so we don't accidentally downgrade a SF
            const alt = picked.length ? list.find(x => x.suit !== picked[0].suit) : null;
            picked.push(alt || list[0]);
          } else missing++;
        }
        if (missing === 0) {
          pushIfLegal(orderGuandanStraightCards(picked, pat));
        } else if (missing === 1 && wilds.length >= 1 && prevCombo?.type === 'straight') {
          pushIfLegal(orderGuandanStraightCards([...picked, wilds[0]], pat));
        }
      }

      // All 12 Guandan 3-Pair (木板) patterns & 13 Steel Plate (钢板) patterns
      for (const pat of GUANDAN_PAIRS) {
        const seq = [];
        let ok = true;
        for (const v of pat.vals) {
          const list = byValNW.get(v);
          if (!list || list.length < 2) { ok = false; break; }
          seq.push(list[0], list[1]);
        }
        if (ok) pushIfLegal(seq);
      }
      for (const pat of GUANDAN_PLANES) {
        const seq = [];
        let ok = true;
        for (const v of pat.vals) {
          const list = byValNW.get(v);
          if (!list || list.length < 3) { ok = false; break; }
          seq.push(list[0], list[1], list[2]);
        }
        if (ok) pushIfLegal(seq);
      }

      // 四王天王炸
      const jokers = hand.filter(c => c.joker > 0);
      if (jokers.length === 4) pushIfLegal(jokers);
    } else if (mode === 'ddz') {
      // Triple + 1 / Triple + Pair
      const triples = ranksAsc.filter(r => byRank.get(r).length >= 3);
      const singles = ranksAsc.filter(r => byRank.get(r).length === 1);
      const pairs = ranksAsc.filter(r => byRank.get(r).length === 2);
      for (const tr of triples) {
        const kicker = singles.find(s => s !== tr) ?? ranksAsc.find(s => s !== tr && byRank.get(s).length < 4);
        if (kicker !== undefined) pushIfLegal([...byRank.get(tr).slice(0, 3), byRank.get(kicker)[0]]);
        const pairK = pairs.find(p => p !== tr) ?? ranksAsc.find(p => p !== tr && byRank.get(p).length >= 2 && byRank.get(p).length < 4);
        if (pairK !== undefined) pushIfLegal([...byRank.get(tr).slice(0, 3), ...byRank.get(pairK).slice(0, 2)]);
      }

      // Straights (5+ in DDZ, 3..A)
      const byVal = new Map();
      for (const c of hand) {
        if (c.joker || c.val > 14) continue;
        if (!byVal.has(c.val)) byVal.set(c.val, []);
        byVal.get(c.val).push(c);
      }
      for (let start = 3; start <= 10; start++) {
        const seq = [];
        for (let v = start; v <= 14; v++) {
          if (!byVal.has(v)) break;
          seq.push(byVal.get(v)[0]);
          if (seq.length >= 5) pushIfLegal(seq.slice());
        }
      }

      // Consecutive Pairs (3+ pairs)
      for (let start = 3; start <= 12; start++) {
        const seq = [];
        for (let v = start; v <= 14; v++) {
          if ((byVal.get(v)?.length || 0) < 2) break;
          seq.push(...byVal.get(v).slice(0, 2));
          if (seq.length >= 6) pushIfLegal(seq.slice());
        }
      }

      // Planes (飞机不带 / 飞机带单翅膀 / 飞机带双翅膀)
      for (let start = 3; start <= 13; start++) {
        const body = [];
        const bodyUids = new Set();
        let k = 0;
        for (let v = start; v <= 14; v++) {
          if ((byVal.get(v)?.length || 0) < 3) break;
          const tri = byVal.get(v).slice(0, 3);
          body.push(...tri);
          tri.forEach(c => bodyUids.add(c.uid));
          k++;
          if (k >= 2) {
            // Pure plane
            pushIfLegal(body.slice());

            // Plane + k single wings (prefer lowest singletons, then pairs/other remaining cards)
            const remCards = hand.filter(c => !bodyUids.has(c.uid));
            if (remCards.length >= k) {
              const remByRank = new Map();
              for (const c of remCards) {
                const rk = cardRankScore(c, 'ddz');
                if (!remByRank.has(rk)) remByRank.set(rk, []);
                remByRank.get(rk).push(c);
              }
              const singlePool = remCards.slice().sort((a, b) => {
                const ca = remByRank.get(cardRankScore(a, 'ddz')).length;
                const cb = remByRank.get(cardRankScore(b, 'ddz')).length;
                const pa = ca === 1 ? 0 : (ca === 2 ? 1 : (ca === 3 ? 2 : 3));
                const pb = cb === 1 ? 0 : (cb === 2 ? 1 : (cb === 3 ? 2 : 3));
                return pa - pb || cardRankScore(a, 'ddz') - cardRankScore(b, 'ddz') || a.uid - b.uid;
              });
              pushIfLegal([...body, ...singlePool.slice(0, k)]);
            }

            // Plane + k pair wings (prefer lowest natural pairs, then non-bomb triples)
            const pairUnits = [];
            for (const r of ranksAsc) {
              const remGrp = byRank.get(r).filter(c => !bodyUids.has(c.uid) && !c.joker);
              if (remGrp.length >= 2) {
                pairUnits.push({ pri: remGrp.length === 2 ? 0 : (remGrp.length === 3 ? 1 : 2), r, pair: remGrp.slice(0, 2) });
                if (remGrp.length === 4) {
                  pairUnits.push({ pri: 2, r, pair: remGrp.slice(2, 4) });
                }
              }
            }
            if (pairUnits.length >= k) {
              pairUnits.sort((a, b) => a.pri - b.pri || a.r - b.r);
              const wings = [];
              for (let i = 0; i < k; i++) wings.push(...pairUnits[i].pair);
              pushIfLegal([...body, ...wings]);
            }
          }
        }
      }

      // Four + 2 Singles (四带二) & Four + 2 Pairs (四带两对)
      const quads = ranksAsc.filter(r => byRank.get(r).length === 4);
      for (const qr of quads) {
        const quadCards = byRank.get(qr).slice(0, 4);
        const remSingles = [];
        for (const r of ranksAsc) {
          if (r === qr) continue;
          const grp = byRank.get(r);
          if (grp.length === 1) remSingles.push(grp[0]);
        }
        if (remSingles.length < 2) {
          for (const r of ranksAsc) {
            if (r === qr) continue;
            const grp = byRank.get(r);
            if (grp.length === 2 || grp.length === 3) {
              for (const c of grp) if (remSingles.length < 2) remSingles.push(c);
            }
          }
        }
        if (remSingles.length >= 2) pushIfLegal([...quadCards, remSingles[0], remSingles[1]]);

        const remPairs = [];
        for (const r of ranksAsc) {
          if (r === qr) continue;
          const grp = byRank.get(r).filter(c => !c.joker);
          if (grp.length === 2) remPairs.push(grp.slice(0, 2));
        }
        if (remPairs.length >= 2) pushIfLegal([...quadCards, ...remPairs[0], ...remPairs[1]]);
      }

      // Rocket
      const jokers = hand.filter(c => c.joker > 0);
      if (jokers.length === 2) pushIfLegal(jokers);
    }

    return moves;
  }

  function isTeammate(aIdx, bIdx) {
    if (aIdx === bIdx) return true;
    if (ct.mode === 'ddz') return aIdx !== ct.landlord && bIdx !== ct.landlord;
    if (ct.mode === 'guandan') return (aIdx % 2) === (bIdx % 2);
    return false;
  }

  function chooseAiMove(playerIdx) {
    const p = ct.players[playerIdx];
    const diff = getDifficulty();
    const prev = ct.pile?.combo || null;
    const moves = generateAllLegalMoves(p.hand, prev, ct.mode);
    if (!moves.length) return null;

    // If any move finishes the hand immediately, ALWAYS take it!
    const winMove = moves.find(m => m.cards.length === p.hand.length);
    if (winMove) return winMove;

    // Count bomb ranks so Pro/Master never casually break bombs
    const rankCounts = new Map();
    for (const c of p.hand) {
      const k = cardRankScore(c, ct.mode);
      rankCounts.set(k, (rankCounts.get(k) || 0) + 1);
    }

    const oppMinCards = Math.min(...ct.players.filter((o, idx) => !o.done && !isTeammate(playerIdx, idx)).map(o => o.hand.length), 99);
    const pileOwnerIsTeammate = !!(ct.pile && isTeammate(playerIdx, ct.pile.owner));
    const teammateRem = pileOwnerIsTeammate ? (ct.players[ct.pile.owner]?.hand?.length ?? 99) : 99;

    // Teammate Respect Rule (ALL difficulties, Guandan & DDZ): NEVER crush your own teammate!
    if (pileOwnerIsTeammate && prev) {
      // Teammate is close to winning OR played any solid card (10+, 4+ cards, or bomb): ALWAYS pass & cheer!
      if (teammateRem <= 6 || prev.bomb > 0 || prev.count >= 4 || prev.main >= 10) return null;
      // Even on a small single/pair (<10), only gently shed if AI has a mid-low non-bomb card (<= J) and <= 8 cards left
      const gentleMoves = moves.filter(m =>
        m.combo.bomb === 0 &&
        m.combo.main <= 11 &&
        !m.cards.some(c => (rankCounts.get(cardRankScore(c, ct.mode)) || 0) >= 4)
      );
      if (!gentleMoves.length || p.hand.length > 8) return null;
      gentleMoves.sort((a, b) => a.combo.main - b.combo.main);
      return gentleMoves[0];
    }

    // DouZero / DanZero Genuine Offline Neural Network Inference (Pro & Master)
    const nn = window.ArcadeNeuralAI;
    if (nn && diff !== 'casual' && (ct.mode === 'ddz' || ct.mode === 'guandan')) {
      // Cap candidate list to 64 diverse moves to keep inference < 30ms even on mobile/JoyTrans
      let nnCands = moves;
      if (nnCands.length > 64) {
        const sorted = moves.slice().sort((a, b) => (b.cards.length - a.cards.length) || (a.combo.main - b.combo.main));
        nnCands = sorted.slice(0, 64);
      }
      const candidates = prev ? [null, ...nnCands] : nnCands;

      if (ct.mode === 'ddz' && ct.landlord >= 0) {
        const lIdx = ct.landlord;
        const downIdx = (lIdx + 1) % 3;
        const upIdx = (lIdx + 2) % 3;
        const role = playerIdx === lIdx ? 'landlord' : (playerIdx === upIdx ? 'landlord_up' : 'landlord_down');
        const nnRes = nn.evaluateDouZero({
          role,
          myHand: p.hand,
          allPlayed: ct.playedCards,
          playedByPos: {
            landlord: ct.playedByPlayer[lIdx] || [],
            landlord_up: ct.playedByPlayer[upIdx] || [],
            landlord_down: ct.playedByPlayer[downIdx] || [],
          },
          lastMove: ct.pile?.cards || [],
          lastMoveByPos: {
            landlord: ct.lastMoveByPlayer[lIdx] || [],
            landlord_up: ct.lastMoveByPlayer[upIdx] || [],
            landlord_down: ct.lastMoveByPlayer[downIdx] || [],
          },
          leftByPos: {
            landlord: ct.players[lIdx]?.hand?.length || 1,
            landlord_up: ct.players[upIdx]?.hand?.length || 1,
            landlord_down: ct.players[downIdx]?.hand?.length || 1,
          },
          bombNum: ct.bombNum || 0,
          actionHistory: ct.actionHistory || [],
          candidates,
        });
        if (nnRes) return nnRes.move;
      } else if (ct.mode === 'guandan') {
        const downIdx = (playerIdx + 1) % 4;
        const mateIdx = (playerIdx + 2) % 4;
        const upIdx = (playerIdx + 3) % 4;
        const isRed = (playerIdx % 2) === 0;
        const lastAct = ct.actionHistory.length
          ? ct.actionHistory[ct.actionHistory.length - 1]
          : null;
        const mateLast = (!ct.players[mateIdx]?.done && ct.lastMoveByPlayer[mateIdx])
          ? ct.lastMoveByPlayer[mateIdx]
          : null;
        const nnRes = nn.evaluateDanZero({
          myHand: p.hand,
          allPlayed: ct.playedCards,
          lastAction: lastAct,
          lastTeammateAction: mateLast,
          downPlayed: ct.playedByPlayer[downIdx] || [],
          teammatePlayed: ct.playedByPlayer[mateIdx] || [],
          upPlayed: ct.playedByPlayer[upIdx] || [],
          downLeft: ct.players[downIdx]?.hand?.length || 0,
          teammateLeft: ct.players[mateIdx]?.hand?.length || 0,
          upLeft: ct.players[upIdx]?.hand?.length || 0,
          selfLevelVal: isRed ? ct.redLevel : ct.blueLevel,
          oppoLevelVal: isRed ? ct.blueLevel : ct.redLevel,
          curLevelVal: ct.levelRank,
          candidates,
        });
        if (nnRes) return nnRes.move;
      }
    }

    // DouZero-style DDZ role awareness: landlord_up (地主上家顶大牌) vs landlord_down (地主下家顺小牌)
    const isDdz = ct.mode === 'ddz';
    const isLandlordUp = isDdz && playerIdx !== ct.landlord && ((playerIdx + 1) % 3) === ct.landlord;
    const isLandlordDown = isDdz && playerIdx !== ct.landlord && ((ct.landlord + 1) % 3) === playerIdx;
    const landlordRem = isDdz ? (ct.players[ct.landlord]?.hand?.length ?? 20) : 20;

    // Score each candidate move
    const scored = moves.map(m => {
      let score = 0;
      const breaksBomb = m.combo.bomb === 0 && m.cards.some(c => (rankCounts.get(cardRankScore(c, ct.mode)) || 0) >= 4);

      if (!prev) {
        // Leading a fresh trick
        if (diff === 'casual') {
          score = -m.combo.main + m.cards.length * 0.5;
        } else {
          // Pro/Master: shed multi-card combos (straights, pairs, triples) first to reduce hand turns, keep high controls & bombs
          score = m.cards.length * 15 - m.combo.main * 2.2;
          if (m.combo.bomb > 0) score -= 95;
          if (breaksBomb) score -= 70;
          // DDZ Landlord-Up: don't feed tiny singles to landlord when landlord has few cards; lead pairs/straights or medium cards
          if (isLandlordUp && m.combo.type === 'single' && m.combo.main < 11) {
            score -= landlordRem <= 5 ? 65 : 22;
          }
          // DDZ Landlord-Down: smoothly shed small singles/pairs to hand lead to teammate
          if (isLandlordDown && m.combo.main <= 10 && m.combo.bomb === 0) {
            score += 12;
          }
          if (diff === 'master' && oppMinCards <= 2 && m.combo.type === 'single' && m.combo.main < 13) {
            score -= 48; // Don't feed weak singles when opponent is about to win!
          }
        }
      } else {
        // Following an opponent's trick
        if (diff === 'casual') {
          score = -m.combo.main - m.combo.bomb * 2;
        } else {
          score = -m.combo.main * 2.4;
          if (breaksBomb) score -= 72;
          if (m.combo.bomb > 0) {
            // Only bomb aggressively if opponent is close to winning or pile is big
            score += (oppMinCards <= 4 || prev.main >= 14) ? 28 : -88;
          }
          // DDZ Landlord-Up: block landlord with solid mid-high cards (J/Q/K/A) so landlord can't escape cheaply
          if (isLandlordUp && ct.pile?.owner === ct.landlord && m.combo.bomb === 0 && m.combo.main >= 11 && m.combo.main <= 14) {
            score += landlordRem <= 6 ? 24 : 10;
          }
          if (diff === 'master' && oppMinCards <= 3) {
            // Block opponent with stronger high card!
            score += m.combo.main * 1.4;
          }
        }
      }
      return { move: m, score };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0];
    // On Pro/Master, if following and only option is wasting a bomb on a low card when opponent has plenty of cards, pass
    if (prev && diff !== 'casual' && best.move.combo.bomb > 0 && oppMinCards > 5 && prev.main < 14 && p.hand.length > 5) {
      return null;
    }
    return best.move;
  }

  /* ── Start Card Game (ddz / guandan / daifugo) ── */
  function pickRandomCardAvatar(idol) {
    return idol?.path ? '/asset-original/' + idol.path : '/app-icon.png';
  }

  function pickIdols(n) {
    const pool = portraits.length ? trueShuffle(portraits) : [
      { id: '1', name: '樱木真乃', path: '' },
      { id: '4', name: '月冈恋钟', path: '' },
      { id: '20', name: '浅仓透', path: '' }
    ];
    return pool.slice(0, n);
  }

  function startCardGame(mode, swapOpps = false, customOpps = null) {
    gameSerial++;
    const serial = gameSerial;
    ct.mode = mode;
    $('#casinoTable').dataset.mode = mode;
    $('#ctModeChip').textContent = MODE_META[mode].title;
    $('#ctRulesLine').textContent = MODE_META[mode].rules;

    const aiCount = mode === 'ddz' ? 2 : 3;
    const reuse = !customOpps && !swapOpps && ct.players.length === aiCount + 1;
    const opps = Array.isArray(customOpps) && customOpps.length === aiCount
      ? customOpps
      : (reuse ? ct.players.slice(1).map(p => p.raw) : pickIdols(aiCount));

    ct.players = [
      { id: 0, name: '制作人', charId: '', avatar: '/app-icon.png', hand: [], speech: '', thinking: false, done: false },
      ...opps.map((o, i) => ({
        id: i + 1,
        raw: o,
        name: o.name,
        charId: String(o.id).padStart(3, '0'),
        avatar: reuse && ct.players[i + 1]?.avatar ? ct.players[i + 1].avatar : pickRandomCardAvatar(o),
        hand: [],
        speech: mode === 'guandan' && i === 1 ? '搭档，请多关照♪' : '准备好了♪',
        thinking: false,
        done: false
      }))
    ];

    ct.pile = null;
    ct.passCount = 0;
    ct.kitty = [];
    ct.landlord = -1;
    ct.revolution = false;
    ct.finishOrder = [];
    ct.selected.clear();
    ct.prePlayQueued = false;
    ct.sfReserve = [];
    ct.sfReserveSeq = 1;
    ct.playedCards = [];
    ct.playedByPlayer = [[], [], [], []];
    ct.lastMoveByPlayer = [null, null, null, null];
    ct.actionHistory = [];
    ct.bombNum = 0;
    ct.fastFinish = false;
    window.ArcadeNeuralAI?.preloadMode?.(mode);
    if (ct.tribute?.autoTimer) clearTimeout(ct.tribute.autoTimer);
    ct.tribute = null;
    if (mode !== 'guandan' || swapOpps) {
      ct.lastGuandanFinish = null;
      if (swapOpps && mode === 'guandan') {
        ct.redLevel = 15;
        ct.blueLevel = 15;
        ct.dealerTeam = 'red';
      }
    }
    if (mode === 'guandan') {
      ct.levelRank = ct.dealerTeam === 'blue' ? ct.blueLevel : ct.redLevel;
    }

    if (mode === 'ddz') {
      const deck = makeDecks(1);
      for (let i = 0; i < 51; i++) ct.players[i % 3].hand.push(deck[i]);
      ct.kitty = deck.slice(51);
      ct.players.forEach(p => sortHand(p.hand, 'ddz'));
      ct.phase = 'bid';
      ct.turn = trueRandomInt(3); // True random starting bidder — no player favoritism!
      ct.bidStep = 0;
    } else if (mode === 'guandan') {
      const deck = makeDecks(2);
      for (let i = 0; i < 108; i++) ct.players[i % 4].hand.push(deck[i]);
      ct.players.forEach(p => sortHand(p.hand, 'guandan'));
      if (Array.isArray(ct.lastGuandanFinish) && ct.lastGuandanFinish.length === 4) {
        setupGuandanTribute(serial);
        return;
      }
      ct.phase = 'play';
      ct.turn = trueRandomInt(4); // Round 1: true random first lead!
      showFx(`🎲 首局随机先手：${ct.players[ct.turn].name} 先出牌（第 2 局起按名次自动进贡 / 还贡）`);
    } else {
      const deck = makeDecks(1);
      for (let i = 0; i < 54; i++) ct.players[i % 4].hand.push(deck[i]);
      ct.players.forEach(p => sortHand(p.hand, 'daifugo'));
      ct.phase = 'play';
      // Official Daifugo rule: holder of ♦3 starts first (fallback true random)
      const d3Owner = ct.players.findIndex(pl => pl.hand.some(c => !c.joker && c.suit === '♦' && c.val === 3));
      ct.turn = d3Owner >= 0 ? d3Owner : trueRandomInt(4);
    }

    renderCardTable();
    ddzBgm?.sync?.();
    if (serial !== gameSerial) return;
    if (ct.phase === 'bid' && ct.turn !== 0) {
      aiBidStep(serial);
    } else if (ct.phase === 'play' && ct.turn !== 0) {
      runAiTurnAsync(serial);
    }
  }

  /* ── Official National Guandan Tribute (进贡 / 还贡 / 抗贡) & Strict Lead Order ── */
  function pickForcedTributeCard(hand) {
    const eligible = hand.filter(c => !isGuandanWild(c, 'guandan'));
    const pool = eligible.length ? eligible : hand;
    return pool.slice().sort((a, b) => cardRankScore(b, 'guandan') - cardRankScore(a, 'guandan') || a.uid - b.uid)[0];
  }

  function isEligiblePayTributeCard(c, hand) {
    if (!c || !hand || !hand.length) return false;
    const eligible = hand.filter(x => !isGuandanWild(x, 'guandan'));
    const pool = eligible.length ? eligible : hand;
    const maxScore = Math.max(...pool.map(x => cardRankScore(x, 'guandan')));
    if (eligible.length && isGuandanWild(c, 'guandan')) return false;
    return cardRankScore(c, 'guandan') === maxScore;
  }

  function isGuandanRankUnderOrEq10(c) {
    if (!c || c.joker) return false;
    if (c.val === ct.levelRank) return false; // 级牌不得用于还贡
    if (isGuandanWild(c, 'guandan')) return false; // 逢人配不得用于还贡
    // 扑克数据定义中 2 的 val 为 15（沿用斗地主体系），但掼蛋非级牌时 2 是点数最小的牌（<= 10）
    if (c.val === 15) return true;
    return c.val <= 10;
  }

  function isEligibleReturnCard(c, hand) {
    const hasUnder10 = hand.some(x => isGuandanRankUnderOrEq10(x));
    if (hasUnder10) return isGuandanRankUnderOrEq10(c);
    return !isGuandanWild(c, 'guandan') && c.val !== ct.levelRank && !c.joker;
  }

  function pickAiReturnCard(hand) {
    const eligible = hand.filter(c => isEligibleReturnCard(c, hand));
    const pool = eligible.length ? eligible : hand;
    const cnt = new Map();
    for (const c of hand) cnt.set(c.val, (cnt.get(c.val) || 0) + 1);
    return pool.slice().sort((a, b) => {
      const sa = cnt.get(a.val) === 1 ? 0 : 1;
      const sb = cnt.get(b.val) === 1 ? 0 : 1;
      return sa - sb || cardRankScore(a, 'guandan') - cardRankScore(b, 'guandan') || a.uid - b.uid;
    })[0];
  }

  function transferCardBetween(fromIdx, toIdx, card) {
    const fromHand = ct.players[fromIdx].hand;
    const pos = fromHand.findIndex(c => c.uid === card.uid);
    if (pos >= 0) fromHand.splice(pos, 1);
    ct.players[toIdx].hand.push(card);
    sortHand(fromHand, 'guandan');
    sortHand(ct.players[toIdx].hand, 'guandan');
  }

  function finishTributeReveal(serial) {
    if (serial !== gameSerial || ct.phase !== 'tribute' || ct.tribute?.step !== 'reveal') return;
    clearTimeout(ct.tribute.autoTimer);
    const leadSeat = ct.tribute.leadSeat;
    ct.tribute = null;
    ct.selected.clear();
    ct.phase = 'play';
    ct.turn = leadSeat;
    renderCardTable();
    if (ct.turn !== 0) {
      setTimeout(() => { if (serial === gameSerial && ct.phase === 'play') runAiTurnAsync(serial); }, 450);
    }
  }

  function enterTributeReveal({ kind, pairs = [], antiTribute = false, leadSeat, summary, cards = [], serial }) {
    ct.phase = 'tribute';
    ct.turn = leadSeat;
    ct.selected.clear();
    ct.tribute = {
      step: 'reveal',
      kind,
      pairs,
      antiTribute,
      leadSeat,
      summary,
      revealCards: cards,
      autoTimer: setTimeout(() => finishTributeReveal(serial), 2600)
    };
    showFx(summary);
    renderCardTable();
    ddzBgm?.sync?.();
  }

  function finalizeGuandanTributeWithPaidCards({ first, second, third, fourth, doubleDown, internalTribute, paidMap, serial }) {
    const pairs = [];
    let leadSeat = fourth;
    if (doubleDown) {
      const c3 = paidMap.get(third);
      const c4 = paidMap.get(fourth);
      const s3 = cardRankScore(c3, 'guandan');
      const s4 = cardRankScore(c4, 'guandan');
      if (s4 >= s3) {
        pairs.push({ payer: fourth, receiver: first, paidCard: c4, returnedCard: null });
        pairs.push({ payer: third, receiver: second, paidCard: c3, returnedCard: null });
        leadSeat = fourth;
      } else {
        pairs.push({ payer: third, receiver: first, paidCard: c3, returnedCard: null });
        pairs.push({ payer: fourth, receiver: second, paidCard: c4, returnedCard: null });
        leadSeat = third;
      }
    } else {
      const c4 = paidMap.get(fourth);
      pairs.push({ payer: fourth, receiver: first, paidCard: c4, returnedCard: null });
      leadSeat = fourth;
    }

    for (const pair of pairs) {
      transferCardBetween(pair.payer, pair.receiver, pair.paidCard);
    }

    let humanPair = null;
    for (const pair of pairs) {
      if (pair.receiver === 0) {
        humanPair = pair;
      } else {
        const ret = pickAiReturnCard(ct.players[pair.receiver].hand);
        pair.returnedCard = ret;
        transferCardBetween(pair.receiver, pair.payer, ret);
      }
    }

    const kind = doubleDown ? '双贡' : internalTribute ? '内供' : '单贡';
    const summaryLines = pairs.map(pr => {
      const pName = ct.players[pr.payer].name;
      const rName = ct.players[pr.receiver].name;
      const retStr = pr.returnedCard ? `，还贡 ${pr.returnedCard.suit}${pr.returnedCard.label}` : '（待你还贡）';
      const verb = internalTribute ? '内供' : '进贡';
      return `${pName}→${rName} ${verb} ${pr.paidCard.suit}${pr.paidCard.label}${retStr}`;
    });

    if (humanPair) {
      ct.phase = 'tribute';
      ct.turn = 0;
      ct.selected.clear();
      ct.tribute = {
        step: 'return',
        kind,
        pairs,
        humanPair,
        leadSeat,
        summary: summaryLines.join(' ｜ '),
        serial
      };
      const fromWho = internalTribute ? `队友 ${ct.players[humanPair.payer].name}` : ct.players[humanPair.payer].name;
      showFx(`🎁 ${kind}：收到 ${fromWho} 进贡的 ${humanPair.paidCard.suit}${humanPair.paidCard.label}，请选 1 张 ≤10 的牌还贡`);
      renderCardTable();
      ddzBgm?.sync?.();
      return;
    }

    for (const pr of pairs) {
      const verb = internalTribute ? '内供' : '进贡';
      ct.players[pr.payer].speech = `${verb} ${pr.paidCard.suit}${pr.paidCard.label} · 获还 ${pr.returnedCard.suit}${pr.returnedCard.label}`;
      ct.players[pr.receiver].speech = `收${verb} ${pr.paidCard.suit}${pr.paidCard.label} · 还贡 ${pr.returnedCard.suit}${pr.returnedCard.label}`;
    }
    const revealCards = pairs.flatMap(pr => [
      { card: pr.paidCard, tag: `${ct.players[pr.payer].name} ${internalTribute ? '内供' : '进贡'}` },
      { card: pr.returnedCard, tag: `${ct.players[pr.receiver].name} 还贡` }
    ]);
    enterTributeReveal({
      kind,
      pairs,
      leadSeat,
      summary: `🎁 ${kind}完成：${summaryLines.join('；')} · ${ct.players[leadSeat].name} 先出牌`,
      cards: revealCards,
      serial
    });
  }

  function setupGuandanTribute(serial) {
    const [first, second, third, fourth] = ct.lastGuandanFinish;
    const doubleDown = (first % 2) === (second % 2);
    const singleDown = !doubleDown && (first % 2) === (third % 2);
    const internalTribute = !doubleDown && !singleDown;

    // Check 抗贡 (Anti-Tribute: losing side holds BOTH Red Jokers!)
    const redJokersOf = pid => ct.players[pid].hand.filter(c => c.joker === 2);
    const losingPids = doubleDown ? [third, fourth] : [fourth];
    const antiCards = losingPids.flatMap(pid => redJokersOf(pid).map(c => ({ card: c, tag: `${ct.players[pid].name} 抗贡` })));
    const antiTribute = antiCards.length >= 2;

    if (antiTribute) {
      ct.players[fourth].speech = '双大王抗贡！免进贡！';
      if (doubleDown) ct.players[third].speech = '我们抗贡成功！';
      enterTributeReveal({
        kind: '抗贡',
        antiTribute: true,
        leadSeat: first,
        summary: `🛡 双大王抗贡成功！免进贡 · 上局头游 ${ct.players[first].name} 先出牌`,
        cards: antiCards.slice(0, 2),
        serial
      });
      return;
    }

    // If Human (seat 0) is a PAYER (末游 or 双下三游), pause for an interactive 进贡 step!
    const humanIsPayer = doubleDown ? (third === 0 || fourth === 0) : (fourth === 0);
    if (humanIsPayer) {
      const defaultCard = pickForcedTributeCard(ct.players[0].hand);
      ct.phase = 'tribute';
      ct.turn = 0;
      ct.selected.clear();
      if (defaultCard) ct.selected.add(defaultCard.uid);
      const kind = doubleDown ? '双贡' : internalTribute ? '内供' : '单贡';
      const rankTitle = fourth === 0 ? '末游' : '三游';
      const targetName = ct.players[first].name;
      const tributeSummary = internalTribute
        ? `🎁 上局保级（内供）：你是上局末游，请向队友（头游 ${targetName}）进贡手中最大非逢人配单牌`
        : `🎁 上局${doubleDown ? '双下（双贡）' : '单下（单贡）'}：你是上局${rankTitle}，请进贡手中最大非逢人配单牌`;
      ct.tribute = {
        step: 'pay',
        kind,
        first,
        second,
        third,
        fourth,
        doubleDown,
        internalTribute,
        serial,
        summary: tributeSummary
      };
      showFx(`🎁 ${kind}环节：请确认进贡你手中最大的非逢人配单牌（${defaultCard ? defaultCard.suit + defaultCard.label : ''}）`);
      renderCardTable();
      ddzBgm?.sync?.();
      return;
    }

    // Otherwise AI pays immediately -> enters human 'return' step if human is receiver, or 'reveal' stage!
    const paidMap = new Map();
    if (doubleDown) {
      paidMap.set(third, pickForcedTributeCard(ct.players[third].hand));
      paidMap.set(fourth, pickForcedTributeCard(ct.players[fourth].hand));
    } else {
      paidMap.set(fourth, pickForcedTributeCard(ct.players[fourth].hand));
    }
    finalizeGuandanTributeWithPaidCards({ first, second, third, fourth, doubleDown, internalTribute, paidMap, serial });
  }

  function completeHumanPayTribute(chosenCard) {
    if (ct.phase !== 'tribute' || ct.tribute?.step !== 'pay') return false;
    const me = ct.players[0];
    const t = ct.tribute;
    const card = chosenCard || pickForcedTributeCard(me.hand);
    if (!card || !isEligiblePayTributeCard(card, me.hand)) {
      showFx('进贡牌必须是手中最大的非逢人配单牌');
      return false;
    }
    const paidMap = new Map();
    paidMap.set(0, card);
    if (t.doubleDown) {
      const otherPayer = t.third === 0 ? t.fourth : t.third;
      paidMap.set(otherPayer, pickForcedTributeCard(ct.players[otherPayer].hand));
    }
    finalizeGuandanTributeWithPaidCards({
      first: t.first,
      second: t.second,
      third: t.third,
      fourth: t.fourth,
      doubleDown: t.doubleDown,
      internalTribute: t.internalTribute,
      paidMap,
      serial: t.serial
    });
    return true;
  }

  function completeHumanReturnTribute(chosenCard) {
    if (ct.phase !== 'tribute' || ct.tribute?.step !== 'return' || !ct.tribute?.humanPair) return false;
    const me = ct.players[0];
    const hp = ct.tribute.humanPair;
    const card = chosenCard || pickAiReturnCard(me.hand);
    if (!card || !isEligibleReturnCard(card, me.hand)) {
      showFx('请选择 1 张 10 及以下的非级牌还贡');
      return false;
    }
    hp.returnedCard = card;
    transferCardBetween(0, hp.payer, card);
    const leadSeat = ct.tribute.leadSeat;
    const kind = ct.tribute.kind;
    const pairs = ct.tribute.pairs || [hp];
    const serial = ct.tribute.serial ?? gameSerial;
    ct.players[hp.payer].speech = `收到还贡 ${card.suit}${card.label}！`;
    const revealCards = pairs.flatMap(pr => [
      { card: pr.paidCard, tag: `${ct.players[pr.payer].name} 进贡` },
      { card: pr.returnedCard, tag: `${ct.players[pr.receiver].name} 还贡` }
    ]);
    enterTributeReveal({
      kind,
      pairs,
      leadSeat,
      summary: `🎁 ${kind}还贡完成（还出 ${card.suit}${card.label}）· ${ct.players[leadSeat].name} 先出牌`,
      cards: revealCards,
      serial
    });
    return true;
  }

  function showFx(text) {
    const el = $('#ctFxBanner');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 1600);
  }

  function isOpponentSeat(p) {
    if (!p || p.id === 0) return false;
    if (ct.mode === 'guandan') return p.id % 2 === 1;
    if (ct.mode === 'ddz') {
      if (ct.landlord < 0) return true;
      return ct.landlord === 0 ? true : p.id === ct.landlord;
    }
    return true;
  }

  function seatCardHtml(p) {
    if (!p) return '';
    const isOpp = isOpponentSeat(p);
    let roleHtml = '';
    if (ct.mode === 'ddz' && ct.landlord >= 0) {
      roleHtml = p.id === ct.landlord
        ? `<span class="seat-role-tag ${isOpp ? 'opponent' : 'landlord'}">👑 地主${isOpp ? '·对手' : ''}</span>`
        : `<span class="seat-role-tag ${isOpp ? 'opponent' : 'partner'}">🌾 农民${isOpp ? '·对手' : '·队友'}</span>`;
    } else if (ct.mode === 'guandan') {
      const finPos = ct.finishOrder.indexOf(p.id);
      const finBadge = finPos >= 0 ? ` · ${['🥇头游', '🥈二游', '🥉三游', '末游'][finPos] || ''}` : '';
      roleHtml = (p.id % 2 === 0)
        ? `<span class="seat-role-tag partner">🤝 搭档${finBadge}</span>`
        : `<span class="seat-role-tag opponent">⚔ 对手${finBadge}</span>`;
    } else if (ct.mode === 'daifugo') {
      const r = p.done
        ? (['👑 大富豪', '✨ 富豪', '🍃 贫民', '💦 大贫民'][ct.finishOrder.indexOf(p.id)] || '完成')
        : '⚔ 对手';
      roleHtml = `<span class="seat-role-tag ${p.done ? '' : 'opponent'}">${r}</span>`;
    } else {
      roleHtml = '<span class="seat-role-tag opponent">⚔ 对手</span>';
    }
    const partnerCls = (ct.mode === 'guandan' && p.id % 2 === 0) || (ct.mode === 'ddz' && ct.landlord > 0 && !isOpp) ? 'is-partner' : '';
    const oppCls = isOpp ? 'is-opponent' : '';
    const isLowGuandan = ct.mode === 'guandan' && !p.done && p.hand.length > 0 && p.hand.length <= 10;
    const isLowDdz = ct.mode === 'ddz' && !p.done && p.hand.length > 0 && p.hand.length <= 3;
    const isLowAlert = isLowGuandan || isLowDdz;
    const lowAlertHtml = isLowGuandan
      ? `<span class="seat-alert-tag">🔔 报牌 · 余${p.hand.length}张</span>`
      : isLowDdz
        ? `<span class="seat-alert-tag">🔔 ${p.hand.length === 1 ? '报单' : p.hand.length === 2 ? '报双' : '报牌'} · 余${p.hand.length}张</span>`
        : '';
    const revealHtml = ct.phase === 'over'
      ? (p.hand.length > 0
        ? `<div class="seat-reveal-cards"><span class="reveal-lbl">余牌(${p.hand.length})</span><div class="reveal-mini-row">${p.hand.map(c => `<span class="mini-card ${c.red ? 'is-red' : ''} ${c.joker ? 'is-joker' : ''} ${isGuandanWild(c, ct.mode) ? 'is-wild' : ''}">${c.suit}${c.label}</span>`).join('')}</div></div>`
        : '<div class="seat-reveal-done">✓ 已出完</div>')
      : '';
    const emoteHtml = renderEmotePopHtml(p.emote);
    return `
      <div class="idol-seat ${ct.turn === p.id && ct.phase !== 'over' && !p.done ? 'is-turn' : ''} ${partnerCls} ${oppCls} ${isLowAlert ? 'is-low-alert' : ''} ${p.done ? 'is-done' : ''}">
        ${emoteHtml}
        <div class="seat-avatar-wrap">
          <img src="${p.avatar}" alt="${p.name}" onerror="this.src='/app-icon.png'">
          <span class="seat-card-badge ${isLowAlert ? 'is-alert' : ''}">${p.hand.length}</span>
        </div>
        <div class="seat-info">
          <div class="seat-name-row"><strong>${p.name}</strong>${roleHtml}${lowAlertHtml}</div>
          <div class="seat-speech ${p.thinking ? 'thinking' : ''}">${p.thinking ? '思考中…' : (p.speech || '')}</div>
          ${revealHtml}
        </div>
      </div>
    `;
  }

  /* ── Pro Card Counter / Tracker (记牌器，可一键关掉) ── */
  const TRACKER_RANKS = [
    { val: 17, label: '大王', perDeck: 1 },
    { val: 16, label: '小王', perDeck: 1 },
    { val: 15, label: '2', perDeck: 4 },
    { val: 14, label: 'A', perDeck: 4 },
    { val: 13, label: 'K', perDeck: 4 },
    { val: 12, label: 'Q', perDeck: 4 },
    { val: 11, label: 'J', perDeck: 4 },
    { val: 10, label: '10', perDeck: 4 },
    { val: 9, label: '9', perDeck: 4 },
    { val: 8, label: '8', perDeck: 4 },
    { val: 7, label: '7', perDeck: 4 },
    { val: 6, label: '6', perDeck: 4 },
    { val: 5, label: '5', perDeck: 4 },
    { val: 4, label: '4', perDeck: 4 },
    { val: 3, label: '3', perDeck: 4 }
  ];

  function renderCardTracker() {
    const bar = $('#ctTrackerBar');
    const toggleBtn = $('#btnCtTracker');
    if (toggleBtn) toggleBtn.classList.toggle('is-on', ct.trackerEnabled);
    if (!bar) return;
    if (!ct.trackerEnabled || !ct.players.length) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const decks = ct.mode === 'guandan' ? 2 : 1;
    const me = ct.players[0];
    const known = new Map();
    const bump = (c) => known.set(c.val, (known.get(c.val) || 0) + 1);
    (me?.hand || []).forEach(bump);
    (ct.sfReserve || []).forEach(g => g.cards.forEach(bump));
    (ct.playedCards || []).forEach(bump);

    const cellsHtml = TRACKER_RANKS.map(r => {
      const rem = Math.max(0, r.perDeck * decks - (known.get(r.val) || 0));
      const isLvl = ct.mode === 'guandan' && r.val === ct.levelRank;
      const risk = rem >= 4 && r.val < 16;
      return `
        <div class="ct-tr-cell ${rem === 0 ? 'is-zero' : ''} ${isLvl ? 'is-level-rk' : ''} ${risk ? 'is-bomb-risk' : ''}" title="其余玩家手中剩余 ${r.label}：${rem} 张">
          <span class="tr-rk">${r.label}</span>
          <span class="tr-cnt">${rem}</span>
        </div>
      `;
    }).join('');
    bar.innerHTML = `
      <span class="ct-tracker-lbl">🧮 记牌器（余牌）</span>
      <div class="ct-tracker-cells">${cellsHtml}</div>
      <button type="button" class="ct-tracker-close" id="btnCtTrackerClose" title="关闭记牌器">✕</button>
    `;
    $('#btnCtTrackerClose')?.addEventListener('click', () => {
      ct.trackerEnabled = false;
      try { localStorage.setItem('shiny.arcade.tracker', 'false'); } catch {}
      renderCardTracker();
    });
  }

  /* ── Cached Hand Analysis & Zero-Lag Selection Controls ── */
  const handAnalysisCache = { sig: '', sfs: [], bombs: [] };
  function getCachedGuandanExtras(hand) {
    const sig = `${ct.mode}:${ct.levelRank}:${hand.map(c => c.uid).join(',')}`;
    if (handAnalysisCache.sig !== sig) {
      handAnalysisCache.sig = sig;
      handAnalysisCache.sfs = ct.mode === 'guandan' ? findHandStraightFlushes(hand) : [];
      handAnalysisCache.bombs = ct.mode === 'guandan' ? findHandBombs(hand) : [];
    }
    return handAnalysisCache;
  }

  function syncHandSelectionClasses() {
    const handEl = $('#ctMyHand');
    if (!handEl) return;
    const btns = handEl.querySelectorAll('.poker-card');
    for (let i = 0; i < btns.length; i++) {
      const uid = Number(btns[i].dataset.uid);
      btns[i].classList.toggle('is-selected', ct.selected.has(uid));
    }
  }

  function refreshSelectionControls() {
    const me = ct.players[0];
    if (!me) return;
    const selCards = me.hand.filter(c => ct.selected.has(c.uid));

    // Guandan Tribute mode (进贡 / 还贡 / 亮贡展示)
    if (ct.phase === 'tribute' && ct.tribute) {
      const step = ct.tribute.step;
      const hintEl = $('#ctSelHint');
      const confirmBtn = $('#btnTributeConfirm');
      if (step === 'pay') {
        const validPay = selCards.length === 1 && isEligiblePayTributeCard(selCards[0], me.hand);
        if (hintEl) {
          hintEl.textContent = validPay
            ? `已选进贡牌：${selCards[0].suit}${selCards[0].label} ✓`
            : '请点选 1 张手中最大的非逢人配单牌进贡';
        }
        if (confirmBtn) confirmBtn.disabled = !validPay;
      } else if (step === 'return') {
        const validRet = selCards.length === 1 && isEligibleReturnCard(selCards[0], me.hand);
        if (hintEl) {
          hintEl.textContent = validRet
            ? `已选还贡牌：${selCards[0].suit}${selCards[0].label} ✓`
            : '请点选 1 张 10 及以下（非级牌）还贡';
        }
        if (confirmBtn) confirmBtn.disabled = !validRet;
      } else {
        if (hintEl) hintEl.textContent = '进贡 / 还贡已完成，点击「开始出牌」或稍候自动开局';
        if (confirmBtn) confirmBtn.disabled = false;
      }
      const playBtn = $('#btnCtPlay');
      if (playBtn) playBtn.disabled = true;
      const passBtn = $('#btnCtPass');
      if (passBtn) passBtn.disabled = true;
      const hintBtn = $('#btnCtHint');
      if (hintBtn) hintBtn.disabled = true;
      const clrBtn = $('#btnCtClearSel');
      if (clrBtn) clrBtn.disabled = step === 'reveal' || selCards.length === 0;
      return;
    }

    const myTurn = ct.phase === 'play' && ct.turn === 0 && !me.done;
    const selCombo = selCards.length ? classifyCombo(selCards, ct.mode) : null;

    const hintEl = $('#ctSelHint');
    if (hintEl) {
      if (!selCards.length) {
        hintEl.textContent = '';
      } else if (!selCombo) {
        hintEl.textContent = '已选牌型不合法';
      } else if (myTurn) {
        hintEl.textContent = `已选：${selCombo.name}${canBeatCombo(selCombo, ct.pile?.combo) ? ' ✓' : '（压不过）'}`;
      } else {
        hintEl.textContent = ct.prePlayQueued
          ? `⚡ 已预约：${selCombo.name}（到回合自动出）`
          : `已预选：${selCombo.name}（到回合可直接出）`;
      }
    }

    const playBtn = $('#btnCtPlay');
    if (playBtn) {
      if (myTurn) {
        playBtn.textContent = '出牌';
        playBtn.classList.remove('preplay-armed');
        playBtn.disabled = !selCombo || !canBeatCombo(selCombo, ct.pile?.combo);
      } else if (ct.phase === 'play' && !me.done && selCombo) {
        playBtn.textContent = ct.prePlayQueued ? '⚡ 已预约（点击取消）' : '⚡ 预约出牌';
        playBtn.classList.toggle('preplay-armed', ct.prePlayQueued);
        playBtn.disabled = false;
      } else {
        playBtn.textContent = '出牌';
        playBtn.classList.remove('preplay-armed');
        playBtn.disabled = true;
      }
    }

    const passBtn = $('#btnCtPass');
    if (passBtn) passBtn.disabled = !myTurn || !ct.pile;
    const hintBtn = $('#btnCtHint');
    if (hintBtn) hintBtn.disabled = !myTurn;
    const clrBtn = $('#btnCtClearSel');
    if (clrBtn) clrBtn.disabled = (ct.phase !== 'play' || me.done || ct.selected.size === 0);

    if (ct.mode === 'guandan') {
      const extras = getCachedGuandanExtras(me.hand);
      const pinBtn = $('#btnCtPinSf');
      if (pinBtn) {
        const selIsSf = selCombo?.type === 'sf';
        pinBtn.hidden = false;
        pinBtn.disabled = ct.phase !== 'play' || me.done;
        pinBtn.classList.toggle('is-ready', selIsSf || extras.sfs.length > 0);
        pinBtn.textContent = selIsSf
          ? '📌 放入同花顺备选'
          : (extras.sfs.length > 0 ? `🌈 挑出同花顺 (${extras.sfs.length})` : '🌈 挑出同花顺');
      }

      const pinBombBtn = $('#btnCtPinBomb');
      if (pinBombBtn) {
        const selIsBomb = !!(selCombo && selCombo.bomb > 0 && selCombo.type !== 'sf');
        pinBombBtn.hidden = false;
        pinBombBtn.disabled = ct.phase !== 'play' || me.done;
        pinBombBtn.classList.toggle('is-ready', selIsBomb || extras.bombs.length > 0);
        pinBombBtn.textContent = selIsBomb
          ? `📌 放入${selCombo.name || '炸弹'}备选`
          : (extras.bombs.length > 0 ? `💣 挑出炸弹 (${extras.bombs.length})` : '💣 挑出炸弹');
      }
    }
  }

  /* ── 欢乐斗地主-Style Zero-Lag Long-Press Drag Sweep + Smart Auto Combo Selection ── */
  let handDrag = { active: false, startIdx: -1, curIdx: -1, moved: false, cards: [], rects: [], pendingRender: false };

  function smartSelectSweptCards(sweptCards) {
    if (!sweptCards || sweptCards.length < 2) return null;
    // 1. If every swept card is already selected -> user wants to deselect them cleanly
    if (sweptCards.every(c => ct.selected.has(c.uid))) {
      for (const c of sweptCards) ct.selected.delete(c.uid);
      return 'deselect';
    }

    const followPile = ct.turn === 0 && ct.pile?.combo ? ct.pile.combo : null;
    const rawCombo = classifyCombo(sweptCards, ct.mode);
    // 2. If swept cards ALREADY form a clean legal combo (and beat pile if following), pick them directly!
    if (rawCombo && (!followPile || canBeatCombo(rawCombo, followPile))) {
      for (const c of sweptCards) ct.selected.add(c.uid);
      return 'exact';
    }

    // 3. Smart Auto-Selection (欢乐斗地主滑牌自动抽顺子 / 连对 / 飞机 / 三带 / 炸弹 / 压牌组合!)
    if (followPile) {
      const legalBeaters = generateAllLegalMoves(sweptCards, followPile, ct.mode);
      if (legalBeaters.length) {
        legalBeaters.sort((a, b) => {
          const aBomb = a.combo.bomb > 0 ? 1 : 0;
          const bBomb = b.combo.bomb > 0 ? 1 : 0;
          if (aBomb !== bBomb) return aBomb - bBomb; // Prefer non-bomb beater unless only bomb works
          return b.cards.length - a.cards.length || a.combo.main - b.combo.main;
        });
        ct.selected.clear();
        legalBeaters[0].cards.forEach(c => ct.selected.add(c.uid));
        return 'smart';
      }
    } else if (sweptCards.length >= 4) {
      // Leading freely: extract best natural multi-card combo (顺子/连对/飞机/同花顺/三带二/炸弹)
      const allMoves = generateAllLegalMoves(sweptCards, null, ct.mode).filter(m => {
        if (m.combo.type === 'sf' || m.combo.type === 'straight' || m.combo.type === 'pairs' || m.combo.type === 'plane' || m.combo.type === 'plane1' || m.combo.type === 'plane2') return true;
        if (m.combo.bomb > 0 && m.cards.length >= 4) return true;
        if (m.combo.type === 'triple2' || m.combo.type === 'triple1') return true;
        return false;
      });
      if (allMoves.length) {
        const typePriority = t => (t === 'sf' ? 6 : t === 'plane' || t === 'plane1' || t === 'plane2' ? 5 : t === 'pairs' ? 4 : t === 'straight' ? 4 : t === 'bomb' || t === 'rocket' ? 3 : 2);
        allMoves.sort((a, b) => b.cards.length - a.cards.length || typePriority(b.combo.type) - typePriority(a.combo.type) || a.combo.main - b.combo.main);
        const best = allMoves[0];
        if (best.cards.length >= 4) {
          ct.selected.clear();
          best.cards.forEach(c => ct.selected.add(c.uid));
          return 'smart';
        }
      }
    }

    // 4. Fallback: toggle all swept cards into selection cleanly
    for (const c of sweptCards) ct.selected.add(c.uid);
    return 'raw';
  }

  function setupHandDragEvents() {
    const handEl = $('#ctMyHand');
    if (!handEl || handEl.dataset.dragBound) return;
    handEl.dataset.dragBound = '1';

    const updateDragOverlay = (lo, hi) => {
      const nodes = handDrag.cards;
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].classList.toggle('is-drag-over', i >= lo && i <= hi);
      }
    };

    const hitIndexByX = (clientX) => {
      const rects = handDrag.rects;
      if (!rects.length) return -1;
      // Iterate right-to-left because later cards visually overlap earlier cards on the right!
      for (let i = rects.length - 1; i >= 0; i--) {
        if (clientX >= rects[i].left && clientX <= rects[i].right) return i;
      }
      if (clientX < rects[0].left) return 0;
      if (clientX > rects[rects.length - 1].right) return rects.length - 1;
      return handDrag.curIdx;
    };

    handEl.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const cardBtn = e.target.closest('.poker-card');
      if (!cardBtn) return;
      const me = ct.players[0];
      if ((ct.phase !== 'play' && ct.phase !== 'tribute') || !me || me.done) return;
      e.preventDefault();

      // In tribute pay / return phase, single-click picks 1 eligible card cleanly
      if (ct.phase === 'tribute') {
        const step = ct.tribute?.step;
        if (step !== 'pay' && step !== 'return') return;
        const uid = Number(cardBtn.dataset.uid);
        const cObj = me.hand.find(c => c.uid === uid);
        if (step === 'pay') {
          if (!cObj || !isEligiblePayTributeCard(cObj, me.hand)) {
            showFx('进贡牌必须是手中最大的非逢人配单牌');
            return;
          }
        } else {
          if (!cObj || !isEligibleReturnCard(cObj, me.hand)) {
            showFx('还贡牌必须是 10 及以下的非级牌');
            return;
          }
        }
        if (ct.selected.has(uid)) ct.selected.clear();
        else { ct.selected.clear(); ct.selected.add(uid); }
        if (step === 'pay') renderCardTable();
        else {
          syncHandSelectionClasses();
          refreshSelectionControls();
        }
        return;
      }

      const nodes = [...handEl.querySelectorAll('.poker-card')];
      const idx = nodes.indexOf(cardBtn);
      if (idx < 0) return;
      // Measure rects ONCE on pointerdown -> ZERO layout thrash on pointermove!
      const rects = nodes.map(n => {
        const r = n.getBoundingClientRect();
        return { left: r.left, right: r.right };
      });
      handDrag = { active: true, startIdx: idx, curIdx: idx, moved: false, cards: nodes, rects, pendingRender: false };
      nodes[idx].classList.add('is-drag-over');
    });

    window.addEventListener('pointermove', (e) => {
      if (!handDrag.active) return;
      const idx = hitIndexByX(e.clientX);
      if (idx < 0 || idx === handDrag.curIdx) return;
      handDrag.curIdx = idx;
      handDrag.moved = true;
      const lo = Math.min(handDrag.startIdx, handDrag.curIdx);
      const hi = Math.max(handDrag.startIdx, handDrag.curIdx);
      updateDragOverlay(lo, hi);
    }, { passive: true });

    const endDrag = () => {
      if (!handDrag.active) return;
      const { startIdx, curIdx, cards, pendingRender } = handDrag;
      for (let i = 0; i < cards.length; i++) cards[i].classList.remove('is-drag-over');
      handDrag.active = false;
      handDrag.cards = [];
      handDrag.rects = [];
      handDrag.pendingRender = false;

      const me = ct.players[0];
      if (me && !me.done && ct.phase === 'play') {
        const lo = Math.min(startIdx, curIdx);
        const hi = Math.max(startIdx, curIdx);
        ct.prePlayQueued = false;
        if (lo === hi) {
          const btn = cards[lo];
          if (btn) {
            const uid = Number(btn.dataset.uid);
            if (ct.selected.has(uid)) ct.selected.delete(uid);
            else ct.selected.add(uid);
          }
        } else {
          const sweptUids = [];
          for (let i = lo; i <= hi; i++) {
            if (cards[i]) sweptUids.push(Number(cards[i].dataset.uid));
          }
          const sweptSet = new Set(sweptUids);
          const sweptCards = me.hand.filter(c => sweptSet.has(c.uid));
          smartSelectSweptCards(sweptCards);
        }
        syncHandSelectionClasses();
        refreshSelectionControls();
      }
      if (pendingRender) renderCardTable();
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }

  function renderCardTable() {
    if (handDrag.active) {
      handDrag.pendingRender = true;
      return;
    }
    $('#ctScoreChip').textContent = `胜场 ${ct.wins}`;
    const spChip = $('#ctSpecialChip');
    if (ct.mode === 'daifugo' && ct.revolution) {
      spChip.textContent = '⚡ 革命中（3最大）';
      spChip.hidden = false;
    } else if (ct.mode === 'guandan') {
      spChip.textContent = `当前打 ${levelRankLabel(ct.levelRank)}（红${levelRankLabel(ct.redLevel)} : 蓝${levelRankLabel(ct.blueLevel)}）`;
      spChip.hidden = false;
    } else {
      spChip.hidden = true;
    }

    renderCardTracker();

    // DDZ Kitty
    const kittyBox = $('#ctKittyBox');
    if (ct.mode === 'ddz') {
      kittyBox.hidden = false;
      $('#ctKittyCards').innerHTML = ct.kitty.map(c =>
        ct.landlord >= 0
          ? `<span class="mini-card ${c.red ? 'is-red' : ''}">${c.suit}${c.label}</span>`
          : '<span class="mini-card is-back">283</span>'
      ).join('');
    } else {
      kittyBox.hidden = true;
    }

    // Spatial seats
    if (ct.mode === 'ddz') {
      $('#seatTop').innerHTML = '';
      $('#seatRight').innerHTML = seatCardHtml(ct.players[1]);
      $('#seatLeft').innerHTML = seatCardHtml(ct.players[2]);
    } else {
      $('#seatRight').innerHTML = seatCardHtml(ct.players[1]);
      $('#seatTop').innerHTML = seatCardHtml(ct.players[2]);
      $('#seatLeft').innerHTML = seatCardHtml(ct.players[3]);
    }

    // Status Chip & Role
    const cur = ct.players[ct.turn];
    const me = ct.players[0];
    if (ct.phase === 'bid') {
      $('#ctStatusChip').textContent = ct.turn === 0 ? '请选择是否叫地主' : `${cur?.name} 正在考虑叫地主…`;
    } else if (ct.phase === 'tribute' && ct.tribute) {
      if (ct.tribute.step === 'pay') {
        $('#ctStatusChip').textContent = `🎁 ${ct.tribute.kind}·进贡阶段：请进贡最大非逢人配单牌`;
      } else if (ct.tribute.step === 'return') {
        $('#ctStatusChip').textContent = `🎁 ${ct.tribute.kind}·还贡阶段：请选 1 张 10 及以下非级牌还贡`;
      } else {
        $('#ctStatusChip').textContent = `🎁 ${ct.tribute.kind}完成 · ${ct.players[ct.tribute.leadSeat]?.name || ''} 先出牌`;
      }
    } else if (ct.phase === 'over') {
      $('#ctStatusChip').textContent = '本局已结束（已亮出全部余牌）';
    } else if (me?.done) {
      const rankTxt = ['头游', '二游', '三游'][ct.finishOrder.indexOf(0)] || '已出完';
      $('#ctStatusChip').textContent = `🎉 你已${rankTxt} · 观战 ${cur?.name || ''} 出牌中`;
    } else {
      $('#ctStatusChip').textContent = ct.turn === 0 ? '轮到你出牌！' : `${cur?.name} 回合（可提前划选牌）`;
    }

    const myLowGuandan = ct.mode === 'guandan' && ct.phase === 'play' && !me.done && (me.hand.length + ct.sfReserve.reduce((s, g) => s + g.cards.length, 0)) <= 10;
    const myLowDdz = ct.mode === 'ddz' && ct.phase === 'play' && !me.done && me.hand.length > 0 && me.hand.length <= 3;
    const myDdzBase = ct.landlord === 0 ? '👑 地主（你）' : ct.landlord > 0 ? '🌾 农民（你）' : '制作人（你）';
    $('#ctMyRole').textContent = ct.mode === 'ddz'
      ? (myLowDdz ? `${myDdzBase} · 🔔 报牌中` : myDdzBase)
      : ct.mode === 'guandan'
        ? (myLowGuandan ? '🤝 红队（你）· 🔔 报牌中' : '🤝 红队（你）')
        : '制作人（你）';

    // Bidding bar, Tribute bar & Next Round bar
    $('#ctBidBar').hidden = !(ct.phase === 'bid' && ct.turn === 0);
    const tribBar = $('#ctTributeBar');
    const tribConfirmBtn = $('#btnTributeConfirm');
    const tribAutoBtn = $('#btnTributeAuto');
    if (tribBar) {
      const showTrib = ct.phase === 'tribute' && !!ct.tribute;
      tribBar.hidden = !showTrib;
      if (showTrib) {
        if (ct.tribute.step === 'pay') {
          if (tribConfirmBtn) tribConfirmBtn.textContent = '🎁 确认进贡';
          if (tribAutoBtn) { tribAutoBtn.hidden = false; tribAutoBtn.textContent = '⚡ 一键进贡'; }
        } else if (ct.tribute.step === 'return') {
          if (tribConfirmBtn) tribConfirmBtn.textContent = '🎁 确认还贡';
          if (tribAutoBtn) { tribAutoBtn.hidden = false; tribAutoBtn.textContent = '⚡ 智能选一张还贡'; }
        } else {
          if (tribConfirmBtn) { tribConfirmBtn.textContent = '▶ 开始出牌'; tribConfirmBtn.disabled = false; }
          if (tribAutoBtn) tribAutoBtn.hidden = true;
        }
      }
    }
    const nextBar = $('#ctNextRoundBar');
    const nextBtn = $('#btnCtNextRound');
    if (nextBar && nextBtn) {
      nextBar.hidden = ct.phase !== 'over';
      if (ct.mode === 'guandan') {
        let nextTribHint = '';
        if (Array.isArray(ct.lastGuandanFinish) && ct.lastGuandanFinish.length === 4) {
          const [f0, f1, f2] = ct.lastGuandanFinish;
          if ((f0 % 2) === (f1 % 2)) nextTribHint = ' · 双贡';
          else if ((f0 % 2) === (f2 % 2)) nextTribHint = ' · 单贡';
          else nextTribHint = ' · 内供';
        }
        nextBtn.textContent = `▶ 继续下一局（打 ${levelRankLabel(ct.dealerTeam === 'blue' ? ct.blueLevel : ct.redLevel)}${nextTribHint}）`;
      } else {
        nextBtn.textContent = '▶ 再来一局';
      }
    }

    // Center pile / Tribute info / Post-round remaining cards reveal
    const tableCenterEl = $('.table-center');
    if (tableCenterEl) delete tableCenterEl.dataset.pileSeat;

    if (ct.phase === 'bid') {
      $('#ctCenterMeta').textContent = '叫地主阶段：叫地主可获得 3 张底牌并优先出牌';
      $('#ctCenterCards').innerHTML = '';
    } else if (ct.phase === 'tribute' && ct.tribute) {
      const renderTribCard = (c, foot) => `
        <div class="poker-card ${c.red ? 'is-red' : ''} ${c.joker ? 'is-joker' : ''} ${c.val === ct.levelRank ? 'is-level' : ''} ${isGuandanWild(c, 'guandan') ? 'is-wild' : ''}">
          <span class="pc-rank">${c.label}</span>
          <span class="pc-suit">${c.suit}</span>
          <span class="pc-foot">${foot}</span>
        </div>
      `;
      if (ct.tribute.step === 'pay') {
        const picked = me.hand.find(c => ct.selected.has(c.uid)) || pickForcedTributeCard(me.hand);
        $('#ctCenterMeta').textContent = ct.tribute.summary;
        $('#ctCenterCards').innerHTML = picked ? renderTribCard(picked, '待进贡牌') : '';
      } else if (ct.tribute.step === 'return') {
        const hp = ct.tribute.humanPair;
        $('#ctCenterMeta').textContent = `🎁 ${ct.tribute.summary} ｜ 请在手牌中点选 1 张 ≤10 的非级牌还贡给 ${ct.players[hp.payer].name}`;
        const paidList = (ct.tribute.pairs || [hp]).filter(pr => pr?.paidCard);
        $('#ctCenterCards').innerHTML = paidList.map(pr => renderTribCard(pr.paidCard, `${ct.players[pr.payer].name} 进贡`)).join('');
      } else {
        $('#ctCenterMeta').textContent = ct.tribute.summary;
        const revCards = (ct.tribute.revealCards || []).filter(item => item?.card);
        $('#ctCenterCards').innerHTML = revCards.map(item => renderTribCard(item.card, item.tag || '贡牌')).join('');
      }
    } else if (ct.phase === 'over') {
      if (ct.mode === 'guandan' && ct.finishOrder.length) {
        const labels = ['🥇头游', '🥈二游', '🥉三游', '末游'];
        const summary = ct.finishOrder.map((pid, idx) => `${labels[idx] || ''} ${ct.players[pid]?.name || ''}`).join(' · ');
        $('#ctCenterMeta').textContent = summary;
      } else {
        $('#ctCenterMeta').textContent = '本局已结束 · 剩余手牌一览';
      }
      const remRows = ct.players.map(pl => {
        const cards = pl.id === 0 && ct.mode === 'guandan'
          ? [...pl.hand, ...ct.sfReserve.flatMap(g => g.cards)]
          : pl.hand;
        if (!cards.length) return `<div class="over-rem-row"><strong>${pl.name}</strong><span class="over-rem-done">✓ 已出完</span></div>`;
        return `<div class="over-rem-row"><strong>${pl.name}（余${cards.length}张）</strong><div class="over-rem-cards">${cards.map(c => `<span class="mini-card ${c.red ? 'is-red' : ''} ${c.joker ? 'is-joker' : ''} ${isGuandanWild(c, ct.mode) ? 'is-wild' : ''}">${c.suit}${c.label}</span>`).join('')}</div></div>`;
      }).join('');
      $('#ctCenterCards').innerHTML = `<div class="ct-over-reveal">${remRows}</div>`;
    } else if (!ct.pile) {
      $('#ctCenterMeta').textContent = ct.turn === 0 && !me?.done ? '桌面已清空，请你自由出牌' : `等待 ${cur?.name || ''} 领出…`;
      $('#ctCenterCards').innerHTML = '';
    } else {
      const ownerId = ct.pile.owner;
      const ownerName = ct.players[ownerId]?.name || '';
      let roleTag = '';
      let roleCls = 'is-foe';
      if (ownerId === 0) {
        roleTag = '我方';
        roleCls = 'is-me';
      } else if (ct.mode === 'guandan') {
        const isMate = ownerId === 2;
        roleTag = isMate ? '队友' : '对手';
        roleCls = isMate ? 'is-ally' : 'is-foe';
      } else if (ct.mode === 'ddz') {
        const isMate = ct.landlord !== 0 && ownerId !== ct.landlord;
        roleTag = ownerId === ct.landlord ? '对手·地主' : (isMate ? '队友·农民' : '对手·农民');
        roleCls = isMate ? 'is-ally' : 'is-foe';
      } else {
        roleTag = '对手';
        roleCls = 'is-foe';
      }
      if (tableCenterEl) {
        let seatPos = 'bottom';
        if (ct.mode === 'ddz') {
          seatPos = ownerId === 1 ? 'right' : (ownerId === 2 ? 'left' : 'bottom');
        } else {
          seatPos = ownerId === 1 ? 'right' : (ownerId === 2 ? 'top' : (ownerId === 3 ? 'left' : 'bottom'));
        }
        tableCenterEl.dataset.pileSeat = seatPos;
      }
      $('#ctCenterMeta').innerHTML = `<span class="pile-role-badge ${roleCls}">${roleTag}</span> ${ownerName} 打出 · ${ct.pile.combo.name}`;
      $('#ctCenterCards').innerHTML = ct.pile.cards.map(c => `
        <div class="poker-card ${c.red ? 'is-red' : ''} ${c.joker ? 'is-joker' : ''} ${ct.mode === 'guandan' && c.val === ct.levelRank ? 'is-level' : ''} ${isGuandanWild(c, ct.mode) ? 'is-wild' : ''}">
          <span class="pc-rank">${c.label}</span>
          <span class="pc-suit">${c.suit}</span>
          <span class="pc-foot">${c.label}</span>
        </div>
      `).join('');
    }

    // My hand
    const reservedCount = ct.mode === 'guandan'
      ? ct.sfReserve.reduce((s, g) => s + g.cards.length, 0)
      : 0;
    $('#ctMyCount').textContent = reservedCount > 0
      ? `${me.hand.length + reservedCount}（含备选 ${reservedCount}）`
      : String(me.hand.length);

    const myTurn = ct.phase === 'play' && ct.turn === 0 && !me.done;

    // Guandan Reserve Tray (同花顺 + 炸弹备选区 · 四炸以上支持点选任意牌退回手牌)
    const pinBtn = $('#btnCtPinSf');
    const pinBombBtn = $('#btnCtPinBomb');
    const sfTray = $('#ctSfReserve');
    if (ct.mode === 'guandan') {
      if (sfTray) {
        if (ct.sfReserve.length > 0) {
          sfTray.hidden = false;
          sfTray.innerHTML = `
            <span class="sf-reserve-title">✨ 备选牌组（${ct.sfReserve.length}组 · 点选炸弹单张可退回手牌）</span>
            <div class="sf-reserve-list">
              ${ct.sfReserve.map(grp => {
                const canPlayGrp = myTurn && canBeatCombo(grp.combo, ct.pile?.combo);
                const isBomb = grp.kind === 'bomb';
                const canPickBack = isBomb && grp.cards.length >= 4;
                const pickedSet = grp.pickedUids instanceof Set ? grp.pickedUids : (grp.pickedUids = new Set());
                const tag = isBomb ? `💣 ${grp.combo?.name || `${grp.cards.length}炸`}` : '🌈 同花顺';
                return `
                  <div class="sf-reserve-item ${isBomb ? 'is-bomb' : ''}" data-sf-id="${grp.id}">
                    <span class="sf-item-tag">${tag}</span>
                    <div class="sf-mini-cards">
                      ${grp.cards.map(c => canPickBack
                        ? `<button type="button" class="sf-mini-card is-pickable ${c.red ? 'is-red' : ''} ${isGuandanWild(c, 'guandan') ? 'is-wild' : ''} ${pickedSet.has(c.uid) ? 'is-pick' : ''}" data-sf-pick-grp="${grp.id}" data-sf-pick-uid="${c.uid}" title="点击选中/取消退回手牌">${c.suit}${c.label}</button>`
                        : `<span class="sf-mini-card ${c.red ? 'is-red' : ''} ${isGuandanWild(c, 'guandan') ? 'is-wild' : ''}">${c.suit}${c.label}</span>`
                      ).join('')}
                    </div>
                    <div class="sf-item-acts">
                      <button type="button" class="sf-act-btn play" data-sf-play="${grp.id}" ${canPlayGrp ? '' : 'disabled'}>打出</button>
                      ${canPickBack && pickedSet.size > 0
                        ? `<button type="button" class="sf-act-btn back-picked" data-sf-return-picked="${grp.id}">退回(${pickedSet.size})</button>`
                        : ''}
                      <button type="button" class="sf-act-btn" data-sf-return="${grp.id}">全放回</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `;
          sfTray.querySelectorAll('[data-sf-pick-uid]').forEach(btn => {
            btn.addEventListener('click', () => {
              toggleReservedCardPick(Number(btn.dataset.sfPickGrp), Number(btn.dataset.sfPickUid));
            });
          });
          sfTray.querySelectorAll('[data-sf-return-picked]').forEach(btn => {
            btn.addEventListener('click', () => returnPickedReservedCards(Number(btn.dataset.sfReturnPicked)));
          });
          sfTray.querySelectorAll('[data-sf-play]').forEach(btn => {
            btn.addEventListener('click', () => playReservedSf(Number(btn.dataset.sfPlay)));
          });
          sfTray.querySelectorAll('[data-sf-return]').forEach(btn => {
            btn.addEventListener('click', () => returnReservedSf(Number(btn.dataset.sfReturn)));
          });
        } else {
          sfTray.hidden = true;
          sfTray.innerHTML = '';
        }
      }
    } else {
      if (pinBtn) pinBtn.hidden = true;
      if (pinBombBtn) pinBombBtn.hidden = true;
      if (sfTray) { sfTray.hidden = true; sfTray.innerHTML = ''; }
    }

    const handEl = $('#ctMyHand');
    if (me.done && ct.phase === 'play') {
      const rankTxt = ['🥇 头游', '🥈 二游', '🥉 三游'][ct.finishOrder.indexOf(0)] || '已出完';
      const partnerRem = ct.mode === 'guandan' ? (ct.players[2]?.hand?.length || 0) : 0;
      handEl.innerHTML = `
        <div class="ct-spectator-bar">
          <span>🎉 你已夺得 ${rankTxt}！${ct.mode === 'guandan' ? `搭档 ${ct.players[2]?.name || ''} 剩余 ${partnerRem} 张，正在自动继续对局…` : '其余玩家继续对局中…'}</span>
          <button type="button" class="act-btn gold" id="btnCtFastFinish">${ct.fastFinish ? '⚡ 极速进行中…' : '⏩ 加速本局'}</button>
        </div>
      `;
      $('#btnCtFastFinish')?.addEventListener('click', () => {
        ct.fastFinish = true;
        renderCardTable();
      });
    } else {
      const tribStep = ct.phase === 'tribute' ? ct.tribute?.step : null;
      const isPayPhase = tribStep === 'pay';
      const isRetPhase = tribStep === 'return';
      handEl.innerHTML = me.hand.map(c => {
        const retOk = (isPayPhase && isEligiblePayTributeCard(c, me.hand)) || (isRetPhase && isEligibleReturnCard(c, me.hand));
        const retNo = (isPayPhase || isRetPhase) && !retOk;
        return `
        <button type="button" draggable="false" class="poker-card ${c.red ? 'is-red' : ''} ${c.joker ? 'is-joker' : ''} ${ct.mode === 'guandan' && c.val === ct.levelRank ? 'is-level' : ''} ${isGuandanWild(c, ct.mode) ? 'is-wild' : ''} ${ct.selected.has(c.uid) ? 'is-selected' : ''} ${retOk ? 'is-return-eligible' : ''} ${retNo ? 'is-return-disabled' : ''}" data-uid="${c.uid}">
          <span class="pc-rank">${c.label}</span>
          <span class="pc-suit">${c.suit}</span>
          <span class="pc-foot">${c.label}</span>
        </button>
      `;
      }).join('');
      setupHandDragEvents();
    }

    refreshSelectionControls();
  }

  function pinStraightFlushToReserve() {
    if (ct.mode !== 'guandan' || ct.phase !== 'play' || ct.players[0]?.done) return false;
    const me = ct.players[0];
    const selCards = me.hand.filter(c => ct.selected.has(c.uid));
    const selCombo = selCards.length === 5 ? classifyCombo(selCards, 'guandan') : null;
    let chosenCards = null;
    let chosenCombo = null;
    if (selCombo && selCombo.type === 'sf') {
      chosenCards = orderGuandanStraightCards(selCards, selCombo.pattern);
      chosenCombo = selCombo;
    } else {
      const avail = findHandStraightFlushes(me.hand);
      if (avail.length > 0) {
        chosenCards = avail[0].cards;
        chosenCombo = avail[0].combo;
      }
    }
    if (!chosenCards || !chosenCombo) {
      showFx('手牌暂未凑齐同花顺（可选5张同花顺或红桃2配牌）');
      return false;
    }
    const uids = new Set(chosenCards.map(c => c.uid));
    me.hand = me.hand.filter(c => !uids.has(c.uid));
    ct.selected.clear();
    ct.sfReserve.push({
      id: ct.sfReserveSeq++,
      kind: 'sf',
      cards: chosenCards,
      combo: chosenCombo,
      suit: chosenCombo.suit || chosenCards[0]?.suit || '♠',
      pickedUids: new Set()
    });
    showFx('🌈 已将同花顺放入备选区！');
    renderCardTable();
    return true;
  }

  function pinBombToReserve() {
    if (ct.mode !== 'guandan' || ct.phase !== 'play' || ct.players[0]?.done) return false;
    const me = ct.players[0];
    const selCards = me.hand.filter(c => ct.selected.has(c.uid));
    const selCombo = selCards.length >= 4 ? classifyCombo(selCards, 'guandan') : null;
    let chosenCards = null;
    let chosenCombo = null;
    if (selCombo && selCombo.bomb > 0 && selCombo.type !== 'sf') {
      chosenCards = selCards.slice();
      chosenCombo = selCombo;
    } else {
      const avail = findHandBombs(me.hand);
      if (avail.length > 0) {
        chosenCards = avail[0].cards;
        chosenCombo = avail[0].combo;
      }
    }
    if (!chosenCards || !chosenCombo) {
      showFx('手牌暂无可提取的四炸及以上 / 天王炸');
      return false;
    }
    const uids = new Set(chosenCards.map(c => c.uid));
    me.hand = me.hand.filter(c => !uids.has(c.uid));
    ct.selected.clear();
    ct.prePlayQueued = false;
    ct.sfReserve.push({
      id: ct.sfReserveSeq++,
      kind: 'bomb',
      cards: chosenCards,
      combo: chosenCombo,
      pickedUids: new Set()
    });
    showFx(`💣 已将「${chosenCombo.name || `${chosenCards.length}炸`}」放入备选区（点击单张可挑回手牌）`);
    renderCardTable();
    return true;
  }

  function toggleReservedCardPick(sfId, uid) {
    const grp = ct.sfReserve.find(g => g.id === sfId);
    if (!grp || grp.kind !== 'bomb' || grp.cards.length < 4) return false;
    if (!(grp.pickedUids instanceof Set)) grp.pickedUids = new Set();
    if (grp.pickedUids.has(uid)) grp.pickedUids.delete(uid);
    else grp.pickedUids.add(uid);
    renderCardTable();
    return true;
  }

  function returnPickedReservedCards(sfId) {
    const idx = ct.sfReserve.findIndex(g => g.id === sfId);
    if (idx < 0) return false;
    const grp = ct.sfReserve[idx];
    const picked = grp.pickedUids instanceof Set ? grp.pickedUids : new Set();
    if (picked.size === 0) return false;

    const toReturn = grp.cards.filter(c => picked.has(c.uid));
    const remaining = grp.cards.filter(c => !picked.has(c.uid));
    const remainCombo = remaining.length >= 4 ? classifyCombo(remaining, 'guandan') : null;

    if (remainCombo && remainCombo.bomb > 0) {
      // Remaining cards still form a valid >= 4 bomb (e.g. 5-bomb -> 4-bomb, 6-bomb -> 4/5-bomb)!
      grp.cards = remaining;
      grp.combo = remainCombo;
      grp.pickedUids = new Set();
      ct.players[0].hand.push(...toReturn);
      sortHand(ct.players[0].hand, 'guandan');
      showFx(`已退回 ${toReturn.length} 张牌到手牌，备选保留「${remainCombo.name || `${remaining.length}炸`}」`);
    } else {
      // Returning these cards breaks the 4-bomb, so return entire group cleanly back to hand
      ct.sfReserve.splice(idx, 1);
      ct.players[0].hand.push(...grp.cards);
      sortHand(ct.players[0].hand, 'guandan');
      showFx(`剩余不足四炸，已将整组 ${grp.cards.length} 张全部退回手牌`);
    }
    renderCardTable();
    return true;
  }

  function returnReservedSf(sfId) {
    const idx = ct.sfReserve.findIndex(g => g.id === sfId);
    if (idx < 0) return false;
    const [grp] = ct.sfReserve.splice(idx, 1);
    ct.players[0].hand.push(...grp.cards);
    sortHand(ct.players[0].hand, 'guandan');
    renderCardTable();
    return true;
  }

  function playReservedSf(sfId) {
    if (ct.mode !== 'guandan' || ct.phase !== 'play' || ct.turn !== 0 || ct.players[0]?.done) return false;
    const idx = ct.sfReserve.findIndex(g => g.id === sfId);
    if (idx < 0) return false;
    const grp = ct.sfReserve[idx];
    if (!canBeatCombo(grp.combo, ct.pile?.combo)) {
      showFx('当前备选同花顺压不过桌面牌型');
      return false;
    }
    ct.sfReserve.splice(idx, 1);
    commitMove(0, grp.cards, grp.combo, gameSerial);
    return true;
  }

  /* ── Bidding Logic (DDZ) ── */
  function assignLandlord(idx) {
    ct.landlord = idx;
    ct.players[idx].hand.push(...ct.kitty);
    sortHand(ct.players[idx].hand, 'ddz');
    ct.phase = 'play';
    ct.turn = idx;
    ct.players[idx].speech = '我来当地主！';
    showFx(`👑 ${ct.players[idx].name} 成为地主！`);
    renderCardTable();
    if (idx !== 0) runAiTurnAsync(gameSerial);
  }

  async function aiBidStep(serial) {
    if (serial !== gameSerial || ct.phase !== 'bid') return;
    if (!(await waitUntilArcadeForeground(serial))) return;
    if (serial !== gameSerial || ct.phase !== 'bid') return;
    const p = ct.players[ct.turn];
    p.thinking = true;
    renderCardTable();
    await new Promise(r => setTimeout(r, 850));
    if (!(await waitUntilArcadeForeground(serial))) return;
    if (serial !== gameSerial || ct.phase !== 'bid') return;
    p.thinking = false;
    // Evaluate hand strength for bidding (honest, no peeking)
    const power = p.hand.reduce((s, c) => s + (c.joker ? 4 : c.val === 15 ? 2 : c.val === 14 ? 1 : 0), 0);
    const wants = power >= (getDifficulty() === 'casual' ? 7 : 6);
    if (wants) {
      assignLandlord(ct.turn);
      return;
    }
    p.speech = '不叫…';
    ct.bidStep++;
    if (ct.bidStep >= 3) {
      showFx('三家都不叫，重新洗牌发牌！');
      setTimeout(() => { if (serial === gameSerial) startCardGame('ddz', false); }, 700);
      return;
    }
    ct.turn = (ct.turn + 1) % 3;
    renderCardTable();
    if (ct.turn !== 0) aiBidStep(serial);
  }

  $('#btnBidCall')?.addEventListener('click', () => {
    if (ct.phase === 'bid' && ct.turn === 0) assignLandlord(0);
  });
  $('#btnBidPass')?.addEventListener('click', () => {
    if (ct.phase !== 'bid' || ct.turn !== 0) return;
    ct.bidStep++;
    if (ct.bidStep >= 3) {
      showFx('三家都不叫，重新洗牌发牌！');
      setTimeout(() => startCardGame('ddz', false), 650);
      return;
    }
    ct.turn = (ct.turn + 1) % 3;
    renderCardTable();
    if (ct.turn !== 0) aiBidStep(gameSerial);
  });

  $('#btnTributeConfirm')?.addEventListener('click', () => {
    if (ct.phase !== 'tribute' || !ct.tribute) return;
    const step = ct.tribute.step;
    if (step === 'reveal') {
      finishTributeReveal(gameSerial);
      return;
    }
    const me = ct.players[0];
    const sel = me?.hand.filter(c => ct.selected.has(c.uid)) || [];
    if (step === 'pay') {
      if (sel.length !== 1) {
        showFx('请先点选 1 张手中最大的非逢人配单牌进贡');
        return;
      }
      completeHumanPayTribute(sel[0]);
      return;
    }
    if (sel.length !== 1) {
      showFx('请先点选 1 张 10 及以下的非级牌还贡');
      return;
    }
    completeHumanReturnTribute(sel[0]);
  });
  $('#btnTributeAuto')?.addEventListener('click', () => {
    if (ct.phase !== 'tribute' || !ct.tribute) return;
    if (ct.tribute.step === 'pay') completeHumanPayTribute(null);
    else if (ct.tribute.step === 'return') completeHumanReturnTribute(null);
  });

  /* ── Execute Play & Voice-Synced Turn Progression ── */
  async function commitMove(playerIdx, cards, combo, serial) {
    if (serial !== gameSerial) return;
    const p = ct.players[playerIdx];
    const uids = new Set(cards.map(c => c.uid));
    p.hand = p.hand.filter(c => !uids.has(c.uid));
    ct.playedCards.push(...cards);
    if (ct.playedByPlayer[playerIdx]) ct.playedByPlayer[playerIdx].push(...cards);
    ct.lastMoveByPlayer[playerIdx] = cards.slice();
    ct.actionHistory.push(cards.slice());
    if (combo.bomb > 0) ct.bombNum = (ct.bombNum || 0) + 1;
    ct.pile = { owner: playerIdx, cards, combo };
    ct.passCount = 0;
    // CRITICAL: Only clear human selection when human (playerIdx === 0) actually plays!
    // Never wipe pre-selected cards when an AI opponent plays!
    if (playerIdx === 0) {
      ct.selected.clear();
      ct.prePlayQueued = false;
    }

    let voiceKind = 'play';
    if (ct.mode === 'daifugo' && combo.isRev) {
      ct.revolution = !ct.revolution;
      ct.players.forEach(pl => sortHand(pl.hand, 'daifugo'));
      p.speech = '革命！大小反转！';
      showFx('⚡ 革命触发！');
      voiceKind = 'rev';
    } else if (ct.mode === 'daifugo' && combo.isEight) {
      p.speech = '8 切清场！';
      showFx('✨ 8 切清场！');
      voiceKind = 'eight';
    } else if (combo.bomb > 0) {
      p.speech = combo.name + '！';
      showFx(combo.name + '！');
      voiceKind = 'rev';
    } else {
      p.speech = `${combo.name}：${cards.slice(0, 4).map(c => c.label).join(' ')}${cards.length > 4 ? '…' : ''}`;
    }

    const myTotalRem = playerIdx === 0 && ct.mode === 'guandan'
      ? p.hand.length + ct.sfReserve.reduce((s, g) => s + g.cards.length, 0)
      : p.hand.length;

    // Trigger contextual idol reaction emotes!
    if (playerIdx > 0) {
      if (combo.bomb > 0 || combo.isRev || combo.isEight) setEmote(p, 'smug');
      else if (cards.length >= 4 || combo.main >= 14) setEmote(p, 'happy');
    } else {
      if (combo.bomb > 0 || myTotalRem <= 3) {
        ct.players.slice(1).forEach(opp => {
          if (!opp.done) setEmote(opp, isTeammate(0, opp.id) ? 'cheer' : 'panic');
        });
      }
    }

    const finishedNow = myTotalRem === 0;
    if (finishedNow) {
      p.done = true;
      if (!ct.finishOrder.includes(p.id)) ct.finishOrder.push(p.id);
      const finRank = ct.finishOrder.indexOf(p.id);
      const rankTitle = ['头游', '二游', '三游', '末游'][finRank] || '出完';
      p.speech = ct.mode === 'guandan' ? `${rankTitle}出完啦♪` : '出完啦♪';
      voiceKind = 'clear';
      if (playerIdx > 0) setEmote(p, 'cheer');
      else {
        if (ct.mode === 'guandan') showFx(`🎉 制作人夺得${rankTitle}！对局继续…`);
        ct.players.slice(1).forEach(opp => setEmote(opp, isTeammate(0, opp.id) ? 'cheer' : 'sad'));
      }
    } else if (ct.mode === 'guandan' && myTotalRem <= 10) {
      // Guandan Official Continuous Alert: report remaining count EVERY play when <= 10 cards!
      p.speech = `🔔 报牌！还剩 ${myTotalRem} 张！`;
      showFx(`🚨 ${p.name} 报牌：只剩 ${myTotalRem} 张！`);
    } else if (ct.mode === 'ddz' && myTotalRem > 0 && myTotalRem <= 3) {
      // DDZ Official Alert: 报牌 (3 cards) / 报双 (2 cards) / 报单 (1 card)!
      const tag = myTotalRem === 1 ? '报单' : myTotalRem === 2 ? '报双' : '报牌';
      p.speech = `🔔 ${tag}！只剩 ${myTotalRem} 张！`;
      showFx(`🚨 ${p.name} ${tag}：只剩 ${myTotalRem} 张！`);
    }

    renderCardTable();
    ddzBgm?.sync?.();

    // Wait for idol voice to finish cleanly (skip long blocking wait when fast-finishing spectator round)
    if (playerIdx > 0 && !ct.fastFinish) {
      const maxWait = ct.players[0]?.done ? 1100 : 4200;
      await playVoiceAndWait(pickIdolVoiceKey(p.charId, voiceKind), maxWait);
      if (serial !== gameSerial) return;
    }

    // Check Win Conditions
    if (ct.mode === 'ddz' && finishedNow) {
      ct.phase = 'over';
      const humanWon = (playerIdx === 0) || (playerIdx !== ct.landlord && ct.landlord !== 0);
      if (humanWon) {
        ct.wins++;
        localStorage.setItem('shiny.arcade.wins', String(ct.wins));
        showFx(ct.landlord === 0 ? '👑 地主大胜！' : '🎉 农民联手胜利！');
      } else {
        showFx(playerIdx === ct.landlord ? '👑 地主获胜！' : '🌾 农民获胜！');
      }
      ddzBgm?.playResult?.(humanWon);
      renderCardTable();
      return;
    }

    if (ct.mode === 'guandan') {
      const redDone = ct.players[0].done && ct.players[2].done;
      const blueDone = ct.players[1].done && ct.players[3].done;
      const remActive = ct.players.filter(pl => !pl.done);
      if (redDone || blueDone || remActive.length <= 1) {
        // Append any remaining unfinished players to finishOrder cleanly
        for (const rem of remActive) {
          rem.done = true;
          if (!ct.finishOrder.includes(rem.id)) ct.finishOrder.push(rem.id);
        }
        ct.phase = 'over';
        // Save exact finishing order [1st, 2nd, 3rd, 4th] for next round's official Guandan tribute & lead turn!
        ct.lastGuandanFinish = ct.finishOrder.slice(0, 4);
        // Official National Guandan Upgrade Rules:
        // First finisher (头游) team ALWAYS wins the round!
        // Partner 2nd (双下) => +3 levels | Partner 3rd (单下) => +2 levels | Partner 4th (保级) => +1 level
        const firstId = ct.finishOrder[0] ?? 0;
        const winIsRed = (firstId % 2 === 0);
        const partnerId = (firstId + 2) % 4;
        const partnerRank = ct.finishOrder.indexOf(partnerId); // 1 = 2nd, 2 = 3rd, 3 = 4th
        const upSteps = partnerRank === 1 ? 3 : partnerRank === 2 ? 2 : 1;
        const tag = partnerRank === 1 ? '双下 +3级' : partnerRank === 2 ? '单下 +2级' : '头游保级 +1级';
        if (winIsRed) {
          ct.wins++;
          localStorage.setItem('shiny.arcade.wins', String(ct.wins));
          ct.redLevel = advanceGuandanLevel(ct.redLevel, upSteps);
          ct.dealerTeam = 'red';
          showFx(`🏆 红队胜利（${tag}）· 下局打 ${levelRankLabel(ct.redLevel)}！`);
        } else {
          ct.blueLevel = advanceGuandanLevel(ct.blueLevel, upSteps);
          ct.dealerTeam = 'blue';
          showFx(`蓝队获胜（${tag}）· 下局打 ${levelRankLabel(ct.blueLevel)}`);
        }
        ddzBgm?.playResult?.(winIsRed);
        renderCardTable();
        return;
      }
    }

    if (ct.mode === 'daifugo' && ct.players.filter(pl => !pl.done).length <= 1) {
      const last = ct.players.find(pl => !pl.done);
      if (last) { last.done = true; if (!ct.finishOrder.includes(last.id)) ct.finishOrder.push(last.id); }
      ct.phase = 'over';
      const myRank = ct.finishOrder.indexOf(0);
      if (myRank === 0) {
        ct.wins++;
        localStorage.setItem('shiny.arcade.wins', String(ct.wins));
        showFx('👑 制作人夺得大富豪！');
      } else {
        showFx(`本局结束 · 第 ${myRank + 1} 名`);
      }
      renderCardTable();
      return;
    }

    // Daifugo 8-cut: same player goes again on clean table
    if (ct.mode === 'daifugo' && combo.isEight && !finishedNow) {
      ct.pile = null;
      ct.passCount = 0;
      renderCardTable();
      if (playerIdx !== 0) runAiTurnAsync(serial);
      return;
    }

    advanceCardTurn(serial, ct.mode === 'daifugo' && combo.isEight);
  }

  function advanceCardTurn(serial, clearPile = false) {
    if (serial !== gameSerial || ct.phase !== 'play') return;
    if (clearPile) { ct.pile = null; ct.passCount = 0; }
    const n = ct.players.length;
    const activePlayers = ct.players.filter(p => !p.done);
    const activeCount = activePlayers.length;
    if (activeCount === 0) return;

    let next = ct.turn;
    for (let step = 0; step < n; step++) {
      next = (next + 1) % n;
      if (!ct.players[next].done) break;
    }

    // Accurate pass threshold: if pile owner already finished (done=true), ALL activeCount remaining
    // players must get a turn to beat or pass before 接风 triggers!
    const ownerDone = !!(ct.pile && ct.players[ct.pile.owner]?.done);
    const passNeeded = ownerDone ? activeCount : Math.max(1, activeCount - 1);

    if (ct.pile && (next === ct.pile.owner || ct.passCount >= passNeeded)) {
      if (ct.mode === 'guandan' && ownerDone) {
        const partnerIdx = (ct.pile.owner + 2) % 4;
        if (!ct.players[partnerIdx].done) {
          next = partnerIdx;
          showFx('💨 搭档接风！');
        }
      }
      ct.pile = null;
      ct.passCount = 0;
    }

    // Hard safety guard: NEVER land on a finished player (especially player 0!)
    if (ct.players[next]?.done) {
      next = activePlayers[0].id;
    }

    ct.turn = next;
    renderCardTable();

    if (ct.turn !== 0) {
      runAiTurnAsync(serial);
    } else if (ct.prePlayQueued && !ct.players[0].done) {
      // Auto-play pre-selected cards immediately when player's turn arrives!
      const me = ct.players[0];
      const cards = me.hand.filter(c => ct.selected.has(c.uid));
      const combo = classifyCombo(cards, ct.mode);
      if (combo && canBeatCombo(combo, ct.pile?.combo)) {
        ct.prePlayQueued = false;
        setTimeout(() => {
          if (serial === gameSerial && ct.phase === 'play' && ct.turn === 0) {
            commitMove(0, cards, combo, serial);
          }
        }, 160);
      } else {
        ct.prePlayQueued = false;
        showFx('桌面牌型变动，已保留你的预选牌，请调整后出牌');
        refreshSelectionControls();
      }
    }
  }

  async function runAiTurnAsync(serial) {
    if (serial !== gameSerial || ct.phase !== 'play') return;
    if (!(await waitUntilArcadeForeground(serial))) return;
    if (serial !== gameSerial || ct.phase !== 'play') return;
    const idx = ct.turn;
    const p = ct.players[idx];
    if (!p || p.done) { advanceCardTurn(serial); return; }

    // Realistic Thinking Time (brisk spectator speed once human finished, ultra-fast if fastFinish clicked!)
    p.thinking = true;
    renderCardTable();
    const diff = getDifficulty();
    const humanSpectating = !!ct.players[0]?.done;
    const thinkMs = ct.fastFinish
      ? 65
      : humanSpectating
        ? 340
        : (diff === 'master' ? 1250 : diff === 'pro' ? 1050 : 850) + Math.floor(Math.random() * 480);
    await new Promise(r => setTimeout(r, thinkMs));
    if (!(await waitUntilArcadeForeground(serial))) return;
    if (serial !== gameSerial || ct.phase !== 'play') return;
    p.thinking = false;

    const chosen = chooseAiMove(idx);
    if (chosen) {
      await commitMove(idx, chosen.cards, chosen.combo, serial);
    } else {
      const passedTeammate = !!(ct.pile && isTeammate(idx, ct.pile.owner));
      if (passedTeammate) {
        p.speech = '好牌，过~ ♪';
        if (Math.random() < 0.35 && !ct.fastFinish) setEmote(p, 'cheer');
      } else {
        p.speech = '不出 / Pass';
        if (Math.random() < 0.45 && !ct.fastFinish) setEmote(p, 'sad');
      }
      ct.actionHistory.push([]);
      ct.passCount++;
      renderCardTable();
      if (!ct.fastFinish) {
        await playVoiceAndWait(pickIdolVoiceKey(p.charId, 'pass'), humanSpectating ? 900 : 4200);
        if (serial !== gameSerial) return;
      }
      advanceCardTurn(serial);
    }
  }

  /* ── Player Controls ── */
  $('#btnCtPlay')?.addEventListener('click', () => {
    if (ct.phase !== 'play' || ct.players[0]?.done) return;
    const cards = ct.players[0].hand.filter(c => ct.selected.has(c.uid));
    const combo = classifyCombo(cards, ct.mode);
    if (ct.turn !== 0) {
      // Off-turn: toggle Pre-Play Queue (提前选好牌，到回合自动出！)
      if (!combo) {
        showFx('请先划选合法牌型再预约出牌');
        return;
      }
      ct.prePlayQueued = !ct.prePlayQueued;
      showFx(ct.prePlayQueued ? `⚡ 已预约「${combo.name}」，到你回合自动打出！` : '已取消预约出牌（仍保留选牌）');
      refreshSelectionControls();
      return;
    }
    if (!combo || !canBeatCombo(combo, ct.pile?.combo)) {
      showFx('牌型不合法或压不过桌面');
      return;
    }
    commitMove(0, cards, combo, gameSerial);
  });

  $('#btnCtPass')?.addEventListener('click', () => {
    if (ct.phase !== 'play' || ct.turn !== 0 || !ct.pile) return;
    ct.selected.clear();
    ct.prePlayQueued = false;
    ct.actionHistory.push([]);
    ct.passCount++;
    advanceCardTurn(gameSerial);
  });

  $('#btnCtPinSf')?.addEventListener('click', () => pinStraightFlushToReserve());
  $('#btnCtPinBomb')?.addEventListener('click', () => pinBombToReserve());

  $('#btnCtTracker')?.addEventListener('click', () => {
    ct.trackerEnabled = !ct.trackerEnabled;
    try { localStorage.setItem('shiny.arcade.tracker', String(ct.trackerEnabled)); } catch {}
    renderCardTracker();
  });

  $('#btnCtNextRound')?.addEventListener('click', () => startCardGame(ct.mode, false));

  $('#btnCtHint')?.addEventListener('click', () => {
    if (ct.phase !== 'play' || ct.turn !== 0) return;
    const hint = chooseAiMove(0);
    ct.selected.clear();
    ct.prePlayQueued = false;
    if (hint) {
      hint.cards.forEach(c => ct.selected.add(c.uid));
      syncHandSelectionClasses();
      refreshSelectionControls();
    } else if (ct.mode === 'guandan' && ct.sfReserve.some(g => canBeatCombo(g.combo, ct.pile?.combo))) {
      syncHandSelectionClasses();
      refreshSelectionControls();
      showFx('手牌压不过，可直接点备选区 🌈 同花顺「打出」！');
    } else {
      syncHandSelectionClasses();
      refreshSelectionControls();
      showFx('没有能压过的牌，请点「不出」');
    }
  });

  $('#btnCtClearSel')?.addEventListener('click', () => {
    ct.selected.clear();
    ct.prePlayQueued = false;
    syncHandSelectionClasses();
    refreshSelectionControls();
  });
  $('#btnCtRestart')?.addEventListener('click', () => {
    // Only reset previous Guandan finish order when aborting mid-round; after a finished round keep tribute!
    if (ct.mode !== 'guandan' || ct.phase !== 'over') {
      ct.lastGuandanFinish = null;
    }
    startCardGame(ct.mode, false);
  });
  function openOpponentPicker() {
    const aiCount = ct.mode === 'ddz' ? 2 : 3;
    const seatLabels = ct.mode === 'ddz'
      ? ['右家', '左家']
      : (ct.mode === 'guandan' ? ['右家（对手）', '对家（搭档）', '左家（对手）'] : ['右家', '对家', '左家']);
    const pool = portraits.length ? portraits : pickIdols(3);
    const currentIds = ct.players.slice(1).map(p => String(p.raw?.id || ''));

    let modal = document.getElementById('opponentPickerModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'opponentPickerModal';
      modal.className = 'opp-picker-backdrop';
      document.body.appendChild(modal);
    }

    const optsHtml = (selectedId) => pool.map(idol =>
      `<option value="${String(idol.id)}" ${String(idol.id) === selectedId ? 'selected' : ''}>${idol.name}</option>`
    ).join('');

    modal.innerHTML = `
      <div class="opp-picker-card" role="dialog" aria-modal="true" aria-label="选择牌桌对手">
        <div class="opp-picker-head">
          <strong>🎭 自选牌桌偶像</strong>
          <button type="button" class="opp-picker-close" id="btnOppClose" aria-label="关闭">✕</button>
        </div>
        <div class="opp-picker-slots">
          ${Array.from({ length: aiCount }, (_, i) => {
            const cur = pool.find(x => String(x.id) === currentIds[i]) || pool[i % pool.length];
            const av = pickRandomCardAvatar(cur);
            return `
              <label class="opp-slot-row">
                <img class="opp-slot-avatar" data-slot-img="${i}" src="${av}" alt="" onerror="this.src='/app-icon.png'">
                <span class="opp-slot-label">${seatLabels[i]}</span>
                <select class="opp-slot-select" data-slot="${i}">${optsHtml(String(cur.id))}</select>
              </label>`;
          }).join('')}
        </div>
        <div class="opp-picker-foot">
          <button type="button" class="act-btn ghost" id="btnOppRandom">🎲 随机换一批</button>
          <button type="button" class="act-btn primary" id="btnOppConfirm">✓ 确认上桌</button>
        </div>
      </div>
    `;
    modal.hidden = false;

    const close = () => { modal.hidden = true; };
    modal.onclick = (e) => { if (e.target === modal) close(); };
    modal.querySelector('#btnOppClose')?.addEventListener('click', close);
    modal.querySelectorAll('.opp-slot-select').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = Number(sel.dataset.slot);
        const idol = pool.find(x => String(x.id) === sel.value);
        const img = modal.querySelector(`img[data-slot-img="${idx}"]`);
        if (img && idol) img.src = pickRandomCardAvatar(idol);
      });
    });
    modal.querySelector('#btnOppRandom')?.addEventListener('click', () => {
      close();
      startCardGame(ct.mode, true);
    });
    modal.querySelector('#btnOppConfirm')?.addEventListener('click', () => {
      const chosen = [...modal.querySelectorAll('.opp-slot-select')].map(sel =>
        pool.find(x => String(x.id) === sel.value) || pool[0]
      );
      close();
      startCardGame(ct.mode, false, chosen);
    });
  }

  $('#btnCtSwap')?.addEventListener('click', openOpponentPicker);

  /* ── Arcade Fullscreen Toggle (True Edge-to-Edge Viewport Fit + Esc to Exit!) ── */
  function syncFullscreenUI() {
    const isFs = !!document.fullscreenElement || document.body.classList.contains('is-arcade-fullscreen');
    document.body.classList.toggle('is-arcade-fullscreen', isFs);
    document.documentElement.classList.toggle('is-arcade-fullscreen', isFs);
    for (const id of ['#btnArcadeFullscreen', '#btnCtFullscreen']) {
      const b = $(id);
      if (b) b.textContent = isFs ? '✕ 退出全屏 (Esc)' : '⛶ 全屏';
    }
    try {
      window.parent?.postMessage({ type: 'shiny-shell-chrome-hidden', hidden: isFs }, location.origin);
    } catch {}
    ddzBgm?.sync?.();
  }

  function exitArcadeFullscreen() {
    document.body.classList.remove('is-arcade-fullscreen');
    document.documentElement.classList.remove('is-arcade-fullscreen');
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    syncFullscreenUI();
  }

  function toggleArcadeFullscreen() {
    const isFs = !!document.fullscreenElement || document.body.classList.contains('is-arcade-fullscreen');
    if (isFs) {
      exitArcadeFullscreen();
      return;
    }
    document.body.classList.add('is-arcade-fullscreen');
    document.documentElement.classList.add('is-arcade-fullscreen');
    syncFullscreenUI();
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      document.body.classList.remove('is-arcade-fullscreen');
      document.documentElement.classList.remove('is-arcade-fullscreen');
    }
    syncFullscreenUI();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (document.fullscreenElement || document.body.classList.contains('is-arcade-fullscreen'))) {
      e.preventDefault();
      exitArcadeFullscreen();
    }
  });
  $('#btnArcadeFullscreen')?.addEventListener('click', toggleArcadeFullscreen);
  $('#btnCtFullscreen')?.addEventListener('click', toggleArcadeFullscreen);

  // Player quick stamp bar -> idols react back with Official Enza Stickers!
  document.querySelectorAll('#panel-cardtable .stamp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const txt = btn.dataset.stamp || btn.textContent;
      showFx(`制作人：${txt}`);
      const ai = ct.players.slice(1).filter(p => !p.done);
      if (ai.length) {
        const pick = ai[Math.floor(Math.random() * ai.length)];
        setEmote(pick, txt.includes('挑衅') || txt.includes('放马') ? 'smug' : txt.includes('求饶') || txt.includes('活路') ? 'panic' : txt.includes('漂亮') ? 'happy' : 'cheer');
        renderCardTable();
      }
    });
  });

  window.__arcadeTest = {
    classifyCombo,
    canBeatCombo,
    generateAllLegalMoves,
    findHandStraightFlushes,
    findHandBombs,
    startCardGame,
    pinStraightFlushToReserve,
    pinBombToReserve,
    toggleReservedCardPick,
    returnPickedReservedCards,
    playReservedSf,
    returnReservedSf,
    setEmote,
    renderCardTable,
    getState: () => ct
  };

  /* ═══════════════════════════════════════════════════════════════════════
     GAME 4: VOICE QUIZ (听音辨偶像)
     ═══════════════════════════════════════════════════════════════════════ */
  let vqInitialized = false;
  let vqState = { streak: 0, best: Number(localStorage.getItem('shiny.arcade.vqBest') || 0), right: 0, total: 0, answer: null, voice: null, locked: false };

  function initVoiceQuiz() {
    vqInitialized = true;
    $('#vqBest').textContent = String(vqState.best);
    nextVoiceQuestion();
  }

  function nextVoiceQuestion() {
    vqState.locked = false;
    $('#btnVqNext').hidden = true;
    const pool = voiceIndex.filter(v => v.key && Number(v.characterId) >= 1 && Number(v.characterId) <= 28);
    if (!pool.length || portraits.length < 4) { $('#vqQuote').textContent = '语音索引加载中…'; return; }
    const v = pool[trueRandomInt(pool.length)];
    const ansPortrait = portraits.find(p => String(p.id) === String(Number(v.characterId))) || portraits[0];
    const wrongs = trueShuffle(portraits.filter(p => String(p.id) !== String(ansPortrait.id))).slice(0, 3);
    const opts = trueShuffle([ansPortrait, ...wrongs]);
    vqState.answer = ansPortrait;
    vqState.voice = v;
    $('#vqQuote').textContent = v.translation || v.original || '点击上方按钮聆听这段语音，选出对应的 283 偶像！';
    playVoiceAndWait(v.key, 8000);

    const optEl = $('#vqOptions');
    optEl.innerHTML = opts.map(p => `
      <button type="button" class="vq-opt" data-pid="${p.id}">
        <img src="/asset-original/${p.path}" alt="${p.name}" onerror="this.src='/app-icon.png'">
        <span>${p.name}</span>
      </button>
    `).join('');
    optEl.querySelectorAll('.vq-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        if (vqState.locked) return;
        vqState.locked = true;
        vqState.total++;
        const ok = String(btn.dataset.pid) === String(vqState.answer.id);
        if (ok) {
          vqState.right++;
          vqState.streak++;
          if (vqState.streak > vqState.best) {
            vqState.best = vqState.streak;
            localStorage.setItem('shiny.arcade.vqBest', String(vqState.best));
          }
          btn.classList.add('is-right');
          $('#vqQuote').textContent = `✨ 答对了！正是【${vqState.answer.name}】`;
        } else {
          vqState.streak = 0;
          btn.classList.add('is-wrong');
          optEl.querySelector(`[data-pid="${vqState.answer.id}"]`)?.classList.add('is-right');
          $('#vqQuote').textContent = `差一点～正确答案是【${vqState.answer.name}】`;
        }
        $('#vqStreak').textContent = String(vqState.streak);
        $('#vqBest').textContent = String(vqState.best);
        $('#vqRatio').textContent = `${vqState.right} / ${vqState.total}`;
        $('#btnVqNext').hidden = false;
      });
    });
  }
  $('#btnVqReplay')?.addEventListener('click', () => { if (vqState.voice?.key) playVoiceAndWait(vqState.voice.key, 8000); });
  $('#btnVqNext')?.addEventListener('click', nextVoiceQuestion);

  /* ═══════════════════════════════════════════════════════════════════════
     GAME 5: CARD MEMORY MATCH (闪耀卡面翻牌)
     ═══════════════════════════════════════════════════════════════════════ */
  let mmInitialized = false;
  let mmState = { pairs: 6, moves: 0, matched: 0, flipped: [], lock: false, timer: 0, sec: 0 };
  function initMemory() { mmInitialized = true; startMemoryGame(); }
  function startMemoryGame() {
    clearInterval(mmState.timer);
    mmState.pairs = Number($('#mmDiff')?.value || 6);
    mmState.moves = 0; mmState.matched = 0; mmState.flipped = []; mmState.lock = false; mmState.sec = 0;
    $('#mmMoves').textContent = '0';
    $('#mmPairs').textContent = `0 / ${mmState.pairs}`;
    $('#mmTime').textContent = '00:00';
    const picks = trueShuffle(cardPool).slice(0, mmState.pairs);
    const deck = trueShuffle([...picks, ...picks].map((c, idx) => ({ idx, id: c.id, name: c.name, img: '/asset-original/' + c.images[0].path })));
    const grid = $('#mmGrid');
    grid.classList.toggle('cols-6', mmState.pairs >= 12);
    grid.innerHTML = deck.map((item, i) => `
      <button type="button" class="mm-card" data-cid="${item.id}" aria-label="卡面 ${i + 1}">
        <div class="mm-card-inner">
          <div class="mm-face mm-back">283</div>
          <div class="mm-face mm-front"><img src="${item.img}" alt="${item.name}" loading="lazy"></div>
        </div>
      </button>
    `).join('');
    mmState.timer = setInterval(() => {
      mmState.sec++;
      $('#mmTime').textContent = `${String(Math.floor(mmState.sec / 60)).padStart(2, '0')}:${String(mmState.sec % 60).padStart(2, '0')}`;
    }, 1000);
    grid.querySelectorAll('.mm-card').forEach(btn => {
      btn.addEventListener('click', () => {
        if (mmState.lock || btn.classList.contains('is-flipped') || btn.classList.contains('is-matched')) return;
        btn.classList.add('is-flipped');
        mmState.flipped.push(btn);
        if (mmState.flipped.length === 2) {
          mmState.moves++;
          $('#mmMoves').textContent = String(mmState.moves);
          const [a, b] = mmState.flipped;
          if (a.dataset.cid === b.dataset.cid) {
            a.classList.add('is-matched'); b.classList.add('is-matched');
            mmState.flipped = []; mmState.matched++;
            $('#mmPairs').textContent = `${mmState.matched} / ${mmState.pairs}`;
            if (mmState.matched >= mmState.pairs) clearInterval(mmState.timer);
          } else {
            mmState.lock = true;
            setTimeout(() => { a.classList.remove('is-flipped'); b.classList.remove('is-flipped'); mmState.flipped = []; mmState.lock = false; }, 680);
          }
        }
      });
    });
  }
  $('#btnMmRestart')?.addEventListener('click', startMemoryGame);
  $('#mmDiff')?.addEventListener('change', startMemoryGame);

  /* ── Happy Dou Di Zhu Dynamic 4-Stage BGM (ONLY for 斗地主 & 掼蛋; auto-pauses when Music Player is playing) ──
     - 开局 / 游戏中: 欢乐斗地主-游戏中1 / 欢乐斗地主-游戏中2 (小旭音乐)
     - 报牌 / 激烈:   欢乐斗地主-激烈1 / 欢乐斗地主-激烈2 (小旭音乐)
     - 胜利:          欢乐斗地主-胜利1 (小旭音乐, 单次)
     - 失败:          欢乐斗地主-失败1 (小旭音乐, 单次)
  ── */
  const ddzBgm = (() => {
    // 100% local offline bundled Happy Dou Di Zhu BGM tracks (0ms latency, zero network dependency!)
    const makeUrl = (track) => track.localUrl;
    const TRACK_TITLES = {
      normal: [
        { localUrl: '/assets/arcade-bgm/normal1.mp3', title: '欢乐斗地主-游戏中1' },
        { localUrl: '/assets/arcade-bgm/normal2.mp3', title: '欢乐斗地主-游戏中2' }
      ],
      intense: [
        { localUrl: '/assets/arcade-bgm/intense1.mp3', title: '欢乐斗地主-激烈1' },
        { localUrl: '/assets/arcade-bgm/intense2.mp3', title: '欢乐斗地主-激烈2' }
      ],
      win: [
        { localUrl: '/assets/arcade-bgm/win1.mp3', title: '欢乐斗地主-胜利1' }
      ],
      lose: [
        { localUrl: '/assets/arcade-bgm/lose1.mp3', title: '欢乐斗地主-失败1' }
      ]
    };
    // Pre-warmed 4-stage audio pool so start / 报牌激烈切歌 / 胜负音效 play with ~0ms latency!
    const pool = {};
    const failedStages = new Set();
    let activeAudio = null;
    let currentStage = ''; // 'normal' | 'intense' | 'win' | 'lose'
    let synthTimer = 0;
    let synthStep = 0;
    let synthCtx = null;
    let pageVisible = !document.hidden;
    let preloaded = false;

    const MELODY = [
      523.25, 659.25, 783.99, 659.25, 880.00, 783.99, 659.25, 523.25,
      587.33, 659.25, 783.99, 587.33, 523.25, 0,      392.00, 523.25,
      659.25, 783.99, 880.00, 783.99, 1046.5, 880.00, 783.99, 659.25,
      587.33, 783.99, 659.25, 587.33, 523.25, 0,      523.25, 0
    ];

    function createPoolAudio(stage, loop) {
      const list = TRACK_TITLES[stage];
      const title = list[Math.floor(Math.random() * list.length)];
      const a = new Audio();
      a.volume = 0.30;
      a.loop = !!loop;
      a.preload = 'auto';
      a.src = makeUrl(title);
      a.addEventListener('error', () => {
        failedStages.add(stage);
        if (currentStage === stage && shouldPlayLoop()) startSynth();
      });
      try { a.load(); } catch {}
      pool[stage] = a;
      return a;
    }

    function preloadAll() {
      if (preloaded) return;
      preloaded = true;
      createPoolAudio('normal', true);
      createPoolAudio('intense', true);
      // Warm win/lose slightly after to avoid competing with initial normal track buffer
      setTimeout(() => {
        if (!pool.win) createPoolAudio('win', false);
        if (!pool.lose) createPoolAudio('lose', false);
      }, 1500);
    }

    function pauseAllAudio() {
      for (const a of Object.values(pool)) {
        try { a.pause(); } catch {}
      }
      activeAudio = null;
    }

    function isMusicPlaying() {
      try {
        const st = window.parent?.__shinyShell?.getMusicState?.();
        if (st && typeof st.isPlaying === 'boolean') return st.isPlaying;
      } catch {}
      try { return localStorage.getItem('shiny.musicPlaying') === '1'; } catch { return false; }
    }

    function isShellFrameActive() {
      try {
        if (window.parent && window.parent !== window) {
          const ap = window.parent.__shinyShell?.activePage?.();
          if (typeof ap === 'string' && ap && ap !== 'arcade.html') return false;
          if (window.frameElement && !window.frameElement.classList.contains('is-active')) return false;
        }
      } catch {}
      return true;
    }

    function isTargetGameActive() {
      if (!isShellFrameActive()) return false;
      const panel = document.getElementById('panel-cardtable');
      if (!panel || panel.hidden || !panel.classList.contains('active')) return false;
      // Note: Do NOT check panel.offsetParent !== null because fullscreen sets #panel-cardtable to position:fixed
      // and per CSSOM spec offsetParent is always null for position:fixed elements!
      const cs = window.getComputedStyle(panel);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      return ct.mode === 'ddz' || ct.mode === 'guandan';
    }

    function isIntensePhase() {
      if (!ct.players || !ct.players.length || ct.phase === 'over' || ct.phase === 'bid') return false;
      const threshold = ct.mode === 'guandan' ? 10 : 3;
      return ct.players.some(p => {
        if (!p || p.done) return false;
        const rem = p.id === 0 && ct.mode === 'guandan'
          ? p.hand.length + (ct.sfReserve?.reduce((s, g) => s + g.cards.length, 0) || 0)
          : p.hand.length;
        return rem > 0 && rem <= threshold;
      });
    }

    function stopSynth() {
      if (synthTimer) { clearInterval(synthTimer); synthTimer = 0; }
    }

    function startSynth() {
      if (synthTimer) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!synthCtx) synthCtx = new AC();
        if (synthCtx.state === 'suspended') synthCtx.resume().catch(() => {});
        const tempo = currentStage === 'intense' ? 140 : 190;
        synthTimer = setInterval(() => {
          if (!shouldPlayLoop()) { stopSynth(); return; }
          const freq = MELODY[synthStep % MELODY.length];
          synthStep++;
          if (!freq || !synthCtx) return;
          const now = synthCtx.currentTime;
          const osc = synthCtx.createOscillator();
          const gain = synthCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.exponentialRampToValueAtTime(0.055, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.connect(gain);
          gain.connect(synthCtx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        }, tempo);
      } catch {}
    }

    function shouldPlayLoop() {
      return pageVisible && isTargetGameActive() && ct.phase !== 'over' && !isMusicPlaying();
    }

    function switchStage(stage, loop) {
      preloadAll();
      if (activeAudio && activeAudio !== pool[stage]) {
        try { activeAudio.pause(); } catch {}
      }
      currentStage = stage;
      stopSynth();
      if (failedStages.has(stage)) {
        if (loop && shouldPlayLoop()) startSynth();
        return;
      }
      const a = pool[stage] || createPoolAudio(stage, loop);
      a.loop = !!loop;
      try { a.currentTime = 0; } catch {}
      activeAudio = a;
      a.play().catch(() => {});
    }

    function playResult(won) {
      if (!pageVisible || !isTargetGameActive() || isMusicPlaying()) {
        pauseAllAudio();
        stopSynth();
        return;
      }
      switchStage(won ? 'win' : 'lose', false);
    }

    function sync() {
      if (!pageVisible || !isTargetGameActive() || isMusicPlaying()) {
        pauseAllAudio();
        stopSynth();
        return;
      }
      preloadAll();
      if (ct.phase === 'over') return;
      const wantStage = isIntensePhase() ? 'intense' : 'normal';
      if (currentStage !== wantStage) {
        switchStage(wantStage, true);
        return;
      }
      if (failedStages.has(wantStage)) {
        startSynth();
        return;
      }
      if (!activeAudio) activeAudio = pool[wantStage];
      if (activeAudio && activeAudio.paused) {
        activeAudio.play().catch(() => {});
      }
    }

    document.addEventListener('pointerdown', () => {
      if (shouldPlayLoop()) sync();
    }, { passive: true });

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'shiny-music-state') sync();
      if (msg.type === 'shiny-shell-visibility' || msg.type === 'shiny-shell-active') {
        pageVisible = !!msg.active;
        if (!pageVisible) {
          pauseAllAudio();
          stopSynth();
        } else {
          sync();
        }
      }
    });
    window.addEventListener('storage', (e) => {
      if (e.key === 'shiny.musicPlaying') sync();
    });
    document.addEventListener('visibilitychange', () => {
      pageVisible = !document.hidden;
      if (!pageVisible) { pauseAllAudio(); stopSynth(); }
      else sync();
    });
    window.addEventListener('pagehide', () => {
      pageVisible = false;
      pauseAllAudio();
      stopSynth();
    });

    // Preload immediately if arcade starts on DDZ/Guandan
    setTimeout(() => { if (isTargetGameActive()) preloadAll(); }, 250);
    setInterval(sync, 600);
    return { sync, playResult };
  })();

  loadArcadeData();
})();
