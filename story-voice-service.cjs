// Independent implementation of the public Fish Audio / OpenAI-compatible TTS APIs.
// Eidolon-SC's character configuration can be imported on demand; no upstream code is copied.
const catalogURL='https://raw.githubusercontent.com/Sallyn0225/eidolon-sc/main/characters/characters.toml';
const sourceURL='https://github.com/Sallyn0225/eidolon-sc';
const fishModels=['s2.1-pro-free','s2.1-pro','drama-3','s2-pro','s1'];
const speech=require('./public/story-speech.js');
function profiles(text){
 const rows=[];
 for(const block of text.split(/^\s*\[\[characters\]\]\s*$/m).slice(1)){
  const field=name=>{const m=block.match(new RegExp('^'+name+'\\s*=\\s*("(?:[^"\\\\]|\\\\.)*")','m'));if(!m)return'';try{return JSON.parse(m[1])}catch{return''}};
  const id=field('id'),voice=field('voice_id'),name=field('name_zh')||field('name');
  if(id&&name&&/^[\w-]{1,100}$/.test(voice))rows.push({id,name,shortName:field('short_name'),voice,source:sourceURL});
 }
 if(!rows.length)throw Error('角色配置未找到公开音色，请手动填写音色 ID');return rows;
}
function request(input){
 const c=input.connection||{},provider=c.provider==='openai'?'openai':'fish';
 const u=new URL(c.baseURL||'https://api.fish.audio/v1');
 if(u.username||u.password||u.search||u.hash||u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))throw Error('服务地址需使用 HTTPS；本机服务可以使用 HTTP');
 speech.validate(input.speech);
 const text=input.speech?.language==='segments'?speech.compile(input.speech,provider):String(input.text||'').trim(),voice=String(input.voice||'').trim(),model=String(c.model||'').trim(),key=String(c.apiKey||'');
 if(!text||text.length>10000)throw Error('每次配音请输入 1–10000 字');
 if(!voice||voice.length>200||/[\r\n]/.test(voice))throw Error('请选择音色或填写音色 ID');
 if(!model||model.length>100||/[\r\n]/.test(model))throw Error('请输入语音合成模型');
 if(key.length>2000||/[\r\n]/.test(key))throw Error('API Key 格式无效');
 if(provider==='fish'&&!fishModels.includes(model))throw Error('请选择已支持的 Fish Audio 模型，避免服务自动回退到其他计费模型');
 const headers={'Content-Type':'application/json','Accept':'audio/mpeg'};if(key)headers.Authorization='Bearer '+key;
 const speed=Math.max(.5,Math.min(2,Number(input.speed)||1));
 let endpoint=u.href.replace(/\/$/,'').replace(/\/(tts|audio\/speech)$/,'');
 let body;if(provider==='fish'){endpoint+='/tts';headers.model=model;body={text,reference_id:voice,format:'mp3',prosody:{speed,volume:0},latency:'normal',normalize:true};}
 else{endpoint+='/audio/speech';body={model,input:text,voice,response_format:'mp3',speed}}
 return{url:endpoint,options:{method:'POST',headers,body:JSON.stringify(body),redirect:'error'}};
}
async function readJSON(req){let size=0;const parts=[];for await(const p of req){if((size+=p.length)>128*1024)throw Error('配音请求过大');parts.push(p)}return JSON.parse(Buffer.concat(parts).toString('utf8'))}
function createStoryVoiceService(options={}){
 const fetcher=options.fetch||globalThis.fetch,packTts=options.packTts||null;let running=0,catalog=null;
 return async(req,res,url)=>{
  if(!url.pathname.startsWith('/api/story-voice/'))return false;
  let controller,timer,counted=false,key='';
  const json=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value))};
  try{
   if(req.headers.origin&&req.headers.origin!=='http://'+req.headers.host){json(403,{error:'只允许应用自身发起配音请求'});return true}
   if(url.pathname==='/api/story-voice/catalog'&&req.method==='GET'){
    if(!catalog&&!url.searchParams.has('refresh')){catalog=require('./data/story-voice-profiles.json').profiles}
    if(!catalog||url.searchParams.has('refresh')){const r=await fetcher(catalogURL,{signal:AbortSignal.timeout(25000),redirect:'error'});if(!r.ok)throw Error('读取参考仓库失败（HTTP '+r.status+'），可手动填写音色 ID');const text=await r.text();if(text.length>500000)throw Error('角色配置过大');catalog=profiles(text)}
    const localPack=packTts?await packTts.getStatus(url.searchParams.get('probe')==='1'):null;
    json(200,{source:sourceURL,configuration:catalogURL,license:'AGPL-3.0-or-later（上游仓库）',profiles:catalog,localPack});return true;
   }
   if(url.pathname!=='/api/story-voice/generate'||req.method!=='POST'){json(404,{error:'配音接口不存在'});return true}
   if(!String(req.headers['content-type']).startsWith('application/json'))throw Error('请使用 JSON 请求');
   if(running>=2)throw Error('已有配音正在进行，请稍后重试');
   const input=await readJSON(req);key=String(input.connection?.apiKey||'');
   if(input.connection?.provider==='gptsovits'){
    if(!packTts)throw Error('本机语音包服务未就绪');
    speech.validate(input.speech);
    const text=input.speech?.language==='segments'?speech.compile(input.speech,'openai'):String(input.text||'').trim();
    const voice=String(input.voice||'').trim();
    if(!text||text.length>10000)throw Error('每次配音请输入 1–10000 字');
    if(!voice||voice.length>200||/[\r\n]/.test(voice))throw Error('请选择偶像声线或填写声线 ID');
    controller=new AbortController();timer=setTimeout(()=>controller.abort(Error('配音服务超时，可重试；原有配音保留')),180000);res.on('close',()=>controller.abort());running++;counted=true;
    const out=await packTts.synthesize({voiceId:voice,text,textLang:input.textLang||'auto',speed:input.speed,apiUrl:input.connection?.baseURL,signal:controller.signal});
    res.writeHead(200,{'Content-Type':out.contentType||'audio/wav','Content-Length':out.buffer.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(out.buffer);return true;
   }
   const q=request(input);controller=new AbortController();timer=setTimeout(()=>controller.abort(Error('配音服务超时，可重试；原有配音保留')),180000);res.on('close',()=>controller.abort());running++;counted=true;
   const r=await fetcher(q.url,{...q.options,signal:controller.signal});
   if(!r.ok){let detail='';try{const v=await r.json();detail=v.error?.message||v.message||v.detail||''}catch{}throw Error('配音失败（HTTP '+r.status+'）'+(detail?'：'+String(detail).slice(0,300):''))}
   const type=r.headers.get('content-type')||'';if(/json|text\/|html/i.test(type))throw Error('语音服务未返回音频，请检查模型、音色和余额');
   let size=0;const chunks=[];for await(const chunk of r.body){if((size+=chunk.length)>32*1024*1024)throw Error('音频超过 32 MB，请拆分台词');chunks.push(chunk)}if(size<16)throw Error('语音服务返回空音频');
   res.writeHead(200,{'Content-Type':'audio/mpeg','Content-Length':size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(Buffer.concat(chunks));
  }catch(e){if(!res.destroyed){let message=controller?.signal.reason?.message||e.message||'配音失败';if(key)message=message.split(key).join('[已隐藏密钥]');json(400,{error:message})}}
  finally{clearTimeout(timer);if(counted)running--}return true;
 };
}
module.exports={profiles,request,createStoryVoiceService};
