const fs=require('node:fs'),path=require('node:path');
const {fetchAsset}=require('./asset-source.cjs');
const {assets,valid}=require('./scripts/cache-all.cjs');
function createDownloads(cacheRoot,bundledRoot,legacyRoot,dataRoot=()=>path.join(__dirname,'data')){
 const missing=new Set();let state={running:false,completed:0,total:0,failed:0},job;
 const local=key=>[cacheRoot,bundledRoot,legacyRoot].filter(Boolean).map(root=>path.join(root,key)).find(file=>fs.existsSync(file)&&fs.statSync(file).size>0);
 function note(key){if(valid(key)&&!local(key))missing.add(key)}
 async function run(keys){
  if(job)throw Error('另一项资源下载正在进行，请稍后重试');
  const queue=keys?[...new Set(keys.filter(valid))]:[...missing],seen=new Set(queue);state={running:true,completed:0,total:queue.length,failed:0};
  const add=key=>{if(valid(key)&&!seen.has(key)){seen.add(key);queue.push(key);state.total=queue.length}};
  job=(async()=>{for(let i=0;i<queue.length;i++){
   const key=queue[i];try{
    let file=local(key);if(!file){if(process.env.SHINY_OFFLINE==='1')throw Error('当前处于离线模式');const {bytes}=await fetchAsset(key,{dataRoot:dataRoot()});file=path.join(cacheRoot,key);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.manual.part',bytes);fs.renameSync(file+'.manual.part',file)}
    missing.delete(key);
    if(key.startsWith('json/')){const rows=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(rows)){const dependencies=new Set();assets(rows,dependencies);for(const p of dependencies)add(p)}}
    if(key.startsWith('spine/')&&key.endsWith('/data.json')){add(key.replace(/data.json$/,'data.atlas'));add(key.replace(/data.json$/,'data.png'))}
   }catch{state.failed++;missing.add(key)}finally{state.completed++}
  }return{...state,running:false}})().finally(()=>{state.running=false;job=null});
  return job;
 }
 return{note,run,status:()=>({...state,missing:missing.size})};
}
module.exports={createDownloads};
