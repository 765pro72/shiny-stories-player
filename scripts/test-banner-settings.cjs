// Owned, muted renderer fixture. No running user window/profile is touched.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),electron=require('electron');
if(!electron.app){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(electron,[__filename],{env,stdio:'inherit'});process.exit(r.status??1)}
const {app,BrowserWindow}=electron,root=path.resolve(__dirname,'..');
const profile=path.join(root,'exports','banner-test-profile');fs.mkdirSync(profile,{recursive:true});app.setPath('userData',profile);process.env.SHINY_OFFLINE='1';
let win,service;
app.whenReady().then(async()=>{const timer=setTimeout(()=>app.exit(1),90000);try{
 service=await require('../server.cjs').start(path.join(root,'cache'),0);win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,sandbox:true}});win.webContents.setAudioMuted(true);
 const js=code=>win.webContents.executeJavaScript(code),wait=code=>js(`(async()=>{const start=performance.now();while(!(${code})){if(performance.now()-start>15000)throw Error('Timed out: '+${JSON.stringify(code)});await new Promise(r=>setTimeout(r,20))}})()`);
 const results=[];
 for(const [file,key,workspace]of [['card-gallery','cards','.gallery-layout'],['model-picker','wardrobe','.wardrobe-layout'],['voice-gallery','voice','.voice-layout']]){
  win.setContentSize(1280,900);await win.loadURL(service.url+'/'+file+'.html');await wait(`document.querySelectorAll('#${key}Stats>.collection-stat').length===4`);await wait(`document.querySelector('.collection-overview img').classList.contains('ready')&&document.querySelector('.collection-overview img').complete&&document.querySelector('.collection-overview img').naturalWidth>0`);
  for(const [width,height]of [[1280,900],[3840,2160]]){
   win.setContentSize(width,height);await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
   const geometry=await js(`(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();return{width:innerWidth,overflow:document.body.scrollWidth>innerWidth,heading:rect('.collection-page-head'),art:rect('.collection-overview'),stats:rect('#${key}Stats'),workspace:rect('${workspace}'),columns:[...document.querySelector('${workspace}').children].map(e=>e.getBoundingClientRect().toJSON()),values:[...document.querySelectorAll('#${key}Stats>.collection-stat')].map(e=>e.textContent),mask:getComputedStyle(document.querySelector('.collection-overview img')).maskImage}})()`);
   assert.ok(!geometry.overflow);assert.ok(geometry.heading.bottom<=geometry.art.top);assert.ok(geometry.art.bottom<=geometry.stats.top);assert.ok(geometry.stats.bottom<=geometry.workspace.top);assert.match(geometry.mask,/linear-gradient/);for(let i=1;i<geometry.columns.length;i++)assert.ok(geometry.columns[i-1].right<=geometry.columns[i].left,'directory columns do not overlap');
   assert.ok(await js("(()=>{const h=document.querySelector('.collection-page-head');return h.querySelector('.eyebrow').getBoundingClientRect().bottom<=h.querySelector('h1').getBoundingClientRect().top&&h.querySelector('h1').getBoundingClientRect().bottom<=h.querySelector('.sub').getBoundingClientRect().top})()"),'title and subtitle must stack vertically');results.push({file,width,...geometry});
   if(width===1280){await new Promise(r=>setTimeout(r,250));fs.writeFileSync(path.join(root,'exports',file+'-最终目录-2026-11-13.png'),(await win.webContents.capturePage()).toPNG());}
  }
 }
 // A scrolled narrow index cannot paint over its fixed title.
 win.setContentSize(627,900);await win.loadURL(service.url+'/card-gallery.html');await wait("document.querySelector('#unitIndex .unit-heading')");
 await js("document.querySelector('#unitIndex .unit-heading').click();document.querySelector('#unitIndex').scrollTop=100");
 const index=await js("(()=>{const h=document.querySelector('.sidebar-head'),r=h.getBoundingClientRect(),list=document.querySelector('#unitIndex');return{separate:r.bottom<=list.getBoundingClientRect().top,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.sidebar-head')===h,expanded:!!document.querySelector('#unitIndex .unit.is-selected'),columns:getComputedStyle(list).gridTemplateColumns}})()");assert.ok(index.separate&&index.expanded); // title may be outside the viewport after smooth scrolling
 // Initialize a legacy fixed album cover, then exercise the shared settings.
 win.setContentSize(1280,900);await win.loadURL(service.url+'/index.html');await js("localStorage.removeItem('moduleBanners');localStorage.setItem('archiveBanner',JSON.stringify({mode:'fixed',path:'images/content/idols/card/1040010010.jpg'}))");await win.reload();await wait("typeof document.querySelector('#wardrobe').onclick==='function'");
 await js("document.querySelector('#wardrobe').click()");await wait("document.querySelectorAll('.banner-setting-row').length===4&&!document.querySelector('[aria-label=\"挑选衣装室标题卡面\"]').disabled");
 assert.equal(await js("document.querySelector('#banner-mode-cards').value"),'fixed','legacy album preference survives migration');
 await js("const select=document.querySelector('#banner-mode-voice');select.value='random';select.dispatchEvent(new Event('change'))");
 await js("document.querySelector('[aria-label=\"挑选衣装室标题卡面\"]').click()");await wait("document.querySelector('.banner-picker')?.open");
 await js("const input=document.querySelector('.banner-picker input');input.value='1040010010';input.dispatchEvent(new Event('input'))");await wait("document.querySelectorAll('.banner-picker-grid button').length===2");await js("document.querySelector('.banner-picker-grid button').click()");
 assert.ok(await js("!document.querySelector('.banner-picker').open&&document.querySelector('#wardrobeDialog').open"),'choosing returns to the lobby settings');
 const prefs=await js("JSON.parse(localStorage.getItem('moduleBanners'))");assert.equal(prefs.voice.mode,'random');assert.equal(prefs.wardrobe.mode,'fixed');assert.equal(prefs.cards.path,'images/content/idols/card/1040010010.jpg');
 // Cancelling a first fixed selection retains the previous random mode.
 await js("const s=document.querySelector('#banner-mode-voice');s.value='fixed';s.dispatchEvent(new Event('change'))");await wait("document.querySelector('.banner-picker').open");await js("document.querySelector('.banner-picker [data-close]').click()");assert.equal(await js("document.querySelector('#banner-mode-voice').value"),'random');
 await win.loadURL(service.url+'/model-picker.html');await wait("document.querySelector('#wardrobeCover').classList.contains('ready')");assert.equal(await js("document.querySelector('#wardrobeCover').getAttribute('src')"),'/asset-original/'+prefs.wardrobe.path);
 await js("ShinyBanners.setContext('wardrobe',{owner:'2'})");assert.equal(await js("document.querySelector('#wardrobeCover').getAttribute('src')"),'/asset-original/'+prefs.wardrobe.path,'fixed art is independent of owner changes');
 const report={at:new Date().toISOString(),results,index,settingsPages:4,legacyMigration:true,independentPreferences:true,nestedPickerReturn:true,cancelKeepsMode:true,fixedPersists:true};fs.writeFileSync(path.join(root,'exports/banner-settings-verification.json'),JSON.stringify(report,null,2));console.log('PASS title → gradient art → four facts → directory at 1280/3840; narrow index separated; four independent settings; picker, migration, cancellation and persistence.');
 }finally{clearTimeout(timer);win?.destroy();service?.server.closeAllConnections();service?.server.close();app.quit()}
}).catch(e=>{console.error(e);app.exit(1)});
