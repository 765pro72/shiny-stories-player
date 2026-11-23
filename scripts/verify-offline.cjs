const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),catalog=require('../data/catalog.json');
const needed=JSON.parse(fs.readFileSync(path.join(root,'exports/offline-assets-needed.json')));
const absent=needed.filter(x=>!fs.existsSync(path.join(root,'cache',x)));
const scripts=catalog.map(x=>'json/'+x.key),missingScripts=scripts.filter(x=>!fs.existsSync(path.join(root,'cache',x)));
const summary={catalog:scripts.length,scriptFilesPresent:scripts.length-missingScripts.length,assetsNeeded:needed.length,assetsPresent:needed.length-absent.length,missingScripts,missingAssets:absent};
fs.writeFileSync(path.join(root,'exports/offline-verification.json'),JSON.stringify(summary,null,2));
console.log({catalog:summary.catalog,scriptsPresent:summary.scriptFilesPresent,assetsNeeded:summary.assetsNeeded,assetsPresent:summary.assetsPresent});
if(absent.length||missingScripts.length){console.error('Offline package incomplete; see exports/offline-verification.json');process.exitCode=1}
