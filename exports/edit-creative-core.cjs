const fs=require('fs');
function edit(path,fn){const before=fs.readFileSync(path,'utf8'),after=fn(before);if(before===after)throw Error('No change: '+path);fs.writeFileSync(path,after)}
function r(s,a,b){if(!s.includes(a))throw Error('Missing: '+a.slice(0,90));return s.replace(a,b)}
edit('public/story-ai-core.js',s=>{
 s=r(s,'const p=C.project();','const stable=x=>typeof x===\'string\'&&/^[\\w-]{1,80}$/.test(x)?x:C.uid();const p=C.project();');
 s=r(s,"p.assets=materials.map(({animations,...a})=>C.copy(a));","p.assets=materials.map(({animations,...a})=>C.copy(a));if(draft.music)p.music={...C.copy(draft.music),asset:ref(draft.music.asset,['audio'])};");
 s=r(s,"const scene={...C.scene(),label:","const scene={...C.scene(),id:stable(s.id),label:");
 s=r(s,"if(s.captions!==undefined)","if(s.bgm)scene.bgm={...C.copy(s.bgm),...(s.bgm.mode==='switch'?{asset:ref(s.bgm.asset,['audio'])}:{})};else if(s.music)scene.bgm={mode:'switch',asset:scene.music,start:0,volume:scene.volume,loop:true};if(s.aiVoice!==undefined)scene.aiVoice=!!s.aiVoice;if(s.voiceClips)scene.voiceClips=C.copy(s.voiceClips);if(s.captions!==undefined)");
 s=r(s,"({at:number(r.at,0),duration:number(r.duration,2),speaker:string(r.speaker),text:string(r.text)})","({...C.copy(r),at:number(r.at,0),duration:number(r.duration,2),speaker:string(r.speaker),text:string(r.text)})");
 s=r(s,"const actor={id:C.uid(),asset:id","const actor={id:stable(c.id),asset:id");
 s=r(s,'p.scenes.push(scene)',`if(scene.bgm?.asset)scene.bgm.asset=mapping.get(scene.bgm.asset);if(scene.voiceClips)scene.voiceClips.forEach(v=>{v.asset=mapping.get(v.asset)});if(generated.music?.asset&&generated.music.enabled!==false&&(generated.scenes.indexOf(s)===0&&scene.bgm?.mode==='inherit'||scene.bgm?.mode==='global'))scene.bgm={...C.copy(generated.music),mode:'switch',asset:mapping.get(generated.music.asset)};p.scenes.push(scene)`);
 const at=s.indexOf(' function messages(');
 s=s.slice(0,at)+` function direct(project,patch,ids,materials){
  if(!patch||!Array.isArray(patch.changes)||!patch.changes.length||patch.changes.length>ids.length)throw Error('导演结果需包含非空 changes 数组，数量不能超出选定分镜');
  const p=C.copy(project),seen=new Set(),allowed=new Set(ids),fields=new Set(['label','speaker','text','duration','background','music','bgm','voice','sound','volume','characters','captions']);
  for(const change of patch.changes){if(!allowed.has(change.sceneId)||seen.has(change.sceneId))throw Error('导演修改越过选定范围或重复修改分镜');seen.add(change.sceneId);if(!change.scene||typeof change.scene!=='object'||Array.isArray(change.scene)||Object.keys(change.scene).some(k=>!fields.has(k)))throw Error('导演返回不支持的修改字段');const i=p.scenes.findIndex(s=>s.id===change.sceneId);if(i<0)throw Error('分镜已不存在');const merged={...p.scenes[i],...C.copy(change.scene),id:change.sceneId};if(change.scene.characters)merged.characters=change.scene.characters.map(c=>({...p.scenes[i].characters.find(x=>x.id===c.id),...c}));const compiled=compile({title:p.title,scenes:[merged]},materials);p.scenes[i]=compiled.project.scenes[0];}
  for(const a of materials)if(!p.assets.some(x=>x.id===a.id)){const {animations,...asset}=a;p.assets.push(C.copy(asset))}return C.validate(p);
 }
`+s.slice(at);
 s=r(s,'const api={parse,compile,append,messages}','const api={parse,compile,append,messages,direct}');
 s=r(s,"'生成简洁、可编辑的演出，", "'BGM 可在顶层 music 指定全局默认 {asset,start,volume,loop,enabled:true}，分镜 bgm 为 {mode:inherit} 接续，或 {mode:switch,asset,start,volume,loop} 在该镜切曲；stop 停止，global 回到全局。不要给每句都重新起播音乐。'+\n   '生成简洁、可编辑的演出，");
 return s;
});
edit('public/story-ai.js',s=>r(s,'acceptDraft,showScene,connection,','acceptDraft,showScene,connection,enrich,'));
edit('public/custom-story.html',s=>r(s,'<script src="story-ai.js"></script>','<script src="story-ai.js"></script><script src="story-director.js"></script>'));
edit('public/story-ai.css',s=>s+`\n.ai-capabilities{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}.ai-capabilities a{padding:8px 12px;border-radius:12px;background:#f3e7ef;text-decoration:none;color:#925b79}.ai-director,#aiVoiceSection{padding:16px;border:1px solid #ded4e3;background:#fbf8fc;border-radius:18px;display:grid;gap:12px}.ai-director h3{margin:0}#aiDirectorPatch{font:12px/1.5 Consolas,monospace}#storyAIDialog [hidden]{display:none!important}#aiVoiceSection>summary{cursor:pointer;font-weight:700}#aiVoiceHost .story-voice-dialog{width:auto;max-height:none;padding:0;border:none}#aiVoiceHost .dialog-heading{display:none}#aiVoiceHost #ttsQueue{max-height:50vh}#aiBrowseMaterials{width:100%;min-height:50px}.ai-materials{max-height:220px;overflow:auto}\n`);
