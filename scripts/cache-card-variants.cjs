// Download the verified alternate card images and the two official P-card movies.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const cache=path.join(root,'cache');
const art=require('../data/card-art.json');
const ids=[...new Set(Object.values(art).filter(x=>x.type==='idols').map(x=>x.id))];
const paths=ids.flatMap(id=>[
  `images/content/idols/fes_card/${id}.jpg`,
  `movies/idols/card/${id}.mp4`,
  `movies/idols/card_costume/${id}.mp4`
]);
let next=0,downloaded=0,bytes=0,missing=0,failed=0;
async function one(p){
  const file=path.join(cache,p);
  if(fs.existsSync(file)&&fs.statSync(file).size>0)return;
  try{
    const r=await fetch('https://cf-static.shinycolors.moe/'+p,{signal:AbortSignal.timeout(60000)});
    if(r.status===404){missing++;return}
    if(!r.ok)throw Error(`HTTP ${r.status}`);
    const body=Buffer.from(await r.arrayBuffer());
    if(!body.length)throw Error('empty response');
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file+'.part',body);fs.renameSync(file+'.part',file);
    downloaded++;bytes+=body.length;
  }catch(e){failed++;console.error('failed',p,String(e))}
}
async function main(){
  await Promise.all(Array.from({length:12},async()=>{while(next<paths.length){const n=next++;await one(paths[n]);if((n+1)%50===0)console.log(`${n+1}/${paths.length}, downloaded ${downloaded}, ${(bytes/1048576).toFixed(1)} MiB, unavailable ${missing}, failed ${failed}`)}}));
  console.log({checked:paths.length,downloaded,newMiB:(bytes/1048576).toFixed(1),unavailable:missing,failed});
}
main().catch(e=>{console.error(e);process.exitCode=1});
