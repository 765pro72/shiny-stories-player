/* ═══════════════════════════════════════════════════════════════════════════
   283 Story Branch Tree Inspector & Script Outline Drawer
   Parses branching choices (select -> label -> nextLabel merge),
   compares all option reactions side-by-side with voice audition.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cleanText = (s) => String(s || '').replace(/\\n|\r\n|\r/g, '\n').trim();

  const isEmbedded = window.self !== window.top;

  let triggerBtn = null;
  let backdropEl = null;
  let drawerTitleEl = null;
  let modeBtn = null;
  let groupBarEl = null;
  let bodyEl = null;
  let parsed = { groups: [], cast: [], totalLines: 0 };
  let activeGroupIdx = 0;
  let compareMode = true;
  let auditionAudio = null;
  let wasPlayingBeforeOpen = false;
  let pollTimer = 0;
  let lastChoiceActive = null;

  function stopAudition() {
    if (auditionAudio) {
      try { auditionAudio.pause(); auditionAudio.currentTime = 0; } catch {}
      auditionAudio = null;
    }
  }

  function detectGrade(lines) {
    for (const l of lines) {
      const jp = l.jp || '';
      if (/（よし|楽しく話せた|完璧|手応え|バッチリ|大成功|すごく喜ん/i.test(jp)) {
        return { key: 'perfect', label: '🌟 最佳反应 (Perfect)' };
      }
      if (/（まぁ、普通|普通に話せた|悪くは|まずまず/i.test(jp)) {
        return { key: 'good', label: '✨ 良好反应 (Good)' };
      }
      if (/（うっ……|しまった|微妙|失敗|別のことを言えば/i.test(jp)) {
        return { key: 'normal', label: '💬 普通反应 (Normal)' };
      }
    }
    return null;
  }

  function parseScenario() {
    const bridge = window.ScenarioBridge;
    const raw = bridge?.raw || [];
    const tracks = bridge?.tracks || [];
    const rows = bridge?.lastRows || [];
    const names = bridge?.names || {};
    if (!raw.length) return { groups: [], cast: [], totalLines: 0 };

    const rowByIdx = new Map();
    for (const r of rows) {
      if (Number.isInteger(r.index)) rowByIdx.set(r.index, r);
    }

    const labelToIdx = new Map();
    for (let i = 0; i < raw.length; i++) {
      if (raw[i]?.label !== undefined && raw[i]?.label !== null && raw[i]?.label !== '') {
        labelToIdx.set(String(raw[i].label), i);
      }
    }

    // Cast statistics across entire script
    const castMap = new Map();
    let totalLines = 0;
    for (let i = 0; i < raw.length; i++) {
      const t = raw[i];
      if (!t?.text) continue;
      totalLines++;
      const spkRaw = t.speaker || '';
      const spk = names[spkRaw] || spkRaw || '旁白';
      castMap.set(spk, (castMap.get(spk) || 0) + 1);
    }
    const cast = [...castMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Group consecutive select nodes
    const groups = [];
    let i = 0;
    while (i < raw.length) {
      if (raw[i]?.select) {
        const startIdx = i;
        const rawOpts = [];
        while (i < raw.length && raw[i]?.select) {
          const r = rowByIdx.get(i);
          const tr = tracks[i];
          const jp = cleanText(raw[i].select);
          const zh = cleanText(r?.translation || tr?.select || jp);
          rawOpts.push({
            index: i,
            zh,
            jp,
            nextLabel: raw[i].nextLabel != null ? String(raw[i].nextLabel) : ''
          });
          i++;
        }

        // Collect all sibling labels so each branch stops cleanly before the next branch begins
        const siblingLabels = new Set(rawOpts.map(o => o.nextLabel).filter(Boolean));

        const options = rawOpts.map((opt, optIdx) => {
          const lines = [];
          let mergesTo = '';
          const destIdx = opt.nextLabel ? labelToIdx.get(opt.nextLabel) : undefined;
          if (Number.isInteger(destIdx)) {
            for (let k = destIdx; k < raw.length && lines.length < 36; k++) {
              const node = raw[k];
              if (!node) continue;
              if (k > destIdx && node.label && siblingLabels.has(String(node.label))) {
                break;
              }
              if (k > destIdx && node.select) {
                mergesTo = '后续分支';
                break;
              }
              if (node.text) {
                const row = rowByIdx.get(k);
                const tr = tracks[k];
                const spkRaw = node.speaker || '';
                const spk = names[spkRaw] || spkRaw || '旁白';
                const isProducer = /プロデューサー|制作人|製作人|^P$/i.test(spkRaw || spk);
                const jp = cleanText(node.text);
                const zh = cleanText(row?.translation || (bridge?.language === 'jp' ? '' : tr?.text) || jp);
                let voiceUrl = '';
                if (tr?.voice && typeof tr.voice === 'string') {
                  voiceUrl = tr.voice;
                } else if (node.voice && typeof node.voice === 'string') {
                  voiceUrl = '/asset/sounds/voice/events/' + node.voice.replace(/\.m4a$/i, '') + '.m4a';
                }
                lines.push({ index: k, speaker: spk, isProducer, zh, jp, voiceUrl });
              }
              if (node.nextLabel && String(node.nextLabel) !== opt.nextLabel) {
                mergesTo = String(node.nextLabel);
                break;
              }
            }
          }
          return {
            letter: String.fromCharCode(65 + optIdx),
            ...opt,
            lines,
            mergesTo,
            grade: detectGrade(lines)
          };
        });

        // Also capture the context line immediately before this choice group
        let leadLine = null;
        for (let b = startIdx - 1; b >= Math.max(0, startIdx - 8); b--) {
          if (raw[b]?.text) {
            const row = rowByIdx.get(b);
            const spk = names[raw[b].speaker] || raw[b].speaker || '旁白';
            leadLine = {
              speaker: spk,
              zh: cleanText(row?.translation || raw[b].text),
              jp: cleanText(raw[b].text)
            };
            break;
          }
        }

        groups.push({
          groupIndex: groups.length,
          startIdx,
          endIdx: i - 1,
          leadLine,
          options
        });
      } else {
        i++;
      }
    }

    return { groups, cast, totalLines };
  }

  function isGroupActiveInPlayer(group) {
    const p = window.ScenarioBridge?.player;
    if (!p || !p._selectList?.active) return false;
    const cur = p._trackManager?._current;
    return Number.isInteger(cur) && cur >= group.startIdx && cur <= group.endIdx + 1;
  }

  function ensureUI() {
    if (triggerBtn) return;

    triggerBtn = document.createElement('button');
    triggerBtn.id = 'branchInspectorBtn';
    triggerBtn.type = 'button';
    triggerBtn.className = 'bi-trigger';
    triggerBtn.title = '查看剧情分支对比与台词大纲';
    triggerBtn.innerHTML = '<span>📋</span><span>剧本大纲</span>';
    if (isEmbedded) {
      triggerBtn.hidden = true;
      triggerBtn.style.display = 'none';
    } else {
      triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDrawer();
      });
      document.body.appendChild(triggerBtn);
    }

    backdropEl = document.createElement('div');
    backdropEl.className = 'bi-backdrop';
    backdropEl.innerHTML = `
      <aside class="bi-drawer" role="dialog" aria-modal="true" aria-label="剧情分支树透视仪">
        <header class="bi-head">
          <div class="bi-head-title">
            <small>283 SCENARIO BRANCH INSPECTOR</small>
            <h3 id="biDrawerTitle">剧情分支透视仪</h3>
          </div>
          <div class="bi-head-actions">
            <button type="button" class="bi-mode-btn" id="biModeBtn" title="切换并列对比或单列阅读">📑 并列对比</button>
            <button type="button" class="bi-close-btn" id="biCloseBtn" aria-label="关闭">×</button>
          </div>
        </header>
        <div class="bi-group-bar" id="biGroupBar" hidden></div>
        <div class="bi-body" id="biBody"></div>
      </aside>
    `;
    document.body.appendChild(backdropEl);

    drawerTitleEl = backdropEl.querySelector('#biDrawerTitle');
    modeBtn = backdropEl.querySelector('#biModeBtn');
    groupBarEl = backdropEl.querySelector('#biGroupBar');
    bodyEl = backdropEl.querySelector('#biBody');

    backdropEl.addEventListener('click', (e) => {
      if (e.target === backdropEl) closeDrawer();
    });
    backdropEl.querySelector('#biCloseBtn').addEventListener('click', closeDrawer);
    modeBtn.addEventListener('click', () => {
      compareMode = !compareMode;
      modeBtn.textContent = compareMode ? '📑 并列对比' : '📜 竖排详览';
      renderDrawer();
    });

    window.addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && window.__branchInspectorOpen) {
        e.preventDefault();
        e.stopPropagation();
        closeDrawer();
      }
    }, true);
  }

  function updateTriggerBadge() {
    ensureUI();
    const gCount = parsed.groups.length;
    const totalOpts = parsed.groups.reduce((s, g) => s + g.options.length, 0);
    if (gCount > 0) {
      triggerBtn.classList.add('has-branches');
      triggerBtn.innerHTML = `<span>🌳</span><span>分支透视</span><span class="bi-badge">${gCount}组·${totalOpts}项</span>`;
    } else {
      triggerBtn.classList.remove('has-branches');
      triggerBtn.innerHTML = `<span>📋</span><span>剧本大纲</span>`;
    }
    if (isEmbedded) {
      triggerBtn.hidden = true;
      try {
        parent.postMessage({
          type: 'branchInfo',
          value: { hasBranches: gCount > 0, groupCount: gCount, optionCount: totalOpts }
        }, location.origin);
      } catch {}
    }
  }

  function renderDrawer() {
    if (!bodyEl) return;
    const gCount = parsed.groups.length;
    modeBtn.hidden = gCount === 0;
    modeBtn.textContent = compareMode ? '📑 并列对比' : '📜 竖排详览';

    if (gCount > 1) {
      groupBarEl.hidden = false;
      groupBarEl.innerHTML = parsed.groups.map((g, idx) => `
        <button type="button" class="bi-pill ${idx === activeGroupIdx ? 'active' : ''}" data-gidx="${idx}">
          分支点 #${idx + 1} (${g.options.length}选1)
        </button>
      `).join('');
      groupBarEl.querySelectorAll('.bi-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          activeGroupIdx = Number(btn.dataset.gidx) || 0;
          renderDrawer();
        });
      });
    } else {
      groupBarEl.hidden = true;
    }

    if (gCount > 0) {
      drawerTitleEl.textContent = `🌳 剧情分支树透视仪（共 ${gCount} 处分支）`;
      const group = parsed.groups[activeGroupIdx] || parsed.groups[0];
      const activeNow = isGroupActiveInPlayer(group);

      let html = '';
      if (group.leadLine) {
        html += `
          <div class="bi-tree-summary">
            <div><strong>分岐前导台词</strong> · ${esc(group.leadLine.speaker)}：</div>
            <div style="margin-top:4px;color:#f8fafc;">「${esc(group.leadLine.zh)}」</div>
            ${group.leadLine.jp && group.leadLine.jp !== group.leadLine.zh ? `<div style="font-size:11.5px;color:#94a3b8;margin-top:2px;">${esc(group.leadLine.jp)}</div>` : ''}
          </div>
        `;
      }

      html += `<div class="bi-branches-grid ${compareMode ? 'is-compare' : ''}">`;
      for (const opt of group.options) {
        html += `
          <article class="bi-branch-card">
            <div class="bi-branch-head">
              <span class="bi-opt-tag">${esc(opt.letter)}</span>
              <div class="bi-opt-texts">
                <div class="bi-opt-zh">${esc(opt.zh)}</div>
                ${opt.jp && opt.jp !== opt.zh ? `<div class="bi-opt-jp">${esc(opt.jp)}</div>` : ''}
                ${opt.grade ? `<span class="bi-grade ${opt.grade.key}">${esc(opt.grade.label)}</span>` : ''}
              </div>
              ${activeNow && opt.nextLabel ? `<button type="button" class="bi-pick-btn" data-pick="${esc(opt.nextLabel)}">▶ 选此项</button>` : ''}
            </div>
            <div class="bi-lines">
              ${opt.lines.length ? opt.lines.map(l => `
                <div class="bi-line ${l.isProducer ? 'is-producer' : ''}">
                  <div class="bi-line-top">
                    <span class="bi-spk">${esc(l.speaker)}</span>
                    ${l.voiceUrl ? `<button type="button" class="bi-voice-btn" data-voice="${esc(l.voiceUrl)}">🔊 试听</button>` : ''}
                  </div>
                  <div class="bi-line-zh">${esc(l.zh)}</div>
                  ${l.jp && l.jp !== l.zh ? `<div class="bi-line-jp">${esc(l.jp)}</div>` : ''}
                </div>
              `).join('') : '<div class="bi-line"><div class="bi-line-jp">（此选项直接汇入后续主线）</div></div>'}
            </div>
            <div class="bi-merge-note">
              <span>本分支共 ${opt.lines.length} 句专属对白</span>
              <span>${opt.mergesTo === 'end' ? '🏁 汇入结尾' : (opt.mergesTo ? '↳ 汇合节点 #' + esc(opt.mergesTo) : '↳ 顺接下文')}</span>
            </div>
          </article>
        `;
      }
      html += `</div>`;

      html += renderCastBox();
      bodyEl.innerHTML = html;
    } else {
      drawerTitleEl.textContent = `📋 剧本结构大纲（无选项单线剧情）`;
      bodyEl.innerHTML = `
        <div class="bi-tree-summary">
          本篇为<strong>单线演出剧本</strong>（共 <strong>${parsed.totalLines}</strong> 句对白，无分支选项），可安心流畅欣赏。
        </div>
        ${renderCastBox()}
      `;
    }

    // Bind voice audition buttons
    bodyEl.querySelectorAll('[data-voice]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        stopAudition();
        const url = btn.dataset.voice;
        btn.textContent = '🔊 播放中…';
        const audio = new Audio(url);
        auditionAudio = audio;
        audio.onended = () => { btn.textContent = '🔊 试听'; };
        audio.onerror = () => {
          btn.textContent = '⚠️ 无音频';
          setTimeout(() => { btn.textContent = '🔊 试听'; }, 1400);
        };
        audio.play().catch(() => { btn.textContent = '🔊 试听'; });
      });
    });

    // Bind direct option selection
    bodyEl.querySelectorAll('[data-pick]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const label = btn.dataset.pick;
        closeDrawer();
        window.ScenarioBridge?.selectActiveOption?.(label);
      });
    });
  }

  function renderCastBox() {
    if (!parsed.cast.length) return '';
    return `
      <section class="bi-cast-box">
        <h4>🎭 本篇登场角色与台词统计（共 ${parsed.totalLines} 句）</h4>
        <div class="bi-cast-chips">
          ${parsed.cast.map(c => `<span class="bi-cast-chip">${esc(c.name)}<small>${c.count}句</small></span>`).join('')}
        </div>
      </section>
    `;
  }

  function openDrawer() {
    ensureUI();
    parsed = parseScenario();
    updateTriggerBadge();
    // Auto-select the currently active choice group if player is waiting on one
    const activeIdx = parsed.groups.findIndex(g => isGroupActiveInPlayer(g));
    if (activeIdx >= 0) activeGroupIdx = activeIdx;
    else if (activeGroupIdx >= parsed.groups.length) activeGroupIdx = 0;

    const p = window.ScenarioBridge?.player;
    if (p && !p._paused) {
      wasPlayingBeforeOpen = true;
      try { p.pause(); } catch {}
    } else {
      wasPlayingBeforeOpen = false;
    }

    window.__branchInspectorOpen = true;
    renderDrawer();
    backdropEl.classList.add('is-open');
  }

  function closeDrawer() {
    stopAudition();
    window.__branchInspectorOpen = false;
    backdropEl?.classList.remove('is-open');
    if (wasPlayingBeforeOpen) {
      wasPlayingBeforeOpen = false;
      try { window.ScenarioBridge?.player?.resume(); } catch {}
    }
  }

  function onScenarioReady() {
    parsed = parseScenario();
    updateTriggerBadge();
    if (window.__branchInspectorOpen) renderDrawer();
  }

  window.addEventListener('scenario-tracks-ready', onScenarioReady);

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== parent) return;
    if (e.data?.type === 'openBranchInspector') openDrawer();
  });

  // Lightweight watcher to pulse the trigger pill when player reaches a choice screen
  pollTimer = setInterval(() => {
    if (!triggerBtn || document.hidden || !parsed.groups.length) return;
    const active = !!window.ScenarioBridge?.player?._selectList?.active;
    triggerBtn.classList.toggle('pulse-choice', active);
    if (isEmbedded && active !== lastChoiceActive) {
      lastChoiceActive = active;
      try { parent.postMessage({ type: 'branchChoiceActive', value: active }, location.origin); } catch {}
    }
  }, 600);

  window.addEventListener('pagehide', () => {
    clearInterval(pollTimer);
    stopAudition();
  }, { once: true });

  // If already initialized before script ran
  if (window.ScenarioBridge?.raw?.length) onScenarioReady();
})();
