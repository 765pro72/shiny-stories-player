// Public official resource codec, isolated from the game's application runtime.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {preferOfficial}=require('./asset-race.cjs');let ready;
function loadCodec(){
 if(!ready)ready=new Promise((resolve,reject)=>{try{
  let factories;const self=new Proxy({}, {set(target,key,value){if(Array.isArray(value))value.push=packet=>{factories=packet[1]};target[key]=value;return true}});
  const context=vm.createContext({self,console,window:{},TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,Math,Date,setTimeout,clearTimeout,atob:s=>Buffer.from(s,'base64').toString('binary')});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'vendor/official-resource-codec.js'),'utf8'),context,{timeout:5000});
  const module={exports:{}};factories[38737](module,module.exports,id=>{throw Error('Unexpected codec dependency '+id)});
  module.exports({print:()=>{},printErr:()=>{}}).then(codec=>resolve({codec}));
 }catch(e){reject(e)}});
 return ready;
}
function validate(key,bytes,type=''){
 if(!bytes.length||bytes.length>100*1024*1024)throw Error('Invalid asset size');
 if(type.includes('text/html')||/^\s*<!doctype html|^\s*<html/i.test(bytes.subarray(0,200).toString()))throw Error('Server returned HTML instead of resource');
 if(key.endsWith('.json'))JSON.parse(bytes.toString('utf8'));
 if(key.endsWith('.atlas')&&!/\b(size|bounds):/.test(bytes.toString('utf8')))throw Error('Invalid Spine atlas');
 const webp=bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(key.endsWith('.png')&&!webp&&bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG/WebP');
 if(/\.jpe?g$/.test(key)&&bytes.subarray(0,2).toString('hex')!=='ffd8')throw Error('Invalid JPEG');
 if(/\.(m4a|mp4)$/.test(key)&&bytes.subarray(4,8).toString()!=='ftyp')throw Error('Invalid MP4 audio/video');
}
async function get(url,signal,onHeaders){const timeout=AbortSignal.timeout(25000);const response=await fetch(url,{signal:signal?AbortSignal.any([signal,timeout]):timeout});if(!response.ok)throw Error('HTTP '+response.status);onHeaders?.();const bytes=Buffer.from(await response.arrayBuffer());if(response.headers.get('content-type')?.includes('text/html'))throw Error('Server returned HTML');return{bytes,type:response.headers.get('content-type')||''}}
async function fetchAsset(key,options={}){
 if(!/^(json|images|sounds|movies|spine)\/[\w/.@-]+$/.test(key)||key.split('/').includes('..'))throw Error('Invalid asset path');
 const official=async(signal,onHeaders)=>{
  if(options.signal)signal=AbortSignal.any([signal,options.signal]);
  const {codec}=await loadCodec(),assetPath='/assets/'+key;
  const extension=path.posix.extname(key),media=/^\.(mp3|mp4|m4a)$/.test(extension)?extension:'';
  const candidates=[assetPath],match=(key.match(/^images\/content\/(idols|support_idols)\/(card|fes_card)\/(\d+)\.jpg$/)||key.match(/^movies\/(idols)\/(card|card_costume)\/(\d+)\.mp4$/));
  if(match)try{const card=JSON.parse(fs.readFileSync(path.join(options.dataRoot||path.join(__dirname,'data'),'card-supplement.json'),'utf8')).find(c=>c.type===match[1]&&c.id===match[3]);if(card?.hash)candidates.unshift(assetPath.replace(/\/([^/]+)$/, '/'+card.hash+'_$1'))}catch{}
  let result,last;for(const candidate of candidates){try{const name=path.posix.basename(candidate).replace(/\.[^.]+$/,'');result=await get('https://shinycolors.enza.fun/assets/'+codec.encryptPath(candidate,name)+media,signal,onHeaders);break}catch(e){last=e}}if(!result)throw last;
  let bytes=result.bytes;
  if(key.endsWith('.json')||key.endsWith('.atlas')){
   const pointer=codec._malloc(bytes.length);
   try{new Uint8Array(codec.HEAPU8.buffer,pointer,bytes.length).set(bytes);bytes=Buffer.from(codec.decryptResource(pointer,bytes.length),'latin1');}finally{codec._free(pointer)}
  }
  validate(key,bytes,result.type);return{bytes,source:'official'};
 };
 const mirror=async signal=>{if(options.signal)signal=AbortSignal.any([signal,options.signal]);const result=await get('https://viewer.shinycolors.moe/'+key,signal);validate(key,result.bytes,result.type);return{bytes:result.bytes}};
 try{return await preferOfficial(official,mirror,{hedgeAfter:key.startsWith('spine/')?1800:25000})}catch(e){throw Error(`资源获取失败 ${key}；${e.message}`)}
}
module.exports={fetchAsset,loadCodec};
