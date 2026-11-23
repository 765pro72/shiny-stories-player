// Only inventoried program files ship. User downloads and profiles are excluded.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist'),name=process.argv.find(x=>x.startsWith('--name='))?.slice(7)||'ShinyStories-Lite-win32-x64';
const outer=path.join(dist,name),folder=fs.existsSync(path.join(outer,'resources','app'))?outer:path.join(outer,name),appRoot=path.join(folder,'resources/app'),output=path.join(dist,name+'.7z');
if(!/^ShinyStories-(?:Lite|Full)-win32-x64$/.test(name))throw Error('Invalid program name');
const inventory=JSON.parse(fs.readFileSync(path.join(appRoot,'program-files.json'),'utf8')),members=[];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [base,rows,prefix]of [[appRoot,inventory.files,name+'/resources/app/'],[folder,inventory.runtime,name+'/']])for(const row of rows){if(!require('../assistant-workspace.cjs').safeRelative(row.path))throw Error('Invalid archive path');if(hash(fs.readFileSync(path.join(base,row.path)))!==row.sha256)throw Error('Program changed after release: '+row.path);members.push(prefix+row.path)}
members.push(name+'/resources/app/program-files.json');
if(members.some(file=>/\/cunny\/|\/(?:build|test)-cunny\.cjs|CuNNy移植说明|animesharp|AnimeSharpV4|onnxruntime|\.onnx$/i.test(file)))throw Error('Retired engine still present');
const list=path.join(root,'exports',name+'-members.txt');fs.writeFileSync(list,members.join('\n')+'\n');
if(fs.existsSync(output))fs.unlinkSync(output);
const seven='C:/Program Files/7-Zip/7z.exe';execFileSync(seven,['a','-t7z','-m0=lzma2','-mx=5','-mmt=4','-ms=on','-scsUTF-8',output,'@'+list],{cwd:dist,windowsHide:true,stdio:'inherit'});execFileSync(seven,['t',output],{windowsHide:true,stdio:'inherit'});
console.log(output);
