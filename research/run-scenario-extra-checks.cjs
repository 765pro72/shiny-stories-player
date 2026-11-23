const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve(__dirname,'..');
const tests=['test-home-gasha-mouth.cjs','test-home-auto-conversations.cjs','test-story-creative-next.cjs','test-story-language-workflow.cjs','test-story-segmented-speech.cjs','test-translation-exchange.cjs','test-interface-usability.cjs','test-story-text-ui.cjs'];
const rows=[];
for(const name of tests){console.log('START',name);const env={...process.env,SHINY_OFFLINE:'1'};delete env.ELECTRON_RUN_AS_NODE;const r=cp.spawnSync(process.execPath,[path.join(root,'scripts',name)],{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:180000});rows.push({name,ok:r.status===0,code:r.status,output:(r.stdout||'')+(r.stderr||'')});console.log(rows.at(-1).ok?'PASS':'FAIL',name);if(!rows.at(-1).ok){console.log(rows.at(-1).output.slice(-7000));break}}
fs.writeFileSync(path.join(root,'exports/scenario-extra-verification.json'),JSON.stringify({at:new Date().toISOString(),ok:rows.length===tests.length&&rows.every(x=>x.ok),rows},null,2));if(rows.length!==tests.length||rows.some(x=>!x.ok))process.exitCode=1;
