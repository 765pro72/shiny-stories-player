/* ═══════════════════════════════════════════════════════════════════════════
   283 STORY CONSTELLATION ENGINE
   Interactive Prism Galaxy · Cross-Unit Bonds · Supernova Motif Resonance
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const canvas = document.getElementById('constellationCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: false });

  const isJoyTrans = document.documentElement.dataset.joytrans === '1'
    || /JoyTrans|Droitong/i.test(navigator.userAgent || '');
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

  const UNIT_COLORS = [
    '#38bdf8', // illumination STARS
    '#a855f7', // L'Antica
    '#f97316', // 放课后
    '#ec4899', // ALSTROEMERIA
    '#f43f5e', // Straylight
    '#0ea5e9', // noctchill
    '#10b981', // SHHis
    '#818cf8'  // CoMETIK
  ];

  // State
  let W = window.innerWidth, H = window.innerHeight, DPR = Math.min(window.devicePixelRatio || 1, isJoyTrans ? 1.25 : 2);
  const getProducerDisplayName = () => {
    try {
      const fromDesk = window.desktop?.getState?.()?.['shiny.producerName'];
      const v = String(localStorage.getItem('shiny.producerName') || fromDesk || '').trim();
      return v || '制作人';
    } catch { return '制作人'; }
  };

  let catalog = [];
  let catalogByKey = new Map();
  let cardArtMap = {};
  let idolCoverMap = new Map();
  let storySnippets = {};
  let cIndex = { extra: {}, pairs: {} };
  let dateByGroup = new Map();
  let dateByTitle = new Map();
  let storySortMode = 'asc'; // 'asc' (时间正序) | 'desc' (时间倒序)
  let storyCatFilter = 'all'; // 'all' | 'main' | 'idol' | 'support'
  let units = [];
  let nodes = [];       // 28 idol star nodes
  let edges = [];       // intra-unit + cross-unit story bond edges
  let pulses = [];      // traveling photon energy pulses along edges
  let ripples = [];     // supernova shockwave ripples on click / motif ignite
  let meteors = [];     // shooting stars
  let bgStars = [];     // 3-layer parallax background starfield
  let portraits = new Map();

  let autoOrbit = !isJoyTrans;
  let orbitAngle = 0;
  let activeNodeId = null;
  let activeUnitIdx = -1;
  let activeMotif = '';
  let motifHits = new Map(); // idolName -> matched stories[]
  let hoveredNode = null;

  // Smooth spring camera
  const cam = { x: 0, y: 0, zoom: 1, tx: 0, ty: 0, tzoom: 1 };

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, isJoyTrans ? 1.25 : 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Generate 3-layer twinkling starfield
  const bgCount = isJoyTrans ? 90 : (isMobile ? 160 : 260);
  for (let i = 0; i < bgCount; i++) {
    bgStars.push({
      x: (Math.random() - 0.5) * 2600,
      y: (Math.random() - 0.5) * 2000,
      r: Math.random() * 1.6 + 0.4,
      depth: Math.random() * 0.65 + 0.15,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.8 + 0.6,
      hue: [195, 220, 270, 330, 45][(Math.random() * 5) | 0]
    });
  }

  function spawnRipple(wx, wy, color, maxR = 420) {
    ripples.push({ x: wx, y: wy, r: 10, maxR, color, alpha: 0.92 });
  }

  function spawnMeteor() {
    if (isJoyTrans || meteors.length > 3) return;
    const angle = Math.PI * (0.14 + Math.random() * 0.22);
    const speed = 620 + Math.random() * 480;
    meteors.push({
      x: (Math.random() - 0.3) * W,
      y: -40 + Math.random() * (H * 0.4),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      len: 90 + Math.random() * 110,
      life: 1,
      color: UNIT_COLORS[(Math.random() * UNIT_COLORS.length) | 0]
    });
  }

  function worldToScreen(wx, wy) {
    const cx = (W - (W > 900 && !document.getElementById('cnInspector')?.classList.contains('is-collapsed') ? 320 : 0)) * 0.5;
    const cy = H * 0.52;
    return {
      x: (wx - cam.x) * cam.zoom + cx,
      y: (wy - cam.y) * cam.zoom + cy
    };
  }

  function screenToWorld(sx, sy) {
    const cx = (W - (W > 900 && !document.getElementById('cnInspector')?.classList.contains('is-collapsed') ? 320 : 0)) * 0.5;
    const cy = H * 0.52;
    return {
      x: (sx - cx) / cam.zoom + cam.x,
      y: (sy - cy) / cam.zoom + cam.y
    };
  }

  function getNodePos(n) {
    if (n.isCenter) return { x: 0, y: 0 };
    const spd = n.isCore ? -0.55 : 1;
    const cos = Math.cos(orbitAngle * spd);
    const sin = Math.sin(orbitAngle * spd);
    const rx = n.bx * cos - n.by * sin;
    const ry = n.bx * sin + n.by * cos;
    return { x: rx, y: ry };
  }

  // Load real 283 data: units, stories, portraits, script-verified index, chronological dates, card art, and authentic story snippets
  async function initData() {
    const [groups, cat, portRows, idxData, refData, artData, snipData] = await Promise.all([
      fetch('/guide-groups.json').then(r => r.json()),
      fetch('/data/catalog.json').then(r => r.json()),
      fetch('/portraits.json').then(r => r.json()).catch(() => []),
      fetch('/constellation-index.json').then(r => r.json()).catch(() => ({ extra: {}, pairs: {} })),
      fetch('/guide-reference.json').then(r => r.json()).catch(() => null),
      fetch('/data/card-art.json').then(r => r.json()).catch(() => ({})),
      fetch('/story-snippets.json').then(r => r.json()).catch(() => ({}))
    ]);

    catalog = Array.isArray(cat) ? cat : [];
    catalogByKey = new Map(catalog.map(s => [s.key, s]));
    cardArtMap = artData && typeof artData === 'object' ? artData : {};
    storySnippets = snipData && typeof snipData === 'object' ? snipData : {};
    for (const s of catalog) {
      if (!s.idol) continue;
      const a = cardArtMap[s.key];
      if (a && a.type === 'idols' && a.id) {
        const url = `/asset/images/content/${a.type}/card/${a.id}.jpg`;
        if (!idolCoverMap.has(s.idol)) idolCoverMap.set(s.idol, []);
        const pool = idolCoverMap.get(s.idol);
        if (!pool.includes(url)) pool.push(url);
      }
    }
    cIndex = idxData && typeof idxData === 'object' ? idxData : { extra: {}, pairs: {} };

    // Build real release-date lookup map from guide-reference.json (2018 -> 2026)
    if (refData && Array.isArray(refData.timeline)) {
      for (const yr of refData.timeline) {
        for (const ent of (yr.entries || [])) {
          const d = String(ent.date || '').trim();
          if (!d) continue;
          if (ent.title && !dateByTitle.has(ent.title)) dateByTitle.set(ent.title, d);
          for (const g of (ent.groups || [])) {
            if (g && !dateByGroup.has(g)) dateByGroup.set(g, d);
          }
        }
      }
    }

    // Preload circular portrait images
    const pIndex = new Map();
    for (const row of (portRows || [])) {
      if (!row || !row.path) continue;
      for (const k of [row.name, ...(row.aliases || [])]) {
        if (k) pIndex.set(String(k), row);
      }
    }

    const coreUnits = groups.slice(0, 8);
    units = coreUnits.map((g, uIdx) => ({
      idx: uIdx,
      icon: g[0],
      name: g[1],
      members: g[2],
      color: UNIT_COLORS[uIdx % UNIT_COLORS.length]
    }));

    // Arrange 8 unit constellations around the central Producer + 283 Core Lore Ring
    const galaxyRadius = Math.min(W, H) * (isMobile ? 0.44 : 0.40);
    const storyByIdol = new Map();
    const idolsByGroup = new Map();

    for (const s of catalog) {
      if (!s.idol) continue;
      if (!storyByIdol.has(s.idol)) storyByIdol.set(s.idol, []);
      storyByIdol.get(s.idol).push(s);
      if (s.group) {
        if (!idolsByGroup.has(s.group)) idolsByGroup.set(s.group, new Set());
        idolsByGroup.get(s.group).add(s.idol);
      }
    }

    // 0. Dead-Center Sun: 制作人 (283P) + Inner Lore Ring (七草叶月 / 天井努 社长 / 八云奈美 / 七草父)
    const matchLoreStories = (terms, limit = 60) => {
      const lowTerms = terms.map(t => t.toLowerCase());
      const out = [];
      for (const s of catalog) {
        const hay = `${s.title || ''} ${s.group || ''} ${s.idol || ''} ${s.category || ''} ${s.description || ''}`.toLowerCase();
        if (lowTerms.some(k => hay.includes(k))) {
          out.push(s);
          if (out.length >= limit) break;
        }
      }
      return out;
    };

    const pDisplayName = getProducerDisplayName();
    const pChip = document.querySelector('.cn-motif-chip[data-node="制作人"]');
    if (pChip) pChip.textContent = `👑 ${pDisplayName} (全员)`;

    const CORE_FIGURES = [
      {
        id: '制作人', name: '制作人', displayName: pDisplayName, unitName: '283 核心恒星 · PRODUCER', color: '#facc15',
        isCore: true, isCenter: true, bx: 0, by: 0, radius: 30, emblem: pDisplayName === '制作人' ? '283P' : pDisplayName.slice(0, 4),
        bio: '位于 283 事务所星系正中央的核心人物。陪伴 28 位偶像走过 W.I.N.G.、G.R.A.D.、感谢祭、L.P. 与 S.T.E.P. 的每一步，与天井社长、七草叶月共同维系事务所的现在与未来。',
        terms: ['制作人', 'プロデューサー', 'w.i.n.g', 'g.r.a.d', '感谢祭', 's.t.e.p'],
        bonds: ['七草叶月', '天井努 社长', '八云奈美', '路加前经纪人', '七草父',
          '樱木真乃', '风野灯织', '八宫巡',
          '月冈恋钟', '田中摩美美', '白濑咲耶', '三峰结华', '幽谷雾子',
          '小宫果穗', '园田智代子', '西城树里', '杜野凛世', '有栖川夏叶',
          '大崎甘奈', '大崎甜花', '桑山千雪',
          '芹泽朝日', '黛冬优子', '和泉爱依',
          '浅仓透', '樋口圆香', '福丸小糸', '市川雏菜',
          '七草日花', '绯田美琴',
          '斑鸠路加', '铃木羽那', '郁田春希']
      },
      {
        id: '七草叶月', name: '七草叶月', unitName: '283 事务员 · 核心人物', color: '#34d399',
        isCore: true, bx: -112, by: -68, radius: 24, emblem: '叶月', portraitKey: '七草叶月',
        bio: '283 事务所不可或缺的事务员，也是七草日花的亲姐姐。身兼数职支撑着七草家与事务所的日常，知晓许多关于父亲与事务所过往的秘密。',
        terms: ['叶月', 'はづき', '七草日花', '事务员', '283'],
        bonds: ['制作人', '天井努 社长', '七草日花', '七草父', '八云奈美', '绯田美琴']
      },
      {
        id: '天井努 社长', name: '天井努 社长', unitName: '283 事务所社长 · 核心人物', color: '#f59e0b',
        isCore: true, bx: 112, by: -68, radius: 24, emblem: '社长',
        bio: '283 事务所创立者与社长。曾担任传奇偶像八云奈美的制作人，过去与七草父、美琴、路加及日花之间交织着 283 最深层的主线伏笔。',
        terms: ['天井', '社长', '社長', '八云', '八雲', '七草日花', '绯田美琴', '斑鸠路加'],
        bonds: ['制作人', '七草叶月', '八云奈美', '七草父', '七草日花', '绯田美琴', '斑鸠路加']
      },
      {
        id: '八云奈美', name: '八云奈美', unitName: '传说偶像 · 主线核心伏笔', color: '#f43f5e',
        isCore: true, bx: 112, by: 68, radius: 24, emblem: '八云',
        bio: '贯穿 283 剧情最关键的传奇偶像。她的歌声与退场深深影响了天井努社长、憧憬她的七草日花、追寻答案的绯田美琴，以及背负着她之名的斑鸠路加。',
        terms: ['八云', '八雲', 'なみ', 'shhis', '七草日花', '绯田美琴', '斑鸠路加'],
        bonds: ['天井努 社长', '制作人', '七草日花', '绯田美琴', '斑鸠路加', '七草叶月', '七草父']
      },
      {
        id: '七草父', name: '七草父', unitName: '往昔制作人 · 283 伏笔线', color: '#a78bfa',
        isCore: true, bx: -118, by: 62, radius: 21, emblem: '七草父',
        bio: '七草叶月与七草日花的已故父亲，生前曾是与天井努并肩的资深制作人。他对偶像事业的热忱与遗憾，至今仍在七草姐妹与 283 事务所中回响。',
        terms: ['七草', '叶月', '日花', '父', '天井'],
        bonds: ['制作人', '七草叶月', '七草日花', '天井努 社长', '八云奈美']
      },
      {
        id: '路加前经纪人', name: '路加前经纪人', unitName: '前担当经纪人 · 路加与美琴线', color: '#94a3b8',
        isCore: true, bx: 0, by: 124, radius: 21, emblem: '经纪人',
        bio: '斑鸠路加移籍 283 之前的担当经纪人，也曾担任过绯田美琴的经纪人。长期承受路加的尖锐情绪并默默支撑她，最终成为促成路加人生转折与移籍 283 的重要关键人物。',
        terms: ['斑鸠路加', '绯田美琴', 'ルカ', 'マネージャー', '经纪人'],
        bonds: ['斑鸠路加', '绯田美琴', '八云奈美', '制作人']
      }
    ];

    for (const cf of CORE_FIGURES) {
      const coreNode = {
        id: cf.id,
        name: cf.name,
        displayName: cf.displayName || cf.name,
        unitIdx: -2,
        unitName: cf.unitName,
        color: cf.color,
        isCore: true,
        isCenter: !!cf.isCenter,
        emblem: cf.emblem,
        bio: cf.bio,
        bx: cf.bx,
        by: cf.by,
        radius: cf.radius,
        stories: matchLoreStories(cf.terms, 50),
        phase: Math.random() * Math.PI * 2,
        img: null,
        crop: null,
        _coreBonds: cf.bonds
      };
      const pRow = cf.portraitKey ? pIndex.get(cf.portraitKey) : null;
      if (pRow && pRow.path) {
        coreNode.crop = pRow.crop || null;
        const im = new Image();
        im.decoding = 'async';
        im.onload = () => { coreNode.img = im; };
        im.src = '/asset-original/' + pRow.path;
      }
      nodes.push(coreNode);
    }

    const IDOL_BIOS = {
      '樱木真乃': 'illumination STARS 的中心，温柔而包容的少女。在公园与制作人偶然相遇，因那份「想变得更闪耀」的纯粹心情踏入 283 事务所，是照亮全员起点的柔和星光。',
      '风野灯织': 'illumination STARS 成员，认真自律、外冷内热的努力家。曾因不善表达而苦恼，在与真乃、巡的磨合与信任中逐渐敞开心扉，成长为组合最稳健的支柱。',
      '八宫巡': 'illumination STARS 的太阳，开朗直率、充满元气的日美混血少女。总是敏锐地察觉伙伴的心事并用笑容治愈大家，背负着「想让所有人都露出笑容」的温柔愿望。',
      '月冈恋钟': 'L\'Antica 的队长，来自长崎、乐观到近乎无敌的行动派。哪怕屡屡犯迷糊也永不言弃，用滚烫的自信与包容把性格迥异的伙伴紧紧凝聚在同一面旗帜下。',
      '田中摩美美': 'L\'Antica 成员，我行我素的朋克系「问题少女」。嘴上说着怕麻烦、爱捉弄人，实则极其细腻且珍视伙伴，总在关键时刻用自己的方式默默守护大家。',
      '白濑咲耶': 'L\'Antica 的王子殿下，身姿挺拔、举止优雅的舞台焦点。在华丽完美的表象之下藏着渴望被需要与害怕孤独的柔软一面，与伙伴们一同学会了真正的依靠。',
      '三峰结华': 'L\'Antica 的智囊，热爱次文化、擅长察言观色的大学生偶像。习惯用轻快与自嘲掩饰真心，在 L\'Antica 的羁绊与制作人的注视下，一步步学会正视「真实的自己」。',
      '幽谷雾子': 'L\'Antica 的温柔灵魂，语气温软、对万物都怀抱慈悲的少女。常以独特而充满诗意的视角看待世界与伤痛，是能抚平众人不安的静谧月光。',
      '小宫果穗': '放课后 Climax Girls 的中心，憧憬特摄英雄的小学生偶像。拥有比任何人都炽热的梦想与勇气，她的纯真与全力以赴常常成为激励前辈与制作人的最强力量。',
      '园田智代子': '放课后 Climax Girls 的「巧克力偶像」，努力寻找自己独特闪光点的普通高中生。凭借脚踏实地的真诚与温柔的共情力，在五人之中起着不可或缺的粘合作用。',
      '西城树里': '放课后 Climax Girls 的帅气担当，曾是篮球少女的假小子。嘴硬心软、极其重情重义，在偶像舞台上重新找回了全力奔跑的悸动与属于自己的光芒。',
      '杜野凛世': '放课后 Climax Girls 的大和抚子，举止端庄、心意沉静而炽热的少女。将对制作人的敬慕化作舞台上惊艳众人的表现力，在伙伴的陪伴下不断拓宽自己的世界。',
      '有栖川夏叶': '放课后 Climax Girls 的大小姐，自律严苛、追求卓越的精英主义者。绝不满足于现状，以高标准要求自己并全力托举伙伴，展现了真正的高贵与热忱。',
      '大崎甘奈': 'ALSTROEMERIA 的双胞胎妹妹，流行敏感度极高的元气辣妹。比任何人都珍视姐姐甜花，也曾在「追随姐姐」与「成为独立的自己」之间迷茫，最终绽放出独一无二的花朵。',
      '大崎甜花': 'ALSTROEMERIA 的双胞胎姐姐，怕生爱宅家、内心却极其坚韧的少女。为了不辜负妹妹与千雪的爱，一次次鼓起勇气跨出舒适圈，在舞台上展现出令人动容的成长。',
      '桑山千雪': 'ALSTROEMERIA 的温柔大姐姐，曾是杂货店店员的成熟系偶像。起初把梦想藏在心底，在甘奈、甜花与制作人的推动下终于坦率追梦，守护着组合温暖的港湾。',
      '芹泽朝日': 'Straylight 的中心，拥有惊人天赋与纯粹好奇心的天才少女。只追逐「觉得有趣的事物」，她的直觉与爆发力既是最耀眼的锋芒，也是撼动周围人心的风暴眼。',
      '黛冬优子': 'Straylight 成员，在镜头前是满分可爱的甜美偶像「Fuyu」，私下则是好胜倔强、拼尽全力的努力家。哪怕伤痕累累也绝不认输，为了守住「冬优子」的梦想燃烧自我。',
      '和泉爱依': 'Straylight 的酷飒担当，台上冷艳帅气、台下却是直爽怕生又极其善良的辣妹。在朝日与冬优子的激烈碰撞之间，她用真诚与勇气架起了组合最牢不可破的桥梁。',
      '浅仓透': 'noctchill 的中心，透明感十足、随性而神秘的少女。因记忆里模糊却难忘的「那个人」而踏入 283，与青梅竹马们在夏日的微风与迷茫中，寻找只属于四人的答案。',
      '樋口圆香': 'noctchill 成员，冷静毒舌、对「虚伪」极度敏感的现实主义者。总是对制作人保持距离与审视，却在潜移默化中用最笨拙也最真诚的方式守护着透与伙伴们。',
      '福丸小糸': 'noctchill 成员，努力追赶青梅竹马脚步的认真少女。虽然总是紧张胆怯、觉得自己不如大家，却从未停下拼命练习的脚步，是团队中最令人心疼又敬佩的坚持者。',
      '市川雏菜': 'noctchill 成员，奉行「只要开心就最幸福」的自由灵魂。看似游刃有余、拒绝内耗，实则无比敏锐地洞察着周遭的空气与人情，是组合里最通透的润滑剂。',
      '七草日花': 'SHHis 成员，七草叶月的妹妹。自幼深深憧憬传奇偶像八云奈美，认为自己「只是普通人」却怀揣近乎执念的渴望，在嫉妒、挣扎与蜕变中走上了最残酷也最真实的偶像之路。',
      '绯田美琴': 'SHHis 成员，曾与斑鸠路加组成传奇双人组合的资深唱跳实力派。将人生全部献给舞台与极致表演，与日花在理念碰撞与磨合中重新发现了「一起歌唱」的意义。',
      '斑鸠路加': 'CoMETIK 的中心，曾被称作「神」的孤高独行歌手，亦是八云奈美的女儿。背负着母亲的过去与对美琴、天井社长的复杂执念，在 283 与羽那、春希的相遇中迎来了命运的转折。',
      '铃木羽那': 'CoMETIK 成员，来自冈山、自带天然光芒与强大亲和力的少女。毫无防备的善意与纯粹的偶像天分，像一束不经意照进阴霾的阳光，悄然融化着路加冰封的心墙。',
      '郁田春希': 'CoMETIK 成员，热爱绘画与创作的感性少女。习惯用画笔捕捉光影与他人的情绪，拥有温柔而敏锐的观察力，与路加、羽那共同绘出 CoMETIK 独一无二的深邃色彩。'
    };

    units.forEach((u, uIdx) => {
      const baseAngle = (uIdx / units.length) * Math.PI * 2 - Math.PI * 0.5;
      const ringR = galaxyRadius * (uIdx % 2 === 0 ? 0.88 : 1.16);
      const ucx = Math.cos(baseAngle) * ringR;
      const ucy = Math.sin(baseAngle) * ringR * 0.78;
      u.cx = ucx;
      u.cy = ucy;

      const count = u.members.length;
      const localR = count <= 2 ? 42 : (count === 3 ? 54 : 68);
      const unitNodeIds = [];

      u.members.forEach((member, mIdx) => {
        const a = baseAngle + (mIdx / count) * Math.PI * 2 + 0.35;
        const bx = ucx + Math.cos(a) * localR;
        const by = ucy + Math.sin(a) * localR;
        const stories = storyByIdol.get(member) || [];
        const node = {
          id: member,
          name: member,
          unitIdx: uIdx,
          unitName: u.name,
          color: u.color,
          bio: IDOL_BIOS[member] || '',
          bx, by,
          radius: 17 + Math.min(7, Math.sqrt(stories.length) * 0.45),
          stories,
          phase: Math.random() * Math.PI * 2,
          img: null
        };
        const pRow = pIndex.get(member);
        if (pRow && pRow.path) {
          const im = new Image();
          im.decoding = 'async';
          im.onload = () => { node.img = im; };
          im.src = '/asset-original/' + pRow.path;
        }
        nodes.push(node);
        unitNodeIds.push(node);
      });

      // Intra-unit constellation polygon edges
      for (let i = 0; i < unitNodeIds.length; i++) {
        const a = unitNodeIds[i];
        const b = unitNodeIds[(i + 1) % unitNodeIds.length];
        if (a !== b) edges.push({ a, b, type: 'unit', weight: 2, color: u.color, shared: [] });
      }
    });

    // Canonical Lore Relationship Labels (Official 283 Chart + School/Dorm/Family/Cross-Unit Lore)
    const CANON_RELATIONS = [
      ['八云奈美', '斑鸠路加', '母女（血缘宿命）', '#f43f5e'],
      ['天井努 社长', '八云奈美', '过去担当制作人', '#f59e0b'],
      ['斑鸠路加', '天井努 社长', '宿怨与清算', '#ef4444'],
      ['绯田美琴', '斑鸠路加', '前组合搭档', '#e879f9'],
      ['路加前经纪人', '斑鸠路加', '前担当经纪人', '#94a3b8'],
      ['路加前经纪人', '绯田美琴', '曾任经纪人', '#94a3b8'],
      ['七草叶月', '七草日花', '亲姐妹（姐 / 妹）', '#34d399'],
      ['七草叶月', '天井努 社长', '部下 / 上司', '#fbbf24'],
      ['七草日花', '八云奈美', '憧憬的传奇偶像', '#fb7185'],
      ['七草日花', '绯田美琴', 'SHHis 组合搭档', '#10b981'],
      ['七草父', '七草叶月', '父女', '#a78bfa'],
      ['七草父', '七草日花', '父女', '#a78bfa'],
      ['七草父', '天井努 社长', '昔日同僚制作人', '#c084fc'],
      ['制作人', '天井努 社长', '社长与制作人', '#facc15'],
      ['制作人', '七草叶月', '事务所搭档', '#facc15'],
      ['制作人', '樱木真乃', '公园初遇 · 283起点', '#38bdf8'],
      ['制作人', '斑鸠路加', '移籍接手与陪伴', '#facc15'],
      ['制作人', '七草日花', '担当制作人', '#facc15'],
      ['制作人', '绯田美琴', '担当制作人', '#facc15'],
      ['大崎甘奈', '大崎甜花', '双胞胎姐妹', '#f472b6'],
      ['浅仓透', '樋口圆香', '青梅竹马 · 同校', '#38bdf8'],
      ['浅仓透', '福丸小糸', '青梅竹马 · 同校', '#38bdf8'],
      ['浅仓透', '市川雏菜', '青梅竹马 · 同校', '#38bdf8'],
      ['樋口圆香', '福丸小糸', '青梅竹马 · 同校', '#38bdf8'],
      ['樋口圆香', '市川雏菜', '青梅竹马 · 同校', '#38bdf8'],
      ['月冈恋钟', '白濑咲耶', '283 女子宿舍组', '#c084fc'],
      ['西城树里', '杜野凛世', '283 女子宿舍组', '#fb923c'],
      ['月冈恋钟', '桑山千雪', '283 女子宿舍组', '#f472b6'],
      ['西城树里', '月冈恋钟', '283 女子宿舍组', '#fb923c'],
      ['风野灯织', '杜野凛世', '同校 / 越境好友', '#7dd3fc'],
      ['园田智代子', '三峰结华', '同龄跨组好友', '#7dd3fc'],
      ['芹泽朝日', '黛冬优子', '锋芒碰撞的搭档', '#f43f5e'],
      ['斑鸠路加', '铃木羽那', 'CoMETIK · 破冰之光', '#818cf8'],
      ['斑鸠路加', '郁田春希', 'CoMETIK · 温柔理解', '#818cf8']
    ];
    const relLookup = new Map();
    for (const [n1, n2, label, col] of CANON_RELATIONS) {
      const pk = n1 < n2 ? `${n1}||${n2}` : `${n2}||${n1}`;
      relLookup.set(pk, { label, col });
    }

    // Core Lore Figure & Canonical Relationship Bonds
    const nodeByName = new Map(nodes.map(n => [n.name, n]));
    const corePairSeen = new Set();
    // Attach canonical labels to existing unit edges first
    for (const e of edges) {
      const pk = e.a.name < e.b.name ? `${e.a.name}||${e.b.name}` : `${e.b.name}||${e.a.name}`;
      const info = relLookup.get(pk);
      if (info) {
        e.relLabel = info.label;
        corePairSeen.add(pk);
      }
    }
    // Add all canonical lore edges (including cross-unit dorm/school/past-partner/family bonds)
    for (const [n1, n2, label, col] of CANON_RELATIONS) {
      const a = nodeByName.get(n1);
      const b = nodeByName.get(n2);
      if (!a || !b || a === b) continue;
      const pk = a.name < b.name ? `${a.name}||${b.name}` : `${b.name}||${a.name}`;
      if (corePairSeen.has(pk)) continue;
      corePairSeen.add(pk);
      edges.push({
        a, b,
        type: 'lore',
        weight: 2.2,
        color: col || '#facc15',
        relLabel: label,
        shared: [label]
      });
    }
    for (const n of nodes) {
      if (!n.isCore || !Array.isArray(n._coreBonds)) continue;
      for (const targetName of n._coreBonds) {
        const target = nodeByName.get(targetName);
        if (!target || target === n) continue;
        const pk = n.name < target.name ? `${n.name}||${target.name}` : `${target.name}||${n.name}`;
        if (corePairSeen.has(pk)) continue;
        corePairSeen.add(pk);
        edges.push({
          a: n,
          b: target,
          type: 'lore',
          weight: (n.isCenter || target.isCenter) ? 1.8 : 2.1,
          color: n.isCenter ? '#facc15' : n.color,
          relLabel: n.isCenter ? '283 担当羁绊' : '283 核心羁绊',
          shared: ['283 核心剧情羁绊']
        });
      }
    }

    // Cross-unit shared story bonds (same group / event / crossover)
    const crossPairMap = new Map();
    for (const [grp, idolSet] of idolsByGroup.entries()) {
      const arr = [...idolSet].filter(name => nodeByName.has(name));
      if (arr.length < 2 || arr.length > 10) continue;
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const nA = nodeByName.get(arr[i]);
          const nB = nodeByName.get(arr[j]);
          if (nA.unitIdx === nB.unitIdx) continue;
          const pk = nA.name < nB.name ? `${nA.name}||${nB.name}` : `${nB.name}||${nA.name}`;
          if (!crossPairMap.has(pk)) crossPairMap.set(pk, { a: nA, b: nB, shared: [] });
          crossPairMap.get(pk).shared.push(grp);
        }
      }
    }
    for (const item of crossPairMap.values()) {
      edges.push({
        a: item.a,
        b: item.b,
        type: 'cross',
        weight: Math.min(3, 0.8 + item.shared.length * 0.35),
        color: '#7dd3fc',
        shared: item.shared
      });
    }

    // Merge script-verified appearances (events like 線たちの十二月, guest appearances, lore mentions) into every node!
    const extraMap = cIndex.extra || {};
    for (const n of nodes) {
      const extraKeys = extraMap[n.name] || [];
      if (!extraKeys.length) continue;
      const merged = [];
      const seen = new Set();
      for (const k of extraKeys) {
        const s = catalogByKey.get(k);
        if (s && !seen.has(s.key)) { seen.add(s.key); merged.push(s); }
      }
      for (const s of (n.stories || [])) {
        if (s && !seen.has(s.key)) { seen.add(s.key); merged.push(s); }
      }
      n.stories = merged;
    }

    // Seed flowing energy photon pulses along unit & lore edges
    const pulseCount = isJoyTrans ? 16 : 42;
    for (let i = 0; i < pulseCount; i++) {
      const e = edges[i % edges.length];
      pulses.push({
        edge: e,
        t: Math.random(),
        speed: 0.22 + Math.random() * 0.32,
        dir: Math.random() < 0.5 ? 1 : -1
      });
    }

    buildUnitLegend();
    renderOverviewInspector();
    spawnRipple(0, 0, '#38bdf8', 580);
  }

  function buildUnitLegend() {
    const host = document.getElementById('cnUnitLegend');
    if (!host) return;
    host.innerHTML = '';
    units.forEach((u, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cn-unit-pill';
      btn.style.setProperty('--u-color', u.color);
      btn.innerHTML = `<i></i><span>${u.name}</span>`;
      btn.onclick = () => focusUnit(idx);
      host.append(btn);
    });
  }

  function isRawCodeTitle(title) {
    return /^[a-z]+_[a-z_]+_\d+|^\d{7,}$/i.test(String(title || '').trim());
  }

  function formatStoryTitle(s) {
    const raw = String(s?.title || '').trim();
    if (!raw || isRawCodeTitle(raw)) {
      const grp = String(s?.group || '').trim();
      const map = {
        Morning: '晨间问候对话',
        Audition: '试镜前对话',
        Promise: '约定对话',
        Season: '季节育成对话',
        Other: '日常育成片段'
      };
      const label = map[grp] || (grp ? `${grp} 剧情` : (s?.category || '日常剧情'));
      const num = raw.match(/(\d{2,4})$/)?.[1] || '';
      return `${s?.idol ? s.idol + ' · ' : ''}${label}${num ? ' #' + num.replace(/^0+/, '') : ''}`;
    }
    return raw;
  }

  function isCollabCharacter(s) {
    return /MEMちょ|有馬かな|有馬加奈|露比|ルビー|黒川あかね|黑川茜/i.test(`${s?.idol || ''} ${s?.group || ''} ${s?.title || ''}`);
  }

  function storyPriority(s) {
    if (!s) return 0;
    let sc = 0;
    if (isCollabCharacter(s)) sc -= 300;
    const rawCode = isRawCodeTitle(s.title);
    if (!rawCode) sc += 100;
    if (s.category === '活动剧情' || s.idol === '283活动剧情') sc += 90;
    if (/w\.i\.n\.g|g\.r\.a\.d|感谢祭|l\.p\.|s\.t\.e\.p/i.test(`${s.category || ''} ${s.group || ''} ${s.title || ''}`)) sc += 65;
    if (/^(Morning|Audition|Promise|Other)$/i.test(s.group || '')) sc -= 80;
    if (s.translated) sc += 20;
    return sc;
  }

  function getStoryDate(s) {
    if (!s) return '';
    if (isCollabCharacter(s)) return '2023/07/10';
    if (s.group && dateByGroup.has(s.group)) return dateByGroup.get(s.group);
    if (s.originalGroup && dateByGroup.has(s.originalGroup)) return dateByGroup.get(s.originalGroup);
    if (s.title && dateByTitle.has(s.title)) return dateByTitle.get(s.title);
    if (s.originalTitle && dateByTitle.has(s.originalTitle)) return dateByTitle.get(s.originalTitle);
    const hay = `${s.group || ''} ${s.title || ''} ${s.category || ''}`;
    if (/w\.?i\.?n\.?g/i.test(hay)) return '2018/04/24';
    if (/感谢祭|感謝祭/i.test(hay)) return '2019/04/12';
    if (/g\.?r\.?a\.?d/i.test(hay)) return '2020/05/13';
    if (/landing\s*point/i.test(hay)) return '2021/07/21';
    if (/s\.?t\.?e\.?p/i.test(hay)) return '2022/07/11';
    if (/say.*halo/i.test(hay)) return '2024/12/01';
    const ym = hay.match(/(20[12]\d)/);
    if (ym) return `${ym[1]}/01/01`;
    return '';
  }

  function sortStoryList(list) {
    return [...list].sort((a, b) => {
      // Always sink collab characters (我推的孩子 etc.) to the very bottom
      const colA = isCollabCharacter(a) ? 1 : 0;
      const colB = isCollabCharacter(b) ? 1 : 0;
      if (colA !== colB) return colA - colB;
      // Always sink raw unnamed Morning/Audition micro-dialogues to bottom
      const rawA = isRawCodeTitle(a?.title) ? 1 : 0;
      const rawB = isRawCodeTitle(b?.title) ? 1 : 0;
      if (rawA !== rawB) return rawA - rawB;
      if (storySortMode === 'asc' || storySortMode === 'desc') {
        const da = getStoryDate(a);
        const db = getStoryDate(b);
        if (da && db && da !== db) return storySortMode === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
        if (da && !db) return -1;
        if (!da && db) return 1;
      }
      return storyPriority(b) - storyPriority(a);
    });
  }

  function getEventCover(groupName, story) {
    const ec = cIndex.eventCovers || {};
    const g = groupName || story?.group || story?.originalGroup || '';
    if (g && ec[g]) return ec[g];
    if (story?.key && cardArtMap[story.key]) {
      const a = cardArtMap[story.key];
      return `/asset/images/content/${a.type}/card/${a.id}.jpg`;
    }
    if (story?.art) return '/asset/' + story.art;
    if (story?.idol && idolCoverMap.has(story.idol)) {
      const pool = idolCoverMap.get(story.idol);
      if (Array.isArray(pool) && pool.length) {
        const keyStr = String(story.key || story.title || '');
        let h = 0;
        for (let i = 0; i < keyStr.length; i++) h = ((h * 31) + keyStr.charCodeAt(i)) >>> 0;
        return pool[h % pool.length];
      }
    }
    return '';
  }

  function openStoryInGuide(storyKey) {
    const url = 'guide.html?story=' + encodeURIComponent(storyKey);
    try {
      if (window.parent && window.parent !== window && window.parent.__shinyShell?.navigate) {
        window.parent.__shinyShell.navigate(url);
        return;
      }
    } catch {}
    location.href = url;
  }

  function getWatchedSet() {
    try { return new Set(JSON.parse(localStorage.getItem('shiny.watchedStories') || '[]')); }
    catch { return new Set(); }
  }

  function renderOverviewInspector() {
    const insp = document.getElementById('cnInspector');
    insp?.classList.remove('is-collapsed');
    const avatar = document.getElementById('cnInspAvatar');
    avatar.textContent = '✦';
    document.getElementById('cnInspSub').textContent = '283 PRODUCTION · GALAXY OVERVIEW';
    document.getElementById('cnInspTitle').textContent = '283 全员星系总览';

    const watched = getWatchedSet();
    const totalDone = catalog.filter(s => watched.has(s.key)).length;
    document.getElementById('cnInspStats').innerHTML = `
      <span class="cn-stat-pill">中心：制作人</span>
      <span class="cn-stat-pill">5 位核心剧情人物</span>
      <span class="cn-stat-pill">28 位星辰偶像</span>
      <span class="cn-stat-pill">${catalog.length.toLocaleString()} 篇剧情</span>
      <span class="cn-stat-pill">已观看 ${totalDone} 篇</span>
    `;
    document.getElementById('cnInspBonds').innerHTML = '';
    const storiesHost = document.getElementById('cnInspStories');
    storiesHost.innerHTML = '<p style="font-size:12.5px;color:#94a3b8;line-height:1.7;margin:6px 2px;">星系正中央为<strong>制作人 (283P)</strong>，内环环绕<strong>七草叶月、天井努社长、八云奈美、路加前经纪人、七草父</strong>五大核心人物，外环为 283 全员八大组合。<br><br>本星图基于本地 <strong>10,960 篇真实剧本台词</strong> 自动建立出场与同台索引（如《線たちの十二月》等活动剧情均已精准关联对应人物）。点击任意星辰点亮关系连线，再点右侧人物标签即可筛选两人的真实共同剧情！</p>';
  }

  function findPairStories(nodeA, nodeB, edgeObj) {
    const out = [];
    const seen = new Set();
    const pushStory = (s) => {
      if (!s || seen.has(s.key)) return;
      seen.add(s.key);
      out.push(s);
    };
    // 0. Script-verified real co-occurrence index from 10,960 translations!
    const pk = nodeA.name < nodeB.name ? `${nodeA.name}||${nodeB.name}` : `${nodeB.name}||${nodeA.name}`;
    const idxKeys = (cIndex.pairs && cIndex.pairs[pk]) || [];
    for (const k of idxKeys) pushStory(catalogByKey.get(k));

    // 1. Exact shared group stories (cross-unit / event / crossover)
    const sharedGroups = new Set((edgeObj?.shared || []).filter(g => g && g !== '283 核心剧情羁绊' && g !== edgeObj?.relLabel));
    if (sharedGroups.size) {
      for (const s of catalog) {
        if (sharedGroups.has(s.group) && (s.idol === nodeA.name || s.idol === nodeB.name)) {
          pushStory(s);
        }
      }
    }
    // 2. Same-unit shared group stories (unit events / concert / scenario)
    if (!out.length && nodeA.unitIdx >= 0 && nodeA.unitIdx === nodeB.unitIdx) {
      const grpA = new Set(nodeA.stories.map(s => s.group).filter(Boolean));
      for (const s of nodeB.stories) {
        if (s.group && grpA.has(s.group)) pushStory(s);
      }
      for (const s of nodeA.stories) {
        if (s.group && out.some(x => x.group === s.group)) pushStory(s);
      }
    }
    // 3. Core lore figure <-> Idol/Core figure intersection
    if (!out.length && (nodeA.isCore || nodeB.isCore)) {
      const idolNode = !nodeA.isCore ? nodeA : (!nodeB.isCore ? nodeB : null);
      const coreNode = nodeA.isCore ? nodeA : nodeB;
      if (idolNode) {
        const coreKeys = new Set(coreNode.stories.map(s => s.key));
        for (const s of idolNode.stories) {
          if (coreKeys.has(s.key)) pushStory(s);
        }
        // Fallback: highlight key milestone arcs (W.I.N.G. / G.R.A.D. / L.P. / S.T.E.P.) for that idol
        if (!out.length) {
          for (const s of idolNode.stories) {
            if (/w\.i\.n\.g|g\.r\.a\.d|l\.p|s\.t\.e\.p|感谢祭|活动/i.test(`${s.category} ${s.group} ${s.title}`)) {
              pushStory(s);
              if (out.length >= 24) break;
            }
          }
        }
      } else {
        const keysB = new Set(nodeB.stories.map(s => s.key));
        for (const s of nodeA.stories) {
          if (keysB.has(s.key)) pushStory(s);
        }
      }
    }
    return out;
  }

  function focusNode(node) {
    activeNodeId = node.id;
    activeUnitIdx = node.unitIdx;
    activeMotif = '';
    motifHits.clear();
    document.querySelectorAll('.cn-motif-chip').forEach(c => c.classList.toggle('active', c.dataset.node === node.name));
    document.querySelectorAll('.cn-unit-pill').forEach((p, i) => p.classList.toggle('active', i === node.unitIdx));

    const pos = getNodePos(node);
    cam.tx = pos.x;
    cam.ty = pos.y;
    cam.tzoom = node.isCenter ? 1.15 : 1.5;
    spawnRipple(pos.x, pos.y, node.color, 380);

    const insp = document.getElementById('cnInspector');
    insp?.classList.remove('is-collapsed');

    const avatar = document.getElementById('cnInspAvatar');
    if (node.img) {
      avatar.innerHTML = `<img src="${node.img.src}" alt="${node.name}">`;
    } else {
      avatar.textContent = node.emblem || node.name.slice(0, 1);
    }
    document.getElementById('cnInspSub').textContent = `${node.unitName}`;
    document.getElementById('cnInspTitle').textContent = node.displayName || node.name;

    const watched = getWatchedSet();
    const doneCount = node.stories.filter(s => watched.has(s.key)).length;
    const pct = node.stories.length ? Math.round((doneCount / node.stories.length) * 100) : 0;

    // Connected nodes (core lore + cross-unit + teammates)
    const bonded = [];
    for (const e of edges) {
      if (e.a === node) bonded.push({ other: e.b, count: e.shared.length, type: e.type, edge: e });
      else if (e.b === node) bonded.push({ other: e.a, count: e.shared.length, type: e.type, edge: e });
    }
    bonded.sort((x, y) =>
      (y.other.isCore ? 2 : 0) - (x.other.isCore ? 2 : 0)
      || (y.type === 'cross' ? 1 : 0) - (x.type === 'cross' ? 1 : 0)
      || y.count - x.count
    );

    document.getElementById('cnInspStats').innerHTML = `
      <span class="cn-stat-pill">${node.stories.length} 篇关联剧情</span>
      <span class="cn-stat-pill">已看 ${doneCount} 篇 (${pct}%)</span>
      <span class="cn-stat-pill">${bonded.length} 条人物羁绊</span>
    `;

    const storiesHost = document.getElementById('cnInspStories');
    const renderStoryList = (list, pairTarget = null) => {
      storiesHost.innerHTML = '';
      if (node.bio && !pairTarget) {
        const bioEl = document.createElement('div');
        bioEl.style.cssText = 'font-size:12px;line-height:1.65;color:#cbd5e1;padding:10px 12px;border-radius:12px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.24);margin-bottom:4px;';
        bioEl.textContent = node.bio;
        storiesHost.append(bioEl);
      }
      if (pairTarget) {
        const hdr = document.createElement('div');
        hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;padding:8px 10px;border-radius:10px;background:rgba(244,114,182,0.14);border:1px solid rgba(244,114,182,0.34);font-size:11.5px;color:#fce7f3;margin-bottom:4px;';
        hdr.innerHTML = `<span>🔗 <b>${node.name} × ${pairTarget.name}</b> 关联剧情 (${list.length} 篇)</span>`;
        const acts = document.createElement('span');
        acts.style.cssText = 'display:inline-flex;gap:6px;';
        const btnAll = document.createElement('button');
        btnAll.type = 'button';
        btnAll.className = 'cn-bond-chip';
        btnAll.textContent = '返回全部';
        btnAll.onclick = () => {
          bondsHost.querySelectorAll('.cn-bond-chip').forEach(c => c.classList.remove('active'));
          renderStoryList(node.stories, null);
        };
        const btnGo = document.createElement('button');
        btnGo.type = 'button';
        btnGo.className = 'cn-bond-chip';
        btnGo.textContent = `切换至 ${pairTarget.name} →`;
        btnGo.onclick = () => focusNode(pairTarget);
        acts.append(btnAll, btnGo);
        hdr.append(acts);
        storiesHost.append(hdr);
      }
      if (!list.length) {
        const empty = document.createElement('p');
        empty.style.cssText = 'font-size:12px;color:#94a3b8;padding:10px 4px;';
        empty.textContent = '暂未在本地目录中匹配到直接同名交集剧情，可点右上角切换至对方视角查看。';
        storiesHost.append(empty);
        return;
      }
      // Compact Category Tabs (全部 / 主线活动 / 偶像卡 / 支援卡) + Single Sort Toggle (↑正序 / ↓倒序)
      const sortBar = document.createElement('div');
      sortBar.style.cssText = 'display:flex;align-items:center;gap:4px;margin:2px 0 4px;';
      const catTabs = [
        ['all', '全部'],
        ['main', '主线'],
        ['idol', '偶像卡'],
        ['support', '支援卡']
      ];
      for (const [cKey, cLabel] of catTabs) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cn-bond-chip' + (storyCatFilter === cKey ? ' active' : '');
        b.style.cssText = 'flex:1;height:26px;line-height:24px;text-align:center;padding:0 4px;font-size:11px;';
        b.textContent = cLabel;
        b.onclick = () => {
          storyCatFilter = cKey;
          renderStoryList(list, pairTarget);
        };
        sortBar.append(b);
      }
      const sortToggle = document.createElement('button');
      sortToggle.type = 'button';
      sortToggle.className = 'cn-bond-chip active';
      sortToggle.style.cssText = 'flex:0 0 auto;height:26px;line-height:24px;text-align:center;padding:0 8px;font-size:11px;';
      sortToggle.textContent = storySortMode === 'asc' ? '↑正序' : '↓倒序';
      sortToggle.title = '点击切换按时间正序 / 倒序排列';
      sortToggle.onclick = () => {
        storySortMode = storySortMode === 'asc' ? 'desc' : 'asc';
        renderStoryList(list, pairTarget);
      };
      sortBar.append(sortToggle);
      storiesHost.append(sortBar);

      const matchesCat = (s) => {
        if (storyCatFilter === 'all') return true;
        const cat = String(s.category || '');
        const grp = String(s.group || '');
        const art = cardArtMap[s.key];
        if (storyCatFilter === 'main') {
          return cat === '活动剧情' || s.idol === '283活动剧情' || /w\.?i\.?n\.?g|g\.?r\.?a\.?d|感谢祭|感謝祭|landing\s*point|s\.?t\.?e\.?p/i.test(`${cat} ${grp} ${s.title || ''}`);
        }
        if (storyCatFilter === 'support') {
          return cat.includes('支援') || art?.type === 'support_idols' || String(s.key || '').includes('support');
        }
        if (storyCatFilter === 'idol') {
          return art?.type === 'idols' || (cat.includes('偶像') && !/w\.?i\.?n\.?g|g\.?r\.?a\.?d|感谢祭|感謝祭|landing\s*point|s\.?t\.?e\.?p/i.test(grp) && !isRawCodeTitle(s.title));
        }
        return true;
      };

      const filteredList = list.filter(matchesCat);
      const sorted = sortStoryList(filteredList);
      if (!sorted.length) {
        const em = document.createElement('p');
        em.style.cssText = 'font-size:12px;color:#94a3b8;padding:12px 4px;';
        em.textContent = '当前分类下暂无匹配剧情，可切换「全部」查看。';
        storiesHost.append(em);
      }
      sorted.slice(0, 60).forEach(s => {
        const a = document.createElement('a');
        a.className = 'cn-story-item';
        a.href = 'guide.html?story=' + encodeURIComponent(s.key);
        const niceTitle = formatStoryTitle(s);
        const grpLabel = s.group === 'Morning' ? '晨间日常' : (s.group || '');
        const dt = getStoryDate(s);
        const cov = getEventCover(s.group, s);
        const covHtml = cov ? `<div class="cn-story-cover"><img src="${cov}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>` : '';
        const snip = storySnippets[s.key] || '';
        const snipHtml = snip ? `<div style="font-size:11.5px;color:#cbd5e1;line-height:1.45;margin-top:2px;">${snip}</div>` : '';
        a.innerHTML = `${covHtml}<strong>${watched.has(s.key) ? '✓ ' : ''}${niceTitle}</strong><small>${dt ? dt + ' · ' : ''}${s.idol || ''} · ${s.category || ''}${grpLabel ? ' · ' + grpLabel : ''}</small>${snipHtml}`;
        a.onclick = (e) => { e.preventDefault(); openStoryInGuide(s.key); };
        storiesHost.append(a);
      });
    };

    const bondsHost = document.getElementById('cnInspBonds');
    bondsHost.innerHTML = '';
    if (bonded.length) {
      const cap = document.createElement('div');
      cap.style.cssText = 'grid-column:1/-1;font-size:11px;color:#7dd3fc;font-weight:700;margin-bottom:1px;';
      cap.textContent = '🔗 人物羁绊（点击筛选两人共同剧情）：';
      bondsHost.append(cap);
    }
    bonded.slice(0, 14).forEach(b => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cn-bond-chip';
      const rel = b.edge?.relLabel;
      if (rel) {
        chip.textContent = `★ ${b.other.name}·${rel.replace(/（.*?）/g, '')}`;
      } else if (b.type === 'cross') {
        chip.textContent = `🔗 ${b.other.name} (${b.count})`;
      } else {
        chip.textContent = `👥 ${b.other.name}·同组`;
      }
      chip.title = `点击查看 ${node.name} 与 ${b.other.name} 的关联剧情`;
      chip.onclick = () => {
        bondsHost.querySelectorAll('.cn-bond-chip').forEach(c => c.classList.toggle('active', c === chip));
        const pairList = findPairStories(node, b.other, b.edge);
        renderStoryList(pairList, b.other);
      };
      bondsHost.append(chip);
    });

    renderStoryList(node.stories, null);
  }

  function focusUnit(uIdx) {
    activeNodeId = null;
    activeUnitIdx = uIdx;
    activeMotif = '';
    motifHits.clear();
    document.querySelectorAll('.cn-motif-chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.cn-unit-pill').forEach((p, i) => p.classList.toggle('active', i === uIdx));

    const u = units[uIdx];
    if (!u) return;
    const cos = Math.cos(orbitAngle), sin = Math.sin(orbitAngle);
    const rx = u.cx * cos - u.cy * sin;
    const ry = u.cx * sin + u.cy * cos;
    cam.tx = rx;
    cam.ty = ry;
    cam.tzoom = 1.4;
    spawnRipple(rx, ry, u.color, 420);

    const unitNodes = nodes.filter(n => n.unitIdx === uIdx);
    const insp = document.getElementById('cnInspector');
    insp?.classList.remove('is-collapsed');
    document.getElementById('cnInspAvatar').textContent = u.icon || '✦';
    document.getElementById('cnInspSub').textContent = 'UNIT CONSTELLATION';
    document.getElementById('cnInspTitle').textContent = u.name;
    const allStories = unitNodes.flatMap(n => n.stories);
    document.getElementById('cnInspStats').innerHTML = `
      <span class="cn-stat-pill">${unitNodes.length} 位成员</span>
      <span class="cn-stat-pill">${allStories.length} 篇剧情</span>
    `;
    const bondsHost = document.getElementById('cnInspBonds');
    bondsHost.innerHTML = '';
    unitNodes.forEach(n => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'cn-bond-chip';
      chip.textContent = `✦ ${n.name}`;
      chip.onclick = () => focusNode(n);
      bondsHost.append(chip);
    });
    const storiesHost = document.getElementById('cnInspStories');
    storiesHost.innerHTML = '';
    sortStoryList(allStories).slice(0, 45).forEach(s => {
      const a = document.createElement('a');
      a.className = 'cn-story-item';
      a.href = 'guide.html?story=' + encodeURIComponent(s.key);
      const cov = getEventCover(s.group, s);
      const covHtml = cov ? `<div class="cn-story-cover"><img src="${cov}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>` : '';
      const dt = getStoryDate(s);
      const snip = storySnippets[s.key] || '';
      const snipHtml = snip ? `<div style="font-size:11.5px;color:#cbd5e1;line-height:1.45;margin-top:2px;">${snip}</div>` : '';
      a.innerHTML = `${covHtml}<strong>${formatStoryTitle(s)}</strong><small>${dt ? dt + ' · ' : ''}${s.idol || ''} · ${s.group === 'Morning' ? '晨间日常' : (s.group || '')}</small>${snipHtml}`;
      a.onclick = (e) => { e.preventDefault(); openStoryInGuide(s.key); };
      storiesHost.append(a);
    });
  }

  function igniteMotif(keyword) {
    const q = String(keyword || '').trim().toLowerCase();
    if (!q) { resetView(); return; }
    activeMotif = q;
    activeNodeId = null;
    activeUnitIdx = -1;
    motifHits.clear();

    // Smart regex matchers for canonical 283 story arcs (handles JP/CN/abbreviations in catalog.json)
    const ARC_REGEX = {
      'w.i.n.g.': /w\.?i\.?n\.?g/i,
      'g.r.a.d.': /g\.?r\.?a\.?d/i,
      '感谢祭': /感谢祭|感謝祭|thanksgiving/i,
      'l.p.': /landing\s*point|\bl\.?p\.?\b/i,
      's.t.e.p.': /s\.?t\.?e\.?p/i,
      '越境': /283活动剧情|線たちの十二月|明るい部屋|アジェンダ|アイムベリーベリーソーリー|ロング・ログ|ひろげよう|オペレーション・サンタ|越境/i,
      '周年': /周年|anniversary|anniv|セヴン＃ス/i
    };
    const re = ARC_REGEX[q] || null;

    const matchedStories = [];
    for (const s of catalog) {
      const hay = `${s.title || ''} ${s.group || ''} ${s.category || ''} ${s.idol || ''} ${s.description || ''}`;
      if (re ? re.test(hay) : hay.toLowerCase().includes(q)) {
        matchedStories.push(s);
        if (s.idol) {
          if (!motifHits.has(s.idol)) motifHits.set(s.idol, []);
          motifHits.get(s.idol).push(s);
        }
      }
    }
    // Producer (283P) is the first-person protagonist of all 283 stories — always resonate at center!
    if (matchedStories.length > 0) {
      motifHits.set('制作人', matchedStories);
    }

    cam.tx = 0; cam.ty = 0; cam.tzoom = 0.96;
    spawnRipple(0, 0, '#f472b6', 760);
    spawnRipple(0, 0, '#38bdf8', 540);

    document.querySelectorAll('.cn-motif-chip').forEach(c => c.classList.toggle('active', c.dataset.motif === keyword));
    document.querySelectorAll('.cn-unit-pill').forEach(p => p.classList.remove('active'));

    const insp = document.getElementById('cnInspector');
    insp?.classList.remove('is-collapsed');
    document.getElementById('cnInspAvatar').textContent = '★';
    document.getElementById('cnInspSub').textContent = 'FORESHADOWING RESONANCE';
    document.getElementById('cnInspTitle').textContent = `伏笔意象「${keyword}」`;
    document.getElementById('cnInspStats').innerHTML = `
      <span class="cn-stat-pill">共鸣偶像 ${motifHits.size} 位</span>
      <span class="cn-stat-pill">关联剧情 ${matchedStories.length} 篇</span>
    `;

    const bondsHost = document.getElementById('cnInspBonds');
    bondsHost.innerHTML = '';
    const nodeByName = new Map(nodes.map(n => [n.name, n]));
    [...motifHits.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 12)
      .forEach(([idol, list]) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'cn-bond-chip';
        chip.textContent = `${idol} (${list.length})`;
        chip.onclick = () => { const n = nodeByName.get(idol); if (n) focusNode(n); };
        bondsHost.append(chip);
      });

    const storiesHost = document.getElementById('cnInspStories');
    storiesHost.innerHTML = '';
    const watched = getWatchedSet();
    sortStoryList(matchedStories).slice(0, 60).forEach(s => {
      const a = document.createElement('a');
      a.className = 'cn-story-item';
      a.href = 'guide.html?story=' + encodeURIComponent(s.key);
      const cov = getEventCover(s.group, s);
      const covHtml = cov ? `<div class="cn-story-cover"><img src="${cov}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>` : '';
      const dt = getStoryDate(s);
      const snip = storySnippets[s.key] || '';
      const snipHtml = snip ? `<div style="font-size:11.5px;color:#cbd5e1;line-height:1.45;margin-top:2px;">${snip}</div>` : '';
      a.innerHTML = `${covHtml}<strong>${watched.has(s.key) ? '✓ ' : ''}${formatStoryTitle(s)}</strong><small>${dt ? dt + ' · ' : ''}${s.idol || ''} · ${s.category || ''} · ${s.group || ''}</small>${snipHtml}`;
      a.onclick = (e) => { e.preventDefault(); openStoryInGuide(s.key); };
      storiesHost.append(a);
    });
  }

  function resetView() {
    activeNodeId = null;
    activeUnitIdx = -1;
    activeMotif = '';
    motifHits.clear();
    cam.tx = 0; cam.ty = 0; cam.tzoom = 1;
    document.querySelectorAll('.cn-motif-chip, .cn-unit-pill').forEach(el => el.classList.remove('active'));
    renderOverviewInspector();
    spawnRipple(0, 0, '#38bdf8', 500);
  }

  // Bind HUD controls
  document.getElementById('cnResetView')?.addEventListener('click', resetView);
  document.getElementById('cnInspClose')?.addEventListener('click', () => {
    document.getElementById('cnInspector')?.classList.add('is-collapsed');
  });
  document.getElementById('cnAutoOrbit')?.addEventListener('click', (e) => {
    autoOrbit = !autoOrbit;
    e.currentTarget.classList.toggle('active', autoOrbit);
    e.currentTarget.textContent = autoOrbit ? '✦ 星系公转：开' : '✦ 星系公转：关';
  });
  // Community-Consensus Spoiler-Safe Reading Roadmaps (verified against real local catalog.json groups!)
  const ROADMAPS = [
    {
      title: '🔥 283 核心主线与伏笔路线（SHHis × 斑鸠路加 × 八云奈美 × 天井努）',
      note: '强烈建议严格按以下实装顺序阅读，避免提前剧透八云奈美与斑鸠路加的身世真相：',
      steps: [
        { label: '① 七草日花 W.I.N.G.', find: s => s.idol === '七草日花' && /w\.i\.n\.g/i.test(`${s.category} ${s.group} ${s.title}`), desc: '初次接触「八云奈美」之名与日花的执念起点' },
        { label: '② 绯田美琴 W.I.N.G.', find: s => s.idol === '绯田美琴' && /w\.i\.n\.g/i.test(`${s.category} ${s.group} ${s.title}`), desc: '了解美琴对舞台的极致追求与过去搭档伏笔' },
        { label: '③ OO-ct. ──ノー・カラット', group: 'OO-ct.　──ノー・カラット', desc: 'SHHis 首部活动剧情，斑鸠路加作为对立者初登场' },
        { label: '④ 明るい部屋', group: '明るい部屋', desc: '283 大型年末越境，确立事务所全员温度与氛围基调' },
        { label: '⑤ モノラル・ダイアローグス', group: 'モノラル・ダイアローグス', desc: 'SHHis 二人理念碰撞与关系深化的重要篇章' },
        { label: '⑥ 線たちの十二月', group: '線たちの十二月', desc: '2022 圣诞大型越境，斑鸠路加关键独白与心理转折' },
        { label: '⑦ セヴン＃ス', group: 'セヴン＃ス', desc: '核心解密篇：天井努社长与八云奈美的尘封过往浮现' },
        { label: '⑧ ジ・エピソード', group: 'ジ・エピソード', desc: '重大历史节点：斑鸠路加正式移籍 283 事务所' },
        { label: '⑨ THE（CoMETIK）EPISODE', group: 'THE（CoMETIK）EPISODE', desc: '路加、羽那、春希结成 CoMETIK，开启全新救赎线' },
        { label: '⑩ 冬が灯る先', group: '冬が灯る先', desc: 'CoMETIK 后续深化与跨越寒冬的羁绊' }
      ]
    },
    {
      title: '✦ 各组合公认入坑必看神回（按推荐先后顺序）',
      note: '每个组合先读对应偶像的 W.I.N.G. 篇，再按以下经典活动顺序阅读体验最佳：',
      steps: [
        { label: 'illumination STARS · Light up the illumination', group: 'Light up the illumination', desc: '初代御三家结成原点，感受 283 最纯粹的星光' },
        { label: 'illumination STARS · Catch the shiny tail', group: 'Catch the shiny tail', desc: '三人关系最细腻动人的代表作之一' },
        { label: 'L\'Antica · アイムベリーベリーソーリー', group: 'アイムベリーベリーソーリー', desc: '283 必看大型越境名篇，群像张力拉满' },
        { label: '放课后 · 階段の先の君へ', group: '階段の先の君へ', desc: '放课后 Climax Girls 笑中带泪的成长神回' },
        { label: 'ALSTROEMERIA · 薄桃色にこんがらがって', group: '薄桃色にこんがらがって', desc: '全作公认屈指可数的杰作，细腻刻画双子与千雪的真实抉择' },
        { label: 'Straylight · Straylight.run()', group: 'Straylight.run()', desc: '迷光结成篇：朝日、冬优子、爱依火花四溅的巅峰开局' },
        { label: 'Straylight · WorldEndBreakDown', group: 'WorldEndBreakDown', desc: '迷光核心冲突与高燃羁绊名篇' },
        { label: 'noctchill · 天塵', group: '天塵', desc: '先看浅仓透 W.I.N.G. 再看本篇！震撼全社区的青梅竹马名作' },
        { label: 'noctchill · 海へ出るつもりじゃなかったし', group: '海へ出るつもりじゃなかったし', desc: '天尘之后必看，四人透明而真挚的青春物语' },
        { label: '全员大型越境 · アジェンダ２８３', group: 'アジェンダ２８３', desc: '283 全员齐聚的经典群像活动' }
      ]
    }
  ];

  function openRoadmapInspector() {
    activeNodeId = null;
    activeUnitIdx = -1;
    activeMotif = '';
    motifHits.clear();
    cam.tx = 0; cam.ty = 0; cam.tzoom = 0.96;
    spawnRipple(0, 0, '#facc15', 700);
    document.querySelectorAll('.cn-motif-chip').forEach(c => c.classList.toggle('active', c.dataset.route === 'roadmap'));
    document.querySelectorAll('.cn-unit-pill').forEach(p => p.classList.remove('active'));

    const insp = document.getElementById('cnInspector');
    insp?.classList.remove('is-collapsed');
    document.getElementById('cnInspAvatar').textContent = '📖';
    document.getElementById('cnInspSub').textContent = '283 SPOILER-SAFE READING ROADMAP';
    document.getElementById('cnInspTitle').textContent = '283 防剧透剧情推荐路线';
    const watched = getWatchedSet();
    document.getElementById('cnInspStats').innerHTML = `
      <span class="cn-stat-pill">社区公认防剧透顺序</span>
      <span class="cn-stat-pill">本地剧本直达</span>
    `;
    document.getElementById('cnInspBonds').innerHTML = '';
    const storiesHost = document.getElementById('cnInspStories');
    storiesHost.innerHTML = '';

    for (const sec of ROADMAPS) {
      const h = document.createElement('div');
      h.style.cssText = 'font-size:12.5px;font-weight:800;color:#fde047;margin:8px 2px 3px;';
      h.textContent = sec.title;
      const p = document.createElement('p');
      p.style.cssText = 'font-size:11.5px;color:#94a3b8;margin:0 2px 6px;line-height:1.5;';
      p.textContent = sec.note;
      storiesHost.append(h, p);

      for (const st of sec.steps) {
        const hit = st.group
          ? catalog.find(s => s.group === st.group) || catalog.find(s => (s.group || '').includes(st.group))
          : catalog.find(st.find);
        const a = document.createElement('a');
        a.className = 'cn-story-item';
        const cov = getEventCover(st.group, hit);
        const covHtml = cov ? `<div class="cn-story-cover"><img src="${cov}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>` : '';
        if (hit) {
          a.href = 'guide.html?story=' + encodeURIComponent(hit.key);
          a.innerHTML = `${covHtml}<strong>${watched.has(hit.key) ? '✓ ' : ''}${st.label}</strong><small>${st.desc}</small>`;
          a.onclick = (e) => { e.preventDefault(); openStoryInGuide(hit.key); };
        } else {
          a.href = 'guide.html?q=' + encodeURIComponent(st.group || st.label);
          a.innerHTML = `${covHtml}<strong>${st.label}</strong><small>${st.desc}</small>`;
        }
        storiesHost.append(a);
      }
    }
  }

  // Community Hall of Fame Ranking (Cross-checked across NGA / B站 / 知乎 / 日区玩家票选 & local catalog.json)
  const HALL_OF_FAME = [
    { rank: 'TOP 1', title: '《天塵》', unit: 'noctchill', group: '天塵', tag: '青春反叛封神作', note: 'NGA / B站 / 日区票选常年榜首。建议先看浅仓透 W.I.N.G. 再读，震撼直击灵魂。' },
    { rank: 'TOP 2', title: '《薄桃色にこんがらがって》', unit: 'ALSTROEMERIA', group: '薄桃色にこんがらがって', tag: '心理描写天花板', note: '打破甜美组合刻板印象的惊艳神回，将双子与千雪的依赖与独立写到极致。' },
    { rank: 'TOP 3', title: '《YOUR／MY Love letter》', unit: 'ALSTROEMERIA', group: 'YOUR MY Love letter', tag: '破防催泪神回', note: '从昏暗房间里注视屏幕的观众视角切入，写透「偶像之光如何照亮素未谋面的普通人」，B站与日区口碑炸裂。' },
    { rank: 'TOP 4', title: '《明るい部屋》', unit: '283 全员越境', group: '明るい部屋', tag: '全员群像巅峰', note: '围绕事务所旧房间的圣诞群像神作，温暖、余韵与前辈追思完美交融，萌新零门槛推荐。' },
    { rank: 'TOP 5', title: '《Straylight.run()》', unit: 'Straylight', group: 'Straylight.run()', tag: '高燃结成原点', note: '朝日、冬优子、爱依三人理念激烈碰撞的巅峰开局，读完立刻爱上迷光。' },
    { rank: 'TOP 6', title: '《セヴン＃ス》', unit: '283 核心主线', group: 'セヴン＃ス', tag: '⚠ 防剧透主线神回', note: '揭开天井社长与八云奈美过往的重磅篇章。建议先读 SHHis 前期与《線たちの十二月》。' },
    { rank: 'TOP 7', title: '《海へ出るつもりじゃなかったし》', unit: 'noctchill', group: '海へ出るつもりじゃなかったし', tag: '透明系青春神回', note: '《天塵》之后必读续章，把青梅竹马间说不出口的空气感刻画得淋漓尽致。' },
    { rank: 'TOP 8', title: '《線たちの十二月》', unit: '283 圣诞越境', group: '線たちの十二月', tag: '路加转折名篇', note: '2022 圣诞越境高分作，包含斑鸠路加极具冲击力的雪夜独白与关键心理转折。' },
    { rank: 'TOP 9', title: '《くもりガラスの銀曜日》', unit: 'illumination STARS', group: 'くもりガラスの銀曜日', tag: '静谧文学神作', note: '日区口碑极高的静谧名篇，没有狗血冲突却拥有令人久久回味的温柔余韵。' },
    { rank: 'TOP 10', title: '《OO-ct. ──ノー・カラット》', unit: 'SHHis', group: 'OO-ct.　──ノー・カラット', tag: '现实向震撼开篇', note: 'SHHis 首部活动剧情，直面偶像界残酷现实与日花、美琴、路加的命运交汇。' },
    { rank: 'TOP 11', title: '《階段の先の君へ》', unit: '放课后 Climax Girls', group: '階段の先の君へ', tag: '笑中带泪成长回', note: '放课后五人青春与成长的必看代表作，热血又催泪，极适合作为入坑作。' },
    { rank: 'TOP 12', title: '《アイムベリーベリーソーリー》', unit: '283 大型越境', group: 'アイムベリーベリーソーリー', tag: '高分群像越境', note: '极具 283 特色的越境名篇，人物群像与幽默温情兼具，老玩家强烈推荐。' },
    { rank: 'TOP 13', title: '《アンカーボルトソング》', unit: 'ALSTROEMERIA', group: 'アンカーボルトソング', tag: '温柔治愈神回', note: '社区呼声极高的温暖名篇，细腻诠释陪伴与前行的力量。' },
    { rank: 'TOP 14', title: '《THE（CoMETIK）EPISODE》', unit: 'CoMETIK', group: 'THE（CoMETIK）EPISODE', tag: '⚠ 新组高能结成', note: '建议先读《ジ・エピソード》再看。路加、羽那、春希三人擦出意想不到的救赎火花。' },
    { rank: 'TOP 15', title: '《冬が灯る先》', unit: 'CoMETIK / SHHis', group: '冬が灯る先', tag: '近年票选前列', note: '近年社区人气极高的冬季名篇，细腻描绘跨越伤痛与寒冬后的全新光芒。' }
  ];

  function openHallOfFameInspector() {
    activeNodeId = null;
    activeUnitIdx = -1;
    activeMotif = '';
    motifHits.clear();
    cam.tx = 0; cam.ty = 0; cam.tzoom = 0.96;
    spawnRipple(0, 0, '#f472b6', 720);
    document.querySelectorAll('.cn-motif-chip').forEach(c => c.classList.toggle('active', c.dataset.route === 'halloffame'));
    document.querySelectorAll('.cn-unit-pill').forEach(p => p.classList.remove('active'));

    const insp = document.getElementById('cnInspector');
    insp?.classList.remove('is-collapsed');
    document.getElementById('cnInspAvatar').textContent = '🏆';
    document.getElementById('cnInspSub').textContent = 'COMMUNITY HALL OF FAME';
    document.getElementById('cnInspTitle').textContent = '283 社区公认神回好评榜';
    const watched = getWatchedSet();
    document.getElementById('cnInspStats').innerHTML = `
      <span class="cn-stat-pill">综合 NGA / B站 / 日区口碑</span>
      <span class="cn-stat-pill">15 部必看神回</span>
    `;
    document.getElementById('cnInspBonds').innerHTML = '';
    const storiesHost = document.getElementById('cnInspStories');
    storiesHost.innerHTML = '<p style="font-size:11.5px;color:#94a3b8;margin:2px 2px 6px;line-height:1.55;">综合中日玩家社区高赞口碑整理，标有「⚠」的主线神回建议按前置顺序观看以防剧透，点击直接进入第一话播放：</p>';

    for (const item of HALL_OF_FAME) {
      const hit = catalog.find(s => s.group === item.group) || catalog.find(s => (s.group || '').includes(item.group));
      const a = document.createElement('a');
      a.className = 'cn-story-item';
      const dt = hit ? getStoryDate(hit) : '';
      const cov = getEventCover(item.group, hit);
      const covHtml = cov ? `<div class="cn-story-cover"><img src="${cov}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>` : '';
      const head = `<span style="color:#facc15;font-weight:800;margin-right:6px;">${item.rank}</span>${hit && watched.has(hit.key) ? '✓ ' : ''}${item.title}`;
      const sub = `${item.unit} · ${item.tag}${dt ? ' · ' + dt : ''}<br><span style="color:#cbd5e1;">${item.note}</span>`;
      a.innerHTML = `${covHtml}<strong>${head}</strong><small style="line-height:1.45;">${sub}</small>`;
      if (hit) {
        a.href = 'guide.html?story=' + encodeURIComponent(hit.key);
        a.onclick = (e) => { e.preventDefault(); openStoryInGuide(hit.key); };
      } else {
        a.href = 'guide.html?q=' + encodeURIComponent(item.group);
      }
      storiesHost.append(a);
    }
  }

  document.querySelectorAll('.cn-motif-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.route === 'halloffame') {
        openHallOfFameInspector();
        return;
      }
      if (btn.dataset.route === 'roadmap') {
        openRoadmapInspector();
        return;
      }
      const targetNodeName = btn.dataset.node;
      if (targetNodeName) {
        const hit = nodes.find(n => n.id === targetNodeName || n.name === targetNodeName);
        if (hit) {
          document.querySelectorAll('.cn-motif-chip').forEach(c => c.classList.toggle('active', c === btn));
          focusNode(hit);
          return;
        }
      }
      const m = btn.dataset.motif;
      if (m) {
        document.getElementById('cnKeywordInput').value = m;
        igniteMotif(m);
      }
    });
  });
  const doSearch = () => {
    const q = String(document.getElementById('cnKeywordInput')?.value || '').trim();
    const direct = nodes.find(n => n.name === q || n.id === q || (q.length >= 2 && n.name.includes(q)));
    if (direct && direct.isCore) { focusNode(direct); return; }
    igniteMotif(q);
  };
  document.getElementById('cnSearchBtn')?.addEventListener('click', doSearch);
  document.getElementById('cnKeywordInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
  document.getElementById('cnBackBtn')?.addEventListener('click', (e) => {
    try {
      if (window.parent && window.parent !== window && window.parent.__shinyShell?.navigate) {
        e.preventDefault();
        window.parent.__shinyShell.navigate('guide.html');
      }
    } catch {}
  });

  // Pointer Pan / Zoom / Hit-Test
  let dragging = false, dragMoved = false, lastX = 0, lastY = 0;

  function hitTest(sx, sy) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const p = getNodePos(n);
      const sp = worldToScreen(p.x, p.y);
      const hitR = (n.radius + 7) * cam.zoom;
      const dx = sx - sp.x, dy = sy - sp.y;
      if (dx * dx + dy * dy <= hitR * hitR) return n;
    }
    return null;
  }

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragMoved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.classList.add('is-dragging');
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });

  canvas.addEventListener('pointermove', (e) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
      cam.tx -= dx / cam.zoom;
      cam.ty -= dy / cam.zoom;
      cam.x = cam.tx;
      cam.y = cam.ty;
      return;
    }
    const h = hitTest(e.clientX, e.clientY);
    hoveredNode = h;
    canvas.classList.toggle('is-hovering', !!h);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('is-dragging');
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    if (!dragMoved) {
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) focusNode(hit);
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    cam.tzoom = Math.max(0.45, Math.min(2.6, cam.tzoom * factor));
  }, { passive: false });

  // Main 60/120fps Render Loop
  let lastTime = performance.now();
  let meteorTimer = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { lastTime = now; return; }
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    // Smooth camera spring lerp
    cam.x += (cam.tx - cam.x) * 0.1;
    cam.y += (cam.ty - cam.y) * 0.1;
    cam.zoom += (cam.tzoom - cam.zoom) * 0.1;

    if (autoOrbit && !activeNodeId && activeUnitIdx < 0) {
      orbitAngle += dt * 0.045;
    }

    meteorTimer += dt;
    if (meteorTimer > 3.2) {
      meteorTimer = 0;
      if (Math.random() < 0.65) spawnMeteor();
    }

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;

    // 1. Deep Nebula Background (strictly opaque to prevent any motion ghosting/trails)
    const bg = ctx.createRadialGradient(W * 0.45, H * 0.5, 40, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
    bg.addColorStop(0, '#0e172f');
    bg.addColorStop(0.55, '#070b18');
    bg.addColorStop(1, '#02040a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 2. Parallax Twinkling Starfield
    for (const s of bgStars) {
      const sx = ((s.x - cam.x * s.depth) * (0.65 + cam.zoom * 0.35) + W * 0.5);
      const sy = ((s.y - cam.y * s.depth) * (0.65 + cam.zoom * 0.35) + H * 0.5);
      if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) continue;
      const tw = 0.45 + 0.55 * Math.sin(now * 0.001 * s.speed + s.phase);
      ctx.fillStyle = `hsla(${s.hue}, 85%, 86%, ${(tw * 0.72).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Shooting Meteors
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt * 0.9;
      if (m.life <= 0) { meteors.splice(i, 1); continue; }
      const mag = Math.hypot(m.vx, m.vy) || 1;
      const tx = m.x - (m.vx / mag) * m.len;
      const ty = m.y - (m.vy / mag) * m.len;
      const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
      grad.addColorStop(0, `rgba(255,255,255,${m.life.toFixed(2)})`);
      grad.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    // 4. Supernova Shockwave Ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.r += dt * 480;
      rp.alpha *= Math.pow(0.08, dt);
      if (rp.r >= rp.maxR || rp.alpha < 0.02) { ripples.splice(i, 1); continue; }
      const sp = worldToScreen(rp.x, rp.y);
      ctx.save();
      ctx.strokeStyle = rp.color;
      ctx.globalAlpha = rp.alpha;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, rp.r * cam.zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Unit Nebula Halos
    const cos = Math.cos(orbitAngle), sin = Math.sin(orbitAngle);
    for (const u of units) {
      const ux = u.cx * cos - u.cy * sin;
      const uy = u.cx * sin + u.cy * cos;
      const sp = worldToScreen(ux, uy);
      const rad = 115 * cam.zoom;
      const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, rad);
      const boost = (activeUnitIdx === u.idx) ? 0.24 : 0.1;
      g.addColorStop(0, u.color + Math.round(boost * 255).toString(16).padStart(2, '0'));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Constellation Bond Edges
    for (const e of edges) {
      const isFocusedEdge = activeNodeId
        ? (e.a.id === activeNodeId || e.b.id === activeNodeId)
        : (activeMotif
          ? ((e.a.isCenter || e.b.isCenter) && motifHits.has(e.a.name) && motifHits.has(e.b.name))
          : (activeUnitIdx >= 0 ? (e.a.unitIdx === activeUnitIdx && e.b.unitIdx === activeUnitIdx) : (e.type === 'unit')));

      if (e.type === 'cross' && !isFocusedEdge) continue;

      const pa = worldToScreen(getNodePos(e.a).x, getNodePos(e.a).y);
      const pb = worldToScreen(getNodePos(e.b).x, getNodePos(e.b).y);
      ctx.save();
      ctx.strokeStyle = isFocusedEdge ? (e.type === 'cross' ? '#7dd3fc' : e.color) : 'rgba(148,163,184,0.16)';
      ctx.globalAlpha = isFocusedEdge ? (e.type === 'cross' ? 0.72 : 0.65) : 0.22;
      ctx.lineWidth = (isFocusedEdge ? 2.1 : 1.1) * Math.min(1.4, cam.zoom);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();

      // Draw canonical relationship or shared-event label pill right on focused beams!
      const beamLabel = e.relLabel || (e.type === 'cross' && e.shared?.length ? (e.shared.length > 1 ? `共${e.shared.length}组·${String(e.shared[0]).slice(0, 8)}` : String(e.shared[0]).slice(0, 10)) : '');
      if (activeNodeId && isFocusedEdge && beamLabel && cam.zoom >= 0.85) {
        const mx = (pa.x + pb.x) * 0.5;
        const my = (pa.y + pb.y) * 0.5;
        ctx.globalAlpha = 0.92;
        ctx.font = '700 10.5px "Segoe UI", "Microsoft YaHei", sans-serif';
        const tw = ctx.measureText(beamLabel).width + 12;
        ctx.fillStyle = 'rgba(8, 13, 26, 0.86)';
        ctx.strokeStyle = e.type === 'cross' ? '#38bdf8' : (e.color || '#facc15');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(mx - tw * 0.5, my - 9, tw, 18, 9);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(beamLabel, mx, my + 0.5);
      }
      ctx.restore();
    }

    // 7. Flowing Photon Energy Pulses along Active Edges
    for (const p of pulses) {
      p.t += dt * p.speed * p.dir;
      if (p.t > 1) p.t = 0;
      if (p.t < 0) p.t = 1;
      const e = p.edge;
      const show = activeNodeId
        ? (e.a.id === activeNodeId || e.b.id === activeNodeId)
        : (e.type === 'unit');
      if (!show) continue;
      const wa = getNodePos(e.a), wb = getNodePos(e.b);
      const wx = wa.x + (wb.x - wa.x) * p.t;
      const wy = wa.y + (wb.y - wa.y) * p.t;
      const sp = worldToScreen(wx, wy);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = e.color;
      ctx.shadowBlur = isJoyTrans ? 0 : 12;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2.6 * Math.min(1.5, cam.zoom), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. 28 Idol Star Nodes (Portrait + Plasma Corona + Label)
    for (const n of nodes) {
      const wp = getNodePos(n);
      const sp = worldToScreen(wp.x, wp.y);
      const r = n.radius * cam.zoom;
      if (sp.x < -r * 2 || sp.x > W + r * 2 || sp.y < -r * 2 || sp.y > H + r * 2) continue;

      const isSelected = activeNodeId === n.id;
      const isMotifHit = activeMotif && motifHits.has(n.name);
      const isConnected = activeNodeId && edges.some(e => (e.a.id === activeNodeId && e.b.id === n.id) || (e.b.id === activeNodeId && e.a.id === n.id));
      const isUnitMatch = activeUnitIdx >= 0 && n.unitIdx === activeUnitIdx;
      const dimmed = (activeNodeId && !isSelected && !isConnected)
        || (activeMotif && !isMotifHit)
        || (activeUnitIdx >= 0 && !activeNodeId && !isUnitMatch);
      const isHover = hoveredNode === n;

      const pulse = 1 + 0.08 * Math.sin(now * 0.003 + n.phase);
      ctx.save();
      ctx.globalAlpha = dimmed ? 0.24 : 1;

      // Outer plasma halo
      const haloR = r * (isSelected || isMotifHit || isHover ? 2.15 : 1.55) * pulse;
      const hg = ctx.createRadialGradient(sp.x, sp.y, r * 0.6, sp.x, sp.y, haloR);
      hg.addColorStop(0, n.color + '88');
      hg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = hg;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // Circular clipped portrait or Core Lore Celestial Emblem
      ctx.save();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.clip();
      if (n.isCenter) {
        const sg = ctx.createRadialGradient(sp.x - r * 0.25, sp.y - r * 0.25, r * 0.1, sp.x, sp.y, r);
        sg.addColorStop(0, '#fef08a');
        sg.addColorStop(0.55, '#f59e0b');
        sg.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = sg;
        ctx.fillRect(sp.x - r, sp.y - r, r * 2, r * 2);
      } else {
        ctx.fillStyle = n.isCore ? '#131c33' : '#0f172a';
        ctx.fillRect(sp.x - r, sp.y - r, r * 2, r * 2);
      }
      if (n.img) {
        if (Array.isArray(n.crop) && n.crop.length === 3) {
          const [cx, cy, cSize] = n.crop;
          ctx.drawImage(n.img, cx, cy, cSize, cSize, sp.x - r, sp.y - r, r * 2, r * 2);
        } else {
          ctx.drawImage(n.img, sp.x - r, sp.y - r, r * 2, r * 2);
        }
      } else if (n.emblem) {
        ctx.fillStyle = n.isCenter ? '#0f172a' : '#f8fafc';
        ctx.font = `900 ${Math.max(10, Math.round(r * (n.emblem.length > 2 ? 0.56 : 0.72)))}px "Segoe UI", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(n.emblem, sp.x, sp.y + 1);
      }
      ctx.restore();

      // Double Solar Orbit Ring for Center Producer Star
      if (n.isCenter) {
        ctx.save();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r * 1.42, now * 0.0005, now * 0.0005 + Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Glowing star border ring
      ctx.strokeStyle = (isSelected || isHover || isMotifHit) ? '#ffffff' : n.color;
      ctx.lineWidth = (isSelected || isHover || isMotifHit) ? 2.8 : 1.8;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Name label
      if (!dimmed || isHover) {
        ctx.font = `700 ${Math.max(10, Math.round(11.5 * Math.min(1.25, cam.zoom)))}px "Segoe UI", "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(n.displayName || n.name, sp.x, sp.y + r + 14);
        if (isMotifHit) {
          ctx.fillStyle = '#f472b6';
          ctx.fillText(`★ ${motifHits.get(n.name).length} 篇`, sp.x, sp.y + r + 28);
        }
      }

      ctx.restore();
    }
  }

  if (window.innerWidth <= 900) elInspector?.classList.add('is-collapsed');
  initData().then(() => requestAnimationFrame(frame));
})();
