const {parentPort,workerData}=require('node:worker_threads');
require('./update-fetch-bridge.cjs').installWorkerFetch(parentPort);
const progress=text=>parentPort.postMessage({type:'progress',text});
(async()=>{
  try{
    const result=workerData.kind==='check'
      ?await require('./update-check.cjs').checkUpdates(workerData.userDir,progress)
      :await require('./updater.cjs').update(workerData.userDir,progress,{checked:workerData.checked});
    parentPort.postMessage({type:'result',result});
  }catch(error){parentPort.postMessage({type:'failure',error:error.message})}
})().finally(()=>parentPort.close());
