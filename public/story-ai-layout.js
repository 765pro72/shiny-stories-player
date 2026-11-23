/* Keep a large preview free of the old empty column; follow editing tools on demand. */
(()=>{
 function bind(dialog){
  if(dialog.querySelector('#aiPreviewDock'))return;
  const $=s=>dialog.querySelector(s),workspace=$('.ai-workspace'),dock=document.createElement('section');dock.id='aiPreviewDock';dock.setAttribute('aria-label','分镜预览');
  const heading=document.createElement('div');heading.className='ai-preview-heading';
  const title=document.createElement('strong');title.textContent='分镜预览';
  const label=document.createElement('label');label.className='check';const follow=document.createElement('input');follow.type='checkbox';follow.checked=true;follow.id='aiPreviewFollow';label.append(follow,document.createTextNode('预览跟随操作'));
  const expand=document.createElement('button');expand.type='button';expand.id='aiExpandPreview';expand.textContent='展开预览';heading.append(title,label,expand);dock.append(heading);
  const validation=$('#aiValidation'),stage=$('#aiPreviewStage'),controls=stage.nextElementSibling,list=$('#aiSceneList');dock.append(validation,stage,controls,list);workspace.insertBefore(dock,$('#aiDirector'));
  let activeTool=null,pointerDown=false;
  dialog.addEventListener('pointerdown',()=>pointerDown=true,true);window.addEventListener('pointerup',()=>pointerDown=false,true);window.addEventListener('pointercancel',()=>pointerDown=false,true);
  const compact=tool=>{if(!follow.checked)return;dock.classList.add('compact-preview');if(tool!==activeTool){activeTool=tool;requestAnimationFrame(()=>tool.scrollIntoView({block:'start',behavior:'instant'}))}};
  for(const tool of ['#aiDirector','#aiVoiceSection','#aiJapanese'].map($)){
   tool.addEventListener('focusin',()=>{if(!pointerDown)compact(tool)});
   tool.addEventListener('click',()=>compact(tool));
  }
  follow.onchange=()=>{if(!follow.checked){dock.classList.remove('compact-preview');activeTool=null}};
  expand.onclick=()=>{dock.classList.remove('compact-preview');activeTool=null;dock.scrollIntoView({block:'start',behavior:'instant'})};
  dialog.addEventListener('close',()=>{dock.classList.remove('compact-preview');activeTool=null});
 }
 window.StoryAILayout={bind};
})();
