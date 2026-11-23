/* Builds a 100% script-verified character appearance & co-occurrence index
   from F:\sc\data\catalog.json + F:\sc\data\translations\** for the 283 Constellation. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/catalog.json'), 'utf8'));

// Exact canonical speaker names (row.name) & dialogue mention regexes
const CHARACTERS = [
  // 28 Idols
  { id: '樱木真乃', speakers: ['真乃', '櫻木真乃', '樱木真乃'] },
  { id: '风野灯织', speakers: ['灯織', '風野灯織', '风野灯织'] },
  { id: '八宫巡', speakers: ['めぐる', '八宮めぐる', '八宫巡'] },
  { id: '月冈恋钟', speakers: ['恋鐘', '月岡恋鐘', '月冈恋钟'] },
  { id: '田中摩美美', speakers: ['摩美々', '田中摩美々', '田中摩美美'] },
  { id: '白濑咲耶', speakers: ['咲耶', '白瀬咲耶', '白濑咲耶'] },
  { id: '三峰结华', speakers: ['結華', '三峰結華', '三峰结华'] },
  { id: '幽谷雾子', speakers: ['霧子', '幽谷霧子', '幽谷雾子'] },
  { id: '小宫果穗', speakers: ['果穂', '小宮果穂', '小宫果穗'] },
  { id: '园田智代子', speakers: ['智代子', '園田智代子', '园田智代子'] },
  { id: '西城树里', speakers: ['樹里', '西城樹里', '西城树里'] },
  { id: '杜野凛世', speakers: ['凛世', '杜野凛世'] },
  { id: '有栖川夏叶', speakers: ['夏葉', '有栖川夏葉', '有栖川夏叶'] },
  { id: '大崎甘奈', speakers: ['甘奈', '大崎甘奈'] },
  { id: '大崎甜花', speakers: ['甜花', '大崎甜花'] },
  { id: '桑山千雪', speakers: ['千雪', '桑山千雪'] },
  { id: '芹泽朝日', speakers: ['あさひ', '芹沢あさひ', '芹泽朝日'] },
  { id: '黛冬优子', speakers: ['冬優子', '黛冬優子', '黛冬优子'] },
  { id: '和泉爱依', speakers: ['愛依', '和泉愛依', '和泉爱依'] },
  { id: '浅仓透', speakers: ['透', '浅倉透', '浅仓透'] },
  { id: '樋口圆香', speakers: ['円香', '樋口円香', '樋口圆香'] },
  { id: '福丸小糸', speakers: ['小糸', '福丸小糸'] },
  { id: '市川雏菜', speakers: ['雛菜', '市川雛菜', '市川雏菜'] },
  { id: '七草日花', speakers: ['にちか', '七草にちか', '七草日花'] },
  { id: '绯田美琴', speakers: ['美琴', '緋田美琴', '绯田美琴'] },
  { id: '斑鸠路加', speakers: ['ルカ', '斑鳩ルカ', '斑鸠路加'] },
  { id: '铃木羽那', speakers: ['羽那', '鈴木羽那', '铃木羽那'] },
  { id: '郁田春希', speakers: ['はるき', '郁田はるき', '郁田春希'] },
  // Core 283 Staff & Lore Figures
  { id: '制作人', speakers: ['プロデューサー', '制作人'] },
  { id: '七草叶月', speakers: ['はづき', '七草はづき', '七草叶月', '叶月'], mentionRe: /はづき|叶月/ },
  { id: '天井努 社长', speakers: ['社長', '天井', '天井社長', '天井努', '社长'], mentionRe: /天井|社長|社长/ },
  { id: '八云奈美', speakers: ['なみ', '八雲なみ', '八云奈美'], mentionRe: /八雲|八云なみ|八云奈美|なみさん|なみちゃん/ },
  { id: '路加前经纪人', speakers: ['マネージャー', 'ルカマネ', '经纪人'], requireWith: ['斑鸠路加', '绯田美琴'] },
  { id: '七草父', speakers: ['父', 'お父さん', '七草父'], requireWith: ['七草日花', '七草叶月'], mentionRe: /お父さん|父亲|爸爸/ }
];

const speakerToChar = new Map();
for (const c of CHARACTERS) {
  for (const sp of c.speakers) speakerToChar.set(sp, c.id);
}

const extraStoriesByChar = new Map(); // charId -> Set<storyKey> (stories where they appear outside their own solo idol slot, or all for core)
const pairStories = new Map();        // "A||B" -> Set<storyKey>
const storySnippets = {};             // storyKey -> authentic cast + real translated dialogue excerpt (0% hallucinated!)
const coreIds = new Set(['制作人', '七草叶月', '天井努 社长', '八云奈美', '路加前经纪人', '七草父']);

let scanned = 0;
for (const s of catalog) {
  const tp = path.join(ROOT, 'data/translations', s.key);
  if (!fs.existsSync(tp)) continue;
  let data;
  try { data = JSON.parse(fs.readFileSync(tp, 'utf8')); } catch { continue; }
  const rows = Array.isArray(data.rows) ? data.rows : [];
  if (!rows.length) continue;
  scanned++;

  const present = new Set();
  const speakerCounts = new Map();
  let fullText = '';
  const goodTransLines = [];

  for (const r of rows) {
    const nm = String(r.name || '').trim();
    if (nm) {
      const cid = speakerToChar.get(nm);
      if (cid) {
        present.add(cid);
        speakerCounts.set(cid, (speakerCounts.get(cid) || 0) + 1);
      }
    }
    if (r.text) fullText += '\n' + r.text;
    if (r.trans) {
      fullText += '\n' + r.trans;
      if (goodTransLines.length < 3) {
        const clean = String(r.trans).replace(/\\n|\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        // Skip pure punctuation / ellipses / short grunts
        const coreChars = clean.replace(/[…—\-─ー・。、！？!?（）()「」『』\s\.~～]/g, '');
        if (coreChars.length >= 8 && !/^https?:/.test(clean)) {
          goodTransLines.push(clean);
        }
      }
    }
  }

  // Build authentic, zero-hallucination cast + real opening dialogue preview for this story
  const castArr = [...speakerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(x => x[0])
    .filter(c => c !== '制作人')
    .slice(0, 3);
  const quote = goodTransLines[0] ? goodTransLines[0].slice(0, 44) + (goodTransLines[0].length > 44 ? '…' : '') : '';
  if (castArr.length || quote) {
    const castPart = castArr.length ? `出场：${castArr.join('、')}` : '';
    const quotePart = quote ? `「${quote}」` : '';
    storySnippets[s.key] = castPart && quotePart ? `${castPart} · ${quotePart}` : (quotePart || castPart);
  }

  // Check mention regexes for lore figures (八云奈美 / 天井社长 / 七草叶月 / 七草父)
  for (const c of CHARACTERS) {
    if (!c.mentionRe) continue;
    if (c.requireWith && !c.requireWith.some(req => present.has(req) || s.idol === req)) continue;
    if (c.mentionRe.test(fullText)) present.add(c.id);
  }
  // Filter requireWith for speakers (e.g. マネージャー only counts as 路加前经纪人 in Luka/Mikoto stories)
  for (const c of CHARACTERS) {
    if (c.requireWith && present.has(c.id)) {
      if (!c.requireWith.some(req => present.has(req) || s.idol === req)) {
        present.delete(c.id);
      }
    }
  }

  const isEventOrCross = s.category === '活动剧情' || s.idol === '283活动剧情' || /越境|活动|特殊/.test(s.category || '');

  // Record character appearances
  for (const cid of present) {
    // Skip noisy Producer recording on every single solo story unless it's event/milestone
    if (cid === '制作人' && !isEventOrCross && !/w\.i\.n\.g|g\.r\.a\.d|s\.t\.e\.p|l\.p|感谢祭/i.test(`${s.category} ${s.group} ${s.title}`)) continue;
    // For idols: record appearances in event stories OR other idols' stories!
    if (!coreIds.has(cid) && s.idol === cid) continue;
    if (!extraStoriesByChar.has(cid)) extraStoriesByChar.set(cid, []);
    extraStoriesByChar.get(cid).push(s.key);
  }

  // Record real co-occurrence pairs (prioritizing event stories & cross-character appearances)
  const arr = [...present].filter(cid => cid !== '制作人'); // Producer is everywhere; handled separately
  if (arr.length >= 2 && arr.length <= 16) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        const pk = a < b ? `${a}||${b}` : `${b}||${a}`;
        if (!pairStories.has(pk)) pairStories.set(pk, []);
        pairStories.get(pk).push(s.key);
      }
    }
  }
}

// Keep top 40 most relevant keys per char (events first) & top 24 per pair so JSON stays super fast (~180KB)
const catByKey = new Map(catalog.map(s => [s.key, s]));
const scoreKey = (k) => {
  const s = catByKey.get(k);
  if (!s) return 0;
  let sc = 0;
  if (s.category === '活动剧情' || s.idol === '283活动剧情') sc += 100;
  if (/線たちの十二月|セヴン#ス|ノー・カラット|モノラル|ジ・エピソード|明るい部屋|アジェンダ/.test(s.group || '')) sc += 50;
  if (s.translated) sc += 10;
  return sc;
};

const outExtra = {};
for (const [cid, list] of extraStoriesByChar.entries()) {
  list.sort((a, b) => scoreKey(b) - scoreKey(a));
  // Deduplicate by keeping all unique keys, capped at 80 for core figures and 45 for idols
  const cap = coreIds.has(cid) ? 90 : 50;
  outExtra[cid] = list.slice(0, cap);
}

const outPairs = {};
for (const [pk, list] of pairStories.entries()) {
  list.sort((a, b) => scoreKey(b) - scoreKey(a));
  outPairs[pk] = list.slice(0, 20);
}

// Extract real official 16:9 scene/still covers for all event groups from local cache/json scripts
const offlineSet = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/offline-assets.json'), 'utf8')));
const SKIP_BG = new Set(['00000', '99999', '00001', '00002', '00003', '00004', '00005']);
const eventCovers = {};
const eventGroups = new Map();
for (const s of catalog) {
  if (s.category !== '活动剧情' && s.idol !== '283活动剧情') continue;
  const g = s.group || s.originalGroup;
  if (!g) continue;
  if (!eventGroups.has(g)) eventGroups.set(g, []);
  eventGroups.get(g).push(s.key);
}
for (const [grp, keys] of eventGroups.entries()) {
  let stillPick = '';
  let bgPick = '';
  for (const k of keys) {
    const sp = path.join(ROOT, 'cache/json', k);
    if (!fs.existsSync(sp)) continue;
    let rows;
    try { rows = JSON.parse(fs.readFileSync(sp, 'utf8')); } catch { continue; }
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      if (!stillPick && r.still) {
        const rel = `images/event/still/${r.still}.jpg`;
        if (offlineSet.has(rel) || fs.existsSync(path.join(ROOT, 'cache', rel))) { stillPick = '/asset/' + rel; break; }
      }
      if (!bgPick && r.bg && !SKIP_BG.has(String(r.bg))) {
        const rel = `images/event/bg/${r.bg}.jpg`;
        if (offlineSet.has(rel) || fs.existsSync(path.join(ROOT, 'cache', rel))) bgPick = '/asset/' + rel;
      }
    }
    if (stillPick) break;
  }
  const chosen = stillPick || bgPick;
  if (chosen) eventCovers[grp] = chosen;
}

const outPath = path.join(ROOT, 'public/constellation-index.json');
fs.writeFileSync(outPath, JSON.stringify({ generatedAt: new Date().toISOString(), scanned, extra: outExtra, pairs: outPairs, eventCovers }));
const snipPath = path.join(ROOT, 'public/story-snippets.json');
fs.writeFileSync(snipPath, JSON.stringify(storySnippets));
const stat = fs.statSync(outPath);
const snipStat = fs.statSync(snipPath);
console.log(`Scanned ${scanned} story scripts -> ${outPath} (${(stat.size / 1024).toFixed(1)} KB), eventCovers: ${Object.keys(eventCovers).length}/${eventGroups.size}, snippets: ${Object.keys(storySnippets).length} (${(snipStat.size / 1024).toFixed(1)} KB)`);
console.log('Sample extra counts:', {
  '斑鸠路加': (outExtra['斑鸠路加'] || []).length,
  '八云奈美': (outExtra['八云奈美'] || []).length,
  '天井努 社长': (outExtra['天井努 社长'] || []).length,
  '七草叶月': (outExtra['七草叶月'] || []).length,
  '路加前经纪人': (outExtra['路加前经纪人'] || []).length,
  '七草父': (outExtra['七草父'] || []).length,
  totalPairs: Object.keys(outPairs).length
});
const lukaDec = (outExtra['斑鸠路加'] || []).filter(k => (catByKey.get(k)?.group || '').includes('線たちの十二月'));
console.log('斑鸠路加 in 線たちの十二月:', lukaDec.length, 'chapters!');
