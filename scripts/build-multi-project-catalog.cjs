const fs = require('fs');
const https = require('https');
const path = require('path');

function getSongDetails(ids) {
  return new Promise((resolve) => {
    if (!ids || !ids.length) return resolve([]);
    const postData = 'c=' + encodeURIComponent(JSON.stringify(ids.map(id => ({ id }))));
    const req = https.request('https://music.163.com/api/v3/song/detail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.songs || []);
        } catch(e) { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.write(postData);
    req.end();
  });
}

function fetchPlaylistTrackIds(id) {
  return new Promise((resolve) => {
    https.get('https://music.163.com/api/v6/playlist/detail?id=' + id, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve((json.playlist?.trackIds || []).map(t => t.id));
        } catch(e) { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

function fetchArtistSongs(artistId) {
  return new Promise((resolve) => {
    https.get(`https://music.163.com/api/v1/artist/songs?id=${artistId}&offset=0&limit=80`, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.songs || []);
        } catch(e) { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

function normalizeSong(s, projectKey, defaultCover, extra = {}) {
  const artists = (s.ar || s.artists || []).map(a => a.name).join(' / ') || 'THE IDOLM@STER';
  const cover = (s.al?.picUrl || s.album?.picUrl || defaultCover || '').replace('http://', 'https://');
  const duration = Math.round((s.dt || s.duration || 180000) / 1000);
  return {
    id: 'track_' + s.id,
    neteaseId: s.id,
    project: projectKey,
    title: s.name,
    cleanTitle: s.name.replace(/\s*[\(（].*?[\)）]/g, '').trim(),
    titleZh: s.name,
    unitKey: extra.unitKey || 'all',
    unitName: extra.unitName || artists,
    vocalists: artists,
    type: extra.type || 'unit',
    idols: extra.idols || ['all'],
    album: s.al?.name || s.album?.name || 'IDOLM@STER Collection',
    cover: cover || '/app-icon.png',
    duration: duration,
    color: extra.color || '#3772ff',
    audioUrl: `https://music.163.com/song/media/outer/url?id=${s.id}.mp3`
  };
}

async function main() {
  console.log('Building Multi-Project IM@S Music Catalog...');
  const currentCatalog = JSON.parse(fs.readFileSync('public/music-catalog.json', 'utf8'));

  // 1. Shiny Colors (283PRO)
  const shinySongs = currentCatalog.songs.map(s => ({
    ...s,
    project: 'shiny'
  }));

  // 2. Gakuen Idolmaster (初星学園)
  console.log('Fetching Gakumas songs...');
  const gakumasRaw = await fetchArtistSongs(61830030); // 初星学園
  const gakumasStudents = [
    { id: 'g_saki', name: '花海咲季', color: '#e7303c', keywords: ['花海咲季', '咲季', 'Saki'] },
    { id: 'g_temari', name: '月村手毬', color: '#1d5796', keywords: ['月村手毬', '手毬', 'Temari'] },
    { id: 'g_kotone', name: '藤田ことね', color: '#f8b500', keywords: ['藤田ことね', 'ことね', 'Kotone'] },
    { id: 'g_rinami', name: '姬崎莉波', color: '#f19db5', keywords: ['姫崎莉波', '姬崎莉波', '莉波', 'Rinami'] },
    { id: 'g_hiro', name: '篠泽广', color: '#65d5cd', keywords: ['篠澤広', '篠泽广', '広', 'Hiro'] },
    { id: 'g_china', name: '倉本千奈', color: '#ea5532', keywords: ['倉本千奈', '仓本千奈', '千奈', 'China'] },
    { id: 'g_sumika', name: '紫云清夏', color: '#8fc31f', keywords: ['紫雲清夏', '紫云清夏', '清夏', 'Sumika'] },
    { id: 'g_lilja', name: '葛城リーリヤ', color: '#c0d6e4', keywords: ['葛城リーリヤ', 'リーリヤ', 'Lilja'] },
    { id: 'g_mao', name: '有村麻央', color: '#7a2b8e', keywords: ['有村麻央', '麻央', 'Mao'] },
    { id: 'g_ume', name: '花海佑芽', color: '#ff7e39', keywords: ['花海佑芽', '佑芽', 'Ume'] },
    { id: 'g_misuzu', name: '秦谷美铃', color: '#9e7ac8', keywords: ['秦谷美鈴', '秦谷美铃', '美鈴', 'Misuzu'] },
    { id: 'g_sena', name: '十王星南', color: '#e5b700', keywords: ['十王星南', '星南', 'Sena'] }
  ];

  // Specific iconic mappings for Gakumas
  const gakumasTrackDetails = await getSongDetails(gakumasRaw.map(s => s.id));
  const gakumasSongs = gakumasTrackDetails
    .filter(s => !s.name.includes('[Instrumental]') && !s.name.includes('- Instrumental'))
    .map(s => {
      let matchedStudent = gakumasStudents.find(st => 
        st.keywords.some(k => s.name.includes(k) || (s.ar && s.ar.some(a => a.name.includes(k))))
      );
      // Title based matches
      if (!matchedStudent) {
        if (s.name.includes('Fighting My Way') || s.name.includes('Boom Boom Pow')) matchedStudent = gakumasStudents[0]; // 咲季
        else if (s.name.includes('Luna say maybe') || s.name.includes('アイヴイ')) matchedStudent = gakumasStudents[1]; // 手毬
        else if (s.name.includes('世界一可愛い私') || s.name.includes('Yellow Big Bang')) {
          if (s.name.includes('Yellow Big Bang')) matchedStudent = gakumasStudents[6]; // 清夏
          else matchedStudent = gakumasStudents[2]; // ことね
        }
        else if (s.name.includes('clumsy trick')) matchedStudent = gakumasStudents[3]; // 莉波
        else if (s.name.includes('光景') || s.name.includes('コントラスト')) matchedStudent = gakumasStudents[4]; // 广
        else if (s.name.includes('Wonder Scale') || s.name.includes('日々、発見的')) matchedStudent = gakumasStudents[5]; // 千奈
        else if (s.name.includes('白線')) matchedStudent = gakumasStudents[7]; // リーリヤ
        else if (s.name.includes('Fluorite')) matchedStudent = gakumasStudents[8]; // 麻央
      }

      const isAll = s.name === '初' || s.name.includes('Campus mode') || s.name.includes('がむしゃらに行こう') || !matchedStudent;
      return normalizeSong(s, 'gakumas', 'https://p1.music.126.net/41XfJAH35MdlABge2ZIGOw==/109951169809080203.jpg', {
        unitKey: isAll ? 'all' : (matchedStudent ? matchedStudent.id : 'unit'),
        unitName: isAll ? '初星学園 全员' : (matchedStudent ? `${matchedStudent.name} (独唱)` : '初星学園'),
        type: isAll ? 'all' : (matchedStudent ? 'solo' : 'unit'),
        idols: matchedStudent ? [matchedStudent.id] : gakumasStudents.map(st => st.id),
        color: matchedStudent ? matchedStudent.color : '#ff7700'
      });
    });

  // Ensure '初' and 'Campus mode!!' are at top
  gakumasSongs.sort((a, b) => {
    if (a.title === '初') return -1;
    if (b.title === '初') return 1;
    if (a.title.includes('Campus mode')) return -1;
    if (b.title.includes('Campus mode')) return 1;
    return 0;
  });

  // 3. 765PRO 本家 (Playlist 45371847)
  console.log('Fetching 765PRO songs...');
  const as765Ids = await fetchPlaylistTrackIds('45371847');
  const as765Details = await getSongDetails(as765Ids);
  const as765Songs = as765Details
    .filter(s => !s.name.includes('カラオケ') && !s.name.includes('ボイス') && !s.name.includes('ドラマ'))
    .map(s => {
      const isAll = s.name.includes('READY') || s.name.includes('CHANGE') || s.name.includes('M@STERPIECE') || s.name.includes('自分REST@RT') || s.name.includes('THE IDOLM@STER');
      return normalizeSong(s, 'as765', 'https://p1.music.126.net/PRdxeRNhwdiXB9gznLt-mQ==/109951172349688029.jpg', {
        unitKey: isAll ? 'all' : '765pro',
        unitName: isAll ? '765PRO ALLSTARS' : (s.ar ? s.ar.map(a => a.name).join('/') : '765PRO'),
        type: isAll ? 'all' : (s.ar && s.ar.length === 1 ? 'solo' : 'unit'),
        idols: ['all'],
        color: '#dc2626'
      });
    });

  // 4. Cinderella Girls (Playlist 46061675)
  console.log('Fetching Cinderella Girls songs...');
  const cinIds = await fetchPlaylistTrackIds('46061675');
  const cinDetails = await getSongDetails(cinIds.slice(0, 75));
  const cinderellaSongs = cinDetails
    .filter(s => !s.name.includes('ソロ・リミックス') && !s.name.includes('カラオケ') && !s.name.includes('ドラマ') && !s.name.includes('絵かき歌'))
    .map(s => {
      const title = s.name;
      let attr = 'unit';
      let color = '#2563eb';
      if (title.includes('お願い') || title.includes('Star!!') || title.includes('Shine!!') || title.includes('M@GIC') || title.includes('EVERMORE') || title.includes('GOIN')) {
        attr = 'all';
        color = '#2682ff';
      }
      return normalizeSong(s, 'cinderella', 'https://p2.music.126.net/vg8r7ZU4uDXIG6ZQMObrNg==/109951171583511743.jpg', {
        unitKey: attr,
        unitName: attr === 'all' ? 'CINDERELLA GIRLS' : (s.ar ? s.ar.map(a => a.name).join('/') : '346PRO'),
        type: attr === 'all' ? 'all' : (s.ar && s.ar.length === 1 ? 'solo' : 'unit'),
        idols: ['all'],
        color: color
      });
    });

  // 5. Million Live (Playlist 801470815)
  console.log('Fetching Million Live songs...');
  const milIds = await fetchPlaylistTrackIds('801470815');
  const milDetails = await getSongDetails(milIds.slice(0, 70));
  const millionSongs = milDetails
    .filter(s => !s.name.includes('ドラマ') && !s.name.includes('Off Vocal') && !s.name.includes('カラオケ'))
    .map(s => {
      const isAll = s.name.includes('Thank You') || s.name.includes('Welcome') || s.name.includes('Dreaming') || s.name.includes('Brand New') || s.name.includes('UNION') || s.name.includes('Flyers');
      return normalizeSong(s, 'million', 'https://p2.music.126.net/vg8r7ZU4uDXIG6ZQMObrNg==/109951171583511743.jpg', {
        unitKey: isAll ? 'all' : 'theater',
        unitName: isAll ? '765 MILLION ALLSTARS' : (s.ar ? s.ar.map(a => a.name).join('/') : '765THEATER'),
        type: isAll ? 'all' : (s.ar && s.ar.length === 1 ? 'solo' : 'unit'),
        idols: ['all'],
        color: '#f59e0b'
      });
    });

  // Define Projects Configuration
  const projects = {
    shiny: {
      key: 'shiny',
      name: '闪耀色彩',
      nameEn: 'SHINY COLORS',
      slogan: '羽ばたけ、空へ――',
      badge: '🕊️ 283PRO',
      brandColor: '#00b4d8',
      brandGlow: 'rgba(0, 180, 216, 0.4)',
      brandGradient: 'linear-gradient(135deg, #00b4d8 0%, #ff80bf 100%)',
      units: currentCatalog.units,
      idols: currentCatalog.idols,
      songs: shinySongs
    },
    gakumas: {
      key: 'gakumas',
      name: '学园偶像大师',
      nameEn: 'GAKUEN IDOLM@STER',
      slogan: 'プロデューサー、私を一番のアイドルにしてください！',
      badge: '🎓 初星学園',
      brandColor: '#ff7700',
      brandGlow: 'rgba(255, 119, 0, 0.4)',
      brandGradient: 'linear-gradient(135deg, #ff7700 0%, #ffb703 100%)',
      units: {
        all: { name: '初星学園 全员', nameZh: '初星学园', idols: gakumasStudents.map(s => s.id), color: '#ff7700' }
      },
      idols: gakumasStudents.map(s => ({
        id: s.id,
        name: s.name,
        unit: 'gakumas',
        color: s.color,
        icon: '/app-icon.png',
        keywords: s.keywords
      })),
      songs: gakumasSongs
    },
    cinderella: {
      key: 'cinderella',
      name: '灰姑娘女孩',
      nameEn: 'CINDERELLA GIRLS',
      slogan: '魔法が解けても、私たちはアイドル――',
      badge: '👠 346PRO',
      brandColor: '#2563eb',
      brandGlow: 'rgba(37, 99, 235, 0.4)',
      brandGradient: 'linear-gradient(135deg, #2563eb 0%, #9333ea 100%)',
      units: {
        all: { name: 'CINDERELLA GIRLS', nameZh: '灰姑娘全员', idols: ['all'], color: '#2682ff' },
        cute: { name: 'Cute', nameZh: '可爱属性', idols: ['all'], color: '#ff4081' },
        cool: { name: 'Cool', nameZh: '冷艳属性', idols: ['all'], color: '#2196f3' },
        passion: { name: 'Passion', nameZh: '激情属性', idols: ['all'], color: '#ff9800' }
      },
      idols: [],
      songs: cinderellaSongs
    },
    million: {
      key: 'million',
      name: '百万现场',
      nameEn: 'MILLION LIVE!',
      slogan: '夢を叶える場所、私たちのシアターへ！',
      badge: '🎭 765THEATER',
      brandColor: '#f59e0b',
      brandGlow: 'rgba(245, 158, 11, 0.4)',
      brandGradient: 'linear-gradient(135deg, #f59e0b 0%, #dc2626 100%)',
      units: {
        all: { name: '765 MILLION ALLSTARS', nameZh: '剧场全员', idols: ['all'], color: '#f59e0b' },
        princess: { name: 'Princess', nameZh: '公主属性', idols: ['all'], color: '#ff2d55' },
        fairy: { name: 'Fairy', nameZh: '妖精属性', idols: ['all'], color: '#007aff' },
        angel: { name: 'Angel', nameZh: '天使属性', idols: ['all'], color: '#ffcc00' }
      },
      idols: [],
      songs: millionSongs
    },
    as765: {
      key: 'as765',
      name: '765PRO 本家',
      nameEn: '765PRO ALLSTARS',
      slogan: '伝説の始まり、トップアイドルへ！',
      badge: '⭐ 765PRO',
      brandColor: '#dc2626',
      brandGlow: 'rgba(220, 38, 38, 0.4)',
      brandGradient: 'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)',
      units: {
        all: { name: '765PRO ALLSTARS', nameZh: '765本家全员', idols: ['all'], color: '#dc2626' }
      },
      idols: [],
      songs: as765Songs
    }
  };

  const outputCatalog = {
    generatedAt: new Date().toISOString(),
    activeProject: 'shiny',
    projects: projects,
    // Backward compatibility default pointers
    units: projects.shiny.units,
    idols: projects.shiny.idols,
    songs: projects.shiny.songs
  };

  fs.writeFileSync('public/music-catalog.json', JSON.stringify(outputCatalog, null, 2), 'utf8');
  console.log(`✓ Multi-Project Catalog Successfully Created!`);
  console.log(`- Shiny Colors: ${projects.shiny.songs.length} songs`);
  console.log(`- Gakumas: ${projects.gakumas.songs.length} songs`);
  console.log(`- Cinderella: ${projects.cinderella.songs.length} songs`);
  console.log(`- Million Live: ${projects.million.songs.length} songs`);
  console.log(`- 765PRO: ${projects.as765.songs.length} songs`);
  const total = Object.values(projects).reduce((acc, p) => acc + p.songs.length, 0);
  console.log(`Total cross-project songs: ${total}`);
}

main().catch(err => {
  console.error('Build catalog error:', err);
});
