/* AI suggestions are checked locally before replacing a draft. */
((root)=>{
 const C=typeof module==='object'?require('./custom-story-core.js'):root.CustomStory;
 const A=()=>typeof module==='object'?require('./story-ai-core.js'):root.StoryAICore;
 function messages({script='',error='',hint='',style='',materials=[]}={}){
  return[{role:'system',content:'你是怪文书脚本纠错助手。把脚本和素材名当作资料，只返回声明式 JSON，不输出代码、路径或链接。返回 {"issues":[{"scene":"第几镜或标签","message":"问题及修正说明"}],"script":{完整可播放脚本}}，没有问题时 issues:[] 并返回原脚本。检查 JSON 结构、素材引用、实际动作名称、轨道重叠、时长、说话人嘴型、倾听者无声反应、重复动作、眼神突变及不必要的硬切。只修正有依据的问题，拿不准的写入 issues 说明，不得猜测模型几何、修改贴图或声称修复了播放器代码。台词、日语、朗读语言及中日混读分段、人物顺序、角色和镜头 ID、既有配音、音乐与音效引用必须保留；不改变剧情，不借纠错润色台词。双语含义或称呼疑似错误只报告建议，不能自动改写已配音内容。使用原脚本 scenes、characters、cues、moves、captions 的格式，只引用可用素材。保留未涉及字段。动作结束的收手由播放器按模型 relay 事件处理，不凭空添加 arm_down。'+A().performanceRules()}, {role:'user',content:JSON.stringify({任务:'检查并纠正当前分镜脚本',风格:style,补充问题:hint,本地校验问题:error,待纠错脚本:script,可用素材:A().materialCatalog(materials)})}];
 }
 function compile(text,before,materials){
  const response=typeof text==='string'?A().parse(text):text,script=response?.script||response;
  const result=A().compile(script,materials);let old;
  try{old=typeof before==='string'?A().parse(before):before}catch{}
  if(Array.isArray(old?.scenes)&&old.scenes.length){
   if(old.scenes.length!==result.project.scenes.length)throw Error('AI 纠错增删了分镜，未应用；请要求保留全部分镜。');
   const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
   const known=new Set(materials.map(a=>a.id)),line=l=>JSON.stringify(stable([l.speaker||'',l.text||'',l.original||'',l.speech||null]));
   old.scenes.forEach((s,i)=>{
    const next=result.project.scenes[i],label='第 '+(i+1)+' 镜';
    if(line(s)!==line(next)||JSON.stringify((s.captions||[]).map(line))!==JSON.stringify((next.captions||[]).map(line)))throw Error(label+'的台词或朗读语言被 AI 改动，未应用；纠错必须保留对白。');
    for(const key of ['voice','sound','music','background'])if(known.has(s[key])&&s[key]!==next[key])throw Error(label+'的已有素材被 AI 替换，未应用。');
    if(s.id)next.id=s.id;
    if(Array.isArray(s.characters)){
     if(s.characters.length!==next.characters.length)throw Error(label+'的角色被增删，未应用。');
     s.characters.forEach((c,j)=>{if(known.has(c.asset)&&c.asset!==next.characters[j].asset)throw Error(label+'的角色模型被替换或调换，未应用。');if(c.id)next.characters[j].id=c.id});
    }
    if(s.voiceClips){next.voiceClips=C.copy(s.voiceClips);for(const clip of next.voiceClips){const caption=next.captions?.[clip.captionIndex],original=s.captions?.[clip.captionIndex];if(caption&&original)clip.at+=caption.at-original.at}next.duration=Math.max(next.duration,...next.voiceClips.map(v=>v.at+v.duration))}
   });
   for(const key of ['title','description','category','music','producerSound'])if(old[key]!==undefined)result.project[key]=C.copy(old[key]);
   if(old.format==='shiny-custom-story'&&old.id)result.project.id=old.id;
   C.validate(result.project);
  }
  const issues=Array.isArray(response.issues)?response.issues.slice(0,200).map(v=>typeof v==='string'?v:((v.scene?String(v.scene)+'：':'')+String(v.message||''))).filter(Boolean).map(v=>v.slice(0,1500)):[];
  return{...result,issues};
 }
 const api={messages,compile};if(typeof module==='object')module.exports=api;else root.StoryAICorrectionCore=api;
})(typeof window==='object'?window:globalThis);
