const fs=require('fs');
const ref=JSON.parse(fs.readFileSync('public/guide-reference.json','utf8'));
const cat=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const small={'ャ':'ヤ','ュ':'ユ','ョ':'ヨ','ァ':'ア','ィ':'イ','ゥ':'ウ','ェ':'エ','ォ':'オ'};
const strict=s=>String(s).normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').replace(/[ャュョァィゥェォ]/g,c=>small[c]).replace(/ッ/g,'ツ').replace(/ー/g,'').replace(/編/g,'篇').toLowerCase();
const local=new Map();
for(const c of cat){for(const g of [c.group,c.originalGroup,c.wikiGroup]){const s=String(g||'').trim();if(!s)continue;const k=strict(s);if(!local.has(k))local.set(k,{name:s,keys:new Set()});local.get(k).keys.add(c.key)}}
const titles=[];for(const y of ref.timeline||[])for(const e of y.entries||[])titles.push(strict(e.title));
const titleSet=new Set(titles);
const keys=[...local.keys()];
let covered=0;const notCovered=[];
for(const k of keys){
 if(titleSet.has(k)){covered++;continue}
 const hit=titles.some(t=>t&&(t.startsWith(k)||k.startsWith(t)));
 if(hit)covered++;else notCovered.push(local.get(k).name);
}
console.log(JSON.stringify({localGroups:keys.length,coveredByList:covered,localOnly:notCovered.length}));
console.log('本地有、清单完全没有的样例:',notCovered.slice(0,10).join(' | '));
