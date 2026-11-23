const fs=require('node:fs'),path=require('node:path'),{Worker}=require('node:worker_threads');
const {serveWorkerFetch}=require('./update-fetch-bridge.cjs');
class BackgroundUpdates{
  constructor(userDir,{fetch=globalThis.fetch,onState=()=>{},onActivate=()=>{}}={}){
    this.userDir=userDir;this.fetch=fetch;this.onState=onState;this.onActivate=onActivate;this.state={status:'idle',history:[]};this.workers=new Set();
    try{this.state=JSON.parse(fs.readFileSync(path.join(userDir,'update-status.json'),'utf8'));if(this.state.status==='running')this.state={...this.state,status:'interrupted',message:'上次更新因程序关闭而中断，原数据保留。可以重新检查。'}}catch{}
  }
  snapshot(){return{...this.state,elapsedMs:this.state.startedAt?(this.state.finishedAt?Date.parse(this.state.finishedAt):Date.now())-Date.parse(this.state.startedAt):0}}
  publish(message){
    if(message&&message!==this.state.message){this.state.message=message;this.state.history=[...(this.state.history||[]),{at:new Date().toISOString(),message}].slice(-35)}
    this.onState(this.snapshot());
    if(message){fs.mkdirSync(this.userDir,{recursive:true});const file=path.join(this.userDir,'update-status.json');fs.writeFileSync(file+'.tmp',JSON.stringify(this.state));fs.renameSync(file+'.tmp',file)}
  }
  run(kind,progress){
    return new Promise((resolve,reject)=>{
      const worker=new Worker(path.join(__dirname,'update-worker.cjs'),{workerData:{kind,userDir:this.userDir,checked:kind==='update'&&this.lastCheck&&Date.now()-Date.parse(this.lastCheck.checkedAt)<300000?this.lastCheck:null}});this.workers.add(worker);const dispose=serveWorkerFetch(worker,this.fetch);let settled=false;
      const finish=(error,result)=>{if(settled)return;settled=true;dispose();this.workers.delete(worker);error?reject(error):resolve(result)};
      worker.on('message',message=>{if(message.type==='progress')progress?.(message.text);if(message.type==='result')finish(null,message.result);if(message.type==='failure')finish(Error(message.error))});
      worker.on('error',finish);worker.on('exit',code=>finish(Error('更新进程提前退出（'+code+'），原数据保留。')));
    });
  }
  check(){if(this.job)return this.job.then(()=>this.lastCheck||{sources:[]});return this.checking??=this.run('check').then(result=>(this.lastCheck=result)).finally(()=>this.checking=null)}
  start(){
    if(this.job)return{ok:true,state:this.snapshot(),alreadyRunning:true};
    this.state={status:'running',startedAt:new Date().toISOString(),history:[]};this.publish('正在后台检查全部内容更新…');
    const timer=setInterval(()=>this.publish(),1000);
    this.job=(async()=>{
      // Do not scan the same official fragments concurrently with login check.
      if(this.checking){this.publish('正在等待启动检查完成…');await this.checking}
      const result=await this.run('update',text=>this.publish(text));await this.onActivate(result);
      this.state.status='complete';this.state.summary=result.summary;this.state.finishedAt=new Date().toISOString();
      const warnings=result.summary.warnings?.length||0;this.publish(`更新完成：新增剧情 ${result.summary.newStories||0} 篇、卡片 ${result.summary.newCards||0} 张、语音 ${result.summary.newVoices||0} 条、模型 ${result.summary.newModels||0} 套。${warnings?'有 '+warnings+' 项来源暂不可用，已保留相应旧资料。':''}`);
      return result;
    })().catch(error=>{this.state.status='failed';this.state.finishedAt=new Date().toISOString();this.publish(error.message);return null}).finally(()=>{clearInterval(timer);this.job=null});
    return{ok:true,state:this.snapshot()};
  }
  async dispose(){for(const worker of this.workers)await worker.terminate();this.workers.clear()}
}
module.exports={BackgroundUpdates};
