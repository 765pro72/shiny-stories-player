// Uses the same resource editor as Electron Packager, preserving other PE resources.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const exePath=path.resolve(process.argv[2]),iconPath=path.resolve(process.argv[3]||path.join(__dirname,'../assets/app.ico'));
 const re=await require('resedit/cjs').load(),icon=re.Data.IconFile.from(fs.readFileSync(iconPath)),exe=re.NtExecutable.from(fs.readFileSync(exePath)),resources=re.NtExecutableResource.from(exe);
 const groups=re.Resource.IconGroupEntry.fromEntries(resources.entries);if(!groups.length)throw Error('EXE has no icon resource group');
 const currentIcons=groups[0]?.getIconItemsFromEntries(resources.entries);
 if(currentIcons&&currentIcons.length===icon.icons.length){
  let same=true;
  for(let i=0;i<currentIcons.length;i++){
   const a=Buffer.from(currentIcons[i].bin||currentIcons[i].generate()),b=Buffer.from(icon.icons[i].data.bin||icon.icons[i].data.generate());
   if(a.length!==b.length||Buffer.compare(a,b)!==0){same=false;break}
  }
  if(same){console.log('EXE icon already verified:',currentIcons.length,'sizes',exePath);return}
 }
 for(const group of groups)re.Resource.IconGroupEntry.replaceIconsForResource(resources.entries,group.id,group.lang,icon.icons.map(i=>i.data));
 resources.outputResource(exe);const bytes=Buffer.from(exe.generate()),tmp=exePath+'.icon.tmp';
 const check=re.NtExecutableResource.from(re.NtExecutable.from(bytes)),actual=re.Resource.IconGroupEntry.fromEntries(check.entries)[0].getIconItemsFromEntries(check.entries);
 assert.equal(actual.length,icon.icons.length);for(let i=0;i<actual.length;i++)assert.deepEqual(Buffer.from(actual[i].bin||actual[i].generate()),Buffer.from(icon.icons[i].data.bin||icon.icons[i].data.generate()));
 fs.writeFileSync(tmp,bytes);fs.renameSync(tmp,exePath);console.log('EXE icon verified:',actual.length,'sizes',exePath);
})().catch(e=>{console.error(e);process.exitCode=1});
