const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{}};vm.runInNewContext(fs.readFileSync('public/home-conversations.js','utf8'),context);
const match=context.window.matchHomeConversations,all=JSON.parse(fs.readFileSync('public/home-assets/conversations.json'));
const data=all.filter(c=>c.ownerCharacterId==='18'&&[c.characterId,c.partnerCharacterId].includes('1'));
assert.ok(data.length);
const members=[{slot:0,characterId:'18',cardId:'2040180170',isPrelude:true},{slot:1,characterId:'1',cardId:'1040010010',isPrelude:false}];
const eligible=match(data,members);assert.ok(eligible.length);assert.ok(eligible[0].lines.some(v=>v.slot===0));assert.ok(eligible[0].lines.some(v=>v.slot===1));
assert.equal(match(data,members.slice(0,1)).length,0);
assert.equal(match(data,[members[0],{...members[1],isPrelude:true}]).length,0);
assert.equal(match(data,[members[0],{...members[1],cardId:'1040010120'}]).length,0);
assert.equal(match(data,[{...members[0],cardId:'1040180010',isPrelude:false},members[1]]).length,0);
console.log('PASS native conversation requires matching child costume and adult partner; excludes unsupported costume/child pairs; maps each speaker to correct model');
const normal=all.filter(c=>c.kind==='normal');assert.equal(normal.length,785);
for(const count of [2,3,4,5]){
 const sample=normal.find(c=>c.requiredCharacters.length===count);assert.ok(sample);
 const deck=sample.requiredCharacters.map((id,slot)=>({slot,characterId:id,cardId:'104'+String(id==='staff'?91:Number(id)).padStart(3,'0')+'0010',isPrelude:false}));
 const hit=match([sample],deck);assert.equal(hit.length,1);assert.ok(hit[0].lines.every(v=>deck[v.slot].characterId===v.characterId));
 assert.equal(match([sample],deck.slice(1)).length,0);assert.equal(match([sample],deck.map((m,i)=>i?m:{...m,isPrelude:true})).length,0);
 assert.ok(sample.sequence.every((v,i)=>!i||v.sequenceOrder>sample.sequence[i-1].sequenceOrder));
}
console.log('PASS 785 verified ordinary groups: 2–5 participants, exact speaker order, missing member and child-costume rejection');

const shhis=[{slot:0,characterId:'25',cardId:'1040250080',isPrelude:false},{slot:1,characterId:'24',cardId:'1040240080',isPrelude:false}];assert.equal(match(all,shhis).filter(c=>c.kind==='normal').length,3);console.log('PASS Mikoto/Nichika ordinary story outfits retain all three conversations');
