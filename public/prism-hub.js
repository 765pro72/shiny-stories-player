/* ═══════════════════════════════════════════════════════════════════════════
   283 PRISM MORE HUB & 6 FLAGSHIP FEATURES RUNTIME
   1. Full-Script Dialogue Search Engine (/api/dialogue-search)
   2. 283 Smartphone Chain Chatroom & 1v1 Morning/Promise Aggregator (/api/idol-interactions)
   3. 28x28 Character Address & Script Evidence Matrix (/api/address-matrix)
   4. 283 Producer Resume, Stamp Book & HD PNG Exporter
   5. Daily Oha-Asa TV Fortune & Unwatched Story Blind-Box
   6. Fullscreen Ambient Vinyl Art Frame (Screensaver Mode)
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const IDOLS_28 = [
    { id: '1', name: '樱木真乃', unit: 'illumination STARS', color: '#f472b6' },
    { id: '2', name: '风野灯织', unit: 'illumination STARS', color: '#38bdf8' },
    { id: '3', name: '八宫巡', unit: 'illumination STARS', color: '#facc15' },
    { id: '4', name: '月冈恋钟', unit: "L'Antica", color: '#c084fc' },
    { id: '5', name: '田中摩美美', unit: "L'Antica", color: '#a855f7' },
    { id: '6', name: '白濑咲耶', unit: "L'Antica", color: '#3b82f6' },
    { id: '7', name: '三峰结华', unit: "L'Antica", color: '#60a5fa' },
    { id: '8', name: '幽谷雾子', unit: "L'Antica", color: '#94a3b8' },
    { id: '9', name: '小宫果穗', unit: '放课后Climax Girls', color: '#ef4444' },
    { id: '10', name: '园田智代子', unit: '放课后Climax Girls', color: '#f472b6' },
    { id: '11', name: '西城树里', unit: '放课后Climax Girls', color: '#f59e0b' },
    { id: '12', name: '杜野凛世', unit: '放课后Climax Girls', color: '#0ea5e9' },
    { id: '13', name: '有栖川夏叶', unit: '放课后Climax Girls', color: '#22c55e' },
    { id: '14', name: '大崎甘奈', unit: 'ALSTROEMERIA', color: '#ec4899' },
    { id: '15', name: '大崎甜花', unit: 'ALSTROEMERIA', color: '#f9a8d4' },
    { id: '16', name: '桑山千雪', unit: 'ALSTROEMERIA', color: '#e2e8f0' },
    { id: '17', name: '芹泽朝日', unit: 'Straylight', color: '#f43f5e' },
    { id: '18', name: '黛冬优子', unit: 'Straylight', color: '#10b981' },
    { id: '19', name: '和泉爱依', unit: 'Straylight', color: '#ec4899' },
    { id: '20', name: '浅仓透', unit: 'noctchill', color: '#38bdf8' },
    { id: '21', name: '樋口圆香', unit: 'noctchill', color: '#94a3b8' },
    { id: '22', name: '福丸小糸', unit: 'noctchill', color: '#a78bfa' },
    { id: '23', name: '市川雏菜', unit: 'noctchill', color: '#fde047' },
    { id: '24', name: '七草日花', unit: 'SHHis', color: '#10b981' },
    { id: '25', name: '绯田美琴', unit: 'SHHis', color: '#dc2626' },
    { id: '26', name: '斑鸠路加', unit: 'CoMETIK', color: '#94a3b8' },
    { id: '27', name: '铃木羽那', unit: 'CoMETIK', color: '#f59e0b' },
    { id: '28', name: '郁田春希', unit: 'CoMETIK', color: '#d97706' }
  ];
  const IDOL_BY_ID = new Map(IDOLS_28.map(i => [i.id, i]));
  IDOL_BY_ID.set('staff', { id: 'staff', name: '七草叶月', unit: '283 事务员', color: '#34d399' });

  let catalogCache = null;
  let cardArtCache = null;
  let matrixCache = null;

  async function ensureCatalog() {
    if (!catalogCache) {
      const [c, a] = await Promise.all([
        fetch('/data/catalog.json').then(r => r.json()).catch(() => []),
        fetch('/data/card-art.json').then(r => r.json()).catch(() => ({}))
      ]);
      catalogCache = Array.isArray(c) ? c : [];
      cardArtCache = a || {};
    }
    return { catalog: catalogCache, cardArt: cardArtCache };
  }

  function navigateStory(storyKey, lineIndex = -1) {
    closeModal();
    const guideFrame = document.querySelector('#shellStage iframe[data-page="guide.html"], #shellStage iframe[src*="guide.html"]');
    if (guideFrame && guideFrame.contentWindow?.openStoryByKey) {
      document.querySelector('#prismDock [data-page="guide.html"]')?.click();
      guideFrame.contentWindow.openStoryByKey(storyKey);
      if (lineIndex >= 0) {
        guideFrame.contentWindow.highlightTranscriptLine?.(lineIndex);
      }
      return;
    }
    const url = `guide.html?story=${encodeURIComponent(storyKey)}${lineIndex >= 0 ? '&line=' + lineIndex : ''}#archive`;
    if (window.__shinyShell?.navigate) {
      window.__shinyShell.navigate(url);
      return;
    }
    const frames = document.querySelectorAll('#shellStage iframe');
    for (const f of frames) {
      if ((f.src || '').includes('guide.html')) {
        f.src = '/' + url;
        document.querySelector('#prismDock [data-page="guide.html"]')?.click();
        return;
      }
    }
    location.href = '/' + url;
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function cleanScriptText(s) {
    return String(s || '')
      .replace(/\\r\\n|\\n|\\r/g, '\n')
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map(l => l.trim())
      .join('\n')
      .trim();
  }

  function formatScriptHtml(s) {
    return esc(cleanScriptText(s)).replace(/\n/g, '<br>');
  }

  function highlightQuery(text, query) {
    const cleaned = cleanScriptText(text);
    if (!cleaned || !query) return esc(cleaned).replace(/\n/g, '<br>');
    const words = String(query).trim().split(/\s+/).filter(Boolean);
    if (!words.length) return esc(cleaned).replace(/\n/g, '<br>');
    const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = cleaned.split(pattern);
    return parts.map(part => {
      const isMatch = words.some(w => w.toLowerCase() === part.toLowerCase());
      const html = esc(part).replace(/\n/g, '<br>');
      return isMatch ? `<mark class="ph-hl">${html}</mark>` : html;
    }).join('');
  }

  // 1. Mount Consolidated "✦ 更多" Button & Popover in .shell-utils
  let backdropEl = null;
  let modalSubEl = null;
  let modalTitleEl = null;
  let modalBodyEl = null;
  let ambientEl = null;
  let ambientTimer = 0;

  function ensureModalHost() {
    if (backdropEl) return;
    backdropEl = document.createElement('div');
    backdropEl.className = 'ph-modal-backdrop';
    backdropEl.hidden = true;
    backdropEl.innerHTML = `
      <div class="ph-modal" role="dialog" aria-modal="true">
        <header class="ph-modal-head">
          <div>
            <small id="phModalSub">283 PRODUCTION</small>
            <h2 id="phModalTitle">功能中心</h2>
          </div>
          <button type="button" class="ph-close-btn" id="phModalClose" aria-label="关闭">×</button>
        </header>
        <div class="ph-modal-body" id="phModalBody"></div>
      </div>
    `;
    document.body.appendChild(backdropEl);
    modalSubEl = document.getElementById('phModalSub');
    modalTitleEl = document.getElementById('phModalTitle');
    modalBodyEl = document.getElementById('phModalBody');
    document.getElementById('phModalClose')?.addEventListener('click', closeModal);
    backdropEl.addEventListener('click', e => { if (e.target === backdropEl) closeModal(); });
  }

  window.addEventListener('keydown', e => {
    if (ambientEl && !ambientEl.hidden) {
      if (e.key === 'Escape') {
        const vc = document.getElementById('phAfVinylCard');
        if (vc?.classList.contains('is-expanded')) {
          e.preventDefault();
          e.stopPropagation();
          vc.classList.remove('is-expanded');
          vc.setAttribute('aria-expanded', 'false');
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        closeAmbientFrame();
      } else if (e.key === ' ' || e.code === 'Space') {
        const tag = (e.target?.tagName || '').toLowerCase();
        if (tag !== 'input' && tag !== 'textarea') {
          e.preventDefault();
          document.getElementById('phAfPlayBtn')?.click();
        }
      }
    } else if (e.key === 'Escape') {
      if (backdropEl && !backdropEl.hidden) closeModal();
    }
  }, true);

  let chatVoiceAudio = null;
  let chatVoiceBtn = null;

  function stopChatVoice() {
    if (chatVoiceAudio) {
      try {
        chatVoiceAudio.onended = null;
        chatVoiceAudio.onerror = null;
        chatVoiceAudio.pause();
        chatVoiceAudio.currentTime = 0;
      } catch {}
      chatVoiceAudio = null;
    }
    if (chatVoiceBtn) {
      chatVoiceBtn.textContent = '🔊 原声';
      chatVoiceBtn = null;
    }
  }

  function openModal(sub, title, opts = {}) {
    ensureModalHost();
    stopChatVoice();
    cleanupMorningPlayer();
    modalSubEl.textContent = sub;
    modalTitleEl.textContent = title;
    modalBodyEl.innerHTML = '';
    const modalEl = backdropEl.querySelector('.ph-modal');
    if (modalEl) modalEl.classList.toggle('ph-modal--player', Boolean(opts.widePlayer));
    backdropEl.hidden = false;
  }

  function closeModal() {
    if (backdropEl && !backdropEl.hidden && morningRequest) dismissMorningReminder();
    stopChatVoice();
    stopMorningVoice();
    cleanupMorningPlayer();
    const modalEl = backdropEl?.querySelector('.ph-modal');
    if (modalEl) modalEl.classList.remove('ph-modal--player');
    if (backdropEl) backdropEl.hidden = true;
  }

  // ── Feature #1: Full-Script Dialogue Search Engine ──
  function openDialogueSearch(initialQuery = '', initialSpeaker = '') {
    openModal('283 DIALOGUE LOCATOR · 10,960 SCRIPTS', '🔍 全剧本「台词级」秒搜引擎（名场面定位器）');
    modalBodyEl.innerHTML = `
      <div class="ph-bar">
        <input type="search" class="ph-input" id="phDlgQuery" placeholder="输入任意中文译文或日文原句台词（如：抱紧一点、雪だ、透明、普通、海）…" value="${esc(initialQuery)}">
        <select class="ph-select" id="phDlgSpeaker">
          <option value="">全部说话人</option>
          ${IDOLS_28.map(i => `<option value="${esc(i.name)}">${esc(i.name)}</option>`).join('')}
          <option value="プロデューサー">制作人</option>
          <option value="はづき">七草叶月</option>
          <option value="社長">天井努 社长</option>
        </select>
        <button type="button" class="ph-btn" id="phDlgSearchBtn">秒搜台词</button>
      </div>
      <div class="ph-bar" style="gap:6px;">
        <span style="font-size:11px;color:#94a3b8;">热门名台词一键搜：</span>
        <button type="button" class="ph-btn ghost" data-q="雪だ" style="height:26px;padding:0 9px;font-size:11px;">「雪だ / 下雪了」</button>
        <button type="button" class="ph-btn ghost" data-q="海" style="height:26px;padding:0 9px;font-size:11px;">「海」</button>
        <button type="button" class="ph-btn ghost" data-q="しあわせ" style="height:26px;padding:0 9px;font-size:11px;">「しあわせ / 幸福」</button>
        <button type="button" class="ph-btn ghost" data-q="ヒーロー" style="height:26px;padding:0 9px;font-size:11px;">「ヒーロー / 英雄」</button>
        <button type="button" class="ph-btn ghost" data-q="なみ" style="height:26px;padding:0 9px;font-size:11px;">「八云奈美」</button>
      </div>
      <div id="phDlgMeta" style="font-size:12px;color:#7dd3fc;">输入台词后按回车，将在本地 10,960 篇剧本、50 万+ 句双语台词中毫秒级定位出处。</div>
      <div id="phDlgResults" style="display:flex;flex-direction:column;gap:8px;"></div>
      <div id="phDlgLoadMoreWrap" style="text-align:center;margin-top:10px;"></div>
    `;

    const inputEl = document.getElementById('phDlgQuery');
    const spkEl = document.getElementById('phDlgSpeaker');
    const metaEl = document.getElementById('phDlgMeta');
    const resEl = document.getElementById('phDlgResults');
    const loadWrap = document.getElementById('phDlgLoadMoreWrap');

    let curOffset = 0;
    const PAGE_LIMIT = 40;
    let curTotal = 0;
    let curHits = [];

    const appendCards = (hits, q) => {
      hits.forEach((h, idx) => {
        const card = document.createElement('div');
        card.className = 'ph-hit-card';
        card.style.setProperty('--card-i', String(Math.min(idx, 18)));
        card.innerHTML = `
          <div class="ph-hit-meta">
            <span>🗣 ${esc(h.speaker)} · 第 ${h.lineIndex + 1} 句</span>
            <span>📖 ${esc(h.idol)} · ${esc(h.group)} · ${esc(h.title)} ↗</span>
          </div>
          <div class="ph-hit-line">${highlightQuery(h.trans || h.text, q)}</div>
          ${h.trans && h.text ? `<div class="ph-hit-jp">${highlightQuery(h.text, q)}</div>` : ''}
          ${(h.prev || h.next) ? `<div class="ph-hit-ctx">${h.prev ? `前句 [${esc(h.prev.speaker || '…')}]: ${highlightQuery(h.prev.text, q)}<br>` : ''}${h.next ? `后句 [${esc(h.next.speaker || '…')}]: ${highlightQuery(h.next.text, q)}` : ''}</div>` : ''}
          <div class="ph-hit-act-bar">
            <button type="button" class="ph-hit-act-btn" data-act="jump">🎬 观看剧情</button>
            <button type="button" class="ph-hit-act-btn" data-act="copy">📋 复制台词</button>
            <button type="button" class="ph-hit-act-btn" data-act="bookmark">❝ 收藏名台词</button>
          </div>
        `;

        card.querySelector('[data-act="jump"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          navigateStory(h.key, h.lineIndex);
        });
        card.querySelector('[data-act="copy"]')?.addEventListener('click', async (e) => {
          e.stopPropagation();
          const btn = e.currentTarget;
          const cleanZh = cleanScriptText(h.trans || h.text).replace(/\n+/g, ' ');
          const cleanJp = cleanScriptText(h.text).replace(/\n+/g, ' ');
          const quoteText = `[${h.speaker}] ${cleanZh}${h.trans && h.text ? ' (' + cleanJp + ')' : ''} —— 出处：《${h.title}》`;
          try {
            await navigator.clipboard.writeText(quoteText);
            btn.textContent = '✓ 已复制';
            btn.classList.add('is-success');
            setTimeout(() => { btn.textContent = '📋 复制台词'; btn.classList.remove('is-success'); }, 1800);
          } catch {
            btn.textContent = '已复制';
          }
        });
        card.querySelector('[data-act="bookmark"]')?.addEventListener('click', (e) => {
          e.stopPropagation();
          const btn = e.currentTarget;
          const cleanZh = cleanScriptText(h.trans || h.text).replace(/\n+/g, ' ');
          const cleanJp = cleanScriptText(h.text).replace(/\n+/g, ' ');
          const quotes = JSON.parse(localStorage.getItem('shiny.quoteBookmarks') || '[]');
          const dup = quotes.some(q => q.storyKey === h.key && q.translation === cleanZh);
          if (!dup) {
            quotes.unshift({
              id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              storyKey: h.key,
              storyTitle: h.title,
              storyGroup: h.group,
              idol: h.idol,
              speaker: h.speaker,
              translation: cleanZh,
              original: cleanJp,
              savedAt: new Date().toISOString().slice(0, 10)
            });
            localStorage.setItem('shiny.quoteBookmarks', JSON.stringify(quotes.slice(0, 300)));
            try { window.desktop?.saveState?.({ 'shiny.quoteBookmarks': JSON.stringify(quotes.slice(0, 300)) }); } catch {}
          }
          btn.textContent = dup ? '✓ 已在名台词本' : '✓ 收藏成功';
          btn.classList.add('is-success');
          setTimeout(() => { btn.textContent = '❝ 收藏名台词'; btn.classList.remove('is-success'); }, 1800);
        });

        card.addEventListener('click', () => navigateStory(h.key, h.lineIndex));
        resEl.append(card);
      });

      if (curHits.length < curTotal) {
        loadWrap.innerHTML = `<button type="button" class="ph-btn ghost" id="phDlgLoadMore" style="height:32px;padding:0 18px;">⬇ 加载更多匹配台词 (已展示 ${curHits.length} / 共 ${curTotal.toLocaleString()} 条)</button>`;
        document.getElementById('phDlgLoadMore')?.addEventListener('click', loadMore);
      } else {
        loadWrap.innerHTML = '';
      }
    };

    const loadMore = async () => {
      const q = inputEl.value.trim();
      const spk = spkEl.value.trim();
      curOffset += PAGE_LIMIT;
      const btn = document.getElementById('phDlgLoadMore');
      if (btn) btn.textContent = '正在加载更多…';
      try {
        const r = await fetch(`/api/dialogue-search?q=${encodeURIComponent(q)}&speaker=${encodeURIComponent(spk)}&limit=${PAGE_LIMIT}&offset=${curOffset}`);
        const data = await r.json();
        curHits = curHits.concat(data.hits || []);
        appendCards(data.hits || [], q);
      } catch (e) {
        if (btn) btn.textContent = '加载失败：' + e.message;
      }
    };

    const runSearch = async () => {
      const q = inputEl.value.trim();
      const spk = spkEl.value.trim();
      if (!q && !spk) return;
      metaEl.textContent = '正在检索全剧本台词库…';
      resEl.innerHTML = '';
      loadWrap.innerHTML = '';
      curOffset = 0;
      try {
        const r = await fetch(`/api/dialogue-search?q=${encodeURIComponent(q)}&speaker=${encodeURIComponent(spk)}&limit=${PAGE_LIMIT}&offset=0`);
        const data = await r.json();
        curTotal = data.total || 0;
        curHits = data.hits || [];
        metaEl.textContent = `共找到 ${curTotal.toLocaleString()} 处台词匹配（耗时 ${data.tookMs} ms），展示前 ${curHits.length} 条（点击直接定位原剧情）：`;
        if (!curHits.length) {
          resEl.innerHTML = '<div style="color:#94a3b8;font-size:12.5px;padding:12px;">未检索到匹配台词，可尝试更换关键词或说话人。</div>';
          return;
        }
        appendCards(curHits, q);
      } catch (e) {
        metaEl.textContent = '检索失败：' + e.message;
      }
    };

    document.getElementById('phDlgSearchBtn')?.addEventListener('click', runSearch);
    inputEl?.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch(); });
    spkEl?.addEventListener('change', runSearch);
    modalBodyEl.querySelectorAll('[data-q]').forEach(btn => {
      btn.addEventListener('click', () => {
        inputEl.value = btn.dataset.q;
        runSearch();
      });
    });
    if (initialSpeaker && spkEl) spkEl.value = initialSpeaker;
    inputEl?.focus();
    if (initialQuery || initialSpeaker) runSearch();
  }

  // ── Feature #2 & #24: 283 Smartphone Chain Chatroom & 1v1 Morning/Promise Aggregator ──
  function openChainAnd1v1(initialMode = 'chain', initialIdol = '') {
    openModal('283 SMARTPHONE · CHAIN & 1V1 INTERACTIONS', '📱 283 手机「Chain 聊天室」与「1v1 晨间/约定互动合集」');
    modalBodyEl.innerHTML = `
      <div class="ph-bar">
        <button type="button" class="ph-btn ghost ${initialMode === 'chain' ? 'active' : ''}" id="phTabChain">📱 283 Chain 群聊与来电归档</button>
        <button type="button" class="ph-btn ghost ${initialMode === '1v1' ? 'active' : ''}" id="phTab1v1">☀️ 育成 1v1 晨间问候 & 试镜约定合集</button>
        <input type="search" class="ph-input" id="phChainSearch" placeholder="搜索话题/台词关键词…" style="width:160px;height:32px;margin-left:auto;">
        <select class="ph-select" id="phChainIdol">
          <option value="">全部 283 偶像</option>
          ${IDOLS_28.map(i => `<option value="${esc(i.name)}" ${initialIdol === i.name ? 'selected' : ''}>${esc(i.name)} (${esc(i.unit)})</option>`).join('')}
        </select>
      </div>
      <div class="ph-bar" id="ph1v1SubBar" style="gap:6px;margin-top:2px;" ${initialMode !== '1v1' ? 'hidden' : ''}>
        <span style="font-size:11px;color:#94a3b8;">互动类别：</span>
        <button type="button" class="ph-btn ghost active" data-kind="">全部</button>
        <button type="button" class="ph-btn ghost" data-kind="晨间">☀ 晨间问候</button>
        <button type="button" class="ph-btn ghost" data-kind="试镜">🎤 试镜前鼓劲</button>
        <button type="button" class="ph-btn ghost" data-kind="约定">🤝 约定互动</button>
      </div>
      <div class="ph-chain-layout">
        <div class="ph-thread-list" id="phThreadList"></div>
        <div class="ph-chat-screen" id="phChatScreen"></div>
      </div>
    `;

    let curMode = initialMode;
    let curKind = '';
    const idolSel = document.getElementById('phChainIdol');
    const searchInp = document.getElementById('phChainSearch');
    const subBar = document.getElementById('ph1v1SubBar');
    const listEl = document.getElementById('phThreadList');
    const screenEl = document.getElementById('phChatScreen');
    const tabChain = document.getElementById('phTabChain');
    const tab1v1 = document.getElementById('phTab1v1');

    const renderThread = (item) => {
      stopChatVoice();
      screenEl.innerHTML = '';
      const head = document.createElement('div');
      head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:4px;';
      head.innerHTML = `<div><strong style="font-size:13.5px;color:#fff;">${esc(item.title)}</strong><div style="font-size:11px;color:#7dd3fc;">${esc(item.kind || '')}</div></div>`;
      if (item.storyKey || item.key) {
        const goBtn = document.createElement('button');
        goBtn.type = 'button';
        goBtn.className = 'ph-btn ghost';
        goBtn.style.cssText = 'height:28px;padding:0 10px;font-size:11.5px;';
        goBtn.textContent = '🎬 在播放器中演出 ↗';
        goBtn.onclick = () => navigateStory(item.storyKey || item.key);
        head.append(goBtn);
      }
      screenEl.append(head);

      for (const l of (item.lines || [])) {
        const isP = /プロデューサー|制作人|^P$/i.test(l.speaker || l.name || '');
        const spk = l.speaker || l.name || item.idol || '偶像';
        const row = document.createElement('div');
        row.className = 'ph-bubble-row' + (isP ? ' is-producer' : '');
        const av = document.createElement('span');
        av.className = 'ph-bubble-avatar';
        if (isP) {
          av.textContent = 'P';
          av.style.cssText = 'display:grid;place-items:center;font-weight:900;font-size:13px;color:#38bdf8;background:rgba(56,189,248,0.16);';
        } else {
          const doMount = () => {
            if (window.CharacterPortraits?.mount) {
              window.CharacterPortraits.mount(av, spk);
            } else {
              av.textContent = String(spk).slice(0, 1);
              av.style.cssText = 'display:grid;place-items:center;font-weight:800;font-size:13px;color:#f8fafc;';
            }
          };
          if (window.CharacterPortraits?.mount) {
            doMount();
          } else {
            window.addEventListener('DOMContentLoaded', doMount, { once: true });
            setTimeout(doMount, 300);
          }
        }
        const b = document.createElement('div');
        b.className = 'ph-bubble' + (isP ? ' is-producer' : '');
        b.innerHTML = `
          <div class="ph-bubble-spk">
            <span>${esc(spk)}</span>
            ${l.voice ? `<button type="button" class="ph-btn ghost" data-voice="${esc(l.voice)}" style="height:20px;padding:0 6px;font-size:10px;">🔊 原声</button>` : ''}
          </div>
          <div class="ph-bubble-zh">${formatScriptHtml(l.trans || l.text)}</div>
          ${l.trans && l.text ? `<div class="ph-bubble-jp">${formatScriptHtml(l.text)}</div>` : ''}
        `;
        const vBtn = b.querySelector('[data-voice]');
        if (vBtn) {
          vBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (chatVoiceBtn === vBtn && chatVoiceAudio && !chatVoiceAudio.paused) {
              stopChatVoice();
              return;
            }
            stopChatVoice();
            stopMorningVoice();
            const audio = new Audio(vBtn.dataset.voice);
            chatVoiceAudio = audio;
            chatVoiceBtn = vBtn;
            vBtn.textContent = '🔊 播放中…';
            audio.onended = () => {
              if (chatVoiceAudio !== audio) return;
              chatVoiceAudio = null;
              chatVoiceBtn = null;
              vBtn.textContent = '🔊 原声';
            };
            audio.onerror = () => {
              if (chatVoiceAudio !== audio) return;
              chatVoiceAudio = null;
              chatVoiceBtn = null;
              vBtn.textContent = '⚠️ 无音频';
              setTimeout(() => {
                if (vBtn.textContent === '⚠️ 无音频') vBtn.textContent = '🔊 原声';
              }, 1500);
            };
            audio.play().catch(() => {
              if (chatVoiceAudio !== audio) return;
              chatVoiceAudio = null;
              chatVoiceBtn = null;
              vBtn.textContent = '🔊 原声';
            });
          });
        }
        row.append(av, b);
        screenEl.append(row);
      }
    };

    const loadData = async () => {
      stopChatVoice();
      listEl.innerHTML = '<div style="padding:12px;color:#94a3b8;font-size:12px;">正在载入对话记录…</div>';
      screenEl.innerHTML = '';
      const idol = idolSel.value;
      const q = searchInp.value.trim();
      const r = await fetch(`/api/idol-interactions?mode=${curMode}&idol=${encodeURIComponent(idol)}&q=${encodeURIComponent(q)}&kind=${encodeURIComponent(curKind)}`);
      const data = await r.json();
      const items = curMode === '1v1' ? (data.episodes || []) : (data.threads || []);
      listEl.innerHTML = '';
      if (!items.length) {
        listEl.innerHTML = '<div style="padding:12px;color:#94a3b8;font-size:12px;">暂无匹配记录，可切换其他偶像或清空搜索词查看。</div>';
        return;
      }
      items.forEach((it, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ph-thread-item' + (idx === 0 ? ' active' : '');
        btn.innerHTML = `<strong>${esc(it.title)}</strong><small>${esc(it.kind || '')} · ${(it.lines || []).length} 句</small>`;
        btn.onclick = () => {
          listEl.querySelectorAll('.ph-thread-item').forEach(x => x.classList.remove('active'));
          btn.classList.add('active');
          renderThread(it);
        };
        listEl.append(btn);
      });
      renderThread(items[0]);
    };

    tabChain?.addEventListener('click', () => {
      curMode = 'chain';
      tabChain.classList.add('active');
      tab1v1.classList.remove('active');
      subBar.hidden = true;
      loadData();
    });
    tab1v1?.addEventListener('click', () => {
      curMode = '1v1';
      tab1v1.classList.add('active');
      tabChain.classList.remove('active');
      subBar.hidden = false;
      loadData();
    });
    subBar.querySelectorAll('[data-kind]').forEach(btn => {
      btn.addEventListener('click', () => {
        subBar.querySelectorAll('[data-kind]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        curKind = btn.dataset.kind;
        loadData();
      });
    });
    idolSel?.addEventListener('change', loadData);
    searchInp?.addEventListener('input', () => {
      clearTimeout(searchInp.__t);
      searchInp.__t = setTimeout(loadData, 280);
    });
    loadData();
  }

  // ── Feature #13: 283 640-Pair Character Address & Script Evidence Matrix ──
  async function openAddressMatrix() {
    openModal('283 CHARACTER ADDRESS MATRIX · 640 PAIRS', '🕸️ 283 全员「互称与原句考据矩阵盘」');
    modalBodyEl.innerHTML = '<div style="color:#94a3b8;font-size:12.5px;">正在载入 640 组互称与原句考据库…</div>';
    if (!matrixCache) {
      matrixCache = await fetch('/api/address-matrix').then(r => r.json()).catch(() => ({ addresses: [], evidence: [] }));
    }
    const allChars = [...IDOLS_28, { id: 'staff', name: '七草叶月', unit: '283 事务员' }];

    modalBodyEl.innerHTML = `
      <div class="ph-bar">
        <label style="font-size:12px;color:#7dd3fc;font-weight:700;">说话人 A：</label>
        <select class="ph-select" id="phMatSpeaker">
          ${allChars.map(c => `<option value="${c.id}" ${c.id === '21' ? 'selected' : ''}>${esc(c.name)} (${esc(c.unit)})</option>`).join('')}
        </select>
        <button type="button" class="ph-btn ghost" id="phMatSwapBtn" style="height:28px;padding:0 9px;font-size:12px;" title="互换角色视角">⇄ 互换</button>
        <label style="font-size:12px;color:#7dd3fc;font-weight:700;">对方 B：</label>
        <select class="ph-select" id="phMatTarget">
          ${allChars.map(c => `<option value="${c.id}" ${c.id === '20' ? 'selected' : ''}>${esc(c.name)} (${esc(c.unit)})</option>`).join('')}
        </select>
      </div>
      <div class="ph-matrix-pair-box" id="phMatPairBox"></div>
      <div style="font-size:12px;font-weight:700;color:#7dd3fc;margin-top:4px;" id="phMatGridTitle">全员称呼一览（点击任意格子切换对方 B）：</div>
      <div class="ph-addr-grid" id="phMatGrid"></div>
      <div style="font-size:12px;font-weight:700;color:#fde047;margin-top:4px;">📜 剧本原句考据出处（点击直接跳转原剧情）：</div>
      <div id="phMatEvidence" style="display:flex;flex-direction:column;gap:6px;"></div>
    `;

    const selA = document.getElementById('phMatSpeaker');
    const selB = document.getElementById('phMatTarget');
    const pairBox = document.getElementById('phMatPairBox');
    const gridTitle = document.getElementById('phMatGridTitle');
    const gridEl = document.getElementById('phMatGrid');
    const evEl = document.getElementById('phMatEvidence');

    const findAddr = (s, t) => (matrixCache.addresses || []).find(x => String(x.speaker) === String(s) && String(x.target) === String(t));

    const updateView = () => {
      const idA = selA.value;
      const idB = selB.value;
      const charA = IDOL_BY_ID.get(idA) || { name: idA };
      const charB = IDOL_BY_ID.get(idB) || { name: idB };
      const aToB = findAddr(idA, idB);
      const bToA = findAddr(idB, idA);

      pairBox.innerHTML = `
        <div class="ph-addr-card">
          <h4>${esc(charA.name)} ➔ 称呼 ${esc(charB.name)}</h4>
          <div class="ph-addr-big">${esc((aToB?.forms || []).join(' ／ ') || '（暂未收录直接称呼）')}</div>
          <div style="font-size:11px;color:#94a3b8;">${esc((aToB?.notes || []).join(' · ') || '来源：283 社区互称考据表')}</div>
        </div>
        <div class="ph-addr-card">
          <h4>${esc(charB.name)} ➔ 称呼 ${esc(charA.name)}</h4>
          <div class="ph-addr-big">${esc((bToA?.forms || []).join(' ／ ') || '（暂未收录直接称呼）')}</div>
          <div style="font-size:11px;color:#94a3b8;">${esc((bToA?.notes || []).join(' · ') || '来源：283 社区互称考据表')}</div>
        </div>
      `;

      gridTitle.textContent = `${charA.name} 对全员的称呼一览（点击任意卡片切换对方 B）：`;
      gridEl.innerHTML = '';
      for (const c of allChars) {
        if (c.id === idA) continue;
        const rec = findAddr(idA, c.id);
        const cell = document.createElement('div');
        cell.className = 'ph-addr-cell';
        cell.innerHTML = `<strong>对 ${esc(c.name)}：</strong><span>${esc((rec?.forms || []).join(' / ') || '—')}</span>`;
        cell.onclick = () => { selB.value = c.id; updateView(); };
        gridEl.append(cell);
      }

      const evHits = (matrixCache.evidence || []).filter(e =>
        (String(e.speaker) === idA && String(e.target) === idB) ||
        (String(e.speaker) === idB && String(e.target) === idA)
      );
      evEl.innerHTML = '';
      if (!evHits.length) {
        evEl.innerHTML = `
          <div style="font-size:11.5px;color:#94a3b8;padding:4px 0;">当前两人在基础互称考据库中暂无直接互称记录。</div>
          <button type="button" class="ph-btn ghost" id="phMatSearchJump" style="height:28px;padding:0 12px;font-size:11.5px;align-self:flex-start;">
            🔍 在全剧本台词库中秒搜「${esc(charA.name)}」与「${esc(charB.name)}」的同场对话 ↗
          </button>
        `;
        document.getElementById('phMatSearchJump')?.addEventListener('click', () => {
          openDialogueSearch(charB.name);
          const spk = document.getElementById('phDlgSpeaker');
          if (spk) { spk.value = charA.name; spk.dispatchEvent(new Event('change')); }
        });
      } else {
        for (const ev of evHits.slice(0, 16)) {
          const spkName = IDOL_BY_ID.get(String(ev.speaker))?.name || ev.speaker;
          const row = document.createElement('div');
          row.className = 'ph-hit-card';
          row.innerHTML = `
            <div class="ph-hit-meta"><span>🗣 ${esc(spkName)} 称呼「${esc(ev.form)}」</span><span>📖 ${esc(ev.storyTitle)} ↗</span></div>
            <div class="ph-hit-line">${formatScriptHtml(ev.text)}</div>
          `;
          row.onclick = () => navigateStory(ev.key, ev.line || 0);
          evEl.append(row);
        }
      }
    };

    document.getElementById('phMatSwapBtn')?.addEventListener('click', () => {
      const tmp = selA.value;
      selA.value = selB.value;
      selB.value = tmp;
      updateView();
    });
    selA?.addEventListener('change', updateView);
    selB?.addEventListener('change', updateView);
    updateView();
  }

  // ── Feature #4: 283 Producer Resume & Achievement Stamp Book ──
  async function openProducerResume() {
    openModal('283 PRODUCER RESUME & ACHIEVEMENTS', '📊 制作人「283 履历书」与成就印章册');
    const { catalog } = await ensureCatalog();
    const watched = new Set(JSON.parse(localStorage.getItem('shiny.watchedStories') || '[]'));
    const quotes = JSON.parse(localStorage.getItem('shiny.quoteBookmarks') || '[]');
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const pName = localStorage.getItem('shiny.producerName') || '283 制作人';

    const watchedStories = catalog.filter(s => watched.has(s.key));
    const hasWatchedGroup = (re) => watchedStories.some(s => re.test(`${s.group || ''} ${s.title || ''}`));
    const rankTitle = watched.size >= 500 ? '🏆 283 传奇首席制作人'
      : watched.size >= 100 ? '🌟 283 王牌资深制作人'
      : watched.size >= 20 ? '✨ 283 正式担当制作人'
      : '🌱 283 新锐见习制作人';

    const STAMPS = [
      { id: 'first', title: '✦ 初遇 283 之翼', desc: '完成首篇剧情阅读并标记已观看', ok: watched.size >= 1 },
      { id: 'wing', title: '🏆 W.I.N.G. 领航员', desc: '阅读任意偶像的 W.I.N.G. 育成篇章', ok: hasWatchedGroup(/w\.?i\.?n\.?g/i) },
      { id: 'tenjin', title: '🌊 天尘见证者', desc: '阅读 noctchill 封神名篇《天塵》', ok: hasWatchedGroup(/天塵/) },
      { id: 'usumomo', title: '🌸 薄桃色心理学家', desc: '阅读 ALSTROEMERIA《薄桃色にこんがらがって》', ok: hasWatchedGroup(/薄桃色/) },
      { id: 'akarui', title: '🏠 明亮房间的守望者', desc: '阅读 283 全员越境名作《明るい部屋》', ok: hasWatchedGroup(/明るい部屋/) },
      { id: 'stray', title: '⚡ 迷光疾走者', desc: '阅读 Straylight 结成篇《Straylight.run()》', ok: hasWatchedGroup(/Straylight\.run/i) },
      { id: 'sevens', title: '🥀 283 往事解密者', desc: '阅读核心主线《セヴン＃ス》或《ジ・エピソード》', ok: hasWatchedGroup(/セヴン＃ス|ジ・エピソード/) },
      { id: 'dec', title: '❄️ 十二月雪夜听众', desc: '阅读 2022 圣诞越境《線たちの十二月》', ok: hasWatchedGroup(/線たちの十二月/) },
      { id: 'quotes', title: '❝ 名台词收藏家', desc: '在名台词本中收藏至少 1 句触动心灵的台词', ok: quotes.length >= 1 },
      { id: 'fav', title: '★ 珍藏剧目策划人', desc: '收藏至少 3 篇喜爱的剧情', ok: favs.length >= 3 },
      { id: 'c30', title: '📚 资深剧情考据党', desc: '累计已观看剧情达到 30 篇以上', ok: watched.size >= 30 },
      { id: 'c100', title: '👑 二八三百篇制霸', desc: '累计已观看剧情达到 100 篇以上', ok: watched.size >= 100 }
    ];
    const unlockedCount = STAMPS.filter(s => s.ok).length;

    const UNIT_META = [
      { name: 'illumination STARS', color: '#facc15', idols: ['樱木真乃', '风野灯织', '八宫巡'] },
      { name: "L'Antica", color: '#c084fc', idols: ['月冈恋钟', '田中摩美美', '白濑咲耶', '三峰结华', '幽谷雾子'] },
      { name: '放课后Climax Girls', color: '#fb923c', idols: ['小宫果穗', '园田智代子', '西城树里', '杜野凛世', '有栖川夏叶'] },
      { name: 'ALSTROEMERIA', color: '#f472b6', idols: ['大崎甘奈', '大崎甜花', '桑山千雪'] },
      { name: 'Straylight', color: '#f43f5e', idols: ['芹泽朝日', '黛冬优子', '和泉爱依'] },
      { name: 'noctchill', color: '#38bdf8', idols: ['浅仓透', '樋口圆香', '福丸小糸', '市川雏菜'] },
      { name: 'SHHis', color: '#10b981', idols: ['七草日花', '绯田美琴'] },
      { name: 'CoMETIK', color: '#a855f7', idols: ['斑鸠路加', '铃木羽那', '郁田春希'] }
    ];
    const unitBarsHtml = UNIT_META.map(u => {
      const unitStories = catalog.filter(s => s.idol === u.name || u.idols.includes(s.idol));
      const unitWatched = unitStories.filter(s => watched.has(s.key)).length;
      const pct = unitStories.length ? Math.min(100, Math.round((unitWatched / unitStories.length) * 100)) : 0;
      const isComplete = unitWatched >= unitStories.length && unitStories.length > 0;
      return `
        <div class="ph-unit-bar-card">
          <div class="ph-unit-bar-head">
            <span style="color:${u.color};">✦ ${esc(u.name)}${isComplete ? '<span class="ph-unit-crown">👑 全通制霸</span>' : ''}</span>
            <span>${unitWatched} / ${unitStories.length} (${pct}%)</span>
          </div>
          <div class="ph-unit-bar-track">
            <div class="ph-unit-bar-fill" style="width:${Math.max(pct, unitWatched > 0 ? 4 : 0)}%;background:linear-gradient(90deg,${u.color},#fff);"></div>
          </div>
        </div>
      `;
    }).join('');

    modalBodyEl.innerHTML = `
      <div class="ph-bar" style="justify-content:space-between;background:rgba(56,189,248,0.1);padding:12px 14px;border-radius:14px;border:1px solid rgba(56,189,248,0.3);">
        <div>
          <small style="color:#7dd3fc;font-weight:700;">${esc(rankTitle)}</small>
          <div style="font-size:18px;font-weight:800;color:#fff;margin-top:2px;" id="phResNameDisp">${esc(pName)}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input type="text" class="ph-input" id="phResNameInput" value="${esc(pName)}" placeholder="设定制作人署名…" style="width:150px;flex:none;height:32px;">
          <button type="button" class="ph-btn ghost" id="phResSaveName" style="height:32px;">保存署名</button>
          <button type="button" class="ph-btn" id="phResExportPng" style="height:32px;">🖼 导出高清履历书图片</button>
        </div>
      </div>

      <div class="ph-resume-stats">
        <div class="ph-stat-box"><b>${watched.size}</b><span>已观看剧情</span></div>
        <div class="ph-stat-box"><b>${quotes.length}</b><span>收藏名台词</span></div>
        <div class="ph-stat-box"><b>${favs.length}</b><span>星标剧情</span></div>
        <div class="ph-stat-box"><b>${unlockedCount} / ${STAMPS.length}</b><span>成就印章解锁</span></div>
      </div>

      <div style="font-size:12.5px;font-weight:800;color:#7dd3fc;">🌈 八大组合剧情阅历进度：</div>
      <div class="ph-unit-bars">${unitBarsHtml}</div>

      <div style="font-size:12.5px;font-weight:800;color:#fde047;">🎖 283 制作人成就印章册（观看对应剧情或收藏台词自动盖章）：</div>
      <div class="ph-stamp-grid">
        ${STAMPS.map(st => `
          <div class="ph-stamp ${st.ok ? 'unlocked' : ''}">
            <strong>${st.ok ? '💮 ' : '🔒 '}${esc(st.title)}</strong>
            <small>${esc(st.desc)}</small>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('phResSaveName')?.addEventListener('click', () => {
      const val = document.getElementById('phResNameInput').value.trim() || '283 制作人';
      localStorage.setItem('shiny.producerName', val);
      try { window.desktop?.saveState?.({ 'shiny.producerName': val }); } catch {}
      document.getElementById('phResNameDisp').textContent = val;
    });

    document.getElementById('phResExportPng')?.addEventListener('click', () => {
      const cvs = document.createElement('canvas');
      cvs.width = 1200;
      cvs.height = 675;
      const c = cvs.getContext('2d');
      const g = c.createLinearGradient(0, 0, 1200, 675);
      g.addColorStop(0, '#070b19');
      g.addColorStop(0.5, '#0f172a');
      g.addColorStop(1, '#1e1b4b');
      c.fillStyle = g;
      c.fillRect(0, 0, 1200, 675);

      c.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      c.lineWidth = 2;
      c.strokeRect(32, 32, 1136, 611);

      c.fillStyle = '#38bdf8';
      c.font = '800 18px "Segoe UI", "Microsoft YaHei", sans-serif';
      c.fillText('283 PRODUCTION · PRODUCER OFFICIAL RESUME', 68, 86);

      const curName = document.getElementById('phResNameInput').value.trim() || pName;
      c.fillStyle = '#ffffff';
      c.font = '900 44px "Segoe UI", "Microsoft YaHei", sans-serif';
      c.fillText(curName, 68, 146);

      c.fillStyle = '#fde047';
      c.font = '700 22px "Segoe UI", "Microsoft YaHei", sans-serif';
      c.fillText(rankTitle, 68, 186);

      const stats = [
        ['已观看剧情', `${watched.size} 篇`],
        ['名台词收藏', `${quotes.length} 句`],
        ['星标收藏', `${favs.length} 篇`],
        ['解锁印章', `${unlockedCount} / ${STAMPS.length}`]
      ];
      stats.forEach((st, idx) => {
        const bx = 68 + idx * 270;
        c.fillStyle = 'rgba(255,255,255,0.06)';
        c.fillRect(bx, 220, 248, 96);
        c.fillStyle = '#38bdf8';
        c.font = '800 32px "Segoe UI", "Microsoft YaHei", sans-serif';
        c.fillText(st[1], bx + 20, 270);
        c.fillStyle = '#94a3b8';
        c.font = '600 15px "Segoe UI", "Microsoft YaHei", sans-serif';
        c.fillText(st[0], bx + 20, 298);
      });

      c.fillStyle = '#e2e8f0';
      c.font = '800 20px "Segoe UI", "Microsoft YaHei", sans-serif';
      c.fillText('已解锁成就印章：', 68, 366);

      STAMPS.forEach((st, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const sx = 68 + col * 365;
        const sy = 390 + row * 56;
        c.fillStyle = st.ok ? 'rgba(250, 204, 21, 0.16)' : 'rgba(255, 255, 255, 0.04)';
        c.fillRect(sx, sy, 345, 44);
        c.fillStyle = st.ok ? '#fef08a' : '#64748b';
        c.font = '700 16px "Segoe UI", "Microsoft YaHei", sans-serif';
        c.fillText(`${st.ok ? '💮' : '🔒'} ${st.title}`, sx + 14, sy + 28);
      });

      const a = document.createElement('a');
      a.href = cvs.toDataURL('image/png');
      a.download = `283-producer-resume-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    });
  }

  // ── Feature #17: Daily Oha-Asa TV Fortune & Unwatched Story Blind-Box ──
  async function openDailyFortune() {
    openModal('283 OHA-ASA MORNING FORTUNE & BLIND BOX', '🎲 每日「晨间电视占卜 & 沧海遗珠盲盒」');
    const { catalog, cardArt } = await ensureCatalog();
    const watched = new Set(JSON.parse(localStorage.getItem('shiny.watchedStories') || '[]'));

    const todayStr = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (let i = 0; i < todayStr.length; i++) seed = (seed * 31 + todayStr.charCodeAt(i)) >>> 0;
    const luckyIdol = IDOLS_28[seed % IDOLS_28.length];
    const fortunes = ['🌟 大吉 · 闪耀满点', '✨ 中吉 · 灵感迸发', '🍀 小吉 · 温柔顺遂', '🌈 特吉 · 奇迹邂逅'];
    const luckyFortune = fortunes[seed % fortunes.length];

    const pool = catalog.filter(s => s.translated && !watched.has(s.key) && !/^[a-z]+_[a-z_]+_\d+/i.test(s.title || ''));
    const pickRandomStory = () => pool.length ? pool[Math.floor(Math.random() * pool.length)] : catalog[0];

    const renderBox = (story) => {
      const art = story ? cardArt[story.key] : null;
      const artUrl = art ? `/asset/images/content/${art.type}/card/${art.id}.jpg` : '';
      modalBodyEl.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;">
          <div class="ph-addr-card" style="border-color:${luckyIdol.color};">
            <small style="color:#7dd3fc;font-weight:700;">📺 今日晨间占卜 (${todayStr})</small>
            <div class="ph-addr-big" style="margin-top:6px;">${luckyFortune}</div>
            <div style="font-size:14px;font-weight:700;color:#fff;margin-top:6px;">今日幸运担当：${esc(luckyIdol.name)} (${esc(luckyIdol.unit)})</div>
            <p style="font-size:12px;color:#cbd5e1;line-height:1.6;margin:8px 0 0;">「制作人，今天不论遇到什么挑战，只要保持你的步调就一定没问题哦！」</p>
          </div>

          <div class="ph-addr-card">
            <small style="color:#fde047;font-weight:700;">🎁 尚未观看的沧海遗珠盲盒（剩余 ${pool.length.toLocaleString()} 篇未看汉化剧情）</small>
            ${artUrl ? `<img src="${artUrl}" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;margin-top:8px;">` : ''}
            <div style="font-size:16px;font-weight:800;color:#fff;margin-top:8px;">${esc(story?.title || '推荐剧集')}</div>
            <div style="font-size:12px;color:#7dd3fc;margin-top:3px;">${esc(story?.idol || '')} · ${esc(story?.category || '')} · ${esc(story?.group || '')}</div>
            <div class="ph-bar" style="margin-top:12px;">
              <button type="button" class="ph-btn" id="phBoxWatchBtn">▶ 立即观看这篇</button>
              <button type="button" class="ph-btn ghost" id="phBoxRerollBtn">🎲 再抽一篇遗珠</button>
            </div>
          </div>
        </div>
      `;
      document.getElementById('phBoxWatchBtn')?.addEventListener('click', () => {
        if (story) navigateStory(story.key);
      });
      document.getElementById('phBoxRerollBtn')?.addEventListener('click', () => {
        renderBox(pickRandomStory());
      });
    };

    renderBox(pickRandomStory());
  }

  // ── Feature #15: Fullscreen Ambient Vinyl Art Frame (283 Ambient Frame) ──
  const IDOL_STANDS = [
    { name: '樱木真乃', file: '/model-previews/f05d0a686a100ff0f263f23c.webp' },
    { name: '风野灯织', file: '/model-previews/b5683cb7a251fe18479e2572.webp' },
    { name: '八宫巡', file: '/model-previews/a84cfdde2116bc301d50dc91.webp' },
    { name: '月冈恋钟', file: '/model-previews/88e25ef6f5662b30ba684f10.webp' },
    { name: '田中摩美美', file: '/model-previews/11242569230dce70436737d0.webp' },
    { name: '白濑咲耶', file: '/model-previews/7856b186e1d1c54f3f4166d8.webp' },
    { name: '三峰结华', file: '/model-previews/b2350beebfab1fce49386012.webp' },
    { name: '幽谷雾子', file: '/model-previews/d89fd9e0dbbbaba748e8b49b.webp' },
    { name: '小宫果穗', file: '/model-previews/1a5770d3c8a3da07c58006c1.webp' },
    { name: '园田智代子', file: '/model-previews/9e172189909f0e9e070c286e.webp' },
    { name: '西城树里', file: '/model-previews/de9d5cd5223cacbdb726dd1a.webp' },
    { name: '杜野凛世', file: '/model-previews/4bcb1c33b3e97ecf113be942.webp' },
    { name: '有栖川夏叶', file: '/model-previews/09c08ba85ffae7cae4fed2ed.webp' },
    { name: '大崎甘奈', file: '/model-previews/942fc03d7d5125e242e4ee44.webp' },
    { name: '大崎甜花', file: '/model-previews/92bd99957ac402764997eff9.webp' },
    { name: '桑山千雪', file: '/model-previews/73692b9d02f2223727213471.webp' },
    { name: '芹泽朝日', file: '/model-previews/339ddf848482b8b1c368186e.webp' },
    { name: '黛冬优子', file: '/model-previews/135967cb39e425086b91bda4.webp' },
    { name: '和泉爱依', file: '/model-previews/7703903084f8553488c3546f.webp' },
    { name: '浅仓透', file: '/model-previews/607530f43bf64a4122e5458e.webp' },
    { name: '樋口圆香', file: '/model-previews/2fb762b9f7da838448e09ffa.webp' },
    { name: '福丸小糸', file: '/model-previews/329c48323f585fdabbb4acf5.webp' },
    { name: '市川雏菜', file: '/model-previews/627e5bb79fd26ba6af5d84c1.webp' },
    { name: '七草日花', file: '/model-previews/624a684cfb8a3ab3e685c2e5.webp' },
    { name: '绯田美琴', file: '/model-previews/03b3ed095f233a6eca2024c6.webp' },
    { name: '斑鸠路加', file: '/model-previews/c90720fc1591dab072922245.webp' },
    { name: '铃木羽那', file: '/model-previews/9638cd6e23bd59cfa67a7fa3.webp' },
    { name: '郁田春希', file: '/model-previews/4b36e2ede60f3a21d85c73ec.webp' }
  ];

  let idleFadeTimer = null;

  function setHomeFrameVisibility(active) {
    try {
      const homeFrame = document.querySelector('#shellStage iframe[data-page="index.html"], #shellStage iframe[src*="index.html"]');
      if (homeFrame?.contentWindow) {
        if (active && !homeFrame.classList.contains('is-active')) return;
        homeFrame.contentWindow.postMessage({ type: 'shiny-shell-visibility', active: !!active }, location.origin);
      }
    } catch {}
  }

  async function openAmbientFrame() {
    closeModal();
    // Immediately silence & pause the background 283 office idol so she never talks behind the screensaver!
    setHomeFrameVisibility(false);
    const { catalog, cardArt } = await ensureCatalog();
    const artList = [];
    for (const [sKey, a] of Object.entries(cardArt || {})) {
      if (a && a.id) {
        artList.push({
          url: `/asset/images/content/${a.type || 'idols'}/card/${a.id}.jpg`,
          name: a.name || '283 Production',
          storyKey: sKey
        });
      }
    }
    if (!artList.length) {
      artList.push({ url: '/app-icon.png', name: '283 Production', storyKey: '' });
    }

    let dimLevel = 0; // 0: 100%, 1: 65%, 2: 35%
    let currentArtPick = null;

    if (!ambientEl) {
      ambientEl = document.createElement('div');
      ambientEl.className = 'ph-ambient-frame';
      ambientEl.tabIndex = -1;
      ambientEl.hidden = true;
      ambientEl.innerHTML = `
        <div class="ph-af-art-bg" id="phAfBg"></div>
        <div class="ph-af-shade"></div>
        <header class="ph-af-top">
          <div>
            <div class="ph-af-clock" id="phAfClock">00:00</div>
            <div class="ph-af-date" id="phAfDate">283 PRODUCTION · AMBIENT ART FRAME</div>
          </div>
          <div class="ph-af-actions">
            <div class="ph-af-more-wrap">
              <button type="button" class="ph-btn ghost" id="phAfMoreBtn" aria-expanded="false">··· 更多</button>
              <div class="ph-af-more-menu" id="phAfMoreMenu" hidden>
                <button type="button" class="ph-af-menu-item" id="phAfNextArtBtn">🖼 换画作</button>
                <button type="button" class="ph-af-menu-item" id="phAfDimBtn">🌙 调光: 100%</button>
                <button type="button" class="ph-af-menu-item" id="phAfFullscreenBtn">⛶ 全屏</button>
              </div>
            </div>
            <button type="button" class="ph-btn ghost" id="phAfExitBtn">退出 ×</button>
          </div>
        </header>
        <footer class="ph-af-bottom">
          <div class="ph-af-vinyl-card" id="phAfVinylCard" role="region" aria-label="全屏黑胶音乐胶囊" aria-expanded="false" tabindex="0" title="点击展开 / 收起音乐胶囊">
            <div class="ph-af-island-head">
              <img class="ph-af-disc" id="phAfDisc" src="/app-icon.png" alt="">
              <div class="ph-af-track-meta">
                <strong id="phAfSong">Spread the Wings!!</strong>
                <span id="phAfArtist">283 Production</span>
              </div>
              <div class="ph-af-mini-ctrls">
                <button type="button" class="ph-af-ctrl-btn play-btn" id="phAfPlayBtn" aria-label="播放或暂停" data-tip="播放 / 暂停" title="播放 / 暂停 (Space)">
                  <svg class="ic-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>
                  <svg class="ic-pause" viewBox="0 0 24 24"><rect x="6.5" y="5" width="3.8" height="14" rx="1.4"/><rect x="13.7" y="5" width="3.8" height="14" rx="1.4"/></svg>
                </button>
                <button type="button" class="ph-af-ctrl-btn" id="phAfNextSongBtn" aria-label="下一首歌曲" data-tip="下一首歌曲" title="下一首歌曲">
                  <svg viewBox="0 0 24 24"><path d="M16 6.5h2.2v11H16zM5.8 6.5l8.4 5.5-8.4 5.5z"/></svg>
                </button>
              </div>
              <div class="ph-af-exp-head-ctrls">
                <button type="button" class="ph-af-ctrl-btn ph-af-fav-btn" id="phAfFavBtn" aria-label="收藏歌曲" title="收藏">
                  <svg viewBox="0 0 24 24"><path d="M12 20.4l-1.35-1.23C5.4 14.36 2 11.27 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.77-3.4 6.86-8.65 11.68z"/></svg>
                </button>
                <button type="button" class="ph-af-ctrl-btn" id="phAfCollapseBtn" aria-label="收起音乐胶囊" title="收起">
                  <svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z"/></svg>
                </button>
              </div>
            </div>
            <div class="ph-af-island-body">
              <div class="ph-af-island-inner">
                <div class="ph-af-lyrics">
                  <div class="ph-af-lyric-jp" id="phAfLyricJp">♪ 纯享音乐时光 ♪</div>
                  <div class="ph-af-lyric-zh" id="phAfLyricZh"></div>
                </div>
                <div class="ph-af-seek-row">
                  <span id="phAfCurTime">0:00</span>
                  <input type="range" id="phAfSeek" min="0" max="100" step="0.1" value="0" aria-label="播放进度">
                  <span id="phAfDurTime">0:00</span>
                </div>
                <div class="ph-af-transport-row">
                  <div class="ph-af-transport-left">
                    <button type="button" class="ph-af-ctrl-btn ph-af-mode-btn" id="phAfModeBtn" aria-label="切换播放模式" title="列表循环" data-tip="列表循环">
                      <svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>
                    </button>
                    <button type="button" class="ph-af-ctrl-btn" id="phAfPrevBtn" aria-label="上一首" title="上一首">
                      <svg viewBox="0 0 24 24"><path d="M5.8 6.5H8v11H5.8zM18.2 6.5l-8.4 5.5 8.4 5.5z"/></svg>
                    </button>
                    <button type="button" class="ph-af-ctrl-btn play-btn" id="phAfPlayLgBtn" aria-label="播放或暂停" title="播放 / 暂停 (Space)">
                      <svg class="ic-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>
                      <svg class="ic-pause" viewBox="0 0 24 24"><rect x="6.5" y="5" width="3.8" height="14" rx="1.4"/><rect x="13.7" y="5" width="3.8" height="14" rx="1.4"/></svg>
                    </button>
                    <button type="button" class="ph-af-ctrl-btn" id="phAfNextLgBtn" aria-label="下一首" title="下一首">
                      <svg viewBox="0 0 24 24"><path d="M16 6.5h2.2v11H16zM5.8 6.5l8.4 5.5-8.4 5.5z"/></svg>
                    </button>
                  </div>
                  <div class="ph-af-vol-pill">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                    <input type="range" id="phAfVol" min="0" max="100" step="1" value="50" aria-label="音量">
                    <span id="phAfVolVal">50%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="ph-af-card-meta">
            <div id="phAfCardName" style="font-size:12.5px;color:rgba(226,232,240,0.85);font-weight:600;"></div>
            <button type="button" class="ph-btn ghost" id="phAfJumpStoryBtn" style="height:26px;padding:0 9px;font-size:11px;" hidden>📖 观看此卡剧情 ↗</button>
          </div>
        </footer>
      `;
      document.body.appendChild(ambientEl);

      const vinylCard = document.getElementById('phAfVinylCard');
      const trackMetaEl = vinylCard?.querySelector('.ph-af-track-meta');
      const jumpToMusicRoom = () => {
        closeAmbientFrame();
        if (window.__shinyShell?.navigate) {
          window.__shinyShell.navigate('music.html');
        } else {
          document.querySelector('#prismDock [data-page="music.html"]')?.click();
        }
      };

      const setIslandExpanded = (next) => {
        if (!vinylCard) return;
        const expanded = !!next;
        vinylCard.classList.toggle('is-expanded', expanded);
        vinylCard.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (trackMetaEl) {
          trackMetaEl.title = expanded ? '点击前往音乐馆 · Jukebox' : '点击展开音乐胶囊';
          trackMetaEl.setAttribute('tabindex', expanded ? '0' : '-1');
        }
      };

      const resetIdleTimer = () => {
        ambientEl?.classList.remove('is-zen');
        clearTimeout(idleFadeTimer);
        idleFadeTimer = setTimeout(() => {
          const capOpen = vinylCard?.classList.contains('is-expanded');
          if (ambientEl && !ambientEl.hidden && !capOpen) {
            ambientEl.classList.add('is-zen');
          }
        }, 3600);
      };
      ambientEl.addEventListener('mousemove', resetIdleTimer);
      ambientEl.addEventListener('pointerdown', resetIdleTimer);

      vinylCard?.addEventListener('click', e => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        if (vinylCard.classList.contains('is-expanded') && e.target.closest('.ph-af-track-meta')) {
          e.stopPropagation();
          jumpToMusicRoom();
          return;
        }
        e.stopPropagation();
        resetIdleTimer();
        setIslandExpanded(!vinylCard.classList.contains('is-expanded'));
      });
      trackMetaEl?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && vinylCard.classList.contains('is-expanded')) {
          e.stopPropagation();
          jumpToMusicRoom();
        }
      });
      vinylCard?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target === vinylCard) {
          e.preventDefault();
          e.stopPropagation();
          resetIdleTimer();
          setIslandExpanded(!vinylCard.classList.contains('is-expanded'));
        }
      });

      const moreBtn = document.getElementById('phAfMoreBtn');
      const moreMenu = document.getElementById('phAfMoreMenu');
      const closeMoreMenu = () => {
        if (moreMenu) moreMenu.hidden = true;
        if (moreBtn) moreBtn.setAttribute('aria-expanded', 'false');
      };
      moreBtn?.addEventListener('click', e => {
        e.stopPropagation();
        if (!moreMenu) return;
        const willOpen = moreMenu.hidden;
        moreMenu.hidden = !willOpen;
        moreBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
      ambientEl.addEventListener('click', e => {
        if (moreMenu && !moreMenu.hidden && !e.target.closest('.ph-af-more-wrap')) {
          closeMoreMenu();
        }
        if (vinylCard?.classList.contains('is-expanded') && !e.target.closest('#phAfVinylCard')) {
          setIslandExpanded(false);
        }
      });

      const fmtTime = (sec) => {
        if (!Number.isFinite(sec) || sec < 0) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${String(s).padStart(2, '0')}`;
      };
      let afSeeking = false;
      const syncIslandState = (st) => {
        if (!st || !vinylCard) return;
        const song = st.song;
        const isPlaying = typeof st.isPlaying === 'boolean'
          ? st.isPlaying
          : (document.getElementById('dynamicIsland')?.classList.contains('is-playing') || localStorage.getItem('shiny.musicPlaying') === '1');
        vinylCard.classList.toggle('is-paused', !isPlaying);

        const playBtn = document.getElementById('phAfPlayBtn');
        if (playBtn) {
          playBtn.setAttribute('title', isPlaying ? '暂停 (Space)' : '播放 (Space)');
          playBtn.setAttribute('data-tip', isPlaying ? '暂停' : '播放');
        }
        if (song?.color) vinylCard.style.setProperty('--af-accent', song.color);
        const songEl = document.getElementById('phAfSong');
        const artistEl = document.getElementById('phAfArtist');
        const discEl = document.getElementById('phAfDisc');
        if (song?.title && songEl) songEl.textContent = song.title;
        if (artistEl) {
          artistEl.textContent = song ? (song.unitName || song.vocalists || '283 Production') : '283 Production';
        }
        const cover = song?.cover || document.getElementById('islandCover')?.getAttribute('src');
        if (cover && discEl && discEl.getAttribute('src') !== cover) discEl.src = cover;

        const favBtn = document.getElementById('phAfFavBtn');
        if (favBtn) favBtn.classList.toggle('is-fav', !!st.isFav);

        const modeBtn = document.getElementById('phAfModeBtn');
        if (modeBtn) {
          const mode = st.playMode || 'loop';
          const PLAY_MODE_ICONS = {
            loop: {
              title: '列表循环',
              svg: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>'
            },
            shuffle: {
              title: '随机播放',
              svg: '<path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>'
            },
            single: {
              title: '单曲循环',
              svg: '<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="14" font-size="8" font-weight="bold" text-anchor="middle" fill="currentColor">1</text>'
            }
          };
          const meta = PLAY_MODE_ICONS[mode] || PLAY_MODE_ICONS.loop;
          modeBtn.innerHTML = `<svg viewBox="0 0 24 24">${meta.svg}</svg>`;
          modeBtn.title = meta.title;
          modeBtn.setAttribute('data-tip', meta.title);
          modeBtn.classList.toggle('is-accent', mode !== 'loop');
        }

        const jpEl = document.getElementById('phAfLyricJp');
        const zhEl = document.getElementById('phAfLyricZh');
        if (jpEl) jpEl.textContent = st.lyricJp || '♪ 纯享音乐时光 ♪';
        if (zhEl) zhEl.textContent = st.lyricZh || '';

        const dur = st.duration > 0 ? st.duration : (song?.duration || 0);
        const cur = Number(st.currentTime || 0);
        const pct = dur > 0 ? Math.max(0, Math.min(100, (cur / dur) * 100)) : 0;
        const curEl = document.getElementById('phAfCurTime');
        const durEl = document.getElementById('phAfDurTime');
        const seekEl = document.getElementById('phAfSeek');
        if (curEl) curEl.textContent = fmtTime(cur);
        if (durEl) durEl.textContent = fmtTime(dur);
        if (seekEl && !afSeeking) seekEl.value = String(pct.toFixed(1));

        const volEl = document.getElementById('phAfVol');
        const volVal = document.getElementById('phAfVolVal');
        if (Number.isFinite(Number(st.volume))) {
          const vv = Math.round(Number(st.volume));
          if (volEl) volEl.value = String(vv);
          if (volVal) volVal.textContent = `${vv}%`;
        }
      };
      ambientEl._syncIslandState = syncIslandState;
      window.addEventListener('shiny-music-state', e => {
        if (ambientEl && !ambientEl.hidden) syncIslandState(e.detail);
      });

      const doTogglePlay = () => {
        if (window.__shinyMusicAction) window.__shinyMusicAction(api => api.togglePlay?.());
        else document.getElementById('islandMiniPlay')?.click();
        setTimeout(tick, 60);
      };
      const doNextSong = () => {
        if (window.__shinyMusicAction) window.__shinyMusicAction(api => api.next?.());
        else document.getElementById('islandMiniNext')?.click();
        setTimeout(tick, 100);
      };

      document.getElementById('phAfExitBtn')?.addEventListener('click', closeAmbientFrame);
      document.getElementById('phAfNextArtBtn')?.addEventListener('click', () => {
        cycleArt();
        closeMoreMenu();
      });
      document.getElementById('phAfPlayBtn')?.addEventListener('click', e => { e.stopPropagation(); doTogglePlay(); });
      document.getElementById('phAfPlayLgBtn')?.addEventListener('click', e => { e.stopPropagation(); doTogglePlay(); });
      document.getElementById('phAfNextSongBtn')?.addEventListener('click', e => { e.stopPropagation(); doNextSong(); });
      document.getElementById('phAfNextLgBtn')?.addEventListener('click', e => { e.stopPropagation(); doNextSong(); });
      document.getElementById('phAfPrevBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        window.__shinyMusicAction?.(api => api.prev?.());
      });
      document.getElementById('phAfFavBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        window.__shinyMusicAction?.(api => api.toggleFav?.());
      });
      document.getElementById('phAfModeBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        window.__shinyCycleMusicMode?.();
      });
      document.getElementById('phAfCollapseBtn')?.addEventListener('click', e => {
        e.stopPropagation();
        setIslandExpanded(false);
        resetIdleTimer();
      });
      const afSeek = document.getElementById('phAfSeek');
      afSeek?.addEventListener('pointerdown', () => { afSeeking = true; });
      afSeek?.addEventListener('input', () => { afSeeking = true; });
      afSeek?.addEventListener('change', () => {
        const pct = parseFloat(afSeek.value) / 100;
        afSeeking = false;
        window.__shinyMusicAction?.(api => api.seekPercent?.(pct));
      });
      const afVol = document.getElementById('phAfVol');
      afVol?.addEventListener('input', () => {
        const vv = Number(afVol.value);
        const volVal = document.getElementById('phAfVolVal');
        if (volVal) volVal.textContent = `${Math.round(vv)}%`;
        window.__shinySetMusicVolume?.(vv);
      });
      document.getElementById('phAfDimBtn')?.addEventListener('click', () => {
        dimLevel = (dimLevel + 1) % 3;
        ambientEl.classList.remove('dim-65', 'dim-35');
        const dimBtn = document.getElementById('phAfDimBtn');
        if (dimLevel === 1) {
          ambientEl.classList.add('dim-65');
          if (dimBtn) dimBtn.textContent = '🌙 调光: 65%';
        } else if (dimLevel === 2) {
          ambientEl.classList.add('dim-35');
          if (dimBtn) dimBtn.textContent = '🌙 调光: 35%';
        } else {
          if (dimBtn) dimBtn.textContent = '🌙 调光: 100%';
        }
      });
      document.getElementById('phAfFullscreenBtn')?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        const m = document.getElementById('phAfMoreMenu');
        const b = document.getElementById('phAfMoreBtn');
        if (m) m.hidden = true;
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      document.getElementById('phAfJumpStoryBtn')?.addEventListener('click', () => {
        if (currentArtPick?.storyKey) {
          closeAmbientFrame();
          navigateStory(currentArtPick.storyKey);
        }
      });
    }

    const cycleArt = () => {
      if (!artList.length) return;
      currentArtPick = artList[Math.floor(Math.random() * artList.length)];
      const bg = document.getElementById('phAfBg');
      const cap = document.getElementById('phAfCardName');
      const jumpBtn = document.getElementById('phAfJumpStoryBtn');
      if (bg) bg.style.backgroundImage = `url("${currentArtPick.url}")`;
      if (cap) cap.textContent = `✦ ${currentArtPick.name}`;
      if (jumpBtn) jumpBtn.hidden = !currentArtPick.storyKey;
    };

    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const cl = document.getElementById('phAfClock');
      const dt = document.getElementById('phAfDate');
      if (cl) cl.textContent = `${hh}:${mm}`;
      if (dt) dt.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
      if (ambientEl._syncIslandState) {
        ambientEl._syncIslandState(window.__shinyGetMusicState?.() || {});
      }
      try {
        const np = JSON.parse(localStorage.getItem('shiny.nowPlaying') || 'null');
        if (np && np.title && !window.__shinyGetMusicState?.()?.song) {
          document.getElementById('phAfSong').textContent = np.title;
          document.getElementById('phAfArtist').textContent = np.artist || '283 Production';
        }
      } catch {}
    };

    ambientEl.hidden = false;
    document.body.classList.add('is-ambient-open');
    document.getElementById('phAfVinylCard')?.classList.remove('is-expanded');
    document.getElementById('phAfVinylCard')?.setAttribute('aria-expanded', 'false');
    try { ambientEl.focus({ preventScroll: true }); } catch {}
    cycleArt();
    tick();
    clearInterval(ambientTimer);
    ambientTimer = setInterval(() => {
      tick();
      cycleArt();
    }, 14000);
  }

  function closeAmbientFrame() {
    clearTimeout(idleFadeTimer);
    clearInterval(ambientTimer);
    const vc = document.getElementById('phAfVinylCard');
    vc?.classList.remove('is-expanded');
    vc?.setAttribute('aria-expanded', 'false');
    const m = document.getElementById('phAfMoreMenu');
    const b = document.getElementById('phAfMoreBtn');
    if (m) m.hidden = true;
    if (b) b.setAttribute('aria-expanded', 'false');
    if (ambientEl) ambientEl.hidden = true;
    document.body.classList.remove('is-ambient-open');
    try { window.__shinyCloseMusicCapsule?.(); } catch {}
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setHomeFrameVisibility(true);
  }

  // ── Feature #7: Morning Communication (朝コミュ) Embedded Story Player ──
  let morningVoiceAudio = null;
  let morningMsgHandler = null;

  function stopMorningVoice() {
    if (morningVoiceAudio) {
      try {
        morningVoiceAudio.pause();
        morningVoiceAudio.currentTime = 0;
      } catch {}
      morningVoiceAudio = null;
    }
    document.querySelectorAll('.ph-voice-btn.is-playing').forEach(b => b.classList.remove('is-playing'));
  }

  const localMorningDate = () => new Date().toLocaleDateString('sv-SE');
  const morningLastDate = 'shiny.morningGreeting.lastDate';
  const morningDismissedDate = 'shiny.morningGreeting.dismissedDate';
  const morningReminderSuppressed = () => {
    const day = localMorningDate();
    return localStorage.getItem(morningLastDate) === day ||
      localStorage.getItem(morningDismissedDate) === day;
  };
  let morningRequest = null;
  function dismissMorningReminder() {
    localStorage.setItem(morningDismissedDate, localMorningDate());
    hideMorningToast();
  }

  function cleanupMorningPlayer() {
    morningRequest?.abort();
    morningRequest = null;
    if (morningMsgHandler) {
      window.removeEventListener('message', morningMsgHandler);
      morningMsgHandler = null;
    }
    const frame = document.getElementById('phMornFrame');
    if (frame) {
      try { frame.src = 'about:blank'; } catch {}
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function playMorningVoice(url, btnEl) {
    if (!url) return;
    stopMorningVoice();
    morningVoiceAudio = new Audio(url);
    if (btnEl) btnEl.classList.add('is-playing');
    morningVoiceAudio.onended = () => {
      if (btnEl) btnEl.classList.remove('is-playing');
      morningVoiceAudio = null;
    };
    morningVoiceAudio.onerror = () => {
      if (btnEl) btnEl.classList.remove('is-playing');
      morningVoiceAudio = null;
    };
    morningVoiceAudio.play().catch(() => {});
  }

  async function openMorningGreetingModal(preloadedData = null) {
    stopMorningVoice();
    hideMorningToast();
    openModal('283 MORNING COMMUNICATION', '☀️ 每日「晨间问候」朝コミュ · 剧情互动剧场', { widePlayer: true });
    const request = new AbortController();
    morningRequest = request;
    modalBodyEl.innerHTML = `
      <div style="text-align:center;padding:48px 20px;color:#94a3b8;">
        <div class="ph-spinner"></div>
        <div style="margin-top:14px;font-size:14px;color:#cbd5e1;font-weight:600;">正在连通 283 事务所走廊，加载今日晨间互动舞台…</div>
      </div>
    `;

    let data = preloadedData;
    if (!data) {
      try {
        const res = await fetch('/api/morning-greeting', { signal: request.signal });
        data = await res.json();
      } catch (err) {
        if (request.signal.aborted) return;
        modalBodyEl.innerHTML = `<div class="ph-empty">获取晨间问候失败，请检查网络或服务运行状态。</div>`;
        return;
      }
    }

    if (request.signal.aborted) return;
    if (!data || !data.ok || !data.key) {
      modalBodyEl.innerHTML = `<div class="ph-empty">${esc(data?.error || '未找到晨间剧本')}</div>`;
      return;
    }

    const todayStr = localMorningDate();
    const lastDate = localStorage.getItem(morningLastDate) || '';
    let streak = parseInt(localStorage.getItem('shiny.morningGreeting.streak') || '0', 10);
    let checkedToday = lastDate === todayStr;

    const savedLang = localStorage.getItem('shiny.lang') || 'zh';
    const savedVol = Math.min(100, Math.max(0, parseInt(localStorage.getItem('shiny.volume') || '40', 10) || 40));

    modalBodyEl.innerHTML = `
      <div class="ph-morning-player-shell" id="phMornCard">
        <div class="ph-morning-header ph-morning-header--compact">
          <div class="ph-morning-avatar" id="phMornAvatar"></div>
          <div class="ph-morning-meta">
            <h3>
              <span>${esc(data.idol)}</span>
              <span class="ph-morning-badge">${esc(data.title || '朝コミュ')}</span>
            </h3>
            <div style="display:flex;gap:8px;align-items:center;margin-top:4px;flex-wrap:wrap;">
              <span class="ph-morning-streak-badge" id="phMornStreakBadge">🔥 晨间连击 ${streak} 天${checkedToday ? ' (今日已打卡)' : ''}</span>
              <small style="color:#94a3b8;font-size:11px;">直接点击舞台推进对话与 3 选 1 互动</small>
            </div>
          </div>
          <div class="ph-morning-head-actions">
            <button type="button" class="ph-btn ghost" id="phMornFullscreen">⛶ 剧情全屏</button>
            <button type="button" class="ph-btn ghost" id="phMornNextIdolBtn">🔄 换一位偶像</button>
          </div>
        </div>

        <div class="ph-morning-stage" id="phMornStage">
          <iframe id="phMornFrame" title="晨间问候剧情播放器" allow="autoplay"></iframe>
        </div>

        <div class="ph-morning-toolbar">
          <button type="button" class="ph-btn" id="phMornAdvance">下一句 →</button>
          <button type="button" class="ph-btn ghost" id="phMornAuto">自动播放：关</button>
          <select class="ph-select" id="phMornLang" aria-label="字幕语言">
            <option value="zh"${savedLang === 'zh' ? ' selected' : ''}>中文</option>
            <option value="both"${savedLang === 'both' ? ' selected' : ''}>中日双语</option>
            <option value="jp"${savedLang === 'jp' ? ' selected' : ''}>日文</option>
          </select>
          <label class="ph-morning-vol">
            <span>音量</span>
            <input id="phMornVolume" type="range" min="0" max="100" value="${savedVol}">
          </label>
          <button type="button" class="ph-btn ghost" id="phMornRestart">从头播放</button>
          <button type="button" class="ph-btn ghost" id="phMornOpenGuide">剧情馆打开 ↗</button>
        </div>

        <p id="phMornStatus" class="ph-morning-status">正在载入晨间剧情舞台与语音…</p>

        <details class="ph-morning-transcript-box">
          <summary>对话记录与翻译信息</summary>
          <div id="phMornTranscript" class="ph-morning-transcript"></div>
        </details>
      </div>
    `;

    const avatarEl = document.getElementById('phMornAvatar');
    if (avatarEl && window.CharacterPortraits?.mount) {
      window.CharacterPortraits.mount(avatarEl, data.idol);
    }

    const frame = document.getElementById('phMornFrame');
    const stageEl = document.getElementById('phMornStage');
    const statusEl = document.getElementById('phMornStatus');
    const autoBtn = document.getElementById('phMornAuto');
    const langSel = document.getElementById('phMornLang');
    const volInput = document.getElementById('phMornVolume');
    const transcriptEl = document.getElementById('phMornTranscript');
    function markMorningCheckedIn() {
      const key = 'shiny.watchedStories';
      let watched;
      try { watched = new Set(JSON.parse(localStorage.getItem(key) || window.desktop?.getState?.()?.[key] || '[]')); }
      catch { watched = new Set(); }
      if (!watched.has(data.key)) {
        watched.add(data.key);
        const serialized = JSON.stringify([...watched]);
        localStorage.setItem(key, serialized);
        try { window.desktop?.saveState?.({ [key]: serialized }); } catch {}
      }
      const curToday = localMorningDate();
      const curLast = localStorage.getItem(morningLastDate);
      if (curLast !== curToday) {
        streak = (parseInt(localStorage.getItem('shiny.morningGreeting.streak'), 10) || 0) + 1;
        checkedToday = true;
        localStorage.setItem(morningLastDate, curToday);
        localStorage.setItem('shiny.morningGreeting.streak', String(streak));
        hideMorningToast();
        const streakBadge = document.getElementById('phMornStreakBadge');
        if (streakBadge) streakBadge.textContent = `🔥 晨间连击 ${streak} 天 (今日已打卡!)`;
        try {
          const mhBadge = document.getElementById('mhMorningBadge');
          if (mhBadge) {
            mhBadge.textContent = `已打卡 🔥 ${streak}天`;
            mhBadge.style.background = 'rgba(34, 197, 94, 0.25)';
            mhBadge.style.color = '#86efac';
          }
        } catch {}
      }
    }

    function sendToPlayer(type, value) {
      try {
        frame?.contentWindow?.postMessage({ type, value }, location.origin);
      } catch {}
    }

    function loadMorningStory() {
      if (transcriptEl) transcriptEl.replaceChildren();
      if (statusEl) statusEl.textContent = '正在载入晨间剧情舞台与语音…';
      if (autoBtn) autoBtn.textContent = '自动播放：关';
      const lang = langSel?.value || 'zh';
      frame.src = '/player/main.html?key=' + encodeURIComponent(data.key) + '&lang=' + encodeURIComponent(lang);
    }

    morningMsgHandler = (e) => {
      if (e.origin !== location.origin || !frame || e.source !== frame.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'ready') {
        sendToPlayer('settings', { overrides: {}, volume: Number(volInput?.value || 40) / 100 });
      } else if (d.type === 'status') {
        if (statusEl) statusEl.textContent = d.value || '';
        if (typeof d.value === 'string' && /^本篇剧情播放(?:完毕|结束)[。！!\s]*$/.test(d.value.trim())) {
          markMorningCheckedIn();
        }
      } else if (d.type === 'auto') {
        if (autoBtn) autoBtn.textContent = '自动播放：' + (d.value ? '开' : '关');
      } else if (d.type === 'lines' && Array.isArray(d.value) && transcriptEl) {
        transcriptEl.innerHTML = d.value.map(r => `
          <div class="ph-morn-line">
            <strong>${esc(r.speaker || '')}：</strong>
            <div>${esc(r.translation || ('【待翻译】' + (r.original || '')))}</div>
            ${r.original ? `<small>${esc(r.original)}</small>` : ''}
          </div>
        `).join('');
      } else if (d.type === 'close') {
        closeModal();
      }
    };
    window.addEventListener('message', morningMsgHandler);

    document.getElementById('phMornAdvance')?.addEventListener('click', () => sendToPlayer('next'));
    autoBtn?.addEventListener('click', () => sendToPlayer('auto'));
    langSel?.addEventListener('change', () => {
      localStorage.setItem('shiny.lang', langSel.value);
      sendToPlayer('lang', langSel.value);
    });
    volInput?.addEventListener('input', () => {
      localStorage.setItem('shiny.volume', volInput.value);
      sendToPlayer('volume', Number(volInput.value) / 100);
    });
    document.getElementById('phMornRestart')?.addEventListener('click', loadMorningStory);
    document.getElementById('phMornOpenGuide')?.addEventListener('click', () => {
      const k = data.key;
      closeModal();
      navigateStory(k);
    });
    document.getElementById('phMornNextIdolBtn')?.addEventListener('click', () => {
      openMorningGreetingModal();
    });
    document.getElementById('phMornFullscreen')?.addEventListener('click', () => {
      if (!stageEl) return;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        (stageEl.requestFullscreen || stageEl.webkitRequestFullscreen)?.call(stageEl)?.catch?.(() => {});
      }
    });

    loadMorningStory();
  }

  let morningToastEl = null;
  function hideMorningToast() {
    const toast = morningToastEl;
    if (!toast) return;
    morningToastEl = null;
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }

  function showMorningGreetingToast(data) {
    if (!data || !data.ok || morningRequest || morningReminderSuppressed()) return;
    if (document.getElementById('phMorningToast')) return;

    morningToastEl = document.createElement('div');
    morningToastEl.className = 'ph-morning-toast';
    morningToastEl.id = 'phMorningToast';
    morningToastEl.innerHTML = `
      <div class="ph-toast-avatar" id="phToastAvatar"></div>
      <div class="ph-toast-info">
        <span class="ph-toast-title">☀️ 晨间问候待查收</span>
        <span class="ph-toast-sub">来自 ${esc(data.idol)} 的早晨对话 · 点击交流</span>
      </div>
      <button type="button" class="ph-toast-close" title="今日不再提醒" aria-label="今日不再提醒">✕</button>
    `;
    document.body.appendChild(morningToastEl);

    if (window.CharacterPortraits?.mount) {
      window.CharacterPortraits.mount(document.getElementById('phToastAvatar'), data.idol);
    }

    setTimeout(() => {
      morningToastEl?.classList.add('show');
    }, 100);

    morningToastEl.addEventListener('click', e => {
      if (e.target.closest('.ph-toast-close')) {
        e.stopPropagation();
        dismissMorningReminder();
        return;
      }
      openMorningGreetingModal(data);
    });
  }

  async function checkMorningGreetingAuto() {
    if (morningRequest || morningReminderSuppressed()) return;

    const hour = new Date().getHours();
    if (hour < 5 || hour >= 12) return;

    try {
      const res = await fetch('/api/morning-greeting');
      const data = await res.json();
      if (data && data.ok) {
        setTimeout(() => {
          showMorningGreetingToast(data);
        }, 1200);
      }
    } catch {}
  }

  // Mount Consolidated "✦ 更多" Button in .shell-utils
  // ── Feature #8: Idol Deep-Dive Dossier (Word Cloud, Co-Star Heatmap, Highlight Wall) ──
  const dossierCache = new Map();
  async function openIdolDossier(initialIdol = '') {
    openModal('283 IDOL DOSSIER · 10,960 SCRIPTS ANALYTICS', '🌟 偶像个人高光档案 · 口头禅词云与搭档羁绊热力图');
    let curIdol = initialIdol;
    if (!curIdol) {
      try {
        const home = JSON.parse(localStorage.getItem('home') || '{}');
        curIdol = IDOL_BY_ID.get(String(home.idol || '1'))?.name || '樱木真乃';
      } catch {
        curIdol = '樱木真乃';
      }
    }
    let partnerTab = 'all'; // 'all' | 'cross'

    modalBodyEl.innerHTML = `
      <div class="ph-dossier-strip" id="phDossierStrip"></div>
      <div id="phDossierContent" style="display:flex;flex-direction:column;gap:14px;">
        <div style="padding:36px;text-align:center;color:#94a3b8;font-size:13px;">正在从 10,960 篇剧本离线统计个人档案…</div>
      </div>
    `;

    const stripEl = document.getElementById('phDossierStrip');
    const contentEl = document.getElementById('phDossierContent');
    stripEl?.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        stripEl.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    const renderStrip = () => {
      stripEl.innerHTML = '';
      for (const idol of IDOLS_28) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ph-dossier-chip' + (idol.name === curIdol ? ' active' : '');
        btn.style.setProperty('--idol-c', idol.color);
        const av = document.createElement('span');
        av.className = 'ph-dossier-chip-av';
        if (window.CharacterPortraits?.mount) window.CharacterPortraits.mount(av, idol.name);
        else av.textContent = idol.name.slice(0, 1);
        const lbl = document.createElement('span');
        lbl.textContent = idol.name;
        btn.append(av, lbl);
        btn.addEventListener('click', () => {
          if (curIdol === idol.name) return;
          curIdol = idol.name;
          renderStrip();
          loadIdol(curIdol);
        });
        stripEl.append(btn);
      }
      const activeBtn = stripEl.querySelector('.active');
      activeBtn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };

    const renderDossier = (data) => {
      if (!data || !data.ok) {
        contentEl.innerHTML = '<div style="padding:24px;color:#fca5a5;">暂无该偶像的档案数据。</div>';
        return;
      }
      const ov = data.overview;
      const color = ov.color || '#38bdf8';
      const list = partnerTab === 'cross' ? (data.crossUnitPartners || []) : (data.partners || []);
      const maxShared = Math.max(1, ...(list.map(p => p.sharedStories)));

      contentEl.innerHTML = `
        <section class="ph-dossier-hero" style="--idol-c:${esc(color)};">
          <div class="ph-dossier-avatar" id="phDossierHeroAv"></div>
          <div style="width:100%;min-width:0;">
            <div class="ph-dossier-name-row" id="phDossierNameRow">
              <h3>${esc(ov.idol)}</h3>
              <span class="ph-dossier-unit">${esc(ov.unit)}</span>
              <span style="font-size:11.5px;color:#94a3b8;">${(ov.categories || []).slice(0, 3).map(c => `${esc(c.name)} ${c.count}`).join(' · ')}</span>
            </div>
            <div class="ph-dossier-kpis">
              <div class="ph-dossier-kpi">
                <strong>${ov.totalStories.toLocaleString()} <small style="font-size:11px;color:#7dd3fc;">篇</small></strong>
                <span>总参演（主役 ${ov.starringStories}）</span>
              </div>
              <div class="ph-dossier-kpi">
                <strong>${ov.totalLines.toLocaleString()} <small style="font-size:11px;color:#7dd3fc;">句</small></strong>
                <span>累计台词（译 ${ov.translatedLines.toLocaleString()}）</span>
              </div>
              <div class="ph-dossier-kpi">
                <strong>${ov.avgLineLength} <small style="font-size:11px;color:#7dd3fc;">字/句</small></strong>
                <span>平均台词长度</span>
              </div>
              <div class="ph-dossier-kpi">
                <strong>${ov.choiceStories} <small style="font-size:11px;color:#34d399;">篇</small></strong>
                <span>含分支选项剧情</span>
              </div>
            </div>
          </div>
        </section>

        <section class="ph-dossier-sec" style="--idol-c:${esc(color)};">
          <div class="ph-dossier-sec-head">
            <h4>💬 专属口头禅与高频特征词云</h4>
            <small>按全员 TF-IDF 特征度排序 · 点击任意词直达全剧本检索</small>
          </div>
          <div class="ph-wordcloud" id="phDossierWordCloud">
            ${(data.wordCloud || []).map((w, idx) => {
              const tier = idx < 5 ? 'tier-1' : (idx < 14 ? 'tier-2' : 'tier-3');
              return `<button type="button" class="ph-wc-tag ${tier}" data-word="${esc(w.word)}" title="在 ${esc(ov.idol)} 的台词中出现 ${w.count} 次，点击查看出处"><span>${esc(w.word)}</span><small>${w.count}</small></button>`;
            }).join('')}
          </div>
        </section>

        <section class="ph-dossier-sec" style="--idol-c:${esc(color)};">
          <div class="ph-dossier-sec-head">
            <h4>🤝 同框搭档关系热力图</h4>
            <div style="display:flex;gap:6px;">
              <button type="button" class="ph-btn ghost ${partnerTab === 'all' ? 'active' : ''}" id="phPartnerAll" style="height:26px;padding:0 10px;font-size:11.5px;">全部搭档</button>
              <button type="button" class="ph-btn ghost ${partnerTab === 'cross' ? 'active' : ''}" id="phPartnerCross" style="height:26px;padding:0 10px;font-size:11.5px;">✨ 跨组合羁绊</button>
            </div>
          </div>
          <div class="ph-partner-list" id="phPartnerList"></div>
        </section>

        <section class="ph-dossier-sec" style="--idol-c:${esc(color)};">
          <div class="ph-dossier-sec-head">
            <h4>✨ 私藏高光名台词墙</h4>
            <small>从个人与活动剧本中自动精选 · 点击直达原剧名场面</small>
          </div>
          <div class="ph-quotes-grid">
            ${(data.highlights || []).map(q => `
              <article class="ph-quote-card">
                <div class="ph-quote-zh">「${esc(q.trans)}」</div>
                ${q.text && q.text !== q.trans ? `<div class="ph-quote-jp">${esc(q.text)}</div>` : ''}
                <div class="ph-quote-foot">
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📖 ${esc(q.title)}</span>
                  <button type="button" class="ph-btn ghost" data-jump-key="${esc(q.key)}" data-jump-line="${q.lineIndex}" style="height:22px;padding:0 8px;font-size:10.5px;flex-shrink:0;">🎬 观看 ↗</button>
                </div>
              </article>
            `).join('')}
          </div>
        </section>
      `;

      const heroAv = document.getElementById('phDossierHeroAv');
      if (heroAv && window.CharacterPortraits?.mount) {
        window.CharacterPortraits.mount(heroAv, ov.idol);
      }

      const idolEntry = allIdols.find(x => x.name === ov.idol);
      const nameRow = document.getElementById('phDossierNameRow');
      if (idolEntry && nameRow) {
        fetch('/data/official-extras.json').then(r => (r.ok ? r.json() : null)).then(ex => {
          const sp = ex?.signatures?.[String(idolEntry.id)];
          if (sp && nameRow.isConnected && !nameRow.querySelector('.ph-dossier-sign')) {
            const img = document.createElement('img');
            img.className = 'ph-dossier-sign';
            img.alt = `${ov.idol} 官方亲笔签名`;
            img.src = '/asset-original/' + sp;
            img.onerror = () => img.remove();
            nameRow.append(img);
          }
        }).catch(() => {});
      }

      contentEl.querySelectorAll('[data-word]').forEach(btn => {
        btn.addEventListener('click', () => {
          openDialogueSearch(btn.dataset.word, ov.idol);
        });
      });

      contentEl.querySelectorAll('[data-jump-key]').forEach(btn => {
        btn.addEventListener('click', () => {
          navigateStory(btn.dataset.jumpKey, Number(btn.dataset.jumpLine) || -1);
        });
      });

      document.getElementById('phPartnerAll')?.addEventListener('click', () => {
        partnerTab = 'all';
        renderDossier(data);
      });
      document.getElementById('phPartnerCross')?.addEventListener('click', () => {
        partnerTab = 'cross';
        renderDossier(data);
      });

      const pListEl = document.getElementById('phPartnerList');
      if (pListEl) {
        for (const p of list) {
          const row = document.createElement('div');
          row.className = 'ph-partner-row';
          const pct = Math.max(8, Math.round((p.sharedStories / maxShared) * 100));
          row.innerHTML = `
            <div class="ph-partner-main" title="点击展开同框代表剧情">
              <span class="ph-partner-av"></span>
              <div class="ph-partner-name">
                <span>${esc(p.idol)}</span>
                ${!p.sameUnit ? '<span class="ph-partner-badge">✨ 跨组合</span>' : `<span style="font-size:10px;color:#94a3b8;font-weight:500;">同组合</span>`}
              </div>
              <div class="ph-partner-bar-wrap">
                <div class="ph-partner-bar-fill" style="width:${pct}%;--p-c:${esc(p.color || '#38bdf8')};"></div>
              </div>
              <span class="ph-partner-cnt">${p.sharedStories} 篇 ▾</span>
            </div>
            <div class="ph-partner-samples" hidden>
              ${(p.samples || []).map(s => `<button type="button" class="ph-sample-story" data-skey="${esc(s.key)}">🎬 ${esc(s.title)}</button>`).join('')}
            </div>
          `;
          const avEl = row.querySelector('.ph-partner-av');
          if (avEl && window.CharacterPortraits?.mount) window.CharacterPortraits.mount(avEl, p.idol);
          const mainRow = row.querySelector('.ph-partner-main');
          const samplesBox = row.querySelector('.ph-partner-samples');
          mainRow.addEventListener('click', () => {
            samplesBox.hidden = !samplesBox.hidden;
          });
          row.querySelectorAll('[data-skey]').forEach(sb => {
            sb.addEventListener('click', (e) => {
              e.stopPropagation();
              navigateStory(sb.dataset.skey);
            });
          });
          pListEl.append(row);
        }
      }
    };

    const loadIdol = async (name) => {
      if (dossierCache.has(name)) {
        renderDossier(dossierCache.get(name));
        return;
      }
      contentEl.innerHTML = `<div style="padding:36px;text-align:center;color:#94a3b8;font-size:13px;">正在离线分析 ${esc(name)} 的全部剧本档案…（首次计算需数秒，随后切换秒开）</div>`;
      try {
        const r = await fetch('/api/idol-dossier?idol=' + encodeURIComponent(name));
        const data = await r.json();
        if (data?.ok) dossierCache.set(name, data);
        renderDossier(data);
      } catch (e) {
        contentEl.innerHTML = `<div style="padding:24px;color:#fca5a5;">档案载入失败：${esc(e.message)}</div>`;
      }
    };

    renderStrip();
    loadIdol(curIdol);
  }

  function openPack4kModal() {
    openModal('283 4K ULTRA HD ASSET PACK', '💎 4K 超清画质包 · 一键加载与画质切换');
    modalBodyEl.innerHTML = `
      <div class="ph-morning-card" id="phPack4kBox" style="gap:14px;">
        <div style="font-size:15px;font-weight:800;color:#fde047;" data-p4k-status>正在检测 4K 画质包状态…</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          <button type="button" class="ph-btn" data-p4k-archive>📦 一键加载 4K 包（.zip / .7z）</button>
          <button type="button" class="ph-btn ghost" data-p4k-folder>📁 直接挂载 cache-4k 文件夹</button>
          <button type="button" class="ph-btn ghost" data-p4k-toggle hidden aria-pressed="true">🖼️ 切换为原图</button>
        </div>
        <p style="margin:0;font-size:12.5px;line-height:1.65;color:#cbd5e1;" data-p4k-hint>
          加载后默认使用 4K 超清静态卡面与 2x Spine 动态模型，可随时一键切换原图并自动刷新画面。
        </p>
      </div>
    `;
    const box = document.getElementById('phPack4kBox');
    if (box && window.Pack4kUI?.bindContainer) {
      window.Pack4kUI.bindContainer(box);
    }
  }

  async function openComicsGallery() {
    openModal('283 PRODUCTION · OFFICIAL 4-KOMA ARCHIVE', '📖 官方四格漫画馆');
    modalBodyEl.innerHTML = `<div class="ph-empty">正在加载官方四格漫画索引…</div>`;
    let extras;
    try {
      const r = await fetch('/data/official-extras.json');
      extras = await r.json();
    } catch {
      modalBodyEl.innerHTML = `<div class="ph-empty">四格漫画索引加载失败，请稍后重试。</div>`;
      return;
    }
    const allComics = Array.isArray(extras?.comics) ? extras.comics : [];
    if (modalTitleEl && allComics.length) {
      modalTitleEl.textContent = `📖 官方四格漫画馆（${allComics.length} 篇）`;
    }
    if (!allComics.length) {
      modalBodyEl.innerHTML = `<div class="ph-empty">暂未收录四格漫画数据。</div>`;
      return;
    }
    const FAV_KEY = 'shiny.favoriteComics';
    let favSet = new Set();
    try { favSet = new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch {}
    const saveFavs = () => {
      try { localStorage.setItem(FAV_KEY, JSON.stringify([...favSet])); } catch {}
    };

    let groupFilter = 'all';
    let searchQ = '';
    let filtered = allComics;
    let activeComic = allComics[Math.floor(Math.random() * allComics.length)];
    let page = 0;
    const perPage = 24;

    modalBodyEl.innerHTML = `
      <div class="ph-bar" style="flex-wrap:wrap;gap:8px;margin-bottom:12px;">
        <select class="ph-select" id="phComicGroup" style="max-width:160px;">
          <option value="all">全部 (${allComics.length})</option>
          <option value="web">WEB 连载 (${allComics.filter(c => c.group === 'web').length})</option>
          <option value="limited">限定四格 (${allComics.filter(c => c.group === 'limited').length})</option>
          <option value="special">特别四格 (${allComics.filter(c => c.group === 'special').length})</option>
          <option value="fav">★ 我的收藏</option>
        </select>
        <input type="search" class="ph-input" id="phComicSearch" placeholder="按编号筛选…" style="max-width:160px;">
        <button type="button" class="ph-btn" id="phComicRandomBtn">🎲 随机抽一篇</button>
      </div>
      <div class="ph-comics-layout">
        <div class="ph-comics-viewer" id="phComicViewer">
          <div class="ph-comics-viewer-head">
            <strong id="phComicTitle">—</strong>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" class="ph-btn ghost" id="phComicZoomBtn" style="height:28px;padding:0 10px;font-size:12px;">🔍 放大阅读</button>
              <button type="button" class="ph-btn ghost" id="phComicFavBtn" style="height:28px;padding:0 10px;font-size:12px;">♡ 收藏</button>
              <button type="button" class="ph-btn ghost" id="phComicPrevBtn" style="height:28px;padding:0 10px;font-size:12px;">← 上一篇</button>
              <button type="button" class="ph-btn ghost" id="phComicNextBtn" style="height:28px;padding:0 10px;font-size:12px;">下一篇 →</button>
            </div>
          </div>
          <div class="ph-comics-stage" id="phComicStage">
            <img id="phComicFullImg" alt="官方四格漫画">
          </div>
        </div>
        <div class="ph-comics-list-wrap">
          <div class="ph-comics-grid" id="phComicGrid"></div>
          <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-top:10px;">
            <button type="button" class="ph-btn ghost" id="phComicPgPrev" style="height:28px;padding:0 12px;">上一页</button>
            <span id="phComicPgInfo" style="font-size:12px;color:#cbd5e1;">1 / 1</span>
            <button type="button" class="ph-btn ghost" id="phComicPgNext" style="height:28px;padding:0 12px;">下一页</button>
          </div>
        </div>
      </div>
    `;

    const groupEl = document.getElementById('phComicGroup');
    const searchEl = document.getElementById('phComicSearch');
    const gridEl = document.getElementById('phComicGrid');
    const titleEl = document.getElementById('phComicTitle');
    const fullImg = document.getElementById('phComicFullImg');
    const favBtn = document.getElementById('phComicFavBtn');
    const zoomBtn = document.getElementById('phComicZoomBtn');
    const stageEl = document.getElementById('phComicStage');
    const pgInfo = document.getElementById('phComicPgInfo');
    const pgPrev = document.getElementById('phComicPgPrev');
    const pgNext = document.getElementById('phComicPgNext');

    const toggleComicZoom = () => {
      if (!stageEl) return;
      const isZoomed = stageEl.classList.toggle('is-zoomed');
      if (zoomBtn) zoomBtn.textContent = isZoomed ? '🔎 整页适配' : '🔍 放大阅读';
    };
    zoomBtn?.addEventListener('click', toggleComicZoom);
    stageEl?.addEventListener('click', toggleComicZoom);

    const comicKey = (c) => `${c.group}:${c.id}`;
    const showComic = (c) => {
      if (!c) return;
      activeComic = c;
      const gName = c.group === 'limited' ? '限定四格' : c.group === 'special' ? '特别四格' : 'WEB 连载四格';
      if (titleEl) titleEl.textContent = `${gName} #${c.id}`;
      if (fullImg) fullImg.src = '/asset-original/' + c.page;
      if (favBtn) {
        const isF = favSet.has(comicKey(c));
        favBtn.textContent = isF ? '♥ 已收藏' : '♡ 收藏';
        favBtn.style.color = isF ? '#fb7185' : '';
      }
      gridEl?.querySelectorAll('.ph-comic-thumb').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.ckey === comicKey(c));
      });
    };

    const renderGrid = () => {
      if (!gridEl) return;
      const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
      page = Math.max(0, Math.min(page, totalPages - 1));
      const slice = filtered.slice(page * perPage, (page + 1) * perPage);
      gridEl.replaceChildren();
      if (!slice.length) {
        gridEl.innerHTML = `<div class="ph-empty" style="grid-column:1/-1;">没有符合条件的四格漫画</div>`;
      } else {
        for (const c of slice) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ph-comic-thumb' + (activeComic && comicKey(activeComic) === comicKey(c) ? ' active' : '');
          btn.dataset.ckey = comicKey(c);
          btn.innerHTML = `<img src="/asset-original/${esc(c.icon)}" loading="lazy" alt="#${esc(c.id)}"><span>#${esc(c.id)}</span>`;
          btn.onclick = () => showComic(c);
          gridEl.appendChild(btn);
        }
      }
      if (pgInfo) pgInfo.textContent = `${page + 1} / ${totalPages}（共 ${filtered.length} 篇）`;
      if (pgPrev) pgPrev.disabled = page === 0;
      if (pgNext) pgNext.disabled = page + 1 >= totalPages;
    };

    const applyFilter = () => {
      filtered = allComics.filter(c => {
        if (groupFilter === 'fav' && !favSet.has(comicKey(c))) return false;
        if (groupFilter !== 'all' && groupFilter !== 'fav' && c.group !== groupFilter) return false;
        if (searchQ && !c.id.toLowerCase().includes(searchQ)) return false;
        return true;
      });
      page = 0;
      renderGrid();
    };

    groupEl?.addEventListener('change', () => { groupFilter = groupEl.value; applyFilter(); });
    searchEl?.addEventListener('input', () => { searchQ = searchEl.value.trim().toLowerCase(); applyFilter(); });
    pgPrev?.addEventListener('click', () => { page--; renderGrid(); });
    pgNext?.addEventListener('click', () => { page++; renderGrid(); });
    document.getElementById('phComicRandomBtn')?.addEventListener('click', () => {
      const pool = filtered.length ? filtered : allComics;
      showComic(pool[Math.floor(Math.random() * pool.length)]);
    });
    favBtn?.addEventListener('click', () => {
      if (!activeComic) return;
      const k = comicKey(activeComic);
      if (favSet.has(k)) favSet.delete(k);
      else favSet.add(k);
      saveFavs();
      showComic(activeComic);
      if (groupFilter === 'fav') applyFilter();
    });
    const stepComic = (delta) => {
      const pool = filtered.length ? filtered : allComics;
      const idx = pool.findIndex(c => comicKey(c) === comicKey(activeComic));
      const next = pool[(idx + delta + pool.length) % pool.length];
      showComic(next);
    };
    document.getElementById('phComicPrevBtn')?.addEventListener('click', () => stepComic(-1));
    document.getElementById('phComicNextBtn')?.addEventListener('click', () => stepComic(1));

    showComic(activeComic);
    applyFilter();
  }

  function mountMoreHub() {
    const utils = document.querySelector('.shell-utils');
    if (!utils || document.getElementById('btnMoreHub')) return;

    const isDoneToday = localStorage.getItem(morningLastDate) === localMorningDate();
    const streak = parseInt(localStorage.getItem('shiny.morningGreeting.streak') || '0', 10);

    const anchor = document.createElement('div');
    anchor.className = 'more-hub-anchor';
    anchor.innerHTML = `
      <button class="util-btn" id="btnMoreHub" type="button" data-tip="283 百宝箱 · 更多功能" aria-label="展开更多功能菜单" aria-expanded="false">
        <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
      </button>
      <div class="more-hub-popover" id="moreHubPopover" hidden>
        <div class="mh-head">283 PRODUCTION · 全局工具</div>
        <div class="mh-quick-grid">
          <button type="button" class="mh-quick-btn" data-act="morning" title="每日晨间问候 朝コミュ"><span>☀️</span><b>晨间问候</b>${isDoneToday ? '' : '<i class="mh-quick-dot" aria-hidden="true"></i>'}</button>
          <button type="button" class="mh-quick-btn" data-act="fortune" title="晨间电视占卜 &amp; 沧海遗珠盲盒"><span>🎲</span><b>占卜盲盒</b></button>
          <button type="button" class="mh-quick-btn" data-act="resume" title="制作人 283 履历书与成就印章册"><span>📊</span><b>制作人履历</b></button>
        </div>
        <button type="button" class="mh-item" data-act="companion" id="mhCompanionItem">
          <span class="mh-ico">🐾</span>
          <span class="mh-txt"><strong>桌面小人伙伴（透明桌宠）</strong><small>283 两头身小人常驻桌面、随歌起舞、AI 对话与记事本</small></span>
          <span class="mh-badge">桌面</span>
        </button>
        <button type="button" class="mh-item" data-act="ministage">
          <span class="mh-ico">🎭</span>
          <span class="mh-txt"><strong>283 迷你排练室 &amp; 5人 LIVE 小剧场</strong><small>官方两头身 5 人编队、培育排练与 LIVE 应援</small></span>
          <span class="mh-badge" style="background:rgba(244,114,182,0.24);color:#fbcfe8;border-color:rgba(244,114,182,0.45);">小人</span>
        </button>
        <button type="button" class="mh-item" data-act="pack4k">
          <span class="mh-ico">💎</span>
          <span class="mh-txt"><strong>4K 超清画质包（一键加载 / 切换原图）</strong><small id="mhPack4kSub">静态 4K 卡面 + Spine 动态模型一键挂载与切换</small></span>
        </button>
        <button type="button" class="mh-item" data-act="stagefx">
          <span class="mh-ico">✨</span>
          <span class="mh-txt"><strong>切换舞台灯光秀强度</strong><small id="mhStageFxSub">当前：全力拉满（点击切换柔光）</small></span>
        </button>
      </div>
    `;
    utils.prepend(anchor);

    const btn = document.getElementById('btnMoreHub');
    const pop = document.getElementById('moreHubPopover');
    if (document.documentElement.dataset.mobile === '1') {
      const cmpItem = document.getElementById('mhCompanionItem');
      if (cmpItem) cmpItem.hidden = true;
    }

    const closePop = () => {
      pop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      const bd = document.getElementById('shellPopBackdrop');
      if (bd) {
        const islandOpen = document.getElementById('islandPopover')?.classList.contains('is-open');
        const envOpen = !document.getElementById('envPopover')?.hidden;
        bd.hidden = !(islandOpen || envOpen);
      }
    };

    const openPop = () => {
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      const bd = document.getElementById('shellPopBackdrop');
      if (bd) bd.hidden = false;
      const fxSub = document.getElementById('mhStageFxSub');
      if (fxSub) {
        const isSoft = document.documentElement.dataset.stageFx === 'soft';
        fxSub.textContent = isSoft ? '当前：柔光省电（点击切换全力拉满）' : '当前：全力拉满（点击切换柔光）';
      }
    };

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const willOpen = pop.hidden;
      if (willOpen) openPop();
      else closePop();
    });

    document.addEventListener('pointerdown', e => {
      if (!pop.hidden && !anchor.contains(e.target)) closePop();
    });

    document.addEventListener('click', e => {
      if (!pop.hidden && !anchor.contains(e.target)) closePop();
    });

    document.getElementById('shellPopBackdrop')?.addEventListener('pointerdown', () => {
      if (!pop.hidden) closePop();
    });

    window.addEventListener('blur', () => {
      if (!pop.hidden) closePop();
    });

    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !pop.hidden) {
        e.stopPropagation();
        closePop();
      }
    });

    pop.querySelectorAll('.mh-item, .mh-quick-btn').forEach((item, idx) => {
      item.style.setProperty('--mh-i', String(idx));
      item.addEventListener('click', () => {
        const act = item.dataset.act;
        closePop();
        if (act === 'morning') openMorningGreetingModal();
        else if (act === 'dossier') openIdolDossier();
        else if (act === 'search') openDialogueSearch();
        else if (act === 'fortune') openDailyFortune();
        else if (act === 'chain') openChainAnd1v1('chain');
        else if (act === 'matrix') openAddressMatrix();
        else if (act === 'resume') openProducerResume();
        else if (act === 'ambient') openAmbientFrame();
        else if (act === 'companion') document.getElementById('btnCompanion')?.click();
        else if (act === 'pack4k') openPack4kModal();
        else if (act === 'comics') openComicsGallery();
        else if (act === 'ministage') {
          if (window.__shinyShell?.navigate) window.__shinyShell.navigate('mini-stage.html');
          else location.href = 'mini-stage.html';
        }
        else if (act === 'stagefx') document.getElementById('btnStageFx')?.click();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mountMoreHub();
      checkMorningGreetingAuto();
    });
  } else {
    mountMoreHub();
    checkMorningGreetingAuto();
  }

  window.PrismHub = {
    openSearch: openDialogueSearch,
    openDossier: openIdolDossier,
    openChain: openChainAnd1v1,
    openMatrix: openAddressMatrix,
    openResume: openProducerResume,
    openFortune: openDailyFortune,
    openAmbientFrame,
    openMorning: openMorningGreetingModal,
    openComics: openComicsGallery
  };
})();
