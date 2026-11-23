// 已有汉化的“确定性清洗”：只修正技术性缺陷（翻译痕迹、日文注音残留、重复标点、拖音符号），
// 不做任何重译或润色（重译/润色必须由千问完成）。
// 用法：node scripts/clean-translations.cjs [--apply]
const fs = require('fs');
const path = require('path');
const APPLY = process.argv.includes('--apply');
const root = path.resolve(__dirname, '..');
const transRoot = path.join(root, 'data/translations');

function walk(p) {
  return fs.readdirSync(p, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)]));
}
const KANA = /[\u3041-\u309F\u30A0-\u30FF\uFF66-\uFF9D]/;

// 日文写法 → 中文标准译名（沿用 data/names.json 与项目的既有译法）
const NAMES = {
  櫻木真乃: '樱木真乃', 風野灯織: '风野灯织', 八宮めぐる: '八宫巡', 月岡恋鐘: '月冈恋钟', 田中摩美々: '田中摩美美',
  白瀬咲耶: '白濑咲耶', 三峰結華: '三峰结华', 幽谷霧子: '幽谷雾子', 小宮果穂: '小宫果穗', 園田智代子: '园田智代子',
  西城樹里: '西城树里', 杜野凛世: '杜野凛世', 有栖川夏葉: '有栖川夏叶', 大崎甘奈: '大崎甘奈', 大崎甜花: '大崎甜花',
  桑山千雪: '桑山千雪', 芹沢あさひ: '芹泽朝日', 黛冬優子: '黛冬优子', 和泉愛依: '和泉爱依', 浅倉透: '浅仓透',
  樋口円香: '樋口圆香', 福丸小糸: '福丸小糸', 市川雛菜: '市川雏菜', 七草にちか: '七草日花', 緋田美琴: '绯田美琴',
  斑鳩ルカ: '斑鸠路加', 鈴木羽那: '铃木羽那', 郁田はるき: '郁田春希', プロデューサー: '制作人', はづき: '叶月',
  アンティーカ: 'L’Antica', ノクチル: 'noctchill', イルミネーションスターズ: 'illumination STARS',
  放課後クライマックスガールズ: '放课后Climax Girls', アルストロメリア: 'Alstroemeria', ストレイライト: 'Straylight',
  シーズ: 'SHHis', コメティック: 'CoMETIK',
};

// 规则表：每条 rule 返回 [新文本, 说明] 或 null
const rules = [];
const addRule = (name, fn) => rules.push({ name, fn });

// R1 段落被“原文 => 译文”污染
addRule('traceremain', (t) => {
  const m = t.match(/^([\s\S]*?)\s*=>\s*([\s\S]*)$/);
  if (!m) return null;
  const left = m[1], right = m[2];
  // 左侧含假名且右侧是中文 → 保留右侧
  if (KANA.test(left) && /[\u4e00-\u9fff]/.test(right) && !KANA.test(right.replace(/[（(][^）)]*[）)]/g, ''))) return [right.trim(), '去掉“原文 => 译文”残留，保留译文'];
  return null;
});
// R2 纯日文注音括号（括号内只有假名、没有汉字与冒号）→ 仅当同一行文本里已出现等价中文词时删除，
// 避免破坏「智代子（チヨコ）＝巧克力（チョコ）」这类靠读音成立的玩笑。
addRule('kanaParenPure', (t) => {
  let hit = null;
  const out = t.replace(/[（(]([^）()]{1,20})[）)]/g, (all, inner) => {
    const hasCJK = /[\u4e00-\u9fff]/.test(inner);
    if (!KANA.test(inner) || hasCJK || /[:：]/.test(inner)) return all;
    return all; // 一律保留，交由千问在润色轮判断（含读音玩笑，不能简单删）
  });
  return hit ? [out, `删除纯日文注音（${hit}）`] : null;
});
// R3 括号注音：日文词 + 中文释义 → 去掉日文词，保留中文
addRule('kanaParenLabel', (t) => {
  let hit = null;
  const out = t.replace(/[（(]\s*([\u3041-\u309F\u30A0-\u30FF\uFF66-\uFF9D\u4e00-\u9fff]{2,20})\s*[：:]\s*([^）()]{1,40})[）)]/g, (all, jp, zh) => {
    if (!KANA.test(jp)) return all;
    hit = jp;
    return `（${zh.trim()}）`;
  });
  return hit ? [out, `注音日文词「${hit}」换成中文释义`] : null;
});
// R4 译文残留日文人名/组合名写法 → 中文译名
addRule('nameJp', (t) => {
  let hit = null;
  let out = t;
  for (const [jp, zh] of Object.entries(NAMES)) {
    if (out.includes(jp)) { out = out.split(jp).join(zh); hit = jp; }
  }
  return hit ? [out, `日文写法「${hit}」改为中文译名`] : null;
});
// R5 汉字后的日文长音符「ー」→ 中文破折号；行尾拖音（后接标点或行末）→「～」
addRule('longVowel', (t) => {
  let dash = 0, wave = 0;
  let out = t.replace(/([\u4e00-\u9fff])ー+(?=[\s\n“”"』）)、。，！？…—─]|$)/g, (all, zh) => { wave++; return `${zh}～`; });
  out = out.replace(/([\u4e00-\u9fff])ー+/g, (all, zh) => { dash++; return `${zh}——`; });
  if (!dash && !wave) return null;
  return [out, `${wave} 处行尾长音改为「～」${dash ? `，${dash} 处长音改为破折号` : ''}`];
});
// R6 保留位：译文里拖音破折号的长短属于原作者/译者的表现风格，不在确定性清洗范围内
// （若确需统一，必须在千问润色轮判断，不能由规则擅自压缩）。
// R8 日文中点「・」在中文语境里没有对应写法 → 直接去掉（人名/代号/列举处中文用空格或顿号都不自然，删去最稳）
addRule('nakaguro', (t) => {
  if (!/・/.test(t)) return null;
  const out = t.replace(/・/g, '');
  return out !== t ? [out, '去掉日文中点「・」'] : null;
});
// R9 行尾残留的日文长音已由 R5 处理；此处保留规则位以便后续扩展

const changes = [];
const files = walk(transRoot).filter((f) => f.endsWith('.json'));
for (const f of files) {
  let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  const rows = Array.isArray(j) ? j : j.rows || [];
  let touched = 0;
  for (const r of rows) {
    const before = String(r.trans == null ? '' : r.trans);
    if (!before.trim()) continue;
    let cur = before;
    const notes = [];
    for (const rule of rules) {
      const res = rule.fn(cur, r.text);
      if (res && res[0] !== cur) { cur = res[0]; notes.push(`${rule.name}: ${res[1]}`); }
    }
    if (cur !== before) {
      touched++;
      changes.push({ file: path.relative(transRoot, f).split(path.sep).join('/'), id: r.id, name: r.name, text: r.text, before, after: cur, notes });
      r.trans = cur;
    }
  }
  if (touched && APPLY) fs.writeFileSync(f, JSON.stringify(j));
}
const byRule = {};
for (const c of changes) for (const n of c.notes) { const k = n.split(':')[0]; byRule[k] = (byRule[k] || 0) + 1; }
console.log(`=== 确定性清洗 ${APPLY ? '（已写入）' : '（试运行，未写入）'} ===`);
console.log('受影响翻译行:', changes.length);
console.log('按规则:', JSON.stringify(byRule, null, 1));
console.log('\n样例 8 条:');
for (const c of changes.slice(0, 8)) {
  console.log(`  [${c.file}#${c.id}] ${c.name}`);
  console.log(`    前: ${JSON.stringify(c.before).slice(0, 110)}`);
  console.log(`    后: ${JSON.stringify(c.after).slice(0, 110)}`);
  console.log(`    因: ${c.notes.join(' | ')}`);
}
fs.mkdirSync(path.join(root, 'exports'), { recursive: true });
const logPath = path.join(root, 'exports', APPLY ? 'translation-clean-applied.json' : 'translation-clean-preview.json');
fs.writeFileSync(logPath, JSON.stringify({ applied: APPLY, at: new Date().toISOString(), count: changes.length, byRule, changes }, null, 1));
console.log('\n明细写入', path.relative(root, logPath));
