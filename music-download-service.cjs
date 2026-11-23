const fs = require('node:fs');
const path = require('node:path');
const { Readable } = require('node:stream');
const { execFile } = require('node:child_process');

function detectAudioFormat(buf, contentType = '', fallbackExt = 'mp3') {
  if (Buffer.isBuffer(buf) && buf.length >= 4) {
    // fLaC
    if (buf[0] === 0x66 && buf[1] === 0x4C && buf[2] === 0x61 && buf[3] === 0x43) {
      return { ext: 'flac', format: 'FLAC 无损' };
    }
    // ID3 tag or MPEG Audio frame sync (0xFF 0xE0+)
    if ((buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
        (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0)) {
      return { ext: 'mp3', format: 'MP3' };
    }
    // ISO Base Media / M4A / MP4 (....ftyp)
    if (buf.length >= 8 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
      return { ext: 'm4a', format: 'M4A / AAC' };
    }
    // OggS
    if (buf[0] === 0x4F && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) {
      return { ext: 'ogg', format: 'OGG' };
    }
    // RIFF WAVE
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
      return { ext: 'wav', format: 'WAV' };
    }
  }
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('flac')) return { ext: 'flac', format: 'FLAC 无损' };
  if (ct.includes('mp4') || ct.includes('aac') || ct.includes('m4a')) return { ext: 'm4a', format: 'M4A / AAC' };
  if (ct.includes('ogg')) return { ext: 'ogg', format: 'OGG' };
  if (ct.includes('wav')) return { ext: 'wav', format: 'WAV' };
  const clean = String(fallbackExt || 'mp3').replace(/^\./, '').toLowerCase();
  return { ext: ['flac', 'mp3', 'm4a', 'ogg', 'wav'].includes(clean) ? clean : 'mp3', format: clean.toUpperCase() };
}

function sanitizeFilePart(s, fallback = 'track') {
  return String(s || fallback)
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 96) || fallback;
}

function createMusicDownloadService(options = {}) {
  const fetchFn = options.fetch || globalThis.fetch;
  const getDownloadDir = () => {
    const dir = options.downloadDir
      ? (typeof options.downloadDir === 'function' ? options.downloadDir() : options.downloadDir)
      : path.join(process.cwd(), '下载资源', '音乐下载');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  };

  let jobs = [];
  let seq = 1;

  function loadHistory() {
    try {
      const histFile = path.join(getDownloadDir(), '.download-history.json');
      if (fs.existsSync(histFile)) {
        const parsed = JSON.parse(fs.readFileSync(histFile, 'utf8'));
        if (Array.isArray(parsed)) {
          jobs = parsed.slice(0, 80).map(j => ({
            ...j,
            status: j.status === 'downloading' ? 'error' : j.status,
            error: j.status === 'downloading' ? '上次下载因程序退出而中断' : (j.error || '')
          }));
          seq = jobs.reduce((m, j) => Math.max(m, Number(j.seq || 0)), 0) + 1;
        }
      }
    } catch {}
  }
  loadHistory();

  function persistHistory() {
    try {
      const histFile = path.join(getDownloadDir(), '.download-history.json');
      const snapshot = jobs.slice(0, 80).map(j => ({ ...j }));
      fs.writeFileSync(histFile + '.tmp', JSON.stringify(snapshot, null, 2));
      fs.renameSync(histFile + '.tmp', histFile);
    } catch {}
  }

  async function readJsonBody(req) {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 512 * 1024) throw Error('请求体过大');
    }
    return body ? JSON.parse(body) : {};
  }

  async function runDownloadJob(job, selfOrigin) {
    const dir = getDownloadDir();
    let targetUrl = String(job.url || '').trim();
    if (targetUrl.startsWith('/')) targetUrl = `${selfOrigin}${targetUrl}`;
    const partFile = path.join(dir, `.dl_${job.id}.part`);

    try {
      job.status = 'downloading';
      job.startedAt = Date.now();
      const res = await fetchFn(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (!res.ok) throw Error(`音源返回 HTTP ${res.status}`);

      const ct = res.headers.get('content-type') || '';
      if (ct.includes('text/html') || ct.includes('application/json')) {
        throw Error('音源未返回有效音频流（可能需登录 VIP 或暂不可用）');
      }

      job.actualQuality = res.headers.get('x-actual-quality') || job.requestedQuality || '';
      job.actualBitrate = Number(res.headers.get('x-actual-bitrate') || 0);
      job.downgraded = res.headers.get('x-quality-downgraded') === '1';
      job.totalBytes = Number(res.headers.get('content-length') || 0);

      const out = fs.createWriteStream(partFile);
      let firstChunk = null;
      let lastTick = Date.now();
      let lastBytes = 0;

      await new Promise((resolve, reject) => {
        const readable = res.nodeStream || (typeof res.body?.pipe === 'function' ? res.body : Readable.fromWeb(res.body));
        readable.on('data', (chunk) => {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          if (!firstChunk) firstChunk = buf.subarray(0, 16);
          job.downloadedBytes += buf.length;
          if (job.totalBytes > 0) {
            job.percent = Math.min(99, Math.round((job.downloadedBytes / job.totalBytes) * 100));
          } else {
            // Smooth indeterminate progress estimate up to 92%
            job.percent = Math.min(92, Math.round((1 - Math.exp(-job.downloadedBytes / (3.5 * 1024 * 1024))) * 92));
          }
          const now = Date.now();
          const dt = now - lastTick;
          if (dt >= 350) {
            job.speedBps = Math.round(((job.downloadedBytes - lastBytes) * 1000) / dt);
            lastTick = now;
            lastBytes = job.downloadedBytes;
          }
        });
        readable.on('error', reject);
        out.on('error', reject);
        out.on('finish', resolve);
        readable.pipe(out);
      });

      if (job.downloadedBytes < 4096) {
        throw Error('下载内容过小，非有效音频文件');
      }

      const detected = detectAudioFormat(firstChunk, ct, 'mp3');
      const baseName = `${sanitizeFilePart(job.title, 'song')} - ${sanitizeFilePart(job.artist, 'artist')}`;
      const finalName = `${baseName}.${detected.ext}`;
      const finalPath = path.join(dir, finalName);

      if (fs.existsSync(finalPath)) {
        try { fs.unlinkSync(finalPath); } catch {}
      }
      fs.renameSync(partFile, finalPath);

      // Save synced .lrc lyrics alongside the audio file when provided
      if (job.lyrics && String(job.lyrics).trim()) {
        try {
          fs.writeFileSync(path.join(dir, `${baseName}.lrc`), String(job.lyrics), 'utf8');
          job.hasLyrics = true;
        } catch {}
      }

      job.actualFormat = detected.format;
      job.ext = detected.ext;
      job.savedFilename = finalName;
      job.savedPath = finalPath;
      job.totalBytes = job.downloadedBytes;
      job.percent = 100;
      job.speedBps = 0;
      job.status = 'done';
      job.finishedAt = Date.now();
      persistHistory();
    } catch (e) {
      try { if (fs.existsSync(partFile)) fs.unlinkSync(partFile); } catch {}
      job.status = 'error';
      job.speedBps = 0;
      job.error = e.message || '下载失败';
      job.finishedAt = Date.now();
      persistHistory();
    }
  }

  return async function handleMusicDownload(req, res, u) {
    const p = u.pathname;
    if (!p.startsWith('/api/music-download/')) return false;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    if (p === '/api/music-download/jobs' && req.method === 'GET') {
      res.end(JSON.stringify({
        ok: true,
        downloadDir: getDownloadDir(),
        jobs: jobs.slice(0, 60)
      }));
      return true;
    }

    if (p === '/api/music-download/start' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        if (!body.url) {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: '缺少音频流地址' }));
          return true;
        }
        const jobSeq = seq++;
        const job = {
          id: `dl_${Date.now()}_${jobSeq}`,
          seq: jobSeq,
          url: String(body.url),
          title: String(body.title || '未命名曲目'),
          artist: String(body.artist || '未知歌手'),
          cover: String(body.cover || '/app-icon.png'),
          requestedQuality: String(body.quality || 'jymaster'),
          lyrics: typeof body.lyrics === 'string' ? body.lyrics : '',
          status: 'downloading',
          downloadedBytes: 0,
          totalBytes: 0,
          percent: 0,
          speedBps: 0,
          actualFormat: '',
          actualQuality: '',
          actualBitrate: 0,
          downgraded: false,
          savedFilename: '',
          savedPath: '',
          hasLyrics: false,
          error: '',
          createdAt: Date.now(),
          finishedAt: 0
        };
        jobs.unshift(job);
        if (jobs.length > 80) jobs = jobs.slice(0, 80);
        const selfOrigin = `http://${req.headers.host || '127.0.0.1'}`;
        // Kick off streaming download asynchronously so UI receives job ID immediately
        runDownloadJob(job, selfOrigin);
        res.end(JSON.stringify({ ok: true, job }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
      return true;
    }

    if (p === '/api/music-download/clear' && req.method === 'POST') {
      jobs = jobs.filter(j => j.status === 'downloading' || j.status === 'queued');
      persistHistory();
      res.end(JSON.stringify({ ok: true, jobs }));
      return true;
    }

    if (p === '/api/music-download/open-folder' && req.method === 'POST') {
      const dir = getDownloadDir();
      try {
        if (process.platform === 'win32') {
          execFile('explorer.exe', [dir], { windowsHide: true }, () => {});
        }
      } catch {}
      res.end(JSON.stringify({ ok: true, dir }));
      return true;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    return true;
  };
}

module.exports = { createMusicDownloadService, detectAudioFormat };
