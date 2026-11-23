/* ═══════════════════════════════════════════════════════════════════════════
   283 雀庄 · SHINY MAHJONG SUITE (Inspired by Mahjong Soul × noctchill Collab)
   7 Complete Rule Sets:
     1. 日本立直麻将 (Riichi / 雀魂标准: 赤宝牌·宝牌·立直·役种·振听·25000点)
     2. 四川血战到底 (108张无字·定缺一门·刮风下雨·血战至三家胡)
     3. 国标麻将 MCR (136张·吃碰杠·丰富国标番种)
     4. 广东推倒胡 (136张·不可吃·胡后买4马加倍)
     5. 江浙百搭麻将 (136张·每局翻财神万能百搭牌)
     6. 长沙麻将 (108张·起手胡·258做将·扎鸟)
     7. 红中赖子杠 (112张·红中万能赖子·四红中起手胡)
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);

  const NUM_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const HONOR_LABELS = ['東', '南', '西', '北', '白', '發', '中'];
  const SEAT_WINDS = ['東', '南', '西', '北'];
  const SUIT_NAMES = ['万', '筒', '索'];

  /* ── 38 Authentic Regional Chinese + East Asian Mahjong Rules ── */
  const R = (region, name, o) => ({
    region, name,
    honors: true, onlyRedDragon: false, allowChi: true, riichi: false,
    dingque: false, bloodBattle: false, bloodFlow: false,
    wildMode: 'none', buyHorse: 0, catchChicken: false,
    req258: false, mustOpen: false, mustThreeSuits: false, mustYaojiu: false,
    qishouhu: false, flowerBonus: false, paoBonus: false,
    minFan: 0, handSize: 13, startScore: 10000, desc: '',
    ...o
  });

  const RULES = {
    // ── 一、日本·港澳台·国标（5种）──
    riichi:       R('国际与港澳台', '🇯🇵 日本立直麻将（雀魂标准）',   { riichi: true, startScore: 25000, desc: '136张含赤5与宝牌 · 吃/碰/杠/立直/一发 · 须有役起胡 · 25000点（联动 noctchill）' }),
    kansai_riichi:R('国际与港澳台', '🇯🇵 日麻关西赤宝高番（赤5增强）', { riichi: true, startScore: 30000, buyHorse: 0, desc: '136张高番关西风 · 赤宝牌+双宝牌指示 · 立直一发高倍率结算！' }),
    mcr:          R('国际与港澳台', '🏮 中国国标麻将（MCR 竞技）',   { desc: '136张国标竞技标准 · 支持清一色/混一色/七对/碰碰和/断幺/大三元/十三幺等全番种！' }),
    hongkong:     R('国际与港澳台', '🇭🇰 香港麻将（港式十三张）',    { minFan: 2, flowerBonus: true, desc: '136张港式规则 · 高番起胡 · 鸡糊/混一色/清一色/碰碰胡/十三幺 + 花牌加台！' }),
    taiwan:       R('国际与港澳台', '🇹🇼 台湾十六张麻将',            { handSize: 16, flowerBonus: true, desc: '136张 · 经典起手16张（5面子+1对将胡牌！）· 门清一摸三 + 花牌台数加成！' }),

    // ── 二、西南川渝云贵（5种）──
    sichuan:      R('西南·川渝云贵', '🐼 四川血战到底（川麻）',       { honors: false, allowChi: false, dingque: true, bloodBattle: true, desc: '108张无字 · 定缺一门 · 不可吃可碰杠 · 刮风下雨 · 血战到底至三家胡牌！' }),
    sichuan_xl:   R('西南·川渝云贵', '🌊 四川血流成河',               { honors: false, allowChi: false, dingque: true, bloodBattle: true, bloodFlow: true, desc: '108张无字 · 定缺一门 · 胡牌不离桌持续血流摸胡到底，翻倍爽玩！' }),
    chongqing:    R('西南·川渝云贵', '🌶 重庆倒倒胡',                 { honors: false, allowChi: false, dingque: true, desc: '108张无字 · 缺一门可胡 · 不可吃可碰杠 · 清一色/对对胡/龙七对高倍结算！' }),
    guiyang:      R('西南·川渝云贵', '🏔 贵阳捉鸡麻将',               { honors: false, allowChi: false, catchChicken: true, desc: '108张无字 · 不可吃 · 胡牌后自动「翻鸡捉鸡」，命中幺鸡/翻鸡全桌加番！' }),
    yunnan:       R('西南·川渝云贵', '🦚 云南昆明/曲靖麻将',          { honors: false, allowChi: false, buyHorse: 2, desc: '108张无字 · 不可吃可碰杠 · 杠上开花/捉老麻加倍结算！' }),

    // ── 三、华南两广福建海南（5种）──
    guangdong:    R('华南·两广闽琼', '🀄 广东推倒胡（买4马）',        { allowChi: false, buyHorse: 4, desc: '136张 · 推倒胡不可吃 · 可碰杠抢杠 · 胡后翻4张买马中码加倍！' }),
    guangdong_jph:R('华南·两广闽琼', '🐓 广东鸡平胡（可吃+买马）',    { allowChi: true, buyHorse: 2, desc: '136张 · 经典广州鸡平胡 · 可吃碰杠 · 混一色/碰碰胡/清一色 + 买2马！' }),
    guangxi:      R('华南·两广闽琼', '⛰ 广西推倒胡（买6马）',        { allowChi: false, buyHorse: 6, desc: '136张 · 不可吃 · 胡牌后狂翻6张买马，中1/5/9/东风疯狂翻倍！' }),
    fujian:       R('华南·两广闽琼', '🏮 福建福州/厦门麻将（翻金）',  { wildMode: 'flip', qishouhu: true, desc: '136张 · 开局翻定万能「金牌」百搭 · 摸到3张金牌触发「三金倒」直接胡牌！' }),
    hainan:       R('华南·两广闽琼', '🌴 海南麻将（有番起胡）',       { minFan: 1, flowerBonus: true, desc: '136张 · 有番起胡（碰碰胡/混清一色/断幺/役牌）+ 海南特色花牌加番！' }),

    // ── 四、华东江浙沪皖赣鲁（9种）──
    jiangzhe:     R('华东·江浙沪皖赣鲁', '🌊 上海敲麻/百搭麻将',      { wildMode: 'flip', desc: '136张 · 开局翻定万能百搭/财神牌 · 吃碰杠俱全 · 勒子清一色高倍结算！' }),
    hangzhou:     R('华东·江浙沪皖赣鲁', '🍵 杭州麻将（白板替财神）', { wildMode: 'baiban', desc: '136张 · 白板直接作为万能财神百搭 · 吃碰杠自由 · 财神暴头爽翻！' }),
    ningbo:       R('华东·江浙沪皖赣鲁', '⛵ 宁波麻将（4台大番）',    { wildMode: 'flip', minFan: 2, desc: '136张 · 翻财神百搭 · 须达台数起胡（混一色/对对胡/清一色/七对高台）！' }),
    wenzhou:      R('华东·江浙沪皖赣鲁', '💎 温州麻将（翻财神）',     { wildMode: 'flip', buyHorse: 2, desc: '136张 · 翻财神万能百搭 · 硬牌/双财神高倍结算 + 买底加番！' }),
    nanjing:      R('华东·江浙沪皖赣鲁', '🌸 南京麻将（花牌比下胡）', { flowerBonus: true, desc: '136张 · 门清/混清一色/七对/对对胡 + 硬花软花额外加番结算！' }),
    suzhou:       R('华东·江浙沪皖赣鲁', '🪷 苏州麻将（百搭豪七）',   { wildMode: 'flip', flowerBonus: true, desc: '136张 · 百搭财神 + 花牌加番 · 豪七/混清一色大胡爆表！' }),
    hefei:        R('华东·江浙沪皖赣鲁', '🏯 合肥麻将（8枝起胡）',    { honors: false, allowChi: false, desc: '108张无字 · 不可吃 · 偏重单门大牌与清一色高倍结算！' }),
    nanchang:     R('华东·江浙沪皖赣鲁', '🦅 南昌麻将（上下精百搭）', { wildMode: 'flip', desc: '136张 · 开局翻「精牌」作万能百搭 · 精吊/德国/十三烂风格高番！' }),
    qingdao:      R('华东·江浙沪皖赣鲁', '🍺 青岛/山东麻将',          { buyHorse: 2, desc: '136张 · 可吃碰杠 · 推倒胡/清一色/七对 + 山东特色扭牌加码！' }),

    // ── 五、华中两湖河南（5种）──
    changsha:     R('华中·两湖河南', '🔥 长沙麻将（258将+起手胡）',   { honors: false, qishouhu: true, req258: true, buyHorse: 2, desc: '108张无字 · 起手胡（缺一色/板板胡）· 平胡须2/5/8做将，大胡不限将 + 扎2鸟！' }),
    hongzhong:    R('华中·两湖河南', '❄ 湖南红中转转（万能红中）',    { honors: false, onlyRedDragon: true, allowChi: false, wildMode: 'hongzhong', buyHorse: 4, desc: '112张（万筒索+4红中）· 红中万能赖子 · 4红中起手直胡 + 扎4码！' }),
    wuhan:        R('华中·两湖河南', '🌉 武汉红中赖子杠（须开口）',   { wildMode: 'flip', mustOpen: true, desc: '136张 · 翻皮子定万能赖子 · 必须吃/碰/杠「开口」后方可胡牌！' }),
    kawuxing:     R('华中·两湖河南', '🎋 湖北卡五星/晃晃麻将',        { honors: false, onlyRedDragon: true, allowChi: false, buyHorse: 2, desc: '112张精简快节奏 · 不可吃 · 碰碰胡/清一色/七对/卡五星高倍番型！' }),
    henan:        R('华中·两湖河南', '🌾 河南推倒胡（带混+下跑）',    { allowChi: false, wildMode: 'flip', paoBonus: true, desc: '136张 · 翻混儿万能百搭 · 不可吃 · 自带下跑额外加分！' }),

    // ── 六、华北京津冀晋蒙（4种）──
    beijing:      R('华北·京津冀晋蒙', '🏛 北京麻将（翻混儿）',       { wildMode: 'flip', desc: '136张 · 开局翻万能「混儿」百搭 · 可吃碰杠 · 混悠/捉五魁/一条龙高番！' }),
    tianjin:      R('华北·京津冀晋蒙', '🥟 天津麻将（混吊/捉五魁）',  { wildMode: 'flip', buyHorse: 2, desc: '136张 · 翻万能混儿 · 素混/混吊/没混翻倍结算！' }),
    shanxi:       R('华北·京津冀晋蒙', '🏮 山西扣点麻将',             { allowChi: false, desc: '136张 · 不可吃可碰杠 · 清一色/一条龙/七小对大番扣点结算！' }),
    hebei:        R('华北·京津冀晋蒙', '🏯 河北/保定带混麻将',        { allowChi: false, wildMode: 'flip', buyHorse: 2, desc: '136张 · 不可吃 · 翻混儿万能百搭 + 抓鸟加码！' }),

    // ── 七、东北黑吉辽（3种）──
    dongbei:      R('东北·黑吉辽', '❄ 东北麻将（开门+三门齐+幺九）',  { mustOpen: true, mustThreeSuits: true, mustYaojiu: true, desc: '136张正宗东北规则 · 必须吃/碰开门 + 三门齐（万筒索全有）+ 带幺九！' }),
    harbin:       R('东北·黑吉辽', '⛄ 哈尔滨麻将（开门+三门齐+宝）', { mustOpen: true, mustThreeSuits: true, wildMode: 'flip', desc: '136张哈尔滨规则 · 必须开门 + 三门齐 + 摸宝百搭大扣结算！' }),
    shenyang:     R('东北·黑吉辽', '🦁 沈阳麻将（开门+三门齐+幺九）', { mustOpen: true, mustThreeSuits: true, mustYaojiu: true, buyHorse: 2, desc: '136张沈阳规则 · 必须开门 + 三门齐 + 幺九 + 旋风飘胡高番！' }),

    // ── 八、西北陕甘宁青新（2种）──
    xian:         R('西北·陕甘宁青新', '🏺 西安/陕西挖坑麻将（下炮）',{ honors: false, allowChi: false, paoBonus: true, desc: '108张无字 · 不可吃可碰杠 · 自带下炮子加分 + 七对/清一色高倍！' }),
    lanzhou:      R('西北·陕甘宁青新', '🍜 兰州/西北滑水麻将',        { allowChi: false, buyHorse: 2, desc: '136张 · 不可吃 · 杠随胡走 · 推倒胡快节奏加码结算！' })
  };

  // Mahjong Soul × Shiny Colors Collab: noctchill!
  const NOCTCHILL_IDS = ['20', '21', '22', '23']; // 浅仓透, 樋口圆香, 福丸小糸, 市川雏菜
  const COLLAB_QUOTES = {
    '20': { chi: '吃～', pon: '碰。', kan: '杠。', riichi: '立直哦。', ron: '荣和～', tsumo: '自摸，Yeah。' },
    '21': { chi: '吃。', pon: '碰。', kan: '杠。', riichi: '立直。', ron: '荣和，谢谢。', tsumo: '自摸，还不错的结果。' },
    '22': { chi: '吃、吃！', pon: '碰！', kan: '杠、杠！', riichi: '立、立直……！', ron: '荣、荣和！', tsumo: '自摸了……太好了！' },
    '23': { chi: '吃哦～', pon: '碰～♪', kan: '杠呀哈～', riichi: '立直～♪', ron: '荣和～雏菜最棒！', tsumo: '呀哈～自摸啦♡' }
  };

  let portraits = [];
  let voiceIndex = [];
  let customVoicePack = {}; // from /api/mahjong-voice-pack
  let voiceFolderHint = '';
  let activeAudio = null;
  let initialized = false;
  let mjSerial = 0;

  /* ── Tile Utilities ─────────────────────────────────────────────────── */
  function tileSuit(t) { return t < 27 ? Math.floor(t / 9) : 3; }
  function tileNum(t) { return t < 27 ? (t % 9) + 1 : 0; }
  function isTerminalOrHonor(t) { return t >= 27 || t % 9 === 0 || t % 9 === 8; }
  function is258(t) { if (t >= 27) return false; const n = (t % 9) + 1; return n === 2 || n === 5 || n === 8; }

  function nextDoraFromIndicator(ind) {
    if (ind < 27) {
      const s = Math.floor(ind / 9);
      return s * 9 + ((ind % 9 + 1) % 9);
    }
    if (ind <= 30) return 27 + ((ind - 27 + 1) % 4);
    return 31 + ((ind - 31 + 1) % 3);
  }

  function renderTileHtml(tile, opts = {}) {
    const t = typeof tile === 'number' ? tile : tile.t;
    const red = typeof tile === 'object' && !!tile.red;
    const uid = typeof tile === 'object' ? tile.uid : -1;
    const isWild = mj.wildTile === t;
    const isDora = mj.doraTiles.includes(t) || red;
    const isDingque = opts.dingqueSuit >= 0 && tileSuit(t) === opts.dingqueSuit;
    const cls = [
      'mj-tile',
      opts.small ? 'is-sm' : '',
      opts.selected ? 'is-selected' : '',
      opts.drawn ? 'is-drawn' : '',
      red ? 'is-aka' : '',
      isWild ? 'is-wild' : '',
      isDora ? 'is-dora' : '',
      isDingque ? 'is-dingque' : ''
    ].filter(Boolean).join(' ');

    let inner = '';
    if (t < 9) {
      inner = `<span class="mjt-top red">${NUM_KANJI[t]}</span><span class="mjt-bot red">萬</span>`;
    } else if (t < 18) {
      const n = t - 8;
      inner = `<span class="mjt-top blue">${n}</span><span class="mjt-bot blue">●筒</span>`;
    } else if (t < 27) {
      const n = t - 17;
      inner = `<span class="mjt-top green">${n}</span><span class="mjt-bot green">‖索</span>`;
    } else {
      const h = HONOR_LABELS[t - 27];
      const hCls = t === 33 ? 'red' : t === 32 ? 'green' : t === 31 ? 'blue' : 'ink';
      inner = `<span class="mjt-honor ${hCls}">${h}</span>`;
    }
    const badge = isWild ? '<i class="mjt-tag">赖</i>' : (red ? '<i class="mjt-tag red">赤</i>' : '');
    const tag = opts.clickable ? 'button' : 'div';
    const extra = opts.clickable ? `type="button" data-uid="${uid}"` : '';
    return `<${tag} class="${cls}" ${extra}>${badge}${inner}</${tag}>`;
  }

  /* ── Voice Engine (Custom Mahjong Soul Pack -> Official Shiny Colors Voices) ── */
  function playVoiceWait(player, action, maxMs = 3600) {
    return new Promise(resolve => {
      if (!$('#arcVoiceEnabled')?.checked || !player?.charId) return resolve();
      const cidNum = String(Number(player.charId));
      const cidPad = String(player.charId).padStart(3, '0');
      let src = '';

      // 1. Check user's local Mahjong Soul collab voice pack first!
      const pack = customVoicePack[cidNum] || customVoicePack[cidPad];
      if (pack) {
        const aliases = {
          chi: ['chi', 'eat', '吃'],
          pon: ['pon', 'peng', '碰'],
          kan: ['kan', 'gang', '杠'],
          riichi: ['riichi', 'richi', '立直'],
          ron: ['ron', 'hu', '荣', '荣和'],
          tsumo: ['tsumo', 'zimo', '自摸']
        }[action] || [action];
        for (const k of aliases) {
          if (pack[k]) { src = pack[k]; break; }
        }
      }

      // 2. Fallback to our indexed official Shiny Colors character voices!
      if (!src && voiceIndex.length) {
        const charVoices = voiceIndex.filter(v => String(v.characterId).padStart(3, '0') === cidPad && v.key);
        let pool = [];
        if (action === 'ron' || action === 'tsumo') {
          pool = charVoices.filter(v => /daifugo_clear|daifugo_win|end_victory|cheer/i.test(v.key));
        } else if (action === 'riichi' || action === 'kan') {
          pool = charVoices.filter(v => /daifugo_eight|daifugo_revol|concert_attack|concert_start/i.test(v.key));
        } else {
          pool = charVoices.filter(v => /daifugo_|reaction_|concert_skil/i.test(v.key));
        }
        if (!pool.length) pool = charVoices;
        if (pool.length) src = '/asset/' + pool[Math.floor(Math.random() * pool.length)].key;
      }

      if (!src) return resolve();
      try {
        if (activeAudio) { activeAudio.pause(); activeAudio = null; }
        const a = new Audio(src);
        activeAudio = a;
        a.volume = 0.78;
        let settled = false;
        const done = () => { if (!settled) { settled = true; clearTimeout(t); resolve(); } };
        const t = setTimeout(done, maxMs);
        a.onended = done;
        a.onerror = done;
        a.play().catch(done);
      } catch {
        resolve();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════
     COMPLETE WIN EVALUATOR (Standard + 7 Pairs + 13 Orphans + Wildcards)
     ═══════════════════════════════════════════════════════════════════════ */
  function canFormMelds(counts, wilds, meldsNeeded) {
    if (meldsNeeded === 0) return true;
    let first = -1;
    for (let i = 0; i < 34; i++) { if (counts[i] > 0) { first = i; break; } }
    if (first === -1) return wilds >= meldsNeeded * 3;

    // 1. Try Pung (Triplet) using 0..2 wildcards
    const needTri = Math.max(0, 3 - counts[first]);
    if (wilds >= needTri) {
      const used = Math.min(3, counts[first]);
      counts[first] -= used;
      if (canFormMelds(counts, wilds - needTri, meldsNeeded - 1)) {
        counts[first] += used;
        return true;
      }
      counts[first] += used;
    }

    // 2. Try Chow (Sequence) for suited tiles (0..26)
    if (first < 27 && first % 9 <= 6) {
      const u1 = counts[first] > 0 ? 1 : 0;
      const u2 = counts[first + 1] > 0 ? 1 : 0;
      const u3 = counts[first + 2] > 0 ? 1 : 0;
      const needSeq = 3 - (u1 + u2 + u3);
      if (wilds >= needSeq) {
        counts[first] -= u1; counts[first + 1] -= u2; counts[first + 2] -= u3;
        if (canFormMelds(counts, wilds - needSeq, meldsNeeded - 1)) {
          counts[first] += u1; counts[first + 1] += u2; counts[first + 2] += u3;
          return true;
        }
        counts[first] += u1; counts[first + 1] += u2; counts[first + 2] += u3;
      }
    }
    return false;
  }

  function checkStandardWin(counts, meldsDone, wildTile, require258 = false, totalMelds = 4) {
    const c = counts.slice();
    let wilds = 0;
    if (wildTile >= 0) { wilds = c[wildTile]; c[wildTile] = 0; }
    const meldsNeeded = Math.max(0, totalMelds - meldsDone);

    // Try every tile as pair head
    for (let i = 0; i < 34; i++) {
      if (require258 && !is258(i)) continue;
      if (c[i] >= 2) {
        c[i] -= 2;
        if (canFormMelds(c, wilds, meldsNeeded)) return { ok: true, pairTile: i };
        c[i] += 2;
      } else if (c[i] === 1 && wilds >= 1) {
        c[i] -= 1;
        if (canFormMelds(c, wilds - 1, meldsNeeded)) return { ok: true, pairTile: i };
        c[i] += 1;
      }
    }
    // Pair made of 2 wilds
    if (wilds >= 2) {
      if (canFormMelds(c, wilds - 2, meldsNeeded)) return { ok: true, pairTile: wildTile };
    }
    return { ok: false, pairTile: -1 };
  }

  function checkSevenPairs(counts, meldsDone, wildTile) {
    if (meldsDone > 0) return false;
    const c = counts.slice();
    let wilds = 0;
    if (wildTile >= 0) { wilds = c[wildTile]; c[wildTile] = 0; }
    let oddNeed = 0;
    let total = wilds;
    for (let i = 0; i < 34; i++) {
      total += c[i];
      if (c[i] % 2 === 1) oddNeed++;
    }
    return total === 14 && wilds >= oddNeed && (wilds - oddNeed) % 2 === 0;
  }

  function checkThirteenOrphans(counts, meldsDone, wildTile) {
    if (meldsDone > 0) return false;
    const req = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
    const c = counts.slice();
    let wilds = wildTile >= 0 ? c[wildTile] : 0;
    if (wildTile >= 0) c[wildTile] = 0;
    let missing = 0;
    let hasPair = false;
    let extra = 0;
    for (let i = 0; i < 34; i++) {
      if (!req.includes(i) && c[i] > 0) return false;
    }
    for (const r of req) {
      if (c[r] === 0) missing++;
      else if (c[r] >= 2) { hasPair = true; extra += c[r] - 1; }
    }
    if (extra > 1) return false;
    const needWild = missing + (hasPair ? 0 : 1);
    return wilds >= needWild;
  }

  function evaluateWin(handTiles, melds, ruleKey, extraOpts = {}) {
    const rule = RULES[ruleKey];
    const counts = new Array(34).fill(0);
    for (const tile of handTiles) counts[tile.t]++;

    // Sichuan Dingque check: cannot win while holding missing suit
    if (rule.dingque && extraOpts.dingqueSuit >= 0) {
      for (const tile of handTiles) {
        if (tileSuit(tile.t) === extraOpts.dingqueSuit) return null;
      }
      for (const m of melds) {
        if (m.tiles.some(x => tileSuit(x.t) === extraOpts.dingqueSuit)) return null;
      }
    }

    // Hongzhong 4-laizi / Fujian 3-gold instant win
    if (rule.wildMode === 'hongzhong' && counts[33] === 4) {
      return { fan: 6, yaku: ['四红中大满贯'], points: 12000 };
    }
    if (ruleKey === 'fujian' && mj.wildTile >= 0 && counts[mj.wildTile] >= 3) {
      return { fan: 5, yaku: ['三金倒'], points: 10000 };
    }

    const totalMelds = rule.handSize === 16 ? 5 : 4;
    const wild = mj.wildTile;
    const is7 = rule.handSize === 13 && checkSevenPairs(counts, melds.length, wild);
    const is13 = rule.handSize === 13 && rule.honors && checkThirteenOrphans(counts, melds.length, wild);
    const stdAny = checkStandardWin(counts, melds.length, wild, false, totalMelds);
    if (!is7 && !is13 && !stdAny.ok) return null;

    // Collect all tiles (hand + melds) for Yaku / Fan & Regional Constraint analysis
    const all = [...handTiles, ...melds.flatMap(m => m.tiles)];
    const suitsUsed = new Set(all.filter(x => x.t < 27 && x.t !== wild).map(x => tileSuit(x.t)));
    const hasHonors = all.some(x => x.t >= 27 && x.t !== wild);
    const isClosed = melds.every(m => m.type === 'ankan');
    const allSimples = all.every(x => !isTerminalOrHonor(x.t) || x.t === wild);
    const all258 = all.every(x => is258(x.t));

    // Regional Hard Constraints (Dongbei / Harbin / Shenyang / Wuhan)
    if (rule.mustOpen && isClosed && !is7 && !is13) return null;
    if (rule.mustThreeSuits && suitsUsed.size < 3 && !is7 && !is13) return null;
    if (rule.mustYaojiu && allSimples && !is7 && !is13) return null;

    // Check Toitoi (碰碰和 / 对对胡): all melds are pon/kan and hand has no sequences needed
    const allMeldTriplets = melds.every(m => m.type !== 'chi');
    let isToitoi = false;
    if (stdAny.ok && allMeldTriplets) {
      const c2 = counts.slice();
      let w2 = wild >= 0 ? c2[wild] : 0;
      if (wild >= 0) c2[wild] = 0;
      let pairUsed = false, need = 0;
      for (let i = 0; i < 34; i++) {
        if (c2[i] === 0) continue;
        if (c2[i] === 3) continue;
        if (c2[i] === 2 && !pairUsed) { pairUsed = true; continue; }
        if (c2[i] === 2) need += 1;
        else if (c2[i] === 1 && !pairUsed) { pairUsed = true; need += 1; }
        else if (c2[i] === 1) need += 2;
        else if (c2[i] === 4) { if (!pairUsed) { pairUsed = true; need += 1; } else need += 2; }
      }
      if (w2 >= need) isToitoi = true;
    }

    const yaku = [];
    let fan = 0;
    const addYaku = (name, f) => { yaku.push(`${name}(${f}番)`); fan += f; };

    if (is13) addYaku('国士无双 / 十三幺', 13);
    else {
      if (suitsUsed.size === 1 && !hasHonors) addYaku('清一色', ruleKey === 'riichi' ? (isClosed ? 6 : 5) : 6);
      else if (suitsUsed.size === 1 && hasHonors) addYaku('混一色', ruleKey === 'riichi' ? (isClosed ? 3 : 2) : 3);
      if (is7) addYaku('七对子', 2);
      if (isToitoi && !is7) addYaku('对对和 / 碰碰胡', 2);
      if (ruleKey === 'changsha' && all258) addYaku('将将胡', 4);
      if (allSimples) addYaku('断幺九', 1);

      // Dragons (役牌 / 箭刻)
      let dragonTriplets = 0;
      for (const d of [31, 32, 33]) {
        const cnt = all.filter(x => x.t === d).length;
        if (cnt >= 3) {
          dragonTriplets++;
          addYaku(`役牌·${HONOR_LABELS[d - 27]}`, 1);
        }
      }
      if (dragonTriplets === 3) addYaku('大三元', 13);

      // Seat/Round Wind East
      if (all.filter(x => x.t === 27).length >= 3) addYaku('场风·東', 1);

      if (extraOpts.isRiichi) addYaku('立直', 1);
      if (extraOpts.isIppatsu) addYaku('一发', 1);
      if (extraOpts.isTsumo && isClosed) addYaku('门前清自摸', 1);
      if (extraOpts.isGangWin) addYaku('杠上开花', 1);
      if (extraOpts.isHaitei) addYaku('海底捞月', 1);
    }

    // Changsha 258 pair rule: small flat win MUST have a 2/5/8 pair!
    if (rule.req258 && fan <= 1 && !is7 && !isToitoi) {
      const std258 = checkStandardWin(counts, melds.length, wild, true, totalMelds);
      if (!std258.ok) return null;
    }

    // Riichi rule: MUST have at least 1 Yaku (not just Dora!)
    if (rule.riichi && fan === 0) return null;
    // Hong Kong / Ningbo / Hainan minimum fan gate
    if (rule.minFan > 0 && fan < rule.minFan) return null;

    // Dora count (Riichi & Kansai Riichi)
    if (rule.riichi) {
      let doraCnt = 0;
      for (const tile of all) {
        for (const dt of mj.doraTiles) if (tile.t === dt) doraCnt++;
        if (tile.red) doraCnt++;
      }
      if (doraCnt > 0) addYaku(`宝牌×${doraCnt}`, doraCnt);
    }
    if (rule.flowerBonus) addYaku('花牌加台', 1);
    if (rule.paoBonus) addYaku('下跑/下炮加分', 1);

    if (yaku.length === 0) {
      yaku.push(extraOpts.isTsumo ? '自摸平胡(1番)' : '推倒平胡(1番)');
      fan = 1;
    }

    // Points calculation
    let points = 1000;
    if (rule.riichi) {
      if (fan >= 13) points = 32000;
      else if (fan >= 11) points = 24000;
      else if (fan >= 8) points = 16000;
      else if (fan >= 6) points = 12000;
      else if (fan >= 4) points = 8000;
      else if (fan === 3) points = 3900;
      else if (fan === 2) points = 2000;
      else points = 1000;
    } else {
      points = 500 * Math.pow(2, Math.min(6, fan));
    }
    return { fan, yaku, points };
  }

  function findWaitingTiles(hand13, melds, ruleKey, extraOpts = {}) {
    const rule = RULES[ruleKey];
    const maxT = rule.honors ? 34 : (rule.onlyRedDragon ? 34 : 27);
    const waits = [];
    for (let t = 0; t < maxT; t++) {
      if (!rule.honors && rule.onlyRedDragon && t >= 27 && t !== 33) continue;
      if (rule.dingque && extraOpts.dingqueSuit >= 0 && tileSuit(t) === extraOpts.dingqueSuit) continue;
      const test = [...hand13, { uid: -1, t, red: false }];
      const res = evaluateWin(test, melds, ruleKey, { ...extraOpts, isTsumo: true });
      if (res) waits.push(t);
    }
    return waits;
  }

  /* ── Strategic 3-Tier Mahjong AI (Shanten/Ukeire + Defense) ── */
  function scoreHand13(hand13, melds, dingqueSuit) {
    const c = new Array(34).fill(0);
    let score = 0;
    for (const tile of hand13) {
      if (tile.t === mj.wildTile) { score += 45; continue; }
      if (dingqueSuit >= 0 && tileSuit(tile.t) === dingqueSuit) { score -= 60; continue; }
      c[tile.t]++;
    }
    // Evaluate triplets, pairs, and connected shapes
    for (let i = 0; i < 34; i++) {
      if (c[i] >= 3) score += 28;
      else if (c[i] === 2) score += 13;
      if (i < 27) {
        const num = (i % 9) + 1;
        if (c[i] > 0) {
          score += (5 - Math.abs(5 - num)) * 1.1; // Middle tiles more flexible
          if (num <= 8 && c[i + 1] > 0) score += 10;
          if (num <= 7 && c[i + 2] > 0) score += 5;
          if (num <= 7 && c[i + 1] > 0 && c[i + 2] > 0) score += 14;
        }
      }
    }
    return score;
  }

  function chooseAiDiscard(playerIdx) {
    const p = mj.players[playerIdx];
    const diff = $('#arcDifficulty')?.value || 'pro';
    const hand = p.hand;
    if (!hand.length) return 0;

    // Riichi locked: must discard the newly drawn tile!
    if (p.riichi) return hand.length - 1;

    // Sichuan Dingque: ALWAYS discard missing suit tiles first!
    if (RULES[mj.rule].dingque && p.dingqueSuit >= 0) {
      const dqIdx = hand.findIndex(x => tileSuit(x.t) === p.dingqueSuit);
      if (dqIdx >= 0) return dqIdx;
    }

    // Collect danger tiles if another player declared Riichi (for Master defense!)
    const dangerActive = diff === 'master' && mj.players.some((o, i) => i !== playerIdx && (o.riichi || o.melds.length >= 2));
    const safeTiles = new Set();
    if (dangerActive) {
      for (const o of mj.players) {
        if (o.riichi || o.melds.length >= 2) {
          o.discards.forEach(d => safeTiles.add(d.t));
        }
      }
    }

    let bestIdx = 0;
    let bestScore = -1e9;
    for (let i = 0; i < hand.length; i++) {
      const cand = hand[i];
      if (cand.t === mj.wildTile) continue; // Never throw away wild/laizi!
      const rem = hand.filter((_, j) => j !== i);
      let s = scoreHand13(rem, p.melds, p.dingqueSuit);
      if (diff !== 'casual') {
        const waits = findWaitingTiles(rem, p.melds, mj.rule, { dingqueSuit: p.dingqueSuit, isRiichi: p.riichi });
        if (waits.length > 0) s += 80 + waits.length * 16; // Tenpai bonus!
      }
      if (dangerActive) {
        if (safeTiles.has(cand.t)) s += 42; // Safe genbutsu discard!
        else if (!isTerminalOrHonor(cand.t)) s -= 18;
      }
      if (diff === 'casual') s += (Math.random() - 0.5) * 18;
      if (s > bestScore) { bestScore = s; bestIdx = i; }
    }
    return bestIdx;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     GAME STATE & ROUND LIFECYCLE
     ═══════════════════════════════════════════════════════════════════════ */
  let mj = {
    rule: 'riichi',
    phase: 'idle', // 'dingque' | 'play' | 'claim' | 'over'
    wall: [],
    doraIndicators: [],
    doraTiles: [],
    wildTile: -1,
    players: [],
    turn: 0,
    selectedUid: -1,
    pendingClaim: null, // { fromIdx, tile, options: [...] }
    settlement: null,
    riichiPool: 0,
    useNoctchill: true
  };

  function buildWall(ruleKey) {
    const rule = RULES[ruleKey];
    const wall = [];
    let uid = 1;
    const maxT = rule.honors ? 34 : (rule.onlyRedDragon ? 34 : 27);
    for (let t = 0; t < maxT; t++) {
      if (!rule.honors && rule.onlyRedDragon && t >= 27 && t !== 33) continue;
      for (let copy = 0; copy < 4; copy++) {
        const isAka = ruleKey === 'riichi' && copy === 0 && (t === 4 || t === 13 || t === 22);
        wall.push({ uid: uid++, t, red: isAka });
      }
    }
    return wall.sort(() => Math.random() - 0.5);
  }

  function sortTiles(hand, dingqueSuit = -1) {
    hand.sort((a, b) => {
      const aw = a.t === mj.wildTile ? -1 : 0;
      const bw = b.t === mj.wildTile ? -1 : 0;
      if (aw !== bw) return aw - bw;
      const ad = dingqueSuit >= 0 && tileSuit(a.t) === dingqueSuit ? 1 : 0;
      const bd = dingqueSuit >= 0 && tileSuit(b.t) === dingqueSuit ? 1 : 0;
      if (ad !== bd) return ad - bd;
      return a.t - b.t || a.uid - b.uid;
    });
  }

  function buildRoster(swap = false) {
    if (!swap && mj.players.length === 4) {
      return mj.players.slice(1).map(p => p.raw);
    }
    if (mj.useNoctchill && !swap && portraits.length) {
      const noct = NOCTCHILL_IDS.map(id => portraits.find(p => String(p.id) === id)).filter(Boolean);
      if (noct.length >= 3) return noct.slice(0, 3);
    }
    const pool = portraits.length ? portraits.slice().sort(() => Math.random() - 0.5) : [
      { id: '20', name: '浅仓透', path: '' },
      { id: '21', name: '樋口圆香', path: '' },
      { id: '22', name: '福丸小糸', path: '' }
    ];
    return pool.slice(0, 3);
  }

  function startMahjongRound(ruleKey = mj.rule, swapOpps = false) {
    mjSerial++;
    const serial = mjSerial;
    mj.rule = ruleKey;
    const rule = RULES[ruleKey];
    const opps = buildRoster(swapOpps);
    const keepScores = mj.players.length === 4 && !swapOpps;

    mj.wall = buildWall(ruleKey);
    mj.doraIndicators = [];
    mj.doraTiles = [];
    mj.wildTile = -1;
    mj.pendingClaim = null;
    mj.settlement = null;
    mj.selectedUid = -1;
    mj.riichiPool = 0;

    if (rule.riichi) {
      const ind = mj.wall.pop();
      mj.doraIndicators = [ind];
      mj.doraTiles = [nextDoraFromIndicator(ind.t)];
      if (ruleKey === 'kansai_riichi') {
        const ind2 = mj.wall.pop();
        mj.doraIndicators.push(ind2);
        mj.doraTiles.push(nextDoraFromIndicator(ind2.t));
      }
    } else if (rule.wildMode === 'flip') {
      const ind = mj.wall.pop();
      mj.doraIndicators = [ind];
      mj.wildTile = nextDoraFromIndicator(ind.t);
    } else if (rule.wildMode === 'hongzhong') {
      mj.wildTile = 33;
    } else if (rule.wildMode === 'baiban') {
      mj.wildTile = 31;
    }

    mj.players = [
      { id: 0, name: '制作人', charId: '', avatar: '/app-icon.png', score: keepScores ? mj.players[0].score : rule.startScore, hand: [], melds: [], discards: [], riichi: false, ippatsu: false, dingqueSuit: -1, won: false, speech: '', thinking: false },
      ...opps.map((o, i) => ({
        id: i + 1,
        raw: o,
        name: o.name,
        charId: String(o.id).padStart(3, '0'),
        avatar: o.path ? '/asset-original/' + o.path : '/app-icon.png',
        score: keepScores ? mj.players[i + 1].score : rule.startScore,
        hand: [], melds: [], discards: [], riichi: false, ippatsu: false, dingqueSuit: -1, won: false, speech: '请多指教♪', thinking: false
      }))
    ];

    // Deal 13 tiles (or 16 tiles for Taiwan 16-tile Mahjong!)
    const dealN = rule.handSize || 13;
    for (let i = 0; i < 4; i++) {
      mj.players[i].hand = mj.wall.splice(0, dealN);
      sortTiles(mj.players[i].hand);
    }

    // AI auto-pick Dingque in Sichuan (suit with fewest tiles)
    if (rule.dingque) {
      for (let i = 1; i < 4; i++) {
        const cnts = [0, 0, 0];
        mj.players[i].hand.forEach(x => cnts[tileSuit(x.t)]++);
        mj.players[i].dingqueSuit = cnts.indexOf(Math.min(...cnts));
        sortTiles(mj.players[i].hand, mj.players[i].dingqueSuit);
      }
      mj.phase = 'dingque';
      mj.turn = 0;
      renderMahjong();
      return;
    }

    // Changsha Qishouhu (起手胡 bonus check for Player!)
    if (ruleKey === 'changsha') {
      const suits = new Set(mj.players[0].hand.map(x => tileSuit(x.t)));
      const no258 = mj.players[0].hand.every(x => !is258(x.t));
      if (suits.size < 3) showMjFx('🔥 起手胡·缺一色！+1000');
      else if (no258) showMjFx('🔥 起手胡·板板胡！+1000');
    }

    mj.phase = 'play';
    mj.turn = 0;
    drawTileFor(0, serial);
  }

  const MJ_EMOTES = {
    happy: ['好牌♪', '进张了！', '碰得好！', '得意～'],
    smug:  ['立直来啦！', '听牌了哦！', '放马过来！'],
    panic: ['别胡啊！', '危险牌…', '立直了？！', '糟了！'],
    sad:   ['放铳了…', '下局必赢！', '差一张…'],
    cheer: ['自摸大胜！', '荣和成功！', '太棒啦♪']
  };

  function setMjEmote(p, mood) {
    if (!p || p.id === 0) return;
    const arr = MJ_EMOTES[mood] || MJ_EMOTES.happy;
    const st = typeof window.ShinyOfficialSticker === 'function'
      ? window.ShinyOfficialSticker(p.charId, mood)
      : null;
    p.emote = {
      text: arr[Math.floor(Math.random() * arr.length)],
      mood,
      stickerUrl: st?.url || '',
      wide: Boolean(st?.wide),
      at: Date.now()
    };
    const snap = p.emote.at;
    setTimeout(() => {
      if (p.emote && p.emote.at === snap) { p.emote = null; renderMahjong(); }
    }, 4500);
  }

  function showMjFx(text) {
    const el = $('#mjFxBanner');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    setTimeout(() => { el.hidden = true; }, 1900);
  }

  function drawTileFor(idx, serial, isGangDraw = false) {
    if (serial !== mjSerial || mj.phase !== 'play') return;
    if (mj.wall.length === 0) {
      finishRoundDraw();
      return;
    }
    const p = mj.players[idx];
    if (p.won) { nextMahjongTurn(serial); return; }
    const tile = mj.wall.pop();
    p.hand.push(tile);
    mj.turn = idx;
    mj.selectedUid = -1;

    // Check self-draw win (自摸)
    const winRes = evaluateWin(p.hand, p.melds, mj.rule, {
      dingqueSuit: p.dingqueSuit,
      isRiichi: p.riichi,
      isIppatsu: p.ippatsu,
      isTsumo: true,
      isGangWin: isGangDraw,
      isHaitei: mj.wall.length === 0
    });

    if (idx === 0) {
      // Check player self actions (自摸 / 暗杠 / 立直)
      const selfOpts = [];
      if (winRes) selfOpts.push({ type: 'tsumo', label: `✨ 自摸和 (${winRes.fan}番)`, res: winRes });
      // Ankan check
      const cnts = new Array(34).fill(0);
      p.hand.forEach(x => cnts[x.t]++);
      const kanT = cnts.findIndex(v => v === 4);
      if (kanT >= 0 && !p.riichi) selfOpts.push({ type: 'ankan', label: '杠（暗杠）', tileType: kanT });
      // Riichi check (Riichi rule, closed hand, >= 1000 pts, discarding any tile yields waits)
      if (RULES[mj.rule].riichi && !p.riichi && p.score >= 1000 && p.melds.every(m => m.type === 'ankan')) {
        const canRiichi = p.hand.some((_, j) => {
          const rem = p.hand.filter((__, k) => k !== j);
          return findWaitingTiles(rem, p.melds, 'riichi', { isRiichi: true }).length > 0;
        });
        if (canRiichi) selfOpts.push({ type: 'riichi', label: '⚡ 立直 (1000点)' });
      }
      mj.pendingClaim = selfOpts.length ? { self: true, options: selfOpts } : null;
      renderMahjong();
    } else {
      renderMahjong();
      runAiMahjongTurn(idx, winRes, serial);
    }
  }

  async function runAiMahjongTurn(idx, tsumoRes, serial) {
    if (serial !== mjSerial || mj.phase !== 'play') return;
    const p = mj.players[idx];
    p.thinking = true;
    renderMahjong();
    const diff = $('#arcDifficulty')?.value || 'pro';
    const thinkMs = (diff === 'master' ? 1250 : diff === 'pro' ? 1050 : 850) + Math.floor(Math.random() * 450);
    await new Promise(r => setTimeout(r, thinkMs));
    if (serial !== mjSerial || mj.phase !== 'play') return;
    p.thinking = false;

    // 1. AI Tsumo!
    if (tsumoRes) {
      const q = COLLAB_QUOTES[String(Number(p.charId))]?.tsumo || '自摸和牌！';
      p.speech = q;
      setMjEmote(p, 'cheer');
      showMjFx(`🀄 ${p.name} · 自摸！`);
      renderMahjong();
      await playVoiceWait(p, 'tsumo');
      if (serial !== mjSerial) return;
      handleWin(idx, -1, tsumoRes, serial);
      return;
    }

    // 2. AI Riichi check
    if (RULES[mj.rule].riichi && !p.riichi && p.score >= 1000 && p.melds.every(m => m.type === 'ankan')) {
      for (let i = 0; i < p.hand.length; i++) {
        const rem = p.hand.filter((_, j) => j !== i);
        if (findWaitingTiles(rem, p.melds, 'riichi', { isRiichi: true }).length > 0) {
          p.riichi = true;
          p.ippatsu = true;
          p.score -= 1000;
          mj.riichiPool += 1000;
          p.speech = COLLAB_QUOTES[String(Number(p.charId))]?.riichi || '立直！';
          setMjEmote(p, 'smug');
          mj.players.slice(1).forEach(o => { if (o !== p) setMjEmote(o, 'panic'); });
          showMjFx(`⚡ ${p.name} 宣言立直！`);
          renderMahjong();
          await playVoiceWait(p, 'riichi');
          if (serial !== mjSerial) return;
          discardTile(idx, i, serial);
          return;
        }
      }
    }

    // 3. AI Strategic Discard
    p.ippatsu = false;
    const dIdx = chooseAiDiscard(idx);
    discardTile(idx, dIdx, serial);
  }

  async function discardTile(idx, handIdx, serial) {
    if (serial !== mjSerial || mj.phase !== 'play') return;
    const p = mj.players[idx];
    const [tile] = p.hand.splice(handIdx, 1);
    if (!tile) return;
    sortTiles(p.hand, p.dingqueSuit);
    p.discards.push(tile);
    mj.pendingClaim = null;
    mj.selectedUid = -1;
    renderMahjong();

    // Check if any OTHER active player can Ron / Pon / Kan / Chi on this discard
    // Priority: 1. Ron (Human or AI), 2. Human Pon/Kan/Chi prompt, 3. AI Pon/Kan
    const rule = RULES[mj.rule];

    // Check AI Ron first (if human cannot Ron)
    const human = mj.players[0];
    const humanRon = (idx !== 0 && !human.won) ? evaluateWin([...human.hand, tile], human.melds, mj.rule, { dingqueSuit: human.dingqueSuit, isRiichi: human.riichi, isIppatsu: human.ippatsu, isTsumo: false }) : null;

    if (idx !== 0 && !human.won) {
      const opts = [];
      if (humanRon) opts.push({ type: 'ron', label: `🔥 荣和 (${humanRon.fan}番)`, res: humanRon });
      if (!human.riichi) {
        const sameCnt = human.hand.filter(x => x.t === tile.t).length;
        if (sameCnt >= 3) opts.push({ type: 'kan', label: '明杠' });
        if (sameCnt >= 2) opts.push({ type: 'pon', label: '碰' });
        // Chi only from left seat (idx === 3) when rule allows Chi
        if (rule.allowChi && idx === 3 && tile.t < 27) {
          const chiSets = findChiOptions(human.hand, tile.t);
          if (chiSets.length) opts.push({ type: 'chi', label: '吃', sets: chiSets });
        }
      }
      if (opts.length) {
        mj.phase = 'claim';
        mj.pendingClaim = { self: false, fromIdx: idx, tile, options: opts };
        renderMahjong();
        return; // Wait for player decision!
      }
    }

    // Check AI Ron
    for (let step = 1; step <= 3; step++) {
      const oi = (idx + step) % 4;
      if (oi === 0 || mj.players[oi].won) continue;
      const o = mj.players[oi];
      const aiRon = evaluateWin([...o.hand, tile], o.melds, mj.rule, { dingqueSuit: o.dingqueSuit, isRiichi: o.riichi, isIppatsu: o.ippatsu, isTsumo: false });
      if (aiRon) {
        o.speech = COLLAB_QUOTES[String(Number(o.charId))]?.ron || '荣和！';
        showMjFx(`🔥 ${o.name} · 荣和！`);
        renderMahjong();
        await playVoiceWait(o, 'ron');
        if (serial !== mjSerial) return;
        o.hand.push(tile);
        p.discards.pop();
        handleWin(oi, idx, aiRon, serial);
        return;
      }
    }

    // Check AI Pon (Pro/Master smart Pon!)
    const diff = $('#arcDifficulty')?.value || 'pro';
    for (let step = 1; step <= 3; step++) {
      const oi = (idx + step) % 4;
      if (oi === 0 || mj.players[oi].won || mj.players[oi].riichi) continue;
      const o = mj.players[oi];
      if (rule.dingque && tileSuit(tile.t) === o.dingqueSuit) continue;
      const matches = o.hand.filter(x => x.t === tile.t);
      if (matches.length >= 2) {
        const shouldPon = (tile.t >= 31 || tile.t === 27) || (mj.rule !== 'riichi' && diff !== 'casual' && Math.random() < 0.65);
        if (shouldPon) {
          p.discards.pop();
          const taken = [];
          for (let k = 0; k < 2; k++) {
            const pos = o.hand.findIndex(x => x.t === tile.t);
            taken.push(o.hand.splice(pos, 1)[0]);
          }
          o.melds.push({ type: 'pon', tiles: [tile, ...taken] });
          o.speech = COLLAB_QUOTES[String(Number(o.charId))]?.pon || '碰！';
          setMjEmote(o, 'happy');
          showMjFx(`${o.name} · 碰！`);
          renderMahjong();
          await playVoiceWait(o, 'pon');
          if (serial !== mjSerial) return;
          mj.turn = oi;
          runAiMahjongTurn(oi, null, serial);
          return;
        }
      }
    }

    nextMahjongTurn(serial);
  }

  function findChiOptions(hand, t) {
    if (t >= 27) return [];
    const n = t % 9;
    const sets = [];
    const has = x => hand.find(c => c.t === x);
    if (n >= 2 && has(t - 2) && has(t - 1)) sets.push([has(t - 2), has(t - 1)]);
    if (n >= 1 && n <= 7 && has(t - 1) && has(t + 1)) sets.push([has(t - 1), has(t + 1)]);
    if (n <= 6 && has(t + 1) && has(t + 2)) sets.push([has(t + 1), has(t + 2)]);
    return sets;
  }

  function nextMahjongTurn(serial) {
    if (serial !== mjSerial || mj.phase !== 'play') return;
    let next = mj.turn;
    for (let s = 0; s < 4; s++) {
      next = (next + 1) % 4;
      if (!mj.players[next].won) break;
    }
    drawTileFor(next, serial);
  }

  function handleWin(winnerIdx, loserIdx, res, serial) {
    const rule = RULES[mj.rule];
    const winner = mj.players[winnerIdx];
    let bonusNote = '';
    let finalPts = res.points + mj.riichiPool;
    mj.riichiPool = 0;

    // Guiyang Catch Chicken (翻鸡捉鸡)
    if (rule.catchChicken && mj.wall.length > 0) {
      const flip = mj.wall.pop();
      const chickenT = nextDoraFromIndicator(flip.t);
      const chickenHits = winner.hand.filter(x => x.t === chickenT || x.t === 18).length;
      if (chickenHits > 0) {
        const extra = chickenHits * 1000;
        finalPts += extra;
        bonusNote += ` · 捉鸡命中×${chickenHits} (+${extra})`;
      } else {
        bonusNote += ' · 翻鸡未中';
      }
    }

    // Guangdong / Changsha / Hongzhong / Guangxi Buy Horse (买马 / 扎鸟)
    if (rule.buyHorse > 0 && mj.wall.length > 0) {
      const horseTiles = mj.wall.splice(0, Math.min(rule.buyHorse, mj.wall.length));
      const hits = horseTiles.filter(h => (h.t < 27 && [1, 5, 9].includes(tileNum(h.t))) || h.t === 27 || h.t === 33).length;
      if (hits > 0) {
        finalPts += res.points * hits;
        bonusNote = ` · 买马中 ${hits} 码 (+${res.points * hits})`;
      } else {
        bonusNote = ' · 买马未中';
      }
    }

    if (loserIdx >= 0) {
      winner.score += finalPts;
      mj.players[loserIdx].score -= finalPts;
    } else {
      const others = mj.players.filter((p, i) => i !== winnerIdx && !p.won);
      const share = Math.round(finalPts / Math.max(1, others.length));
      others.forEach(o => { o.score -= share; winner.score += share; });
    }

    winner.won = true;

    // Sichuan Blood Battle (血战到底): continue until 3 winners!
    if (rule.bloodBattle && mj.players.filter(p => p.won).length < 3 && mj.wall.length > 0) {
      showMjFx(`🐼 ${winner.name} 胡牌 (+${finalPts})！血战继续！`);
      mj.phase = 'play';
      nextMahjongTurn(serial);
      return;
    }

    mj.phase = 'over';
    mj.settlement = {
      title: `${winner.name} ${loserIdx >= 0 ? '荣和' : '自摸和牌'}！`,
      yaku: res.yaku,
      points: finalPts,
      bonusNote,
      winnerHand: winner.hand,
      winnerMelds: winner.melds
    };
    renderMahjong();
  }

  function finishRoundDraw() {
    mj.phase = 'over';
    mj.settlement = {
      title: '荒牌流局',
      yaku: ['牌山已摸完，本局平局'],
      points: 0,
      bonusNote: '',
      winnerHand: [],
      winnerMelds: []
    };
    renderMahjong();
  }

  /* ── Player Action Handlers (Claim / Self Actions / Dingque) ── */
  function handleClaimAction(opt) {
    const serial = mjSerial;
    const me = mj.players[0];
    const pc = mj.pendingClaim;
    if (!pc) return;

    if (pc.self) {
      if (opt.type === 'tsumo') {
        mj.pendingClaim = null;
        handleWin(0, -1, opt.res, serial);
      } else if (opt.type === 'riichi') {
        me.riichi = true;
        me.ippatsu = true;
        me.score -= 1000;
        mj.riichiPool += 1000;
        mj.pendingClaim = null;
        mj.players.slice(1).forEach(o => setMjEmote(o, 'panic'));
        showMjFx('⚡ 制作人宣言立直！请打出听牌舍张');
        renderMahjong();
      } else if (opt.type === 'ankan') {
        const tiles = [];
        for (let k = 0; k < 4; k++) {
          const pIdx = me.hand.findIndex(x => x.t === opt.tileType);
          tiles.push(me.hand.splice(pIdx, 1)[0]);
        }
        me.melds.push({ type: 'ankan', tiles });
        if (RULES[mj.rule].bloodBattle) {
          mj.players.slice(1).forEach(o => { if (!o.won) { o.score -= 1000; me.score += 1000; } });
          showMjFx('🌧 下雨（暗杠）即时收分！');
        }
        mj.pendingClaim = null;
        drawTileFor(0, serial, true);
      }
      return;
    }

    // Response to opponent discard
    const fromP = mj.players[pc.fromIdx];
    const tile = pc.tile;
    mj.pendingClaim = null;
    mj.phase = 'play';

    if (opt.type === 'pass') {
      nextMahjongTurn(serial);
      return;
    }
    if (opt.type === 'ron') {
      fromP.discards.pop();
      me.hand.push(tile);
      handleWin(0, pc.fromIdx, opt.res, serial);
      return;
    }
    if (opt.type === 'pon') {
      fromP.discards.pop();
      const taken = [];
      for (let k = 0; k < 2; k++) {
        const idx = me.hand.findIndex(x => x.t === tile.t);
        taken.push(me.hand.splice(idx, 1)[0]);
      }
      me.melds.push({ type: 'pon', tiles: [tile, ...taken] });
      mj.turn = 0;
      renderMahjong();
      return;
    }
    if (opt.type === 'kan') {
      fromP.discards.pop();
      const taken = [];
      for (let k = 0; k < 3; k++) {
        const idx = me.hand.findIndex(x => x.t === tile.t);
        taken.push(me.hand.splice(idx, 1)[0]);
      }
      me.melds.push({ type: 'kan', tiles: [tile, ...taken] });
      if (RULES[mj.rule].bloodBattle) {
        fromP.score -= 1000; me.score += 1000;
        showMjFx('🌪 刮风（明杠）即时收分！');
      }
      mj.turn = 0;
      drawTileFor(0, serial, true);
      return;
    }
    if (opt.type === 'chi') {
      fromP.discards.pop();
      const pair = opt.sets[0];
      const taken = pair.map(tObj => {
        const idx = me.hand.findIndex(x => x.uid === tObj.uid);
        return me.hand.splice(idx, 1)[0];
      });
      const meldTiles = [tile, ...taken].sort((a, b) => a.t - b.t);
      me.melds.push({ type: 'chi', tiles: meldTiles });
      mj.turn = 0;
      renderMahjong();
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER MAHJONG TABLE UI
     ═══════════════════════════════════════════════════════════════════════ */
  function seatHtml(idx) {
    const p = mj.players[idx];
    if (!p) return '';
    const dqLabel = RULES[mj.rule].dingque && p.dingqueSuit >= 0 ? `<span class="mj-dq-tag">缺${SUIT_NAMES[p.dingqueSuit]}</span>` : '';
    const riichiTag = p.riichi ? '<span class="mj-riichi-tag">立直</span>' : '';
    const meldsHtml = p.melds.length
      ? `<div class="mj-seat-melds">${p.melds.map(m => `<div class="mj-meld-grp">${m.tiles.map(t => renderTileHtml(t, { small: true })).join('')}</div>`).join('')}</div>`
      : '';
    const emoteHtml = typeof window.ShinyRenderEmotePop === 'function'
      ? window.ShinyRenderEmotePop(p.emote)
      : (p.emote ? `<div class="idol-emote-pop mood-${p.emote.mood}"><span class="emote-caption">${p.emote.text}</span></div>` : '');
    return `
      <div class="mj-seat-card ${mj.turn === idx && mj.phase === 'play' ? 'is-turn' : ''} ${p.won ? 'is-won' : ''}">
        ${emoteHtml}
        <img src="${p.avatar}" alt="${p.name}" onerror="this.src='/app-icon.png'">
        <div class="mj-seat-meta">
          <div class="mj-seat-top">
            <span class="mj-wind">${SEAT_WINDS[idx]}</span>
            <strong>${p.name}</strong>
            ${dqLabel}${riichiTag}
          </div>
          <div class="mj-seat-sub">${p.score.toLocaleString()} 点 · 余 ${p.hand.length} 张</div>
          <div class="seat-speech ${p.thinking ? 'thinking' : ''}">${p.thinking ? '思考中…' : (p.speech || '')}</div>
        </div>
      </div>
      ${meldsHtml}
    `;
  }

  function renderMahjong() {
    const root = $('#panel-mahjong');
    if (!root) return;
    const rule = RULES[mj.rule];
    $('#mjRuleDesc').textContent = rule.desc;
    $('#mjWallCount').textContent = String(mj.wall.length);
    $('#mjTurnLabel').textContent = mj.phase === 'dingque'
      ? '请先定缺一门花色'
      : mj.phase === 'over' ? '本局已结算'
      : mj.turn === 0 ? '轮到你出牌（点击牌两次或选牌后点打出）' : `${mj.players[mj.turn]?.name || ''} 回合`;

    // Dora / Wild indicator
    const indWrap = $('#mjIndicatorWrap');
    if (mj.rule === 'riichi' && mj.doraIndicators.length) {
      indWrap.innerHTML = `<span class="mj-ind-lbl">宝牌指示</span>${mj.doraIndicators.map(t => renderTileHtml(t, { small: true })).join('')}`;
      indWrap.hidden = false;
    } else if (mj.wildTile >= 0) {
      indWrap.innerHTML = `<span class="mj-ind-lbl">${mj.rule === 'hongzhong' ? '红中赖子' : '本局财神'}</span>${renderTileHtml(mj.wildTile, { small: true })}`;
      indWrap.hidden = false;
    } else {
      indWrap.hidden = true;
    }

    // 3 AI Seats
    $('#mjSeatTop').innerHTML = seatHtml(2);
    $('#mjSeatLeft').innerHTML = seatHtml(3);
    $('#mjSeatRight').innerHTML = seatHtml(1);

    // 4 Discard Rivers
    for (let i = 0; i < 4; i++) {
      const el = $(`#mjRiver${i}`);
      if (el) el.innerHTML = (mj.players[i]?.discards || []).map(t => renderTileHtml(t, { small: true })).join('');
    }

    // Dingque selector bar
    $('#mjDingqueBar').hidden = mj.phase !== 'dingque';

    // Action Callout Bar (吃/碰/杠/立直/自摸/荣和/过)
    const claimBar = $('#mjClaimBar');
    if (mj.pendingClaim) {
      claimBar.hidden = false;
      const btns = mj.pendingClaim.options.map((opt, idx) =>
        `<button type="button" class="act-btn ${opt.type === 'ron' || opt.type === 'tsumo' ? 'gold' : 'primary'}" data-claim-idx="${idx}">${opt.label}</button>`
      ).join('');
      const passBtn = !mj.pendingClaim.self
        ? '<button type="button" class="act-btn ghost" data-claim-pass="1">过</button>'
        : '';
      claimBar.innerHTML = btns + passBtn;
      claimBar.querySelectorAll('[data-claim-idx]').forEach(b => {
        b.addEventListener('click', () => handleClaimAction(mj.pendingClaim.options[Number(b.dataset.claimIdx)]));
      });
      claimBar.querySelector('[data-claim-pass]')?.addEventListener('click', () => handleClaimAction({ type: 'pass' }));
    } else {
      claimBar.hidden = true;
    }

    // Settlement Overlay
    const setEl = $('#mjSettlement');
    if (mj.settlement) {
      setEl.hidden = false;
      const s = mj.settlement;
      setEl.innerHTML = `
        <div class="mj-settle-box">
          <h3>${s.title}</h3>
          <div class="mj-settle-yaku">${s.yaku.map(y => `<span class="hud-chip gold">${y}</span>`).join('')}</div>
          ${s.points ? `<p class="mj-settle-pts">结算点数：<strong>+${s.points.toLocaleString()}</strong>${s.bonusNote}</p>` : ''}
          ${s.winnerHand.length ? `<div class="mj-settle-hand">${s.winnerHand.map(t => renderTileHtml(t, { small: true })).join('')}</div>` : ''}
          <button type="button" class="act-btn gold" id="btnMjNextRound">再来一局</button>
        </div>
      `;
      $('#btnMjNextRound')?.addEventListener('click', () => startMahjongRound(mj.rule, false));
    } else {
      setEl.hidden = true;
    }

    // Player Hand + Melds + Waiting Hints
    const me = mj.players[0];
    $('#mjMyScore').textContent = `${me.score.toLocaleString()} 点`;
    $('#mjMyMelds').innerHTML = me.melds.map(m => `<div class="mj-meld-grp">${m.tiles.map(t => renderTileHtml(t, { small: true })).join('')}</div>`).join('');

    // Waiting tiles preview
    const waitsWrap = $('#mjWaitsHint');
    if (me.hand.length === 13 && mj.phase === 'play') {
      const waits = findWaitingTiles(me.hand, me.melds, mj.rule, { dingqueSuit: me.dingqueSuit, isRiichi: me.riichi });
      waitsWrap.innerHTML = waits.length
        ? `<span>听牌：</span>${waits.slice(0, 6).map(t => renderTileHtml(t, { small: true })).join('')}`
        : '';
    } else {
      waitsWrap.innerHTML = '';
    }

    const handEl = $('#mjMyHand');
    handEl.innerHTML = me.hand.map((tile, idx) => renderTileHtml(tile, {
      clickable: true,
      selected: tile.uid === mj.selectedUid,
      drawn: mj.turn === 0 && idx === me.hand.length - 1 && me.hand.length % 3 === 2,
      dingqueSuit: me.dingqueSuit
    })).join('');

    handEl.querySelectorAll('.mj-tile').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        if (mj.phase !== 'play' || mj.turn !== 0) return;
        // Sichuan Dingque enforcement: must play missing suit first if holding any
        if (rule.dingque && me.dingqueSuit >= 0) {
          const hasDq = me.hand.some(x => tileSuit(x.t) === me.dingqueSuit);
          if (hasDq && tileSuit(me.hand[idx].t) !== me.dingqueSuit) {
            showMjFx(`请先打出定缺花色（${SUIT_NAMES[me.dingqueSuit]}）！`);
            return;
          }
        }
        if (me.riichi && idx !== me.hand.length - 1) {
          showMjFx('立直中只能打出刚摸到的牌');
          return;
        }
        const uid = Number(btn.dataset.uid);
        if (mj.selectedUid === uid) {
          discardTile(0, idx, mjSerial);
        } else {
          mj.selectedUid = uid;
          renderMahjong();
        }
      });
    });

    $('#btnMjDiscard').disabled = !(mj.phase === 'play' && mj.turn === 0 && mj.selectedUid >= 0);
  }

  /* ── Mount & Wire UI ────────────────────────────────────────────────── */
  async function initMahjong() {
    if (initialized) return;
    initialized = true;
    const [pRes, vRes, packRes] = await Promise.allSettled([
      fetch('/portraits.json').then(r => r.json()),
      fetch('/data/voice-index.json').then(r => r.json()),
      fetch('/api/mahjong-voice-pack').then(r => r.json())
    ]);
    if (pRes.status === 'fulfilled' && Array.isArray(pRes.value)) {
      portraits = pRes.value.filter(p => /^\d+$/.test(String(p.id)) && Number(p.id) >= 1 && Number(p.id) <= 28);
    }
    if (vRes.status === 'fulfilled' && Array.isArray(vRes.value)) voiceIndex = vRes.value;
    if (packRes.status === 'fulfilled' && packRes.value?.ok) {
      customVoicePack = packRes.value.voices || {};
      voiceFolderHint = packRes.value.folderHint || '';
      const count = Object.values(customVoicePack).reduce((s, o) => s + Object.keys(o).length, 0);
      const hintEl = $('#mjVoicePackHint');
      if (hintEl) {
        hintEl.textContent = count > 0
          ? `已加载本地雀魂语音包（${count} 条）`
          : '已启用闪耀色彩官方角色语音 · 可放自定义雀魂语音至 mahjong-voices';
      }
    }

    // Render all 38 rules grouped neatly by Region (<optgroup>)
    const ruleSel = $('#mjRuleSelect');
    if (ruleSel) {
      const groups = new Map();
      for (const [k, r] of Object.entries(RULES)) {
        if (!groups.has(r.region)) groups.set(r.region, []);
        groups.get(r.region).push([k, r]);
      }
      ruleSel.innerHTML = [...groups.entries()].map(([reg, items]) =>
        `<optgroup label="── ${reg} (${items.length}种) ──">${items.map(([k, r]) => `<option value="${k}">${r.name}</option>`).join('')}</optgroup>`
      ).join('');
      ruleSel.value = mj.rule;
      ruleSel.addEventListener('change', () => startMahjongRound(ruleSel.value, false));
    }

    $('#btnMjRestart')?.addEventListener('click', () => startMahjongRound(mj.rule, false));
    $('#btnMjSwap')?.addEventListener('click', () => { mj.useNoctchill = false; startMahjongRound(mj.rule, true); });
    $('#btnMjNoctchill')?.addEventListener('click', () => { mj.useNoctchill = true; startMahjongRound(mj.rule, true); });
    $('#btnMjDiscard')?.addEventListener('click', () => {
      if (mj.phase !== 'play' || mj.turn !== 0 || mj.selectedUid < 0) return;
      const idx = mj.players[0].hand.findIndex(x => x.uid === mj.selectedUid);
      if (idx >= 0) discardTile(0, idx, mjSerial);
    });

    document.querySelectorAll('[data-dq-suit]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (mj.phase !== 'dingque') return;
        mj.players[0].dingqueSuit = Number(btn.dataset.dqSuit);
        sortTiles(mj.players[0].hand, mj.players[0].dingqueSuit);
        mj.phase = 'play';
        drawTileFor(0, mjSerial);
      });
    });

    document.querySelectorAll('.mj-stamp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const txt = btn.dataset.stamp || btn.textContent;
        const mood = btn.dataset.mood || 'happy';
        showMjFx(`制作人：${txt}`);
        const ai = mj.players.slice(1).filter(p => !p.won);
        if (ai.length) {
          const pick = ai[Math.floor(Math.random() * ai.length)];
          setMjEmote(pick, mood);
          renderMahjong();
        }
      });
    });

    startMahjongRound('riichi', false);
  }

  window.ShinyMahjong = { onShow: initMahjong, start: startMahjongRound };
})();
