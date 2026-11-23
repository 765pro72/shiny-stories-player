/* Bounded preview preparation; selected outfits outrank background thumbnails. */
((root)=>{
 class PreviewQueue {
  constructor(work,{concurrency=2,capacity=80}={}){this.work=work;this.limit=concurrency;this.capacity=capacity;this.jobs=new Map();this.cache=new Map();this.active=0;this.queued=false;this.stats={hits:0,completed:0,skipped:0};}
  get(key,{priority=0,valid=()=>true,...options}={}){
   if(this.cache.has(key)){const value=this.cache.get(key);this.cache.delete(key);this.cache.set(key,value);this.stats.hits++;return Promise.resolve(value)}
   let job=this.jobs.get(key);if(!job){job={key,options,listeners:[],running:false};this.jobs.set(key,job)}
   const promise=new Promise((resolve,reject)=>job.listeners.push({priority,valid,resolve,reject}));
   this.schedule();return promise;
  }
  schedule(){if(this.queued)return;this.queued=true;queueMicrotask(()=>{this.queued=false;this.pump()})}
  pump(){
   const waiting=[];
   for(const job of this.jobs.values())if(!job.running){const live=job.listeners.filter(l=>l.valid());if(!live.length){this.jobs.delete(job.key);this.stats.skipped++;for(const l of job.listeners)l.reject(Error('预览请求已过期'));continue}job.priority=Math.max(...live.map(l=>l.priority));waiting.push(job)}
   waiting.sort((a,b)=>b.priority-a.priority);
   while(this.active<this.limit&&waiting.length){const job=waiting.shift();job.running=true;this.active++;
    Promise.resolve().then(()=>this.work(job.key,job.options)).then(value=>{this.cache.set(job.key,value);while(this.cache.size>this.capacity)this.cache.delete(this.cache.keys().next().value);this.stats.completed++;this.jobs.delete(job.key);for(const l of job.listeners)l.resolve(value)},error=>{this.jobs.delete(job.key);for(const l of job.listeners)l.reject(error)}).finally(()=>{if(this.jobs.get(job.key)===job)this.jobs.delete(job.key);this.active--;this.schedule()});
   }
  }
 }
 if(typeof module==='object')module.exports=PreviewQueue;else root.PreviewQueue=PreviewQueue;
})(typeof window==='object'?window:globalThis);
