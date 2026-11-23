// 生成“待译/待润色”清单：
//  A 缺译句（空译文 + 译文与原文相同的日文行）—— 必须由千问翻译
//  B 译文里仍残留日文的行 —— 必须由千问判断（含读音玩笑、店名音译）
//  C 机翻腔/病句线索（不自动改，供千问润色轮参考）
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const transRoot = path.join(root, 'data/translations');
function walk(p) {
  return fs.readdirSync(p, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)]));
}
const KANA = /[\u3041-\u309F\u30A0-\u30FF\uFF66-\uFF9D]/;
const isSymbolOnly = (s) => !/[\u4e00-\u9fff\u3041-\u309F\u30A0-\u30FFA-Za-z0-9]/.test(s);
// 译文与原文相同不算缺口：符号串、拟声、专有名词、本来就通用的汉字词
const sameAcceptable = (s) => isSymbolOnly(s) || !KANA.test(s);
const out = { generatedAt: new Date().toISOString(), A_missing: [], B_kanaLeft: [], C_awkward: [] };
for (const f of walk(transRoot).filter((x) => x.endsWith('.json'))) {
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  const key = path.relative(transRoot, f).split(path.sep).join('/');
  const rows = (Array.isArray(j) ? j : j.rows) || [];
  rows.forEach((r, i) => {
    const text = String(r.text == null ? '' : r.text);
    const trans = String(r.trans == null ? '' : r.trans);
    if (!text.trim()) return;
    const prev = rows[i - 1] ? String(rows[i - 1].text || '') : '';
    const next = rows[i + 1] ? String(rows[i + 1].text || '') : '';
    if (!trans.trim() && !isSymbolOnly(text)) out.A_missing.push({ key, index: i, id: r.id, speaker: r.name, original: text, previous: prev, next });
    else if (trans.trim() && trans.trim() === text.trim() && !sameAcceptable(text)) out.A_missing.push({ key, index: i, id: r.id, speaker: r.name, original: text, previous: prev, next, note: '译文与原文相同，等于未翻译' });
    else if (trans.trim() && KANA.test(trans)) out.B_kanaLeft.push({ key, index: i, id: r.id, speaker: r.name, original: text, translation: trans });
  });
}
fs.mkdirSync(path.join(root, 'translation-work'), { recursive: true });
const p = path.join(root, 'translation-work', '待译与待核清单.json');
fs.writeFileSync(p, JSON.stringify(out, null, 1));
console.log('A 缺译句:', out.A_missing.length);
console.log('B 译文残留日文:', out.B_kanaLeft.length);
console.log('写入', path.relative(root, p), (fs.statSync(p).size / 1024 / 1024).toFixed(2) + 'MB');
