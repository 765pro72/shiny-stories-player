const fs = require('fs'), path = require('path');
const base = path.resolve(__dirname, '..');

const yuikaFixed = [];
const rinzeFixed = [];
const changelog = [];

function fixPtan(trans, orig) {
  let s = trans;
  // Replace P亲, 小P, P大人
  s = s.replace(/P亲/g, 'P碳');
  s = s.replace(/小P/g, 'P碳');
  s = s.replace(/P大人/g, 'P碳');
  s = s.replace(/制作人/g, 'P碳');
  // Standalone P followed by punctuation or at line start
  s = s.replace(/(^|[\s，,。！？!?\n\r、—…])P([，,。！？!?\n\r、—…\s]|$)/g, '$1P碳$2');
  return s;
}

function fixSama(trans) {
  let s = trans;
  s = s.replace(/制作人阁下/g, '制作人大人');
  s = s.replace(/制作人殿下/g, '制作人大人');
  s = s.replace(/制作人先生/g, '制作人大人');
  s = s.replace(/制作人(?!大人)/g, '制作人大人');
  return s;
}

function walk(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) {
      walk(full);
    } else if (f.name.endsWith('.json')) {
      try {
        const raw = fs.readFileSync(full, 'utf8');
        const d = JSON.parse(raw);
        const rows = d.rows || d;
        if (!Array.isArray(rows)) continue;

        let mod = false;
        rows.forEach((r, idx) => {
          const orig = r.text || r.original || '';
          let trans = r.trans || r.translation || '';
          const speaker = r.name || r.speaker || '';

          // 1. Mitsumine Yuika: P-tan -> P碳
          if ((orig.includes('Pたん') || orig.includes('Ｐたん')) && !trans.includes('P碳') && !trans.includes('P炭')) {
            const next = fixPtan(trans, orig);
            if (next !== trans) {
              const rel = path.relative(path.join(base, 'data/translations'), full).replace(/\\/g, '/');
              yuikaFixed.push({ file: rel, idx, speaker, orig, before: trans, after: next });
              if (r.trans !== undefined) r.trans = next;
              if (r.translation !== undefined) r.translation = next;
              changelog.push({
                at: new Date().toISOString(),
                type: 'idol-address-ptan',
                file: rel,
                row: idx,
                speaker: speaker || '結華',
                original: orig,
                before: trans,
                after: next,
                author: '接手 AI 偶像专属称呼润色（三峰结华「P碳」标准译名规范）'
              });
              mod = true;
            }
          }

          // 2. Morino Rinze & Yukoku Kiriko: プロデューサーさま -> 制作人大人
          if ((speaker.includes('凛世') || speaker.includes('霧子') || speaker.includes('雾子')) && (orig.includes('プロデューサーさま') || orig.includes('プロデューサー様'))) {
            if (trans.includes('制作人阁下') || trans.includes('制作人殿下') || trans.includes('制作人先生') || (trans.includes('制作人') && !trans.includes('制作人大人'))) {
              const next = fixSama(trans);
              if (next !== trans) {
                const rel = path.relative(path.join(base, 'data/translations'), full).replace(/\\/g, '/');
                rinzeFixed.push({ file: rel, idx, speaker, orig, before: trans, after: next });
                if (r.trans !== undefined) r.trans = next;
                if (r.translation !== undefined) r.translation = next;
                changelog.push({
                  at: new Date().toISOString(),
                  type: 'idol-address-sama',
                  file: rel,
                  row: idx,
                  speaker,
                  original: orig,
                  before: trans,
                  after: next,
                  author: '接手 AI 偶像专属称呼润色（凛世/雾子「制作人大人」敬称规范）'
                });
                mod = true;
              }
            }
          }
        });

        if (mod) {
          fs.writeFileSync(full, JSON.stringify(d, null, 2), 'utf8');
        }
      } catch (err) {}
    }
  }
}

walk(path.join(base, 'data/translations'));

console.log('Yuika P-tan fixed rows:', yuikaFixed.length);
console.log('Rinze/Kiriko Producer-sama fixed rows:', rinzeFixed.length);
console.log('Total fixed rows:', yuikaFixed.length + rinzeFixed.length);

// Append to translation-work/翻译变更日志.jsonl
if (changelog.length > 0) {
  const logPath = path.join(base, 'translation-work/翻译变更日志.jsonl');
  const lines = changelog.map(c => JSON.stringify(c)).join('\n') + '\n';
  fs.appendFileSync(logPath, lines, 'utf8');
  console.log('Successfully recorded changelog rows:', changelog.length);
}
