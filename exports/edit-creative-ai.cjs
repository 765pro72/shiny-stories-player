const fs=require('fs');
function edit(path,fn){const before=fs.readFileSync(path,'utf8'),after=fn(before);if(before===after)throw Error('No change: '+path);fs.writeFileSync(path,after)}
function replace(s,a,b){if(!s.includes(a))throw Error('Missing: '+a.slice(0,100));return s.replace(a,b)}
edit('public/story-music-editor.js',s=>{
 s=replace(s,'<details><summary>全局 BGM</summary>','<details><summary>全局 BGM</summary><label class="check"><input id="globalMusicEnabled" type="checkbox">启用默认 BGM</label>');
 s=replace(s,"$('#sceneMusicFields',host);",'');
 s=replace(s,"host.querySelector('#sceneMusicFields').append(label);","host.querySelector('#sceneMusicFields').append(label);const defaultLabel=document.createElement('label');defaultLabel.className='check';defaultLabel.innerHTML='<input id=\"setDefaultMusic\" type=\"checkbox\">设为默认 BGM（后续未指定音乐的分镜自动沿用）';host.querySelector('#sceneMusicFields').after(defaultLabel);");
 s=replace(s,"{asset:'',start:0,volume:70,loop:true}","{enabled:false,asset:'',start:0,volume:70,loop:true}");
 s=replace(s,"$('#globalMusic').value=g.asset||'';","$('#globalMusic').value=g.asset||'';$('#globalMusicEnabled').checked=!!g.asset&&g.enabled!==false;$('#setDefaultMusic').checked=!!g.asset&&g.enabled!==false&&(b.asset||s.music||g.asset)===g.asset;");
 s=replace(s,"$('#globalMusic').onchange",`$('#globalMusicEnabled').onchange=e=>{config(true).enabled=e.target.checked;dirty()};
 $('#setDefaultMusic').onchange=e=>{const g=config(true);if(e.target.checked){const b=config(false),id=b.asset||W().currentScene.music||g.asset;if(!id){e.target.checked=false;return $('#writerStatus').textContent='先选择一首背景音乐，再设为默认。'}Object.assign(g,{asset:id,start:b.start??0,volume:b.volume??70,loop:b.loop!==false,enabled:true});b.mode='inherit'}else g.enabled=false;dirty()};
 $('#globalMusic').onchange`);return s;
});
edit('public/story-ai-panel.html',s=>{
 s=s.replace(/<ol class="ai-steps">.*?<\/ol>/,'<nav class="ai-capabilities"><a href="#aiOutline">提纲与扩写</a><a href="#aiDraft">全文案编排</a><a href="#aiDirector">导演模式</a><a href="#aiVoiceSection">AI 音声</a></nav>');
 const buttons={};s=s.replace(/<button id="(aiExpand|aiGenerate|aiOutlineScript|aiPolish|aiContinue|aiExtract|aiCancel)"[^>]*>.*?<\/button>/g,(all,id)=>{buttons[id]=all;return''});
 s=replace(s,'<label>世界观、',`<div class="ai-buttons">${buttons.aiExpand}${buttons.aiOutlineScript}</div><label>世界观、`);
 s=replace(s,'<details id="aiScriptDetails">',`<div class="ai-buttons">${buttons.aiGenerate}${buttons.aiPolish}${buttons.aiContinue}${buttons.aiExtract}</div><details id="aiScriptDetails">`);
 s=replace(s,'<p id="aiStatus"',buttons.aiCancel+'<p id="aiStatus"');
 s=s.replace(/<div class="field-pair"><select id="aiMaterialKind"[\s\S]*?<div id="aiMaterialResults"><\/div>/,'<button id="aiBrowseMaterials" type="button">打开完整素材库 · 按组合与成员挑选</button>');
 s=replace(s,'<div id="aiSceneList"></div>',`<div id="aiSceneList"></div><section id="aiDirector" class="ai-director"><h3>导演模式 · 直接说怎么改</h3><button id="aiLoadProject" type="button">把当前工程载入为待修改草稿</button><label>修改范围<select id="aiDirectorScope"><option value="current">当前预览分镜</option><option value="range">指定分镜范围</option><option value="all">全部分镜</option></select></label><div class="field-pair" id="aiDirectorRange" hidden><label>从第几镜<input id="aiDirectorFrom" type="number" min="1" value="1"></label><label>到第几镜<input id="aiDirectorTo" type="number" min="1" value="1"></label></div><label>导演指令<textarea id="aiDirection" rows="4" placeholder="例如：把日花移到左边，人物放大到 120%，说到最后一句时微笑；台词保持不变。"></textarea></label><div class="ai-buttons"><button id="aiDirect" class="primary">AI 修改选定分镜</button><button id="aiDirectorPrompt">复制导演提示词</button><button id="aiDirectorApplyPatch">应用粘贴的修改结果</button><button id="aiDirectorUndo" disabled>撤销上次分镜修改</button></div><textarea id="aiDirectorPatch" rows="4" placeholder="无需 API：把聊天 AI 返回的 changes JSON 粘贴到这里。" aria-label="导演修改结果"></textarea><p class="hint">只修改选定范围。先在草稿预览，满意后再加入编辑器；可撤销。没有新脚本也可以直接载入现有工程修改。</p></section><details id="aiVoiceSection"><summary>AI 音声 · 为选中的台词配音</summary><label>配音对象<select id="aiVoiceTarget"><option value="candidate">创作中的分镜草稿</option><option value="project">编辑器当前工程</option></select></label><button id="aiOpenVoice">打开音声创作</button><div id="aiVoiceHost"></div></details>`);
 return s;
});
edit('public/story-ai.js',s=>{
 s=replace(s,'const keys=new Map(),blobURLs=new Map();','const keys=new Map(),blobURLs=new Map(),candidateFiles=new Map();let directorUndo=null;');
 s=replace(s,';renderSearch()}','}');
 s=s.split('\n').filter(l=>!l.startsWith(' function renderSearch()')).join('\n');
 s=replace(s,"$('#aiMaterialSearch').oninput=renderSearch;$('#aiMaterialKind').onchange=renderSearch;",`$('#aiBrowseMaterials').onclick=()=>StoryMaterials.open({kind:'model',multiple:true,selected:materials,projectAssets:W().project.assets,resolve:W().resolve,onDone:rows=>{materials=rows;renderMaterials();saveDraft()}});`);
 s=replace(s,'if(W().files.has(key)){','if(candidateFiles.has(key)||W().files.has(key)){');
 s=replace(s,'new Blob([W().files.get(key)],{type})','new Blob([candidateFiles.get(key)||W().files.get(key)],{type})');
 s=replace(s,"'/asset-original/'+path}","'/asset-original/'+path}"); // retained resolver contract
 s=replace(s,"const compiled=A.compile($('#aiScript').value,materials);candidate=compiled.project;","const compiled=A.compile($('#aiScript').value,materials);candidate=compiled.project;");
 s=replace(s,'files:new Map(W().files)});W().markChanged();', 'files:new Map([...W().files,...candidateFiles])});W().markChanged();');
 s=replace(s,"$('#aiPlayPreview').onclick=()=>preview?.previewMotion();","$('#aiPlayPreview').onclick=()=>{if(preview&&candidate)preview.show(candidate,candidate.scenes[previewIndex],{sound:true})};");
 s=replace(s,"renderMaterials();dialog.showModal();",`renderMaterials();dialog.showModal();initDirector();`);
 s=replace(s,"get candidate(){return candidate}","get candidate(){return candidate},get candidateFiles(){return candidateFiles},get previewIndex(){return previewIndex},acceptDraft,showScene,connection,get busy(){return !!requestController},setBusy(value){requestController=value;lock(!!value)},status");
 const at=s.indexOf(' const button=document.createElement');
 s=s.slice(0,at)+` async function acceptDraft(p,files){C.validate(p);candidate=C.copy(p);if(files){candidateFiles.clear();for(const [path,bytes]of files)candidateFiles.set(path,bytes)}materials=[...new Map([...materials,...candidate.assets].map(a=>[a.id,a])).values()];$('#aiScript').value=JSON.stringify(candidate,null,2);await validate();saveDraft()}
 function initDirector(){
  $('#aiDirectorScope').onchange=()=>$('#aiDirectorRange').hidden=$('#aiDirectorScope').value!=='range';
  $('#aiLoadProject').onclick=()=>acceptDraft(W().project,W().files).then(()=>status('工程已复制为草稿；导演修改不会立即改变编辑器。'));
  $('#aiOpenVoice').onclick=async()=>{const draft=$('#aiVoiceTarget').value==='candidate';if(draft&&!candidate)return status('先粘贴／生成脚本，或点击“把当前工程载入为待修改草稿”。');const context=draft?{get project(){return candidate},get files(){return candidateFiles},get currentScene(){return candidate.scenes[previewIndex]},markChanged(){},refresh(){ $('#aiScript').value=JSON.stringify(candidate,null,2);saveDraft();showScene(previewIndex)}}:W();await StoryVoice.open(context,$('#aiVoiceHost'))};
  window.StoryDirector?.bind();
 }
`+s.slice(at);return s;
});
// Bundle factual voice IDs, keeping provenance. No upstream program code is included.
edit('story-voice-service.cjs',s=>{
 s=replace(s,"if(!catalog){const r=", "if(!catalog&&!url.searchParams.has('refresh')){catalog=require('./data/story-voice-profiles.json').profiles}\n    if(!catalog||url.searchParams.has('refresh')){const r=");return s;
});
