'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { execFile } = require('child_process');

const MAX_ARCHIVE_BYTES = 600 * 1024 * 1024; // 600 MB safety cap
const MAX_ENTRIES = 60000;
const ASSET_PREFIXES = new Set(['json', 'images', 'sounds', 'movies', 'spine']);

function find7zBinary() {
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\7-Zip\\7z.exe',
      'C:\\Program Files (x86)\\7-Zip\\7z.exe',
      path.join(__dirname, 'tools', '7z.exe'),
      path.join(__dirname, 'tools', '7za.exe'),
      '7z.exe',
      '7za.exe'
    ];
    for (const c of candidates) {
      if (c.includes('\\') && fs.existsSync(c)) return { cmd: c, kind: '7z' };
    }
    // Windows 10/11 built-in bsdtar supports .7z and .zip natively
    const sysTar = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');
    if (fs.existsSync(sysTar)) return { cmd: sysTar, kind: 'tar' };
  }
  return null;
}

function normalizeEntryName(raw) {
  let s = String(raw || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!s || s.includes('\0')) return '';
  if (/^[a-zA-Z]:/.test(s)) return '';
  const parts = s.split('/').filter(Boolean);
  if (!parts.length || parts.some(p => p === '..' || p === '.')) return '';
  return parts.join('/');
}

function safeResolveUnder(rootDir, relPosix) {
  const rootAbs = path.resolve(rootDir);
  const full = path.resolve(rootAbs, ...relPosix.split('/'));
  if (full !== rootAbs && !full.startsWith(rootAbs + path.sep)) {
    throw new Error('压缩包包含非法路径：' + relPosix);
  }
  return full;
}

// Pure Node.js ZIP Central Directory reader (Store=0 & Deflate=8, zero external binaries -> works on Windows + Android!)
function parseZipEntries(buf) {
  const len = buf.length;
  if (len < 22) throw new Error('无效的 ZIP 压缩包');
  const minEocd = Math.max(0, len - 65557);
  let eocdPos = -1;
  for (let i = len - 22; i >= minEocd; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocdPos = i;
      break;
    }
  }
  if (eocdPos < 0) throw new Error('未找到 ZIP 目录尾记录，文件可能损坏或不是标准 ZIP');

  const totalEntries = buf.readUInt16LE(eocdPos + 10);
  const cdSize = buf.readUInt32LE(eocdPos + 12);
  const cdOffset = buf.readUInt32LE(eocdPos + 16);
  if (totalEntries === 0xffff || cdOffset === 0xffffffff) {
    throw new Error('暂不支持 ZIP64 超大归档，请拆分为普通 ZIP 更新包');
  }
  if (totalEntries > MAX_ENTRIES) throw new Error('压缩包内文件数量超过上限');
  if (cdOffset + cdSize > len) throw new Error('ZIP 中央目录越界，文件可能不完整');

  const entries = [];
  let ptr = cdOffset;
  const cdEnd = cdOffset + cdSize;
  while (ptr < cdEnd && entries.length < totalEntries) {
    if (ptr + 46 > len || buf.readUInt32LE(ptr) !== 0x02014b50) {
      throw new Error('ZIP 中央目录记录损坏');
    }
    const flags = buf.readUInt16LE(ptr + 8);
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const uncompSize = buf.readUInt32LE(ptr + 24);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOffset = buf.readUInt32LE(ptr + 42);
    const nameBuf = buf.subarray(ptr + 46, ptr + 46 + nameLen);
    const rawName = (flags & 0x0800) ? nameBuf.toString('utf8') : nameBuf.toString('utf8');
    const isDir = rawName.endsWith('/') || rawName.endsWith('\\');
    ptr += 46 + nameLen + extraLen + commentLen;
    if (isDir) continue;
    const norm = normalizeEntryName(rawName);
    if (!norm) continue;
    entries.push({ name: norm, method, compSize, uncompSize, localOffset });
  }
  return entries;
}

function readZipEntryData(buf, entry) {
  const off = entry.localOffset;
  if (off + 30 > buf.length || buf.readUInt32LE(off) !== 0x04034b50) {
    throw new Error('ZIP 本地文件头损坏：' + entry.name);
  }
  const nameLen = buf.readUInt16LE(off + 26);
  const extraLen = buf.readUInt16LE(off + 28);
  const dataStart = off + 30 + nameLen + extraLen;
  const dataEnd = dataStart + entry.compSize;
  if (dataEnd > buf.length) throw new Error('ZIP 数据区截断：' + entry.name);
  const slice = buf.subarray(dataStart, dataEnd);
  if (entry.method === 0) return slice;
  if (entry.method === 8) return zlib.inflateRawSync(slice);
  throw new Error(`不支持的 ZIP 压缩算法 (${entry.method})：${entry.name}`);
}

function extract7zToTemp(archiveFile, outDir) {
  return new Promise((resolve, reject) => {
    const tool = find7zBinary();
    if (!tool) {
      return reject(new Error('当前设备暂不支持直接解压 .7z（手机端请使用 .zip 压缩包；电脑端安装 7-Zip 或使用 Windows 11 自带 tar 即可支持 .7z）'));
    }
    fs.mkdirSync(outDir, { recursive: true });
    const args = tool.kind === '7z'
      ? ['x', '-y', `-o${outDir}`, archiveFile]
      : ['-xf', archiveFile, '-C', outDir];
    execFile(tool.cmd, args, { maxBuffer: 16 * 1024 * 1024, timeout: 180000 }, (err, _stdout, stderr) => {
      if (err) {
        return reject(new Error('解压 7z 失败：' + (String(stderr || err.message || '').trim().slice(0, 180))));
      }
      resolve();
    });
  });
}

function walkDirRelative(rootDir, prefix = '') {
  const out = [];
  for (const ent of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${ent.name}` : ent.name;
    const full = path.join(rootDir, ent.name);
    if (ent.isDirectory()) out.push(...walkDirRelative(full, rel));
    else if (ent.isFile()) out.push({ name: normalizeEntryName(rel), full });
  }
  return out;
}

// Strip wrapper folders like `ShinyStories-Lite-win32-x64/resources/app/` or a single top-level release folder
function detectRootPrefix(names) {
  if (!names.length) return '';
  // 1. Check if entries live inside `.../resources/app/`
  const resAppHits = names.filter(n => /(?:^|\/)resources\/app\/(?:public|data|cache)\//i.test(n));
  if (resAppHits.length > 0) {
    const m = resAppHits[0].match(/^(.*?resources\/app\/)/i);
    if (m) return m[1];
  }
  // 2. If every entry shares one single top-level wrapper folder that isn't itself a known root
  const knownTop = new Set(['public', 'data', 'cache', 'mahjong-voices', ...ASSET_PREFIXES]);
  const firstSegs = new Set(names.map(n => n.split('/')[0]));
  if (firstSegs.size === 1) {
    const only = [...firstSegs][0];
    if (!knownTop.has(only.toLowerCase()) && names.every(n => n.includes('/'))) {
      return only + '/';
    }
  }
  return '';
}

function classifyRelativePath(rel) {
  if (!rel) return null;
  const lower = rel.toLowerCase();
  if (lower.startsWith('public/')) {
    const sub = rel.slice(7);
    return sub ? { target: 'public', sub } : null;
  }
  if (lower.startsWith('data/')) {
    const sub = rel.slice(5);
    return sub ? { target: 'data', sub } : null;
  }
  if (lower.startsWith('cache/')) {
    const sub = rel.slice(6);
    return sub ? { target: 'cache', sub } : null;
  }
  if (lower.startsWith('mahjong-voices/')) {
    const sub = rel.slice(15);
    return sub ? { target: 'voices', sub } : null;
  }
  const first = lower.split('/')[0];
  if (ASSET_PREFIXES.has(first)) {
    return { target: 'cache', sub: rel };
  }
  if (/\.(cjs|exe|dll|pak|asar)$/i.test(lower)) {
    return { target: 'skippedCore', sub: rel };
  }
  return null;
}

function createArchiveUpdateService({ overrideRoot, cacheRoot, userRoot, onApplied }) {
  const publicOverrideDir = path.join(overrideRoot, 'public');
  const dataOverrideDir = path.join(overrideRoot, 'data');
  const voicesDir = path.join(userRoot, 'mahjong-voices');
  const metaFile = path.join(overrideRoot, 'meta.json');

  function readMeta() {
    try {
      if (fs.existsSync(metaFile)) return JSON.parse(fs.readFileSync(metaFile, 'utf8'));
    } catch {}
    return null;
  }

  function resolvePublic(relKey) {
    try {
      if (!fs.existsSync(publicOverrideDir)) return null;
      const fp = safeResolveUnder(publicOverrideDir, normalizeEntryName(relKey));
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return fp;
    } catch {}
    return null;
  }

  function resolveData(relKey) {
    try {
      if (!fs.existsSync(dataOverrideDir)) return null;
      const fp = safeResolveUnder(dataOverrideDir, normalizeEntryName(relKey));
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return fp;
    } catch {}
    return null;
  }

  function writeTargetFile(cls, dataOrSrcPath, isPath) {
    let baseDir = null;
    if (cls.target === 'public') baseDir = publicOverrideDir;
    else if (cls.target === 'data') baseDir = dataOverrideDir;
    else if (cls.target === 'cache') baseDir = cacheRoot;
    else if (cls.target === 'voices') baseDir = voicesDir;
    else return false;

    const dest = safeResolveUnder(baseDir, cls.sub);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (isPath) fs.copyFileSync(dataOrSrcPath, dest);
    else fs.writeFileSync(dest, dataOrSrcPath);
    return true;
  }

  async function applyArchiveFile(archivePath, origFilename) {
    const ext = path.extname(origFilename || '').toLowerCase();
    const counts = { public: 0, data: 0, cache: 0, voices: 0, skippedCore: 0, total: 0 };
    const tmpExtract = path.join(overrideRoot, '.extract-' + crypto.randomUUID());

    try {
      const head = Buffer.alloc(6);
      const fd = fs.openSync(archivePath, 'r');
      try { fs.readSync(fd, head, 0, 6, 0); } finally { fs.closeSync(fd); }

      const isZipMagic = head[0] === 0x50 && head[1] === 0x4b;
      const is7zMagic = head[0] === 0x37 && head[1] === 0x7a && head[2] === 0xbc && head[3] === 0xaf && head[4] === 0x27 && head[5] === 0x1c;

      if (isZipMagic || (!is7zMagic && ext === '.zip')) {
        const buf = fs.readFileSync(archivePath);
        const entries = parseZipEntries(buf);
        const prefix = detectRootPrefix(entries.map(e => e.name));
        for (const ent of entries) {
          const stripped = prefix && ent.name.startsWith(prefix) ? ent.name.slice(prefix.length) : ent.name;
          const cls = classifyRelativePath(stripped);
          if (!cls) continue;
          if (cls.target === 'skippedCore') {
            counts.skippedCore++;
            continue;
          }
          const fileBuf = readZipEntryData(buf, ent);
          if (writeTargetFile(cls, fileBuf, false)) {
            counts[cls.target]++;
            counts.total++;
          }
        }
      } else if (is7zMagic || ext === '.7z') {
        await extract7zToTemp(archivePath, tmpExtract);
        const files = walkDirRelative(tmpExtract).filter(x => x.name);
        const prefix = detectRootPrefix(files.map(f => f.name));
        for (const f of files) {
          const stripped = prefix && f.name.startsWith(prefix) ? f.name.slice(prefix.length) : f.name;
          const cls = classifyRelativePath(stripped);
          if (!cls) continue;
          if (cls.target === 'skippedCore') {
            counts.skippedCore++;
            continue;
          }
          if (writeTargetFile(cls, f.full, true)) {
            counts[cls.target]++;
            counts.total++;
          }
        }
      } else {
        throw new Error('仅支持 .zip 或 .7z 格式的更新压缩包');
      }

      if (counts.total === 0) {
        throw new Error('压缩包内未识别到可更新的目录（需包含 public / data / cache / resources/app 或素材目录）');
      }

      fs.mkdirSync(overrideRoot, { recursive: true });
      const meta = {
        filename: String(origFilename || 'update.zip'),
        appliedAt: new Date().toISOString(),
        counts
      };
      fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
      try { onApplied?.(meta); } catch {}
      return meta;
    } finally {
      try { fs.rmSync(tmpExtract, { recursive: true, force: true }); } catch {}
    }
  }

  function resetOverrides() {
    for (const target of [publicOverrideDir, dataOverrideDir, metaFile]) {
      try { fs.rmSync(target, { recursive: true, force: true }); } catch {}
    }
    try { onApplied?.(null); } catch {}
  }

  async function handler(req, res, u) {
    const p = decodeURIComponent(u.pathname);
    if (!p.startsWith('/api/archive-update/')) return false;

    const send = (status, body) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(JSON.stringify(body));
    };

    if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) {
      send(403, { ok: false, error: 'Forbidden origin' });
      return true;
    }

    const action = p.slice('/api/archive-update/'.length);
    if (action === 'status' && (req.method === 'GET' || req.method === 'HEAD')) {
      send(200, {
        ok: true,
        active: readMeta(),
        supports7z: !!find7zBinary(),
        platform: process.platform
      });
      return true;
    }

    if (action === 'reset' && req.method === 'POST') {
      resetOverrides();
      send(200, { ok: true, active: null });
      return true;
    }

    if (action === 'apply' && req.method === 'POST') {
      const origName = u.searchParams.get('name') || 'update.zip';
      fs.mkdirSync(overrideRoot, { recursive: true });
      const incoming = path.join(overrideRoot, `.incoming-${crypto.randomUUID()}.tmp`);
      const ws = fs.createWriteStream(incoming);
      let size = 0;
      try {
        for await (const chunk of req) {
          size += chunk.length;
          if (size > MAX_ARCHIVE_BYTES) {
            throw new Error('压缩包体积超过 600MB 上限');
          }
          if (!ws.write(chunk)) {
            await new Promise(r => ws.once('drain', r));
          }
        }
        await new Promise((resolve, reject) => {
          ws.on('error', reject);
          ws.end(resolve);
        });
        if (size < 22) throw new Error('上传文件为空或过小');
        const meta = await applyArchiveFile(incoming, origName);
        send(200, { ok: true, active: meta });
      } catch (e) {
        try { ws.destroy(); } catch {}
        send(400, { ok: false, error: e?.message || '压缩包更新失败' });
      } finally {
        try { fs.rmSync(incoming, { force: true }); } catch {}
      }
      return true;
    }

    send(404, { ok: false, error: 'Unknown archive-update endpoint' });
    return true;
  }

  return { handler, resolvePublic, resolveData, readMeta, resetOverrides };
}

module.exports = { createArchiveUpdateService };
