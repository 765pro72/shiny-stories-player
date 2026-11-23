/* Explicit reading plans shared by the editor, archive validator and TTS service. */
((root)=>{
 const languages=['ja','zh','custom','segments'];
 const dictionary=typeof module==='object'?require('./vendor/pinyin-pro.js'):root.pinyinPro;
 function autoReading(text){
  const data=dictionary.pinyin(text,{toneType:'num',type:'all',toneSandhi:false});
  if(data.some(p=>p.isZh&&!/^[a-zü]+[0-5]$/.test(p.pinyin)))throw Error('这段包含无法自动注音的字，请展开读音修正手动填写');
  return data.map(p=>p.isZh?p.pinyin.replace(/0$/,'5'):p.result).join(' ').trim();
 }
 function validate(speech){
  if(speech===undefined)return;
  if(!speech||!languages.includes(speech.language))throw Error('朗读台词无效');
  if(speech.language==='custom'&&(typeof speech.text!=='string'||speech.text.length>10000))throw Error('自定义朗读台词无效');
  if(speech.language!=='segments')return;
  if(!Array.isArray(speech.segments)||!speech.segments.length||speech.segments.length>32)throw Error('一句可设置 1–32 个朗读片段');
  let length=0;
  for(const part of speech.segments){
   if(!part||!['ja','zh'].includes(part.language)||typeof part.text!=='string'||part.text.length>10000||part.reading!==undefined&&(typeof part.reading!=='string'||part.reading.length>10000))throw Error('朗读片段需包含语言、文字和可选读音');
   length+=part.text.length+(part.reading||'').length;
  }
  if(length>20000)throw Error('朗读片段过长，请拆分台词');
 }
 function text(speech){validate(speech);return speech.segments.map(p=>p.text).join('')}
 function signature(speech){validate(speech);return JSON.stringify(speech?.language==='segments'?speech.segments.map(p=>({language:p.language,text:p.text,reading:p.reading||''})):speech)}
 function pinyin(value){
  const s=value.trim().toLowerCase(),parts=s.match(/[a-zü]+[1-5]|[\s，。！？、,.!?…；;：:“”「」『』"'（）()—-]+/g)||[];
  if(!s||parts.join('')!==s||!parts.some(p=>/^[a-zü]+[1-5]$/.test(p)))throw Error('中文读音请填带声调数字的拼音，例如 wo3 ai4 ni3；标点可保留');
  return parts.map(p=>/^[a-zü]+[1-5]$/.test(p)?'<|phoneme_start|>'+p+'<|phoneme_end|>':p.replace(/\s/g,'')).join('');
 }
 function compile(speech,provider){
  validate(speech);if(speech?.language!=='segments')throw Error('缺少分段朗读设置');
  const output=speech.segments.map((part,index)=>{
   if(!part.text.trim()&&!part.reading?.trim())return'';
   if(!part.text.trim())throw Error('第 '+(index+1)+' 段缺少台词文字');
   if(part.language==='zh'){
    if(provider!=='fish')throw Error('当前兼容接口没有统一的中文读音控制协议；请切换 Fish Audio，或改用普通朗读并试听');
    const reading=part.reading?.trim()||autoReading(part.text);
    const suffix=part.text.match(/[，。！？、,.!?…；;：:“”」』"'）)—-]+$/)?.[0]||'';
    return pinyin(reading)+(/[，。！？、,.!?…；;：:“”」』"'）)—-]$/.test(reading.trim())?'':suffix);
   }
   if(part.reading?.trim()){
    if(!/^[\p{Script=Hiragana}\p{Script=Katakana}\sー・、。！？,.!?…「」『』（）()～〜—-]+$/u.test(part.reading))throw Error('第 '+(index+1)+' 段日语读音请用假名填写；正常日语台词可留空读音');
    return part.reading;
   }
   if(/\p{Script=Han}/u.test(part.text)&&!/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(part.text))throw Error('第 '+(index+1)+' 段日语只有汉字，请填写假名读音，避免被当作中文');
   return part.text;
  }).join('');
  if(!output.trim())throw Error('请先填写朗读片段');
  if(output.length>10000)throw Error('读音标注展开后超过接口长度限制，请拆分台词');
  return output;
 }
 const api={validate,text,signature,pinyin,compile,autoReading};if(typeof module==='object')module.exports=api;else root.StorySpeech=api;
})(typeof window==='object'?window:globalThis);
