const fs=require('fs');const f='scripts/catalog.cjs';let s=fs.readFileSync(f,'utf8');
s=s.replace('else q=!q;',"else if(q)q=false;else if(v==='')q=true;else v+=c;");
s=s.replace('const list=new Map()',`const titleMap=new Map(csv(fs.readFileSync(path.join(transRoot,'title.csv'),'utf8')).filter(r=>r.trans).map(r=>[r.text,r.trans]));const label=s=>titleMap.get(s)||s.replace(/編/g,'篇').replace(/第(\\d+)話/g,'第$1话').replace(/オープニング/g,'序章').replace(/エンディング/g,'终章');
const list=new Map()`);
s=s.replace('const albumRoot=',`for(const s of list.values()){s.originalTitle=s.title;s.originalGroup=s.group;s.title=label(s.title);s.group=s.group.split(' / ').map(label).join(' / ');}
const albumRoot=`);
s=s.replace('title:e.title,','title:label(e.title),');
s=s.replace("fs.writeFileSync(path.join(out,'catalog.json')",`for(const [k,v] of Object.entries(dict)){const f=path.join(out,'translations',k);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,JSON.stringify(v));}
fs.writeFileSync(path.join(out,'catalog.json')`);fs.writeFileSync(f,s);
