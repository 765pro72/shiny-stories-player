const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),os=require('node:os'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),folder='ShinyStories-Lite-win32-x64',archive=path.join(root,'dist',folder+'.7z'),appRoot=path.join(root,'dist',folder,'resources/app');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const entries=fs.readFileSync(path.join(root,'exports',folder+'-members.txt'),'utf8').trim().split('\n');const wanted=new Set(entries);
const seven=path.join(root,'vendor/7zip/7z.exe'),extracted=fs.mkdtempSync(path.join(os.tmpdir(),'sc-release-7z-')),archiveMembers=execFileSync(seven,['l','-slt','-ba','-sccUTF-8',archive],{encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024}).split('\n').filter(s=>s.startsWith('Path = ')).map(s=>s.slice(7).trim().split(String.fromCharCode(92)).join('/'));
assert.ok(archiveMembers.every(f=>(f===folder||f.startsWith(folder+'/'))&&!f.split(/[\\/]/).includes('..')&&!f.includes(':')),'safe archive paths');execFileSync(seven,['t',archive],{windowsHide:true,stdio:'pipe'});execFileSync(seven,['x','-y','-bd','-o'+extracted,archive],{windowsHide:true,stdio:'pipe'});const archiveSet=new Set(archiveMembers),zip=new Proxy({}, {get:(_target,file)=>typeof file==='string'&&archiveSet.has(file)&&fs.statSync(path.join(extracted,file)).isFile()?fs.readFileSync(path.join(extracted,file)):undefined});
assert.ok(!archiveMembers.some(f=>/\/cunny\/|\/(?:build|test)-cunny\.cjs|CuNNy移植说明/.test(f)),'CuNNy files must be absent');assert.ok(!archiveMembers.some(f=>/animesharp|AnimeSharpV4|onnxruntime|\.onnx$/i.test(f)),'V4 runtime and weights must be absent');const mismatches=[];let checked=0;
for(const entry of entries){if(!zip[entry]){mismatches.push({entry,error:'archive missing'});continue}const packed=fs.readFileSync(path.join(root,'dist',entry));if(digest(packed)!==digest(zip[entry]))mismatches.push({entry,error:'folder/7z mismatch'});const relative=entry.split('/resources/app/')[1];if(relative&&!['program-files.json','release-mode.json','node_modules/.package-lock.json'].includes(relative)&&digest(fs.readFileSync(path.join(root,relative)))!==digest(packed))mismatches.push({entry,error:'source/folder mismatch'});checked++}
(async()=>{const re=await require('resedit/cjs').load(),exe=zip[folder+'/ShinyStories-Lite.exe'];assert.ok(exe);const res=re.NtExecutableResource.from(re.NtExecutable.from(exe)),group=re.Resource.IconGroupEntry.fromEntries(res.entries)[0],icons=group.getIconItemsFromEntries(res.entries),expected=re.Data.IconFile.from(fs.readFileSync(path.join(root,'assets/app.ico'))).icons;
 assert.equal(icons.length,7);icons.forEach((i,n)=>assert.equal(digest(Buffer.from(i.bin||i.generate())),digest(Buffer.from(expected[n].data.bin||expected[n].data.generate()))));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'dist',folder,'release-manifest.json')));assert.equal(manifest.archiveFormat,'7z');assert.equal(JSON.parse(fs.readFileSync(path.join(appRoot,'release-mode.json'))).mode,'lite');assert.equal(manifest.realtimeUpscaling.default,'off');assert.equal(manifest.catalog,10960);assert.equal(manifest.realtimeUpscaling.draggableOrder,true);assert.equal(manifest.realtimeUpscaling.disabledStagesSkipped,true);for(const file of ['custom-story-service.cjs','public/custom-story.html','public/custom-story.css','public/custom-story-core.js','public/custom-story-stage.js','public/custom-story.js','public/translation-exchange.js','public/vendor/fflate.js','data/custom-story-assets.json','update-background.cjs','update-worker.cjs','update-fetch-bridge.cjs','update-http.cjs','public/update-ui.js','public/update-ui.css','desktop-window.cjs','public/home-continuity.js','public/guide-design.css','public/layout-refinements.css','public/artcnn.js','public/vendor/artcnn/kernels.json','public/vendor/artcnn/LICENSE.txt'])assert.ok(zip[folder+'/resources/app/'+file],file+' must ship');
 for(const file of ['asset-race.cjs','public/preview-queue.js','public/portraits.js','public/portraits.json','public/module-design.js','public/module-design.css','model-assets.cjs','public/home-voice-policy.js','public/home-assets/generic-voices.json','public/archive-banner.js','public/model-previews/index.json'])assert.ok(zip[folder+'/resources/app/'+file],file+' must ship');
 assert.equal(manifest.realtimeUpscaling.gpuDiagnostics,true);assert.equal(manifest.realtimeUpscaling.staticIdleGuard,true);assert.equal(manifest.uiMotion.officialPortraits,33);assert.equal(manifest.modelPreviews.bundled,3222);assert.equal(manifest.uiMotion.persistentLobbyNavigation,true);assert.equal(manifest.backgroundUpdates.rendererIndependent,true);assert.equal(manifest.backgroundUpdates.mediaAutoDownload,false);const previews=JSON.parse(Buffer.from(zip[folder+'/resources/app/public/model-previews/index.json']).toString());for(const item of Object.values(previews.entries))assert.ok(zip[folder+'/resources/app/public/model-previews/'+item.file],'pre-rendered wardrobe image must ship');
 assert.equal(manifest.homeConversations?.normal,785);assert.equal(manifest.homeConversations?.automatic,true);assert.equal(manifest.customStories?.editor,true);assert.equal(manifest.customStories?.offlineBundling,true);for(const file of ['index.html','guide.html','card-gallery.html','voice-gallery.html','model-picker.html'])assert.ok(Buffer.from(zip[folder+'/resources/app/public/'+file]).toString().includes('href="custom-story.html"'),'workshop navigation missing '+file);
 assert.equal(manifest.uiVersion,'2026-11-16.75');for(const key of ['producerSoundInterval','producerGaplessAudio','modelPreviewFallback','modelNameUpdates','materialPageJump','materialRarityFilter','deleteWithUndo','viewerEnhancementLayout','sharedStoryViewer','localAudioLipSync','producerDialogueSound','staticMouthCompatibility','aiScriptCorrection','isolatedPoseBlending','savedVoiceBinding','nativeMotionRelays','interfaceFontInSettings','scriptAutoCorrection','scriptValidationFeedback','globalInterfaceFont','audioDrivenMouth','continuousShotRendering','localStoryLibrary','sentenceLanguageSegments','phonemeReadingControl','emotionalPerformancePrompts','fullWidthPreview','followingPreview','japaneseDialogue','voiceLanguageSelection','editableSpeechQueue','producerDeselect','directorDirectApply','undoRedo','materialNotesFavorites','materialUpdateInheritance','characterLanguageReference','completeMaterialLibrary','directorMode','globalBgm','defaultBgmToggle','bgmStartPosition','selectiveTimedVoice'])assert.equal(manifest.customStories[key],true);assert.equal(manifest.customStories.bundledVoiceProfiles,29);for(const file of ["public/story-music.js","public/story-music-editor.js","public/story-materials.js","public/story-materials.css","public/story-director.js","data/story-material-metadata.json","data/story-voice-profiles.json"])assert.ok(zip[folder+'/resources/app/'+file],file+' must ship');
 for(const file of ['public/story-ai-correction-core.js','public/story-ai-correction.js','public/interface-font-core.js','public/interface-font.js','public/custom-story-library.js','public/custom-story-library.css','model-labels.cjs','data/model-labels.json','scripts/test-material-models.cjs','public/vendor/pinyin-pro.js','public/vendor/pinyin-pro-LICENSE.txt','public/story-speech.js','public/story-speech-editor.js','public/story-ai-layout.js','story-material-index.cjs','public/story-character-language.js','public/story-japanese.js','data/story-character-language-evidence.json'])assert.ok(zip[folder+'/resources/app/'+file],file+' must ship');
 for(const key of ['chat','draggable','avatarsNames','sharedAPI','diagnostics','localStoryGuide','webSearch','isolatedCodeChanges','verifiedBuild','repairPackage','applyRepair','restartRequiresConsent','startupRollback','restartDraftRecovery','visibilitySetting','contextMenuClose','avatarDrag','clearConversation','stylesheetReady','wrappedToolResponses'])assert.equal(manifest.globalAssistant[key],true);
 for(const file of ['assistant-install.cjs','assistant-install-helper.cjs','assistant-desktop.cjs','assistant-service.cjs','assistant-workspace.cjs','assistant-release.cjs','assistant-patch.cjs','program-manifest.cjs','assistant-test-entry.cjs','public/assistant.js','public/assistant.css','public/story-character-addresses.js','data/assistant-story-index.json','vendor/7zip/7z.exe','vendor/7zip/License.txt','program-files.json'])assert.ok(zip[folder+'/resources/app/'+file],file+' must ship');
 assert.equal(manifest.storyPlayback.engine,'ShinyScenarioViewer');assert.equal(manifest.storyPlayback.upstreamCommit,'66e8d7607eb4380762420bc64a593f7898d586c1');for(const k of ['legacySelectable','sharedSubtitleOverrides','updatedData','sharedOfflineDownloads','perCharacterMouth'])assert.equal(manifest.storyPlayback[k],true);
 for(const file of ['program-archive.cjs','public/player/legacy.html','public/player/engine-controls.js','public/player/scenario-bridge.js','public/player/scenario-text.js','public/player/scenario/AdvPlayer.js','public/player/scenario/LICENSE','public/player/scenario/NOTICE.html','public/player/scenario-ui/images/ui/produce_event/parts_event.json','scripts/test-scenario-player.cjs','scripts/test-scenario-updates.cjs','剧情播放器迁移-2026-11-16.md'])assert.ok(zip[folder+'/resources/app/'+file],file+' must ship');
 assert.ok(Buffer.from(zip[folder+'/resources/app/public/player/main.html']).toString().includes('scenario-bridge.js'));assert.ok(Buffer.from(zip[folder+'/resources/app/public/player/legacy.html']).toString().includes('bootstrap.js'));
 const inventory=JSON.parse(fs.readFileSync(path.join(appRoot,'program-files.json'),'utf8'));for(const entry of inventory.files)assert.equal(digest(fs.readFileSync(path.join(appRoot,entry.path))),entry.sha256,'inventory '+entry.path);
 const report={at:new Date().toISOString(),archive,archiveFormat:'7z',bytes:fs.statSync(archive).size,sha256:digest(fs.readFileSync(archive)),checked,mismatches,iconSizes:group.icons.map(i=>i.width||256),anime4kDefault:manifest.realtimeUpscaling.default,uiVersion:manifest.uiVersion,officialPortraits:manifest.uiMotion.officialPortraits,independentEnhancementSwitches:manifest.realtimeUpscaling.independentSwitches,draggableOrder:manifest.realtimeUpscaling.draggableOrder,cunnyRemoved:true,modelWeightsBundled:archiveMembers.filter(f=>f.endsWith('.onnx')).length,modelPreviews:manifest.modelPreviews,translationFilesVerified:entries.filter(x=>x.includes('/data/translations/')).length};fs.writeFileSync(path.join(root,'exports/ui-release-verification-2026-11-13.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(mismatches.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
































