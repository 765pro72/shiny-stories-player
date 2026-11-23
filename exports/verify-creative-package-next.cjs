const fs=require('fs'),path=require('path'),assert=require('assert/strict'),root=path.resolve(__dirname,'..'),appRoot=path.join(root,'dist/ShinyStories-Lite-win32-x64/resources/app');
(async()=>{let network=0;const service=await require(path.join(appRoot,'server.cjs')).start(path.join(root,'cache'),0,()=>path.join(appRoot,'data'),{fetch:async()=>{network++;throw Error('Network forbidden in bundled catalog smoke test')}});try{
 const get=async url=>{const r=await fetch(service.url+url);assert.equal(r.status,200,url);return r};
 const voices=await(await get('/api/story-voice/catalog')).json();assert.equal(voices.profiles.length,29);assert.equal(network,0);
 const providers=await(await get('/api/story-ai/providers')).json();assert.equal(providers.length,20);
 const metadata=await(await get('/data/story-material-metadata.json')).json();assert.ok(metadata.entries['sounds/bgm/001.m4a'].usage.includes('本播放器主界面'));
 for(const file of ['story-music.js','story-music-editor.js','story-materials.js','story-materials.css','story-director.js','story-ai-panel.html','story-voice-panel.html'])await get('/'+file);
 const manifest=JSON.parse(fs.readFileSync(path.join(appRoot,'../../release-manifest.json'),'utf8'));assert.equal(manifest.uiVersion,'2026-11-15.2');
 const report={at:new Date().toISOString(),uiVersion:manifest.uiVersion,voiceProfiles:voices.profiles.length,providers:providers.length,bundledCatalogWithoutNetwork:network===0,newFilesServed:true,realPaidVoiceTest:false};
 fs.writeFileSync(path.join(__dirname,'creative-release-verification-2026-11-15.2.json'),JSON.stringify(report,null,2));console.log(report);
 }finally{service.server.closeAllConnections();service.server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
