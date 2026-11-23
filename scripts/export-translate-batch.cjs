// 导出待译批次：node scripts/export-translate-batch.cjs <起始序号> <条数>
const fs = require('fs');
const src = JSON.parse(fs.readFileSync('F:/sc/translation-work/待译与待核清单.json', 'utf8'));
const start = Number(process.argv[2] || 0);
const count = Number(process.argv[3] || 60);
const slice = src.A_missing.slice(start, start + count);
const out = { start, count: slice.length, total: src.A_missing.length, lines: slice };
fs.writeFileSync(`F:/sc/tmp/tb-${start}.json`, JSON.stringify(out, null, 1));
// 同时输出紧凑清单供人/AI 阅读
const txt = slice.map((x, i) => `${start + i + 1}\t${x.key}\t${x.id}\t${x.speaker || ''}\t${JSON.stringify(x.original)}`).join('\n');
fs.writeFileSync(`F:/sc/tmp/tb-${start}.txt`, txt);
console.log(`批次 ${start} .. ${start + slice.length - 1} / 共 ${src.A_missing.length}`);
console.log(txt);
