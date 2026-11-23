/* Visual directory helpers; existing controls still own navigation/filtering. */
(()=>{
 function stats(key,items){const host=document.querySelector('#'+key+'Stats');if(!host)return;host.replaceChildren(...items.map(([value,label])=>{const node=document.createElement('div'),n=document.createElement('b'),text=document.createElement('span');node.className='collection-stat';n.textContent=Number(value).toLocaleString();text.textContent=label;node.append(n,text);return node}));}
 function portraitButton(button,who,host=button){
  if(button.dataset.portraitMounted)return;button.dataset.portraitMounted='true';
  const face=document.createElement('span');face.setAttribute('aria-hidden','true');host.prepend(face);CharacterPortraits.mount(face,who);
 }
 function watch(selector,decorate){const host=document.querySelector(selector);if(!host)return;const update=()=>decorate(host);new MutationObserver(update).observe(host,{childList:true,subtree:true});update();}
 watch('.card-archive #unitIndex',host=>{for(const button of host.querySelectorAll('.card-idol button')){const name=button.dataset.idol||[...button.childNodes].find(n=>n.nodeType===3)?.textContent.trim();if(name)portraitButton(button,name)}});
 watch('.page-wardrobe #idolIndex',host=>{for(const button of host.querySelectorAll('button'))portraitButton(button,button.dataset.id)});
 watch('.page-voice #list',host=>{for(const button of host.querySelectorAll('.voice[data-character-id]'))portraitButton(button,button.dataset.characterId,button.querySelector('strong'))});
 window.ModuleDirectory={
  stats,
  setCards(rows){window.ShinyBanners?.setCards(rows)},
  wardrobeCover(person,cardId){window.ShinyBanners?.setContext('wardrobe',{owner:person.id,cardId})},
  wardrobe(person){
   const host=document.querySelector('#wardrobePortrait');if(host)CharacterPortraits.mount(host,person.id);
   document.querySelector('#wardrobeOwnerName').textContent=person.name;
   const outfits=[...new Map(person.outfits.map(o=>[o.path,o])).values()];
   document.querySelector('#wardrobeTotal').textContent=' · '+outfits.length+' 套衣装与模型';
   window.ShinyBanners?.setContext('wardrobe',{owner:person.id,cardId:outfits[0]?.id});
  },
  voiceIndex(rows){
   stats('voice',[[rows.length,'语音条目'],[new Set(rows.map(r=>r.characterId)).size,'位角色'],[rows.filter(r=>r.kind==='电话').length,'组完整电话'],[rows.filter(r=>r.kind==='扮演主页').length,'条扮演语音']]);
   const host=document.querySelector('#voiceKinds');if(!host)return;
   for(const kind of ['','电话','主页语音','扮演主页','组合对话','信件语音','卡片语音','其他语音']){
    const count=kind?rows.filter(v=>v.kind===kind).length:rows.length;if(!count&&kind)continue;
    const button=document.createElement('button');button.type='button';button.dataset.kind=kind;button.textContent=kind||'全部';const number=document.createElement('small');number.textContent=count.toLocaleString();button.append(number);
    button.onclick=()=>{const select=document.querySelector('#kind');select.value=kind;select.dispatchEvent(new Event('change',{bubbles:true}))};host.append(button);
   }
  },
  voiceFilter(kind,rows){
   const title=document.querySelector('#voiceSectionTitle');if(title)title.textContent=kind==='电话'?'她的来电':kind||'全部语音';const heading=document.querySelector('.collection-page-head h1'),sub=document.querySelector('.collection-page-head .sub');if(heading)heading.textContent=kind==='电话'?'电话':'语音馆';if(sub)sub.textContent=kind==='电话'?'接起熟悉的声音，把这一刻留在耳边。':'倾听她的声音，重温每一次心动。';
   window.ShinyBanners?.setContext('voice',{owner:document.querySelector('#idol').value||rows[0]?.characterId||'1'});
   for(const link of document.querySelectorAll('.site-nav a')){const href=link.getAttribute('href');if(href==='voice-gallery.html'||href==='voice-gallery.html?kind=电话'){const active=(kind==='电话')===(href.includes('?'));link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')}}const counts=new Map([['',rows.length]]);for(const row of rows)counts.set(row.kind,(counts.get(row.kind)||0)+1);for(const button of document.querySelectorAll('#voiceKinds button')){button.setAttribute('aria-pressed',String(button.dataset.kind===kind));const count=counts.get(button.dataset.kind)||0;button.querySelector('small').textContent=count.toLocaleString();button.disabled=!count&&button.dataset.kind!==kind;}
  }
 };
})();
