// Local, pinned Android build tools. Does not modify system PATH or Windows.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{pipeline}=require('stream/promises'),{Readable}=require('stream'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),base=path.join(root,'android-toolchain'),downloads=path.join(base,'downloads'),seven=path.join(root,'vendor/7zip/7z.exe');fs.mkdirSync(downloads,{recursive:true});
async function download(url,name,checksum,algorithm='sha1'){
 const file=path.join(downloads,name);const good=()=>fs.existsSync(file)&&(!checksum||crypto.createHash(algorithm).update(fs.readFileSync(file)).digest('hex')===checksum);if(good()){console.log('CACHED',name);return file}
 console.log('DOWNLOAD',name);const response=await fetch(url,{signal:AbortSignal.timeout(600000)});if(!response.ok)throw Error(name+' HTTP '+response.status);await pipeline(Readable.fromWeb(response.body),fs.createWriteStream(file+'.part'));if(checksum&&crypto.createHash(algorithm).update(fs.readFileSync(file+'.part')).digest('hex')!==checksum)throw Error('Checksum mismatch '+name);fs.renameSync(file+'.part',file);console.log('DOWNLOADED',name,fs.statSync(file).size);return file;
}
function extract(file,out){fs.mkdirSync(out,{recursive:true});execFileSync(seven,['x','-y','-bd','-o'+out,file],{windowsHide:true,stdio:'pipe'});console.log('EXTRACTED',path.basename(file))}
async function setup(){const info=JSON.parse(fs.readFileSync(path.join(root,'research/android/tool-downloads.json'))),jdk=JSON.parse(fs.readFileSync(path.join(root,'research/android/jdk17.json')))[0].binary.package;
 const jobs=[{url:jdk.link,name:jdk.name,checksum:jdk.checksum,algorithm:'sha256',out:'java'},...['cmdline-tools;latest','platforms;android-35','build-tools;35.0.0','ndk;28.2.13676358','platform-tools','emulator'].map(key=>({...info[key][0],name:info[key][0].url,url:'https://dl.google.com/android/repository/'+info[key][0].url,out:({'cmdline-tools;latest':'commandline','platforms;android-35':'sdk/platforms','build-tools;35.0.0':'sdk/build-tools','ndk;28.2.13676358':'ndk','platform-tools':'sdk','emulator':'sdk'})[key]}))];
 let at=0;await Promise.all(Array.from({length:3},async()=>{while(at<jobs.length){const job=jobs[at++],out=path.join(base,job.out),marker=path.join(out,'.'+job.name+'.ready');if(fs.existsSync(marker)){console.log('READY',job.name);continue}const file=await download(job.url,job.name,job.checksum,job.algorithm);extract(file,out);fs.writeFileSync(marker,new Date().toISOString())}}));
 console.log('Toolchain downloaded. Direct build uses javac / aapt2 / d8 / clang / zipalign / apksigner.');
}
module.exports={download,extract,base};if(require.main===module)setup().catch(e=>{console.error(e.message);process.exitCode=1});
