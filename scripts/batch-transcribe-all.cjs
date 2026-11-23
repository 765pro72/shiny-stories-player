// Batch transcribe all missing home voices using the local whisper-server daemon
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const inventoryPath = path.join(root, 'data/missing-voice-inventory.json');
const cachePath = path.join(root, 'data/home-transcriptions-cache.json');

if (!fs.existsSync(inventoryPath)) {
  console.error('Inventory not found at', inventoryPath);
  process.exit(1);
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch (e) {
    console.warn('Failed to parse existing cache, resetting');
  }
}

const remaining = inventory.filter(item => !cache[item.path] || !cache[item.path].text);
console.log(`Total inventory: ${inventory.length}, Cached: ${Object.keys(cache).length}, Remaining: ${remaining.length}`);

if (remaining.length === 0) {
  console.log('All audio files have already been transcribed!');
  process.exit(0);
}

const CONCURRENCY = 2;
let cursor = 0;
let completed = Object.keys(cache).length;
const total = inventory.length;
const startTime = Date.now();

function cleanText(t) {
  return (t || '').replace(/[\r\n]+/g, ' ').trim();
}

function saveCache() {
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
}

async function worker(workerId) {
  while (cursor < remaining.length) {
    const idx = cursor++;
    const item = remaining[idx];
    const fullAudioPath = path.join(root, 'cache', item.path);
    if (!fs.existsSync(fullAudioPath)) {
      console.warn(`[Worker ${workerId}] Missing file on disk: ${fullAudioPath}`);
      continue;
    }

    try {
      const fileBytes = fs.readFileSync(fullAudioPath);
      const form = new FormData();
      form.append('file', new Blob([fileBytes]), path.basename(item.path));
      form.append('language', 'ja');

      const res = await fetch('http://127.0.0.1:8178/inference', {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(30000)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rawText = data.text || '';
      const text = cleanText(rawText);

      cache[item.path] = {
        path: item.path,
        voiceId: item.voiceId,
        speaker: item.speaker,
        idolName: item.idolName || '',
        idolId: item.idolId || '',
        type: item.type,
        text,
        rawText,
        at: new Date().toISOString()
      };

      completed++;
      if (completed % 10 === 0 || completed === total) {
        saveCache();
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (completed - (total - remaining.length)) / elapsed;
        const etaMin = rate > 0 ? (((total - completed) / rate) / 60).toFixed(1) : '?';
        console.log(`[${completed}/${total}] (${((completed/total)*100).toFixed(1)}%) rate: ${rate.toFixed(2)}/s, ETA: ${etaMin}m | ${item.speaker}: ${text.slice(0, 30)}`);
      }
    } catch (err) {
      console.error(`[Worker ${workerId}] Failed ${item.path}: ${err.message}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

(async () => {
  console.log(`Starting ${CONCURRENCY} workers...`);
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
  saveCache();
  console.log(`Transcription run completed. Total in cache: ${Object.keys(cache).length}`);
})();
