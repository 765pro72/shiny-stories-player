const fs=require('fs');
const ref=JSON.parse(fs.readFileSync('public/guide-reference.json','utf8'));
const cat=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const norm=s=>String(s).normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
const idx=[];
for(const c of cat){const bags=[c.title,c.group,c.originalGroup,c.wikiGroup,c.originalTitle].filter(Boolean).map(norm);idx.push({key:c.key,bags,name:c.group})}
const un=[];for(const y of ref.timeline||[])for(const e of y.entries||[])if(!e.groups||!e.groups.length)un.push(e.title);
let hit=0;const hits=[],miss=[];
for(const t of un){const n=norm(t);const found=idx.filter(r=>r.bags.some(b=>b===n||b.includes(n)));
 if(found.length){hit++;hits.push(`${t} => ${found.length} 条（如 ${found[0].name}）`)}else miss.push(t)}
console.log(JSON.stringify({unmatched:un.length,foundInCatalog:hit,notFound:miss.length}));
console.log(hits.slice(0,10).join('\n'));
console.log('--- 仍然找不到 ---');
console.log(miss.slice(0,10).join(' | '));
