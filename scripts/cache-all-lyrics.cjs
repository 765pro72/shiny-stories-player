const fs = require('node:fs');
const path = require('node:path');

const catalogPath = path.join(__dirname, '../public/music-catalog.json');
const lyricsPath = path.join(__dirname, '../public/music-lyrics.json');

(async () => {
  console.log('--- Caching Lyrics for All Songs in Catalog ---');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  let lyricsCache = {};
  if (fs.existsSync(lyricsPath)) {
    try {
      lyricsCache = JSON.parse(fs.readFileSync(lyricsPath, 'utf8'));
    } catch {}
  }

  const songs = catalog.songs.filter(s => s.neteaseId);
  console.log(`Total songs to verify/fetch lyrics: ${songs.length}, currently cached: ${Object.keys(lyricsCache).length}`);

  let added = 0;
  const concurrency = 6;
  const queue = [...songs];

  async function worker() {
    while (queue.length) {
      const song = queue.shift();
      if (lyricsCache[song.neteaseId] && lyricsCache[song.neteaseId].lrc) {
        continue;
      }

      try {
        const url = `https://music.163.com/api/song/lyric?os=pc&id=${song.neteaseId}&lv=-1&kv=-1&tv=-1`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://music.163.com/'
          }
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.lrc && json.lrc.lyric) {
            lyricsCache[song.neteaseId] = {
              lrc: json.lrc.lyric,
              tlyric: json.tlyric?.lyric || ''
            };
            added++;
            if (added % 20 === 0) {
              console.log(`Fetched ${added} lyrics...`);
            }
          }
        }
      } catch (err) {
        // Retry or skip
      }
      await new Promise(r => setTimeout(r, 80));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  fs.writeFileSync(lyricsPath, JSON.stringify(lyricsCache, null, 2), 'utf8');
  console.log(`--- Finished caching lyrics! Total in cache: ${Object.keys(lyricsCache).length} (added ${added}) ---`);
})();
