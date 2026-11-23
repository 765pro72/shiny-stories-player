const fs = require('fs');

const convs = JSON.parse(fs.readFileSync('public/home-assets/conversations.json', 'utf8'));

console.log('Auditing all 771 home conversations for machine translation / literal artifacts...\n');

const suspicious = [];

const mtPatterns = [
  // Absurd mistranslations spotted
  /生鱼片/, // 差し入れ
  /脱掉.*内衣/, // 下を向く
  /改变.*选择/, // 洗濯
  /挤一下/, // ギュッとして
  /阿库比/, // アクビ
  /曼波/, // メンボ
  /阿布罗泽米/, // アブラゼミ
  /酷家伙/, // かっこいいやつ
  /这是否意味着/, // ってことですか
  /它是什么/, // なんですか
  /吻到你了/, // 口をつけた
  /拓库斯/, // タクシー
  /制片人/, // プロデューサー
  /农夫/,
  /乐井/,
  /地国/,
  /美味/, // おいそがしい
  /按日历工作/,
  /静子/,
  /发布Bya/,
  /阿金/, // 恋钟
  /宇久屋/, // 咲耶
  /目古鲁/, // 巡
  /春树/, // 春希
  /春记/,
  /玛诺/, // 真乃
  /莫诺/,
  /由香/, // 结华
  /朱里/, // 树里
  /松畑/, // 夏叶
  /须弥/, // 美琴
  /鲁子/, // 路加
  /中酱/, // ルカちゃん
  /米奇卡/, // 日花
  /尼奇卡/,
  /低音/, // ベース
  /那个声音/ // 音楽
];

for (const [id, c] of Object.entries(convs)) {
  for (const item of (c.sequence || [])) {
    const text = item.translation || '';
    const orig = item.original || '';
    for (const pat of mtPatterns) {
      if (pat.test(text)) {
        suspicious.push({
          convId: id,
          seqId: item.id,
          speaker: item.speaker,
          orig,
          zh: text,
          matched: pat.toString()
        });
        break;
      }
    }
  }
}

console.log('Found', suspicious.length, 'suspicious dialogue lines in conversations.json:');
for (const s of suspicious) {
  console.log(`[${s.convId}] ${s.speaker} (${s.seqId}):`);
  console.log(`  JP: ${s.orig}`);
  console.log(`  ZH: ${s.zh}`);
  console.log(`  Matched: ${s.matched}\n`);
}
