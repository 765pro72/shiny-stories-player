const fs=require('fs'),path=require('path'),crypto=require('crypto'),{Zip,ZipDeflate,strToU8}=require('fflate'),F=require('./public/translation-format.js');
function createStoryTextService(options={}){
 const base=options.base||__dirname,dataRoot=options.dataRoot||(()=>path.join(base,'data')),cacheRoot=options.cacheRoot||path.join(base,'cache'),jobs=new Map();
 async function data(key,fallback){for(const root of [dataRoot(),path.join(base,'data')])try{return JSON.parse(await fs.promises.readFile(path.join(root,key),'utf8'))}catch{}return fallback}
 async function context(){const [catalog,names,common]=await Promise.all([data('catalog.json',[]),data('names.json',{}),data('common.json',{})]);return{catalog,entries:new Map(catalog.map(s=>[s.key,s])),names,common}}
 async function story(key,ctx){if(!/^[\w-]+\/[\w-]+\.json$/.test(key))throw Error('剧情编号无效');ctx??=await context();const entry=ctx.entries.get(key);if(!entry)throw Error('目录没有此剧情');let tracks;for(const root of [cacheRoot,path.join(base,'cache')])try{tracks=JSON.parse(await fs.promises.readFile(path.join(root,'json',key),'utf8'));break}catch{}if(!tracks&&options.loadScript)tracks=await options.loadScript(key);if(!Array.isArray(tracks))throw Error('剧情原文尚未取得，请先播放或保存该篇离线资源');const translation=await data('translations/'+key,{}),rows=F.extract(tracks,translation,ctx.names,ctx.common);return{story:key,title:entry.title,translator:translation.translator||'暂无汉化',additionalSources:translation.additionalSources||[],rows:rows.map(r=>({...r,story:key}))}}
 function originOK(req){return!req.headers.origin||req.headers.origin==='http://'+req.headers.host}
 return async(req,res,url)=>{
  if(!url.pathname.startsWith('/api/story-text'))return false;
  let activeJob=null;const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
  try{
   if(!originOK(req)){json(403,{error:'请求来源无效'});return true}
   if(url.pathname==='/api/story-text'&&req.method==='GET'){json(200,await story(url.searchParams.get('key')||''));return true}
   if(url.pathname==='/api/story-text/missing'&&req.method==='GET'){
  try{const fsx=require('fs');const file=path.join(dataRoot(),'missing-translations.json');const stamp=fsx.existsSync(file)?fsx.statSync(file).mtimeMs:0;let newest=0;for(const dir of [path.join(dataRoot(),'translations'),cacheRoot]){const stack=[dir];while(stack.length){const cur=stack.pop();let items=[];try{items=fsx.readdirSync(cur,{withFileTypes:true})}catch{continue}for(const it of items){const full=path.join(cur,it.name);if(it.isDirectory()){stack.push(full);continue}try{const m=fsx.statSync(full).mtimeMs;if(m>newest)newest=m}catch{}}}}if(newest>stamp){const {spawn}=require('child_process');if(!globalThis.__shinyMissingRebuild){globalThis.__shinyMissingRebuild=true;try{const script=path.join(base,'scripts','canonicalize-missing.cjs');if(fsx.existsSync(script))spawn(process.execPath,[script],{cwd:base,detached:true,stdio:'ignore',windowsHide:true,env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}}).unref()}catch{}finally{setTimeout(()=>{globalThis.__shinyMissingRebuild=false},600000)}}}}catch{}
  const storyCache=new Map();
  const canonical=async row=>{try{const key=String(row.story||'');if(!/^[\w-]+\/[\w-]+\.json$/.test(key))return null;if(!storyCache.has(key))storyCache.set(key,(await story(key)).rows||[]);const rows=storyCache.get(key);const norm=value=>String(value==null?'':value).replace(/\\n/g,'\n').replace(/\s+/g,' ').trim();let hit=rows.find(line=>line.original===row.original&&(row.id===undefined||String(row.id)===String(line.id)));if(!hit)hit=rows.find(line=>String(line.original).trim()===String(row.original||'').trim());if(!hit){const wanted=norm(row.original),cands=rows.filter(line=>norm(line.original)===wanted);if(cands.length===1)hit=cands[0]}return hit||null}catch{return null}};
    const [home,missing]=await Promise.all([data('home-conversations.json',[]),data('missing-translations.json',[])]);
  const scope=String(url.searchParams.get('scope')||'all');
    const storyRows=[];if(scope!=='home')for(const r of (Array.isArray(missing)?missing:[])){if(!r||!r.story||typeof r.original!=='string')continue;storyRows.push({story:r.story,file:r.file,id:r.id,speaker:r.speaker||'',original:r.original,translation:'',previous:r.previous||'',next:r.next||''})}
    const homeRows=[];for(const conv of Array.isArray(home)?home:[])for(const line of conv.sequence||[]){const original=String(line.original||'').trim();if(!original||String(line.translation||'').trim())continue;homeRows.push({story:'home:'+conv.id,file:conv.title,id:line.id,speaker:line.speaker||'',original,translation:'',voicePath:line.path||''})}
    const includeStory=scope!=='home',includeHome=scope!=='story';
 const rows=[...(includeStory?storyRows:[]),...(includeHome?homeRows:[])];
 const title=includeStory&&includeHome?'缺译文本（剧情 + 主界面）':includeStory?'剧情缺译文本':'主界面语音缺译文本';
 json(200,F.bundle(rows,{title,exportKind:'missing',scope,generatedAt:new Date().toISOString(),counts:{story:includeStory?storyRows.length:0,home:includeHome?homeRows.length:0}}));return true}
   if(url.pathname==='/api/story-text/export'&&req.method==='POST'){for(const [id,j]of jobs)if(Date.now()-j.created>3600000&&!j.running)jobs.delete(id);if([...jobs.values()].filter(j=>j.running).length>=2)throw Error('已有导出正在进行');const id=crypto.randomUUID();jobs.set(id,{created:Date.now(),done:0,total:0,missing:[],running:false,finished:false});json(200,{id,url:'/api/story-text/export?id='+id});return true}
   const job=jobs.get(url.searchParams.get('id'));if(!job)throw Error('导出任务已过期，请重新导出');
   if(url.pathname==='/api/story-text/progress'){json(200,job);return true}
   if(url.pathname!=='/api/story-text/export'||req.method!=='GET'||job.running||job.finished)throw Error('导出请求无效');
   job.running=true;activeJob=job;const ctx=await context(),catalog=ctx.catalog;job.total=catalog.length;let failure=null,backpressure=false;const zip=new Zip((e,bytes,final)=>{if(e){failure=e;return}if(!res.destroyed)backpressure=!res.write(Buffer.from(bytes));if(final&&!res.destroyed)res.end()});
   res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="shiny-story-originals.zip"','Cache-Control':'no-store'});
   const add=(name,text)=>{const file=new ZipDeflate(name,{level:1});zip.add(file);file.push(strToU8(text),true)};
   for(const row of catalog){if(res.destroyed)break;try{const s=await story(row.key,ctx);add('原文/'+row.key,JSON.stringify(F.bundle(s.rows.map(r=>({...r,existingTranslation:r.translation,translation:''})),{title:s.title,exportKind:'original',translator:s.translator,additionalSources:s.additionalSources}),null,2))}catch(e){job.missing.push({story:row.key,error:e.message})}job.done++;if(failure)throw failure;if(backpressure&&!res.destroyed)await new Promise(resolve=>{const finish=()=>{res.off('drain',finish);res.off('close',finish);resolve()};res.once('drain',finish);res.once('close',finish)});}
   if(!res.destroyed){add('导入说明.txt',Object.values(F.instructions).join('\n\n')+'\n\n共 '+job.total+' 篇，成功 '+(job.done-job.missing.length)+' 篇；缺失见 manifest.json。');add('manifest.json',JSON.stringify({total:job.total,exported:job.done-job.missing.length,missing:job.missing},null,2));zip.end();job.finished=true}else zip.terminate();job.running=false;
  }catch(e){if(res.headersSent)res.destroy(e);else json(400,{error:e.message})}finally{if(activeJob)activeJob.running=false}return true;
 };
}
module.exports={createStoryTextService};
