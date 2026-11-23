// Display names come from explicit album/card metadata, never numeric proximity.
const fs=require('node:fs'),path=require('node:path');
const read=(root,file,fallback)=>{try{return JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))}catch{return fallback}};
const known=name=>typeof name==='string'&&name.trim()&&!/名称待|待核实|待确认/.test(name);
function albums(dir){const entries={};if(!fs.existsSync(dir))return entries;for(const file of fs.readdirSync(dir).filter(f=>/^\d+\.json$/.test(f))){const album=read(dir,file,{});for(const c of album.idolCostumes||[]){const id=String(c.isSkin?c.idolId:c.id);if(!/^\d{10}$/.test(id)||!known(c.name)||String(Number(id.slice(3,6)))!==String(Number(album.id)))continue;entries[id]={id,characterId:String(album.id),name:c.name,comment:typeof c.comment==='string'?c.comment:'',kind:c.kind,skin:!!c.isSkin,source:'https://github.com/ShinyColorsDB/ShinyColorsDB-Album/blob/master/album/'+file}}}return entries}
function load(dataDir,fallbackDir){return{...read(fallbackDir,'model-labels.json',{}).entries,...read(dataDir,'model-labels.json',{}).entries}}
function decorate(home,cards,entries){const cardMap=new Map(cards.filter(c=>!c.metadataPending&&known(c.name)).map(c=>[c.id,c]));return home.map(p=>({...p,outfits:(p.outfits||[]).map(o=>{
 const id=o.id||o.path?.split('/').at(-2),category=o.path?.split('/')[2],costume=entries[id],card=cardMap.get(id),pending=/名称待|待核实|待确认/.test(o.label||'')||/^官方模型 · \d+(?: ·|$)/.test(o.label||'');
 if(!pending&&o.source!=='official-index')return o;
 const sameOwner=costume&&String(Number(costume.characterId))===String(Number(p.id)),applicable=sameOwner&&(category==='stand_gasha'||category==='stand'&&['plain','all'].includes(costume.kind)||category==='stand_costume'&&['concert','all'].includes(costume.kind));
 const name=applicable?category==='stand_costume'&&!costume.skin?costume.comment||costume.name:costume.name:card?.name;
 if(!known(name))return{...o,metadataPending:pending};
 const type={stand:'日常服装',stand_costume:'舞台服装',stand_gasha:'服装展示',stand_jersey:'运动服模型'}[category]||'剧情模型';
 return{...o,label:type+' · '+name,metadataPending:false,nameSource:applicable?costume.source:'public-card-metadata'};
 })}))}
function home(dataDir,fallbackDir,baseHome){const rows=read(dataDir,'home-catalog.json',baseHome),cards=read(dataDir,'card-media.json',read(fallbackDir,'card-media.json',[]));return decorate(rows,cards,load(dataDir,fallbackDir))}
module.exports={albums,load,decorate,home};
