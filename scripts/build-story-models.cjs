const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const home=read('public/home-assets/catalog.json').filter(p=>p.id==='staff'||Number(p.id)>=1&&Number(p.id)<=28||Number(p.id)>=801&&Number(p.id)<=804),cards=read('data/card-media.json'),names=read('data/names.json');
for(const p of home){p.outfits=p.outfits.filter(o=>o.source!=='story-model');if(p.id==='staff'){p.voices=[];p.voiceNote='此模型随机使用其他偶像的主页语音'}}
const modelMap=new Map(),roles=new Map(home.map(p=>[p.id,p]));for(const p of home)for(const o of p.outfits)modelMap.set(o.path,{p,o});
const generic={staff:'七草叶月',staff_swimsuit:'七草叶月',ceo:'社长',boy:'少年',girl:'少女',girl2:'少女（另一模型）',man:'男性',woman:'女性',oldman:'老人',security:'保安',suitman:'西装男性'};
let modelCount=0,voiceCount=0;
for(const story of read('data/catalog.json')){
 const source=path.join(root,'cache/json',story.key);if(!fs.existsSync(source))continue;const tracks=JSON.parse(fs.readFileSync(source,'utf8')),labels=new Map();
 for(const t of tracks){let record;
  if(t.charId&&t.charType){const category=({stand_costume_fix:'stand_costume',stand_costume_flex:'stand_costume',stand_fix:'stand',stand_flex:'stand',stand_costume:'stand_costume',stand_jersey:'stand_jersey',stand_silhouette:'stand_silhouette'})[t.charCategory]||'stand',modelPath=`spine/${t.charType}/${category}/${t.charId}/data.json`;
   record=modelMap.get(modelPath);
   if(!record&&fs.existsSync(path.join(root,'cache',modelPath))){let id;if(t.charType==='characters'&&/^\d+$/.test(t.charId))id=String(Number(t.charId));else if(['idols','support_idols'].includes(t.charType))id=String(Number(String(t.charId).slice(3,6)));else if(String(t.charId).startsWith('staff'))id='staff';else if(['luca','luca_costume'].includes(String(t.charId)))id='26';else id='story-role:'+t.charType+':'+t.charId;
    if(id==='91')id='staff';if(!(id==='staff'||Number(id)>=1&&Number(id)<=28||Number(id)>=801&&Number(id)<=804))continue;let p=roles.get(id);if(!p){p={id,name:generic[t.charId]||names[t.speaker]||t.charLabel||String(t.charId),kind:'staff',generatedStoryRole:true,outfits:[],voices:[]};home.push(p);roles.set(id,p)}
    const card=cards.find(c=>c.id===t.charId),child=card?.collection==='PreludeCollection';const o={key:'story:'+t.charType+':'+category+':'+t.charId,id:t.charId,label:(t.charId==='2040910100'?'猫耳服装 · ':child?'童年模型 · ':'剧情模型 · ')+(card?.name||generic[t.charId]||t.charLabel||t.charId)+(category!=='stand'?' · '+category:''),path:modelPath,source:'story-model',sourceStory:story.key,voices:[]};p.outfits.push(o);record={p,o};modelMap.set(modelPath,record);modelCount++;
   }
   if(record&&t.charLabel)labels.set(t.charLabel,record);
  }else if(t.charLabel)record=labels.get(t.charLabel);

 }
}
for(const p of home)if(p.generatedStoryRole)p.voiceNote='此模型随机使用其他偶像的主页语音';
fs.writeFileSync(path.join(root,'public/home-assets/catalog.json'),JSON.stringify(home));
fs.writeFileSync(path.join(root,'exports/story-model-index-report.json'),JSON.stringify({roles:home.length,storyModels:modelCount,storyVoices:voiceCount,totalOutfits:home.reduce((n,p)=>n+p.outfits.length,0)},null,2));console.log({roles:home.length,storyModels:modelCount,storyVoices:voiceCount});
