const fs=require('fs');
const ref=JSON.parse(fs.readFileSync('public/guide-reference.json','utf8'));
const cat=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const wiki=JSON.parse(fs.readFileSync('data/wiki-titles.json','utf8')).entries;
const norm=s=>String(s).normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').replace(/編/g,'篇').toLowerCase();
// 本地活动集合：group/originalGroup/wikiGroup
const local=new Map();
for(const c of cat){for(const g of [c.group,c.originalGroup,c.wikiGroup]){const s=String(g||'').trim();if(s){const k=norm(s);if(!local.has(k))local.set(k,{name:s,keys:new Set()});local.get(k).keys.add(c.key)}}}
const checklist=[];
for(const y of ref.timeline||[])for(const e of y.entries||[])checklist.push({year:y.year,date:e.date||'',title:e.title,matched:!!(e.groups&&e.groups.length)});
const listKeys=new Set(checklist.map(r=>norm(r.title)));
let localOnly=[];
for(const [k,v] of local){if(listKeys.has(k))continue;localOnly.push(v.name)}
const stats={
 listRows:checklist.length,
 listMatched:checklist.filter(r=>r.matched).length,
 listUnmatched:checklist.filter(r=>!r.matched).length,
 localGroups:local.size,
 localNotInList:localOnly.length
};
console.log(JSON.stringify(stats));
console.log('本地有、清单没有的样例:',localOnly.slice(0,8).join(' | '));
const realLocalOnly=localOnly.filter(n=>!/^节日剧情/.test(n));
console.log('去掉节日剧情后的本地独有:',realLocalOnly.length);
