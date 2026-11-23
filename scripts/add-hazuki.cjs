// Reuse original staff models and existing credited story translations.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const catalog=read('public/home-assets/catalog.json');
const choices=[['produce_events/100100101.json','1901001010030'],['produce_events/100100101.json','1901001010040'],['produce_events/100100101.json','1901001010110'],['produce_events/100200504.json','1002005040190']];
const voices=choices.map(([key,id],i)=>{
 const row=read('cache/json/'+key).find(r=>String(r.id)===id),translation=read('data/translations/'+key);
 const translated=translation.rows.find(r=>String(r.id)===id);
 if(!row?.voice)throw Error('Missing Hazuki voice '+id);
 return{id:'story_hazuki_'+id,label:'剧情原声 '+(i+1),homeVoice:true,path:'sounds/voice/events/'+row.voice+'.m4a',animations:[row.charAnim1||'wait1',row.charAnim2||'blank',row.charAnim3||'',row.charAnim4||''],lip:row.charLipAnim||'lip_smile_s',original:row.text.replace(/\r\n/g,'\n'),translation:translated?.trans||'',translationSource:translation.translator,speaker:'叶月',sourceStory:key,requiredTrust:0};
});
const staff={id:'staff',name:'七草叶月',kind:'staff',outfits:[{key:'staff-plain',id:'staff',label:'事务所服装',path:'spine/sub_characters/stand/staff/data.json'},{key:'staff-swimsuit',id:'staff_swimsuit',label:'泳装',path:'spine/sub_characters/stand/staff_swimsuit/data.json'}],voices};
for(const outfit of staff.outfits)for(const ext of ['json','atlas','png'])if(!fs.existsSync(path.join(root,'cache',outfit.path.replace(/json$/,ext))))throw Error('Missing staff model');
for(const voice of voices)if(!fs.existsSync(path.join(root,'cache',voice.path)))throw Error('Missing staff voice');
const index=catalog.findIndex(x=>x.id==='staff');if(index<0)catalog.push(staff);else catalog[index]=staff;
fs.writeFileSync(path.join(root,'public/home-assets/catalog.json'),JSON.stringify(catalog));
console.log('Added Hazuki: two original outfits, four credited story voices (no invented touch/trust voices).');
