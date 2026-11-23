/* A small reusable segment editor for single lines and the batch queue. */
(()=>{
 const S=StorySpeech;
 function create({host,textarea,languageSelect,getSpeech,onChange}){
  const details=document.createElement('details');details.className='speech-segment-editor';
  const summary=document.createElement('summary');summary.textContent='日语段＋中文段 · 整句合成';
  const hint=document.createElement('p');hint.className='hint';hint.textContent='同一句里的语言安排：日语段填日语，中文段填中文。可添加多段、拖动排序，按顺序使用同一音色一次合成一条配音，不拆镜头、不逐段拼接。中文自动注音，读错时展开读音修正。中文字幕单独保留；实际衔接请试听。';
  const toolbar=document.createElement('div');toolbar.className='ai-toolbar';
  const split=document.createElement('button');split.type='button';split.textContent='把选中的文字设为中文段';
  const addJa=document.createElement('button');addJa.type='button';addJa.textContent='＋ 日语段';
  const addZh=document.createElement('button');addZh.type='button';addZh.textContent='＋ 中文段';
  const list=document.createElement('div');list.className='speech-segments';
  const message=document.createElement('p');message.className='hint';message.setAttribute('role','status');
  toolbar.append(split,addJa,addZh);details.append(summary,hint,toolbar,list,message);host.append(details);
  let parts=[],dragIndex=null;
  const plan=()=>({language:'segments',segments:parts.map(p=>({...p}))});
  function commit(){languageSelect.value='segments';textarea.readOnly=true;textarea.value=S.text(plan());onChange(plan());message.textContent='分段设置已保存到这句台词；还需生成配音并试听。';split.disabled=true;}
  function initial(){return[{language:languageSelect.value==='zh'?'zh':'ja',text:textarea.value,reading:''}]}
  function field(labelText,input){const label=document.createElement('label');label.append(document.createTextNode(labelText),input);return label}
  function render(){
   list.replaceChildren();parts.forEach((part,index)=>{
    const row=document.createElement('div');row.className='speech-segment';
    const heading=document.createElement('div');heading.className='speech-segment-heading';
    const number=document.createElement('strong');number.textContent=(part.language==='zh'?'中文段':'日语段')+' '+(index+1);
    const select=document.createElement('select');select.setAttribute('aria-label','第 '+(index+1)+' 段语言');select.append(new Option('日语','ja'),new Option('中文','zh'));select.value=part.language;
    const handle=document.createElement('button');handle.type='button';handle.className='speech-drag';handle.draggable=true;handle.textContent='⠿';handle.setAttribute('aria-label','拖动调整顺序');handle.title='拖动调整顺序，也可用上移、下移';handle.ondragstart=e=>{dragIndex=index;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(index));row.classList.add('dragging')};handle.ondragend=()=>{dragIndex=null;row.classList.remove('dragging')};row.ondragover=e=>{if(dragIndex!==null)e.preventDefault()};row.ondrop=e=>{e.preventDefault();if(dragIndex===null||dragIndex===index)return;const from=dragIndex;dragIndex=null;const [moved]=parts.splice(from,1);parts.splice(index,0,moved);commit();render()};
    heading.append(handle,number,select);
    for(const [label,delta]of [['上移',-1],['下移',1],['删除',0]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=delta?index+delta<0||index+delta>=parts.length:parts.length===1;b.onclick=()=>{if(delta)[parts[index],parts[index+delta]]=[parts[index+delta],parts[index]];else parts.splice(index,1);commit();render()};heading.append(b)}
    const text=document.createElement('textarea');text.rows=2;text.maxLength=10000;text.value=part.text;text.setAttribute('aria-label','第 '+(index+1)+' 段文字');text.oninput=()=>{part.text=text.value;commit()};
    const reading=document.createElement('input');reading.type='text';reading.maxLength=10000;reading.value=part.reading||'';reading.spellcheck=false;reading.setAttribute('aria-label','第 '+(index+1)+' 段读音');reading.oninput=()=>{part.reading=reading.value;commit()};
    const textField=field('',text),readingField=field('',reading),setLabel=()=>{number.textContent=(part.language==='zh'?'中文段':'日语段')+' '+(index+1);textField.firstChild.textContent=part.language==='zh'?'中文':'日语';readingField.firstChild.textContent=part.language==='zh'?'覆盖自动读音（可选，带声调拼音）':'日语读音（假名，可选）';try{reading.placeholder=part.language==='zh'?'自动：'+S.autoReading(part.text):'例如：きょうも、よろしくね。'}catch{reading.placeholder='无法自动注音，请手动填写'}};
    select.onchange=()=>{part.language=select.value;part.reading='';reading.value='';setLabel();commit()};const onText=text.oninput;text.oninput=()=>{onText();setLabel()};setLabel();
    const advanced=document.createElement('details');advanced.className='speech-reading';const advancedSummary=document.createElement('summary');advancedSummary.textContent='读音修正（可选）';advanced.append(advancedSummary,readingField);advanced.open=!!part.reading;
    row.append(heading,textField,advanced);list.append(row);
   });
   addJa.disabled=addZh.disabled=parts.length>=32;
  }
  split.onclick=()=>{
   const text=textarea.value,start=textarea.selectionStart,end=textarea.selectionEnd;
   if(start===end){message.textContent='先在上方朗读框选中需要用中文说出的文字，再点这个按钮。';textarea.focus();return}
   parts=[...(start?[{language:'ja',text:text.slice(0,start),reading:''}]:[]),{language:'zh',text:text.slice(start,end),reading:''},...(end<text.length?[{language:'ja',text:text.slice(end),reading:''}]:[])];commit();render();list.querySelectorAll('input')[start?1:0]?.focus();
  };
  const add=language=>{if(languageSelect.value!=='segments')parts=initial();if(parts.length===1&&!parts[0].text.trim())parts=[];if(parts.length>=32)return;parts.push({language,text:'',reading:''});commit();render();list.lastElementChild?.querySelector('textarea')?.focus()};addJa.onclick=()=>add('ja');addZh.onclick=()=>add('zh');
  function sync(){const speech=getSpeech();const active=languageSelect.value==='segments'&&speech?.language==='segments';parts=active?speech.segments.map(p=>({...p})):initial();textarea.readOnly=active;split.disabled=active;message.textContent=active?'已启用分段朗读，整句预览只读；请在下面逐段修改。':'选中文字设为中文段，或添加片段。普通整句朗读无需展开这里。';details.open=active;render()}
  sync();return{sync,element:details,get speech(){return plan()}};
 }
 window.StorySpeechEditor={create};
})();
