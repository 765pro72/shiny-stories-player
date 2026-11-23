// 回填一批日文句译文：node scripts/apply-jp-batch.cjs <起始> <译文JSON文件>
// 译文文件格式：{"0":"译文","1":"译文",...}  键为该批次内的相对序号
const fs = require('fs');
const path = require('path');
const root = 'F:/sc';
const start = Number(process.argv[2] || 0);
const mapFile = process.argv[3];
const g = JSON.parse(fs.readFileSync(path.join(root, 'translation-work/待译分级.json'), 'utf8'));
const list = g.jpSentence.filter((x) => !x.note);
const tr = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const logRows = [];
let written = 0, skipped = 0;
for (const [rel, text] of Object.entries(tr)) {
  const i = start + Number(rel);
  const item = list[i];
  if (!item) { console.warn('越界', rel); continue; }
  const p = path.join(root, 'data/translations', item.key);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const rows = Array.isArray(j) ? j : j.rows;
  const r = rows[item.index];
  if (!r) { console.warn('行不存在', item.key, item.index); continue; }
  const cur = String(r.trans == null ? '' : r.trans);
  if (cur.trim() && cur.trim() !== String(r.text).trim()) { skipped++; continue; } // 已有他人译文，跳过
  logRows.push({ key: item.key, index: item.index, id: r.id, original: r.text, before: cur, after: text, by: 'AI 直译（用户 m00944 授权）' });
  r.trans = text;
  fs.writeFileSync(p, JSON.stringify(Array.isArray(j) ? rows : j));
  written++;
}
const logPath = path.join(root, 'translation-work/翻译变更日志.jsonl');
const prev = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
fs.writeFileSync(logPath, prev + logRows.map((x) => JSON.stringify(x)).join('\n') + (logRows.length ? '\n' : ''));
const statePath = path.join(root, 'translation-work/批次进度.json');
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { done: [] };
const tag = `${start}..${start + Number(Object.keys(tr).length) - 1}`;
if (!state.done.includes(tag)) state.done.push(tag);
state.updatedAt = new Date().toISOString();
state.jpsentenceTotal = list.length;
fs.writeFileSync(statePath, JSON.stringify(state, null, 1));
console.log(JSON.stringify({ 写入: written, 跳过已有译文: skipped, 批次: tag, 累计批次: state.done.length }));
