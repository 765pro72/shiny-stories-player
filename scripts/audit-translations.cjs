// 已有汉化质量审计（只做确定性检查，不改动任何文件）
// 产出：exports/translation-audit.json + 控制台汇总
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const transRoot = path.join(root, 'data/translations');
const outDir = path.join(root, 'exports');
fs.mkdirSync(outDir, { recursive: true });

function walk(p) {
  return fs.readdirSync(p, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)]));
}

// 假名：平假名 + 片假名（含半角片假名）
const KANA = /[\u3041-\u309F\u30A0-\u30FF\uFF66-\uFF9D]/;
// 日文汉字专用字（中文一般不用的字形）
const JP_KANJI = /[々〆ヶ〇〻濔瀨籔雫颪鳶哺燵]/;
// 常见专有名词：日文写法 → 中文标准译名
const NAME_JP2ZH = {
  櫻木真乃: '樱木真乃', 風野灯織: '风野灯织', 八宮めぐる: '八宫巡', 月岡恋鐘: '月冈恋钟',
  田中摩美々: '田中摩美美', 白瀬咲耶: '白濑咲耶', 三峰結華: '三峰结华', 幽谷霧子: '幽谷雾子',
  小宮果穂: '小宫果穗', 園田智代子: '园田智代子', 西城樹里: '西城树里', 杜野凛世: '杜野凛世',
  有栖川夏葉: '有栖川夏叶', 大崎甘奈: '大崎甘奈', 大崎甜花: '大崎甜花', 桑山千雪: '桑山千雪',
  芹沢あさひ: '芹泽朝日', 黛冬優子: '黛冬优子', 和泉愛依: '和泉爱依', 浅倉透: '浅仓透',
  樋口円香: '樋口圆香', 福丸小糸: '福丸小糸', 市川雛菜: '市川雏菜', 七草にちか: '七草日花',
  緋田美琴: '绯田美琴', 斑鳩ルカ: '斑鸠路加', 鈴木羽那: '铃木羽那', 郁田はるき: '郁田春希',
  プロデューサー: '制作人',
};
// 中文译文里不该出现的日文写法（应改用中文译名）
const BAD_NAME = [
  [/櫻木真乃/g, '樱木真乃'], [/風野灯織/g, '风野灯织'], [/八宮めぐる/g, '八宫巡'], [/月岡恋鐘/g, '月冈恋钟'],
  [/田中摩美々/g, '田中摩美美'], [/白瀬咲耶/g, '白濑咲耶'], [/三峰結華/g, '三峰结华'], [/幽谷霧子/g, '幽谷雾子'],
  [/小宮果穂/g, '小宫果穗'], [/園田智代子/g, '园田智代子'], [/西城樹里/g, '西城树里'], [/杜野凛世/g, '杜野凛世'],
  [/有栖川夏葉/g, '有栖川夏叶'], [/芹沢あさひ/g, '芹泽朝日'], [/黛冬優子/g, '黛冬优子'], [/和泉愛依/g, '和泉爱依'],
  [/浅倉透/g, '浅仓透'], [/樋口円香/g, '樋口圆香'], [/市川雛菜/g, '市川雏菜'], [/七草にちか/g, '七草日花'],
  [/緋田美琴/g, '绯田美琴'], [/斑鳩ルカ/g, '斑鸠路加'], [/鈴木羽那/g, '铃木羽那'], [/郁田はるき/g, '郁田春希'],
];
// 机翻腔/病句线索
const AWKWARD = [
  [/的的/g, '重复「的」'], [/了了/g, '重复「了」'], [/是是/g, '重复「是」'],
  [/非常地/g, '「非常地」生硬'], [/地进行/g, '「地进行」翻译腔'], [/被进行/g, '「被进行」翻译腔'],
  [/作为.{0,6}来说/g, '「作为…来说」翻译腔'], [/的事情/g, '「的事情」冗余'],
  [/我会加油的/g, '可选：语气偏生硬'], [/请多指教/g, '可选：建议「请多关照」'],
];

const files = walk(transRoot).filter((f) => f.endsWith('.json'));
const issues = { kanaLeft: [], nameJp: [], lineCount: [], emptyTrans: [], untranslatedText: [], placeholder: [], repeated: [], awkward: [], lineMismatch: [], shortTrans: [] };
let stat = { files: 0, rows: 0, translated: 0, untranslated: 0, filesWithIssues: 0 };

const splitLines = (s) => String(s == null ? '' : s).replace(/\\n/g, '\n').split('\n');
const isSymbolOnly = (s) => !/[\u4e00-\u9fff\u3041-\u309F\u30A0-\u30FFA-Za-z0-9]/.test(s);

for (const f of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  const rows = Array.isArray(j) ? j : j.rows || [];
  const key = path.relative(transRoot, f).split(path.sep).join('/');
  stat.files++;
  let fileIssues = 0;
  rows.forEach((r, i) => {
    stat.rows++;
    const text = r.text == null ? '' : String(r.text);
    const trans = r.trans == null ? '' : String(r.trans);
    const push = (bucket, extra) => { issues[bucket].push({ key, translator: j.translator || '', index: i, id: r.id, name: r.name, text, trans, ...extra }); fileIssues++; };
    if (trans.trim()) stat.translated++; else stat.untranslated++;

    // 1) 译文里残留假名
    if (trans.trim() && KANA.test(trans)) push('kanaLeft', { note: (trans.match(/[\u3041-\u309F\u30A0-\u30FF\uFF66-\uFF9D]+/g) || []).join(' | ') });
    // 2) 译文里残留日文汉字写法
    for (const [re, should] of BAD_NAME) if (re.test(trans)) { push('nameJp', { note: `建议改为 ${should}` }); break; }
    // 3) 空译文但有原文
    if (!trans.trim() && text.trim() && !isSymbolOnly(text)) push('emptyTrans', {});
    // 4) 原文未翻译（中译=日文原文）
    if (trans.trim() && trans.trim() === text.trim()) push('untranslatedText', {});
    // 5) 行数不一致
    const tl = splitLines(text), rl = splitLines(trans);
    if (trans.trim() && tl.length !== rl.length) push('lineCount', { note: `原文 ${tl.length} 行 / 译文 ${rl.length} 行` });
    // 6) 占位符/特殊标记丢失
    const marks = (s) => (String(s).match(/[「」『』【】〈〉《》♪☆★…—─]/g) || []).join('');
    if (trans.trim()) {
      const mt = marks(text), mr = marks(trans);
      if (mt && !mr) push('placeholder', { note: `原文标记 ${mt} 未在译文中出现` });
    }
    // 7) 同一文件内译文重复（原文不同却译得一模一样）
    if (trans.trim().length > 3) {
      const dup = rows.findIndex((o, k) => k < i && String(o.trans || '').trim() === trans.trim() && String(o.text || '').trim() !== text.trim());
      if (dup >= 0) push('repeated', { note: `与第 ${dup + 1} 行译文完全相同` });
    }
    // 8) 机翻腔线索
    if (trans.trim()) for (const [re, note] of AWKWARD) if (re.test(trans)) { push('awkward', { note }); break; }
    // 9) 译文过短（原文较长而译文只有 1 字）
    if (text.replace(/\s/g, '').length >= 12 && trans.trim().length === 1) push('shortTrans', {});
  });
  if (fileIssues) stat.filesWithIssues++;
}
stat.filesWithIssues;

const summary = { builtAt: new Date().toISOString(), stat, counts: Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, v.length])) };
fs.writeFileSync(path.join(outDir, 'translation-audit.json'), JSON.stringify({ summary, issues }, null, 1));
console.log('=== 翻译质量审计（确定性检查）===');
console.log(JSON.stringify(stat, null, 1));
console.log('问题计数:', JSON.stringify(summary.counts, null, 1));
for (const [k, v] of Object.entries(issues)) {
  if (!v.length) continue;
  console.log(`\n--- ${k} (${v.length}) 例 3 ---`);
  for (const x of v.slice(0, 3)) console.log(`  [${x.key}#${x.index}] ${x.name || ''} ${JSON.stringify(x.text).slice(0, 60)} → ${JSON.stringify(x.trans).slice(0, 60)} ${x.note ? '// ' + x.note : ''}`);
}
