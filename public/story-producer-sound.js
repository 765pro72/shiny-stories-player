((root)=>{
 const DEFAULT_URL='/official-ui-sounds/002.m4a';
 const producer=name=>/^(制作人|製作人|プロデューサー|producer|p)(?:[（(].*[）)])?$/i.test(String(name||'').replace(/[\s　]/g,''));
 function validate(config,refs){if(config===undefined)return;if(!config||typeof config!=='object'||Array.isArray(config)||config.enabled!==undefined&&typeof config.enabled!=='boolean'||config.volume!==undefined&&(!Number.isFinite(config.volume)||config.volume<0||config.volume>100)||config.interval!==undefined&&(!Number.isFinite(config.interval)||config.interval<0||config.interval>5))throw Error('制作人对话音设置无效');if(config.asset)refs(config.asset,['audio'])}
 function plan(project,scene){
  const C=typeof module==='object'?require('./custom-story-core.js'):root.CustomStory,config=project.producerSound||{};if(config.enabled===false)return[];
  const voiced=(id,line)=>{const a=project.assets.find(a=>a.id===id);return a&&C.voiceCurrent(a,line)},captions=scene.captions||[],lines=[...(!captions.some(c=>c.at===0)?[{line:scene,at:0,end:captions[0]?.at??scene.duration,voice:scene.voice}]:[]),...captions.map((line,i)=>({line,at:line.at,end:Math.min(line.at+line.duration,captions[i+1]?.at??scene.duration),voice:scene.voiceClips?.find(v=>v.captionIndex===i&&v.text===line.text)?.asset}))];
  return lines.filter(v=>producer(v.line.speaker)&&v.line.text.trim()&&!voiced(v.voice,v.line)).map(v=>({at:v.at,duration:Math.max(0,Math.min(v.end-v.at,8,Math.max(.2,[...v.line.text.replace(/\s/g,'')].length*.065))),asset:config.asset||'',volume:config.volume??35,interval:config.interval??0})).filter(v=>v.duration>0);
 }
 function play(audio,{interval=0,duration,isCurrent=()=>true,timers=[]}){const deadline=performance.now()+duration*1000;let stopped=false;const current=()=>!stopped&&isCurrent()&&performance.now()<deadline,stop=()=>{stopped=true;audio.onended=null;audio.pause()};audio.loop=interval===0;const start=()=>{if(!current())return;audio.currentTime=0;audio.play().catch(()=>{})};audio.onended=interval>0?()=>{if(current())timers.push(setTimeout(start,interval*1000))}:null;start();timers.push(setTimeout(stop,duration*1000));return stop}
 // The original game loops a decoded AudioBuffer. HTMLAudioElement.loop adds
 // decoder/seek gaps to this 0.16254-second AAC clip, making the pulses slower.
 let context;const buffers=new Map();
 function audioContext(){return context??=new (root.AudioContext||root.webkitAudioContext)()}
 async function buffer(url){if(!buffers.has(url)){const pending=fetch(url).then(r=>{if(!r.ok)throw Error('对话音未能读取');return r.arrayBuffer()}).then(bytes=>audioContext().decodeAudioData(bytes));buffers.set(url,pending);pending.catch(()=>buffers.delete(url));if(buffers.size>24)buffers.delete(buffers.keys().next().value)}return buffers.get(url)}
 class BufferedAudio extends EventTarget{
  constructor(url){super();this._src=url;this._volume=1;this._offset=0;this._token=0;this._playing=false;this.loop=false;this.readyState=0;this.error=null;this.backend='web-audio';this.duration=NaN;this.load()}
  get src(){return this._src}set src(url){this.pause();this._src=url;this._offset=0;this.readyState=0;if(url)this.load()}
  get volume(){return this._volume}set volume(value){this._volume=Math.max(0,Math.min(1,Number(value)||0));if(this._gain)this._gain.gain.setValueAtTime(this._volume,audioContext().currentTime)}
  get paused(){return !this._playing}
  get currentTime(){const time=this._offset+(this._playing?audioContext().currentTime-this._started:0);return this.loop&&this.duration?time%this.duration:Math.min(time,this.duration||Infinity)}
  set currentTime(time){if(this._playing)this.pause();this._offset=Math.max(0,Number(time)||0)}
  async play(){if(this._playing||!this.src)return;const token=++this._token,url=this.src;try{const ctx=audioContext();await ctx.resume();const data=await buffer(url);if(token!==this._token||url!==this.src)return;this.duration=data.duration;this.readyState=4;this.error=null;const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=data;source.loop=this.loop;gain.gain.value=this.volume;source.connect(gain);gain.connect(ctx.destination);this._source=source;this._gain=gain;this._started=ctx.currentTime;this._playing=true;source.onended=()=>{if(token!==this._token||this.loop)return;this._playing=false;this._offset=this.duration;source.disconnect();gain.disconnect();this._source=this._gain=null;this.onended?.();this.dispatchEvent(new Event('ended'))};source.start(0,this.loop?this._offset%data.duration:Math.min(this._offset,data.duration));this.dispatchEvent(new Event('play'))}catch(error){if(token!==this._token)return;this.error=error;this.onerror?.(error);throw error}}
  pause(){const time=this.currentTime;this._token++;this._playing=false;this._offset=time;if(this._source){this._source.onended=null;try{this._source.stop()}catch{}this._source.disconnect();this._gain.disconnect();this._source=this._gain=null}}
  removeAttribute(name){if(name==='src')this.src=''}load(){const url=this.src;if(!url)return;buffer(url).then(data=>{if(this.src===url){this.duration=data.duration;this.readyState=4;this.dispatchEvent(new Event('loadedmetadata'))}},error=>{if(this.src===url){this.error=error;this.onerror?.(error)}})}
 }
 const createAudio=url=>root.AudioContext||root.webkitAudioContext?new BufferedAudio(url):new Audio(url);
 const api={producer,validate,plan,play,createAudio,DEFAULT_URL};if(typeof module==='object')module.exports=api;else root.StoryProducerSound=api;
})(typeof window==='object'?window:globalThis);
