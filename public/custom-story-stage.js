/* Editor-owned renderer; never modifies official models, textures or scripts. */
(()=>{
 class StoryStage{
  constructor(host,resolve,status,options={}){this.elements={speaker:options.speaker||document.querySelector("#stageSpeaker"),text:options.text||document.querySelector("#stageText"),counter:options.counter||document.querySelector("#stageCounter"),loading:options.loading||document.querySelector("#stageLoading")};this.readOnly=!!options.readOnly;this.resolve=resolve;this.status=status;this.host=host;this.serial=0;this.cache=new Map();this.sounds=[];this.activeVoices=[];this.music=null;this.musicId='';this.audioSerial=0;this.nodes=[];this.app=new PIXI.Application({width:1136,height:640,backgroundAlpha:0,antialias:true});host.append(this.app.view);this.app.stage.sortableChildren=true;this.drag=null;this.time=0;this.playing=false;this.app.ticker.add(()=>{if(this.playing){this.seek(this.continuePerformance?this.time+this.app.ticker.deltaMS/1000:Math.min(this.previewEnd??this.duration,this.time+this.app.ticker.deltaMS/1000),this.continuePerformance);if(this.time>=(this.previewEnd??this.duration)&&!this.continuePerformance)this.playing=false}});const point=e=>{const r=this.app.view.getBoundingClientRect();return{x:(e.clientX-r.left)*1136/r.width,y:(e.clientY-r.top)*640/r.height}};this.app.view.addEventListener('pointerdown',e=>{if(this.readOnly||document.body.classList.contains('story-watching'))return;const p=point(e),entry=[...this.nodes].reverse().find(n=>n.node.getBounds().contains(p.x,p.y));if(!entry)return;this.playing=false;const target=this.moveTarget?.characterId===entry.character.id?this.moveTarget.move:null;if(!target)this.moveTarget=null;this.drag={entry,target,x:p.x,y:p.y,from:{x:target?target.x:entry.character.x,y:target?target.y:entry.character.y}};this.selectedCharacterId=entry.character.id;this.onSelect?.(entry.character.id);this.drawSelection();this.app.view.setPointerCapture(e.pointerId)});this.app.view.addEventListener('pointermove',e=>{if(!this.drag)return;const p=point(e),d=this.drag;const position=d.target||d.entry.character;position.x=Math.max(-5000,Math.min(5000,Math.round(d.from.x+p.x-d.x)));position.y=Math.max(-5000,Math.min(5000,Math.round(d.from.y+p.y-d.y)));if(d.target){this.seek(d.target.at+d.target.duration);this.onMoveTarget?.(d.entry.character,d.target)}else{this.seek(0);this.onMove?.(d.entry.character)}});for(const evt of ['pointerup','pointercancel'])this.app.view.addEventListener(evt,()=>{this.drag=null});}
  editMove(characterId,move){this.playing=false;this.selectedCharacterId=characterId;this.moveTarget={characterId,move};this.seek(move.at+move.duration);this.onSelect?.(characterId);this.drawSelection()}
  clearMoveTarget(){this.moveTarget=null;this.playing=false;this.seek(0);this.onSelect?.(this.selectedCharacterId)}
  drawSelection(){if(!this.selectionGraphic||this.selectionGraphic.destroyed){this.selectionGraphic=new PIXI.Graphics();this.selectionGraphic.zIndex=10000;this.app.stage.addChild(this.selectionGraphic)}const g=this.selectionGraphic;g.clear();if(this.readOnly||document.body.classList.contains('story-watching'))return;const entry=this.nodes.find(n=>n.character.id===this.selectedCharacterId);if(!entry)return;const b=entry.node.getBounds();g.lineStyle(2,0xb66085,.8).drawRoundedRect(b.x,b.y,b.width,b.height,8);if(!this.moveTarget)return;const c=entry.character;g.lineStyle(3,0xb66085,.9).moveTo(c.x,c.y);for(const m of c.moves||[])g.lineTo(m.x,m.y);for(const m of c.moves||[]){g.beginFill(m===this.moveTarget.move?0xb66085:0xffffff).drawCircle(m.x,m.y,m===this.moveTarget.move?9:6).endFill()}}
  asset(id){return this.project.assets.find(a=>a.id===id)}
  async model(asset){
   if(this.cache.has(asset.id))return this.cache.get(asset.id);
   const pending=(async()=>{
    const json=await fetch(this.resolve(asset.path,asset)).then(r=>{if(!r.ok)throw Error('模型 JSON HTTP '+r.status);return r.json()});
    if(!json.skeleton||!json.bones)throw Error('导入的 JSON 不是 Spine 骨骼模型');
    const atlasPath=asset.source==='builtin'?asset.path.replace(/data\.json$/,'data.atlas'):asset.atlas;
    const text=await fetch(this.resolve(atlasPath,asset)).then(r=>{if(!r.ok)throw Error('模型 atlas HTTP '+r.status);return r.text()});
    const base=atlasPath.slice(0,atlasPath.lastIndexOf('/')+1),bases=[];
    const atlas=await new Promise((resolve,reject)=>{new PIXI.spine.TextureAtlas(text,(name,done)=>{const path=asset.source==='builtin'?base+name:asset.pages[name];if(!path){reject(Error('模型缺少贴图：'+name));return}const texture=PIXI.BaseTexture.from(this.resolve(path,asset));bases.push(texture);if(texture.valid)done(texture);else{texture.once('loaded',()=>done(texture));texture.once('error',()=>reject(Error('模型贴图加载失败：'+name)))}},resolve)});
    const skeleton=new PIXI.spine.SpineParser().createJsonParser();const data=skeleton.readSkeletonData(atlas,json);return{data,atlas,bases};
   })();this.cache.set(asset.id,pending);try{return await pending}catch(e){this.cache.delete(asset.id);throw e}
  }
  place(entry){const {node,character:c,baseScale}=entry;const position=CustomStory.positionAt(c,this.time||0);const blend=this.continuePerformance&&entry.placementBlend,t=blend?Math.min(1,(this.time||0)/.3):1,w=t*t*(3-2*t),x=blend?blend.x+(position.x-blend.x)*w:position.x,y=blend?blend.y+(position.y-blend.y)*w:position.y;node.position.set(x,y);const target=baseScale*c.scale,scale=blend?blend.scale+(target-blend.scale)*w:target;node.scale.set(scale*(c.flip?-1:1),scale);}
  seek(time,playback=false){this.time=Math.max(0,playback?time:Math.min(this.duration||3600,time));for(const entry of this.nodes){this.place(entry);this.performance(entry,this.time)}const caption=CustomStory.activeAt(this.scene?.captions,this.time);this.elements.speaker.textContent=caption?.speaker??this.scene?.speaker??'';this.elements.text.textContent=caption?.text??this.scene?.text??'';this.drawSelection();this.onTime?.(this.time)}
  bodyPerformance(entry,rows,time){
   const row=rows.find(r=>r.track===0),n=entry.node,last=entry.requestedBody;
   if(!this.continuePerformance||(!entry.sceneChanged&&time<(entry.lastPoseTime||0)))entry.bodyRelay=null;
   else if(last&&last.name!==row.name){
    const source=n.state.getCurrent(0)?.animation,relay=source?.timelines.flatMap(t=>t.events||[]).find(e=>e.data?.name==='relay')?.stringValue;
    const animation=relay&&relay!==row.name&&n.spineData.animations.find(a=>a.name===relay);
    entry.bodyRelay=animation?.duration>0?{name:relay,target:row.name,at:time,duration:animation.duration}:null;
   }else if(last&&!entry.sceneChanged&&last.at!==row.at)entry.bodyRelay=null;
   entry.requestedBody={...row};
   const relay=entry.bodyRelay;if(!relay||relay.target!==row.name)return;
   // Authored return motions coordinate bones with front/back arm slot visibility.
   // A bone-only tween to idle hides the front forearm while it is still raised.
   if(time<relay.at+relay.duration){row.name=relay.name;row.at=relay.at;row.loop=false}
   else row.at=Math.max(row.at,relay.at+relay.duration);
  }
  blendPose(entry,rows,time){
   const n=entry.node,poseRows=rows.filter(r=>r.track!==4),before=entry.lastPoseRows;
   entry.poseBlends??=new Map();
   if(!this.continuePerformance||(!entry.sceneChanged&&time<(entry.lastPoseTime||0)))entry.poseBlends.clear();
   else if(before){
    const tracks=new Set([...before,...poseRows].map(r=>r.track)),changed=[...tracks].filter(track=>JSON.stringify(before.find(r=>r.track===track))!==JSON.stringify(poseRows.find(r=>r.track===track)));
    const indices=new Set();
    if(changed.includes(0))n.skeleton.bones.forEach((_,i)=>indices.add(i));
    else for(const row of [...before,...poseRows].filter(r=>changed.includes(r.track))){
     const animation=n.spineData.animations.find(a=>a.name===row.name);
     for(const t of animation?.timelines||[]){
      if(Number.isInteger(t.boneIndex))indices.add(t.boneIndex);
      for(const [field,collection]of [['ikConstraintIndex','ikConstraints'],['transformConstraintIndex','transformConstraints'],['pathConstraintIndex','pathConstraints']])if(Number.isInteger(t[field]))for(const bone of n.skeleton[collection]?.[t[field]]?.bones||[])indices.add(bone.data.index);
     }
    }
    for(const i of indices){const b=n.skeleton.bones[i];entry.poseBlends.set(i,{at:time,x:b.x,y:b.y,rotation:b.rotation,scaleX:b.scaleX,scaleY:b.scaleY,shearX:b.shearX,shearY:b.shearY})}
   }
   entry.lastPoseRows=poseRows.map(r=>({...r}));entry.lastPoseTime=time;entry.sceneChanged=false;entry.sampleTime=time;
   if(entry.blendInstalled)return;
   const apply=n.state.apply;n.state.apply=function(...args){const result=apply.apply(this,args);for(const [i,from]of entry.poseBlends){const t=Math.max(0,Math.min(1,(entry.sampleTime-from.at)/.3));if(t>=1){entry.poseBlends.delete(i);continue}const bone=n.skeleton.bones[i],weight=t*t*(3-2*t);for(const key of ['x','y','scaleX','scaleY','shearX','shearY'])bone[key]=from[key]+(bone[key]-from[key])*weight;bone.rotation=from.rotation+((bone.rotation-from.rotation+540)%360-180)*weight}return result};entry.blendInstalled=true;
  }
  performance(entry,time){
   const n=entry.node,c=entry.character;if(!n.spineData)return;
   const preparedLip=window.HomeVoicePolicy?.prepareMouth(n),names=n.spineData.animations.map(a=>a.name),base=names.includes(c.animation)?c.animation:names.includes('wait1')?'wait1':names[0];
   const defaultLip=window.HomeVoicePolicy?.speakingMouth(n)||preparedLip||['lip_smile','lip_smile1','lip_wait','lip_wait1',...names.filter(n=>/^lip_(smile|wait)\d+$/.test(n))].find(v=>names.includes(v));
   const displayed=CustomStory.activeAt(this.scene?.captions,time)||this.scene,speaker=displayed?.speaker||'',speakerActor=CustomStory.actorFor(this.project,this.scene,speaker);const mouthVoice=this.activeVoices.find(v=>v.actorId===c.id&&!v.audio.paused&&!v.audio.ended&&!v.audio.error&&(!v.lipSync||StoryAudioMouth.activeAt(v.lipSync,v.audio.currentTime)));const audible=!this.continuePerformance||Boolean(speaker.trim()&&!CustomStory.offstageSpeaker(speaker)&&(!speakerActor||speakerActor===c.id))&&!!mouthVoice;const rows=[{track:0,name:base,at:-(entry.bodyOffset||0),loop:/^(?:wait|idle|blank)/.test(base)}];if(names.includes('blank'))rows.push({track:1,name:'blank',at:0,loop:true});
   let mouthTalking=false;
   for(const [channel,track]of [['body',0],['face',2],['eyes',3],['mouth',4]]){
    const cue=CustomStory.activeAt(c.cues,time,channel);
    if(channel==='mouth'){
     mouthTalking=cue?cue.enabled&&audible:(this.continuePerformance?audible:c.talking);
     const closed=window.HomeVoicePolicy?.restingMouth(n,cue?.animation),name=mouthTalking?(window.HomeVoicePolicy?.speakingMouth(n,cue?.animation)||defaultLip):(closed||defaultLip);
     // Speech loops for the duration of the playing line, even if an old script
     // selected a held mouth pose or marked its lip animation as one-shot.
     if(name)rows.push({track,name,at:cue?.at||0,loop:true,freeze:!mouthTalking&&!closed,...(mouthTalking&&mouthVoice?.lipSync?{audioDriven:true,sampleStart:window.HomeVoicePolicy?.openMouthTime(n,name)}:{})});
    }else if(cue?.animation&&names.includes(cue.animation)){if(track===0)rows.splice(0,1);rows.push({track,name:cue.animation,at:cue.at,loop:cue.loop})}
   }
   this.bodyPerformance(entry,rows,time);
   this.blendPose(entry,rows,time);const signature=JSON.stringify(rows);if(entry.performanceKey!==signature){n.state.clearTracks();n.skeleton.setToSetupPose();for(const r of rows)n.state.setAnimation(r.track,r.name,r.loop);entry.performanceKey=signature}
   n.skeleton.setToSetupPose();for(const r of rows){const t=n.state.getCurrent(r.track);if(!t)continue;const duration=t.animation.duration,elapsed=Math.max(0,time-r.at);let sample=r.loop&&duration?elapsed%duration:Math.min(elapsed,duration);const loopStart=t.animation.timelines.flatMap(t=>t.events||[]).find(e=>e.data.name==='loop_start')?.time;if(r.loop&&loopStart&&elapsed>=duration&&duration>loopStart)sample=loopStart+(elapsed-loopStart)%(duration-loopStart);if(r.audioDriven&&Number.isFinite(r.sampleStart)&&duration)sample=(r.sampleStart+Math.max(0,mouthVoice.audio.currentTime))%duration;t.trackTime=r.freeze?0:sample;t.animationLast=t.nextAnimationLast=-1;}n.update(0);if(!mouthTalking)window.HomeVoicePolicy?.closeMouth(n);
  }
  previewMotion(start=0,end=this.duration){this.continuePerformance=false;this.previewEnd=end;this.seek(start);this.playing=true}
  stopAudio(music=true){this.activeVoices=[];this.audioSerial++;for(const timer of this.audioTimers||[])clearTimeout(timer);this.audioTimers=[];for(const a of this.sounds){a.onerror=null;a.onended=null;a.pause();a.removeAttribute('src');a.load()}this.sounds=[];if(music&&this.music){this.music.pause();this.music.src='';this.music=null;this.musicId='';this.musicSceneIndex=undefined}}
  producerAudio(scene){
   const token=this.audioSerial;this.producerSounds=[];
   for(const row of StoryProducerSound.plan(this.project,scene)){
    const asset=this.asset(row.asset),audio=StoryProducerSound.createAudio(asset?this.resolve(asset.path,asset):StoryProducerSound.DEFAULT_URL);audio.volume=row.volume/100*Number(scene.volume??70)/100;this.sounds.push(audio);this.producerSounds.push({audio,...row});this.audioTimers??=[];
    this.audioTimers.push(setTimeout(()=>{if(token!==this.audioSerial)return;StoryProducerSound.play(audio,{interval:row.interval,duration:row.duration,isCurrent:()=>token===this.audioSerial,timers:this.audioTimers})},row.at*1000));
   }
  }
  async audio(scene){
   this.stopAudio(false);const token=this.audioSerial;const volume=Number(scene.volume??70)/100;this.producerAudio(scene);
   const index=this.project.scenes.indexOf(scene),plan=StoryMusic.plan(this.project,index),key=plan?.key||'';
   const sequential=this.musicSceneIndex===index-1;
   if(this.musicId!==key||!sequential){
    if(this.music){this.music.pause();this.music.src=''}this.music=null;this.musicId=key;
    const asset=this.asset(plan?.asset);if(asset){const music=this.music=new Audio(this.resolve(asset.path,asset));music.loop=plan.loop!==false;music.volume=(plan.volume??70)/100;
     music.onloadedmetadata=()=>{if(this.music!==music)return;const offset=(plan.start||0)+(plan.elapsed||0);music.currentTime=Number.isFinite(music.duration)?(music.loop?offset%music.duration:Math.min(offset,music.duration)):offset;music.play().catch(()=>{if(this.music===music)this.status('背景音乐暂未播放，请重新预览。')})};
     music.onerror=()=>{if(this.music===music)this.status('背景音乐无法播放：'+asset.name)};
    }
   }
   this.musicSceneIndex=index;if(this.music&&plan)this.music.volume=(plan.volume??70)/100;
   let voice=null;for(const key of ['voice','sound']){const asset=this.asset(scene[key]);if(!asset)continue;if(key==='voice'&&!CustomStory.voiceCurrent(asset,scene)){this.status('台词已修改，本句旧 AI 配音已跳过，请重新生成。');continue;}const a=new Audio(this.resolve(asset.path,asset));a.volume=volume;this.sounds.push(a);a.onerror=()=>{if(token===this.audioSerial)this.status('声音素材无法播放：'+asset.name)};a.play().catch(()=>{if(token===this.audioSerial)this.status('声音未能播放：'+asset.name)});if(key==='voice'){voice=a;this.activeVoices.push({audio:a,actorId:CustomStory.voiceActor(this.project,scene,scene,asset),lipSync:asset.lipSync})}}const pending=[];for(const clip of scene.voiceClips||[]){const a=this.asset(clip.asset);if(!a||scene.captions?.[clip.captionIndex]?.text!==clip.text||!CustomStory.voiceCurrent(a,scene.captions[clip.captionIndex]))continue;const audio=new Audio(this.resolve(a.path,a));audio.volume=volume;this.sounds.push(audio);this.activeVoices.push({audio,actorId:CustomStory.voiceActor(this.project,scene,scene.captions[clip.captionIndex],a),lipSync:a.lipSync});const state={audio,waiting:true};pending.push(state);this.audioTimers??=[];this.audioTimers.push(setTimeout(()=>{state.waiting=false;if(token===this.audioSerial)audio.play().catch(()=>this.status('定时配音未播放：'+a.name))},clip.at*1000));}if(pending.length){const primary=voice;return{get ended(){return(!primary||primary.ended||primary.paused)&&pending.every(v=>!v.waiting&&(v.audio.ended||v.audio.paused))},get paused(){return false}}}return voice;
  }
  async show(project,scene,{sound=false}={}){
   const previousTime=this.time,previousNodes=this.nodes.slice(),previousBackground=this.background;const previous=this.project?.id===project.id&&this.project.scenes.indexOf(this.scene)+1===project.scenes.indexOf(scene)&&sound?this.nodes.map(e=>({asset:e.character.asset,animation:e.character.animation,offset:(e.bodyOffset||0)+this.time})):[];const serial=++this.serial;this.playing=false;this.continuePerformance=sound;this.time=0;this.duration=scene.duration;this.previewEnd=null;if(sound||!scene.characters.some(c=>c.id===this.moveTarget?.characterId&&c.moves?.includes(this.moveTarget.move)))this.moveTarget=null;this.scene=scene;this.project=project;this.stopAudio(!sound);this.nodes=[];this.elements.speaker.textContent=scene.speaker;this.elements.text.textContent=scene.text;this.elements.counter.textContent=(project.scenes.indexOf(scene)+1)+' / '+project.scenes.length;const loading=this.elements.loading;loading.hidden=Boolean(previous.length&&previousBackground?.asset===scene.background);const reused=new Set();
   try{
    const bg=this.asset(scene.background);if(bg&&previous.length&&previousBackground?.asset===scene.background){this.background=previousBackground;reused.add(previousBackground.node)}else if(bg){const t=await PIXI.Texture.fromURL(this.resolve(bg.path,bg));if(serial!==this.serial)return;const image=new PIXI.Sprite(t),scale=Math.max(1136/t.width,640/t.height);image.scale.set(scale);image.position.set((1136-image.width)/2,(640-image.height)/2);image.zIndex=-1;this.background={asset:scene.background,node:image};reused.add(image);this.app.stage.addChild(image)}else this.background=null;
    for(const c of scene.characters){const a=this.asset(c.asset);if(!a)continue;let node,baseScale;const old=previous.length?previousNodes.find(e=>e.character.asset===c.asset&&!reused.has(e.node)):null;if(old){node=old.node;baseScale=old.baseScale;reused.add(node)}
     else if(a.kind==='model'){const {data}=await this.model(a);if(serial!==this.serial)return;node=new PIXI.spine.Spine(data);try{node.skeleton.setSkinByName('normal')}catch{}const animation=data.animations.find(v=>v.name===c.animation)||data.animations.find(v=>v.name==='wait1')||data.animations[0];if(animation)node.state.setAnimation(0,animation.name,true);node.stateData.defaultMix=0;node.autoUpdate=false;node.update(0);const b=node.getLocalBounds();baseScale=560/Math.max(b.height,1);node.pivot.set(b.x+b.width/2,b.y+b.height)}
     else{const t=await PIXI.Texture.fromURL(this.resolve(a.path,a));if(serial!==this.serial)return;node=new PIXI.Sprite(t);node.anchor.set(.5,1);baseScale=560/Math.max(t.height,1)}
     const entry=old||{node,baseScale};entry.placementBlend=old?{x:node.x,y:node.y,scale:Math.abs(node.scale.y)}:null;entry.character=c;entry.bodyOffset=previous.find(e=>e.asset===c.asset&&e.animation===c.animation)?.offset||0;entry.sceneChanged=Boolean(old);if(old&&entry.bodyRelay)entry.bodyRelay.at-=previousTime;reused.add(node);this.place(entry);this.performance(entry,0);this.nodes.push(entry);this.app.stage.addChild(node);
    }
    if(serial!==this.serial)return;for(const node of this.app.stage.children.slice())if(!reused.has(node)&&node!==this.selectionGraphic){this.app.stage.removeChild(node);node.destroy({children:true,texture:false,baseTexture:false})}this.onReady?.(this.nodes);this.seek(this.moveTarget?this.moveTarget.move.at+this.moveTarget.move.duration:0);this.playing=sound;if(sound)return await this.audio(scene);
   }catch(e){if(serial===this.serial)this.status('舞台素材加载失败：'+e.message);throw e}finally{if(serial===this.serial)loading.hidden=true}
  }
  async disposeAssets(){this.playing=false;this.serial++;this.stopAudio();this.app.stage.removeChildren().forEach(n=>n.destroy({children:true,texture:false,baseTexture:false}));this.nodes=[];for(const p of this.cache.values())try{const v=await p;v.atlas.dispose()}catch{}this.cache.clear();}
 }
 window.CustomStoryStage=StoryStage;
})();
