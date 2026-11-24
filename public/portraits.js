/* Exact official icon paths, with CSS crops of official cards for missing icons.
   No generated/repainted faces and no changes to source image files. */
(()=>{
  let index = {};
  const cacheKey = 'portraits_cache_v5';
  const KANJI_NORM = { '櫻':'樱','岡':'冈','瀬':'濑','霧':'雾','宮':'宫','園':'园','樹':'树','棲':'栖','澤':'泽','優':'优','淺':'浅','圓':'圆','雛':'雏','緋':'绯','鳩':'鸠','鈴':'铃','鬱':'郁','凜':'凛','风':'风','燈':'灯','織':'织','戀':'恋','鐘':'钟','結':'结','華':'华','穗':'穂','代':'代','裡':'里','葉':'叶','愛':'爱','倉':'仓','丸':'丸','糸':'糸','與':'与','島':'岛','鳥':'鸟','鳴':'鸣' };
  const normName = (s) => String(s || '').trim().replace(/[\u4e00-\u9fff]/g, ch => KANJI_NORM[ch] || ch);

  function addRow(row) {
    if (!row) return;
    for (const key of [row.id, row.name, ...(row.aliases || [])]) {
      if (key == null || key === '') continue;
      index[String(key)] = row;
      const n = normName(key);
      if (n) index[n] = row;
    }
  }

  // Built-in synchronous seed for standard 28 idols (guarantees instantaneous zero-latency portrait resolution)
  const SEED_IDOLS = [
    { id: '1', name: '樱木真乃', path: 'images/content/characters/icon_phone/001.png', aliases: ['櫻木真乃', '真乃', 'まの', 'mano'] },
    { id: '2', name: '风野灯织', path: 'images/content/characters/icon_phone/002.png', aliases: ['風野灯織', '灯织', '灯織', 'ひおり', 'hiori'] },
    { id: '3', name: '八宫巡', path: 'images/content/characters/icon_phone/003.png', aliases: ['八宮めぐる', '巡', 'めぐる', 'meguru'] },
    { id: '4', name: '月冈恋钟', path: 'images/content/characters/icon_phone/004.png', aliases: ['月岡恋鐘', '恋钟', '恋鐘', 'こがね', 'kogane'] },
    { id: '5', name: '田中摩美美', path: 'images/content/characters/icon_phone/005.png', aliases: ['摩美美', 'まみみ', 'mamimi'] },
    { id: '6', name: '白濑咲耶', path: 'images/content/characters/icon_phone/006.png', aliases: ['白瀬咲耶', '咲耶', 'さくや', 'sakuya'] },
    { id: '7', name: '三峰结华', path: 'images/content/characters/icon_phone/007.png', aliases: ['三峰結華', '结华', '結華', 'ゆいか', 'yuika'] },
    { id: '8', name: '幽谷雾子', path: 'images/content/characters/icon_phone/008.png', aliases: ['幽谷霧子', '雾子', '霧子', 'きりこ', 'kiriko'] },
    { id: '9', name: '小宫果穗', path: 'images/content/characters/icon_phone/009.png', aliases: ['小宮果穂', '果穗', '果穂', 'かほ', 'kaho'] },
    { id: '10', name: '园田智代子', path: 'images/content/characters/icon_phone/010.png', aliases: ['園田智代子', '智代子', 'ちょこ', 'chiyoko'] },
    { id: '11', name: '西城树里', path: 'images/content/characters/icon_phone/011.png', aliases: ['西城樹里', '树里', '樹里', 'じゅり', 'juri'] },
    { id: '12', name: '杜野凛世', path: 'images/content/characters/icon_phone/012.png', aliases: ['杜野凜世', '凛世', '凜世', 'りんぜ', 'rinze'] },
    { id: '13', name: '有栖川夏叶', path: 'images/content/characters/icon_phone/013.png', aliases: ['夏叶', 'なつは', 'natsuha'] },
    { id: '14', name: '大崎甘奈', path: 'images/content/characters/icon_phone/014.png', aliases: ['甘奈', 'あまな', 'amana'] },
    { id: '15', name: '大崎甜花', path: 'images/content/characters/icon_phone/015.png', aliases: ['甜花', 'てんか', 'tenka'] },
    { id: '16', name: '桑山千雪', path: 'images/content/characters/icon_phone/016.png', aliases: ['千雪', 'ちゆき', 'chiyuki'] },
    { id: '17', name: '芹泽朝日', path: 'images/content/characters/icon_phone/017.png', aliases: ['芹澤あさひ', '朝日', 'あさひ', 'asahi'] },
    { id: '18', name: '黛冬优子', path: 'images/content/characters/icon_phone/018.png', aliases: ['黛冬優子', '冬优子', '冬優子', 'ふゆこ', 'fuyuko'] },
    { id: '19', name: '和泉爱依', path: 'images/content/characters/icon_phone/019.png', aliases: ['和泉愛依', '爱依', '愛依', 'めい', 'mei'] },
    { id: '20', name: '浅仓透', path: 'images/content/characters/icon_phone/020.png', aliases: ['淺倉透', '透', 'とおる', 'toru'] },
    { id: '21', name: '樋口圆香', path: 'images/content/characters/icon_phone/021.png', aliases: ['樋口円香', '圆香', '円香', 'まどか', 'madoka'] },
    { id: '22', name: '福丸小糸', path: 'images/content/characters/icon_phone/022.png', aliases: ['小糸', 'こいと', 'koito'] },
    { id: '23', name: '市川雏菜', path: 'images/content/characters/icon_phone/023.png', aliases: ['市川雛菜', '雏菜', '雛菜', 'ひなな', 'hinana'] },
    { id: '24', name: '七草日花', path: 'images/content/characters/icon_phone/024.png', aliases: ['七草にちか', '日花', 'にちか', 'nichika'] },
    { id: '25', name: '绯田美琴', path: 'images/content/characters/icon_phone/025.png', aliases: ['緋田美琴', '美琴', 'みこと', 'mikoto'] },
    { id: '26', name: '斑鸠路加', path: 'images/content/characters/icon_phone/026.png', aliases: ['斑鳩ルカ', '路加', 'ルカ', 'luca'] },
    { id: '27', name: '铃木羽那', path: 'images/content/characters/icon_phone/027.png', aliases: ['鈴木羽那', '羽那', 'はな', 'hana'] },
    { id: '28', name: '郁田春希', path: 'images/content/characters/icon_phone/028.png', aliases: ['郁田はるき', '春希', 'はるき', 'haruki'] }
  ];
  for (const s of SEED_IDOLS) addRow(s);

  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      for (const row of JSON.parse(cached)) addRow(row);
    }
  } catch {}

  const ready = fetch('/portraits.json').then(r => r.json()).then(rows => {
    try { sessionStorage.setItem(cacheKey, JSON.stringify(rows)); } catch {}
    for (const row of rows) addRow(row);
    return rows;
  }).catch(() => SEED_IDOLS);

  function findRow(who) {
    const raw = String(who || '').trim();
    if (!raw) return null;
    if (index[raw]) return index[raw];
    const n = normName(raw);
    if (index[n]) return index[n];
    const num = String(Number(raw));
    if (num !== 'NaN' && index[num]) return index[num];

    const clean = raw.replace(/[（(].*?[）)]/g, '').trim();
    if (clean && index[clean]) return index[clean];
    if (clean && index[normName(clean)]) return index[normName(clean)];

    for (const key of Object.keys(index)) {
      if (key.length >= 2 && (raw.includes(key) || key.includes(raw))) {
        return index[key];
      }
    }
    return null;
  }

  function render(host, who) {
    const row = findRow(who);
    if (!row) return false;
    const img = new Image();
    img.src = '/asset-original/' + row.path;
    img.alt = row.name;
    if (row.crop) {
      const [x, y, size] = row.crop;
      img.style.cssText = `position:absolute;max-width:none;width:${1136 / size * 100}%;height:${640 / size * 100}%;left:${-x / size * 100}%;top:${-y / size * 100}%;object-fit:fill`;
    }
    img.onerror = () => { host.textContent = row.name.slice(0, 1); };
    host.replaceChildren(img);
    return true;
  }

  function mount(host, who) {
    host.classList.add('character-portrait');
    if (render(host, who)) return Promise.resolve();
    return ready.then(() => {
      if (!host.isConnected) return;
      if (!render(host, who)) {
        host.textContent = String(who).slice(0, 1);
      }
    }).catch(() => {
      host.textContent = String(who).slice(0, 1);
    });
  }

  window.CharacterPortraits = { ready, mount, findRow };
})();
