const {fetchAsset}=require('../asset-source.cjs');
// Download newly indexed stories before activating an updated catalog.
const fs=require('fs'),path=require('path');
const {assets,valid}=require('./cache-all.cjs');
const base=path.resolve(__dirname,'..');
async function mirrorUpdate(userDir,newData,progress){
 let previous=path.join(base,'data');try{const pointer=JSON.parse(fs.readFileSync(path.join(userDir,'active-data.json'),'utf8'));if(fs.existsSync(path.join(pointer.data,'catalog.json')))previous=pointer.data}catch{}
 const oldKeys=new Set(JSON.parse(fs.readFileSync(path.join(previous,'catalog.json'),'utf8')).map(x=>x.key));
 const fresh=JSON.parse(fs.readFileSync(path.join(newData,'catalog.json'),'utf8')).filter(x=>!oldKeys.has(x.key));
 const userCache=path.join(userDir,'asset-cache'),failures=[];let fetched=0,completed=0;
 async function get(key){if(!valid(key))return false;const target=path.join(userCache,key),bundled=path.join(base,'cache',key);if(fs.existsSync(target)||fs.existsSync(bundled))return true;let error;for(let i=0;i<3;i++)try{const {bytes}=await fetchAsset(key);fs.mkdirSync(path.dirname(target),{recursive:true});const temp=target+'.update.part';fs.writeFileSync(temp,bytes);fs.renameSync(temp,target);fetched++;return true}catch(e){error=String(e)}failures.push({path:key,error});return false}
 async function pool(paths){let next=0;await Promise.all(Array.from({length:16},async()=>{while(next<paths.length){await get(paths[next++]);if(++completed%100===0)progress(`正在缓存新剧情资源 ${completed}/${paths.length}…`)}}))}
 const scripts=fresh.map(x=>'json/'+x.key);progress(`发现 ${scripts.length} 篇新剧情，正在获取脚本…`);await pool(scripts);
 const needed=new Set();for(const script of scripts){const file=path.join(userCache,script),bundled=path.join(base,'cache',script),source=fs.existsSync(file)?file:bundled;if(!fs.existsSync(source))continue;try{assets(JSON.parse(fs.readFileSync(source,'utf8')),needed)}catch(e){failures.push({path:script,error:'invalid script: '+e.message})}}
 for(const key of [...needed].filter(x=>x.startsWith('spine/')&&x.endsWith('/data.json'))){needed.add(key.replace(/data\.json$/,'data.atlas'));needed.add(key.replace(/data\.json$/,'data.png'))}
 completed=0;progress(`正在缓存 ${needed.size} 个新剧情素材…`);await pool([...needed]);
 let oldMissing=[];try{oldMissing=JSON.parse(fs.readFileSync(path.join(previous,'unavailable.json'),'utf8'))}catch{oldMissing=JSON.parse(fs.readFileSync(path.join(base,'data','unavailable.json'),'utf8'))}const missing=new Set(oldMissing);for(const story of fresh){const key='json/'+story.key;if(fs.existsSync(path.join(userCache,key))||fs.existsSync(path.join(base,'cache',key)))missing.delete(story.key);else missing.add(story.key)}
 fs.writeFileSync(path.join(newData,'unavailable.json'),JSON.stringify([...missing],null,2));
 const result={newStories:fresh.length,filesFetched:fetched,mirrorFailures:failures.length};fs.writeFileSync(path.join(newData,'update-mirror-report.json'),JSON.stringify({result,failures},null,2));return result;
}
module.exports={mirrorUpdate};
