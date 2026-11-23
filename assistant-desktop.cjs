const fs=require('node:fs'),path=require('node:path'),Install=require('./assistant-install.cjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function rendererReady(win){const end=Date.now()+30000;while(Date.now()<end){if(await win.webContents.executeJavaScript('!!window.IdolAssistant && (!location.pathname.endsWith("custom-story.html") || !!window.StoryWorkshop)').catch(()=>false))return;await pause(100)}throw Error('页面未完成启动')}
function bind({app,win,ipcMain,dialog,assistant,userData,runtimeRoot,isBusy=()=>false}){
 let pending=null,active=null;
 ipcMain.handle('assistant-repair-checkpoint',async(e,id,kind,data)=>{
  if(e.sender!==win.webContents||active!==id||!['workshop','candidate'].includes(kind))throw Error('无效恢复草稿请求');
  const bytes=Buffer.from(data);if(bytes.length>256*1024*1024)throw Error('恢复草稿超过256MB');const folder=path.join(assistant.folder(id),'apply','session');fs.mkdirSync(folder,{recursive:true});const file=path.join(folder,kind+'.gwa');fs.writeFileSync(file,bytes);return{bytes:bytes.length};
 });
 ipcMain.handle('apply-assistant-repair',async(e,id)=>{
  if(e.sender!==win.webContents)return{ok:false,error:'无效窗口'};
  if(pending)return{ok:false,error:'正在准备另一项修复'};
  if(isBusy()||assistant.running())return{ok:false,error:'请先等待正在运行的生成、下载或更新完成'};
  pending=id;let prepared=null,workspace;
  try{
   workspace=assistant.repairWorkspace(id);
   const choice=await dialog.showMessageBox(win,{type:'question',title:'应用已验证的修复',message:'现在应用修复并重启播放器？',detail:'将先保存当前怪文书和创作草稿，备份原程序文件，再应用通过测试的修改。新版启动失败会恢复原版。选择“稍后”可以继续使用当前程序。',buttons:['应用并重启','稍后'],defaultId:1,cancelId:1,noLink:true});
   if(choice.response!==0)return{ok:false,cancelled:true};
   // Consent happens before checkpointing or starting the installer.
   if(isBusy()||assistant.running())throw Error('仍有任务在运行，请完成后再重启');
   active=id;const checkpoint=await win.webContents.executeJavaScript('window.IdolAssistant.prepareRestart('+JSON.stringify(id)+')');
   const page=new URL(win.webContents.getURL());prepared=await Install.prepare({workspace,runtimeRoot,executable:app.getPath('exe'),userData,page:page.pathname.slice(1)+page.search,checkpoint});
   await Install.start(prepared,app.getPath('exe'));
   await assistant.markRepair(id,{state:'applying',fingerprint:workspace.fingerprint()});
   await win.webContents.executeJavaScript('window.IdolAssistant.finishRestart()');
   // The helper has acknowledged readiness and waits for this process to exit.
   setTimeout(()=>app.quit(),250);return{ok:true,restarting:true};
  }catch(error){Install.cancel(prepared);if(workspace)await assistant.markRepair(id,{state:'ready',fingerprint:workspace.fingerprint?.()}).catch(()=>{});await win.webContents.executeJavaScript('window.IdolAssistant?.cancelRestart()').catch(()=>{});return{ok:false,error:error.message}}finally{pending=null;active=null}
 });
 return{get active(){return active}};
}
async function restore({receipt,win,assistant}){
 await rendererReady(win);const c=receipt.config,folder=path.join(path.dirname(receipt.file),'session'),checkpoint=c.checkpoint||{};
 for(const kind of ['workshop','candidate'])if(checkpoint[kind]){
  const bytes=fs.readFileSync(path.join(folder,kind+'.gwa'));if(require('./assistant-install-helper.cjs').hash(bytes)!==checkpoint[kind].sha256)throw Error('恢复草稿校验失败：'+kind);
  // Bound chunks avoid a giant executeJavaScript source string for imported audio.
  await win.webContents.executeJavaScript('window.__repairChunks=[]');
  for(let at=0;at<bytes.length;at+=256*1024)await win.webContents.executeJavaScript('window.__repairChunks.push('+JSON.stringify(bytes.subarray(at,at+256*1024).toString('base64'))+')');
  await win.webContents.executeJavaScript('window.IdolAssistant.restoreRestart('+JSON.stringify(kind)+','+JSON.stringify(checkpoint[kind])+')');
 }
 if(receipt.state.state!=='failed')Install.healthy(receipt);
 if(receipt.state.state==='awaiting-health'){
  const end=Date.now()+10000;while(Date.now()<end){const s=JSON.parse(fs.readFileSync(path.join(path.dirname(receipt.file),'status.json'),'utf8'));if(s.state==='applied'){await assistant.markRepair(c.jobId,{state:'applied',fingerprint:c.fingerprint});return}await pause(100)}throw Error('应用结果尚未确认，已保留备份和草稿');
 }else await assistant.markRepair(c.jobId,{state:receipt.state.state,error:receipt.state.error});
}
module.exports={bind,restore,rendererReady};
