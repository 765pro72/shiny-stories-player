const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {start}=require('../server.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'sc-active-content-'));
(async()=>{let server;try{for(const [file,value]of Object.entries({'home-catalog.json':[{id:'1',name:'新衣装目录',outfits:[]}],'home-conversations.json':[{id:'new-pair'}],'card-media.json':[{id:'new-card'}],'voice-index.json':[{key:'new-voice'}]}))fs.writeFileSync(path.join(root,file),JSON.stringify(value));
const running=await start(path.join(root,'cache'),0,()=>root);server=running.server;
for(const [url,field,expected]of [['/home-assets/catalog.json','name','新衣装目录'],['/home-assets/conversations.json','id','new-pair'],['/data/card-media.json','id','new-card'],['/data/voice-index.json','key','new-voice']]){const response=await fetch(running.url+url);assert.equal(response.status,200);assert.equal((await response.json())[0][field],expected)}
assert.equal((await fetch(running.url+'/data/names.json')).status,200);assert.ok(!fs.existsSync(path.join(root,'cache')));console.log('PASS active-data home outfits/conversations/card/voice routes, bundled fallback, viewing indexes does not write media');
}finally{if(server)await new Promise(r=>server.close(r));fs.rmSync(root,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
