const fs = require('fs');

const convs = JSON.parse(fs.readFileSync('public/home-assets/conversations.json', 'utf8'));

let results = [];
for (const [cid, c] of Object.entries(convs)) {
  for (const s of (c.sequence || [])) {
    const t = s.translation || '';
    const o = s.original || '';
    // Look for telltale signs of literal machine translation
    const isSuspicious = 
      /它/.test(t) || 
      /先生|女士/.test(t) ||
      /公司/.test(t) ||
      /观看/.test(t) ||
      /餐厅/.test(t) ||
      /人工智能/.test(t) ||
      /法力/.test(t) ||
      /小米饺子/.test(t) ||
      /神圣故事/.test(t) ||
      /康复/.test(t) ||
      /情侣/.test(t) ||
      /笔迹.*我的朋友/.test(t) ||
      /丹尼特尔/.test(t) ||
      /鞋子平板/.test(t) ||
      /小女孩/.test(t) ||
      /我只是想读一下/.test(t) ||
      /果实/.test(t) ||
      /毛巾.*如果你愿意/.test(t) ||
      /我不喜欢她/.test(t) ||
      /摸一下.*头发/.test(t) ||
      /温暖.*睡着/.test(t) ||
      /操蛋/.test(t) ||
      /噱头/.test(t) ||
      /世界最好的制片人/.test(t) ||
      /单恋/.test(t) ||
      /Semeral/.test(t) ||
      /Shoptein/.test(t);

    if (isSuspicious) {
      results.push({
        convId: cid,
        title: c.title,
        speaker: s.speaker,
        id: s.id,
        orig: o,
        trans: t
      });
    }
  }
}

console.log('Total suspicious conversation items:', results.length);
fs.writeFileSync('translation-work/suspicious-home-dialogues.json', JSON.stringify(results, null, 2), 'utf8');
console.log('Written to translation-work/suspicious-home-dialogues.json');
