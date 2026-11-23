const fs = require('fs');
const path = require('path');

const root = 'F:/sc';
const badPatterns = [
  { p: /制片人/, desc: '制片人 (应为制作人)' },
  { p: /生产商/, desc: '生产商 (应为制作人)' },
  { p: /豌豆酱/, desc: '豌豆酱 (应为皮酱/小皮)' },
  { p: /滑雪很热/, desc: '滑雪很热 (应为寿喜烧)' },
  { p: /奥海道/, desc: '奥海道 (应为北海道)' },
  { p: /布达翁/, desc: '布达翁 (应为武道馆)' },
  { p: /乐井/, desc: '乐井 (应为头晕眼花)' },
  { p: /兰丹/, desc: '兰丹 (应为渐渐地)' },
  { p: /健内日和/, desc: '健内日和 (应为灯织织真让人心疼)' },
  { p: /丹尼特尔/, desc: '丹尼特尔 (应为长得很像)' },
  { p: /杂项子弹/, desc: '杂项子弹 (应为聊天话题/杂谈)' },
  { p: /爱库公司/, desc: '爱库公司 (应为化妆交流会)' },
  { p: /目古鲁/, desc: '目古鲁 (应为巡)' },
  { p: /阿金酱/, desc: '阿金酱 (应为恋钟酱)' },
  { p: /宇久屋/, desc: '宇久屋 (应为咲耶)' },
  { p: /由香酱/, desc: '由香酱 (应为结华酱)' },
  { p: /朱里酱/, desc: '朱里酱 (应为树里酱)' },
  { p: /松畑/, desc: '松畑 (应为夏叶)' },
  { p: /春树/, desc: '春树 (应为春希)' },
  { p: /玛诺/, desc: '玛诺 (应为真乃)' },
  { p: /莫诺/, desc: '莫诺 (应为真乃)' },
  { p: /须弥/, desc: '须弥 (应为美琴)' },
  { p: /它很甜，它是一种动物/, desc: '甘奈被拆成“它很甜，它是一种动物”' },
  { p: /为什么观看它/, desc: '饮んでみよう被误听机翻为“为什么观看它”' },
  { p: /大而美味的choko/, desc: '客服广告腔机翻' },
  { p: /你可以回家.*可乐饼/, desc: '買える误听为帰る“你可以回家”' },
  { p: /经纪公司做的糖果/, desc: '期間限定误听为機関現手' }
];

console.log('=== 1. Checking public/home-assets/conversations.json ===');
const convs = JSON.parse(fs.readFileSync(path.join(root, 'public/home-assets/conversations.json'), 'utf8'));
let convMatches = [];
for (const [cid, c] of Object.entries(convs)) {
  for (const s of (c.sequence || [])) {
    for (const { p, desc } of badPatterns) {
      if (p.test(s.translation || '')) {
        convMatches.push({ cid, speaker: s.speaker, desc, orig: s.original, trans: s.translation });
      }
    }
  }
}
console.log('Remaining issues in conversations.json:', convMatches.length);
if (convMatches.length) console.log(convMatches);

console.log('\n=== 2. Checking data/voice-index.json ===');
const voices = JSON.parse(fs.readFileSync(path.join(root, 'data/voice-index.json'), 'utf8'));
let voiceMatches = [];
for (const v of voices) {
  for (const { p, desc } of badPatterns) {
    if (p.test(v.translation || '')) {
      voiceMatches.push({ key: v.key, idol: v.idol, desc, trans: v.translation });
    }
  }
}
console.log('Remaining issues in voice-index.json:', voiceMatches.length);
if (voiceMatches.length) console.log(voiceMatches.slice(0, 10));

console.log('\n=== 3. Checking all data/translations/ (10,960 files) ===');
let commuMatches = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.json')) {
      let data;
      try { data = JSON.parse(fs.readFileSync(full, 'utf8')); } catch { continue; }
      const rows = Array.isArray(data) ? data : data.rows || [];
      for (let i = 0; i < rows.length; i++) {
        const tr = String(rows[i]?.trans || '');
        for (const { p, desc } of badPatterns) {
          if (p.test(tr)) {
            commuMatches.push({
              file: path.relative(path.join(root, 'data/translations'), full),
              row: i,
              desc,
              text: rows[i]?.text,
              trans: tr
            });
          }
        }
      }
    }
  }
}
walk(path.join(root, 'data/translations'));
console.log('Remaining issues in commu translations:', commuMatches.length);
if (commuMatches.length) console.log(commuMatches.slice(0, 20));
