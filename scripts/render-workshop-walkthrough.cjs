const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, spawnSync } = require('node:child_process');
const electron = require('electron');

if (!electron.app) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = require('node:child_process').spawnSync(electron, [__filename], { env, stdio: 'inherit' });
  process.exit(child.status ?? 1);
}

const { app, BrowserWindow } = electron;
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'exports');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-workshop-walkthrough-'));
const framesDir = path.join(tmp, 'frames');
const silentVideo = path.join(tmp, 'walkthrough-silent.mp4');
const video = path.join(outDir, '怪文书-全功能教学.mp4');
const projectOut = path.join(outDir, '怪文书-教学示例.gwa');
const fps = 30;
const chapters = [
  ['怪文书：从空白到成片', '不讲空话，直接跟着鼠标做一遍。', '怪文书实操教学 · 无旁白，大字幕＋背景音乐'],
  ['新建作品', '先点“新建”，给作品命名、写简介，并保留素材打包，稍后导出就能离线打开。', '第 1 步｜新建作品，填写标题与简介'],
  ['分镜管理', '用新增和复制快速铺开分镜；再上移、下移调整顺序，需要时删除多余镜头。', '第 2 步｜新增、复制、排序、删除分镜'],
  ['写台词和字幕', '当前镜头填写说话人、台词和停留时间；再加一段定时字幕，让一句话在镜头中按秒出现。', '第 3 步｜填写台词与停留时间，添加定时字幕'],
  ['选背景', '打开内置背景库，搜索编号并点选，舞台会立刻换成选中的场景。', '第 4 步｜内置素材库：搜索并应用背景'],
  ['放入偶像', '搜索角色或服装，点选模型加入舞台；再加一位角色，编辑器会为两位角色分别保留位置和动作。', '第 5 步｜搜索模型并加入角色'],
  ['调整角色位置和大小', '选择要编辑的角色，修改横向位置、脚底高度和大小；大小按角色分别保存，不会改变其他人物。也可以翻转朝向。', '第 6 步｜把右侧角色调到 85%，再切回左侧保持 100%'],
  ['动作、表情和说话嘴型', '先选默认动作，再打开持续说话嘴型；它和身体动作分开控制。', '第 7 步｜默认动作＋持续说话嘴型'],
  ['独立演出轨道', '身体动作、表情、视线、嘴型各有一条轨道。逐条添加演出并设置时间；嘴型轨可定时开口和闭嘴。', '第 8 步｜身体／表情／视线／嘴型分轨编排'],
  ['角色在镜头内移动', '添加移动段，输入开始秒、移动时长和目标坐标；多个目标位置会平滑衔接。随后播放本镜头检查结果。', '第 9 步｜添加移动段并预览整镜演出'],
  ['导入自己的素材', '点“导入素材”，把本地图片、音频，或完整的 Spine JSON、ATLAS 与贴图一起加入工程。', '第 10 步｜导入图片、音频或完整 Spine 模型'],
  ['使用导入素材与声音', '把导入图片设为背景，将导入模型加到舞台；选择背景音乐、配音和音效，并调节本镜音量。', '第 11 步｜应用导入素材，设置音乐／配音／音效'],
  ['导入字幕文件', '选择 SRT 文件，字幕时间会转成对应分镜和停留时长，之后仍可逐镜修改。', '第 12 步｜导入 SRT，自动生成分镜'],
  ['预览与播放控制', '从头或从当前镜头播放；用上一句、下一句手动检查，也可以打开自动播放，最后返回编辑。', '第 13 步｜从头播放、切镜、自动播放、返回编辑'],
  ['保存到作品库', '点击保存，作品进入本机“我的作品”；打开作品库，可以继续编辑或直接观看。', '第 14 步｜保存并从“我的作品”重新打开'],
  ['导出并重新导入', '导出 .gwa 工程；再通过“导入工程”打开刚才的文件，验证分享和迁移流程。', '第 15 步｜导出 .gwa，再导入验证'],
  ['完成', '检查分镜、素材、字幕和时间轴，预览满意后保存或分享。你的下一篇故事，也可以从这里开始。', '搭舞台 → 编演出 → 预览 → 保存／分享'],
];

let win, service;
let exportDownload = null;
const timeline = [];
let pointer = { x: 120, y: 130 };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function framePath() {
  return path.join(framesDir, 'frame-' + String(timeline.length).padStart(6, '0') + '.png');
}

async function capture(duration = 0.1) {
  await win.webContents.executeJavaScript('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
  const file = framePath();
  fs.writeFileSync(file, (await win.webContents.capturePage()).toPNG());
  timeline.push({ file, duration });
}

async function hold(seconds) {
  await capture(seconds);
}

async function setCard(index, title, text) {
  console.log('章节：' + title);
  await win.webContents.executeJavaScript(
    'window.tutorialCard(' + JSON.stringify(index) + ',' + JSON.stringify(title) + ',' + JSON.stringify(text) + ')'
  );
  await hold(index === 0 || index === chapters.length - 1 ? 3.1 : 2.4);
}

async function scrollTo(selector) {
  await win.webContents.executeJavaScript(
    '(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');if(!e)throw Error("找不到界面控件："+' +
      JSON.stringify(selector) + ');e.scrollIntoView({block:"center",inline:"nearest",behavior:"instant"});return true})()'
  );
  await sleep(100);
}

async function movePointer(selector) {
  const point = await win.webContents.executeJavaScript(
    '(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');if(!e)throw Error("找不到界面控件："+' +
      JSON.stringify(selector) + ');const r=e.getBoundingClientRect();return{x:Math.max(18,Math.min(innerWidth-18,r.left+r.width/2)),y:Math.max(18,Math.min(innerHeight-18,r.top+r.height/2))}})()'
  );
  const start = pointer;
  const steps = 4;
  for (let i = 1; i <= steps; i++) {
    const p = { x: start.x + (point.x - start.x) * i / steps, y: start.y + (point.y - start.y) * i / steps };
    await win.webContents.executeJavaScript('window.moveTutorialPointer(' + Math.round(p.x) + ',' + Math.round(p.y) + ',false)');
    pointer = p;
    await capture(0.075);
  }
}

async function click(selector, afterMs = 360) {
  await scrollTo(selector);
  await movePointer(selector);
  await win.webContents.executeJavaScript('window.moveTutorialPointer(' + Math.round(pointer.x) + ',' + Math.round(pointer.y) + ',true)');
  await capture(0.11);
  await win.webContents.executeJavaScript(
    '(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');if(!e)throw Error("找不到界面控件："+' +
      JSON.stringify(selector) + ');e.click()})()'
  );
  await win.webContents.executeJavaScript('window.syncTutorialLayer()');
  await capture(0.12);
  if (afterMs) await hold(afterMs / 1000);
}

async function setValue(selector, value, type = 'input') {
  await scrollTo(selector);
  await movePointer(selector);
  await win.webContents.executeJavaScript(
    '(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');e.focus();e.value=' +
      JSON.stringify(String(value)) + ';e.dispatchEvent(new Event(' + JSON.stringify(type) + ',{bubbles:true}));' +
      (type === 'input' ? '' : 'e.dispatchEvent(new Event("input",{bubbles:true}));') + '})()'
  );
  await capture(0.18);
}

async function setChecked(selector, checked) {
  await scrollTo(selector);
  await movePointer(selector);
  await win.webContents.executeJavaScript(
    '(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');e.checked=' + Boolean(checked) +
      ';e.dispatchEvent(new Event("change",{bubbles:true}))})()'
  );
  await capture(0.2);
}

async function typeText(selector, value) {
  await scrollTo(selector);
  await movePointer(selector);
  await win.webContents.executeJavaScript(
    '(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');e.focus();e.value="";e.dispatchEvent(new Event("input",{bubbles:true}))})()'
  );
  const text = String(value);
  const step = Math.max(1, Math.ceil(text.length / 7));
  for (let i = step; i <= text.length; i += step) {
    await win.webContents.executeJavaScript(
      '(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');e.value=' +
        JSON.stringify(text.slice(0, i)) + ';e.dispatchEvent(new Event("input",{bubbles:true}))})()'
    );
    await capture(0.09);
  }
  if (!text.length || text.length % step) {
    await win.webContents.executeJavaScript(
      '(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');e.value=' +
        JSON.stringify(text) + ';e.dispatchEvent(new Event("input",{bubbles:true}))})()'
    );
    await capture(0.09);
  }
}

async function choose(selector, value) {
  await scrollTo(selector);
  await movePointer(selector);
  await win.webContents.executeJavaScript(
    '(()=>{const e=document.querySelector(' + JSON.stringify(selector) + ');e.focus();e.value=' +
      JSON.stringify(value) + ';e.dispatchEvent(new Event("change",{bubbles:true}))})()'
  );
  await capture(0.22);
}

async function waitFor(check, label, timeout = 25000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await win.webContents.executeJavaScript('(' + check + ')()')) return;
    await sleep(100);
  }
  throw new Error('等待超时：' + label);
}

function base64(file) {
  return fs.readFileSync(file).toString('base64');
}

async function injectFiles(inputSelector, files) {
  const encoded = files.map(f => ({ name: f.name, type: f.type, data: base64(f.path) }));
  await win.webContents.executeJavaScript(
    '(()=>{const dt=new DataTransfer();for(const f of ' + JSON.stringify(encoded) +
      '){const binary=atob(f.data),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);' +
      'dt.items.add(new File([bytes],f.name,{type:f.type}))}const input=document.querySelector(' +
      JSON.stringify(inputSelector) + ');input.files=dt.files;input.dispatchEvent(new Event("change",{bubbles:true}))})()'
  );
}

async function searchPicker(query) {
  await typeText('#materialSearch', query);
  await sleep(250);
  if (!(await win.webContents.executeJavaScript('document.querySelector(".material-card .material-select")'))) {
    throw new Error('素材搜索无结果：' + query);
  }
  await click('.material-card .material-select');
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });
  app.setPath('userData', path.join(tmp, 'profile'));
  fs.mkdirSync(path.join(tmp, 'downloads'), { recursive: true });
  app.setPath('downloads', path.join(tmp, 'downloads'));
  service = await require('../server.cjs').start(
    path.join(root, 'cache'),
    0,
    () => path.join(root, 'data'),
    { customStoryRoot: path.join(tmp, 'stories') }
  );
  win = new BrowserWindow({
    show: false,
    width: 1920,
    height: 1080,
    useContentSize: true,
    webPreferences: { backgroundThrottling: false },
  });
  win.webContents.setAudioMuted(true);
  win.webContents.session.on('will-download', (event, item) => {
    if (item.getFilename().toLowerCase().endsWith('.gwa')) {
      item.setSavePath(projectOut);
      exportDownload = new Promise(resolve => item.once('done', (_event, state) => resolve(state === 'completed')));
    }
  });
  await win.loadURL(service.url + '/custom-story.html');
  await waitFor('()=>!!window.StoryWorkshop&&!!window.StoryMaterials', '怪文书工作区');
  await waitFor('()=>document.querySelector("#writerStatus").textContent.includes("内置目录就绪")', '内置素材目录');

  await win.webContents.executeJavaScript(
    '(()=>{const style=document.createElement("style");style.textContent=' + JSON.stringify(
      '.tutorial-overlay{position:fixed;z-index:99999;left:32px;bottom:26px;width:min(760px,52vw);max-height:42vh;overflow:hidden;box-sizing:border-box;padding:25px 32px 27px;border:1px solid #ffffffed;border-radius:25px;background:linear-gradient(115deg,#f8fbf8f7,#eaf3f3f5 62%,#faedf3f5);box-shadow:0 14px 48px #172d4050;color:#263f54;font-family:"Microsoft YaHei",sans-serif;pointer-events:none}.tutorial-overlay.in-modal{position:absolute;left:20px;bottom:18px}.tutorial-overlay .eyebrow{font-size:16px;letter-spacing:2.5px;color:#ba5e86;font-weight:800}.tutorial-overlay h2{margin:9px 0 10px;font-size:40px;line-height:1.2}.tutorial-overlay p{margin:0;font-size:30px;line-height:1.45}.tutorial-overlay .count{position:absolute;right:26px;top:22px;color:#8095a2;font-size:18px;font-weight:700}.tutorial-pointer{position:fixed;z-index:100001;left:120px;top:130px;width:32px;height:32px;border:3px solid white;border-radius:50%;background:#cf638e;box-shadow:0 2px 8px #14273588,0 0 0 2px #cf638e;pointer-events:none;transform:translate(-4px,-4px);transition:left .06s linear,top .06s linear}.tutorial-pointer.in-modal{position:absolute}.tutorial-pointer.clicking{background:#f0a04b;box-shadow:0 0 0 12px #f0a04b54,0 2px 8px #14273588,0 0 0 2px #f0a04b}'
    ) + ';document.head.append(style);const card=document.createElement("section");card.className="tutorial-overlay";card.innerHTML=' +
    JSON.stringify('<small class="eyebrow">283 PRODUCTION / 实操教学</small><span class="count"></span><h2></h2><p></p>') +
    ';document.body.append(card);const pointer=document.createElement("div");pointer.className="tutorial-pointer";document.body.append(pointer);' +
    'window.syncTutorialLayer=()=>{const modal=document.querySelector("dialog[open]");(modal||document.body).append(card,pointer);' +
    'card.classList.toggle("in-modal",!!modal);pointer.classList.toggle("in-modal",!!modal)};' +
    'window.tutorialCard=(i,title,text)=>{window.syncTutorialLayer();card.querySelector(".count").textContent=String(i+1).padStart(2,"0")+" / ' + chapters.length +
    '";card.querySelector("h2").textContent=title;card.querySelector("p").textContent=text};' +
    'window.moveTutorialPointer=(x,y,down)=>{const modal=document.querySelector("dialog[open]"),r=modal&&modal.getBoundingClientRect();' +
    'pointer.style.left=(modal?x-r.left:x)+"px";pointer.style.top=(modal?y-r.top:y)+"px";pointer.classList.toggle("clicking",!!down);' +
    'if(down)setTimeout(()=>pointer.classList.remove("clicking"),260)};document.body.append(card)})()'
  );

  await setCard(0, chapters[0][0], chapters[0][2]);
  await setCard(1, chapters[1][0], chapters[1][2]);
  await click('#newProject');
  await typeText('#projectTitle', '怪文书-教学示例');
  await typeText('#projectDescription', '事务所的一天：练习背景、角色、动作、字幕和声音编排。');
  if (!(await win.webContents.executeJavaScript('document.querySelector("#bundleAssets").checked'))) {
    await click('#bundleAssets');
  }

  await setCard(2, chapters[2][0], chapters[2][2]);
  await click('#addScene');
  await click('#duplicateScene');
  await click('#moveUp');
  await click('#moveDown');
  await click('#removeScene');

  await setCard(3, chapters[3][0], chapters[3][2]);
  await typeText('#sceneLabel', '午后的事务所');
  await typeText('#speaker', '制作人');
  await typeText('#dialogue', '今天想从哪里开始呢？');
  await setValue('#duration', 8);
  await click('#addCaption');
  await setValue('#sceneCaptions .cue-row:nth-child(1) label:nth-of-type(1) input', 0, 'change');
  await setValue('#sceneCaptions .cue-row:nth-child(1) label:nth-of-type(2) input', 3, 'change');
  await typeText('#sceneCaptions .cue-row:nth-child(1) textarea', '先把想说的话，写进这一幕。');

  await setCard(4, chapters[4][0], chapters[4][2]);
  await click('[data-pick="background"]');
  await searchPicker('背景 00001');
  await hold(1.4);

  await setCard(5, chapters[5][0], chapters[5][2]);
  await click('#addCharacter');
  await searchPicker('1040060010');
  await waitFor('()=>document.querySelector("#characterSelect").options.length>1', '角色模型加入');
  await waitFor('()=>StoryWorkshop.stage.nodes.length>0', '角色模型预览');
  await hold(1.2);
  await click('#addCharacter');
  await searchPicker('1040100010');
  await waitFor('()=>document.querySelector("#characterSelect").options.length>2', '第二位角色加入');
  await choose('#characterSelect', await win.webContents.executeJavaScript('document.querySelector("#characterSelect").options[2].value'));
  await setValue('#characterX', 820, 'change');
  await setValue('#characterScale', 85, 'change');
  await setChecked('#characterFlip', true);
  await choose('#characterSelect', await win.webContents.executeJavaScript('document.querySelector("#characterSelect").options[1].value'));

  await setCard(6, chapters[6][0], chapters[6][2]);
  await setValue('#characterX', 370, 'change');
  await setValue('#characterY', 610, 'change');
  await setValue('#characterScale', 100, 'change');
  await setChecked('#characterFlip', false);
  await hold(1.2);

  await setCard(7, chapters[7][0], chapters[7][2]);
  await choose('#characterAnimation', 'hello');
  await click('#characterTalking');
  await hold(1.4);
  await click('#characterTalking');

  await setCard(8, chapters[8][0], chapters[8][2]);
  await choose('#cueChannel', 'body');
  await click('#addCue');
  await choose('#characterCues .cue-row:nth-child(1) select', 'hello');
  await choose('#cueChannel', 'face');
  await click('#addCue');
  await choose('#characterCues .cue-row:nth-child(2) select', 'face_smile');
  await choose('#cueChannel', 'eyes');
  await click('#addCue');
  await choose('#characterCues .cue-row:nth-child(3) select', 'eye_right');
  await choose('#cueChannel', 'mouth');
  await click('#addCue');
  await choose('#characterCues .cue-row:nth-child(4) label select', 'lip_smile');
  await click('#addCue');
  await choose('#characterCues .cue-row:nth-child(5) [aria-label="嘴型开关"]', 'off');
  await hold(1.1);

  await setCard(9, chapters[9][0], chapters[9][2]);
  await click('#addMove');
  await setValue('#characterMoves .motion-row:nth-child(1) label:nth-of-type(2) input', 2, 'change');
  await setValue('#characterMoves .motion-row:nth-child(1) label:nth-of-type(3) input', 720, 'change');
  await click('#addMove');
  await setValue('#characterMoves .motion-row:nth-child(2) label:nth-of-type(1) input', 2, 'change');
  await setValue('#characterMoves .motion-row:nth-child(2) label:nth-of-type(2) input', 2, 'change');
  await setValue('#characterMoves .motion-row:nth-child(2) label:nth-of-type(3) input', 390, 'change');
  await click('#previewMotion', 0);
  for (let i = 0; i < 18; i++) await capture(0.16);
  await setValue('#motionScrub', 2.8, 'input');

  await setCard(10, chapters[10][0], chapters[10][2]);
  await click('#importAssets');
  await injectFiles('#assetFiles', [
    { path: path.join(root, 'public', 'home-assets', 'office.jpg'), name: '自制事务所背景.jpg', type: 'image/jpeg' },
    { path: path.join(root, 'public', 'home-assets', 'test-voice.m4a'), name: '示例配音.m4a', type: 'audio/mp4' },
    { path: path.join(root, 'cache', 'spine', 'idols', 'stand', '1040010010', 'data.json'), name: 'data.json', type: 'application/json' },
    { path: path.join(root, 'cache', 'spine', 'idols', 'stand', '1040010010', 'data.atlas'), name: 'data.atlas', type: 'text/plain' },
    { path: path.join(root, 'cache', 'spine', 'idols', 'stand', '1040010010', 'data.png'), name: 'data.png', type: 'image/png' },
  ]);
  await waitFor('()=>document.querySelector("#writerStatus").textContent.includes("已导入")', '素材导入完成');
  await hold(1.8);

  await setCard(11, chapters[11][0], chapters[11][2]);
  const localBackground = await win.webContents.executeJavaScript(
    'StoryWorkshop.project.assets.find(a=>a.name==="自制事务所背景.jpg").id'
  );
  await choose('#background', localBackground);
  const importedModelSelector = await win.webContents.executeJavaScript(
    '(()=>{const b=[...document.querySelectorAll("#projectAssets button")].find(x=>x.textContent.includes("data"));return b?"#projectAssets button:nth-child("+( [...b.parentElement.children].indexOf(b)+1 )+")":null})()'
  );
  if (importedModelSelector) await click(importedModelSelector);
  const localAudio = await win.webContents.executeJavaScript(
    'StoryWorkshop.project.assets.find(a=>a.name==="示例配音.m4a").id'
  );
  await choose('#voice', localAudio);
  await choose('#sound', localAudio);
  await setValue('#sceneVolume', 68, 'input');
  await click('[data-pick="audio"]');
  await win.webContents.executeJavaScript(
    '(()=>{const s=document.querySelector("#materialKind");s.value="audio";s.dispatchEvent(new Event("change",{bubbles:true}))})()'
  );
  await searchPicker('sounds/bgm/000.m4a');
  await hold(1.2);

  await setCard(12, chapters[12][0], chapters[12][2]);
  await click('#importSubtitles');
  const srtPath = path.join(tmp, '示例字幕.srt');
  fs.writeFileSync(srtPath, '1\n00:00:00,000 --> 00:00:02,500\n先听听午后的风声。\n\n2\n00:00:02,500 --> 00:00:05,000\n然后，一起写下新的故事。\n', 'utf8');
  await injectFiles('#subtitleFile', [{ path: srtPath, name: '示例字幕.srt', type: 'application/x-subrip' }]);
  await waitFor('()=>StoryWorkshop.project.scenes.length>=4', '字幕转分镜');
  await hold(1.6);

  await setCard(13, chapters[13][0], chapters[13][2]);
  await click('#stopPreview');
  await click('#playFromStart', 0);
  await hold(1.2);
  await click('#nextScene', 0);
  await hold(0.7);
  await click('#previousScene', 0);
  await click('#autoPlay', 0);
  await hold(1.2);
  await click('#autoPlay', 0);
  await click('#stopPreview', 0);

  await setCard(14, chapters[14][0], chapters[14][2]);
  await click('#saveProject', 0);
  await waitFor('()=>document.querySelector("#saveState").textContent==="已保存"', '作品保存');
  await hold(0.9);
  await click('#openLibrary');
  await hold(1.2);
  await click('#projectLibrary [data-close="projectLibrary"]');

  await setCard(15, chapters[15][0], chapters[15][2]);
  await click('#exportProject', 0);
  await waitFor('()=>document.querySelector("#writerStatus").textContent.includes("工程已导出")', '工程导出状态', 45000);
  if (exportDownload) await Promise.race([exportDownload, sleep(30000)]);
  if (!fs.existsSync(projectOut) || fs.statSync(projectOut).size < 1000) {
    const packed = await win.webContents.executeJavaScript('(async()=>Array.from(await StoryWorkshop.pack(true)))()');
    fs.writeFileSync(projectOut, Buffer.from(packed));
  }
  await hold(0.9);
  await click('#openProject');
  await injectFiles('#projectFile', [{ path: projectOut, name: path.basename(projectOut), type: 'application/zip' }]);
  await waitFor('()=>document.querySelector("#writerStatus").textContent.includes("工程已打开")', '工程重新导入');
  await hold(1.6);

  await setCard(16, chapters[16][0], chapters[16][2]);
  await click('#playFromStart', 0);
  for (let i = 0; i < 5; i++) {
    await capture(0.45);
    await win.webContents.executeJavaScript('(()=>{if(StoryWorkshop.project.scenes.length>1)document.querySelector("#nextScene").click()})()');
  }
  await click('#stopPreview', 0);
  await hold(1.2);
  await setCard(chapters.length - 1, '教程完成', '怪文书实操教学 · 现在轮到你写自己的故事。');

  const manifest = path.join(tmp, 'timeline.txt');
  const lines = [];
  for (const row of timeline) lines.push("file '" + row.file.replace(/\\/g, '/') + "'", 'duration ' + row.duration.toFixed(3));
  lines.push("file '" + timeline[timeline.length - 1].file.replace(/\\/g, '/') + "'");
  fs.writeFileSync(manifest, lines.join('\n'), 'utf8');
  const encode = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'concat', '-safe', '0', '-i', manifest,
    '-vf', 'fps=' + fps + ',scale=1920:1080:flags=lanczos,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-movflags', '+faststart',
    silentVideo,
  ], { encoding: 'utf8', windowsHide: true });
  if (encode.status !== 0) throw new Error('录屏画面编码失败：' + encode.stderr);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', silentVideo], { encoding: 'utf8', windowsHide: true });
  if (probe.status !== 0) throw new Error('无法读取录屏时长：' + probe.stderr);
  const duration = Number(probe.stdout.trim());
  const mux = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-stream_loop', '-1', '-i', path.join(root, 'cache', 'sounds', 'bgm', '000.m4a'),
    '-i', silentVideo,
    '-map', '1:v:0', '-map', '0:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
    '-af', 'volume=0.17,afade=t=out:st=' + Math.max(0, duration - 4).toFixed(2) + ':d=4',
    '-shortest', '-movflags', '+faststart', video,
  ], { encoding: 'utf8', windowsHide: true });
  if (mux.status !== 0) throw new Error('背景音乐合成失败：' + mux.stderr);
  const directory = chapters.map((c, i) => ({ chapter: i + 1, title: c[0], screenCaption: c[2] }));
  fs.writeFileSync(path.join(outDir, '怪文书-全功能教学-目录.json'), JSON.stringify(directory, null, 2), 'utf8');
  console.log('录制帧：' + timeline.length);
  console.log('视频时长：' + duration.toFixed(1) + ' 秒');
  console.log(video);
  console.log(projectOut);
}

app.whenReady().then(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
    if (service && service.server) service.server.close();
    app.exit(process.exitCode || 0);
  }
});

