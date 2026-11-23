// Worker fetch uses Electron's network session (including the system proxy).
// Stream chunks rather than waiting for a complete archive before reporting.
function installWorkerFetch(port){
  let serial=0;const pending=new Map();
  port.on('message',message=>{
    const item=pending.get(message.id);if(!item||!message.type.startsWith('http-'))return;
    if(message.type==='http-headers'){
      item.resolve(new Response(new ReadableStream({start(controller){item.controller=controller},cancel(){item.cancel()}}),{status:message.status,headers:message.headers}));
    }else if(message.type==='http-chunk')item.controller?.enqueue(new Uint8Array(message.bytes));
    else if(message.type==='http-end'){item.controller?.close();item.cleanup()}
    else if(message.type==='http-error'){const error=Error(message.error);item.controller?.error(error);item.reject(error);item.cleanup()}
  });
  globalThis.fetch=(url,options={})=>new Promise((resolve,reject)=>{
    const id=++serial,signal=options.signal;
    const cleanup=()=>{signal?.removeEventListener('abort',abort);pending.delete(id)};
    const cancel=()=>{port.postMessage({type:'http-cancel',id});cleanup()};
    const abort=()=>{const error=signal.reason||Error('请求已取消');pending.get(id)?.controller?.error(error);reject(error);cancel()};
    if(signal?.aborted){reject(signal.reason);return}
    pending.set(id,{resolve,reject,cleanup,cancel});signal?.addEventListener('abort',abort,{once:true});
    port.postMessage({type:'http-start',id,url:String(url)});
  });
}
function serveWorkerFetch(worker,transport){
  const active=new Map();let disposed=false;
  const send=message=>{if(!disposed)worker.postMessage(message)};
  const listener=async message=>{
    if(message.type==='http-cancel'){active.get(message.id)?.abort();return}
    if(message.type!=='http-start')return;
    const controller=new AbortController();active.set(message.id,controller);
    try{
      const url=new URL(message.url);if(url.protocol!=='https:')throw Error('更新只允许 HTTPS 来源');
      const response=await transport(url.href,{signal:controller.signal});
      send({type:'http-headers',id:message.id,status:response.status,headers:[...response.headers]});
      for await(const bytes of response.body||[])send({type:'http-chunk',id:message.id,bytes});
      send({type:'http-end',id:message.id});
    }catch(error){send({type:'http-error',id:message.id,error:error.message})}
    finally{active.delete(message.id)}
  };
  worker.on('message',listener);
  return()=>{disposed=true;worker.off('message',listener);for(const controller of active.values())controller.abort();active.clear()};
}
module.exports={installWorkerFetch,serveWorkerFetch};
