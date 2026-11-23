const fs=require('fs');
const ref=JSON.parse(fs.readFileSync('public/guide-reference.json','utf8'));
const cat=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const w=JSON.parse(fs.readFileSync('data/wiki-titles.json','utf8')).entries;
const norm=s=>String(s).normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').replace(/編/g,'篇').toLowerCase();
const pool=new Map();
for(const c of cat){const g=String(c.wikiGroup||c.originalGroup||c.group||'');if(g&&!pool.has(norm(g)))pool.set(norm(g),g)}
for(const v of Object.values(w)){const a=String(v.activity||'');if(a&&!pool.has(norm(a)))pool.set(norm(a),a)}
const keys=[...pool.keys()];
function bigram(s){const m=new Map();for(let i=0;i<s.length-1;i++){const g=s.slice(i,i+2);m.set(g,(m.get(g)||0)+1)}return m}
function score(a,b){const A=bigram(a),B=bigram(b);let inter=0,total=0;for(const [g,n] of A){total+=n;inter+=Math.min(n,B.get(g)||0)}for(const [,n] of B)total+=n;return total?2*inter/total:0}
const rows=[];
for(const y of ref.timeline||[])for(const e of y.entries||[]){if(e.groups&&e.groups.length)continue;const n=norm(e.title);let best=null;
 for(const k of keys){if(!k)continue;const s=score(n,k);if(!best||s>best.score)best={score:s,name:pool.get(k)}}
 rows.push({title:e.title,date:e.date||'',suggest:best&&best.score>=0.5?best.name:'',score:best?+best.score.toFixed(2):0})}
rows.sort((a,b)=>b.score-a.score);
fs.writeFileSync('data/guide-aliases.proposed.json',JSON.stringify({generatedAt:new Date().toISOString(),note:'文档标题 → 候选官方活动名；确认后写入 data/guide-aliases.json',rows},null,1));
console.log(JSON.stringify({unmatched:rows.length,withSuggest:rows.filter(r=>r.suggest).length,strong:rows.filter(r=>r.score>=0.75).length}));
console.log(rows.slice(0,8).map(r=>`${r.score} ${r.title} => ${r.suggest}`).join('\n'));
