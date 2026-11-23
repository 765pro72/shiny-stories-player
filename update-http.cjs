// Bounded, retryable metadata downloads. A progressing body may take longer
// than the old 120s limit; a stalled connection must never wait indefinitely.
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function reason(error){return error?.name==='TimeoutError'||error?.name==='AbortError'?'连接或接收数据超时':error?.cause?.code||error?.message||'网络连接失败'}
async function requestBytes(url,{label=new URL(url).hostname,progress=()=>{},attempts=3,connectMs=25000,idleMs=30000,totalMs=600000,maxBytes=160*1024*1024,fetch:transport=globalThis.fetch}={}){
  let last;
  for(let attempt=1;attempt<=attempts;attempt++){
    const controller=new AbortController();let timer=setTimeout(()=>controller.abort(),connectMs),total=setTimeout(()=>controller.abort(),totalMs),reader;
    const arm=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),idleMs)};
    try{
      const response=await transport(url,{signal:controller.signal});arm();
      if(!response.ok){const error=Error('HTTP '+response.status);error.retryable=response.status===408||response.status===429||response.status>=500;await response.body?.cancel();throw error}
      const chunks=[];let received=0,lastReported=0;const size=Number(response.headers?.get('content-length'))||0;
      if(response.body?.getReader){reader=response.body.getReader();for(;;){const {done,value}=await reader.read();if(done)break;arm();received+=value.byteLength;if(received>maxBytes)throw Error('数据大小超出预期');chunks.push(Buffer.from(value));if(Date.now()-lastReported>600){progress(`${label}：已接收 ${(received/1048576).toFixed(1)} MB${size?' / '+(size/1048576).toFixed(1)+' MB':''}`);lastReported=Date.now()}}}
      else{chunks.push(Buffer.from(await response.arrayBuffer()));received=chunks[0].length}
      if(received>maxBytes)throw Error('数据大小超出预期');
      return Buffer.concat(chunks,received);
    }catch(error){last=error;controller.abort();if(attempt===attempts||error.retryable===false)break;progress(`${label}：${reason(error)}，正在重试 ${attempt}/${attempts-1}…`);await delay(Math.min(1500,attempt*500))}
    finally{clearTimeout(timer);clearTimeout(total);reader?.releaseLock()}
  }
  throw Error(`${label}更新失败：${reason(last)}（${new URL(url).hostname}）。原数据未替换，可稍后重试。`);
}
module.exports={requestBytes,reason};
