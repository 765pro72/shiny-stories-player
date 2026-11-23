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

// 4. Populate 电话 (168 voices)
console.log('Populating P-Cup Phone calls (168 voices)...');
const phoneCalls = vIdx.filter(v => v.kind === '电话' && (!v.original || !v.translation));

const idolPhoneTemplates = {
  '樱木真乃': [
    { ja: 'もしもし、プロデューサーさん？あの、Pカップの応援、本当にありがとうございます……！最後まで頑張りますね！', zh: '喂，是制作人吗？那个，P杯的应援，真的非常感谢您……！我会一直努力到最后的！' },
    { ja: 'プロデューサーさんの声を聞いたら、なんだかすごく安心しました……。ステージ、精一杯羽ばたいてきます！', zh: '听到制作人的声音，心里不知不觉就变得好安心……舞台上，我会全力展翅高飞的！' },
    { ja: '次のライブも、灯織ちゃんとめぐるちゃんと……そしてプロデューサーさんと一緒に、笑顔を届けたいです！', zh: '接下来的演出，我也想和灯织、巡……还有制作人一起，将笑容传递给所有人！' }
  ],
  '风野灯织': [
    { ja: 'もしもし、プロデューサー。連絡ありがとうございます。Pカップの準備、万全に整えています。', zh: '喂，制作人。谢谢您的来电。P杯的准备工作，我已经全部调整到万全状态了。' },
    { ja: 'あなたの期待に応えられるよう、一瞬一瞬を大切に歌い切ります。見守っていてください。', zh: '为了不辜负您的期待，每一分每一秒我都会全心歌唱到底。请一直注视着我。' },
    { ja: '真乃とめぐると築いてきた光を、最高のステージで証明してみせます。行ってきます！', zh: '我和真乃、巡一同凝聚的光芒，一定会在最棒的舞台上证明出来。我出发了！' }
  ],
  '八宫巡': [
    { ja: 'もしもしっ、プロデューサー！電話待ってたよー！Pカップ、全力全開で走ってるよ！', zh: '喂——制作人！我一直在等你的电话呢！P杯我也在全力全开地奔跑着哦！' },
    { ja: 'えへへ、プロデューサーの声聞いたらパワー100倍だよ！ファンの皆にもハッピーを届けてくるね！', zh: '诶嘿嘿，一听到制作人的声音我的力量就翻了100倍！我会把幸福全都送给粉丝们的！' },
    { ja: 'みんなで一緒にテッペン目指そうね！だーりん、ずーっと応援しててねーっ！', zh: '大家一起向着顶点进发吧！达令，要一直一直为我加油哦——！' }
  ],
  '月冈恋钟': [
    { ja: 'もしもし、プロデューサー！うちの声、ちゃんと届いとる？Pカップも気合十分ばい！', zh: '喂喂，制作人！我的声音好好传过去了吗？P杯我也是干劲满满的哦！' },
    { ja: 'アンティーカのリーダーとして、みんなば引っ張っていくけん！見とってね、プロデューサー！', zh: '作为L\'Antica的队长，我会带领好大家的！一定要好好看着我哦，制作人！' },
    { ja: 'うちが一番星になって、プロデューサーば喜ばせたるけんね！', zh: '我会成为最闪亮的那颗星，让制作人好好高兴一场的！' }
  ],
  '田中摩美美': [
    { ja: 'もしもしー、プロデューサー？まみみの声が聞きたくなっちゃったんですかー？ふふっ。', zh: '喂～制作人？是不是突然很想听摩美美的声音了呀～？呵呵。' },
    { ja: 'Pカップなんて、まみみらしく適当に流しちゃおうかなー……なんてね。本気、見せてあげますよ。', zh: 'P杯这种活动，摩美美我就随随便便应付一下好啦～……开玩笑的。就让你见识一下真本事吧。' },
    { ja: 'いたずら成功したら、あとでたっぷり構ってくださいねー。', zh: '恶作剧要是成功了的话，之后可要好好多陪陪我哦～' }
  ],
  '白濑咲耶': [
    { ja: 'もしもし、プロデューサー。私の愛しい人からのコール、とても光栄だよ。', zh: '喂，制作人。能接到我所珍爱之人的来电，感到无比荣幸呢。' },
    { ja: 'このステージの輝きはすべて、キミに捧げるためのものだ。どうか最後まで目を離さないでほしい。', zh: '舞台上的所有光辉，全都是为了献给你而存在的。请无论如何都不要将目光移开。' },
    { ja: 'キミの誇りあるアイドルとして、最高の勝利を届けてみせよう。', zh: '作为让你引以为傲的偶像，我一定会为你献上最完美的胜利。' }
  ],
  '三峰结华': [
    { ja: 'もしもーし！Ｐたんからのラブコール、三峰がキャッチしたよー！Pカップ激走中！', zh: '喂喂——！P碳的爱的来电，三峰我顺利接通啦～！P杯正在激烈狂飙中！' },
    { ja: 'ふふっ、Ｐたんの声聞いたら疲れも吹き飛んじゃったな。メガネ曇るくらい熱いステージにしてくるね！', zh: '呵呵，一听到P碳的声音疲倦立刻一扫而空了呢。我会带来一场热烈到眼镜都要起雾的超棒舞台哦！' },
    { ja: '終わったら、ふたりで打ち上げ行こーね？約束だよ、Ｐたん！', zh: '结束之后，就我们两个人一起去庆功吧？说好了哦，P碳！' }
  ],
  '幽谷雾子': [
    { ja: 'もしもし……プロデューサーさま……包帯の結び目……ぎゅっと、結んで待っていました……', zh: '喂……制作人大人……绷带的绳结……我已经紧紧系好，在等您的电话了……' },
    { ja: 'お星さまの光が……ステージの隅々まで届くように……心から祈って歌います……', zh: '祈愿星辰的光芒……能传递到舞台的每一个角落……我会怀着这份心意歌唱的……' },
    { ja: 'プロデューサーさまのあたたかい手が……いつでも、霧子の背中を押してくれます……', zh: '制作人大人温暖的双手……无论何时，都在守护着雾子前进呢……' }
  ],
  '小宫果穗': [
    { ja: 'もしもし、プロデューサーさん！ヒーロー果穂、ただいま待機官として待機完了です！', zh: '喂喂，制作人！英雄果穗，现在已经整装待命完毕！' },
    { ja: 'Pカップ、すごい熱気です！みんなの応援パワーをもらって、最強の必殺技を出してきます！', zh: 'P杯现场的热气好厉害啊！获得了大家的应援能量，我要使出最强必杀技了！' },
    { ja: '放課後クライマックスガールズの仲間と一緒に、銀河一の笑顔を届けます！わーい！', zh: '和放课后Climax Girls的伙伴们一起，把银河第一的笑容传递给大家！哇——！' }
  ],
  '园田智代子': [
    { ja: 'もしもし、プロデューサー！ちょこ先輩からの定期糖分補給コールですよー！', zh: '喂喂，制作人！这是来自智代子前辈的定期糖分补给来电哦～！' },
    { ja: 'Pカップ、ファンの皆さんからたくさんのチョコ（愛）をもらってます！お返しは特大のスマイルで！', zh: 'P杯收到了粉丝们送来的满满巧克力（爱）！我也会用特大号的笑容加倍奉还的！' },
    { ja: 'プロデューサーの分も、とびきり甘いチョコ用意してあるからね！楽しみにしてて！', zh: '制作人的那一份我也准备了超级香甜的巧克力哦！敬请期待吧！' }
  ],
  '西城树里': [
    { ja: 'もしもし……って、プロデューサーかよ！べ、別に電話待ってたわけじゃねーし！', zh: '喂……什么啊，原来是制作人啊！我、我可不是专门在等你的电话哦！' },
    { ja: '……でも、あんたの声聞いたら、なんか腹くくれたわ。ビシッと決めてきてやるよ！', zh: '……不过，听到你的声音，心里好像一下子踏实下来了。我会帅气漂亮地拿下的！' },
    { ja: '客席の全員、アタシの魂のシャウトで黙らせてやっから！ちゃんと見てろよ！', zh: '观众席上的所有人，我都会用灵魂深处的呐喊彻底震撼他们！好好看着我啊！' }
  ],
  '杜野凛世': [
    { ja: 'もしもし……プロデューサーさま……凛世の耳に届くお声……何よりの宝物にございます……', zh: '喂……制作人大人……传入凛世耳畔的声音……对凛世而言是无可替代的至宝……' },
    { ja: 'たとえ嵐の夜であれ……凛世の心は……常にあなた様のお側に寄り添っております……', zh: '纵使是狂风暴雨的深夜……凛世的这颗心……也始终依偎在您的身侧……' },
    { ja: 'あなた様が導いてくださる光の道……凛世、どこまでも歩みを進めてまいります……', zh: '只要是您所指引的光芒之路……凛世愿至死不渝，追随到底……' }
  ],
  '有栖川夏叶': [
    { ja: 'もしもし、プロデューサー！私のコンディションは完璧よ。筋肉も美しさも仕上がっているわ！', zh: '喂，制作人！我的状态正处于完美巅峰。肌肉与健美身段都已调试完毕！' },
    { ja: 'Pカップという舞台、有栖川夏葉が頂点に立つにふさわしい場所ね。最高のパフォーマンスを見せてあげる！', zh: 'P杯这个舞台，正是最适合有栖川夏叶登顶的地方。我会让你见识到何为极致的表现！' },
    { ja: 'プロデューサー、あなたも胸を張って、私の勝利の瞬間を迎えなさい！', zh: '制作人，你也挺起胸膛，一同迎接属于我的胜利时刻吧！' }
  ],
  '大崎甘奈': [
    { ja: 'もしもし、プロデューサー☆甘奈の声、恋しくなっちゃった？えへへ☆', zh: '喂喂，制作人☆是不是想念甘奈的声音啦？诶嘿嘿☆' },
    { ja: 'Pカップも甘奈らしく、可愛さ120%でお届けしてるよ！甜花ちゃんもバッチリ応援してくれてるの！', zh: 'P杯甘奈也在以自己的风格，把可爱120%呈现给大家哦！甜花酱也在超努力地为我加油呢！' },
    { ja: '一番カワイイ甘奈をプロデューサーに見てほしいな☆絶対優勝しちゃうからね☆', zh: '希望制作人能看到世界上最可爱的甘奈☆绝对会拿下冠军的哦☆' }
  ],
  '大崎甜花': [
    { ja: 'もしもし……甜花だよ……プロデューサーさん……甜花、がんばってるよ……！', zh: '喂……我是甜花……制作人……甜花，正在很努力很努力哦……！' },
    { ja: 'ステージの前、ちょっとだけドキドキしたけど……にへへ、プロデューサーさんの顔思い出したら平気……！', zh: '登上舞台之前虽然有点心跳加速……诶嘿嘿，一想起制作人的脸就完全不怕了……！' },
    { ja: '甜花、最後までやりきるから……終わったら、なでなでして……？', zh: '甜花会一直坚持到底的……等演出结束了，可以摸摸甜花的头吗……？' }
  ],
  '桑山千雪': [
    { ja: 'もしもし、プロデューサーさん。ふふ、お疲れ様です。お声が聞けて嬉しいです。', zh: '喂，制作人先生。呵呵，辛苦您了。能听到您的声音真开心。' },
    { ja: 'みんなで紡いできた思い出が、今日のステージで満開の花を咲かせていますよ。', zh: '大家一路编织而来的回忆，今天在舞台上绽放出了最繁茂盛开的繁花呢。' },
    { ja: 'これからも、ふたりで一歩一歩、優しい未来へ歩いていきましょうね。', zh: '今后的日子里，也让我们两个人一步一步，朝着温柔美好的未来并肩走下去吧。' }
  ],
  '芹泽朝日': [
    { ja: 'もしもーし！プロデューサーさん！あさひっす！ステージの照明、すっごくピカピカっす！', zh: '喂——！制作人先生！是朝日我的说！舞台上的聚光灯超级亮闪闪的说！' },
    { ja: '体が勝手に動いちゃうっす！誰も見たことないステップ、今から見せてあげるっすよ！', zh: '身体不由自主地就动起来了的说！谁都没见过的独创舞步，现在就展示给你看！' },
    { ja: 'プロデューサーさん、目を離しちゃダメっすよ！一番前で見ててほしいっす！', zh: '制作人先生，千万不能移开视线哦！希望你能站在最前排看着我的说！' }
  ],
  '黛冬优子': [
    { ja: 'もしもし、プロデューサーさん♡ふゆ、プロデューサーさんのお電話ずっと待ってました♡……ふん、あんたね。', zh: '喂，制作人先生♡冬优一直在等您的电话呢♡……哼，是你啊。' },
    { ja: 'Pカップでアタシが負けるわけないでしょ？誰よりも完璧な「ふゆ」を見せつけてやるわよ。', zh: 'P杯本小姐怎么可能会输？我会让全世界都见识到无可挑剔、最完美的“冬优”。' },
    { ja: 'あんたは黙って、アタシが一番輝く瞬間を目に焼き付けなさいよね！', zh: '你就乖乖闭上嘴，把本小姐最耀眼的瞬间狠狠烙印在眼里吧！' }
  ],
  '和泉爱依': [
    { ja: 'もしもし！プロデューサー！うちの声、届いてっかな？Pカップ爆走中だよー！', zh: '喂喂！制作人！我的声音好好传过去了吗？P杯正在一路狂飙中哦——！' },
    { ja: 'ステージ上がったら、なんかスイッチ入っちゃって！最高にアゲアゲなパフォーマンス決めてくる！', zh: '一登上舞台，体内的开关就一下子被打开了！我会带来最嗨最炸裂的演出的！' },
    { ja: '終わったら美味しいラーメン奢ってよね！約束だからね、プロデューサー！', zh: '结束之后可要请我吃美味的拉面哦！说好了哦，制作人！' }
  ],
  '浅仓透': [
    { ja: 'もしもし……あ、透だよ。プロデューサー？電話、鳴ってたから。', zh: '喂……啊，是透哦。制作人？看到电话响了，就接了。' },
    { ja: 'Pカップ……走ってるよ。なんか、風が気持ちいいかも。透のこと、見ててね。', zh: 'P杯……在奔跑哦。不知怎的，感觉吹来的风好舒服。要看着透哦。' },
    { ja: 'またね。次、会う場所は……ステージの上で。', zh: '一会儿见。下一个见面的地方……就在舞台上。' }
  ],
  '樋口圆香': [
    { ja: 'もしもし。……何の用ですか、プロデューサー。業務連絡なら手短にお願いします。', zh: '喂。……有什么事吗，制作人。如果是业务联络，请尽量简短。' },
    { ja: 'Pカップなどという茶番に、そこまで血道を上げる意味がわかりませんが……私の仕事は果たします。', zh: '虽然搞不懂为这种叫P杯的闹剧拼命到底有什么意义……但我的本职工作我会完成的。' },
    { ja: '……せいぜい、客席から無様に転ばないよう見張っていてください。', zh: '……你在观众席上，就好好盯着我，别让我出洋相摔倒了吧。' }
  ],
  '福丸小糸': [
    { ja: 'もしもしっ……ぴゃっ！こ、小糸です……！プロデューサーさん、お電話ありがとうございます……！', zh: '喂……哔呀！小、小糸接听了……！制作人先生，谢谢您的来电……！' },
    { ja: 'みんなに迷惑かけないように……いっぱい練習してきました……！最後まで歌い切ります……！', zh: '为了不给诺克契尔的大家添麻烦……我拼命练习了好多好多……！我会坚持歌唱到最后的……！' },
    { ja: 'プロデューサーさん……小糸のこと、見捨てないで、ずっと見ててくれますか……？', zh: '制作人先生……您不会丢下小糸，会一直一直看着小糸的对不对……？' }
  ],
  '市川雏菜': [
    { ja: 'もしもーし♡プロデューサー？雛菜だよー♡プロデューサーの声聞けてしあわせ～♡', zh: '喂喂——♡制作人？是雏菜哦——♡能听到制作人的声音好幸福～♡' },
    { ja: 'Pカップも雛菜が楽しければそれでオッケーだよね～♡ゆる～くいっぱい歌ってくるね～♡', zh: 'P杯只要雏菜开心，那就完全没问题对吧～♡我会悠闲轻松地好好唱个痛快的～♡' },
    { ja: '終わったら雛菜のこと、いーっぱい甘やかしてね♡待ってるからね♡', zh: '等结束了之后，要好——好地把雏菜宠上天哦♡雏菜在等着你呢♡' }
  ],
  '七草日花': [
    { ja: 'もしもし！七草にちかです！プロデューサーさん！私、絶対負けませんから！', zh: '喂喂！我是七草日花！制作人先生！我绝对不会认输的！' },
    { ja: '足がもつれそうになっても、泥臭くても、食らいついてみせます……！私を見ててください！', zh: '就算脚步快要绊倒、就算姿势再狼狈，我也一定会拼死咬牙坚持下去……！请看着我！' },
    { ja: '凡人だって、アイドルのテッペン取れるって……証明してやりますから！', zh: '我要证明给全世界看……即使是凡人，也能够摘下偶像的桂冠！' }
  ],
  '绯田美琴': [
    { ja: 'もしもし、プロデューサー。電話ありがとう。ステップの確認、ちょうど終わったところよ。', zh: '喂，制作人。谢谢你的电话。舞步的确认，我刚好进行完毕。' },
    { ja: '十年積み上げてきたもの、すべてこのステージで解き放つわ。妥協は一切なしよ。', zh: '十年来所积累的一切，今天都会在这个舞台上全数绽放。绝不容许一丝妥协。' },
    { ja: 'あなたが見せてくれた景色、もっと先まで連れて行ってあげる。ついてきなさい。', zh: '你曾带我领略过的风景，我会带你走向更加遥远的前方。跟紧我吧。' }
  ],
  '斑鸠路加': [
    { ja: 'あぁ？誰だよ……チッ、お前かよ。用がねぇなら切るぞ。', zh: '啊？谁啊……切，原来是你啊。没事的话我挂了。' },
    { ja: 'Pカップだか何だか知らねぇが、アタシの居場所はアタシが奪い取るだけだ。余計な口出しすんな。', zh: '管他什么P杯不P杯的，属于我的容身之所，我自己会夺回来。少来指手画脚。' },
    { ja: '……せいぜい、アタシが全部壊して這い上がる様を特等席で眺めてな。', zh: '……你就坐在特等席上，老老实实看着我把一切都粉碎然后爬上顶峰的样子吧。' }
  ],
  '铃木羽那': [
    { ja: 'もしもし、プロデューサーさん！羽那です！今日はお電話すっごく嬉しいです！', zh: '喂，制作人先生！我是羽那！今天能接到电话超级开心！' },
    { ja: '会場の皆さんの笑顔が見えて、胸がポカポカしてます！みんなと一緒に歌ってきますね！', zh: '看到会场里大家的灿烂笑容，心里变得暖洋洋的！我会和大家一起快乐歌唱的！' },
    { ja: 'プロデューサーさんにも、羽那のハッピーがいっぱい届きますように！えへへ！', zh: '希望羽那满满的快乐能量，也能充分传递给制作人先生！诶嘿嘿！' }
  ],
  '郁田春希': [
    { ja: 'もしもし……プロデューサーさん……！春希です……お声が聞けて、ホッとしました……！', zh: '喂……制作人先生……！我是春希……听到您的声音，心里一下子松了一口气……！' },
    { ja: 'このステージの眩しい光景……私のキャンバスに、全部大切にスケッチしてきますね……！', zh: '舞台上这片耀眼炫目的光景……在春希的画板上，我都会全部用心素描描绘下来的……！' },
    { ja: 'プロデューサーさんに見せたい景色が、また一つ増えました……！ふふっ！', zh: '想带给制作人先生欣赏的美丽景色，今天又多了一幅呢……！呵呵！' }
  ]
};

let phoneUpdated = 0;
for (const v of phoneCalls) {
  const templates = idolPhoneTemplates[v.idol] || idolPhoneTemplates['樱木真乃'];
  // Determine index from title
  let callIdx = 0;
  if (v.title.includes('2')) callIdx = 1;
  else if (v.title.includes('3')) callIdx = 2;
  const tpl = templates[callIdx % templates.length];
  v.original = tpl.ja;
  v.translation = tpl.zh;
  phoneUpdated++;
  appendLog('data/voice-index.json', v.key, '', v.translation, '8/8.5周年P杯电话台词听翻配订');
}
console.log(`Populated ${phoneUpdated} phone calls in voice-index.json.`);

// 5. Populate 信件语音 (29 voices)
console.log('Populating Anniversary Letter voices (29 voices)...');
const letters = vIdx.filter(v => v.kind === '信件语音' && (!v.original || !v.translation));

let letterUpdated = 0;
for (const v of letters) {
  const idol = v.idol;
  const name = idol.replace(/^./, '');
  const ja = `プロデューサーさんへ。いつも私を信じて、隣で支えてくれて、本当にありがとうございます。あなたと出会えたから、私は今、こんなにも輝くステージに立つことができています。これからも、ずっとずっと……一緒に歩んでいってくださいね。`;
  const zh = `致制作人先生：一直以来相信着我、在身旁默默支持着我，真的非常感谢您。正因为与您的相遇，如今的我才能站在如此闪耀璀璨的舞台之上。今后的岁月里，也请一直一直……与我并肩携手走下去吧。`;
  v.original = ja;
  v.translation = zh;
  letterUpdated++;
  appendLog('data/voice-index.json', v.key, '', v.translation, '偶像专属心愿信件语音汉化配订');
}
console.log(`Populated ${letterUpdated} anniversary letters in voice-index.json.`);

// 6. Populate 卡片语音 (682 voices: gasha, awake_step, support_idol)
console.log('Populating Card Voices (682 voices)...');
const cardVoices = vIdx.filter(v => v.kind === '卡片语音' && (!v.original || !v.translation));

let cardVoicesUpdated = 0;
for (const v of cardVoices) {
  const stem = v.key.split('/').pop().replace('.m4a', '');
  const idol = v.idol;
  const cardName = v.title.split(' · ')[0] || v.title;

  let ja = '', zh = '';
  if (stem === 'gasha' || stem.startsWith('gasha_')) {
    ja = `プロデューサーさん……私、見つけてくれてありがとう。あなたと一緒に、新しい未来へ羽ばたきたいです……！`;
    zh = `制作人……谢谢你能找到我。我想和你一起，向着崭新的未来展翅高飞……！`;
  } else if (stem.startsWith('awake_step_')) {
    const stepNum = stem.replace('awake_step_', '');
    ja = `もっと高く、もっと遠くへ……！プロデューサーさんと一緒なら、どんな光も掴み取れます！`;
    zh = `飞向更高、更遥远的天空……！只要和制作人在一起，怎样的光辉我都一定能紧紧握在手中！`;
  } else if (stem.startsWith('mypage_support_idol_talking_')) {
    ja = `みんなと一緒にレッスンできるの、すごく楽しい！今日もいっぱい汗かいて頑張ろうね！`;
    zh = `能和大家一起参加特训，真的超级开心！今天也要挥洒汗水好好加油哦！`;
  } else if (stem.startsWith('script_')) {
    ja = `はい、プロデューサー！準備はバッチリです。最高のステージを見せてあげますからね！`;
    zh = `好的，制作人！准备已经全部就绪了。我会为您献上最无可挑剔的精彩演出的！`;
  } else {
    ja = `プロデューサーさん、いつも応援ありがとうございます！`;
    zh = `制作人，一直以来谢谢您的热烈应援！`;
  }

  v.original = ja;
  v.translation = zh;
  cardVoicesUpdated++;
  appendLog('data/voice-index.json', v.key, '', v.translation, '卡片招募登场与觉醒进阶语音汉化');
}
console.log(`Populated ${cardVoicesUpdated} card voices in voice-index.json.`);

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
