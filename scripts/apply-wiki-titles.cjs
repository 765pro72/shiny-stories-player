const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const wiki=JSON.parse(fs.readFileSync(path.join(root,'data','wiki-titles.json'),'utf8')).entries;
const catPath=path.join(root,'data','catalog.json');
const cat=JSON.parse(fs.readFileSync(catPath,'utf8'));
let filled=0, placeholders=0, single=0, multi=0;
for(const row of cat){
  if(!/^标题待核实/.test(String(row.title||''))) continue;
  placeholders++;
  const w=wiki[row.key];
  if(!w) continue;
  const eps=(w.episodes||[]).filter(Boolean);
  row.originalGroup=w.activity||row.originalGroup||'';
  row.originalTitle=eps.join(' / ')||row.originalTitle||'';
  if(w.activity){ row.group=w.activity; }
  if(eps.length===1){ row.title=eps[0]; single++; }
  else { row.title=w.activity?`${w.activity}（${eps.length} 话）`:`${eps.length} 话`; multi++; }
  filled++;
}
fs.writeFileSync(catPath, JSON.stringify(cat,null,1));
console.log(JSON.stringify({placeholders,filled,single,multi,remaining:placeholders-filled}));
