(()=>{
 const excluded=new Set(['1040010120','1040020120','1040030120','1040040110','1040050130','1040060120','1040070120','1040080120','1040090120','1040100120','1040110120','1040120120','1040130110','1040140110','1040150120','1040160120','1040170100','1040180100','1040190100','1040200090','1040210090','1040220100','1040230080','1040240080','1040250080','1040260050','1040270050','1040280050']);
 window.matchHomeConversations=(conversations,members)=>conversations.flatMap(c=>{
  if(c.kind==='normal'){
   const slots={};for(const id of c.requiredCharacters){const member=members.find(m=>String(m.characterId)===String(id)&&!m.isPrelude);if(!member)return[];slots[id]=member.slot}
   if(c.sequence.some(v=>slots[v.characterId]===undefined))return[];
   return[{...c,lines:c.sequence.map(v=>({...v,slot:slots[v.characterId]}))}];
  }
  const owner=members.find(m=>m.cardId===c.ownerCardId),partnerId=c.characterId===c.ownerCharacterId?c.partnerCharacterId:c.characterId;
  const partner=members.find(m=>m.characterId===partnerId&&!m.isPrelude&&!excluded.has(m.cardId));
  if(!owner||!partner||owner.slot===partner.slot)return[];
  const slots={[owner.characterId]:owner.slot,[partner.characterId]:partner.slot};if(c.sequence.some(v=>slots[v.characterId]===undefined))return[];
  return[{...c,lines:c.sequence.map(v=>({...v,slot:slots[v.characterId]}))}];
 });
})();
