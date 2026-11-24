/* Exact official icon paths, with CSS crops of official cards for missing icons.
   No generated/repainted faces and no changes to source image files. */
(()=>{
  let index = {};
  const cacheKey = 'portraits_cache_v3';
  const KANJI_NORM = { '櫻':'樱','岡':'冈','瀬':'濑','霧':'雾','宮':'宫','園':'园','樹':'树','棲':'栖','澤':'泽','優':'优','淺':'浅','圓':'圆','雛':'雏','緋':'绯','鳩':'鸠','鈴':'铃','鬱':'郁','凜':'凛','風':'风','燈':'灯','織':'织','戀':'恋','鐘':'钟','結':'结','華':'华','穗':'穂','代':'代','裡':'里','葉':'叶','愛':'爱','倉':'仓','丸':'丸','糸':'糸','與':'与','島':'岛','鳥':'鸟','鳴':'鸣' };
  const normName = (s) => String(s || '').trim().replace(/[\u4e00-\u9fff]/g, ch => KANJI_NORM[ch] || ch);
  function addRow(row) {
    for (const key of [row.id, row.name, ...(row.aliases || [])]) {
      if (key == null || key === '') continue;
      index[String(key)] = row;
      const n = normName(key);
      if (n) index[n] = row;
    }
  }
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
  });

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
    if (!row) { host.textContent = String(who).slice(0, 1); return true; }
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
    // If index is already populated in memory, render synchronously immediately!
    if (Object.keys(index).length && render(host, who)) return Promise.resolve();
    return ready.then(() => {
      if (!host.isConnected) return;
      render(host, who);
    }).catch(() => { host.textContent = String(who).slice(0, 1); });
  }

  window.CharacterPortraits = { ready, mount };
})();
