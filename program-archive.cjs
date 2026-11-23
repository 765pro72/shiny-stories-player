// Shared program/repair packaging. No ZIP is generated.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
function packDirectory(folder,seven=path.join(__dirname,'vendor/7zip/7z.exe')){
 folder=path.resolve(folder);if(!fs.statSync(folder).isDirectory())throw Error('缺少待打包目录');if(!fs.existsSync(seven))throw Error('缺少随包压缩工具');
 const archive=folder+'.7z';if(fs.existsSync(archive))fs.unlinkSync(archive);
 execFileSync(seven,['a','-t7z','-m0=lzma2','-mx=5','-mmt=4','-y',archive,path.basename(folder)],{cwd:path.dirname(folder),windowsHide:true,stdio:'pipe'});
 execFileSync(seven,['t',archive],{windowsHide:true,stdio:'pipe'});return archive;
}
module.exports={packDirectory};
