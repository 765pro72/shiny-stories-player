/* Record short, attributable game-line evidence without changing source translations. */
const fs=require('node:fs'),path=require('node:path'),L=require('../public/story-character-language.js');
const root=path.resolve(__dirname,'..'),catalog=require('../public/home-assets/catalog.json'),generic=require('../public/home-assets/generic-voices.json');
const rows=L.characters.filter(c=>c.producer.length).map(c=>({...c,evidence:[],counts:{}}));
function add(c,text,source){if(!text)return;for(const call of c.producer){if(!text.includes(call))continue;c.counts[call]=(c.counts[call]||0)+1;if(c.evidence.some(e=>e.call===call)||c.evidence.length>=8)continue;const at=text.indexOf(call);c.evidence.push({call,source,excerpt:text.slice(Math.max(0,at-12),at+call.length+20)});}}
for(const c of rows){for(const v of [...(catalog.find(p=>p.id===c.id)?.voices||[]),...(generic[c.id]||[])])add(c,v.original,v.path);}
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):e.name.endsWith('.json')?[path.join(d,e.name)]:[]);
for(const file of walk(path.join(root,'cache/json'))){const script=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(script))continue;for(const line of script){const c=rows.find(c=>line.speaker===c.short||line.speaker===c.japanese);if(c)add(c,line.text,path.relative(root,file).replaceAll('\\','/')+'#'+(line.id||script.indexOf(line)));}}
const output={checkedAt:new Date().toISOString(),nameReference:'research/idols.json',officialNames:'https://shinycolors.idolmaster-official.jp/idol/',secondaryCrossCheck:'https://wikiwiki.jp/shinycolors/アイドル呼称一覧',note:'代词和粗口出现不等于每次都在称呼制作人；只作语境参考。未改变游戏原文或汉化。',characters:rows};
fs.writeFileSync(path.join(root,'data/story-character-language-evidence.json'),JSON.stringify(output,null,2));
for(const c of rows)console.log(c.japanese,c.producer.map(p=>p+':'+(c.counts[p]||0)).join(' / '));
const missing=rows.filter(c=>!c.evidence.length);console.log('Characters',rows.length,'with game evidence',rows.length-missing.length,'unconfirmed',missing.map(c=>c.japanese));if(missing.length)process.exitCode=1;
