// 从备份 zip 恢复 data/translations（用于在调整清洗规则后重放）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const zip = process.argv[2] || 'F:/sc/exports/translations-before-clean-2026-10-16.zip';
const dest = process.argv[3] || 'F:/sc/tmp/tr-restore';
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
execFileSync('C:/Windows/System32/tar.exe', ['-xf', zip, '-C', dest]);
const src = path.join(dest, 'translations');
if (!fs.existsSync(src)) { console.error('解压后未找到 translations 目录:', fs.readdirSync(dest).join(',')); process.exit(1); }
function walk(p) {
  return fs.readdirSync(p, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)]));
}
const files = walk(src);
const target = 'F:/sc/data/translations';
for (const f of files) {
  const rel = path.relative(src, f);
  const out = path.join(target, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(f, out);
}
console.log('已从备份恢复', files.length, '个翻译文件 →', target);
