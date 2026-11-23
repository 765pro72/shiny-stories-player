const assert=require('node:assert/strict'),{preferOfficial}=require('../asset-race.cjs');
(async()=>{
 let mirrors=0;const fast=await preferOfficial(async()=>({bytes:Buffer.from('official')}),async()=>{mirrors++;return{}},{hedgeAfter:10});assert.equal(fast.source,'official');await new Promise(r=>setTimeout(r,20));assert.equal(mirrors,0,'fast official responses must not contact mirror');
 let aborted=false;const slow=await preferOfficial(signal=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(Error('cancelled'))})),async()=>({bytes:Buffer.from('mirror')}),{hedgeAfter:5});assert.equal(slow.source,'mirror');assert.ok(aborted,'losing connection must be cancelled');
 let healthyMirror=false;const healthy=await preferOfficial(async(_signal,headers)=>{headers();await new Promise(r=>setTimeout(r,20));return{bytes:Buffer.from('body')}},async()=>{healthyMirror=true;return{}},{hedgeAfter:5});assert.equal(healthy.source,'official');assert.ok(!healthyMirror,'healthy streaming body must not be downloaded twice');
 const fallback=await preferOfficial(async()=>{throw Error('404')},async()=>({bytes:Buffer.from('valid')}),{hedgeAfter:1000});assert.equal(fallback.source,'mirror');
 await assert.rejects(preferOfficial(async()=>{throw Error('bad official')},async()=>{throw Error('bad mirror')},{hedgeAfter:5}),/bad official.*bad mirror/);
 console.log('PASS official-first; delayed hedge; losing transfer aborted; healthy body not duplicated; immediate failure fallback; combined errors.');
})().catch(e=>{console.error(e);process.exitCode=1});
