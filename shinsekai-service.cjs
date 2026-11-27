'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

const AFFINITY_STAGES = [
  { min: 95, label: '闪耀羁绊' },
  { min: 80, label: '挚友' },
  { min: 60, label: '搭档' },
  { min: 35, label: '信赖' },
  { min: 15, label: '熟悉' },
  { min: 0, label: '初识' },
  { min: -999, label: '疏远' }
];

function getAffinityStage(val) {
  const n = Number(val) || 0;
  for (const s of AFFINITY_STAGES) {
    if (n >= s.min) return s.label;
  }
  return '初识';
}

function clampAffinity(val) {
  return Math.max(-10, Math.min(100, Math.round(Number(val) || 0)));
}

function computeRetention(mem, now = Date.now()) {
  const ref = Number(mem?.lastRecalledAt || mem?.createdAt || now);
  const days = Math.max(0, (now - ref) / 86400000);
  const imp = Math.max(1, Math.min(5, Number(mem?.importance) || 2));
  const rec = Math.max(0, Number(mem?.recallCount) || 0);
  const strength = 3 * (1 + imp * 0.8 + rec * 0.5);
  let rate = Math.exp(-days / strength);
  if (mem?.category === 'canon') rate = Math.max(0.85, rate);
  return Math.round(rate * 1000) / 1000;
}

function tokenizeBi(text) {
  const s = String(text || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, ' ').trim();
  const set = new Set();
  if (!s) return set;
  for (const w of s.split(' ')) {
    if (!w) continue;
    set.add(w);
    if (w.length >= 2) {
      for (let i = 0; i < w.length - 1; i++) {
        set.add(w.slice(i, i + 2));
      }
    }
  }
  return set;
}

function overlapScore(qTokens, docText) {
  if (!qTokens.size) return 0;
  const dTokens = tokenizeBi(docText);
  if (!dTokens.size) return 0;
  let hit = 0;
  for (const t of qTokens) {
    if (dTokens.has(t)) hit++;
  }
  return hit / Math.max(1, Math.sqrt(qTokens.size * dTokens.size));
}

function chunkText(text, maxLen = 320) {
  const raw = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return [];
  const paras = raw.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = '';
  for (const p of paras) {
    if (p.length > maxLen) {
      if (buf) { chunks.push(buf); buf = ''; }
      for (let i = 0; i < p.length; i += maxLen) {
        chunks.push(p.slice(i, i + maxLen));
      }
    } else if ((buf + '\n' + p).length > maxLen) {
      if (buf) chunks.push(buf);
      buf = p;
    } else {
      buf = buf ? buf + '\n' + p : p;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

function parsePerformanceTags(rawText) {
  let clean = String(rawText || '');
  const tags = {
    bg: '',
    bgm: '',
    emotion: '',
    affinityDelta: 0,
    sfx: '',
    choices: [],
    memoryToSave: ''
  };
  const extract = (name, fn) => {
    const re = new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'gi');
    clean = clean.replace(re, (_, inner) => {
      fn(String(inner || '').trim());
      return '';
    });
  };
  extract('bg', v => { if (v) tags.bg = v; });
  extract('bgm', v => { if (v) tags.bgm = v; });
  extract('emotion', v => { if (v) tags.emotion = v.toLowerCase(); });
  extract('sfx', v => { if (v) tags.sfx = v.toLowerCase(); });
  extract('affinity', v => {
    const m = v.match(/[-+]?\d+/);
    if (m) tags.affinityDelta += Math.max(-5, Math.min(5, parseInt(m[0], 10) || 0));
  });
  extract('choices', v => {
    const parts = v.split(/[|\n]/).map(s => s.replace(/^[-*\d.、\s]+/, '').trim()).filter(Boolean);
    if (parts.length) tags.choices = parts.slice(0, 4);
  });
  extract('memory', v => { if (v) tags.memoryToSave = v; });

  clean = clean.replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText: clean || String(rawText || '').trim(), tags };
}

function getLanIPv4List() {
  const nets = os.networkInterfaces();
  const list = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        list.push({ name, address: net.address });
      }
    }
  }
  list.sort((a, b) => {
    const score = ip => ip.startsWith('192.168.') ? 0 : ip.startsWith('10.') ? 1 : ip.startsWith('172.') ? 2 : 3;
    return score(a.address) - score(b.address);
  });
  return list;
}

async function readJsonBody(req, maxBytes = 6 * 1024 * 1024) {
  let size = 0;
  const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw Error('请求体超过大小限制');
    parts.push(chunk);
  }
  if (!parts.length) return {};
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data));
  return true;
}

function buildApiRequest(c, systemPrompt, historyMsgs, userMessage, imageBase64) {
  const baseUrl = String(c.baseURL || '').replace(/\/(chat\/completions|responses|messages)\/?$/, '').replace(/\/models\/[^/]+:(?:streamGenerateContent|generateContent)$/, '').replace(/\/$/, '');
  const hdrs = { 'Content-Type': 'application/json' };
  if (c.apiKey) {
    if (c.protocol === 'anthropic') {
      hdrs['x-api-key'] = c.apiKey;
      hdrs['anthropic-version'] = '2023-06-01';
    } else if (c.protocol === 'gemini') {
      hdrs['x-goog-api-key'] = c.apiKey;
    } else {
      hdrs[c.auth === 'api-key' ? 'api-key' : 'Authorization'] = c.auth === 'api-key' ? c.apiKey : 'Bearer ' + c.apiKey;
    }
  }
  const maxTokens = Math.max(256, Math.min(8192, Number(c.maxTokens) || 1600));
  const cleanHistory = (Array.isArray(historyMsgs) ? historyMsgs : [])
    .slice(-14)
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

  let parsedImg = null;
  if (imageBase64 && typeof imageBase64 === 'string') {
    const m = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (m) parsedImg = { mime: m[1], data: m[2], dataUrl: imageBase64 };
    else if (imageBase64.length > 100) parsedImg = { mime: 'image/jpeg', data: imageBase64, dataUrl: 'data:image/jpeg;base64,' + imageBase64 };
  }

  if (c.protocol === 'anthropic') {
    const userContent = parsedImg
      ? [{ type: 'image', source: { type: 'base64', media_type: parsedImg.mime, data: parsedImg.data } }, { type: 'text', text: userMessage }]
      : userMessage;
    return {
      url: baseUrl + '/messages',
      options: {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          model: c.model,
          system: systemPrompt,
          messages: [...cleanHistory, { role: 'user', content: userContent }],
          max_tokens: maxTokens,
          stream: false
        })
      }
    };
  }

  if (c.protocol === 'gemini') {
    const userParts = parsedImg
      ? [{ text: userMessage }, { inlineData: { mimeType: parsedImg.mime, data: parsedImg.data } }]
      : [{ text: userMessage }];
    const contents = [
      ...cleanHistory.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      { role: 'user', parts: userParts }
    ];
    return {
      url: `${baseUrl}/models/${encodeURIComponent(c.model.replace(/^models\//, ''))}:generateContent`,
      options: {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: maxTokens }
        })
      }
    };
  }

  // OpenAI compatible / responses
  const userContent = parsedImg
    ? [{ type: 'text', text: userMessage }, { type: 'image_url', image_url: { url: parsedImg.dataUrl } }]
    : userMessage;
  if (c.protocol === 'responses') {
    return {
      url: baseUrl + '/responses',
      options: {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify({
          model: c.model,
          instructions: systemPrompt,
          input: [...cleanHistory, { role: 'user', content: userContent }],
          max_output_tokens: maxTokens,
          stream: false
        })
      }
    };
  }
  return {
    url: baseUrl + '/chat/completions',
    options: {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        model: c.model,
        messages: [{ role: 'system', content: systemPrompt }, ...cleanHistory, { role: 'user', content: userContent }],
        [c.tokenField === 'max_completion_tokens' || c.provider === 'openai' ? 'max_completion_tokens' : 'max_tokens']: maxTokens,
        stream: false
      })
    }
  };
}

function extractApiReply(protocol, data) {
  if (data?.error) throw Error(typeof data.error === 'string' ? data.error : data.error.message || 'API 返回错误');
  if (protocol === 'anthropic') {
    return (data.content || []).filter(p => p.type === 'text').map(p => p.text).join('');
  }
  if (protocol === 'gemini') {
    return (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
  }
  if (protocol === 'responses') {
    return (data.output || []).flatMap(o => o.content || []).filter(p => p.type === 'output_text').map(p => p.text).join('');
  }
  const msg = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text ?? '';
  return Array.isArray(msg) ? msg.map(p => p.text || '').join('') : String(msg || '');
}

function createShinsekaiService({ dataRoot, userData, base, fetch: fetcher = globalThis.fetch } = {}) {
  let lanServer = null;
  let lanPort = 0;
  let lanToken = '';

  function storeDir() {
    const root = userData || (typeof dataRoot === 'function' ? dataRoot() : dataRoot) || path.join(base || __dirname, 'data');
    const dir = path.join(root, 'shinsekai');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function readStore(name, fallback) {
    const file = path.join(storeDir(), name + '.json');
    try {
      if (!fs.existsSync(file)) return fallback;
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return fallback;
    }
  }

  function writeStore(name, data) {
    const dir = storeDir();
    const file = path.join(dir, name + '.json');
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  }

  function searchMemories(idolId, query, limit = 6) {
    const all = readStore('memories', []);
    const now = Date.now();
    const qTokens = tokenizeBi(query);
    const filtered = all.filter(m => m && (m.idolId === idolId || m.idolId === 'all'));
    const scored = filtered.map(m => {
      const retention = computeRetention(m, now);
      const ov = qTokens.size ? overlapScore(qTokens, m.content) : 0.3;
      const imp = (Number(m.importance) || 2) / 5;
      const score = (0.65 * ov + 0.35 * imp) * Math.max(0.25, retention);
      return { mem: m, retention, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);
    if (top.length && query) {
      let changed = false;
      for (const item of top) {
        if (item.score > 0.12) {
          item.mem.recallCount = (Number(item.mem.recallCount) || 0) + 1;
          item.mem.lastRecalledAt = now;
          changed = true;
        }
      }
      if (changed) writeStore('memories', all);
    }
    return top.map(x => ({ ...x.mem, retention: x.retention }));
  }

  function searchWorldbooks(idolId, query, limit = 4) {
    const books = readStore('worldbooks', []);
    const qTokens = tokenizeBi(query);
    const hits = [];
    for (const b of books) {
      if (!b || (b.idolId !== 'all' && b.idolId !== idolId)) continue;
      for (const chunk of b.chunks || []) {
        const sc = qTokens.size ? overlapScore(qTokens, chunk) : 0.2;
        if (sc > 0.04 || !qTokens.size) {
          hits.push({ title: b.title, text: chunk, score: sc });
        }
      }
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }

  function stopLanServer() {
    if (lanServer) {
      try { lanServer.close(); } catch {}
      lanServer = null;
      lanPort = 0;
      lanToken = '';
    }
  }

  async function startLanServer() {
    if (lanServer) return getLanStatus();
    lanToken = crypto.randomBytes(4).toString('hex');
    const srv = http.createServer(async (req, res) => {
      try {
        const u = new URL(req.url, 'http://localhost');
        const p = decodeURIComponent(u.pathname);
        if (p === '/' || p === '/mobile-companion.html') {
          const fp = path.join(base || __dirname, 'public', 'mobile-companion.html');
          if (!fs.existsSync(fp)) { res.writeHead(404); return res.end('Not found'); }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          return fs.createReadStream(fp).pipe(res);
        }
        if (p === '/portraits.js' || p === '/portraits.json' || p === '/fonts.css' || p === '/app-icon.png') {
          const fp = path.join(base || __dirname, 'public', p.slice(1));
          if (!fs.existsSync(fp)) { res.writeHead(404); return res.end('Not found'); }
          const ext = path.extname(fp);
          const ct = ext === '.js' ? 'text/javascript; charset=utf-8' : ext === '.css' ? 'text/css; charset=utf-8' : ext === '.json' ? 'application/json; charset=utf-8' : 'image/png';
          res.writeHead(200, { 'Content-Type': ct });
          return fs.createReadStream(fp).pipe(res);
        }
        if (p.startsWith('/api/shinsekai/')) {
          const tok = u.searchParams.get('token') || req.headers['x-shinsekai-token'] || '';
          if (!tok || tok !== lanToken) {
            return sendJson(res, 401, { ok: false, error: '无效的局域网访问令牌' });
          }
          if (await handle(req, res, u, { fromLan: true })) return;
        }
        res.writeHead(404);
        res.end('Not found');
      } catch (e) {
        sendJson(res, 500, { ok: false, error: e.message });
      }
    });
    await new Promise((resolve, reject) => {
      srv.once('error', reject);
      srv.listen(0, '0.0.0.0', () => {
        srv.removeListener('error', reject);
        lanServer = srv;
        lanPort = srv.address().port;
        resolve();
      });
    });
    return getLanStatus();
  }

  function getLanStatus() {
    const ips = getLanIPv4List();
    const primaryIp = ips[0]?.address || '127.0.0.1';
    const enabled = Boolean(lanServer && lanPort);
    return {
      enabled,
      ip: primaryIp,
      ips,
      port: lanPort,
      token: enabled ? lanToken : '',
      url: enabled ? `http://${primaryIp}:${lanPort}/mobile-companion.html?token=${lanToken}` : ''
    };
  }

  async function handleChat(req, res) {
    const body = await readJsonBody(req);
    const idolId = String(body.idolId || '24');
    const idolName = String(body.idolName || '283 偶像');
    const idolUnit = String(body.idolUnit || '283 Production');
    const message = String(body.message || '').trim();
    const sceneMode = String(body.sceneMode || 'auto');
    const imageBase64 = body.imageBase64 || '';
    const stageMode = Boolean(body.stageMode);

    if (!message && !imageBase64) {
      return sendJson(res, 400, { ok: false, error: '请输入对话内容' });
    }

    const aiMemory = require('./ai-connection-memory.cjs');
    const rawConn = body.connection || {};
    const conn = aiMemory.resolve(rawConn);
    if (conn.apiKey) aiMemory.remember(conn);

    const persona = readStore('persona', { name: '制作人', title: '制作人先生', birthday: '', likes: '', bio: '' });
    const relations = readStore('relations', {});
    const rel = relations[idolId] || { affinity: 10, stage: '初识', nickname: '', note: '' };
    const topMemories = searchMemories(idolId, message, 6);
    const topWorld = searchWorldbooks(idolId, message, 4);

    if (!conn.baseURL || !conn.model) {
      return sendJson(res, 400, {
        ok: false,
        needsConfig: true,
        error: '尚未配置 AI 模型接口，请在设置或百宝箱 AI 面板填写模型地址与密钥后使用。'
      });
    }

    const memBlock = topMemories.length
      ? topMemories.map(m => `- [${m.category}|保留率${Math.round(m.retention * 100)}%] ${m.content}`).join('\n')
      : '（暂无长期记忆）';
    const worldBlock = topWorld.length
      ? topWorld.map(w => `- 《${w.title}》${w.text}`).join('\n')
      : '（未加载额外设定集）';

    const sceneHints = {
      gaming: '用户正在玩游戏，请像坐在旁边的搭档一样用简短自然的语气观察战局、吐槽或应援。',
      cowatch: '用户正在看番剧或视频，请同步给出对画面或字幕的感想、吐槽或共鸣。',
      coding: '用户正在写代码或工作，适度关心、鼓励，不要长篇大论打断思路。',
      reading: '用户正在阅读文章或网页，可以就画面内容简短搭话。',
      idle: '用户暂时离开或挂机中，轻声自言自语或问候。',
      chatting: '用户正专注与你聊天，可以稍微多聊几句并展现出丰富的情感互动。',
      auto: '根据对话和画面自然切换语气。'
    };

    const systemPrompt = [
      `你是《偶像大师 闪耀色彩》283 事务所所属偶像「${idolName}」（所属组合：${idolUnit}）。`,
      `与你对话的是「${persona.name || '制作人'}」（称呼：${persona.title || '制作人先生'}${persona.likes ? '，喜好：' + persona.likes : ''}${persona.bio ? '，备注：' + persona.bio : ''}）。`,
      `当前好感度：${rel.affinity}/100（阶段：${getAffinityStage(rel.affinity)}${rel.note ? '；关系备注：' + rel.note : ''}）。请贴合该亲密度阶段回复，切忌油腻或人设崩塌。`,
      `\n【长期记忆（检索命中）】\n${memBlock}`,
      `\n【世界书 / 设定集】\n${worldBlock}`,
      imageBase64 ? `\n【实时屏幕陪伴模式（${sceneMode}）】\n${sceneHints[sceneMode] || sceneHints.auto}\n你现在能看到对方电脑屏幕截图，请结合屏幕画面自然地做出简短反应（1~3句，口语化，不要复述“我看到一张图片”）。` : '',
      `\n【结构化演出标签（可选，放在回复末尾即可）】`,
      `可使用以下标签联动舞台表现：`,
      `<emotion>happy|shy|angry|sad|surprised|thinking|calm</emotion> 切换立绘情绪`,
      `<affinity>+1</affinity> 若对话让你开心或感动可加 1~3 分，冒犯可 -1`,
      `<sfx>chime|sparkle|heart|cheer|pop</sfx> 触发轻音效`,
      stageMode ? `<bg>office|office-night|rehearsal|live|street|cafe</bg> 切换舞台背景\n<choices>选项A|选项B</choices> 给出 2 个供制作人选择的剧情分支选项` : '',
      `若本次对话出现了制作人重要偏好或约定，用 <memory>一句话事实</memory> 记住它。`
    ].filter(Boolean).join('\n');

    const history = Array.isArray(body.history) ? body.history : [];
    const reqSpec = buildApiRequest(conn, systemPrompt, history, message || '（请看看我现在的屏幕）', imageBase64);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 45000);
    let replyRaw = '';
    try {
      const upstream = await fetcher(reqSpec.url, { ...reqSpec.options, signal: ac.signal });
      const rawText = await upstream.text();
      if (!upstream.ok) {
        let msg = `HTTP ${upstream.status}`;
        try { const j = JSON.parse(rawText); msg = j.error?.message || j.message || msg; } catch {}
        return sendJson(res, 502, { ok: false, error: '模型接口调用失败：' + msg });
      }
      const data = JSON.parse(rawText);
      replyRaw = extractApiReply(conn.protocol, data);
    } finally {
      clearTimeout(timer);
    }

    const parsed = parsePerformanceTags(replyRaw);
    if (parsed.tags.affinityDelta !== 0) {
      const nextAff = clampAffinity((rel.affinity ?? 10) + parsed.tags.affinityDelta);
      relations[idolId] = {
        ...rel,
        affinity: nextAff,
        stage: getAffinityStage(nextAff),
        updatedAt: Date.now()
      };
      writeStore('relations', relations);
    }
    if (parsed.tags.memoryToSave) {
      const mems = readStore('memories', []);
      mems.unshift({
        id: 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        idolId,
        content: parsed.tags.memoryToSave,
        category: 'episode',
        importance: 3,
        createdAt: Date.now(),
        lastRecalledAt: Date.now(),
        recallCount: 0
      });
      writeStore('memories', mems.slice(0, 500));
    }

    // 同步保存会话记录供手机扫码伴聊共享
    if (body.saveSession !== false && message) {
      const sessions = readStore('sessions', {});
      const list = Array.isArray(sessions[idolId]) ? sessions[idolId] : [];
      list.push(
        { role: 'user', content: imageBase64 ? `[屏幕陪伴] ${message}` : message, at: Date.now() },
        { role: 'assistant', content: parsed.cleanText, emotion: parsed.tags.emotion || 'calm', at: Date.now() }
      );
      sessions[idolId] = list.slice(-60);
      writeStore('sessions', sessions);
    }

    const curRel = relations[idolId] || rel;
    return sendJson(res, 200, {
      ok: true,
      replyText: replyRaw,
      cleanText: parsed.cleanText,
      tags: parsed.tags,
      affinityAfter: curRel.affinity,
      stageAfter: getAffinityStage(curRel.affinity),
      recalledMemories: topMemories.map(m => ({ id: m.id, content: m.content, retention: m.retention }))
    });
  }

  async function handle(req, res, u) {
    const p = decodeURIComponent(u.pathname);
    if (!p.startsWith('/api/shinsekai/')) return false;

    try {
      if (p === '/api/shinsekai/chat' && req.method === 'POST') {
        await handleChat(req, res);
        return true;
      }

      if (p === '/api/shinsekai/memories') {
        const now = Date.now();
        if (req.method === 'GET') {
          const idolId = u.searchParams.get('idolId') || '';
          const q = u.searchParams.get('q') || '';
          if (q) {
            const hits = searchMemories(idolId || 'all', q, 30);
            return sendJson(res, 200, { ok: true, items: hits });
          }
          const all = readStore('memories', [])
            .filter(m => !idolId || m.idolId === idolId || m.idolId === 'all')
            .map(m => ({ ...m, retention: computeRetention(m, now) }));
          return sendJson(res, 200, { ok: true, items: all });
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          const all = readStore('memories', []);
          if (body.reinforceId) {
            const target = all.find(m => m.id === body.reinforceId);
            if (target) {
              target.importance = Math.min(5, (Number(target.importance) || 2) + 1);
              target.recallCount = (Number(target.recallCount) || 0) + 1;
              target.lastRecalledAt = now;
              writeStore('memories', all);
              return sendJson(res, 200, { ok: true, item: { ...target, retention: computeRetention(target, now) } });
            }
          }
          const content = String(body.content || '').trim();
          if (!content) return sendJson(res, 400, { ok: false, error: '记忆内容不能为空' });
          const item = {
            id: 'mem_' + now + '_' + Math.random().toString(36).slice(2, 6),
            idolId: String(body.idolId || 'all'),
            content,
            category: ['canon', 'episode', 'preference', 'event'].includes(body.category) ? body.category : 'episode',
            importance: Math.max(1, Math.min(5, Number(body.importance) || 3)),
            createdAt: now,
            lastRecalledAt: now,
            recallCount: 0
          };
          all.unshift(item);
          writeStore('memories', all.slice(0, 500));
          return sendJson(res, 200, { ok: true, item: { ...item, retention: computeRetention(item, now) } });
        }
        if (req.method === 'DELETE') {
          const id = u.searchParams.get('id') || '';
          const all = readStore('memories', []).filter(m => m.id !== id);
          writeStore('memories', all);
          return sendJson(res, 200, { ok: true });
        }
      }

      if (p === '/api/shinsekai/relations') {
        const relations = readStore('relations', {});
        if (req.method === 'GET') {
          return sendJson(res, 200, { ok: true, relations });
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          const idolId = String(body.idolId || '');
          if (!idolId) return sendJson(res, 400, { ok: false, error: '缺少偶像 ID' });
          const cur = relations[idolId] || { affinity: 10, stage: '初识', nickname: '', note: '' };
          const nextAff = body.affinity !== undefined
            ? clampAffinity(body.affinity)
            : clampAffinity(cur.affinity + (Number(body.delta) || 0));
          relations[idolId] = {
            affinity: nextAff,
            stage: getAffinityStage(nextAff),
            nickname: body.nickname !== undefined ? String(body.nickname).slice(0, 40) : (cur.nickname || ''),
            note: body.note !== undefined ? String(body.note).slice(0, 300) : (cur.note || ''),
            updatedAt: Date.now()
          };
          writeStore('relations', relations);
          return sendJson(res, 200, { ok: true, relation: relations[idolId], relations });
        }
      }

      if (p === '/api/shinsekai/persona') {
        if (req.method === 'GET') {
          return sendJson(res, 200, {
            ok: true,
            persona: readStore('persona', { name: '制作人', title: '制作人先生', birthday: '', likes: '', bio: '' })
          });
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          const persona = {
            name: String(body.name || '制作人').slice(0, 40),
            title: String(body.title || '制作人先生').slice(0, 40),
            birthday: String(body.birthday || '').slice(0, 20),
            likes: String(body.likes || '').slice(0, 200),
            bio: String(body.bio || '').slice(0, 500)
          };
          writeStore('persona', persona);
          return sendJson(res, 200, { ok: true, persona });
        }
      }

      if (p === '/api/shinsekai/worldbooks') {
        if (req.method === 'GET') {
          return sendJson(res, 200, { ok: true, items: readStore('worldbooks', []) });
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          const title = String(body.title || '未命名设定集').trim();
          const content = String(body.content || '').trim();
          if (!content) return sendJson(res, 400, { ok: false, error: '设定集文本不能为空' });
          const chunks = chunkText(content, 320);
          const books = readStore('worldbooks', []);
          const item = {
            id: 'wb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            title,
            idolId: String(body.idolId || 'all'),
            chunks,
            charCount: content.length,
            createdAt: Date.now()
          };
          books.unshift(item);
          writeStore('worldbooks', books.slice(0, 100));
          return sendJson(res, 200, { ok: true, item });
        }
        if (req.method === 'DELETE') {
          const id = u.searchParams.get('id') || '';
          writeStore('worldbooks', readStore('worldbooks', []).filter(b => b.id !== id));
          return sendJson(res, 200, { ok: true });
        }
      }

      if (p === '/api/shinsekai/reminders') {
        if (req.method === 'GET') {
          return sendJson(res, 200, { ok: true, items: readStore('reminders', []) });
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          const items = readStore('reminders', []);
          if (body.markFiredId) {
            const t = items.find(r => r.id === body.markFiredId);
            if (t) {
              t.lastFiredAt = Date.now();
              if (t.repeat === 'once') t.enabled = false;
              writeStore('reminders', items);
              return sendJson(res, 200, { ok: true, item: t });
            }
          }
          const text = String(body.text || '').trim();
          const timeHHMM = String(body.timeHHMM || '').trim();
          if (!text || !/^\d{2}:\d{2}$/.test(timeHHMM)) {
            return sendJson(res, 400, { ok: false, error: '请填写有效的时间 (HH:MM) 和提醒内容' });
          }
          const item = {
            id: 'rem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            idolId: String(body.idolId || '24'),
            text: text.slice(0, 200),
            timeHHMM,
            repeat: body.repeat === 'once' ? 'once' : 'daily',
            enabled: body.enabled !== false,
            lastFiredAt: 0,
            createdAt: Date.now()
          };
          items.unshift(item);
          writeStore('reminders', items.slice(0, 100));
          return sendJson(res, 200, { ok: true, item });
        }
        if (req.method === 'DELETE') {
          const id = u.searchParams.get('id') || '';
          writeStore('reminders', readStore('reminders', []).filter(r => r.id !== id));
          return sendJson(res, 200, { ok: true });
        }
      }

      if (p === '/api/shinsekai/stories') {
        if (req.method === 'GET') {
          return sendJson(res, 200, { ok: true, items: readStore('stories', []) });
        }
        if (req.method === 'POST') {
          const body = await readJsonBody(req);
          const items = readStore('stories', []);
          const id = body.id || ('story_' + Date.now());
          const item = {
            id,
            title: String(body.title || '未命名分支剧本').slice(0, 120),
            idolId: String(body.idolId || '24'),
            nodes: Array.isArray(body.nodes) ? body.nodes : [],
            edges: Array.isArray(body.edges) ? body.edges : [],
            updatedAt: Date.now()
          };
          const idx = items.findIndex(x => x.id === id);
          if (idx >= 0) items[idx] = item;
          else items.unshift(item);
          writeStore('stories', items.slice(0, 100));
          return sendJson(res, 200, { ok: true, item });
        }
        if (req.method === 'DELETE') {
          const id = u.searchParams.get('id') || '';
          writeStore('stories', readStore('stories', []).filter(s => s.id !== id));
          return sendJson(res, 200, { ok: true });
        }
      }

      if (p === '/api/shinsekai/sessions') {
        const idolId = u.searchParams.get('idolId') || '24';
        const sessions = readStore('sessions', {});
        if (req.method === 'GET') {
          return sendJson(res, 200, { ok: true, messages: sessions[idolId] || [] });
        }
        if (req.method === 'DELETE') {
          delete sessions[idolId];
          writeStore('sessions', sessions);
          return sendJson(res, 200, { ok: true });
        }
      }

      if (p === '/api/shinsekai/lan-info' && req.method === 'GET') {
        return sendJson(res, 200, { ok: true, ...getLanStatus() });
      }

      if (p === '/api/shinsekai/lan-toggle' && req.method === 'POST') {
        const body = await readJsonBody(req);
        if (body.enable === false || (body.enable === undefined && lanServer)) {
          stopLanServer();
          return sendJson(res, 200, { ok: true, ...getLanStatus() });
        }
        const status = await startLanServer();
        return sendJson(res, 200, { ok: true, ...status });
      }

      return sendJson(res, 404, { ok: false, error: '未知的新世界接口' });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message || '新世界服务内部错误' });
    }
  }

  return { handle, stopLanServer };
}

module.exports = { createShinsekaiService, parsePerformanceTags, computeRetention, getAffinityStage };
