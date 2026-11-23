const fs = require('node:fs');
const path = require('node:path');

const FRANCHISES = [
  { key: 'sc', name: '闪耀色彩 · 283PRO', playlistId: '8896865808', defaultCount: 270, color: '#ff4e78' },
  { key: 'gakuen', name: '学园偶像大师 · 初星学园', playlistId: '10062750532', defaultCount: 117, color: '#fc3d59' },
  { key: 'cg', name: '灰姑娘女孩 · 346PRO', playlistId: '8880948241', defaultCount: 427, color: '#3388ff' },
  { key: 'ml', name: '百万现场 · 765 MILLION', playlistId: '8304717282', defaultCount: 443, color: '#ffaa00' },
  { key: 'as', name: '偶像大师本家 · 765PRO', playlistId: '7538637874', defaultCount: 276, color: '#e6002d' }
];

async function fetchPlaylist(id) {
  const url = `https://music.163.com/api/v6/playlist/detail?id=${id}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://music.163.com/'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const pl = json.playlist;
  if (!pl) return null;

  let rawTracks = pl.tracks || [];
  if (pl.trackIds && pl.trackIds.length > rawTracks.length) {
    const allIds = pl.trackIds.map(t => t.id);
    const batchSize = 100;
    const fetchedTracks = [];
    for (let i = 0; i < allIds.length; i += batchSize) {
      const slice = allIds.slice(i, i + batchSize);
      const songDetailUrl = `https://music.163.com/api/song/detail?ids=[${slice.join(',')}]`;
      try {
        const sRes = await fetch(songDetailUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://music.163.com/' } });
        const sJson = await sRes.json();
        if (sJson.songs) fetchedTracks.push(...sJson.songs);
      } catch (e) {
        console.warn('Batch fetch error:', e.message);
      }
      await new Promise(r => setTimeout(r, 60));
    }
    if (fetchedTracks.length) rawTracks = fetchedTracks;
  }

  const songs = rawTracks.map(t => {
    const artistList = t.ar || t.artists || [];
    const artists = artistList.map(a => a.name).join('・');
    const title = t.name;
    const titleZh = (t.alia && t.alia[0]) || (t.alias && t.alias[0]) || (t.tns && t.tns[0]) || '';
    const albumObj = t.al || t.album || {};
    const album = albumObj.name || 'THE IDOLM@STER Collection';
    const rawPic = albumObj.picUrl || '';
    const cover = rawPic ? rawPic.replace('http://', 'https://') + '?param=400y400' : '/app-icon.png';
    const isSolo = artistList.length === 1 && !artistList[0].name.includes('・') && !artists.includes('ALL') && !artists.includes('学園') && !artists.includes('PRO');

    return {
      id: 'track_' + t.id,
      neteaseId: t.id,
      title: title,
      titleZh: titleZh,
      cleanTitle: title,
      unitName: isSolo ? artists : (album.includes('THE@TER') ? '765 MILLION' : (artists || 'THE IDOLM@STER')),
      type: isSolo ? 'solo' : 'unit',
      idols: ['all'],
      vocalists: artists,
      duration: Math.round((t.dt || t.duration || 180000) / 1000),
      album: album,
      cover: cover,
      color: '#ff4e78',
      audioUrl: `https://music.163.com/song/media/outer/url?id=${t.id}.mp3`
    };
  });

  return {
    id: pl.id,
    name: pl.name,
    creator: pl.creator?.nickname || '宫水三也',
    trackCount: songs.length,
    songs
  };
}

(async () => {
  console.log('--- Fetching All 5 Master IDOLM@STER Franchises ---');
  const outPath = path.join(__dirname, '../public/franchise-catalogs.json');
  let result = {};
  if (fs.existsSync(outPath)) {
    try { result = JSON.parse(fs.readFileSync(outPath, 'utf8')); } catch {}
  }

  for (const f of FRANCHISES) {
    console.log(`Fetching franchise: ${f.name} (Playlist ID: ${f.playlistId})...`);
    try {
      const data = await fetchPlaylist(f.playlistId);
      if (data) {
        result[f.key] = data;
        console.log(`✓ Fetched ${f.name}: ${data.songs.length} songs`);
      }
    } catch (e) {
      console.error(`Failed ${f.name}:`, e.message);
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log('Saved all franchise catalogs to public/franchise-catalogs.json');
})();
