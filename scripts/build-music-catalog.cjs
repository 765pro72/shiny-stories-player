const fs = require('fs');
const https = require('https');
const path = require('path');

function get(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

// Idol definitions
const IDOLS = [
  { id: '1', name: '樱木真乃', unit: 'illumi', color: '#ffcbe2', icon: '/asset/images/content/characters/icon_phone/001.png' },
  { id: '2', name: '风野灯织', unit: 'illumi', color: '#144384', icon: '/asset/images/content/characters/icon_phone/002.png' },
  { id: '3', name: '八宫巡',   unit: 'illumi', color: '#ffe012', icon: '/asset/images/content/characters/icon_phone/003.png' },
  { id: '4', name: '月冈恋钟', unit: 'lantica', color: '#f84ca0', icon: '/asset/images/content/characters/icon_phone/004.png' },
  { id: '5', name: '田中摩美美', unit: 'lantica', color: '#a846c2', icon: '/asset/images/content/characters/icon_phone/005.png' },
  { id: '6', name: '白濑咲耶', unit: 'lantica', color: '#006030', icon: '/asset/images/content/characters/icon_phone/006.png' },
  { id: '7', name: '三峰结华', unit: 'lantica', color: '#3b91c4', icon: '/asset/images/content/characters/icon_phone/007.png' },
  { id: '8', name: '幽谷雾子', unit: 'lantica', color: '#d9f2ff', icon: '/asset/images/content/characters/icon_phone/008.png' },
  { id: '9', name: '小宫果穗', unit: 'houkago', color: '#e54619', icon: '/asset/images/content/characters/icon_phone/009.png' },
  { id: '10', name: '园田智代子', unit: 'houkago', color: '#f93b75', icon: '/asset/images/content/characters/icon_phone/010.png' },
  { id: '11', name: '西城树里', unit: 'houkago', color: '#ffc602', icon: '/asset/images/content/characters/icon_phone/011.png' },
  { id: '12', name: '杜野凛世', unit: 'houkago', color: '#89c3eb', icon: '/asset/images/content/characters/icon_phone/012.png' },
  { id: '13', name: '有栖川夏叶', unit: 'houkago', color: '#90be4a', icon: '/asset/images/content/characters/icon_phone/013.png' },
  { id: '14', name: '大崎甘奈', unit: 'alstro', color: '#f54275', icon: '/asset/images/content/characters/icon_phone/014.png' },
  { id: '15', name: '大崎甜花', unit: 'alstro', color: '#e79cd5', icon: '/asset/images/content/characters/icon_phone/015.png' },
  { id: '16', name: '桑山千雪', unit: 'alstro', color: '#fbfafa', icon: '/asset/images/content/characters/icon_phone/016.png' },
  { id: '17', name: '芹泽朝日', unit: 'stray', color: '#d30018', icon: '/asset/images/content/characters/icon_phone/017.png' },
  { id: '18', name: '黛冬优子', unit: 'stray', color: '#5ce629', icon: '/asset/images/content/characters/icon_phone/018.png' },
  { id: '19', name: '和泉爱依', unit: 'stray', color: '#ff007f', icon: '/asset/images/content/characters/icon_phone/019.png' },
  { id: '20', name: '浅仓透',   unit: 'noctchill', color: '#50cadc', icon: '/asset/images/content/characters/icon_phone/020.png' },
  { id: '21', name: '樋口圆香', unit: 'noctchill', color: '#be1e3e', icon: '/asset/images/content/characters/icon_phone/021.png' },
  { id: '22', name: '福丸小糸', unit: 'noctchill', color: '#7967c3', icon: '/asset/images/content/characters/icon_phone/022.png' },
  { id: '23', name: '市川雏菜', unit: 'noctchill', color: '#ffc639', icon: '/asset/images/content/characters/icon_phone/023.png' },
  { id: '24', name: '七草日花', unit: 'shhis', color: '#99e71d', icon: '/asset/images/content/characters/icon_phone/024.png' },
  { id: '25', name: '绯田美琴', unit: 'shhis', color: '#760f11', icon: '/asset/images/content/characters/icon_phone/025.png' },
  { id: '26', name: '斑鸠路加', unit: 'cometik', color: '#1e1125', icon: '/asset/images/content/characters/icon_phone/026.png' },
  { id: '27', name: '铃木羽那', unit: 'cometik', color: '#f19ca7', icon: '/asset/images/content/characters/icon_phone/027.png' },
  { id: '28', name: '郁田春希', unit: 'cometik', color: '#c3d825', icon: '/asset/images/content/characters/icon_phone/028.png' }
];

const UNITS = {
  illumi: { name: 'illumination STARS', nameZh: '闪耀之星', idols: ['1', '2', '3'], color: '#ffe012' },
  lantica: { name: "L'Antica", nameZh: '月影蔷薇', idols: ['4', '5', '6', '7', '8'], color: '#a846c2' },
  houkago: { name: '放課後クライマックスガールズ', nameZh: '放课后Climax Girls', idols: ['9', '10', '11', '12', '13'], color: '#ff7700' },
  alstro: { name: 'ALSTROEMERIA', nameZh: '六出花', idols: ['14', '15', '16'], color: '#f54275' },
  stray: { name: 'Straylight', nameZh: '迷光', idols: ['17', '18', '19'], color: '#d30018' },
  noctchill: { name: 'noctchill', nameZh: '夜风', idols: ['20', '21', '22', '23'], color: '#50cadc' },
  shhis: { name: 'SHHis', nameZh: '茜丝', idols: ['24', '25'], color: '#99e71d' },
  cometik: { name: 'CoMETIK', nameZh: '彗星', idols: ['26', '27', '28'], color: '#2b2348' },
  all: { name: '283 ALL STARS', nameZh: '283全体偶像', idols: IDOLS.map(i => i.id), color: '#3772ff' }
};

// Known Chinese song titles dictionary for Shiny Colors
const TITLE_ZH_MAP = {
  'Spread the Wings!!': '展翅高飞!!',
  'Spread the Wings!! -25 colors-': '展翅高飞!! -25 colors-',
  'Multicolored Sky': '五彩天空',
  'Multicolored Sky -25 colors-': '五彩天空 -25 colors-',
  'Ambitious Eve': '壮志前夕',
  'いつか Shiny Days': '终有一日 Shiny Days',
  'シャイノグラフィ': '耀影华彩 (Shinography)',
  'Dye the sky.': '染上天空',
  'Resonance+': '共鸣+',
  'Color Days': '色彩之日',
  '虹の行方': '彩虹的去向',
  'Daybreak Age': '黎明时代',
  '星の声': '繁星之声',
  'ツバサグラビティ': '双翼重力 (Tsubasa Gravity)',
  'ヒカリのdestination': '光之归宿',
  '虹になれ': '化作彩虹',
  'We can go now!': '我们现在就能出发！',
  'トライアングル': '三角棱镜 (Triangle)',
  'Twinkle way': '闪烁之路',
  'Happy Funny Lucky': '快乐·有趣·幸运',
  'FELICE': '幸福之音 (FELICE)',
  'イルミネイトコンサート': '点灯音乐会',
  'PRISISM': '棱镜主义',
  'Forward March!!!': '前进进行曲！！！',
  'バベルシティ・グレイス': '巴别城恩典',
  '幻惑SILHOUETTE': '幻惑剪影',
  'NEO THEORY FANTASY': '新理论奇想',
  'ラビアンローズ': '玫瑰人生 (La Vie en Rose)',
  'Black Reverie': '黑之幻想',
  '純白トロイメライ': '纯白梦幻曲',
  'abyss of delicacy': '精妙深渊',
  '革命進化論': '革命进化论',
  '浮動性': '浮动性',
  '夢咲きAfter school': '梦想盛放放学后',
  '太陽キッス': '太阳之吻',
  'ビーチブレイバー': '海滩勇者 (Beach Braver)',
  'よりみちサンセット': '绕路日落',
  '五ツ座流星群': '五座流星群',
  '学祭革命夜明け前': '学祭革命黎明前',
  'クライマックスアイランド': '高潮岛屿 (Climax Island)',
  '拝啓タイムカプセル': '敬启·时光胶囊',
  'アルストロメリア': '六出花 (Alstroemeria)',
  'ハピリリ': '快乐百合 (HapiRiri)',
  'Bloomy!': '盛放！',
  'Love Addiction': '爱之沉溺',
  'ダブル・イフェクト': '双重效应 (Double Effect)',
  'Anniversary': '纪念日',
  'パステルカラー パスカラカラー': '粉彩色彩',
  'ラブ・ボナペティート': '尽情享用爱 (Love Bon Appetit)',
  'Wandering Dream Chaser': '彷徨的追梦人',
  'Transcending The World': '超越世界',
  'Hide & Attack': '隐匿与突袭',
  'Destined Rival': '宿命之敌',
  'Another Rampage': '另一次狂暴',
  'Timeless Shooting Star': '永恒流星',
  'いつだって僕らは': '无论何时我们都是',
  'あの花のように': '如同那朵花',
  '僕らだけの未来の空': '仅属于我们的未来天空',
  '今しかない瞬間を': '仅在当下的瞬间',
  'OH MY GOD': 'OH MY GOD (我的天哪)',
  'Fly and Fly': '飞翔再飞翔',
  'Fashionable': '时尚风向 (Fashionable)',
  'Bouncy Girl': '跳跃女孩',
  '無自覚アプリオリ': '无自觉的先验 (Apriori)',
  'くだらないや': '无聊透顶',
  '平行線の美学': '平行线的美学',
  'ありったけの輝きで': '满溢的光芒 (真乃Solo)',
  'スローモーション': '慢动作 (灯织Solo)',
  'Going my way': '走我自己的路 (巡Solo)',
  'アポイント・シグナル': '约会信号 (恋钟Solo)',
  '誰ソ彼アイデンティティー': '黄昏身份 (摩美美Solo)',
  '千夜アリア': '千夜咏叹调 (咲耶Solo)',
  'プラスチック・アンブレラ': '塑料雨伞 (结华Solo)',
  '雪・月・風・花': '雪·月·风·花 (雾子Solo)',
  'ハナマルバッジ': '满分红花徽章 (果穗Solo)',
  'チョコデート・サンデー': '巧克力约会圣代 (智代子Solo)',
  '過純性ブリーチ': '过纯性漂白 (树里Solo)',
  '常咲の庭': '常开庭院 (凛世Solo)',
  'Damascus Cocktail': '大马士革鸡尾酒 (夏叶Solo)',
  'Sweet Memories': '甜美回忆 (甘奈Solo)',
  'また明日': '明天见 (甜花Solo)',
  'Darling you!': '亲爱的你！(千雪Solo)',
  '星をめざして': '向着繁星 (朝日Solo)',
  'SOS': 'SOS (冬优子Solo)',
  'Look up to the sky': '仰望天空 (爱依Solo)',
  'Statice': '星辰花 (透Solo)',
  '夢見鳥': '梦见之鸟 (圆香Solo)',
  'わたしの主人公はわたしだから！': '因为我就是我自己的主角！(小糸Solo)',
  'あおぞらサイダー': '碧空汽水 (雏菜Solo)',
  'フェアリー・ガール': '仙灵少女 (日花Solo)',
  'Look at me': '凝视我 (美琴Solo)',
  '神様は死んだ、って': '「神明已死」 (路加Solo)',
  '無垢': '无垢 (羽那Solo)',
  '夢模様キャンバス': '梦之画布 (春希Solo)'
};

// Map songs to units and idol IDs
function inferSongInfo(name, albumName) {
  const cleanName = name.replace(/\s*\([^)]*\)/g, '').trim();
  
  // Solos
  const soloMap = {
    'ありったけの輝きで': { idol: '1', unit: 'illumi' },
    'スローモーション': { idol: '2', unit: 'illumi' },
    'Going my way': { idol: '3', unit: 'illumi' },
    'アポイント・シグナル': { idol: '4', unit: 'lantica' },
    '誰ソ彼アイデンティティー': { idol: '5', unit: 'lantica' },
    '千夜アリア': { idol: '6', unit: 'lantica' },
    'プラスチック・アンブレラ': { idol: '7', unit: 'lantica' },
    '雪・月・風・花': { idol: '8', unit: 'lantica' },
    'ハナマルバッジ': { idol: '9', unit: 'houkago' },
    'チョコデート・サンデー': { idol: '10', unit: 'houkago' },
    '過純性ブリーチ': { idol: '11', unit: 'houkago' },
    '常咲の庭': { idol: '12', unit: 'houkago' },
    'Damascus Cocktail': { idol: '13', unit: 'houkago' },
    'Sweet Memories': { idol: '14', unit: 'alstro' },
    'また明日': { idol: '15', unit: 'alstro' },
    'Darling you!': { idol: '16', unit: 'alstro' },
    '星をめざして': { idol: '17', unit: 'stray' },
    'SOS': { idol: '18', unit: 'stray' },
    'Look up to the sky': { idol: '19', unit: 'stray' },
    'Statice': { idol: '20', unit: 'noctchill' },
    '夢見鳥': { idol: '21', unit: 'noctchill' },
    'わたしの主人公はわたしだから！': { idol: '22', unit: 'noctchill' },
    'あおぞらサイダー': { idol: '23', unit: 'noctchill' },
    'フェアリー・ガール': { idol: '24', unit: 'shhis' },
    'Look at me': { idol: '25', unit: 'shhis' },
    '神様は死んだ、って': { idol: '26', unit: 'cometik' },
    '無垢': { idol: '27', unit: 'cometik' },
    '夢模様キャンバス': { idol: '28', unit: 'cometik' }
  };

  if (soloMap[cleanName]) {
    const s = soloMap[cleanName];
    const idolObj = IDOLS.find(i => i.id === s.idol);
    return {
      type: 'solo',
      unitKey: s.unit,
      unitName: idolObj.name + ' (独唱)',
      idols: [s.idol],
      color: idolObj.color,
      vocalists: idolObj.name
    };
  }

  // Unit songs
  if (/ヒカリのdestination|虹になれ|We can go now!|トライアングル|Twinkle way|Happy Funny Lucky|FELICE|PRISISM|Forward March|イルミネイトコンサート/i.test(cleanName)) {
    return { type: 'unit', unitKey: 'illumi', unitName: UNITS.illumi.name, idols: UNITS.illumi.idols, color: UNITS.illumi.color, vocalists: 'illumination STARS (真乃・灯织・巡)' };
  }
  if (/バベルシティ・グレイス|幻惑SILHOUETTE|NEO THEORY FANTASY|ラビアンローズ|Black Reverie|純白トロイメライ|abyss of delicacy|革命進化論|浮動性/i.test(cleanName)) {
    return { type: 'unit', unitKey: 'lantica', unitName: UNITS.lantica.name, idols: UNITS.lantica.idols, color: UNITS.lantica.color, vocalists: "L'Antica (恋钟・摩美美・咲耶・结华・雾子)" };
  }
  if (/夢咲きAfter school|太陽キッス|ビーチブレイバー|よりみちサンセット|五ツ座流星群|学祭革命夜明け前|クライマックスアイランド|拝啓タイムカプセル/i.test(cleanName)) {
    return { type: 'unit', unitKey: 'houkago', unitName: UNITS.houkago.name, idols: UNITS.houkago.idols, color: UNITS.houkago.color, vocalists: '放課後クライマックスガールズ (果穗・智代子・树里・凛世・夏叶)' };
  }
  if (/アルストロメリア|ハピリリ|Bloomy!|Love Addiction|ダブル・イフェクト|Anniversary|パステルカラー|ラブ・ボナペティート/i.test(cleanName)) {
    return { type: 'unit', unitKey: 'alstro', unitName: UNITS.alstro.name, idols: UNITS.alstro.idols, color: UNITS.alstro.color, vocalists: 'ALSTROEMERIA (甘奈・甜花・千雪)' };
  }
  if (/Wandering Dream Chaser|Transcending The World|Hide & Attack|Destined Rival|Another Rampage|Timeless Shooting Star/i.test(cleanName)) {
    return { type: 'unit', unitKey: 'stray', unitName: UNITS.stray.name, idols: UNITS.stray.idols, color: UNITS.stray.color, vocalists: 'Straylight (朝日・冬优子・爱依)' };
  }
  if (/いつだって僕らは|あの花のように|僕らだけの未来の空|今しかない瞬間を|Catch the Breeze/i.test(cleanName)) {
    return { type: 'unit', unitKey: 'noctchill', unitName: UNITS.noctchill.name, idols: UNITS.noctchill.idols, color: UNITS.noctchill.color, vocalists: 'noctchill (透・圆香・小糸・雏菜)' };
  }
  if (/OH MY GOD|Fly and Fly|Fashionable|Bouncy Girl|The Stray Shine/i.test(cleanName)) {
    return { type: 'unit', unitKey: 'shhis', unitName: UNITS.shhis.name, idols: UNITS.shhis.idols, color: UNITS.shhis.color, vocalists: 'SHHis (日花・美琴)' };
  }
  if (/無自覚アプリオリ|くだらないや|平行線の美学|ハナムケのハナタバ/i.test(cleanName)) {
    return { type: 'unit', unitKey: 'cometik', unitName: UNITS.cometik.name, idols: UNITS.cometik.idols, color: UNITS.cometik.color, vocalists: 'CoMETIK (路加・羽那・春希)' };
  }

  // All stars
  return {
    type: 'all',
    unitKey: 'all',
    unitName: '283 ALL STARS',
    idols: IDOLS.map(i => i.id),
    color: '#3772ff',
    vocalists: '283 Production 全员合唱'
  };
}

async function build() {
  console.log('Building Shiny Stories 283 Jukebox Music Catalogue...');
  
  const albumIds = [
    158615651, // WING COLLECTION -A side-
    159704379, // WING COLLECTION -B side-
    124846890, // FE@THERS Stella
    124845707, // FE@THERS Luna
    124844700, // FE@THERS Sol
    252973459, // FE@THERS CoMETIK
    180142921  // CANVAS 08 CoMETIK
  ];

  const seenIds = new Set();
  const catalog = [];

  for (const aId of albumIds) {
    const res = await get('https://music.163.com/api/v1/album/' + aId);
    if (!res || !res.songs) continue;
    const albumName = res.album?.name || '';
    const albumCover = res.album?.picUrl || '';
    console.log(`Processing album [${albumName}] with ${res.songs.length} tracks...`);

    for (const s of res.songs) {
      if (seenIds.has(s.id)) continue;
      // Skip off vocal / drama tracks
      if (/off vocal|drama|ドラマ|オーディオドラマ/i.test(s.name)) continue;
      seenIds.add(s.id);

      const cleanTitle = s.name.replace(/\s*\([^)]*\)/g, '').trim();
      const titleZh = TITLE_ZH_MAP[cleanTitle] || TITLE_ZH_MAP[s.name] || cleanTitle;
      const info = inferSongInfo(s.name, albumName);

      catalog.push({
        id: 'track_' + s.id,
        neteaseId: s.id,
        title: s.name,
        cleanTitle: cleanTitle,
        titleZh: titleZh,
        unitKey: info.unitKey,
        unitName: info.unitName,
        type: info.type,
        idols: info.idols,
        vocalists: info.vocalists,
        album: albumName,
        cover: s.album?.picUrl || albumCover,
        duration: Math.round(s.duration / 1000) || 240,
        color: info.color,
        audioUrl: `https://music.163.com/song/media/outer/url?id=${s.id}.mp3`
      });
    }
  }

  console.log(`Catalog assembled with ${catalog.length} curated master tracks!`);
  
  const output = {
    generatedAt: new Date().toISOString(),
    idols: IDOLS,
    units: UNITS,
    songs: catalog
  };

  fs.writeFileSync(path.join(__dirname, '../public/music-catalog.json'), JSON.stringify(output, null, 2), 'utf8');
  console.log('Saved to public/music-catalog.json');
}

build();
