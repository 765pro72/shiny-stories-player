/* Same-character fallback only. Generic motion is a compatibility adaptation,
 * never presented as an official costume-specific performance. */
((root)=>{
 function prepare(catalog,generic){for(const person of catalog){if(!person.voices?.length){person.voices=generic[person.id]||[];person.voiceNote=person.voices.length?'使用该角色本人的通用主页语音；剧情模型使用兼容动作。':'暂未收录该角色的可用主页语音。'}if(person.id==='staff')person.voiceNote='叶月使用自己的主页语音；剧情模型按兼容性使用通用动作。没有独立触摸与信赖度条件。'}return catalog}
 function plan(names,voice,{generic=false}={}){const has=n=>n&&names.includes(n),animations=(voice.animations||[]).map(n=>has(n)?n:'');let adapted=false;
  if(!animations[0]||(generic&&/^wait/.test(animations[0]))){const candidates=['hello','smile1','smile2','yes','shy1','talk1','talk'].filter(has);if(candidates.length){const seed=[...(voice.id||'')].reduce((n,c)=>n+c.charCodeAt(0),0);animations[0]=candidates[seed%candidates.length];adapted=true}}
  const lip=has(voice.lip)?voice.lip:['lip_smile','lip_smile1','lip_wait','lip_wait1',...names.filter(n=>/^lip_(?:smile|wait)\d+$/.test(n)),'lip_a'].find(has);return{animations,lip,adapted,returnToIdle:adapted&&!/^wait/.test(animations[0]),idle:['wait1','wait'].find(has)||names.find(n=>/^wait/.test(n))};
 }
 function animate(model,name,track,loop=true){if(!model||!name||!model.spineData.animations.some(a=>a.name===name))return false;if(track===0)cancelIdle(model);const current=model.state.getCurrent(track);if(current?.animation.name===name){current.loop=loop;current.alpha=1;return true}const relay=current?.animation.timelines.flatMap(t=>t.events||[]).find(e=>e.data?.name==='relay')?.stringValue;const prev=current?.animation.name,canMix=typeof model.stateData?.setMix==='function'&&prev&&prev!=='<empty>'&&!/^lip_/.test(name);if(relay&&model.spineData.animations.some(a=>a.name===relay)){if(canMix){model.stateData.setMix(prev,relay,.3);model.stateData.setMix(relay,name,.3)}model.state.setAnimation(track,relay,false);model.state.addAnimation(track,name,loop,0)}else{if(canMix)model.stateData.setMix(prev,name,.3);model.state.setAnimation(track,name,loop)}return true}
 const mouths=new WeakMap(),installed=new WeakSet(),compatible=new WeakMap(),closedParts=new WeakMap(),mouthBones=new WeakMap(),mouthAnimations=new WeakMap(),idleTimers=new WeakMap(),limbSlotsCache=new WeakMap(),unkeyedArmWait=new WeakMap();
 function cancelIdle(model){const t=model&&idleTimers.get(model);if(t){clearTimeout(t);idleTimers.delete(model)}}
 function scheduleIdle(model,onIdle,delayMs=1400){if(!model)return;cancelIdle(model);stopMouth(model);const t=setTimeout(()=>{idleTimers.delete(model);if(typeof onIdle==='function')onIdle()},Math.max(0,delayMs));idleTimers.set(model,t)}
 function resetUnkeyedLimbSlots(model,anim){
  if(!model?.skeleton?.slots||!anim)return;
  let noArmKeys=unkeyedArmWait.get(anim);
  if(noArmKeys===undefined){
   const armIdx=new Set(model.skeleton.slots.filter(s=>/^(?:arm|hand)_/i.test(s.data?.name||'')).map(s=>s.data.index));
   noArmKeys=!anim.timelines?.some(t=>armIdx.has(t.slotIndex));
   unkeyedArmWait.set(anim,noArmKeys);
  }
  if(!noArmKeys)return;
  let slots=limbSlotsCache.get(model);
  if(!slots){slots=model.skeleton.slots.filter(s=>/^(?:arm|hand)_/i.test(s.data?.name||''));limbSlotsCache.set(model,slots)}
  for(const s of slots){if(s.data?.color&&s.color?.setFromColor)s.color.setFromColor(s.data.color)}
 }
 // A lip_* name can be a single held attachment, including a closed mouth.
 // Inspect the authored timelines instead of treating every lip track as speech.
 function mouthInfo(model){
  const data=model.spineData,cached=mouthAnimations.get(data);if(cached?.count===data.animations.length)return cached;
  const slots=new Set(model.skeleton.slots.filter(s=>/^(?:mouth|mouse|lip)(?:_|$)/i.test(s.data.name)).map(s=>s.data.index)),moving=new Set(),closed=new Set();
  for(const a of data.animations){if(!/^lip_/.test(a.name))continue;const tracks=a.timelines.filter(t=>slots.has(t.slotIndex)&&t.attachmentNames),attachments=tracks.flatMap(t=>t.attachmentNames).filter(Boolean);
   if(tracks.some(t=>new Set(t.attachmentNames).size>1)||!tracks.length&&a.duration>0)moving.add(a.name);
   if(attachments.length&&attachments.every(n=>/close/i.test(n)))closed.add(a.name);
  }
  const value={count:data.animations.length,moving,closed};mouthAnimations.set(data,value);return value;
 }
 function speakingMouth(model,requested=''){
  const fallback=plan(model.spineData.animations.map(a=>a.name),{}).lip||compatibleLip(model)?.name,info=mouthInfo(model),family=requested.replace(/_s\d*$/,'');
  const related=[...info.moving].find(name=>name.replace(/\d+$/,'')===family.replace(/\d+$/,''));
  return[requested,family,related,fallback,...info.moving].find(name=>info.moving.has(name));
 }
 function restingMouth(model,requested=''){
  const info=mouthInfo(model),family=requested.replace(/_s\d*$/,'');return[requested,family+'_s','lip_wait_s','lip_smile_s','lip_smile1_s',...info.closed].find(name=>info.closed.has(name));
 }
 function openMouthTime(model,name){for(const t of model.spineData.animations.find(a=>a.name===name)?.timelines||[]){const i=t.attachmentNames?.findIndex(n=>/^(?:mouth|mouse|lip)_open/i.test(n||''));if(i>=0)return t.frames[i]+.001}}
 function resetMouthBones(model){
  let bones=mouthBones.get(model);
  if(!bones){
   const byName=(model.skeleton?.bones||[]).filter(b=>/(?:^|_)(?:mouth|mouse|lip)(?:_|\d|$)/i.test(b.data?.name||''));
   bones=[...new Set(byName)];
   mouthBones.set(model,bones);
  }
  for(const b of bones){
   if(!b?.data)continue;
   b.x=b.data.x;b.y=b.data.y;b.rotation=b.data.rotation;
   b.scaleX=b.data.scaleX;b.scaleY=b.data.scaleY;
   b.shearX=b.data.shearX;b.shearY=b.data.shearY;
  }
 }
 function closeMouth(model){
  let parts=closedParts.get(model);if(!parts){const skins=[model.skeleton.skin,model.spineData.defaultSkin,...(model.spineData.skins||[])].filter(Boolean);parts=model.skeleton.slots.filter(s=>/^(?:mouth|mouse|lip)(?:_|$)/i.test(s.data.name)).flatMap(slot=>{const names=[...new Set(skins.flatMap(s=>Object.keys(s.attachments?.[slot.data.index]||{})))],name=names.find(n=>/^(?:mouth|mouse|lip)_close1$/.test(n))||names.find(n=>/close/.test(n));const attachment=name&&skins.map(s=>s.getAttachment?.(slot.data.index,name)||s.attachments?.[slot.data.index]?.[name]).find(Boolean);return attachment?[{slot,attachment}]:[]});closedParts.set(model,parts)}for(const {slot,attachment}of parts)if(!/close/i.test(slot.attachment?.name||''))slot.setAttachment(attachment);
  resetMouthBones(model);
 }
 function guardMouth(model){
  if(installed.has(model))return;installed.add(model);const apply=model.state.apply;model.state.apply=function(...args){const active=mouths.get(model);if(active){if(active.audio.ended||active.audio.paused){mouths.delete(model);this.clearTrack(4)}else if(!active.audible||active.audible()){let entry=this.getCurrent(4);if(entry?.animation.name!==active.name||!entry.loop||entry.alpha===0){this.clearTrack(4);entry=this.setAnimation(4,active.name,true);entry.mixDuration=0}entry.loop=true;entry.alpha=1;entry.timeScale=1;entry.trackTime=Math.max(0,active.audio.currentTime)}else if(this.getCurrent(4))this.clearTrack(4)}const result=apply.apply(this,args);if(!mouths.has(model)||!this.getCurrent(4))closeMouth(model);const t0=this.getCurrent(0);if(t0&&!t0.mixingFrom&&/^wait/i.test(t0.animation?.name||''))resetUnkeyedLimbSlots(model,t0.animation);return result};
 }
 // Gasha models omit lip animations but often retain their original open/closed
 // mouth attachments. Build a small attachment-only track; never redraw a face.
 function compatibleLip(model){
  if(compatible.has(model))return compatible.get(model);
  const slot=model.skeleton.slots.find(s=>/^(?:mouth|mouse|lip)(?:_|$)/i.test(s.data.name));if(!slot)return null;
  const skins=[model.skeleton.skin,model.spineData.defaultSkin,...(model.spineData.skins||[])].filter(Boolean),names=[...new Set(skins.flatMap(s=>Object.keys(s.attachments?.[slot.data.index]||{})))];
  const closed=names.find(n=>/^(?:mouth|mouse|lip)_close1$/.test(n))||names.find(n=>/close/.test(n)),open=names.find(n=>/^(?:mouth|mouse|lip)_open1?$/.test(n))||names.find(n=>/open/.test(n));if(!closed||!open)return null;
  const template=model.spineData.animations.flatMap(a=>a.timelines).find(t=>t.attachmentNames&&typeof t.setFrame==='function'),base=model.spineData.animations[0];if(!template||!base)return null;
  const name='lip_home_compatible';if(!model.spineData.animations.some(a=>a.name===name)){const timeline=new template.constructor(5);timeline.slotIndex=slot.data.index;const second=names.find(n=>/open2$/.test(n))||open;for(const [i,[time,attachment]]of [[0,closed],[.08,open],[.18,second],[.29,open],[.37,closed]].entries())timeline.setFrame(i,time,attachment);model.spineData.animations.push(new base.constructor(name,[timeline],.46))}
  const attachment=skins.map(s=>s.getAttachment?.(slot.data.index,closed)||s.attachments?.[slot.data.index]?.[closed]).find(Boolean);if(!attachment)return null;
  const value={name,slot,closed:attachment};compatible.set(model,value);return value;
 }
 function stopMouth(model){if(!model)return;mouths.delete(model);guardMouth(model);model.state.clearTrack(4);closeMouth(model)}
 // Bind the mouth to the actual audio, including automatic replies. A queued idle
 // transition must not leave a silent/empty mouth track while this line is playing.
 function bindMouth(model,name,audio,audible){
  cancelIdle(model);stopMouth(model);if(!model||!audio)return false;name=speakingMouth(model,name)||compatibleLip(model)?.name;if(!name||!model.spineData.animations.some(a=>a.name===name))return false;
  const start=()=>{model.state.clearTrack(4);const entry=model.state.setAnimation(4,name,true);entry.mixDuration=0;entry.alpha=1;return entry};
  if(!audible)start();mouths.set(model,{name,audio,audible});
  return true;
 }
 function inspect(model){if(!model)return null;const active=mouths.get(model),track=model.state.getCurrent(4);return{mode:compatible.has(model)?'compatible':'native',bound:!!active,animation:track?.animation?.name||'',trackTime:track?.trackTime||0,audio:active?{paused:active.audio.paused,ended:active.audio.ended,currentTime:active.audio.currentTime,error:active.audio.error?.message||'',src:active.audio.currentSrc||active.audio.src}:null,mouthSlots:model.skeleton.slots.filter(s=>/^(?:mouth|mouse|lip)(?:_|$)/i.test(s.data.name)).map(s=>({name:s.data.name,attachment:s.getAttachment()?.name||''}))}}
 const api={prepare,plan,animate,bindMouth,stopMouth,scheduleIdle,cancelIdle,inspect,speakingMouth,restingMouth,openMouthTime,closeMouth,prepareMouth:model=>plan(model.spineData.animations.map(a=>a.name),{}).lip||compatibleLip(model)?.name,mouthMode:model=>compatible.has(model)?'compatible':'native'};if(typeof module==='object')module.exports=api;else root.HomeVoicePolicy=api;
})(typeof window==='object'?window:globalThis);
