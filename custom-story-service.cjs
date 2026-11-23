const fs=require('node:fs/promises'),path=require('node:path'),{unzipSync,zipSync,strToU8}=require('fflate'),Core=require('./public/custom-story-core.js');
const LIMIT=256*1024*1024;
function unpack(bytes){let total=0,count=0;const files=unzipSync(new Uint8Array(bytes),{filter:f=>{if(!Core.safePath(f.name)||!(/^(project\.json|imports\/|builtin\/)/.test(f.name)))throw Error('工程包含非法路径');if(++count>10000||(total+=f.originalSize)>LIMIT)throw Error('工程解压后超过 256 MB');return true}});if(!files['project.json']||files['project.json'].length>8*1024*1024)throw Error('缺少有效工程文件');const project=Core.validate(JSON.parse(Buffer.from(files['project.json']).toString('utf8')));for(const a of project.assets)if(a.source==='import'){for(const file of [a.path,...(a.kind==='model'?[a.atlas,...Object.values(a.pages)]:[])])if(!files[file])throw Error('工程缺少导入素材：'+file)}return{project,files}}
function metadata(project,bytes,old={}){const names=new Map(project.assets.map(a=>[a.id,a.name||''])),characters=[...new Set(project.scenes.flatMap(s=>s.characters.map(c=>names.get(c.asset)?.split(' · ')[0])).filter(Boolean))];return{...old,origin:old.origin||'created',indexVersion:1,id:project.id,title:project.title,description:String(project.description||'').slice(0,1000),category:String(project.category||'未分类').slice(0,80),characters,searchText:[project.title,project.description,...project.scenes.flatMap(s=>[s.label,s.speaker,s.text,s.original,...(s.captions||[]).flatMap(c=>[c.speaker,c.text,c.original])])].filter(Boolean).join('\n').slice(0,200000),scenes:project.scenes.length,assets:project.assets.length,bytes,updatedAt:old.updatedAt||new Date().toISOString()}}
function inside(root,...parts){const base=path.resolve(root),target=path.resolve(base,...parts);if(!target.startsWith(base+path.sep))throw Error('作品路径无效');return target}
async function deleteWork(root,id){
 const archive=inside(root,id+'.gwa'),index=inside(root,id+'.json');
 const bytes=await fs.readFile(archive);let saved;
 try{saved=await fs.readFile(index)}catch(e){if(e.code!=='ENOENT')throw e;saved=Buffer.from(JSON.stringify(metadata(unpack(bytes).project,bytes.length)))}
 const meta=JSON.parse(saved.toString('utf8')),token=require('node:crypto').randomUUID(),dir=inside(root,'.trash',token);
 await fs.mkdir(dir,{recursive:true});
 await fs.writeFile(path.join(dir,'metadata.json'),saved);
 await fs.writeFile(path.join(dir,'record.json'),JSON.stringify({id,title:meta.title,deletedAt:new Date().toISOString()}));
 await fs.rename(archive,path.join(dir,'project.gwa'));
 try{await fs.unlink(index)}catch(e){if(e.code!=='ENOENT'){await fs.rename(path.join(dir,'project.gwa'),archive);throw e}}
 return{ok:true,id,title:meta.title,token};
}
async function restoreWork(root,id,token){
 if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(token||''))throw Error('撤销凭据无效');
 const dir=inside(root,'.trash',token),record=JSON.parse(await fs.readFile(path.join(dir,'record.json'),'utf8'));
 if(record.id!==id)throw Error('撤销凭据与作品不匹配');
 const archive=inside(root,id+'.gwa'),index=inside(root,id+'.json');
 for(const target of [archive,index]){try{await fs.access(target);throw Object.assign(Error('同编号作品已存在，未覆盖现有作品'),{statusCode:409})}catch(e){if(e.code!=='ENOENT')throw e}}
 const saved=await fs.readFile(path.join(dir,'metadata.json'));
 await fs.writeFile(index,saved,{flag:'wx'});
 try{await fs.rename(path.join(dir,'project.gwa'),archive)}catch(e){await fs.unlink(index);throw e}
 // Cleanup only this known, now-empty backup; never recursively remove the work directory.
 for(const file of ['metadata.json','record.json'])await fs.unlink(path.join(dir,file)).catch(()=>{});
 await fs.rmdir(dir).catch(()=>{});
 return JSON.parse(saved.toString('utf8'));
}
function createStoryService(root){let queue=Promise.resolve();const serialized=work=>{const next=queue.then(work,work);queue=next.catch(()=>{});return next};return async(req,res,url)=>{
 if(url.pathname==='/api/translation-log'){
  if(req.method!=='POST'||(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host)){res.writeHead(403);res.end();return true}
  try{let size=0,chunks=[];for await(const b of req){if((size+=b.length)>32*1024*1024)throw Error('补译日志过大');chunks.push(b)}const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!['import','undo'].includes(value.action)||!Array.isArray(value.changes)||value.changes.length>100000)throw Error('补译日志无效');for(const c of value.changes)if(!/^(?:[\w-]+\/[\w-]+\.json|custom:[\w-]{1,80})$/.test(c.story)||typeof c.original!=='string'||![c.before,c.after].every(v=>v===null||typeof v==='string'))throw Error('补译记录无效');const logRoot=path.join(path.dirname(root),'translation-work');await fs.mkdir(logRoot,{recursive:true});await fs.appendFile(path.join(logRoot,'翻译变更日志.jsonl'),JSON.stringify({at:new Date().toISOString(),action:value.action,source:'用户导入补译',changes:value.changes})+'\n');res.setHeader('Content-Type','application/json');res.end('{"ok":true}')}catch(e){res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}))}return true;
 }
 if(!url.pathname.startsWith('/api/custom-stories'))return false;
 const match=url.pathname.match(/^\/api\/custom-stories(?:\/([\w-]{1,80})(\/(?:text|restore))?)?$/);if(!match){res.writeHead(404);res.end();return true}
 if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host){res.writeHead(403);res.end();return true}
 res.setHeader('Cache-Control','no-store');const id=match[1];
 try{
  await fs.mkdir(root,{recursive:true});
  if(req.method==='GET')await queue;
  if(req.method==='DELETE'&&id&&!match[2]){const result=await serialized(()=>deleteWork(root,id));res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));}
  else if(req.method==='POST'&&id&&match[2]==='/restore'){const result=await serialized(()=>restoreWork(root,id,url.searchParams.get('token')));res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));}
  else if(req.method==='GET'&&!id){const names=(await fs.readdir(root)).filter(n=>/^[\w-]+\.json$/.test(n)),rows=[];for(const name of names)try{let row=JSON.parse(await fs.readFile(path.join(root,name),'utf8'));if(row.indexVersion!==1){const bytes=await fs.readFile(path.join(root,name.replace(/\.json$/,'.gwa')));row=metadata(unpack(bytes).project,bytes.length,row);await fs.writeFile(path.join(root,name),JSON.stringify(row))}rows.push(row)}catch{}res.setHeader('Content-Type','application/json');res.end(JSON.stringify(rows.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))));}
  else if(req.method==='GET'&&id&&(!match[2]||match[2]==='/text')){const bytes=await fs.readFile(path.join(root,id+'.gwa'));if(match[2]){const project=unpack(bytes).project;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({title:project.title,translator:'自创作品',rows:require('./public/custom-story-reader.js').rows(project)}))}else{res.setHeader('Content-Type','application/octet-stream');res.end(bytes)}}
  else if(req.method==='POST'&&!match[2]&&(id||url.searchParams.get('import')==='1')){let size=0,chunks=[];for await(const b of req){size+=b.length;if(size>LIMIT)throw Error('工程不能超过 256 MB');chunks.push(b)}let bytes=Buffer.concat(chunks);const {project,files}=unpack(bytes),importing=!id;if(id&&project.id!==id)throw Error('工程编号不一致');const work=async()=>{if(importing){try{await fs.access(path.join(root,project.id+'.gwa'));project.id=require('node:crypto').randomUUID();files['project.json']=strToU8(JSON.stringify(project));bytes=Buffer.from(zipSync(files,{level:1}))}catch(e){if(e.code!=='ENOENT')throw e}}const targetId=project.id,target=path.join(root,targetId+'.gwa');let old={};try{old=JSON.parse(await fs.readFile(path.join(root,targetId+'.json'),'utf8'))}catch{}await fs.writeFile(target+'.tmp',bytes);await fs.rename(target+'.tmp',target);const meta=metadata(project,bytes.length,{...old,origin:importing?'imported':old.origin||'created',updatedAt:new Date().toISOString()});await fs.writeFile(path.join(root,targetId+'.json.tmp'),JSON.stringify(meta));await fs.rename(path.join(root,targetId+'.json.tmp'),path.join(root,targetId+'.json'));return meta};const next=queue.then(work,work);queue=next.catch(()=>{});const meta=await next;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(meta));}
  else{res.writeHead(405);res.end()}
 }catch(e){res.writeHead(e.code==='ENOENT'?404:e.statusCode||400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.code==='ENOENT'?'工程不存在':e.message}))}return true;
}}
module.exports={createStoryService,unpack};
