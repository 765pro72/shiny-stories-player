const fs = require('fs');

const convs = JSON.parse(fs.readFileSync('public/home-assets/conversations.json', 'utf8'));

console.log('Deep scanning all 771 conversations...');

const suspicious = [];

// Check for broken patterns
const patterns = [
  { reg: /奥海道|修真/, desc: '北海道写真集误识别为奥海道修真' },
  { reg: /兰丹/, desc: '段々（渐渐地）音译为兰丹' },
  { reg: /生鱼片/, desc: '差し入れ（慰问点心）误译为生鱼片' },
  { reg: /滑雪很热/, desc: 'すき焼き（寿喜烧）误译为滑雪很热' },
  { reg: /布达翁/, desc: '武道馆误音译为布达翁' },
  { reg: /它很甜，它是一种动物/, desc: '甘奈（あまな）误拆成它很甜动物' },
  { reg: /被妈妈戏弄|健内日和/, desc: 'まみみん（摩美美）译成妈妈，ひおりん（灯织）译成健内日和' },
  { reg: /你可以回家/, desc: '买可乐饼（買える）误译为回家（帰る）' },
  { reg: /当您因工作而感到不知所措/, desc: '灯织请教巧克力推荐误译为客服广告腔' },
  { reg: /它是什么|它是什么样子的/, desc: '何だろう/なんですか等口语直译为它是什么' },
  { reg: /制片人/, desc: '制作人（プロデューサー）误译为制片人' },
  { reg: /豌豆酱/, desc: 'ピーちゃん（真乃的小鸟皮酱）误译为豌豆酱' },
  { reg: /小春树|春记/, desc: '郁田春希被误译为春树/春记' },
  { reg: /目古鲁/, desc: '八宫巡被误译为目古鲁' },
  { reg: /阿金酱/, desc: '月冈恋钟被误译为阿金酱' },
  { reg: /宇久屋/, desc: '白濑咲耶被误译为宇久屋' },
  { reg: /由香酱|由香开始/, desc: '三峰结华被误译为由香' },
  { reg: /朱里酱/, desc: '西城树里被误译为朱里酱' },
  { reg: /松畑同学/, desc: '有栖川夏叶被误译为松畑' },
  { reg: /玛诺诺萨|莫诺酱/, desc: '樱木真乃被误译为玛诺/莫诺' },
  { reg: /乐井/, desc: 'クラクラ（头晕眼花辣度）误译为乐井' },
  { reg: /脱掉.*内衣/, desc: '低着头（下を向く）误译为脱掉内衣' },
  { reg: /改变.*选择/, desc: '洗衣服（洗濯）误译为改变选择' },
  { reg: /挤一下/, desc: '抱紧我（ギュッと）误译为挤一下' },
  { reg: /吻到你了/, desc: '碰嘴喝饮料（口つけた）误译为吻到你了' },
  { reg: /阿库比/, desc: '打哈欠（アクビ）音译' },
  { reg: /曼波/, desc: '棉签（メンボ）音译' },
  { reg: /阿布罗泽米/, desc: '鸣蝉/油蝉音译' }
];

for (const [id, c] of Object.entries(convs)) {
  for (const item of (c.sequence || [])) {
    const zh = item.translation || '';
    const orig = item.original || '';
    for (const p of patterns) {
      if (p.reg.test(zh) || p.reg.test(orig)) {
        suspicious.push({
          convId: id,
          seqId: item.id,
          speaker: item.speaker,
          orig,
          zh,
          desc: p.desc
        });
        break;
      }
    }
  }
}

console.log('Found', suspicious.length, 'matches in conversations.json:');
for (const s of suspicious) {
  console.log(`[${s.convId}] ${s.speaker} (${s.seqId}) - ${s.desc}`);
  console.log(`  JP: ${s.orig}`);
  console.log(`  ZH: ${s.zh}\n`);
}
