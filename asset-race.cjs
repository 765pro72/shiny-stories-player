/* Prefer the official CDN; hedge an unresponsive connection, not a healthy body
   download. Only validated data may win. Losing transfers are cancelled. */
function preferOfficial(official,mirror,{hedgeAfter=1800}={}){
 return new Promise((resolve,reject)=>{
  const primary=new AbortController(),secondary=new AbortController();let settled=false,started=false,primaryError,secondaryError;
  const timer=setTimeout(startMirror,hedgeAfter);
  function finish(value,source){if(settled)return;settled=true;clearTimeout(timer);(source==='official'?secondary:primary).abort();resolve({...value,source})}
  function fail(){if(primaryError&&secondaryError&&!settled){settled=true;clearTimeout(timer);reject(Error(`官方：${primaryError.message}；镜像：${secondaryError.message}`))}}
  function startMirror(){if(settled||started)return;started=true;Promise.resolve().then(()=>mirror(secondary.signal)).then(v=>finish(v,'mirror'),e=>{secondaryError=e;fail()})}
  Promise.resolve().then(()=>official(primary.signal,()=>clearTimeout(timer))).then(v=>finish(v,'official'),e=>{primaryError=e;clearTimeout(timer);startMirror();fail()});
 });
}
module.exports={preferOfficial};
