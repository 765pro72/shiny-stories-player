'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');
const { Readable } = require('node:stream');

const directHttpAgent = new http.Agent({ keepAlive: true, maxSockets: 32 });
const directHttpsAgent = new https.Agent({ keepAlive: true, maxSockets: 32 });

const AUDIO_EXT_RE = /\.(flac|mp3|m4a|wav|ogg|opus|aac|alac)$/i;
const EAPI_KEY = Buffer.from('e82ckenh8dichen8');
const NCM_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function eapiEncrypt(apiPath, payload) {
  const text = JSON.stringify(payload);
  const digest = crypto.createHash('md5').update(`nobody${apiPath}use${text}md5forencrypt`).digest('hex');
  const data = `${apiPath}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
  const cipher = crypto.createCipheriv('aes-128-ecb', EAPI_KEY, null);
  return 'params=' + Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]).toString('hex').toUpperCase();
}

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[\s\-_·・'"`~!@#$%^&*()+=[\]{}|\\:;,.<>/?，。！？、（）【】《》「」『』]/g, '');
}

function cleanBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function subsonicAuthParams(username, password) {
  const salt = crypto.randomBytes(6).toString('hex');
  const token = crypto.createHash('md5').update(String(password || '') + salt).digest('hex');
  return new URLSearchParams({
    u: String(username || ''),
    t: token,
    s: salt,
    v: '1.16.1',
    c: 'ShinyStories',
    f: 'json'
  });
}

function basicAuthHeader(username, password) {
  if (!username && !password) return null;
  return 'Basic ' + Buffer.from(`${username || ''}:${password || ''}`, 'utf8').toString('base64');
}

function defaultConfig() {
  return {
    preferPrivate: true,
    ncm: { enabled: false, baseUrl: '', cookie: '', level: 'jymaster', nickname: '', avatar: '' },
    subsonic: { enabled: false, baseUrl: '', username: '', password: '' },
    webdav: { enabled: false, baseUrl: '', username: '', password: '' },
    platforms: {
      qq: { enabled: false, cookie: '', uin: '', nickname: '' },
      kugou: { enabled: false, cookie: '', token: '', userid: '', nickname: '' },
      apple: { enabled: false, mediaUserToken: '', storefront: 'jp' },
      migu: { enabled: false, cookie: '', nickname: '' }
    }
  };
}

function extractSetCookies(res) {
  let list = [];
  if (Array.isArray(res?.rawSetCookies)) {
    list = res.rawSetCookies;
  } else if (Array.isArray(res?.headers?.['set-cookie'])) {
    list = res.headers['set-cookie'];
  } else if (typeof res?.headers?.getSetCookie === 'function') {
    list = res.headers.getSetCookie();
  } else if (typeof res?.headers?.get === 'function') {
    const raw = res.headers.get('set-cookie');
    if (raw) list = raw.split(/,(?=\s*[A-Za-z0-9_-]+=)/);
  }
  const map = new Map();
  for (const item of list) {
    const first = String(item || '').split(';')[0].trim();
    const eq = first.indexOf('=');
    if (eq > 0) {
      const k = first.slice(0, eq).trim();
      const v = first.slice(eq + 1).trim();
      if (v) map.set(k, v);
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function mergeCookieStrings(...cookieStrings) {
  const map = new Map();
  for (const str of cookieStrings) {
    for (const part of String(str || '').split(';')) {
      const s = part.trim();
      if (!s) continue;
      const eq = s.indexOf('=');
      if (eq > 0) {
        const k = s.slice(0, eq).trim();
        const v = s.slice(eq + 1).trim();
        if (!['path', 'domain', 'expires', 'max-age', 'samesite', 'httponly', 'secure'].includes(k.toLowerCase()) && v) {
          map.set(k, v);
        }
      }
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function directNodePost(urlStr, body, headers = {}, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const isHttps = u.protocol === 'https:';
      const mod = isHttps ? https : http;
      const buf = Buffer.from(String(body || ''), 'utf8');
      const req = mod.request({
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (isHttps ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        agent: isHttps ? directHttpsAgent : directHttpAgent,
        headers: {
          ...headers,
          'Content-Length': buf.length
        }
      }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try { json = JSON.parse(text); } catch {}
          resolve({
            status: res.statusCode || 200,
            rawSetCookies: res.headers['set-cookie'] || [],
            headers: res.headers,
            text,
            json
          });
        });
      });
      req.setTimeout(timeoutMs, () => req.destroy(new Error('Direct request timeout')));
      req.on('error', reject);
      req.write(buf);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

function createPrivateMusicService({ configFile, fetch: fetchImpl = globalThis.fetch, getElectronCookies = null, openMusicLoginWindow = null }) {
  let config = defaultConfig();
  let webdavIndex = { at: 0, baseUrl: '', files: [] };

  try {
    if (fs.existsSync(configFile)) {
      const raw = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      const def = defaultConfig();
      config = {
        preferPrivate: raw.preferPrivate !== false,
        ncm: { ...def.ncm, ...(raw.ncm || {}) },
        subsonic: { ...def.subsonic, ...(raw.subsonic || {}) },
        webdav: { ...def.webdav, ...(raw.webdav || {}) },
        platforms: {
          qq: { ...def.platforms.qq, ...(raw.platforms?.qq || {}) },
          kugou: { ...def.platforms.kugou, ...(raw.platforms?.kugou || {}) },
          apple: { ...def.platforms.apple, ...(raw.platforms?.apple || {}) },
          migu: { ...def.platforms.migu, ...(raw.platforms?.migu || {}) }
        }
      };
    }
  } catch {}

  function persistConfig() {
    try {
      fs.mkdirSync(path.dirname(configFile), { recursive: true });
      fs.writeFileSync(configFile + '.tmp', JSON.stringify(config, null, 2));
      fs.renameSync(configFile + '.tmp', configFile);
    } catch {}
  }

  function saveConfig(next) {
    const nextCookie = typeof next.ncm?.cookie === 'string' && next.ncm.cookie.trim()
      ? next.ncm.cookie.trim()
      : String(config.ncm.cookie || '').trim();
    config = {
      preferPrivate: next.preferPrivate !== false,
      ncm: {
        enabled: next.ncm?.enabled !== undefined ? !!next.ncm.enabled : !!config.ncm.enabled,
        baseUrl: cleanBaseUrl(next.ncm?.baseUrl),
        cookie: nextCookie,
        level: String(next.ncm?.level || config.ncm.level || 'lossless'),
        nickname: String(next.ncm?.nickname || config.ncm.nickname || ''),
        avatar: String(next.ncm?.avatar || config.ncm.avatar || '')
      },
      subsonic: {
        enabled: !!next.subsonic?.enabled,
        baseUrl: cleanBaseUrl(next.subsonic?.baseUrl),
        username: String(next.subsonic?.username || '').trim(),
        password: String(next.subsonic?.password || '')
      },
      webdav: {
        enabled: !!next.webdav?.enabled,
        baseUrl: cleanBaseUrl(next.webdav?.baseUrl),
        username: String(next.webdav?.username || '').trim(),
        password: String(next.webdav?.password || '')
      },
      platforms: config.platforms
    };
    webdavIndex = { at: 0, baseUrl: '', files: [] };
    persistConfig();
    return config;
  }

  async function fetchWithTimeout(url, opts = {}, ms = 12000) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), ms);
    try {
      return await fetchImpl(url, { ...opts, signal: ac.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async function pipeUpstreamAudio(upstreamRes, req, res) {
    res.statusCode = upstreamRes.status;
    res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    const cr = upstreamRes.headers.get('content-range');
    const cl = upstreamRes.headers.get('content-length');
    if (cr) res.setHeader('Content-Range', cr);
    if (cl) res.setHeader('Content-Length', cl);
    if (req.method === 'HEAD') {
      try { upstreamRes.nodeStream?.destroy(); } catch {}
      return res.end();
    }
    if (upstreamRes.nodeStream) {
      upstreamRes.nodeStream.on('error', () => { try { if (!res.writableEnded) res.end(); } catch {} });
      res.on('close', () => { try { upstreamRes.nodeStream.destroy(); } catch {} });
      return upstreamRes.nodeStream.pipe(res);
    }
    try {
      const stream = typeof upstreamRes.body?.pipe === 'function' ? upstreamRes.body : Readable.fromWeb(upstreamRes.body);
      stream.on('error', () => { try { if (!res.writableEnded) res.end(); } catch {} });
      res.on('close', () => { try { stream.destroy(); } catch {} });
      return stream.pipe(res);
    } catch {
      const buf = await upstreamRes.arrayBuffer();
      return res.end(Buffer.from(buf));
    }
  }

  /* ── 1. Built-in NetEase QR Login + Direct Domestic eAPI (Zero Set-Cookie Stripping!) ── */
  const ncmDeviceId = crypto.randomBytes(16).toString('hex').toUpperCase();
  let qrSessionCookie = `os=pc; appver=3.0.18.203152; channel=netease; deviceId=${ncmDeviceId}`;
  let pendingNcmQrKey = '';
  let pendingNcmNickname = '';
  let pendingNcmAvatar = '';

  function buildNcmCookieHeader(rawCookie) {
    const c = String(rawCookie || '').trim();
    const base = !c ? '' : (c.includes('=') ? c : `MUSIC_U=${c}`);
    return mergeCookieStrings(`os=pc; appver=3.0.18.203152; channel=netease; deviceId=${ncmDeviceId}`, qrSessionCookie, base);
  }

  async function ncmEapiPost(apiPath, payload, rawCookie = '') {
    const eapiUrl = 'https://interface3.music.163.com' + apiPath.replace(/^\/api\//, '/eapi/');
    const headerObj = {
      osver: 'Microsoft-Windows-10-Professional-build-19045-64bit',
      deviceId: ncmDeviceId,
      os: 'pc',
      appver: '3.0.18.203152',
      versioncode: '140',
      mobilename: '',
      buildver: String(Math.floor(Date.now() / 1000)),
      resolution: '1920x1080',
      __csrf: '',
      channel: 'netease',
      requestId: `${Date.now()}_${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`
    };
    const cookieStr = buildNcmCookieHeader(rawCookie);
    const musicU = cookieStr.match(/MUSIC_U=([^;]+)/)?.[1];
    if (musicU) headerObj.MUSIC_U = musicU;
    const body = eapiEncrypt(apiPath, {
      ...payload,
      header: JSON.stringify(headerObj)
    });
    // Always use direct Node HTTPS socket so Set-Cookie is NEVER stripped by Chromium net.fetch and domestic IP is used!
    const res = await directNodePost(eapiUrl, body, {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': NCM_UA,
      'Referer': 'https://music.163.com/',
      'Origin': 'https://music.163.com',
      'Cookie': cookieStr
    }, 10000);
    const setC = extractSetCookies(res);
    if (setC) qrSessionCookie = mergeCookieStrings(qrSessionCookie, setC);
    return { res, json: res.json || {}, setCookie: setC };
  }

  async function tryRecoverElectronNcmCookie() {
    if (typeof getElectronCookies !== 'function') return '';
    try {
      const all = await getElectronCookies();
      if (!Array.isArray(all)) return '';
      const ncmCookies = all.filter(c => c && c.name && c.value && /163\.com$/i.test(String(c.domain || '')));
      const hasMusicU = ncmCookies.some(c => c.name === 'MUSIC_U' && c.value.length > 10);
      if (!hasMusicU) return '';
      return ncmCookies.map(c => `${c.name}=${c.value}`).join('; ');
    } catch {
      return '';
    }
  }

  async function fetchNcmProfile(rawCookie) {
    try {
      const { json } = await ncmEapiPost('/api/w/nuser/account/get', {}, rawCookie);
      const profile = json?.profile || json?.data?.profile;
      const uid = Number(profile?.userId || json?.account?.id || 0);
      if (profile?.nickname || uid) {
        return { uid, nickname: profile?.nickname || `网易云用户 ${uid}`, avatar: profile?.avatarUrl || '', vipType: Number(profile?.vipType || json?.account?.vipType || 0) };
      }
    } catch {}
    return null;
  }

  // On service boot, if config.ncm.cookie is empty, check if Electron's cookie jar already holds MUSIC_U from an earlier QR scan!
  setTimeout(async () => {
    try {
      if (!config.ncm.cookie) {
        const recovered = await tryRecoverElectronNcmCookie();
        if (recovered) {
          const profile = await fetchNcmProfile(recovered);
          if (profile?.nickname) {
            config.preferPrivate = true;
            config.ncm.enabled = true;
            config.ncm.cookie = recovered;
            config.ncm.nickname = profile.nickname;
            config.ncm.avatar = profile.avatar || '';
            persistConfig();
          }
        }
      } else if (config.ncm.cookie && !config.ncm.nickname) {
        const profile = await fetchNcmProfile(config.ncm.cookie);
        if (profile?.nickname) {
          config.ncm.enabled = true;
          config.ncm.nickname = profile.nickname;
          config.ncm.avatar = profile.avatar || '';
          persistConfig();
        }
      }
    } catch {}
  }, 400);

  async function createNcmQr() {
    pendingNcmNickname = '';
    pendingNcmAvatar = '';
    let { json } = await ncmEapiPost('/api/login/qrcode/unikey', { type: 3 });
    if (json?.code !== 200 || !json.unikey) {
      ({ json } = await ncmEapiPost('/api/login/qrcode/unikey', { type: 1 }));
    }
    if (json?.code === 200 && json.unikey) {
      pendingNcmQrKey = json.unikey;
      return {
        ok: true,
        unikey: json.unikey,
        qrUrl: `https://music.163.com/login?codekey=${encodeURIComponent(json.unikey)}`
      };
    }
    return { ok: false, message: '无法获取网易云登录二维码，请稍后重试' };
  }

  async function checkNcmQr(key) {
    if (!key) return { ok: false, code: 400, message: '缺少二维码 key' };
    let { res, json, setCookie } = await ncmEapiPost('/api/login/qrcode/client/login', { key, type: 3 });
    let code = Number(json?.code || 0);
    if (code !== 803 && (!setCookie || !setCookie.includes('MUSIC_U='))) {
      try {
        const alt = await ncmEapiPost('/api/login/qrcode/client/login', { key, type: 1 });
        const altCode = Number(alt.json?.code || 0);
        if (altCode === 803 || (alt.setCookie && alt.setCookie.includes('MUSIC_U=')) || (altCode === 802 && code !== 802)) {
          res = alt.res;
          json = alt.json;
          setCookie = mergeCookieStrings(setCookie, alt.setCookie);
          code = altCode;
        }
      } catch {}
    }
    if (code === 802) {
      if (json?.nickname) pendingNcmNickname = json.nickname;
      if (json?.avatarUrl) pendingNcmAvatar = json.avatarUrl;
    }
    const electronCookie = (code === 803 || code === 802) ? await tryRecoverElectronNcmCookie() : '';
    const combinedCookie = mergeCookieStrings(setCookie, String(json?.cookie || '').trim(), qrSessionCookie, electronCookie);
    if (code === 803 || combinedCookie.includes('MUSIC_U=')) {
      pendingNcmQrKey = '';
      const profile = combinedCookie ? await fetchNcmProfile(combinedCookie) : null;
      config.preferPrivate = true;
      config.ncm.enabled = true;
      config.ncm.cookie = combinedCookie || config.ncm.cookie;
      config.ncm.nickname = profile?.nickname || json?.nickname || pendingNcmNickname || '网易云会员';
      config.ncm.avatar = profile?.avatar || json?.avatarUrl || pendingNcmAvatar || '';
      persistConfig();
      return {
        ok: true,
        code: 803,
        nickname: config.ncm.nickname,
        avatar: config.ncm.avatar,
        message: `登录成功 · 欢迎 ${config.ncm.nickname}`
      };
    }
    if (code === 800) pendingNcmQrKey = '';
    return {
      ok: true,
      code,
      nickname: json?.nickname || pendingNcmNickname || '',
      avatar: json?.avatarUrl || pendingNcmAvatar || '',
      message: code === 800 ? '二维码已过期，请点击刷新' : code === 802 ? '已扫码，请在手机网易云点击确认登录' : '请打开手机网易云 App 扫码'
    };
  }

  async function testNcm(cfg) {
    // If a QR scan is waiting confirmation, poll once immediately in case user just tapped Confirm on phone!
    if (pendingNcmQrKey && !config.ncm.cookie && !(cfg?.cookie || '').trim()) {
      try { await checkNcmQr(pendingNcmQrKey); } catch {}
    }
    if (!config.ncm.cookie && !(cfg?.cookie || '').trim()) {
      const recovered = await tryRecoverElectronNcmCookie();
      if (recovered) {
        config.ncm.cookie = recovered;
        config.ncm.enabled = true;
        persistConfig();
      }
    }
    const base = cleanBaseUrl(cfg?.baseUrl || config.ncm.baseUrl);
    const cookie = String((cfg?.cookie && cfg.cookie.trim()) ? cfg.cookie : (config.ncm.cookie || '')).trim();
    if (!base) {
      if (!cookie) {
        return {
          ok: false,
          message: pendingNcmQrKey
            ? '请先在手机网易云 App 上点击「确认登录」，确认后会自动登录生效（无需手动点测试）'
            : '请先扫码登录网易云账号（或填写自定义 API 地址）'
        };
      }
      const profile = await fetchNcmProfile(cookie);
      if (profile?.nickname) {
        config.ncm.enabled = true;
        config.ncm.cookie = cookie;
        config.ncm.nickname = profile.nickname;
        config.ncm.avatar = profile.avatar || config.ncm.avatar || '';
        persistConfig();
        return { ok: true, message: `内置网易云通道连接成功 · 当前账号：${profile.nickname}` };
      }
      return { ok: false, message: '当前登录态已过期，请重新扫码登录' };
    }
    const cookieHdr = buildNcmCookieHeader(cookie);
    const qs = cookie ? `?cookie=${encodeURIComponent(cookieHdr)}` : '';
    try {
      const r = await fetchWithTimeout(`${base}/login/status${qs}`, {
        headers: { 'User-Agent': NCM_UA, 'Cookie': cookieHdr }
      }, 8000);
      if (r.ok) {
        const j = await r.json();
        const profile = j?.data?.profile || j?.profile;
        if (profile?.nickname) return { ok: true, message: `连接成功 · 已登录账号：${profile.nickname}` };
        return { ok: true, message: 'API 连接成功（未检测到登录态）' };
      }
      return { ok: false, message: `API 返回 HTTP ${r.status}` };
    } catch (e) {
      return { ok: false, message: `无法连接到 ${base}：${e.message}` };
    }
  }

  function mapNcmLevelToUiKey(ncmLevel, br = 0) {
    const lv = String(ncmLevel || '').toLowerCase();
    if (lv === 'jymaster') return 'jymaster';
    if (lv === 'sky') return 'sky';
    if (lv === 'jyeffect') return 'jyeffect';
    if (lv === 'hires') return 'hires';
    if (lv === 'lossless') return 'flac';
    if (lv === 'exhigh') return '320';
    if (lv === 'standard' || lv === 'higher') return '128';
    const rate = Number(br || 0);
    if (rate >= 1500000) return 'jymaster';
    if (rate >= 950000) return 'hires';
    if (rate >= 650000) return 'flac';
    if (rate >= 256000) return '320';
    return '128';
  }

  const streamResolveCache = new Map();

  async function resolveNcmStream(id, title, artist, quality, allowPublicEapi = false) {
    const cfg = config.ncm;
    const hasAuth = !!(cfg.cookie || cfg.baseUrl);
    if (!hasAuth && !allowPublicEapi) return null;
    const levelMap = {
      jymaster: 'jymaster',
      sky: 'sky',
      jyeffect: 'jyeffect',
      hires: 'hires',
      flac: 'lossless',
      lossless: 'lossless',
      '320': 'exhigh',
      exhigh: 'exhigh',
      '128': 'standard',
      standard: 'standard'
    };
    const requestedUi = levelMap[quality] ? (quality === 'lossless' ? 'flac' : quality === 'exhigh' ? '320' : quality === 'standard' ? '128' : quality) : 'jymaster';
    const requestedLevel = levelMap[quality] || levelMap[cfg.level] || cfg.level || 'jymaster';
    const cacheKey = `ncm:${id}:${title}:${artist}:${requestedLevel}:${cfg.cookie ? cfg.cookie.slice(-10) : ''}`;
    const cached = streamResolveCache.get(cacheKey);
    if (cached && (Date.now() - cached.at) < 45000) return cached.data;

    // Graceful quality ladder: try requested SVIP/VIP tier first, then step down honestly if account/track cannot unlock it
    const fallbackChain = ['jymaster', 'sky', 'jyeffect', 'hires', 'lossless', 'exhigh', 'standard'];
    const levelsToTry = [requestedLevel];
    const startIdx = fallbackChain.indexOf(requestedLevel);
    for (let i = (startIdx >= 0 ? startIdx + 1 : 0); i < fallbackChain.length; i++) {
      if (!levelsToTry.includes(fallbackChain[i])) levelsToTry.push(fallbackChain[i]);
    }

    const extractEntry = (item, lv) => {
      if (!item || !item.url || !String(item.url).startsWith('http')) return null;
      // Reject 30s VIP trial clips when user requested higher quality — NEVER pretend VIP is unlocked!
      const isTrial = !!(item.freeTrialInfo && (item.freeTrialInfo.end > 0 || item.freeTrialInfo.start >= 0));
      if (isTrial) return { trialOnly: true, item };
      const actualQuality = mapNcmLevelToUiKey(item.level || lv, item.br);
      const actualBitrate = Number(item.br || 0);
      const actualFormat = String(item.type || (actualQuality === '128' || actualQuality === '320' ? 'mp3' : 'flac')).toLowerCase();
      const downgraded = actualQuality !== requestedUi;
      return {
        url: item.url,
        headers: { 'User-Agent': NCM_UA, 'Referer': 'https://music.163.com/' },
        actualQuality,
        actualBitrate,
        actualFormat,
        requestedQuality: requestedUi,
        downgraded,
        reason: downgraded ? 'vip-or-source-limit' : ''
      };
    };

    const remember = (result) => {
      if (result) {
        streamResolveCache.set(cacheKey, { at: Date.now(), data: result });
        if (streamResolveCache.size > 64) streamResolveCache.delete(streamResolveCache.keys().next().value);
      }
      return result;
    };

    // Mode A: External user-hosted NetEaseCloudMusicApi
    if (cfg.baseUrl) {
      const cookieHdr = buildNcmCookieHeader(cfg.cookie);
      const headers = { 'User-Agent': NCM_UA, 'Cookie': cookieHdr };
      const cookieQ = cfg.cookie ? `&cookie=${encodeURIComponent(cookieHdr)}` : '';
      let songId = /^\d+$/.test(String(id || '')) ? String(id) : '';
      if (!songId && title) {
        try {
          const kw = [title, artist].filter(Boolean).join(' ');
          const sr = await fetchWithTimeout(`${cfg.baseUrl}/cloudsearch?keywords=${encodeURIComponent(kw)}&limit=5${cookieQ}`, { headers }, 8000);
          if (sr.ok) {
            const sj = await sr.json();
            if (sj?.result?.songs?.length) songId = String(sj.result.songs[0].id);
          }
        } catch {}
      }
      if (!songId) return null;
      for (const lv of levelsToTry) {
        try {
          const r = await fetchWithTimeout(`${cfg.baseUrl}/song/url/v1?id=${songId}&level=${encodeURIComponent(lv)}${cookieQ}`, { headers }, 9000);
          if (r.ok) {
            const j = await r.json();
            const parsed = extractEntry(j?.data?.[0], lv);
            if (parsed && !parsed.trialOnly) return remember(parsed);
          }
        } catch {}
      }
      return null;
    }

    // Mode B: Built-in zero-dependency NetEase eAPI (1-request fast path: NetEase auto-downgrades level server-side!)
    let songId = /^\d+$/.test(String(id || '')) ? String(id) : '';
    if (!songId && title) {
      try {
        const kw = [title, artist].filter(Boolean).join(' ');
        const { json: sj } = await ncmEapiPost('/api/cloudsearch/pc', { s: kw, type: 1, limit: 5, offset: 0, total: true }, cfg.cookie);
        if (sj?.result?.songs?.length) songId = String(sj.result.songs[0].id);
      } catch {}
    }
    if (!songId) return null;
    // Try requested level first; if sky/jyeffect returns empty url (song lacks multichannel mix), try jymaster/lossless once.
    const fastLevels = (requestedLevel === 'sky' || requestedLevel === 'jyeffect')
      ? [requestedLevel, 'jymaster', 'exhigh']
      : [requestedLevel, 'exhigh'];
    let trialFallback = null;
    for (const lv of fastLevels) {
      try {
        const payload = {
          ids: `[${songId}]`,
          level: lv,
          encodeType: (lv === 'standard' || lv === 'exhigh') ? 'mp3' : 'flac'
        };
        if (lv === 'sky') payload.immerseType = 'c51';
        const { json } = await ncmEapiPost('/api/song/enhance/player/url/v1', payload, cfg.cookie);
        const item0 = json?.data?.[0];
        const parsed = extractEntry(item0, lv);
        if (parsed && !parsed.trialOnly) return remember(parsed);
        if (parsed && parsed.trialOnly && item0?.url) {
          trialFallback = {
            url: item0.url,
            headers: { 'User-Agent': NCM_UA, 'Referer': 'https://music.163.com/' },
            actualQuality: mapNcmLevelToUiKey(item0.level || lv, item0.br),
            actualBitrate: Number(item0.br || 128000),
            actualFormat: String(item0.type || 'mp3').toLowerCase(),
            requestedQuality: requestedUi,
            downgraded: true,
            isTrialClip: true,
            reason: 'vip-trial-fallback'
          };
          // If NetEase returned a VIP trial clip, higher/lower tiers on the same account will also be trial clips — break immediately!
          break;
        }
      } catch {}
    }
    if (trialFallback && allowPublicEapi) return trialFallback;
    return null;
  }

  /* ── 2. Navidrome / Subsonic / OpenSubsonic ── */
  async function testSubsonic(cfg) {
    const base = cleanBaseUrl(cfg.baseUrl);
    if (!base || !cfg.username) return { ok: false, message: '请填写服务器地址与用户名' };
    const qs = subsonicAuthParams(cfg.username, cfg.password);
    try {
      const r = await fetchWithTimeout(`${base}/rest/ping?${qs}`, {}, 8000);
      if (!r.ok) return { ok: false, message: `服务器返回 HTTP ${r.status}` };
      const j = await r.json();
      const sr = j?.['subsonic-response'];
      if (sr?.status === 'ok') {
        const ver = sr.serverVersion || sr.version || 'OK';
        return { ok: true, message: `Navidrome / Subsonic 连接成功 (${ver})` };
      }
      return { ok: false, message: sr?.error?.message || '认证失败，请检查用户名与密码' };
    } catch (e) {
      return { ok: false, message: `无法连接到 ${base}：${e.message}` };
    }
  }

  async function resolveSubsonicStream(title, artist) {
    const cfg = config.subsonic;
    if (!cfg.enabled || !cfg.baseUrl || !cfg.username || !title) return null;
    const qs = subsonicAuthParams(cfg.username, cfg.password);
    qs.set('query', title);
    qs.set('songCount', '12');
    qs.set('albumCount', '0');
    qs.set('artistCount', '0');
    try {
      const r = await fetchWithTimeout(`${cfg.baseUrl}/rest/search3?${qs}`, {}, 8000);
      if (!r.ok) return null;
      const j = await r.json();
      const songs = j?.['subsonic-response']?.searchResult3?.song || [];
      if (!songs.length) return null;

      const normTitle = normalizeText(title);
      const normArtist = normalizeText(artist);
      let best = songs[0];
      let bestScore = -1;
      for (const s of songs) {
        const st = normalizeText(s.title);
        const sa = normalizeText(s.artist);
        let score = 0;
        if (st === normTitle) score += 100;
        else if (st.includes(normTitle) || normTitle.includes(st)) score += 60;
        if (normArtist && sa && (sa.includes(normArtist) || normArtist.includes(sa))) score += 25;
        if (score > bestScore) { bestScore = score; best = s; }
      }
      if (bestScore < 30) return null;

      const streamQs = subsonicAuthParams(cfg.username, cfg.password);
      streamQs.set('id', String(best.id));
      return { url: `${cfg.baseUrl}/rest/stream?${streamQs}`, headers: {} };
    } catch {}
    return null;
  }

  /* ── 3. WebDAV / NAS (支持 Alist / 飞牛音乐 fnOS / 群晖 / 极空间 / OpenList) ── */
  async function listWebdavDir(dirUrl, auth) {
    const headers = { Depth: '1', 'User-Agent': 'ShinyStories/1.0' };
    if (auth) headers['Authorization'] = auth;
    const r = await fetchWithTimeout(dirUrl, { method: 'PROPFIND', headers }, 10000);
    if (!r.ok && r.status !== 207) throw new Error(`HTTP ${r.status}`);
    const xml = await r.text();
    const baseOrigin = new URL(dirUrl).origin;
    const basePath = new URL(dirUrl).pathname.replace(/\/+$/, '');
    const files = [];
    const subdirs = [];
    // Parse per <response> block so fnOS/飞牛 WebDAV (<D:collection/> without trailing slash) is detected reliably
    const blocks = xml.match(/<(?:[a-zA-Z0-9_-]+:)?response\b[\s\S]*?<\/(?:[a-zA-Z0-9_-]+:)?response>/gi) || [];
    const entries = blocks.length
      ? blocks.map(blk => {
          const hm = blk.match(/<(?:[a-zA-Z0-9_-]+:)?href>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?href>/i);
          const isCol = /<(?:[a-zA-Z0-9_-]+:)?collection\b/i.test(blk);
          return hm ? { href: hm[1].trim(), isCol } : null;
        }).filter(Boolean)
      : [...xml.matchAll(/<(?:[a-zA-Z0-9_-]+:)?href>([^<]+)<\/(?:[a-zA-Z0-9_-]+:)?href>/gi)].map(m => ({ href: m[1].trim(), isCol: m[1].trim().endsWith('/') }));
    for (const { href: h, isCol } of entries) {
      let full;
      try { full = h.startsWith('http') ? h : new URL(h, baseOrigin).href; } catch { continue; }
      const u = new URL(full);
      const cleanP = u.pathname.replace(/\/+$/, '');
      if (cleanP === basePath) continue;
      let decodedName = '';
      try { decodedName = decodeURIComponent(cleanP.split('/').pop() || ''); } catch { decodedName = cleanP.split('/').pop() || ''; }
      if (AUDIO_EXT_RE.test(decodedName)) {
        files.push({ url: full, name: decodedName, norm: normalizeText(decodedName.replace(AUDIO_EXT_RE, '')) });
      } else if (isCol || h.endsWith('/')) {
        subdirs.push(full.endsWith('/') ? full : (full + '/'));
      }
    }
    return { files, subdirs };
  }

  async function buildWebdavIndex(cfg) {
    const base = cleanBaseUrl(cfg.baseUrl) + '/';
    const auth = basicAuthHeader(cfg.username, cfg.password);
    const root = await listWebdavDir(base, auth);
    const allFiles = [...root.files];
    // Scan up to 3 levels (Artist / Album / Track) for 飞牛音乐 fnOS & NAS music libraries
    const queue = root.subdirs.slice(0, 24).map(url => ({ url, depth: 1 }));
    let visited = 0;
    while (queue.length && visited < 48) {
      const cur = queue.shift();
      visited++;
      try {
        const subRes = await listWebdavDir(cur.url, auth);
        allFiles.push(...subRes.files);
        if (cur.depth < 2) {
          for (const child of subRes.subdirs.slice(0, 12)) {
            if (queue.length + visited < 48) queue.push({ url: child, depth: cur.depth + 1 });
          }
        }
      } catch {}
    }
    return allFiles;
  }

  async function testWebdav(cfg) {
    const base = cleanBaseUrl(cfg.baseUrl);
    if (!base) return { ok: false, message: '请先填写 WebDAV 目录地址' };
    try {
      const files = await buildWebdavIndex(cfg);
      webdavIndex = { at: Date.now(), baseUrl: base, files };
      return { ok: true, message: `WebDAV 连接成功 · 扫描到 ${files.length} 首音频文件` };
    } catch (e) {
      return { ok: false, message: `WebDAV 连接失败：${e.message}` };
    }
  }

  async function resolveWebdavStream(title) {
    const cfg = config.webdav;
    if (!cfg.enabled || !cfg.baseUrl || !title) return null;
    try {
      if (webdavIndex.baseUrl !== cfg.baseUrl || Date.now() - webdavIndex.at > 10 * 60 * 1000) {
        const files = await buildWebdavIndex(cfg);
        webdavIndex = { at: Date.now(), baseUrl: cfg.baseUrl, files };
      }
      const normTitle = normalizeText(title);
      if (!normTitle) return null;
      let best = null;
      let bestScore = 0;
      for (const f of webdavIndex.files) {
        let score = 0;
        if (f.norm === normTitle) score = 100;
        else if (f.norm.includes(normTitle)) score = 75;
        else if (normTitle.length >= 4 && f.norm.length >= 4 && normTitle.includes(f.norm)) score = 60;
        if (score > bestScore) { bestScore = score; best = f; }
      }
      if (!best) return null;
      const auth = basicAuthHeader(cfg.username, cfg.password);
      return { url: best.url, headers: auth ? { Authorization: auth } : {} };
    } catch {}
    return null;
  }

  /* ── HTTP Route Handler ── */
  async function handler(req, res, u) {
    const p = decodeURIComponent(u.pathname);
    if (!p.startsWith('/api/private-music/')) return false;

    if (p === '/api/private-music/ncm/comments' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      try {
        let songId = /^\d+$/.test(u.searchParams.get('id') || '') ? u.searchParams.get('id') : '';
        const title = u.searchParams.get('title') || '';
        const artist = u.searchParams.get('artist') || '';
        if (!songId && title) {
          const { json: sj } = await ncmEapiPost('/api/cloudsearch/pc', { s: [title, artist].filter(Boolean).join(' '), type: 1, limit: 3, offset: 0, total: true }, config.ncm.cookie);
          if (sj?.result?.songs?.length) songId = String(sj.result.songs[0].id);
        }
        if (!songId) { res.end(JSON.stringify({ ok: true, total: 0, hotComments: [], comments: [] })); return true; }
        const limit = Math.min(50, Math.max(5, Number(u.searchParams.get('limit') || 25)));
        const r = await fetchWithTimeout(`https://music.163.com/api/v1/resource/comments/R_SO_4_${songId}?limit=${limit}&offset=0`, {
          headers: { 'User-Agent': NCM_UA, 'Referer': 'https://music.163.com/' }
        }, 9000);
        const j = await r.json();
        const mapC = (c) => ({
          id: c.commentId,
          user: c.user?.nickname || '听众',
          avatar: c.user?.avatarUrl || '/app-icon.png',
          content: c.content || '',
          likedCount: c.likedCount || 0,
          timeStr: c.timeStr || (c.time ? new Date(c.time).toLocaleDateString('zh-CN') : '')
        });
        res.end(JSON.stringify({
          ok: true,
          total: j.total || 0,
          hotComments: (j.hotComments || []).map(mapC),
          comments: (j.comments || []).map(mapC)
        }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, total: 0, hotComments: [], comments: [], message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/ncm/mv' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      try {
        let mvId = Number(u.searchParams.get('mvId') || 0);
        let mvMeta = { name: u.searchParams.get('title') || '', artist: u.searchParams.get('artist') || '', cover: '' };
        const songId = /^\d+$/.test(u.searchParams.get('id') || '') ? u.searchParams.get('id') : '';
        if (!mvId && songId) {
          try {
            const { json: d } = await ncmEapiPost('/api/v3/song/detail', { c: JSON.stringify([{ id: Number(songId) }]) }, config.ncm.cookie);
            const s = d?.songs?.[0];
            if (s?.mv) { mvId = Number(s.mv); mvMeta.name = s.name || mvMeta.name; mvMeta.cover = s.al?.picUrl || ''; }
          } catch {}
          // If the song officially has no MV (s.mv === 0), do NOT fuzzy-search unrelated MVs!
          if (!mvId) { res.end(JSON.stringify({ ok: false, message: '该曲目暂无官方 MV' })); return true; }
        }
        if (!mvId && !songId && mvMeta.name) {
          const kw = [mvMeta.name, mvMeta.artist].filter(Boolean).join(' ');
          const { json: ms } = await ncmEapiPost('/api/cloudsearch/pc', { s: kw, type: 1004, limit: 5, offset: 0 }, config.ncm.cookie);
          const wantNorm = normalizeText(mvMeta.name);
          const exact = (ms?.result?.mvs || []).find(m => m?.id && normalizeText(m.name) === wantNorm);
          if (exact?.id) {
            mvId = Number(exact.id);
            mvMeta = { name: exact.name || mvMeta.name, artist: exact.artistName || mvMeta.artist, cover: exact.cover || '' };
          }
        }
        if (!mvId) { res.end(JSON.stringify({ ok: false, message: '该曲目暂无官方 MV' })); return true; }
        const sources = [];
        for (const br of [1080, 720, 480]) {
          try {
            const { json: mvu } = await ncmEapiPost('/api/song/enhance/play/mv/url', { id: mvId, r: br }, config.ncm.cookie);
            const rawUrl = mvu?.data?.url || '';
            if (rawUrl && rawUrl.startsWith('http') && !sources.some(s => s.directUrl === rawUrl)) {
              sources.push({
                label: `${br}P`,
                br,
                directUrl: rawUrl,
                streamUrl: `/api/private-music/mv-stream?url=${encodeURIComponent(rawUrl)}`
              });
            }
          } catch {}
        }
        if (!sources.length) {
          res.end(JSON.stringify({ ok: false, message: '当前 MV 暂不可播放' })); return true;
        }
        res.end(JSON.stringify({
          ok: true,
          mvId,
          ...mvMeta,
          directUrl: sources[0].directUrl,
          streamUrl: sources[0].streamUrl,
          sources
        }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/mv-stream' && (req.method === 'GET' || req.method === 'HEAD')) {
      const target = u.searchParams.get('url') || '';
      if (!target || !/^https?:\/\/[^/]*(126\.net|127\.net|netease\.com|qq\.com|kugou\.com)\//i.test(target)) {
        res.writeHead(400); res.end('Invalid MV URL'); return true;
      }
      try {
        const hdr = { 'User-Agent': NCM_UA };
        if (!/vod\.126\.net/i.test(target)) hdr['Referer'] = 'https://music.163.com/';
        if (req.headers.range) hdr['Range'] = req.headers.range;
        const up = await domesticDirectFetch(target, { headers: hdr, redirect: 'follow' }, 0);
        if (!up.ok && up.status !== 206) {
          res.writeHead(up.status); res.end('Upstream MV HTTP ' + up.status); return true;
        }
        await pipeUpstreamAudio(up, req, res);
      } catch (e) {
        if (!res.headersSent) res.writeHead(502);
        res.end(e.message);
      }
      return true;
    }

    // Helper: compute QQ Music g_tk from cookie
    function computeQqGtk(cookieStr) {
      const m = String(cookieStr || '').match(/(?:^|;\s*)(?:qm_keyst|p_skey|skey)=([^;]+)/);
      const skey = m ? m[1].trim() : '';
      let hash = 5381;
      for (let i = 0; i < skey.length; i++) hash += (hash << 5) + skey.charCodeAt(i);
      return hash & 0x7fffffff;
    }

    // Unified Multi-Platform Account Playlists & Favorites (网易云 / QQ音乐 / 酷狗 / Apple / 咪咕 / 自建Subsonic)
    if (p === '/api/private-music/account/playlists' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      const plat = String(u.searchParams.get('platform') || 'netease').toLowerCase();
      const platNames = { netease: '网易云音乐', auto: '网易云音乐', qq: 'QQ 音乐', kugou: '酷狗音乐', apple: 'Apple Music', migu: '咪咕音乐', private: 'Navidrome / Subsonic' };
      const platformName = platNames[plat] || plat;

      if (plat === 'netease' || plat === 'auto') {
        if (!config.ncm.cookie) {
          res.end(JSON.stringify({ ok: false, notLoggedIn: true, platform: plat, platformName, playlists: [], likedIds: [] }));
          return true;
        }
        try {
          const profile = await fetchNcmProfile(config.ncm.cookie);
          if (!profile?.uid) {
            res.end(JSON.stringify({ ok: false, platform: plat, platformName, message: '无法获取网易云账号信息，请重新登录', playlists: [], likedIds: [] }));
            return true;
          }
          const [plRes, likeRes] = await Promise.all([
            ncmEapiPost('/api/user/playlist', { uid: profile.uid, limit: 60, offset: 0, includeVideo: true }, config.ncm.cookie),
            ncmEapiPost('/api/song/like/get', { uid: profile.uid }, config.ncm.cookie).catch(() => ({ json: {} }))
          ]);
          const fixPic = (u2) => {
            if (!u2) return '/app-icon.png';
            const s = String(u2).replace(/^http:\/\//i, 'https://');
            return s.includes('music.126.net') && !s.includes('param=') ? s + '?param=300y300' : s;
          };
          const playlists = (plRes?.json?.playlist || []).map(pl => ({
            id: String(pl.id),
            name: pl.name || '未命名歌单',
            cover: fixPic(pl.coverImgUrl),
            trackCount: Number(pl.trackCount || 0),
            isLiked: Number(pl.specialType) === 5,
            creator: pl.creator?.nickname || '',
            isOwned: Number(pl.creator?.userId || 0) === profile.uid
          }));
          const likedIds = (likeRes?.json?.ids || []).map(x => String(x));
          res.end(JSON.stringify({ ok: true, platform: plat, platformName, uid: profile.uid, nickname: profile.nickname, avatar: profile.avatar, playlists, likedIds }));
        } catch (e) {
          res.end(JSON.stringify({ ok: false, platform: plat, platformName, message: e.message, playlists: [], likedIds: [] }));
        }
        return true;
      }

      if (plat === 'qq') {
        const qqAuth = config.platforms?.qq || {};
        if (!qqAuth.enabled || !qqAuth.cookie) {
          res.end(JSON.stringify({ ok: false, notLoggedIn: true, platform: 'qq', platformName, playlists: [], likedIds: [] }));
          return true;
        }
        try {
          const uin = String(qqAuth.uin || (qqAuth.cookie.match(/(?:^|;\s*)(?:uin|p_uin|wxuin)=o?(\d+)/)?.[1]) || '').trim();
          const gtk = computeQqGtk(qqAuth.cookie);
          const hdr = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://y.qq.com/', 'Cookie': qqAuth.cookie };
          const [profR, createdR] = await Promise.all([
            fetchWithTimeout(`https://c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg?cid=205360838&ct=20&userid=${encodeURIComponent(uin)}&reqfrom=1&reqtype=0&g_tk=${gtk}&format=json`, { headers: hdr }, 10000).then(r => r.json()).catch(() => ({})),
            fetchWithTimeout(`https://c.y.qq.com/rsc/fcgi-bin/fcg_user_created_diss?hostuin=${encodeURIComponent(uin)}&sin=0&size=50&g_tk=${gtk}&format=json`, { headers: hdr }, 10000).then(r => r.json()).catch(() => ({}))
          ]);
          const nickname = profR?.data?.creator?.nick || qqAuth.nickname || (uin ? `QQ ${uin}` : 'QQ 音乐用户');
          const playlists = [];
          const mymusic = profR?.data?.mymusic || [];
          const likeEntry = mymusic.find(m => m.id && /喜欢|fav/i.test(String(m.title || ''))) || mymusic[0];
          if (likeEntry?.id) {
            playlists.push({
              id: String(likeEntry.id),
              name: likeEntry.title || '我喜欢',
              cover: likeEntry.laypic || likeEntry.picurl || '/app-icon.png',
              trackCount: Number(likeEntry.num0 || 0),
              isLiked: true,
              creator: nickname,
              isOwned: true
            });
          }
          const dissList = createdR?.data?.disslist || profR?.data?.mydiss?.list || [];
          for (const d of dissList) {
            const tid = String(d.tid || d.dissid || '');
            if (!tid || tid === '0' || playlists.some(x => x.id === tid)) continue;
            playlists.push({
              id: tid,
              name: d.diss_name || d.title || 'QQ 歌单',
              cover: (d.diss_cover || d.picurl || '/app-icon.png').replace(/^http:\/\//i, 'https://'),
              trackCount: Number(d.song_cnt || d.subtitle?.match(/\d+/)?.[0] || 0),
              isLiked: false,
              creator: nickname,
              isOwned: true
            });
          }
          res.end(JSON.stringify({ ok: true, platform: 'qq', platformName, uid: uin, nickname, playlists, likedIds: [] }));
        } catch (e) {
          res.end(JSON.stringify({ ok: false, platform: 'qq', platformName, message: '读取 QQ 音乐歌单失败：' + e.message, playlists: [], likedIds: [] }));
        }
        return true;
      }

      if (plat === 'private') {
        const sub = config.subsonic || {};
        if (!sub.enabled || !sub.baseUrl) {
          res.end(JSON.stringify({ ok: false, notLoggedIn: true, platform: 'private', platformName, playlists: [], likedIds: [] }));
          return true;
        }
        try {
          const authQ = subsonicAuthQuery(sub);
          const base = cleanBaseUrl(sub.baseUrl);
          const [plJ, starJ] = await Promise.all([
            fetchWithTimeout(`${base}/rest/getPlaylists.view?${authQ}`, {}, 8000).then(r => r.json()).catch(() => ({})),
            fetchWithTimeout(`${base}/rest/getStarred2.view?${authQ}`, {}, 8000).then(r => r.json()).catch(() => ({}))
          ]);
          const starredSongs = starJ?.['subsonic-response']?.starred2?.song || [];
          const playlists = [{
            id: '__starred__',
            name: '我喜欢的音乐 (Subsonic Starred)',
            cover: '/app-icon.png',
            trackCount: starredSongs.length,
            isLiked: true,
            creator: sub.username || '自建曲库',
            isOwned: true
          }];
          for (const pl of (plJ?.['subsonic-response']?.playlists?.playlist || [])) {
            playlists.push({
              id: String(pl.id),
              name: pl.name || '未命名歌单',
              cover: '/app-icon.png',
              trackCount: Number(pl.songCount || 0),
              isLiked: false,
              creator: pl.owner || sub.username || '自建曲库',
              isOwned: true
            });
          }
          res.end(JSON.stringify({ ok: true, platform: 'private', platformName, nickname: sub.username || '自建曲库', playlists, likedIds: starredSongs.map(s => String(s.id)) }));
        } catch (e) {
          res.end(JSON.stringify({ ok: false, platform: 'private', platformName, message: e.message, playlists: [], likedIds: [] }));
        }
        return true;
      }

      // Kugou / Apple Music / Migu
      const pAuth = config.platforms?.[plat] || {};
      const loggedIn = plat === 'apple' ? !!(pAuth.enabled && pAuth.mediaUserToken) : !!(pAuth.enabled && (pAuth.cookie || pAuth.token));
      if (!loggedIn) {
        res.end(JSON.stringify({ ok: false, notLoggedIn: true, platform: plat, platformName, playlists: [], likedIds: [] }));
        return true;
      }
      res.end(JSON.stringify({
        ok: true,
        platform: plat,
        platformName,
        nickname: pAuth.nickname || `已登录 ${platformName}`,
        playlists: [{ id: `__local_fav_${plat}__`, name: `${platformName} 收藏歌单`, cover: '/app-icon.png', trackCount: 0, isLiked: true, creator: pAuth.nickname || platformName, isOwned: true }],
        likedIds: [],
        localFavOnly: true
      }));
      return true;
    }

    if (p === '/api/private-music/account/playlist-tracks' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      const plat = String(u.searchParams.get('platform') || 'netease').toLowerCase();
      const pid = u.searchParams.get('id') || '';
      if (!pid) { res.end(JSON.stringify({ ok: false, songs: [] })); return true; }

      if (plat === 'qq') {
        const qqAuth = config.platforms?.qq || {};
        try {
          const gtk = computeQqGtk(qqAuth.cookie);
          const hdr = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': 'https://y.qq.com/', 'Cookie': qqAuth.cookie || '' };
          const r = await fetchWithTimeout(`https://c.y.qq.com/qzone/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg?type=1&json=1&utf8=1&onlysong=0&disstid=${encodeURIComponent(pid)}&g_tk=${gtk}&format=json`, { headers: hdr }, 10000);
          const j = await r.json();
          const cd = j?.cdlist?.[0];
          const songs = (cd?.songlist || []).map(s => {
            const artist = (s.singer || []).map(a => a.name).join(' / ') || '未知歌手';
            const mid = s.songmid || s.mid || '';
            const albMid = s.albummid || s.album?.mid || '';
            return {
              id: 'qq_' + (mid || s.songid),
              qqMid: mid,
              qqSongId: s.songid || s.id || 0,
              title: s.songname || s.name || '',
              titleZh: '',
              unitName: artist,
              vocalists: artist,
              album: s.albumname || s.album?.name || '',
              cover: albMid ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${albMid}.jpg` : '/app-icon.png',
              duration: Number(s.interval || 180),
              source: 'qq',
              sourceName: '🐧 QQ',
              sourceEngine: 'qq'
            };
          });
          res.end(JSON.stringify({ ok: true, platform: 'qq', songs }));
        } catch (e) {
          res.end(JSON.stringify({ ok: false, platform: 'qq', songs: [], message: e.message }));
        }
        return true;
      }

      if (plat === 'private') {
        const sub = config.subsonic || {};
        try {
          const authQ = subsonicAuthQuery(sub);
          const base = cleanBaseUrl(sub.baseUrl);
          const url = pid === '__starred__'
            ? `${base}/rest/getStarred2.view?${authQ}`
            : `${base}/rest/getPlaylist.view?${authQ}&id=${encodeURIComponent(pid)}`;
          const j = await fetchWithTimeout(url, {}, 8000).then(r => r.json());
          const rawList = pid === '__starred__'
            ? (j?.['subsonic-response']?.starred2?.song || [])
            : (j?.['subsonic-response']?.playlist?.entry || []);
          const songs = rawList.map(s => ({
            id: 'sub_' + s.id,
            subsonicId: String(s.id),
            title: s.title || '',
            titleZh: '',
            unitName: s.artist || '自建曲库',
            vocalists: s.artist || '',
            album: s.album || '',
            cover: '/app-icon.png',
            duration: Number(s.duration || 180),
            source: 'private',
            sourceName: '🎵 自建',
            sourceEngine: 'private'
          }));
          res.end(JSON.stringify({ ok: true, platform: 'private', songs }));
        } catch (e) {
          res.end(JSON.stringify({ ok: false, platform: 'private', songs: [], message: e.message }));
        }
        return true;
      }

      // Default: NetEase
      try {
        const { json } = await ncmEapiPost('/api/v6/playlist/detail', { id: Number(pid), n: 200, s: 8 }, config.ncm.cookie);
        const pl = json?.playlist;
        if (!pl) { res.end(JSON.stringify({ ok: false, songs: [], message: '歌单加载失败或无权访问' })); return true; }
        let rawTracks = pl.tracks || [];
        const allIds = (pl.trackIds || []).map(t => Number(t.id)).filter(Boolean);
        if (allIds.length > rawTracks.length) {
          const batchIds = allIds.slice(0, 200);
          try {
            const { json: dj } = await ncmEapiPost('/api/v3/song/detail', { c: JSON.stringify(batchIds.map(id => ({ id }))) }, config.ncm.cookie);
            if (Array.isArray(dj?.songs) && dj.songs.length) rawTracks = dj.songs;
          } catch {}
        }
        const fixPic = (u2) => {
          if (!u2) return '/app-icon.png';
          const s = String(u2).replace(/^http:\/\//i, 'https://');
          return s.includes('music.126.net') && !s.includes('param=') ? s + '?param=300y300' : s;
        };
        const songs = rawTracks.map(s => {
          const artist = (s.ar || s.artists || []).map(a => a.name).join(' / ') || '未知歌手';
          const al = s.al || s.album || {};
          return {
            id: 'ne_' + s.id,
            neteaseId: s.id,
            title: s.name || '',
            titleZh: '',
            unitName: artist,
            vocalists: artist,
            album: al.name || '',
            cover: fixPic(al.picUrl),
            duration: Math.round(Number(s.dt || s.duration || 180000) / 1000) || 180,
            source: 'netease',
            sourceName: '🎵 网易',
            sourceEngine: 'netease'
          };
        });
        res.end(JSON.stringify({ ok: true, platform: 'netease', songs }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, songs: [], message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/account/like' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      try {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 16384) break;
        }
        const body = JSON.parse(raw || '{}');
        const plat = String(body.platform || 'netease').toLowerCase();
        const like = body.like !== false;

        if (plat === 'qq') {
          const qqAuth = config.platforms?.qq || {};
          if (!qqAuth.enabled || !qqAuth.cookie) {
            res.end(JSON.stringify({ ok: false, notLoggedIn: true, message: '未登录 QQ 音乐账号' }));
            return true;
          }
          let songId = Number(body.qqSongId || 0);
          let qqMid = String(body.qqMid || '').trim();
          if (!songId && (qqMid || body.title)) {
            const q = [body.title, String(body.artist || '').split(/[・/、,&]/)[0]].filter(Boolean).join(' ');
            const sr = await fetchWithTimeout('https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=3&w=' + encodeURIComponent(q) + '&format=json', { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://y.qq.com/' } }, 8000).then(r => r.json()).catch(() => ({}));
            const hit = (sr?.data?.song?.list || []).find(s => qqMid ? s.songmid === qqMid : true) || sr?.data?.song?.list?.[0];
            if (hit) { songId = Number(hit.songid || 0); qqMid = hit.songmid || qqMid; }
          }
          if (!songId) { res.end(JSON.stringify({ ok: false, message: '未匹配到 QQ 音乐曲目 ID' })); return true; }
          const gtk = computeQqGtk(qqAuth.cookie);
          const uin = String(qqAuth.uin || (qqAuth.cookie.match(/(?:^|;\s*)(?:uin|p_uin|wxuin)=o?(\d+)/)?.[1]) || '').trim();
          const url = like
            ? `https://c.y.qq.com/splcloud/fcgi-bin/fcg_music_add2songdir.fcg?g_tk=${gtk}`
            : `https://c.y.qq.com/qzone/fcg-bin/fcg_music_delbatchsong.fcg?g_tk=${gtk}`;
          const form = like
            ? `loginUin=${uin}&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.post&needNewCode=0&uin=${uin}&midlist=${encodeURIComponent(qqMid)}&typelist=13&dirid=201&addtype=&formsender=4&source=153&r2=0&r3=1&utf8=1&g_tk=${gtk}`
            : `loginUin=${uin}&hostUin=0&format=json&inCharset=utf8&outCharset=utf-8&notice=0&platform=yqq.post&needNewCode=0&uin=${uin}&dirid=201&ids=${songId}&types=3&formsender=4&flag=2&from=3&utf8=1&g_tk=${gtk}`;
          const lr = await fetchWithTimeout(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': 'https://y.qq.com/', 'Origin': 'https://y.qq.com', 'Cookie': qqAuth.cookie, 'User-Agent': 'Mozilla/5.0' },
            body: form
          }, 8000).then(r => r.json()).catch(() => ({}));
          const ok = Number(lr?.code) === 0;
          res.end(JSON.stringify({ ok, platform: 'qq', qqMid, qqSongId: songId, liked: like, message: ok ? (like ? '已同步喜欢到 QQ 音乐账号' : '已从 QQ 音乐账号取消喜欢') : (lr?.msg || 'QQ 音乐同步失败') }));
          return true;
        }

        if (plat === 'private') {
          const sub = config.subsonic || {};
          if (!sub.enabled || !sub.baseUrl || !body.subsonicId) {
            res.end(JSON.stringify({ ok: false, message: '未连接自建 Subsonic 曲库' }));
            return true;
          }
          const authQ = subsonicAuthQuery(sub);
          const ep = like ? 'star.view' : 'unstar.view';
          const j = await fetchWithTimeout(`${cleanBaseUrl(sub.baseUrl)}/rest/${ep}?${authQ}&id=${encodeURIComponent(body.subsonicId)}`, {}, 8000).then(r => r.json()).catch(() => ({}));
          const ok = j?.['subsonic-response']?.status === 'ok';
          res.end(JSON.stringify({ ok, platform: 'private', liked: like, message: ok ? (like ? '已同步标星到自建曲库' : '已取消自建曲库标星') : '同步失败' }));
          return true;
        }

        if (plat === 'netease' || plat === 'auto') {
          if (!config.ncm.cookie) {
            res.end(JSON.stringify({ ok: false, notLoggedIn: true, message: '未登录网易云账号' }));
            return true;
          }
          let songId = Number(body.songId || 0);
          if (!songId && body.title) {
            const kw = [body.title, String(body.artist || '').split(/[・/、,&]/)[0]].filter(Boolean).join(' ');
            const { json: sj } = await ncmEapiPost('/api/cloudsearch/pc', { s: kw, type: 1, limit: 1, offset: 0 }, config.ncm.cookie);
            songId = Number(sj?.result?.songs?.[0]?.id || 0);
          }
          if (!songId) { res.end(JSON.stringify({ ok: false, message: '未能匹配到网易云歌曲 ID' })); return true; }
          const { json } = await ncmEapiPost('/api/radio/like', { alg: 'itembased', trackId: songId, like, time: 25 }, config.ncm.cookie);
          const ok = json?.code === 200;
          res.end(JSON.stringify({ ok, platform: 'netease', songId, liked: like, message: ok ? (like ? '已同步喜欢到网易云账号' : '已从网易云账号取消喜欢') : (json?.message || '同步失败') }));
          return true;
        }

        res.end(JSON.stringify({ ok: false, localOnly: true, message: '已保存到该平台本地收藏' }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/ncm/user-playlists' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (!config.ncm.cookie) {
        res.end(JSON.stringify({ ok: false, notLoggedIn: true, playlists: [], likedIds: [] }));
        return true;
      }
      try {
        const profile = await fetchNcmProfile(config.ncm.cookie);
        if (!profile?.uid) {
          res.end(JSON.stringify({ ok: false, message: '无法获取网易云账号信息，请重新登录', playlists: [], likedIds: [] }));
          return true;
        }
        const [plRes, likeRes] = await Promise.all([
          ncmEapiPost('/api/user/playlist', { uid: profile.uid, limit: 60, offset: 0, includeVideo: true }, config.ncm.cookie),
          ncmEapiPost('/api/song/like/get', { uid: profile.uid }, config.ncm.cookie).catch(() => ({ json: {} }))
        ]);
        const fixPic = (u2) => {
          if (!u2) return '/app-icon.png';
          const s = String(u2).replace(/^http:\/\//i, 'https://');
          return s.includes('music.126.net') && !s.includes('param=') ? s + '?param=300y300' : s;
        };
        const playlists = (plRes?.json?.playlist || []).map(pl => ({
          id: String(pl.id),
          name: pl.name || '未命名歌单',
          cover: fixPic(pl.coverImgUrl),
          trackCount: Number(pl.trackCount || 0),
          isLiked: Number(pl.specialType) === 5,
          creator: pl.creator?.nickname || '',
          isOwned: Number(pl.creator?.userId || 0) === profile.uid
        }));
        const likedIds = (likeRes?.json?.ids || []).map(x => String(x));
        res.end(JSON.stringify({ ok: true, uid: profile.uid, nickname: profile.nickname, avatar: profile.avatar, playlists, likedIds }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, message: e.message, playlists: [], likedIds: [] }));
      }
      return true;
    }

    if (p === '/api/private-music/ncm/playlist-tracks' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      const pid = Number(u.searchParams.get('id') || 0);
      if (!pid) { res.end(JSON.stringify({ ok: false, songs: [] })); return true; }
      try {
        const { json } = await ncmEapiPost('/api/v6/playlist/detail', { id: pid, n: 200, s: 8 }, config.ncm.cookie);
        const pl = json?.playlist;
        if (!pl) { res.end(JSON.stringify({ ok: false, songs: [], message: '歌单加载失败或无权访问' })); return true; }
        let rawTracks = pl.tracks || [];
        const allIds = (pl.trackIds || []).map(t => Number(t.id)).filter(Boolean);
        if (allIds.length > rawTracks.length) {
          const batchIds = allIds.slice(0, 200);
          try {
            const { json: dj } = await ncmEapiPost('/api/v3/song/detail', { c: JSON.stringify(batchIds.map(id => ({ id }))) }, config.ncm.cookie);
            if (Array.isArray(dj?.songs) && dj.songs.length) rawTracks = dj.songs;
          } catch {}
        }
        const fixPic = (u2) => {
          if (!u2) return '/app-icon.png';
          const s = String(u2).replace(/^http:\/\//i, 'https://');
          return s.includes('music.126.net') && !s.includes('param=') ? s + '?param=300y300' : s;
        };
        const songs = rawTracks.map(s => {
          const artist = (s.ar || s.artists || []).map(a => a.name).join(' / ') || '未知歌手';
          const al = s.al || s.album || {};
          return {
            id: 'ne_' + s.id,
            neteaseId: s.id,
            title: s.name || '',
            titleZh: '',
            unitName: artist,
            vocalists: artist,
            album: al.name || '',
            cover: fixPic(al.picUrl),
            duration: Math.round(Number(s.dt || s.duration || 180000) / 1000) || 180,
            source: 'netease',
            sourceName: '🎵 网易',
            sourceEngine: 'netease'
          };
        });
        res.end(JSON.stringify({
          ok: true,
          playlist: { id: String(pl.id), name: pl.name || '', cover: fixPic(pl.coverImgUrl), trackCount: Number(pl.trackCount || songs.length) },
          songs
        }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, songs: [], message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/ncm/like' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (!config.ncm.cookie) {
        res.end(JSON.stringify({ ok: false, notLoggedIn: true, message: '未登录网易云账号' }));
        return true;
      }
      try {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 16384) break;
        }
        const body = JSON.parse(raw || '{}');
        let songId = Number(body.songId || 0);
        const like = body.like !== false;
        if (!songId && body.title) {
          const kw = [body.title, String(body.artist || '').split(/[・/、,&]/)[0]].filter(Boolean).join(' ');
          const { json: sj } = await ncmEapiPost('/api/cloudsearch/pc', { s: kw, type: 1, limit: 1, offset: 0 }, config.ncm.cookie);
          songId = Number(sj?.result?.songs?.[0]?.id || 0);
        }
        if (!songId) {
          res.end(JSON.stringify({ ok: false, message: '未能匹配到网易云歌曲 ID' }));
          return true;
        }
        const { json } = await ncmEapiPost('/api/radio/like', { alg: 'itembased', trackId: songId, like, time: 25 }, config.ncm.cookie);
        const ok = json?.code === 200;
        res.end(JSON.stringify({ ok, code: json?.code, songId, liked: like, message: ok ? (like ? '已同步喜欢到网易云账号' : '已从网易云账号取消喜欢') : (json?.message || '同步失败') }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/ncm/podcasts' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      try {
        const q = (u.searchParams.get('query') || '偶像大师').trim();
        const neHdr = { 'User-Agent': NCM_UA, 'Referer': 'https://music.163.com/' };
        if (config.ncm.cookie) neHdr['Cookie'] = buildNcmCookieHeader(config.ncm.cookie);
        const [voiceRes, radioRes] = await Promise.all([
          fetchWithTimeout('https://music.163.com/api/search/voice/get?keyword=' + encodeURIComponent(q) + '&scene=normal&limit=16&offset=0', { method: 'POST', headers: neHdr }, 10000).then(r => r.json()).catch(() => ({})),
          ncmEapiPost('/api/cloudsearch/pc', { s: q, type: 1009, limit: 16, offset: 0 }, config.ncm.cookie).catch(() => ({ json: {} }))
        ]);
        const fixPic = (u2) => {
          if (!u2) return '/app-icon.png';
          const s = String(u2).replace(/^http:\/\//i, 'https://');
          return s.includes('music.126.net') && !s.includes('param=') ? s + '?param=300y300' : s;
        };
        const voices = (voiceRes?.data?.resources || []).map(item => {
          const b = item.baseInfo || {};
          const sid = b.mainSong?.id || b.mainTrackId || 0;
          if (!sid) return null;
          const title = String(b.name || item.uiElement?.mainTitle?.title || '').replace(/^声音\s*[:：]\s*/, '').trim();
          const dj = b.dj?.nickname || b.radio?.name || '网易声音';
          const radio = b.radio?.name || '声音播单';
          return {
            id: 'nev_' + sid,
            neteaseId: sid,
            title,
            titleZh: '',
            unitName: radio,
            vocalists: dj,
            album: radio,
            cover: fixPic(b.coverUrl || b.blurCoverUrl || item.uiElement?.image?.imageUrl || b.mainSong?.album?.picUrl),
            duration: Math.round(Number(b.duration || b.mainSong?.duration || 180000) / 1000) || 180,
            source: 'netease',
            sourceName: '🎙 声音',
            sourceEngine: 'netease',
            isVoice: true
          };
        }).filter(Boolean);
        const radios = (radioRes?.json?.result?.djRadios || []).map(r => ({
          id: r.id,
          name: r.name || '',
          dj: r.dj?.nickname || '',
          picUrl: fixPic(r.picUrl),
          desc: r.desc || r.rcmdText || '',
          programCount: r.programCount || 0,
          subCount: r.subCount || 0
        }));
        res.end(JSON.stringify({ ok: true, voices, radios }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, voices: [], radios: [], message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/ncm/podcast-episodes' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      try {
        const radioId = Number(u.searchParams.get('radioId') || 0);
        if (!radioId) { res.end(JSON.stringify({ ok: false, episodes: [] })); return true; }
        const limit = Math.min(50, Math.max(5, Number(u.searchParams.get('limit') || 30)));
        const { json } = await ncmEapiPost('/api/dj/program/byradio', { radioId, limit, offset: 0, asc: false }, config.ncm.cookie);
        const episodes = (json?.programs || []).map(ep => ({
          id: 'dj_' + (ep.mainSong?.id || ep.id),
          programId: ep.id,
          neteaseId: ep.mainSong?.id || ep.id,
          title: ep.name || '',
          titleZh: '',
          vocalists: ep.dj?.nickname || ep.radio?.name || '声音播客',
          unitName: ep.radio?.name || '播客电台',
          album: ep.radio?.name || '声音播客',
          cover: ep.coverUrl || ep.radio?.picUrl || '/app-icon.png',
          duration: Math.round((ep.duration || ep.mainSong?.duration || 180000) / 1000),
          listenerCount: ep.listenerCount || 0,
          description: ep.description || '',
          isPodcast: true
        }));
        res.end(JSON.stringify({ ok: true, episodes }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, episodes: [], message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/ncm/qr-create' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      try { res.end(JSON.stringify(await createNcmQr())); }
      catch (e) { res.end(JSON.stringify({ ok: false, message: e.message })); }
      return true;
    }

    if (p === '/api/private-music/ncm/qr-check' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      try { res.end(JSON.stringify(await checkNcmQr(u.searchParams.get('key') || ''))); }
      catch (e) { res.end(JSON.stringify({ ok: false, code: 500, message: e.message })); }
      return true;
    }

    if (p === '/api/private-music/ncm/logout' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) {
        res.writeHead(403); res.end(JSON.stringify({ ok: false })); return true;
      }
      config.ncm.cookie = '';
      config.ncm.nickname = '';
      config.ncm.avatar = '';
      config.ncm.enabled = !!config.ncm.baseUrl;
      persistConfig();
      res.end(JSON.stringify({ ok: true, config }));
      return true;
    }

    /* ── Built-in QQ Music Official QR Login & Multi-Platform Auth ── */
    if (p === '/api/private-music/qq/qr-create' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      try {
        const r = await fetchWithTimeout(
          `https://ssl.ptlogin2.qq.com/ptqrshow?appid=716027609&e=2&l=M&s=3&d=72&v=4&t=${Math.random()}&daid=383&pt_3rd_aid=100497308`,
          { headers: { 'User-Agent': NCM_UA, 'Referer': 'https://xui.ptlogin2.qq.com/' } },
          10000
        );
        const cookieStr = extractSetCookies(r);
        const m = cookieStr.match(/qrsig=([^;]+)/);
        const qrsig = m ? m[1] : '';
        if (!qrsig) { res.end(JSON.stringify({ ok: false, message: '无法获取 QQ 扫码凭证' })); return true; }
        const buf = Buffer.from(await r.arrayBuffer());
        res.end(JSON.stringify({
          ok: true,
          qrsig,
          qrDataUrl: 'data:image/png;base64,' + buf.toString('base64')
        }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/qq/qr-check' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      try {
        const qrsig = u.searchParams.get('qrsig') || '';
        if (!qrsig) { res.end(JSON.stringify({ ok: false, code: 400, message: '缺少 qrsig' })); return true; }
        let hash = 0;
        for (let i = 0; i < qrsig.length; i++) hash += (hash << 5) + qrsig.charCodeAt(i);
        const ptqrtoken = 2147483647 & hash;
        const checkUrl = `https://ssl.ptlogin2.qq.com/ptqrlogin?u1=${encodeURIComponent('https://graph.qq.com/oauth2.0/login_jump')}&ptqrtoken=${ptqrtoken}&ptredirect=0&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-${Date.now()}&js_ver=20102616&js_type=1&login_sig=&pt_uistyle=40&aid=716027609&daid=383&pt_3rd_aid=100497308`;
        const r = await fetchWithTimeout(checkUrl, {
          headers: { 'User-Agent': NCM_UA, 'Referer': 'https://xui.ptlogin2.qq.com/', 'Cookie': `qrsig=${qrsig}` }
        }, 10000);
        const txt = await r.text();
        const m = txt.match(/ptuiCB\((.*)\)/);
        if (!m) { res.end(JSON.stringify({ ok: false, code: 500, message: '无法解析 QQ 返回状态' })); return true; }
        const parts = [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]);
        const code = Number(parts[0] || -1);
        const redirectUrl = parts[2] || '';
        const msg = parts[4] || '';
        const nickname = parts[5] || '';
        if (code === 66) { res.end(JSON.stringify({ ok: true, code: 66, message: '请用手机 QQ 扫描二维码' })); return true; }
        if (code === 67) { res.end(JSON.stringify({ ok: true, code: 67, message: '已扫码，请在手机 QQ 上点击确认登录' })); return true; }
        if (code === 65) { res.end(JSON.stringify({ ok: false, code: 65, message: '二维码已过期，请重新生成' })); return true; }
        if (code === 0) {
          let mergedCookies = extractSetCookies(r);
          if (redirectUrl && redirectUrl.startsWith('http')) {
            try {
              const r2 = await fetchWithTimeout(redirectUrl, {
                headers: { 'User-Agent': NCM_UA, 'Cookie': mergedCookies },
                redirect: 'manual'
              }, 10000);
              const c2 = extractSetCookies(r2);
              if (c2) mergedCookies = [mergedCookies, c2].filter(Boolean).join('; ');
            } catch {}
          }
          const uinM = mergedCookies.match(/(?:^|;\s*)uin=o?(\d+)/i);
          config.platforms.qq = {
            enabled: true,
            cookie: mergedCookies,
            uin: uinM ? uinM[1] : '',
            nickname: nickname || (uinM ? `QQ ${uinM[1]}` : '已登录 QQ 账号')
          };
          persistConfig();
          res.end(JSON.stringify({ ok: true, code: 0, message: 'QQ 音乐登录成功', qq: config.platforms.qq }));
          return true;
        }
        res.end(JSON.stringify({ ok: false, code, message: msg || '扫码状态异常' }));
      } catch (e) {
        res.end(JSON.stringify({ ok: false, code: 500, message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/platform-auth' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ ok: true, platforms: config.platforms }));
      return true;
    }

    if (p === '/api/private-music/platform-auth' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) {
        res.writeHead(403); res.end(JSON.stringify({ ok: false, message: 'Origin denied' })); return true;
      }
      try {
        const body = await readJsonBody(req);
        const plat = String(body.platform || '').toLowerCase();
        if (!['qq', 'kugou', 'apple', 'migu'].includes(plat)) {
          res.writeHead(400); res.end(JSON.stringify({ ok: false, message: '未知平台' })); return true;
        }
        if (body.logout) {
          config.platforms[plat] = defaultConfig().platforms[plat];
        } else if (plat === 'qq') {
          const ck = String(body.cookie || '').trim();
          const uinM = ck.match(/(?:^|;\s*)uin=o?(\d+)/i);
          config.platforms.qq = {
            enabled: !!ck,
            cookie: ck,
            uin: String(body.uin || (uinM ? uinM[1] : '')).trim(),
            nickname: String(body.nickname || (uinM ? `QQ ${uinM[1]}` : (ck ? '已绑定 QQ 音乐 Cookie' : ''))).trim()
          };
        } else if (plat === 'kugou') {
          const ck = String(body.cookie || '').trim();
          const token = String(body.token || '').trim();
          const userid = String(body.userid || '').trim();
          config.platforms.kugou = {
            enabled: !!(ck || token),
            cookie: ck,
            token,
            userid,
            nickname: String(body.nickname || (userid ? `酷狗 ${userid}` : (ck || token ? '已绑定酷狗账号' : ''))).trim()
          };
        } else if (plat === 'apple') {
          const mut = String(body.mediaUserToken || '').trim();
          const sf = String(body.storefront || 'jp').trim() || 'jp';
          config.platforms.apple = {
            enabled: !!mut,
            mediaUserToken: mut,
            storefront: sf
          };
        } else if (plat === 'migu') {
          const ck = String(body.cookie || '').trim();
          config.platforms.migu = {
            enabled: !!ck,
            cookie: ck,
            nickname: String(body.nickname || (ck ? '已绑定咪咕账号' : '')).trim()
          };
        }
        persistConfig();
        res.end(JSON.stringify({ ok: true, platforms: config.platforms }));
      } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ ok: false, message: e.message }));
      }
      return true;
    }

    if (p === '/api/private-music/browser-login' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (typeof openMusicLoginWindow !== 'function') {
        res.end(JSON.stringify({ ok: false, message: '当前环境不支持弹窗登录，请使用二维码或手动粘贴 Cookie' }));
        return true;
      }
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16384) break;
      }
      const input = JSON.parse(raw || '{}');
      const plat = String(input.platform || 'ncm').toLowerCase();
      const loginRes = await openMusicLoginWindow(plat);
      if (!loginRes?.ok || !loginRes.cookie) {
        res.end(JSON.stringify({ ok: false, message: loginRes?.message || '未检测到登录成功状态' }));
        return true;
      }
      if (plat === 'ncm') {
        const profile = await fetchNcmProfile(loginRes.cookie);
        config.preferPrivate = true;
        config.ncm.enabled = true;
        config.ncm.cookie = loginRes.cookie;
        config.ncm.nickname = profile?.nickname || pendingNcmNickname || '网易云会员';
        config.ncm.avatar = profile?.avatar || pendingNcmAvatar || '';
        persistConfig();
        res.end(JSON.stringify({ ok: true, config, nickname: config.ncm.nickname, message: `登录成功 · 欢迎 ${config.ncm.nickname}` }));
        return true;
      }
      if (plat === 'qq') {
        config.platforms.qq = {
          enabled: true,
          cookie: loginRes.cookie,
          uin: loginRes.uin || config.platforms.qq.uin || '',
          nickname: loginRes.uin ? `QQ ${loginRes.uin}` : '已登录 QQ音乐'
        };
      } else if (plat === 'kugou') {
        config.platforms.kugou = {
          enabled: true,
          cookie: loginRes.cookie,
          token: loginRes.token || '',
          userid: loginRes.userid || '',
          nickname: loginRes.userid ? `酷狗 ${loginRes.userid}` : '已登录酷狗音乐'
        };
      } else if (plat === 'apple') {
        config.platforms.apple = {
          enabled: true,
          storefront: config.platforms.apple?.storefront || 'jp',
          mediaUserToken: loginRes.token || '',
          nickname: '已登录 Apple Music'
        };
      } else if (plat === 'migu') {
        config.platforms.migu = {
          enabled: true,
          cookie: loginRes.cookie,
          nickname: '已登录咪咕音乐'
        };
      }
      persistConfig();
      res.end(JSON.stringify({ ok: true, config, platforms: config.platforms, message: '官方窗口登录成功！' }));
      return true;
    }

    if (p === '/api/private-music/config') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (req.method === 'GET') {
        res.end(JSON.stringify(config));
        return true;
      }
      if (req.method === 'POST') {
        if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) {
          res.writeHead(403); res.end(JSON.stringify({ error: 'Forbidden' })); return true;
        }
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (body.length > 65536) { res.writeHead(413); res.end(JSON.stringify({ error: 'Payload too large' })); return true; }
        }
        const saved = saveConfig(JSON.parse(body || '{}'));
        res.end(JSON.stringify({ ok: true, config: saved }));
        return true;
      }
      res.writeHead(405); res.end(); return true;
    }

    if (p === '/api/private-music/test' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (req.headers.origin && req.headers.origin !== 'http://' + req.headers.host) {
        res.writeHead(403); res.end(JSON.stringify({ ok: false, message: 'Forbidden' })); return true;
      }
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 65536) { res.writeHead(413); res.end(JSON.stringify({ ok: false, message: 'Too large' })); return true; }
      }
      const input = JSON.parse(body || '{}');
      let result = { ok: false, message: '未知数据源类型' };
      if (input.provider === 'ncm') result = await testNcm(input.config || config.ncm);
      else if (input.provider === 'subsonic') result = await testSubsonic(input.config || config.subsonic);
      else if (input.provider === 'webdav') result = await testWebdav(input.config || config.webdav);
      res.end(JSON.stringify(result));
      return true;
    }

    if (p === '/api/private-music/stream' && (req.method === 'GET' || req.method === 'HEAD')) {
      const id = u.searchParams.get('id') || '';
      const title = u.searchParams.get('title') || '';
      const artist = u.searchParams.get('artist') || '';
      const quality = u.searchParams.get('quality') || 'flac';
      const provider = u.searchParams.get('provider') || 'auto';

      const order = provider === 'auto' ? ['ncm', 'subsonic', 'webdav'] : [provider];
      let resolved = null;
      for (const item of order) {
        if (item === 'ncm') resolved = await resolveNcmStream(id, title, artist, quality);
        else if (item === 'subsonic') resolved = await resolveSubsonicStream(title, artist);
        else if (item === 'webdav') resolved = await resolveWebdavStream(title);
        if (resolved) break;
      }

      if (!resolved && id) {
        // Public domestic fallback when user hasn't configured VIP private source or track isn't in private source
        try {
          const outerUrl = `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(id)}.mp3`;
          const probe = await fetchWithTimeout(outerUrl, {
            redirect: 'manual',
            headers: { 'User-Agent': NCM_UA, 'Referer': 'https://music.163.com/' }
          }, 6000);
          const loc = probe.headers.get('location') || '';
          if (loc && loc.startsWith('http') && !loc.includes('/404')) {
            resolved = {
              url: loc,
              headers: { 'User-Agent': NCM_UA, 'Referer': 'https://music.163.com/' },
              actualQuality: '320',
              actualBitrate: 320000,
              actualFormat: 'mp3',
              requestedQuality: quality,
              downgraded: quality !== '320' && quality !== '128',
              reason: 'public-fallback'
            };
          }
        } catch {}
      }

      if (!resolved && (id || title)) {
        resolved = await resolveNcmStream(id, title, artist, quality, true);
      }

      if (!resolved) {
        res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Track not found in configured private sources' }));
        return true;
      }

      try {
        if (resolved.actualQuality) res.setHeader('X-Actual-Quality', String(resolved.actualQuality));
        if (resolved.actualBitrate) res.setHeader('X-Actual-Bitrate', String(resolved.actualBitrate));
        if (resolved.actualFormat) res.setHeader('X-Actual-Format', String(resolved.actualFormat));
        if (resolved.downgraded) res.setHeader('X-Quality-Downgraded', '1');
        if (resolved.reason) res.setHeader('X-Quality-Reason', String(resolved.reason));
        res.setHeader('Access-Control-Expose-Headers', 'X-Actual-Quality, X-Actual-Bitrate, X-Actual-Format, X-Quality-Downgraded, X-Quality-Reason');

        const fwdHeaders = { ...(resolved.headers || {}) };
        if (req.headers.range) fwdHeaders['Range'] = req.headers.range;
        const upstream = await fetchWithTimeout(resolved.url, { headers: fwdHeaders }, 15000);
        if (!upstream.ok && upstream.status !== 206) {
          res.writeHead(upstream.status); res.end(); return true;
        }
        await pipeUpstreamAudio(upstream, req, res);
        return true;
      } catch (e) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
        return true;
      }
    }

    return false;
  }

  return { handler, getConfig: () => config, resolveNcmStream };
}

module.exports = { createPrivateMusicService };
