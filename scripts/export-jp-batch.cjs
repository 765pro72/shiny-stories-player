// 导出“真需要翻译”的日文句批次：node scripts/export-jp-batch.cjs <起始> <条数>
const fs = require('fs');
const g = JSON.parse(fs.readFileSync('F:/sc/translation-work/待译分级.json', 'utf8'));
const list = g.jpSentence.filter((x) => !x.note);
const start = Number(process.argv[2] || 0);
const count = Number(process.argv[3] || 30);
const slice = list.slice(start, start + count);
fs.writeFileSync(`F:/sc/tmp/jp-${start}.json`, JSON.stringify({ start, total: list.length, lines: slice }, null, 1));
console.log(`日文句批次 ${start}..${start + slice.length - 1} / 共 ${list.length}`);
for (const [i, x] of slice.entries()) {
  const ctx = [];
  if (x.previous) ctx.push('前:' + JSON.stringify(x.previous).slice(0, 60));
  if (x.next) ctx.push('后:' + JSON.stringify(x.next).slice(0, 60));
  console.log(`${start + i}\t${x.key.replace(/\.json$/, '')}#${x.index}\t${x.speaker || ''}\t${JSON.stringify(x.original)}`);
}
