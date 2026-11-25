const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { spawn } = require('node:child_process');

function safeJoin(root, rel) {
  if (!rel) return null;
  const full = path.resolve(root, String(rel));
  const normRoot = path.resolve(root);
  if (full !== normRoot && !full.startsWith(normRoot + path.sep)) return null;
  return full;
}

function readJsonBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > limit) {
        req.destroy();
        reject(new Error('请求体过大'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('无效的 JSON 请求体'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  if (res.destroyed) return;
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
}

function validateApiUrl(raw) {
  const s = String(raw || 'http://127.0.0.1:9880').trim().replace(/\/+$/, '');
  let u;
  try {
    u = new URL(s);
  } catch {
    throw new Error('GPT-SoVITS 服务地址格式无效，例如 http://127.0.0.1:9880');
  }
  if (u.username || u.password || u.search || u.hash) {
    throw new Error('服务地址不支持嵌入账号或查询参数');
  }
  const isLocal = u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (u.protocol !== 'https:' && !isLocal) {
    throw new Error('服务地址仅支持 HTTPS 或本机 HTTP (127.0.0.1 / localhost)');
  }
  return u.origin + u.pathname.replace(/\/+$/, '');
}

function normKey(s) {
  return String(s || '').trim().toLowerCase().replace(/[\s　·・_()（）]/g, '');
}

function detectTextLang(text) {
  const s = String(text || '');
  if (/[\u3040-\u30ff\u31f0-\u31ff]/.test(s)) return 'ja';
  if (/[\u4e00-\u9fff]/.test(s)) return 'zh';
  if (/[a-zA-Z]/.test(s)) return 'en';
  return 'auto';
}

function probeHttp(urlStr, timeoutMs = 1800) {
  return new Promise(resolve => {
    try {
      const u = new URL(urlStr);
      const mod = u.protocol === 'https:' ? https : http;
      const req = mod.request({
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: '/',
        method: 'GET',
        timeout: timeoutMs
      }, r => {
        r.resume();
        resolve(r.statusCode < 500 || r.statusCode === 404 || r.statusCode === 405 || r.statusCode === 422);
      });
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.on('error', () => resolve(false));
      req.end();
    } catch {
      resolve(false);
    }
  });
}

function createPackTtsService({ base, userDir, fetch: customFetch, onChange = () => {} }) {
  const fetcher = customFetch || globalThis.fetch;
  const cfgFile = path.join(userDir, 'pack-tts.json');
  const defaultExtractDir = path.join(userDir, 'tts-voices');
  const catalogPath = path.join(base, 'data', 'tts-voice-catalog.json');
  const sevenZipCandidates = [
    'C:\\Program Files\\7-Zip\\7z.exe',
    'C:\\Program Files (x86)\\7-Zip\\7z.exe',
    path.join(base, 'vendor', '7zip', '7z.exe')
  ];

  function loadCatalogVoices() {
    try {
      const parsed = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
      return Array.isArray(parsed.voices) ? parsed.voices : [];
    } catch {
      return [];
    }
  }

  function loadCfg() {
    try {
      const raw = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
      return {
        enabled: raw.enabled !== false,
        customDir: typeof raw.customDir === 'string' ? raw.customDir : '',
        apiUrl: typeof raw.apiUrl === 'string' && raw.apiUrl ? raw.apiUrl : 'http://127.0.0.1:9880',
        runtimeDir: typeof raw.runtimeDir === 'string' ? raw.runtimeDir : '',
        loadedAt: typeof raw.loadedAt === 'string' ? raw.loadedAt : '',
        source: typeof raw.source === 'string' ? raw.source : ''
      };
    } catch {
      return {
        enabled: true,
        customDir: '',
        apiUrl: 'http://127.0.0.1:9880',
        runtimeDir: '',
        loadedAt: '',
        source: ''
      };
    }
  }

  let cfg = loadCfg();
  const loadedWeights = new Map(); // apiUrl -> { gpt, sovits }
  const queues = new Map(); // apiUrl -> Promise chain

  function saveCfg() {
    fs.mkdirSync(path.dirname(cfgFile), { recursive: true });
    fs.writeFileSync(cfgFile + '.tmp', JSON.stringify(cfg, null, 2), 'utf8');
    fs.renameSync(cfgFile + '.tmp', cfgFile);
  }

  function findWeightFile(dir, slot, ext) {
    if (!dir || !fs.existsSync(dir)) return '';
    try {
      const files = fs.readdirSync(dir)
        .filter(f => f.toLowerCase().endsWith(ext) && (f.startsWith(slot + '-') || f.startsWith(slot + '_')))
        .sort();
      return files.length ? path.join(dir, files[files.length - 1]) : '';
    } catch {
      return '';
    }
  }

  function resolveRefForSlot(packRoot, v) {
    const slot = v.slot;
    const promptCandidates = [
      safeJoin(packRoot, v.refAudio),
      safeJoin(packRoot, path.join('refs', slot, 'prompts.json')),
      safeJoin(packRoot, path.join('datasets', 'reference_prompts', slot, 'ref_01.m4a')),
      safeJoin(base, path.join('tts-dataset', 'reference_prompts', slot, 'ref_01.m4a'))
    ].filter(Boolean);
    for (const cand of promptCandidates) {
      if (cand.endsWith('.json')) continue;
      if (fs.existsSync(cand)) return cand;
    }
    return '';
  }

  function resolveManifestDir(dir) {
    if (!dir || !fs.existsSync(dir)) return null;
    const candidates = [
      dir,
      path.join(dir, 'ShinyStories-TTS-Pack'),
      path.join(dir, 'tts-voices')
    ];
    for (const root of candidates) {
      if (!fs.existsSync(root)) continue;
      const mf = path.join(root, 'manifest.json');
      const gptDir = path.join(root, 'models', 'GPT_weights_v4');
      const svDir = path.join(root, 'models', 'SoVITS_weights_v4');
      if (fs.existsSync(mf)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(mf, 'utf8'));
          const voices = [];
          for (const entry of manifest.voices || []) {
            const gptPath = safeJoin(root, entry.gpt) || findWeightFile(gptDir, entry.slot, '.ckpt');
            const sovitsPath = safeJoin(root, entry.sovits) || findWeightFile(svDir, entry.slot, '.pth');
            const refAudioPath = (entry.refAudio && safeJoin(root, entry.refAudio)) || resolveRefForSlot(root, entry);
            if (gptPath && fs.existsSync(gptPath) && sovitsPath && fs.existsSync(sovitsPath) && refAudioPath && fs.existsSync(refAudioPath)) {
              voices.push({
                ...entry,
                gptPath,
                sovitsPath,
                refAudioPath,
                refsAbs: (entry.refs || []).map(r => ({
                  ...r,
                  absPath: safeJoin(root, r.file)
                })).filter(r => r.absPath && fs.existsSync(r.absPath))
              });
            }
          }
          if (voices.length) {
            return { root, sourceType: 'manifest', manifestName: manifest.name || '283 全员声音整合包', voices };
          }
        } catch {}
      }
      if (fs.existsSync(gptDir) && fs.existsSync(svDir)) {
        const catalog = loadCatalogVoices();
        const voices = [];
        for (const entry of catalog) {
          const gptPath = findWeightFile(gptDir, entry.slot, '.ckpt');
          const sovitsPath = findWeightFile(svDir, entry.slot, '.pth');
          const refAudioPath = resolveRefForSlot(root, entry);
          if (gptPath && sovitsPath && refAudioPath) {
            voices.push({
              ...entry,
              gptPath,
              sovitsPath,
              refAudioPath,
              refsAbs: [{ file: entry.refAudio, text_jp: entry.refText, absPath: refAudioPath }]
            });
          }
        }
        if (voices.length) {
          return { root, sourceType: 'raw-weights', manifestName: 'GPT-SoVITS v4 语音文件夹', voices };
        }
      }
    }
    return null;
  }

  function findActivePack() {
    const candidates = [
      cfg.customDir,
      defaultExtractDir,
      path.join(base, 'tts-voices')
    ].filter(Boolean);
    for (const c of candidates) {
      const hit = resolveManifestDir(c);
      if (hit) return hit;
    }
    return null;
  }

  function detectRuntimeDir() {
    const candidates = [
      cfg.runtimeDir,
      process.env.GPT_SOVITS_DIR,
      'F:\\GPT-SoVITS',
      'D:\\GPT-SoVITS',
      'C:\\GPT-SoVITS',
      'G:\\GPT-SoVITS',
      path.join(userDir, 'GPT-SoVITS'),
      path.join(path.dirname(userDir), 'GPT-SoVITS'),
      defaultExtractDir && path.join(defaultExtractDir, 'GPT-SoVITS')
    ].filter(Boolean);
    for (const d of candidates) {
      try {
        if (fs.existsSync(path.join(d, 'api_v2.py'))) return d;
      } catch {}
    }
    return cfg.runtimeDir || '';
  }

  function publicVoiceList(voices) {
    return (voices || []).map(v => ({
      id: v.id,
      slot: v.slot,
      name: v.name,
      shortName: v.shortName,
      aliases: v.aliases || [],
      version: v.version || 'v4',
      refText: v.refText || '',
      refLang: v.refLang || 'ja'
    }));
  }

  async function getStatus(probe = false) {
    const pack = findActivePack();
    const runtimeDir = detectRuntimeDir();
    const apiOnline = probe ? await probeHttp(cfg.apiUrl) : false;
    const voices = pack ? publicVoiceList(pack.voices) : publicVoiceList(loadCatalogVoices());
    return {
      ok: true,
      installed: Boolean(pack),
      enabled: Boolean(pack) && cfg.enabled !== false,
      activeDir: pack ? pack.root : '',
      voiceCount: pack ? pack.voices.length : 0,
      catalogCount: voices.length,
      voices,
      apiUrl: cfg.apiUrl,
      runtimeDir,
      runtimeReady: Boolean(runtimeDir && fs.existsSync(path.join(runtimeDir, 'api_v2.py'))),
      apiOnline,
      loadedAt: cfg.loadedAt || '',
      source: cfg.source || (pack ? path.basename(pack.root) : ''),
      defaultExtractDir
    };
  }

  function setCustomDir(dir, source) {
    const hit = resolveManifestDir(dir);
    if (!hit) {
      return { ok: false, error: '所选目录中未检测到 GPT-SoVITS v4 模型权重（需包含 manifest.json 或 models/GPT_weights_v4 与 SoVITS_weights_v4）' };
    }
    cfg.customDir = hit.root;
    cfg.enabled = true;
    cfg.loadedAt = new Date().toISOString();
    cfg.source = source || path.basename(hit.root);
    loadedWeights.clear();
    saveCfg();
    onChange();
    return getStatus(false);
  }

  function setConfig(patch = {}) {
    if (patch.apiUrl !== undefined) {
      cfg.apiUrl = validateApiUrl(patch.apiUrl);
    }
    if (patch.runtimeDir !== undefined) {
      const rd = String(patch.runtimeDir || '').trim();
      if (rd && !fs.existsSync(path.join(rd, 'api_v2.py'))) {
        throw new Error('所选目录中未找到 api_v2.py，请选择 GPT-SoVITS 根目录');
      }
      cfg.runtimeDir = rd;
    }
    if (patch.enabled !== undefined) {
      cfg.enabled = Boolean(patch.enabled);
    }
    saveCfg();
    onChange();
    return getStatus(false);
  }

  async function extractArchive(archiveInput, onProgress = () => {}) {
    const inputs = (Array.isArray(archiveInput) ? archiveInput : [archiveInput])
      .filter(p => typeof p === 'string' && p.trim())
      .map(p => p.trim());
    if (!inputs.length) throw new Error('未选择声音整合包文件');
    for (const p of inputs) {
      if (!fs.existsSync(p)) throw new Error('所选声音整合包不存在：' + p);
    }
    const dirs = new Set(inputs.map(p => path.dirname(path.resolve(p))));
    if (dirs.size > 1) throw new Error('分卷压缩包必须放在同一文件夹内');
    const dir = path.dirname(path.resolve(inputs[0]));
    const firstCandidate = inputs.slice().sort()[0];
    const baseName = path.basename(firstCandidate);
    let entryPath = inputs[0];
    let displayName = path.basename(inputs[0]);
    let isSplit = false;
    const numMatch = baseName.match(/^(.+)\.(\d{3})$/i);
    if (numMatch) {
      const stem = numMatch[1];
      const siblings = fs.readdirSync(dir)
        .filter(f => f.startsWith(stem + '.') && /^\d{3}$/.test(f.slice(stem.length + 1)))
        .sort();
      if (!siblings[0] || !siblings[0].endsWith('.001')) {
        throw new Error(`未找到起始分卷「${stem}.001」，请确认所有分卷已在同一文件夹`);
      }
      const maxNum = Number(siblings[siblings.length - 1].slice(stem.length + 1));
      for (let i = 1; i <= maxNum; i++) {
        const expected = `${stem}.${String(i).padStart(3, '0')}`;
        if (!fs.existsSync(path.join(dir, expected))) {
          throw new Error(`分卷不完整：缺少 ${expected}`);
        }
      }
      entryPath = path.join(dir, siblings[0]);
      displayName = `${siblings[0]}（共 ${siblings.length} 个分卷）`;
      isSplit = true;
    }

    const ext = path.extname(entryPath).toLowerCase();
    fs.mkdirSync(defaultExtractDir, { recursive: true });
    const sevenZip = sevenZipCandidates.find(p => fs.existsSync(p));
    let cmd, args;
    if (sevenZip) {
      cmd = sevenZip;
      args = ['x', entryPath, '-o' + defaultExtractDir, '-y', '-mmt=on'];
    } else if (!isSplit && ext === '.zip' && process.platform === 'win32') {
      cmd = 'tar.exe';
      args = ['-xf', entryPath, '-C', defaultExtractDir];
    } else {
      throw new Error('解压 .7z 或分卷格式需要 7-Zip，请确认 vendor/7zip/7z.exe 存在或安装 7-Zip');
    }

    onProgress(`正在一键部署 ${displayName}（30 声线权重约 6.5 GB），请耐心等待…`);
    await new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let errBuf = '';
      let tick = 0;
      const timer = setInterval(() => {
        tick += 2;
        onProgress(`正在部署 283 全员 30 声线语音包…（已用时 ${tick} 秒）`);
      }, 2000);
      child.stderr.on('data', d => { errBuf += d.toString('utf8').slice(-400); });
      child.on('error', e => { clearInterval(timer); reject(e); });
      child.on('close', code => {
        clearInterval(timer);
        if (code === 0) resolve();
        else reject(new Error(`解压失败（退出码 ${code}）：${errBuf.trim() || '请检查分卷完整性或磁盘空间'}`));
      });
    });

    const hit = resolveManifestDir(defaultExtractDir);
    if (!hit) {
      throw new Error('解压完成，但未在目录内检测到有效的 30 声线模型权重与参考音频');
    }
    cfg.customDir = hit.root === defaultExtractDir ? '' : hit.root;
    cfg.enabled = true;
    cfg.loadedAt = new Date().toISOString();
    cfg.source = displayName;
    loadedWeights.clear();
    saveCfg();
    onChange();
    onProgress(`部署完成！已成功载入 ${hit.voices.length} 组偶像声音模型。`);
    return await getStatus(true);
  }

  async function launchRuntime() {
    if (await probeHttp(cfg.apiUrl)) {
      return { ok: true, alreadyRunning: true, apiOnline: true, apiUrl: cfg.apiUrl };
    }
    const rd = detectRuntimeDir();
    if (!rd || !fs.existsSync(path.join(rd, 'api_v2.py'))) {
      return {
        ok: false,
        error: '尚未配置 GPT-SoVITS 运行目录。请点击「⚙ 指定 GPT-SoVITS 目录」选择含 api_v2.py 的文件夹，或先手动启动 api_v2.py -a 127.0.0.1 -p 9880。'
      };
    }
    const pyCandidates = [
      path.join(rd, 'runtime', 'python.exe'),
      path.join(rd, '.venv', 'Scripts', 'python.exe'),
      path.join(rd, 'venv', 'Scripts', 'python.exe')
    ];
    const py = pyCandidates.find(p => fs.existsSync(p)) || 'python';
    const u = new URL(cfg.apiUrl);
    const port = u.port || '9880';
    const host = u.hostname === 'localhost' ? '127.0.0.1' : u.hostname;

    let errTail = '';
    let exitedEarly = false;
    let exitCode = null;
    const child = spawn(py, ['api_v2.py', '-a', host, '-p', String(port)], {
      cwd: rd,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    child.stderr?.on('data', d => { errTail = (errTail + d.toString('utf8')).slice(-800); });
    child.on('exit', code => { exitedEarly = true; exitCode = code; });
    child.unref();

    const deadline = Date.now() + 25000;
    while (Date.now() < deadline) {
      if (exitedEarly) {
        return { ok: false, error: `GPT-SoVITS 进程意外退出（退出码 ${exitCode}）：${errTail.trim() || '请检查 Python 依赖与显卡驱动'}` };
      }
      if (await probeHttp(cfg.apiUrl, 1200)) {
        cfg.runtimeDir = rd;
        saveCfg();
        return { ok: true, launched: true, apiOnline: true, apiUrl: cfg.apiUrl, runtimeDir: rd };
      }
      await new Promise(r => setTimeout(r, 800));
    }
    return { ok: false, error: '已启动 api_v2.py，但 25 秒内尚未响应；模型初次载入可能较慢，请稍后再试。' };
  }

  function resolveVoice(query, pack) {
    const voices = pack?.voices || [];
    const q = String(query || '').trim();
    if (!q || !voices.length) return null;
    const qLow = q.toLowerCase();
    const qNorm = normKey(q);
    for (const v of voices) {
      if (v.id.toLowerCase() === qLow || v.slot.toLowerCase() === qLow) return v;
    }
    for (const v of voices) {
      if ([v.id, v.slot, v.name, v.shortName, ...(v.aliases || [])].some(a => normKey(a) === qNorm)) {
        return v;
      }
    }
    for (const v of voices) {
      if ([v.name, v.shortName, ...(v.aliases || [])].some(a => {
        const na = normKey(a);
        return na && qNorm && (na.includes(qNorm) || qNorm.includes(na));
      })) {
        return v;
      }
    }
    return null;
  }

  function enqueue(apiBase, fn) {
    const prev = queues.get(apiBase) || Promise.resolve();
    const next = prev.then(fn, fn);
    queues.set(apiBase, next.catch(() => {}));
    return next;
  }

  async function synthesize({ voiceId, text, textLang = 'auto', speed = 1, refIndex = 0, apiUrl, signal }) {
    const cleanText = String(text || '').trim();
    if (!cleanText) throw new Error('合成台词不能为空');
    const pack = findActivePack();
    if (!pack) {
      throw new Error('尚未部署 283 全员声音整合包，请点击「📦 一键部署全部声音」加载 ShinyStories-TTS-Pack.7z');
    }
    const voice = resolveVoice(voiceId, pack);
    if (!voice) {
      throw new Error(`未在整合包中找到声线「${voiceId}」（当前已载入 ${pack.voices.length} 组声线）`);
    }
    const baseUrl = validateApiUrl(apiUrl || cfg.apiUrl);

    return enqueue(baseUrl, async () => {
      if (signal?.aborted) throw new DOMException('已停止', 'AbortError');
      const currentLoaded = loadedWeights.get(baseUrl) || {};
      const handleFetchErr = err => {
        if (err?.name === 'AbortError') throw err;
        const msg = String(err?.cause?.code || err?.message || err);
        if (/ECONNREFUSED|fetch failed|ECONNRESET|ETIMEDOUT/i.test(msg)) {
          throw new Error(`无法连接本地 GPT-SoVITS 服务（${baseUrl}）。请先启动 api_v2.py -a 127.0.0.1 -p ${new URL(baseUrl).port || 9880}，或点击「🚀 启动推理引擎」。`);
        }
        throw err;
      };

      if (currentLoaded.gpt !== voice.gptPath) {
        const rg = await fetcher(`${baseUrl}/set_gpt_weights?weights_path=${encodeURIComponent(voice.gptPath)}`, { signal }).catch(handleFetchErr);
        if (!rg.ok) {
          const detail = await rg.text().catch(() => '');
          throw new Error(`切换 GPT 权重失败（HTTP ${rg.status}）：${detail.slice(0, 240)}`);
        }
        currentLoaded.gpt = voice.gptPath;
        loadedWeights.set(baseUrl, currentLoaded);
      }

      if (currentLoaded.sovits !== voice.sovitsPath) {
        const rs = await fetcher(`${baseUrl}/set_sovits_weights?weights_path=${encodeURIComponent(voice.sovitsPath)}`, { signal }).catch(handleFetchErr);
        if (!rs.ok) {
          const detail = await rs.text().catch(() => '');
          throw new Error(`切换 SoVITS 权重失败（HTTP ${rs.status}）：${detail.slice(0, 240)}`);
        }
        currentLoaded.sovits = voice.sovitsPath;
        loadedWeights.set(baseUrl, currentLoaded);
      }

      const refList = voice.refsAbs?.length ? voice.refsAbs : [{ absPath: voice.refAudioPath, text_jp: voice.refText }];
      const pickedRef = refList[Math.max(0, Math.min(refList.length - 1, Number(refIndex) || 0))] || refList[0];
      let lang = String(textLang || 'auto').toLowerCase();
      if (!['ja', 'zh', 'en', 'yue', 'ko', 'all_ja', 'all_zh', 'all_yue', 'all_ko', 'auto_yue'].includes(lang)) {
        lang = detectTextLang(cleanText);
      }

      const payload = {
        text: cleanText,
        text_lang: lang,
        ref_audio_path: pickedRef.absPath || voice.refAudioPath,
        prompt_text: pickedRef.text_jp || voice.refText || '',
        prompt_lang: voice.refLang || 'ja',
        text_split_method: 'cut5',
        speed_factor: Math.max(0.5, Math.min(2, Number(speed) || 1)),
        media_type: 'wav',
        streaming_mode: false
      };

      const rt = await fetcher(`${baseUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal
      }).catch(handleFetchErr);

      if (!rt.ok) {
        let detail = '';
        try {
          const j = await rt.json();
          detail = j.message || j.detail || JSON.stringify(j);
        } catch {
          detail = await rt.text().catch(() => '');
        }
        throw new Error(`GPT-SoVITS 合成失败（HTTP ${rt.status}）：${String(detail).slice(0, 260)}`);
      }

      const ct = rt.headers.get('content-type') || 'audio/wav';
      if (/json|text\/|html/i.test(ct)) {
        const msg = await rt.text().catch(() => '');
        throw new Error(`GPT-SoVITS 未返回音频：${msg.slice(0, 200)}`);
      }
      const buffer = Buffer.from(await rt.arrayBuffer());
      if (buffer.length < 32) {
        throw new Error('GPT-SoVITS 返回空音频');
      }
      return { buffer, contentType: ct.split(';')[0].trim() || 'audio/wav', voice };
    });
  }

  async function handler(req, res, u) {
    const p = decodeURIComponent(u.pathname);
    if (!p.startsWith('/api/tts-pack/')) return false;

    try {
      if (p === '/api/tts-pack/status' && req.method === 'GET') {
        const probe = u.searchParams.get('probe') === '1';
        sendJson(res, 200, await getStatus(probe));
        return true;
      }
      if (p === '/api/tts-pack/config' && req.method === 'POST') {
        const body = await readJsonBody(req);
        sendJson(res, 200, await setConfig(body));
        return true;
      }
      if (p === '/api/tts-pack/launch' && req.method === 'POST') {
        sendJson(res, 200, await launchRuntime());
        return true;
      }
      if (p === '/api/tts-pack/synthesize' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(new Error('语音合成超时，请检查本机推理服务')), 180000);
        req.on('close', () => controller.abort());
        try {
          const out = await synthesize({
            voiceId: body.voiceId || body.voice,
            text: body.text,
            textLang: body.textLang || body.text_lang || 'auto',
            speed: body.speed,
            refIndex: body.refIndex,
            apiUrl: body.apiUrl,
            signal: controller.signal
          });
          if (!res.destroyed) {
            res.writeHead(200, {
              'Content-Type': out.contentType || 'audio/wav',
              'Content-Length': out.buffer.length,
              'Cache-Control': 'no-store',
              'X-Content-Type-Options': 'nosniff'
            });
            res.end(out.buffer);
          }
        } finally {
          clearTimeout(timer);
        }
        return true;
      }
      sendJson(res, 404, { ok: false, error: 'TTS Pack 接口不存在' });
      return true;
    } catch (e) {
      sendJson(res, 400, { ok: false, error: e.message || '操作失败' });
      return true;
    }
  }

  return {
    handler,
    getStatus,
    setCustomDir,
    setConfig,
    extractArchive,
    launchRuntime,
    resolveVoice,
    synthesize
  };
}

module.exports = { createPackTtsService, detectTextLang };
