(async () => {
  const queries = [
    '学园偶像大师 全曲无重复 宫水三也',
    '偶像大师 灰姑娘女孩 CG 全曲无重复 宫水三也',
    '偶像大师 本家 全曲无重复 宫水三也',
    '偶像大师 MILLION LIVE 百万 全曲无重复 宫水三也'
  ];
  for (const q of queries) {
    const url = 'https://music.163.com/api/search/get?s=' + encodeURIComponent(q) + '&type=1000&limit=5';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const json = await res.json();
    console.log('=== Query:', q);
    if (json.result && json.result.playlists) {
      json.result.playlists.forEach(p => {
        console.log(`  ID: ${p.id} | Name: ${p.name} | Creator: ${p.creator?.nickname} | Tracks: ${p.trackCount}`);
      });
    }
  }
})();
