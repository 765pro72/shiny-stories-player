#!/usr/bin/env node
/**
 * Extract official whisper (ASMR / 耳语) voiceHash values via the official
 * Enza `userSupportIdols/statusMax` endpoint using the user's own session,
 * or from locally saved statusMax JSON dumps.
 *
 * Usage:
 *   ENZA_COOKIE="<your enza cookie>" node scripts/fetch-whisper-statusmax.cjs
 *   node scripts/fetch-whisper-statusmax.cjs --from-json path/to/statusMax.json
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const UNRESOLVED_FILE = path.join(ROOT, 'data', 'unresolved-official-resources.json');
const OUT_FILE = path.join(ROOT, 'data', 'whisper-voice-hashes.json');

function getMissingWhisperCardIds() {
  try {
    const rows = JSON.parse(fs.readFileSync(UNRESOLVED_FILE, 'utf8'));
    const ids = new Set();
    for (const r of rows) {
      const m = String(r.key || '').match(/^sounds\/voice\/whisper\/(\d{10})\//);
      if (m) ids.add(m[1]);
    }
    return [...ids];
  } catch {
    return ['2040020220', '2040080200', '2040120190', '2040140200', '2040180200', '2040210170'];
  }
}

function collectVoiceHashes(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectVoiceHashes(item, out);
    return out;
  }
  if (typeof node.voiceHash === 'string' && node.voiceHash.trim()) {
    out.push({
      id: node.id || node.voiceId || node.characterId || '',
      title: node.title || node.name || '',
      voiceHash: node.voiceHash.trim()
    });
  }
  for (const val of Object.values(node)) {
    if (val && typeof val === 'object') collectVoiceHashes(val, out);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const fromIdx = args.indexOf('--from-json');
  const results = {};

  if (fromIdx >= 0 && args[fromIdx + 1]) {
    const raw = JSON.parse(fs.readFileSync(args[fromIdx + 1], 'utf8'));
    const cardId = String(raw?.supportIdol?.id || raw?.id || 'custom');
    results[cardId] = collectVoiceHashes(raw);
  } else {
    const cookie = (process.env.ENZA_COOKIE || '').trim();
    if (!cookie) {
      console.error('缺少 ENZA_COOKIE 环境变量。');
      console.error('官方 statusMax 接口需要你自己的正版 Enza 登录会话：');
      console.error('  $env:ENZA_COOKIE="你的Cookie"; node scripts/fetch-whisper-statusmax.cjs');
      console.error('或在浏览器 DevTools 保存 statusMax 返回 JSON 后运行：');
      console.error('  node scripts/fetch-whisper-statusmax.cjs --from-json statusMax.json');
      process.exit(1);
    }
    const cardIds = getMissingWhisperCardIds();
    for (const id of cardIds) {
      const url = `https://api.shinycolors.enza.fun/userSupportIdols/statusMax?supportIdolId=${encodeURIComponent(id)}`;
      const r = await fetch(url, {
        headers: {
          'Cookie': cookie,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://shinycolors.enza.fun/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: AbortSignal.timeout(15000)
      });
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || !ct.includes('json')) {
        console.warn(`[${id}] HTTP ${r.status} (${ct}) — 会话可能已过期或需要重新登录 Enza`);
        continue;
      }
      const json = await r.json();
      const found = collectVoiceHashes(json);
      results[id] = found;
      console.log(`[${id}] 提取到 ${found.length} 条 voiceHash`);
    }
  }

  const total = Object.values(results).reduce((s, a) => s + a.length, 0);
  if (total > 0) {
    fs.writeFileSync(OUT_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), cards: results }, null, 2));
    console.log(`已保存 ${total} 条 voiceHash 至 ${OUT_FILE}`);
  } else {
    console.log('未提取到任何 voiceHash（请确认 Cookie 有效或 JSON 包含 whisperVoices 字段）。');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
