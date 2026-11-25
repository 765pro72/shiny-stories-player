const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const SEVEN_ZIP_CANDIDATES = [
  'C:\\Program Files\\7-Zip\\7z.exe',
  'C:\\Program Files (x86)\\7-Zip\\7z.exe'
];

function resolveArchiveInput(archiveInput) {
  const inputs = (Array.isArray(archiveInput) ? archiveInput : [archiveInput])
    .filter(p => typeof p === 'string' && p.trim())
    .map(p => p.trim());
  if (!inputs.length) throw new Error('未选择 4K 压缩包文件');
  for (const p of inputs) {
    if (!fs.existsSync(p)) throw new Error('所选 4K 压缩包不存在：' + p);
  }
  const dirs = new Set(inputs.map(p => path.dirname(path.resolve(p))));
  if (dirs.size > 1) {
    throw new Error('分卷压缩包必须位于同一个文件夹内，请一起选择同目录下的分卷文件');
  }
  const dir = path.dirname(path.resolve(inputs[0]));
  const firstCandidate = inputs.slice().sort()[0];
  const baseName = path.basename(firstCandidate);

  const numMatch = baseName.match(/^(.+)\.(\d{3})$/i);
  if (numMatch) {
    const stem = numMatch[1];
    const siblings = fs.readdirSync(dir)
      .filter(f => f.startsWith(stem + '.') && /^\d{3}$/.test(f.slice(stem.length + 1)))
      .sort();
    const first = siblings[0];
    if (!first || !first.endsWith('.001')) {
      throw new Error(`未找到起始分卷「${stem}.001」，请确认所有分卷已下载到同一文件夹`);
    }
    const maxNum = Number(siblings[siblings.length - 1].slice(stem.length + 1));
    for (let i = 1; i <= maxNum; i++) {
      const expected = `${stem}.${String(i).padStart(3, '0')}`;
      if (!fs.existsSync(path.join(dir, expected))) {
        throw new Error(`分卷不完整：缺少 ${expected}（共需 ${String(maxNum).padStart(3, '0')} 个分卷）`);
      }
    }
    return {
      entryPath: path.join(dir, first),
      displayName: `${first}（共 ${siblings.length} 个分卷）`,
      volumeCount: siblings.length,
      isSplit: true
    };
  }

  const zipSplitMatch = baseName.match(/^(.+)\.z\d{2,}$/i);
  if (zipSplitMatch) {
    const zipEntry = path.join(dir, zipSplitMatch[1] + '.zip');
    if (!fs.existsSync(zipEntry)) {
      throw new Error(`未找到主压缩包「${zipSplitMatch[1]}.zip」，请确认全部分卷在同一文件夹内`);
    }
    return {
      entryPath: zipEntry,
      displayName: `${path.basename(zipEntry)}（分卷）`,
      volumeCount: inputs.length,
      isSplit: true
    };
  }

  return {
    entryPath: inputs[0],
    displayName: path.basename(inputs[0]),
    volumeCount: 1,
    isSplit: false
  };
}

function safeJoin(root, rel) {
  const full = path.resolve(root, rel);
  const normRoot = path.resolve(root);
  if (full !== normRoot && !full.startsWith(normRoot + path.sep)) return null;
  return full;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > 1024 * 1024) {
        req.destroy();
        reject(new Error('Body too large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function inspectDir(dir) {
  if (!dir || !fs.existsSync(dir)) return null;
  let root = dir;
  if (!fs.existsSync(path.join(root, 'images')) && !fs.existsSync(path.join(root, 'spine')) && fs.existsSync(path.join(root, 'cache-4k'))) {
    root = path.join(root, 'cache-4k');
  }
  const hasImages = fs.existsSync(path.join(root, 'images'));
  const hasSpine = fs.existsSync(path.join(root, 'spine'));
  const hasMovies = fs.existsSync(path.join(root, 'movies'));
  if (!hasImages && !hasSpine && !hasMovies) return null;
  return { root, hasImages, hasSpine, hasMovies };
}

function normalizeSpineAtlas(txt) {
  return String(txt || '')
    .replace(/(size:\s*\d+\s*,\s*\d+)\s*(format:|filter:|repeat:|pma:)/g, '$1\n$2')
    .replace(/([^\r\n \t])[ \t]+(?=(?:xy|size|orig|offset|offsets|bounds|rotate|index|split|pad):\s)/g, '$1\n  ');
}

function createPack4kService({ base, userDir, onChange = () => {} }) {
  const cfgFile = path.join(userDir, 'pack-4k.json');
  const defaultExtractDir = path.join(userDir, 'cache-4k');

  function loadCfg() {
    try {
      const raw = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
      return {
        enabled: raw.enabled !== false,
        customDir: typeof raw.customDir === 'string' ? raw.customDir : '',
        loadedAt: typeof raw.loadedAt === 'string' ? raw.loadedAt : '',
        source: typeof raw.source === 'string' ? raw.source : ''
      };
    } catch {
      return { enabled: true, customDir: '', loadedAt: '', source: '' };
    }
  }

  let cfg = loadCfg();

  function saveCfg() {
    fs.mkdirSync(path.dirname(cfgFile), { recursive: true });
    fs.writeFileSync(cfgFile + '.tmp', JSON.stringify(cfg, null, 2), 'utf8');
    fs.renameSync(cfgFile + '.tmp', cfgFile);
  }

  function candidateDirs() {
    const raw = [cfg.customDir, defaultExtractDir, path.join(base, 'cache-4k')].filter(Boolean);
    const seen = new Set();
    const out = [];
    for (const d of raw) {
      const info = inspectDir(d);
      if (info && !seen.has(info.root)) {
        seen.add(info.root);
        out.push(info);
      }
    }
    return out;
  }

  function getStatus() {
    const dirs = candidateDirs();
    const active = dirs[0] || null;
    return {
      ok: true,
      installed: Boolean(active),
      enabled: Boolean(active) && cfg.enabled !== false,
      activeDir: active ? active.root : '',
      hasImages: Boolean(active?.hasImages),
      hasSpine: Boolean(active?.hasSpine),
      hasMovies: Boolean(active?.hasMovies),
      loadedAt: cfg.loadedAt || '',
      source: cfg.source || (active ? path.basename(active.root) : ''),
      defaultExtractDir
    };
  }

  function resolve4kAsset(key) {
    if (process.env.SHINY_DISABLE_SR === '1') return null;
    if (!cfg.enabled) return null;
    for (const info of candidateDirs()) {
      const fp = safeJoin(info.root, key);
      if (fp && fs.existsSync(fp)) return fp;
    }
    return null;
  }

  function setEnabled(flag) {
    cfg.enabled = Boolean(flag);
    saveCfg();
    onChange();
    return getStatus();
  }

  function setCustomDir(dir, source) {
    const info = inspectDir(dir);
    if (!info) {
      return { ok: false, error: '所选目录中未检测到 4K 素材（需包含 images 或 spine 文件夹）' };
    }
    cfg.customDir = info.root;
    cfg.enabled = true; // 加载后默认开启 4K
    cfg.loadedAt = new Date().toISOString();
    cfg.source = source || path.basename(info.root);
    saveCfg();
    onChange();
    return getStatus();
  }

  async function extractArchive(archiveInput, onProgress = () => {}) {
    const resolved = resolveArchiveInput(archiveInput);
    const entryPath = resolved.entryPath;
    const ext = path.extname(entryPath).toLowerCase();
    fs.mkdirSync(defaultExtractDir, { recursive: true });
    const sevenZip = [...SEVEN_ZIP_CANDIDATES, path.join(base, 'vendor', '7zip', '7z.exe')].find(p => fs.existsSync(p));

    let cmd, args;
    if (sevenZip) {
      cmd = sevenZip;
      args = ['x', entryPath, '-o' + defaultExtractDir, '-y', '-mmt=on'];
    } else if (!resolved.isSplit && ext === '.zip' && process.platform === 'win32') {
      cmd = 'tar.exe';
      args = ['-xf', entryPath, '-C', defaultExtractDir];
    } else {
      throw new Error('解压 .7z 或分卷压缩包需要 7-Zip，请确认 vendor/7zip/7z.exe 存在或安装 7-Zip');
    }

    onProgress(`正在解压 ${resolved.displayName} 到本地 4K 目录，请稍候…`);
    await new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let errBuf = '';
      let tick = 0;
      const timer = setInterval(() => {
        tick += 2;
        onProgress(`正在解压 ${resolved.displayName}…（已用时 ${tick} 秒，静态 + 动态模型体积较大请耐心等待）`);
      }, 2000);
      child.stderr.on('data', d => { errBuf += d.toString('utf8').slice(-400); });
      child.on('error', e => { clearInterval(timer); reject(e); });
      child.on('close', code => {
        clearInterval(timer);
        if (code === 0) resolve();
        else reject(new Error(`解压失败（退出码 ${code}）：${errBuf.trim() || '请检查分卷是否完整及磁盘空间是否充足'}`));
      });
    });

    const info = inspectDir(defaultExtractDir);
    if (!info) {
      throw new Error('解压完成，但包内未找到 images 或 spine 文件夹，请确认选择了正确的 4K 画质包');
    }
    cfg.customDir = info.root === defaultExtractDir ? '' : info.root;
    cfg.enabled = true; // 加载后默认开启 4K
    cfg.loadedAt = new Date().toISOString();
    cfg.source = resolved.displayName;
    saveCfg();
    onChange();
    onProgress('4K 超清画质包加载完成！已默认切换至 4K 超清模式。');
    return getStatus();
  }

  async function handler(req, res, u) {
    const p = decodeURIComponent(u.pathname);
    if (p === '/api/4k-pack/status' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(getStatus()));
      return true;
    }
    if (p === '/api/4k-pack/toggle' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const st = setEnabled(body.enabled !== false);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(st));
      return true;
    }
    if (p === '/api/4k-pack/set-dir' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const st = setCustomDir(body.dir, body.source);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(st));
      return true;
    }
    return false;
  }

  return { handler, resolve4kAsset, getStatus, setEnabled, setCustomDir, extractArchive, normalizeSpineAtlas, resolveArchiveInput };
}

module.exports = { createPack4kService, normalizeSpineAtlas };
