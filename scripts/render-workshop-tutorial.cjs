const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawn,spawnSync}=require('node:child_process'),{once}=require('node:events'),electron=require('electron');
if(!electron.app){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;process.exit(require('node:child_process').spawnSync(electron,[__filename],{env,stdio:'inherit'}).status??1)}
const {app,BrowserWindow}=electron,root=path.resolve(__dirname,'..'),outDir=path.join(root,'exports'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sc-workshop-tutorial-')),video=path.join(outDir,'怪文书-全功能教学.mp4'),projectOut=path.join(outDir,'怪文书-教学示例.gwa');app.setPath('userData',path.join(tmp,'profile'));let win,service;
const chapters=[
['认识工作区','顶部先填写作品名和简介；中间舞台显示当前分镜，左侧管理分镜，右侧编辑内容，底部素材箱集中显示本作品用到的资源。','全功能教学｜先认识三个区域：分镜、舞台、属性'],
['作品与离线素材','点击新建开始一篇作品。作品名称和简介会显示在作品库里。勾选打包素材，保存或导出时就会把用到的图片、模型和声音一起装进工程，便于离线分享。','作品设置｜命名、简介、打包素材'],
['新建与管理分镜','左边加号新增分镜；复制会连同当前角色和背景一起复制。拖动分镜可排序，也能用上移、下移和删除整理故事。至少保留一个分镜。','分镜管理｜新增、复制、拖动排序、上移下移、删除'],
['写台词与时长','选中分镜后，在右侧填写标题、说话人和台词，并设置停留秒数。自动播放时会按这个时长切到下一镜；如果配了语音，会等语音播完再继续。','分镜内容｜标题、说话人、台词、停留时间'],
['按时间切换字幕','同一个镜头可添加多段定时字幕。分别设置开始秒、持续秒、说话人和文本；字幕会在设定时刻切换，没有字幕覆盖的时间会显示默认台词。','镜头内字幕｜一镜多句，逐段定时'],
['选择背景','点背景下拉框或选择背景按钮打开内置素材库。可按名字或编号搜索、翻页，选中后立即应用到当前分镜。背景也能从本地导入。','背景素材｜内置搜索、翻页或导入图片'],
['添加官方角色模型','点角色与立绘旁边的添加按钮，从角色模型库搜索角色或服装。每镜最多八位角色；也可导入自己的 Spine 模型。导入模型时要同时选中 JSON、ATLAS 和 atlas 引用的全部贴图。','角色素材｜内置模型，或导入 JSON＋ATLAS＋贴图'],
['导入图片、声音和模型','素材箱的导入素材支持 PNG、JPG、WebP、MP3、WAV、M4A、OGG，以及完整 Spine 模型文件。一次导入总量不超过二百五十六 MB；素材会跟工程一起保存。','导入素材｜图片、音频、Spine 模型；单次上限 256 MB'],
['导入字幕文件','导入字幕可选 SRT、VTT 或 TXT。SRT 和 VTT 按时间码生成分镜；TXT 则每行生成一句、每句默认四秒。生成后可逐镜补背景、角色和配音。','字幕导入｜SRT／VTT 按时间码，TXT 每行一句'],
['摆放多个角色','选中角色后可在舞台上直接拖动，也可以编辑横坐标和脚底位置。调大小设置缩放百分比，左右翻转适合调整角色朝向；下拉框用于切换当前正在编辑的角色。','角色布局｜拖拽、坐标、大小、翻转；每镜最多 8 位'],
['预览待机与动作','动作表情下拉框按身体动作、表情、视线、手臂动作和嘴型分类。选择后马上预览；默认待机留空即可。模型没有某类动作时，该类时间轴不会提供选项。','动作库｜身体、表情、视线、手臂、嘴型'],
['持续说话嘴型','勾选持续说话嘴型，角色在整个分镜里循环开合嘴巴，可与身体动作同时播放。它不依赖配音；静态图片或模型本身没有嘴型动画时无法生效。','持续说话｜整镜头循环嘴型，可叠加身体动作'],
['独立演出时间轴','时间轴可以分别添加身体动作、表情、视线和说话嘴型。每段设开始时间和持续时间，再选动作、是否循环。不同轨道可以同时演出；同一轨道的指令不要互相重叠。','四条演出轨｜身体、表情、视线、嘴型独立编排'],
['开口和闭嘴时间','在嘴型轨选择开始说话或停止说话，就能安排角色在哪些秒数开口、在哪些时间闭嘴。拖动时间条逐秒检查，也可以点预览本镜头演出来播放整段。','嘴型轨｜分时开口与闭嘴；时间条逐帧检查'],
['让角色在镜头内移动','点添加移动，设置开始秒、移动用时和目标坐标；可以连续添加多段移动。轨迹会平滑过渡。舞台拖动调整起点，之后的目标位置仍按各段移动设置执行。','移动轨｜多段目标位置，平滑过渡，不切镜头'],
['背景音乐、配音与音效','每个分镜可以选背景音乐、本句配音和本句音效，并单独调节音量。相同背景音乐会跨分镜接着播放；配音和音效在每句开始时重播。声音也可从内置库搜索或本地导入。','声音｜背景音乐、配音、音效、分镜音量'],
['预览、播放与全屏','从头观看会从第一镜播放；从此处观看从当前分镜开始。上一句、下一句可手动切镜，自动播放控制是否自动前进，返回编辑退出播放，全屏让舞台铺满屏幕。','播放控制｜从头、从此处、自动播放、手动切镜、全屏'],
['保存作品与我的作品','保存作品会把工程存到本机作品库；以后点我的作品，可以继续编辑或直接观看。保存状态和工程统计会显示在页面上。修改后记得再次保存。','本地作品库｜保存后可续编或观看'],
['导出与导入工程','导出工程生成 GWA 文件。另一台电脑打开怪文书，点导入工程选择 GWA，就能继续编辑。要离线观看或分享，导出前保持打包素材勾选；导入工程大小上限二百五十六 MB。','分享工程｜导出 .gwa → 导入工程；可打包离线素材'],
['看完整作品','最后检查分镜顺序、角色位置、字幕和声音，再从头播放一遍。常用操作是先摆好舞台，再按秒安排移动、动作、嘴型和字幕，最后保存或导出。','完成流程｜搭场景 → 编排时间轴 → 预览 → 保存分享']
];
const sleep=n=>new Promise(r=>setTimeout(r,n));
app.whenReady().then(async()=>{try{
 service=await require('../server.cjs').start(path.join(root,'cache'),0,()=>path.join(root,'data'),{customStoryRoot:path.join(tmp,'stories')});win=new BrowserWindow({show:false,width:1920,height:1080,useContentSize:true,webPreferences:{backgroundThrottling:false}});win.webContents.setAudioMuted(true);const js=s=>win.webContents.executeJavaScript(s);await win.loadURL(service.url+'/custom-story.html');
 await js(`(async()=>{const C=CustomStory,p=C.project(),s=p.scenes[0];p.title='怪文书教学示例：事务所的一天';p.description='包含场景、字幕、角色移动、动作表情嘴型、音乐和配音轨道，可作为练习工程。';p.assets=[{id:'bg',kind:'background',source:'builtin',name:'事务所',path:'images/event/bg/00001.jpg'},{id:'actor',kind:'model',source:'builtin',name:'樱木真乃 · 日常服装',path:'spine/idols/stand/1040010010/data.json'},{id:'music',kind:'audio',source:'builtin',name:'背景音乐示例',path:'sounds/bgm/000.m4a'}];s.label='第一幕：相遇';s.duration=12;s.background='bg';s.music='music';s.volume=55;s.speaker='制作人';s.text='今天想从哪里开始呢？';const c={id:C.uid(),asset:'actor',x:568,y:640,scale:1,flip:false,animation:'wait1',talking:false,moves:[{at:2,duration:2,x:760,y:640},{at:7,duration:2,x:430,y:640}],cues:[]};const cue=(channel,at,duration,animation='',enabled=true,loop=true)=>c.cues.push({channel,at,duration,animation,enabled,loop});cue('body',0,4,'hello',true,false);cue('body',4,4,'think',true,false);cue('body',8,4,'smile1',true,false);cue('face',0,4,'face_smile');cue('face',4,4,'face_shy');cue('face',8,4,'face_smile');cue('eyes',2,3,'eye_right');cue('eyes',7,3,'eye_front');cue('mouth',0,3,'',true);cue('mouth',3,2,'',false);cue('mouth',5,4,'',true);cue('mouth',9,1,'',false);s.characters=[c];s.captions=[{at:0,duration:3,speaker:'制作人',text:'今天想从哪里开始呢？'},{at:3,duration:3,speaker:'樱木真乃',text:'就从这里开始吧。'},{at:6,duration:3,speaker:'制作人',text:'那我们慢慢来。'},{at:9,duration:3,speaker:'樱木真乃',text:'嗯，一起加油！'}];const s2=C.copy(s);s2.id=C.uid();s2.label='第二幕：继续前行';s2.text='下一幕也由你来写。';p.scenes.push(s2);C.validate(p);await StoryWorkshop.adopt({project:p,files:new Map()});const t=Date.now();while(!StoryWorkshop.stage.nodes.length){if(Date.now()-t>25000)throw Error('教学示例角色模型载入失败');await new Promise(r=>setTimeout(r,50))}document.querySelector('#autoPlay').checked=false;})()`);
 const voiceDir=path.join(tmp,'voice'),framesDir=path.join(tmp,'frames'),clipsDir=path.join(tmp,'clips');for(const d of [voiceDir,framesDir,clipsDir])fs.mkdirSync(d,{recursive:true});
 // Create a clean instructional overlay in the actual editor window.
 await js(`(()=>{const s=document.createElement('style');s.textContent='.tutorial-overlay{position:fixed;z-index:99999;left:30px;bottom:26px;width:490px;box-sizing:border-box;padding:17px 23px 19px;border:1px solid #ffffffd9;border-radius:22px;background:linear-gradient(110deg,#f7fbf9f5,#eaf3f3f2 65%,#f8edf2f2);box-shadow:0 12px 45px #11283b55;color:#263f54;font-family:Microsoft YaHei,sans-serif;pointer-events:none}.tutorial-overlay .eyebrow{font-size:12px;letter-spacing:2px;color:#c15e87;font-weight:700}.tutorial-overlay h2{margin:4px 0 7px;font-size:24px}.tutorial-overlay p{margin:0;font-size:17px;line-height:1.45}.tutorial-overlay .count{position:absolute;right:20px;top:16px;color:#7a91a2;font-size:14px}';document.head.append(s);const d=document.createElement('section');d.className='tutorial-overlay';d.innerHTML='<small class="eyebrow">283 PRODUCTION / WORKSHOP TUTORIAL</small><span class="count"></span><h2></h2><p></p>';document.body.append(d);window.tutorialCard=(i,title,desc)=>{d.querySelector('.count').textContent=String(i+1).padStart(2,'0')+' / ${chapters.length}';d.querySelector('h2').textContent=title;d.querySelector('p').textContent=desc};})()`);
 // Dedicated narration tracks, spoken by the installed Mandarin Huihui voice.
 const narration=chapters.map(c=>({title:c[0],text:c[1]}));const jsonFile=path.join(tmp,'narration.json'),psFile=path.join(tmp,'narrate.ps1');fs.writeFileSync(jsonFile,JSON.stringify(narration),'utf8');fs.writeFileSync(psFile,`Add-Type -AssemblyName System.Speech\n$items = Get-Content -Raw -Encoding UTF8 $args[0] | ConvertFrom-Json\n$s = New-Object System.Speech.Synthesis.SpeechSynthesizer\n$s.SelectVoice('Microsoft Huihui Desktop')\n$s.Rate = 0\n$i=0\nforeach ($item in $items) { $file = Join-Path $args[1] ('voice-{0:D2}.wav' -f $i); $s.SetOutputToWaveFile($file); $s.Speak($item.text); $s.SetOutputToNull(); $i++ }\n$s.Dispose()\n`,'utf8');const spoken=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',psFile,jsonFile,voiceDir],{encoding:'utf8',windowsHide:true});if(spoken.status!==0)throw Error('中文讲解音频生成失败：'+spoken.stderr);
 const capture=async()=>{await js('StoryWorkshop.stage.app.renderer.render(StoryWorkshop.stage.app.stage)');await js('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');return(await win.webContents.capturePage()).toPNG()};
 const setShot=async(i,scroll,action)=>{await js('StoryWorkshop.stop();document.body.classList.remove("story-watching")');await js(`(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());document.body.append(document.querySelector('.tutorial-overlay'));document.querySelector('.writer-page').scrollTop=0;document.querySelector('.scene-properties').scrollTop=0;window.tutorialCard(${i},${JSON.stringify(chapters[i][0])},${JSON.stringify(chapters[i][2])});${scroll||''}})()`);if(action)await js(action);await js(`(()=>{const card=document.querySelector('.tutorial-overlay'),modal=document.querySelector('dialog[open]');(modal||document.body).append(card)})()`);await sleep(900);await capture();await sleep(150);fs.writeFileSync(path.join(framesDir,`frame-${String(i).padStart(2,'0')}.png`),await capture());};
 // Arrange exact editor states for each lesson.
 const selectScene=`StoryWorkshop.select(0);`;
 await setShot(0,'');
 await setShot(1,'document.querySelector(".project-bar").scrollIntoView({block:"center"});',`document.querySelector('#projectTitle').value='怪文书教学示例：事务所的一天';document.querySelector('#projectTitle').dispatchEvent(new Event('input'));document.querySelector('#projectDescription').value='练习场景、动作、移动、字幕与声音';document.querySelector('#projectDescription').dispatchEvent(new Event('input'));`);
 await setShot(2,'document.querySelector(".scene-rail").scrollIntoView({block:"center"});',`document.querySelector('#sceneList').scrollTop=0;`);
 await setShot(3,'document.querySelector("#dialogue").scrollIntoView({block:"center"});');
 await setShot(4,'document.querySelector("#sceneCaptions").scrollIntoView({block:"center"});');
 await setShot(5,'document.querySelector("#background").scrollIntoView({block:"center"});',`document.querySelector('[data-pick="background"]').click();`);
 await setShot(6,'document.querySelector("#characterSelect").scrollIntoView({block:"center"});',`document.querySelector('#storyMaterialBrowser').close();document.querySelector('#addCharacter').click();`);
 await setShot(7,'document.querySelector("#projectAssets").scrollIntoView({block:"center"});');
 await setShot(8,'document.querySelector("#importSubtitles").scrollIntoView({block:"center"});');
 await setShot(9,'document.querySelector("#characterFields").scrollIntoView({block:"center"});');
 await setShot(10,'document.querySelector("#characterAnimation").scrollIntoView({block:"center"});');
 await setShot(11,'document.querySelector("#characterTalking").scrollIntoView({block:"center"});');
 await setShot(12,'document.querySelector("#cueChannel").scrollIntoView({block:"center"});');
 await setShot(13,'document.querySelector("#characterCues").scrollIntoView({block:"center"});');
 await setShot(14,'document.querySelector("#characterMoves").scrollIntoView({block:"center"});');
 await setShot(15,'document.querySelector("#music").scrollIntoView({block:"center"});');
 await setShot(16,'document.querySelector(".playback-bar").scrollIntoView({block:"center"});');
 await setShot(17,'document.querySelector(".writer-actions").scrollIntoView({block:"center"});');
 await setShot(18,'document.querySelector(".writer-actions").scrollIntoView({block:"center"});');
 await setShot(19,'',`(async()=>{StoryWorkshop.watch(0);await new Promise(r=>setTimeout(r,350))})()`);
 // Bundle the example project with the same media used in the lesson.
 const packed=await js('(async()=>{StoryWorkshop.stop();StoryWorkshop.select(0);return Array.from(await StoryWorkshop.pack(true))})()');fs.writeFileSync(projectOut,Buffer.from(packed));
 // Encode each lesson as a narrated, captioned hold on a real application screen.
 const clipPaths=[];for(let i=0;i<chapters.length;i++){
   const frame=path.join(framesDir,`frame-${String(i).padStart(2,'0')}.png`),wav=path.join(voiceDir,`voice-${String(i).padStart(2,'0')}.wav`),clip=path.join(clipsDir,`clip-${String(i).padStart(2,'0')}.mp4`);
   const p=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-loop','1','-framerate','24','-i',frame,'-i',wav,'-vf','scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p','-c:v','libx264','-preset','veryfast','-crf','22','-tune','stillimage','-c:a','aac','-b:a','112k','-af','apad=pad_dur=1','-shortest',clip],{encoding:'utf8',windowsHide:true});if(p.status!==0)throw Error('视频章节编码失败 '+i+': '+p.stderr);clipPaths.push(clip);console.log('教学章节完成 '+(i+1)+' / '+chapters.length+'：'+chapters[i][0]);
 }
 const listFile=path.join(tmp,'clips.txt');fs.writeFileSync(listFile,clipPaths.map(p=>`file '${p.replace(/\\/g,'/')}'`).join('\n'),'utf8');const joined=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',listFile,'-c','copy','-movflags','+faststart',video],{encoding:'utf8',windowsHide:true});if(joined.status!==0)throw Error('合并视频失败：'+joined.stderr);
 fs.writeFileSync(path.join(outDir,'怪文书-全功能教学-目录.json'),JSON.stringify(chapters.map((c,i)=>({chapter:i+1,title:c[0],screenCaption:c[2]})),null,2),'utf8');console.log(video);console.log(projectOut);
 }catch(e){console.error(e);process.exitCode=1}finally{win?.destroy();service?.server.close();app.exit(process.exitCode||0)}});

