// Bounded inspection of previously saved public client evidence; no app execution.
const fs=require('node:fs');
const source=fs.readFileSync('research/client/app.js','utf8');
for(const needle of ['ASSET_ROOT','cloudfront','manifest','assetManifest','assetVersion','/assets/','CDN']){
 const positions=[];let at=source.indexOf(needle);while(at>=0&&positions.length<3){positions.push(at);at=source.indexOf(needle,at+needle.length)}
 console.log(JSON.stringify({needle,matches:positions.map(at=>source.slice(Math.max(0,at-140),at+240))}));
}
const evidence=JSON.parse(fs.readFileSync('research/client-evidence.json','utf8'));
console.log('Evidence top-level keys',Object.keys(evidence));
