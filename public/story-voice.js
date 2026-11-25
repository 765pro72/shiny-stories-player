(()=>{
 const $=s=>document.querySelector(s),W=()=>activeContext||window.StoryWorkshop,C=CustomStory,L=StoryCharacterLanguage;
 let activeContext=null,dialog,voices=[],localVoices=[],localPack=null,controller=null,result=null,queue=[],target=null,audioURL='';const keys=new Map();let singleSegments;
 const status=t=>$('#ttsStatus').textContent=t;
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
 const getDesktop=()=>{try{return window.desktop||window.parent?.desktop||null}catch{return null}};
 const activeProfiles=()=>($('#ttsProvider')?.value==='gptsovits'?(localVoices.length?localVoices:voices):voices);
 const profileValue=v=>($('#ttsProvider')?.value==='gptsovits'?v.id:v.voice);
 function connection(){return{provider:$('#ttsProvider').value,baseURL:$('#ttsBaseURL').value.trim(),apiKey:$('#ttsAPIKey').value.trim(),model:$('#ttsModel').value.trim()}}
 function remember(){const c=connection();keys.set(c.provider,c.apiKey);delete c.apiKey;const profiles=read('story-voice-settings',{});profiles[c.provider]=c;profiles.active=c.provider;profiles.language=$('#ttsLanguage').value;CreativePreferences.write('story-voice-settings',JSON.stringify(profiles));$('#ttsConnectionName').textContent=' · '+c.model;return c}
 function renderPackBox(st){
  if(st)localPack=st;
  const el=$('#ttsPackStatus');if(!el)return;
  if(localPack?.voices?.length)localVoices=localPack.voices;
  if(localPack?.installed){
   el.textContent=`已就绪 ${localPack.voiceCount} 组偶像声线 · GPT-SoVITS ${localPack.apiOnline?'推理引擎在线 ('+localPack.apiUrl+')':localPack.runtimeReady?'引擎待启动（可点 🚀 启动）':'未检测到服务 ('+(localPack.apiUrl||'127.0.0.1:9880')+')'}`;
  }else{
   el.textContent='未部署 30 声线整合包（点击下方「📦 一键部署全部声音」选择 ShinyStories-TTS-Pack.7z 或挂载文件夹）';
  }
 }
 async function refreshLocalPack(probe=false){
  try{
   const d=getDesktop();
   const st=d?.getTtsPackStatus?await d.getTtsPackStatus(probe):await(await fetch('/api/tts-pack/status'+(probe?'?probe=1':''),{cache:'no-store'})).json();
   renderPackBox(st);
   if($('#ttsProvider')?.value==='gptsovits'){
    if(st?.apiUrl&&!$('#ttsBaseURL').matches(':focus'))$('#ttsBaseURL').value=read('story-voice-settings',{}).gptsovits?.baseURL||st.apiUrl;
    renderVoices();
   }
   return st;
  }catch{return null}
 }
 function changeProvider(){
  const provider=$('#ttsProvider').value,defaults=provider==='gptsovits'?{baseURL:localPack?.apiUrl||'http://127.0.0.1:9880',model:'gpt-sovits-v4'}:provider==='openai'?{baseURL:'https://api.openai.com/v1',model:''}:{baseURL:'https://api.fish.audio/v1',model:'s2.1-pro-free'};
  const c=read('story-voice-settings',{})[provider]||defaults;
  $('#ttsBaseURL').value=c.baseURL;$('#ttsModel').value=c.model;$('#ttsAPIKey').value=keys.get(provider)||'';$('#ttsVoiceProfile').value='';$('#ttsVoiceID').value='';
  const canPick=provider==='fish'||provider==='gptsovits';
  $('#ttsVoiceProfile').disabled=!canPick;$('#ttsImportVoices').disabled=provider!=='fish';
  const box=$('#ttsPackBox');if(box)box.hidden=provider!=='gptsovits';
  const vid=$('#ttsVoiceID');if(vid)vid.placeholder=provider==='gptsovits'?'本地声线 ID（如 mano / fuyuko_fuyu / nichika）':'Fish reference_id 或兼容服务的 voice';
  renderVoices();
  if(provider==='gptsovits')renderPackBox(localPack);
  $('#ttsConnectionName').textContent=' · '+(c.model||'填写模型名');
 }
 function renderVoices(){const profs=activeProfiles(),isLocal=$('#ttsProvider')?.value==='gptsovits';const select=$('#ttsVoiceProfile');select.replaceChildren(new Option(isLocal?'自定义本地声线':'自定义音色',''),...profs.map(v=>new Option(v.name+' · '+(isLocal?v.id:v.voice),v.id)));let list=$('#ttsVoiceList');if(!list){list=document.createElement('datalist');list.id='ttsVoiceList';dialog.append(list)}list.replaceChildren(...profs.map(v=>new Option(v.name,isLocal?v.id:v.voice)))}
 function voiceFor(speaker){
  const profs=activeProfiles(),isLocal=$('#ttsProvider')?.value==='gptsovits';
  const person=L.find(speaker),text=person?.chinese||String(speaker||'').trim();
  const norm=s=>String(s||'').trim().toLowerCase().replace(/[\s　·・_()（）]/g,'');
  const cands=[speaker,text,person?.japanese,person?.short].map(norm).filter(Boolean);
  const hit=profs.find(v=>{
   if(isLocal){const tags=[v.id,v.slot,v.name,v.shortName,...(v.aliases||[])].map(norm);return cands.some(c=>tags.includes(c))}
   return text&&(v.name===text||v.shortName===text||(person&&L.find(v.name)?.id===person.id));
  });
  return hit?profileValue(hit):'';
 }
 function actorFor(scene){return C.actorFor(W().project,scene,scene.speaker)}
 function language(line){return line.speech?.language||$('#ttsLanguage').value}
 function useScene(){
  const s=W().currentScene;target={projectId:W().project.id,sceneId:s.id};$('#ttsSingleLanguage').value=language(s);$('#ttsText').value=C.spokenText(s,language(s));singleSegments?.sync();
  window.StoryAI?.previewSpeech(W().project,s.id);
  $('#ttsActor').replaceChildren(new Option('不修改嘴型',''),...s.characters.map(c=>new Option(W().project.assets.find(a=>a.id===c.asset)?.name||'角色',c.id)));$('#ttsActor').value=actorFor(s);
  const v=voiceFor(s.speaker);if(v&&['fish','gptsovits'].includes($('#ttsProvider').value)){$('#ttsVoiceID').value=v;$('#ttsVoiceProfile').value=activeProfiles().find(p=>profileValue(p)===v)?.id||''}
  result=null;$('#ttsApply').disabled=$('#ttsDownload').disabled=true;$('#ttsAudio').pause();$('#ttsAudio').hidden=true;if(audioURL){URL.revokeObjectURL(audioURL);audioURL=''}
  status('当前分镜：'+s.label+(!$('#ttsText').value.trim()?'。缺少所选语言台词：请直接填写、补全日语，或选择中文字幕。':s.captions?.length?'。定时字幕可在批量队列逐句配音。':''));
 }
 function lock(busy){for(const id of ['ttsGenerate','ttsPrepare','ttsStartBatch','ttsRemember','ttsUseText'])$('#'+id).disabled=busy||(id==='ttsStartBatch'&&!queue.length);$('#ttsApply').disabled=busy||!result;$('#ttsCancel').disabled=!busy;for(const id of ['ttsSingle','ttsQueue','ttsConnection','ttsLanguage','ttsIncludeExisting'])$('#'+id).inert=busy;}
 async function synthesize(text,voice,signal,speech,textLang){
  if(!text.trim())throw Error('朗读台词为空，请填写后再合成。');const c=connection();if(speech?.language==='segments')StorySpeech.compile(speech,c.provider==='gptsovits'?'openai':c.provider);keys.set(c.provider,c.apiKey);remember();
  const r=await fetch('/api/story-voice/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connection:c,text,voice,...(speech?.language==='segments'?{speech}:{}),textLang:textLang==='ja'||textLang==='zh'?textLang:'auto',speed:Number($('#ttsSpeed').value)}),signal});if(!r.ok){const v=await r.json();throw Error(v.error||'配音服务请求失败')}
  const mimeType=r.headers.get('content-type')||'audio/mpeg';
  const blob=await r.blob(),bytes=new Uint8Array(await blob.arrayBuffer());let duration=0;const url=URL.createObjectURL(blob);
  try{const a=new Audio();a.preload='metadata';duration=await new Promise(resolve=>{const timer=setTimeout(()=>{a.src='';resolve(0)},8000);a.onloadedmetadata=()=>{clearTimeout(timer);resolve(Number.isFinite(a.duration)?a.duration:0)};a.onerror=()=>{clearTimeout(timer);resolve(0)};a.src=url});}finally{URL.revokeObjectURL(url)}
  return{bytes,duration,text,voice,mimeType:blob.type||mimeType,provider:c.provider,model:c.model,...(speech?.language==='segments'?{speech:C.copy(speech)}:{})};
 }
 function attach(scene,voice,actorId,fit,captionIndex){
  const p=W().project;if(p.assets.length>=3000)throw Error('素材已达上限，请先清理或拆分工程');
  const id=C.uid(),ext=/wav/i.test(voice.mimeType)?'wav':'mp3',path='imports/'+id+'/ai-voice.'+ext,line=captionIndex===undefined?scene:scene.captions[captionIndex],at=captionIndex===undefined?0:line.at;
  const speechLanguage=voice.language||'custom',asset={id,kind:'audio',source:'import',name:'AI 配音 · '+(line.speaker||scene.label),path,generated:{type:'AI 合成配音',provider:voice.provider,model:voice.model,voice:voice.voice,text:line.text,original:line.original||'',spokenText:voice.text,language:speechLanguage,...(voice.speech?{speech:C.copy(voice.speech)}:{}),duration:voice.duration,captionIndex,actorId:actorId||'',createdAt:new Date().toISOString()}};
  const check=C.copy(p),s=check.scenes.find(s=>s.id===scene.id),copyLine=captionIndex===undefined?s:s.captions[captionIndex];copyLine.speech=voice.speech?C.copy(voice.speech):{language:speechLanguage,...(speechLanguage==='custom'?{text:voice.text}:{})};check.assets.push(asset);
  if(captionIndex===undefined)s.voice=id;else{s.voiceClips??=[];s.voiceClips=s.voiceClips.filter(v=>v.captionIndex!==captionIndex);s.voiceClips.push({id:C.uid(),asset:id,captionIndex,at,duration:Math.max(.1,voice.duration||line.duration),text:line.text})}
  if(fit&&voice.duration>0){s.duration=Math.min(3600,Math.max(s.duration,at+voice.duration+.2));const c=s.characters.find(c=>c.id===actorId);if(c){c.cues??=[];const manual=c.cues.filter(q=>q.channel==='mouth'&&!q.generated);if(!manual.length){const intervals=[...c.cues.filter(q=>q.channel==='mouth'&&q.generated),{at,duration:voice.duration}].sort((a,b)=>a.at-b.at),merged=[];for(const q of intervals){const last=merged.at(-1);if(last&&q.at<=last.at+last.duration)last.duration=Math.max(last.at+last.duration,q.at+q.duration)-last.at;else merged.push({channel:'mouth',at:q.at,duration:q.duration,animation:'',enabled:true,loop:true,generated:'ai-voice'})}c.cues=[...c.cues.filter(q=>q.channel!=='mouth'),...merged];c.talking=false}}}
  C.validate(check);p.assets.push(asset);Object.assign(scene,s);W().files.set(path,voice.bytes);W().markChanged();return asset;
 }
 async function single(){
  if(controller)return;const text=$('#ttsText').value;if(!text.trim())return status('朗读台词为空：请填写日语、选择中文字幕，或输入任意语言的台词。');
  const line=W().project.scenes.find(s=>s.id===target?.sceneId);if(!line)return status('原分镜不存在，请重新读取当前台词。');const snapshot=JSON.stringify([line.text,line.original||'',line.speech]),choice=$('#ttsSingleLanguage').value;
  controller=new AbortController();lock(true);const start=Date.now(),timer=setInterval(()=>status('正在合成 · '+Math.floor((Date.now()-start)/1000)+' 秒 · 可停止，原配音保留'),1000);
  try{result={...await synthesize(text,$('#ttsVoiceID').value,controller.signal,choice==='segments'?line.speech:undefined,choice),language:choice==='segments'?'segments':choice==='custom'||text!==C.spokenText(line,choice)?'custom':choice,snapshot};if(controller.signal.aborted)throw new DOMException('已停止','AbortError');if(audioURL)URL.revokeObjectURL(audioURL);audioURL=URL.createObjectURL(new Blob([result.bytes],{type:result.mimeType||'audio/mpeg'}));$('#ttsAudio').src=audioURL;$('#ttsAudio').hidden=false;$('#ttsDownload').disabled=false;$('#ttsDownload').textContent=/wav/i.test(result.mimeType)?'下载配音 WAV':'下载配音 MP3';$('#ttsAudio').play().catch(()=>{});status('配音已生成'+(result.duration?' · '+result.duration.toFixed(1)+' 秒':'')+'。试听后点击“加入当前分镜”。')}
  catch(e){result=null;status(e.name==='AbortError'?'已停止；原有配音保持原样。':e.message)}finally{clearInterval(timer);controller=null;lock(false)}
 }
 async function apply(){if(!result||controller)return;if(W().project.id!==target?.projectId)return status('工程已变更，请重新打开配音窗口');const scene=W().project.scenes.find(s=>s.id===target.sceneId);if(!scene)return status('原分镜已删除，请重新选取分镜');if(result.snapshot!==JSON.stringify([scene.text,scene.original||'',scene.speech]))return status('分镜台词已修改，请重新合成，避免声音与字幕不一致。');try{attach(scene,result,$('#ttsActor').value,$('#ttsFitDuration').checked);W().refresh();status('已加入「'+scene.label+'」。保存作品即可带走配音；画面字幕保持原样。');result=null;$('#ttsApply').disabled=true}catch(e){status('未加入：'+e.message)}}
 function currentVoice(p,s,line,captionIndex){const id=captionIndex===undefined?s.voice:s.voiceClips?.find(v=>v.captionIndex===captionIndex&&v.text===line.text)?.asset;const a=p.assets.find(a=>a.id===id);return a&&C.voiceCurrent(a,line)?a:null}
 function languageOptions(select){select.append(new Option('日语台词','ja'),new Option('中文字幕','zh'),new Option('自定义朗读 · 任意语言','custom'),new Option('日语段＋中文段 · 整句合成','segments'))}
 function prepare(){
  queue=[];const p=W().project;target={projectId:p.id,sceneId:target?.projectId===p.id?target.sceneId:W().currentScene.id};const host=$('#ttsQueue');host.replaceChildren();let skipped=0;
  for(const s of p.scenes){const lines=[];if(s.text.trim()&&!(s.captions||[]).some(c=>c.at===0))lines.push({line:s,captionIndex:undefined});(s.captions||[]).forEach((line,captionIndex)=>{if(line.text.trim())lines.push({line,captionIndex})});
   for(const {line,captionIndex}of lines){const existing=currentVoice(p,s,line,captionIndex);if(existing&&!$('#ttsIncludeExisting').checked){skipped++;continue}if(queue.length>=100)break;
    const currentLine=()=>{const scene=W().project.scenes.find(c=>c.id===s.id);return captionIndex===undefined?scene:scene?.captions?.[captionIndex]},actorId=actorFor({...s,speaker:line.speaker}),entry={sceneId:s.id,actorId,text:line.text,speaker:line.speaker,captionIndex},row=document.createElement('div');row.className='tts-queue-row';row.addEventListener('focusin',()=>{if(row.contains(document.activeElement)&&row.dataset.previewActive==='true')return;for(const other of host.children)delete other.dataset.previewActive;row.dataset.previewActive='true';window.StoryAI?.previewSpeech(W().project,s.id,captionIndex)});
    const check=document.createElement('input');check.type='checkbox';check.checked=!existing&&!!line.aiVoice;check.setAttribute('aria-label','为 '+s.label+' '+(captionIndex===undefined?'默认台词':'字幕 '+(captionIndex+1))+' 配音');check.onchange=()=>{const live=currentLine();if(live)live.aiVoice=check.checked;W().markChanged()};
    const copy=document.createElement('div'),title=document.createElement('strong'),subtitle=document.createElement('p'),note=document.createElement('small'),lang=document.createElement('select'),reading=document.createElement('textarea');title.textContent=(line.speaker||s.label)+(captionIndex===undefined?'':' · '+line.at+' 秒');subtitle.textContent='画面字幕：'+line.text;lang.setAttribute('aria-label','朗读来源');languageOptions(lang);lang.value=language(line);reading.value=C.spokenText(line,lang.value);reading.rows=3;reading.maxLength=10000;reading.setAttribute('aria-label',(line.speaker||s.label)+' 的朗读台词');reading.placeholder='可直接输入任意语言；合成会逐字读取此框内容。';
    const hint=()=>note.textContent=existing&&!entry.edited?'已有配音 · 可修改台词后重新生成':reading.value.trim()?'只朗读上框内容，画面字幕保持原样':'缺少日语台词：请填写、补译，或切换中文字幕';hint();
    reading.oninput=()=>{const live=currentLine();if(!live)return;live.speech={language:'custom',text:reading.value};lang.value='custom';entry.edited=true;check.disabled=false;hint();W().markChanged()};
    lang.onchange=()=>{const live=currentLine();if(!live)return;const previous=reading.value;live.speech={language:lang.value,...(lang.value==='custom'?{text:previous}:{})};reading.value=C.spokenText(live,lang.value);entry.edited=true;check.disabled=false;hint();W().markChanged()};copy.className='tts-queue-content';copy.append(lang,reading,note);
    const segments=StorySpeechEditor.create({host:copy,textarea:reading,languageSelect:lang,getSpeech:()=>currentLine()?.speech,onChange:speech=>{const live=currentLine();if(!live)return;live.speech=speech;entry.edited=true;check.disabled=false;hint();W().markChanged()}});const plainInput=reading.oninput;reading.oninput=()=>{plainInput();segments.sync()};const plainChange=lang.onchange;lang.onchange=()=>{if(lang.value==='segments'){const live=currentLine();if(!live)return;if(live.speech?.language!=='segments')live.speech={language:'segments',segments:[{language:'ja',text:reading.value,reading:''}]};reading.value=C.spokenText(live);entry.edited=true;check.disabled=false;W().markChanged()}else plainChange();segments.sync()};
    const profs=activeProfiles(),settings=document.createElement('div'),select=document.createElement('select'),voice=document.createElement('input');select.setAttribute('aria-label',(line.speaker||s.label)+' 的角色音色');select.append(new Option('自定义音色',''),...profs.map(v=>new Option(v.name+' · '+profileValue(v),profileValue(v))));voice.setAttribute('list','ttsVoiceList');voice.setAttribute('aria-label',(line.speaker||s.label)+' 的音色 ID');voice.placeholder='自定义音色 ID';voice.value=['fish','gptsovits'].includes($('#ttsProvider').value)?voiceFor(line.speaker):'';select.value=voice.value;select.onchange=()=>voice.value=select.value;settings.className='tts-queue-voice';settings.append(select,voice);const heading=document.createElement('div');heading.className='tts-queue-heading';heading.append(title,subtitle);row.append(check,heading,copy,settings);host.append(row);Object.assign(entry,{check,voice,note,reading,language:lang});queue.push(entry);
   }
  }$('#ttsStartBatch').disabled=!queue.length;updateBatchDownload();$('#ttsProgress').hidden=true;status('队列 '+queue.length+' 句，跳过 '+skipped+' 句已有配音。勾选后只朗读每句框里的内容；单批最多 100 句。');
 }
 function updateBatchDownload(){const p=W()?.project,files=W()?.files;const count=p&&files?p.assets.filter(a=>a.kind==='audio'&&a.path&&files.has(a.path)).length:0;const btn=$('#ttsBatchDownload');if(btn){btn.disabled=!count;btn.textContent=count?'下载批量配音 ('+count+' 句 · ZIP)':'下载批量配音 (ZIP)'}}
 function downloadBatchVoices(){const p=W()?.project,files=W()?.files;if(!p||!files)return;const voiceAssets=p.assets.filter(a=>a.kind==='audio'&&a.path&&files.has(a.path));if(!voiceAssets.length){status('当前工程中尚无可下载的配音音频');return}const zipData={};voiceAssets.forEach((asset,idx)=>{const bytes=files.get(asset.path);if(!bytes)return;const speaker=(asset.name||'配音').replace(/^AI 配音 · /,'').replace(/[\\/:*?"<>|]/g,'');const textSnippet=(asset.generated?.text||asset.generated?.spokenText||'').replace(/[\\/:*?"<>|]/g,'').slice(0,12);const ext=(asset.path||'').toLowerCase().endsWith('.wav')?'.wav':'.mp3';const filename=String(idx+1).padStart(2,'0')+'_'+speaker+(textSnippet?'_'+textSnippet:'')+ext;zipData[filename]=bytes});if(window.fflate?.zipSync){const zipped=window.fflate.zipSync(zipData);const blob=new Blob([zipped],{type:'application/zip'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(p.title||'怪文书')+'_AI配音包.zip';a.click();URL.revokeObjectURL(url);status('已下载 '+voiceAssets.length+' 条配音为 ZIP 压缩包')}else{for(const [fn,b] of Object.entries(zipData)){const blob=new Blob([b],{type:fn.endsWith('.wav')?'audio/wav':'audio/mpeg'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fn;a.click();URL.revokeObjectURL(url)}status('已下载 '+voiceAssets.length+' 条配音文件')}}
 async function batch(){
  if(controller)return;const selected=queue.filter(q=>q.check.checked);if(!selected.length)return status('请勾选至少一句台词');if(selected.some(q=>!q.reading.value.trim()))return status('有勾选台词缺少朗读文本：请填写，或选择中文字幕。');if(selected.some(q=>!q.voice.value.trim()))return status('请先为勾选的每句填写音色 ID');if(W().project.id!==target.projectId)return status('工程已变更，请重新读取队列');
  controller=new AbortController();lock(true);$('#ttsProgress').hidden=false;$('#ttsProgress').max=selected.length;$('#ttsProgress').value=0;let done=0;
  try{for(const q of selected){if(controller.signal.aborted)throw new DOMException('已停止','AbortError');const scene=W().project.scenes.find(s=>s.id===q.sceneId),line=q.captionIndex===undefined?scene:scene?.captions?.[q.captionIndex];if(!line||line.text!==q.text)throw Error('台词已修改，请重新读取队列，避免声音与字幕不一致');const spoken=q.reading.value,lang=q.language.value,snapshot=JSON.stringify([line.text,line.original||'',line.speech]);q.note.textContent='正在生成…';status('正在配音 '+(done+1)+' / '+selected.length+'：'+(line.speaker||scene.label));
    const voice={...await synthesize(spoken,q.voice.value.trim(),controller.signal,lang==='segments'?line.speech:undefined,lang),language:lang};if(controller.signal.aborted)throw new DOMException('已停止','AbortError');if(W().project.id!==target.projectId||snapshot!==JSON.stringify([line.text,line.original||'',line.speech]))throw Error('工程或台词已变更，停止后续配音');attach(scene,voice,q.actorId,$('#ttsFitDuration').checked,q.captionIndex);q.note.textContent='已加入'+(voice.duration?' · '+voice.duration.toFixed(1)+' 秒':'');q.check.checked=false;q.check.disabled=true;done++;$('#ttsProgress').value=done;$('#ttsProgressText').textContent=done+' / '+selected.length;
   }status('已完成 '+done+' 句配音，记得保存作品。')
  }catch(e){status((e.name==='AbortError'?'已停止':e.message)+'；已完成 '+done+' 句保留在工程中。')}finally{controller=null;lock(false);W().refresh();updateBatchDownload()}
 }
 async function open(context,host){
  if(!host){await StoryAI.open();host=document.querySelector('#aiVoiceHost');document.querySelector('#aiVoiceSection').open=true}if(controller)return status('请先停止当前配音队列，再切换配音对象。');activeContext=context||window.StoryWorkshop;
  if(!dialog){const t=document.createElement('template');t.innerHTML=(await fetch('/story-voice-panel.html').then(r=>r.text())).replace('<dialog ','<section ').replace('</dialog>','</section>');host.append(t.content);dialog=$('#storyVoiceDialog');
   try{const cat=await fetch('/api/story-voice/catalog?probe=1').then(r=>r.json());voices=cat.profiles||[];localPack=cat.localPack||null;localVoices=localPack?.voices||[];}catch{voices=(await fetch('/data/story-voice-profiles.json').then(r=>r.json())).profiles;localVoices=await fetch('/data/tts-voice-catalog.json').then(r=>r.json()).then(d=>d.voices||[]).catch(()=>[]);}
   if(!localVoices.length){try{localVoices=(await fetch('/data/tts-voice-catalog.json').then(r=>r.json())).voices||[];}catch{}}
   const savedSettings=read('story-voice-settings',{});
   $('#ttsProvider').value=savedSettings.active||(localPack?.installed&&localPack?.enabled?'gptsovits':'fish');$('#ttsLanguage').value=savedSettings.language||'ja';changeProvider();$('#ttsConnection').open=!savedSettings.active||(localPack?.installed&&!localPack?.apiOnline);
   $('#ttsProvider').onchange=()=>{changeProvider();useScene();prepare()};$('#ttsRemember').onclick=()=>{remember();if($('#ttsProvider').value==='gptsovits')fetch('/api/tts-pack/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiUrl:$('#ttsBaseURL').value.trim()})}).catch(()=>{});status('地址与模型已记住；API Key 仅保留在本次会话内。')};$('#ttsVoiceProfile').onchange=()=>{const v=activeProfiles().find(v=>v.id===$('#ttsVoiceProfile').value);if(v)$('#ttsVoiceID').value=profileValue(v)};
   const d=getDesktop();
   d?.onTtsPackProgress?.(msg=>{if(msg&&$('#ttsPackStatus'))$('#ttsPackStatus').textContent=msg;if(msg)status(msg);});
   $('#ttsPackArchive')?.addEventListener('click',async()=>{const dk=getDesktop();if(!dk?.loadTtsPackArchive)return status('请在桌面版中使用一键部署压缩包功能。');const btn=$('#ttsPackArchive');btn.disabled=true;status('请选择 ShinyStories-TTS-Pack.7z（或分卷压缩包）…');try{const res=await dk.loadTtsPackArchive();if(res?.canceled){await refreshLocalPack(false);return}if(!res?.ok)throw Error(res?.error||'部署失败');renderPackBox(res);$('#ttsProvider').value='gptsovits';changeProvider();remember();useScene();prepare();status('全部 '+res.voiceCount+' 位角色声音已部署！'+(res.apiOnline?'推理引擎在线，可直接合成。':'请启动本机 api_v2.py 或点击「🚀 启动推理引擎」。'))}catch(e){status('部署失败：'+e.message)}finally{btn.disabled=false}});
   $('#ttsPackFolder')?.addEventListener('click',async()=>{const dk=getDesktop();if(!dk?.loadTtsPackFolder)return status('请在桌面版中选择语音文件夹。');const btn=$('#ttsPackFolder');btn.disabled=true;try{const res=await dk.loadTtsPackFolder();if(res?.canceled)return;if(!res?.ok)throw Error(res?.error||'文件夹无效');renderPackBox(res);$('#ttsProvider').value='gptsovits';changeProvider();remember();useScene();prepare();status('已挂载 '+res.voiceCount+' 组偶像声音模型！')}catch(e){status('挂载失败：'+e.message)}finally{btn.disabled=false}});
   $('#ttsPackRuntime')?.addEventListener('click',async()=>{const dk=getDesktop();if(!dk?.pickTtsRuntimeFolder)return status('请在桌面版中选择 GPT-SoVITS 目录。');const res=await dk.pickTtsRuntimeFolder();if(res?.canceled)return;if(res?.ok){status('已记住 GPT-SoVITS 目录：'+res.runtimeDir);await refreshLocalPack(false)}else status(res?.error||'目录无效')});
   $('#ttsPackLaunch')?.addEventListener('click',async()=>{const btn=$('#ttsPackLaunch');btn.disabled=true;status('正在后台启动 GPT-SoVITS v4 推理引擎，请稍候…');try{const dk=getDesktop();const res=dk?.launchTtsRuntime?await dk.launchTtsRuntime():await(await fetch('/api/tts-pack/launch',{method:'POST'})).json();if(!res?.ok)throw Error(res?.error||'启动失败');await refreshLocalPack(true);status(res.alreadyRunning?'GPT-SoVITS 推理引擎已在运行！可直接生成配音。':'GPT-SoVITS 推理引擎已启动就绪！可直接生成配音。')}catch(e){status(e.message)}finally{btn.disabled=false}});
   $('#ttsImportVoices').onclick=async()=>{const b=$('#ttsImportVoices');b.disabled=true;status('正在读取公开角色音色…');try{const r=await fetch('/api/story-voice/catalog?refresh=1'),v=await r.json();if(!r.ok)throw Error(v.error);voices=v.profiles;CreativePreferences.write('story-voice-profiles',JSON.stringify(voices));renderVoices();useScene();prepare();status('已读取 '+voices.length+' 个角色音色；可用性由配音服务决定。')}catch(e){status(e.message+'。也可以手动填写自己的音色 ID。')}finally{b.disabled=false}};
   $('#ttsLanguage').onchange=()=>{remember();useScene();prepare()};$('#ttsIncludeExisting').onchange=prepare;
   singleSegments=StorySpeechEditor.create({host:$('#ttsSingleSegments'),textarea:$('#ttsText'),languageSelect:$('#ttsSingleLanguage'),getSpeech:()=>W().project.scenes.find(s=>s.id===target?.sceneId)?.speech,onChange:speech=>{const line=W().project.scenes.find(s=>s.id===target?.sceneId);if(!line)return;line.speech=speech;result=null;$('#ttsApply').disabled=true;W().markChanged()}});
   $('#ttsSingleLanguage').onchange=()=>{const line=W().project.scenes.find(s=>s.id===target?.sceneId);if(!line)return;const lang=$('#ttsSingleLanguage').value;if(lang==='segments'){if(line.speech?.language!=='segments')line.speech={language:'segments',segments:[{language:'ja',text:$('#ttsText').value,reading:''}]}}else{line.speech={language:lang,...(lang==='custom'?{text:$('#ttsText').value}:{})}}$('#ttsText').value=C.spokenText(line,lang);result=null;$('#ttsApply').disabled=true;W().markChanged();singleSegments.sync()};
   $('#ttsText').oninput=()=>{const line=W().project.scenes.find(s=>s.id===target?.sceneId);if(!line)return;line.speech={language:'custom',text:$('#ttsText').value};$('#ttsSingleLanguage').value='custom';result=null;$('#ttsApply').disabled=true;W().markChanged();singleSegments.sync()};
   $('#ttsGenerate').onclick=single;$('#ttsApply').onclick=apply;$('#ttsUseText').onclick=useScene;$('#ttsCancel').onclick=()=>controller?.abort();$('#ttsPrepare').onclick=prepare;$('#ttsStartBatch').onclick=batch;$('#ttsBatchDownload').onclick=downloadBatchVoices;$('#ttsClose').onclick=()=>document.querySelector('#aiVoiceSection').open=false;$('#ttsDownload').onclick=()=>{if(!audioURL)return;const a=document.createElement('a');a.href=audioURL;a.download=/wav/i.test(result?.mimeType)?'AI合成配音.wav':'AI合成配音.mp3';a.click()};
   for(const [id,batchMode]of [['ttsSingleTab',false],['ttsBatchTab',true]])$('#'+id).onclick=()=>{$('#ttsSingle').hidden=batchMode;$('#ttsBatch').hidden=!batchMode;if(batchMode)updateBatchDownload();$('#ttsSingleTab').setAttribute('aria-pressed',String(!batchMode));$('#ttsBatchTab').setAttribute('aria-pressed',String(batchMode))};
  }else if(dialog.parentElement!==host)host.append(dialog);
  $('#ttsSelectAll').onclick=()=>{for(const q of queue){if(q.check.disabled)continue;q.check.checked=true;q.check.dispatchEvent(new Event('change'))}};$('#ttsSelectNone').onclick=()=>{for(const q of queue){q.check.checked=false;q.check.dispatchEvent(new Event('change'))}};$('#ttsDeselectProducer').onclick=()=>{let count=0;for(const q of queue)if(/^(制作人|製作人|プロデューサー|producer|p)([（(][^）)]*[）)])?$/i.test(String(q.speaker||'').replace(/[\s　]/g,''))){if(q.check.checked)count++;q.check.checked=false;q.check.dispatchEvent(new Event('change'))}status('已取消勾选 '+count+' 句制作人台词；其他角色的勾选保持原样。')};refreshLocalPack(true);useScene();prepare();
 }
 document.addEventListener('close',e=>{if(e.target.id==='storyAIDialog'){controller?.abort();$('#ttsAudio')?.pause()}},true);
 window.StoryVoice={open,single,apply,prepare,batch,attach,get busy(){return !!controller},get result(){return result},get queue(){return queue}};
})();
