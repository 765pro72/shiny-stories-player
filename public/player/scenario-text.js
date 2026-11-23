/* Translation bridge. Raw official tracks are never modified. */
((root)=>{
 const norm=s=>String(s||'').trim().replace(/\\r?\\n|\\n|\r\n/g,'\n').replace(/\n+/g,'\n');
 function annotate(raw,translation={},names={},common={},overrides={},language='zh'){
   const producerRe=/^(?:制作人|製作人|プロデューサー|producer|p)(?:[（(].*[）)])?$/i;let producerName='';try{producerName=(localStorage.getItem('shiny.producerName')||'').trim()}catch(e){}const speakerLabel=name=>{const text=String(name==null?'':name);return producerName&&producerRe.test(text.replace(/[\s\u3000]/g,''))?producerName:text};
  const byId=new Map(),byText=new Map();
  for(const r of translation.rows||[]){if(!r.trans?.trim())continue;if(r.id&&!r.exactOnly&&!/^0+$/.test(r.id)&&r.id!=='select'){const a=byId.get(String(r.id))||[];a.push(r);byId.set(String(r.id),a)}byText.set(norm(r.text),norm(r.trans))}
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k)?o[k]:'';const rows=[];
  const tracks=raw.map((t,index)=>{const e={...t,_storyIndex:index},text=t.text||t.select;if(!text)return e;
   const original=norm(text),match=byId.get(String(t.id)),tr=own(overrides,original)||own(overrides,text)||norm(match?.find(r=>norm(r.text)===original)?.trans)||(!match||match.length!==1?'':norm(match[0].trans))||byText.get(original)||own(common,original)||'';
   const display=language==='jp'?original:language==='both'&&tr?tr+'\n'+original:tr||original;
   if(t.text)e.text=display;else e.select=display;
   rows.push({id:String(t.id||index),speaker:speakerLabel(names[t.speaker]||t.speaker||'选项'),original,translation:tr,previous:norm(raw.slice(0,index).findLast(x=>x.text)?.text),next:norm(raw.slice(index+1).find(x=>x.text)?.text)});
   return e;
  });return{tracks,rows};
 }
 const api={norm,annotate};if(typeof module==='object')module.exports=api;else root.ScenarioText=api;
})(typeof window==='object'?window:globalThis);
