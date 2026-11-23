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

// 28 Idols mapping
const IDOLS = [
  { id: '1', name: '樱木真乃', unit: 'illumi', color: '#ffcbe2', icon: '/asset/images/content/characters/icon_phone/001.png', keywords: ['真乃', '樱木', '櫻木', 'Mano', '関根瞳'] },
  { id: '2', name: '风野灯织', unit: 'illumi', color: '#144384', icon: '/asset/images/content/characters/icon_phone/002.png', keywords: ['灯织', '風野', 'Hiori', '近藤玲奈'] },
  { id: '3', name: '八宫巡',   unit: 'illumi', color: '#ffe012', icon: '/asset/images/content/characters/icon_phone/003.png', keywords: ['八宫', '巡', 'めぐる', 'Meguru', '峯田茉優'] },
  { id: '4', name: '月冈恋钟', unit: 'lantica', color: '#f84ca0', icon: '/asset/images/content/characters/icon_phone/004.png', keywords: ['恋钟', '恋鐘', 'Kogane', '礒部花凜'] },
  { id: '5', name: '田中摩美美', unit: 'lantica', color: '#a846c2', icon: '/asset/images/content/characters/icon_phone/005.png', keywords: ['摩美美', 'Mamimi', '菅沼千紗'] },
  { id: '6', name: '白濑咲耶', unit: 'lantica', color: '#006030', icon: '/asset/images/content/characters/icon_phone/006.png', keywords: ['咲耶', 'Sakuya', '八巻アンナ'] },
  { id: '7', name: '三峰结华', unit: 'lantica', color: '#3b91c4', icon: '/asset/images/content/characters/icon_phone/007.png', keywords: ['三峰', '结华', '結華', 'Yuika', '成海瑠奈', '希水しお'] },
  { id: '8', name: '幽谷雾子', unit: 'lantica', color: '#d9f2ff', icon: '/asset/images/content/characters/icon_phone/008.png', keywords: ['雾子', '霧子', 'Kiriko', '結名美月'] },
  { id: '9', name: '小宫果穗', unit: 'houkago', color: '#e54619', icon: '/asset/images/content/characters/icon_phone/009.png', keywords: ['果穗', '果穂', 'Kaho', '河野ひより'] },
  { id: '10', name: '园田智代子', unit: 'houkago', color: '#f93b75', icon: '/asset/images/content/characters/icon_phone/010.png', keywords: ['智代子', 'Chiyoko', '白石晴香'] },
  { id: '11', name: '西城树里', unit: 'houkago', color: '#ffc602', icon: '/asset/images/content/characters/icon_phone/011.png', keywords: ['树里', '樹里', 'Juri', '永井真里子'] },
  { id: '12', name: '杜野凛世', unit: 'houkago', color: '#89c3eb', icon: '/asset/images/content/characters/icon_phone/012.png', keywords: ['凛世', 'Rinze', '丸岡和佳奈'] },
  { id: '13', name: '有栖川夏叶', unit: 'houkago', color: '#90be4a', icon: '/asset/images/content/characters/icon_phone/013.png', keywords: ['夏叶', '夏葉', 'Natsuha', '涼本あきほ'] },
  { id: '14', name: '大崎甘奈', unit: 'alstro', color: '#f54275', icon: '/asset/images/content/characters/icon_phone/014.png', keywords: ['甘奈', 'Amana', '黒木ほの香'] },
  { id: '15', name: '大崎甜花', unit: 'alstro', color: '#e79cd5', icon: '/asset/images/content/characters/icon_phone/015.png', keywords: ['甜花', 'Tenka', '前川涼子'] },
  { id: '16', name: '桑山千雪', unit: 'alstro', color: '#fbfafa', icon: '/asset/images/content/characters/icon_phone/016.png', keywords: ['千雪', 'Chiyuki', '芝崎典子'] },
  { id: '17', name: '芹泽朝日', unit: 'stray', color: '#d30018', icon: '/asset/images/content/characters/icon_phone/017.png', keywords: ['朝日', 'あさひ', 'Asahi', '田中有紀'] },
  { id: '18', name: '黛冬优子', unit: 'stray', color: '#5ce629', icon: '/asset/images/content/characters/icon_phone/018.png', keywords: ['冬优子', '冬優子', 'ふゆ', 'Fuyuko', '幸村恵理'] },
  { id: '19', name: '和泉爱依', unit: 'stray', color: '#ff007f', icon: '/asset/images/content/characters/icon_phone/019.png', keywords: ['爱依', '愛依', 'Mei', '北原沙弥香'] },
  { id: '20', name: '浅仓透',   unit: 'noctchill', color: '#50cadc', icon: '/asset/images/content/characters/icon_phone/020.png', keywords: ['浅仓', '透', 'Toru', '和久井優'] },
  { id: '21', name: '樋口圆香', unit: 'noctchill', color: '#be1e3e', icon: '/asset/images/content/characters/icon_phone/021.png', keywords: ['圆香', '円香', 'Madoka', '土屋李央'] },
  { id: '22', name: '福丸小糸', unit: 'noctchill', color: '#7967c3', icon: '/asset/images/content/characters/icon_phone/022.png', keywords: ['小糸', 'Koito', '田嶌紗蘭'] },
  { id: '23', name: '市川雏菜', unit: 'noctchill', color: '#ffc639', icon: '/asset/images/content/characters/icon_phone/023.png', keywords: ['雏菜', '雛菜', 'Hinana', '岡咲美保'] },
  { id: '24', name: '七草日花', unit: 'shhis', color: '#99e71d', icon: '/asset/images/content/characters/icon_phone/024.png', keywords: ['日花', 'にちか', 'Nichika', '紫月杏朱彩'] },
  { id: '25', name: '绯田美琴', unit: 'shhis', color: '#760f11', icon: '/asset/images/content/characters/icon_phone/025.png', keywords: ['美琴', 'Mikoto', '山根綺'] },
  { id: '26', name: '斑鸠路加', unit: 'cometik', color: '#1e1125', icon: '/asset/images/content/characters/icon_phone/026.png', keywords: ['路加', 'ルカ', 'Luca', '川口莉奈'] },
  { id: '27', name: '铃木羽那', unit: 'cometik', color: '#f19ca7', icon: '/asset/images/content/characters/icon_phone/027.png', keywords: ['羽那', 'Hana', '三川華月'] },
  { id: '28', name: '郁田春希', unit: 'cometik', color: '#c3d825', icon: '/asset/images/content/characters/icon_phone/028.png', keywords: ['春希', 'Haruki', '小澤麗那'] }
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

// Chinese title dictionary
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
  'BEAM': '光束 (BEAM)',
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
  'Snowflake': '雪花 (Snowflake)',
  '無自覚アプリオリ': '无自觉的先验 (Apriori)',
  'くだらないや': '无聊透顶',
  '平行線の美学': '平行线的美学',
  'ハナムケのハナタバ': '践行花束',
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
  '夢模様キャンバス': '梦之画布 (春希Solo)',
  'HSV色空間': 'HSV色空间 (春希Solo)',
  'Unstoppable': '不可阻挡 (日花/美琴Solo)',
  'ハートフルディ ハートフルミー': '温情之日·温情自我 (雏菜Solo)',
  'Paradox': '悖论 (透Solo)',
  'ガガリズム': '咔咔节拍 (小糸Solo)'
};

function inferSongIdols(name, artistStr, albumStr) {
  const cleanName = name.replace(/\s*\([^)]*\)/g, '').trim();
  const text = `${cleanName} ${artistStr || ''} ${albumStr || ''}`.toLowerCase();

  // Check solo idols
  for (const idol of IDOLS) {
    if (idol.keywords.some(k => text.includes(k.toLowerCase()))) {
      return {
        type: 'solo',
        unitKey: idol.unit,
        unitName: `${idol.name} (独唱)`,
        idols: [idol.id],
        color: idol.color,
        vocalists: idol.name
      };
    }
  }

  // Check Unit by keywords or artist
  if (/イルミネーションスターズ|illumination/i.test(text)) {
    return { type: 'unit', unitKey: 'illumi', unitName: UNITS.illumi.name, idols: UNITS.illumi.idols, color: UNITS.illumi.color, vocalists: 'illumination STARS' };
  }
  if (/アンティーカ|l'antica/i.test(text)) {
    return { type: 'unit', unitKey: 'lantica', unitName: UNITS.lantica.name, idols: UNITS.lantica.idols, color: UNITS.lantica.color, vocalists: "L'Antica" };
  }
  if (/放課後クライマックスガールズ|放課後|クライマックス/i.test(text)) {
    return { type: 'unit', unitKey: 'houkago', unitName: UNITS.houkago.name, idols: UNITS.houkago.idols, color: UNITS.houkago.color, vocalists: '放課後クライマックスガールズ' };
  }
  if (/アルストロメリア|alstroemeria/i.test(text)) {
    return { type: 'unit', unitKey: 'alstro', unitName: UNITS.alstro.name, idols: UNITS.alstro.idols, color: UNITS.alstro.color, vocalists: 'ALSTROEMERIA' };
  }
  if (/ストレイライト|straylight/i.test(text)) {
    return { type: 'unit', unitKey: 'stray', unitName: UNITS.stray.name, idols: UNITS.stray.idols, color: UNITS.stray.color, vocalists: 'Straylight' };
  }
  if (/ノクチル|noctchill/i.test(text)) {
    return { type: 'unit', unitKey: 'noctchill', unitName: UNITS.noctchill.name, idols: UNITS.noctchill.idols, color: UNITS.noctchill.color, vocalists: 'noctchill' };
  }
  if (/シーズ|shhis/i.test(text)) {
    return { type: 'unit', unitKey: 'shhis', unitName: UNITS.shhis.name, idols: UNITS.shhis.idols, color: UNITS.shhis.color, vocalists: 'SHHis' };
  }
  if (/コメティック|cometik/i.test(text)) {
    return { type: 'unit', unitKey: 'cometik', unitName: UNITS.cometik.name, idols: UNITS.cometik.idols, color: UNITS.cometik.color, vocalists: 'CoMETIK' };
  }

  // All stars fallback
  return {
    type: 'all',
    unitKey: 'all',
    unitName: '283 ALL STARS',
    idols: IDOLS.map(i => i.id),
    color: '#3772ff',
    vocalists: artistStr || '283 Production 全员合唱'
  };
}

async function scrapeFullPlaylist() {
  console.log('Fetching NetEase Playlist 8896865808 (偶像大师 闪耀色彩 SC 全曲无重复)...');
  const playlistRes = await get('https://music.163.com/api/v6/playlist/detail?id=8896865808');
  if (!playlistRes || !playlistRes.playlist) {
    console.error('Failed to fetch playlist detail');
    return;
  }

  const trackIds = playlistRes.playlist.trackIds?.map(t => t.id) || [];
  console.log(`Found ${trackIds.length} tracks in playlist! Fetching metadata in batches...`);

  const songs = [];
  const batchSize = 100;
  for (let i = 0; i < trackIds.length; i += batchSize) {
    const chunk = trackIds.slice(i, i + batchSize);
    console.log(`Fetching batch ${i / batchSize + 1}...`);
    const detailRes = await get('https://music.163.com/api/song/detail?ids=' + encodeURIComponent(JSON.stringify(chunk)));
    if (detailRes && detailRes.songs) {
      for (const s of detailRes.songs) {
        if (/off vocal|drama|ドラマ|オーディオドラマ|inst/i.test(s.name)) continue;

        const cleanTitle = s.name.replace(/\s*\([^)]*\)/g, '').trim();
        const artistStr = s.artists?.map(a => a.name).join(', ') || '';
        const albumName = s.album?.name || '';
        const titleZh = TITLE_ZH_MAP[cleanTitle] || TITLE_ZH_MAP[s.name] || cleanTitle;
        const info = inferSongIdols(s.name, artistStr, albumName);

        songs.push({
          id: 'track_' + s.id,
          neteaseId: s.id,
          title: s.name,
          cleanTitle: cleanTitle,
          titleZh: titleZh,
          unitKey: info.unitKey,
          unitName: info.unitName,
          type: info.type,
          idols: info.idols,
          vocalists: info.vocalists || artistStr,
          album: albumName,
          cover: s.album?.picUrl || playlistRes.playlist.coverImgUrl,
          duration: Math.round(s.duration / 1000) || 240,
          color: info.color,
          audioUrl: `https://music.163.com/song/media/outer/url?id=${s.id}.mp3`
        });
      }
    }
  }

  console.log(`Successfully scraped ${songs.length} valid Shiny Colors tracks!`);
  const output = {
    generatedAt: new Date().toISOString(),
    playlistSource: {
      id: 8896865808,
      name: playlistRes.playlist.name,
      creator: playlistRes.playlist.creator?.nickname
    },
    idols: IDOLS,
    units: UNITS,
    songs: songs
  };

  fs.writeFileSync(path.join(__dirname, '../public/music-catalog.json'), JSON.stringify(output, null, 2), 'utf8');
  console.log('Saved to public/music-catalog.json');
}

scrapeFullPlaylist();
