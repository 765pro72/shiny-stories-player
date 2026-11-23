// 统一口径的翻译状态对账：把每一行分类，给出唯一权威数字
const fs = require('fs');
const path = require('path');
const root = 'F:/sc';
const KANA = /[\u3040-\u309f\u30a0-\u30ff]/;
const stat = {
  files: 0, rows: 0,
  done: 0,                 // 译文非空且与原文不同
  emptySymbol: 0,          // 译文空，原文是纯符号/标点/省略号（无需翻译）
  emptyNeed: 0,            // 译文空，原文含日文且非纯符号（真缺译）
  sameSymbol: 0,           // 译文=原文，原文纯符号（等价于已处理）
  sameName: 0,             // 译文=原文，原文是专有名词/中文可直读（含汉字、无假名）
  sameJp: 0,               // 译文=原文，原文含假名（真未译）
  kanaLeft: 0              // 译文非空、与原文不同，但译文里仍残留假名（待核）
};
const need = [], kanaLeft = [], sameJp = [];
const symbolOnly = (s) => s.replace(/[\s\u3000\u2026\u2027\u30fb\u2015\u2500-\u257f\uff01-\uff5e!-\/:-@\[-`{-~\u2190-\u21ff\u2600-\u27bf\u2b00-\u2bff\u3001\u3002\u300c\u300d\u300e\u300f\u3010\u3011\u301c\u301d\u301f\u30a0]/g, '') === '';
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.json')) {
      stat.files++;
      let j; try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return; }
      const rows = Array.isArray(j) ? j : j.rows || [];
      const rel = path.relative(path.join(root, 'data/translations'), p).split(path.sep).join('/');
      for (let i = 0; i < rows.length; i++) {
        stat.rows++;
        const r = rows[i] || {};
        const t = String(r.text == null ? '' : r.text);
        const tr = String(r.trans == null ? '' : r.trans);
        const sym = symbolOnly(t);
        if (!tr.trim()) {
          if (sym) stat.emptySymbol++;
          else if (KANA.test(t)) { stat.emptyNeed++; if (need.length < 4000) need.push({ f: rel, i, id: r.id, text: t }); }
          else stat.sameName++; // 原文是汉字/中文，空译文视作可直接阅读
        } else if (tr.trim() === t.trim()) {
          if (sym) stat.sameSymbol++;
          else if (KANA.test(t)) { stat.sameJp++; if (sameJp.length < 4000) sameJp.push({ f: rel, i, id: r.id, text: t }); }
          else stat.sameName++;
        } else {
          stat.done++;
          if (KANA.test(tr)) { stat.kanaLeft++; if (kanaLeft.length < 4000) kanaLeft.push({ f: rel, i, id: r.id, text: t, trans: tr }); }
        }
      }
    }
  }
}
walk(path.join(root, 'data/translations'));
fs.writeFileSync(path.join(root, 'translation-work/状态对账.json'), JSON.stringify({ at: new Date().toISOString(), stat, need, sameJp, kanaLeft }, null, 1));
const { need: _n, sameJp: _s, kanaLeft: _k, ...rest } = JSON.parse(fs.readFileSync(path.join(root, 'translation-work/状态对账.json'), 'utf8'));
console.log(JSON.stringify(rest.stat, null, 1));
console.log('真缺译(含日文且非纯符号、译文空):', need.length);
console.log('  ' + need.slice(0, 8).map((x) => x.f + '#' + x.i + ' ' + JSON.stringify(x.text).slice(0, 40)).join('\n  '));
console.log('译文=原文且含假名:', sameJp.length, sameJp.slice(0, 5).map((x) => x.f + '#' + x.i + ' ' + JSON.stringify(x.text).slice(0, 30)).join(' | '));
console.log('译文残留假名(待核):', kanaLeft.length, kanaLeft.slice(0, 5).map((x) => x.f + '#' + x.i + ' ' + JSON.stringify(x.trans).slice(0, 40)).join(' | '));
