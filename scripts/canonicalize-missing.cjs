const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const F=require(path.join(root,'public','translation-format.js'));
const names=JSON.parse(fs.readFileSync(path.join(root,'data/names.json'),'utf8'));
const common=JSON.parse(fs.readFileSync(path.join(root,'data/common.json'),'utf8'));
const user=JSON.parse(fs.readFileSync('E:/Desktop/缺译文本-主界面364条-剧情8103条-已补译.json','utf8'));
const srcRows=user.rows.filter(r=>!String(r.story).startsWith('home:'));
const cache=new Map();
const scriptRows=key=>{if(cache.has(key))return cache.get(key);let out=[];try{const t=JSON.parse(fs.readFileSync(path.join(root,'cache/json',key),'utf8'));out=Array.isArray(t)?F.extract(t,{},names,common):[]}catch{}cache.set(key,out);return out};
const norm=x=>String(x==null?'':x).replace(/\\n/g,'\n').replace(/\s+/g,' ').trim();
let exact=0,rekeyed=0,ambiguous=0,kept=0;const out=[];
for(const r of srcRows){
  const list=scriptRows(r.story);
  let hit=list.find(l=>l.original===r.original&&String(l.id)===String(r.id));
  if(!hit)hit=list.find(l=>String(l.original).trim()===String(r.original||'').trim());
  if(!hit){
    const w=norm(r.original),c=list.filter(l=>norm(l.original)===w);
    if(c.length&&c.every(l=>norm(l.original)===w)){hit=c[0];ambiguous++}
  }
  if(!hit){out.push({...r});kept++;continue}
  if(hit.original===r.original)exact++;else rekeyed++;
  out.push({...r,id:hit.id,original:hit.original});kept++;
}
fs.writeFileSync(path.join(root,'data/missing-translations.json'),JSON.stringify(out,null,1));
console.log(JSON.stringify({source:srcRows.length,written:out.length,exact,rekeyed,ambiguousFallback:ambiguous,unresolved:srcRows.length-exact-rekeyed-ambiguous}));
