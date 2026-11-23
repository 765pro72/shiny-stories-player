const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {downloadAll}=require('../offline-downloader.cjs'),{preserveTranslations}=require('../update-preserve.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'sc-update-download-'));
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value))};
(async()=>{try{
 const base=path.join(root,'app'),user=path.join(root,'user'),active=path.join(root,'active');
 write(path.join(base,'data/offline-assets.json'),['json/produce_events/old.json']);write(path.join(active,'catalog.json'),[{key:'produce_events/new.json'}]);write(path.join(active,'offline-assets.json'),[]);write(path.join(user,'active-data.json'),{data:active});
 const requests=[];const fake=async key=>{requests.push(key);return{bytes:Buffer.from(key.startsWith('json/')?JSON.stringify([{text:'test',bg:'test',charType:'characters',charId:'001',charCategory:'stand'}]):key.endsWith('.json')?'{}':'test')}};
 const result=await downloadAll(user,()=>{},{base,fetchAsset:fake});assert.equal(result.complete,true);assert.equal(result.downloaded,5);assert.ok(requests.includes('spine/characters/stand/001/data.png'));assert.ok(!requests.includes('json/produce_events/old.json'));
 const count=requests.length,env=process.env.SHINY_OFFLINE;process.env.SHINY_OFFLINE='1';try{const second=await downloadAll(user,()=>{},{base,fetchAsset:fake});assert.equal(second.complete,true);assert.equal(second.downloaded,0);assert.equal(requests.length,count)}finally{if(env===undefined)delete process.env.SHINY_OFFLINE;else process.env.SHINY_OFFLINE=env}
 const previous=path.join(root,'previous'),next=path.join(root,'next'),key='produce_events/one.json';write(path.join(previous,'ai-translation-keys.json'),[{key,id:'1'},{key,id:'2'}]);write(path.join(previous,'translations',key),{translator:'Community',rows:[{id:'1',text:'same',trans:'本地补译'},{id:'2',text:'old',trans:'旧原文补译'}]});write(path.join(next,'translations',key),{translator:'Community',rows:[{id:'1',text:'same',trans:''},{id:'2',text:'changed',trans:'新版社区译文'}]});write(path.join(next,'translations.json'),{});
 assert.deepEqual(preserveTranslations(previous,next),{restored:1,changedSource:1});const rows=JSON.parse(fs.readFileSync(path.join(next,'translations',key))).rows;assert.equal(rows[0].trans,'本地补译');assert.equal(rows[1].trans,'新版社区译文');assert.equal(JSON.parse(fs.readFileSync(path.join(next,'translations.json')))[key].translator,'Community');
 console.log('PASS active-data recursive download, disconnected reuse, local AI translation preservation, changed source protection and credits');
 }finally{fs.rmSync(root,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
