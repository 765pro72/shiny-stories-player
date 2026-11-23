const fs=require('fs');
function edit(path,fn){const before=fs.readFileSync(path,'utf8'),after=fn(before);if(before===after)throw Error('No change: '+path);fs.writeFileSync(path,after)}
function replace(s,a,b){if(!s.includes(a))throw Error('Missing: '+a.slice(0,90));return s.replace(a,b)}
edit('public/custom-story-core.js',s=>{
 s=replace(s,"music:'',voice:","music:'',bgm:{mode:'inherit'},voice:");
 s=replace(s,'const scenes=new Set();','const music=typeof module===\'object\'?require(\'./story-music.js\'):root.StoryMusic;music.validate(p.music,refs);const scenes=new Set();');
 return replace(s,'validateIntervals(s.captions', 'music.validate(s.bgm,refs,true);validateIntervals(s.captions');
});
edit('public/custom-story-stage.js',s=>{
 const start=s.indexOf('   if(this.musicId!==scene.music)'),end=s.indexOf('   let voice=null;',start);
 if(start<0||end<0)throw Error('stage music');
 s=s.slice(0,start)+`   const index=this.project.scenes.indexOf(scene),plan=StoryMusic.plan(this.project,index),key=plan?.key||'';
   const sequential=this.musicSceneIndex===index-1;
   if(this.musicId!==key||!sequential){
    if(this.music){this.music.pause();this.music.src=''}this.music=null;this.musicId=key;
    const asset=this.asset(plan?.asset);if(asset){const music=this.music=new Audio(this.resolve(asset.path,asset));music.loop=plan.loop!==false;music.volume=(plan.volume??70)/100;
     music.onloadedmetadata=()=>{if(this.music!==music)return;const offset=(plan.start||0)+(plan.elapsed||0);music.currentTime=Number.isFinite(music.duration)?(music.loop?offset%music.duration:Math.min(offset,music.duration)):offset;music.play().catch(()=>{if(this.music===music)this.status('背景音乐暂未播放，请重新预览。')})};
     music.onerror=()=>{if(this.music===music)this.status('背景音乐无法播放：'+asset.name)};
    }
   }
   this.musicSceneIndex=index;if(this.music&&plan)this.music.volume=(plan.volume??70)/100;
`+s.slice(end);
 s=replace(s,"this.musicId=''}}","this.musicId='';this.musicSceneIndex=undefined}}");return s;
});
edit('public/custom-story.js',s=>{
 s=replace(s,"voiceRows=null,previewIndex={},pickerPage=0,pickerTarget=null","pickerTarget=null");
 s=replace(s,"characterFields();renderAssets()}","characterFields();renderAssets();window.dispatchEvent(new Event('story-workshop-refresh'))}");
 s=replace(s,"s.background=current().background;s.music=current().music;","s.background=current().background;");
 const start=s.indexOf(' async function picker(kind,target)'),end=s.indexOf('\n ',s.indexOf('function renderPicker()',start));
 // The old browser was a complete line; replace its three functions with the shared browser.
 const lines=s.split('\n');s=lines.filter(l=>!l.startsWith(' async function picker(')&&!l.startsWith(' function pickerRows(')&&!l.startsWith(' function renderPicker(')&&!l.startsWith(" $('#assetKind').onchange=")).join('\n');
 s=replace(s,' function applyAsset(a)',` function ensureAsset(a){let known=project.assets.find(x=>x.source===(a.source||'builtin')&&x.path===a.path);if(!known){known={...a,id:a.id||C.uid(),source:a.source||'builtin'};project.assets.push(known)}return known}
 async function picker(kind,target){pickerTarget=target||null;return StoryMaterials.open({kind,projectAssets:project.assets,resolve,onSelect:a=>applyAsset(ensureAsset(a))})}
 function applyAsset(a)`);
 s=replace(s,"Promise.all([fetch('/data/custom-story-assets.json').then(r=>r.json()),fetch('/model-previews/index.json').then(r=>r.json())]).then(([c,p])=>{catalog=c;previewIndex=p;","fetch('/data/custom-story-assets.json').then(r=>r.json()).then(c=>{catalog=c;");
 s=replace(s,'importAssets,pack,unpack,adopt,watch,','resolve,ensureAsset,picker,importAssets,pack,unpack,adopt,watch,');return s;
});
edit('public/custom-story.html',s=>{
 s=s.replace(/<dialog id="assetPicker">.*?<\/dialog>\r?\n/,'');
 s=replace(s,'<link rel="stylesheet" href="story-ai.css">','<link rel="stylesheet" href="story-ai.css"><link rel="stylesheet" href="story-materials.css">');
 s=replace(s,'<script src="custom-story-core.js">','<script src="story-music.js"></script><script src="portraits.js"></script><script src="story-materials.js"></script><script src="custom-story-core.js">');
 return replace(s,'<script src="creation-preferences.js"></script>','<script src="creation-preferences.js"></script><script src="story-music-editor.js"></script>');
});
for(const file of ['public/creation-preferences.js','desktop.cjs'])edit(file,s=>replace(s,"'story-voice-profiles'","'story-voice-profiles','story-material-moods'"));
