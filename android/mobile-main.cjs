// Embedded Node worker. Existing Windows entry points remain independent.
const fs=require('fs'),path=require('path'),http=require('http'),crypto=require('crypto');
const user=process.argv[2];if(!user)throw Error('Missing persistent Android directory');
process.env.HOME=user;process.env.TMPDIR=path.join(user,'tmp');fs.mkdirSync(process.env.TMPDIR,{recursive:true});
const core=__dirname;process.chdir(core);let data=path.join(core,'data');
try{const pointer=JSON.parse(fs.readFileSync(path.join(user,'active-data.json'),'utf8'));if(fs.existsSync(path.join(pointer.data,'catalog.json')))data=pointer.data}catch{}
let server,updates,downloading=false,downloadControl=null;const userExports=path.join(user,'exports');fs.mkdirSync(userExports,{recursive:true});
async function mobileAPI(req,res,url){
 if(!url.pathname.startsWith('/api/mobile/'))return false;const send=value=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value))};
 if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host){res.writeHead(403);res.end();return true}
 const route=url.pathname.slice(12);try{
 if(route==='health'){send({ok:true,platform:process.platform,arch:process.arch,node:process.versions.node,version:'2026-11-16.75',root:core});return true}
 if(route==='update-state'){send(updates?.snapshot()||{status:'idle',history:[]});return true}
 if(route==='check-updates'){try{const checkP=updates?updates.check():Promise.resolve({sources:[],hasUpdate:false});const result=await Promise.race([checkP,new Promise(r=>setTimeout(()=>r({sources:[],hasUpdate:false}),2000))]);send(result)}catch(err){send({sources:[],hasUpdate:false,error:err.message})}return true}
 if(route==='update'){if(req.method!=='POST')throw Error('需要POST');send(downloading?{ok:false,error:'请等待离线下载完成'}:updates.start());return true}
 if(route==='download-all'){if(req.method!=='POST')throw Error('需要POST');if(downloading)return send({ok:true,started:true,alreadyRunning:true}),true;if(updates?.state.status==='running')throw Error('请等待内容更新完成后再下载离线资源');downloading=true;downloadControl={cancelled:false};require('./offline-downloader.cjs').downloadAll(user,text=>{downloadState={...downloadState,message:text,running:true}},{base:core,control:downloadControl}).then(summary=>downloadState={running:false,ok:true,summary}).catch(e=>downloadState={running:false,ok:false,error:e.message}).finally(()=>{downloading=false;downloadControl=null});send({ok:true,started:true});return true}
 if(route==='download-cancel'){if(req.method!=='POST')throw Error('需要POST');if(!downloading)return send({ok:true,stopping:false,message:'没有正在进行的下载'}),true;if(downloadControl)downloadControl.cancelled=true;send({ok:true,stopping:true});return true}
 if(route==='download-state'){try{const saved=JSON.parse(fs.readFileSync(path.join(user,'download-status.json'),'utf8'));downloadState={...saved,...(downloadState.running?{running:true}:{})}}catch{}send(downloadState);return true}
 if(route==='export'&&req.method==='POST'){
  const id=crypto.randomUUID(),file=path.join(userExports,id);let size=0;const handle=fs.createWriteStream(file);try{for await(const bytes of req){size+=bytes.length;if(size>512*1024*1024)throw Error('导出文件超过512MB');if(!handle.write(bytes))await new Promise(r=>handle.once('drain',r))}await new Promise((resolve,reject)=>{handle.on('error',reject);handle.end(resolve)});send({id,bytes:size})}catch(e){handle.destroy();fs.rmSync(file,{force:true});throw e}return true;
 }
 res.writeHead(404);res.end('Unknown mobile operation');return true;
 }catch(e){res.writeHead(400,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify({ok:false,error:e.message}));return true}
}
let downloadState={running:false};try{const file=path.join(user,'download-status.json'),saved=JSON.parse(fs.readFileSync(file,'utf8'));if(saved.running){downloadState={...saved,running:false,interrupted:true,message:'上次下载被中断，可再次点击继续'};fs.writeFileSync(file,JSON.stringify(downloadState))}else downloadState=saved}catch{}
// Runtime code editing and Windows executables cannot run on a phone.
const {start}=require('./server.cjs');
(async()=>{
 let preferred=0;try{preferred=Number(fs.readFileSync(path.join(user,'port.txt'),'utf8'))||0}catch{}
 const options={mobile:true,mobileAPI,customStoryRoot:path.join(user,'怪文书'),assistantWorkRoot:path.join(user,'AI助手'),canApplyRepair:false,assistantCodeEnabled:false};
 try{server=await start(path.join(user,'asset-cache'),preferred,()=>data,options)}catch(e){if(e.code!=='EADDRINUSE')throw e;server=await start(path.join(user,'asset-cache'),0,()=>data,options)}
 updates=new(require('./update-background.cjs').BackgroundUpdates)(user,{onActivate:r=>{data=r.data}});
 const port=new URL(server.url).port;fs.writeFileSync(path.join(user,'port.txt'),port);fs.writeFileSync(path.join(user,'ready.json'),JSON.stringify({url:server.url,pid:process.pid,version:'2026-11-16.75'}));console.log('SHINY_READY',server.url);
})().catch(e=>{fs.writeFileSync(path.join(user,'startup-error.txt'),e.stack||String(e));console.error(e)});
































