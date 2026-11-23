/* Official Japanese names; forms of address checked against the bundled game scripts.
 * These are writing references, not dialogue to insert into every line. */
((root)=>{
 const rows=[
  ['1','樱木真乃','櫻木真乃','真乃','プロデューサーさん'],
  ['2','风野灯织','風野灯織','灯織','プロデューサー'],
  ['3','八宫巡','八宮めぐる','めぐる','プロデューサー'],
  ['4','月冈恋钟','月岡恋鐘','恋鐘','プロデューサー'],
  ['5','田中摩美美','田中摩美々','摩美々','プロデューサー'],
  ['6','白濑咲耶','白瀬咲耶','咲耶','プロデューサー','アナタ'],
  ['7','三峰结华','三峰結華','結華','プロデューサー','Ｐたん'],
  ['8','幽谷雾子','幽谷霧子','霧子','プロデューサーさん'],
  ['9','小宫果穗','小宮果穂','果穂','プロデューサーさん'],
  ['10','园田智代子','園田智代子','智代子','プロデューサーさん'],
  ['11','西城树里','西城樹里','樹里','プロデューサー','アンタ'],
  ['12','杜野凛世','杜野凛世','凛世','プロデューサーさま'],
  ['13','有栖川夏叶','有栖川夏葉','夏葉','プロデューサー','アナタ'],
  ['14','大崎甘奈','大崎甘奈','甘奈','プロデューサーさん'],
  ['15','大崎甜花','大崎甜花','甜花','プロデューサーさん'],
  ['16','桑山千雪','桑山千雪','千雪','プロデューサーさん'],
  ['17','芹泽朝日','芹沢あさひ','あさひ','プロデューサーさん'],
  ['18','黛冬优子','黛冬優子','冬優子','プロデューサーさん','プロデューサー','あんた'],
  ['19','和泉爱依','和泉愛依','愛依','プロデューサー'],
  ['20','浅仓透','浅倉透','透','プロデューサー'],
  ['21','樋口圆香','樋口円香','円香','あなた','プロデューサー'],
  ['22','福丸小糸','福丸小糸','小糸','プロデューサーさん'],
  ['23','市川雏菜','市川雛菜','雛菜','プロデューサー'],
  ['24','七草日花','七草にちか','にちか','プロデューサーさん'],
  ['25','绯田美琴','緋田美琴','美琴','プロデューサー'],
  ['26','斑鸠路加','斑鳩ルカ','ルカ','オメー','テメェ','オメェ','アンタ','プロデューサー','クソプロデューサー'],
  ['27','铃木羽那','鈴木羽那','羽那','プロデューサー'],
  ['28','郁田阳希','郁田はるき','はるき','プロデューサーさん'],
  ['staff','七草叶月','七草はづき','はづき','プロデューサーさん'],
  ['801','露比','ルビー','ルビー'],['802','有馬かな','有馬かな','かな'],
  ['803','MEMちょ','MEMちょ','MEMちょ'],['804','黑川茜','黒川あかね','あかね']
 ];
 const characters=rows.map(([id,chinese,japanese,short,...producer])=>({id,chinese,japanese,short,producer}));
 const aliases={'郁田春希':'28','春希':'28','阳希':'28','八宫惠留':'3','日花':'24','叶月':'staff','斑鸠露卡':'26'};
 const compact=s=>String(s||'').replace(/[\s　]/g,'');
 function find(name){const text=compact(name);if(aliases[text])return characters.find(c=>c.id===aliases[text]);return characters.find(c=>[c.chinese,c.japanese,c.short].some(n=>compact(n)===text))||characters.find(c=>c.chinese.endsWith(text)&&text.length>=2)}
 function check(speaker,japanese){if(!japanese)return[];const warnings=[],text=compact(japanese);for(const c of characters)if(c.chinese!==c.japanese&&text.includes(c.chinese))warnings.push('日语台词中的「'+c.chinese+'」请核对为正式姓名「'+c.japanese+'」');for(const [name,id]of Object.entries(aliases)){const c=characters.find(c=>c.id===id);if(name.length>=3&&name!==c.japanese&&text.includes(name))warnings.push('日语台词中的「'+name+'」请核对为「'+c.japanese+'」')}const person=find(speaker);if(person?.producer.length)for(const call of new Set(text.match(/プロデューサー(?:さん|さま|様)?/g)||[]))if(!person.producer.includes(call))warnings.push(person.japanese+' 的「'+call+'」请结合场合核对；资料中常用 '+person.producer.join(' / '));return[...new Set(warnings)]}
 function rules(){return '日语姓名与制作人称呼必须依照下列资料，不得把中文译名直接当日语姓名、擅自音译或增加敬称。称呼不是每句必填，不要机械重复；アナタ等代词仅在确实指制作人时使用。冬優子对外营业/礼貌场合可用プロデューサーさん，私下依语境用プロデューサー或あんた；樹里/ルカ的粗口不得机械套用，须符合具体情绪。自定义人物及未核实的联动人物称呼请遵照用户设定，不杜撰成官方设定。AI生成的日语属于同人日语台词，不是官方原文。\n'+JSON.stringify(characters.map(c=>({中文显示名:c.chinese,日语正式姓名:c.japanese,日语常用名:c.short,对制作人称呼:c.producer.length?c.producer:'未核实，不自行断言'})));}
 // Columns in the supplied table are speakers, rows are the people addressed.
 // Only legible cells are transcribed. A blank cell is unknown, never a ban.
 const addressSource={kind:'user-reference',name:'用户提供的偶像互称表',date:'2026-11-15',image:'44d6b8cbc7be755abdf334ec34896a77.jpg',scope:'可辨认格转录；不是逐格官方核验，未收录不代表不能这样称呼'};
 const pairRows=[
  ['1','2','灯織ちゃん'],['1','3','めぐるちゃん'],['2','1','真乃'],['2','3','めぐる'],['3','1','真乃'],['3','2','灯織'],
  ['4','5','摩美々'],['4','6','咲耶'],['4','7','結華'],['4','8','霧子'],
  ['5','4','恋鐘'],['5','6','咲耶'],['5','7','結華'],['5','8','霧子'],
  ['6','4','恋鐘'],['6','5','摩美々'],['6','7','結華'],['6','8','霧子'],
  ['7','4','こがたん'],['7','5','まみみん'],['7','6','さくやん'],['7','8','きりりん'],
  ['8','4','恋鐘ちゃん'],['8','5','摩美々ちゃん'],['8','6','咲耶さん'],['8','7','結華ちゃん'],
  ['9','10','チョコ先輩'],['9','11','樹里ちゃん'],['9','12','凛世さん'],['9','13','夏葉さん'],
  ['10','9','果穂'],['10','11','樹里ちゃん'],['10','12','凛世ちゃん'],['10','13','夏葉ちゃん'],
  ['11','9','果穂'],['11','10','チョコ'],['11','12','凛世'],['11','13','夏葉'],
  ['12','9','果穂さん'],['12','10','智代子さん'],['12','11','樹里さん'],['12','13','夏葉さん'],
  ['13','9','果穂'],['13','10','智代子'],['13','11','樹里'],['13','12','凛世'],
  ['14','15','甜花ちゃん'],['14','16','千雪さん'],['15','14','なーちゃん'],['15','16','千雪さん'],['16','14','甘奈ちゃん'],['16','15','甜花ちゃん'],
  ['17','18','冬優子ちゃん'],['17','19','愛依ちゃん'],['18','17','あさひ'],['18','19','愛依'],['19','17','あさひちゃん'],['19','18','冬優子ちゃん'],
  ['20','21','樋口'],['20','22','小糸ちゃん'],['20','23','雛菜'],['21','20','透'],['21','22','小糸'],['21','23','雛菜'],
  ['22','20','透ちゃん'],['22','21','円香ちゃん'],['22','23','雛菜ちゃん'],['23','20','透先輩'],['23','21','円香先輩'],['23','22','小糸ちゃん'],
  ['24','25','美琴さん'],['25','24','にちか'],
  ['26','27','アイツ'],['26','28','アイツ'],['27','26','ルカちゃん'],['27','28','はるきちゃん'],['28','26','ルカちゃん'],['28','27','羽那ちゃん'],
  ['1','24','にちかちゃん'],['1','25','美琴さん'],['1','26','ルカちゃん'],['1','27','羽那ちゃん'],['1','28','はるきちゃん'],
  ['2','23','市川さん'],['2','25','緋田さん'],['2','26','ルカさん'],['2','27','鈴木さん'],['2','28','郁田さん'],
  ['20','1','櫻木さん'],['20','2','風野さん'],['20','3','八宮さん'],['20','24','七草さん'],['20','27','鈴木さん'],
  ['21','5','まみみ'],['21','6','あなた'],['21','7','三峰さん'],['21','8','幽谷さん'],['21','17','芹沢さん'],['21','18','冬優子さん'],['21','25','緋田さん'],['21','26','斑鳩さん'],['21','28','郁田さん'],
  ['24','1','櫻木さん'],['24','4','月岡さん'],['24','5','田中さん'],['24','8','幽谷さん'],['24','9','小宮さん'],['24','10','園田さん'],['24','12','杜野さん'],['24','13','有栖川さん'],['24','14','大崎さん'],
  ['25','10','園田さん'],['25','13','有栖川さん'],['25','16','桑山さん'],['25','19','和泉さん'],['25','20','浅倉さん'],
  ['26','2','オマエ / 練習生'],['26','3','アンタ'],['26','5','オメェ'],['26','6','アンタ'],['26','8','オマエ'],['26','17','オマエ / あいつ'],['26','24','オマエ'],['26','25','アンタ'],
  ['27','2','灯織ちゃん'],['27','24','にちかちゃん'],['27','25','美琴ちゃん'],['28','24','にちかちゃん'],['28','25','美琴さん']
 ];
 const imageAddresses=pairRows.map(([speaker,target,form])=>({speaker,target,forms:form.split(' / '),source:addressSource.kind}));
 const web=typeof module==='object'?(()=>{try{return require('./story-character-addresses.js')}catch{return null}})():root.StoryCharacterAddresses;
 const merged=new Map(imageAddresses.map(r=>[r.speaker+':'+r.target,r]));for(const row of web?.addresses||[])merged.set(row.speaker+':'+row.target,row);const addresses=[...merged.values()];
 function address(speaker,target){const a=find(speaker)||characters.find(c=>c.id===String(speaker)),b=find(target)||characters.find(c=>c.id===String(target));return a&&b?addresses.find(r=>r.speaker===a.id&&r.target===b.id)||null:null}
 const nameRules=rules;
 function mutualRules(speakers){const ids=speakers?new Set(speakers.map(String)):null,groups={};for(const r of addresses){if(ids&&!ids.has(r.speaker))continue;const speaker=characters.find(c=>c.id===r.speaker).japanese,target=characters.find(c=>c.id===r.target).japanese;(groups[speaker]??={})[target]=r.forms}return '偶像互称参考：JSON外层是说话人，内层键是被称呼者，值为日语叫法。方向不能颠倒。资料来自用户图与社区互称表，附游戏／音声出处但未逐格官方复核。未收录表示未知，不表示禁止称呼。多种叫法须按时间、亲疏、直接叫人或第三人称选择；不能机械增加称呼。中文显示字幕自然翻译，用户明确同人设定优先。\n'+JSON.stringify(groups);}

 const api={characters,find,rules:()=>nameRules()+'\n'+mutualRules(),check,addresses,address,addressSource,mutualRules};if(typeof module==='object')module.exports=api;else root.StoryCharacterLanguage=api;
})(typeof window==='object'?window:globalThis);
