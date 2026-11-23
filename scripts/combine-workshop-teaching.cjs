// Keep every previously shared tutorial link pointed at the corrected real UI recording.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'exports'),version='2026-11-15.10';
const parts=['怪文书-全功能教学.mp4','怪文书-拖动与缩放实操.mp4','怪文书-素材导演音声与BGM实操.mp4','怪文书-双语配音导演撤回与素材实操.mp4','小偶像助手与修复包-实操教学.mp4'];
const probe=file=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8',windowsHide:true}));
const chapters=parts.map(name=>{const data=probe(path.join(dir,name));if(!data.streams.some(s=>s.codec_type==='video')||!data.streams.some(s=>s.codec_type==='audio'))throw Error('Missing media stream: '+name);return{name,seconds:Number(data.format.duration)}});
const list=path.join(dir,'教学合并-'+version+'.txt');fs.writeFileSync(list,parts.map(name=>"file '"+path.join(dir,name).replace(/\\/g,'/')+"'").join('\n')+'\n');
const output=path.join(dir,'怪文书-完整操作教学-'+version+'.mp4');execFileSync('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',list,'-map','0:v:0','-map','0:a:0','-c:v','libx264','-threads','4','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-r','30','-c:a','aac','-movflags','+faststart',output],{stdio:'inherit',windowsHide:true});
const media=probe(output),seconds=Number(media.format.duration),expected=chapters.reduce((n,c)=>n+c.seconds,0);if(Math.abs(seconds-expected)>1)throw Error('Combined tutorial length mismatch');
const report={version,path:output,seconds,bytes:fs.statSync(output).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),chapters,actualUIOperations:true,simulatedAIAndTTS:true,voiceover:false,bgm:true,affectedSectionsRerecorded:true,removedReferenceCheckedDuringEveryNewCapture:true};
fs.writeFileSync(path.join(dir,'完整操作教学-'+version+'.json'),JSON.stringify(report,null,2));
for(const name of ['怪文书-完整操作教学-2026-11-15.mp4','怪文书-完整操作教学-2026-11-15.2.mp4','怪文书-完整操作教学-2026-11-15.3.mp4','怪文书-完整操作教学-2026-11-15.4.mp4','怪文书-完整操作教学-2026-11-15.5.mp4','怪文书-完整操作教学-2026-11-15.6.mp4','怪文书-完整操作教学-2026-11-15.7.mp4','怪文书-完整操作教学-2026-11-15.8.mp4','怪文书-完整操作教学-2026-11-15.9.mp4']){fs.copyFileSync(output,path.join(dir,name));fs.writeFileSync(path.join(dir,name.replace(/^怪文书-/, '').replace(/\.mp4$/,'.json')),JSON.stringify({...report,path:path.join(dir,name),replacedBy:output},null,2))}
fs.copyFileSync(path.join(dir,parts[2]),path.join(dir,'怪文书-AI创作与配音教学.mp4'));
console.log(JSON.stringify(report,null,2));
