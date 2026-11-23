const fs=require('node:fs'),path=require('node:path'),{hash,safeRelative,sourceFile}=require('./assistant-workspace.cjs'),{inventory}=require('./program-manifest.cjs');
async function candidate(file){
 const c=JSON.parse(fs.readFileSync(file,'utf8')),work=path.resolve(c.workRoot||''),stage=path.resolve(c.stage||''),job=path.join(work,String(c.jobId)),source=path.join(job,'source');
 if(c.version!==1||!/^[a-f0-9-]{36}$/.test(c.jobId)||stage!==source||path.resolve(c.report)!==path.join(job,'build-result.json'))throw Error('无效工作副本');
 const saved=JSON.parse(fs.readFileSync(path.join(job,'changes.json'),'utf8')),fingerprint=hash(JSON.stringify([...c.changes].sort((a,b)=>a.path.localeCompare(b.path))));
 if(!saved.checks?.ok||saved.checks.fingerprint!==fingerprint||JSON.stringify(saved.changes)!==JSON.stringify(c.changes)||!saved.checks.rows.length||saved.checks.rows.some(r=>!r.ok))throw Error('发布门禁：检查未通过或修改已变化');
 const base=JSON.parse(fs.readFileSync(path.join(c.programRoot,'program-files.json'),'utf8')),mode=JSON.parse(fs.readFileSync(path.join(c.programRoot,'release-mode.json'),'utf8'));if(mode.mode!=='lite')throw Error('助手仅生成轻量版');
 const changed=new Map(c.changes.map(e=>[e.path,e]));for(const row of changed.values())if(!sourceFile(row.path,true)||hash(fs.readFileSync(path.join(stage,row.path)))!==row.after)throw Error('发布门禁：修改范围或哈希异常');
 const folderName='ShinyStories-Lite-win32-x64',out=path.join(job,'新版程序'),folder=path.join(out,folderName),appRoot=path.join(folder,'resources','app');fs.mkdirSync(appRoot,{recursive:true});
 const appFiles=[...new Set([...base.files.map(r=>r.path),...changed.keys()])];for(const file of appFiles){if(!safeRelative(file))throw Error('无效程序路径');const bytes=fs.readFileSync(path.join(stage,file)),expected=changed.get(file)?.after||base.files.find(r=>r.path===file)?.sha256;if(hash(bytes)!==expected)throw Error('发布门禁：未声明的程序变化 '+file);const dest=path.join(appRoot,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes)}
 for(const entry of base.runtime){const bytes=fs.readFileSync(path.join(c.runtimeRoot,entry.path));if(hash(bytes)!==entry.sha256)throw Error('运行环境校验失败 '+entry.path);const dest=path.join(folder,entry.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes)}
 const manifestPath=path.join(folder,'release-manifest.json'),release=JSON.parse(fs.readFileSync(manifestPath,'utf8'));release.assistantBuild={id:c.jobId,at:new Date().toISOString(),baseVersion:release.uiVersion,changes:[...changed.keys()],tests:saved.checks.rows.map(r=>({name:r.name,ok:r.ok}))};fs.writeFileSync(manifestPath,JSON.stringify(release,null,2));
 fs.writeFileSync(path.join(folder,'本次修复说明.txt'),'本次 AI 修改位于独立程序副本。\r\n基础版本：'+release.uiVersion+'\r\n修改文件：\r\n'+[...changed.keys()].join('\r\n')+'\r\n原程序与用户作品未覆盖。先退出旧程序再启动新版。测试输出见同任务修复包。\r\n');
 const runtimeFiles=[...new Set([...base.runtime.map(r=>r.path),'本次修复说明.txt'])];inventory(appRoot,appFiles,folder,runtimeFiles);
 const archive=require('./program-archive.cjs').packDirectory(folder,path.join(appRoot,'vendor','7zip','7z.exe'));
 // zip is a legacy result key consumed by existing install records; its file is 7z.
 const report={ok:true,fingerprint,folder,archive,zip:archive,archiveFormat:'7z',bytes:fs.statSync(archive).size,sha256:hash(fs.readFileSync(archive)),files:appFiles.length+runtimeFiles.length+1};fs.writeFileSync(c.report,JSON.stringify(report,null,2));return report;
}
module.exports={candidate};
