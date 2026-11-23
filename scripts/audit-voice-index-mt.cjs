const fs = require('fs');

const voices = JSON.parse(fs.readFileSync('data/voice-index.json', 'utf8'));

console.log('Auditing', voices.length, 'voices in voice-index.json...\n');

const suspicious = [];

const mtPatterns = [
  /脱掉.*内衣/,
  /改变.*选择/,
  /挤一下/,
  /阿库比/,
  /曼波/,
  /阿布罗泽米/,
  /酷家伙/,
  /这是否意味着/,
  /它是什么/,
  /吻到你了/,
  /拓库斯/,
  /制片人/,
  /乐井/,
  /地国/,
  /按日历工作/,
  /生鱼片/,
  /静子/,
  /奥海道/,
  /修真/,
  /布达翁/,
  /阿金/,
  /宇久屋/,
  /目古鲁/,
  /春树/,
  /春记/,
  /玛诺/,
  /莫诺/,
  /由香/,
  /朱里/,
  /松畑/,
  /须弥/,
  /鲁子/,
  /米奇卡/,
  /尼奇卡/,
  /低音/,
  /那个声音/
];

for (const v of voices) {
  const text = v.translation || '';
  for (const pat of mtPatterns) {
    if (pat.test(text)) {
      suspicious.push({
        key: v.key,
        idol: v.idol,
        orig: v.original,
        zh: text,
        matched: pat.toString()
      });
      break;
    }
  }
}

console.log('Found', suspicious.length, 'suspicious voice entries in voice-index.json:');
for (const s of suspicious.slice(0, 30)) {
  console.log(`[${s.idol}] ${s.key}:`);
  console.log(`  JP: ${s.orig}`);
  console.log(`  ZH: ${s.zh}`);
  console.log(`  Matched: ${s.matched}\n`);
}
if (suspicious.length > 30) {
  console.log('... and', suspicious.length - 30, 'more.');
}
