/* ═══════════════════════════════════════════════════════════════════════════
   283 MODULE <-> STORY BIDIRECTIONAL BRIDGE & PLAYER ENHANCEMENTS
   - Feature #19: Song <-> Event/Unit Story Symphonic Bridge
   - Feature #27: Binge-Watch Auto-Next Episode + Series Chapter Switcher
   - Feature #29: Card Gallery / Wardrobe <-> Story 1-Click Jump
   - Feature #30: Story Flavor & Angst Warning Classifier
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const EVENT_TO_SONG = [
    [/天塵/, 'いつだって僕らは'],
    [/海へ出るつもりじゃなかったし/, 'あの花のように'],
    [/薄桃色にこんがらがって/, 'Anniversary'],
    [/YOUR\s*MY\s*Love\s*letter/i, 'ラブ・ボナペティート'],
    [/アンカーボルトソング/, 'パステルカラー・パスポート'],
    [/Straylight\.run/i, 'Wandering Dream Chaser'],
    [/WorldEnd/i, 'Destined Rival'],
    [/VS．|The Straylight/i, 'Hide & Attack'],
    [/ノー・カラット/, 'OH MY GOD'],
    [/モノラル・ダイアローグス/, 'Fly and Fly'],
    [/セヴン＃ス/, 'Bouncy Girl'],
    [/THE（CoMETIK）EPISODE/i, 'くだらないや'],
    [/冬が灯る先/, '平行線の美学'],
    [/Light up the illumination/i, 'ヒカリのdestination'],
    [/Catch the shiny tail/i, 'We can go now!'],
    [/くもりガラスの銀曜日/, 'PRISISM'],
    [/廻る歯車/, 'バベルシティ・グレイス'],
    [/階段の先の君へ|五色/, '梦咲After school'],
    [/明るい部屋|線たちの十二月|アジェンダ|アイムベリー/, 'Spread the Wings!!']
  ];

  const UNIT_TO_SONG = {
    '樱木真乃': 'ヒカリのdestination', '风野灯织': 'ヒカリのdestination', '八宫巡': 'ヒカリのdestination',
    '月冈恋钟': 'バベルシティ・グレイス', '田中摩美美': 'バベルシティ・グレイス', '白濑咲耶': 'バベルシティ・グレイス', '三峰结华': 'バベルシティ・グレイス', '幽谷雾子': 'バベルシティ・グレイス',
    '小宫果穗': '夢咲きAfter school', '园田智代子': '夢咲きAfter school', '西城树里': '夢咲きAfter school', '杜野凛世': '夢咲きAfter school', '有栖川夏叶': '夢咲きAfter school',
    '大崎甘奈': 'アルストロメリア', '大崎甜花': 'アルストロメリア', '桑山千雪': 'アルストロメリア',
    '芹泽朝日': 'Wandering Dream Chaser', '黛冬优子': 'Wandering Dream Chaser', '和泉爱依': 'Wandering Dream Chaser',
    '浅仓透': 'いつだって僕らは', '樋口圆香': 'いつだって僕らは', '福丸小糸': 'いつだって僕らは', '市川雏菜': 'いつだって僕らは',
    '七草日花': 'OH MY GOD', '绯田美琴': 'OH MY GOD',
    '斑鸠路加': 'くだらないや', '铃木羽那': 'くだらないや', '郁田春希': 'くだらないや'
  };

  function getStoryFlavor(s) {
    if (!s) return { key: 'sweet', label: '🍬 日常' };
    const hay = `${s.group || ''} ${s.title || ''} ${s.idol || ''} ${s.category || ''}`;
    if (/セヴン＃ス|ジ・エピソード|ノー・カラット|線たちの十二月|モノラル・ダイアローグス|THE（CoMETIK）EPISODE|バイ・スパイラル/i.test(hay)) {
      return { key: 'lore', label: '⚡ 主线核心伏笔' };
    }
    if (/天塵|薄桃色にこんがらがって|かいぶつのうた|見て見ぬふりをすくって|Wintermute|七草日花|绯田美琴|斑鸠路加|樋口圆香|三峰结华|黛冬优子/i.test(hay) && /g\.?r\.?a\.?d|l\.?p|Landing|s\.?t\.?e\.?p|活动/i.test(hay)) {
      return { key: 'angst', label: '🌧️ 现实胃痛·深度' };
    }
    if (/Straylight\.run|WorldEnd|VS．|The Straylight|階段の先の君へ|五色|轟|w\.?i\.?n\.?g|芹泽朝日|小宫果穗|西城树里|有栖川夏叶|月冈恋钟/i.test(hay) && /w\.?i\.?n\.?g|活动/i.test(hay)) {
      return { key: 'hot', label: '🔥 热血燃回' };
    }
    if (/くもりガラスの銀曜日|海へ出るつもりじゃなかったし|さざなみ|冬が灯る先|ヒカリと夜の音楽|幽谷雾子|浅仓透|杜野凛世|郁田春希/i.test(hay)) {
      return { key: 'quiet', label: '🌙 静谧文学' };
    }
    if (/ハロウィン|サンタ|クエストロメリア|ゴシップ・キャンディ|番外地|サイコロ|合宿|田中摩美美|市川雏菜/i.test(hay)) {
      return { key: 'funny', label: '🤣 欢脱搞笑' };
    }
    return { key: 'sweet', label: '🍬 高甜日常' };
  }

  function getMatchedSong(s) {
    if (!s) return 'Spread the Wings!!';
    const hay = `${s.group || ''} ${s.title || ''}`;
    for (const [re, song] of EVENT_TO_SONG) {
      if (re.test(hay)) return song;
    }
    return UNIT_TO_SONG[s.idol] || 'Spread the Wings!!';
  }

  function navigateShell(url) {
    try {
      if (window.parent && window.parent !== window && window.parent.__shinyShell?.navigate) {
        window.parent.__shinyShell.navigate(url);
        return;
      }
    } catch {}
    location.href = '/' + url.replace(/^\/+/, '');
  }

  window.ShinyStoryEnhancements = {
    getStoryFlavor,
    getMatchedSong,
    navigateShell
  };

  // ── 1. Hooks inside guide.html (Binge-Watch, Chapter Select, Song/Card/Wardrobe Jump) ──
  function initGuideEnhancements() {
    const viewer = document.getElementById('viewer');
    if (!viewer) return;

    const selEp = document.getElementById('seriesEpisodeSelect');
    const btnBinge = document.getElementById('btnBingeMode');
    const btnSong = document.getElementById('btnPlayStorySong');
    const btnCard = document.getElementById('btnJumpCardGallery');
    const btnWard = document.getElementById('btnJumpWardrobe');

    let bingeOn = localStorage.getItem('shiny.bingeMode') !== '0';
    const syncBingeBtn = () => {
      if (!btnBinge) return;
      btnBinge.textContent = bingeOn ? '⏭ 追番连播：开' : '⏭ 追番连播：关';
      btnBinge.style.opacity = bingeOn ? '1' : '0.68';
    };
    syncBingeBtn();
    btnBinge?.addEventListener('click', () => {
      bingeOn = !bingeOn;
      localStorage.setItem('shiny.bingeMode', bingeOn ? '1' : '0');
      syncBingeBtn();
    });

    const epOrderScore = (s) => {
      const t = String(s.title || '');
      if (/オープニング|序章|第0|prologue/i.test(t)) return -10;
      if (/エンディング|终章|エピローグ|epilogue/i.test(t)) return 999;
      const m = t.match(/(\d+)/);
      return m ? Number(m[1]) : 500;
    };

    window.syncViewerEnhancements = (s, allCatalog, cardArtMap) => {
      if (!s) return;
      // 1. Populate series episode dropdown
      const siblings = (allCatalog || []).filter(x =>
        x.group && x.group === s.group && (!x.idol || x.idol === s.idol)
      ).sort((a, b) => epOrderScore(a) - epOrderScore(b) || String(a.key).localeCompare(String(b.key)));

      if (selEp) {
        if (siblings.length > 1) {
          selEp.hidden = false;
          selEp.innerHTML = siblings.map((ep, idx) =>
            `<option value="${ep.key}" ${ep.key === s.key ? 'selected' : ''}>[${idx + 1}/${siblings.length}] ${ep.title}</option>`
          ).join('');
          selEp.onchange = () => {
            if (selEp.value && window.openStoryByKey) window.openStoryByKey(selEp.value);
          };
        } else {
          selEp.hidden = true;
        }
      }
      window.__currentSeriesSiblings = siblings;

      // 2. Song bridge button
      if (btnSong) {
        const songName = getMatchedSong(s);
        btnSong.textContent = `🎵 印象曲：${songName.slice(0, 10)}`;
        btnSong.title = `前往音乐馆播放本篇关联曲目《${songName}》`;
        btnSong.onclick = () => {
          if (viewer.open) viewer.close();
          navigateShell(`music.html?playSong=${encodeURIComponent(songName)}`);
        };
      }

      // 3. Card Gallery bridge button
      const art = cardArtMap && cardArtMap[s.key];
      if (btnCard) {
        btnCard.hidden = !art;
        if (art) {
          btnCard.onclick = () => {
            if (viewer.open) viewer.close();
            navigateShell(`card-gallery.html?card=${encodeURIComponent(art.id || '')}&q=${encodeURIComponent(art.name || s.idol || '')}`);
          };
        }
      }

      // 4. Wardrobe bridge button
      if (btnWard) {
        const hasIdol = s.idol && !/活动|其他|营业|特殊/.test(s.idol);
        btnWard.hidden = !hasIdol;
        if (hasIdol) {
          btnWard.onclick = () => {
            if (viewer.open) viewer.close();
            navigateShell(`model-picker.html?idol=${encodeURIComponent(s.idol)}`);
          };
        }
      }
    };

    // Auto-advance to next chapter when story finishes & bingeMode is ON
    let bingeTimer = 0;
    window.triggerBingeNextIfReady = (finishedKey) => {
      if (!bingeOn || !viewer.open) return;
      const siblings = window.__currentSeriesSiblings || [];
      const idx = siblings.findIndex(x => x.key === finishedKey);
      if (idx >= 0 && idx + 1 < siblings.length) {
        const nextEp = siblings[idx + 1];
        const st = document.getElementById('status');
        if (st) st.textContent = `✓ 本话已看完 · 追番模式将在 2 秒后自动连播下一话《${nextEp.title}》…`;
        clearTimeout(bingeTimer);
        bingeTimer = setTimeout(() => {
          if (viewer.open && window.openStoryByKey) window.openStoryByKey(nextEp.key);
        }, 2100);
      }
    };

    // Expose global transcript line highlighter for Dialogue Search jumps
    window.highlightTranscriptLine = (lineIdx) => {
      if (typeof lineIdx !== 'number' || lineIdx < 0) return;
      let attempts = 0;
      const attempt = () => {
        attempts++;
        const rows = document.querySelectorAll('#transcript .line, #transcript > div');
        if (rows.length > lineIdx) {
          const targetRow = rows[lineIdx];
          targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetRow.style.transition = 'background 0.5s ease, box-shadow 0.5s ease';
          targetRow.style.background = 'rgba(250, 204, 21, 0.26)';
          targetRow.style.boxShadow = '0 0 0 2px rgba(250, 204, 21, 0.75), 0 8px 24px rgba(250, 204, 21, 0.25)';
          targetRow.style.borderRadius = '8px';
          setTimeout(() => {
            targetRow.style.background = '';
            targetRow.style.boxShadow = '';
          }, 4500);
          return;
        }
        if (attempts < 20) setTimeout(attempt, 250);
      };
      attempt();
    };

    // If opened with ?line=<idx> from Dialogue Search, scroll & flash the matched line in #transcript
    const urlParams = new URLSearchParams(location.search);
    const targetLineIdx = urlParams.has('line') ? Number(urlParams.get('line')) : -1;
    if (targetLineIdx >= 0) {
      window.highlightTranscriptLine(targetLineIdx);
    }
  }

  // ── 2. Hooks inside card-gallery.html, model-picker.html, music.html ──
  function initCrossModuleButtons() {
    const path = location.pathname;

    // A. Card Gallery -> Watch Story button
    if (path.endsWith('card-gallery.html')) {
      const head = document.querySelector('.collection-page-head, main header, .toolbar');
      if (head && !document.getElementById('btnCardToStory')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'btnCardToStory';
        btn.style.cssText = 'margin-top:6px;padding:5px 12px;border-radius:999px;border:1px solid rgba(236,72,153,0.45);background:rgba(236,72,153,0.14);color:#ec4899;font-size:12px;font-weight:700;cursor:pointer;';
        btn.textContent = '📖 观看当前筛选偶像/卡面的剧情 ↗';
        btn.onclick = () => {
          const idolSel = document.querySelector('#idol, select[name="idol"]');
          const qInput = document.querySelector('#search, input[type="search"]');
          const idol = idolSel?.value || '';
          const q = qInput?.value || '';
          navigateShell(`guide.html?${idol ? 'idol=' + encodeURIComponent(idol) : (q ? 'q=' + encodeURIComponent(q) : '')}#archive`);
        };
        head.append(btn);
      }
    }

    // B. Wardrobe (model-picker.html) -> Watch Idol Story button
    if (path.endsWith('model-picker.html')) {
      const head = document.querySelector('.collection-page-head, main header, aside');
      if (head && !document.getElementById('btnWardrobeToStory')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'btnWardrobeToStory';
        btn.style.cssText = 'margin-top:6px;padding:5px 12px;border-radius:999px;border:1px solid rgba(16,185,129,0.45);background:rgba(16,185,129,0.14);color:#10b981;font-size:12px;font-weight:700;cursor:pointer;';
        btn.textContent = '📖 观看该偶像的剧情 ↗';
        btn.onclick = () => {
          const activeIdol = document.querySelector('.idol-chip.active, .character-btn.active, [data-idol].active')?.textContent?.trim() || '';
          navigateShell(`guide.html${activeIdol ? '?q=' + encodeURIComponent(activeIdol) : ''}#archive`);
        };
        head.append(btn);
      }
    }

    // C. Music Jukebox (music.html) -> Read Song's Linked Story + handle ?playSong=
    if (path.endsWith('music.html')) {
      const tagsHost = document.querySelector('.hero-audio-tags');
      if (tagsHost && !document.getElementById('btnMusicToStory')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'btnMusicToStory';
        btn.className = 'quality-badge-tag';
        btn.style.cssText = 'cursor:pointer;border:1px solid rgba(56,189,248,0.45);background:rgba(56,189,248,0.16);color:#0284c7;font-weight:700;';
        btn.textContent = '📖 阅读曲目关联剧情 ↗';
        btn.onclick = () => {
          const unitTxt = document.querySelector('#heroSongArtists .unit-tag')?.textContent?.trim() || '';
          const titleTxt = document.getElementById('heroSongTitle')?.textContent?.trim() || '';
          let targetGroup = '';
          for (const [re, sName] of EVENT_TO_SONG) {
            if (titleTxt && sName.toLowerCase().includes(titleTxt.toLowerCase())) {
              targetGroup = re.source.replace(/[\\^$]/g, '').split('|')[0];
              break;
            }
          }
          navigateShell(`guide.html?q=${encodeURIComponent(targetGroup || unitTxt || titleTxt)}#archive`);
        };
        tagsHost.append(btn);
      }

      const params = new URLSearchParams(location.search);
      const wantSong = params.get('playSong');
      if (wantSong) {
        setTimeout(() => {
          const sInput = document.getElementById('songSearchInput');
          if (sInput) {
            sInput.value = wantSong;
            sInput.dispatchEvent(new Event('input', { bubbles: true }));
            setTimeout(() => {
              document.querySelector('#songListScroll .song-item-row, #songListScroll [data-song-id]')?.click();
            }, 350);
          }
        }, 650);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initGuideEnhancements();
      initCrossModuleButtons();
    });
  } else {
    initGuideEnhancements();
    initCrossModuleButtons();
  }
})();
