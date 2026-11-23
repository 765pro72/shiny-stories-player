const fs=require('node:fs'),path=require('node:path');
const norm=s=>String(s||'').replace(/\\n|\r\n/g,'\n').trim();
function preserveTranslations(previous,next){
 let keys=[];try{keys=JSON.parse(fs.readFileSync(path.join(previous,'ai-translation-keys.json'),'utf8'))}catch{}
 const groups=new Map();for(const item of keys){if(!/^[\w-]+\/[\w-]+\.json$/.test(item.key))continue;if(!groups.has(item.key))groups.set(item.key,[]);groups.get(item.key).push(item)}
 let restored=0,changedSource=0;const patched=new Map();
 for(const [key,items]of groups){const oldFile=path.join(previous,'translations',key),newFile=path.join(next,'translations',key);if(!fs.existsSync(oldFile)||!fs.existsSync(newFile))continue;const old=JSON.parse(fs.readFileSync(oldFile,'utf8')),fresh=JSON.parse(fs.readFileSync(newFile,'utf8'));let touched=false;
  for(const item of items){const before=old.rows.find(r=>String(r.id)===String(item.id)),after=fresh.rows.find(r=>String(r.id)===String(item.id));if(!before?.trans||!after)continue;if(norm(before.text)!==norm(after.text)){changedSource++;continue}if(after.trans!==before.trans){after.trans=before.trans;restored++;touched=true}}
  if(touched){fs.mkdirSync(path.dirname(newFile),{recursive:true});fs.writeFileSync(newFile,JSON.stringify(fresh));patched.set(key,fresh)}
 }
 const aggregate=path.join(next,'translations.json');if(patched.size&&fs.existsSync(aggregate)){const all=JSON.parse(fs.readFileSync(aggregate,'utf8'));for(const [key,value]of patched)all[key]=value;fs.writeFileSync(aggregate,JSON.stringify(all))}
 const external=require('./external-translation-preserve.cjs').preserveExternal(previous,next);
 const result={restored,changedSource};if(external.restored)result.externalRestored=external.restored;fs.writeFileSync(path.join(next,'translation-preservation-report.json'),JSON.stringify(result));return result;
}
module.exports={preserveTranslations};
