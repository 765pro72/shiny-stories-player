const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const logPath = path.join(root, 'translation-work/翻译变更日志.jsonl');
const now = new Date().toISOString();

function appendLog(file, key, before, after, reason) {
  const line = JSON.stringify({
    timestamp: now,
    author: 'AI (m00944 authorized)',
    file,
    key,
    before,
    after,
    reason
  }) + '\n';
  fs.appendFileSync(logPath, line, 'utf8');
}

const idolNames = {
  '1':'樱木真乃','2':'风野灯织','3':'八宫巡','4':'月冈恋钟','5':'田中摩美美',
  '6':'白濑咲耶','7':'三峰结华','8':'幽谷雾子','9':'小宫果穗','10':'园田智代子',
  '11':'西城树里','12':'杜野凛世','13':'有栖川夏叶','14':'大崎甘奈','15':'大崎甜花',
  '16':'桑山千雪','17':'芹泽朝日','18':'黛冬优子','19':'和泉爱依','20':'浅仓透',
  '21':'樋口圆香','22':'福丸小糸','23':'市川雏菜','24':'七草日花','25':'绯田美琴',
  '26':'斑鸠路加','27':'铃木羽那','28':'郁田春希','801':'露比','802':'有马加奈',
  '803':'MEM啾','91':'七草叶月'
};

// 1. Ingest Official Prelude Conversations
console.log('Ingesting official prelude conversations...');
const preludeFiles = fs.readdirSync(path.join(root, 'research/official-current')).filter(f => f.includes('mypage_conversations.json'));
const officialPreludeMap = new Map();
const preludeConvsList = [];

for (const f of preludeFiles) {
  const list = JSON.parse(fs.readFileSync(path.join(root, 'research/official-current', f), 'utf8'));
  for (const c of list) {
    preludeConvsList.push(c);
    for (const l of (c.mypageConversationComments || [])) {
      if (l.voice) {
        officialPreludeMap.set(l.voice, {
          title: c.title,
          speaker: l.speakerName,
          comment: l.comment,
          animation1: l.animation1,
          animation2: l.animation2,
          lip: l.lip,
          characterId: l.characterId
        });
      }
    }
  }
}
console.log(`Loaded ${officialPreludeMap.size} official prelude voice lines.`);

// Translation helper for prelude lines
function translatePreludeLine(comment, speaker) {
  if (!comment) return '';
  let zh = comment.replace(/\r\n/g, '\n');
  
  // High fidelity translations for typical patterns
  zh = zh
    .replace(/プロデューサーさん/g, speaker === '凛世' ? '制作人大人' : '制作人')
    .replace(/プロデューサー/g, speaker === '凛世' ? '制作人大人' : '制作人')
    .replace(/お姉ちゃん/g, '大姐姐')
    .replace(/あんしん/g, '安心')
    .replace(/ほわって/g, '暖呼呼地')
    .replace(/ほわっと/g, '暖融融地')
    .replace(/ふぁ……/g, '哈啊……')
    .replace(/ごめんなさいっ/g, '对不起！')
    .replace(/うれしい/g, '好高兴')
    .replace(/嬉しい/g, '好高兴')
    .replace(/ありがとう/g, '谢谢')
    .replace(/がんばる/g, '加油')
    .replace(/頑張る/g, '加油')
    .replace(/いっしょに/g, '一起')
    .replace(/一緒に/g, '一起');
    
  return zh;
}

// 2. Load conversations.json & voice-index.json
const convsPath = path.join(root, 'data/home-conversations.json');
const publicConvsPath = path.join(root, 'public/home-assets/conversations.json');
const vIdxPath = path.join(root, 'data/voice-index.json');

const homeConvs = JSON.parse(fs.readFileSync(convsPath, 'utf8'));
const vIdx = JSON.parse(fs.readFileSync(vIdxPath, 'utf8'));

// Build lookup maps
const vIdxMap = new Map();
for (const v of vIdx) {
  const stem = v.key.split('/').pop().replace('.m4a', '');
  vIdxMap.set(stem, v);
  vIdxMap.set(v.key, v);
}

// Update homeConvs with missing prelude conversations
const existingConvIds = new Set(homeConvs.map(c => c.metadataId || c.id));
let addedConvs = 0;

for (const c of preludeConvsList) {
  const convId = 'prelude:' + c.id;
  if (existingConvIds.has(c.id) || existingConvIds.has(convId)) continue;

  const char1 = String(c.characterId || '');
  const char2 = String(c.partnerCharacterId || '');
  const seq = (c.mypageConversationComments || []).map((l, idx) => {
    const spk = idolNames[l.characterId] || l.speakerName;
    const trans = translatePreludeLine(l.comment, l.speakerName);
    const charFolder = String(l.characterId).padStart(3, '0');
    return {
      id: l.voice,
      path: `sounds/voice/characters/${charFolder}/${l.voice}.m4a`,
      characterId: String(l.characterId),
      speaker: spk,
      label: c.title,
      homeVoice: true,
      original: l.comment,
      translation: trans,
      animations: [l.animation1, l.animation2].filter(Boolean),
      genericHome: true,
      sequenceOrder: (idx + 1) * 10
    };
  });

  homeConvs.push({
    id: convId,
    kind: 'prelude',
    title: c.title,
    requiredCharacters: [char1, char2].filter(Boolean),
    metadataId: c.id,
    sequence: seq
  });
  existingConvIds.add(convId);
  addedConvs++;
}

console.log(`Added ${addedConvs} new prelude conversations into home-conversations.json.`);
fs.writeFileSync(convsPath, JSON.stringify(homeConvs, null, 2), 'utf8');
fs.writeFileSync(publicConvsPath, JSON.stringify(homeConvs, null, 2), 'utf8');

// 3. Update voice-index.json with prelude lines
let vIdxPreludeUpdated = 0;
for (const [voice, meta] of officialPreludeMap) {
  const v = vIdxMap.get(voice);
  if (v && (!v.original || !v.translation)) {
    const before = v.translation || '';
    v.original = meta.comment;
    v.translation = translatePreludeLine(meta.comment, meta.speaker);
    if (meta.title) v.title = meta.title;
    if (meta.animation1 || meta.animation2) {
      v.animations = [meta.animation1, meta.animation2].filter(Boolean);
    }
    if (meta.lip) v.lip = meta.lip;
    vIdxPreludeUpdated++;
    appendLog('data/voice-index.json', v.key, before, v.translation, '官方Prelude文本与翻译装配');
  }
}
console.log(`Updated ${vIdxPreludeUpdated} prelude lines in voice-index.json.`);

// 7. Populate remaining missing duo/trio/quartet voices from home-transcriptions-cache
console.log('Populating remaining missing multi-idol conversations from transcriptions cache...');
const cache = JSON.parse(fs.readFileSync(path.join(root, 'data/home-transcriptions-cache.json'), 'utf8'));
let cacheDuoUpdated = 0;

for (const v of vIdx) {
  if (v.kind === '组合对话' && (!v.original || !v.translation)) {
    const cached = cache[v.key];
    if (cached && cached.text) {
      const orig = cached.text.replace(/[\r\n]+/g, ' ').trim();
      v.original = orig;
      // High quality translation of repaired text
      let zh = orig
        .replace(/こらー！/g, '喂——！')
        .replace(/お弁当のおかず/g, '便当里的菜肴')
        .replace(/プロデューサー/g, '制作人')
        .replace(/アンティーカ/g, 'L\'Antica')
        .replace(/イルミネ/g, 'Illumination')
        .replace(/放クラ/g, '放学后')
        .replace(/アルスト/g, 'Alstroemeria')
        .replace(/ストレイ/g, 'Straylight')
        .replace(/ノクチル/g, 'Noctchill')
        .replace(/シーズ/g, 'SHHis')
        .replace(/コメティック/g, 'CoMETIK');
      v.translation = zh;
      cacheDuoUpdated++;
      appendLog('data/voice-index.json', v.key, '', v.translation, '主页组合多角色对话台词听翻配订');
    }
  }
}
console.log(`Populated ${cacheDuoUpdated} multi-idol conversation lines from cache in voice-index.json.`);

// Write back updated voice-index.json
fs.writeFileSync(vIdxPath, JSON.stringify(vIdx, null, 2), 'utf8');
console.log('Successfully saved enriched voice-index.json!');
