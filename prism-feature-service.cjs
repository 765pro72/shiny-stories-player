'use strict';
const fs = require('fs');
const path = require('path');

function normalizeScriptLine(s) {
  return String(s || '')
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .trim();
}

function flattenScriptLine(s) {
  return normalizeScriptLine(s).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

function createPrismFeatureService({ base, dataRoot }) {
  let corpusCache = null; // [{ key, title, idol, group, category, rows: [{ name, text, trans, id }] }]
  let catalogByKey = null;
  let addressMatrixCache = null;

  function ensureCorpus() {
    if (corpusCache) return corpusCache;
    const dRoot = (typeof dataRoot === 'function' ? dataRoot() : dataRoot) || (base ? path.join(base, 'data') : path.resolve('./data'));
    const catPath = fs.existsSync(path.join(dRoot, 'catalog.json'))
      ? path.join(dRoot, 'catalog.json')
      : path.join(base, 'data/catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catPath, 'utf8'));
    catalogByKey = new Map(catalog.map(s => [s.key, s]));
    const transRoot = fs.existsSync(path.join(dRoot, 'translations'))
      ? path.join(dRoot, 'translations')
      : path.join(base, 'data/translations');

    const list = [];
    for (const s of catalog) {
      const fp = path.join(transRoot, s.key);
      if (!fs.existsSync(fp)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
        const rows = Array.isArray(raw.rows) ? raw.rows : (Array.isArray(raw) ? raw : []);
        if (!rows.length) continue;
        list.push({
          key: s.key,
          title: s.title || '',
          idol: s.idol || '',
          group: s.group || '',
          category: s.category || '',
          rows: rows.map(r => ({
            id: r.id || '',
            name: String(r.name || r.speaker || '').trim(),
            text: normalizeScriptLine(r.text || r.original || ''),
            trans: normalizeScriptLine(r.trans || r.translation || '')
          }))
        });
      } catch {}
    }
    corpusCache = list;
    return corpusCache;
  }

  function searchDialogues(query, speakerFilter = '', limit = 60, offset = 0) {
    const t0 = Date.now();
    const q = String(query || '').trim().toLowerCase();
    const spk = String(speakerFilter || '').trim().toLowerCase();
    if (!q && !spk) return { ok: true, tookMs: 0, total: 0, offset: 0, limit, hits: [] };

    const corpus = ensureCorpus();
    const terms = q.split(/\s+/).filter(Boolean);
    const hits = [];
    let total = 0;

    for (const doc of corpus) {
      const rows = doc.rows;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (spk && !r.name.toLowerCase().includes(spk) && !doc.idol.toLowerCase().includes(spk)) continue;
        if (terms.length) {
          const hay = `${r.trans}\n${r.text}\n${r.name}`.toLowerCase();
          let allMatch = true;
          for (let t = 0; t < terms.length; t++) {
            if (!hay.includes(terms[t])) { allMatch = false; break; }
          }
          if (!allMatch) continue;
        }
        if (total >= offset && hits.length < limit) {
          const prev = i > 0 ? rows[i - 1] : null;
          const next = i + 1 < rows.length ? rows[i + 1] : null;
          hits.push({
            key: doc.key,
            title: doc.title,
            idol: doc.idol,
            group: doc.group,
            category: doc.category,
            lineIndex: i,
            lineId: r.id,
            speaker: r.name || doc.idol || '旁白',
            text: r.text,
            trans: r.trans,
            prev: prev ? { speaker: prev.name, text: flattenScriptLine(prev.trans || prev.text) } : null,
            next: next ? { speaker: next.name, text: flattenScriptLine(next.trans || next.text) } : null
          });
        }
        total++;
      }
    }
    return { ok: true, tookMs: Date.now() - t0, total, offset, limit, hits };
  }

  function getIdolInteractions(idolFilter = '', mode = 'chain', searchFilter = '', kindFilter = '') {
    const corpus = ensureCorpus();
    const qIdol = String(idolFilter || '').trim();
    const qText = String(searchFilter || '').trim().toLowerCase();
    const qKind = String(kindFilter || '').trim();

    if (mode === '1v1') {
      // Aggregate Morning (晨间问候), Promise (约定), Audition (试镜前), Cheers (应援) into a continuous 1v1 collection
      const episodes = [];
      for (const doc of corpus) {
        const is1v1 = doc.group === 'Morning'
          || /promise|audition|cheer|judge/i.test(doc.key)
          || /^(Morning|Audition|Promise)$/i.test(doc.group);
        if (!is1v1) continue;
        if (qIdol && doc.idol !== qIdol && !doc.rows.some(r => r.name.includes(qIdol))) continue;
        const kindLabel = doc.group === 'Morning' ? '☀ 晨间 1v1 问候'
          : /audition/i.test(doc.key) ? '🎤 试镜前 1v1 鼓劲'
          : /promise/i.test(doc.key) ? '🤝 制作人约定互动'
          : '💬 育成 1v1 互动';
        if (qKind && !kindLabel.includes(qKind)) continue;

        const filteredRows = doc.rows.filter(r => r.text || r.trans);
        if (qText) {
          const match = doc.title.toLowerCase().includes(qText) ||
            filteredRows.some(r => (r.text + '\n' + r.trans).toLowerCase().includes(qText));
          if (!match) continue;
        }

        episodes.push({
          key: doc.key,
          idol: doc.idol,
          kind: kindLabel,
          title: doc.title,
          lines: filteredRows.slice(0, 24)
        });
        if (episodes.length >= 80) break;
      }
      return { ok: true, mode: '1v1', count: episodes.length, episodes };
    }

    // mode === 'chain': Combine 283 Chain group chats (home-conversations + business_unit) & Phone/Mypage calls
    const threads = [];
    try {
      const convPath = path.join(base, 'data/home-conversations.json');
      if (fs.existsSync(convPath)) {
        const convs = JSON.parse(fs.readFileSync(convPath, 'utf8'));
        for (const c of convs) {
          const seq = Array.isArray(c.sequence) ? c.sequence : [];
          if (!seq.length) continue;
          const speakers = [...new Set(seq.map(l => String(l.speaker || l.characterName || '').trim()).filter(Boolean))];
          if (qIdol && !speakers.some(s => s.includes(qIdol))) continue;

          if (qText) {
            const match = seq.some(l => (String(l.text || l.original || '') + '\n' + String(l.trans || l.translation || '')).toLowerCase().includes(qText));
            if (!match) continue;
          }

          threads.push({
            id: 'hc_' + c.id,
            kind: speakers.length > 2 ? '📱 283 Chain 组合群聊' : '📱 283 Chain 双人私聊',
            title: speakers.join(' × ') || ('283 事务所群聊 #' + c.id),
            participants: speakers,
            lines: seq.map(l => ({
              speaker: l.speaker || l.characterName || '偶像',
              text: normalizeScriptLine(l.original || l.text || ''),
              trans: normalizeScriptLine(l.translation || l.trans || ''),
              voice: l.path ? '/asset/' + l.path : ''
            }))
          });
          if (threads.length >= 60) break;
        }
      }
    } catch {}

    // Add business_unit_communication & mypage phone/talk scripts
    for (const doc of corpus) {
      if (!doc.key.startsWith('business_unit_communication/') && !doc.key.startsWith('mypage_communications/')) continue;
      if (qIdol && doc.idol !== qIdol && !doc.rows.some(r => r.name.includes(qIdol))) continue;
      const filteredRows = doc.rows.filter(r => r.text || r.trans);
      if (qText) {
        const match = doc.title.toLowerCase().includes(qText) ||
          filteredRows.some(r => (r.text + '\n' + r.trans).toLowerCase().includes(qText));
        if (!match) continue;
      }
      const speakers = [...new Set(doc.rows.map(r => r.name).filter(Boolean))];
      threads.push({
        id: doc.key,
        storyKey: doc.key,
        kind: doc.key.startsWith('business_unit') ? '💼 283 偶像营业现场对谈' : '📞 制作人来电与大厅寄语',
        title: doc.title || (speakers.join(' × ') + ' 对谈'),
        participants: speakers,
        lines: filteredRows.map(r => ({
          speaker: r.name || doc.idol || '偶像',
          text: r.text || '',
          trans: r.trans || '',
          voice: ''
        }))
      });
      if (threads.length >= 80) break;
    }
    return { ok: true, mode: 'chain', count: threads.length, threads };
  }

  function getAddressMatrix() {
    if (addressMatrixCache) return addressMatrixCache;
    let wikiData = { addresses: [] };
    let evidenceData = { entries: [] };
    let langData = { characters: {} };
    try { wikiData = require('./public/story-character-addresses.js'); } catch {}
    try {
      const ep = path.join(base, 'data/story-character-address-evidence.json');
      if (fs.existsSync(ep)) evidenceData = JSON.parse(fs.readFileSync(ep, 'utf8'));
    } catch {}
    try {
      const lp = path.join(base, 'data/story-character-language-evidence.json');
      if (fs.existsSync(lp)) langData = JSON.parse(fs.readFileSync(lp, 'utf8'));
    } catch {}

    ensureCorpus();
    const evidenceWithTitles = (evidenceData.entries || []).map(e => {
      const s = catalogByKey?.get(e.key);
      return {
        ...e,
        text: e.text ? normalizeScriptLine(e.text) : e.text,
        storyTitle: s ? `${s.group ? s.group + ' · ' : ''}${s.title}` : e.key
      };
    });

    addressMatrixCache = {
      ok: true,
      addresses: wikiData.addresses || [],
      evidence: evidenceWithTitles,
      language: langData.characters || langData
    };
    return addressMatrixCache;
  }

  function getMorningGreeting(idolFilter = '') {
    const dRoot = (typeof dataRoot === 'function' ? dataRoot() : dataRoot) || (base ? path.join(base, 'data') : path.resolve('./data'));
    const catPath = fs.existsSync(path.join(dRoot, 'catalog.json'))
      ? path.join(dRoot, 'catalog.json')
      : path.join(base, 'data/catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catPath, 'utf8'));
    const qIdol = String(idolFilter || '').trim();
    let morningScripts = catalog.filter(c => c.group === 'Morning' && c.translated);
    if (qIdol) {
      const match = morningScripts.filter(s => s.idol === qIdol || s.idol.includes(qIdol));
      if (match.length) morningScripts = match;
    }
    if (!morningScripts.length) return { ok: false, error: 'No morning scripts found' };

    const pick = morningScripts[Math.floor(Math.random() * morningScripts.length)];
    const commId = pick.key.replace(/^produce_communications\//, '').replace(/\.json$/, '');
    const transRoot = fs.existsSync(path.join(dRoot, 'translations'))
      ? path.join(dRoot, 'translations')
      : path.join(base, 'data/translations');
    const fp = path.join(transRoot, pick.key);
    const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const rows = raw.rows || [];
    const selectIdxs = [];
    rows.forEach((r, i) => { if (r.id === 'select') selectIdxs.push(i); });
    if (selectIdxs.length !== 3) return { ok: false, error: 'Malformed script' };

    const openingRows = rows.slice(0, selectIdxs[0]);
    const choiceRows = rows.slice(selectIdxs[0], selectIdxs[2] + 1);
    const reactionRows = rows.slice(selectIdxs[2] + 1);

    const branches = [[], [], []];
    let curBranch = 0;
    for (const r of reactionRows) {
      branches[curBranch].push(r);
      if (/（よし|楽しく話せた|完璧|手応え|バッチリ）/i.test(r.text) || /（まぁ、普通|普通に話せた|悪くは）/i.test(r.text) || /（うっ……|しまった|微妙|失敗）/i.test(r.text)) {
        if (curBranch < 2) curBranch++;
      }
    }

    const choices = choiceRows.map((c, i) => {
      const branch = branches[i] || [];
      const producerComment = branch.find(r => r.name === 'プロデューサー' || /（/.test(r.text))?.trans || '';
      const idolLines = branch.filter(r => r.name !== 'プロデューサー' && !/（/.test(r.text));
      return {
        id: 'c_' + i,
        text: (c.trans || c.text).replace(/\\n/g, ' '),
        original: (c.text || '').replace(/\\n/g, ' '),
        grade: i === 0 ? 'Perfect' : (i === 1 ? 'Good' : 'Normal'),
        producerComment: producerComment.replace(/\\n/g, ' '),
        idolLines: idolLines.map(l => ({
          speaker: l.name || pick.idol,
          trans: (l.trans || l.text).replace(/\\n/g, ' '),
          text: (l.text || '').replace(/\\n/g, ' '),
          voice: (l.id && l.id.startsWith(commId)) ? `/asset/sounds/voice/events/produce_communications/${commId}/${l.id}.m4a` : ''
        }))
      };
    });

    const shuffledChoices = choices.map(v => ({ v, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(x => x.v);

    return {
      ok: true,
      idol: pick.idol,
      title: pick.title,
      key: pick.key,
      commId,
      opening: {
        producer: (openingRows.find(r => r.name === 'プロデューサー')?.trans || '').replace(/\\n/g, ' '),
        idolLines: openingRows.filter(r => r.name !== 'プロデューサー').map(l => ({
          speaker: l.name || pick.idol,
          trans: (l.trans || l.text).replace(/\\n/g, ' '),
          text: (l.text || '').replace(/\\n/g, ' '),
          voice: (l.id && l.id.startsWith(commId)) ? `/asset/sounds/voice/events/produce_communications/${commId}/${l.id}.m4a` : ''
        }))
      },
      choices: shuffledChoices
    };
  }

  let allDossiersCache = null;

  const DOSSIER_IDOLS = [
    { id: '1', name: '樱木真乃', unit: 'illumination STARS', color: '#f472b6', aliases: ['桜木真乃', '真乃', 'まの'] },
    { id: '2', name: '风野灯织', unit: 'illumination STARS', color: '#38bdf8', aliases: ['風野灯織', '灯织', '灯織', 'ひおり'] },
    { id: '3', name: '八宫巡', unit: 'illumination STARS', color: '#facc15', aliases: ['八宮めぐる', '巡', 'めぐる'] },
    { id: '4', name: '月冈恋钟', unit: "L'Antica", color: '#c084fc', aliases: ['月岡恋鐘', '恋钟', '恋鐘', 'こがね'] },
    { id: '5', name: '田中摩美美', unit: "L'Antica", color: '#a855f7', aliases: ['摩美美', 'まみみ'] },
    { id: '6', name: '白濑咲耶', unit: "L'Antica", color: '#3b82f6', aliases: ['白瀬咲耶', '咲耶', 'さくや'] },
    { id: '7', name: '三峰结华', unit: "L'Antica", color: '#60a5fa', aliases: ['三峰結華', '结华', '結華', 'ゆいか'] },
    { id: '8', name: '幽谷雾子', unit: "L'Antica", color: '#94a3b8', aliases: ['幽谷霧子', '雾子', '霧子', 'きりこ'] },
    { id: '9', name: '小宫果穗', unit: '放课后Climax Girls', color: '#ef4444', aliases: ['小宮果穂', '果穗', '果穂', 'かほ'] },
    { id: '10', name: '园田智代子', unit: '放课后Climax Girls', color: '#f472b6', aliases: ['園田智代子', '智代子', 'ちょこ'] },
    { id: '11', name: '西城树里', unit: '放课后Climax Girls', color: '#f59e0b', aliases: ['西城樹里', '树里', '樹里', 'じゅり'] },
    { id: '12', name: '杜野凛世', unit: '放课后Climax Girls', color: '#0ea5e9', aliases: ['杜野凜世', '凛世', '凜世', 'りんぜ'] },
    { id: '13', name: '有栖川夏叶', unit: '放课后Climax Girls', color: '#22c55e', aliases: ['夏叶', '夏葉', 'なつは'] },
    { id: '14', name: '大崎甘奈', unit: 'ALSTROEMERIA', color: '#ec4899', aliases: ['甘奈', 'あまな'] },
    { id: '15', name: '大崎甜花', unit: 'ALSTROEMERIA', color: '#f9a8d4', aliases: ['甜花', 'てんか'] },
    { id: '16', name: '桑山千雪', unit: 'ALSTROEMERIA', color: '#e2e8f0', aliases: ['千雪', 'ちゆき'] },
    { id: '17', name: '芹泽朝日', unit: 'Straylight', color: '#f43f5e', aliases: ['芹澤あさひ', '朝日', 'あさひ'] },
    { id: '18', name: '黛冬优子', unit: 'Straylight', color: '#10b981', aliases: ['黛冬優子', '冬优子', '冬優子', 'ふゆこ'] },
    { id: '19', name: '和泉爱依', unit: 'Straylight', color: '#ec4899', aliases: ['和泉愛依', '爱依', '愛依', 'めい'] },
    { id: '20', name: '浅仓透', unit: 'noctchill', color: '#38bdf8', aliases: ['淺倉透', '浅倉透', '透', 'とおる'] },
    { id: '21', name: '樋口圆香', unit: 'noctchill', color: '#94a3b8', aliases: ['樋口円香', '圆香', '円香', 'まどか'] },
    { id: '22', name: '福丸小糸', unit: 'noctchill', color: '#a78bfa', aliases: ['小糸', 'こいと'] },
    { id: '23', name: '市川雏菜', unit: 'noctchill', color: '#fde047', aliases: ['市川雛菜', '雏菜', '雛菜', 'ひなな'] },
    { id: '24', name: '七草日花', unit: 'SHHis', color: '#10b981', aliases: ['七草にちか', '日花', 'にちか'] },
    { id: '25', name: '绯田美琴', unit: 'SHHis', color: '#dc2626', aliases: ['緋田美琴', '美琴', 'みこと'] },
    { id: '26', name: '斑鸠路加', unit: 'CoMETIK', color: '#94a3b8', aliases: ['斑鳩ルカ', '路加', 'ルカ'] },
    { id: '27', name: '铃木羽那', unit: 'CoMETIK', color: '#f59e0b', aliases: ['鈴木羽那', '羽那', 'はな'] },
    { id: '28', name: '郁田春希', unit: 'CoMETIK', color: '#d97706', aliases: ['郁田はるき', '春希', 'はるき'] }
  ];

  const SPEAKER_TO_CANONICAL = new Map();
  const IDOL_META_BY_NAME = new Map();
  for (const item of DOSSIER_IDOLS) {
    IDOL_META_BY_NAME.set(item.name, item);
    SPEAKER_TO_CANONICAL.set(item.name, item.name);
    for (const a of item.aliases) SPEAKER_TO_CANONICAL.set(a, item.name);
  }

  function resolveCanonicalIdol(rawName) {
    const s = String(rawName || '').trim().replace(/[（(].*?[）)]/g, '').trim();
    if (!s) return '';
    if (SPEAKER_TO_CANONICAL.has(s)) return SPEAKER_TO_CANONICAL.get(s);
    for (const [alias, canon] of SPEAKER_TO_CANONICAL.entries()) {
      if (alias.length >= 2 && (s === alias || s.includes(alias))) return canon;
    }
    return '';
  }

  const ZH_STOP = new Set([
    '制作人', '什么', '这个', '那个', '没有', '可以', '因为', '所以', '觉得', '知道',
    '这样', '一下', '已经', '就是', '不是', '还是', '真的', '好像', '应该', '的话',
    '时候', '今天', '现在', '大家', '我们', '你们', '他们', '自己', '这里', '那里',
    '怎么', '为什么', '一点', '如果', '但是', '不过', '然后', '虽然', '而且', '或者',
    '非常', '比较', '其实', '确实', '果然', '原来', '只是', '一直', '一起', '开始',
    '感觉', '样子', '东西', '事情', '地方', '问题', '时间', '不会', '不能', '不要',
    '这么', '那么', '有点', '稍微', '稍微', '稍微', '那个', '嗯嗯', '哈哈', '啊啊',
    '呜呜', '诶嘿', '好的', '是的', '对吧', '是吗', '好吧', '行吧', '没事', '没关',
    '关系', '谢谢', '抱歉', '对不起', '辛苦', '加油', '大家', '明天', '昨天', '刚才',
    '之后', '之前', '以后', '以前', '里面', '外面', '上面', '下面', '旁边', '前面',
    '后面', '出来', '进去', '回来', '过去', '起来', '下去', '过来', '看见', '听到',
    '说话', '告诉', '觉得', '认为', '希望', '想要', '准备', '决定', '继续', '结束'
  ]);

  function ensureAllDossiers() {
    if (allDossiersCache) return allDossiersCache;
    const corpus = ensureCorpus();
    const stats = new Map();
    for (const item of DOSSIER_IDOLS) {
      stats.set(item.name, {
        idol: item.name,
        id: item.id,
        unit: item.unit,
        color: item.color,
        totalStories: 0,
        starringStories: 0,
        choiceStories: 0,
        totalLines: 0,
        translatedLines: 0,
        charSum: 0,
        categories: new Map(),
        partners: new Map(), // partnerName -> { count, samples: [] }
        wordCounts: new Map(),
        highlights: [] // { score, key, title, category, lineIndex, lineId, trans, text }
      });
    }

    const globalWordIdols = new Map(); // word -> Set(idolName)
    const zhSegRe = /[\u4e00-\u9fff]{2,4}/g;
    const jpCatchRe = /[ァ-ヶー]{3,8}|ほわ+っ?|ふふっ?|だっちょ|ばり|あんた|プロデューサー|お姉ちゃん|やばい|すごー?い|えへへ|うふふ|わーい|にゃー?/g;

    for (const doc of corpus) {
      const speakersInDoc = new Set();
      let hasSelect = false;
      const docCanon = resolveCanonicalIdol(doc.idol);
      const bestQuoteByIdol = new Map();

      for (let i = 0; i < doc.rows.length; i++) {
        const r = doc.rows[i];
        if (r.id === 'select') { hasSelect = true; continue; }
        const canon = resolveCanonicalIdol(r.name);
        if (!canon) continue;
        const st = stats.get(canon);
        if (!st) continue;
        speakersInDoc.add(canon);
        st.totalLines++;

        const cleanTrans = (r.trans || '').replace(/\\n|\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        const cleanText = (r.text || '').replace(/\\n|\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanTrans) {
          st.translatedLines++;
          st.charSum += cleanTrans.length;

          // Word cloud extraction from Chinese translation (clean 2-4 char chunks split by punctuation)
          const chunks = cleanTrans.split(/[，。！？…—、：「」『』（）()\s,.!?\-~～]+/);
          for (const ch of chunks) {
            if (ch.length >= 2 && ch.length <= 4 && /^[\u4e00-\u9fff]+$/.test(ch) && !ZH_STOP.has(ch) && !ch.startsWith('制作人')) {
              st.wordCounts.set(ch, (st.wordCounts.get(ch) || 0) + 1);
            } else if (ch.length > 4) {
              const matches = ch.match(zhSegRe);
              if (matches) {
                for (let m = 0; m < Math.min(3, matches.length); m++) {
                  const w = matches[m];
                  if (!ZH_STOP.has(w) && !w.startsWith('制作人')) st.wordCounts.set(w, (st.wordCounts.get(w) || 0) + 1);
                }
              }
            }
          }

          // Highlight quote scoring
          if (cleanTrans.length >= 22 && cleanTrans.length <= 92 && !/^[（(]/.test(cleanTrans)) {
            let score = 0;
            if (cleanTrans.length >= 30 && cleanTrans.length <= 72) score += 20;
            else score += 10;
            if (cleanTrans.includes('……') || cleanTrans.includes('——')) score += 12;
            if (/[！？「」]/.test(cleanTrans)) score += 6;
            if (docCanon === canon) score += 15;
            if (/Event|Produce|True|Card|Grad|LP|STEP/i.test(doc.category || doc.group || '')) score += 10;
            if (doc.group === 'Morning') score -= 12;
            const prevBest = bestQuoteByIdol.get(canon);
            if (!prevBest || score > prevBest.score) {
              bestQuoteByIdol.set(canon, {
                score,
                key: doc.key,
                title: doc.title,
                category: doc.category || doc.group || '',
                lineIndex: i,
                lineId: r.id || '',
                trans: cleanTrans,
                text: cleanText
              });
            }
          }
        }

        // Japanese signature catchphrases
        if (cleanText) {
          const jpMatches = cleanText.match(jpCatchRe);
          if (jpMatches) {
            for (const w of jpMatches) {
              if (w === 'プロデューサー' || /^[ー]+$/.test(w)) continue;
              st.wordCounts.set(w, (st.wordCounts.get(w) || 0) + 1.6);
            }
          }
        }
      }

      const speakerArr = [...speakersInDoc];
      for (const canon of speakerArr) {
        const st = stats.get(canon);
        st.totalStories++;
        if (docCanon === canon) st.starringStories++;
        if (hasSelect) st.choiceStories++;
        const cat = doc.category || doc.group || '其他';
        st.categories.set(cat, (st.categories.get(cat) || 0) + 1);

        const q = bestQuoteByIdol.get(canon);
        if (q) st.highlights.push(q);

        for (const other of speakerArr) {
          if (other === canon) continue;
          let pRec = st.partners.get(other);
          if (!pRec) {
            pRec = { count: 0, samples: [] };
            st.partners.set(other, pRec);
          }
          pRec.count++;
          if (pRec.samples.length < 6) {
            pRec.samples.push({ key: doc.key, title: doc.title, category: cat });
          }
        }
      }
    }

    // Build global document frequency across 28 idols for TF-IDF catchphrase distinctiveness
    for (const [idolName, st] of stats.entries()) {
      for (const [w, cnt] of st.wordCounts.entries()) {
        if (cnt < 4) continue;
        let set = globalWordIdols.get(w);
        if (!set) { set = new Set(); globalWordIdols.set(w, set); }
        set.add(idolName);
      }
    }

    const result = new Map();
    for (const [idolName, st] of stats.entries()) {
      const meta = IDOL_META_BY_NAME.get(idolName);
      const partnerList = [...st.partners.entries()]
        .map(([pName, rec]) => {
          const pMeta = IDOL_META_BY_NAME.get(pName);
          return {
            idol: pName,
            id: pMeta?.id || '',
            unit: pMeta?.unit || '',
            color: pMeta?.color || '#38bdf8',
            sameUnit: pMeta?.unit === meta?.unit,
            sharedStories: rec.count,
            samples: rec.samples
          };
        })
        .sort((a, b) => b.sharedStories - a.sharedStories);

      const wordCloud = [...st.wordCounts.entries()]
        .filter(([w, cnt]) => cnt >= 5 && w !== idolName && !idolName.includes(w))
        .map(([word, count]) => {
          const df = globalWordIdols.get(word)?.size || 1;
          // Distinctiveness: strongly reward words unique to 1–8 idols, still allow high-frequency personal staples
          const idf = Math.log(30 / (df + 0.5)) + 0.35;
          const score = Math.round(count * idf * 10) / 10;
          return { word, count: Math.round(count), df, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 28);

      const highlights = st.highlights
        .sort((a, b) => b.score - a.score)
        .slice(0, 14)
        .map(({ score, ...rest }) => rest);

      const categories = [...st.categories.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({ name, count }));

      result.set(idolName, {
        ok: true,
        overview: {
          idol: st.idol,
          id: st.id,
          unit: st.unit,
          color: st.color,
          totalStories: st.totalStories,
          starringStories: st.starringStories,
          choiceStories: st.choiceStories,
          totalLines: st.totalLines,
          translatedLines: st.translatedLines,
          avgLineLength: st.translatedLines ? Math.round((st.charSum / st.translatedLines) * 10) / 10 : 0,
          categories
        },
        partners: partnerList.slice(0, 12),
        crossUnitPartners: partnerList.filter(p => !p.sameUnit).slice(0, 6),
        wordCloud,
        highlights
      });
    }

    allDossiersCache = result;
    return allDossiersCache;
  }

  function getIdolDossier(idolQuery = '') {
    const dossiers = ensureAllDossiers();
    const canon = resolveCanonicalIdol(idolQuery) || DOSSIER_IDOLS[0].name;
    return dossiers.get(canon) || { ok: false, error: 'Idol not found' };
  }

  return async function handler(req, res, u) {
    const p = decodeURIComponent(u.pathname);
    if (p === '/api/idol-dossier') {
      const idol = u.searchParams.get('idol') || '';
      const out = getIdolDossier(idol);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(JSON.stringify(out));
      return true;
    }
    if (p === '/api/morning-greeting') {
      const idol = u.searchParams.get('idol') || '';
      const out = getMorningGreeting(idol);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(out));
      return true;
    }
    if (p === '/api/dialogue-search') {
      const q = u.searchParams.get('q') || '';
      const speaker = u.searchParams.get('speaker') || '';
      const limit = Math.min(120, Math.max(10, Number(u.searchParams.get('limit')) || 60));
      const offset = Math.max(0, Number(u.searchParams.get('offset')) || 0);
      const out = searchDialogues(q, speaker, limit, offset);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(out));
      return true;
    }
    if (p === '/api/idol-interactions') {
      const idol = u.searchParams.get('idol') || '';
      const mode = u.searchParams.get('mode') || 'chain';
      const q = u.searchParams.get('q') || '';
      const kind = u.searchParams.get('kind') || '';
      const out = getIdolInteractions(idol, mode, q, kind);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(out));
      return true;
    }
    if (p === '/api/address-matrix') {
      const out = getAddressMatrix();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(JSON.stringify(out));
      return true;
    }
    return false;
  };
}

module.exports = { createPrismFeatureService };
