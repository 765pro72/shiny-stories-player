/* ═══════════════════════════════════════════════════════════════════════════
   283 Windows Transparent Desktop Companion + Local TTS One-Click Slot
   Model weights are NOT bundled; connects on demand to user's local TTS server.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const IDOLS = [
    { id: 'nichika', name: '七草日花', unit: 'SHHis', color: '#10b981', voiceId: 'nichika', lines: ['プロデューサーさん、今日もお疲れ様です！', '制作人，刚才那段节奏没问题吧？我还能做得更好！', '休息时间也要记得喝水哦，制作人。', '……才、才不是专门在等你回来呢！'] },
    { id: 'mikoto', name: '绯田美琴', unit: 'SHHis', color: '#dc2626', voiceId: 'mikoto', lines: ['プロデューサー、次のレッスンの予定は？', '制作人，稍微休息一下吧。保持状态也是工作的一部分。', '无论何时，我都准备好登上舞台了。'] },
    { id: 'asahi', name: '芹泽朝日', unit: 'Straylight', color: '#f43f5e', voiceId: 'asahi', lines: ['プロデューサー、面白いこと見つけたっす！', '制作人！今天去哪边找有趣的东西呀？', '坐着不动会犯困的说，站起来伸个懒腰吧！'] },
    { id: 'fuyuko', name: '黛冬优子', unit: 'Straylight', color: '#10b981', voiceId: 'fuyuko', lines: ['プロデューサーさん、ふゆのことちゃんと見ててね♪', '哼，工作别太拼命了啦……不对，我是说要注意身体哦♪', '冬优子今天也是 100 分可爱吧？'] },
    { id: 'mei', name: '和泉爱依', unit: 'Straylight', color: '#ec4899', voiceId: 'mei', lines: ['プロデューサー、今日もテンション上げていこうぜ！', '制作人辛苦啦！要不要一起听会儿歌放松一下？', '有爱依在，今天也一定顺顺利利的！'] },
    { id: 'mano', name: '樱木真乃', unit: 'illumination STARS', color: '#f472b6', voiceId: 'mano', lines: ['プロデューサーさん、ほわっと一息つきましょう♪', '制作人，窗外的天空今天也很漂亮呢。', '只要大家在一起，一定能传达给更多人的！'] },
    { id: 'hiori', name: '风野灯织', unit: 'illumination STARS', color: '#38bdf8', voiceId: 'hiori', lines: ['プロデューサー、今日のスケジュールを確認します。', '制作人，如果累了的话，我可以去泡杯热茶。', '一步一步稳稳向前，就不会迷路。'] },
    { id: 'meguru', name: '八宫巡', unit: 'illumination STARS', color: '#facc15', voiceId: 'meguru', lines: ['プロデューサー！今日も元気いっぱいいくよー！', '制作人，笑一个嘛！精神瞬间就回来啦！'] },
    { id: 'kogane', name: '月冈恋钟', unit: "L'Antica", color: '#c084fc', voiceId: 'kogane', lines: ['プロデューサー！あたしに任せときー！', '制作人辛苦啦，要不要尝尝我新烤的点心？'] },
    { id: 'mamimi', name: '田中摩美美', unit: "L'Antica", color: '#a855f7', voiceId: 'mamimi', lines: ['プロデューサー、たまにはサボってもいいんじゃない？', '制作人一直盯着屏幕看，眼睛会累的哦。'] },
    { id: 'sakuya', name: '白濑咲耶', unit: "L'Antica", color: '#3b82f6', voiceId: 'sakuya', lines: ['プロデューサー、今日も素敵な一日にしよう。', '制作人，无论遇到什么困难，我都会在你身旁。'] },
    { id: 'yuika', name: '三峰结华', unit: "L'Antica", color: '#60a5fa', voiceId: 'yuika', lines: ['プロデューサー、ちょっと休憩タイムにしよっか〜', '制作人，今天的工作进度怎么样呀？'] },
    { id: 'kiriko', name: '幽谷雾子', unit: "L'Antica", color: '#cbd5e1', voiceId: 'kiriko', lines: ['プロデューサーさん、無理しないでくださいね……', '制作人，请记得深呼吸一下……'] },
    { id: 'kaho', name: '小宫果穗', unit: '放课后Climax Girls', color: '#ef4444', voiceId: 'kaho', lines: ['プロデューサーさん！今日もヒーローみたいに頑張ります！', '制作人！工作完成之后一起庆祝吧！'] },
    { id: 'chiyoko', name: '园田智代子', unit: '放课后Climax Girls', color: '#f472b6', voiceId: 'chiyoko', lines: ['プロデューサーさん、チョコ食べて元気出してくださいね！', '制作人，补充点糖分再继续吧！'] },
    { id: 'juri', name: '西城树里', unit: '放课后Climax Girls', color: '#f59e0b', voiceId: 'juri', lines: ['プロデューサー、あんま無理すんなよな。', '喂制作人，肩膀僵硬了吧？活动活动！'] },
    { id: 'rinze', name: '杜野凛世', unit: '放课后Climax Girls', color: '#0ea5e9', voiceId: 'rinze', lines: ['プロデューサーさま、いつもおそばにおります……。', '制作人大人，凛世会一直静静陪伴在您身旁。'] },
    { id: 'natsuha', name: '有栖川夏叶', unit: '放课后Climax Girls', color: '#22c55e', voiceId: 'natsuha', lines: ['プロデューサー、最高の成果を出しましょう！', '制作人，保持优雅与从容，效率会更高哦。'] },
    { id: 'amana', name: '大崎甘奈', unit: 'ALSTROEMERIA', color: '#ec4899', voiceId: 'amana', lines: ['プロデューサーさん、甘奈が応援してます☆', '制作人，今天也要开开心心的哦☆'] },
    { id: 'tenka', name: '大崎甜花', unit: 'ALSTROEMERIA', color: '#f9a8d4', voiceId: 'tenka', lines: ['プロデューサーさん……お疲れ様、にへへ……', '制作人，累了的话……可以休息一下哦……'] },
    { id: 'chiyuki', name: '桑山千雪', unit: 'ALSTROEMERIA', color: '#f8fafc', voiceId: 'chiyuki', lines: ['プロデューサーさん、温かい紅茶はいかがですか？', '制作人，放慢脚步看看周围，也会有新发现呢。'] },
    { id: 'toru', name: '浅仓透', unit: 'noctchill', color: '#38bdf8', voiceId: 'toru', lines: ['プロデューサー、なんか風気持ちいいね。', '制作人，发会儿呆其实也没什么不好吧。'] },
    { id: 'madoka', name: '樋口圆香', unit: 'noctchill', color: '#94a3b8', voiceId: 'madoka', lines: ['……プロデューサー、ちゃんと休憩取ってます？', '……制作人，别把身体搞垮了，我会很困扰的。'] },
    { id: 'koito', name: '福丸小糸', unit: 'noctchill', color: '#a78bfa', voiceId: 'koito', lines: ['プロデューサーさん、小糸ももっと頑張りますっ！', '制作人，今天也请多多指教！'] },
    { id: 'hinana', name: '市川雏菜', unit: 'noctchill', color: '#fde047', voiceId: 'hinana', lines: ['プロデューサー、しあわせ〜な一日にしようね！', '制作人，开心最重要啦〜！'] },
    { id: 'luca', name: '斑鸠路加', unit: 'CoMETIK', color: '#64748b', voiceId: 'luca', lines: ['……別に、あんたを見てたわけじゃない。', '……别太勉强自己了，麻烦死了。'] },
    { id: 'hana', name: '铃木羽那', unit: 'CoMETIK', color: '#f59e0b', voiceId: 'hana', lines: ['プロデューサーさん！今日も笑顔でいきましょー！', '制作人！羽那一直都在为你加油哦！'] },
    { id: 'haruki', name: '郁田春希', unit: 'CoMETIK', color: '#d97706', voiceId: 'haruki', lines: ['プロデューサーさん、今の光、すごく綺麗ですね。', '制作人，我想把今天的这份灵感画下来呢。'] }
  ];

  const CFG_KEY = 'shiny.companionConfig';
  const TTS_KEY = 'shiny.localTtsConfig';
  const AI_KEY = 'shiny.companionAiConfig';
  const CHAT_KEY = 'shiny.companionChatHistory';
  const MEMO_KEY = 'shiny.companionMemo';
  const NOW_PLAYING_KEY = 'shiny.nowPlaying';

  const readJson = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
    } catch { return { ...fallback }; }
  };

  const writeJson = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
    try { window.desktop?.saveState?.({ [key]: JSON.stringify(val) }); } catch {}
  };

  const cfg = readJson(CFG_KEY, { idolId: 'nichika', alwaysOnTop: true, hourlyChime: true });
  // Local TTS is OFF by default — user clicks "一键检测并接入" when their local server is running
  const ttsCfg = readJson(TTS_KEY, {
    enabled: false,
    baseUrl: 'http://127.0.0.1:8088',
    voice: 'nichika',
    emotion: '',
    apiKey: ''
  });
  const aiCfg = readJson(AI_KEY, { baseUrl: '', model: 'gpt-4o-mini', apiKey: '' });

  const $ = s => document.querySelector(s);
  const elIdolName = $('#cmpIdolName');
  const elIdolUnit = $('#cmpIdolUnit');
  const elTimeTag = $('#cmpTimeTag');
  const elOutfitTag = $('#cmpOutfitTag');
  const elTtsBadge = $('#cmpTtsBadge');
  const elBubbleText = $('#cmpBubbleText');
  const elMusicStrip = $('#cmpMusicStrip');
  const elMusicTitle = $('#cmpMusicTitle');
  const elStage = $('#cmpStage');
  const elAvatarFrame = $('#cmpAvatarFrame');
  const elSparkles = $('#cmpSparkleLayer');
  const elIdolDrawer = $('#cmpIdolDrawer');
  const elIdolGrid = $('#cmpIdolGrid');
  const elChatDrawer = $('#cmpChatDrawer');
  const elChatTitle = $('#cmpChatTitle');
  const elChatLog = $('#cmpChatLog');
  const elChatInput = $('#cmpChatInput');
  const elMemoDrawer = $('#cmpMemoDrawer');
  const elTodoInput = $('#cmpTodoInput');
  const elTodoList = $('#cmpTodoList');
  const elMemoTextarea = $('#cmpMemoTextarea');
  const elMemoSavedHint = $('#cmpMemoSavedHint');
  const elTtsDrawer = $('#cmpTtsDrawer');
  const elTtsBaseUrl = $('#ttsBaseUrl');
  const elTtsVoice = $('#ttsVoice');
  const elTtsVoiceList = $('#ttsVoiceList');
  const elTtsEmotion = $('#ttsEmotion');
  const elTtsApiKey = $('#ttsApiKey');
  const elTtsSampleText = $('#ttsSampleText');
  const elTtsStatus = $('#ttsStatusText');
  const elAiUrl = $('#aiApiUrl');
  const elAiModel = $('#aiApiModel');
  const elAiKey = $('#aiApiKey');
  const elAiPrompt = $('#aiQuickPrompt');

  let currentIdol = IDOLS.find(i => i.id === cfg.idolId) || IDOLS[0];
  let lineIdx = 0;
  let currentAudio = null;
  let lastChimedHourKey = '';

  function getTimeGreeting() {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return { tag: '早安 · 283 事务所', outfit: '🌅 晨间便服', text: '早安制作人！新的一天从 283 事务所开始吧！' };
    if (h >= 11 && h < 17) return { tag: '日间 · 排练时段', outfit: '☀ 演出排练服', text: '下午也要保持好状态，记得起身活动一下哦！' };
    if (h >= 17 && h < 21) return { tag: '傍晚 · 归途暮色', outfit: '🌇 暮色常服', text: '今天也辛苦啦制作人！晚上想听首歌还是看篇剧情？' };
    return { tag: '深夜 · 晚安守护', outfit: '🌙 夜间居家服', text: '已经很晚了哦制作人，早点休息明天会更有精神的。' };
  }

  function playSoftChime() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.14;
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.exponentialRampToValueAtTime(0.08, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.6);
      });
      setTimeout(() => { try { ctx.close(); } catch {} }, 1600);
    } catch {}
  }

  function checkHourlyChime() {
    const g = getTimeGreeting();
    if (elTimeTag) elTimeTag.textContent = g.tag;
    if (elOutfitTag) elOutfitTag.textContent = g.outfit;
    if (!cfg.hourlyChime) return;
    const now = new Date();
    if (now.getMinutes() !== 0) return;
    const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
    if (key === lastChimedHourKey) return;
    lastChimedHourKey = key;
    const hh = String(now.getHours()).padStart(2, '0');
    const msg = `现在是 ${hh}:00 整点报时！${g.text}`;
    elBubbleText.textContent = msg;
    playSoftChime();
    spawnSparkles(10);
    if (ttsCfg.enabled) speakText(msg);
  }

  function applyNowPlaying(state) {
    const playing = !!(state && state.playing && state.title);
    if (elStage) {
      elStage.classList.toggle('is-grooving', playing);
      const bpm = Number(state?.bpm) || 124;
      const dur = Math.max(0.32, Math.min(0.85, 60 / bpm)).toFixed(3);
      elStage.style.setProperty('--cmp-beat-dur', `${dur}s`);
    }
    if (elMusicStrip) elMusicStrip.hidden = !playing;
    if (elMusicTitle && playing) {
      elMusicTitle.textContent = `♪ ${state.title}${state.artist ? ' · ' + state.artist : ''}`;
    }
  }

  async function sendAiChat() {
    const prompt = String(elAiPrompt?.value || '').trim();
    if (!prompt) return;
    aiCfg.baseUrl = String(elAiUrl?.value || '').trim().replace(/\/+$/, '');
    aiCfg.model = String(elAiModel?.value || 'gpt-4o-mini').trim();
    aiCfg.apiKey = String(elAiKey?.value || '').trim();
    writeJson(AI_KEY, aiCfg);
    if (!aiCfg.baseUrl) {
      elTtsStatus.className = 'cmp-tts-status is-err';
      elTtsStatus.textContent = '请先填写 OpenAI 兼容的 Chat API Base URL。';
      return;
    }
    elBubbleText.textContent = `${currentIdol.name} 正在思考回复…`;
    elTtsDrawer.hidden = true;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (aiCfg.apiKey) headers.Authorization = `Bearer ${aiCfg.apiKey}`;
      const res = await fetch(`${aiCfg.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: aiCfg.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `你是《偶像大师 闪耀色彩》283事务所的偶像「${currentIdol.name}」（所属组合 ${currentIdol.unit}）。请用简短自然、符合角色口吻的一两句话回复制作人。` },
            { role: 'user', content: prompt }
          ],
          max_tokens: 120
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = String(data?.choices?.[0]?.message?.content || '').trim() || currentIdol.lines[0];
      elBubbleText.textContent = reply;
      if (elAiPrompt) elAiPrompt.value = '';
      spawnSparkles(8);
      if (ttsCfg.enabled) speakText(reply);
    } catch (err) {
      elBubbleText.textContent = `AI 接口暂未连通（${err.message}），已切回内置角色语录。`;
    }
  }

  function updateTtsBadge(speaking = false) {
    if (!elTtsBadge) return;
    if (speaking) {
      elTtsBadge.dataset.state = 'speaking';
      elTtsBadge.textContent = '🔊 语音朗读中…';
      elStage?.classList.add('is-speaking');
    } else if (ttsCfg.enabled) {
      elTtsBadge.dataset.state = 'connected';
      elTtsBadge.textContent = `● 已接入 ${ttsCfg.voice || '本机语音'}`;
      elStage?.classList.remove('is-speaking');
    } else {
      elTtsBadge.dataset.state = 'idle';
      elTtsBadge.textContent = '未接入语音模型';
      elStage?.classList.remove('is-speaking');
    }
  }

  function applyIdol(idol, greet = true) {
    currentIdol = idol;
    cfg.idolId = idol.id;
    writeJson(CFG_KEY, cfg);

    document.documentElement.style.setProperty('--cmp-accent', idol.color || '#38bdf8');
    elIdolName.textContent = idol.name;
    elIdolUnit.textContent = idol.unit;
    if (window.CharacterPortraits?.mount) {
      window.CharacterPortraits.mount(elAvatarFrame, idol.name);
    } else {
      elAvatarFrame.textContent = idol.name.slice(0, 1);
    }
    if (greet) {
      const g = getTimeGreeting();
      elTimeTag.textContent = g.tag;
      elBubbleText.textContent = idol.lines[0] || g.text;
    }
    elIdolGrid?.querySelectorAll('.cmp-idol-tile').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.idolId === idol.id);
    });
  }

  function spawnSparkles(count = 7) {
    const glyphs = ['✦', '★', '♪', '✨', '♡'];
    for (let i = 0; i < count; i++) {
      const sp = document.createElement('span');
      sp.className = 'cmp-spark';
      sp.textContent = glyphs[i % glyphs.length];
      sp.style.left = '50%';
      sp.style.top = '50%';
      sp.style.color = i % 2 === 0 ? currentIdol.color : '#f8fafc';
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = 54 + Math.random() * 44;
      sp.style.setProperty('--tx', `${Math.cos(ang) * dist}px`);
      sp.style.setProperty('--ty', `${Math.sin(ang) * dist - 18}px`);
      elSparkles.appendChild(sp);
      setTimeout(() => sp.remove(), 900);
    }
  }

  async function speakText(text) {
    const clean = String(text || '').trim();
    if (!clean) return;
    if (!ttsCfg.enabled) {
      elTtsDrawer.hidden = false;
      elTtsStatus.className = 'cmp-tts-status';
      elTtsStatus.textContent = '当前尚未接入本地语音模型。请先启动本机 api_server.py，再点下方「一键检测并接入」。';
      return;
    }
    if (currentAudio) {
      try { currentAudio.pause(); } catch {}
      currentAudio = null;
    }
    const base = String(ttsCfg.baseUrl || 'http://127.0.0.1:8088').replace(/\/+$/, '');
    const headers = { 'Content-Type': 'application/json' };
    if (ttsCfg.apiKey) headers.Authorization = `Bearer ${ttsCfg.apiKey}`;
    const payload = {
      model: 'irodori-tts',
      input: clean,
      voice: ttsCfg.voice || currentIdol.voiceId || 'nichika',
      response_format: 'wav'
    };
    if (ttsCfg.emotion) payload.emotion = ttsCfg.emotion;

    updateTtsBadge(true);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(`${base}/v1/audio/speech`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        updateTtsBadge(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        updateTtsBadge(false);
      };
      await audio.play();
    } catch (err) {
      updateTtsBadge(false);
      elTtsStatus.className = 'cmp-tts-status is-err';
      elTtsStatus.textContent = `语音合成未响应（${err.message}）。请确认本机语音服务已启动。`;
    }
  }

  async function probeAndConnectTts() {
    const base = String(elTtsBaseUrl.value || 'http://127.0.0.1:8088').trim().replace(/\/+$/, '');
    const apiKey = String(elTtsApiKey.value || '').trim();
    const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
    elTtsStatus.className = 'cmp-tts-status';
    elTtsStatus.textContent = `正在检测 ${base} …`;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      let ok = false;
      let voices = [];
      try {
        const vr = await fetch(`${base}/admin/voices`, { headers, signal: ctrl.signal });
        if (vr.ok) {
          ok = true;
          const vdata = await vr.json().catch(() => null);
          if (vdata && Array.isArray(vdata.voices)) {
            voices = vdata.voices.map(v => typeof v === 'string' ? v : (v.id || v.voice_id || v.name)).filter(Boolean);
          } else if (vdata && typeof vdata === 'object') {
            voices = Object.keys(vdata).filter(k => k !== 'ok' && k !== 'status');
          }
        }
      } catch {}
      if (!ok) {
        const sr = await fetch(`${base}/v1/models`, { headers, signal: ctrl.signal });
        if (sr.ok) ok = true;
      }
      clearTimeout(timer);
      if (!ok) throw new Error('服务未返回有效状态');

      if (voices.length && elTtsVoiceList) {
        elTtsVoiceList.innerHTML = voices.map(v => `<option value="${v}">${v}</option>`).join('');
      }
      ttsCfg.enabled = true;
      ttsCfg.baseUrl = base;
      ttsCfg.voice = String(elTtsVoice.value || voices[0] || currentIdol.voiceId || 'nichika').trim();
      ttsCfg.emotion = String(elTtsEmotion.value || '');
      ttsCfg.apiKey = apiKey;
      writeJson(TTS_KEY, ttsCfg);
      updateTtsBadge(false);
      elTtsStatus.className = 'cmp-tts-status is-ok';
      elTtsStatus.textContent = `接入成功！检测到 ${voices.length ? voices.length + ' 个本机声线' : '兼容语音服务'}，现在点击对话或「试听」即可发声。`;
      spawnSparkles(10);
    } catch (err) {
      ttsCfg.enabled = false;
      ttsCfg.baseUrl = base;
      ttsCfg.voice = String(elTtsVoice.value || 'nichika').trim();
      ttsCfg.emotion = String(elTtsEmotion.value || '');
      ttsCfg.apiKey = apiKey;
      writeJson(TTS_KEY, ttsCfg);
      updateTtsBadge(false);
      elTtsStatus.className = 'cmp-tts-status is-err';
      elTtsStatus.textContent = `未检测到运行中的本机服务（${base}）。请先运行本地语音模型的 api_server.py，再点一键接入。`;
    }
  }

  function renderIdolPicker() {
    elIdolGrid.innerHTML = '';
    for (const idol of IDOLS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cmp-idol-tile' + (idol.id === currentIdol.id ? ' active' : '');
      btn.dataset.idolId = idol.id;
      const pic = document.createElement('span');
      pic.className = 'cmp-idol-tile-pic';
      if (window.CharacterPortraits?.mount) window.CharacterPortraits.mount(pic, idol.name);
      const label = document.createElement('span');
      label.textContent = idol.name;
      btn.append(pic, label);
      btn.addEventListener('click', () => {
        applyIdol(idol, true);
        elIdolDrawer.hidden = true;
        spawnSparkles(8);
      });
      elIdolGrid.appendChild(btn);
    }
  }

  function nextLine() {
    lineIdx = (lineIdx + 1) % currentIdol.lines.length;
    const text = currentIdol.lines[lineIdx];
    elBubbleText.textContent = text;
    spawnSparkles(6);
    if (ttsCfg.enabled) speakText(text);
  }

  // Hydrate TTS & AI inputs from saved config (stays disconnected until user connects)
  elTtsBaseUrl.value = ttsCfg.baseUrl || 'http://127.0.0.1:8088';
  elTtsVoice.value = ttsCfg.voice || 'nichika';
  elTtsEmotion.value = ttsCfg.emotion || '';
  elTtsApiKey.value = ttsCfg.apiKey || '';
  if (elAiUrl) elAiUrl.value = aiCfg.baseUrl || '';
  if (elAiModel) elAiModel.value = aiCfg.model || 'gpt-4o-mini';
  if (elAiKey) elAiKey.value = aiCfg.apiKey || '';

  const btnHourlyChime = $('#btnHourlyChime');
  btnHourlyChime?.classList.toggle('active', cfg.hourlyChime !== false);
  btnHourlyChime?.addEventListener('click', () => {
    cfg.hourlyChime = !cfg.hourlyChime;
    writeJson(CFG_KEY, cfg);
    btnHourlyChime.classList.toggle('active', cfg.hourlyChime);
    btnHourlyChime.textContent = cfg.hourlyChime ? '🔔 整点报时' : '🔕 报时已关';
  });

  $('#btnAiSend')?.addEventListener('click', sendAiChat);
  elAiPrompt?.addEventListener('keydown', e => { if (e.key === 'Enter') sendAiChat(); });

  // Sync with Music Jukebox playing state (sway & groove to the beat!)
  try {
    const bc = new BroadcastChannel('shiny-companion-sync');
    bc.onmessage = ev => {
      if (ev?.data?.type === 'music-state') applyNowPlaying(ev.data.state);
    };
  } catch {}
  window.addEventListener('storage', e => {
    if (e.key === NOW_PLAYING_KEY) {
      try { applyNowPlaying(JSON.parse(e.newValue || 'null')); } catch {}
    }
  });
  try { applyNowPlaying(JSON.parse(localStorage.getItem(NOW_PLAYING_KEY) || 'null')); } catch {}

  // Wire controls
  const closeAllDrawers = () => {
    elIdolDrawer.hidden = true;
    elTtsDrawer.hidden = true;
    elMemoDrawer.hidden = true;
    elChatDrawer.hidden = true;
  };

  $('#btnAiChat')?.addEventListener('click', () => {
    const willOpen = elChatDrawer.hidden;
    closeAllDrawers();
    elChatDrawer.hidden = !willOpen;
    if (willOpen) {
      if (elChatTitle) elChatTitle.textContent = `💬 与${currentIdol.name}对话`;
      renderChatLog();
      elChatInput?.focus();
    }
  });

  $('#btnMemoPad')?.addEventListener('click', () => {
    const willOpen = elMemoDrawer.hidden;
    closeAllDrawers();
    elMemoDrawer.hidden = !willOpen;
    if (willOpen) elMemoTextarea?.focus();
  });

  $('#btnSwitchIdol')?.addEventListener('click', () => {
    const willOpen = elIdolDrawer.hidden;
    closeAllDrawers();
    elIdolDrawer.hidden = !willOpen;
  });

  $('#btnTtsSlot')?.addEventListener('click', () => {
    const willOpen = elTtsDrawer.hidden;
    closeAllDrawers();
    elTtsDrawer.hidden = !willOpen;
  });

  document.querySelectorAll('[data-close-drawer]').forEach(btn => {
    btn.addEventListener('click', closeAllDrawers);
  });

  // Fused Multi-Turn AI Assistant Chat inside Desktop Companion
  let chatHistory = [];
  try {
    const raw = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
    if (Array.isArray(raw)) chatHistory = raw.slice(-30);
  } catch {}
  const saveChat = () => writeJson(CHAT_KEY, chatHistory.slice(-30));
  const renderChatLog = () => {
    if (!elChatLog) return;
    elChatLog.innerHTML = '';
    if (!chatHistory.length) {
      const welcome = document.createElement('div');
      welcome.className = 'cmp-msg assistant';
      welcome.innerHTML = `<small>${currentIdol.name}</small>制作人好呀！这里已经融合了小偶像对话助手，直接发消息就能聊天；点右上角 ⚙ 可配置你的 AI API 或一键接入本机语音模型。`;
      elChatLog.append(welcome);
      return;
    }
    for (const m of chatHistory) {
      const div = document.createElement('div');
      div.className = 'cmp-msg ' + (m.role === 'user' ? 'user' : 'assistant');
      if (m.role === 'assistant') {
        div.innerHTML = `<small>${m.who || currentIdol.name}</small>`;
        div.append(document.createTextNode(m.text));
        div.title = '点击朗读本句（需已接入本机语音）';
        div.addEventListener('click', () => { if (ttsCfg.enabled) speakText(m.text); });
      } else {
        div.textContent = m.text;
      }
      elChatLog.append(div);
    }
    elChatLog.scrollTop = elChatLog.scrollHeight;
  };
  const sendFusedChat = async () => {
    const prompt = String(elChatInput?.value || '').trim();
    if (!prompt) return;
    elChatInput.value = '';
    chatHistory.push({ role: 'user', text: prompt });
    saveChat();
    renderChatLog();

    const base = String(aiCfg.baseUrl || elAiUrl?.value || '').trim().replace(/\/+$/, '');
    let reply = '';
    if (base) {
      try {
        const headers = { 'Content-Type': 'application/json' };
        const key = String(aiCfg.apiKey || elAiKey?.value || '').trim();
        if (key) headers.Authorization = `Bearer ${key}`;
        const msgs = [
          { role: 'system', content: `你是《偶像大师 闪耀色彩》283事务所的偶像「${currentIdol.name}」（所属组合 ${currentIdol.unit}）。请用自然、贴合角色性格的中文简短回复制作人。` },
          ...chatHistory.slice(-8).map(m => ({ role: m.role, content: m.text }))
        ];
        const res = await fetch(`${base}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ model: aiCfg.model || elAiModel?.value || 'gpt-4o-mini', messages: msgs, max_tokens: 180 })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        reply = String(data?.choices?.[0]?.message?.content || '').trim();
      } catch (err) {
        reply = `外部 AI 接口暂未连通（${err.message}）。你可以点右上角 ⚙ 检查接口地址，或先和我用内置语音互动哦！`;
      }
    } else {
      // Friendly offline/unconfigured idol reply + guide to ⚙
      const line = currentIdol.lines[Math.floor(Math.random() * currentIdol.lines.length)];
      reply = `${line}（提示：点击右上角 ⚙ 填入任意 OpenAI 兼容 API 后，我就能和你自由多轮聊天啦！）`;
    }
    chatHistory.push({ role: 'assistant', who: currentIdol.name, text: reply });
    saveChat();
    renderChatLog();
    elBubbleText.textContent = reply;
    spawnSparkles(6);
    if (ttsCfg.enabled) speakText(reply);
  };
  $('#btnChatSend')?.addEventListener('click', sendFusedChat);
  elChatInput?.addEventListener('keydown', e => { if (e.key === 'Enter') sendFusedChat(); });
  $('#btnChatClear')?.addEventListener('click', () => { chatHistory = []; saveChat(); renderChatLog(); });
  $('#btnChatConfig')?.addEventListener('click', () => { closeAllDrawers(); elTtsDrawer.hidden = false; });

  // Producer Desktop Sticky Notepad & Todo Runtime
  const memoState = readJson(MEMO_KEY, { text: '', todos: [] });
  if (!Array.isArray(memoState.todos)) memoState.todos = [];
  const saveMemo = () => {
    writeJson(MEMO_KEY, memoState);
    if (elMemoSavedHint) {
      const t = new Date();
      elMemoSavedHint.textContent = `已自动保存 · ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
    }
  };
  const renderTodos = () => {
    if (!elTodoList) return;
    elTodoList.innerHTML = '';
    memoState.todos.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = 'cmp-todo-item' + (item.done ? ' done' : '');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!item.done;
      cb.addEventListener('change', () => {
        item.done = cb.checked;
        saveMemo();
        renderTodos();
        if (item.done) spawnSparkles(6);
      });
      const sp = document.createElement('span');
      sp.textContent = item.text;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'cmp-todo-del';
      del.textContent = '×';
      del.addEventListener('click', () => {
        memoState.todos.splice(idx, 1);
        saveMemo();
        renderTodos();
      });
      li.append(cb, sp, del);
      elTodoList.append(li);
    });
  };
  const addTodo = () => {
    const txt = String(elTodoInput?.value || '').trim();
    if (!txt) return;
    memoState.todos.unshift({ text: txt, done: false });
    elTodoInput.value = '';
    saveMemo();
    renderTodos();
  };
  if (elMemoTextarea) {
    elMemoTextarea.value = memoState.text || '';
    let memoTimer = 0;
    elMemoTextarea.addEventListener('input', () => {
      memoState.text = elMemoTextarea.value;
      clearTimeout(memoTimer);
      memoTimer = setTimeout(saveMemo, 220);
    });
  }
  $('#btnAddTodo')?.addEventListener('click', addTodo);
  elTodoInput?.addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
  $('#btnClearDoneTodos')?.addEventListener('click', () => {
    memoState.todos = memoState.todos.filter(x => !x.done);
    saveMemo();
    renderTodos();
  });
  $('#btnExportMemo')?.addEventListener('click', () => {
    const todoLines = memoState.todos.map(x => `${x.done ? '[x]' : '[ ]'} ${x.text}`).join('\n');
    const content = `=== 283 制作人桌面记事本 ===\n\n${todoLines ? '【待办清单】\n' + todoLines + '\n\n' : ''}【备忘录】\n${memoState.text || ''}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `283-memo-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  renderTodos();

  const btnPinTop = $('#btnPinTop');
  btnPinTop?.classList.toggle('active', cfg.alwaysOnTop !== false);
  btnPinTop?.addEventListener('click', async () => {
    cfg.alwaysOnTop = !cfg.alwaysOnTop;
    writeJson(CFG_KEY, cfg);
    btnPinTop.classList.toggle('active', cfg.alwaysOnTop);
    btnPinTop.title = cfg.alwaysOnTop ? '窗口置顶：开' : '窗口置顶：关';
    try { await window.desktop?.setCompanionAlwaysOnTop?.(cfg.alwaysOnTop); } catch {}
  });

  $('#btnCloseCompanion')?.addEventListener('click', () => {
    if (window.desktop?.closeCompanion) window.desktop.closeCompanion();
    else window.close();
  });

  $('#cmpAvatarBtn')?.addEventListener('click', nextLine);
  $('#btnNextLine')?.addEventListener('click', nextLine);
  $('#btnSpeakNow')?.addEventListener('click', () => speakText(elBubbleText.textContent));

  document.querySelectorAll('.cmp-preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      elTtsBaseUrl.value = chip.dataset.url || 'http://127.0.0.1:8088';
      elTtsVoice.value = chip.dataset.voice || 'nichika';
    });
  });

  $('#btnTtsConnect')?.addEventListener('click', probeAndConnectTts);
  $('#btnTtsTest')?.addEventListener('click', () => {
    ttsCfg.baseUrl = String(elTtsBaseUrl.value || 'http://127.0.0.1:8088').trim().replace(/\/+$/, '');
    ttsCfg.voice = String(elTtsVoice.value || 'nichika').trim();
    ttsCfg.emotion = String(elTtsEmotion.value || '');
    ttsCfg.apiKey = String(elTtsApiKey.value || '').trim();
    speakText(elTtsSampleText.value || elBubbleText.textContent);
  });
  $('#btnTtsDisconnect')?.addEventListener('click', () => {
    ttsCfg.enabled = false;
    writeJson(TTS_KEY, ttsCfg);
    updateTtsBadge(false);
    elTtsStatus.className = 'cmp-tts-status';
    elTtsStatus.textContent = '已断开本地语音模型接入，配置已保留。';
  });

  // Periodic time-of-day & hourly chime check every 15s
  setInterval(checkHourlyChime, 15000);

  renderIdolPicker();
  applyIdol(currentIdol, true);
  checkHourlyChime();
  updateTtsBadge(false);
})();
