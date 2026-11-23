// A renderer can leave or close the panel without owning the update lifetime.
(() => {
  const desktop=window.desktop;if(!desktop?.startUpdate||!desktop.getUpdateState)return;
  let current={status:'idle'},panel,monitor,lastFinished;
  const element=(tag,text,cls)=>{const node=document.createElement(tag);node.textContent=text||'';if(cls)node.className=cls;return node};
  const elapsed=ms=>{const seconds=Math.floor(ms/1000);return Math.floor(seconds/60)+'分'+String(seconds%60).padStart(2,'0')+'秒'};
  function render(state){
    current=state;const running=state.status==='running',complete=state.status==='complete';
    monitor.hidden=state.status==='idle';monitor.dataset.state=state.status;
    monitor.textContent=running?'↻ 后台更新 · '+elapsed(state.elapsedMs||0):complete?'✓ 更新完成':'! 更新未完成';
    panel.querySelector('h2').textContent=running?'正在后台更新':complete?'内容已更新':'更新未完成';
    panel.querySelector('.update-message').textContent=state.message||'检查剧情、汉化、卡片、衣装、语音与电话等公开索引。';
    panel.querySelector('.update-elapsed').textContent=running?'已运行 '+elapsed(state.elapsedMs||0)+' · 可关闭此面板或切换页面继续使用':'原有资源、收藏与阅读记录保留。关闭程序后，未完成任务需下次重试。';
    const warnings=panel.querySelector('.update-warnings'),issues=state.summary?.warnings||[];warnings.hidden=!issues.length;warnings.textContent=issues.slice(0,12).map(w=>(w.source||'公开资料')+(w.id?' · '+w.id:'')+'：'+w.error).join('\n')+(issues.length>12?'\n另有 '+(issues.length-12)+' 项，详见更新目录的 summary.json。':'');
    const list=panel.querySelector('ol');list.replaceChildren(...(state.history||[]).slice(-12).map(row=>element('li',new Date(row.at).toLocaleTimeString()+'  '+row.message)));
    const retry=panel.querySelector('.update-retry');retry.hidden=running;retry.textContent=complete?'再次检查':'重试更新';
    panel.querySelector('.update-background-close').textContent=running?'后台继续':'关闭';panel.querySelector('.update-refresh').hidden=!complete;
    for(const button of document.querySelectorAll('#update')){button.title=running?'更新正在后台进行，点击查看进度':'检查全部内容更新';const small=button.querySelector('small');if(small)small.textContent=running?'更新中':'更新'}
    if(complete&&lastFinished!==state.finishedAt){lastFinished=state.finishedAt;window.dispatchEvent(new CustomEvent('content-updated',{detail:state.summary}))}
  }
  async function start(){
    panel.showModal();
    if(current.status==='running')return;
    try{const result=await desktop.startUpdate();if(!result.ok)throw Error(result.error);render(result.state)}
    catch(error){const message=String(error&&error.message||'').trim()||'更新请求没有成功。请检查网络（或稍后重试），错误详情见更新目录的 summary.json。';render({status:'failed',message,history:[]})}
  }
  function init(){
    panel=element('dialog','','update-panel');panel.setAttribute('aria-label','内容更新进度');
    panel.style.cssText='max-width:min(500px,92vw);width:min(500px,92vw);border-radius:22px;padding:20px 22px;box-shadow:0 24px 64px rgba(15,23,42,0.28);';
    const heading=element('h2','内容更新'),message=element('p','','update-message'),meta=element('p','','update-elapsed'),history=element('ol'),actions=element('div','','update-panel-actions');
    message.setAttribute('role','status');const retry=element('button','重试更新','update-retry'),close=element('button','后台继续','update-background-close');retry.type=close.type='button';retry.onclick=start;close.onclick=()=>panel.close();
    const refresh=element('button','刷新目录','update-refresh');refresh.type='button';refresh.hidden=true;
    refresh.onclick=()=>{window.dispatchEvent(new CustomEvent('content-updated',{detail:current.summary}));panel.close();};
    panel.addEventListener('click',e=>{if(e.target===panel)panel.close();});
    actions.append(refresh,retry,close);const warnings=element('p','','update-warnings');warnings.hidden=true;panel.append(heading,message,meta,warnings,history,actions);
    monitor=element('button','','update-monitor');monitor.type='button';monitor.hidden=true;monitor.setAttribute('aria-label','查看后台更新进度');
    let mDrag=null;
    monitor.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      const r=monitor.getBoundingClientRect();
      mDrag={startX:e.clientX,startY:e.clientY,origX:r.left,origY:r.top,w:r.width,h:r.height,moved:false};
      const onMove=ev=>{
        if(!mDrag)return;
        const dx=ev.clientX-mDrag.startX,dy=ev.clientY-mDrag.startY;
        if(Math.abs(dx)+Math.abs(dy)>4)mDrag.moved=true;
        if(mDrag.moved){
          const nx=Math.max(10,Math.min(window.innerWidth-mDrag.w-10,mDrag.origX+dx));
          const ny=Math.max(10,Math.min(window.innerHeight-mDrag.h-10,mDrag.origY+dy));
          monitor.style.right='auto';monitor.style.bottom='auto';
          monitor.style.left=nx+'px';monitor.style.top=ny+'px';
        }
      };
      const onUp=()=>{
        document.removeEventListener('pointermove',onMove);
        document.removeEventListener('pointerup',onUp);
        setTimeout(()=>{mDrag=null;},50);
      };
      document.addEventListener('pointermove',onMove);
      document.addEventListener('pointerup',onUp);
    });
    monitor.onclick=()=>{if(!mDrag?.moved)panel.showModal();};
    document.body.append(monitor,panel);
    window.ShinyUpdates={open:start};for(const button of document.querySelectorAll('#update'))button.onclick=e=>{e?.preventDefault?.();start();};
    desktop.onUpdateState(render);desktop.getUpdateState().then(render).catch(()=>{});
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
