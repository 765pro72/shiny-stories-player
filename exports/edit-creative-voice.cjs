const fs=require('fs');
function edit(path,fn){const before=fs.readFileSync(path,'utf8'),after=fn(before);if(before===after)throw Error('No change: '+path);fs.writeFileSync(path,after)}
function r(s,a,b){if(!s.includes(a))throw Error('Missing: '+a.slice(0,90));return s.replace(a,b)}
edit('public/story-voice.js',s=>{
 s=r(s,"W=()=>window.StoryWorkshop", "W=()=>activeContext||window.StoryWorkshop");
 s=r(s,"let dialog,voices=[]", "let activeContext=null,dialog,voices=[]");
 s=r(s,"new Option(v.name,v.id)","new Option(v.name+' · '+v.voice,v.id)");
 s=r(s,"const text=String(speaker||'').trim();", "const text=String(speaker||'').trim().replace('郁田春希','郁田阳希');");
 const start=s.indexOf(' function attach('),end=s.indexOf('\n async function single()',start);
 s=s.slice(0,start)+` function attach(scene,voice,actorId,fit,captionIndex){
  const p=W().project;if(p.assets.length>=3000)throw Error('素材已达上限，请先清理或拆分工程');
  const id=C.uid(),path='imports/'+id+'/ai-voice.mp3',line=captionIndex===undefined?scene:scene.captions[captionIndex],at=captionIndex===undefined?0:line.at;
  const asset={id,kind:'audio',source:'import',name:'AI 配音 · '+(line.speaker||scene.label),path,generated:{type:'AI 合成配音',provider:voice.provider,model:voice.model,voice:voice.voice,text:line.text,captionIndex,createdAt:new Date().toISOString()}};
  const check=C.copy(p),s=check.scenes.find(s=>s.id===scene.id);check.assets.push(asset);if(captionIndex===undefined)s.voice=id;else{s.voiceClips??=[];s.voiceClips=s.voiceClips.filter(v=>v.captionIndex!==captionIndex);s.voiceClips.push({id:C.uid(),asset:id,captionIndex,at,duration:Math.max(.1,voice.duration||line.duration),text:line.text})}
  if(fit&&voice.duration>0){s.duration=Math.min(3600,Math.max(s.duration,at+voice.duration+.2));const c=s.characters.find(c=>c.id===actorId);if(c){const end=at+voice.duration;c.cues??=[];const manual=c.cues.filter(q=>q.channel==='mouth'&&!q.generated);if(!manual.length){const intervals=[...c.cues.filter(q=>q.channel==='mouth'&&q.generated),{at,duration:voice.duration}].sort((a,b)=>a.at-b.at),merged=[];for(const q of intervals){const last=merged.at(-1);if(last&&q.at<=last.at+last.duration)last.duration=Math.max(last.at+last.duration,q.at+q.duration)-last.at;else merged.push({channel:'mouth',at:q.at,duration:q.duration,animation:'',enabled:true,loop:true,generated:'ai-voice'})}c.cues=[...c.cues.filter(q=>q.channel!=='mouth'),...merged];c.talking=false}}}
  C.validate(check);p.assets.push(asset);Object.assign(scene,s);W().files.set(path,voice.bytes);W().markChanged();return asset;
 }
`+s.slice(end);
 const pstart=s.indexOf(' function prepare()'),pend=s.indexOf('\n async function batch()',pstart);
 s=s.slice(0,pstart)+` function prepare(){queue=[];const p=W().project;target={projectId:p.id};const host=$('#ttsQueue');host.replaceChildren();let skipped=0;
  for(const s of p.scenes){const lines=[];if(s.text.trim()&&!(s.captions||[]).some(c=>c.at===0))lines.push({line:s,captionIndex:undefined});(s.captions||[]).forEach((line,captionIndex)=>{if(line.text.trim())lines.push({line,captionIndex})});
   for(const {line,captionIndex}of lines){if(captionIndex===undefined?s.voice:s.voiceClips?.some(v=>v.captionIndex===captionIndex&&v.text===line.text)){skipped++;continue}if(queue.length>=100)break;
    const actorId=actorFor({...s,speaker:line.speaker}),entry={sceneId:s.id,actorId,text:line.text,captionIndex},row=document.createElement('div');row.className='tts-queue-row';const check=document.createElement('input');check.type='checkbox';check.checked=!!line.aiVoice;check.setAttribute('aria-label','为 '+s.label+' '+(captionIndex===undefined?'默认台词':'字幕 '+(captionIndex+1))+' 配音');check.onchange=()=>{line.aiVoice=check.checked;W().markChanged()};
    const copy=document.createElement('div'),title=document.createElement('strong'),text=document.createElement('p'),note=document.createElement('small');title.textContent=(line.speaker||s.label)+(captionIndex===undefined?'':' · '+line.at+' 秒');text.textContent=line.text;note.textContent='未勾选的台词保持原样';copy.append(title,text,note);
    const settings=document.createElement('div'),select=document.createElement('select'),voice=document.createElement('input');select.setAttribute('aria-label',(line.speaker||s.label)+' 的角色音色');select.append(new Option('自定义音色',''),...voices.map(v=>new Option(v.name+' · '+v.voice,v.voice)));voice.setAttribute('list','ttsVoiceList');voice.setAttribute('aria-label',(line.speaker||s.label)+' 的音色 ID');voice.placeholder='自定义音色 ID';voice.value=$('#ttsProvider').value==='fish'?voiceFor(line.speaker):'';select.value=voice.value;select.onchange=()=>voice.value=select.value;settings.append(select,voice);row.append(check,copy,settings);host.append(row);queue.push({...entry,check,voice,note})
   }
  }$('#ttsStartBatch').disabled=!queue.length;$('#ttsProgress').hidden=true;status('可配音 '+queue.length+' 句，跳过 '+skipped+' 句已有配音。勾选需要的台词并检查音色，未勾选的不会调用服务；单批最多 100 句。');
 }
`+s.slice(pend);
 s=r(s,'attach(scene,voice,q.actorId,$(\'#ttsFitDuration\').checked);','attach(scene,voice,q.actorId,$(\'#ttsFitDuration\').checked,q.captionIndex);');
 s=r(s,"if(!scene||scene.voice)continue;", "if(!scene||(q.captionIndex===undefined&&scene.voice))continue;if((q.captionIndex===undefined?scene.text:scene.captions?.[q.captionIndex]?.text)!==q.text)throw Error('台词已修改，请重新读取队列，避免声音与字幕不一致');");
 s=r(s,"async function open(){if(!dialog){", "async function open(context,host){if(!host){await StoryAI.open();host=document.querySelector('#aiVoiceHost');document.querySelector('#aiVoiceSection').open=true}activeContext=context||window.StoryWorkshop;if(controller)return status('请先停止当前配音队列，再切换配音对象。');if(!dialog){");
 s=r(s,"t.innerHTML=await fetch('/story-voice-panel.html').then(r=>r.text());document.body.append(t.content);", "t.innerHTML=(await fetch('/story-voice-panel.html').then(r=>r.text())).replace('<dialog ','<section ').replace('</dialog>','</section>');host.append(t.content);");
 s=r(s,"voices=read('story-voice-profiles',[]);renderVoices();", "voices=(await fetch('/data/story-voice-profiles.json').then(r=>r.json())).profiles;renderVoices();");
 s=r(s,"$('#ttsClose').onclick=()=>dialog.close();", "$('#ttsClose').onclick=()=>document.querySelector('#aiVoiceSection').open=false;");
 s=r(s,"}useScene();dialog.showModal()}","}else if(dialog.parentElement!==host)host.append(dialog);$('#ttsSelectAll').onclick=()=>{for(const q of queue){q.check.checked=true;q.check.dispatchEvent(new Event('change'))}};$('#ttsSelectNone').onclick=()=>{for(const q of queue){q.check.checked=false;q.check.dispatchEvent(new Event('change'))}};useScene();prepare();}");
 const b=s.indexOf(" const button=document.createElement('button')"),bend=s.indexOf('\n window.StoryVoice=',b);s=s.slice(0,b)+s.slice(bend);
 s=r(s,"window.StoryVoice={open,single,apply,prepare,batch,attach,", "document.addEventListener('close',e=>{if(e.target.id==='storyAIDialog'){controller?.abort();$('#ttsAudio')?.pause()}},true);window.StoryVoice={open,single,apply,prepare,batch,attach,");
 return s;
});
edit('public/story-voice-panel.html',s=>{
 s=r(s,'按需读取并保存到本机','已预置随包，显示角色名与对应 ID；可选择刷新');
 s=r(s,'从参考仓库读取角色音色','刷新公开音色列表（可选）');
 s=r(s,'<div id="ttsQueue"></div>','<div class="ai-toolbar"><button id="ttsSelectAll">全选待配音台词</button><button id="ttsSelectNone">全部取消</button></div><div id="ttsQueue"></div>');
 s=r(s,'为没有配音的分镜建立队列。每句可单独选择音色；已配音、空白台词和包含定时字幕的镜头自动跳过。','勾选需要 AI 音声的台词。默认台词和镜头内的定时字幕均可单独配音，已有配音自动跳过；不会自动全部生成。');
 return s.replace('定时字幕镜头请拆为一句一镜，或导入整段录音。','定时字幕按自身起始时间播放配音；请预览，避免不同台词的音频时段互相覆盖。');
});
edit('public/custom-story-core.js',s=>r(s,'validateIntervals(s.captions',`if(s.voiceClips!==undefined){if(!Array.isArray(s.voiceClips)||s.voiceClips.length>200)throw Error('定时配音数量无效');for(const v of s.voiceClips){refs(v.asset,['audio']);if(!Number.isFinite(v.at)||!Number.isFinite(v.duration)||v.at<0||v.duration<.1||v.at+v.duration>3600||!Number.isInteger(v.captionIndex)||v.captionIndex<0||!s.captions?.[v.captionIndex])throw Error('定时配音内容无效')}}validateIntervals(s.captions`));
edit('public/custom-story-stage.js',s=>{
 s=r(s,'this.audioSerial++;for(const a', 'this.audioSerial++;for(const timer of this.audioTimers||[])clearTimeout(timer);this.audioTimers=[];for(const a');
 s=r(s,'}return voice;','}const pending=[];for(const clip of scene.voiceClips||[]){const a=this.asset(clip.asset);if(!a||scene.captions?.[clip.captionIndex]?.text!==clip.text)continue;const audio=new Audio(this.resolve(a.path,a));audio.volume=volume;this.sounds.push(audio);const state={audio,waiting:true};pending.push(state);this.audioTimers??=[];this.audioTimers.push(setTimeout(()=>{state.waiting=false;if(token===this.audioSerial)audio.play().catch(()=>this.status(\'定时配音未播放：\'+a.name))},clip.at*1000));}if(pending.length){const primary=voice;return{get ended(){return(!primary||primary.ended||primary.paused)&&pending.every(v=>!v.waiting&&(v.audio.ended||v.audio.paused))},get paused(){return false}}}return voice;');return s;
});
