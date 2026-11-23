const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('research/official-current/resource_hash.js','utf8');
let factories;
const self=new Proxy({}, {get:(target,key)=>target[key],set:(target,key,value)=>{if(Array.isArray(value)){value.push=packet=>{factories=packet[1]}}target[key]=value;return true}});
const context=vm.createContext({self,console,window:{},TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,Math,Date,setTimeout,clearTimeout,atob:s=>Buffer.from(s,'base64').toString('binary')});
vm.runInContext(source,context,{timeout:5000});
const codecModule={exports:{}};factories[38737](codecModule,codecModule.exports,id=>{throw Error('Unexpected dependency '+id)});
const runtime=codecModule.exports({print:()=>{},printErr:()=>{}});
runtime.then(async codec=>{
 console.log('runtime functions',Object.keys(codec).filter(x=>/crypt|Path/.test(x)));
 if(typeof codec.encryptPath!=='function')throw Error('encryptPath unavailable');
 for(const p of ['/assets/asset-map.json','/assets/images/event/bg/00001.jpg','/assets/json/produce_events/100100002.json']){
  const name=p.split('/').at(-1).replace(/\.[^.]+$/,'');console.log(JSON.stringify({path:p,encoded:codec.encryptPath(p,name)}));
 }
 for(const [key,prefix] of [['asset-map.json','asset-map-'],['images/event/bg/00001.jpg',''],['json/produce_events/100100002.json','']]){
  const p='/assets/'+key,name=p.split('/').at(-1).replace(/\.[^.]+$/,'');
  const url='https://shinycolors.enza.fun/assets/'+prefix+codec.encryptPath(p,name);
  const r=await fetch(url,{signal:AbortSignal.timeout(25000)}),bytes=Buffer.from(await r.arrayBuffer());
  console.log({key,url,status:r.status,type:r.headers.get('content-type'),bytes:bytes.length,magic:bytes.subarray(0,12).toString('hex')});
  if(key.endsWith('.json')&&!String(r.headers.get('content-type')).includes('html')){
   const ptr=codec._malloc(bytes.length);new Uint8Array(codec.HEAPU8.buffer,ptr,bytes.length).set(bytes);
   try{const raw=codec.decryptResource(ptr,bytes.length);const decoded=Buffer.from(raw,'latin1').toString('utf8');const json=JSON.parse(decoded);console.log('decoded',key,Object.keys(json).slice(0,8));if(key==='asset-map.json')fs.writeFileSync('research/official-current/asset-map.json',JSON.stringify(json));}
   finally{codec._free(ptr)}
  }
 }
});
