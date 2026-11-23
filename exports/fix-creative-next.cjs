const fs=require('fs');
function edit(path,fn){const before=fs.readFileSync(path,'utf8'),after=fn(before);if(before===after)throw Error('No change: '+path);fs.writeFileSync(path,after)}
function r(s,a,b){if(!s.includes(a))throw Error('Missing: '+a.slice(0,90));return s.replace(a,b)}
edit('public/story-music-editor.js',s=>{
 s=r(s,"music.value=b.asset||s.music||'';$('#sceneMusicFields').hidden=$('#sceneMusicOptions').hidden=b.mode!=='switch';const plan=StoryMusic.plan(p,p.scenes.indexOf(s));", "const plan=StoryMusic.plan(p,p.scenes.indexOf(s));music.value=plan?.asset||b.asset||s.music||'';$('#sceneMusicFields').hidden=false;$('#sceneMusicOptions').hidden=false;const effective=effectiveConfig();$('#sceneMusicStart').value=effective.start??0;$('#sceneMusicVolume').value=effective.volume??70;$('#sceneMusicLoop').checked=effective.loop!==false;");
 s=r(s,' function dirty()'," function effectiveGlobal(){return !!W().project.music?.asset&&W().project.music.enabled!==false&&['inherit','global'].includes(W().currentScene.bgm?.mode||'inherit')&&StoryMusic.plan(W().project,W().project.scenes.indexOf(W().currentScene))?.key===W().project.id+':global'}\n function effectiveConfig(){return config(effectiveGlobal())}\n function dirty()");
 s=r(s,"config(global)[key]=key==='loop'?e.target.checked:Number(e.target.value)","config(global||effectiveGlobal())[key]=key==='loop'?e.target.checked:Number(e.target.value)");
 s=r(s,"const c=config(global),a=W().project.assets.find", "const useGlobal=global||effectiveGlobal(),c=config(useGlobal),a=W().project.assets.find");
 s=r(s,"auditionTarget={global,sceneId", "auditionTarget={global:useGlobal,sceneId");
 // A disabled default should leave this scene's chosen music available.
 s=r(s,"}else g.enabled=false;dirty()", "}else{g.enabled=false;const b=config(false);b.mode='switch';b.asset=b.asset||W().currentScene.music||g.asset}dirty()");
 return s;
});
edit('public/custom-story.js',s=>r(s,"current()[pickerTarget&&['music','voice','sound'].includes(pickerTarget)?pickerTarget:'music']=a.id", "const target=pickerTarget&&['music','voice','sound'].includes(pickerTarget)?pickerTarget:'music';current()[target]=a.id;if(target==='music')current().bgm={mode:'switch',asset:a.id,start:0,volume:70,loop:true}"));
edit('public/story-voice.js',s=>{
 // Switching targets while generating must leave the original context intact.
 s=r(s,"activeContext=context||window.StoryWorkshop;if(controller)return", "if(controller)return");
 s=r(s,"status('请先停止当前配音队列，再切换配音对象。');if(!dialog)", "status('请先停止当前配音队列，再切换配音对象。');activeContext=context||window.StoryWorkshop;if(!dialog)");
 s=r(s,"fetch('/api/story-voice/catalog')","fetch('/api/story-voice/catalog?refresh=1')");return s;
});
edit('public/story-ai.js',s=>{
 s=r(s,"if(a.source==='import')json=JSON.parse(fflate.strFromU8(W().files.get(a.path)));", "if(a.source==='import')json=JSON.parse(fflate.strFromU8(candidateFiles.get(a.path)||W().files.get(a.path)));");
 s=r(s,"const type=/\\.json$/.test(path)?'application/json'", "const type=/\\.(mp3|m4a|wav|ogg)$/.test(path)?(/\\.wav$/.test(path)?'audio/wav':/\\.m4a$/.test(path)?'audio/mp4':'audio/mpeg'):/\\.json$/.test(path)?'application/json'");
 s=r(s,"'aiApply','aiApplyPlay'])", "'aiApply','aiApplyPlay','aiDirect','aiDirectorApplyPatch','aiLoadProject','aiOpenVoice','aiValidate','aiBrowseMaterials'])");
 return s;
});
