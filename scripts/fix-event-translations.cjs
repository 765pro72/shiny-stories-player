const fs = require('fs');
const path = require('path');

const logPath = 'translation-work/翻译变更日志.jsonl';
const now = new Date().toISOString();

function appendLog(file, key, before, after, reason) {
  const line = JSON.stringify({
    timestamp: now,
    author: 'AI (m00944 authorized)',
    file,
    key,
    before,
    after,
    reason
  }) + '\n';
  fs.appendFileSync(logPath, line, 'utf8');
}

const transJsonPath = 'data/translations.json';
const d = JSON.parse(fs.readFileSync(transJsonPath, 'utf8'));

let fixedInMap = 0;
let fixedInFiles = 0;

for (const [fileKey, fileData] of Object.entries(d)) {
  if (!fileData || !Array.isArray(fileData.rows)) continue;
  let fileChanged = false;

  for (const r of fileData.rows) {
    if (!r.trans) continue;
    const orig = r.trans;
    let fixed = orig;

    // 1. Yuika P-tan: Ｐたん / Pたん -> P碳 / P炭
    if (r.name && (r.name.includes('結華') || r.name.includes('结华'))) {
      if (r.text && (r.text.includes('Pたん') || r.text.includes('Ｐたん'))) {
        fixed = fixed.replace(/小P/g, 'P碳').replace(/P亲/g, 'P碳');
      }
    }

    // 2. Rinze / Kiriko: プロデューサーさま / プロデューサー様 -> 制作人大人
    if (r.name && (r.name.includes('凛世') || r.name.includes('霧子') || r.name.includes('雾子'))) {
      if (r.text && (r.text.includes('プロデューサーさま') || r.text.includes('プロデューサー様') || r.text.includes('プロデューサーさん'))) {
        fixed = fixed.replace(/制作人阁下/g, '制作人大人').replace(/制作人殿下/g, '制作人大人');
      }
    } else if (r.text && (r.text.includes('プロデューサーさま') || r.text.includes('プロデューサー様'))) {
      fixed = fixed.replace(/制作人阁下/g, '制作人大人').replace(/制作人殿下/g, '制作人大人');
    }

    // 3. Chiyoko-senpai: ちょこ先輩 -> 智代子前辈
    if (r.text && r.text.includes('ちょこ先輩')) {
      fixed = fixed.replace(/巧克力前辈/g, '智代子前辈');
    }

    if (fixed !== orig) {
      r.trans = fixed;
      fileChanged = true;
      fixedInMap++;
      appendLog('data/translations.json', `${fileKey}:${r.id}`, orig, fixed, '早期机翻人名称谓校正');
    }
  }

  // Also update individual file under data/translations/ if it exists
  const diskPath = path.join('data/translations', fileKey);
  if (fileChanged && fs.existsSync(diskPath)) {
    try {
      const diskData = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
      if (Array.isArray(diskData.rows)) {
        for (const dr of diskData.rows) {
          const match = fileData.rows.find(fr => fr.id === dr.id);
          if (match) dr.trans = match.trans;
        }
        fs.writeFileSync(diskPath, JSON.stringify(diskData, null, 2), 'utf8');
        fixedInFiles++;
      }
    } catch {}
  }
}

fs.writeFileSync(transJsonPath, JSON.stringify(d, null, 2), 'utf8');
console.log(`Successfully fixed ${fixedInMap} lines in data/translations.json across ${fixedInFiles} event files!`);
