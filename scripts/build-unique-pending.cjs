// 生成去重待译清单：node scripts/build-unique-pending.cjs
const fs = require('fs');
const path = require('path');
const root = 'F:/sc';
const g = JSON.parse(fs.readFileSync(path.join(root, 'translation-work/待译分级.json'), 'utf8'));
const list = g.jpSentence.filter((x) => !x.note);
const map = new Map();
list.forEach((x, i) => {
  const k = String(x.original);
  if (!map.has(k)) map.set(k, { text: k, indexes: [], sample: { key: x.key, index: x.index, speaker: x.speaker } });
  map.get(k).indexes.push(i);
});
const uniq = [...map.values()].sort((a, b) => b.indexes.length - a.indexes.length);
const out = { generatedAt: new Date().toISOString(), totalPending: list.length, unique: uniq.length, items: uniq.map((u, n) => ({ n, text: u.text, count: u.indexes.length, indexes: u.indexes, sample: u.sample })) };
fs.writeFileSync(path.join(root, 'translation-work/去重待译清单.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ 待译行: list.length, 去重后: uniq.length }, null, 1));
