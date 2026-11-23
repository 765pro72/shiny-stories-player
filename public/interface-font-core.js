/* Shared interface font presets. Custom names use fonts installed on this PC. */
((root)=>{
 try{if(!root.desktop&&root.parent&&root.parent!==root&&root.parent.desktop)root.desktop=root.parent.desktop;}catch{}
 // Synchronously apply saved/inherited dark theme before first paint to prevent ANY white/daytime flash!
 try{
  if(root.document&&root.document.documentElement){
   const docEl=root.document.documentElement;
   let th='';
   try{if(root.parent&&root.parent!==root)th=root.parent.document.documentElement.dataset.theme||'';}catch{}
   if(!th)th=root.localStorage?.getItem('shiny.theme')||'';
   if(th==='dark'){docEl.dataset.theme='dark';docEl.style.backgroundColor='#0c0f18';}
   else if(th==='light'){docEl.dataset.theme='light';}
  }
 }catch{}
 const fonts=[
  {id:'default',name:'默认黑体',family:'"Microsoft YaHei", "Yu Gothic", Meiryo, sans-serif'},
  {id:'song',name:'宋体',family:'SimSun, "Yu Mincho", serif'},
  {id:'hei',name:'黑体',family:'SimHei, "Yu Gothic", sans-serif'},
  {id:'kai',name:'楷体',family:'KaiTi, STKaiti, "Yu Mincho", serif'},
  {id:'fangsong',name:'仿宋',family:'FangSong, STFangsong, "Yu Mincho", serif'},
  {id:'round',name:'圆体',family:'YouYuan, "Hiragino Maru Gothic ProN", "Microsoft YaHei", sans-serif'},
  {id:'mincho',name:'日文明朝体',family:'"Yu Mincho", "MS Mincho", SimSun, serif'},
  // Bundled official webfonts (public/fonts.css). Split parts are separate
  // families so missing glyphs fall through to the next subset.
  {id:'official-humming',name:'官方正文体（Humming）',family:'"PrimulaHummingA", "PrimulaHummingB", "Microsoft YaHei", "Yu Gothic", sans-serif',faces:['PrimulaHummingA','PrimulaHummingB']},
  {id:'official-kakugo',name:'官方黑体（UD角ゴ）',family:'"PrimulaKakugoA", "PrimulaKakugoB", "Microsoft YaHei", "Yu Gothic", sans-serif',faces:['PrimulaKakugoA','PrimulaKakugoB']},
  {id:'official-qingyin',name:'官方中文字体（清音体）',family:'"PrimulaQingyin", "Microsoft YaHei", SimSun, serif',faces:['PrimulaQingyin']},
  {id:'custom',name:'自定义本机字体',family:''}
 ];
 function validate(value){if(value===undefined)return;if(!value||typeof value!=='object'||Array.isArray(value)||!fonts.some(f=>f.id===value.font)||!Number.isFinite(value.size)||value.size<60||value.size>180||value.uiSize!==undefined&&(!Number.isFinite(value.uiSize)||value.uiSize<80||value.uiSize>150))throw Error('字体或字号无效');if(value.family!==undefined&&(typeof value.family!=='string'||value.family.length>120||/[\x00-\x1f"';{}<>\\]/.test(value.family)))throw Error('自定义字体名称无效')}
 function family(value){validate(value);const chosen=fonts.find(f=>f.id===(value?.font||'official-qingyin'))||fonts[0];return chosen.id==='custom'&&value.family?.trim()?'"'+value.family.trim()+'", '+fonts[0].family:chosen.family||fonts[0].family}
 const api={fonts,validate,family};if(typeof module==='object')module.exports=api;else root.InterfaceFontCore=api;
})(typeof window==='object'?window:globalThis);
