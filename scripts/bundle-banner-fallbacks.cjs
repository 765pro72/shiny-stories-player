#!/usr/bin/env node
'use strict';

/**
 * Bundles 1 official UR (preferred) or SSR animated card video + poster image
 * for each of the 28 official 283 Production idols (strictly excluding collab idols >= 800)
 * into public/banner-fallbacks/ + public/banner-fallbacks/manifest.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CACHE = path.join(ROOT, 'cache');
const OUT_DIR = path.join(ROOT, 'public', 'banner-fallbacks');
const COLLAB_NAMES = new Set(['露比', '有馬かな', '有马加奈', 'MEMちょ', 'MEM啾']);

function main() {
  const cards = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'card-media.json'), 'utf8'));
  const byIdol = new Map();

  for (const c of cards) {
    if (!c || c.metadataPending || !c.idol) continue;
    if (COLLAB_NAMES.has(c.idol)) continue;
    const charNum = Number(String(c.id || '').slice(3, 6));
    if (!Number.isFinite(charNum) || charNum < 1 || charNum > 28) continue;
    if (c.rarity !== 'UR' && c.rarity !== 'SSR') continue;
    const mov = (c.movies || []).find(m => m && m.path && m.path.endsWith('.mp4'));
    const img = (c.images || []).find(i => i && i.path && /^images\//.test(i.path));
    if (!mov || !img) continue;
    const movFile = path.join(CACHE, mov.path);
    const imgFile = path.join(CACHE, img.path);
    if (!fs.existsSync(movFile) || !fs.existsSync(imgFile)) continue;
    const movSize = fs.statSync(movFile).size;
    if (movSize < 50000) continue;

    if (!byIdol.has(charNum)) byIdol.set(charNum, []);
    byIdol.get(charNum).push({
      charNum,
      cardId: String(c.id),
      idol: c.idol,
      name: c.name || c.idol,
      rarity: c.rarity,
      releaseDate: String(c.releaseDate || '2018-01-01'),
      moviePath: mov.path,
      imagePath: img.path,
      movFile,
      imgFile,
      movSize,
    });
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // Curated 8-unit representative pool (1 newest UR/SSR per 283 unit -> lean ~38MB, 0 collab idols!):
  // 02 风野灯织(UR) · 08 幽谷雾子(UR) · 12 杜野凛世(UR) · 14 大崎甘奈(UR)
  // 18 黛冬优子(UR) · 21 樋口圆香(UR) · 24 七草日花(SSR) · 27 铃木羽那(UR)
  const UNIT_REPS = [2, 8, 12, 14, 18, 21, 24, 27];
  const manifest = [];
  let totalBytes = 0;

  for (const charNum of UNIT_REPS) {
    const list = byIdol.get(charNum);
    if (!list || !list.length) continue;
    const urs = list.filter(x => x.rarity === 'UR');
    const pool = urs.length ? urs : list;
    pool.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || b.cardId.localeCompare(a.cardId));
    const pick = pool.find(x => x.movSize <= 8 * 1024 * 1024) || pool[0];

    const movName = `${pick.cardId}.mp4`;
    const imgExt = path.extname(pick.imagePath) || '.jpg';
    const imgName = `${pick.cardId}${imgExt}`;

    fs.copyFileSync(pick.movFile, path.join(OUT_DIR, movName));
    fs.copyFileSync(pick.imgFile, path.join(OUT_DIR, imgName));

    const bytes = fs.statSync(path.join(OUT_DIR, movName)).size + fs.statSync(path.join(OUT_DIR, imgName)).size;
    totalBytes += bytes;

    manifest.push({
      charNum: pick.charNum,
      cardId: pick.cardId,
      idol: pick.idol,
      name: pick.name,
      rarity: pick.rarity,
      imagePath: pick.imagePath,
      moviePath: pick.moviePath,
      localImage: `/banner-fallbacks/${imgName}`,
      localMovie: `/banner-fallbacks/${movName}`,
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`[OK] Bundled ${manifest.length} official 283 idol fallback videos -> ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  for (const m of manifest) {
    console.log(`  ${String(m.charNum).padStart(2, '0')} ${m.idol} [${m.rarity}] ${m.cardId} ${m.name}`);
  }
}

main();
