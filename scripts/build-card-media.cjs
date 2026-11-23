const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const art=JSON.parse(fs.readFileSync(path.join(root,'data/card-art.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/catalog.json'),'utf8'));
const storyByKey=new Map(catalog.map(s=>[s.key,s]));
const exists=p=>fs.existsSync(path.join(root,'cache',p));
const cards=new Map();
for(const [key,a] of Object.entries(art)){
  const id=a.type+'/'+a.id;
  if(!cards.has(id)){
    const images=[{kind:'card',label:a.type==='idols'?'觉醒前':'卡面',path:`images/content/${a.type}/card/${a.id}.jpg`}];
    const movies=[];
    if(a.type==='idols'){
      images.push({kind:'fes',label:'觉醒后',path:`images/content/idols/fes_card/${a.id}.jpg`});
      movies.push({kind:'gasha',label:'觉醒前演出',path:`movies/idols/card/${a.id}.mp4`});
      movies.push({kind:'costume',label:'觉醒后演出',path:`movies/idols/card_costume/${a.id}.mp4`});
    }
    const availableImages=images.filter(x=>exists(x.path));
    const availableMovies=movies.filter(x=>exists(x.path));
    cards.set(id,{id:a.id,type:a.type,name:a.name,images:availableImages,movies:availableMovies,animated:availableMovies.length>0,stories:[]});
  }
  const story=storyByKey.get(key);
  if(story)cards.get(id).stories.push({key,title:story.title,idol:story.idol,group:story.group,category:story.category,translated:!!story.translated,missing:story.missing??0});
}
const names=require('../data/names.json');
for(const file of fs.readdirSync(path.join(root,'research/Album/album'))){if(!/^\d+\.json$/.test(file))continue;const album=JSON.parse(fs.readFileSync(path.join(root,'research/Album/album',file)));for(const [field,type]of [['produceIdols','idols'],['supportIdols','support_idols']])for(const item of album[field]||[]){const key=type+'/'+item.id;if(!cards.has(key))cards.set(key,{id:item.id,type,name:item.name,idol:names[album.name]||album.name,images:[{kind:'card',label:'卡面',path:`images/content/${type}/card/${item.id}.jpg`}],movies:[],animated:false,stories:[]})}}
const supplement=path.join(root,'data/card-supplement.json');if(fs.existsSync(supplement))for(const item of JSON.parse(fs.readFileSync(supplement))){const key=item.type+'/'+item.id;if(!cards.has(key))cards.set(key,{...item,images:[{kind:'card',label:'卡面',path:`images/content/${item.type}/card/${item.id}.jpg`}],movies:[],animated:false,stories:[]});else Object.assign(cards.get(key),{idol:item.idol,collection:item.collection,releaseDate:item.releaseDate,cardType:item.cardType,rarity:item.rarity})}
const official=path.join(root,'research/official-current/card-assets.json');
if(fs.existsSync(official))for(const file of JSON.parse(fs.readFileSync(official))){const m=file.match(/^images\/content\/(idols|support_idols)\/(card|fes_card)\/(\d+)\.jpg$/);if(!m)continue;const key=m[1]+'/'+m[3];if(!cards.has(key))cards.set(key,{id:m[3],type:m[1],name:'名称待核实 · '+m[3],idol:m[3].slice(3,6)==='091'?'七草叶月':'其他',metadataPending:true,images:[],movies:[],animated:false,stories:[]});const card=cards.get(key);if(!card.images.some(x=>x.path===file))card.images.push({kind:m[2]==='fes_card'?'fes':'card',label:m[2]==='fes_card'?'觉醒后':m[1]==='idols'?'觉醒前':'卡面',path:file})}
for(const c of cards.values()){c.rarity=require('../public/card-taxonomy.js').rarity(c);for(const i of c.images)if(c.type==='idols')i.label=i.kind==='fes'?'觉醒后':'觉醒前';}
const output=[...cards.values()].sort((a,b)=>a.id.localeCompare(b.id));
for(const card of output)if(card.metadataPending){const owner=require('../public/home-assets/catalog.json').find(x=>Number(x.id)===Number(card.id.slice(3,6)));if(owner)card.idol=owner.name;card.availabilityNote='官方清单有条目，名称及资源仍待上游补全'}
fs.writeFileSync(path.join(root,'data/card-media.json'),JSON.stringify(output));
const neededFile=path.join(root,'exports/offline-assets-needed.json');
if(fs.existsSync(neededFile)){
  const needed=new Set(JSON.parse(fs.readFileSync(neededFile,'utf8')));
  for(const card of output)for(const item of [...card.images,...card.movies]){if(card.metadataPending&&!exists(item.path))needed.delete(item.path);else needed.add(item.path)}
  fs.writeFileSync(neededFile,JSON.stringify([...needed].sort(),null,2));
}
console.log(`${output.length} cards, ${output.filter(c=>c.animated).length} animated`);
