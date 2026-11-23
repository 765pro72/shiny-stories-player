const fs=require('node:fs'),path=require('node:path');
const {fetchAsset}=require('./asset-source.cjs'),{assets,valid}=require('./scripts/cache-all.cjs');
async function downloadAll(userDir,progress=()=>{},options={}){
 const base=options.base||__dirname;let data=path.join(base,'data');try{const pointer=JSON.parse(fs.readFileSync(path.join(userDir,'active-data.json'),'utf8'));if(fs.existsSync(path.join(pointer.data,'catalog.json')))data=pointer.data}catch{}
 const read=(name,fallback=[])=>{try{return JSON.parse(fs.readFileSync(path.join(data,name),'utf8'))}catch{return fallback}};
 const queue=[],seen=new Set(),add=k=>{if(valid(k)&&!seen.has(k)){seen.add(k);queue.push(k)}};
 read('offline-assets.json').forEach(add);read('catalog.json').forEach(r=>add('json/'+r.key));
 const targetRoot=path.join(userDir,'asset-cache'),bundledRoot=path.join(base,'cache');
 const local=key=>[path.join(targetRoot,key),path.join(bundledRoot,key)].find(f=>fs.existsSync(f)&&fs.statSync(f).size>0);
 const pending=queue.filter(k=>!local(k)).length,failures=[];let next=0,completed=0,downloaded=0,bytes=0,last=0;
 const report=()=>{const now=Date.now();if(now-last<350&&completed<queue.length)return;last=now;progress('正在核对离线资源 '+completed.toLocaleString()+'/'+queue.length.toLocaleString()+' · 新下载 '+downloaded.toLocaleString()+' 项')};
 await Promise.all(Array.from({length:12},async()=>{while(next<queue.length){const key=queue[next++];try{let file=local(key);if(!file){if(process.env.SHINY_OFFLINE==='1')throw Error('当前为离线模式');let result;for(let attempt=0;attempt<3;attempt++)try{result=await(options.fetchAsset||fetchAsset)(key,{dataRoot:data});break}catch(e){if(attempt===2)throw e}file=path.join(targetRoot,key);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.download.part',result.bytes);fs.renameSync(file+'.download.part',file);downloaded++;bytes+=result.bytes.length}
 if(key.startsWith('json/')){const rows=JSON.parse(fs.readFileSync(file,'utf8'));if(Array.isArray(rows)){const deps=new Set();assets(rows,deps);deps.forEach(add)}}
 if(key.startsWith('spine/')&&key.endsWith('/data.json'))for(const ext of ['atlas','png'])add(key.replace(/json$/,ext));
 }catch(e){failures.push({path:key,error:e.message})}finally{completed++;report()}}}));
 const result={total:queue.length,pending,downloaded,failed:failures.length,bytes,complete:failures.length===0};fs.mkdirSync(targetRoot,{recursive:true});fs.writeFileSync(path.join(targetRoot,'offline-download-report.json'),JSON.stringify({result,failures},null,2));return result;
}
module.exports={downloadAll};
