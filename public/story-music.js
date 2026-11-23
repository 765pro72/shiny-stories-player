/* Music is a project soundtrack with explicit scene changes, never an implicit reset. */
((root)=>{
 function plan(project,index){
  const global=project.music?.asset&&project.music.enabled!==false?{...project.music,key:project.id+':global',elapsed:0}:null;
  let active=global;
  for(let i=0;i<=index;i++){
   const s=project.scenes[i],b=s.bgm;
   if(b?.mode==='stop')active=null;
   else if(b?.mode==='global')active=global?{...global,elapsed:active?.key===global.key?active.elapsed:0}:null;
   else if(b?.mode==='switch')active=b.asset?{...b,key:project.id+':'+s.id,elapsed:0}:null;
   else if(!b&&!(global&&!s.music)){ // With a default enabled, empty legacy fields inherit it too.
    if(!s.music)active=null;
    else if(active?.asset!==s.music)active={asset:s.music,start:0,volume:s.volume??70,loop:true,key:project.id+':legacy:'+s.id,elapsed:0};
   }
   if(i<index&&active)active={...active,elapsed:active.elapsed+s.duration};
  }
  return active;
 }
 function validate(config,refs,scene=false){
  if(config===undefined)return;
  if(!config||typeof config!=='object'||scene&&!['inherit','global','switch','stop'].includes(config.mode))throw Error('BGM 设置无效');
  if(!scene||config.mode==='switch')refs(config.asset,['audio']);
  for(const key of ['start','volume'])if(config[key]!==undefined&&(!Number.isFinite(config[key])||config[key]<0||config[key]>(key==='volume'?100:86400)))throw Error('BGM 起播时间或音量无效');
  if(config.loop!==undefined&&typeof config.loop!=='boolean'||config.enabled!==undefined&&typeof config.enabled!=='boolean')throw Error('BGM 开关无效');
 }
 const api={plan,validate};if(typeof module==='object')module.exports=api;else root.StoryMusic=api;
})(typeof window==='object'?window:globalThis);
