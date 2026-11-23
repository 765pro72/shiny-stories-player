// Standalone trusted installer. Copied outside resources/app before the app exits.
// It never evaluates model code and never accepts a shell command.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function write(file,value){const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2));fs.renameSync(temp,file)}
function alive(pid){try{process.kill(pid,0);return true}catch{return false}}
function plain(root,file=''){
 const absolute=path.resolve(root,file),relative=path.relative(root,absolute);
 if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('修复路径越界');
 // Reject junctions/symlinks on the root and every existing parent.
 let current=path.parse(absolute).root;
 for(const part of absolute.slice(current.length).split(path.sep).filter(Boolean)){current=path.join(current,part);let stat;try{stat=fs.lstatSync(current)}catch(e){if(e.code!=='ENOENT')throw e}if(stat?.isSymbolicLink())throw Error('修复路径不能经过链接：'+current)}
 return absolute;
}
function load(file,token){
 const c=read(file),job=path.join(path.resolve(c.workRoot||''),String(c.jobId));
 if(c.format!==1||!/^[a-f0-9-]{36}$/.test(c.jobId)||!/^[a-f0-9]{64}$/.test(token||'')||token!==c.token||path.resolve(file)!==path.join(job,'apply','install.json'))throw Error('无效修复凭据');
 if(path.resolve(c.programRoot)!==path.join(path.resolve(c.runtimeRoot),'resources','app')||path.resolve(c.executable)!==path.join(path.resolve(c.runtimeRoot),'ShinyStories-Lite.exe'))throw Error('修复目标不是轻量播放器');
 if(path.resolve(c.runtimeRoot)===path.parse(path.resolve(c.runtimeRoot)).root||!Array.isArray(c.files)||!c.files.length)throw Error('无效修复目录');
 const seen=new Set();for(const row of c.files){if(!/^resources\/app\/[\w\u3400-\u9fff ./-]+$/.test(row.path)||row.path.split('/').some(s=>!s||s==='.'||s==='..')||seen.has(row.path.toLowerCase()))throw Error('非法或重复修复路径');seen.add(row.path.toLowerCase());if(!/^[a-f0-9]{64}$/.test(row.after)||row.before!==null&&!/^[a-f0-9]{64}$/.test(row.before))throw Error('无效文件指纹');plain(c.runtimeRoot,row.path);plain(path.dirname(file),'payload/'+row.path);plain(path.dirname(file),'backup/'+row.path)}
 plain(c.runtimeRoot);plain(job);return c;
}
function verify(c,base,kind){for(const row of c.files){const file=plain(base,row.path),expected=row[kind];if(expected===null){if(fs.existsSync(file))throw Error('新文件已存在：'+row.path)}else if(!fs.existsSync(file)||!fs.lstatSync(file).isFile()||hash(fs.readFileSync(file))!==expected)throw Error('文件已变化：'+row.path)}}
function replace(file,bytes,token){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.repair-'+token.slice(0,12);fs.writeFileSync(temp,bytes);try{fs.renameSync(temp,file)}finally{if(fs.existsSync(temp))fs.unlinkSync(temp)}}
function cleanEnv(){const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;for(const key of Object.keys(env))if(key.startsWith('SC_ASSISTANT_'))delete env[key];return env}
function launch(c,file){const child=spawn(c.executable,['--assistant-repair-receipt='+file,'--assistant-repair-token='+c.token],{cwd:c.runtimeRoot,env:cleanEnv(),windowsHide:true,detached:true,stdio:'ignore'});child.on('error',()=>{});return child}
async function install(file,token,{launchProgram=launch,waitForExit=true,healthTimeout=45000}={}){
 const c=load(file,token),dir=path.dirname(file),stateFile=path.join(dir,'status.json'),health=path.join(dir,'health.json');let state={state:'waiting-exit',at:new Date().toISOString(),touched:[],token},child,parentExited=false;
 const status=(value,extra={})=>{state={...state,...extra,state:value,at:new Date().toISOString()};write(stateFile,state)};
 try{
  verify(c,path.join(dir,'payload'),'after');verify(c,path.join(dir,'backup'),'before');verify(c,c.runtimeRoot,'before');status('waiting-exit',{helperPid:process.pid});
  if(waitForExit){const end=Date.now()+120000;while(alive(c.parentPid)){const cancel=path.join(dir,'cancel.json');if(fs.existsSync(cancel)&&read(cancel).token===token)throw Error('已取消应用，原程序保持不变');if(Date.now()>end)throw Error('播放器尚未退出，未应用修复');await sleep(100)}}
  parentExited=true;const cancel=path.join(dir,'cancel.json');if(fs.existsSync(cancel)&&read(cancel).token===token)throw Error('已取消应用，原程序保持不变');verify(c,c.runtimeRoot,'before');status('installing');
  for(const row of c.files){state.touched.push(row.path);status('installing');replace(plain(c.runtimeRoot,row.path),fs.readFileSync(plain(path.join(dir,'payload'),row.path)),token)}
  verify(c,c.runtimeRoot,'after');status('awaiting-health');child=launchProgram(c,file);child?.unref?.();
  const end=Date.now()+healthTimeout;while(Date.now()<end){if(fs.existsSync(health)){const h=read(health);if(h.token===token&&h.ok===true){verify(c,c.runtimeRoot,'after');status('applied');return state}}await sleep(100)}
  throw Error('新版未通过启动确认，正在恢复原版');
 }catch(error){
  if(!state.touched.length){status('failed',{error:error.message});if(parentExited)launchProgram(c,file)?.unref?.();return state}
  if(child?.pid){try{child.kill()}catch{}const end=Date.now()+10000;while(alive(child.pid)&&Date.now()<end)await sleep(100);if(alive(child.pid)){status('rollback-failed',{error:'新版进程未退出，已保留备份；请退出后恢复。原因：'+error.message});return state}}
  try{status('rolling-back',{error:error.message});for(const filePath of [...state.touched].reverse()){const row=c.files.find(r=>r.path===filePath),target=plain(c.runtimeRoot,filePath);if(fs.existsSync(target)){const current=hash(fs.readFileSync(target));if(current!==row.after&&current!==row.before)throw Error('回滚发现外部修改，保留现场：'+filePath)}if(row.before===null){if(fs.existsSync(target))fs.unlinkSync(target)}else replace(target,fs.readFileSync(plain(path.join(dir,'backup'),filePath)),token)}verify(c,c.runtimeRoot,'before');status('rolled-back');launchProgram(c,file)?.unref?.();return state}catch(rollback){status('rollback-failed',{error:error.message+'；'+rollback.message});return state}
 }
}
module.exports={load,verify,install,hash,write,plain,alive};
if(require.main===module)install(process.argv[2],process.argv[3]).then(s=>{process.exitCode=['applied','rolled-back'].includes(s.state)?0:1}).catch(e=>{console.error(e);process.exitCode=1});
