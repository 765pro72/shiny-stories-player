(()=>{
 const F=TranslationFormat;let catalogPromise,exportController=null;
 const getCatalog=()=>catalogPromise??=fetch('/data/catalog.json').then(r=>r.json());
 function message(text){let p=document.querySelector('#storyTextStatus');if(!p){p=document.createElement('p');p.id='storyTextStatus';p.setAttribute('role','status');(document.querySelector('#storyTextToolbar')||document.querySelector('#exportAll')?.parentElement||document.querySelector('main')).append(p)}p.textContent=text}
 function download(name,blob){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}
 const overrides=()=>{try{return JSON.parse(localStorage.getItem('overrides')||'{}')}catch{return{}}};
 async function exportStory(key,kind){message('正在读取剧情全文…');try{const r=await fetch(key.startsWith('custom:')?'/api/custom-stories/'+encodeURIComponent(key.slice(7))+'/text':'/api/story-text?key='+encodeURIComponent(key)),v=await r.json();if(!r.ok)throw Error(v.error);const local=overrides()[key]||{},rows=v.rows.map(line=>{const translation=local[line.original]||line.translation;return{...line,translation:kind==='original'?'':translation,existingTranslation:kind==='original'?translation:undefined,source:Object.hasOwn(local,line.original)?'用户补译':v.translator}}),bundle=F.bundle(rows,{title:v.title,exportKind:kind,translator:v.translator,additionalSources:v.additionalSources});download((v.title||key).replace(/[\\/:*?"<>|]/g,'_')+'-'+(kind==='original'?'日语原文-可回填':'汉化文本')+'.json',new Blob([JSON.stringify(bundle,null,2)],{type:'application/json;charset=utf-8'}));message('已导出 '+rows.length+' 句；文件内包含翻译填写格式和导入说明。')}catch(e){message('导出未完成：'+e.message)}}
 window.storyTextActions=story=>{const key=typeof story==='string'?story:story.key,host=document.createElement('span');host.className='story-text-actions';const menu=document.createElement('details'),summary=document.createElement('summary');summary.className='story-action-btn story-export-btn';summary.innerHTML='<span>导出文本</span><svg class="chevron-ic" viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none"><path d="M6 9l6 6 6-6"/></svg>';menu.append(summary);const pane=document.createElement('div');pane.className='dropdown-pane';for(const [kind,label]of [['original','日语原文（可回填）'],['translated','汉化文本']]){const b=document.createElement('button');b.type='button';b.className='dropdown-item';b.textContent=label;b.onclick=()=>{menu.open=false;exportStory(key,kind)};pane.append(b)}menu.append(pane);const input=document.createElement('button');input.type='button';input.className='story-action-btn story-import-btn';input.textContent='导入文本';input.onclick=()=>TranslationExchange.controller?.importStory(key);host.append(menu,input);return host};
 async function exportMissing(button){const disabled=button.disabled;button.disabled=true;message('正在汇总缺译文本…');try{const response=await fetch('/api/story-text/missing?scope=story'),value=await response.json();if(!response.ok)throw Error(value.error);download('缺译文本-剧情'+value.counts.story+'条.json',new Blob([JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}));message('已导出剧情缺译清单 '+value.counts.story+' 条；主界面语音请到「语音馆」导出。')}catch(e){message('导出未完成：'+e.message)}finally{button.disabled=disabled}}
 async function exportAll(button,cancel){if(exportController)return;exportController=new AbortController();button.disabled=true;cancel.hidden=false;let poll;try{const r=await fetch('/api/story-text/export',{method:'POST',signal:exportController.signal}),job=await r.json();if(!r.ok)throw Error(job.error);message('正在导出全部原文；可以继续浏览或停止导出。');poll=setInterval(async()=>{try{const p=await fetch('/api/story-text/progress?id='+job.id).then(r=>r.json());message('正在导出原文：'+p.done+' / '+p.total+' 篇'+(p.missing?.length?' · '+p.missing.length+' 篇暂未取得':''))}catch{}},1000);const response=await fetch(job.url,{signal:exportController.signal});if(!response.ok)throw Error('原文压缩包生成失败');const blob=await response.blob();download('全部剧情原文-可翻译回填.zip',blob);message('原文压缩包已导出。解压后的每篇 JSON 都附有填写及导入说明；缺失条目见 manifest.json。')}catch(e){message(e.name==='AbortError'?'已停止原文导出。':'导出未完成：'+e.message)}finally{clearInterval(poll);exportController=null;button.disabled=false;cancel.hidden=true}}
 window.addEventListener('DOMContentLoaded',async()=>{
  let toolbar=document.querySelector('#exportAll')?.parentElement;
  if(!toolbar){
   toolbar=document.createElement('div');
   toolbar.id='storyTextToolbar';
   toolbar.className='story-text-toolbar';
   const cardHeading=document.querySelector('#cardArchive .collection-heading');
   if(cardHeading){
    const cardCount=cardHeading.querySelector('#cardCount');
    if(cardCount)cardHeading.insertBefore(toolbar,cardCount);
    else cardHeading.append(toolbar);
   }
   else document.querySelector('main')?.append(toolbar);
   const catalog=await getCatalog();
   TranslationExchange.attach({getOverrides:overrides,setOverrides:value=>{const text=JSON.stringify(value);localStorage.setItem('overrides',text);window.desktop?.saveState({overrides:text});window.dispatchEvent(new CustomEvent('translation-overrides-changed',{detail:value}))},keys:()=>catalog.map(s=>s.key),message});
  }
  const missing=document.querySelector('#exportAll');if(missing)missing.onclick=()=>exportMissing(missing);
  const button=document.createElement('button'),cancel=document.createElement('button');button.type=cancel.type='button';button.id='exportAllOriginals';button.textContent='导出全部原文（可回填）';cancel.textContent='停止导出';cancel.hidden=true;button.onclick=()=>exportAll(button,cancel);cancel.onclick=()=>exportController?.abort();
  if(missing&&missing.parentElement===toolbar)missing.insertAdjacentElement('afterend',button);
  else toolbar.prepend(button);
  button.insertAdjacentElement('afterend',cancel);
 });
  window.StoryText={exportStory};

  function ensureTranscriptJumpStyles() {
    if (document.getElementById('transcriptJumpStyles')) return;
    const style = document.createElement('style');
    style.id = 'transcriptJumpStyles';
    style.textContent = `
      .transcript-line-head {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .transcript-line-jump-btn {
        margin-left: auto;
        padding: 3px 10px;
        border-radius: 999px;
        border: 1px solid rgba(14, 165, 233, 0.38);
        background: rgba(14, 165, 233, 0.12);
        color: #0369a1;
        font-size: 11.5px;
        font-weight: 600;
        line-height: 1.4;
        cursor: pointer;
        transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
        touch-action: manipulation;
      }
      .transcript-line-jump-btn:hover {
        background: #0284c7;
        border-color: #0284c7;
        color: #fff;
      }
      html[data-theme="dark"] .transcript-line-jump-btn {
        border-color: rgba(56, 189, 248, 0.36);
        background: rgba(56, 189, 248, 0.15);
        color: #7dd3fc;
      }
      html[data-theme="dark"] .transcript-line-jump-btn:hover {
        background: rgba(56, 189, 248, 0.32);
        border-color: rgba(56, 189, 248, 0.78);
        color: #fff;
      }
      .line.has-jump .transcript-line-text {
        cursor: pointer;
        border-radius: 6px;
        transition: background 0.16s ease;
      }
      .line.has-jump .transcript-line-text:hover {
        background: rgba(56, 189, 248, 0.1);
      }
      .line.is-jumped {
        outline: 1.5px solid rgba(56, 189, 248, 0.65);
        background: rgba(56, 189, 248, 0.12) !important;
        transition: background 0.25s ease;
      }
    `;
    document.head.appendChild(style);
  }

  window.mountTranscriptLines = function(div, lines, storyKey, onUpdated, onJump) {
    if (!div) return;
    ensureTranscriptJumpStyles();
    div.replaceChildren();
    const allOverrides = () => {
      try { return JSON.parse(localStorage.getItem('overrides') || '{}'); }
      catch { return {}; }
    };

    lines.forEach(r => {
      if (r.defaultTranslation === undefined) {
        r.defaultTranslation = r.translation || '';
      }
      const canJump = typeof onJump === 'function' && Number.isInteger(r.trackIndex);
      const row = document.createElement('div');
      row.className = 'line' + (canJump ? ' has-jump' : '');

      const head = document.createElement('div');
      head.className = 'transcript-line-head';

      const speaker = document.createElement('strong');
      speaker.className = 'transcript-line-speaker';
      speaker.textContent = (r.speaker || '制作人') + '：';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'transcript-line-edit-btn';
      editBtn.setAttribute('title', '直接修改此句中文台词');
      editBtn.setAttribute('aria-label', '直接修改此句中文台词');
      editBtn.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';

      const triggerJump = () => {
        if (!canJump) return;
        div.querySelectorAll('.line.is-jumped').forEach(el => el.classList.remove('is-jumped'));
        row.classList.add('is-jumped');
        onJump(r.trackIndex, r);
        document.getElementById('stage')?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => row.classList.remove('is-jumped'), 1800);
      };

      if (canJump) {
        const jumpBtn = document.createElement('button');
        jumpBtn.type = 'button';
        jumpBtn.className = 'transcript-line-jump-btn';
        jumpBtn.textContent = '▶ 从这播放';
        jumpBtn.title = '从这一句开始恢复场景与语音并播放';
        jumpBtn.onclick = e => {
          e.stopPropagation();
          triggerJump();
        };
        head.append(speaker, jumpBtn, editBtn);
      } else {
        head.append(speaker, editBtn);
      }

      const curMap = allOverrides();
      const storyMap = storyKey ? (curMap[storyKey] || {}) : {};
      const effectiveTranslation = storyMap[r.original] !== undefined ? storyMap[r.original] : (r.translation || '');

      const textDiv = document.createElement('div');
      textDiv.className = 'transcript-line-text';
      textDiv.textContent = effectiveTranslation || ('【待翻译】' + (r.original || ''));
      if (canJump) {
        textDiv.title = '点击从这一句开始播放';
        textDiv.onclick = () => {
          if (!editBox.hidden) return;
          if (window.getSelection && window.getSelection().toString()) return;
          triggerJump();
        };
      }

      const origSmall = document.createElement('small');
      origSmall.className = 'transcript-line-orig';
      origSmall.textContent = r.original || '';

      const editBox = document.createElement('div');
      editBox.className = 'transcript-editor-box';
      editBox.hidden = true;

      const origValEsc = (r.original || '').replace(/[<>&"]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[s]));
      editBox.innerHTML = `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span class="transcript-editor-orig-tag">日文原文</span>
          <span class="transcript-editor-orig-val">${origValEsc}</span>
        </div>
        <textarea class="transcript-editor-textarea" rows="2" placeholder="在此直接编辑或修改中文翻译台词…"></textarea>
        <div class="transcript-editor-actions">
          <button type="button" class="transcript-btn-save">✓ 保存</button>
          <button type="button" class="transcript-btn-cancel">✕ 取消</button>
          <button type="button" class="transcript-btn-reset">↶ 恢复默认</button>
        </div>
      `;

      const textarea = editBox.querySelector('textarea');
      const saveBtn = editBox.querySelector('.transcript-btn-save');
      const cancelBtn = editBox.querySelector('.transcript-btn-cancel');
      const resetBtn = editBox.querySelector('.transcript-btn-reset');

      const closeEditor = () => {
        editBox.hidden = true;
        textDiv.hidden = false;
        origSmall.hidden = false;
      };

      editBtn.onclick = () => {
        const willOpen = editBox.hidden;
        div.querySelectorAll('.transcript-editor-box').forEach(b => {
          if (b !== editBox) {
            b.hidden = true;
            const p = b.parentElement;
            if (p) {
              p.querySelector('.transcript-line-text')?.removeAttribute('hidden');
              p.querySelector('.transcript-line-orig')?.removeAttribute('hidden');
            }
          }
        });
        if (willOpen) {
          const mapNow = allOverrides();
          const smNow = storyKey ? (mapNow[storyKey] || {}) : {};
          textarea.value = smNow[r.original] !== undefined ? smNow[r.original] : (r.translation || r.original || '');
          textDiv.hidden = true;
          origSmall.hidden = true;
          editBox.hidden = false;
          setTimeout(() => { textarea.focus(); textarea.select(); }, 40);
        } else {
          closeEditor();
        }
      };

      cancelBtn.onclick = () => {
        closeEditor();
      };

      saveBtn.onclick = async () => {
        const newText = textarea.value.trim();
        if (!newText) {
          textarea.focus();
          return;
        }
        const mapNow = allOverrides();
        if (storyKey) {
          mapNow[storyKey] = mapNow[storyKey] || {};
          mapNow[storyKey][r.original] = newText;
        }
        const jsonStr = JSON.stringify(mapNow);
        localStorage.setItem('overrides', jsonStr);
        window.desktop?.saveState?.({ overrides: jsonStr });

        r.translation = newText;
        textDiv.textContent = newText;
        closeEditor();

        try {
          fetch('/api/save-subtitle-override', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              story: storyKey,
              original: r.original,
              translation: newText,
              speaker: r.speaker
            })
          }).catch(() => {});
        } catch {}

        if (onUpdated) onUpdated(mapNow[storyKey] || {});
      };

      resetBtn.onclick = () => {
        const mapNow = allOverrides();
        if (storyKey && mapNow[storyKey]) {
          delete mapNow[storyKey][r.original];
          const jsonStr = JSON.stringify(mapNow);
          localStorage.setItem('overrides', jsonStr);
          window.desktop?.saveState?.({ overrides: jsonStr });
        }
        const origTrans = r.defaultTranslation || '';
        r.translation = origTrans;
        textDiv.textContent = origTrans || ('【待翻译】' + (r.original || ''));
        closeEditor();
        if (onUpdated) onUpdated(mapNow[storyKey] || {});
      };

      row.append(head, textDiv, origSmall, editBox);
      div.append(row);
    });
  };
})();
