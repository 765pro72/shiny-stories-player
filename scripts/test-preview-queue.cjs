const assert=require('node:assert/strict'),PreviewQueue=require('../public/preview-queue.js');
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
(async()=>{
 const started=[],finish=new Map();let live=true;
 const queue=new PreviewQueue(key=>{started.push(key);return new Promise((resolve,reject)=>finish.set(key,{resolve,reject}))},{concurrency:2,capacity:2});
 const a=queue.get('grid-a'),b=queue.get('grid-b'),selected=queue.get('selected',{priority:100}),stale=queue.get('old-page',{valid:()=>live}).catch(e=>e.message);live=false;
 await flush();assert.deepEqual(started,['selected','grid-a']);assert.equal(queue.active,2);
 finish.get('selected').resolve('selected-image');assert.equal(await selected,'selected-image');await flush();assert.deepEqual(started,['selected','grid-a','grid-b']);assert.equal(await stale,'预览请求已过期');
 finish.get('grid-a').resolve('a');finish.get('grid-b').resolve('b');await Promise.all([a,b]);await flush();assert.equal(queue.active,0);assert.equal(queue.cache.size,2);assert.equal(await queue.get('grid-b'),'b');assert.equal(started.length,3);
 const broken=queue.get('retry').catch(()=>{});await flush();finish.get('retry').reject(Error('network'));await broken;await flush();const retry=queue.get('retry');await flush();finish.get('retry').resolve('recovered');assert.equal(await retry,'recovered');
 console.log('PASS selected outfit first; at most two resource loads; stale-page pruning; bounded memory cache; retry after failure.');
})().catch(e=>{console.error(e);process.exitCode=1});
