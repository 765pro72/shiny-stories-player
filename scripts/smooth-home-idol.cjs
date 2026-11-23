const fs=require('fs');let s=fs.readFileSync('public/home-idol.js','utf8');const begin=s.indexOf(' function anim('),end=s.indexOf(' async function setOutfit',begin);s=s.slice(0,begin)+` function anim(name,track,loop=true){
  if(!model||!name||!model.spineData.animations.some(a=>a.name===name))return false;
  const before=model.state.getCurrent(track);if(before?.animation.name===name)return true;
  const events=before?.animation.timelines.flatMap(t=>t.events||[])||[];
  const relay=events.find(e=>e.data.name==='relay')?.stringValue;
  if(relay&&model.spineData.animations.some(a=>a.name===relay)){model.state.setAnimation(track,relay,false);model.state.addAnimation(track,name,loop,0)}else model.state.setAnimation(track,name,loop);
  return true;
 }
 function idle(){if(!model)return;const names=model.spineData.animations.map(a=>a.name),name=names.includes('wait1')?'wait1':names.find(n=>n.startsWith('wait'));anim(name,0);anim('blank',1);for(let track=2;track<model.state.tracks.length;track++){const current=model.state.getCurrent(track);if(current&&current.animation.name!=='<empty>')model.state.setEmptyAnimation(track,.3)}}
 function stop(resetPose=true){window.dispatchEvent(new CustomEvent('home-voice',{detail:false}));voiceSerial++;if(audio){audio.pause();audio.src='';audio=null}if(resetPose)idle();$('#voiceStatus').textContent='点击偶像，听主页原声'}
`+s.slice(end);s=s.replace('next.position.set(600,640);','next.stateData.defaultMix=.3;next.position.set(600,640);');s=s.replace("if(!model||$('#idolTouch').disabled)return;stop();","if(!model||$('#idolTouch').disabled)return;stop(false);");s=s.replace("if(serial===voiceSerial){idle();$('#voiceStatus').textContent='语音未能播放", "if(serial===voiceSerial){window.dispatchEvent(new CustomEvent('home-voice',{detail:false}));idle();$('#voiceStatus').textContent='语音未能播放");fs.writeFileSync('public/home-idol.js',s);
