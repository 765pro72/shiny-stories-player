/* Portable volume-based speech timing, computed locally from decoded audio. */
((root)=>{
 const STEP=.02,MAX_SECONDS=600;
 function validate(plan){
  if(plan===undefined)return;
  if(!plan||plan.version!==1||plan.step!==STEP||!Number.isFinite(plan.duration)||plan.duration<=0||plan.duration>MAX_SECONDS||!Number.isInteger(plan.threshold)||plan.threshold<1||plan.threshold>255||!Array.isArray(plan.levels)||plan.levels.length!==Math.ceil(plan.duration/STEP)||plan.levels.length>30000||plan.levels.some(n=>!Number.isInteger(n)||n<0||n>255))throw Error('音频嘴型时序无效');
 }
 function analyze(channels,sampleRate){
  const count=channels[0]?.length,duration=count/sampleRate;if(!count||!Number.isFinite(sampleRate)||sampleRate<=0||duration>MAX_SECONDS||channels.some(c=>c.length!==count))throw Error('请选择不超过10分钟的有效音频');
  const levels=[];for(let i=0;i<Math.ceil(duration/STEP);i++){const start=Math.floor(i*STEP*sampleRate),end=Math.min(count,Math.floor((i+1)*STEP*sampleRate));let sum=0;for(const c of channels)for(let n=start;n<end;n++)sum+=c[n]*c[n];levels.push(Math.sqrt(sum/Math.max(1,(end-start)*channels.length)))}
  const sorted=[...levels].sort((a,b)=>a-b),peak=Math.max(.0001,sorted[Math.floor((sorted.length-1)*.95)]||0),plan={version:1,step:STEP,duration,threshold:31,levels:levels.map(n=>Math.max(0,Math.min(255,Math.round(n/peak*255))))};validate(plan);return plan;
 }
 function levelAt(plan,time){if(!plan||!Number.isFinite(time)||time<0||time>=plan.duration)return 0;const i=Math.floor(time/plan.step);return Math.max(0,...plan.levels.slice(Math.max(0,i-2),i+1))}
 const activeAt=(plan,time)=>levelAt(plan,time)>=plan.threshold;
 const api={analyze,validate,levelAt,activeAt,MAX_SECONDS};if(typeof module==='object')module.exports=api;else root.StoryAudioMouth=api;
})(typeof window==='object'?window:globalThis);
