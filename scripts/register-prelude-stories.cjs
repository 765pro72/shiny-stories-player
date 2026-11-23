const fs=require('node:fs'),{fetchAsset}=require('../asset-source.cjs');
(async()=>{
 const infos=[];for(const card of require('../data/card-supplement.json').filter(c=>c.collection==='PreludeCollection')){
  const r=await fetch('https://api.shinycolors.moe/info/sCardInfo?cardId='+card.cardUuid,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error(card.name);const info=await r.json();infos.push(info);
  for(const event of info.cardSupportEvents||[]){const key='json/produce_events/'+event.eventId+'.json';if(!fs.existsSync('cache/'+key)){const {bytes}=await fetchAsset(key);fs.writeFileSync('cache/'+key,bytes)}}
 }fs.writeFileSync('research/prelude-card-infos.json',JSON.stringify(infos));console.log('Prelude metadata and scripts',infos.length);
})().catch(e=>{console.error(e);process.exitCode=1});
