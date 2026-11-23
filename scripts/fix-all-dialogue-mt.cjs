const fs = require('fs');
const path = require('path');

const pubConvPath = 'public/home-assets/conversations.json';
const dataConvPath = 'data/home-conversations.json';
const voiceIndexPath = 'data/voice-index.json';
const commuRootDir = 'data/translations';
const logPath = 'translation-work/翻译变更日志.jsonl';

const pubConvs = JSON.parse(fs.readFileSync(pubConvPath, 'utf8'));
const dataConvs = JSON.parse(fs.readFileSync(dataConvPath, 'utf8'));
const voiceIndex = JSON.parse(fs.readFileSync(voiceIndexPath, 'utf8'));

const now = new Date().toISOString();
const logEntries = [];

// 1. Comprehensive Dialogue Fixes for Home Conversations
const dialogueFixes = [
  {
    convId: '14',
    seqId: 'mypage_talking_duo_0100010010020',
    newOrig: '智代子ちゃんが教えてくれた駄菓子屋さん、とっても素敵で金平糖を買っちゃいました',
    newZh: '智代子酱告诉我的那家点心铺真的很棒，我买了金平糖呢……',
    reason: '真乃对智代子，修复駄菓子屋ASR误识别为高谷先生与金平糖误译'
  },
  {
    convId: '25',
    seqId: 'mypage_talking_duo_0150010010020',
    newOrig: '甜花ちゃんがくれたお土産、美味しかった～ 桃太郎さんのきびだんご',
    newZh: '甜花酱送给我的特产点心好好吃～是桃太郎的吉备团子呢……',
    reason: '真乃对甜花，修复きびだんご（吉备团子）被误译为真太郎小米饺子'
  },
  {
    convId: '33',
    seqId: 'mypage_talking_duo_0080010010020',
    newOrig: 'ほっ…ほんと…… ピーちゃんの羽、ついてきちゃったみたい',
    newZh: '啊……真的耶……好像是沾到小皮的羽毛了。',
    reason: '真乃对雾子，修复将小鸟皮酱（ピーちゃん）错译为“豌豆酱”'
  },
  {
    convId: '56',
    seqId: 'mypage_talking_trio_0030010020010010',
    newOrig: 'はい！ 期間限定のスイーツがあるらしいのですがーもしよければご一緒しませんか？',
    newZh: '好呀！听说有期间限定的甜品推出呢，方便的话要不要一起去尝尝呀？',
    reason: '巡对真乃灯织，修复将期間限定（きかんげんてい）误听机翻为“经纪公司做的糖果”'
  },
  {
    convId: '65',
    seqId: 'mypage_talking_duo_0020100010010',
    newOrig: '仕事の合間に食べるような… 大きくておいしいチョコでおすすめってある？',
    newZh: '请问在工作休息时适合吃的大块美味巧克力，有什么推荐的吗？',
    reason: '灯织请教智代子，修复机翻客服广告腔“当您因工作而感到不知所措时…”'
  },
  {
    convId: '66',
    seqId: 'mypage_talking_duo_0020110010010',
    newOrig: '美味しいコロッケが買えるお店があるって聞いて、もしよかったら教えてほしいです',
    newZh: '听说附近有家店能买到超美味的可乐饼，方便的话能告诉我是在哪里吗？',
    reason: '灯织向树里请教美食，修复将买可乐饼（買える）错听译为“你可以回家”'
  },
  {
    convId: '71',
    seqId: 'mypage_talking_duo_0020130010010',
    newOrig: '今度のCMでショップ店員を演じることになって 接客について教えていただけませんか？',
    newZh: '因为在接下来的CM中我要扮演店员，能请教一下关于接待客人的技巧吗？',
    reason: '灯织请教夏叶，修复ショップ店員（店员）接客机翻误译为“Shoptein作为引擎”'
  },
  {
    convId: '78',
    seqId: 'mypage_talking_duo_0020230010010',
    newOrig: '市川さん、魚座…？ あの、映画館なんですね',
    newZh: '市川同学，是双鱼座……？那个，原来是在电影院呀。',
    reason: '灯织对雏菜，修复市川雏菜被错称“市川先生”及电影院误译'
  },
  {
    convId: '82',
    seqId: 'mypage_talking_duo_0020270010010',
    newOrig: '鈴木さん、その雑談のネタ集めとかってどこでされてるんですか？',
    newZh: '羽那同学，你平时的聊天话题都是在哪里收集的呢？',
    reason: '灯织对羽那，修复杂谈（雑談）机翻直译为“杂项子弹”及铃木先生称谓'
  },
  {
    convId: '88',
    seqId: 'mypage_talking_duo_0070020010010',
    newOrig: 'つまり、まみみんのからかいに対抗できる返しがしたいってこと？ ひおりん健気！',
    newZh: '也就是说，你想学会怎么反击摩美美的捉弄对吧？灯织织真让人心疼呢！',
    reason: '结华对灯织，修复将摩美美（まみみん）机翻为“妈妈”，灯织（ひおりん）音译为“健内日和”'
  },
  {
    convId: '110',
    seqId: 'mypage_talking_duo_0250020010020',
    newOrig: 'タブレット、ありがとう。いただくね',
    newZh: '含片对吧，谢谢你，我收下啦。',
    reason: '美琴对灯织，修复清凉含片（タブレット）直译为“鞋子平板电脑”'
  },
  {
    convId: '126',
    seqId: 'mypage_talking_duo_0180190010020',
    newOrig: 'あははは！愛依！そう！読んでもらえると嬉しいなぁ',
    newZh: '啊哈哈哈！爱依！对吧！你能看的话我也很高兴呢～',
    reason: '冬优子对爱依，修复爱依名字被机翻识别为“人工智能（AI）”'
  },
  {
    convId: '130',
    seqId: 'mypage_talking_duo_0030040010010',
    newOrig: 'コンビニ限定のお菓子で、プチパーティーするの！よかったら一緒にどうかな？',
    newZh: '用便利店限定的零食开个小茶会！方便的话要不要一起呀？',
    reason: '巡对恋钟，修复コンビニ（便利店）机翻为“仅限情侣”'
  },
  {
    convId: '150',
    seqId: 'mypage_talking_duo_0030170010020',
    newOrig: '八宮めぐると芹沢あさひ、似てるっす！フフッ！',
    newZh: '八宫巡和芹泽朝日，感觉挺像的呢！呼呼！',
    reason: '朝日对巡，修复“似てるっす”（长得很像）ASR听成“丹尼特尔先生”'
  },
  {
    convId: '198',
    seqId: 'mypage_talking_duo_0150040010010',
    newOrig: 'すき焼き… いい匂い…おいしそう…',
    newZh: '寿喜烧……好香的味道……看起来好好吃……',
    reason: '甜花闻到饭菜香，修复将寿喜烧（すき焼き）机翻为“滑雪很热”'
  },
  {
    convId: '349',
    seqId: 'mypage_talking_quartet_0250070120210010010',
    newOrig: '次の仕事終わったら、プロデューサーが迎えに来るみたい',
    newZh: '等下一项工作结束之后，制作人好像会来接我们呢。',
    reason: '美琴四人对话，修复将制作人（プロデューサー）误译为“制片人”'
  },
  {
    convId: '428',
    seqId: 'mypage_talking_quartet_0090150180230010040',
    newOrig: 'へぇ～、そうなんですね～！',
    newZh: '诶～原来是这样呀～！',
    reason: '雏菜感叹，修复口语“そうなんですね”直译为“它是什么”'
  },
  {
    convId: '443',
    seqId: 'mypage_talking_duo_0100240010020',
    newOrig: 'え、いいんですか？ あのクラクラするやつですか？',
    newZh: '诶、真的可以吗？是吃了会头晕脑胀的那个吗？',
    reason: '日花与智代子试吃超辣巧克力，修复将クラクラ（头晕眼花）机翻为“乐井”'
  },
  {
    convId: '479',
    seqId: 'mypage_talking_duo_0110250010020',
    newOrig: 'え？ 何だろう？ あまり考えたことはないや',
    newZh: '诶？平时是怎样呢……平时还真没怎么刻意想过呢。',
    reason: '美琴回答树里闲暇安排，修复口语“何だろう”直译为“它是什么”'
  },
  {
    convId: '485',
    seqId: 'mypage_talking_duo_0140110010010',
    newOrig: '甘奈って、動物だったら何っぽいかなー',
    newZh: '甘奈要是变成动物的话，感觉会像什么动物呢～？',
    reason: '甘奈问树里，修复将甘奈（あまな）机翻误拆为“它很甜，它是一种动物”'
  },
  {
    convId: '515',
    seqId: 'mypage_talking_duo_0120270010010',
    newOrig: '商店街に コロッケの おいしいお店がございます',
    newZh: '商业街有一家可乐饼非常美味的店铺。',
    reason: '凛世推荐美食，润色译文规范可乐饼称谓'
  },
  {
    convId: '546',
    seqId: 'mypage_talking_duo_0130270010010',
    newOrig: 'おすすめのプロテインがあるわ。味自体は甘くて飲みやすいと思うわ',
    newZh: '我有一款推荐的蛋白粉哦。味道偏甜而且很容易入口呢。',
    reason: '夏叶推荐蛋白粉，修复プロテイン被生硬译为蛋白质'
  },
  {
    convId: '546',
    seqId: 'mypage_talking_duo_0130270010020',
    newOrig: 'あ、そうなんだー 飲んでみようかなー',
    newZh: '啊，是这样呀～那我喝喝看好了～',
    reason: '羽那回答夏叶，修复飲んでみよう误听为なんで見よう“为什么观看它”'
  },
  {
    convId: '563',
    seqId: 'mypage_talking_trio_0140130190010010',
    newOrig: 'おー！夏葉ちゃんの今日のメイクめっちゃきれい～！コツとかあるの？教えて教えて～！',
    newZh: '哇！夏叶酱今天的妆容超级漂亮～！有什么诀窍吗？教教我教教我～！',
    reason: '甘奈夸夏叶妆容，修复メイク（化妆）ASR误识别为愛依ク机翻为“恋爱”'
  },
  {
    convId: '563',
    seqId: 'mypage_talking_trio_0140130190010020',
    newOrig: 'もちろんいいわよ。代わりに、甘奈のも教えて頂戴。前から気になっていたのよ',
    newZh: '当然可以呀。作为交换，甘奈也教教我你的化妆诀窍吧？我之前就一直挺在意的呢。',
    reason: '夏叶对甘奈，修复甘奈名字被机翻直译为“它很甜”'
  },
  {
    convId: '563',
    seqId: 'mypage_talking_trio_0140130190010030',
    newOrig: 'おー！メイク講習会！うちもやるやる！',
    newZh: '哦～！化妆交流会！我也要参加我也要参加！',
    reason: '爱依参加，修复メイク講習会误识别机翻为“爱库公司”'
  },
  {
    convId: '624',
    seqId: 'mypage_talking_duo_0160180020020',
    newOrig: 'うーん、初めての時は思った… でも… 段々美味しさのコツがわかってきたかなーって',
    newZh: '嗯，我第一次也是这么想的……不过……感觉渐渐掌握做出美味的诀窍了呢～',
    reason: '冬优子分享烹饪，修复将段々（渐渐地）音译为“兰丹”'
  },
  {
    convId: '632',
    seqId: 'mypage_talking_duo_0160250010010',
    newOrig: '北海道での写真集撮影なんですねー！ 美味しいものいっぱい食べられるといいなぁ',
    newZh: '原来是要去北海道拍写真集呀！能吃到好多好吃的就太棒啦～',
    reason: '千雪与美琴交谈，修复将北海道写真集机翻识别为“奥海道修真”'
  },
  {
    convId: '653',
    seqId: 'mypage_talking_duo_0170230010020',
    newOrig: 'なんの話ですか～？',
    newZh: '你们在聊什么话题呀～？',
    reason: '雏菜插话，修复口语“なんの話”直译为“它是什么？嘿！”'
  },
  {
    convId: '656',
    seqId: 'mypage_talking_duo_0170260010020',
    newOrig: '何の話？ 武道館？',
    newZh: '聊什么呢？武道馆？',
    reason: '路加插话，修复将武道馆音译为“布达翁”'
  },
  {
    convId: '687',
    seqId: 'mypage_talking_duo_0240180010010',
    newOrig: '差し入れみたいですね、これ。先輩から先にどうぞです',
    newZh: '好像是送来的慰问点心呢。请前辈先挑吧～',
    reason: '日花与冬优子，修复将慰问点心（差し入れ）误译为“生鱼片”'
  }
];

// Apply dialogue fixes to both conversations.json files
for (const fix of dialogueFixes) {
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
}

// 2. Global Polish across voice-index.json for Casting & Home Voices
let voiceFixCount = 0;
for (const v of voiceIndex) {
  let changed = false;
  const before = { original: v.original, translation: v.translation };

  // Sync any from dialogueFixes
  for (const df of dialogueFixes) {
    if (v.key && v.key.includes(df.seqId)) {
      v.original = df.newOrig;
      v.translation = df.newZh;
      changed = true;
    }
  }

  // Casting voice fixes
  if (v.key && v.key.includes('mypage_casting_voice_024_02')) {
    v.translation = '请抱紧我！好～的！可以啦！嗯～好香的味道。呐、你也能闻到我身上香香的味道吗？';
    changed = true;
  } else if (v.key && v.key.includes('mypage_casting_voice_024_06')) {
    v.translation = '我平时总是习惯低着头……如果没有你在的话，每天都会变得那样吧。所以……那个……想和你在一起。';
    changed = true;
  } else if (v.key && v.key.includes('mypage_casting_voice_024_07')) {
    v.translation = '就剩我们两个人了呢。周围又暗又安静，心跳都加快了。嗯，一起加油吧，虽然是在加班啦。(笑) 有你在真是太好了～！';
    changed = true;
  } else if (v.key && v.key.includes('mypage_casting_voice_024_11')) {
    v.translation = '洗衣服不要翻面洗，口袋里面也要掏空检查。要我说多少次你才记得住呀？这样下去你可根本离不开我哦！';
    changed = true;
  }

  // Systematic name & title polish in voice translations
  if (v.translation) {
    let t = v.translation;
    const oldT = t;
    t = t.replace(/制片人/g, '制作人');
    t = t.replace(/目古鲁酱/g, '巡酱').replace(/目古鲁/g, '巡');
    t = t.replace(/阿金酱/g, '恋钟酱').replace(/阿金/g, '恋钟');
    t = t.replace(/宇久屋/g, '咲耶');
    t = t.replace(/由香酱/g, '结华酱');
    t = t.replace(/朱里酱/g, '树里酱').replace(/朱里/g, '树里');
    t = t.replace(/松畑同学/g, '夏叶同学').replace(/松畑/g, '夏叶');
    t = t.replace(/小春树/g, '春希酱').replace(/春树同学/g, '春希同学').replace(/春树/g, '春希');
    t = t.replace(/玛诺酱/g, '真乃酱').replace(/莫诺酱/g, '真乃酱').replace(/玛诺/g, '真乃');
    t = t.replace(/须弥小姐/g, '美琴小姐').replace(/须弥/g, '美琴');
    t = t.replace(/豌豆酱/g, '小皮');
    t = t.replace(/奥海道修真/g, '北海道写真集拍摄');
    t = t.replace(/布达翁/g, '武道馆');
    t = t.replace(/生鱼片/g, '慰问点心');

    if (t !== oldT) {
      v.translation = t;
      changed = true;
    }
  }

  if (changed) {
    voiceFixCount++;
    logEntries.push({
      timestamp: now,
      type: 'voice_polish',
      id: v.key,
      idol: v.idol,
      before,
      after: { original: v.original, translation: v.translation },
      reason: '全面排查机翻直译硬伤与角色名音译错误，统一偶像专有名词与地道表达',
      operator: 'Antigravity AI'
    });
  }
}

// 3. Fix "制片人" -> "制作人" across commu translation files
let commuFixCount = 0;
function walkAndFixCommu(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkAndFixCommu(fullPath);
    } else if (entry.name.endsWith('.json')) {
      let data;
      try {
        data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      } catch (e) {
        continue;
      }
      const rows = Array.isArray(data) ? data : data.rows || [];
      let fileModified = false;
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row && typeof row.trans === 'string' && row.trans.includes('制片人')) {
          const beforeTrans = row.trans;
          row.trans = row.trans.replace(/制片人/g, '制作人');
          fileModified = true;
          commuFixCount++;
          logEntries.push({
            timestamp: now,
            type: 'commu_term_fix',
            file: path.relative(commuRootDir, fullPath),
            row: i,
            id: row.id,
            before: beforeTrans,
            after: row.trans,
            reason: '偶像大师系列统一术语修正：将“制片人”规范为“制作人”',
            operator: 'Antigravity AI'
          });
        }
      }
      if (fileModified) {
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
      }
    }
  }
}
walkAndFixCommu(commuRootDir);

// Write back updated data
fs.writeFileSync(pubConvPath, JSON.stringify(pubConvs, null, 2), 'utf8');
fs.writeFileSync(dataConvPath, JSON.stringify(dataConvs, null, 2), 'utf8');
fs.writeFileSync(voiceIndexPath, JSON.stringify(voiceIndex, null, 2), 'utf8');

for (const entry of logEntries) {
  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
}

console.log(`Successfully fixed ${dialogueFixes.length} conversation dialogue lines.`);
console.log(`Successfully polished ${voiceFixCount} voice entries.`);
console.log(`Successfully corrected ${commuFixCount} commu lines in story files.`);
console.log(`Appended ${logEntries.length} records to ${logPath}.`);
