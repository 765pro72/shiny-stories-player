// Public official manifest inventory; never infer ownership from a display name.
const fs=require('node:fs'),path=require('node:path'),{fetchAsset}=require('../asset-source.cjs');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v));
const home=read('public/home-assets/catalog.json'),cards=read('data/card-supplement.json'),models=read('research/official-current/model-assets.json'),voices=read('research/official-current/home-voice-assets.json');
const needed=new Set(read('exports/offline-assets-needed.json')),extras=new Set(read('data/release-additional-assets.json')),queue=new Set();
const role=id=>home.find(p=>p.id===(Number(id)===91?'staff':String(Number(id))));
let added=0,costumeVoices=0,castingVoices=0;
for(const key of models){
 const m=key.match(/^spine\/(idols|support_idols|characters)\/([^/]+)\/(\d+)\/data\.json$/),staff=/^spine\/sub_characters\/stand[^/]*\/staff(?:_|\/)/.test(key);
 const alias=/^spine\/sub_characters\/stand\/luca(?:_costume)?\/data\.json$/.test(key);const p=alias?role(26):m?role(m[1]==='characters'?m[3]:m[3].slice(3,6)):staff?role(91):null;if(!p)continue;
 let o=p.outfits.find(o=>o.path===key);
 if(!o){const id=m?.[3]||key.split('/').slice(3,-1).join('/'),card=cards.find(c=>c.id===id),category=m?.[2]||'stand';
  o={key:'official:'+key,id,label:'官方模型 · '+(card?.name||id)+' · '+category,path:key,source:'official-index'};p.outfits.push(o);added++;
 }
 for(const ext of ['json','atlas','png'])queue.add(key.replace(/json$/,ext));
}
for(const key of voices){const m=key.match(/^sounds\/voice\/characters\/(\d+)\/(.+)\.m4a$/);if(!m)continue;const p=role(m[1]);if(!p)continue;
 const costume=m[2].match(/^mypage_(\d{10})_([12])_(\d+)$/),casting=/^mypage_casting_voice_/.test(m[2]);
 if(!costume&&!casting)continue;
 const voice={id:m[2],label:casting?'扮演专属主页语音 · '+m[2].split('_').pop():'服装专属主页语音 · '+costume[3],path:key,homeVoice:!casting,manualOnly:casting,nativeHome:true,original:'',translation:'',animations:['wait1'],requiredTrust:0};
 if(casting){p.castingVoices??=[];if(!p.castingVoices.some(v=>v.id===voice.id)){p.castingVoices.push(voice);castingVoices++}queue.add(key)}
 else for(const o of p.outfits.filter(o=>o.id===costume[1]&&(o.path.includes('stand_costume')?'2':'1')===costume[2])){o.homeVoices??=[];if(!o.homeVoices.some(v=>v.id===voice.id)){o.homeVoices.push(voice);costumeVoices++}queue.add(key)}
}
write('public/home-assets/catalog.json',home);
const failures=[],files=[...queue];let next=0,done=0;
function checkpoint(){write('exports/complete-home-audit.json',{roles:home.length,models:home.reduce((n,p)=>n+p.outfits.length,0),added,costumeVoices,castingVoices,completed:done,total:files.length,failures});write('exports/offline-assets-needed.json',[...needed].sort());write('data/release-additional-assets.json',[...extras]);write('data/offline-assets.json',[...new Set([...needed,...read('data/catalog.json').map(c=>'json/'+c.key)])].sort())}
(async()=>{await Promise.all(Array.from({length:8},async()=>{while(next<files.length){const key=files[next++],file=path.join('cache',key);try{if(!fs.existsSync(file)||!fs.statSync(file).size){const {bytes}=await fetchAsset(key);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.index.part',bytes);fs.renameSync(file+'.index.part',file);extras.add(key)}needed.add(key)}catch(e){failures.push({key,error:e.message})}done++;if(done%100===0){checkpoint();console.log(done+'/'+files.length,'failures',failures.length)}}}));checkpoint();console.log(read('exports/complete-home-audit.json'));if(failures.length)process.exitCode=1})().catch(e=>{console.error(e);process.exitCode=1});
