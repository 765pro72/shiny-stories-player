// Comprehensive Shiny Colors Conversation Translation & Character Polish Engine
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const convsPath = path.join(root, 'public/home-assets/conversations.json');
const dataConvsPath = path.join(root, 'data/home-conversations.json');
const vIndexPath = path.join(root, 'data/voice-index.json');
const logPath = path.join(root, 'translation-work/翻译变更日志.jsonl');

const convs = JSON.parse(fs.readFileSync(convsPath, 'utf8'));
const vIndex = JSON.parse(fs.readFileSync(vIndexPath, 'utf8'));

// 1. Precise handcrafted dialogue repairs for known dialogues
const PRECISE_REPAIRS = {
  // 果穂・にちか1 (User reported: 米奇卡是谁？不应该是日花吗？)
  'mypage_talking_duo_0090240010010': {
    orig: 'にちかさんだー！お疲れ様です！今からレッスンですか？頑張ってください！',
    trans: '是日花小姐～！辛苦啦！接下来要去上练习课吗？要加油哦！'
  },
  // にちか・はるき1 (User reported: 音乐杂志被翻译成了声音)
  'mypage_talking_duo_0240280010010': {
    orig: 'よかったらでいいんですけど、その音楽雑誌ちょっとだけ読ませてもらうとか……',
    trans: '如果方便的话，能让我稍微翻阅一下那本音乐杂志吗……'
  },
  'mypage_talking_duo_0240280010020': {
    orig: 'あ！どうぞどうぞー！日花ちゃん、もしかしてこういうのよく読む？',
    trans: '啊！请看请看！日花酱难道平时也经常看这类杂志吗？'
  },
  // はるき・にちか1
  'mypage_talking_duo_0280240010010': {
    orig: '日花ちゃんのダンスすごいなぁ！どうやって練習の時間やりくりしてるの？',
    trans: '日花酱的舞蹈好厉害啊！平时是怎么协调抽出练习时间的呢？'
  },
  // SHHis 美琴 & 日花
  'mypage_talking_duo_0240250010010': {
    orig: 'えっとですねー！ハムカツと！から揚げだとどっちが好きです？',
    trans: '那个啊——！炸火腿排和！炸鸡块的话更喜欢哪一个呀？'
  },
  'mypage_talking_duo_0240250010020': {
    orig: 'うーん、揚げ物か……。選択肢はその二つだけなの？',
    trans: '唔……都是炸物啊……。选项就只有这两个吗？'
  },
  'mypage_talking_duo_0240250020010': {
    orig: '貴社の記者が汽車で帰社した！',
    trans: '贵社的记者乘火车回社了！（绕口令）'
  },
  'mypage_talking_duo_0240250020020': {
    orig: 'ん……？',
    trans: '嗯……？'
  },
  'mypage_talking_duo_0250240010010': {
    orig: 'ね、時間あるなら一緒にやろうか、練習',
    trans: '呐，有时间的话要一起做吗？自主练习。'
  },
  'mypage_talking_duo_0250240010020': {
    orig: 'う、うわぁー！はい！30秒で着替えます！',
    trans: '哇、哇啊——！是！30秒内换好衣服！'
  },
  // 真乃・灯織1
  'mypage_talking_duo_0010020010020': {
    orig: 'そうかな…普通だと思うけど… 真乃が梳かしてくれるのも、とっても気持ちいいよ',
    trans: '是吗……我觉得很普通啦……不过被真乃梳头，也感觉好舒服哦。'
  },
  // 真乃・恋鐘1
  'mypage_talking_duo_0010040010020': {
    orig: 'えへへ、ありがとう！真乃！いつでも作ってくるけん、また食べてね～',
    trans: '欸嘿嘿，谢谢你呀！真乃！我随时都可以做，下次还要再吃哦～！'
  },
  // 真乃・甘奈1
  'mypage_talking_duo_0010140010010': {
    orig: 'あ、あの、さっき… 甘奈ちゃんも、公園にいたかな？',
    trans: '啊、那个，刚才……甘奈酱刚才也在公园里吗？'
  },
  // 真乃・甜花1
  'mypage_talking_duo_0010150010010': {
    orig: '公園に…日向ぼっこしに行こうかなって思って……甜花ちゃんも…一緒に…どうかな…',
    trans: '想着要不要去公园晒晒太阳呢……甜花酱也……要不要一起去呢……'
  },
  'mypage_talking_duo_0010150010020': {
    orig: 'あ、甜花も行く、一緒に。公園、ぽかぽか……いいね……',
    trans: '呜……啊，甜花也去，一起。公园里、暖洋洋的……真好……'
  },
  // 真乃・千雪1
  'mypage_talking_duo_0010160010020': {
    orig: 'どんなの？真乃ちゃん。身につけてるところ見てみたいなー。',
    trans: '是什么样的呢？真乃酱。好想看看你戴在身上的样子呢～'
  },
  // 真乃・冬優子1
  'mypage_talking_duo_0010180010020': {
    orig: 'あはは、真乃ちゃんありがとう！じゃあ、お言葉に甘えていただきます！',
    trans: '啊哈哈，谢谢真乃酱！那我就不客气收下啦！'
  },
  // 灯織・真乃1
  'mypage_talking_duo_0020010010010': {
    orig: '真乃…今度の休み…晴れたら公園に行くのはどうかな？',
    trans: '真乃……下次休息……要是放晴的话一起去公园怎么样？'
  },
  // 結華・真乃1
  'mypage_talking_duo_0070010010010': {
    orig: '真乃はかわいいね～、三峰、孫を見るおばあちゃんみたいな気持ちになっちゃう',
    trans: '真乃真可爱呢～三峰我都快变成慈祥看孙女的老奶奶啦～'
  },
  // 果穂・真乃1
  'mypage_talking_duo_0090010010010': {
    orig: '真乃さん！真乃さんとピーちゃんとおまめまると一緒に遊びたいです！',
    trans: '真乃小姐！我想和真乃小姐还有小P、小豆丸一起玩！'
  },
  // 甜花・真乃1
  'mypage_talking_duo_0150010010010': {
    orig: '真乃ちゃん、甜花……ぽかぽか……日向ぼっこ……！',
    trans: '真乃酱、甜花也……暖洋洋的……晒太阳……！'
  },
  'mypage_talking_duo_0150010010020': {
    orig: 'えへへ…ひなちゃんもこうしてたな…次は、甜花ちゃんも一緒に',
    trans: '欸嘿嘿……之前小雏鸟也是这样的呢……下次甜花酱也一起来吧～'
  },
  // あさひ・真乃1
  'mypage_talking_duo_0170010010010': {
    orig: '真乃ちゃんの鳩さんたち、なんて鳴くんすか？ポッポーって言うんすか？',
    trans: '真乃酱的鸽子平时怎么叫的呀？是咕咕咕那样叫的说吗？'
  },
  // 愛依・真乃1
  'mypage_talking_duo_0190010010010': {
    orig: '真乃ちゃん、ほわほわしてて超可愛い！',
    trans: '真乃酱软乎乎的好可爱啊！'
  },
  // はるき・真乃1
  'mypage_talking_duo_0280010010010': {
    orig: '真乃ちゃん！お散歩行く？',
    trans: '真乃酱！要去散步吗？'
  },
  // 灯織・めぐる1
  'mypage_talking_duo_0020030010010': {
    orig: 'おはよー！レッスン場空いてるよ！あ、公園に行くのでもいいね！',
    trans: '早上好！练习室空着哦！啊，去公园也挺好呢！'
  },
  // 灯織・結華1
  'mypage_talking_duo_0020070010010': {
    orig: '結華さん！その……勉強を教えてほしいです',
    trans: '结华小姐！那个……能请你教我做功课吗？'
  },
  // 灯織・果穂1
  'mypage_talking_duo_0020090010020': {
    orig: 'わぁ！灯織さん！いいんですか！ありがとうございます！',
    trans: '哇！灯织小姐！真的可以吗！非常感谢您！'
  },
  // めぐる・灯織1
  'mypage_talking_duo_0030020010020': {
    orig: 'もう…真乃にも聞いてみて、集まれそうならいいね',
    trans: '真是的……也问问真乃吧，要是大家能聚在一起就好了。'
  },
  // 果穂・灯織1
  'mypage_talking_duo_0090020010010': {
    orig: '灯織さん！私、おうし座と一緒！あと、天秤座と、蠍座も知りたいです！',
    trans: '灯织小姐！我是金牛座！还有天秤座和天蝎座我也想了解！'
  },
  // 小糸・灯織1
  'mypage_talking_duo_0220020010020': {
    orig: 'お、お疲れ様です！',
    trans: '啊，辛苦啦！'
  },
  // にちか・灯織1
  'mypage_talking_duo_0240020010010': {
    orig: 'あの、ペン貸してもらえません？',
    trans: '那个……能借我用一下笔吗？'
  },
  // 樹里・甜花・灯織・摩美々1
  'mypage_talking_quartet_0110150020050010030': {
    orig: '甜花さん！一緒に走りましょう！',
    trans: '甜花小姐！一起跑起来吧！'
  },
  // めぐる・あさひ1
  'mypage_talking_duo_0030170010010': {
    orig: 'あさひ、この知恵の輪解ける？難易度が一番高くて、誰も解けなかったの！',
    trans: '朝日，能解开这个智力扣吗？难度是最高的，大家都解不开呢！'
  },
  // めぐる・美琴1
  'mypage_talking_duo_0030250010010': {
    orig: '美琴さん！この後、レッスンですか？もしよかったら、私たちも混ざっていいですか？',
    trans: '美琴前辈！待会儿有练习课吗？如果方便的话，我们也能一起加入吗？'
  },
  // 摩美々・めぐる1
  'mypage_talking_duo_0050030010010': {
    orig: '助っ人ってことで、今日のレッスン私の代わりによろしく頼んだ～',
    trans: '既然说是帮手，那今天的练习课就拜托你替我上啦～'
  },
  // 果穂・めぐる1
  'mypage_talking_duo_0090030010010': {
    orig: 'めぐるさん！英語、教えてほしいです！',
    trans: '巡小姐！请教我英语吧！'
  },
  // 透・めぐる1
  'mypage_talking_duo_0200030010010': {
    orig: 'お疲れ様ー',
    trans: '辛苦啦～'
  },
  'mypage_talking_duo_0200030010020': {
    orig: 'お疲れ様！あ、お餅焼けたよ…ちょっと、熱いから気をつけてねー！',
    trans: '辛苦啦！啊，年糕烤好啦……小心烫哦～！'
  },
  // 小糸・めぐる1
  'mypage_talking_duo_0220030010020': {
    orig: 'そうだよ！真乃も！灯織もだよー！',
    trans: '是呀！真乃也是！灯织也是哦！'
  },
  // 恋鐘・夏葉1
  'mypage_talking_duo_0040130010010': {
    orig: 'お家モータースポーツか！乗って！見てくれてありがとう！ピョーーンって！',
    trans: '在家里赛车吗！乘上去！谢谢你看我！咻——地一下飞过去啦！'
  },
  // 恋鐘・甜花1
  'mypage_talking_duo_0040150010020': {
    orig: 'つ、月冈さん……お菓子……今日もある？',
    trans: '呜……月冈小姐……点心……今天也有吗？'
  },
  // 摩美々・にちか1
  'mypage_talking_duo_0050240010020': {
    orig: 'ん？お、お疲れ様です！',
    trans: '嗯？啊、辛苦啦！'
  },
  // 小糸・摩美々1
  'mypage_talking_duo_0220050010010': {
    orig: 'ちょっと、怖いもの見たみたいな声出さないでよ～',
    trans: '喂～别叫得像撞见了什么恐怖的东西一样嘛～'
  },
  // 咲耶・甘奈1
  'mypage_talking_duo_0060140010020': {
    orig: '咲耶さんにそんなことさせられないよ～！はい！一緒に楽しもう！',
    trans: '怎么能让咲耶小姐做那种事呢～！好啦！我们一起来享受吧！'
  },
  // 果穂・咲耶1
  'mypage_talking_duo_0090060010010': {
    orig: '咲耶さん！アタシ、もっともっと背が高くなりたいです！',
    trans: '咲耶小姐！我也想变得更高更高！'
  },
  // 甜花・咲耶1
  'mypage_talking_duo_0150060010010': {
    orig: '後ろ髪が跳ねているね。ほら、おいで。私に梳かせてくれないかな？',
    trans: '后面的头发翘起来了呢。来，到这边来。让我替你梳理一下好吗？'
  },
  // 冬優子・咲耶1
  'mypage_talking_duo_0180060010010': {
    orig: '今日は冬優が咲耶ちゃんをサポートする番だよ！',
    trans: '今天该轮到冬优来给咲耶酱做支援啦！'
  },
  // 結華・果穂1
  'mypage_talking_duo_0070090010020': {
    orig: '結華さん！見てくれたんですか？そうなんです！ブラックには大人の魅力が！',
    trans: '结华小姐！您看到了吗？没错！黑色战队成员有着大人的魅力！'
  },
  // 霧子・樹里1
  'mypage_talking_duo_0080110010020': {
    orig: 'わっ！わりぃ！サンキューな！',
    trans: '哇！抱歉抱歉！谢啦！'
  },
  // 果穂・霧子1
  'mypage_talking_duo_0090080010010': {
    orig: '霧子さん！私のお水、一緒にお花にあげてもいいですか？',
    trans: '雾子小姐！我也能一起给花儿浇水吗？'
  },
  // 樹里・霧子1
  'mypage_talking_duo_0110080010010': {
    orig: '今度、事務所で集まって勉強会すんだけど、霧子も来るよな？',
    trans: '下次大家在事务所聚在一起开学习会，雾子你也会来的吧？'
  },
  // 凛世・霧子1
  'mypage_talking_duo_0120080010010': {
    orig: 'お疲れ様でございます。',
    trans: '辛苦您了。'
  },
  'mypage_talking_duo_0120080010020': {
    orig: 'はい、お疲れ様でございます。',
    trans: '是的，辛苦您了。'
  },
  // 果穂・夏葉1
  'mypage_talking_duo_0090130010010': {
    orig: '夏葉さん！勝ててよかった！私と一緒にお散歩行きませんか？',
    trans: '夏叶小姐！赢了比赛太好啦！要不要和我一起去散步呀？'
  },
  // 果穂・甘奈1
  'mypage_talking_duo_0090140010010': {
    orig: '甘奈さん！ファッションのこと教えてください！',
    trans: '甘奈小姐！请教教我时尚搭配的知识吧！'
  },
  // 果穂・甜花1
  'mypage_talking_duo_0090150010010': {
    orig: '甜花さん！一緒に！ジャスティスV見ませんか？！',
    trans: '甜花小姐！要不要一起看正义战队V呀？！'
  },
  // 果穂・千雪1
  'mypage_talking_duo_0090160010010': {
    orig: '千雪さん！羊毛フェルトのくまさん、私も作ってみたいです！',
    trans: '千雪小姐！羊毛毡小熊……我也很想亲手做一个呢！'
  },
  // 果穂・愛依1
  'mypage_talking_duo_0090190010010': {
    orig: '愛依さん、遊んでください！',
    trans: '爱依小姐，来陪我玩吧！'
  },
  // 果穂・小糸1
  'mypage_talking_duo_0090220010010': {
    orig: '小糸さん！私の飴と小糸さんの飴、交換っこしませんか？',
    trans: '小糸小姐！我的糖果和小糸小姐的糖果，来交换好不好？'
  },
  // 果穂・雛菜1
  'mypage_talking_duo_0090230010010': {
    orig: '雛菜さんも！透先輩、円香先輩と一緒なんですね！',
    trans: '雏菜小姐也是！是和透前辈、圆香前辈在一起的呢！'
  },
  // 果穂・美琴1
  'mypage_talking_duo_0090250010010': {
    orig: '美琴さん！美琴さんのカッコいいダンスの秘訣、教えてください！',
    trans: '美琴小姐！美琴小姐帅气舞步的秘诀，请教教我吧！'
  },
  // 果穂・ルカ1
  'mypage_talking_duo_0090260010010': {
    orig: 'ルカさんだー！ルカさん！サインください！',
    trans: '是路加小姐～！路加小姐！请给我签名吧！'
  },
  // 果穂・はるき1
  'mypage_talking_duo_0090280010020': {
    orig: '果穂ちゃんが奏でてる音、すごい！楽しくて明るい場所に連れて行ってくれそう！',
    trans: '果穗酱奏响的音乐好厉害！感觉能把人带到充满欢乐与光芒的地方呢！'
  },
  // 甜花・果穂1
  'mypage_talking_duo_0150090010020': {
    orig: '甜花さんも見ましたか？シルバーがかっこよかった！すごくよかったです！',
    trans: '甜花小姐也看了吗？银色战士太帅了！真的超级棒！'
  },
  // 透・果穂1
  'mypage_talking_duo_0200090010020': {
    orig: 'はい！行きます！',
    trans: '是！出发！'
  },
  // 小糸・果穂1
  'mypage_talking_duo_0220090010020': {
    orig: 'はい！6年生です！',
    trans: '是！我是小学六年级生！'
  },
  // にちか・果穂1
  'mypage_talking_duo_0240090010010': {
    orig: '80…57…叶月さん……',
    trans: '80…57…叶月姐姐……（算账中）'
  },
  // にちか・智代子1
  'mypage_talking_duo_0240100010010': {
    orig: '踏むよカルタゴ象軍団！',
    trans: '踩踏过来吧，迦太基战象军团！'
  },
  // 樹里・ルカ1
  'mypage_talking_duo_0110260010010': {
    orig: 'ルカさん！もし良かったら、今度一緒に練習とかどうですか？',
    trans: '路加小姐！如果不介意的话……下次要不要一起练习？'
  },
  // 甜花・樹里1
  'mypage_talking_duo_0150110010010': {
    orig: 'じ、樹里さん！え、えっと……ご、ごめんなさい！',
    trans: '呜……树、树里酱！那个……对、对不起！'
  },
  // 千雪・樹里1
  'mypage_talking_duo_0160110010010': {
    orig: 'レッスン場に忘れ物があったんだけど、樹里ちゃんのものかしら？',
    trans: '练习室里有落下的东西，不知道是不是树里酱的呢？'
  },
  // 透・樹里1
  'mypage_talking_duo_0200110010010': {
    orig: 'コンビニ行くけど、なんかいるか？',
    trans: '我去趟便利店，有什么要带的吗？'
  },
  // 美琴・樹里1
  'mypage_talking_duo_0250110010010': {
    orig: 'レッスン時間、交代してくれてありがとう。プロデューサーから鍵預かってきたよ',
    trans: '谢谢你跟我调换练习时间。我从制作人那里拿到钥匙了哦，给你'
  },
  // ルカ・樹里1
  'mypage_talking_duo_0260110010010': {
    orig: '気安く声かけてくんな',
    trans: '别随随便便跟我搭话。'
  },
  // 凛世・甜花1
  'mypage_talking_duo_0120150010020': {
    orig: 'そう、そう！杜野さん、どう……？',
    trans: '呜……对、对的！杜野小姐，觉得怎么样……？'
  },
  // 凛世・美琴1
  'mypage_talking_duo_0120250010010': {
    orig: '静かな一日でございます。',
    trans: '真是宁静安详的一天呢。'
  },
  // あさひ・凛世1
  'mypage_talking_duo_0170120010020': {
    orig: 'ふふ…あさひさんは…ガーベラのよう……',
    trans: '呵呵……朝日小姐……就像一朵非洲菊一样呢……'
  },
  // 愛依・凛世1
  'mypage_talking_duo_0190120010020': {
    orig: '愛依さんのダンスには敵いません……',
    trans: '凛世完全比不上爱依小姐的舞步呢……'
  },
  // 夏葉・冬優子1
  'mypage_talking_duo_0130180010020': {
    orig: 'あ！うーん……普通にお買い物とかかなぁ、夏葉さんは？',
    trans: '啊！嗯……我平时大概就是逛街买东西吧，夏叶小姐呢？'
  },
  // 甘奈・夏葉1
  'mypage_talking_duo_0140130010010': {
    orig: 'ゲームしながらでもできる楽しいトレーニングってないかな？甜花ちゃんに教えてあげたいなー！',
    trans: '有没有边打游戏也能做的有趣锻炼呀？好想教给甜花酱呢～！'
  },
  // 羽那・夏葉1
  'mypage_talking_duo_0270130010010': {
    orig: '夏葉ちゃんの車、カッコイイなー！',
    trans: '夏叶酱的车好帅气呀～！'
  },
  // 甘奈・甜花1
  'mypage_talking_duo_0140150010010': {
    orig: '手伝ってくれたらシール付きチョコ買ってくるね！わぁ！やった！甜花ちゃんの分！',
    trans: '来帮我忙的话就给你买带贴纸的巧克力哦！哇！太好啦！甜花的那一份！'
  },
  // 甘奈・にちか1
  'mypage_talking_duo_0140240010010': {
    orig: '日花ちゃん！叶月さんって、家ではどんなお姉さんなのかな？',
    trans: '日花酱！叶月小姐在家里是个什么样的姐姐呀？'
  },
  // 甘奈・ルカ1
  'mypage_talking_duo_0140260010010': {
    orig: 'ルカさんのパフォーマンス、近くで見てみたいから、今度レッスンを見学していいかな？',
    trans: '好想近距离看看路加小姐的表现，下次能去参观你的练习课吗？'
  },
  // 円香・甘奈1
  'mypage_talking_duo_0210140010010': {
    orig: 'レッスン場に忘れ物がありました。心当たりは？',
    trans: '练习室里有落下的东西。你知道是谁的吗？'
  },
  // にちか・甘奈1
  'mypage_talking_duo_0240140010020': {
    orig: 'っていう日花ちゃんもこういうの好きなんだー！限定色いいよねー！',
    trans: '原来日花酱也喜欢这种呀！限定色真的很棒对吧～！'
  },
  // 冬優子・甜花1
  'mypage_talking_duo_0180150010010': {
    orig: 'おはよう、甜花ちゃん。もしかしてまだ眠い？',
    trans: '早上好，甜花酱。难道说还没睡醒吗？'
  },
  // にちか・甜花1
  'mypage_talking_duo_0240150010020': {
    orig: 'あ……七草さん……お昼寝……',
    trans: '啊……七草小姐……午睡……'
  },
  // 千雪・雛菜2
  'mypage_talking_duo_0160230020010': {
    orig: '大学の講義で面白いなって思う授業、どんなものがある？',
    trans: '大学里有哪些你觉得很有意思的讲座课程吗？'
  },
  'mypage_talking_duo_0160230020020': {
    orig: 'うーん…楽しそうだなって思った授業しか取ってないので、全部楽しいです～！',
    trans: '嗯……雏菜只选了那些看起来很开心的课，所以全部都超级开心～！'
  },
  // 千雪・ルカ1
  'mypage_talking_duo_0160260010010': {
    orig: 'レッスン場にタオルがあったんだけど、誰のものか分かる？',
    trans: '练习室里有一条毛巾，你知道是谁落下的吗？'
  },
  // 羽那・千雪1
  'mypage_talking_duo_0270160010010': {
    orig: '私の電話の声とか…千雪さんの部屋まで届いてたりしない？',
    trans: '我打电话的声音……会不会传到千雪小姐的房间里呀？'
  },
  // あさひ・ルカ1
  'mypage_talking_duo_0170260010010': {
    orig: '円香ちゃん！手品！見せてほしいっす！',
    trans: '圆香酱！魔术！想让你变给我看的说！'
  },
  // はるき・あさひ1
  'mypage_talking_duo_0280170010010': {
    orig: 'あさひちゃんが見たものや聞いたもの、形にしないのはもったいないよ！',
    trans: '朝日酱看到的事物和听到的声音，不记录下来变成作品就太可惜啦！'
  },
  // 冬優子・円香1
  'mypage_talking_duo_0180210010020': {
    orig: 'どうも。冬優子さんこそ、とても可愛らしくて素敵ですよ。',
    trans: '您好。冬优子小姐才真的是既可爱又迷人呢。（假笑营业）'
  },
  // 冬優子・ルカ1
  'mypage_talking_duo_0180260010010': {
    orig: 'あ、ルカさん！こんにちは！',
    trans: '啊，路加小姐！你好呀！（冬优装乖营业模式）'
  },
  // 透・冬優子1
  'mypage_talking_duo_0200180010020': {
    orig: 'お疲れ様でーす！みなさん、今でーす！',
    trans: '辛苦啦——！各位，就是现在哦——！'
  },
  // 愛依・美琴1
  'mypage_talking_duo_0190250010010': {
    orig: '美琴さんのカッコ良さって、なんて言うか……超カッコいい！',
    trans: '美琴小姐的那种帅气，该怎么说呢……简直帅爆啦！'
  },
  // ルカ・愛依1
  'mypage_talking_duo_0260190010020': {
    orig: 'イェイ！逃げた！愛依ちゃんでーす！',
    trans: '耶！逃跑成功！是爱依酱哦～！'
  },
  // 羽那・透1
  'mypage_talking_duo_0270200010010': {
    orig: '都会の女子高生だー！',
    trans: '是城市里的女高中生哎～！'
  },
  // はるき・ルカ1
  'mypage_talking_duo_0280260010010': {
    orig: 'うるせーなぁ、聞こえてんだよ',
    trans: '吵死了，我听得见。'
  },
  // trio 0030010020010020
  'mypage_talking_trio_0030010020010020': {
    orig: 'はい、私も灯織ちゃんとめぐるちゃんとご一緒したいです！',
    trans: '是的，我也想和灯织酱、巡酱一起去！'
  },
  // duo 0220280010020
  'mypage_talking_duo_0220280010020': {
    orig: 'へへへ…ありがとう！じゃあ、今度小糸ちゃんに私のポートフォリオを見てほしいなぁ！',
    trans: '嘿嘿嘿……谢谢！那下次想请小糸酱看看我的作品集呢！'
  }
};

// 2. Global Polish Rules across ALL conversation lines
function globalPolish(text, speaker) {
  if (!text) return '';
  let zh = text;

  // A. Idiom and phrasing cleanup
  zh = zh
    .replace(/感谢您的辛勤工作[！!。.]?/g, '辛苦啦！')
    .replace(/谢谢您的辛勤工作[！!。.]?/g, '辛苦啦！')
    .replace(/辛勤工作/g, '努力练习')
    .replace(/祝你好运[！!。.]?/g, '要加油哦！')
    .replace(/祝你一切顺利[！!。.]?/g, '加油哦！')
    .replace(/请继续[！!。.]?/g, '请看请看！')
    .replace(/走在这条路上/g, '在这条道路上')
    .replace(/读一点那个声音/g, '翻阅一下那本音乐杂志')
    .replace(/那个声音/g, '那本音乐杂志')
    .replace(/制作商/g, '制作人')
    .replace(/后配君/g, '后辈君')
    .replace(/兄君/g, '兄长大人')
    .replace(/博因宗教|波音教/g, '望远镜')
    .replace(/油炸食品/g, '炸物小吃');

  // B. Names and honorifics
  zh = zh
    .replace(/米奇卡桑|米奇卡/g, '日花小姐')
    .replace(/希卡酱|日加酱/g, '日花酱')
    .replace(/希卡桑/g, '日花小姐')
    .replace(/马诺酱/g, '真乃酱')
    .replace(/马诺诺/g, '真乃')
    .replace(/马诺玛/g, '真乃')
    .replace(/让马诺融化我/g, '让真乃帮我梳头')
    .replace(/马诺/g, '真乃')
    .replace(/日和桑|日和酱/g, '灯织酱')
    .replace(/天香桑|天香酱|小天香|天香/g, '甜花酱')
    .replace(/小阿玛那|阿玛那|阿马那/g, '甘奈酱')
    .replace(/尤伊卡桑|与伊卡桑/g, '结华小姐')
    .replace(/切子桑/g, '雾子小姐')
    .replace(/咲空桑/g, '咲耶小姐')
    .replace(/小田桑/g, '小糸小姐')
    .replace(/日奈桑/g, '雏菜小姐')
    .replace(/卢卡桑|瑠香桑|瑠花桑/g, '路加小姐')
    .replace(/奈兹卡桑/g, '夏叶小姐')
    .replace(/十木同学|十木桑|十木/g, '千雪小姐')
    .replace(/叶月桑/g, '叶月小姐')
    .replace(/萨科亚/g, '咲耶')
    .replace(/陈老师/g, '酱')
    .replace(/支持陈/g, '协助咲耶酱')
    .replace(/某处陈/g, '圆香酱')
    .replace(/甜花酱的骨头/g, '甜花酱的那一份')
    .replace(/沉睡先生/g, '小懒虫');

  // Clean trailing punctuation
  zh = zh.replace(/[ ]+/g, ' ').trim();
  return zh;
}

async function main() {
  console.log('Starting full conversation polish overhaul...');

  let preciseApplied = 0;
  let globalApplied = 0;
  const logEntries = [];
  const now = new Date().toISOString();

  for (const c of convs) {
    for (const s of (c.sequence || [])) {
      const before = s.translation || '';
      if (PRECISE_REPAIRS[s.id]) {
        const item = PRECISE_REPAIRS[s.id];
        s.original = item.orig;
        s.translation = item.trans;
        preciseApplied++;
        logEntries.push({
          target: 'conversations:precise',
          id: s.id,
          key: s.path,
          speaker: s.speaker,
          original: s.original,
          before,
          after: s.translation,
          by: '接手 AI 听译直译润色（用户授权）',
          at: now
        });
      } else {
        const polished = globalPolish(s.translation, s.speaker);
        if (polished !== s.translation) {
          s.translation = polished;
          globalApplied++;
          logEntries.push({
            target: 'conversations:polish',
            id: s.id,
            key: s.path,
            speaker: s.speaker,
            original: s.original,
            before,
            after: s.translation,
            by: '接手 AI 听译直译润色（用户授权）',
            at: now
          });
        }
      }
    }
  }

  console.log(`Applied precise repairs to ${preciseApplied} lines.`);
  console.log(`Applied global polish to ${globalApplied} lines.`);

  // Update voice-index.json
  const vIndexMap = new Map();
  for (const v of vIndex) if (v.key) vIndexMap.set(v.key, v);
  let vIndexUpdated = 0;
  for (const c of convs) {
    for (const s of (c.sequence || [])) {
      if (s.path && vIndexMap.has(s.path)) {
        const item = vIndexMap.get(s.path);
        item.original = s.original;
        item.translation = s.translation;
        vIndexUpdated++;
      }
    }
  }
  console.log(`Updated voice-index entries: ${vIndexUpdated}`);

  // Save files
  fs.writeFileSync(convsPath, JSON.stringify(convs, null, 2), 'utf8');
  fs.writeFileSync(dataConvsPath, JSON.stringify(convs, null, 2), 'utf8');
  fs.writeFileSync(vIndexPath, JSON.stringify(vIndex, null, 2), 'utf8');

  if (logEntries.length > 0) {
    fs.appendFileSync(logPath, logEntries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
    console.log(`Logged ${logEntries.length} changes to 翻译变更日志.jsonl.`);
  }

  console.log('Overhaul complete!');
}

main().catch(console.error);
