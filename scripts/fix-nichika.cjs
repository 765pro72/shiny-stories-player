const fs = require('fs');

const pubConvPath = 'public/home-assets/conversations.json';
const dataConvPath = 'data/home-conversations.json';
const voiceIndexPath = 'data/voice-index.json';
const logPath = 'translation-work/翻译变更日志.jsonl';

const pubConvs = JSON.parse(fs.readFileSync(pubConvPath, 'utf8'));
const dataConvs = JSON.parse(fs.readFileSync(dataConvPath, 'utf8'));
const voiceIndex = JSON.parse(fs.readFileSync(voiceIndexPath, 'utf8'));

const fixes = [
  {
    convId: '423',
    seqId: 'mypage_talking_duo_0240090010010',
    newOrig: '80…57…83…',
    newZh: '80……57……83……',
    reason: '七草日花数数台词，原译误听八十三（hachijuusan）为叶月（hazuki）并臆测算账'
  },
  {
    convId: '423',
    seqId: 'mypage_talking_duo_0240090010020',
    newOrig: 'なっ! なんですか?',
    newZh: '什、什么事呀？！',
    reason: '小宫果穗听到日花数数的惊讶反应，修复机翻“什么！它是什么？”'
  },
  {
    convId: '49',
    seqId: 'mypage_talking_duo_0240010010010',
    newOrig: 'ふーっ! あの…アクビじゃないので…',
    newZh: '呼——！那个……我可不是在打哈欠哦……',
    reason: '日花对真乃，修复机翻阿库比（打哈欠音译）'
  },
  {
    convId: '79',
    seqId: 'mypage_talking_duo_0020240010020',
    newOrig: 'あーーー! マー! 稼げるってことですかね',
    newZh: '啊——！也就是说、能挣到钱对吧？',
    reason: '日花对灯织，修复将マー（语气词）误译为“妈”'
  },
  {
    convId: '157',
    seqId: 'mypage_talking_duo_0240030010010',
    newOrig: 'スイチッとっと… どこまで行ってます?',
    newZh: 'Switch游戏……你们进度打到哪里了？',
    reason: '日花对巡，修复将Switch译为“切换”，进度译为“走多远”'
  },
  {
    convId: '162',
    seqId: 'mypage_talking_quartet_0030240180210010020',
    newOrig: 'え?普通に… アブラゼミとかです',
    newZh: '诶？一般就是……油蝉之类的吧。',
    reason: '日花四人对话，修复将鸣蝉/油蝉音译为“阿布罗泽米”'
  },
  {
    convId: '256',
    seqId: 'mypage_talking_duo_0240050010010',
    newOrig: 'メンボをぎっしりパッケージに詰まってるのね 見るのなんか落ち着きません',
    newZh: '看着棉签塞得满满当当一整盒的样子，总感觉心里静不下来……',
    reason: '日花对摩美美，修复将棉签（メンボ）音译为“曼波”'
  },
  {
    convId: '344',
    seqId: 'mypage_talking_duo_0240070010010',
    newOrig: 'お忙しいところすみません! プロデューサーさんってどこにいるかご存じですか?',
    newZh: '百忙之中打扰了！请问制作人……你知道他在哪里吗？',
    reason: '日花对结华，修复ASR乱码“对不起美味！普罗迪……你知道Teyu-san在哪里吗？”'
  },
  {
    convId: '495',
    seqId: 'mypage_talking_duo_0240110010010',
    newOrig: 'は~ やばいやばいやばい!',
    newZh: '哈～糟了糟了太不妙了！',
    reason: '日花对树里，修复将yabai音译且加入“发布”'
  },
  {
    convId: '558',
    seqId: 'mypage_talking_duo_0240130010010',
    newOrig: 'うわやば、絶対遅刻！バスで行った方が早い！タクシー！',
    newZh: '哇糟糕了，绝对要迟到了！坐公交更快！还是打车？！',
    reason: '日花对夏叶，修复误将迟到识别为地国，公交打车识别为通行证拓库斯'
  },
  {
    convId: '631',
    seqId: 'mypage_talking_duo_0160240010020',
    newOrig: 'あ、あははは、大丈夫でした！帰り道',
    newZh: '啊、啊哈哈哈，没事的！在回家的路上……',
    reason: '日花对千雪，修复将大丈夫误识别为“动物”'
  },
  {
    convId: '705',
    seqId: 'mypage_talking_duo_0240190010010',
    newOrig: 'あーーーーー! いい匂い！',
    newZh: '啊————！好香的味道！',
    reason: '日花对爱依，修复ASR残缺“你闻到”'
  },
  {
    convId: '721',
    seqId: 'mypage_talking_duo_0240200010010',
    newOrig: 'あ、これ…アサクラさんのドリンクです え、間違って口つけ… え、と…',
    newZh: '啊、这是……浅仓同学的饮料。诶、我不小心喝到了……诶、那个……',
    reason: '日花对透，修复将对嘴喝（口つけた）错译为“吻到你了”'
  },
  {
    convId: '758',
    seqId: 'mypage_talking_duo_0240230010010',
    newOrig: 'あ、それ、超限定のやつじゃないですか! すごい!',
    newZh: '啊、那个不是超级限定款吗！好厉害！',
    reason: '日花对雏菜，修复ASR语无伦次'
  }
];

const logEntries = [];
const now = new Date().toISOString();

for (const fix of fixes) {
  for (const c of [pubConvs[fix.convId], dataConvs[fix.convId]]) {
    if (!c) continue;
    for (const item of (c.sequence || [])) {
      if (item.id === fix.seqId) {
        logEntries.push({
          timestamp: now,
          type: 'dialogue_fix',
          id: fix.seqId,
          convId: fix.convId,
          speaker: item.speaker,
          before: { original: item.original, translation: item.translation },
          after: { original: fix.newOrig, translation: fix.newZh },
          reason: fix.reason,
          operator: 'Antigravity AI'
        });
        item.original = fix.newOrig;
        item.translation = fix.newZh;
      }
    }
  }
  for (const v of voiceIndex) {
    if (v.key && v.key.includes(fix.seqId)) {
      v.original = fix.newOrig;
      v.translation = fix.newZh;
    }
  }
}

// Also fix mypage_1040240100_2_11 in voiceIndex
for (const v of voiceIndex) {
  if (v.key && v.key.includes('mypage_1040240100_2_11')) {
    logEntries.push({
      timestamp: now,
      type: 'voice_fix',
      id: v.key,
      before: { original: v.original, translation: v.translation },
      after: { original: 'あなた…見つめる…ふさぐ', translation: '注视着你……堵住双耳' },
      reason: '日花服装语音修复，原为ASR错误“你，第三个梅尔斯塔格”',
      operator: 'Antigravity AI'
    });
    v.original = 'あなた…見つめる…ふさぐ';
    v.translation = '注视着你……堵住双耳';
  }
}

fs.writeFileSync(pubConvPath, JSON.stringify(pubConvs, null, 2), 'utf8');
fs.writeFileSync(dataConvPath, JSON.stringify(dataConvs, null, 2), 'utf8');
fs.writeFileSync(voiceIndexPath, JSON.stringify(voiceIndex, null, 2), 'utf8');

for (const entry of logEntries) {
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
}

console.log('Fixed', fixes.length + 1, 'items and logged', logEntries.length, 'records.');
