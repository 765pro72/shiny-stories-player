/* Card identifiers encode rarity; explicit upstream cardType takes precedence. */
(function(root){
  const rank={N:1,R:2,SR:3,SSR:4,UR:5};
  function rarity(card){return card.rarity||card.cardType?.split('_').at(-1)||({1:'N',2:'R',3:'SR',4:'SSR',5:'UR'}[String(card.id||'')[2]])||'other'}
  function compare(a,b,field='date',direction='desc'){
    let n=0;
    if(field==='rarity')n=(rank[rarity(a)]||0)-(rank[rarity(b)]||0);
    else if(field==='name')n=String(a.name||a.label).localeCompare(String(b.name||b.label),'zh-CN');
    else if(field==='id')n=String(a.id||'').localeCompare(String(b.id||''),undefined,{numeric:true});
    else {const ad=String(a.releaseDate||''),bd=String(b.releaseDate||'');if(!ad!==!bd)return ad?-1:1;n=ad.localeCompare(bd)}
    n||=String(a.id||a.key||'').localeCompare(String(b.id||b.key||''),undefined,{numeric:true});
    return direction==='asc'?n:-n;
  }
  const api={rarity,compare,rank};if(typeof module==='object')module.exports=api;else root.CardTaxonomy=api;
})(typeof window==='object'?window:this);
