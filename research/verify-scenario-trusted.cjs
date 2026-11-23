const fs=require('fs'),path=require('path'),os=require('os'),{Workspace}=require('../assistant-workspace.cjs');
const root=path.resolve(__dirname,'..');
(async()=>{
 const runtime=path.join(root,'dist/ShinyStories-Lite-win32-x64'),program=path.join(runtime,'resources/app'),workRoot=fs.mkdtempSync(path.join(os.tmpdir(),'sc-scenario-trusted-'));
 const w=new Workspace({sourceRoot:program,programRoot:program,runtimeRoot:runtime,electronExecutable:path.join(runtime,'ShinyStories-Lite.exe'),workRoot,jobId:require('crypto').randomUUID(),onEvent:e=>console.log(e.text)});
 const source=await w.read('public/assistant.css');await w.edit([{path:source.path,beforeSha256:source.sha256,content:source.content+'\n/* isolated scenario migration regression */\n'}]);
 const result=await w.check();const unchanged=require('crypto').createHash('sha256').update(fs.readFileSync(path.join(program,source.path))).digest('hex')===source.sha256;
 fs.writeFileSync(path.join(root,'exports/scenario-trusted-offline-verification.json'),JSON.stringify({at:new Date().toISOString(),networkDisabled:true,fixtureAssetsOnly:true,programUnchanged:unchanged,workRoot,...result},null,2));
 console.log(JSON.stringify({ok:result.ok,programUnchanged:unchanged,rows:result.rows.map(r=>({name:r.name,ok:r.ok,output:r.ok?undefined:r.output}))},null,2));if(!result.ok||!unchanged)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
