const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{Worker}=require('node:worker_threads');
const {requestBytes}=require('./update-http.cjs');
const MODEL='75af72e9a5bcb3bd948f5f41b177998a65309f4cb10ff3eb6e5b917de1f25f47',URL='https://github.com/Kim2091/Kim2091-Models/releases/download/2x-AnimeSharpV4/2x-AnimeSharpV4_RCAN_fp16_op17.onnx';
const MODELS={full:{hash:MODEL,file:'2x-AnimeSharpV4-RCAN.onnx',url:URL},fast:{hash:'cfdf4a3e1200d7c13669fa4df301e7ce06bdb2a3cdbb4bda5858cd4bbe995056',file:'2x-AnimeSharpV4-Fast-RCAN-PU.onnx',url:'https://github.com/Kim2091/Kim2091-Models/releases/download/2x-AnimeSharpV4/2x-AnimeSharpV4_Fast_RCAN_PU_fp16_opset17.onnx'}};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function createAnimeSharp(root,{fetch:transport=globalThis.fetch,modelFile}={}){
 const dir=path.join(root,'超分资源','AnimeSharpV4'),jobs=new Map();let worker,loadedModel,tail=Promise.resolve(),current,disposed=false;
 function status(job,text){job.message=text;job.updatedAt=new Date().toISOString()}
 function call(type,payload){const target=worker;return new Promise((resolve,reject)=>{const cleanup=()=>{target.off('message',listen);target.off('error',fail);target.off('exit',exit)},fail=e=>{cleanup();reject(e)},exit=code=>fail(Error('推理进程退出（'+code+'）')),listen=m=>{if(m.type==='error')fail(Error(m.error));else if(m.type===(type==='init'?'ready':'result')){cleanup();resolve(m)}};target.on('message',listen);target.once('error',fail);target.once('exit',exit);target.postMessage({type,...payload})})}
 async function initialize(job){
  if(worker&&loadedModel===job.preset)return;
  fs.mkdirSync(dir,{recursive:true});const spec=MODELS[job.preset],cached=path.join(dir,spec.file),bundled=path.join(__dirname,'vendor','animesharp-runtime','models',spec.file),file=modelFile&&job.preset==='full'?modelFile:fs.existsSync(cached)?cached:fs.existsSync(bundled)?bundled:cached;
  if(!fs.existsSync(file)||hash(fs.readFileSync(file))!==spec.hash){if(modelFile&&job.preset==='full')throw Error('测试模型校验失败');if(process.env.SHINY_OFFLINE==='1')throw Error('该档位模型尚未下载，请联网启用一次后再离线使用');status(job,'首次使用，正在下载 AnimeSharpV4 模型（约30 MB）…');const bytes=await requestBytes(spec.url,{label:'AnimeSharpV4 模型',fetch:transport,progress:text=>status(job,text)});if(hash(bytes)!==spec.hash)throw Error('AnimeSharpV4 权重校验失败');fs.writeFileSync(file+'.tmp',bytes);fs.renameSync(file+'.tmp',file)}
  fs.writeFileSync(path.join(dir,'模型来源与许可.txt'),'2x-AnimeSharpV4 RCAN / RCAN PixelUnshuffle by Kim2091\nCC BY-NC-SA 4.0\nhttps://creativecommons.org/licenses/by-nc-sa/4.0/\nhttps://github.com/Kim2091/Kim2091-Models/releases/tag/2x-AnimeSharpV4\nOriginal assets are not overwritten.\n');
  status(job,'正在初始化 AnimeSharpV4 推理组件…');if(!worker){worker=new Worker(path.join(__dirname,'animesharp-worker.cjs'));worker.on('message',m=>{if(m.type==='progress'&&current){current.done=m.done;current.total=m.total;current.provider=m.provider;status(current,'正在处理图集部件 '+m.done+' / '+m.total+(m.provider==='cpu'?'（CPU，较慢）':''))}});worker.on('error',()=>{loadedModel=null});worker.on('exit',()=>{loadedModel=null;worker=null})}
  await call('init',{model:file});loadedModel=job.preset;
 }
 function submit(png,regions,preset='full'){
  if(!MODELS[preset])throw Error('未知的 AnimeSharpV4 档位');
  if(png.length<24||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('只接受原始纹理的 PNG 数据');const w=png.readUInt32BE(16),h=png.readUInt32BE(20);if(w>4096||h>4096||w*h>16777216)throw Error('图像尺寸超出处理范围');
  if(!Array.isArray(regions)||regions.length>1000)throw Error('图集部件列表无效');
  const id=hash(Buffer.concat([Buffer.from('AnimeSharpV4-parts-v2-flat'+MODELS[preset].hash+JSON.stringify(regions)),png])),file=path.join(dir,id+'.png');if(jobs.has(id)&&jobs.get(id).state!=='failed')return jobs.get(id);jobs.delete(id);
  const job={id,preset,state:fs.existsSync(file)?'ready':'queued',message:fs.existsSync(file)?'已读取本地超分图':'等待处理，继续显示原图',url:'/api/animesharp/image/'+id+'.png',done:0,total:regions.length||1};jobs.set(id,job);
  if(job.state==='ready')return job;
  tail=tail.then(async()=>{if(disposed)return;current=job;job.state='processing';try{await initialize(job);const {bytes}=await call('image',{png,regions});fs.writeFileSync(file+'.tmp',bytes);fs.renameSync(file+'.tmp',file);job.state='ready';status(job,'AnimeSharpV4 2× 已就绪')}catch(error){job.state='failed';status(job,error.message+'；继续使用原图。')}finally{current=null}});
  return job;
 }
 return{submit,get:id=>jobs.get(id),file:id=>/^[a-f0-9]{64}$/.test(id)?path.join(dir,id+'.png'):null,async dispose(){disposed=true;await worker?.terminate()}};
}
module.exports={createAnimeSharp,MODEL,MODELS};
