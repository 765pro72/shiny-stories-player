/* The host toolbar stays the same for both playback implementations. */
(()=>{
 let host;try{host=frameElement?.closest('dialog,section')?.querySelector('.toolbar')||parent.document.querySelector('#viewer .toolbar,#storyViewer .toolbar')}catch{}
 if(!host)return;
 host.querySelector('.story-engine-settings')?.remove();
 const doc=host.ownerDocument,menu=doc.createElement('details');menu.className='story-engine-settings';
 const summary=doc.createElement('summary');summary.textContent='播放设置';menu.append(summary);
 const label=doc.createElement('label');label.textContent='播放器 ';const select=doc.createElement('select');select.setAttribute('aria-label','剧情播放器');
 select.append(new Option('ShinyScenarioViewer','scenario'),new Option('兼容旧版','legacy'));select.value=location.pathname.endsWith('/legacy.html')?'legacy':'scenario';
 select.onchange=()=>{const target=new URL(location.href);target.pathname='/player/'+(select.value==='legacy'?'legacy.html':'main.html');frameElement.src=target.pathname+target.search};
 label.append(select);menu.append(label);
 let notice;
 const license=doc.createElement('button');license.type='button';license.textContent='源码与许可';license.style.marginLeft='12px';license.onclick=()=>{
  if(!notice){notice=doc.createElement('dialog');notice.setAttribute('aria-label','播放器源码与许可');Object.assign(notice.style,{width:'min(850px,85vw)',height:'75vh',padding:'16px',border:'1px solid #ddd',borderRadius:'16px'});const close=doc.createElement('button');close.type='button';close.textContent='关闭';close.onclick=()=>notice.close();const content=doc.createElement('iframe');content.src='/player/scenario/NOTICE.html';content.title='播放器源码与许可';Object.assign(content.style,{display:'block',border:'0',width:'100%',height:'calc(100% - 55px)',marginTop:'12px'});notice.append(close,content);doc.body.append(notice)}notice.showModal();
 };menu.append(license);host.append(menu);
 addEventListener('pagehide',()=>{menu.remove();notice?.remove()},{once:true});
})();
