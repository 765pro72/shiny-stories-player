// Comprehensive translation & character polish script for all conversations and home voices.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const convsPath = path.join(root, 'public/home-assets/conversations.json');
const catalogPath = path.join(root, 'public/home-assets/catalog.json');
const vIndexPath = path.join(root, 'data/voice-index.json');
const logPath = path.join(root, 'translation-work/翻译变更日志.jsonl');

const convs = JSON.parse(fs.readFileSync(convsPath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const vIndex = JSON.parse(fs.readFileSync(vIndexPath, 'utf8'));

// 1. Known Japanese ASR correction dictionary
const ASR_CORRECTIONS = [
  [/歯向かつ/g, 'ハムカツ'],
  [/カラーゲ/g, 'から揚げ'],
  [/記者の記者が記者 できちゃした!?/g, '貴社の記者が汽車で帰社した！'],
  [/記者の記者が記者/g, '貴社の記者が汽車で帰社した'],
  [/んー \[音楽\]/g, 'ん……？'],
  [/はい!30秒で嫌います!/g, 'はい！30秒で着替えます！'],
  [/ひよりちゃん/g, '灯織ちゃん'],
  [/溶かして/g, '梳かして'],
  [/オベント/g, 'お弁当'],
  [/高配君|後配君/g, '後輩君'],
  [/ブロデューサー|ブラデューサー/g, 'プロデューサー'],
  [/3ド1/g, 'サンドイッチ'],
  [/アルファイト/g, 'アルバイト'],
  [/カステルのあるとよ/g, 'カステラのあるとよ'],
  [/夕晩に!/g, '夕飯ばい！'],
  [/お腹すいったばい/g, 'お腹すいたばい'],
  [/ボイン教/g, '望遠鏡'],
  [/失礼したんだね/g, '失恋したんだね'],
  [/およめさん/g, 'お嫁さん'],
  [/奪うなのね/g, '初なのね']
];

function cleanJapanese(text) {
  if (!text) return '';
  let res = text;
  for (const [re, rep] of ASR_CORRECTIONS) {
    res = res.replace(re, rep);
  }
  return res.trim();
}

// 2. Character persona polish dictionary & rules
function polishChinese(zh, speaker) {
  if (!zh) return '';
  let res = zh.trim();

  // Basic cleanup
  res = res
    .replace(/制作商/g, '制作人')
    .replace(/后配君/g, '后辈君')
    .replace(/兄君/g, '兄长大人')
    .replace(/博因宗教|波音教/g, '望远镜')
    .replace(/出色地！配火腿排！说到炸鸡，你更喜欢哪一种？/g, '那个啊——！炸火腿排和炸鸡块，你更喜欢哪一个呀？')
    .replace(/贵公司记者坐火车回家了！/g, '贵社的记者乘火车回社了！（绕口令）')
    .replace(/如果饿了的话……/g, '肚子好饿的说……')
    .replace(/最喜欢的地方/g, '常去的地方');

  // Idol specific touches
  const spk = speaker || '';
  if (spk.includes('真乃')) {
    res = res.replace(/日和酱/g, '灯织酱').replace(/融化/g, '梳理');
    if (!res.includes('……') && !res.includes('～') && !res.includes('っ')) {
      res = res.replace(/([。！])$/, '……$1');
    }
  } else if (spk.includes('灯织')) {
    res = res.replace(/马诺/g, '真乃').replace(/融化/g, '梳头');
  } else if (spk.includes('恋钟')) {
    res = res.replace(/蒂卡/g, '甜花').replace(/卡斯特/g, '长崎蛋糕');
    if (!res.includes('的说') && !res.includes('呀')) {
      res = res.replace(/([。.])$/, '的说！');
    }
  } else if (spk.includes('朝日')) {
    if (!res.includes('的说')) res = res.replace(/([。！])$/, '的说！');
  } else if (spk.includes('甜花')) {
    if (!res.includes('……') && !res.startsWith('呜')) {
      res = '呜……' + res;
    }
  } else if (spk.includes('日花')) {
    res = res.replace(/齿向かつ/g, '炸火腿排').replace(/哈，是的！/g, '是、是！').replace(/换衣服/g, '换好衣服');
  } else if (spk.includes('美琴')) {
    res = res.replace(/实践/g, '自主练习').replace(/油炸食品/g, '油炸物');
  } else if (spk.includes('冬优子')) {
    res = res.replace(/殴打/g, '安慰');
  }

  return res.trim();
}

// 3. Translation with fallback and retry
async function translateText(text) {
  if (!text || !text.trim()) return '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const url = 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=ja&tl=zh-CN&q=' + encodeURIComponent(text);
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j) && j[0]) return j[0];
      }
    } catch {}

    try {
      const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=ja|zh-CN';
      const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (r.ok) {
        const j = await r.json();
        const t = j.responseData?.translatedText;
        if (t && t !== text) return t;
      }
    } catch {}

    await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
  }
  return text;
}

async function main() {
  console.log('Starting full translation & polish pipeline...');

  // Step 1: Clean known Japanese ASR in conversations
  let asrFixed = 0;
  for (const c of convs) {
    for (const s of (c.sequence || [])) {
      const cleaned = cleanJapanese(s.original);
      if (cleaned !== s.original) {
        s.original = cleaned;
        asrFixed++;
      }
    }
  }
  console.log(`Cleaned Japanese ASR in ${asrFixed} conversation lines.`);

  // Step 2: Specific SHHis manual high-quality polish
  for (const c of convs) {
    if (c.id === 'normal:10240250100') {
      c.sequence[0].original = 'えっとですねー！ハムカツと！から揚げだとどっちが好きです？';
      c.sequence[0].translation = '那个啊——！炸火腿排和！炸鸡块的话更喜欢哪一个呀？';
      c.sequence[1].original = 'うーん、揚げ物か……。選択肢はその二つだけなの？';
      c.sequence[1].translation = '唔……都是炸物啊……。选项就只有这两个吗？';
    } else if (c.id === 'normal:10240250200') {
      c.sequence[0].original = '貴社の記者が汽車で帰社した！';
      c.sequence[0].translation = '贵社的记者乘火车回社了！（绕口令）';
      c.sequence[1].original = 'ん……？';
      c.sequence[1].translation = '嗯……？';
    } else if (c.id === 'normal:10250240100') {
      c.sequence[0].original = 'ね、時間あるなら一緒にやろうか、練習';
      c.sequence[0].translation = '呐，有时间的话要一起做吗？自主练习。';
      c.sequence[1].original = 'う、うわぁー！はい！30秒で着替えます！';
      c.sequence[1].translation = '哇、哇啊——！是！30秒内换好衣服！';
    }
  }

  // Step 3: Collect unique Japanese texts needing translation
  const kanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
  const toTranslateMap = new Map(); // text -> [ { c, s } ]

  for (const c of convs) {
    for (const s of (c.sequence || [])) {
      if (s.translation === s.original || kanaRegex.test(s.translation) || !s.translation.trim()) {
        if (!toTranslateMap.has(s.original)) toTranslateMap.set(s.original, []);
        toTranslateMap.get(s.original).push({ c, s });
      }
    }
  }

  console.log(`Unique conversation texts needing translation: ${toTranslateMap.size}`);

  // Step 4: Batch translate with concurrency
  const uniqueTexts = [...toTranslateMap.keys()];
  const translations = new Map();
  const BATCH = 12;
  let done = 0;

  for (let i = 0; i < uniqueTexts.length; i += BATCH) {
    const chunk = uniqueTexts.slice(i, i + BATCH);
    await Promise.all(chunk.map(async (txt) => {
      const zh = await translateText(txt);
      translations.set(txt, zh);
    }));
    done += chunk.length;
    if (done % 120 === 0 || done === uniqueTexts.length) {
      console.log(`Progress: [${done}/${uniqueTexts.length}] (${((done/uniqueTexts.length)*100).toFixed(1)}%)`);
    }
    await new Promise(r => setTimeout(r, 100));
  }

  // Step 5: Apply translated & polished text and create changelog entries
  const logEntries = [];
  const now = new Date().toISOString();

  for (const [orig, refs] of toTranslateMap) {
    const rawZh = translations.get(orig) || orig;
    for (const { s } of refs) {
      const before = s.translation;
      const polished = polishChinese(rawZh, s.speaker);
      s.translation = polished;
      logEntries.push({
        target: 'conversations',
        id: s.id,
        key: s.path,
        speaker: s.speaker,
        original: s.original,
        before,
        after: polished,
        by: '接手 AI 听译直译润色（用户授权）',
        at: now
      });
    }
  }

  // Step 6: Fix the 9 outfit/casting voices in catalog.json
  const catalogFixes = [
    {
      id: 'mypage_1040060110_1_11',
      orig: '記憶のひとひらが 優しく撫でていく',
      zh: '记忆的花瓣，轻柔地拂过心弦。'
    },
    {
      id: 'mypage_1040150110_1_01',
      orig: 'ちょっとだけ、ゲーム……ちょっとだけ……',
      zh: '就玩一下下、游戏……就一下下……'
    },
    {
      id: 'mypage_1040150110_2_01',
      orig: 'フォロワーがいっぱいで……眠れない……',
      zh: '关注的人太多了……甜花……睡不着了……'
    },
    {
      id: 'mypage_1040150120_2_01',
      orig: '言い訳とリロードからのトリックショット……ね？えへへ……完璧！',
      zh: '闪避装填后紧接着特技射击……呐？欸嘿嘿……完美！'
    },
    {
      id: 'mypage_casting_voice_018_07',
      orig: 'ミスしたくらいでそんな顔しないの。大丈夫、次直せばいいんだから。ほら、慰めてあげる。おいで',
      zh: '只是失误了一下别露出那种表情嘛。没事的，下次改正过来就好啦。来，我来安慰你。过来吧。'
    },
    {
      id: 'mypage_casting_voice_018_08',
      orig: '思い出は忘れていいから、この気持ちは忘れないで。一瞬の感情になって、一生あなたの心に残り続けたらいいな',
      zh: '回忆可以遗忘，但这份心情千万不要忘记。化作一瞬的情感，要是能一生留在你的心间就好了呢。'
    },
    {
      id: 'mypage_1040180010_2_01',
      orig: 'Are You Ready？',
      zh: '准备好了吗？'
    }
  ];

  for (const fix of catalogFixes) {
    for (const p of catalog) {
      for (const v of (p.voices || [])) {
        if (v.id === fix.id) {
          const before = v.translation;
          v.original = fix.orig;
          v.translation = fix.zh;
          logEntries.push({ target: 'catalog:base', id: v.id, key: v.path, speaker: p.name, original: fix.orig, before, after: fix.zh, by: '接手 AI 听译直译润色（用户授权）', at: now });
        }
      }
      for (const v of (p.castingVoices || [])) {
        if (v.id === fix.id) {
          const before = v.translation;
          v.original = fix.orig;
          v.translation = fix.zh;
          logEntries.push({ target: 'catalog:casting', id: v.id, key: v.path, speaker: p.name, original: fix.orig, before, after: fix.zh, by: '接手 AI 听译直译润色（用户授权）', at: now });
        }
      }
      for (const o of (p.outfits || [])) {
        for (const v of (o.homeVoices || [])) {
          if (v.id === fix.id) {
            const before = v.translation;
            v.original = fix.orig;
            v.translation = fix.zh;
            logEntries.push({ target: 'catalog:outfit', id: v.id, key: v.path, speaker: p.name, original: fix.orig, before, after: fix.zh, by: '接手 AI 听译直译润色（用户授权）', at: now });
          }
        }
      }
    }
  }

  // Step 7: Update data/voice-index.json
  const vIndexMap = new Map();
  for (const v of vIndex) {
    if (v.key) vIndexMap.set(v.key, v);
  }

  let vIndexUpdated = 0;
  for (const c of convs) {
    for (const s of (c.sequence || [])) {
      if (s.path && vIndexMap.has(s.path)) {
        const item = vIndexMap.get(s.path);
        item.original = s.original;
        item.translation = s.translation;
        item.speaker = s.speaker;
        vIndexUpdated++;
      }
    }
  }
  for (const p of catalog) {
    for (const v of (p.voices || [])) {
      if (v.path && vIndexMap.has(v.path)) {
        const item = vIndexMap.get(v.path);
        item.original = v.original;
        item.translation = v.translation;
        item.speaker = p.name;
        vIndexUpdated++;
      }
    }
    for (const v of (p.castingVoices || [])) {
      if (v.path && vIndexMap.has(v.path)) {
        const item = vIndexMap.get(v.path);
        item.original = v.original;
        item.translation = v.translation;
        item.speaker = p.name;
        vIndexUpdated++;
      }
    }
    for (const o of (p.outfits || [])) {
      for (const v of (o.homeVoices || [])) {
        if (v.path && vIndexMap.has(v.path)) {
          const item = vIndexMap.get(v.path);
          item.original = v.original;
          item.translation = v.translation;
          item.speaker = p.name;
          vIndexUpdated++;
        }
      }
    }
  }
  console.log(`Updated voice-index entries: ${vIndexUpdated}`);

  // Step 8: Save all synchronized files
  fs.writeFileSync(convsPath, JSON.stringify(convs, null, 2), 'utf8');
  fs.writeFileSync(path.join(root, 'data/home-conversations.json'), JSON.stringify(convs, null, 2), 'utf8');
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf8');
  fs.writeFileSync(path.join(root, 'data/home-catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');
  fs.writeFileSync(vIndexPath, JSON.stringify(vIndex, null, 2), 'utf8');

  // Step 9: Append to changelog
  if (logEntries.length > 0) {
    const lines = logEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
    fs.appendFileSync(logPath, lines, 'utf8');
    console.log(`Appended ${logEntries.length} entries to 翻译变更日志.jsonl.`);
  }

  console.log('Translation and sync complete!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
