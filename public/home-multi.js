(()=>{
 const stage=window.homeStage,$=s=>document.querySelector(s);
 if(!stage)return;
 const app=stage.app,prefs=stage.prefs,models=[],tokens=[],preloaded=new Map();
 let entries=[],editing=0,extraVoiceSerial=0,extraAudio=null,lastExtra=null,lastBlank=-1,conversationSerial=0,conversationPlaying=false,conversations=[],conversationWaitCancel=null,autoConversationTimer=null,conversationSignature='',lastConversationId='',conversationLastActivity=Date.now();fetch('/home-assets/conversations.json').then(r=>r.ok?r.json():[]).then(c=>{conversations=c;updateConversationAvailability()}).catch(()=>{});
 function audioFor(path){let a=preloaded.get(path);if(a){preloaded.delete(path);preloaded.set(path,a);return a}a=new Audio('/asset/'+path);a.preload='auto';preloaded.set(path,a);a.load();while(preloaded.size>32){const candidate=[...preloaded].find(([,v])=>v!==extraAudio&&v!==stage.getAudio?.()&&v.paused!==false);if(!candidate)break;preloaded.delete(candidate[0]);candidate[1].src=''}return a}stage.audioFor=audioFor;
 const cat=()=>stage.getCatalog(),idol=i=>cat().find(x=>x.id===entries[i]?.idol)||cat()[0];
 const voiceList=i=>{const p=idol(i),o=p?.outfits.find(o=>o.key===entries[i]?.outfit);return [...(o?.homeVoices?.length?o.homeVoices:p?.voices||[]),...(p?.castingVoices||[])]};
 function save(){prefs.count=entries.length;prefs.distance=prefs.distance||HomeLayout.distanceForCount(entries.length);prefs.members=entries.map(e=>({idol:e.idol,outfit:e.outfit}));stage.save()}
 function prewarm(i){const p=idol(i),outfit=p?.outfits.find(o=>o.key===entries[i]?.outfit),trust=Number(prefs.trustById?.[p?.id]||0);if(!p)return;const items=[...HomeInteraction.voices(p,outfit,trust,null).slice(0,1),...['head','breast'].flatMap(r=>HomeInteraction.voices(p,outfit,trust,r).slice(0,1))];setTimeout(()=>{for(const v of items){if(preloaded.has(v.path))continue;audioFor(v.path)}},2200)}
 const layoutBounds=new WeakMap(),placed=new WeakSet(),motions=new Map();
 app.ticker.add(()=>{const now=performance.now();for(const [model,motion] of motions){if(!model.transform){motions.delete(model);continue}const t=Math.min(1,(now-motion.at)/320),p=1-Math.pow(1-t,3);model.position.set(motion.x+(motion.to.x-motion.x)*p,motion.y+(motion.to.y-motion.y)*p);model.scale.set(motion.scale+(motion.to.scale-motion.scale)*p);if(t===1)motions.delete(model)}});
 function layout(){
  delete $('#idol').dataset.sceneReady;
  const host=$('#idol').getBoundingClientRect(),rect=(host.width>0&&host.height>0?host:$('.screen').getBoundingClientRect()),ratio=1136/640,shown={width:Math.min(rect.width,rect.height*ratio),height:Math.min(rect.height,rect.width/ratio)},viewport=shown,count=Math.max(1,entries.length),report=[];
  const locked=HomeLayout.distances[prefs.distance]&&!(count>1&&prefs.distance==='short')?prefs.distance:null,distance=locked||'middle';prefs.distance=distance;
  const visible=[];
  entries.forEach((entry,i)=>{const m=i?models[i]:stage.getModel();if(!m)return;
   let bounds=layoutBounds.get(m);if(!bounds){const b=m.getLocalBounds();if(!b.width||!b.height)return;bounds={x:b.x,y:b.y,width:b.width,height:b.height};layoutBounds.set(m,bounds)}
   visible.push({entry,i,m,bounds});
  });
  const anchor=visible.find(item=>item.i===0)||visible[0],baseScale=HomeLayout.sharedScale(anchor?[anchor.bounds]:[],viewport,distance);
  const gap=count>1?Math.max(4,Math.round(16-count*2)):0;
  const laid=HomeLayout.layoutGroup(visible.map(item=>({slot:item.i,bounds:item.bounds})),viewport,distance);
  visible.forEach(({entry,i,m,bounds},slotIndex)=>{
   const to=laid[slotIndex]||HomeLayout.place(bounds,i,count,viewport,distance);
   if(placed.has(m))motions.set(m,{at:performance.now(),x:m.x,y:m.y,scale:m.scale.x,to});else{m.position.set(to.x,to.y);m.scale.set(to.scale);placed.add(m)}
   m.zIndex=i;report.push({slot:i,...to,bounds});
  });$('#homeDistance').value=distance;updateConversationAvailability();app.stage.sortableChildren=true;$('#idol').dataset.layout=JSON.stringify(report);prewarm(0);
  if(report.length===count&&stage.getSelected()?.id===entries[0]?.idol&&stage.getOutfit()?.key===entries[0]?.outfit){$('#idol').dataset.sceneReady='true';window.dispatchEvent(new CustomEvent('home-scene-ready'));}
 }
 new ResizeObserver(layout).observe($('.screen'));

 function speakBlank(){
  if(stage.prefs?.silent||localStorage.getItem('shiny.homeSilent')==='1')return;
  if(conversationPlaying||extraAudio?.paused===false||stage.getAudio?.()?.paused===false)return;
  if(startConversation())return;
  const hasZh=v=>Boolean(v&&v.translation&&v.translation.trim());
  const hasText=v=>Boolean(v&&((v.translation&&v.translation.trim())||(v.original&&v.original.trim())));
  const preferZh=prefs.language!=='jp';
  let candidates=entries.map((_,i)=>i).filter(i=>(i?models[i]:stage.getModel())&&voiceList(i).some(v=>(preferZh?hasZh(v):hasText(v))&&(v.homeVoice||/^mypage_\d+_\d+$/.test(v.id))));
  if(!candidates.length)candidates=entries.map((_,i)=>i).filter(i=>(i?models[i]:stage.getModel())&&voiceList(i).some(v=>hasText(v)&&(v.homeVoice||/^mypage_\d+_\d+$/.test(v.id))));
  if(candidates.length>1)candidates=candidates.filter(i=>i!==lastBlank);
  if(!candidates.length)return;
  const i=candidates[Math.floor(Math.random()*candidates.length)];lastBlank=i;edit(i);stopExtra();
  if(i===0)return stage.speak();
  const zhVoices=preferZh?voiceList(i).filter(v=>hasZh(v)&&(v.homeVoice||/^mypage_\d+_\d+$/.test(v.id))):[];
  const voices=zhVoices.length?zhVoices:voiceList(i).filter(v=>hasText(v)&&(v.homeVoice||/^mypage_\d+_\d+$/.test(v.id))),v=voices[Math.floor(Math.random()*voices.length)];
  return speakExtra(i,null,v.id);
 }
 const speakPrimary=stage.speak;stage.speak=(...args)=>{stopExtra();lastExtra=null;return speakPrimary(...args)};
 function randomizeSlot(slotIdx){
  const catalog=cat();
  if(!catalog||!catalog.length)return;
  const currentSlot=typeof slotIdx==='number'?slotIdx:editing;
  const otherIdols=new Set(entries.filter((_,idx)=>idx!==currentSlot).map(e=>e.idol));
  let pool=catalog.filter(p=>!otherIdols.has(p.id));
  if(!pool.length)pool=catalog;
  const p=pool[Math.floor(Math.random()*pool.length)];
  const outfit=p.outfits[Math.floor(Math.random()*p.outfits.length)];
  stopExtra();
  entries[currentSlot]={idol:p.id,outfit:outfit.key};
  if(currentSlot===0){
   stage.chooseIdol(p.id);
   stage.setOutfit(outfit.key);
   layout();
  }else{
   load(currentSlot);
  }
  edit(currentSlot);
  save();
  window.previewOutfit?.();
 }
 function randomizeAll(targetCount){
  const catalog=cat();
  if(!catalog||!catalog.length)return;
  const count=Math.min(5,Math.max(1,typeof targetCount==='number'?targetCount:(entries.length||5)));
  if(entries.length!==count)resize(count);
  const shuffled=[...catalog].sort(()=>Math.random()-.5);
  stopExtra();
  for(let i=0;i<count;i++){
   const p=shuffled[i%shuffled.length];
   const outfit=p.outfits[Math.floor(Math.random()*p.outfits.length)];
   entries[i]={idol:p.id,outfit:outfit.key};
   if(i===0){
    stage.chooseIdol(p.id);
    stage.setOutfit(outfit.key);
   }else{
    load(i);
   }
  }
  layout();
  edit(editing);
  save();
  window.previewOutfit?.();
 }
 $('#btnRandomCurrent')?.addEventListener('click',()=>randomizeSlot(editing));
 $('#btnRandomAll')?.addEventListener('click',()=>randomizeAll(entries.length||5));
 window.homeMulti={layout,speakBlank,getEditingSlot:()=>editing,startConversation,getMatchedConversations:conversationChoices,isConversationPlaying:()=>conversationPlaying,randomizeSlot,randomizeAll,inspect:()=>entries.map((entry,i)=>({slot:i,id:entry.idol,outfit:entry.outfit,mouth:window.HomeVoicePolicy?.inspect(i?models[i]:stage.getModel())}))};
 function idle(m){if(!m)return;HomeVoicePolicy.stopMouth(m);const names=m.spineData.animations.map(a=>a.name),name=names.includes('wait1')?'wait1':names.find(x=>x.startsWith('wait'));if(name)HomeVoicePolicy.animate(m,name,0,true);if(names.includes('blank'))HomeVoicePolicy.animate(m,'blank',1,true);else{const face=m.state.getCurrent(1);if(face&&face.animation.name!=='<empty>')m.state.setEmptyAnimation(1,.3)}for(let j=2;j<m.state.tracks.length;j++){const current=m.state.getCurrent(j);if(current&&current.animation.name!=='<empty>')m.state.setEmptyAnimation(j,.3)}}
 // Official multi-idol idle animation cycling for extra slots (11–19s staggered)
 setInterval(()=>{
  if(document.hidden||conversationPlaying||(extraAudio&&!extraAudio.paused))return;
  for(let idx=1;idx<models.length;idx++){
   const m=models[idx];if(!m||Math.random()>0.55)continue;
   try{
    const waits=m.spineData.animations.map(a=>a.name).filter(n=>/^wait\d*$/i.test(n)||/^wait_/i.test(n));
    const base=waits.includes('wait1')?'wait1':waits[0];
    const alts=waits.filter(n=>n!==base);
    if(alts.length){const pick=alts[Math.floor(Math.random()*alts.length)];m.stateData.defaultMix=0.35;m.state.setAnimation(0,pick,false);if(base)m.state.addAnimation(0,base,true,0);}
   }catch{}
  }
 },13500);
 function stopExtra(preserveConversation=false){extraVoiceSerial++;if(!preserveConversation){conversationSerial++;conversationPlaying=false;conversationWaitCancel?.();conversationWaitCancel=null}if(extraAudio){extraAudio.pause();extraAudio.currentTime=0;extraAudio=null;if(lastExtra)idle(lastExtra.i?models[lastExtra.i]:stage.getModel());window.dispatchEvent(new CustomEvent('home-voice',{detail:false}))}}
 async function load(i){if(!i)return;const e=entries[i],p=idol(i),outfit=p?.outfits.find(x=>x.key===e.outfit);if(!outfit)return;const token=tokens[i]=(tokens[i]||0)+1;$('#outfitStatus').textContent='正在加载位置 '+(i+1)+'…';try{const spineData=await(window.getSpineData?window.getSpineData('/asset-original/'+outfit.path):new Promise((resolve,reject)=>{const loader=new PIXI.Loader();let done=false;loader.onError.add(err=>{if(!done){done=true;reject(err)}});loader.add('idol','/asset-original/'+outfit.path).load((_,x)=>{if(!done){done=true;x.idol?.spineData?resolve(x.idol.spineData):reject(Error('立绘数据不可用'))}})}) );if(token!==tokens[i]||entries[i]!==e)return;const m=new PIXI.spine.Spine(spineData);try{m.skeleton.setSkinByName('normal')}catch{if(m.spineData.skins.some(x=>x.name==='default'))m.skeleton.setSkinByName('default')}m.skeleton.setToSetupPose();m.stateData.defaultMix=.3;window.installHomeIdleLoop(m);if(models[i]){app.stage.removeChild(models[i]);models[i].destroy({children:true,texture:false,baseTexture:false})}models[i]=m;app.stage.addChild(m);idle(m);try{m.update(0.016);m.skeleton.updateWorldTransform();m.updateTransform()}catch{}layout();prewarm(i);if(i===editing)$('#outfitStatus').textContent='已加载位置 '+(i+1)+'：'+p.name;
 }catch{if(token===tokens[i]&&i===editing)$('#outfitStatus').textContent='该立绘暂时无法加载，请换一件服装重试。'}}
 function options(el,items){el.replaceChildren(...items.map(x=>new Option(x.label,x.value)))}
 function updateTrustHint(i){const p=idol(i);if(!p||p.kind==='staff')return;const trust=Number(prefs.trustById?.[p.id]||0),outfit=p.outfits.find(o=>o.key===entries[i]?.outfit),counts=['head','breast','belly'].map(r=>HomeInteraction.voices(p,outfit,trust,r).length);$('#touchHint').textContent='当前信赖度 Lv.'+trust+' · 可用互动语音：头部 '+counts[0]+' / 上身 '+counts[1]+' / 腹部 '+counts[2]+'。点击范围使用模型自带区域。'}
 function edit(i){editing=i;const e=entries[i],p=idol(i);if(!e||!p)return;options($('#homeSlot'),entries.map((x,j)=>({label:`位置 ${j+1} · ${idol(j).name}`,value:String(j)})));$('#homeSlot').value=String(i);$('#homeCount').value=String(entries.length);$('#homeDistance').value=prefs.distance||HomeLayout.distanceForCount(entries.length);$('#idolSelect').value=p.id;options($('#outfitSelect'),p.outfits.map(x=>({label:x.label,value:x.key})));$('#outfitSelect').value=e.outfit;options($('#voiceSelect'),voiceList(i).map(v=>({label:v.label||v.id,value:v.id})));$('#homeSpeaker').textContent=p.name;$('#touchHint').textContent=p.voiceNote?p.voiceNote:p.kind==='staff'?'叶月使用自己的主页语音；剧情模型使用兼容的通用动作。暂无独立触摸与信赖度条件。':'点击头部、上身或腹部会播放对应语音。信赖度按资料中的解锁等级筛选，仅用于本地看板，不关联游戏账号。';$('#trustLevel').disabled=p.kind==='staff';$('#trustLevel').value=prefs.trustById?.[p.id]||0;$('#trustValue').textContent=$('#trustLevel').value;updateTrustHint(i)}
 function resize(n,distance=HomeLayout.distanceForCount(n)){stopExtra();distance=HomeLayout.distances[distance]?distance:HomeLayout.distanceForCount(n);n=Math.max(1,Math.min(5,Number(n)||1));prefs.distance=distance;while(entries.length>n){const i=entries.length-1;tokens[i]=(tokens[i]||0)+1;if(models[i]){app.stage.removeChild(models[i]);models[i].destroy({children:true,texture:false,baseTexture:false});models[i]=null}entries.pop()}while(entries.length<n){const i=entries.length,p=cat()[(cat().findIndex(x=>x.id===entries[0].idol)+i)%cat().length];entries.push({idol:p.id,outfit:p.outfits[0].key});load(i)}editing=Math.min(editing,n-1);layout();edit(editing);save()}
 async function speakExtra(i,region,selectedVoice,forcedVoice=null,conversation=false){if(stage.prefs?.silent||localStorage.getItem('shiny.homeSilent')==='1')return;const e=entries[i],p=idol(i),m=i?models[i]:stage.getModel();if(!e||!p||!m)return;stage.stop();stopExtra(conversation);const trust=Number(prefs.trustById?.[p.id]||0);const available=forcedVoice?[forcedVoice]:selectedVoice?voiceList(i).filter(v=>v.id===selectedVoice):HomeInteraction.voices(p,p.outfits.find(o=>o.key===e.outfit),trust,region);const v=available[Math.floor(Math.random()*available.length)];if(!v)return;const playSerial=++extraVoiceSerial;lastExtra={i,v};window.currentSubtitleVoice=v;const clean=t=>(t||'').replace(/\\n/g,'\n');const original=clean(v.original),override=(()=>{try{const map=JSON.parse(localStorage.getItem('overrides')||'{}')['home:voices']||{};return map[v.id]||map[v.original]||map[original]||map[v.path]||''}catch(e){return''}})(),translation=override?clean(override):clean(v.translation);$('#homeSpeaker').textContent=v.speaker||p.name;$('#greeting').textContent=prefs.language==='jp'?original||'这条语音的原文暂未收录。':prefs.language==='both'&&translation?translation+'\n'+original:translation||original||'这条语音的台词暂未收录。';const editBtn=$('#editSubtitle');if(editBtn)editBtn.disabled=false;
 const performance=HomeVoicePolicy.plan(m.spineData.animations.map(x=>x.name),v,{generic:p.outfits.find(o=>o.key===e.outfit)?.source==='story-model'||v.genericHome||(conversation&&!v.nativeHome)});idle(m);for(const [j,name]of performance.animations.entries())if(name)HomeVoicePolicy.animate(m,name,j,j===0&&!performance.returnToIdle);if(performance.returnToIdle&&performance.idle&&m.state.getCurrent(0)?.animation.name!==performance.idle)m.state.addAnimation(0,performance.idle,true,0);window.dispatchEvent(new CustomEvent('home-voice',{detail:true}));
 const a=audioFor(v.path);extraAudio=a;a.currentTime=0;a.volume=prefs.volume/100;$('#replayVoice').disabled=false;$('#voiceStatus').textContent='原声准备中…';a.onended=()=>{if(extraAudio===a&&playSerial===extraVoiceSerial){idle(m);window.dispatchEvent(new CustomEvent('home-voice',{detail:false}));$('#voiceStatus').textContent='播放结束'}};a.onerror=()=>{if(extraAudio===a&&playSerial===extraVoiceSerial){idle(m);window.dispatchEvent(new CustomEvent('home-voice',{detail:false}));$('#voiceStatus').textContent='语音暂时不可用'}};try{await a.play();if(extraAudio!==a||playSerial!==extraVoiceSerial)return;const speakingMouth=HomeVoicePolicy.bindMouth(m,performance.lip,a);$('#voiceStatus').textContent='原声播放中'+(speakingMouth?(HomeVoicePolicy.mouthMode(m)==='compatible'?' · 使用原素材兼容嘴型':''):' · 当前模型未提供说话嘴型，可换用日常或剧情模型')}catch{if(playSerial!==extraVoiceSerial)return;idle(m);extraAudio=null;window.dispatchEvent(new CustomEvent('home-voice',{detail:false}));$('#voiceStatus').textContent='语音未能播放，请重试'}}

 function conversationMembers(){return entries.map((e,slot)=>{const o=idol(slot)?.outfits.find(o=>o.key===e.outfit),ready=slot?models[slot]:stage.getSelected()?.id===e.idol&&stage.getOutfit()?.key===e.outfit&&stage.getModel();return ready?{slot,characterId:e.idol,cardId:o?.preludeCardId||o?.id,isPrelude:Boolean(o?.preludeCardId)}:null}).filter(Boolean)}
 function conversationChoices(){return window.matchHomeConversations?.(conversations,conversationMembers())||[]}
 const conversationSettings=document.createElement('section');conversationSettings.className='conversation-settings';const autoConversationLabel=document.createElement('label');autoConversationLabel.className='check';const autoConversationInput=document.createElement('input');autoConversationInput.id='autoConversations';autoConversationInput.type='checkbox';autoConversationInput.checked=prefs.autoConversations!==false;autoConversationLabel.append(autoConversationInput,'同屏角色自动聊天');const conversationHint=document.createElement('p');conversationHint.id='conversationHint';conversationHint.className='hint';const conversationButton=document.createElement('button');conversationButton.id='playConversation';conversationButton.textContent='听她们聊天';conversationSettings.append(autoConversationLabel,conversationHint,conversationButton);$('#touchHint').after(conversationSettings);
 autoConversationInput.onchange=()=>{prefs.autoConversations=autoConversationInput.checked;stage.save();if(!autoConversationInput.checked){clearTimeout(autoConversationTimer);stopExtra()}else scheduleConversation(8000);updateConversationAvailability()};conversationButton.onclick=()=>startConversation();
 let shellActive=true;
 window.addEventListener('message',e=>{if(e.origin!==location.origin||e.data?.type!=='shiny-shell-visibility')return;shellActive=!!e.data.active;if(!shellActive){clearTimeout(autoConversationTimer);stopExtra()}else scheduleConversation(6000);});
 function scheduleConversation(delay){clearTimeout(autoConversationTimer);if(!shellActive||stage.prefs?.silent||localStorage.getItem('shiny.homeSilent')==='1'||prefs.autoConversations===false||!conversationChoices().length)return;const waitMs=typeof delay==='number'?delay:(18000+Math.floor(Math.random()*8000));autoConversationTimer=setTimeout(()=>{autoConversationTimer=null;if(!shellActive||document.hidden||document.querySelector('dialog[open]')||conversationPlaying||Date.now()-conversationLastActivity<6000||stage.getAudio?.()?.paused===false||extraAudio?.paused===false){scheduleConversation(6000);return}if(!startConversation())scheduleConversation()},waitMs)}
 function updateConversationAvailability(){const choices=conversationChoices(),signature=JSON.stringify(conversationMembers()),changed=signature!==conversationSignature;conversationSignature=signature;conversationButton.disabled=!choices.length;conversationHint.textContent=choices.length?'当前搭配可播放 '+choices.length+' 组原声对话；停留片刻会轮流聊天，也可立即试听。':'当前搭配尚无可用的已核实对话；选择其他角色，童年对话还需要对应服装。';if(changed||(!autoConversationTimer&&!conversationPlaying))scheduleConversation(6000)}
 document.addEventListener('pointerdown',()=>{conversationLastActivity=Date.now()},{capture:true});document.addEventListener('keydown',()=>{conversationLastActivity=Date.now()},{capture:true});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(autoConversationTimer);stopExtra()}else scheduleConversation(6000)});
 window.addEventListener('home-scene-ready',updateConversationAvailability);
 function startConversation(){
  if(stage.prefs?.silent||localStorage.getItem('shiny.homeSilent')==='1')return false;
  if(conversationPlaying)return true;let choices=conversationChoices();if(!choices.length)return false;
  if(choices.length>1)choices=choices.filter(c=>c.id!==lastConversationId);stopExtra();stage.stop();clearTimeout(autoConversationTimer);const serial=++conversationSerial;conversationPlaying=true;const choice=choices[Math.floor(Math.random()*choices.length)];lastConversationId=choice.id;for(const line of choice.lines)audioFor(line.path);window.dispatchEvent(new CustomEvent('home-conversation-start',{detail:{id:choice.id,title:choice.title}}));
  (async()=>{try{for(let li=0;li<choice.lines.length;li++){const line=choice.lines[li];if(serial!==conversationSerial)return;if(li>0)await new Promise(r=>setTimeout(r,520));if(serial!==conversationSerial)return;edit(line.slot);await speakExtra(line.slot,null,null,line,true);const a=extraAudio;if(!a||serial!==conversationSerial)return;window.dispatchEvent(new CustomEvent('home-conversation-line',{detail:{id:choice.id,slot:line.slot,characterId:line.characterId,path:line.path}}));await new Promise(resolve=>{const timer=setTimeout(done,60000);function done(){clearTimeout(timer);a.removeEventListener('ended',done);a.removeEventListener('error',done);if(conversationWaitCancel===done)conversationWaitCancel=null;resolve()}conversationWaitCancel=done;a.addEventListener('ended',done);a.addEventListener('error',done);if(a.ended||a.error)done()})}}finally{if(serial===conversationSerial){conversationPlaying=false;conversationWaitCancel=null;window.dispatchEvent(new CustomEvent('home-conversation-end',{detail:{id:choice.id}}));scheduleConversation()}}})().catch(()=>{});return true;
 }
 window.addEventListener('pagehide',()=>{clearTimeout(autoConversationTimer);stopExtra()});
 const touch=$('#idolTouch');touch.style.left='0';touch.style.top='0';touch.style.width='100%';touch.style.height='100%';touch.addEventListener('click',event=>{if(!entries.length)return;const r=touch.getBoundingClientRect(),scale=Math.max(r.width/1136,r.height/640),x=(1136-r.width/scale)/2+(event.clientX-r.left)/scale,y=(640-r.height/scale)/2+(event.clientY-r.top)/scale;event.stopImmediatePropagation();let hit=-1,hitRegion=null,best=Infinity;for(let i=0;i<entries.length;i++){const m=i?models[i]:stage.getModel();if(!m)continue;const target=HomeInteraction.hit(m,x,y);if(!target)continue;const distance=Math.abs(x-target.cx);if(distance<best){best=distance;hit=i;hitRegion=target.region}}if(hit<0){$('#voiceStatus').textContent='点击空白区域 · 播放主页语音';return speakBlank()}if(editing!==hit)edit(hit);const region=hitRegion;if(hit)speakExtra(hit,region);else stage.speak('touch:'+region)},true);
 $('#homeCount').onchange=e=>resize(Number(e.target.value),HomeLayout.distances[prefs.distance]?prefs.distance:'middle');$('#homeDistance').onchange=e=>resize(entries.length,e.target.value);$('#homeSlot').onchange=e=>edit(Number(e.target.value));$('#idolSelect').onchange=e=>{stopExtra();const p=cat().find(x=>x.id===e.target.value);if(!p)return;if(!editing){stage.chooseIdol(p.id);entries[0]={idol:p.id,outfit:p.outfits[0].key};layout()}else{entries[editing]={idol:p.id,outfit:p.outfits[0].key};load(editing)}edit(editing);save()};$('#outfitSelect').onchange=e=>{stopExtra();entries[editing].outfit=e.target.value;if(!editing)stage.setOutfit(e.target.value);else load(editing);edit(editing);save()};$('#trustLevel').oninput=e=>{prefs.trustById??={};prefs.trustById[idol(editing).id]=Number(e.target.value);$('#trustValue').textContent=e.target.value;stage.save();prewarm(editing);updateTrustHint(editing)};$('#playVoice').onclick=()=>editing?speakExtra(editing,null,$('#voiceSelect').value):stage.speak(true);$('#stopVoice').onclick=()=>{stage.stop();stopExtra();if(lastExtra)idle(models[lastExtra.i])};$('#replayVoice').onclick=()=>lastExtra&&editing===lastExtra.i?speakExtra(lastExtra.i,null,lastExtra.v.id):stage.speak('replay');
 let started=false;function start(){if(started||!cat().length||!stage.getSelected())return false;started=true;const saved=Array.isArray(prefs.members)&&prefs.members.length?prefs.members:[{idol:prefs.idol,outfit:prefs.outfit}],distance=HomeLayout.distances[prefs.distance]?prefs.distance:HomeLayout.distanceForCount(prefs.count||1),count=Math.min(5,Math.max(1,prefs.count||1));prefs.distance=distance;entries=saved.slice(0,count).map(e=>{const p=cat().find(x=>x.id===e.idol)||cat()[0];return{idol:p.id,outfit:p.outfits.some(x=>x.key===e.outfit)?e.outfit:p.outfits[0].key}});if(!entries.length)entries=[{idol:stage.getSelected().id,outfit:prefs.outfit}];prefs.count=entries.length;for(let i=1;i<entries.length;i++)load(i);layout();edit(0);return true}window.addEventListener('home-catalog-ready',()=>{const poll=()=>{if(!start())setTimeout(poll,50)};poll()});if(cat().length){const poll=()=>{if(!start())setTimeout(poll,50)};poll()}
})();


