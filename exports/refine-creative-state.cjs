const fs=require('fs');function edit(p,fn){fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')))}
edit('public/story-ai.js',s=>{
 const from=s.indexOf(' async function validate()'),to=s.indexOf('\n async function loadModels()',from);if(from<0||to<0)throw Error('validate boundaries');
 s=s.slice(0,from)+` async function present(warnings=[]){lastError='';$('#aiValidation').textContent='校验通过 · '+candidate.scenes.length+' 个分镜 · '+candidate.assets.length+' 项素材'+(warnings.length?'\\n'+warnings.join('\\n'):'');$('#aiSceneList').replaceChildren();candidate.scenes.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.textContent=(i+1)+' · '+s.label;b.onclick=()=>showScene(i);$('#aiSceneList').append(b)});$('#aiDirectorFrom').max=$('#aiDirectorTo').max=candidate.scenes.length;$('#aiApply').disabled=false;$('#aiApplyPlay').disabled=false;await showScene(0)}
 async function validate(){if(window.StoryVoice?.busy)return status('请先停止配音，再替换分镜草稿。');try{const compiled=A.compile($('#aiScript').value,materials);candidate=compiled.project;await present(compiled.warnings);return true}catch(e){candidate=null;lastError=e.message;$('#aiValidation').textContent='需要调整：'+e.message;$('#aiApply').disabled=true;$('#aiApplyPlay').disabled=true;return false}}
`+s.slice(to);
 s=s.replace('if(requestController)return;const conn=connection();',"if(requestController)return;if(window.StoryVoice?.busy)return status('请先停止配音，再生成新的分镜。');const conn=connection();");
 s=s.replace('if(!candidate||requestController)return;const generated=',"if(!candidate||requestController)return;if(window.StoryVoice?.busy)return status('请等待配音结束，或先停止生成。');const generated=");
 s=s.replace('async function acceptDraft(p,files){C.validate(p);',"async function acceptDraft(p,files){if(window.StoryVoice?.busy)throw Error('请先停止配音，再替换分镜草稿');C.validate(p);");
 s=s.replace('await validate();saveDraft()}','await present();saveDraft()}');
 s=s.replace('p.assets.slice(0,24).map(a=>({...a}))','p.assets.map(a=>({...a}))');
 s=s.replace("$('#aiLoadProject').onclick=()=>acceptDraft(W().project,W().files).then(()=>status('工程已复制为草稿；导演修改不会立即改变编辑器。'));","$('#aiLoadProject').onclick=()=>acceptDraft(W().project,W().files).then(()=>status('工程已复制为草稿；导演修改不会立即改变编辑器。')).catch(e=>status(e.message));");
 return s;
});
edit('public/story-voice.js',s=>s.replace('get result(){return result}', 'get busy(){return !!controller},get result(){return result}'));
edit('public/story-director.js',s=>s.replace('if(A().busy)return;const controller=',"if(A().busy)return;if(window.StoryVoice?.busy)return A().status('请先停止配音，再修改分镜。');const controller="));
fs.writeFileSync('scripts/render-workshop-ai-tutorial.cjs',"// Current AI, director, voice and music walkthrough lives in one maintained renderer.\nrequire('./render-workshop-creative-next.cjs');\n");
edit('scripts/test-story-creative-next.cjs',s=>s.replace("if(!StoryAI.candidateFiles.size)throw Error('Draft voice bytes missing');", "if(!StoryAI.candidateFiles.size)throw Error('Draft voice bytes missing');document.querySelector('#ttsUseText').click();document.querySelector('#ttsText').value='単独の音声';await StoryVoice.single();await StoryVoice.apply();if(!StoryAI.candidate.scenes[0].voice)throw Error('Reading queue lost current scene for single voice');").replace('assert.equal(voiceCalls,1);','assert.equal(voiceCalls,2);'));
