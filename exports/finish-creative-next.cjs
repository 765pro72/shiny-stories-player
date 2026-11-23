const fs=require('fs');
function edit(path,fn){const before=fs.readFileSync(path,'utf8'),after=fn(before);if(before===after)throw Error('No change: '+path);fs.writeFileSync(path,after)}
function r(s,a,b){if(!s.includes(a))throw Error('Missing: '+a.slice(0,90));return s.replace(a,b)}
edit('public/story-ai.js',s=>{
 s=r(s,"function initDirector(){", "function initDirector(){for(const selector of ['#aiDirector','#aiVoiceSection','.ai-apply'])dialog.querySelector('.ai-workspace').append(dialog.querySelector(selector));");
 s=r(s,"serial=0;const keys", "serial=0;const keys");s=r(s,'let directorUndo=null;','');return s;
});
edit('public/story-ai.css',s=>s+'\n.ai-workspace>#aiDirector,.ai-workspace>#aiVoiceSection,.ai-workspace>.ai-apply{grid-column:1/-1}.ai-workspace>#aiDirector{margin-top:8px}#aiVoiceHost .tts-queue-row{grid-template-columns:auto minmax(0,1fr) minmax(12rem,25rem)}#aiVoiceHost .tts-queue-row input,#aiVoiceHost .tts-queue-row select{max-width:100%}@media(max-width:650px){#aiVoiceHost .tts-queue-row{grid-template-columns:auto minmax(0,1fr)}#aiVoiceHost .tts-queue-row>div:last-child{grid-column:2}}\n');
edit('public/story-ai-core.js',s=>r(s,"loop:r.loop!==false,enabled:r.enabled!==false", "loop:r.loop!==false,enabled:r.enabled!==false,...(r.generated==='ai-voice'?{generated:r.generated}:{})"));
edit('scripts/test-story-creative-next.cjs',s=>{
 s=r(s,'console.log(director);',`console.log(director);
 await js(\`(async()=>{document.querySelector('#aiProvider').value='custom';document.querySelector('#aiProvider').dispatchEvent(new Event('change'));document.querySelector('#aiBaseURL').value='https://mock.example/v1';document.querySelector('#aiModel').value='test';document.querySelector('#aiDirection').value='只修改第一句台词';await StoryDirector.run();if(StoryAI.candidate.scenes[0].text!=='导演改好的第一句')throw Error('Director API failed '+document.querySelector('#aiStatus').textContent)})()\`);assert.equal(aiCalls,1);`);return s;
});
edit('scripts/test-story-voice-ui.cjs',s=>{
 s=r(s,"StoryVoice.queue[0].voice.value='abc123';await", "StoryVoice.queue[0].voice.value='abc123';StoryVoice.queue[0].check.checked=true;await");
 s=r(s,"for(const q of StoryVoice.queue)q.voice.value='abc123';", "for(const q of StoryVoice.queue){q.voice.value='abc123';q.check.checked=true}");
 return r(s,'document.querySelector("#storyVoiceDialog").open','document.querySelector("#storyVoiceDialog").closest("dialog").open');
});
