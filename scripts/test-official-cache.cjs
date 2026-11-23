const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {fetchAsset}=require('../asset-source.cjs');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const keys=['images/event/bg/00001.jpg','json/produce_events/100100002.json','spine/characters/stand/001/data.json','spine/characters/stand/001/data.atlas','spine/characters/stand/001/data.png','sounds/bgm/001.m4a','sounds/voice/events/produce_events/100100101/1901001010030.m4a'];
 if(!process.argv.includes('--server-only'))for(const key of keys){const result=await fetchAsset(key);assert.ok(['official','mirror'].includes(result.source),key);const local=fs.readFileSync(path.join(root,'cache',key));
  if(key.endsWith('.json'))assert.deepEqual(JSON.parse(result.bytes),JSON.parse(local),key);
  else if(key.endsWith('.png'))assert.equal(result.bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  else assert.equal(require('node:crypto').createHash('sha256').update(result.bytes).digest('hex'),require('node:crypto').createHash('sha256').update(local).digest('hex'),key);
  console.log('Original verified ('+result.source+'):',key);
 }
 const isolated=fs.mkdtempSync(path.join(os.tmpdir(),'shiny-official-test-'));
 let server;const networkFetch=global.fetch;
 try{
  let attempts=0;
  global.fetch=async url=>{attempts++;return String(url).includes('shinycolors.enza.fun')?new Response('<html>not an asset</html>',{headers:{'content-type':'text/html'}}):new Response(fs.readFileSync(path.join(root,'cache',keys[0])),{headers:{'content-type':'image/jpeg'}})};
  assert.equal((await fetchAsset(keys[0])).source,'mirror');assert.equal(attempts,2);global.fetch=networkFetch;
  console.log('Official HTML response rejected; mirror fallback verified');
  fs.mkdirSync(path.join(isolated,'vendor'));fs.mkdirSync(path.join(isolated,'scripts'));fs.mkdirSync(path.join(isolated,'data'));fs.writeFileSync(path.join(isolated,'data/catalog.json'),'[]');
  for(const file of ['server.cjs','update-http.cjs','resource-downloads.cjs','scripts/cache-all.cjs','asset-source.cjs','asset-race.cjs','model-assets.cjs','vendor/official-resource-codec.js'])fs.copyFileSync(path.join(root,file),path.join(isolated,file));
  const started=await require(path.join(isolated,'server.cjs')).start(path.join(isolated,'cache'),0);server=started.server;
  const url=started.url+'/asset-original/'+keys[0];
  let externalRequests=0;global.fetch=async(url)=>{externalRequests++;if(String(url).includes('shinycolors.enza.fun'))return new Response('<html>network fixture</html>',{headers:{'content-type':'text/html'}});const key=new URL(url).pathname.slice(1);return new Response(fs.readFileSync(path.join(root,'cache',key)),{headers:{'content-type':key.endsWith('.png')?'image/png':'image/jpeg'}})};
  const blocked=await networkFetch(url);assert.equal(blocked.status,200);await blocked.arrayBuffer();assert.equal(externalRequests,2);assert.equal(fs.existsSync(path.join(isolated,'cache',keys[0])),false);
  const other=keys[4];const onlineOther=await networkFetch(started.url+'/asset-original/'+other);if(onlineOther.status!==200)throw Error(await onlineOther.text());await onlineOther.arrayBuffer();
  const listed=await(await networkFetch(started.url+'/api/resource-download')).json();assert.equal(listed.missing,2);
  const manual=await networkFetch(started.url+'/api/resource-download',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keys:[keys[0]]})});assert.equal((await manual.json()).failed,0);assert.equal(externalRequests,6);assert.equal(fs.existsSync(path.join(isolated,'cache',other)),false,'unselected resource must not be saved');
  const first=await networkFetch(url);assert.equal(first.status,200);const bytes=Buffer.from(await first.arrayBuffer());assert.equal(bytes.length,129204);
  global.fetch=async()=>{throw Error('Network disabled for cache test')};
  const cached=await networkFetch(url);assert.deepEqual(Buffer.from(await cached.arrayBuffer()),bytes);
  const range=await networkFetch(url,{headers:{Range:'bytes=0-31'}});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),bytes.subarray(0,32));
  console.log('Online view without disk writes; explicit offline save, disconnected reuse and Range verified');
 }finally{global.fetch=networkFetch;if(server)await new Promise(resolve=>server.close(resolve));if(path.dirname(path.resolve(isolated))!==path.resolve(os.tmpdir())||!path.basename(isolated).startsWith('shiny-official-test-'))throw Error('Unsafe fixture cleanup path');fs.rmSync(isolated,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1});
