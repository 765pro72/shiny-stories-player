const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');
const wiki=JSON.parse(fs.readFileSync(path.join(root,'data','wiki-titles.json'),'utf8')).entries;
const catPath=path.join(root,'data','catalog.json');
const cat=JSON.parse(fs.readFileSync(catPath,'utf8'));
let tagged=0;
for(const row of cat){const w=wiki[row.key];if(w&&w.activity){row.wikiGroup=w.activity;tagged++}}
fs.writeFileSync(catPath,JSON.stringify(cat,null,1));
console.log(JSON.stringify({tagged}));
