/* Global companion: ordinary chat and tools share one independent conversation. */
(()=>{'use strict';if(window.IdolAssistant)return;
 const $=(s,root=document)=>root.querySelector(s),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n},key='idol-assistant-settings',chatKey='idol-assistant-chat',events=[],handled=new Set();let host,info,job=null,lastCount=0,polling=false,repairSignature='',settings={},chats=[],persona,drag=null,contextMenu=null;
 const read=(k,f)=>{try{const saved=window.desktop?.getState()?.[k];return JSON.parse(saved||localStorage.getItem(k))||f}catch{return f}};
 function save(){localStorage.setItem(key,JSON.stringify(settings));window.desktop?.saveState({[key]:JSON.stringify(settings)});localStorage.setItem(chatKey,JSON.stringify(chats.slice(-80)));window.desktop?.saveState({[chatKey]:JSON.stringify(chats.slice(-80))})}
 async function api(route,data){const r=await fetch('/api/assistant/'+route,data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await r.json();if(!r.ok)throw Error(value.error||'助手请求失败');return value}
 const record=(type,data)=>{events.push({at:new Date().toISOString(),type,data});if(events.length>100)events.shift()};
 window.addEventListener('error',e=>record('error',{message:e.message,file:e.filename,line:e.lineno}));window.addEventListener('unhandledrejection',e=>record('unhandledrejection',{message:String(e.reason?.message||e.reason)}));for(const type of ['home-conversation-start','home-conversation-line','home-conversation-end','home-scene-error'])window.addEventListener(type,e=>record(type,e.detail||window.homeModelError||{}));
 function context(){const F=window.__shinyShell?.activeWindow?.()||window,W=F.StoryWorkshop,h=F.homeStage;return{page:F.location.pathname,title:F.document.title,visibleDialogs:[...F.document.querySelectorAll('dialog[open]')].map(d=>d.id),...(h?{home:{selected:h.getSelected()?.name,outfit:h.getOutfit()?.path,preferences:h.prefs,models:F.homeMulti?.inspect?.()||[{mouth:F.HomeVoicePolicy?.inspect(h.getModel())}],lastError:F.homeModelError}}:{}),...(W?{workshop:{sceneId:W.currentScene.id,project:{id:W.project.id,title:W.project.title,description:W.project.description,sceneCount:W.project.scenes.length,currentScene:W.currentScene,assets:W.project.assets.slice(0,100)},playback:{playing:W.stage.playing,time:W.stage.time,models:W.stage.nodes.filter(n=>n.node.state).map(n=>({id:n.character.id,asset:n.character.asset,mouth:F.HomeVoicePolicy?.inspect(n.node)}))}}}:{})}}
 function portrait(p){return p?.portrait?'/asset-original/'+p.portrait:''}
 function avatar(p,user=false){const src=user?settings.avatar:portrait(p);if(!src)return el('span',user?'P':p?.chinese?.slice(0,1)||'偶','ia-avatar ia-user-icon');const img=el('img',undefined,'ia-avatar');img.draggable=false;img.src=src;img.alt=user?'制作人头像':p.chinese;img.onerror=()=>{img.replaceWith(el('span',user?'P':p.chinese.slice(0,1),'ia-avatar ia-user-icon'))};return img}
 function bubble(role,text,pid=persona?.id,persist=false){if(role==='assistant')text=AssistantResponse.display(text);$('#iaMessages .ia-empty')?.remove();const p=info.personas.find(p=>p.id===pid)||persona,row=el('div',undefined,'ia-bubble-row '+(role==='user'?'user':'')),article=el('article');article.append(el('small',role==='user'?settings.userName||'制作人':p.chinese),el('div',undefined,'ia-bubble'));textLinks(article.querySelector('.ia-bubble'),text);row.append(avatar(p,role==='user'),article);$('#iaMessages').append(row);if(persist){chats.push({role,content:text,persona:pid});save()}bottom();return row}
 function textLinks(node,text){const expression=/\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/guide\.html\?[^\s)]+)\)/g;let at=0,m;while((m=expression.exec(text))){node.append(document.createTextNode(text.slice(at,m.index)));const a=el('a',m[1]);a.href=m[2];if(m[2].startsWith('http'))a.target='_blank';a.rel='noopener noreferrer';node.append(a);at=expression.lastIndex}node.append(document.createTextNode(text.slice(at)))}
 let settingsOpen=false,chatScroll=0,followChat=true,workPhase='',workRow=null,workRecord=null,conversationEpoch=0;
 function bottom(){if(settingsOpen||!followChat)return;const body=$('.ia-body',host);body.scrollTop=body.scrollHeight}
 function toggleSettings(value=!settingsOpen){const body=$('.ia-body',host);if(value===settingsOpen)return;if(value)chatScroll=body.scrollTop;settingsOpen=value;$('#iaSettings').hidden=!value;$('#iaConversation').hidden=value;$('.ia-compose',host).hidden=value;host.classList.toggle('ia-settings-open',value);$('#iaSettingsToggle').textContent=value?'返回聊天':'设置';$('#iaSettingsToggle').setAttribute('aria-expanded',String(value));body.scrollTop=value?0:chatScroll}
 function progress(text,error=false){$('#iaProgress').textContent=text;$('#iaProgress').className='ia-progress'+(error?' ia-error':'');if(settingsOpen){$('#iaSettingsStatus').textContent=text;$('#iaSettingsStatus').classList.toggle('ia-error',error)}bottom()}
 function workReport(e,pid){
  const phases={diagnostics:['diagnostics','正在读取当前页面的诊断与日志。'],list_source:['source','正在定位相关代码。'],read_source:['source','正在核对相关代码。'],search_source:['source','正在查找问题的实现位置。'],edit_source:['edit','正在独立副本里修改代码，原程序仍可使用。'],run_checks:['checks','正在运行回归检查。'],build_program:['build','正在验证修改，并生成新版程序与修复包。'],export_fix:['export','正在整理可分享的修复文件和说明。'],find_stories:['stories','正在检索已收录剧情中的出场和提及。'],read_story:['stories','正在阅读检索到的剧情。'],search_web:['web','正在搜索公开资料。'],read_web:['web','正在核对公开网页。'],apply_ui:['apply','正在把修改应用到当前页面。']};
  let row=e.type==='tool-result'&&!e.ok?['failed-'+e.tool,e.tool==='run_checks'?'检查仍有未通过的项目，尚不能交付修复。检查记录已保留。':'这一步未完成：'+e.tool+'。'+String(e.text||'').slice(0,160)]:e.type==='tool-result'&&e.tool==='build_program'?['built','新版程序和修复包已生成，可以查看结果。原程序需要你同意后才会应用并重启。']:e.type==='tool'?phases[e.tool]:e.type==='progress'&&/^正在检查：/.test(e.text||'')?['checks',e.text]:e.type==='progress'&&/正在完成修复验证与构建|发布门禁|生成新版/.test(e.text||'')?['build',e.text]:e.type==='completion'?['completion',e.text]:e.type==='waiting'?['waiting',e.text]:null;if(!row)return;
  if(row[0]===workPhase&&workRow?.isConnected){if(row[0]!=='checks')return;workRow.querySelector('.ia-bubble').replaceChildren(document.createTextNode(row[1]));if(workRecord){workRecord.content=row[1];save()}bottom();return}
  workPhase=row[0];workRow=bubble('assistant',row[1],pid,true);workRow.classList.add('ia-work-report');workRow.querySelector('small').append(' · 工作进度');workRecord=chats.at(-1);if(settings.collapsed)$('#iaExpand').textContent='有进展 · 打开聊天';
 }
 function clamp(){if(host.hidden)return;const r=host.getBoundingClientRect(),width=r.width,height=r.height;const x=Math.max(10,Math.min(innerWidth-width-10,Number(settings.x??innerWidth-width-20))),y=Math.max(0,Math.min(innerHeight-height-10,Number(settings.y??innerHeight-height-22)));Object.assign(host.style,{left:x+'px',top:y+'px'});if(host.classList.contains('ia-collapsed')){settings.x=x;settings.y=y}}
 function collapse(value){settings.collapsed=value;host.classList.toggle('ia-collapsed',value);$('#iaExpand').textContent=value?'打开聊天':'收起';$('#iaExpand').setAttribute('aria-expanded',String(!value));clamp();save()}
 function setEnabled(enabled,persist=true){
   closeContextMenu();
   settings.enabled=enabled;
   if(!enabled){
     host.hidden=true;
     host.classList.add('ia-hidden');
     host.style.setProperty('display','none','important');
   }else{
     host.hidden=false;
     host.classList.remove('ia-hidden');
     host.style.removeProperty('display');
   }
   for(const id of ['iaVisible','assistantVisible','iaSettingsVisible']){
     const control=document.getElementById(id);
     if(control)control.checked=enabled;
   }
   if(enabled){
     try{host.showPopover?.();}catch{}
     clamp();
   }else{
     try{host.hidePopover?.();}catch{}
   }
   if(persist)save();
 }
 function closeContextMenu(){
   if(!contextMenu)return;
   try{contextMenu.hidePopover?.();}catch{}
   contextMenu.remove();
   contextMenu=null;
 }
 function bindContextMenu(){
   host.addEventListener('contextmenu',e=>{
     if(e.target.closest('input,textarea,select,a,pre'))return;
     e.preventDefault();
     e.stopPropagation();
     closeContextMenu();
     contextMenu=el('div',undefined,'ia-context-menu');
     contextMenu.id='iaContextMenu';
     contextMenu.setAttribute('role','menu');
     const close=el('button','关闭悬浮窗');
     close.type='button';
     close.setAttribute('role','menuitem');
     const doClose=(ev)=>{
       ev.preventDefault();
       ev.stopPropagation();
       setEnabled(false);
       closeContextMenu();
     };
     close.addEventListener('click',doClose);
     close.addEventListener('pointerdown',doClose);
     contextMenu.append(close);
     document.body.append(contextMenu);
     const r=contextMenu.getBoundingClientRect();
     const left=Math.max(8,Math.min(e.clientX,window.innerWidth-r.width-12));
     const top=Math.max(8,Math.min(e.clientY,window.innerHeight-r.height-12));
     contextMenu.style.left=left+'px';
     contextMenu.style.top=top+'px';
     close.focus();
   });
   document.addEventListener('pointerdown',e=>{
     if(contextMenu&&!contextMenu.contains(e.target))closeContextMenu();
   },true);
   document.addEventListener('keydown',e=>{
     if(e.key==='Escape'&&contextMenu){
       e.preventDefault();
       closeContextMenu();
       $('.ia-head',host)?.focus?.();
     }
   },true);
 }
 function visibilitySetting(){const panel=document.querySelector('#wardrobeDialog .settings-scroll');if(!panel||document.getElementById('assistantVisible'))return;const section=el('section',undefined,'assistant-visibility-setting');section.innerHTML='<h3>小偶像助手</h3><label class="ia-visibility-switch"><input id="assistantVisible" type="checkbox">显示小偶像悬浮窗</label>';panel.querySelector('h2').after(section);section.querySelector('input').onchange=e=>setEnabled(e.target.checked)}
 function place(corner){const r=host.getBoundingClientRect();settings.x=corner.includes('right')?innerWidth-r.width-12:12;settings.y=corner.includes('top')?12:innerHeight-r.height-12;clamp();save()}
 function currentConnection(){if(window.StoryAI?.connection&&document.querySelector('#aiProvider')){const c=StoryAI.connection();if(c.baseURL&&c.model)return c}const profiles=read('story-ai-connections',{profiles:{}});return profiles.profiles?.[profiles.active]||{provider:'deepseek',protocol:'openai',baseURL:'https://api.deepseek.com/v1',model:'',maxTokens:8192,timeout:180}}
 function connection(){const c=currentConnection();return{...c,provider:$('#iaProvider').value,protocol:$('#iaProtocol').value,baseURL:$('#iaBase').value.trim(),model:$('#iaModel').value.trim(),apiKey:$('#iaKey').value.trim()||(c.provider===$('#iaProvider').value?c.apiKey:'')||'',stream:false,maxTokens:c.maxTokens||8192}}
 function connectionForm(c){$('#iaProvider').value=c.provider||'custom';$('#iaProtocol').value=c.protocol||'openai';$('#iaBase').value=c.baseURL||'';$('#iaModel').value=c.model||''}
 async function send(){const epoch=conversationEpoch,text=$('#iaInput').value.trim();if(!text||polling)return;const c=connection();if(!c.baseURL||!c.model){toggleSettings(true);progress('先在连接设置中填写模型，也可以沿用 AI 创作的连接。',true);return}const stored=read('story-ai-connections',{profiles:{}});stored.profiles||={};const {apiKey:transientKey,...publicConnection}=c;stored.profiles[c.provider]=publicConnection;stored.active=c.provider;localStorage.setItem('story-ai-connections',JSON.stringify(stored));window.desktop?.saveState({'story-ai-connections':JSON.stringify(stored)});toggleSettings(false);followChat=true;workPhase='';workRow=workRecord=null;$('#iaInput').value='';settings.inputDraft='';const history=chats.filter(m=>m.persona===persona.id).slice(-12);bubble('user',text,persona.id,true);$('#iaSend').disabled=true;$('#iaStop').disabled=false;try{await api('diagnostics',{context:context(),events});const value=await api('jobs',{message:text,history,persona:persona.id,connection:c,context:context()});if(epoch!==conversationEpoch){await api('jobs/'+value.id+'/cancel',{});return}job=value.id;settings.job=job;lastCount=0;save();await poll()}catch(e){if(epoch===conversationEpoch){progress(e.message,true);$('#iaSend').disabled=false;$('#iaStop').disabled=true}}}
 async function effect(e){if(handled.has(e.id))return;handled.add(e.id);let result;const F=window.__shinyShell?.activeWindow?.()||window;try{if(F.location.pathname!==e.page)throw Error('页面已切换，未应用');const a=e.action;if(a.kind==='font'){if(!F.InterfaceFont?.set)throw Error('当前页面没有字体设置');F.InterfaceFont.set(a.values)}else if(a.kind==='home'){const h=F.homeStage;if(!h)throw Error('请回到事务所再修改看板');const fields={voiceVolume:['voiceVolume','input'],idleTalk:['idleTalk','change'],autoConversations:['autoConversations','change'],subtitleLanguage:['subtitleLanguage','change']};for(const [k,v]of Object.entries(a.values)){const field=fields[k],control=field&&F.document.getElementById(field[0]);if(!control)throw Error('不支持的设置：'+k);if(control.type==='checkbox'){if(typeof v!=='boolean')throw Error('开关需为 true/false');control.checked=v}else{if(k==='voiceVolume'&&(!Number.isFinite(v)||v<0||v>100))throw Error('音量需为0–100');if(k==='subtitleLanguage'&&!['jp','cn','both'].includes(v))throw Error('字幕语言需为jp/cn/both');control.value=v}control.dispatchEvent(new F.Event(field[1],{bubbles:true}))}}else if(a.kind==='scene'){const W=F.StoryWorkshop;if(!W||a.values.sceneId!==W.currentScene.id)throw Error('分镜已切换，未修改');const next=(F.StoryAICore||window.StoryAICore).direct(W.project,{changes:[a.values]},[W.currentScene.id],W.project.assets);W.project.scenes=next.scenes;W.markChanged();await W.refresh()}else throw Error('不支持的页面操作');result={ok:true,message:'当前页面已实际应用'}}catch(error){result={ok:false,error:error.message}}await api('jobs/'+job+'/effect',{id:e.id,result})}
 function repairCard(value){
 const r=value.repair,signature=JSON.stringify([value.id,r,info.canApplyRepair]);if(signature===repairSignature)return;repairSignature=signature;const box=$('#iaRepair');box.replaceChildren();box.hidden=!r;if(!r)return;
 const state=r.state,title=state==='ready'?'修复已准备好':state==='applied'?'修复已应用':state==='rolled-back'?'已恢复原版':state==='failed'?'尚未应用修复':'正在应用修复';box.append(el('strong',title));
 box.append(el('p',state==='ready'?'测试和新版构建已通过。经你同意后，保存草稿、备份原件并应用修复。':state==='applied'?'播放器已重新启动，创作内容已恢复。可以复试原来的问题。':state==='rolled-back'?'新版启动未通过，已恢复原文件和创作内容。检查记录保留在任务里。':state==='failed'?'未替换程序文件。'+(r.error||'请查看检查记录。'):'请稍候，正在备份与应用。'));
 if(state==='ready'&&info.canApplyRepair&&window.desktop?.applyAssistantRepair){const actions=el('div',undefined,'ia-repair-actions'),apply=el('button','应用修复并重启','ia-send'),later=el('button','稍后');apply.id='iaApplyRepair';apply.disabled=value.status==='running';apply.onclick=async()=>{apply.disabled=true;try{const result=await desktop.applyAssistantRepair(value.id);if(result.cancelled)progress('已暂缓，仍在使用当前程序；修复结果已保留。');else if(!result.ok)throw Error(result.error);else progress('正在应用修复，播放器即将重新启动…')}catch(e){progress(e.message,true)}finally{apply.disabled=false}};later.onclick=()=>{progress('已暂缓，修复结果保留在本次任务中。');collapse(true)};actions.append(apply,later);box.append(actions)}
 }
 async function poll(){if(polling)return;const epoch=conversationEpoch;polling=true;let lastActivity=Date.now();try{while(job&&epoch===conversationEpoch){const value=await api('jobs/'+job);if(epoch!==conversationEpoch)break;for(const e of value.events.slice(lastCount)){lastActivity=Date.now();workReport(e,value.persona);if(e.type==='message')bubble('assistant',e.text,value.persona,true);else if(e.type==='effect')effect(e);else if(e.type==='stories'){const group=el('details'),summary=el('summary',e.result.character+' · '+e.result.total+' 篇相关剧情');group.append(summary);for(const row of e.result.rows){const a=el('a',row.title+' · '+row.kind,'ia-scene-link');a.href='/'+row.url;group.append(a)}$('#iaMessages').append(group)}else if(e.type==='tool-result'){const d=el('details');d.append(el('summary',(e.ok?'✓ ':'未完成 · ')+e.tool),el('pre',e.text));$('#iaMessages').append(d)}else progress(e.text||e.tool,e.type==='error')}lastCount=value.events.length;settings.eventCounts||={};settings.eventCounts[job]=lastCount;repairCard(value);$('#iaExportFix').disabled=!value.changes.length;$('#iaArtifacts').replaceChildren();for(const [i,a]of value.artifacts.entries()){if(!a.file)continue;const link=el('a',a.name);link.href='/api/assistant/jobs/'+job+'/artifact/'+i;link.download='';$('#iaArtifacts').append(link)}if(value.status!=='running'&&value.repair?.state!=='applying'){if((value.changes.length||value.status!=='complete')&&settings.reportedJob!==value.id+':'+value.status){settings.reportedJob=value.id+':'+value.status;workReport({type:'completion',text:value.status==='complete'?(value.repair?.state==='ready'?'检查和新版构建已完成。修复已准备好，等你同意后再应用并重启。':'本次处理已结束，结果与文件已保留。'):value.status==='cancelled'?'任务已停止，已经完成的修改和检查记录保留。':'这次处理未完成，失败原因和已做的修改已保留，请查看任务记录。'},value.persona)}progress(value.status==='complete'?(value.repair?.state==='ready'?'修复已准备好，等待你同意应用并重启。':value.repair?.state==='applied'?'修复已应用。':value.repair?.state==='rolled-back'?'新版启动失败，已恢复原版。':'本次回复完成'):value.status==='cancelled'?'已停止，已做的修改与记录保留':'本次未完成，请查看原因',value.status==='failed');break}if(Date.now()-lastActivity>20000){workReport({type:'waiting',text:'任务仍在运行，当前阶段暂时没有新的结果。我会继续显示收到的进度。'},value.persona);lastActivity=Date.now()}await new Promise(r=>setTimeout(r,800))}}catch(e){if(epoch===conversationEpoch)progress('连接中断：'+e.message+'；任务记录仍在本机，可重新打开助手查看。',true)}finally{if(epoch===conversationEpoch){polling=false;$('#iaSend').disabled=false;$('#iaStop').disabled=true;save()}}}
 function endDrag(){
   document.documentElement.classList.remove('ia-dragging');
   document.removeEventListener('pointermove', onDocPointerMove);
   document.removeEventListener('pointerup', onDocPointerUp);
   document.removeEventListener('pointercancel', onDocPointerUp);
   drag=null;
   save();
 }
 function onDocPointerMove(e){
   if(!drag)return;
   const dx=e.clientX-drag.startX, dy=e.clientY-drag.startY;
   if(Math.abs(dx)+Math.abs(dy)>4) drag.moved=true;
   if(drag.moved){
     const x=Math.max(8,Math.min(window.innerWidth-drag.w-8, drag.origX+dx));
     const y=Math.max(8,Math.min(window.innerHeight-drag.h-8, drag.origY+dy));
     settings.x=x;
     settings.y=y;
     host.style.left=x+'px';
     host.style.top=y+'px';
   }
 }
 function onDocPointerUp(e){
   if(drag&&!drag.moved&&settings.collapsed){
     collapse(false);
   }
   endDrag();
 }
 function bindDrag(){
   const handle=$('.ia-head',host);
   handle.ondragstart=e=>e.preventDefault();
   handle.onpointerdown=e=>{
     if(e.target.closest('button,select,input,textarea')||e.button!==0)return;
     e.preventDefault();
     const r=host.getBoundingClientRect();
     drag={
       startX: e.clientX,
       startY: e.clientY,
       origX: r.left,
       origY: r.top,
       w: r.width,
       h: r.height,
       moved: false
     };
     document.documentElement.classList.add('ia-dragging');
     document.addEventListener('pointermove', onDocPointerMove);
     document.addEventListener('pointerup', onDocPointerUp);
     document.addEventListener('pointercancel', onDocPointerUp);
   };
   handle.tabIndex=0;
   handle.setAttribute('aria-label','拖动聊天窗；方向键移动，Shift加快');
   handle.onkeydown=e=>{
     const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
     if(!dirs[e.key]||e.target!==handle)return;
     e.preventDefault();
     const [x,y]=dirs[e.key],step=e.shiftKey?30:10;
     settings.x=(Number(settings.x)||host.offsetLeft)+x*step;
     settings.y=(Number(settings.y)||host.offsetTop)+y*step;
     clamp();
     save();
   };
 }
 async function init(){await Promise.all([loadResource('link','/assistant.css?v=2026-11-16.77'),loadResource('script','/assistant-response.js?v=2026-11-15.14')]);info=await api('info');settings=read(key,{collapsed:true,persona:'24'});chats=read(chatKey,[]).map(m=>m.role==='assistant'?{...m,content:AssistantResponse.display(m.content)}:m);persona=info.personas.find(p=>p.id===settings.persona)||info.personas[0];host=el('section');host.id='idolAssistant';host.hidden=settings.enabled===false;host.setAttribute('aria-label','小偶像助手');host.setAttribute('popover','manual');host.classList.toggle('ia-collapsed',settings.collapsed!==false);host.innerHTML='<div class="ia-head"><span id="iaHeadAvatar"></span><div class="ia-title"><strong id="iaName"></strong><small>同人 AI · 闲聊、剧情向导与修复</small></div><button class="ia-settings-button" id="iaSettingsToggle" title="角色与连接设置">设置</button><button id="iaExpand">收起</button></div><div class="ia-body"><div class="ia-settings" id="iaSettings" hidden><p id="iaSettingsStatus" role="status"></p><label class="ia-visibility-switch"><input id="iaVisible" type="checkbox">显示小偶像悬浮窗</label><p class="ia-visibility-hint">关闭后可在事务所 → 看板设置 → 小偶像助手中重新开启。</p><label>和谁聊天<select id="iaPersona"></select></label><label>你的名字<input id="iaUserName" maxlength="30"></label><label>你的头像<input id="iaUserAvatar" type="file" accept="image/png,image/jpeg,image/webp"></label><label>连接服务商<select id="iaProvider"></select></label><label>API 协议<select id="iaProtocol"><option value="openai">Chat Completions 兼容</option><option value="responses">Responses</option><option value="anthropic">Anthropic</option><option value="gemini">Gemini</option></select></label><label>API 地址<input id="iaBase" type="url"></label><label>模型名称<input id="iaModel"></label><label>API Key（仅本次运行内存）<input id="iaKey" type="password" autocomplete="off"></label><button id="iaSaveConnection">保存连接</button><button id="iaClearChat" type="button">清除对话</button><div id="iaClearConfirm" hidden><p>清除全部偶像的对话记录？正在进行的任务会停止，任务文件和连接设置保留。</p><button id="iaClearConfirmButton" type="button">确认清除</button><button id="iaClearCancel" type="button">取消</button></div><label>窗口位置<select id="iaCorner"><option value="bottom-right">右下角</option><option value="bottom-left">左下角</option><option value="top-right">右上角</option><option value="top-left">左上角</option></select></label><button id="iaResetPosition">重置大小和位置</button><button id="iaFolder">打开任务文件夹</button><button id="iaExportFix" disabled>导出本次修复包</button><label>本次运行的任务<select id="iaJobs"><option value="">选择任务</option></select></label></div><section id="iaConversation"><div id="iaMessages"></div><div id="iaProgress" class="ia-progress" role="status"></div><div id="iaRepair" class="ia-repair" hidden></div><div id="iaArtifacts" class="ia-artifacts"></div></section></div><div class="ia-compose"><textarea id="iaInput" aria-label="给小偶像的消息" placeholder="聊聊今天的事，或说说你想做什么…"></textarea><div class="ia-actions"><small>Enter 发送 · Shift+Enter 换行</small><button id="iaStop" disabled>停止</button><button id="iaSend" class="ia-send">发送</button></div></div>';
 document.body.append(host);if(!host.hidden)host.showPopover?.();$('#iaName').textContent=persona.chinese;$('#iaHeadAvatar').append(avatar(persona));$('#iaPersona').replaceChildren(...info.personas.map(p=>new Option(p.chinese,p.id)));$('#iaPersona').value=persona.id;$('#iaProvider').replaceChildren(...info.providers.map(p=>new Option(p.name,p.id)));connectionForm(currentConnection());$('#iaUserName').value=settings.userName||'制作人';$('#iaUserName').onchange=()=>{settings.userName=$('#iaUserName').value.trim()||'制作人';save()};$('#iaUserAvatar').onchange=()=>{const file=$('#iaUserAvatar').files[0];if(!file||file.size>512000)return progress('头像请选择小于500KB的图片。',true);const reader=new FileReader();reader.onload=()=>{settings.avatar=reader.result;save()};reader.readAsDataURL(file)};
 $('#iaVisible').onchange=e=>setEnabled(e.target.checked);const sv=$('#iaSettingsVisible');if(sv)sv.onchange=e=>setEnabled(e.target.checked);visibilitySetting();setEnabled(settings.enabled!==false,false);
 $('#iaPersona').onchange=()=>{settings.persona=$('#iaPersona').value;persona=info.personas.find(p=>p.id===settings.persona);$('#iaName').textContent=persona.chinese;$('#iaHeadAvatar').replaceChildren(avatar(persona));renderChats();save()};$('#iaProvider').onchange=()=>{const p=info.providers.find(p=>p.id===$('#iaProvider').value),saved=read('story-ai-connections',{profiles:{}});connectionForm(saved.profiles?.[p.id]||p);$('#iaKey').value=''};$('#iaSaveConnection').onclick=async()=>{try{const c=connection();await api('connection',{connection:c});const value=read('story-ai-connections',{profiles:{}});value.profiles||={};const {apiKey,...nonsecret}=c;value.profiles[c.provider]=nonsecret;value.active=c.provider;localStorage.setItem('story-ai-connections',JSON.stringify(value));window.desktop?.saveState({'story-ai-connections':JSON.stringify(value)});progress('连接已保存；密钥仅保留本次运行。')}catch(e){progress(e.message,true)}};$('#iaClearChat').onclick=()=>{$('#iaClearConfirm').hidden=false;$('#iaClearConfirmButton').focus()};$('#iaClearCancel').onclick=()=>$('#iaClearConfirm').hidden=true;$('#iaClearConfirmButton').onclick=clearConversation;$('#iaSettingsToggle').onclick=()=>toggleSettings();$('#iaExpand').onclick=()=>collapse(!settings.collapsed);$('#iaSend').onclick=send;$('#iaInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send()}};$('#iaStop').onclick=()=>job&&api('jobs/'+job+'/cancel',{});$('#iaCorner').onchange=()=>place($('#iaCorner').value);$('#iaResetPosition').onclick=()=>{host.style.width='';host.style.height='';delete settings.x;delete settings.y;clamp();save()};$('#iaExportFix').onclick=async()=>{try{const r=await api('jobs/'+job+'/export',{});progress(r.verified?'修复包已导出，附适用版本和回滚资料。':'检查未通过，已导出排查包。',!r.verified);lastCount=0;await poll()}catch(e){progress(e.message,true)}};$('#iaFolder').onclick=()=>job&&window.desktop?.openAssistantFolder?.(job);
 $('#iaJobs').append(...info.jobs.map(j=>new Option(j.title+' · '+j.status,j.id)));$('#iaJobs').onchange=()=>{if(polling)return;job=$('#iaJobs').value;settings.job=job;lastCount=0;repairSignature='';if(job)poll()};renderChats();$('.ia-body',host).addEventListener('scroll',()=>{if(!settingsOpen){const body=$('.ia-body',host);followChat=body.scrollHeight-body.clientHeight-body.scrollTop<70}});bindDrag();bindContextMenu();collapse(settings.collapsed!==false);window.addEventListener('resize',clamp);document.addEventListener('focusin',e=>{if(host.hidden||settings.collapsed||host.contains(e.target)||contextMenu?.contains(e.target))return;const r=e.target.getBoundingClientRect(),h=host.getBoundingClientRect();if(r.width&&r.left<h.right&&r.right>h.left&&r.top<h.bottom&&r.bottom>h.top)collapse(true)});
 const observer=new MutationObserver(()=>{const dialogs=[...document.querySelectorAll('dialog[open]')],parent=dialogs.at(-1)||document.body;if(host.parentNode!==parent){host.hidePopover?.();parent.append(host);if(!host.hidden)host.showPopover?.();clamp()}});observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open'],childList:true});if(settings.job&&info.jobs.some(j=>j.id===settings.job)){job=settings.job;lastCount=settings.eventCounts?.[job]||0;poll()}async function prepareRestart(id){
 if(window.StoryWorkshop?.busy||window.StoryAI?.busy||window.StoryVoice?.busy)throw Error('请先等待保存、AI 生成或配音完成');
 const meta={},W=window.StoryWorkshop;settings.inputDraft=$('#iaInput').value;save();document.body.inert=true;
 try{
  if(W){const bytes=await W.pack(false);await desktop.saveRepairCheckpoint(id,'workshop',bytes);meta.workshop={index:W.sceneIndex,dirty:W.dirty,sha256:await digest(bytes)}}
  const ai=await window.StoryAI?.restartSnapshot();if(ai){const bytes=ai.bytes||new Uint8Array();await desktop.saveRepairCheckpoint(id,'candidate',bytes);const {bytes:unused,...rest}=ai;meta.candidate={...rest,empty:!bytes.length,sha256:await digest(bytes)}}window.CreativePreferences?.flush();return meta;
 }catch(e){document.body.inert=false;throw e}
 }
 async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('')}
 async function restoreRestart(kind,meta){const chunks=window.__repairChunks||[],size=chunks.reduce((n,s)=>n+atob(s).length,0),bytes=new Uint8Array(size);let at=0;for(const chunk of chunks){const raw=atob(chunk);for(let i=0;i<raw.length;i++)bytes[at++]=raw.charCodeAt(i)}delete window.__repairChunks;if(await digest(bytes)!==meta.sha256)throw Error('恢复内容校验失败');if(kind==='workshop'){const W=window.StoryWorkshop;await W.adopt(await W.unpack(bytes));W.select(Math.min(meta.index||0,W.project.scenes.length-1));if(meta.dirty)W.markChanged()}else await StoryAI.restoreRestart(meta.empty?null:await StoryWorkshop.unpack(bytes),meta)}
 $('#iaInput').value=settings.inputDraft||'';
 window.IdolAssistant={showSettings:toggleSettings,prepareRestart,restoreRestart,finishRestart(){window.StoryWorkshop?.allowRestart();},cancelRestart(){document.body.inert=false;window.StoryWorkshop?.allowRestart(false)},open:()=>{setEnabled(true);collapse(false)},context,send,host,record};
 }
 async function clearConversation(){const button=$('#iaClearConfirmButton');button.disabled=true;try{if(polling&&job)await api('jobs/'+job+'/cancel',{});conversationEpoch++;polling=false;job=null;lastCount=0;delete settings.job;settings.eventCounts={};delete settings.reportedJob;settings.inputDraft='';chats=[];workPhase='';workRow=workRecord=null;repairSignature='';$('#iaMessages').replaceChildren();$('#iaRepair').replaceChildren();$('#iaRepair').hidden=true;$('#iaArtifacts').replaceChildren();$('#iaInput').value='';$('#iaSend').disabled=false;$('#iaStop').disabled=true;$('#iaExportFix').disabled=true;$('#iaClearConfirm').hidden=true;followChat=true;chatScroll=0;renderChats();save();progress('已清除对话。任务文件仍可从任务列表中查看。')}catch(e){progress('未清除：'+e.message,true)}finally{button.disabled=false}}
 function renderChats(){$('#iaMessages').replaceChildren();const rows=chats.filter(m=>m.persona===persona.id).slice(-40);for(const m of rows)bubble(m.role,m.content,m.persona);if(!rows.length)$('#iaMessages').append(el('p','可以随便聊聊，也可以问功能怎么用、找相关剧情，或让我排查并修复问题。','ia-empty'))}
 function loadResource(tag,url){return new Promise((resolve,reject)=>{const node=el(tag);if(tag==='link'){node.rel='stylesheet';node.href=url}else node.src=url;node.onload=resolve;node.onerror=()=>reject(Error('助手界面文件加载失败，请重新打开页面'));document.head.append(node)})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(e=>console.warn('小偶像助手载入失败',e.message)));else init().catch(e=>console.warn('小偶像助手载入失败',e.message));
})();
































