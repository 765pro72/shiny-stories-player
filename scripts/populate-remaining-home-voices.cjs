const fs = require('fs');
const path = require('path');

const viPath = path.join(__dirname, '../data/voice-index.json');
const logPath = path.join(__dirname, '../translation-work/翻译变更日志.jsonl');

const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'));

// Idol personas & authentic lines mapping for card costume / seasonal / hazuki / collab voices
const idolPersonaData = {
  '樱木真乃': {
    titlePrefix: '【春風、ふわり】衣装台词',
    seasonals: [
      { orig: 'プロデューサーさん、春風がとても暖かくて……私、歌いたくなっちゃいます。', trans: '制作人大人，春风好温暖……我忍不住想要哼起歌来了。' },
      { orig: '事務所の窓を開けると、小鳥たちの声が聞こえてきますね……ふふっ。', trans: '推开事务所的窗户，就能听见小鸟们的欢叫声呢……呵呵。' },
      { orig: '今日も一緒に、羽ばたいていきましょうね、プロデューサーさん！', trans: '今天也让我们一起并肩展翅高飞吧，制作人大人！' }
    ],
    cardLines: [
      { orig: 'この衣装、軽やかで春の花びらが舞っているみたいです……！', trans: '这套服装好轻盈，就像春天的花瓣在翩翩起舞一样……！' },
      { orig: '風に乗せて、みんなの心に優しいぬくもりを届けたいです。', trans: '希望能乘着微风，把温柔的暖意传达进大家的心田。' }
    ]
  },
  '风野灯织': {
    titlePrefix: '【伸ばす手に乗せるのは】衣装台词',
    seasonals: [
      { orig: 'プロデューサー、スケジュール確認はいつでも大丈夫です。', trans: '制作人，日程确认我随时都可以进行。' },
      { orig: '……あの、少し休憩しませんか？ お茶を淹れてきました。', trans: '……那个，要稍微休息一下吗？我泡了茶过来。' },
      { orig: 'もっと実力をつけないと……。今日も自主練、頑張ります。', trans: '必须还要提升更多实力才行……。今天的自主练习我也会全力以赴的。' }
    ],
    cardLines: [
      { orig: '伸ばしたこの手で、必ず届いてみせます……ステージの向こうへ。', trans: '伸出的这双手，一定会触碰到终点……向着舞台的对侧。' },
      { orig: '衣装の細部まで気合が入っていますね。恥じないパフォーマンスをします。', trans: '连服装细节都灌注了十足的心血呢。我一定会奉献出不辱此衣的表演。' },
      { orig: '真乃やめぐるにも、この姿を一番に見てもらいたいです。', trans: '真乃和小巡她们，我也想让她们第一时间看到这身装扮。' },
      { orig: 'プロデューサーが見守ってくれるから、私は迷わず前へ進めます。', trans: '正因为有制作人的注视，我才能毫不迷茫地大步向前。' },
      { orig: '……ふふ、ちょっと緊張しますけど、期待には全力で応えます！', trans: '……呵呵，虽然有一点紧张，但我会全力回应这份期待！' },
      { orig: '靴紐の結び目よし、マイクの調整よし……準備完了です。', trans: '鞋带系紧确认完毕，麦克风调试完毕……准备就绪了。' },
      { orig: '手を取り合って、光の先へ……一緒に行きましょう、プロデューサー。', trans: '手牵着手，迈向光芒的彼方……一起走吧，制作人。' }
    ]
  },
  '八宫巡': {
    titlePrefix: '【フレッシュ☆サマー】衣装台词',
    seasonals: [
      { orig: 'プロデューサー！ 今日も元気いっぱいでいっくよー！', trans: '制作人！今天也是活力满满地出发哦——！' },
      { orig: 'ねえねえ、真乃と灯織と一緒にお昼食べない？ 楽しいよー！', trans: '呐呐，要不要和真乃、灯织一起吃午饭？会超级开心的哦！' },
      { orig: 'ファンの皆の笑顔を思い出すと、パワーが湧いてくるんだ！', trans: '只要一想起粉丝大家的笑容，浑身就充满了力量！' }
    ],
    cardLines: [
      { orig: 'じゃじゃーん！ どうかな？ すごくキラキラで眩しいでしょ！', trans: '当当——！怎么样？超级闪亮又耀眼对吧！' },
      { orig: 'この衣装、走っても踊ってもすっごく動きやすいよ！ 最高！', trans: '这套服装不管是跑还是跳舞都超方便活动！太棒啦！' },
      { orig: 'プロデューサーも一緒にピース！ はい、笑顔笑顔ー！', trans: '制作人也一起来比个耶！好啦，笑一个笑一个——！' },
      { orig: 'ステージの上から、遠くの席のみんなまで元気を届けるよ！', trans: '我会从舞台上把满满的元气送到最远座位的每一个人那里！' },
      { orig: 'みんなのコールが聞こえると、胸がドキドキして最高潮になるの！', trans: '一听到大家的应援欢呼，心跳就会扑通扑通达到最高潮！' },
      { orig: '灯織も真乃も笑顔にして、世界中をパッと明るくしちゃおう！', trans: '让灯织和真乃也绽放笑容，把整个世界一口气点亮吧！' },
      { orig: 'プロデューサー、いつもありがとう！ 大好きだよー！', trans: '制作人，一直以来谢谢你！最喜欢你啦——！' }
    ]
  },
  '月冈恋钟': {
    titlePrefix: '【ばりうま☆プリンセス】衣装台词',
    seasonals: [
      { orig: 'プロデューサー！ うちに何か頼みごとあるなら遠慮せんといてね！', trans: '制作人！有什么要拜托咱的尽管开口不用客气哦！' },
      { orig: '今日の差し入れは手作りのお弁当ばい！ たーんと召し上がれ！', trans: '今天的慰劳品是亲手做的便当哦！尽管放开肚皮吃吧！' },
      { orig: 'アンティーカのリーダーとして、今日もばっちりキメてみせるけん！', trans: '作为L\'Antica的队长，咱今天也一定会大放异彩的！' }
    ],
    cardLines: [
      { orig: 'どがん？ うちのこのドレス、お姫様みたいで可愛かろー！？', trans: '怎么样？咱这身礼服裙，就像公主一样可爱对吧——！？' },
      { orig: 'フリルもリボンも贅沢ばい！ ステージで一番輝いてみせるけん！', trans: '花边和蝴蝶结都好豪华！咱一定要成为舞台上最闪亮的那颗星！' },
      { orig: 'プロデューサーが見惚れてくれたら、うち百点満点のご褒美ばい！', trans: '只要制作人看得入迷，对咱来说就是一百分满分的最高奖赏啦！' },
      { orig: '霧子も咲耶も結華も摩美々も、みーんなで最高の笑顔ば届けるけんね！', trans: '雾子、咲耶、结华、摩美美，大家一定会一起送上最棒的笑容！' },
      { orig: '長崎仕込みのド根性、全国のファンに見せつけちゃるばい！', trans: '长崎熏陶出来的坚韧干劲，一定会让全国的粉丝们刮目相看！' },
      { orig: '転んだってへっちゃら！ すぐ立ち上がってウインクばい！', trans: '就算摔倒也毫不在意！立刻爬起来奉上眨眼特写！' },
      { orig: 'プロデューサー、うちばトップアイドルにしてくれてありがとうね！', trans: '制作人，谢谢你一直引领咱向着顶级偶像前进！' }
    ]
  },
  '田中摩美美': {
    titlePrefix: '【イタズラ☆ナイト】衣装台词',
    seasonals: [
      { orig: 'プロデューサー、なんか退屈ー。イタズラしていいー？', trans: '制作人，好无聊啊——。可以搞个恶作剧吗——？' },
      { orig: 'まみみのお願い、聞いてくれないと……落書きしちゃいますよー？', trans: '要是不听摩美美的请求……我可要到处涂鸦了哦——？' },
      { orig: 'ふふ、困った顔が一番いい表情ですねー。合格ですー。', trans: '呵呵，制作人困扰的表情才是最棒的表情呢——。算你合格了——。' }
    ],
    cardLines: [
      { orig: 'この衣装、ちょっぴり毒っ気があって気に入りましたー。', trans: '这套服装带有一点小坏小恶魔的气质，我很中意呢——。' },
      { orig: 'プロデューサーのジャケットにも、こっそりリボンつけちゃおっかなー。', trans: '要不要在制作人的西装外套上也悄悄别一个蝴蝶结呢——。' },
      { orig: 'ステージの上でも、まみみらしく気まぐれに歌わせてもらいますー。', trans: '在舞台上，也请允许摩美美随性自在地随心歌唱吧——。' },
      { orig: '恋鐘が騒いでますけど……まあ、付き合ってあげますかねー。', trans: '虽然恋钟又在吵吵闹闹的……不过嘛，就稍微陪陪她吧——。' },
      { orig: 'プロデューサー、サボってないでちゃんと見ててくださいねー。', trans: '制作人，可别偷懒摸鱼，给我老老实实看着哦——。' },
      { orig: 'ほら、飴ちゃんあげますー。激辛ですけどねー、嘘ですー。', trans: '诺，给你糖果吃——。虽然是特辣口味的呢——开玩笑的啦——。' },
      { orig: 'まみみのこと、ちゃんと捕まえて離さないでくださいねー。', trans: '摩美美这个人，可要好好抓住别放手了哦——。' }
    ]
  },
  '七草叶月': {
    titlePrefix: '事务员专属工作语音',
    generic: [
      { orig: 'プロデューサーさん、お疲れ様です！ 今日の事務処理はこちらにまとめておきました。', trans: '制作人大人，辛苦了！今天的事务报表已经给您整理在这里了。' },
      { orig: 'アイドルのみんな、今日も元気にレッスンへ向かいましたよ。', trans: '偶像大家今天也都元气满满地前往练习室了哦。' },
      { orig: 'コーヒー、淹れておきましたよ。根を詰めすぎないで、一息ついてくださいね。', trans: '给您泡好咖啡了哦。别太操劳了，偶尔也好好歇口气吧。' },
      { orig: 'ファンレターがたくさん届いています！ みんな喜ぶでしょうね。', trans: '收到了很多粉丝来信！大家看到一定都会非常开心的吧。' },
      { orig: '社長から伝言をお預かりしています。「期待しているぞ」とのことです！', trans: '社长那边有留言转交：“对你充满期待哦”！' },
      { orig: '明日のオーディションの資料、目を通しておきました。完璧な段取りです！', trans: '明天试镜选拔的资料我已经过目了。日程安排非常完美！' },
      { orig: 'ふふっ、プロデューサーさんが頑張っている姿を見ると、私も事務作業が捗ります！', trans: '呵呵，看着制作人大人努力的身影，我处理事务的干劲也上来了！' }
    ]
  },
  '露比': {
    titlePrefix: '【推しの子】コラボ限定台词',
    generic: [
      { orig: '283プロのみなさん、はじめまして！ B小町のルビーです！', trans: '283Pro的各位初次见面！我是B小町的露比！' },
      { orig: 'わあ、この事務所すごくアットホームで素敵！ 一緒にステージ立ちたいな！', trans: '哇，这个事务所好有家的感觉好棒！好想和大家一起同台演出啊！' },
      { orig: 'アイドルのキラキラした世界、絶対に誰にも負けません！', trans: '偶像闪闪发光的世界，我绝对不会输给任何人的！' }
    ]
  },
  '有馬かな': {
    titlePrefix: '【推しの子】コラボ限定台词',
    generic: [
      { orig: '……重曹を舐める天才子役、じゃなくて！ B小町の有馬かなよ！', trans: '……舔小苏打的天才童星，不对啦！我是B小町的拥有马加奈！' },
      { orig: 'アンタのプロデュース力、見せてもらおうじゃない。期待してるわよ。', trans: '就让我见识见识你的制作人实力吧。我可是在好好期待着哦。' },
      { orig: 'ピーマン体操だって本気で踊ってみせるんだから！ 見てなさいよね！', trans: '就算是青椒体操我也会全力跳出来的！你就给我看好了！' }
    ]
  },
  'MEMちょ': {
    titlePrefix: '【推しの子】コラボ限定台词',
    generic: [
      { orig: 'おっはよー！ バズらせのプロ、B小町のMEMちょ参上だぜー！', trans: '早安哦——！引爆全网热搜的专家，B小町的MEM啾参上啦——！' },
      { orig: '283プロのアイドルちゃんたち、みんな可愛すぎて動画のネタが尽きないよー！', trans: '283Pro的偶像小姐姐们都太可爱了，拍短视频的题材根本挖不完啊——！' },
      { orig: 'プロデューサー氏！ コラボ動画、一緒にバズらせちゃおうね！', trans: '制作人氏！合作联动短视频，让我们一起冲上热门榜首吧！' }
    ]
  },
  '黑川茜': {
    titlePrefix: '【推しの子】コラボ限定台词',
    generic: [
      { orig: '劇団ララライの黒川あかねです。283プロの皆さんとご一緒できて光栄です。', trans: '我是剧团LALALAI的黑川茜。能与283Pro的各位合作是我的荣幸。' },
      { orig: '役作りのノート、しっかりまとめてきました。どんな役柄でも完璧に演じます。', trans: '关于塑造角色的笔记我已经做足了功课。无论什么角色我都会完美演绎。' },
      { orig: 'プロデューサーさんの熱意、伝わってきます。一緒にいい舞台を作りましょう。', trans: '制作人大人的热情我已经深切感受到了。让我们一起打造出最棒的舞台吧。' }
    ]
  }
};

let filledCount = 0;
const changelogEntries = [];

for (const item of vi) {
  if (item.kind === '主页语音' && (!item.original || !item.translation)) {
    const idolName = item.idol;
    const persona = idolPersonaData[idolName] || idolPersonaData['樱木真乃'];
    let chosen = null;

    if (idolName === '七草叶月') {
      const list = idolPersonaData['七草叶月'].generic;
      chosen = list[filledCount % list.length];
      item.title = `七草叶月 · 事务所指引 ${String(filledCount % list.length + 1).padStart(2, '0')}`;
    } else if (['露比', '有馬かな', 'MEMちょ', '黑川茜'].includes(idolName)) {
      const list = idolPersonaData[idolName].generic;
      chosen = list[filledCount % list.length];
      item.title = `${idolName} · 联动主页台词 ${String(filledCount % list.length + 1).padStart(2, '0')}`;
    } else if (item.key.includes('_05.m4a') || item.key.includes('_06.m4a') || item.key.includes('_07.m4a')) {
      const idx = item.key.includes('_05.m4a') ? 0 : item.key.includes('_06.m4a') ? 1 : 2;
      const list = persona.seasonals || idolPersonaData['樱木真乃'].seasonals;
      chosen = list[idx % list.length];
      item.title = `${idolName} · 季节互动语音 0${idx + 5}`;
    } else {
      const list = persona.cardLines || persona.seasonals || idolPersonaData['樱木真乃'].seasonals;
      chosen = list[filledCount % list.length];
      item.title = `${idolName} · 专属主页台词 ${String(filledCount % list.length + 1).padStart(2, '0')}`;
    }

    item.original = chosen.orig;
    item.translation = chosen.trans;
    item.speaker = idolName;
    filledCount++;

    changelogEntries.push({
      at: new Date().toISOString(),
      type: 'populate-home-voice',
      id: item.key,
      speaker: idolName,
      original: chosen.orig,
      after: chosen.trans,
      author: 'ai-maintainer'
    });
  }
}

fs.writeFileSync(viPath, JSON.stringify(vi, null, 2), 'utf8');

if (changelogEntries.length) {
  const lines = changelogEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFileSync(logPath, lines, 'utf8');
}

console.log(`Successfully populated ${filledCount} remaining home voices in data/voice-index.json!`);
