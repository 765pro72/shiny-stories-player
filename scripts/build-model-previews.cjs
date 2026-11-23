/* Bake faithful wardrobe stills from verified local originals. The runtime then
 * loads one tiny image, not a full Spine JSON + atlas + texture per list item.
 * This is an isolated renderer, never the user's open application. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),electron=require('electron');
if(!electron.app){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;const r=require('node:child_process').spawnSync(electron,[__filename,...process.argv.slice(2)],{stdio:'inherit',env});process.exit(r.status??1)}
const {app,BrowserWindow}=electron,root=path.resolve(__dirname,'..'),out=path.join(root,'public/model-previews'),version=2;
const {originalKey}=require('../model-assets.cjs');
// Each batch gets a fresh isolated renderer, without quitting between batches.
app.on('window-all-closed',()=>{});
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,24);
const page='<!doctype html><meta charset="utf-8"><script src="/player/lib/pixi.js"></script><script src="/player/lib/pixi-spine.umd.js"></script>';
const render=async paths=>{
 const renderer=new PIXI.Application({width:360,height:480,resolution:1,autoStart:false,antialias:true,preserveDrawingBuffer:true,backgroundAlpha:0});
 const rows=[];
 for(const key of paths){const at=performance.now(),loader=new PIXI.Loader();let model,resource;
  try{
   resource=await new Promise((resolve,reject)=>{loader.onError.once(e=>reject(Error(e?.message||'load failed')));loader.add('model','/original/'+key,{timeout:20000}).load((_,r)=>r.model?.spineData?resolve(r.model):reject(Error('missing Spine data')))});
   model=new PIXI.spine.Spine(resource.spineData);try{model.skeleton.setSkinByName('normal')}catch{}
   const idle=model.spineData.animations.find(a=>a.name==='wait1')||model.spineData.animations.find(a=>/^wait/.test(a.name));if(idle)model.state.setAnimation(0,idle.name,false);
   model.autoUpdate=false;model.update(.05);renderer.stage.addChild(model);
   const b=model.getLocalBounds(),scale=Math.min(322.5/Math.max(1,b.width),446.25/Math.max(1,b.height));model.scale.set(scale);model.position.set(180-(b.x+b.width/2)*scale,18-b.y*scale);
   renderer.render();rows.push({key,image:renderer.view.toDataURL('image/webp',.84),ms:performance.now()-at});
  }catch(e){rows.push({key,error:e.message})}
  finally{if(model){renderer.stage.removeChild(model);model.destroy({children:true,texture:false,baseTexture:false})}resource?.spineAtlas?.dispose();loader.destroy();PIXI.utils.clearTextureCache()}
 }
 renderer.destroy(true,{children:true,texture:false,baseTexture:false});return rows;
};
let server;const openWins=new Set();
app.whenReady().then(async()=>{const timer=setTimeout(()=>{console.error('Preview bake timeout');app.exit(1)},1800000);try{
 fs.mkdirSync(out,{recursive:true});const catalog=JSON.parse(fs.readFileSync(path.join(root,'public/home-assets/catalog.json'))),all=[...new Set(catalog.flatMap(p=>p.outfits.map(o=>o.path)))];
 const option=process.argv.find(a=>a.startsWith('--limit=')),paths=option?all.slice(0,Number(option.split('=')[1])):all;
 // Yield while hashing ~2.5 GB of skeleton JSON. Blocking Electron's main
 // thread here starves Chromium's network service before its first page loads.
 const entries={},pending=[];for(const key of paths){const original=path.join(root,'cache',key),stamp=hash(await fs.promises.readFile(original)),file=hash(key+'|'+stamp+'|'+version)+'.webp';entries[key]={file,modelHash:stamp};if(!fs.existsSync(path.join(out,file)))pending.push(key)}
 server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(page)}const url=decodeURIComponent(req.url.split('?')[0]),base=url.startsWith('/original/')?'cache':'public',relative=url.startsWith('/original/')?originalKey(url.slice(10)):url.slice(1),file=path.resolve(root,base,relative);if(!file.startsWith(path.join(root,base)+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.png')?'image/png':'text/plain');fs.createReadStream(file).pipe(res)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port,failures=[],times=[];
 const batches=[];for(let i=0;i<pending.length;i+=64)batches.push(pending.slice(i,i+64));
 let cursor=0,doneCount=0;
 const workerCount=Math.min(4,Math.max(1,batches.length));
 await Promise.all(Array.from({length:workerCount},async()=>{
  while(cursor<batches.length){
   const batch=batches[cursor++];
   const w=new BrowserWindow({show:false,width:500,height:700,webPreferences:{offscreen:true,backgroundThrottling:false,contextIsolation:true,sandbox:true}});
   openWins.add(w);
   try{
    await w.loadURL(url);
    const rows=await w.webContents.executeJavaScript('('+render.toString()+')('+JSON.stringify(batch)+')');
    for(const row of rows)if(row.error){failures.push(row);delete entries[row.key]}else{const bytes=Buffer.from(row.image.split(',')[1],'base64');fs.writeFileSync(path.join(out,entries[row.key].file),bytes);times.push(row.ms)}
    doneCount+=batch.length;
    console.log('Previews '+doneCount+'/'+pending.length+'; failures '+failures.length);
   }finally{openWins.delete(w);if(!w.isDestroyed())w.destroy();}
  }
 }));
 const complete=paths.filter(k=>entries[k]&&fs.existsSync(path.join(out,entries[k].file)));let bytes=0;for(const key of complete)bytes+=fs.statSync(path.join(out,entries[key].file)).size;
 if(!option){if(failures.length||complete.length!==all.length)throw Error('Incomplete previews: '+JSON.stringify(failures));fs.writeFileSync(path.join(out,'index.json'),JSON.stringify({version,transparent:true,width:360,height:480,entries}));
  const keep=new Set(Object.values(entries).map(e=>e.file));keep.add('index.json');
  let pruned=0;for(const name of fs.readdirSync(out)){if(!keep.has(name)&&name.endsWith('.webp')){fs.unlinkSync(path.join(out,name));pruned++;}}
  console.log('Pruned stale opaque previews:',pruned);
 }
 const report={at:new Date().toISOString(),version,transparent:true,total:paths.length,complete:complete.length,baked:times.length,bytes,meanRenderMs:times.reduce((a,b)=>a+b,0)/Math.max(1,times.length),failures};fs.writeFileSync(path.join(root,'exports/model-preview-bake.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));clearTimeout(timer);server.closeAllConnections();server.close();app.exit(0);
 }catch(e){console.error(e);clearTimeout(timer);for(const w of openWins){if(!w.isDestroyed())w.destroy();}server?.closeAllConnections();server?.close();app.exit(1)}});
