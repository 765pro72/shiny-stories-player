const fs=require('fs');
const ref=JSON.parse(fs.readFileSync('public/guide-reference.json','utf8'));
const media=JSON.parse(fs.readFileSync('data/card-media.json','utf8'));
const cards=Array.isArray(media)?media:(media.cards||Object.values(media));
const norm=s=>String(s).normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
const byName=cards.filter(c=>c&&c.name).map(c=>({n:norm(c.name),raw:c.name,keys:(c.stories||[]).map(s=>s.key||s)}));
const un=[];for(const y of ref.timeline||[])for(const e of y.entries||[])if(!e.groups||!e.groups.length)un.push(e.title);
let hit=0,withStories=0;const ex=[];
for(const t of un){const n=norm(t);const f=byName.filter(c=>c.n===n||c.n.includes(n));
 if(f.length){hit++;const keys=f.flatMap(c=>c.keys||[]);if(keys.length)withStories++;ex.push(`${t} => 卡「${f[0].raw}」 ${keys.length} 篇`) }}
console.log(JSON.stringify({cards:cards.length,unmatched:un.length,matchedCard:hit,withStories}));
console.log(ex.slice(0,8).join('\n'));
