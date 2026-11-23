(()=>{
 const $=s=>document.querySelector(s),A=()=>StoryAI,Core=()=>StoryAICorrectionCore;
 let undo=null;
 const feedback=(text,kind='info')=>{const p=$('#aiScriptFeedback');p.textContent=text;p.dataset.kind=kind;p.hidden=false;A().status(text)};
 async function context(){
  const before=$('#aiScript').value;if(!before.trim())throw Error('先粘贴脚本，或把当前工程载入为草稿；无需填写提纲。');
  const all=new Map([...A().materials,...StoryWorkshop.project.assets,...(A().candidate?.assets||[])].map(a=>[a.id,a]));
  // Include newly generated voices while retaining enriched real motion lists.
  for(const a of await A().enrich())all.set(a.id,a);
  const materials=[...all.values()];let error='';try{StoryAICore.compile(before,materials)}catch(e){error=e.message}
  const messages=Core().messages({script:before,error,hint:$('#aiCorrectionHint').value,style:A().writingStyle(),materials});
  return{before,materials,messages};
 }
 async function applyResult(data){
  if(data.before!==$('#aiScript').value)throw Error('脚本已有新修改，AI 结果未覆盖；可重新纠错。');
  const result=Core().compile($('#aiCorrectionResult').value,data.before,data.materials),previous={project:A().candidate?CustomStory.copy(A().candidate):null,files:new Map(A().candidateFiles),script:data.before};
  await A().acceptDraft(result.project);undo={...previous,after:$('#aiScript').value};$('#aiAICorrectionUndo').disabled=false;
  feedback('AI 纠错已完成，先预览，满意后再应用到编辑器。可撤销。\n'+(result.issues.length?result.issues.join('\n'):'AI 未报告需要调整的问题。')+(result.warnings.length?'\n本地校验：'+result.warnings.join('\n'):''),'success');
  $('#aiPreviewDock')?.scrollIntoView({block:'start',behavior:'instant'});
 }
 async function run(){
  if(A().busy||window.StoryVoice?.busy)return feedback('请先停止正在进行的生成或配音。','warning');
  const controller=new AbortController();let data;
  try{
   const connection={...A().connection()};connection.maxTokens=Math.max(Number(connection.maxTokens)||0,Math.min(32768,4096+Math.round(String($('#aiScript').value||'').length*.5)));if(!connection.baseURL||!connection.model){$('#aiConnection').open=true;throw Error('请填写 API 地址和模型；也可复制纠错提示词交给聊天 AI。')}
   A().setBusy(controller);feedback('正在读取动作清单并检查当前脚本…');data=await context();if(controller.signal.aborted)throw new DOMException('已停止','AbortError');
   $('#aiCorrectionResult').value='';let done=false,buffer='',received=0;
   const response=await fetch('/api/story-ai/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({connection,messages:data.messages}),signal:controller.signal});if(!response.ok)throw Error((await response.json()).error||'AI 接口请求失败');
   const consume=row=>{if(!row.trim())return;const e=JSON.parse(row);if(e.type==='delta'){$('#aiCorrectionResult').value+=e.text;received+=e.text.length;feedback('AI 正在纠错 · 已返回 '+received+' 字，原脚本保持不变，可停止。')}else if(e.type==='error')throw Error(e.message);else if(e.type==='done'){if(/length|MAX_TOKENS|max_tokens/i.test(e.finishReason||''))throw Error('输出达到上限，原脚本保留；请提高上限后重试。');done=true}};
   const reader=response.body.getReader(),decoder=new TextDecoder();while(true){const v=await reader.read();if(v.done)break;buffer+=decoder.decode(v.value,{stream:true});let i;while((i=buffer.indexOf('\n'))>=0){consume(buffer.slice(0,i));buffer=buffer.slice(i+1)}}if(buffer.trim())consume(buffer);if(!done)throw Error('连接提前断开，未应用不完整结果。');if(controller.signal.aborted)throw new DOMException('已停止','AbortError');await applyResult(data);
  }catch(e){feedback(e.name==='AbortError'?'AI 纠错已停止，原脚本保留。':'AI 纠错未应用：'+e.message,'error');$('#aiScriptDetails').open=true;$('#aiScriptFeedback').scrollIntoView({block:'center',behavior:'instant'})}
  finally{A().setBusy(null)}
 }
 async function prompt(){try{if(A().busy||window.StoryVoice?.busy)throw Error('请先停止正在进行的生成或配音。');const data=await context(),text=data.messages.map(m=>m.content).join('\n\n');$('#aiPromptOutput').value=text;$('#aiPromptOutput').hidden=false;await navigator.clipboard.writeText(text).catch(()=>{});feedback('纠错提示词已生成，可交给聊天 AI；将完整结果粘贴到“AI 纠错结果”，再点击应用。')}catch(e){feedback(e.message,'error')}}
 function bind(){
  $('#aiRepair').onclick=run;$('#aiCorrectionPrompt').onclick=prompt;
  $('#aiCorrectionApply').onclick=async()=>{if(A().busy||window.StoryVoice?.busy)return;try{await applyResult(await context())}catch(e){feedback('AI 纠错未应用：'+e.message,'error')}};
  $('#aiAICorrectionUndo').onclick=async()=>{if(!undo||A().busy||window.StoryVoice?.busy)return;if($('#aiScript').value!==undo.after)return feedback('纠错后已有新修改，未覆盖新内容；请先撤回后续操作。','warning');if(undo.project)await A().acceptDraft(undo.project,undo.files);$('#aiScript').value=undo.script;$('#aiScript').dispatchEvent(new Event('input'));await A().validate();undo=null;$('#aiAICorrectionUndo').disabled=true;feedback('已撤销上次 AI 纠错。')};
 }
 window.StoryAICorrection={bind,run,prompt};
})();


