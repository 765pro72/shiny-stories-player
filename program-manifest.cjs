const fs=require('node:fs'),path=require('node:path'),{hash,safeRelative}=require('./assistant-workspace.cjs');
function inventory(appRoot,appFiles,runtimeRoot,runtimeFiles){
 const collect=(root,files)=>[...new Set(files)].filter(f=>f!=='program-files.json').sort().map(file=>{if(!safeRelative(file)||/(^|\/)(?:cache(?:-sr|-4k)?|upscale-work|upscale-pilot|tools|research|exports|translation-work|下载资源|怪文书|\.env)(\/|$)/i.test(file))throw Error('不允许的程序清单路径：'+file);const full=path.join(root,file);if(!fs.statSync(full).isFile())throw Error('不是程序文件：'+file);const bytes=fs.readFileSync(full);return{path:file,size:bytes.length,sha256:hash(bytes)}});
 const manifest={version:1,createdAt:new Date().toISOString(),files:collect(appRoot,appFiles),runtime:collect(runtimeRoot,runtimeFiles)};fs.writeFileSync(path.join(appRoot,'program-files.json'),JSON.stringify(manifest));return manifest;
}
module.exports={inventory};
