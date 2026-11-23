// Apply refined, polished audio-transcribed and localized voice lines for Sakuragi Mano (001)
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const catalogPath = path.join(root, 'public/home-assets/catalog.json');
const logPath = path.join(root, 'translation-work/翻译变更日志.jsonl');

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const mano = catalog.find(x => x.id === '1');
if (!mano) {
  console.error('Mano not found');
  process.exit(1);
}

const voiceData = {
  // 13 扮演专属主页语音（Casting Voices - 各类戏剧演绎角色，极具反差与戏剧张力）
  "mypage_casting_voice_001_01": {
    orig: "あなたの声、好き。\nもっと近くで聞かせて。\n落ち着くから。",
    trans: "我很喜欢你的声音。\n可以靠得更近一些让我听吗？\n因为……听着能让我安心下来呢。"
  },
  "mypage_casting_voice_001_02": {
    orig: "ふふっ、今更キスくらいで照れるなんて。\nいつまでも初なのね。\n……まあ、そういうところも好きなのだけど。",
    trans: "呵呵，事到如今不过是接个吻而已，居然还会害羞呀。\n真是无论什么时候都这么纯情呢。\n……不过，我也正是喜欢你这一点就是了。"
  },
  "mypage_casting_voice_001_03": {
    orig: "あ、ブレザー懐かしい！\nねえねえ、着てみてもいい？\n……ふふっ、ぶかぶかで君の匂いでいっぱいだ！",
    trans: "啊，这件西装制服好怀念！\n呐呐，我可以试着套一下吗？\n……嘿嘿，松松垮垮的好大一件，而且……全都是你的味道呢！"
  },
  "mypage_casting_voice_001_04": {
    orig: "小さい頃から私の後をついてきた君と夫婦になるなんて。\n……すっかり背も越されちゃって。\nかっこよくなったね。",
    trans: "真没想到，从小就一直屁颠颠跟在我后头的你，竟然会和我成为夫妻呢。\n……个头不知不觉也被你完全超过去了。\n真的变得好帅气了呢。"
  },
  "mypage_casting_voice_001_05": {
    orig: "えらい楽しそうやなぁ。\nうちの隣にいらはるのに、他の子を見て、\nよう笑わはりますこと。",
    trans: "瞧你笑得多开心呀。\n明明就陪在人家身边，眼睛看着别处的姑娘，\n倒还能笑得这般合不拢嘴呢。"
  },
  "mypage_casting_voice_001_06": {
    orig: "メガネ、外すとよく見えなくて……\nふぁっ……だ、ダメです！\n顔、近いです……！\nは、恥ずかしい……",
    trans: "眼镜摘下来就有些看不太清楚了……\n啊……不、不可以！\n脸、贴得太近了啦……！\n好、好害羞……"
  },
  "mypage_casting_voice_001_07": {
    orig: "こ、後輩く〜ん！\n助けて〜！\n……上司の無茶振りが酷すぎるよ〜……！\n私の癒しはもう、君だけなの〜",
    trans: "后、后辈君～！\n救救学姐嘛～！\n……上司乱发号施令也太过分了啦～……！\n能治愈我的，现在就只有后辈君一个人了呀～"
  },
  "mypage_casting_voice_001_08": {
    orig: "大丈夫。\nちゃんと友達に戻るから。\n……少しだけ時間をちょうだい。\nあなたを好きだった私を……\n置いてくる時間を。",
    trans: "没事的。\n我会好好退回到朋友的位置的。\n……能稍微给我一点点时间吗？\n给我一点……去向那个曾喜欢着你的自己告别的时间。"
  },
  "mypage_casting_voice_001_09": {
    orig: "焼き餅じゃないもん……！\nちょっとだけだもん……！\n……だから、\n安心させて……？\nぎゅってして……？",
    trans: "才没有吃醋呢……！\n就只有一点点而已嘛……！\n……所以，\n能让我安心一点吗……？\n抱紧抱紧我……好不好嘛……？"
  },
  "mypage_casting_voice_001_10": {
    orig: "それ……怪我してる！\n無理しちゃダメだよ。\n今日の練習はいったんおしまい！\n……治るまで、私がそばにいるから。",
    trans: "你那个……受伤了呀！\n不可以逞强哦。\n今天的练习就先到此为止！\n……在伤好之前，我都会一直陪在你身边的。"
  },
  "mypage_casting_voice_001_11": {
    orig: "兄様、手を繋いでもいい？\n人が多くて迷いそう……。\n……嘘。\n本当は……ちょっぴり甘えたいだけ。",
    trans: "兄长大人，可以牵着你的手吗？\n人这么多感觉会走散……。\n……骗你的。\n其实呀……只是想稍微向你撒个娇而已。"
  },
  "mypage_casting_voice_001_12": {
    orig: "怖がらないで。\n夫婦になってくれるんでしょ？\nふふっ……二人冷たく老いることなく、\n氷の中で永遠になりましょう？",
    trans: "不要害怕。\n你说过愿意和我结为夫妻的，对吧？\n呵呵……我们两个人就不用孤独凄冷地老去了，\n就在坚冰之中化作永恒吧……？"
  },
  "mypage_casting_voice_001_13": {
    orig: "ねえ、私たちって運命だよね？\nだって何度離れてもまた会える。\nこれはもう、永遠の愛ってことだよ？",
    trans: "呐，我们两个人注定是命中注定的对吧？\n毕竟无论分开多少次，兜兜转转总能再次相见。\n这分明就是……所谓的永恒之爱了吧？"
  },

  // 16 首选服装/展示专属主页语音（真乃专属温柔恬淡口吻）
  "mypage_1040010100_1_01": {
    orig: "お日様、笑顔、緑の葉っぱ……\n私の周りにある輝きが、力を貸してくれますように……",
    trans: "温暖的太阳、大家的笑容、还有翠绿的树叶……\n但愿环绕在我身边的所有光芒，都能借给我力量……"
  },
  "mypage_1040010100_1_11": {
    orig: "空が輝くためには、雲や雨粒も大事……\nふふっ、素敵なお話ですね……",
    trans: "想要让天空绽放光彩，连云朵和雨滴也是不可或缺的……\n呵呵，真是很美好的话语呢……"
  },
  "mypage_1040010100_2_01": {
    orig: "この歌は、自分より強くて、輝いている……\nこうあれたらと思う、もう一人の私……",
    trans: "这首歌比起我自己，要更加坚强、更加耀眼……\n是那个让我向往着‘如果我也能成为那样该多好’的、另一个我……"
  },
  "mypage_1040010100_2_11": {
    orig: "私のありったけの思いと輝きが、\n聴いてくれる皆さんの心とも、\nハーモニーのように重なったらいいなって……",
    trans: "要是能把倾注了我所有心意与光芒的声音，\n与聆听着的大家的心灵，\n像和声那样彼此交织重叠在一起就好了呢……"
  },
  "mypage_1040010110_1_01": {
    orig: "あの、マフィンを焼いてみました……！\nごちそうになったお礼に……",
    trans: "那个，我烤了松饼……！\n这是想作为上次款待的回礼……"
  },
  "mypage_1040010110_1_11": {
    orig: "よかったら、プロデューサーさんも……\nいろんなお話、聞かせてください……！",
    trans: "如果可以的话，制作人先生也……\n请多跟我聊聊各种各样的事情吧……！"
  },
  "mypage_1040010110_2_01": {
    orig: "私は皆さんに、寄り添えているでしょうか……",
    trans: "现在的我，有好好陪伴在大家的心灵身旁吗……"
  },
  "mypage_1040010110_2_11": {
    orig: "気持ちを渡して、受け取って……\nコミュニケーションを、ステージの上から……",
    trans: "传递心意，接收心意……\n这份心与心的交流，正由我从舞台之上慢慢传递给大家……"
  },
  "mypage_1040010120_1_01": {
    orig: "アンコールでのサプライズ、びっくりしちゃいました……！",
    trans: "安可环节准备的那个惊喜，真的让我吓了一大跳呢……！"
  },
  "mypage_1040010120_1_11": {
    orig: "プロデューサーさんとファンの皆さんから、\nまた……いっぱいいただいてしまいました……！",
    trans: "从制作人先生和粉丝的大家那里，\n又……收到了满满当当的温暖心意了呢……！"
  },
  "mypage_1040010120_2_01": {
    orig: "私の世界がこんなにも輝いているのは、\n小さな輝きを、プロデューサーさんと一つ一つ見つけてきたから……",
    trans: "我的世界如今能变得这般璀璨耀眼，\n正是因为一路走来，每一片微小的光辉，都是和制作人先生一起一点一滴寻找到的……"
  },
  "mypage_1040010120_2_11": {
    orig: "次はどんな夢を持つのか、まだ分からないんですけれど……\n一緒に見つけてくれますか？",
    trans: "接下来该去追寻怎样的新梦想，虽然现在的我还懵懂不知……\n但是，您愿意陪我一起去寻找吗？"
  },
  "mypage_1040010130_1_01": {
    orig: "プロデューサーさんの新しい旅が、素敵なものになりますように……",
    trans: "衷心祈愿制作人先生踏上的全新旅程，会是一段美好动人的时光……"
  },
  "mypage_1040010130_1_11": {
    orig: "あけましておめでとうございます！\n新しい年の初めにプロデューサーさんとお話ができて、嬉しいです……！",
    trans: "新年快乐！\n能在新的一年揭开序幕的时刻和制作人先生说上话，我真的好高兴……！"
  },
  "mypage_1040010130_2_01": {
    orig: "歌に乗せた、甘い甘いデコレーション……\nどうぞ召し上がれ……！",
    trans: "乘着歌声细细点缀的、甜甜美美的装点……\n请您尽情品尝吧……！"
  },
  "mypage_1040010130_2_11": {
    orig: "お砂糖みたいな、キラキラな笑顔を一匙……！",
    trans: "就像砂糖一般晶莹闪烁的笑容，请让我为您添上一小勺吧……！"
  }
};

const now = new Date().toISOString();
const changelogEntries = [];
let castingFilled = 0;
let outfitFilled = 0;

// Apply to castingVoices
for (const v of mano.castingVoices || []) {
  if (voiceData[v.id]) {
    const d = voiceData[v.id];
    const before = v.translation || '';
    v.original = d.orig;
    v.translation = d.trans;
    v.speaker = '真乃';
    castingFilled++;
    changelogEntries.push({
      target: 'voice-index',
      id: v.id,
      key: v.path,
      speaker: '樱木真乃',
      original: d.orig,
      before,
      after: d.trans,
      by: '接手 AI 听译直译润色（用户授权）',
      at: now
    });
  }
}

// Apply to outfits
const loggedOutfitIds = new Set();
for (const o of mano.outfits || []) {
  for (const v of o.homeVoices || []) {
    if (voiceData[v.id]) {
      const d = voiceData[v.id];
      const before = v.translation || '';
      v.original = d.orig;
      v.translation = d.trans;
      v.speaker = '真乃';
      outfitFilled++;
      if (!loggedOutfitIds.has(v.id)) {
        loggedOutfitIds.add(v.id);
        changelogEntries.push({
          target: 'voice-index',
          id: v.id,
          key: v.path,
          speaker: '樱木真乃',
          original: d.orig,
          before,
          after: d.trans,
          by: '接手 AI 听译直译润色（用户授权）',
          at: now
        });
      }
    }
  }
}

// Save catalog
fs.writeFileSync(catalogPath, JSON.stringify(catalog));

// Append to changelog
const changelogLines = changelogEntries.map(e => JSON.stringify(e)).join('\n') + '\n';
fs.appendFileSync(logPath, changelogLines, 'utf8');

console.log({
  castingFilled,
  outfitFilled,
  changelogCount: changelogEntries.length,
  status: 'Mano polished voices successfully applied!'
});
