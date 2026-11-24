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
    const url = `guide.html?story=${encodeURIComponent(storyKey)}${lineIndex >= 0 ? '&line=' + lineIndex : ''}`;
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
    window.addEventListener('keydown', e => {
      if (ambientEl && !ambientEl.hidden) {
        if (e.key === 'Escape') {
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
    });
  }

  function openModal(sub, title) {
    ensureModalHost();
    modalSubEl.textContent = sub;
    modalTitleEl.textContent = title;
    modalBodyEl.innerHTML = '';
    backdropEl.hidden = false;
  }

  function closeModal() {
    if (backdropEl) backdropEl.hidden = true;
  }

  // ── Feature #1: Full-Script Dialogue Search Engine ──
  function openDialogueSearch(initialQuery = '') {
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
    `;

    const inputEl = document.getElementById('phDlgQuery');
    const spkEl = document.getElementById('phDlgSpeaker');
    const metaEl = document.getElementById('phDlgMeta');
    const resEl = document.getElementById('phDlgResults');

    const runSearch = async () => {
      const q = inputEl.value.trim();
      const spk = spkEl.value.trim();
      if (!q && !spk) return;
      metaEl.textContent = '正在检索全剧本台词库…';
      resEl.innerHTML = '';
      try {
        const r = await fetch(`/api/dialogue-search?q=${encodeURIComponent(q)}&speaker=${encodeURIComponent(spk)}&limit=60`);
        const data = await r.json();
        metaEl.textContent = `共找到 ${(data.total || 0).toLocaleString()} 处台词匹配（耗时 ${data.tookMs} ms），展示前 ${data.hits.length} 条（点击直接打开该篇剧情并定位台词）：`;
        (data.hits || []).forEach((h, idx) => {
          const card = document.createElement('div');
          card.className = 'ph-hit-card';
          card.style.setProperty('--card-i', String(Math.min(idx, 18)));
          card.innerHTML = `
            <div class="ph-hit-meta">
              <span>🗣 ${esc(h.speaker)} · 第 ${h.lineIndex + 1} 句</span>
              <span>📖 ${esc(h.idol)} · ${esc(h.group)} · ${esc(h.title)} ↗</span>
            </div>
            <div class="ph-hit-line">${esc(h.trans || h.text)}</div>
            ${h.trans && h.text ? `<div class="ph-hit-jp">${esc(h.text)}</div>` : ''}
            ${(h.prev || h.next) ? `<div class="ph-hit-ctx">${h.prev ? `前句 [${esc(h.prev.speaker || '…')}]: ${esc(h.prev.text)}<br>` : ''}${h.next ? `后句 [${esc(h.next.speaker || '…')}]: ${esc(h.next.text)}` : ''}</div>` : ''}
          `;
          card.addEventListener('click', () => navigateStory(h.key, h.lineIndex));
          resEl.append(card);
        });
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
    inputEl?.focus();
    if (initialQuery) runSearch();
  }

  // ── Feature #2 & #24: 283 Smartphone Chain Chatroom & 1v1 Morning/Promise Aggregator ──
  function openChainAnd1v1(initialMode = 'chain', initialIdol = '') {
    openModal('283 SMARTPHONE · CHAIN & 1V1 INTERACTIONS', '📱 283 手机「Chain 聊天室」与「1v1 晨间/约定互动合集」');
    modalBodyEl.innerHTML = `
      <div class="ph-bar">
        <button type="button" class="ph-btn ghost ${initialMode === 'chain' ? 'active' : ''}" id="phTabChain">📱 283 Chain 群聊与来电归档</button>
        <button type="button" class="ph-btn ghost ${initialMode === '1v1' ? 'active' : ''}" id="phTab1v1">☀️ 育成 1v1 晨间问候 & 试镜约定合集</button>
        <select class="ph-select" id="phChainIdol" style="margin-left:auto;">
          <option value="">全部 283 偶像</option>
          ${IDOLS_28.map(i => `<option value="${esc(i.name)}" ${initialIdol === i.name ? 'selected' : ''}>${esc(i.name)} (${esc(i.unit)})</option>`).join('')}
        </select>
      </div>
      <div class="ph-chain-layout">
        <div class="ph-thread-list" id="phThreadList"></div>
        <div class="ph-chat-screen" id="phChatScreen"></div>
      </div>
    `;

    let curMode = initialMode;
    const idolSel = document.getElementById('phChainIdol');
    const listEl = document.getElementById('phThreadList');
    const screenEl = document.getElementById('phChatScreen');
    const tabChain = document.getElementById('phTabChain');
    const tab1v1 = document.getElementById('phTab1v1');

    const renderThread = (item) => {
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
        } else if (window.CharacterPortraits?.mount) {
          window.CharacterPortraits.mount(av, spk);
        } else {
          av.textContent = String(spk).slice(0, 1);
          av.style.cssText = 'display:grid;place-items:center;font-weight:800;font-size:13px;color:#f8fafc;';
        }
        const b = document.createElement('div');
        b.className = 'ph-bubble' + (isP ? ' is-producer' : '');
        b.innerHTML = `
          <div class="ph-bubble-spk">
            <span>${esc(spk)}</span>
            ${l.voice ? `<button type="button" class="ph-btn ghost" data-voice="${esc(l.voice)}" style="height:20px;padding:0 6px;font-size:10px;">🔊 原声</button>` : ''}
          </div>
          <div class="ph-bubble-zh">${esc(l.trans || l.text)}</div>
          ${l.trans && l.text ? `<div class="ph-bubble-jp">${esc(l.text)}</div>` : ''}
        `;
        b.querySelector('[data-voice]')?.addEventListener('click', e => {
          e.stopPropagation();
          new Audio(e.currentTarget.dataset.voice).play().catch(() => {});
        });
        row.append(av, b);
        screenEl.append(row);
      }
    };

    const loadData = async () => {
      listEl.innerHTML = '<div style="padding:12px;color:#94a3b8;font-size:12px;">正在载入对话记录…</div>';
      screenEl.innerHTML = '';
      const idol = idolSel.value;
      const r = await fetch(`/api/idol-interactions?mode=${curMode}&idol=${encodeURIComponent(idol)}`);
      const data = await r.json();
      const items = curMode === '1v1' ? (data.episodes || []) : (data.threads || []);
      listEl.innerHTML = '';
      if (!items.length) {
        listEl.innerHTML = '<div style="padding:12px;color:#94a3b8;font-size:12px;">暂无匹配记录，可切换其他偶像查看。</div>';
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
      loadData();
    });
    tab1v1?.addEventListener('click', () => {
      curMode = '1v1';
      tab1v1.classList.add('active');
      tabChain.classList.remove('active');
      loadData();
    });
    idolSel?.addEventListener('change', loadData);
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
        <span style="color:#94a3b8;">⇄</span>
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
        evEl.innerHTML = '<div style="font-size:11.5px;color:#64748b;">当前两人在剧本抽样库中暂无直接点名记录，可使用「全剧本台词秒搜」进一步检索。</div>';
      } else {
        for (const ev of evHits.slice(0, 12)) {
          const spkName = IDOL_BY_ID.get(String(ev.speaker))?.name || ev.speaker;
          const row = document.createElement('div');
          row.className = 'ph-hit-card';
          row.innerHTML = `
            <div class="ph-hit-meta"><span>🗣 ${esc(spkName)} 称呼「${esc(ev.form)}」</span><span>📖 ${esc(ev.storyTitle)} ↗</span></div>
            <div class="ph-hit-line">${esc(ev.text)}</div>
          `;
          row.onclick = () => navigateStory(ev.key, ev.line || 0);
          evEl.append(row);
        }
      }
    };

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
      return `
        <div class="ph-unit-bar-card">
          <div class="ph-unit-bar-head">
            <span style="color:${u.color};">✦ ${esc(u.name)}</span>
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
  async function openAmbientFrame() {
    closeModal();
    const { cardArt } = await ensureCatalog();
    const artList = Object.values(cardArt)
      .filter(a => a && a.type === 'idols' && a.id)
      .map(a => ({ url: `/asset/images/content/${a.type}/card/${a.id}.jpg`, name: a.name || '283 Production' }));

    if (!ambientEl) {
      ambientEl = document.createElement('div');
      ambientEl.className = 'ph-ambient-frame';
      ambientEl.hidden = true;
      ambientEl.innerHTML = `
        <div class="ph-af-art-bg" id="phAfBg"></div>
        <div class="ph-af-shade"></div>
        <header class="ph-af-top">
          <div>
            <div class="ph-af-clock" id="phAfClock">00:00</div>
            <div class="ph-af-date" id="phAfDate">283 PRODUCTION · AMBIENT ART FRAME</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button type="button" class="ph-btn ghost" id="phAfNextArtBtn">🖼 切换画作</button>
            <button type="button" class="ph-btn ghost" id="phAfExitBtn">退出画框 (ESC) ×</button>
          </div>
        </header>
        <footer class="ph-af-bottom">
          <div class="ph-af-vinyl-card" id="phAfVinylCard">
            <img class="ph-af-disc" id="phAfDisc" src="/app-icon.png" alt="">
            <div style="min-width:0;">
              <small style="color:#7dd3fc;font-weight:700;font-size:10.5px;">NOW SPINNING · 283 JUKEBOX</small>
              <strong id="phAfSong" style="display:block;font-size:15px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Spread the Wings!!</strong>
              <span id="phAfArtist" style="display:block;font-size:12px;color:#cbd5e1;">283 Production</span>
            </div>
            <button type="button" class="ph-af-ctrl-btn play-btn" id="phAfPlayBtn" aria-label="播放或暂停" data-tip="播放 / 暂停" title="播放 / 暂停 (Space)">
              <svg class="ic-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>
              <svg class="ic-pause" viewBox="0 0 24 24"><rect x="6.5" y="5" width="3.8" height="14" rx="1.4"/><rect x="13.7" y="5" width="3.8" height="14" rx="1.4"/></svg>
            </button>
            <button type="button" class="ph-af-ctrl-btn" id="phAfNextSongBtn" aria-label="下一首歌曲" data-tip="下一首歌曲" title="下一首歌曲">
              <svg viewBox="0 0 24 24"><path d="M16 6.5h2.2v11H16zM5.8 6.5l8.4 5.5-8.4 5.5z"/></svg>
            </button>
          </div>
          <div id="phAfCardName" style="font-size:12.5px;color:rgba(226,232,240,0.8);font-weight:600;"></div>
        </footer>
      `;
      document.body.appendChild(ambientEl);
      document.getElementById('phAfExitBtn')?.addEventListener('click', closeAmbientFrame);
      document.getElementById('phAfNextArtBtn')?.addEventListener('click', () => cycleArt());
      document.getElementById('phAfPlayBtn')?.addEventListener('click', () => {
        document.getElementById('islandMiniPlay')?.click();
        setTimeout(tick, 60);
      });
      document.getElementById('phAfNextSongBtn')?.addEventListener('click', () => {
        document.getElementById('islandMiniNext')?.click();
        setTimeout(tick, 100);
      });
    }

    const cycleArt = () => {
      if (!artList.length) return;
      const pick = artList[Math.floor(Math.random() * artList.length)];
      const bg = document.getElementById('phAfBg');
      const cap = document.getElementById('phAfCardName');
      if (bg) bg.style.backgroundImage = `url("${pick.url}")`;
      if (cap) cap.textContent = `✦ ${pick.name}`;
    };

    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const cl = document.getElementById('phAfClock');
      const dt = document.getElementById('phAfDate');
      if (cl) cl.textContent = `${hh}:${mm}`;
      if (dt) dt.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · 283 待机黑胶艺术画框`;
      try {
        const isPlaying = document.getElementById('dynamicIsland')?.classList.contains('is-playing') ||
                          localStorage.getItem('shiny.musicPlaying') === '1';
        const vinylCard = document.getElementById('phAfVinylCard');
        if (vinylCard) {
          vinylCard.classList.toggle('is-paused', !isPlaying);
        }
        const playBtn = document.getElementById('phAfPlayBtn');
        if (playBtn) {
          playBtn.setAttribute('title', isPlaying ? '暂停 (Space)' : '播放 (Space)');
          playBtn.setAttribute('data-tip', isPlaying ? '暂停' : '播放');
        }
        const np = JSON.parse(localStorage.getItem('shiny.nowPlaying') || 'null');
        if (np && np.title) {
          document.getElementById('phAfSong').textContent = np.title;
          document.getElementById('phAfArtist').textContent = np.artist || '283 Production';
        }
        const coverSrc = document.getElementById('islandCover')?.getAttribute('src');
        if (coverSrc) document.getElementById('phAfDisc').src = coverSrc;
      } catch {}
    };

    ambientEl.hidden = false;
    cycleArt();
    tick();
    clearInterval(ambientTimer);
    ambientTimer = setInterval(() => {
      tick();
      cycleArt();
    }, 12000);
  }

  function closeAmbientFrame() {
    clearInterval(ambientTimer);
    if (ambientEl) ambientEl.hidden = true;
  }

  // Mount Consolidated "✦ 更多" Button in .shell-utils
  function mountMoreHub() {
    const utils = document.querySelector('.shell-utils');
    if (!utils || document.getElementById('btnMoreHub')) return;

    const anchor = document.createElement('div');
    anchor.className = 'more-hub-anchor';
    anchor.innerHTML = `
      <button class="util-btn" id="btnMoreHub" type="button" data-tip="283 百宝箱 · 更多功能" aria-label="展开更多功能菜单" aria-expanded="false">
        <svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>
      </button>
      <div class="more-hub-popover" id="moreHubPopover" hidden>
        <div class="mh-head">283 PRODUCTION · 百宝箱与扩展</div>
        <button type="button" class="mh-item" data-act="search">
          <span class="mh-ico">🔍</span>
          <span class="mh-txt"><strong>全剧本「台词级」秒搜</strong><small>50 万+ 句双语台词毫秒级定位名场面</small></span>
        </button>
        <button type="button" class="mh-item" data-act="fortune">
          <span class="mh-ico">🎲</span>
          <span class="mh-txt"><strong>晨间电视占卜 & 沧海遗珠盲盒</strong><small>今日幸运偶像与未看汉化好剧随机抽</small></span>
        </button>
        <button type="button" class="mh-item" data-act="chain">
          <span class="mh-ico">📱</span>
          <span class="mh-txt"><strong>283 手机 Chain 群聊 & 1v1 合集</strong><small>组合群聊、私密来电与晨间试镜互动流</small></span>
        </button>
        <button type="button" class="mh-item" data-act="matrix">
          <span class="mh-ico">🕸️</span>
          <span class="mh-txt"><strong>全员 640 组互称与原句考据盘</strong><small>28×28 双向称呼表与剧本原句出处跳转</small></span>
        </button>
        <button type="button" class="mh-item" data-act="resume">
          <span class="mh-ico">📊</span>
          <span class="mh-txt"><strong>制作人 283 履历书与成就印章册</strong><small>阅历统计、12 枚成就印章与高清长图导出</small></span>
        </button>
        <button type="button" class="mh-item" data-act="ambient">
          <span class="mh-ico">🖼️</span>
          <span class="mh-txt"><strong>全屏「黑胶艺术画框 / 待机屏保」</strong><small>全景卡面轮播 + 旋转黑胶与时钟</small></span>
        </button>
        <button type="button" class="mh-item" data-act="companion" id="mhCompanionItem">
          <span class="mh-ico">💬</span>
          <span class="mh-txt"><strong>透明桌面伙伴 · AI / 记事本 / 语音</strong><small>置顶悬浮伙伴、整点报时与语音一键接入</small></span>
          <span class="mh-badge">桌面</span>
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
    };

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = pop.hidden;
      pop.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      const fxSub = document.getElementById('mhStageFxSub');
      if (fxSub) {
        const isSoft = document.documentElement.dataset.stageFx === 'soft';
        fxSub.textContent = isSoft ? '当前：柔光省电（点击切换全力拉满）' : '当前：全力拉满（点击切换柔光）';
      }
    });

    document.addEventListener('click', e => {
      if (!pop.hidden && !anchor.contains(e.target)) closePop();
    });

    pop.querySelectorAll('.mh-item').forEach((item, idx) => {
      item.style.setProperty('--mh-i', String(idx));
      item.addEventListener('click', () => {
        const act = item.dataset.act;
        closePop();
        if (act === 'search') openDialogueSearch();
        else if (act === 'fortune') openDailyFortune();
        else if (act === 'chain') openChainAnd1v1('chain');
        else if (act === 'matrix') openAddressMatrix();
        else if (act === 'resume') openProducerResume();
        else if (act === 'ambient') openAmbientFrame();
        else if (act === 'companion') document.getElementById('btnCompanion')?.click();
        else if (act === 'stagefx') document.getElementById('btnStageFx')?.click();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountMoreHub);
  } else {
    mountMoreHub();
  }

  window.PrismHub = {
    openSearch: openDialogueSearch,
    openChain: openChainAnd1v1,
    openMatrix: openAddressMatrix,
    openResume: openProducerResume,
    openFortune: openDailyFortune,
    openAmbientFrame
  };
})();
