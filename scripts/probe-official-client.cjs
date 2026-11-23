const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..','research','official-current');fs.mkdirSync(root,{recursive:true});
async function get(url){const r=await fetch(url,{signal:AbortSignal.timeout(25000)});const text=await r.text();if(!r.ok)throw Error('HTTP '+r.status);return{url,type:r.headers.get('content-type'),text};}
(async()=>{
 const page=await get('https://shinycolors.enza.fun/');
 const script=page.text.match(/src="([^\"]*\/app-[^\"]+\.js[^\"]*)"/);
 if(!script)throw Error('Main application script not found');
 const app=await get(new URL(script[1].replace(/&amp;/g,'&'),'https://shinycolors.enza.fun/').href);
 fs.writeFileSync(path.join(root,'app.js'),app.text);console.log({app:app.url,bytes:app.text.length});
 for(const name of ['resource_hash','resource_hash-wasm']){
  const match=app.text.match(new RegExp('(\\d+):"'+name+'"'));if(!match){console.log({name,error:'chunk id missing'});continue;}
  const id=match[1],hash=app.text.match(new RegExp(id+':"([a-f0-9]{20})"'))?.[1];if(!hash)throw Error('chunk digest missing');
  const chunk=await get('https://shinycolors.enza.fun/'+name+'-'+hash+'.chunk.js');
  console.log({url:chunk.url,type:chunk.type,bytes:chunk.text.length});
  if(!/javascript/.test(chunk.type||''))continue;
  fs.writeFileSync(path.join(root,name+'.js'),chunk.text);
  console.log(chunk.text.slice(0,250));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
