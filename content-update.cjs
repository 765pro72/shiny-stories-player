// Merge public asset inventories into every content index. No media is downloaded.
const fs=require('node:fs'),path=require('node:path');
const {requestBytes}=require('./update-http.cjs');
const {rarity}=require('./public/card-taxonomy.js');
const read=(dir,file,fallback)=>{try{return JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'))}catch{return fallback}};
const write=(dir,file,value)=>fs.writeFileSync(path.join(dir,file),JSON.stringify(value));
const relevant=k=>/^(json|spine|sounds|movies|images)\/[\w/.@-]+$/.test(k)&&!k.split('/').includes('..');
const voiceOwner=(home,id)=>home.find(p=>p.id===(Number(id)===91?'staff':String(Number(id))));
async function pool(items,fn){let i=0;await Promise.all(Array.from({length:4},async()=>{while(i<items.length)await fn(items[i++])}))}
async function json(url){return JSON.parse(await requestBytes(url,{label:'卡片／语音公开资料',attempts:2,totalMs:90000}))}
function modelOwner(home,key){const m=key.match(/^spine\/(idols|support_idols|characters)\/(stand[^/]*)\/(\d+)\/data\.json$/);if(m)return voiceOwner(home,m[1]==='characters'?m[3]:m[3].slice(3,6));if(/^spine\/sub_characters\/stand[^/]*\/staff(?:_|\/)/.test(key))return voiceOwner(home,91);if(/^spine\/sub_characters\/stand\/luca(?:_costume)?\/data\.json$/.test(key))return voiceOwner(home,26)}
function normalizeVoice(v,id,names){return {id:v.voice||v.id,label:v.voiceName||'专属主页语音',path:`sounds/voice/characters/${String(id).padStart(3,'0')}/${v.voice||v.id}.m4a`,homeVoice:true,nativeHome:true,original:v.comment||'',translation:'',speaker:names[v.speakerName]||v.speakerName,animations:[v.animation1||'wait1',v.animation2||'blank',v.animation3||'',v.animation4||''],lip:v.lip,requiredTrust:0}}
function mergeVoice(rows,v){const old=rows.find(x=>x.path===v.path);if(!old){rows.push(v);return}const translation=old.original===v.original?old.translation:'';Object.assign(old,v);if(translation)old.translation=translation}
async function syncContent(dataDir,previous,check,progress=()=>{},options={}){
  const request=options.json||json,asset=options.fetchAsset||require('./asset-source.cjs').fetchAsset;
  const warnings=[],names=read(dataDir,'names.json',{}),rows=read(dataDir,'catalog.json',[]),byStory=new Map(rows.map(s=>[s.key,s]));
  let home=read(dataDir,'home-catalog.json',read(previous,'home-catalog.json',require('./public/home-assets/catalog.json')));
  const modelLabels=require('./model-labels.cjs'),labelEntries={...modelLabels.load(previous,path.join(__dirname,'data')),...modelLabels.load(dataDir,previous),...modelLabels.albums(path.join(dataDir,'../research/Album/album'))};
  write(dataDir,'model-labels.json',{version:1,entries:labelEntries});
  const conversations=read(dataDir,'home-conversations.json',read(previous,'home-conversations.json',require('./public/home-assets/conversations.json')));
  const inventory=read(dataDir,'update-resource-index.json',{stories:[],voices:[],resources:[]});
  const resources=new Set([...(inventory.resources||[]),...(inventory.stories||[]),...(inventory.voices||[]),...(check.newAssets||[]),...(check.newStories||[]),...(check.newVoices||[])] .filter(relevant));
  const required=new Set(read(dataDir,'offline-assets.json',[])),cards=read(dataDir,'card-media.json',[]),cardMap=new Map(cards.map(c=>[c.type+'/'+c.id,c]));
  const before={cards:cards.length,voices:read(dataDir,'voice-index.json',[]).length,models:home.reduce((n,p)=>n+p.outfits.length,0),conversations:conversations.length};
  const supplements=read(dataDir,'card-supplement.json',[]),suppMap=new Map(supplements.map(c=>[c.id,c]));
  progress('正在更新卡片、卡面和衣装资料…');
  let cardDone=0;await pool(home,async p=>{progress('正在核对 '+p.name+' 的卡片、卡面与衣装（'+(++cardDone)+' / '+home.length+'）…');const id=p.id==='staff'?91:Number(p.id);try{
    const data=await request('https://api.shinycolors.moe/info/idolInfo?idolId='+id);if(!Array.isArray(data.cardLists))throw Error('卡片列表格式异常');
    for(const c of data.cardLists){if(!/^\d{10}$/.test(c.enzaId)||!c.cardName)continue;const type=c.cardType?.startsWith('P_')?'idols':'support_idols';
      const info={id:c.enzaId,type,name:c.cardName,idol:p.name,cardType:c.cardType,rarity:c.cardType?.split('_').at(-1),cardUuid:c.cardUuid,collection:c.getMethod,releaseDate:c.releaseDate,hash:c.cardHash};
      const previousCard=suppMap.get(c.enzaId);suppMap.set(c.enzaId,info);let card=cardMap.get(type+'/'+c.enzaId);
      if(!card){card={...info,images:[{kind:'card',label:type==='idols'?'觉醒前':'卡面',path:`images/content/${type}/card/${c.enzaId}.jpg`}],movies:[],stories:[],animated:false};cards.push(card);cardMap.set(type+'/'+c.enzaId,card)}else{Object.assign(card,info);delete card.metadataPending}
      // Only request event metadata for new or changed cards.
      if(c.cardUuid&&(!previousCard||previousCard.lastModified!==c.lastModified)&&(!card.stories.length||previousCard?.lastModified))try{
        const detail=await request('https://api.shinycolors.moe/info/'+(type==='idols'?'p':'s')+'CardInfo?cardId='+c.cardUuid);
        if(String(detail.enzaId)!==c.enzaId)throw Error('卡片编号不匹配');
        for(const e of detail.cardIdolEvents||detail.cardSupportEvents||[]){const eventId=String(e.eventId||e.id||e.communicationId||'');if(!/^\d+$/.test(eventId))continue;const key='produce_events/'+eventId+'.json';
          if(!byStory.has(key)){const s={key,title:e.eventTitle||e.eventName||e.name||e.title||'标题待核实 · '+eventId,idol:p.name,category:'卡片剧情',group:card.name,translated:false,source:'public-card-metadata'};byStory.set(key,s);rows.push(s)}
          const s=byStory.get(key);if(s.metadataPending&&e.eventTitle){Object.assign(s,{title:e.eventTitle,idol:p.name,category:'卡片剧情',group:card.name,metadataPending:false})}if(!card.stories.some(x=>x.key===key))card.stories.push({...s});
        }
      }catch(e){warnings.push({source:'card-events',id:c.enzaId,error:e.message})}
      info.lastModified=c.lastModified;
    }
  }catch(e){warnings.push({source:'cards',id,error:e.message})}});
  // Asset paths, rather than guessed IDs, decide available images and movies.
  for(const key of resources){let m=key.match(/^images\/content\/(idols|support_idols)\/(card|fes_card)\/(\d+)\.jpg$/),video=false;
    if(!m){m=key.match(/^movies\/(idols)\/(card|card_costume)\/(\d+)\.mp4$/);video=true}if(!m)continue;
    const id=m[3],mapKey=m[1]+'/'+id;let card=cardMap.get(mapKey);if(!card){const p=voiceOwner(home,id.slice(3,6));if(!p)continue;card={id,type:m[1],name:'名称待核实 · '+id,idol:p.name,metadataPending:true,images:[],movies:[],stories:[],animated:false};cards.push(card);cardMap.set(mapKey,card)}
    const items=video?card.movies:card.images,kind=video?(m[2]==='card_costume'?'costume':'gasha'):m[2]==='fes_card'?'fes':'card';
    if(!items.some(x=>x.path===key))items.push({kind,label:video?(kind==='costume'?'觉醒后演出':'觉醒前演出'):kind==='fes'?'觉醒后':card.type==='idols'?'觉醒前':'卡面',path:key});card.animated=card.movies.length>0;
    if(!card.metadataPending)required.add(key);
  }
  // Known pre-existing cards stay present even if a public endpoint is temporarily stale.
  for(const card of cards){card.rarity=rarity(card);card.stories=card.stories.map(s=>({...s,...byStory.get(s.key)}));for(const a of [...card.images,...card.movies])if(!card.metadataPending)required.add(a.path)}
  for(const key of resources){if(!key.endsWith('/data.json'))continue;const p=modelOwner(home,key);if(!p)continue;if(!p.outfits.some(o=>o.path===key)){const id=key.split('/').at(-2),c=cards.find(c=>c.id===id);p.outfits.push({key:'official:'+key,id,label:'官方模型 · '+(c?.name||id),path:key,source:'official-index'})}for(const ext of ['json','atlas','png'])required.add(key.replace(/json$/,ext))}
  home=modelLabels.decorate(home,cards,labelEntries);
  progress('正在更新语音、电话及服装专属主页资料…');
  let voiceDone=0;const voiceTotal=home.filter(p=>/^\d+$/.test(p.id)&&Number(p.id)<=28).length;await pool(home,async p=>{if(!/^\d+$/.test(p.id)||Number(p.id)>28)return;progress('正在核对 '+p.name+' 的主页、服装与电话语音（'+(++voiceDone)+' / '+voiceTotal+'）…');try{const data=await request('https://api.shinycolors.moe/spine/spinepreset?idolId='+p.id);if(!Array.isArray(data))throw Error('语音预设格式异常');for(const v of data){if(!v.voice)continue;const m=v.voice.match(/^mypage_(\d{10})_([12])_/);if(m){for(const o of p.outfits.filter(o=>o.id===m[1]&&(o.path.includes('stand_costume')?'2':'1')===m[2])){o.homeVoices??=[];mergeVoice(o.homeVoices,normalizeVoice(v,p.id,names))}}else if(/^mypage_/.test(v.voice))mergeVoice(p.voices,normalizeVoice(v,p.id,names))}}catch(e){warnings.push({source:'voice-presets',id:p.id,error:e.message})}});
  // Refresh public native child-home scripts whenever the official map changes.
  const nativeKeys=[...resources].filter(k=>/^sounds\/json\/prelude_mypage_voices\/\d+\/mypage_(comments|conversations)\.json$/.test(k));
  const unresolvedNative=new Set();const matchedNativeKeys=nativeKeys.filter(key=>{const id=String(Number(key.split('/')[3])),p=voiceOwner(home,id);const known=p&&(p.outfits.some(o=>o.preludeCardId)||cards.filter(c=>c.idol===p.name&&c.collection==='PreludeCollection').length===1);if(p&&!known)unresolvedNative.add(id);return known});
  await pool(matchedNativeKeys,async key=>{try{const {bytes}=await asset(key),data=JSON.parse(bytes),id=String(Number(key.split('/')[3])),p=voiceOwner(home,id);if(!p||!Array.isArray(data))return;
    if(key.endsWith('/mypage_comments.json')){const modelId=data[0]?.idolId,existing=p.outfits.find(o=>o.id===String(modelId)),candidate=cards.filter(c=>c.idol===p.name&&c.collection==='PreludeCollection'),ownerId=existing?.preludeCardId||p.outfits.find(o=>o.preludeCardId)?.preludeCardId||(candidate.length===1?candidate[0].id:null);
      if(!modelId)return;let outfit=existing;if(!outfit){outfit={key:'official-home:'+modelId,id:String(modelId),label:'童年主页 · '+p.name,path:`spine/idols/stand/${modelId}/data.json`,source:'official-home',...(ownerId?{preludeCardId:ownerId}:{})};p.outfits.push(outfit)}if(ownerId)outfit.preludeCardId=ownerId;outfit.homeVoices??=[];for(const v of data)mergeVoice(outfit.homeVoices,normalizeVoice(v,id,names));
    }else for(const c of data){const existing=conversations.find(x=>String(x.id)===String(c.id)),candidate=cards.filter(c=>c.idol===p.name&&c.collection==='PreludeCollection'),ownerCardId=existing?.ownerCardId||p.outfits.find(o=>o.preludeCardId)?.preludeCardId||(candidate.length===1?candidate[0].id:null);if(!ownerCardId){warnings.push({source:'home-conversation',id:c.id,error:'缺少童年卡与模型的明确关联'});continue}const item={id:c.id,title:c.title,ownerCardId,ownerCharacterId:id,characterId:String(c.characterId),partnerCharacterId:String(c.partnerCharacterId),sequence:(c.mypageConversationComments||[]).map(v=>({...normalizeVoice(v,v.characterId,names),characterId:String(v.characterId)}))};if(existing)Object.assign(existing,item);else conversations.push(item)}
  }catch(e){warnings.push({source:'native-home',key,error:e.message})}});
  const known=new Map();for(const p of home)for(const v of [...p.voices,...(p.castingVoices||[]),...p.outfits.flatMap(o=>o.homeVoices||[])])known.set(v.path,v);for(const c of conversations)for(const v of c.sequence)known.set(v.path,v);
  const voices=read(dataDir,'voice-index.json',[]),voiceMap=new Map(voices.map(v=>[v.key,v]));for(const key of new Set([...resources,...known.keys()])){
    const card=key.match(/^sounds\/voice\/(idols|support_idols|whisper)\/(\d{10})\/([^/]+)\.m4a$/),m=key.match(/^sounds\/voice\/characters\/(\d+)\/([^/]+)\.m4a$/)||(card?[null,card[2].slice(3,6),card[3]]:null);if(!m)continue;const p=voiceOwner(home,m[1]);if(!p)continue;
    const preset=known.get(key),call=m[2].match(/^producers_cup_(\d+(?:_\d+)?)th_voice_\d+_(\d+)$/),casting=/^mypage_casting_voice_/.test(m[2]),costume=m[2].match(/^mypage_(\d{10})_([12])_(\d+)$/);
    const kind=card?.[1]==='whisper'?'耳语':card?(m[2]==='letter'?'信件语音':'卡片语音'):call?'电话':casting?'扮演主页':/^mypage_talking_|^mypage_support_idol_talking_/.test(m[2])?'组合对话':/^mypage_/.test(m[2])?'主页语音':'其他语音';
    if(!voiceMap.has(key)){const v={key,idol:p.name,characterId:m[1],kind,title:call?call[1].replace('_','.')+'周年 P杯 · 电话 '+Number(call[2]):preset?.label||m[2],original:preset?.original||'',translation:preset?.translation||'',speaker:p.name,...(kind==='耳语'?{availability:'metadata-pending'}:{})};voices.push(v);voiceMap.set(key,v)}else if(preset?.original){const v=voiceMap.get(key);if(!v.original||v.original===preset.original){v.original=preset.original;v.translation||=preset.translation||''}}
    if(casting){p.castingVoices??=[];if(!p.castingVoices.some(v=>v.path===key))p.castingVoices.push({id:m[2],label:'扮演专属主页语音 · '+m[2].split('_').at(-1),path:key,homeVoice:false,manualOnly:true,nativeHome:true,original:'',translation:'',animations:['wait1'],requiredTrust:0})}
    if(costume)for(const o of p.outfits.filter(o=>o.id===costume[1]&&(o.path.includes('stand_costume')?'2':'1')===costume[2])){o.homeVoices??=[];if(!o.homeVoices.some(v=>v.path===key))o.homeVoices.push({id:m[2],label:'服装专属主页语音 · '+costume[3],path:key,homeVoice:true,nativeHome:true,original:'',translation:'',animations:['wait1'],requiredTrust:0})}
    if(kind!=='耳语')required.add(key);
  }
  for(const s of rows)required.add('json/'+s.key);for(const p of home)for(const o of p.outfits)for(const ext of ['json','atlas','png'])required.add(o.path.replace(/json$/,ext));
  const memorial=read(dataDir,'memorial-index.json',[]);if(Array.isArray(memorial))for(const key of resources){if(!/^images\/content\/(?:memorial|memories|presents|seasonal_present)/.test(key))continue;if(!memorial.some(m=>m.key===key)){memorial.push({key,id:path.posix.basename(key).split('.')[0],type:key.includes('/letters/')?'letter':'icon',available:false,metadataPending:true})}}
  const art=read(dataDir,'card-art.json',{});for(const c of cards)for(const s of c.stories)art[s.key]={id:c.id,type:c.type,name:c.name};write(dataDir,'card-art.json',art);write(dataDir,'catalog.json',rows);write(dataDir,'card-media.json',cards);write(dataDir,'card-supplement.json',[...suppMap.values()]);write(dataDir,'voice-index.json',voices);write(dataDir,'home-catalog.json',home);write(dataDir,'home-conversations.json',conversations);write(dataDir,'memorial-index.json',memorial);write(dataDir,'offline-assets.json',[...required].sort());
  write(dataDir,'update-resource-index.json',{stories:[...new Set(rows.map(s=>'json/'+s.key))],voices:voices.map(v=>v.key),resources:[...resources].sort()});
  const creativeMaterials=require('./story-material-index.cjs').sync(dataDir,path.join(__dirname,'data'),[path.join(__dirname,'cache')]);
  const result={creativeMaterials,pendingNativeHomeCharacters:[...unresolvedNative],newCards:cards.length-before.cards,newVoices:voices.length-before.voices,newModels:home.reduce((n,p)=>n+p.outfits.length,0)-before.models,newConversations:conversations.length-before.conversations,updatedIndexes:['剧情与汉化','卡片与卡面','动态卡面','衣装与模型','语音与电话','原生主页对话','信件与纪念品索引','怪文书完整素材与剧情引用分类'],warnings};write(dataDir,'content-update-report.json',result);return result;
}
module.exports={syncContent,relevant,modelOwner};
