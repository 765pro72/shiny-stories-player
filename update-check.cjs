const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {loadCodec}=require('./asset-source.cjs');
const {requestBytes}=require('./update-http.cjs');
const fingerprint=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function officialJSON(key,manifest=false,progress=()=>{}){const {codec}=await loadCodec();const url='https://shinycolors.enza.fun/assets/'+(manifest?'asset-map-':'')+codec.encryptPath('/assets/'+key,key.replace(/\.json$/,''));const b=await requestBytes(url,{label:manifest?'官方资源总索引':'官方索引 '+key,progress,totalMs:120000}),p=codec._malloc(b.length);try{new Uint8Array(codec.HEAPU8.buffer,p,b.length).set(b);return JSON.parse(Buffer.from(codec.decryptResource(p,b.length),'latin1').toString('utf8'))}finally{codec._free(p)}}
const officialManifest=progress=>officialJSON('asset-map.json',true,progress);
async function repositoryRevision(repo){
 const bytes=await requestBytes('https://github.com/'+repo+'/commits/master.atom',{label:repo+' 版本检查',attempts:2,totalMs:60000});
 const revision=bytes.toString('utf8').match(/<id>tag:github.com,2008:Grit::Commit\/([a-f0-9]{40})<\/id>/)?.[1];if(!revision)throw Error('无法读取公开提交版本');return revision;
}
async function checkOfficial(baseline,previous,userDir,progress){
 const manifest=await officialManifest(progress),revision=fingerprint(manifest),chunks=Object.assign({},...manifest.chunks),oldChunks=previous.officialChunks||baseline.officialChunks||{},index=(()=>{try{const active=JSON.parse(fs.readFileSync(path.join(userDir,'active-data.json'),'utf8'));return JSON.parse(fs.readFileSync(path.join(active.data,'update-resource-index.json'),'utf8'))}catch{return require('./data/update-resource-index.json')}})();
 const stories=new Set(index.stories),voices=new Set(index.voices),newStories=new Set(previous.newStories||[]),newVoices=new Set(previous.newVoices||[]),resources=new Set(index.resources||[...index.stories,...index.voices]),newAssets=new Set(previous.newAssets||[]),keys=Object.keys(chunks).filter(k=>oldChunks[k]!==chunks[k]);
 let next=0,done=0,failed=null;const dir=path.join(userDir,'update-sources','official-fragments');fs.mkdirSync(dir,{recursive:true});progress('官方资源分片：0 / '+keys.length+'（未变更的分片跳过）');
 await Promise.all(Array.from({length:4},async()=>{while(next<keys.length&&!failed){const name=keys[next++],file=path.join(dir,fingerprint([name,chunks[name]])+'.json');try{let map;try{map=JSON.parse(fs.readFileSync(file,'utf8'))}catch{map=await officialJSON(name,false,progress);fs.writeFileSync(file,JSON.stringify(map))}for(const key of Object.keys(map)){if(/^(json|spine|sounds|movies|images)\/[\w/.@-]+$/.test(key)&&!key.split('/').includes('..')&&!resources.has(key))newAssets.add(key);if(/^json\/.+\.json$/.test(key)&&!key.startsWith('json/support_skills/')&&!stories.has(key))newStories.add(key);if(/^sounds\/voice\/(?:characters\/\d+|(?:idols|support_idols|whisper)\/\d{10})\/.+\.m4a$/.test(key)&&!voices.has(key))newVoices.add(key)}progress('官方资源分片：'+(++done)+' / '+keys.length)}catch(error){failed=error}}}));if(failed)throw failed;
 return{revision,officialChunks:chunks,newAssets:[...newAssets].filter(k=>!resources.has(k)),newStories:[...newStories].filter(k=>!stories.has(k)),newVoices:[...newVoices].filter(k=>!voices.has(k))};
}
async function checkUpdates(userDir,progress=()=>{}){
 if(process.env.SHINY_OFFLINE==='1')return{offline:true,checkedAt:new Date().toISOString(),sources:[]};
 const file=path.join(userDir,'update-check.json');let previous={};try{previous=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}
 let baseline={};try{baseline=require('./data/update-baseline.json')}catch{}
 if(baseline.updatedAt&&(previous.baselineUpdatedAt!==baseline.updatedAt||Date.parse(baseline.updatedAt)>Date.parse(previous.checkedAt||0))){previous={};}
 const jobs=[['official',()=>checkOfficial(baseline,previous,userDir,progress)],...['ShinyGroup/SCTranslationData','ShinyColorsDB/ShinyColorsDB-Album'].map(repo=>[repo,()=>repositoryRevision(repo)])];
 let official=null;const sources=await Promise.all(jobs.map(async([name,job])=>{try{const value=await job(),revision=typeof value==='string'?value:value.revision,known=previous.revisions?.[name]||baseline[name];if(name==='official')official=value;return{name,revision,changed:known?known!==revision:null,...(name==='official'?{newStories:value.newStories.length,newVoices:value.newVoices.length,newAssets:value.newAssets.length}:{})}}catch(e){return{name,error:e.message}}}));
 const result={checkedAt:new Date().toISOString(),baselineUpdatedAt:baseline.updatedAt||null,sources,officialChunks:official?.officialChunks||previous.officialChunks||baseline.officialChunks,newAssets:official?.newAssets||previous.newAssets||[],newStories:official?.newStories||previous.newStories||[],newVoices:official?.newVoices||previous.newVoices||[],revisions:{...Object.fromEntries(['official','ShinyGroup/SCTranslationData','ShinyColorsDB/ShinyColorsDB-Album'].filter(k=>baseline[k]).map(k=>[k,baseline[k]])),...(previous.revisions||{}),...Object.fromEntries(sources.filter(s=>s.revision).map(s=>[s.name,s.revision]))}};
 fs.mkdirSync(userDir,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(result));fs.renameSync(file+'.tmp',file);return result;
}
module.exports={checkUpdates,officialManifest,officialJSON,fingerprint};
