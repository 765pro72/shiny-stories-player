const fs=require('fs');
const ref=JSON.parse(fs.readFileSync('public/guide-reference.json','utf8'));
const cat=JSON.parse(fs.readFileSync('data/catalog.json','utf8'));
const wiki=JSON.parse(fs.readFileSync('data/wiki-titles.json','utf8')).entries;
const small={'ャ':'ヤ','ュ':'ユ','ョ':'ヨ','ァ':'ア','ィ':'イ','ゥ':'ウ','ェ':'エ','ォ':'オ','ヵ':'カ','ヶ':'ケ'};
const strict=s=>String(s).normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').replace(/[ャュョァィゥェォヵヶ]/g,c=>small[c]||c).replace(/ッ/g,'ツ').replace(/ー/g,'').replace(/編/g,'篇').toLowerCase();
const digits=s=>String(s).normalize('NFKC').match(/\d+/g)||[];
const lev=(a,b)=>{const m=a.length,n=b.length;if(Math.abs(m-n)>2)return 99;let p=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c}return p[n]};
const pool=new Map();
for(const c of cat){for(const g of [c.group,c.originalGroup,c.wikiGroup]){const s=String(g||'');if(s&&!pool.has(strict(s)))pool.set(strict(s),s)}}
for(const v of Object.values(wiki)){const a=String(v.activity||'');if(a&&!pool.has(strict(a)))pool.set(strict(a),a)}
const keys=[...pool.keys()];
const aliases={};const detail=[];
for(const y of ref.timeline||[])for(const e of y.entries||[]){
 if(e.groups&&e.groups.length)continue;
 const t=e.title, st=strict(t), dt=digits(t);
 let hits=[];
 for(const k of keys){if(!k)continue;const dg=digits(pool.get(k)||'');if(dg.join(',')!==dt.join(','))continue;const d=lev(st,k);if(d<=2)hits.push({name:pool.get(k),d})}
 if(hits.length===1){aliases[t]=hits[0].name;detail.push({title:t,to:hits[0].name,d:hits[0].d})}
}
fs.writeFileSync('data/guide-aliases.json',JSON.stringify(aliases,null,1));
console.log(JSON.stringify({aliases:Object.keys(aliases).length,unmatchedBefore:142,remaining:142-Object.keys(aliases).length}));
console.log(detail.slice(0,10).map(x=>`${x.title} => ${x.to} (d=${x.d})`).join('\n'));
