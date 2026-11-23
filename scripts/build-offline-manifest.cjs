const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const assets=JSON.parse(fs.readFileSync(path.join(root,'exports','offline-assets-needed.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data','catalog.json'),'utf8'));
const files=[...new Set([...catalog.map(x=>'json/'+x.key),...assets])].sort();
fs.writeFileSync(path.join(root,'data','offline-assets.json'),JSON.stringify(files));
console.log({scripts:catalog.length,assets:assets.length,total:files.length});
