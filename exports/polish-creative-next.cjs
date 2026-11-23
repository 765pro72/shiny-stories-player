const fs=require('fs');
function edit(path,fn){const before=fs.readFileSync(path,'utf8'),after=fn(before);if(before===after)throw Error('No change: '+path);fs.writeFileSync(path,after)}
function r(s,a,b){if(!s.includes(a))throw Error('Missing: '+a.slice(0,90));return s.replace(a,b)}
edit('public/story-materials.js',s=>{
 s=r(s,"query='',page=0", "query='',variant='',page=0");
 s=r(s,"(!query||[a.name", "(!variant||a.name.includes(variant))&&(!query||[a.name");
 s=r(s,"$('#materialMood').hidden=kind!=='bgm';", "$('#materialMood').hidden=kind!=='bgm';$('#materialVariant').hidden=kind!=='model';");
 s=r(s,"member=usage=mood='';page=0;$('#materialMood')", "member=usage=mood=variant='';page=0;$('#materialVariant').value='';$('#materialMood')");
 s=r(s,'<input id="materialSearch"', '<select id="materialVariant" aria-label="模型服装类型"><option value="">全部模型类型</option><option value="日常服装">日常服装</option><option value="舞台服装">舞台服装</option><option value="剧情模型">剧情模型</option><option value="童年">童年模型</option><option value="剪影">剪影模型</option></select><input id="materialSearch"');
 s=r(s,"$('#materialKind').onchange=change;", "$('#materialKind').onchange=change;$('#materialVariant').onchange=e=>{variant=e.target.value;page=0;render()};");
 s=r(s,"dialog.showModal();await change();", "window.dispatchEvent(new Event('story-material-browser-open'));dialog.showModal();await change();");return s;
});
edit('public/story-materials.css',s=>s+'\n.material-controls{grid-template-columns:180px 170px minmax(0,1fr) 140px}.material-controls:has(#materialVariant[hidden]){grid-template-columns:180px minmax(0,1fr) 140px}.material-controls:has(#materialMood[hidden]){grid-template-columns:180px 170px minmax(0,1fr)}.material-controls:has(#materialVariant[hidden]):has(#materialMood[hidden]){grid-template-columns:180px minmax(0,1fr)}@media(max-width:800px){.material-controls,.material-controls:has(#materialVariant[hidden]),.material-controls:has(#materialMood[hidden]),.material-controls:has(#materialVariant[hidden]):has(#materialMood[hidden]){grid-template-columns:1fr 1fr}.material-controls input{grid-column:1/-1}}\n');
edit('public/story-music-editor.js',s=>r(s,"window.addEventListener('pagehide',stop);", "window.addEventListener('pagehide',stop);window.addEventListener('story-material-browser-open',stop);"));
edit('public/story-ai.js',s=>r(s,"async function open(){if(!dialog)","async function open(){W().stop();if(!dialog)"));
// Detect stale AI voice from edited subtitles; imported recordings remain unrestricted.
edit('public/custom-story-stage.js',s=>r(s,"const asset=this.asset(scene[key]);if(!asset)continue;", "const asset=this.asset(scene[key]);if(!asset)continue;if(key==='voice'&&asset.generated?.type==='AI 合成配音'&&asset.generated.text!==undefined&&asset.generated.text!==scene.text){this.status('台词已修改，本句旧 AI 配音已跳过，请重新生成。');continue;}") );
edit('public/story-voice.js',s=>{
 s=r(s,"text:line.text,captionIndex,createdAt:","text:line.text,duration:voice.duration,captionIndex,createdAt:");
 s=r(s,"if(captionIndex===undefined?s.voice:","if(captionIndex===undefined?(s.voice&&!(p.assets.find(a=>a.id===s.voice)?.generated?.text!==undefined&&p.assets.find(a=>a.id===s.voice)?.generated?.text!==s.text)):");
 return r(s,"q.captionIndex===undefined&&scene.voice", "q.captionIndex===undefined&&scene.voice&&!(W().project.assets.find(a=>a.id===scene.voice)?.generated?.text!==undefined&&W().project.assets.find(a=>a.id===scene.voice)?.generated?.text!==scene.text)");
});
