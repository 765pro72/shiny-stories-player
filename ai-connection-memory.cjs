// Session-only credentials, bound to the exact endpoint and protocol.
const keys=new Map();
const id=c=>[c.provider||'custom',c.protocol||'',String(c.baseURL||'').replace(/\/$/,'')].join('|');
function remember(c){if(c.apiKey)keys.set(id(c),c.apiKey)}
function resolve(c={}){return{...c,apiKey:c.apiKey||keys.get(id(c))||''}}
function clear(){keys.clear()}
module.exports={remember,resolve,clear};
