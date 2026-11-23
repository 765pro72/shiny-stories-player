// Owned hidden Electron fixture: actual page markup/CSS with media scripts disabled.
// This checks the window drag contract and real pointer navigation, without touching
// the running user's window, preferences, network assets or downloaded files.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),electron=require('electron');
if(!electron.app){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(electron,[__filename],{env,stdio:'inherit'});process.exit(r.status??1)}
const {app,BrowserWindow}=electron,root=path.resolve(__dirname,'..'),publicRoot=path.join(root,'public');
let server,win;
app.whenReady().then(async()=>{
 const guard=setTimeout(()=>{console.error('Shell interaction fixture timed out');app.exit(1)},45000);
 try{
  server=http.createServer((req,res)=>{
   const pathname=new URL(req.url,'http://local').pathname,file=path.resolve(publicRoot,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(publicRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
   if(file.endsWith('.html')){
    let html=fs.readFileSync(file,'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,s=>/src="(?:navigation|interface|liquid-glass)\.js"/.test(s)?s:'');
    html=html.replace('<head>','<head><script>window.desktop={windowControlsOverlay:true,getState:()=>({}),saveState:()=>{}};</script>');
    res.setHeader('Content-Type','text/html;charset=utf-8');return res.end(html);
   }
   res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'application/octet-stream');fs.createReadStream(file).pipe(res);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  const options=require('../desktop-window.cjs').windowOptions(root);win=new BrowserWindow({...options,show:false,width:1280,height:720,webPreferences:{...options.webPreferences,preload:undefined,backgroundThrottling:false}});
  require('../desktop-window.cjs').watchWindowChrome(win);
  await win.loadURL(origin+'/index.html');
  const brand=await win.webContents.executeJavaScript(`(()=>{const s=getComputedStyle(document.querySelector('.site-brand'));return{capture:s.viewTransitionName,overflow:s.overflow,filter:s.backdropFilter,radius:s.borderRadius}})()`);assert.equal(brand.capture,'none');assert.equal(brand.overflow,'clip');assert.notEqual(brand.filter,'none');
  const geometry=await win.webContents.executeJavaScript(`(()=>{const h=document.querySelector('.site-header'),s=document.querySelector('.screen'),drag=document.querySelector('.window-drag-handle');return{header:h.getBoundingClientRect().toJSON(),scene:s.getBoundingClientRect().toJSON(),background:getComputedStyle(h).backgroundColor,drag:getComputedStyle(drag).webkitAppRegion,links:[...document.querySelectorAll('.site-nav a')].map(a=>{const r=a.getBoundingClientRect();return{text:a.textContent,region:getComputedStyle(a).webkitAppRegion,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('a')===a}})}})()`);
  assert.equal(geometry.header.top,0);assert.equal(geometry.scene.top,0,'scene must continue behind the header');assert.equal(geometry.background,'rgba(0, 0, 0, 0)');assert.equal(geometry.drag,'drag');
  for(const link of geometry.links){assert.equal(link.region,'no-drag',link.text+' must not become a window drag region');assert.ok(link.hit,link.text+' must be hit-testable')}
  const targets=['guide.html','card-gallery.html','voice-gallery.html?kind=电话','voice-gallery.html','model-picker.html','index.html'];const navigation=[];
  for(const target of targets){
   await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>resolve()))');
   const point=await win.webContents.executeJavaScript(`(()=>{const a=[...document.querySelectorAll('.site-nav a')].find(a=>a.getAttribute('href')===${JSON.stringify(target)});const r=a.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.tagName,cross:document.documentElement.dataset.crossMotion,region:getComputedStyle(a).webkitAppRegion}})()`);
   const loaded=new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('Navigation click failed: '+target)),6000);win.webContents.once('did-finish-load',()=>{clearTimeout(t);resolve()})});
   win.webContents.sendInputEvent({type:'mouseMove',x:Math.round(point.x),y:Math.round(point.y)});win.webContents.sendInputEvent({type:'mouseDown',x:Math.round(point.x),y:Math.round(point.y),button:'left',clickCount:1});win.webContents.sendInputEvent({type:'mouseUp',x:Math.round(point.x),y:Math.round(point.y),button:'left',clickCount:1});await loaded;
   assert.equal(decodeURIComponent(new URL(win.webContents.getURL()).pathname+new URL(win.webContents.getURL()).search),'/'+target);navigation.push({target,duringTransition:point.cross==='active',hit:point.hit});
  }
  assert.ok(navigation.some(n=>n.duringTransition),'exercise navigation while its snapshot is still animating');
  const maximized=new Promise(r=>win.once('maximize',r));win.maximize();await maximized;
  const maximizedGeometry=await win.webContents.executeJavaScript(`({scene:document.querySelector('.screen').getBoundingClientRect().toJSON(),height:innerHeight,nav:document.querySelector('.site-nav').getBoundingClientRect().toJSON(),overlay:navigator.windowControlsOverlay.getTitlebarAreaRect().toJSON()})`);
  assert.equal(maximizedGeometry.scene.height,maximizedGeometry.height);assert.ok(maximizedGeometry.nav.right<=maximizedGeometry.overlay.right,'navigation must stay outside the native controls');
  const result={at:new Date().toISOString(),brand,geometry,navigation,maximizedGeometry};fs.writeFileSync(path.join(root,'exports/shell-interaction-verification.json'),JSON.stringify(result,null,2));
  console.log('PASS actual lobby starts at y=0; all 7 links no-drag and hit-testable; six pointer navigations; maximized native controls stay separate.');
 }finally{clearTimeout(guard);win?.destroy();server?.closeAllConnections();server?.close();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)});
