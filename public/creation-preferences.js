// Electron serves each launch on a different port. Keep non-secret creative settings
// in desktop state as well as origin storage; API keys remain in the tool's memory.
(()=>{
 const allowed=['story-ai-connections','story-ai-draft','story-voice-settings','story-voice-profiles','story-material-moods','story-material-notes'],pending=new Map(),timers=new Map();
 const saved=window.desktop?.getState();for(const key of allowed)if(typeof saved?.[key]==='string')try{localStorage.setItem(key,saved[key])}catch{}
 function flush(key){const value=pending.get(key);if(value===undefined)return;pending.delete(key);clearTimeout(timers.get(key));timers.delete(key);window.desktop?.saveState({[key]:value})}
 function write(key,value){if(!allowed.includes(key))throw Error('未知的创作设置');localStorage.setItem(key,value);pending.set(key,value);clearTimeout(timers.get(key));timers.set(key,setTimeout(()=>flush(key),500))}
 function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
 window.addEventListener('pagehide',()=>{for(const key of pending.keys())flush(key)});window.CreativePreferences={read,write,flush(){for(const key of pending.keys())flush(key)}};
})();
