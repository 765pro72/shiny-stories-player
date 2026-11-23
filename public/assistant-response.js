/* Providers may wrap the tool envelope in prose or a Markdown code fence. */
((root)=>{
 function envelope(value){return value&&typeof value==='object'&&!Array.isArray(value)&&('reply'in value||'actions'in value)}
 function checked(value){if(!envelope(value)||value.reply!==undefined&&typeof value.reply!=='string'||value.actions!==undefined&&(!Array.isArray(value.actions)||value.actions.length>10))throw Error('AI返回的任务格式无效');return{reply:value.reply||'',actions:value.actions||[]}}
 function parse(text){const raw=String(text).trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');let direct;try{direct=JSON.parse(raw)}catch{}if(direct!==undefined)return checked(direct);
  for(let start=0;start<raw.length;start++){if(raw[start]!=='{')continue;let depth=0,quoted=false,escaped=false;for(let end=start;end<raw.length;end++){const c=raw[end];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}if(c==='"')quoted=true;else if(c==='{')depth++;else if(c==='}'&&!--depth){let value;try{value=JSON.parse(raw.slice(start,end+1))}catch{}if(envelope(value))return checked(value);start=end;break}}}
  if(raw.startsWith('{')||/"(?:reply|actions)"\s*:/.test(raw))throw Error('AI返回的任务格式不完整，请重试或增加输出长度');return{reply:raw,actions:[]};
 }
 function display(text){try{return parse(text).reply}catch{const value=String(text),at=value.search(/\{\s*"(?:reply|actions)"\s*:/);return(at>=0?value.slice(0,at).trim():'')+'\n（这条旧回复的工具指令不完整，未执行；可重新发送问题。）'}}
 const api={parse,display};if(typeof module==='object')module.exports=api;else root.AssistantResponse=api;
})(globalThis);
