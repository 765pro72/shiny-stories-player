// 依据 audit-translation-status.cjs 的对账结果（权威口径）重建去重待译清单
// 覆盖：真缺译（emptyNeed）+ 译文=原文且含假名（sameJp）+ 译文残留假名（kanaLeft）
// 用法：node scripts/rebuild-pending-from-audit.cjs [--keep-others]
const fs = require('fs');
const path = require('path');
const root = 'F:/sc';
const S = JSON.parse(fs.readFileSync(path.join(root, 'translation-work/状态对账.json'), 'utf8'));

const isSymbol = (s) => !/[\u4e00-\u9fff\u3041-\u309f\u30a0-\u30ffA-Za-z0-9]/.test(String(s));
const rows = [];
for (const x of S.need) rows.push({ key: x.f, index: x.i, id: x.id, original: String(x.text), kind: 'empty' });
for (const x of S.sameJp) rows.push({ key: x.f, index: x.i, id: x.id, original: String(x.text), kind: 'sameJp' });
for (const x of S.kanaLeft) rows.push({ key: x.f, index: x.i, id: x.id, original: String(x.text), before: String(x.trans), kind: 'kanaLeft' });

const map = new Map();
let skippedSymbol = 0;
for (const r of rows) {
  if (r.kind !== 'kanaLeft' && isSymbol(r.original)) { skippedSymbol++; continue; }
  const k = r.original;
  if (!map.has(k)) map.set(k, { n: map.size, text: k, count: 0, kinds: {}, locs: [], done: '' });
  const e = map.get(k);
  e.count++;
  e.kinds[r.kind] = (e.kinds[r.kind] || 0) + 1;
  e.locs.push([r.key, r.index]);
}
const items = [...map.values()];
const out = { rebuiltAt: new Date().toISOString(), source: 'audit-translation-status.cjs 状态对账.json', totalRows: rows.length, skippedSymbol, unique: items.length, items };
fs.writeFileSync(path.join(root, 'translation-work/去重待译清单.json'), JSON.stringify(out, null, 1));
const byKind = {};
for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
console.log(JSON.stringify({ 来源行: byKind, 跳过纯符号: skippedSymbol, 去重后唯一条目: items.length, 覆盖行数: items.reduce((a, b) => a + b.count, 0) }));
fs.writeFileSync(path.join(root, 'translation-work/待译行明细.json'), JSON.stringify(rows, null, 1));
