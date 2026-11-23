// Owned, invisible window fixture. No running user window is controlled.
const electron=require('electron'),path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs');
if(!electron.app){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(electron,[__filename],{env,stdio:'inherit'});process.exit(r.status??1)}
const {app,BrowserWindow,screen}=electron;
app.whenReady().then(async()=>{
 const base=path.resolve(__dirname,'..'),options=require('../desktop-window.cjs').windowOptions(base);
 assert.equal(options.titleBarOverlay.color,'rgba(0,0,0,0)','native controls have no opaque white rectangle');
 const w=new BrowserWindow({...options,show:false,opacity:0,webPreferences:{...options.webPreferences,preload:undefined}});
 require('../desktop-window.cjs').watchWindowChrome(w);
 try{
  const css=['app.css','interface.css','layout-refinements.css','module-design.css'].map(f=>fs.readFileSync(path.join(base,'public',f),'utf8')).join('\n');const navigation=fs.readFileSync(path.join(base,'public/navigation.js'),'utf8');
  const html='<style>'+css+'</style><body class="guide-unified"><header class="site-header"><b>283</b><nav class="site-nav"><a>事务所</a><a>剧情馆</a><a>卡片相册</a><a>电话</a><a>语音馆</a><a>衣装室</a><a>继续阅读</a></nav></header><script>window.desktop={windowControlsOverlay:true};'+navigation+'</script>';
  await w.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(html));
  let overlay=await w.webContents.executeJavaScript("({media:matchMedia('(display-mode:window-controls-overlay)').matches,visible:navigator.windowControlsOverlay?.visible})");
  const windowed={outer:w.getBounds(),content:w.getContentBounds(),overlay};
  const maximized=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('maximize timed out')),8000);w.once('maximize',()=>{clearTimeout(timer);resolve()})});
  w.maximize();await maximized;
  overlay=await w.webContents.executeJavaScript("({media:matchMedia('(display-mode:window-controls-overlay)').matches,visible:navigator.windowControlsOverlay?.visible,rect:navigator.windowControlsOverlay?.getTitlebarAreaRect().toJSON()})");assert.ok(overlay.visible,'native overlay controls are visible');
  const geometry=await w.webContents.executeJavaScript("({chrome:document.documentElement.dataset.desktopChrome,navRight:document.querySelector('.site-nav').getBoundingClientRect().right,headerTop:document.querySelector('.site-header').getBoundingClientRect().top})");assert.equal(geometry.chrome,'overlay');assert.equal(geometry.headerTop,0);assert.ok(geometry.navRight<=overlay.rect.right,'navigation stays clear of native window buttons');
  const outer=w.getBounds(),content=w.getContentBounds(),work=screen.getDisplayMatching(outer).workArea;
  assert.ok(w.isMaximized());assert.ok(content.width>=work.width-2);assert.ok(content.height>=work.height-2,'content fills the monitor work area without a caption strip');
  assert.ok(content.y<=work.y+2,'no native title bar above the client area');
  const result={at:new Date().toISOString(),windowed,maximized:{outer,content,work},titleBarStyle:options.titleBarStyle,titleBarOverlay:options.titleBarOverlay,overlay,geometry};
  fs.writeFileSync(path.join(base,'exports/desktop-window-verification.json'),JSON.stringify(result,null,2));console.log('PASS native maximized client covers the complete work area; no caption strip.');
 }finally{w.destroy();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)});
