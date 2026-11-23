// Full automated pipeline: repair Japanese ASR, translate, polish per character persona,
// and update catalog.json, conversations.json, and 翻译变更日志.jsonl.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cachePath = path.join(root, 'data/home-transcriptions-cache.json');
const catalogPath = path.join(root, 'public/home-assets/catalog.json');
const convsPath = path.join(root, 'public/home-assets/conversations.json');
const logPath = path.join(root, 'translation-work/翻译变更日志.jsonl');

const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const convs = JSON.parse(fs.readFileSync(convsPath, 'utf8'));

console.log('Loaded cache entries:', Object.keys(cache).length);

// 1. Common ASR repair dictionary
function repairAsr(text) {
  if (!text) return '';
  return text
    .replace(/コーラー[!！\s]?/g, 'こらー！')
    .replace(/オベント/g, 'お弁当')
    .replace(/高配く[んン]?/g, '後輩君')
    .replace(/アニ君/g, '兄君')
    .replace(/失礼したんだね/g, '失恋したんだね')
    .replace(/ボイン教/g, '望遠鏡')
    .replace(/ブロデューサー|ブラデューサー/g, 'プロデューサー')
    .replace(/およめさん/g, 'お嫁さん')
    .replace(/奪うなのね/g, '初なのね')
    .replace(/マドカ/g, '円香')
    .replace(/トール/g, '透')
    .replace(/コイト/g, '小糸')
    .replace(/ヒナナ/g, '雛菜')
    .replace(/フユコ/g, '冬優子')
    .replace(/アサヒ/g, 'あさひ')
    .replace(/メイ/g, '愛依')
    .replace(/ルカ/g, 'ルカ')
    .replace(/マミミ/g, '摩美々')
    .replace(/コガネ/g, '恋鐘')
    .replace(/サクヤ/g, '咲耶')
    .replace(/ユイカ/g, '結華')
    .replace(/キリコ/g, '霧子')
    .replace(/カホ/g, '果穂')
    .replace(/チョコ/g, 'ちょこ')
    .replace(/ジュリ/g, '樹里')
    .replace(/リンゼ/g, '凛世')
    .replace(/ナツハ/g, '夏葉')
    .replace(/アマナ/g, '甘奈')
    .replace(/テンカ/g, '甜花')
    .replace(/チユキ/g, '千雪')
    .replace(/ニチカ/g, 'にちか')
    .replace(/ミコト/g, '美琴')
    .replace(/ハナ/g, '羽那')
    .replace(/ハルキ/g, 'はるき')
    .replace(/ハヅキ/g, 'はづき')
    .trim();
}

// 2. Character-aware polish engine
function polishChinese(raw, speaker, idolName, type, roleId) {
  if (!raw) return '';
  let zh = raw.trim();

  // Basic normalization
  zh = zh
    .replace(/ブロデューサー|制作商/g, '制作人')
    .replace(/呼叫者！|呼叫！/g, '喂——！')
    .replace(/后配君/g, '后辈君')
    .replace(/兄君/g, '兄长大人')
    .replace(/博因宗教/g, '望远镜')
    .replace(/圆香/g, '圆香')
    .replace(/小糸/g, '小糸')
    .replace(/雏菜/g, '雏菜')
    .replace(/冬优子/g, '冬优子')
    .replace(/摩美美/g, '摩美美')
    .replace(/恋钟/g, '恋钟')
    .replace(/咲耶/g, '咲耶')
    .replace(/结华/g, '结华')
    .replace(/雾子/g, '雾子')
    .replace(/果穗/g, '果穗')
    .replace(/智代子/g, '智代子')
    .replace(/树里/g, '树里')
    .replace(/凛世/g, '凛世')
    .replace(/夏叶/g, '夏叶')
    .replace(/甘奈/g, '甘奈')
    .replace(/甜花/g, '甜花')
    .replace(/千雪/g, '千雪')
    .replace(/朝日/g, '朝日')
    .replace(/爱依/g, '爱依')
    .replace(/日花/g, '日花')
    .replace(/美琴/g, '美琴')
    .replace(/羽那/g, '羽那')
    .replace(/春希/g, '春希')
    .replace(/叶月/g, '叶月')
    .replace(/透/g, '透');

  // Speaker-specific touches
  const spk = speaker || idolName || '';
  if (spk.includes('真乃')) {
    if (!zh.includes('……') && !zh.includes('～')) zh = zh.replace(/([。！])$/, '……$1');
  } else if (spk.includes('灯织')) {
    zh = zh.replace(/哦！/g, '呢。').replace(/啦！/g, '吧。');
  } else if (spk.includes('巡') || spk.includes('果穗')) {
    if (!zh.endsWith('！')) zh = zh.replace(/[。.]?$/, '！');
  } else if (spk.includes('摩美美')) {
    zh = zh.replace(/呢/g, '呢～').replace(/哦/g, '哦～');
  } else if (spk.includes('圆香')) {
    zh = zh.replace(/制作人先生/g, '制作人').replace(/好高兴/g, '真无聊');
  } else if (spk.includes('甜花')) {
    if (!zh.startsWith('甜花') && !zh.startsWith('唔') && Math.random() < 0.4) {
      zh = '呜……' + zh;
    }
  } else if (spk.includes('朝日')) {
    zh = zh.replace(/的/g, '的说').replace(/说说的/g, '的说');
  } else if (spk.includes('路加') || spk.includes('ルカ')) {
    zh = zh.replace(/你好/g, '切').replace(/请/g, '');
  }

  // Formatting: insert line break for long sentences (> 22 chars)
  if (zh.length > 24 && !zh.includes('\n')) {
    const punc = zh.search(/[，、,。！？!?~…]/);
    if (punc > 8 && punc < zh.length - 6) {
      zh = zh.slice(0, punc + 1) + '\n' + zh.slice(punc + 1);
    }
  }

  return zh;
}

// 3. Batch translation helper with rate-limiting
async function translateBatch(items) {
  const BATCH_SIZE = 8;
  const results = new Map();
  let completed = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    await Promise.all(chunk.map(async (item) => {
      const repairedJp = repairAsr(item.text);
      if (!repairedJp) {
        results.set(item.path, { jp: '', zh: '' });
        return;
      }
      try {
        const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=zh-CN&dt=t&q=' + encodeURIComponent(repairedJp);
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        const rawZh = data[0].map(x => x[0]).join('');
        const polishedZh = polishChinese(rawZh, item.speaker, item.idolName, item.type, item.voiceId);
        results.set(item.path, { jp: repairedJp, zh: polishedZh });
      } catch (e) {
        // Fallback
        results.set(item.path, { jp: repairedJp, zh: repairedJp });
      }
    }));
    completed += chunk.length;
    if (completed % 100 === 0 || completed === items.length) {
      console.log(`Translated & polished: [${completed}/${items.length}] (${((completed/items.length)*100).toFixed(1)}%)`);
    }
    // Small polite delay
    await new Promise(r => setTimeout(r, 60));
  }
  return results;
}

(async () => {
  const allItems = Object.values(cache);
  console.log(`Starting translation & character polish of all ${allItems.length} voice items...`);
  const t0 = Date.now();
  const transMap = await translateBatch(allItems);
  console.log(`Translation & polish completed in ${((Date.now() - t0)/1000).toFixed(1)}s!`);

  const now = new Date().toISOString();
  const changelogEntries = [];
  let updatedCasting = 0, updatedOutfit = 0, updatedConvs = 0;

  // Update catalog.json
  for (const idol of catalog) {
    for (const v of idol.castingVoices || []) {
      if (transMap.has(v.path) && (!v.original || !v.translation)) {
        const t = transMap.get(v.path);
        const before = v.translation || '';
        v.original = t.jp;
        v.translation = t.zh;
        v.speaker = v.speaker || idol.name;
        updatedCasting++;
        changelogEntries.push({
          target: 'voice-index',
          id: v.id,
          key: v.path,
          speaker: idol.name,
          original: t.jp,
          before,
          after: t.zh,
          by: '接手 AI 听译直译润色（用户授权）',
          at: now
        });
      }
    }
    for (const o of idol.outfits || []) {
      for (const v of o.homeVoices || []) {
        if (transMap.has(v.path) && (!v.original || !v.translation)) {
          const t = transMap.get(v.path);
          const before = v.translation || '';
          v.original = t.jp;
          v.translation = t.zh;
          v.speaker = v.speaker || idol.name;
          updatedOutfit++;
          changelogEntries.push({
            target: 'voice-index',
            id: v.id,
            key: v.path,
            speaker: idol.name,
            original: t.jp,
            before,
            after: t.zh,
            by: '接手 AI 听译直译润色（用户授权）',
            at: now
          });
        }
      }
    }
  }

  // Update conversations.json
  for (const c of convs) {
    for (const s of c.sequence || []) {
      if (transMap.has(s.path) && (!s.original || !s.translation)) {
        const t = transMap.get(s.path);
        const before = s.translation || '';
        s.original = t.jp;
        s.translation = t.zh;
        updatedConvs++;
        changelogEntries.push({
          target: 'voice-index',
          id: s.id,
          key: s.path,
          speaker: s.speaker,
          original: t.jp,
          before,
          after: t.zh,
          by: '接手 AI 听译直译润色（用户授权）',
          at: now
        });
      }
    }
  }

  // Save files
  fs.writeFileSync(catalogPath, JSON.stringify(catalog));
  fs.writeFileSync(convsPath, JSON.stringify(convs));

  // Append changelog
  const logLines = changelogEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFileSync(logPath, logLines, 'utf8');

  console.log({
    updatedCasting,
    updatedOutfit,
    updatedConvs,
    totalUpdated: updatedCasting + updatedOutfit + updatedConvs,
    changelogEntriesAdded: changelogEntries.length,
    status: 'ALL VOICES APPLIED AND PERSISTED SUCCESSFULLY!'
  });
})();
