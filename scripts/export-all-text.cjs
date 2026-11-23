// Export every locally available story line, current translation, and raw text source.
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),stamp='2026-10-15',out=path.join(root,'exports',`全部文本-${stamp}`);
fs.mkdirSync(out,{recursive:true});
const catalog=require('../data/catalog.json'),common=require('../data/common.json'),names=require('../data/names.json');
const norm=s=>String(s||'').trim().replace(/\\r?\\n|\\n|\r\n/g,'\n').replace(/\n+/g,'\n');
const cell=v=>{let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
function writer(file,header){const fd=fs.openSync(path.join(out,file),'w');fs.writeSync(fd,'\ufeff'+header.map(cell).join(',')+'\r\n');let buffer='';return{row(values){buffer+=values.map(cell).join(',')+'\r\n';if(buffer.length>1_000_000){fs.writeSync(fd,buffer);buffer=''}},close(){if(buffer)fs.writeSync(fd,buffer);fs.closeSync(fd)}}}
const columns=['story','category','idol','group','title','track','id','speaker','original','translation','translationSource'];
const rows=writer('01-全部剧情逐句.csv',columns),unavailable=[];let count=0,translated=0;
for(const story of catalog){const file=path.join(root,'cache','json',story.key);if(!fs.existsSync(file)){unavailable.push({story:story.key,title:story.title,reason:'本地无脚本，公开来源可能返回 404'});continue}
 let tracks;try{tracks=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(tracks))throw Error('not an array')}catch(e){unavailable.push({story:story.key,title:story.title,reason:'脚本无法解析：'+e.message});continue}
 let source={rows:[]};try{source=JSON.parse(fs.readFileSync(path.join(root,'data','translations',story.key),'utf8'))}catch{}
 const byId=new Map(),byText=new Map();for(const r of source.rows||[]){if(!r.trans?.trim())continue;if(r.id&&!/^0+$/.test(r.id)&&r.id!=='select'){const list=byId.get(String(r.id))||[];list.push(r);byId.set(String(r.id),list)}byText.set(norm(r.text),norm(r.trans))}
 tracks.forEach((t,i)=>{const value=t.text||t.select;if(!value)return;const original=norm(value),idRows=byId.get(String(t.id));let translation='',translationSource='';const exact=idRows?.find(r=>norm(r.text)===original);if(exact?.trans){translation=norm(exact.trans);translationSource='剧情译文-编号'}else if(idRows?.length===1&&idRows[0].trans){translation=norm(idRows[0].trans);translationSource='剧情译文-单项编号'}else if(byText.has(original)){translation=byText.get(original);translationSource='剧情译文-原文匹配'}else if(common[original]){translation=common[original];translationSource='公共词典'}if(translation)translated++;count++;rows.row([story.key,story.category,story.idol,story.group,story.title,i+1,t.id||'',names[t.speaker]||t.speaker||'',original,translation,translationSource])});
}
rows.close();
const home=require('../public/home-assets/catalog.json'),voices=writer('02-主页语音.csv',['idol','voiceId','label','speaker','original','translation','path','touchRegion','requiredTrust']);let voiceCount=0;for(const idol of home)for(const v of idol.voices){voices.row([idol.name,v.id,v.label||'',v.speaker||'',v.original||'',v.translation||'',v.path,v.touchRegion||'',v.requiredTrust||0]);voiceCount++}voices.close();
const outfits=writer('03-偶像与服装名称.csv',['idolId','idol','outfitId','outfitLabel','resourcePath']);for(const idol of home)for(const o of idol.outfits)outfits.row([idol.id,idol.name,o.id,o.label,o.path]);outfits.close();
const terms=writer('04-公共译文.csv',['original','translation']);for(const [a,b]of Object.entries(common))terms.row([a,b]);terms.close();
const people=writer('05-人物名称.csv',['original','translation']);for(const [a,b]of Object.entries(names))people.row([a,b]);people.close();
fs.writeFileSync(path.join(out,'06-无法取得脚本.json'),JSON.stringify(unavailable,null,2));
const raw=path.join(out,'原始剧情脚本');fs.cpSync(path.join(root,'cache','json'),raw,{recursive:true});
const dataDir=path.join(out,'原始数据');fs.mkdirSync(dataDir,{recursive:true});for(const [from,to]of[['data/catalog.json','catalog.json'],['data/translations.json','translations.json'],['data/common.json','common.json'],['data/names.json','names.json'],['public/home-assets/catalog.json','home-catalog.json']])fs.copyFileSync(path.join(root,from),path.join(dataDir,to));
const uiDir=path.join(out,'界面文字源码');fs.mkdirSync(uiDir,{recursive:true});for(const name of ['index.html','library.html','guide.html'])fs.copyFileSync(path.join(root,'public',name),path.join(uiDir,name));
const summary={catalog:catalog.length,availableScripts:catalog.length-unavailable.length,unavailableScripts:unavailable.length,storyTextRows:count,rowsWithChinese:translated,rowsWithoutChinese:count-translated,homeVoices:voiceCount,scope:'当前本地公开资料快照；不是官方全游戏资源；部分文字可能是字幕控制、选项或重复台词。'};
fs.writeFileSync(path.join(out,'统计.json'),JSON.stringify(summary,null,2));fs.writeFileSync(path.join(out,'请先阅读.txt'),`全部文本导出：${stamp}\r\n\r\n01 为可取得脚本的逐句总表，日文原文与现有中文并排。translation 为空表示当前本地资料未匹配到中文。翻译来源字段说明匹配方式。\r\n02-05 为主页语音、服装、公共译文和人物名称。原始剧情脚本、原始数据和界面文字源码保留原貌，便于其他 AI 再处理。\r\n06 列出无法取得原文脚本的剧情，不能凭空补齐。\r\nCSV 为 UTF-8 BOM；为了避免 Excel 把文本当公式，特定开头加安全前缀。需要完全原值时使用原始 JSON。\r\n当前统计：${JSON.stringify(summary)}\r\n`);
const zip=path.join(root,'exports',`全部文本-${stamp}.zip`);if(fs.existsSync(zip))fs.unlinkSync(zip);execFileSync('tar.exe',['-a','-cf',zip,'-C',path.join(root,'exports'),`全部文本-${stamp}`],{stdio:'inherit'});console.log({...summary,zip,zipMiB:(fs.statSync(zip).size/1048576).toFixed(1)});
