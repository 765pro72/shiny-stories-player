const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SRC = path.resolve(__dirname, '..', 'dist', 'ShinyStories-4K-Pack.7z');
const OUT_DIR = path.resolve(__dirname, '..', 'dist', 'ShinyStories-4K-Pack-QQ分卷');
const CHUNK_SIZE = 8500 * 1000 * 1000; // 8.5 GB (< 10 GB QQ file limit)
const SEVEN_ZIP = ['C:\\Program Files\\7-Zip\\7z.exe', 'C:\\Program Files (x86)\\7-Zip\\7z.exe'].find(p => fs.existsSync(p));

if (!fs.existsSync(SRC)) {
  throw new Error('Missing 4K pack: ' + SRC);
}

const total = fs.statSync(SRC).size;
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const old of fs.readdirSync(OUT_DIR)) {
  if (/^ShinyStories-4K-Pack\.7z\.\d{3}$/i.test(old)) {
    fs.unlinkSync(path.join(OUT_DIR, old));
  }
}

const fd = fs.openSync(SRC, 'r');
const buf = Buffer.allocUnsafe(16 * 1024 * 1024);
let offset = 0;
let part = 1;
const parts = [];

try {
  while (offset < total) {
    const partName = `ShinyStories-4K-Pack.7z.${String(part).padStart(3, '0')}`;
    const partPath = path.join(OUT_DIR, partName);
    const outFd = fs.openSync(partPath, 'w');
    let written = 0;
    try {
      while (written < CHUNK_SIZE && offset < total) {
        const toRead = Math.min(buf.length, CHUNK_SIZE - written, total - offset);
        const n = fs.readSync(fd, buf, 0, toRead, offset);
        if (n <= 0) break;
        fs.writeSync(outFd, buf, 0, n);
        written += n;
        offset += n;
      }
    } finally {
      fs.closeSync(outFd);
    }
    console.log(`Part ${part}: ${partName} (${(written / 1024 / 1024 / 1024).toFixed(2)} GiB)`);
    parts.push({ name: partName, bytes: written });
    part++;
  }
} finally {
  fs.closeSync(fd);
}

const readme = [
  '=== 闪耀色彩 4K 超清画质包 · QQ 分卷传输版（每卷约 7.9 GiB） ===',
  '',
  '使用说明：',
  '1. 请将本文件夹内的全部分卷下载到电脑的同一个文件夹中：',
  ...parts.map(p => `   - ${p.name} (${(p.bytes / 1024 / 1024 / 1024).toFixed(2)} GiB)`),
  '2. 打开播放器「看板设置 -> 4K 超清画质包 -> 📦 一键加载 4K 包（支持分卷全选）」',
  '3. 全选这几个分卷文件（或选中 .7z.001），即可直接在播放器内全自动合卷解压并启用！'
].join('\r\n') + '\r\n';
fs.writeFileSync(path.join(OUT_DIR, '分卷使用说明.txt'), readme, 'utf8');

if (SEVEN_ZIP) {
  const firstVol = path.join(OUT_DIR, parts[0].name);
  console.log('Verifying split archive integrity header/listing with 7-Zip...');
  execFileSync(SEVEN_ZIP, ['l', firstVol], { stdio: 'inherit' });
}
