// Resumable public-resource mirror for the current catalog. Run before packing an offline release.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),cache=path.join(root,'cache'),catalog=require('../data/catalog.json');
const phase=process.argv.includes('--assets')?'assets':'scripts';
const failures=[];let done=0,bytes=0;const valid=p=>/^(json|images|sounds|movies|spine)\/[\w/.\-]+$/.test(p)&&!p.split('/').includes('..');
async function get(p){if(!valid(p))return;const target=path.join(cache,p);if(fs.existsSync(target)&&fs.statSync(target).size>0)return;for(let attempt=0;attempt<3;attempt++)try{const r=await fetch('https://viewer.shinycolors.moe/'+p,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(String(r.status));const b=Buffer.from(await r.arrayBuffer());if(!b.length||b.length>100*1024*1024)throw Error('invalid size');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target+'.part',b);fs.renameSync(target+'.part',target);bytes+=b.length;return}catch(e){if(attempt===2)failures.push({path:p,error:String(e)})}}
async function pool(paths,n){let next=0;await Promise.all(Array.from({length:n},async()=>{while(next<paths.length){const p=paths[next++];await get(p);if(++done%1000===0)console.log(`${phase}: ${done}/${paths.length}, downloaded ${(bytes/1048576).toFixed(1)} MiB, failures ${failures.length}`)}}))}
function assets(tracks,set){
 const commands=new Set(['on','off','fade_out','pause','resume']);
 for(const t of tracks){
  if(t.textFrame&&!commands.has(t.textFrame))set.add(`images/event/text_frame/${t.textFrame}.png`);
  if(t.bg&&!commands.has(t.bg))set.add(`images/event/bg/${t.bg}.jpg`);
  for(const field of ['fg','middleFg'])if(t[field]&&!commands.has(t[field]))set.add(`images/event/fg/${t[field]}.png`);
  for(const [k,d]of [['se','sounds/se/event'],['voice','sounds/voice/events'],['bgm','sounds/bgm']])if(t[k]&&!commands.has(t[k]))set.add(`${d}/${t[k]}.m4a`);
  if(t.movie&&!commands.has(t.movie))set.add(`movies/idols/card/${t.movie}.mp4`);
  if(t.gameEventCommunicationMovie&&!commands.has(t.gameEventCommunicationMovie))set.add(`movies/game_event_communications/${t.gameEventCommunicationMovie}.mp4`);
  if(t.gameEventCommunicationSe&&!commands.has(t.gameEventCommunicationSe))set.add(`sounds/se/game_event_communications/${t.gameEventCommunicationSe}.m4a`);
  if(t.charId&&t.charType){const kind=({stand_costume_fix:'stand_costume',stand_costume_flex:'stand_costume',stand_fix:'stand',stand_flex:'stand'})[t.charCategory]||t.charCategory||'stand';set.add(`spine/${t.charType}/${kind}/${t.charId}/data.json`)}
  if(t.select)for(let n=1;n<=3;n++)set.add(`images/event/select_frame/00${n}.png`);
  if(t.still&&!commands.has(t.still))set.add(`images/event/still/${t.still}.jpg`);
  if(t.stillType&&t.stillId){
   if(t.stillType==='game_event_communications'){
    // Existing unresolved original cutscene: keep it visible in release notes,
    // rather than claiming an unavailable movie or turning it into a JPEG.
    if(String(t.stillId)!=='400103307'){set.add(`movies/game_event_communications/${t.stillId}.mp4`);set.add(`sounds/se/game_event_communications/${t.stillId}.m4a`)}
   }else set.add(`images/content/${t.stillType}/card/${t.stillId}.jpg`);
  }
 }
}
function mypageScripts(){const dir=path.join(cache,'json/mypage_communications');if(!fs.existsSync(dir))return[];const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(e.isDirectory()){for(const f of fs.readdirSync(path.join(dir,e.name)))if(f.endsWith('.json'))out.push(path.join(dir,e.name,f));}else if(e.name.endsWith('.json'))out.push(path.join(dir,e.name));}return out;}
async function main(){if(phase==='scripts'){await pool(catalog.map(x=>'json/'+x.key),12)}else{const set=new Set();for(const row of catalog){const p=path.join(cache,'json',row.key);if(!fs.existsSync(p))continue;try{assets(JSON.parse(fs.readFileSync(p,'utf8')),set)}catch{failures.push({path:'json/'+row.key,error:'invalid JSON'})}}for(const p of mypageScripts()){try{assets(JSON.parse(fs.readFileSync(p,'utf8')),set)}catch{failures.push({path:path.relative(cache,p).replace(/\\/g,'/'),error:'invalid JSON'})}}const art=require('../data/card-art.json');for(const a of Object.values(art)){set.add(`images/content/${a.type}/card/${a.id}.jpg`);if(a.type==='idols'){set.add(`images/content/idols/fes_card/${a.id}.jpg`);set.add(`movies/idols/card/${a.id}.mp4`);set.add(`movies/idols/card_costume/${a.id}.mp4`)}}const home=require('../public/home-assets/catalog.json');for(const c of home){for(const x of c.outfits)set.add(x.path);for(const v of c.voices)set.add(v.path)}const spine=[...set].filter(x=>x.startsWith('spine/')&&x.endsWith('/data.json'));for(const x of spine){set.add(x.replace(/data\.json$/,'data.atlas'));set.add(x.replace(/data\.json$/,'data.png'))}const paths=[...set].filter(valid);fs.writeFileSync(path.join(root,'exports','offline-assets-needed.json'),JSON.stringify(paths,null,2));console.log('assets required',paths.length);await pool(paths,64)}fs.mkdirSync(path.join(root,'exports'),{recursive:true});fs.writeFileSync(path.join(root,'exports',`offline-${phase}-failures.json`),JSON.stringify(failures,null,2));console.log('finished',phase,{checked:done,newMiB:(bytes/1048576).toFixed(1),failures:failures.length})}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={assets,valid};
