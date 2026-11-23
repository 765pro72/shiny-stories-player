// User-requested removal; original cache is never modified.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const relative of ['cache-4k','public/home-assets/4k','data/sr-4k-manifest.json']){
 const target=path.resolve(root,relative);
 if(!target.startsWith(root+path.sep))throw Error('Refusing target outside workspace');
 if(fs.existsSync(target)){fs.rmSync(target,{recursive:true,force:true});console.log('Removed '+target)}
}
