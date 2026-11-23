const fs=require('fs');const path=require('path');
const ref=JSON.parse(fs.readFileSync('public/guide-reference.json','utf8'));
const cat=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const byGroup=new Map();
for(const c of cat){const g=String(c.wikiGroup||c.originalGroup||c.group||'');if(!g)continue;if(!byGroup.has(g))byGroup.set(g,[]);byGroup.get(g).push(c)}
const groups=[...byGroup.keys()];
const norm=s=>String(s).normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
const big=s=>{const m=new Map();for(let i=0;i<s.length-1;i++){const g=s.slice(i,i+2);m.set(g,(m.get(g)||0)+1)}return m};
const score=(a,b)=>{const A=big(a),B=big(b);let inter=0,tot=0;for(const [g,n] of A){tot+=n;inter+=Math.min(n,B.get(g)||0)}for(const [,n] of B)tot+=n;return tot?2*inter/tot:0};
function firstLine(c){try{const f=path.join('cache','json',c.key);if(!fs.existsSync(f))return'';const j=JSON.parse(fs.readFileSync(f,'utf8'));const rows=Array.isArray(j)?j:(j.scenarios||j.tracks||j.lines||[]);for(const r of rows){const t=r&&(r.text||(r.lines&&r.lines[0]&&r.lines[0].text));if(t)return String(t).replace(/\s+/g,' ').slice(0,40)}}catch(e){}return''}
const rows=[];
for(const y of ref.timeline||[])for(const e of y.entries||[]){if(e.groups&&e.groups.length)continue;const n=norm(e.title);
 const cands=groups.map(g=>({g,s:score(n,norm(g))})).sort((a,b)=>b.s-a.s).slice(0,3);
 rows.push({date:e.date||'',title:e.title,cands:cands.map(c=>`${c.g}〔${firstLine((byGroup.get(c.g)||[])[0]||{})}〕`).join(' || ')});
}
const esc=s=>'"'+String(s).replace(/"/g,'""')+'"';
const lines=['date,title,候选1 || 候选2 || 候选3'].concat(rows.map(r=>[esc(r.date),esc(r.title),esc(r.cands)].join(',')));
fs.writeFileSync('exports/待匹配对照.csv','\ufeff'+lines.join('\r\n'),'utf8');
console.log(JSON.stringify({rows:rows.length}));
console.log(rows.slice(0,5).map(r=>`${r.title}\n   ${r.cands}`).join('\n'));
