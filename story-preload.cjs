const fs = require('node:fs/promises');
const { assets, valid } = require('./scripts/cache-all.cjs');

const MAX_BYTES = 32 * 1024 * 1024;
const TTL = 3 * 60 * 1000;

function createStoryPreload({ resolveLocal, fetchAsset }) {
  let current;
  const cache = new Map();
  let bytes = 0;

  function get(key) {
    const hit = cache.get(key);
    if (!hit) return undefined;
    if (hit.expires > Date.now()) return hit.data;
    bytes -= hit.data.bytes.length;
    cache.delete(key);
  }

  async function load(key, signal) {
    if (signal.aborted) return undefined;
    const file = resolveLocal(key);
    if (file) return key.startsWith('json/') ? { bytes: await fs.readFile(file) } : undefined;
    const hit = get(key);
    if (hit) return hit;
    if (process.env.SHINY_OFFLINE === '1') return undefined;
    const data = await fetchAsset(key, signal);
    if (signal.aborted || data.bytes.length > MAX_BYTES) return undefined;
    const concurrent = cache.get(key);
    if (concurrent) return concurrent.data;
    while (bytes + data.bytes.length > MAX_BYTES && cache.size) {
      const [oldKey, old] = cache.entries().next().value;
      bytes -= old.data.bytes.length;
      cache.delete(oldKey);
    }
    cache.set(key, { data, expires: Date.now() + TTL });
    bytes += data.bytes.length;
    return data;
  }

  function run(key, signal) {
    if (current?.key === key && !current.signal.aborted) return current.promise;
    current?.controller.abort();
    const controller = new AbortController();
    const combined = AbortSignal.any([controller.signal, signal]);
    const job = { key, controller, signal: combined };
    current = job;
    job.promise = (async () => {
      const script = await load('json/' + key, combined);
      if (!script || combined.aborted) return;
      const tracks = JSON.parse(script.bytes.toString('utf8'));
      if (!Array.isArray(tracks)) return;
      const paths = new Set();
      assets(tracks.slice(0, 90), paths);
      const queue = [];
      for (const asset of paths) {
        if (!valid(asset) || asset.startsWith('movies/')) continue;
        queue.push(asset);
        if (asset.startsWith('spine/') && asset.endsWith('/data.json')) {
          queue.push(asset.replace(/\.json$/, '.atlas'), asset.replace(/\.json$/, '.png'));
        }
      }
      const pending = queue.slice(0, 52);
      let cursor = 0;
      await Promise.all(Array.from({ length: 2 }, async () => {
        while (!combined.aborted && cursor < pending.length) {
          await load(pending[cursor++], combined).catch(() => undefined);
        }
      }));
    })().finally(() => { if (current === job) current = undefined; });
    return job.promise;
  }

  return { get, run };
}

module.exports = { createStoryPreload };
