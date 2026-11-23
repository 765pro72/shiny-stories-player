const fs = require('node:fs');
const path = require('node:path');

const home = require('../public/home-assets/catalog.json');
const all = require('../research/official-current/all-assets.json');
const cards = require('../data/card-supplement.json');

const idolNames = {
  '001':'樱木真乃','002':'风野灯织','003':'八宫巡','004':'月冈恋钟','005':'田中摩美美',
  '006':'白濑咲耶','007':'三峰结华','008':'幽谷雾子','009':'小宫果穗','010':'园田智代子',
  '011':'西城树里','012':'杜野凛世','013':'有栖川夏叶','014':'大崎甘奈','015':'大崎甜花',
  '016':'桑山千雪','017':'芹泽朝日','018':'黛冬优子','019':'和泉爱依','020':'浅仓透',
  '021':'樋口圆香','022':'福丸小糸','023':'市川雏菜','024':'七草日花','025':'绯田美琴',
  '026':'斑鸠路加','027':'铃木羽那','028':'郁田春希','801':'露比','802':'有马加奈',
  '803':'MEM啾','091':'七草叶月','91':'七草叶月'
};

// 1. Load official Album data (31 official idol albums)
const albumDir = path.resolve(__dirname, '../research/Album/album');
const albumMap = new Map();
if (fs.existsSync(albumDir)) {
  for (const f of fs.readdirSync(albumDir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(albumDir, f), 'utf8'));
      for (const v of (data.voices || [])) {
        if (v.voice) albumMap.set(v.voice, v);
      }
    } catch {}
  }
}

// 2. Load official home voices data
const hvDir = path.resolve(__dirname, '../research/home-voices');
const homeVoiceMap = new Map();
if (fs.existsSync(hvDir)) {
  for (const f of fs.readdirSync(hvDir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const data = JSON.parse(fs.readFileSync(path.join(hvDir, f), 'utf8'));
      if (Array.isArray(data)) {
        for (const v of data) if (v.voice) homeVoiceMap.set(v.voice, v);
      }
    } catch {}
  }
}

// 3. Known catalog voices and conversations
const known = new Map();
for (const p of home) {
  for (const v of [...p.voices, ...(p.castingVoices || []), ...p.outfits.flatMap(o => o.homeVoices || [])]) {
    known.set(v.path, v);
  }
}
const convPath = path.resolve(__dirname, '../public/home-assets/conversations.json');
if (fs.existsSync(convPath)) {
  for (const c of JSON.parse(fs.readFileSync(convPath, 'utf8'))) {
    for (const v of (c.sequence || [])) {
      known.set(v.path, { ...v, groupTitle: c.title });
    }
  }
}

function generateReadableTitle(stem, idolName) {
  let m = stem.match(/^mypage_talking_duo_(\d{3})(\d{3})(\d{3})(\d{4})$/);
  if (m) {
    const id1 = m[1], id2 = m[2], setNum = Number(m[3]), lineNum = Number(m[4]) / 10;
    const name1 = idolNames[id1] || id1, name2 = idolNames[id2] || id2;
    return `双人主页对话：${name1} × ${name2} (第${setNum}组·句${lineNum})`;
  }
  m = stem.match(/^mypage_talking_trio_(\d{3})(\d{3})(\d{3})(\d{3})(\d{4})$/);
  if (m) {
    const id1 = m[1], id2 = m[2], id3 = m[3], setNum = Number(m[4]), lineNum = Number(m[5]) / 10;
    const n1 = idolNames[id1] || id1, n2 = idolNames[id2] || id2, n3 = idolNames[id3] || id3;
    return `三人主页对话：${n1} × ${n2} × ${n3} (第${setNum}组·句${lineNum})`;
  }
  m = stem.match(/^mypage_talking_quartet_(\d+)_(\d+)$/);
  if (m) return `四人主页对话 (组${m[1]}·句${m[2]})`;
  m = stem.match(/^mypage_casting_voice_(\d+)_(\d+)$/);
  if (m) return `角色扮演主页语音 #${Number(m[2])}`;
  m = stem.match(/^awake_step_(\d+)/);
  if (m) return `偶像觉醒进阶语音 #${Number(m[1])}`;
  m = stem.match(/^gasha_(\d+)/);
  if (m) return `招募登场台词 #${Number(m[1])}`;
  if (stem.startsWith('concert_start')) return '演唱会开场语音';
  if (stem.startsWith('concert_attack')) return '演唱会技能发动';
  if (stem.startsWith('concert_skil_select')) return '演唱会技能选择';
  if (stem.startsWith('concert_passive_skill')) return '演唱会被动技能发动';
  if (stem.startsWith('concert_special_passive_skill')) return '演唱会专属被动发动';
  if (stem.includes('end_victory')) return '283舞台挑战 · 胜利结算';
  if (stem.includes('end_defeat')) return '283舞台挑战 · 败北结算';
  if (stem.includes('blind_start')) return '283舞台挑战 · 帷幕拉开';
  if (stem.includes('target_point_clear')) return '283舞台挑战 · 目标达成';
  if (stem.includes('mental_damage')) return '283舞台挑战 · 精神受挫';
  if (stem.startsWith('daifugo_pass')) return '大富豪对决 · Pass过牌';
  if (stem.startsWith('daifugo_win')) return '大富豪对决 · 获胜';
  m = stem.match(/(\d{4})halloween_systemvoice_(\d+)/);
  if (m) return `${m[1]}万圣节日系统语音 #${Number(m[2])}`;
  m = stem.match(/christmas(\d{4})_systemvoice_(\d+)/);
  if (m) return `${m[1]}圣诞节日系统语音 #${Number(m[2])}`;
  m = stem.match(/reaction_(\d+)/);
  if (m) return `互动反应语音 #${Number(m[1])}`;
  m = stem.match(/produce_area_(\d+)/);
  if (m) return `区域养成语音 #${Number(m[1])}`;
  if (stem.endsWith('_agree')) return '赞同点头语音';
  if (stem.endsWith('_anger')) return '生气反抗语音';
  if (stem.endsWith('_cheer')) return '元气应援语音';

  return stem;
}

const list = [];
for (const key of all) {
  const whisper = key.match(/^sounds\/voice\/whisper\/(\d{10})\/([^/]+)\.m4a$/);
  const m = key.match(/^sounds\/voice\/characters\/(\d+)\/([^/]+)\.m4a$/) || (whisper ? [null, whisper[1].slice(3, 6), whisper[2]] : null);
  if (!m) continue;
  const p = home.find(p => p.id === (Number(m[1]) === 91 ? 'staff' : String(Number(m[1]))));
  if (!p) continue;

  const stem = m[2];
  const v = known.get(key);
  const alb = albumMap.get(stem);
  const hv = homeVoiceMap.get(stem);

  const call = stem.match(/^producers_cup_(\d+(?:_\d+)?)th_voice_\d+_(\d+)$/);
  const kind = call ? '电话' : /^mypage_casting_voice_/.test(stem) ? '扮演主页' : /^mypage_talking_|^mypage_support_idol_talking_/.test(stem) ? '组合对话' : /^mypage_/.test(stem) ? '主页语音' : '其他语音';

  // Determine Title: 1) Official Album Title, 2) Conversation Label, 3) Catalog Label, 4) Call Title, 5) Rule Title
  let title = alb?.title || v?.groupTitle || v?.label || hv?.voiceName;
  if (!title) {
    if (call) title = call[1].replace('_', '.') + '周年 P杯 · 电话 ' + Number(call[2]);
    else title = generateReadableTitle(stem, p.name);
  }

  // Determine animations and lip from album or home-voices or catalog
  const anim1 = alb?.animation1 || hv?.animation1 || v?.animations?.[0] || '';
  const anim2 = alb?.animation2 || hv?.animation2 || v?.animations?.[1] || '';
  const anim3 = alb?.animation3 || hv?.animation3 || v?.animations?.[2] || '';
  const lip = alb?.lip || hv?.lip || v?.lip || '';

  const animations = [anim1, anim2, anim3].filter(Boolean);

  const original = alb?.comment || hv?.comment || v?.original || '';
  const translation = v?.translation || '';

  list.push({
    key,
    ...(whisper ? { availability: 'metadata-pending' } : {}),
    idol: p.name,
    characterId: m[1],
    kind: whisper ? '耳语' : kind,
    title,
    original,
    translation,
    speaker: v?.speaker || p.name,
    ...(animations.length ? { animations } : {}),
    ...(lip ? { lip } : {})
  });
}

// Cards
for (const key of all) {
  const m = key.match(/^sounds\/voice\/(idols|support_idols)\/(\d{10})\/([^/]+)\.m4a$/);
  if (!m) continue;
  const p = home.find(p => p.id === (Number(m[2].slice(3, 6)) === 91 ? 'staff' : String(Number(m[2].slice(3, 6)))));
  if (!p) continue;
  const c = cards.find(c => c.id === m[2]);
  list.push({
    key,
    idol: p.name,
    characterId: m[2].slice(3, 6),
    kind: m[3] === 'letter' ? '信件语音' : '卡片语音',
    title: (c?.name || m[2]) + ' · ' + (m[3] === 'letter' ? '信件' : m[3]),
    original: '',
    translation: '',
    speaker: p.name
  });
}

fs.writeFileSync(path.resolve(__dirname, '../data/voice-index.json'), JSON.stringify(list));
console.log({
  totalVoices: list.length,
  withOfficialAnimations: list.filter(v => v.animations?.length).length,
  withReadableTitle: list.filter(v => !v.title.includes('.m4a') && !v.title.match(/^\d+_\w+_\d+$/)).length
});
