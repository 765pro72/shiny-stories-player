if(!require('./assistant-test-entry.cjs').tryRun()){
const {app,BrowserWindow,ipcMain,shell,net,dialog,screen}=require('electron'),path=require('path'),fs=require('fs');const {start}=require('./server.cjs');const {BackgroundUpdates}=require('./update-background.cjs');const {downloadAll}=require('./offline-downloader.cjs');let server,w,companionWin=null,busy=false,updates,assistant;
try{
  app.commandLine.appendSwitch('high-dpi-support','1');
  app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
  app.commandLine.appendSwitch('disable-direct-composition-video-overlays');
}catch{}
let repairReceipt=null;try{repairReceipt=require('./assistant-install.cjs').resume(process.argv,app.getPath('exe'));if(repairReceipt)app.setPath('userData',repairReceipt.config.userData)}catch(e){console.error('修复回执：',e.message)}
const allowMulti=!!repairReceipt||process.argv.includes('--assistant-test');
if(!allowMulti){
  const gotLock=app.requestSingleInstanceLock();
  if(!gotLock){app.quit();return;}
  app.on('second-instance',()=>{if(w&&!w.isDestroyed()){if(w.isMinimized())w.restore();w.show();w.focus();}});
}
app.whenReady().then(async()=>{const dir=app.getPath('userData'),stateFile=path.join(dir,'reader-state.json');let mode='development';try{mode=JSON.parse(fs.readFileSync(path.join(__dirname,'release-mode.json'),'utf8')).mode||mode}catch{}
const bundledData=path.join(__dirname,'data');let data=bundledData;
const isSnapshotFresh=(snapDir)=>{try{const bSum=JSON.parse(fs.readFileSync(path.join(bundledData,'summary.json'),'utf8')),sSum=JSON.parse(fs.readFileSync(path.join(snapDir,'summary.json'),'utf8'));if((sSum.catalog||0)<(bSum.catalog||0)||(sSum.translationFiles||0)<(bSum.translationFiles||0))return false;let bBase={},sBase={};try{bBase=JSON.parse(fs.readFileSync(path.join(bundledData,'update-baseline.json'),'utf8'))}catch{}try{sBase=JSON.parse(fs.readFileSync(path.join(snapDir,'update-baseline.json'),'utf8'))}catch{}if(bBase.updatedAt&&(!sBase.updatedAt||Date.parse(bBase.updatedAt)>Date.parse(sBase.updatedAt)))return false;return true;}catch{return false;}};
const cleanStaleUpdateFiles=(folder)=>{for(const f of ['active-data.json','update-check.json','update-status.json']){try{fs.unlinkSync(path.join(folder,f))}catch{}}};
try{const a=JSON.parse(fs.readFileSync(path.join(dir,'active-data.json'),'utf8'));if(a?.data&&fs.existsSync(path.join(a.data,'catalog.json'))&&isSnapshotFresh(a.data)){data=a.data;}else{cleanStaleUpdateFiles(dir);}}catch{}
let downloadDir=path.join(path.dirname(app.getPath('exe')),'下载资源');try{fs.mkdirSync(downloadDir,{recursive:true});const check=path.join(downloadDir,'.write-check');fs.writeFileSync(check,'');fs.unlinkSync(check)}catch{downloadDir=path.join(dir,'下载资源');fs.mkdirSync(downloadDir,{recursive:true})}
try{const pointer=JSON.parse(fs.readFileSync(path.join(downloadDir,'active-data.json'),'utf8'));if(pointer?.data&&fs.existsSync(path.join(pointer.data,'catalog.json'))&&isSnapshotFresh(pointer.data)){data=pointer.data;}else{cleanStaleUpdateFiles(downloadDir);}}catch{try{const uc=JSON.parse(fs.readFileSync(path.join(downloadDir,'update-check.json'),'utf8')),bBase=JSON.parse(fs.readFileSync(path.join(bundledData,'update-baseline.json'),'utf8'));if(bBase.updatedAt&&uc.baselineUpdatedAt!==bBase.updatedAt)cleanStaleUpdateFiles(downloadDir);}catch{}}
const openMusicLoginWindow=(platform='ncm')=>new Promise((resolve)=>{
 const targets={
  ncm:{url:'https://music.163.com/#/login',title:'网易云音乐官方登录（扫码点确认后自动生效并关闭）',domain:'163.com',check:cs=>cs.some(c=>c.name==='MUSIC_U'&&c.value&&c.value.length>15)},
  qq:{url:'https://y.qq.com/',title:'QQ音乐官方登录（登录后自动提取绿钻/VIP态并关闭）',domain:'qq.com',check:cs=>cs.some(c=>(c.name==='qm_keyst'||c.name==='qqmusic_key')&&c.value&&c.value.length>8)},
  kugou:{url:'https://www.kugou.com/',title:'酷狗音乐官方登录（登录后自动提取VIP态并关闭）',domain:'kugou.com',check:cs=>cs.some(c=>(c.name==='t'||c.name==='token')&&c.value&&c.value.length>6)&&cs.some(c=>c.name==='KugouID'||c.name==='KuGoo')},
  apple:{url:'https://music.apple.com/cn/home',title:'Apple Music 官方登录（登录后自动提取订阅令牌并关闭）',domain:'apple.com',check:cs=>cs.some(c=>c.name==='media-user-token'&&c.value&&c.value.length>15)},
  migu:{url:'https://music.migu.cn/v3',title:'咪咕音乐官方登录（登录后自动生效并关闭）',domain:'migu.cn',check:cs=>cs.some(c=>(c.name==='migu_music_sid'||c.name==='migu_music_token')&&c.value&&c.value.length>6)}
 };
 const t=targets[platform]||targets.ncm;
 let settled=false,timer=0,lw=null;
 const finish=(res)=>{if(settled)return;settled=true;clearInterval(timer);try{if(lw&&!lw.isDestroyed())lw.close();}catch{}resolve(res);};
 try{
  lw=new BrowserWindow({width:980,height:700,parent:w&&!w.isDestroyed()?w:undefined,title:t.title,autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true}});
  lw.loadURL(t.url).catch(()=>{});
  lw.on('closed',()=>finish({ok:false,message:'登录窗口已关闭'}));
  timer=setInterval(async()=>{
   if(!lw||lw.isDestroyed()){finish({ok:false,message:'登录窗口已关闭'});return;}
   try{
    const all=await lw.webContents.session.cookies.get({});
    const domCookies=all.filter(c=>c&&c.name&&c.value&&String(c.domain||'').toLowerCase().includes(t.domain));
    if(t.check(domCookies)){
     const cookieStr=domCookies.map(c=>`${c.name}=${c.value}`).join('; ');
     const uin=domCookies.find(c=>c.name==='uin'||c.name==='p_uin'||c.name==='wxuin')?.value?.replace(/\D+/g,'')||'';
     const token=domCookies.find(c=>c.name==='t'||c.name==='token'||c.name==='media-user-token')?.value||'';
     const userid=domCookies.find(c=>c.name==='KugouID')?.value||'';
     finish({ok:true,cookie:cookieStr,uin,token,userid});
    }
   }catch{}
  },700);
 }catch(e){finish({ok:false,message:e.message});}
});
const portFile=path.join(dir,'port.txt');let preferredPort=18765;try{const pNum=Number(fs.readFileSync(portFile,'utf8').trim());if(Number.isInteger(pNum)&&pNum>=1024&&pNum<=65535)preferredPort=pNum;}catch{}
const srvOpts={legacyCacheRoot:path.join(dir,'asset-cache'),fetch:(...args)=>net.fetch(...args),getElectronCookies:async()=>{try{return await require('electron').session.defaultSession.cookies.get({});}catch{return[];}},openMusicLoginWindow,assistantWorkRoot:path.join(downloadDir,'AI助手'),runtimeRoot:path.dirname(app.getPath('exe')),electronExecutable:app.getPath('exe'),canApplyRepair:mode==='lite'};
let s;try{s=await start(path.join(downloadDir,'asset-cache'),preferredPort,()=>data,srvOpts);}catch(e){if(e.code!=='EADDRINUSE'&&e.code!=='EACCES')throw e;s=await start(path.join(downloadDir,'asset-cache'),0,()=>data,srvOpts);}try{fs.writeFileSync(portFile,String(new URL(s.url).port));}catch{}server=s.server;assistant=s.assistant;
ipcMain.on('read-state',e=>{try{e.returnValue=JSON.parse(fs.readFileSync(stateFile));}catch{e.returnValue={};}});
ipcMain.handle('open-download-folder',async e=>{if(e.sender!==w.webContents)return;await shell.openPath(downloadDir);return downloadDir});
ipcMain.handle('open-assistant-folder',async(e,id)=>{if(e.sender!==w.webContents)return;const folder=assistant?.folder(id);if(folder)await shell.openPath(folder)});
ipcMain.on('read-mode',e=>{e.returnValue=mode});
ipcMain.on('write-state',(e,v)=>{const okSender=e.sender===w?.webContents||(companionWin&&!companionWin.isDestroyed()&&e.sender===companionWin.webContents);if(!okSender||!v||typeof v!=='object')return;let state={};try{state=JSON.parse(fs.readFileSync(stateFile));}catch{}const fixedKeys=new Set(['favorites','recent','overrides','home','homeMusic','updateNotice','anime4k','qualityPipeline','archiveBanner','moduleBanners','translationImportHistory','storySubtitleLanguage','interfaceFont','story-ai-connections','story-ai-draft','story-voice-settings','story-voice-profiles','story-material-moods','story-material-notes','idol-assistant-settings','idol-assistant-chat','producer_birthday','producer_bday_greeted_date']);for(const[k,val]of Object.entries(v)){if(!fixedKeys.has(k)&&!k.startsWith('shiny.'))continue;if(val===null){delete state[k];}else if(typeof val==='string'&&val.length<524288){state[k]=val;}}fs.writeFileSync(stateFile+'.tmp',JSON.stringify(state));fs.renameSync(stateFile+'.tmp',stateFile);});
updates=new BackgroundUpdates(downloadDir,{fetch:(...args)=>net.fetch(...args),onState:state=>{if(w&&!w.isDestroyed())w.webContents.send('update-state',state)},onActivate:r=>{let bundledCount=0;try{bundledCount=JSON.parse(fs.readFileSync(path.join(__dirname,'data','summary.json'),'utf8')).translationFiles||0;}catch{}const newCount=r.summary?.translationFiles||0;if(newCount<bundledCount){console.log('跳过更新降级:',newCount,'< 内置:',bundledCount);return;}data=r.data;try{let state={};try{state=JSON.parse(fs.readFileSync(stateFile,'utf8'))}catch{}state.updateNotice=JSON.stringify({at:new Date().toISOString(),summary:r.summary});fs.writeFileSync(stateFile+'.tmp',JSON.stringify(state));fs.renameSync(stateFile+'.tmp',stateFile)}catch{}}});
ipcMain.handle('check-updates',async e=>{if(e.sender!==w.webContents)return;return updates.check()});
ipcMain.handle('update-state',e=>{if(e.sender===w.webContents)return updates.snapshot()});
ipcMain.handle('update-data',e=>{if(e.sender!==w.webContents)return {ok:false,error:'无效窗口'};if(busy)return {ok:false,error:'离线下载正在进行，请完成后再更新'};return updates.start()});
ipcMain.handle('download-all',async e=>{if(e.sender!==w.webContents||busy||updates?.state.status==='running')return {ok:false,error:'另一项下载或更新正在进行'};busy=true;try{return{ok:true,summary:await downloadAll(downloadDir,t=>w.webContents.send('download-progress',t))}}catch(err){return{ok:false,error:err.message}}finally{busy=false}});
ipcMain.handle('pack4k-status',()=>s.pack4k?s.pack4k.getStatus():{ok:false,installed:false,enabled:false});
ipcMain.handle('pack4k-toggle',async(e,flag)=>{if(!s.pack4k)return{ok:false};const st=s.pack4k.setEnabled(!!flag);try{await w?.webContents?.session?.clearCache();}catch{}return st;});
ipcMain.handle('pack4k-load-archive',async()=>{if(!s.pack4k)return{ok:false,error:'服务未就绪'};const pick=await dialog.showOpenDialog(w,{title:'选择 4K 超清画质包（支持单包 .7z/.zip 或全选 .7z.001/.002/.003 分卷）',properties:['openFile','multiSelections'],filters:[{name:'4K 超清画质包 / 分卷',extensions:['7z','zip','001','002','003','004','005','006','007','008','009','010','z01','z02','z03','z04','z05']},{name:'所有文件',extensions:['*']}]});if(pick.canceled||!pick.filePaths?.length)return{ok:false,canceled:true};try{const st=await s.pack4k.extractArchive(pick.filePaths,msg=>{if(w&&!w.isDestroyed())w.webContents.send('pack4k-progress',msg);});try{await w?.webContents?.session?.clearCache();}catch{}return st;}catch(err){return{ok:false,error:err.message};}});
ipcMain.handle('pack4k-load-folder',async()=>{if(!s.pack4k)return{ok:false,error:'服务未就绪'};const pick=await dialog.showOpenDialog(w,{title:'选择已解压的 cache-4k 文件夹',properties:['openDirectory']});if(pick.canceled||!pick.filePaths?.[0])return{ok:false,canceled:true};const st=s.pack4k.setCustomDir(pick.filePaths[0]);if(st.ok){try{await w?.webContents?.session?.clearCache();}catch{}}return st;});
ipcMain.handle('reload-ignoring-cache',async()=>{try{await w?.webContents?.session?.clearCache();}catch{}if(w&&!w.isDestroyed())w.webContents.reloadIgnoringCache();return true;});
const ttsSendProgress=msg=>{try{if(w&&!w.isDestroyed())w.webContents.send('tts-pack-progress',msg);}catch{}try{if(companionWin&&!companionWin.isDestroyed())companionWin.webContents.send('tts-pack-progress',msg);}catch{}};
ipcMain.handle('tts-pack-status',async(e,probe)=>s.packTts?await s.packTts.getStatus(!!probe):{ok:false,installed:false,enabled:false});
ipcMain.handle('tts-pack-load-archive',async e=>{if(!s.packTts)return{ok:false,error:'服务未就绪'};const owner=(companionWin&&!companionWin.isDestroyed()&&e.sender===companionWin.webContents)?companionWin:w;const pick=await dialog.showOpenDialog(owner,{title:'选择 283 全员 30 声线声音整合包（支持 .7z/.zip 或全选分卷）',properties:['openFile','multiSelections'],filters:[{name:'283 声音整合包 / 分卷',extensions:['7z','zip','001','002','003','004','005','006','007','008','009','010','z01','z02']},{name:'所有文件',extensions:['*']}]});if(pick.canceled||!pick.filePaths?.length)return{ok:false,canceled:true};try{return await s.packTts.extractArchive(pick.filePaths,ttsSendProgress);}catch(err){return{ok:false,error:err.message};}});
ipcMain.handle('tts-pack-load-folder',async e=>{if(!s.packTts)return{ok:false,error:'服务未就绪'};const owner=(companionWin&&!companionWin.isDestroyed()&&e.sender===companionWin.webContents)?companionWin:w;const pick=await dialog.showOpenDialog(owner,{title:'选择已解压的 283 声音整合包或 sc_tts 文件夹',properties:['openDirectory']});if(pick.canceled||!pick.filePaths?.[0])return{ok:false,canceled:true};return await s.packTts.setCustomDir(pick.filePaths[0]);});
ipcMain.handle('tts-pack-pick-runtime',async e=>{if(!s.packTts)return{ok:false,error:'服务未就绪'};const owner=(companionWin&&!companionWin.isDestroyed()&&e.sender===companionWin.webContents)?companionWin:w;const pick=await dialog.showOpenDialog(owner,{title:'选择 GPT-SoVITS 根目录（需含 api_v2.py）',properties:['openDirectory']});if(pick.canceled||!pick.filePaths?.[0])return{ok:false,canceled:true};try{return await s.packTts.setConfig({runtimeDir:pick.filePaths[0]});}catch(err){return{ok:false,error:err.message};}});
ipcMain.handle('tts-pack-launch-runtime',async()=>s.packTts?await s.packTts.launchRuntime():{ok:false,error:'服务未就绪'});
ipcMain.handle('set-fullscreen',(e,flag)=>{if(w&&!w.isDestroyed()){w.setFullScreen(!!flag);return w.isFullScreen();}return false;});
ipcMain.handle('is-fullscreen',()=>w&&!w.isDestroyed()?w.isFullScreen():false);
ipcMain.handle('set-zoom-factor',(e,factor)=>{if(w&&!w.isDestroyed()){w.webContents.setZoomFactor(factor);return w.webContents.getZoomFactor();}return 1;});
ipcMain.handle('get-zoom-factor',()=>w&&!w.isDestroyed()?w.webContents.getZoomFactor():1);
ipcMain.handle('toggle-companion',async()=>{
 if(companionWin&&!companionWin.isDestroyed()){companionWin.close();companionWin=null;return{open:false};}
 const wa=screen.getPrimaryDisplay().workArea;
 const cw=350,ch=490;
 companionWin=new BrowserWindow({
  width:cw,height:ch,minWidth:260,minHeight:360,
  x:Math.max(wa.x+20,wa.x+wa.width-cw-28),
  y:Math.max(wa.y+20,wa.y+wa.height-ch-24),
  transparent:true,frame:false,alwaysOnTop:true,resizable:true,hasShadow:false,
  backgroundColor:'#00000000',title:'283 桌面伙伴',icon:path.join(__dirname,'assets/app.ico'),
  webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}
 });
 companionWin.setMenuBarVisibility(false);
 companionWin.on('closed',()=>{companionWin=null;if(w&&!w.isDestroyed())w.webContents.send('companion-state',{open:false});});
 await companionWin.loadURL(s.url+'/companion.html');
 if(w&&!w.isDestroyed())w.webContents.send('companion-state',{open:true});
 return{open:true};
});
ipcMain.handle('is-companion-open',()=>!!(companionWin&&!companionWin.isDestroyed()));
ipcMain.handle('companion-close',()=>{if(companionWin&&!companionWin.isDestroyed()){companionWin.close();companionWin=null;}return{open:false};});
ipcMain.handle('companion-set-always-on-top',(e,flag)=>{if(companionWin&&!companionWin.isDestroyed()){companionWin.setAlwaysOnTop(!!flag);return companionWin.isAlwaysOnTop();}return false;});
ipcMain.handle('companion-set-ignore-mouse',(e,ignore,opts)=>{if(companionWin&&!companionWin.isDestroyed()){companionWin.setIgnoreMouseEvents(!!ignore,opts||{forward:true});return true;}return false;});
w=new BrowserWindow(require('./desktop-window.cjs').windowOptions(__dirname));w.on('closed',()=>{if(companionWin&&!companionWin.isDestroyed())companionWin.close();});require('./desktop-window.cjs').watchWindowChrome(w);require('./desktop-window.cjs').watchUnsaved(w,dialog);w.setMenuBarVisibility(false);w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==s.url)e.preventDefault();});require('./assistant-desktop.cjs').bind({app,win:w,ipcMain,dialog,assistant,userData:dir,runtimeRoot:path.dirname(app.getPath('exe')),isBusy:()=>busy||updates?.state.status==='running'});await w.loadURL(s.url+'/'+(repairReceipt?.config.page||'shell.html'));if(repairReceipt)try{await require('./assistant-desktop.cjs').restore({receipt:repairReceipt,win:w,assistant})}catch(e){await dialog.showMessageBox(w,{type:'error',title:'修复启动确认',message:e.message,detail:'原程序备份和恢复草稿保留在本次任务文件夹。'})}});app.on('window-all-closed',()=>{assistant?.dispose();server?.close();updates?.dispose();app.quit();});
}
