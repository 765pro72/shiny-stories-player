const fs=require('fs');const path=require('path');
const list=JSON.parse(fs.readFileSync('research/official-current/story-script-assets.json','utf8'));
const missing=[];let have=0;
for(const rel of list){
  const p=path.join('cache','json',rel.replace(/^json\//,''));
  if(fs.existsSync(p))have++;else missing.push(rel);
}
console.log(JSON.stringify({official:list.length,have,missing:missing.length}));
const byDir={};for(const m of missing){const d=m.split('/')[1];byDir[d]=(byDir[d]||0)+1}
console.log(JSON.stringify(byDir));
console.log(missing.slice(0,8).join(' | '));
