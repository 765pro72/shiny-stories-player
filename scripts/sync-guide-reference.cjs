const fs=require('fs'),path=require('path'),os=require('os');
const {spawn}=require('child_process');const http=require('http');
const root=path.resolve(__dirname,'..');
const CHROME_CANDIDATES=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
const chrome=CHROME_CANDIDATES.find(p=>fs.existsSync(p));
if(!chrome){console.log(JSON.stringify({skipped:'no browser'}));process.exit(0)}
const DOC='https://docs.qq.com/aio/DTHRnREJ1TWdHWE9D';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=9370+Math.floor(Math.random()*40);
const get=p=>new Promise((res,rej)=>{http.get({host:'127.0.0.1',port,path:p},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d||'{}')))}).on('error',rej)});
(async()=>{
 const profile=path.join(os.tmpdir(),'shiny-doc-sync');
 const child=spawn(chrome,['--headless=new','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+profile,'--window-size=1500,1200','about:blank'],{stdio:'ignore'});
 let list=null;for(let i=0;i<80&&!list;i++){await sleep(250);try{list=await get('/json/list')}catch(e){}}
 if(!list){console.log(JSON.stringify({skipped:'no devtools'}));child.kill();process.exit(0)}
 const page=list.find(t=>t.type==='page');const ws=new WebSocket(page.webSocketDebuggerUrl);
 const pending=new Map();let id=0;
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id)}});
 const send=(method,params={})=>new Promise(res=>{const i=++id;pending.set(i,res);ws.send(JSON.stringify({id:i,method,params}))});
 await new Promise(r=>ws.addEventListener('open',r));
 await send('Page.enable');await send('Runtime.enable');
 await send('Page.navigate',{url:DOC});await sleep(11000);
 const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});return r.result&&r.result.result?r.result.result.value:null};
 await ev(`(()=>{const t=[...document.querySelectorAll('*')].filter(x=>x.children.length===0&&/剧情整合/.test(x.textContent||''));if(t.length)t[t.length-1].click();return t.length})()`);
 await sleep(9000);
 const text=await ev(`(document.body.innerText||'')`);
 fs.writeFileSync(path.join(root,'tmp','doc-page2.txt'),text||'','utf8');
 console.log(JSON.stringify({bytes:(text||'').length,lines:(text||'').split('\n').length}));
 ws.close();child.kill();process.exit(0);
})().catch(e=>{console.log(JSON.stringify({error:String(e&&e.message||e)}));process.exit(0)});
