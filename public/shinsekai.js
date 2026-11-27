(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const IDOLS = [
    { id: '1', name: '樱木真乃', unit: 'illumination STARS' },
    { id: '2', name: '风野灯织', unit: 'illumination STARS' },
    { id: '3', name: '八宫巡', unit: 'illumination STARS' },
    { id: '4', name: '月冈恋钟', unit: 'L\'Antica' },
    { id: '5', name: '田中摩美美', unit: 'L\'Antica' },
    { id: '6', name: '白濑咲耶', unit: 'L\'Antica' },
    { id: '7', name: '三峰结华', unit: 'L\'Antica' },
    { id: '8', name: '幽谷雾子', unit: 'L\'Antica' },
    { id: '9', name: '小宫果穗', unit: '放课后Climax Girls' },
    { id: '10', name: '园田智代子', unit: '放课后Climax Girls' },
    { id: '11', name: '西城树里', unit: '放课后Climax Girls' },
    { id: '12', name: '杜野凛世', unit: '放课后Climax Girls' },
    { id: '13', name: '有栖川夏叶', unit: '放课后Climax Girls' },
    { id: '14', name: '大崎甘奈', unit: 'ALSTROEMERIA' },
    { id: '15', name: '大崎甜花', unit: 'ALSTROEMERIA' },
    { id: '16', name: '桑山千雪', unit: 'ALSTROEMERIA' },
    { id: '17', name: '芹泽朝日', unit: 'Straylight' },
    { id: '18', name: '黛冬优子', unit: 'Straylight' },
    { id: '19', name: '和泉爱依', unit: 'Straylight' },
    { id: '20', name: '浅仓透', unit: 'noctchill' },
    { id: '21', name: '樋口圆香', unit: 'noctchill' },
    { id: '22', name: '福丸小糸', unit: 'noctchill' },
    { id: '23', name: '市川雏菜', unit: 'noctchill' },
    { id: '24', name: '七草日花', unit: 'SHHis' },
    { id: '25', name: '绯田美琴', unit: 'SHHis' },
    { id: '26', name: '斑鸠路加', unit: 'CoMETIK' },
    { id: '27', name: '铃木羽那', unit: 'CoMETIK' },
    { id: '28', name: '郁田春希', unit: 'CoMETIK' }
  ];

  const BG_MAP = {
    office: '/home-assets/office.jpg',
    'office-night': '/home-assets/office-night.jpg',
    rehearsal: '/asset/images/event/bg/00014.jpg',
    live: '/asset/images/event/bg/00015.jpg',
    street: '/home-assets/office-evening.jpg',
    cafe: '/asset/images/event/bg/00034.jpg'
  };

  let currentIdolId = localStorage.getItem('shiny.sk.idol') || '24';
  let chibiCatalog = [];
  let stageApp = null;
  let stageSpine = null;
  let chatMessages = [];
  let activePlayGraph = null;
  let activePlayNodeId = null;

  const getIdol = (id = currentIdolId) => IDOLS.find(x => x.id === String(id)) || IDOLS[23];

  // Tabs
  $$('.sk-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.sk-tab').forEach(b => b.classList.toggle('active', b === btn));
      $$('.sk-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === btn.dataset.tab));
      if (btn.dataset.tab === 'memory') { loadPersona(); loadMemories(); loadWorldbooks(); }
      if (btn.dataset.tab === 'relations') loadRelations();
      if (btn.dataset.tab === 'lan') { loadLanInfo(); loadReminders(); }
      if (btn.dataset.tab === 'canvas') renderGraph();
    });
  });

  // Idol selector
  const elIdolSel = $('#skIdolSelect');
  IDOLS.forEach(i => elIdolSel.append(new Option(`${i.name} · ${i.unit}`, i.id)));
  elIdolSel.value = currentIdolId;
  elIdolSel.addEventListener('change', () => {
    currentIdolId = elIdolSel.value;
    localStorage.setItem('shiny.sk.idol', currentIdolId);
    $('#skSpeakerName').textContent = getIdol().name;
    loadStageModel();
    refreshAffinityBadge();
    loadSessionChat();
  });

  // Theme & Background
  const elThemeSel = $('#skThemeSelect');
  const savedTheme = localStorage.getItem('shiny.sk.theme') || 'prism-glass';
  elThemeSel.value = savedTheme;
  $('#skViewport').dataset.theme = savedTheme;
  elThemeSel.addEventListener('change', () => {
    $('#skViewport').dataset.theme = elThemeSel.value;
    localStorage.setItem('shiny.sk.theme', elThemeSel.value);
  });

  const elBgSel = $('#skBgSelect');
  const setStageBg = (key) => {
    const url = BG_MAP[key] || BG_MAP.office;
    $('#skVnBg').style.backgroundImage = `url("${url}")`;
    if (BG_MAP[key]) elBgSel.value = key;
  };
  elBgSel.addEventListener('change', () => setStageBg(elBgSel.value));
  setStageBg('office');

  // WebAudio SFX
  function playSfx(kind) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const freqs = { chime: 880, sparkle: 1046, heart: 659, cheer: 784, pop: 523 };
      osc.type = kind === 'sparkle' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freqs[kind] || 740, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime((freqs[kind] || 740) * 1.35, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {}
  }

  function showAffinityFloat(delta) {
    if (!delta) return;
    const div = document.createElement('div');
    div.className = 'sk-affinity-toast';
    div.textContent = `♥ 好感度 ${delta > 0 ? '+' : ''}${delta}`;
    $('#skViewport').append(div);
    setTimeout(() => div.remove(), 1900);
  }

  // PIXI Spine Stage
  function ensureStageApp() {
    if (stageApp || !window.PIXI?.Application) return stageApp;
    const wrap = $('#skStageCanvasWrap');
    const w = Math.max(640, wrap.clientWidth || 800);
    const h = Math.max(360, wrap.clientHeight || 450);
    stageApp = new PIXI.Application({
      width: w,
      height: h,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1.5),
      autoDensity: true
    });
    stageApp.view.style.width = '100%';
    stageApp.view.style.height = '100%';
    wrap.replaceChildren(stageApp.view);
    stageApp.ticker.add(() => {
      if (stageSpine) {
        try { stageSpine.update(Math.min(0.04, (stageApp.ticker.deltaMS || 16.6) / 1000)); } catch {}
      }
    });
    return stageApp;
  }

  async function loadStageModel() {
    const app = ensureStageApp();
    if (!app || !window.PIXI?.spine?.Spine) return;
    const form = $('#skFormSelect').value;
    const pad3 = String(currentIdolId).padStart(3, '0');
    let pathStr = `spine/characters/cb/${pad3}/data.json`;
    if (form === 'stand') {
      pathStr = `spine/characters/costume/${pad3}_01/data.json`;
    } else if (chibiCatalog.length) {
      const grp = chibiCatalog.find(g => String(g.id) === String(currentIdolId));
      const hit = grp?.outfits?.find(o => o.kind === 'cb') || grp?.outfits?.[0];
      if (hit?.path) pathStr = hit.path;
    }

    const loader = new PIXI.Loader();
    const key = 'sk_' + Date.now();
    loader.add(key, '/asset-original/' + pathStr).load((l, res) => {
      const sd = res[key]?.spineData;
      if (!sd) return;
      if (stageSpine) {
        app.stage.removeChild(stageSpine);
        try { stageSpine.destroy({ children: true }); } catch {}
      }
      const sp = new PIXI.spine.Spine(sd);
      sp.autoUpdate = false;
      try { sp.skeleton.setSkinByName('normal'); } catch {
        if (sd.skins?.some(s => s.name === 'default')) sp.skeleton.setSkinByName('default');
      }
      sp.skeleton.setToSetupPose();
      sp.stateData.defaultMix = 0.25;
      const anims = (sd.animations || []).map(a => a.name);
      const idle = ['wait', 'wait1', 'wait_01', 'talk_wait'].find(a => anims.includes(a)) || anims[0];
      if (idle) sp.state.setAnimation(0, idle, true);
      try { sp.update(0.016); } catch {}
      const b = sp.getLocalBounds();
      const bh = Math.max(60, b.height || 300);
      const bw = Math.max(40, b.width || 220);
      const targetH = form === 'stand' ? app.screen.height * 0.92 : app.screen.height * 0.62;
      const fit = targetH / bh;
      sp.scale.set(fit);
      sp.position.set(app.screen.width * 0.5 - (b.x + bw / 2) * fit, app.screen.height * 0.88 - (b.y + bh) * fit);
      app.stage.addChild(sp);
      stageSpine = sp;
    });
  }

  $('#skFormSelect').addEventListener('change', loadStageModel);

  function triggerStageEmotion(emo) {
    $('#skStageEmotionTag').textContent = emo || 'calm';
    if (!stageSpine) return;
    const anims = (stageSpine.spineData?.animations || []).map(a => a.name);
    const map = {
      happy: ['jump', 'win', 'ok', 'smile3', 'smile1'],
      shy: ['touch', 'talk_ok', 'shy1'],
      surprised: ['ok', 'jump', 'surprise1'],
      thinking: ['pr', 'talk_wait', 'think1'],
      sad: ['ng', 'sad1'],
      angry: ['ng', 'angry1'],
      calm: ['talk_ok', 'wait', 'wait1']
    };
    const hit = (map[emo] || map.calm).find(n => anims.includes(n));
    const idle = ['wait', 'wait1', 'wait_01'].find(n => anims.includes(n)) || anims[0];
    if (hit && hit !== idle) {
      try {
        stageSpine.state.setAnimation(0, hit, false);
        if (idle) stageSpine.state.addAnimation(0, idle, true, 0);
      } catch {}
    }
  }

  // Session & Chat
  async function refreshAffinityBadge() {
    try {
      const r = await fetch('/api/shinsekai/relations');
      const d = await r.json();
      const rel = d.relations?.[currentIdolId] || { affinity: 10, stage: '初识' };
      $('#skAffinityBadge').textContent = `♥ 好感度 ${rel.affinity} · ${rel.stage}`;
    } catch {}
  }

  function renderChatLog() {
    const box = $('#skChatLog');
    box.innerHTML = '';
    for (const m of chatMessages) {
      const div = document.createElement('div');
      div.className = 'sk-msg ' + (m.role === 'user' ? 'user' : 'assistant');
      div.textContent = m.content;
      box.append(div);
    }
    box.scrollTop = box.scrollHeight;
  }

  async function loadSessionChat() {
    try {
      const r = await fetch('/api/shinsekai/sessions?idolId=' + encodeURIComponent(currentIdolId));
      const d = await r.json();
      chatMessages = Array.isArray(d.messages) ? d.messages : [];
      renderChatLog();
    } catch {}
  }

  function showChoices(choices, onPick) {
    const el = $('#skChoicesOverlay');
    if (!choices || !choices.length) { el.hidden = true; el.innerHTML = ''; return; }
    el.innerHTML = '';
    for (const ch of choices) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sk-choice-btn';
      btn.textContent = typeof ch === 'string' ? ch : ch.label;
      btn.onclick = () => {
        el.hidden = true;
        onPick(ch);
      };
      el.append(btn);
    }
    el.hidden = false;
  }

  function getSavedAiConnection() {
    try {
      const saved = JSON.parse(localStorage.getItem('story-ai-connections') || '{}');
      const activeId = saved.activeId || Object.keys(saved.connections || {})[0];
      const conn = saved.connections?.[activeId] || saved;
      if (conn?.baseURL && conn?.model) return conn;
    } catch {}
    return null;
  }

  async function sendStageChat(overrideText) {
    const input = $('#skChatInput');
    const text = String(overrideText !== undefined ? overrideText : input.value).trim();
    if (!text) return;
    if (overrideText === undefined) input.value = '';
    showChoices([]);
    chatMessages.push({ role: 'user', content: text });
    renderChatLog();
    $('#skChatStatus').textContent = '正在检索长期记忆与世界书，生成舞台演出…';

    try {
      const idol = getIdol();
      const res = await fetch('/api/shinsekai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idolId: idol.id,
          idolName: idol.name,
          idolUnit: idol.unit,
          message: text,
          history: chatMessages.slice(-12),
          stageMode: true,
          connection: getSavedAiConnection() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || '请求失败');
      chatMessages.push({ role: 'assistant', content: data.cleanText });
      renderChatLog();
      $('#skSpeakerName').textContent = idol.name;
      $('#skDialogText').textContent = data.cleanText;
      if (data.tags?.bg) setStageBg(data.tags.bg);
      if (data.tags?.emotion) triggerStageEmotion(data.tags.emotion);
      if (data.tags?.sfx) playSfx(data.tags.sfx);
      if (data.tags?.affinityDelta) showAffinityFloat(data.tags.affinityDelta);
      if (data.tags?.choices?.length) {
        showChoices(data.tags.choices, picked => sendStageChat(picked));
      }
      $('#skAffinityBadge').textContent = `♥ 好感度 ${data.affinityAfter} · ${data.stageAfter}`;
      const memCnt = data.recalledMemories?.length || 0;
      $('#skChatStatus').textContent = `已召回 ${memCnt} 条记忆 · ${data.tags?.memoryToSave ? '新写入 1 条记忆' : '联动演出完成'}`;
    } catch (e) {
      $('#skChatStatus').textContent = '提示：' + e.message;
    }
  }

  $('#btnSkSend').addEventListener('click', () => sendStageChat());
  $('#skChatInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendStageChat(); });
  $('#btnSkClearChat').addEventListener('click', async () => {
    chatMessages = [];
    renderChatLog();
    await fetch('/api/shinsekai/sessions?idolId=' + encodeURIComponent(currentIdolId), { method: 'DELETE' });
  });

  // Replay
  $('#btnSkReplay').addEventListener('click', async () => {
    if (!chatMessages.length) return;
    const idol = getIdol();
    for (const m of chatMessages.slice(-10)) {
      $('#skSpeakerName').textContent = m.role === 'user' ? '制作人' : idol.name;
      $('#skDialogText').textContent = m.content;
      if (m.role === 'assistant') triggerStageEmotion('happy');
      await new Promise(r => setTimeout(r, 1500));
    }
  });

  // Export Long PNG Screenshot
  $('#btnSkSnapshot').addEventListener('click', () => {
    const list = chatMessages.slice(-24);
    const W = 760, lineH = 26, pad = 28;
    const rows = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = '15px sans-serif';
    for (const m of list) {
      const prefix = m.role === 'user' ? '制作人：' : `${getIdol().name}：`;
      const full = prefix + m.content;
      let buf = '';
      for (const ch of full) {
        if (ctx.measureText(buf + ch).width > W - pad * 2 - 20) {
          rows.push({ text: buf, isUser: m.role === 'user' });
          buf = '  ' + ch;
        } else buf += ch;
      }
      if (buf) rows.push({ text: buf, isUser: m.role === 'user' });
      rows.push({ gap: true });
    }
    const H = Math.max(240, pad * 2 + 50 + rows.length * lineH);
    canvas.width = W; canvas.height = H;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`283 新世界剧场回忆录 · ${getIdol().name}`, pad, pad + 18);
    ctx.font = '15px sans-serif';
    let y = pad + 56;
    for (const r of rows) {
      if (!r.gap) {
        ctx.fillStyle = r.isUser ? '#7dd3fc' : '#f8fafc';
        ctx.fillText(r.text, pad, y);
      }
      y += lineH;
    }
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `283-shinsekai-${getIdol().name}-${Date.now()}.png`;
    a.click();
  });

  // Export Offline Playable VN HTML
  function exportPlayableVnHtml(title, nodes) {
    const safeData = JSON.stringify({ title, idol: getIdol().name, nodes }).replace(/<\/script>/gi, '<\\/script>');
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}.box{max-width:720px;width:100%;background:#1e293b;border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,.45)}.sp{display:inline-block;padding:4px 14px;border-radius:999px;background:#0284c7;font-weight:700;margin-bottom:12px}.tx{font-size:17px;line-height:1.7;min-height:80px;white-space:pre-wrap}.ch{display:flex;flex-direction:column;gap:8px;margin-top:18px}button{padding:11px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:15px;cursor:pointer;text-align:left}button:hover{background:#0284c7}</style></head>
<body><div class="box"><h2 style="margin-top:0;font-size:15px;color:#94a3b8">${title}（283 离线可玩视觉小说）</h2><div class="sp" id="sp"></div><div class="tx" id="tx"></div><div class="ch" id="ch"></div></div>
<script>const DATA=${safeData};let cur=DATA.nodes[0]?.id;function render(){const n=DATA.nodes.find(x=>x.id===cur)||DATA.nodes[0];if(!n)return;document.getElementById('sp').textContent=n.speaker||DATA.idol;document.getElementById('tx').textContent=n.text||'';const ch=document.getElementById('ch');ch.innerHTML='';const opts=(n.choices&&n.choices.length)?n.choices:(n.next?[{label:'继续 ▶',target:n.next}]:[{label:'↺ 重新开始',target:DATA.nodes[0]?.id}]);for(const o of opts){const b=document.createElement('button');b.textContent=o.label;b.onclick=()=>{cur=o.target||DATA.nodes[0]?.id;render();};ch.append(b);}}render();<\/script></body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[\\/:*?"<>|]/g, '_')}-离线可玩VN.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  $('#btnSkExportVn').addEventListener('click', () => {
    const nodes = chatMessages.length
      ? chatMessages.map((m, idx) => ({
          id: 'n' + idx,
          speaker: m.role === 'user' ? '制作人' : getIdol().name,
          text: m.content,
          next: idx + 1 < chatMessages.length ? 'n' + (idx + 1) : ''
        }))
      : [{ id: 'n0', speaker: getIdol().name, text: $('#skDialogText').textContent, next: '' }];
    exportPlayableVnHtml(`${getIdol().name}-新世界剧场`, nodes);
  });

  // ── 2. Branching Story Node Graph Canvas ──
  let graphNodes = [
    { id: 'n_start', type: 'start', title: '夜班排练室', speaker: '七草日花', text: '制作人先生，这么晚了还在事务所吗？其实……我有话想对你说。', x: 60, y: 180, next: 'n_choice' },
    { id: 'n_choice', type: 'choice', title: '制作人的回应', speaker: '制作人', text: '看着日花略显紧张的表情，决定怎么回答？', x: 350, y: 180, choices: [
      { label: '温柔递上热可可并倾听', target: 'n_end_good' },
      { label: '开玩笑说是不是偷吃零食了', target: 'n_end_fun' }
    ] },
    { id: 'n_end_good', type: 'ending', title: '结局 A · 星光下的约定', speaker: '七草日花', text: '谢谢制作人先生！下次 LIVE，我一定会站在最闪耀的地方给你看！', x: 680, y: 90, next: '' },
    { id: 'n_end_fun', type: 'ending', title: '结局 B · 斗嘴日常', speaker: '七草日花', text: '才没有偷吃呢！真是的，制作人先生就会捉弄我——不过，有你在真好。', x: 680, y: 280, next: '' }
  ];
  let selectedNodeId = 'n_start';

  function renderGraph() {
    const inner = $('#skGraphInner');
    const svg = $('#skGraphSvg');
    inner.querySelectorAll('.sk-node').forEach(el => el.remove());
    svg.innerHTML = '';

    const drawEdge = (fromNode, toId, label = '') => {
      const toNode = graphNodes.find(n => n.id === toId);
      if (!toNode) return;
      const x1 = fromNode.x + 210, y1 = fromNode.y + 42;
      const x2 = toNode.x, y2 = toNode.y + 42;
      const cx = (x1 + x2) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`);
      path.setAttribute('stroke', label ? '#f59e0b' : '#38bdf8');
      path.setAttribute('stroke-width', '2.5');
      path.setAttribute('fill', 'none');
      svg.append(path);
    };

    for (const n of graphNodes) {
      if (n.type === 'choice' && Array.isArray(n.choices)) {
        n.choices.forEach(c => drawEdge(n, c.target, c.label));
      } else if (n.next) {
        drawEdge(n, n.next);
      }

      const card = document.createElement('div');
      card.className = 'sk-node' + (n.id === selectedNodeId ? ' selected' : '');
      card.dataset.type = n.type;
      card.style.left = n.x + 'px';
      card.style.top = n.y + 'px';
      card.innerHTML = `<div class="sk-node-title">${n.title || n.id}</div><div class="sk-node-body">${n.text || ''}</div>`;

      let dragging = false, sx = 0, sy = 0, ox = n.x, oy = n.y;
      card.addEventListener('pointerdown', e => {
        selectedNodeId = n.id;
        dragging = true;
        sx = e.clientX; sy = e.clientY;
        ox = n.x; oy = n.y;
        card.setPointerCapture(e.pointerId);
        renderInspector();
      });
      card.addEventListener('pointermove', e => {
        if (!dragging) return;
        n.x = Math.max(12, Math.round(ox + e.clientX - sx));
        n.y = Math.max(12, Math.round(oy + e.clientY - sy));
        card.style.left = n.x + 'px';
        card.style.top = n.y + 'px';
      });
      card.addEventListener('pointerup', () => {
        if (dragging) { dragging = false; renderGraph(); }
      });
      inner.append(card);
    }
    renderInspector();
  }

  function renderInspector() {
    const box = $('#skNodeInspector');
    const n = graphNodes.find(x => x.id === selectedNodeId);
    if (!n) { box.innerHTML = '<small>请选择节点</small>'; return; }
    const targetOpts = `<option value="">（无 / 结束）</option>` + graphNodes.filter(x => x.id !== n.id).map(x => `<option value="${x.id}">${x.title || x.id}</option>`).join('');
    box.innerHTML = `
      <label style="font-size:12px;">节点标题<input id="insTitle" class="sk-input" style="width:100%" value="${(n.title || '').replace(/"/g, '&quot;')}"></label>
      <label style="font-size:12px;">说话人<input id="insSpeaker" class="sk-input" style="width:100%" value="${(n.speaker || '').replace(/"/g, '&quot;')}"></label>
      <label style="font-size:12px;">台词内容<textarea id="insText" class="sk-textarea" rows="3" style="width:100%">${n.text || ''}</textarea></label>
      ${n.type === 'choice'
        ? `<div id="insChoices"></div><button type="button" class="sk-btn" id="btnAddChoiceOpt">+ 添加分支选项</button>`
        : `<label style="font-size:12px;">下一跳节点<select id="insNext" class="sk-select" style="width:100%">${targetOpts}</select></label>`}
      ${n.type !== 'start' ? `<button type="button" class="sk-btn" id="btnDelNode" style="color:#fda4af;">删除该节点</button>` : ''}
    `;
    $('#insTitle').oninput = e => { n.title = e.target.value; renderGraphLite(); };
    $('#insSpeaker').oninput = e => { n.speaker = e.target.value; };
    $('#insText').oninput = e => { n.text = e.target.value; renderGraphLite(); };
    if (n.type !== 'choice') {
      const sel = $('#insNext');
      sel.value = n.next || '';
      sel.onchange = e => { n.next = e.target.value; renderGraph(); };
    } else {
      const wrap = $('#insChoices');
      n.choices = n.choices || [];
      n.choices.forEach((c, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;';
        const inp = document.createElement('input');
        inp.className = 'sk-input'; inp.style.flex = '1'; inp.value = c.label;
        inp.oninput = () => { c.label = inp.value; };
        const sel = document.createElement('select');
        sel.className = 'sk-select'; sel.innerHTML = targetOpts; sel.value = c.target || '';
        sel.onchange = () => { c.target = sel.value; renderGraph(); };
        row.append(inp, sel);
        wrap.append(row);
      });
      $('#btnAddChoiceOpt').onclick = () => { n.choices.push({ label: '新分支', target: '' }); renderInspector(); };
    }
    $('#btnDelNode')?.addEventListener('click', () => {
      graphNodes = graphNodes.filter(x => x.id !== n.id);
      selectedNodeId = graphNodes[0]?.id || '';
      renderGraph();
    });
  }

  function renderGraphLite() {
    renderGraph();
  }

  const addNode = (type) => {
    const id = 'n_' + Date.now().toString(36);
    graphNodes.push({
      id,
      type,
      title: type === 'choice' ? '新分支选择' : type === 'ending' ? '新结局' : '新剧情节点',
      speaker: getIdol().name,
      text: '写下这一幕的台词…',
      x: 120 + (graphNodes.length % 4) * 230,
      y: 80 + Math.floor(graphNodes.length / 4) * 140,
      next: '',
      choices: type === 'choice' ? [{ label: '选项 A', target: '' }, { label: '选项 B', target: '' }] : undefined
    });
    selectedNodeId = id;
    renderGraph();
  };
  $('#btnNodeAddDialogue').onclick = () => addNode('dialogue');
  $('#btnNodeAddChoice').onclick = () => addNode('choice');
  $('#btnNodeAddEnding').onclick = () => addNode('ending');

  $('#btnNodeValidate').onclick = () => {
    const ids = new Set(graphNodes.map(n => n.id));
    const visited = new Set();
    const dfs = id => {
      if (!id || !ids.has(id) || visited.has(id)) return;
      visited.add(id);
      const node = graphNodes.find(n => n.id === id);
      if (node.type === 'choice') (node.choices || []).forEach(c => dfs(c.target));
      else dfs(node.next);
    };
    dfs(graphNodes[0]?.id);
    const orphan = graphNodes.filter(n => !visited.has(n.id));
    alert(orphan.length ? `发现 ${orphan.length} 个孤立节点未连接到主线：${orphan.map(x => x.title).join('、')}` : '校验通过！所有分支节点路径均完整连通。');
  };

  $('#btnNodeExportHtml').onclick = () => exportPlayableVnHtml($('#skStoryTitle').value || '283分支剧本', graphNodes);

  $('#btnNodePlayOnStage').onclick = () => {
    activePlayGraph = graphNodes;
    const playStep = (nodeId) => {
      const n = activePlayGraph.find(x => x.id === nodeId) || activePlayGraph[0];
      if (!n) return;
      activePlayNodeId = n.id;
      $('#skSpeakerName').textContent = n.speaker || getIdol().name;
      $('#skDialogText').textContent = n.text || '';
      if (n.type === 'choice' && n.choices?.length) {
        showChoices(n.choices, c => playStep(c.target));
      } else if (n.next) {
        showChoices([{ label: '继续下一幕 ▶', target: n.next }], c => playStep(c.target));
      } else {
        showChoices([{ label: '↺ 重头试玩本剧本', target: activePlayGraph[0].id }], c => playStep(c.target));
      }
    };
    $$('.sk-tab')[0].click();
    playStep(graphNodes[0]?.id);
  };

  async function loadSavedStories() {
    try {
      const r = await fetch('/api/shinsekai/stories');
      const d = await r.json();
      const box = $('#skSavedStories');
      box.innerHTML = '';
      for (const s of d.items || []) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:12px;';
        row.innerHTML = `<span>${s.title} (${s.nodes?.length || 0}节点)</span>`;
        const b = document.createElement('button');
        b.className = 'sk-btn'; b.style.padding = '2px 8px'; b.textContent = '载入';
        b.onclick = () => {
          $('#skStoryTitle').value = s.title;
          graphNodes = s.nodes?.length ? s.nodes : graphNodes;
          selectedNodeId = graphNodes[0]?.id || '';
          renderGraph();
        };
        row.append(b);
        box.append(row);
      }
    } catch {}
  }

  $('#btnNodeSave').onclick = async () => {
    await fetch('/api/shinsekai/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: $('#skStoryTitle').value || '未命名分支剧本',
        idolId: currentIdolId,
        nodes: graphNodes
      })
    });
    loadSavedStories();
    alert('分支剧本已保存！');
  };

  $('#btnAiGenGraph').onclick = async () => {
    const prompt = String($('#skAiStoryPrompt').value || '').trim();
    if (!prompt) return alert('请先输入一句话故事梗概');
    const conn = getSavedAiConnection();
    if (!conn) return alert('请先在“怪文书”AI 创作面板配置并连接模型接口');
    const btn = $('#btnAiGenGraph');
    btn.disabled = true; btn.textContent = '生成中…';
    try {
      const sys = `你是视觉小说分支架构师。请严格输出一个 JSON 数组（不要输出 markdown 代码块之外的多余解释），表示 4~6 个剧情节点，字段为：id, type('start'|'dialogue'|'choice'|'ending'), title, speaker, text, next, choices([{label,target}])。主角是《闪耀色彩》${getIdol().name}。`;
      const res = await fetch('/api/story-ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection: { ...conn, stream: false }, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }] })
      });
      const raw = await res.text();
      let fullText = '';
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        try { const obj = JSON.parse(line); if (obj.type === 'delta') fullText += obj.text; } catch {}
      }
      const m = fullText.match(/\[[\s\S]*\]/);
      if (!m) throw new Error('模型未返回有效节点 JSON');
      const arr = JSON.parse(m[0]);
      if (Array.isArray(arr) && arr.length) {
        graphNodes = arr.map((n, i) => ({
          ...n,
          x: 60 + (i % 3) * 280,
          y: 80 + Math.floor(i / 3) * 180
        }));
        selectedNodeId = graphNodes[0].id;
        renderGraph();
      }
    } catch (e) {
      alert('AI 生成分支失败：' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = '✨ AI 一键生成分支节点图';
    }
  };

  // ── 3. Memory, Persona & Worldbook ──
  async function loadPersona() {
    try {
      const r = await fetch('/api/shinsekai/persona');
      const d = await r.json();
      const p = d.persona || {};
      $('#skPersonaName').value = p.name || '制作人';
      $('#skPersonaTitle').value = p.title || '制作人先生';
      $('#skPersonaBirthday').value = p.birthday || '';
      $('#skPersonaLikes').value = p.likes || '';
      $('#skPersonaBio').value = p.bio || '';
    } catch {}
  }

  $('#btnSavePersona').onclick = async () => {
    await fetch('/api/shinsekai/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: $('#skPersonaName').value,
        title: $('#skPersonaTitle').value,
        birthday: $('#skPersonaBirthday').value,
        likes: $('#skPersonaLikes').value,
        bio: $('#skPersonaBio').value
      })
    });
    alert('制作人档案已更新，将自动注入所有角色对话！');
  };

  async function loadMemories() {
    try {
      const q = $('#skMemSearch').value.trim();
      const url = `/api/shinsekai/memories?idolId=${encodeURIComponent(currentIdolId)}${q ? '&q=' + encodeURIComponent(q) : ''}`;
      const r = await fetch(url);
      const d = await r.json();
      const box = $('#skMemList');
      box.innerHTML = '';
      for (const m of d.items || []) {
        const pct = Math.round((m.retention ?? 1) * 100);
        const div = document.createElement('div');
        div.className = 'sk-mem-item';
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--sk-muted);margin-bottom:4px;">
            <span>[${m.category}] 重要度 ${m.importance}/5 · 召回 ${m.recallCount || 0} 次</span>
            <span>保留率 ${pct}%</span>
          </div>
          <div style="font-size:13px;">${m.content}</div>
          <div class="sk-bar-track"><div class="sk-bar-fill" style="width:${pct}%"></div></div>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button type="button" class="sk-btn" data-rf="${m.id}" style="padding:3px 8px;font-size:11px;">强化记忆</button>
            <button type="button" class="sk-btn" data-del="${m.id}" style="padding:3px 8px;font-size:11px;color:#fda4af;">忘记</button>
          </div>`;
        div.querySelector('[data-rf]').onclick = async () => {
          await fetch('/api/shinsekai/memories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reinforceId: m.id }) });
          loadMemories();
        };
        div.querySelector('[data-del]').onclick = async () => {
          await fetch('/api/shinsekai/memories?id=' + encodeURIComponent(m.id), { method: 'DELETE' });
          loadMemories();
        };
        box.append(div);
      }
    } catch {}
  }

  $('#btnMemAdd').onclick = async () => {
    const content = $('#skMemInput').value.trim();
    if (!content) return;
    await fetch('/api/shinsekai/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idolId: currentIdolId, content, category: $('#skMemCat').value, importance: 4 })
    });
    $('#skMemInput').value = '';
    loadMemories();
  };
  $('#skMemSearch').oninput = () => loadMemories();

  async function loadWorldbooks() {
    try {
      const r = await fetch('/api/shinsekai/worldbooks');
      const d = await r.json();
      const box = $('#skWbList');
      box.innerHTML = '';
      for (const b of d.items || []) {
        const div = document.createElement('div');
        div.className = 'sk-mem-item';
        div.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;"><strong>${b.title}</strong><button class="sk-btn" style="padding:2px 8px;font-size:11px;">删除</button></div><small style="color:var(--sk-muted);">共 ${b.chunks?.length || 0} 个知识切片 · 绑定偶像 ${b.idolId}</small>`;
        div.querySelector('button').onclick = async () => {
          await fetch('/api/shinsekai/worldbooks?id=' + encodeURIComponent(b.id), { method: 'DELETE' });
          loadWorldbooks();
        };
        box.append(div);
      }
    } catch {}
  }

  $('#btnWbImportFile').onclick = () => $('#skWbFile').click();
  $('#skWbFile').onchange = async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    $('#skWbTitle').value = $('#skWbTitle').value || f.name.replace(/\.[^.]+$/, '');
    $('#skWbContent').value = await f.text();
  };
  $('#btnWbAdd').onclick = async () => {
    const title = $('#skWbTitle').value.trim() || '补充设定集';
    const content = $('#skWbContent').value.trim();
    if (!content) return;
    await fetch('/api/shinsekai/worldbooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, idolId: 'all' })
    });
    $('#skWbContent').value = '';
    loadWorldbooks();
  };

  // ── 4. Relations & Affinity ──
  async function loadRelations() {
    try {
      const r = await fetch('/api/shinsekai/relations');
      const d = await r.json();
      const map = d.relations || {};
      const grid = $('#skRelGrid');
      grid.innerHTML = '';
      for (const idol of IDOLS) {
        const rel = map[idol.id] || { affinity: 10, stage: '初识', note: '' };
        const pct = Math.max(0, Math.min(100, rel.affinity));
        const card = document.createElement('div');
        card.className = 'sk-rel-card';
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>${idol.name}</strong>
            <span style="font-size:12px;color:#f472b6;">♥ ${rel.affinity} · ${rel.stage}</span>
          </div>
          <small style="color:var(--sk-muted);">${idol.unit}</small>
          <div class="sk-bar-track"><div class="sk-bar-fill" style="width:${pct}%"></div></div>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button type="button" class="sk-btn" data-d="-5" style="padding:2px 8px;font-size:11px;">-5</button>
            <button type="button" class="sk-btn" data-d="5" style="padding:2px 8px;font-size:11px;">+5</button>
            <button type="button" class="sk-btn" data-go="${idol.id}" style="padding:2px 8px;font-size:11px;margin-left:auto;">去互动</button>
          </div>`;
        card.querySelectorAll('[data-d]').forEach(btn => {
          btn.onclick = async () => {
            await fetch('/api/shinsekai/relations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idolId: idol.id, delta: Number(btn.dataset.d) })
            });
            loadRelations();
            if (idol.id === currentIdolId) refreshAffinityBadge();
          };
        });
        card.querySelector('[data-go]').onclick = () => {
          elIdolSel.value = idol.id;
          elIdolSel.dispatchEvent(new Event('change'));
          $$('.sk-tab')[0].click();
        };
        grid.append(card);
      }
    } catch {}
  }
  $('#btnRelRefresh').onclick = loadRelations;

  // ── 5. LAN Mobile QR & Reminders ──
  // Minimal deterministic QR matrix fallback renderer (high contrast Finder Patterns + data modules)
  function drawSimpleQrPlaceholder(canvas, text) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    const n = 25, cell = Math.floor((size - 16) / n), off = 8;
    const drawFinder = (gx, gy) => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(off + gx * cell, off + gy * cell, 7 * cell, 7 * cell);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(off + (gx + 1) * cell, off + (gy + 1) * cell, 5 * cell, 5 * cell);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(off + (gx + 2) * cell, off + (gy + 2) * cell, 3 * cell, 3 * cell);
    };
    drawFinder(0, 0); drawFinder(n - 7, 0); drawFinder(0, n - 7);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    ctx.fillStyle = '#0f172a';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if ((x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8)) continue;
        hash ^= (x * 31 + y * 17);
        hash = Math.imul(hash, 16777619);
        if ((hash >>> 0) % 2 === 0) ctx.fillRect(off + x * cell, off + y * cell, cell, cell);
      }
    }
  }

  function syncLanUi(d) {
    const btn = $('#btnLanToggle');
    const box = $('#skLanBox');
    const copyBtn = $('#btnLanCopy');
    if (d.enabled && d.url) {
      btn.textContent = '🛑 关闭局域网伴聊';
      box.hidden = false;
      copyBtn.hidden = false;
      $('#skLanUrl').textContent = d.url;
      drawSimpleQrPlaceholder($('#skQrCanvas'), d.url);
    } else {
      btn.textContent = '🚀 开启局域网伴聊';
      box.hidden = true;
      copyBtn.hidden = true;
    }
  }

  async function loadLanInfo() {
    try {
      const r = await fetch('/api/shinsekai/lan-info');
      const d = await r.json();
      if (d.ok) syncLanUi(d);
    } catch {}
  }

  $('#btnLanToggle').onclick = async () => {
    const r = await fetch('/api/shinsekai/lan-toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await r.json();
    if (d.ok) syncLanUi(d);
  };
  $('#btnLanCopy').onclick = () => {
    navigator.clipboard?.writeText($('#skLanUrl').textContent || '');
    $('#btnLanCopy').textContent = '已复制 ✓';
    setTimeout(() => { $('#btnLanCopy').textContent = '复制链接'; }, 1500);
  };

  async function loadReminders() {
    try {
      const r = await fetch('/api/shinsekai/reminders');
      const d = await r.json();
      const box = $('#skRemList');
      box.innerHTML = '';
      for (const rem of d.items || []) {
        const div = document.createElement('div');
        div.className = 'sk-mem-item';
        div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
        div.innerHTML = `<span>⏰ <b>${rem.timeHHMM}</b> · ${rem.text}</span><button class="sk-btn" style="padding:2px 8px;font-size:11px;color:#fda4af;">删除</button>`;
        div.querySelector('button').onclick = async () => {
          await fetch('/api/shinsekai/reminders?id=' + encodeURIComponent(rem.id), { method: 'DELETE' });
          loadReminders();
        };
        box.append(div);
      }
    } catch {}
  }

  $('#btnSkRemAdd').onclick = async () => {
    const timeHHMM = $('#skRemTime').value;
    const text = $('#skRemText').value.trim();
    if (!timeHHMM || !text) return;
    await fetch('/api/shinsekai/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idolId: currentIdolId, timeHHMM, text, repeat: 'daily' })
    });
    $('#skRemText').value = '';
    loadReminders();
  };

  // Init
  fetch('/data/chibi-catalog.json')
    .then(r => (r.ok ? r.json() : []))
    .then(rows => { chibiCatalog = Array.isArray(rows) ? rows : []; loadStageModel(); })
    .catch(() => loadStageModel());
  refreshAffinityBadge();
  loadSessionChat();
  loadSavedStories();
  renderGraph();
})();
