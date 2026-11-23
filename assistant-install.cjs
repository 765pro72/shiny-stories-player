// Only the desktop host can stage an installation, after native user consent.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const H=require('./assistant-install-helper.cjs'),{sourceFile}=require('./assistant-workspace.cjs');
async function prepare({workspace:w,runtimeRoot,executable,userData,page='index.html',checkpoint={}}){
 if(!w.checks?.ok||w.checks.fingerprint!==w.fingerprint()||!w.changes.size)throw Error('修复尚未通过检查');
 const build=JSON.parse(fs.readFileSync(path.join(w.root,'build-result.json'),'utf8'));
 if(!build.ok||build.fingerprint!==w.fingerprint()||!fs.existsSync(build.zip)||H.hash(fs.readFileSync(build.zip))!==build.sha256)throw Error('缺少通过发布门禁的新程序');
 if(path.resolve(w.programRoot)!==path.join(path.resolve(runtimeRoot),'resources','app'))throw Error('自动应用只支持已打包的轻量程序');
 const before=fs.readFileSync(path.join(w.root,'base-program-files.json')),base=JSON.parse(before),next=JSON.parse(before),map=new Map(next.files.map(r=>[r.path,r]));
 const token=crypto.randomBytes(32).toString('hex'),dir=path.join(w.root,'apply'),rows=[];fs.mkdirSync(dir,{recursive:true});
 const add=(file,old,bytes)=>{const rel='resources/app/'+file;rows.push({path:rel,before:old===null?null:H.hash(old),after:H.hash(bytes)});for(const [kind,value]of [['payload',bytes],['backup',old]])if(value!==null){const dest=H.plain(dir,kind+'/'+rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,value)}};
 for(const row of w.changes.values()){
  if(!sourceFile(row.path,true))throw Error('修复超出允许范围');const bytes=fs.readFileSync(H.plain(w.stage,row.path)),old=row.before===null?null:fs.readFileSync(H.plain(w.root,'before/'+row.path));
  if(H.hash(bytes)!==row.after||old!==null&&H.hash(old)!==row.before)throw Error('修改或备份在检查后变化');add(row.path,old,bytes);map.set(row.path,{path:row.path,size:bytes.length,sha256:row.after});
 }
 next.files=[...map.values()].sort((a,b)=>a.path.localeCompare(b.path));add('program-files.json',before,Buffer.from(JSON.stringify(next)));
 // Verify every immutable runtime component too; never patch the executable.
 for(const row of base.runtime)if(H.hash(fs.readFileSync(H.plain(runtimeRoot,row.path)))!==row.sha256)throw Error('程序运行环境已变化：'+row.path);
 for(const row of rows){let parent=path.dirname(H.plain(runtimeRoot,row.path));while(!fs.existsSync(parent))parent=path.dirname(parent);const probe=path.join(parent,'.repair-write-'+token.slice(0,12));try{fs.writeFileSync(probe,'',{flag:'wx'});fs.unlinkSync(probe)}catch{throw Error('程序目录不可写，请移动到有写入权限的文件夹后再应用')}}
 const c={format:1,jobId:w.jobId,workRoot:w.workRoot,programRoot:w.programRoot,runtimeRoot,executable,userData,page:/^(?:index|guide|library|card-gallery|voice-gallery|model-picker|custom-story|memorial-gallery)(?:\.html)(?:\?[^#]*)?$/.test(page)?page:'index.html',checkpoint,token,parentPid:process.pid,fingerprint:w.fingerprint(),files:rows};
 const file=path.join(dir,'install.json');H.write(file,c);H.load(file,token);H.verify(c,runtimeRoot,'before');fs.copyFileSync(path.join(__dirname,'assistant-install-helper.cjs'),path.join(dir,'helper.cjs'));return{file,token,config:c};
}
async function start(prepared,executable){
 const {file,token}=prepared,status=path.join(path.dirname(file),'status.json');if(fs.existsSync(status))fs.unlinkSync(status);
 const child=spawn(executable,[path.join(path.dirname(file),'helper.cjs'),file,token],{cwd:path.dirname(file),env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},detached:true,windowsHide:true,stdio:'ignore'});let error;child.on('error',e=>{error=e});child.unref();
 const end=Date.now()+15000;while(Date.now()<end){if(error)throw error;if(fs.existsSync(status)){const s=JSON.parse(fs.readFileSync(status,'utf8'));if(s.token===token&&s.state==='waiting-exit')return;if(s.state==='failed')throw Error(s.error)}await new Promise(r=>setTimeout(r,80))}throw Error('应用助手未能启动，播放器保持打开');
}
function resume(argv,executable){const file=argv.find(a=>a.startsWith('--assistant-repair-receipt='))?.split('=').slice(1).join('='),token=argv.find(a=>a.startsWith('--assistant-repair-token='))?.slice('--assistant-repair-token='.length);if(!file)return null;const config=H.load(file,token);if(path.resolve(config.executable)!==path.resolve(executable))throw Error('修复回执与程序不符');const state=JSON.parse(fs.readFileSync(path.join(path.dirname(file),'status.json'),'utf8'));if(!['awaiting-health','rolled-back','failed'].includes(state.state)||state.token!==token)throw Error('修复回执已过期');return{file,token,config,state}}
function healthy(receipt){H.verify(receipt.config,receipt.config.runtimeRoot,receipt.state.state==='rolled-back'?'before':'after');H.write(path.join(path.dirname(receipt.file),'health.json'),{token:receipt.token,ok:true,at:new Date().toISOString()})}
function cancel(prepared){if(prepared)H.write(path.join(path.dirname(prepared.file),'cancel.json'),{token:prepared.token})}
module.exports={prepare,start,resume,healthy,cancel};
