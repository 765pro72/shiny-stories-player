const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
async function sync(){
 const names=require('../data/names.json'),cards=[],ids=[...Array.from({length:28},(_,i)=>i+1),91,801,802,803,804];let next=0;
 await Promise.all(Array.from({length:4},async()=>{while(next<ids.length){const id=ids[next++],r=await fetch('https://api.shinycolors.moe/info/idolInfo?idolId='+id,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('Card index '+id+': '+r.status);const idol=await r.json();for(const c of idol.cardLists||[])if(c.enzaId&&c.cardName)cards.push({id:c.enzaId,type:c.cardType.startsWith('P_')?'idols':'support_idols',name:c.cardName,cardType:c.cardType,rarity:c.cardType.split('_').at(-1),idol:id===91?'七草叶月':names[idol.idolName]||idol.idolName,cardUuid:c.cardUuid,collection:c.getMethod,releaseDate:c.releaseDate,hash:c.cardHash})}}));
 fs.writeFileSync(path.join(root,'data/card-supplement.json'),JSON.stringify(cards));console.log('Public current card metadata:',cards.length,'Prelude:',cards.filter(c=>c.collection==='PreludeCollection').map(c=>c.name));
}
if(require.main===module)sync().catch(e=>{console.error(e);process.exitCode=1});module.exports={sync};
