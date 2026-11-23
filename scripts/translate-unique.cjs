// 导出/回填去重待译清单
//  导出：node scripts/translate-unique.cjs export [起始] [条数]
//  回填：node scripts/translate-unique.cjs apply <译文JSON>   译文JSON: {"<n>":"译文"}
const fs = require('fs');
const path = require('path');
const root = 'F:/sc';
const mode = process.argv[2] || 'export';
const uniqPath = path.join(root, 'translation-work/去重待译清单.json');
const U = JSON.parse(fs.readFileSync(uniqPath, 'utf8'));
const g = JSON.parse(fs.readFileSync(path.join(root, 'translation-work/待译分级.json'), 'utf8'));
const list = g.jpSentence.filter((x) => !x.note);
if (mode === 'rebuild') {
  // 依据最新清单重建去重待译列表（已完成条目自动排除）
  const fs2 = require('fs');
  const t = JSON.parse(fs2.readFileSync(path.join(root, 'translation-work/待译与待核清单.json'), 'utf8'));
  const isSymbol = (s) => !/[\u4e00-\u9fff\u3041-\u309F\u30A0-\u30FFA-Za-z0-9]/.test(s);
  // 只排除“纯符号/纯省略号”行（与待译清单判定一致），其余一律进入去重待译表
  const items = t.A_missing.map((x, i) => ({ x, i })).filter(({ x }) => !isSymbol(String(x.original)));
  const map = new Map();
  for (const { x, i } of items) {
    const k = String(x.original);
    if (!map.has(k)) map.set(k, { n: map.size, text: k, count: 0, indexes: [], done: '' });
    const e = map.get(k);
    e.count++; e.indexes.push(i);
    // 直接记录位置，避免依赖易变的清单下标
    if (!e.locs) e.locs = [];
    e.locs.push([x.key, x.index]);
  }
  const out = { rebuiltAt: new Date().toISOString(), total: items.length, unique: map.size, items: [...map.values()] };
  fs.writeFileSync(uniqPath, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ 待译行: items.length, 唯一条目: map.size }));
} else if (mode === 'export') {
  const start = Number(process.argv[3] || 0);
  const count = Number(process.argv[4] || 80);
  const slice = U.items.slice(start, start + count);
  console.log(`唯一待译 ${start}..${start + slice.length - 1} / 共 ${U.unique}`);
  for (const it of slice) console.log(`${it.n}\t×${it.count}\t${JSON.stringify(it.text)}`);
} else {
  const tr = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
  let rows = 0, files = 0;
  const touched = new Set();
  const fileCache = new Map();
  const logRows = [];
  for (const [n, text] of Object.entries(tr)) {
    const item = U.items[Number(n)];
    if (!item) { console.warn('未知序号', n); continue; }
    if (item.done) continue;
    const locs = item.locs || [];
    if (!locs.length) { console.warn('条目缺少位置信息，请先 rebuild', n); continue; }
    for (const [key, idx] of locs) {
      const p = path.join(root, 'data/translations', key);
      if (!fileCache.has(p)) {
        try {
          fileCache.set(p, JSON.parse(fs.readFileSync(p, 'utf8')));
        } catch (e) {
          console.error('读取失败:', p, e.message);
          continue;
        }
      }
      const j = fileCache.get(p);
      const arr = Array.isArray(j) ? j : j.rows;
      const r = arr[idx];
      if (!r) continue;
      const cur = String(r.trans == null ? '' : r.trans);
      if (cur.trim() && cur.trim() !== String(r.text).trim()) continue; // 保留他人译文
      if (cur === text) continue;
      logRows.push({ key, index: idx, id: r.id, original: r.text, before: cur, after: text, by: 'AI 直译（用户 m00944 授权）' });
      r.trans = text;
      rows++; touched.add(p);
    }
    item.done = text;
  }
  for (const p of touched) {
    const j = fileCache.get(p);
    fs.writeFileSync(p, JSON.stringify(j, null, 2));
    files++;
  }
  fs.writeFileSync(uniqPath, JSON.stringify(U, null, 1));
  const logPath = path.join(root, 'translation-work/翻译变更日志.jsonl');
  fs.appendFileSync(logPath, logRows.map((x) => JSON.stringify(x)).join('\n') + (logRows.length ? '\n' : ''));
  const remain = U.items.filter((x) => !x.done).length;
  console.log(JSON.stringify({ 写入行: rows, 涉及文件: files, 剩余未译唯一条目: remain }));
}
