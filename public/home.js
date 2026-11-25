const $=s=>document.querySelector(s),state=window.desktop?.getState()||{};
document.querySelectorAll('a[href^="library.html"]').forEach(a=>{const href=a.getAttribute('href');a.href='guide.html'+href.slice('library.html'.length)+(href.includes('#')?'':'#archive')});
if(window.desktop&&$('#homeResourceHint'))$('#homeResourceHint').textContent=window.desktop.mode==='lite'?'轻量版自动在线加载；在看板设置或剧情旁点击下载，才保存到本地。':'已收录资源可离线使用；检查后续更新需要联网。';
for(const k of ['favorites','recent','overrides','home','homeMusic'])if(state[k])localStorage.setItem(k,state[k]);
function notice(t){$('#notice').textContent=t;$('#info').showModal()}
$('#close').onclick=()=>$('#info').close();
if($('#hide'))$('#hide').onclick=()=>$('.screen').classList.toggle('clean');
if($('#fullscreen'))$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch(e){notice(e.message)}};
const btnCleanScreen=$('#btnCleanScreen'),cleanExitPill=$('#cleanExitPill');
let cleanPillTimer=0;
function setCleanFullscreen(active){
 const isClean=!!active;
 document.body.classList.toggle('is-clean-fullscreen',isClean);
 $('.screen')?.classList.toggle('is-clean-fullscreen',isClean);
 if(cleanExitPill){
  cleanExitPill.hidden=!isClean;
  cleanExitPill.classList.remove('faded');
 }
 if(isClean){
  if(window.homeStage?.stop)window.homeStage.stop(true);
  try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});}catch{}
  try{window.parent?.postMessage?.({type:'shiny-clean-fullscreen',active:true},location.origin);}catch{}
  clearTimeout(cleanPillTimer);
  cleanPillTimer=setTimeout(()=>{if(cleanExitPill)cleanExitPill.classList.add('faded');},3200);
 }else{
  try{if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});}catch{}
  try{window.parent?.postMessage?.({type:'shiny-clean-fullscreen',active:false},location.origin);}catch{}
 }
}
if(btnCleanScreen)btnCleanScreen.onclick=()=>setCleanFullscreen(true);
const ambientFrameBtn=$('#ambientFrameBtn');if(ambientFrameBtn)ambientFrameBtn.onclick=()=>{try{(window.parent?.PrismHub?.openAmbientFrame||window.PrismHub?.openAmbientFrame)?.()}catch{}};
if(cleanExitPill)cleanExitPill.onclick=()=>setCleanFullscreen(false);
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&document.body.classList.contains('is-clean-fullscreen'))setCleanFullscreen(false);
});
document.addEventListener('fullscreenchange',()=>{
 if(!document.fullscreenElement&&document.body.classList.contains('is-clean-fullscreen'))setCleanFullscreen(false);
});
document.addEventListener('mousemove',()=>{
 if(document.body.classList.contains('is-clean-fullscreen')&&cleanExitPill){
  cleanExitPill.classList.remove('faded');
  clearTimeout(cleanPillTimer);
  cleanPillTimer=setTimeout(()=>{cleanExitPill.classList.add('faded');},2800);
 }
});
$('#continue').onclick=e=>{e.preventDefault();let keys=[];try{keys=JSON.parse(localStorage.getItem('recent')||'[]')}catch{}location.href='guide.html?'+(keys[0]?'story='+encodeURIComponent(keys[0]):'mode=recent')+'#archive'};
async function counts(){try{const s=await(await fetch('/data/summary.json')).json();$('#count').textContent=s.catalog.toLocaleString();$('#translated').textContent=s.translationFiles.toLocaleString()}catch{$('#count').textContent='读取失败'}}
counts();window.addEventListener('content-updated',counts);
const announcement=$('#announcement');
announcement.onclick=async()=>{
 let summary={};try{summary=await(await fetch('/data/summary.json')).json()}catch{}
 let last=null;try{last=JSON.parse(state.updateNotice||localStorage.getItem('updateNotice')||'null')}catch{}
 const lines=['内容更新公告','当前目录：'+(summary.catalog||'未知')+' 篇剧情；'+(summary.translationFiles||'未知')+' 篇有翻译文件。','有翻译文件不代表每句均已完成；现有译者署名保留。','','最近版本调整：恢复原版画面；修复自动播放与快速点击；剧情导航就地展开并修正顺序；多人空白点击可轮换发言。','','缺失素材自动在线加载，官方优先、镜像兜底；点击保存离线资源才写入下载资源文件夹。','“更新”同步剧情与汉化、卡片与卡面、衣装模型、语音与电话等公开索引；新素材在线读取，保存离线资源才下载。资料仍取决于公开来源，不是游戏账号接口。'];
 if(last)lines.push('','最近一次成功检查：'+new Date(last.at).toLocaleString(),'新增剧情 '+(last.summary.newStories||0)+' 篇；有翻译文件 '+(last.summary.translationFiles||0)+' 篇。');
 else lines.push('','尚无本机成功更新记录。点击“更新”同步各类内容。');
 notice(lines.join('\n'));
};
$('#update').onclick=async()=>{if(window.ShinyUpdates)return window.ShinyUpdates.open();if(!window.desktop)return notice('当前为浏览器预览，请在桌面版中使用数据更新。');$('#update').disabled=true;notice('正在检查数据更新…');try{const r=await window.desktop.update();if(!r.ok)throw Error(r.error);$('#notice').textContent=`更新完成：新增 ${r.summary.newStories||0} 篇剧情，新增卡片 ${r.summary.newCards||0} 张、语音 ${r.summary.newVoices||0} 条、衣装模型 ${r.summary.newModels||0} 套。${r.summary.mirrorFailures?'其中 '+r.summary.mirrorFailures+' 个资源未取得，详见更新报告。':''}`;const record=JSON.stringify({at:new Date().toISOString(),summary:r.summary});localStorage.setItem('updateNotice',record);state.updateNotice=record;window.desktop?.saveState({updateNotice:record});await counts();if(r.summary.warnings?.length)$('#notice').textContent+=' '+r.summary.warnings.length+' 项资料暂未补齐，相关旧资料已保留。';}catch(e){$('#notice').textContent='更新失败，已保留原数据：'+e.message}finally{$('#update').disabled=false}};
window.desktop?.onProgress(t=>$('#notice').textContent=t);
const downloadAll=document.createElement('button');downloadAll.id='downloadAll';downloadAll.textContent='一键下载全部收录资源';$('#wardrobeClose').before(downloadAll);
let downloadWatch=null;
const stopDownloadWatch=()=>{if(downloadWatch){clearInterval(downloadWatch);downloadWatch=null}};
const describeDownload=s=>{const total=Number(s?.total||0),done=Number(s?.completed||0);return s?.message||('正在下载离线资源 '+(total?done.toLocaleString()+'/'+total.toLocaleString():'…'))};
const finishDownload=r=>{const s=r?.summary||r;if(!s)return;if(s.complete){$('#notice').textContent='离线资源已齐全。本次新下载 '+(Number(s.downloaded)||0).toLocaleString()+' 个文件。';downloadAll.textContent='一键下载全部收录资源';return}$('#notice').textContent=(s.aborted?s.aborted+'。':'')+'本次新下载 '+(Number(s.downloaded)||0).toLocaleString()+' 个文件，'+(Number(s.failed)||0).toLocaleString()+' 个失败；再次点击可继续。';downloadAll.textContent='继续下载离线资源'};
const watchDownload=()=>{stopDownloadWatch();downloadWatch=setInterval(async()=>{try{const s=await window.desktop.getDownloadState?.();if(!s)return;renderDownload(s);if(s.running){downloadAll.textContent='下载中…';$('#notice').textContent=describeDownload(s);return}stopDownloadWatch();if(s.summary)finishDownload(s);else if(s.interrupted){$('#notice').textContent='上次下载被中断，可再次点击继续。';downloadAll.textContent='继续下载离线资源'}else if(s.error){$('#notice').textContent='离线下载失败，已下载文件会保留：'+s.error}}catch{}},1500)};
const downloadStatus=document.createElement('p');downloadStatus.id='downloadStatus';downloadStatus.hidden=true;$('#downloadAll').after(downloadStatus);
const downloadPause=document.createElement('button');downloadPause.id='downloadPause';downloadPause.type='button';downloadPause.textContent='暂停下载';downloadPause.hidden=true;$('#downloadStatus').after(downloadPause);
const describeDownloadState=s=>{const total=Number(s?.total||0),done=Number(s?.completed||0),got=Number(s?.downloaded||0);if(s?.running)return (total?'已核对 '+done.toLocaleString()+'/'+total.toLocaleString()+' 项':'正在核对')+'，新下载 '+got.toLocaleString()+' 项';if(s?.aborted)return s.aborted;if(s?.interrupted)return s.message||'上次下载被中断，可再次点击继续';if(s?.summary)return s.summary.complete?'离线资源已齐全。本次新下载 '+(Number(s.summary.downloaded)||0).toLocaleString()+' 个文件':'本次新下载 '+(Number(s.summary.downloaded)||0).toLocaleString()+' 个文件，可再次点击继续';return ''};
const renderDownload=s=>{const text=describeDownloadState(s);downloadStatus.textContent=text;downloadStatus.hidden=!text;downloadPause.hidden=!s?.running;if(s?.running)downloadAll.textContent='下载中…';if(text&&!s?.running)downloadAll.textContent=s?.summary?.complete?'一键下载全部收录资源':'继续下载离线资源'};
const refreshDownload=async()=>{try{const s=await window.desktop?.getDownloadState?.();if(s)renderDownload(s)}catch{}};
downloadPause.onclick=async()=>{if(!window.desktop?.cancelDownload)return;downloadPause.disabled=true;try{await window.desktop.cancelDownload();$('#notice').textContent='正在暂停下载…'}catch(e){$('#notice').textContent='暂停失败：'+e.message}finally{downloadPause.disabled=false}};
if(typeof $('#wardrobe')?.addEventListener==='function')$('#wardrobe').addEventListener('click',()=>{refreshDownload();setTimeout(refreshDownload,700)});
downloadAll.onclick=async()=>{if(!window.desktop?.downloadAll)return notice('当前为浏览器预览；请在桌面版中使用一键离线下载。');try{const current=await window.desktop.getDownloadState?.();if(current&&current.running){$('#notice').textContent=describeDownload(current);watchDownload();return}downloadAll.disabled=true;notice('正在检查本机离线资源…');const r=await window.desktop.downloadAll();if(r&&r.summary){finishDownload(r);return}downloadAll.textContent='下载中…';watchDownload()}catch(e){$('#notice').textContent='离线下载失败，已下载文件会保留：'+e.message}finally{downloadAll.disabled=false}};
(window.desktop?.getDownloadState?.()||Promise.resolve(null)).then(s=>{if(!s)return;renderDownload(s);if(s.running){downloadAll.textContent='下载中…';$('#notice').textContent=describeDownload(s);watchDownload()}else if(s.interrupted||(s.summary&&!s.summary.complete)){downloadAll.textContent='继续下载离线资源'}}).catch(()=>{});
window.desktop?.onDownloadProgress?.(t=>$('#notice').textContent=t);
// Each desktop launch checks small revision indexes and silently updates in background when changes exist.
let startupCheck=null;
if(window.desktop?.checkUpdates)setTimeout(async()=>{
 try{
  startupCheck=await window.desktop.checkUpdates();
  const changed=startupCheck.sources?.filter(s=>s.changed||s.newStories||s.newVoices)||[];
  if(changed.length){
   announcement.classList.add('has-update');
   announcement.querySelector('small').textContent='有更新';
   announcement.title='检测到公开资料有新版本，点击左侧“更新”即可同步';
  }
 }catch(e){startupCheck={sources:[{name:'检查',error:e.message}]};}
},3800);
announcement.addEventListener('click',()=>{
 if(!startupCheck)return;const labels={official:'官方资源索引','ShinyGroup/SCTranslationData':'社区汉化资料','ShinyColorsDB/ShinyColorsDB-Album':'公开剧情目录'};
 const lines=startupCheck.offline?['启动检查：当前为离线模式。']:['','启动自动检查：'+new Date(startupCheck.checkedAt).toLocaleString(),...(startupCheck.sources||[]).map(s=>(labels[s.name]||s.name)+'：'+(s.error?'检查失败，保留本地内容':s.newStories||s.newVoices?'新增脚本 '+s.newStories+' 个、语音 '+s.newVoices+' 条（待整理）':s.changed===true?'检测到变化':s.changed===false?'未变化':'已建立检查基线')),'官方索引变化可能涉及任意资源，不等同于已确认新增剧情或语音。点“更新”更新公开目录；素材仍由下载按钮保存。'];
 $('#notice').textContent+='\n'+lines.join('\n');
});

/* ── Producer Birthday Office Celebration ── */
window.triggerHomeBirthdayCelebration = () => {
  const container = document.createElement('div');
  container.className = 'bday-confetti-container';
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden;';
  document.body.append(container);

  const colors = ['#ff8da1', '#ffc107', '#4dd0e1', '#b388ff', '#81c784', '#ff80ab', '#ffd54f'];
  const symbols = ['✦', '★', '●', '✿', '✧', '♦'];
  for (let i = 0; i < 48; i++) {
    const p = document.createElement('span');
    const color = colors[i % colors.length];
    const symbol = symbols[i % symbols.length];
    const left = Math.random() * 100;
    const size = 12 + Math.random() * 16;
    const dur = 2.5 + Math.random() * 2;
    const delay = Math.random() * 0.8;
    p.textContent = symbol;
    p.style.cssText = `position:absolute;left:${left}vw;top:-30px;font-size:${size}px;color:${color};opacity:${0.8 + Math.random()*0.2};animation:bdayFall ${dur}s ease-in ${delay}s both;transform:rotate(${Math.random()*360}deg);text-shadow:0 0 8px ${color}88;`;
    container.append(p);
  }

  if (!document.getElementById('bdayAnimStyle')) {
    const style = document.createElement('style');
    style.id = 'bdayAnimStyle';
    style.textContent = `@keyframes bdayFall { 0% { transform: translateY(0) rotate(0deg) scale(0.8); opacity: 1; } 50% { transform: translateY(50vh) rotate(180deg) scale(1.1); } 100% { transform: translateY(105vh) rotate(360deg) scale(0.6); opacity: 0; } }`;
    document.head.append(style);
  }

  setTimeout(() => container.remove(), 5500);

  // If multiple idols are on screen, randomly pick one idol to speak and deliver the birthday greeting
  try {
    const inspected = window.homeMulti?.inspect?.();
    const count = (inspected && inspected.length > 0) ? inspected.length : 1;
    const randomSlot = Math.floor(Math.random() * count);
    if (randomSlot > 0 && typeof window.homeMulti?.speakExtra === 'function') {
      window.homeMulti.speakExtra(randomSlot);
    } else {
      window.homeStage?.speak?.();
    }
  } catch {
    try { window.homeStage?.speak?.(); } catch {}
  }

  let pName = '';
  try {
    pName = (localStorage.getItem('shiny.producerName') || window.desktop?.getState()?.[KEY_NAME] || '').trim();
  } catch {}
  const banner = document.getElementById('producerBirthdayHomeBanner') || document.createElement('div');
  banner.id = 'producerBirthdayHomeBanner';
  banner.className = 'producer-birthday-banner';
  banner.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:92;display:flex;align-items:center;gap:10px;padding:10px 22px;border-radius:999px;background:linear-gradient(135deg,#fff8e7f8,#fff0f5f8);border:1.5px solid #ffb6c1;box-shadow:0 8px 26px rgba(220,100,140,0.28);font-size:14px;font-weight:600;color:#9b335c;backdrop-filter:blur(10px);pointer-events:auto;animation:bday-zoom 0.4s cubic-bezier(0.16,1,0.3,1) both;';
  banner.innerHTML = `<span>🎂</span><span>祝<strong>${pName ? '【' + pName + '】' : ''}</strong>制作人先生，诞生日快乐！✨</span><button type="button" style="margin-left:6px;background:none;border:none;color:#b33966;cursor:pointer;font-size:16px;line-height:1;padding:0 4px;" aria-label="关闭">✕</button>`;
  banner.querySelector('button').onclick = () => banner.remove();
  document.body.append(banner);
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 12000);
};
