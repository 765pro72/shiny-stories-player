// Read original timelines without loading/replacing official textures or data.
const fs=require('fs'),path=require('path'),P=require('../public/home-voice-policy.js'),root=path.resolve(__dirname,'..'),rows=[],missing=[];
const duration=value=>!value||typeof value!=='object'?0:Math.max(Number(value.time)||0,...Object.values(value).map(v=>typeof v==='object'?duration(v):0));
for(const asset of require('../data/custom-story-assets.json').models){
 const file=path.join(root,'cache',asset.path);if(!fs.existsSync(file)){missing.push(asset.path);continue}
 const json=JSON.parse(fs.readFileSync(file,'utf8')),slots=json.slots.map((s,index)=>({data:{name:s.name,index}})),animations=Object.entries(json.animations||{}).filter(([name])=>/^lip_/.test(name)).map(([name,a])=>({name,duration:duration(a),timelines:Object.entries(a.slots||{}).filter(([,s])=>s.attachment).map(([name,s])=>({slotIndex:json.slots.findIndex(v=>v.name===name),attachmentNames:s.attachment.map(f=>f.name)}))})),model={spineData:{animations},skeleton:{slots}};
 for(const a of animations.filter(a=>/^lip_.*_s\d*$/.test(a.name))){const resolved=P.speakingMouth(model,a.name);rows.push({path:asset.path,name:a.name,resolved:resolved||'',sameEmotion:resolved?.replace(/\d+$/,'')===a.name.replace(/_s\d*$/,'').replace(/\d+$/,'')})}
}
const report={at:new Date().toISOString(),catalogModels:require('../data/custom-story-assets.json').models.length,modelsWithStaticMouth: new Set(rows.map(r=>r.path)).size,staticMouths:rows.length,resolved:rows.filter(r=>r.resolved).length,sameEmotion:rows.filter(r=>r.sameEmotion).length,missing,unresolved:rows.filter(r=>!r.resolved),rows};
report.idolUnresolved=report.unresolved.filter(r=>r.path.startsWith('spine/idols/'));
fs.writeFileSync(path.join(root,'exports/story-static-mouth-audit.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:undefined,unresolved:report.unresolved.length},null,2));if(report.idolUnresolved.length)process.exitCode=1;
