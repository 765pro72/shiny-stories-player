// Local transport for user-configured model APIs. No key, prompt or output is logged or persisted.
const providers = [
 ['openai','OpenAI','openai','https://api.openai.com/v1'],
 ['claude','Anthropic / Claude','anthropic','https://api.anthropic.com/v1'],
 ['gemini','Google / Gemini','gemini','https://generativelanguage.googleapis.com/v1beta'],
 ['xai','xAI / Grok','openai','https://api.x.ai/v1'],
 ['deepseek','DeepSeek','openai','https://api.deepseek.com/v1'],
 ['qwen','阿里云百炼 / 千问','openai','https://dashscope.aliyuncs.com/compatible-mode/v1'],
 ['moonshot','月之暗面 / Kimi','openai','https://api.moonshot.cn/v1'],
 ['zhipu','智谱 / GLM','openai','https://open.bigmodel.cn/api/paas/v4'],
 ['minimax','MiniMax（中国）','openai','https://api.minimaxi.com/v1'],
 ['doubao','火山方舟 / 豆包','openai','https://ark.cn-beijing.volces.com/api/v3'],
 ['hunyuan','腾讯混元','openai','https://api.hunyuan.cloud.tencent.com/v1'],
 ['qianfan','百度千帆','openai','https://qianfan.baidubce.com/v2'],
 ['siliconflow','硅基流动','openai','https://api.siliconflow.cn/v1'],
 ['openrouter','OpenRouter','openai','https://openrouter.ai/api/v1'],
 ['groq','Groq','openai','https://api.groq.com/openai/v1'],
 ['mistral','Mistral','openai','https://api.mistral.ai/v1'],
 ['azure','Azure OpenAI','openai',''],
 ['ollama','Ollama（本机）','openai','http://127.0.0.1:11434/v1'],
 ['lmstudio','LM Studio（本机）','openai','http://127.0.0.1:1234/v1'],
 ['custom','自定义 API / 中转服务','openai','']
].map(([id,name,protocol,baseURL])=>({id,name,protocol,baseURL}));

function config(input){
 const c=input?.connection;if(!c||!['openai','responses','anthropic','gemini'].includes(c.protocol))throw Error('请选择支持的 API 协议');
 const url=new URL(c.baseURL);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw Error('API 地址格式无效');
 if(url.protocol==='http:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('远程 API 请使用 HTTPS；本机模型可以使用 HTTP');
 const apiKey=String(c.apiKey||'').trim();if(apiKey.length>4096||/[\r\n]/.test(apiKey))throw Error('API Key 格式无效');
 const model=String(c.model||'').trim();if(model.length>200||/[\r\n?#]/.test(model))throw Error('模型名称无效');
 return{...c,baseURL:url.href.replace(/\/$/,''),apiKey,model,maxTokens:Math.max(256,Math.min(32768,Number(c.maxTokens)||4096)),timeout:Math.max(15,Math.min(600,Number(c.timeout)||180))*1000,stream:c.stream!==false};
}
function base(c){return c.baseURL.replace(/\/(chat\/completions|responses|messages)\/?$/,'').replace(/\/models\/[^/]+:(?:streamGenerateContent|generateContent)$/,'')}
function headers(c){const h={'Content-Type':'application/json'};if(c.apiKey){if(c.protocol==='anthropic'){h['x-api-key']=c.apiKey;h['anthropic-version']='2023-06-01'}else if(c.protocol==='gemini')h['x-goog-api-key']=c.apiKey;else h[c.auth==='api-key'?'api-key':'Authorization']=c.auth==='api-key'?c.apiKey:'Bearer '+c.apiKey}return h}
function request(c,messages){
 const system=messages.filter(m=>m.role==='system').map(m=>m.content).join('\n'),dialog=messages.filter(m=>m.role!=='system');let url=base(c),body;
 if(c.protocol==='anthropic'){url+='/messages';body={model:c.model,system,messages:dialog,max_tokens:c.maxTokens,stream:c.stream}}
 else if(c.protocol==='gemini'){url+='/models/'+encodeURIComponent(c.model.replace(/^models\//,''))+':'+(c.stream?'streamGenerateContent?alt=sse':'generateContent');body={systemInstruction:{parts:[{text:system}]},contents:dialog.map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]})),generationConfig:{maxOutputTokens:c.maxTokens}}}
 else if(c.protocol==='responses'){url+='/responses';body={model:c.model,instructions:system,input:dialog,max_output_tokens:c.maxTokens,stream:c.stream}}
 else{url+='/chat/completions';body={model:c.model,messages,stream:c.stream};body[c.tokenField==='max_completion_tokens'||c.provider==='openai'?'max_completion_tokens':'max_tokens']=c.maxTokens}
 return{url,options:{method:'POST',headers:headers(c),body:JSON.stringify(body),redirect:'error'}};
}
function output(protocol,data,stream){
 if(data.response?.error)throw Error(data.response.error.message||'模型生成失败');
 if(data.error)throw Error(typeof data.error==='string'?data.error:data.error.message||'服务商返回错误');
 if(protocol==='anthropic')return stream?(data.type==='content_block_delta'?data.delta?.text||'':''):(data.content||[]).filter(p=>p.type==='text').map(p=>p.text).join('');
 if(protocol==='gemini')return(data.candidates?.[0]?.content?.parts||[]).filter(p=>!p.thought).map(p=>p.text||'').join('');
 if(protocol==='responses')return stream?(data.type==='response.output_text.delta'?data.delta||'':''):(data.output||[]).flatMap(o=>o.content||[]).filter(p=>p.type==='output_text').map(p=>p.text).join('');
 const content=stream?(data.choices?.[0]?.delta?.content??data.choices?.[0]?.delta?.text):(data.choices?.[0]?.message?.content??data.choices?.[0]?.message?.text??data.choices?.[0]?.text);return Array.isArray(content)?content.map(p=>p.text||'').join(''):typeof content==='string'?content:'';
}
// Reasoning models can stream thinking only and never emit answer text; count it so the
// failure message can tell the user why the batch came back empty.
function reasoning(protocol,data){
 if(protocol==='anthropic')return data.type==='content_block_delta'&&data.delta?.type==='thinking_delta'?String(data.delta.thinking||''):'';
 if(protocol==='responses')return data.type==='response.reasoning_summary_text.delta'||data.type==='response.reasoning_text.delta'?String(data.delta||''):'';
 if(protocol==='gemini')return '';
 return String(data.choices?.[0]?.delta?.reasoning_content||data.choices?.[0]?.message?.reasoning_content||'');
}
async function* eventData(response){
 const decoder=new TextDecoder();let buffer='',data=[],bytes=0;
 for await(const chunk of response.body){bytes+=chunk.length;if(bytes>12*1024*1024)throw Error('API 返回内容过大（已超过 12 MB）：请减少分镜数、改用「分批生成」，或换用更稳定的模型');buffer+=decoder.decode(chunk,{stream:true});let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end).replace(/\r$/,'');buffer=buffer.slice(end+1);if(!line){if(data.length){yield data.join('\n');data=[]}}else if(line.startsWith('data:'))data.push(line.slice(5).trimStart())}}
 if(buffer.startsWith('data:'))data.push(buffer.slice(5).trim());if(data.length)yield data.join('\n');
}
async function jsonBody(req){let size=0,parts=[];for await(const p of req){if((size+=p.length)>2*1024*1024)throw Error('请求内容过长');parts.push(p)}return JSON.parse(Buffer.concat(parts).toString('utf8'))}
function safeError(e,key){const text=String(e.message||'请求失败');return (key&&key.length>=8?text.replaceAll(key,'[已隐藏密钥]'):text).slice(0,600)}
function createStoryAIService({fetch:fetcher=globalThis.fetch}={}){
 let running=0;
 return async(req,res,url)=>{
  if(!url.pathname.startsWith('/api/story-ai/'))return false;
  res.setHeader('Cache-Control','no-store');if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host){res.writeHead(403);res.end();return true}
  if(url.pathname==='/api/story-ai/providers'&&req.method==='GET'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(providers));return true}
  if(req.method!=='POST'||!['/api/story-ai/models','/api/story-ai/generate'].includes(url.pathname)){res.writeHead(405);res.end();return true}
  if(!String(req.headers['content-type']).startsWith('application/json')){res.writeHead(415);res.end();return true}
  let c,controller,heartbeat;let counted=false;
  const send=value=>{if(!res.destroyed)res.write(JSON.stringify(value)+'\n')};
  try{
   const input=await jsonBody(req),memory=require('./ai-connection-memory.cjs');c=config({connection:memory.resolve(input.connection)});memory.remember(c);if(running>=3)throw Error('已有 3 个 AI 请求运行，请稍后再试');running++;counted=true;controller=new AbortController();const timeout=setTimeout(()=>controller.abort(Error('请求超时，请检查网络、代理或增加等待时间')),c.timeout);controller.signal.addEventListener('abort',()=>clearTimeout(timeout),{once:true});res.on('close',()=>{clearTimeout(timeout);controller.abort()});
   if(url.pathname.endsWith('/models')){const endpoint=base(c)+'/models',r=await fetcher(endpoint,{headers:headers(c),signal:controller.signal,redirect:'error'});if(!r.ok)throw Error('读取模型失败（HTTP '+r.status+'），也可以手动输入模型名');const value=await r.json(),rows=(value.data||value.models||[]).map(m=>m.id||m.name).filter(x=>typeof x==='string').slice(0,1000);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({models:rows}));clearTimeout(timeout);return true}
   if(!c.model)throw Error('请输入要使用的模型名称');
   if(!Array.isArray(input.messages)||!input.messages.length||input.messages.length>10||input.messages.some(m=>!['system','user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>400000))throw Error('创作请求内容无效');
   res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','X-Content-Type-Options':'nosniff'});send({type:'status',message:'正在连接模型服务…'});heartbeat=setInterval(()=>send({type:'heartbeat'}),10000);
    const ask=async(messages,cap)=>{const q=request({...c,maxTokens:cap},messages),r=await fetcher(q.url,{...q.options,signal:controller.signal});if(!r.ok){const raw=await r.text();let detail='';try{const v=JSON.parse(raw);detail=v.error?.message||v.message||''}catch{}throw Error('API 请求失败（HTTP '+r.status+'）'+(detail?'：'+detail.slice(0,300):''))}
      let length=0,thoughts=0,lastFinish='';const emit=data=>{const text=output(c.protocol,data,true);lastFinish=data.choices?.[0]?.finish_reason||data.candidates?.[0]?.finishReason||data.delta?.stop_reason||lastFinish;if(text){length+=text.length;if(length>1000000)throw Error('生成内容超过长度限制');send({type:'delta',text})}else thoughts+=reasoning(c.protocol,data).length};
      if(r.headers.get('content-type')?.includes('text/event-stream')){for await(const event of eventData(r)){if(event==='[DONE]')break;let data;try{data=JSON.parse(event)}catch{throw Error('模型服务返回了无效的流式数据')}emit(data)}}
      else{const data=await r.json(),text=output(c.protocol,data,false);length=text.length;thoughts=reasoning(c.protocol,data).length;send({type:'delta',text});lastFinish=data.choices?.[0]?.finish_reason||data.candidates?.[0]?.finishReason||data.stop_reason||''}
      return{length,thoughts,lastFinish}};
    let result=await ask(input.messages,c.maxTokens);
    if(!result.length&&result.thoughts){send({type:'status',message:'模型只返回了思考内容，正在提高输出上限重试…'});const nudge=[{role:'system',content:'你只需直接输出最终结果，不要输出思考、分析或解释过程。'},...input.messages];result=await ask(nudge,Math.min(32768,c.maxTokens*2))}
    const length=result.length;if(!length)throw Error('模型没有返回正文，请确认所选模型支持文本输出'+(result.thoughts?'：本次只收到 '+result.thoughts+' 字思考内容，输出上限 '+c.maxTokens+' tokens 可能被思考占满。请换用非思考模型，或提高「输出上限」后重试':''));send({type:'done',characters:length,finishReason:result.lastFinish});clearTimeout(timeout);res.end();
  }catch(e){const message=safeError(controller?.signal.aborted&&controller.signal.reason?.message?controller.signal.reason:e,c?.apiKey);if(res.headersSent){send({type:'error',message});res.end()}else{res.writeHead(400,{'Content-Type':'application/json'});res.end(JSON.stringify({error:message}))}}
  finally{if(heartbeat)clearInterval(heartbeat);if(counted)running--}return true;
 };
}
module.exports={providers,config,request,output,eventData,createStoryAIService};



