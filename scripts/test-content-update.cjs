const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {syncContent}=require('../content-update.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'sc-content-sync-'));
const write=(f,v)=>fs.writeFileSync(path.join(root,f),JSON.stringify(v));
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
(async()=>{try{
 const old='1040010010',fresh='1050019990',voice='sounds/voice/characters/001/producers_cup_9th_voice_1_1.m4a';
 write('home-catalog.json',[{id:'1',name:'真乃',voices:[],outfits:[{id:old,key:'old',path:`spine/idols/stand/${old}/data.json`,label:'old'}]}]);write('home-conversations.json',[]);write('names.json',{});write('catalog.json',[]);write('card-media.json',[{id:old,type:'idols',name:'原有卡',images:[],movies:[],stories:[]}]);write('voice-index.json',[]);write('offline-assets.json',[]);write('card-supplement.json',[]);write('memorial-index.json',[]);
 const keys=[`images/content/idols/card/${fresh}.jpg`,`images/content/idols/fes_card/${fresh}.jpg`,`movies/idols/card/${fresh}.mp4`,`spine/idols/stand/${fresh}/data.json`,voice,'sounds/voice/characters/001/mypage_casting_voice_new.m4a',`sounds/voice/characters/001/mypage_${fresh}_1_1.m4a`];write('update-resource-index.json',{resources:[],stories:[],voices:[]});
 let requests=0;const opts={json:async url=>{requests++;if(url.includes('/idolInfo'))return{cardLists:[{enzaId:fresh,cardName:'新卡',cardType:'P_UR',cardUuid:'new',releaseDate:'2026-11-13',lastModified:'2026-11-13'}]};if(url.includes('CardInfo'))return{enzaId:fresh,cardIdolEvents:[{eventId:999,eventTitle:'卡片故事'}]};return[{voice:`mypage_${fresh}_1_1`,comment:'台词',animation1:'hello'}]},fetchAsset:async()=>{throw Error('媒体不应被下载')}};
 const result=await syncContent(root,root,{newAssets:keys},()=>{},opts);assert.equal(result.newCards,1);assert.equal(result.newModels,1);assert.equal(result.newVoices,3);assert.equal(result.warnings.length,0);
 const c=read('card-media.json').find(c=>c.id===fresh);assert.equal(c.rarity,'UR');assert.equal(c.images.length,2);assert.equal(c.movies.length,1);assert.equal(c.stories[0].title,'卡片故事');assert.equal(read('catalog.json')[0].key,'produce_events/999.json');
 const h=read('home-catalog.json')[0];assert.equal(h.outfits[1].homeVoices[0].animations[0],'hello');assert.equal(h.castingVoices.length,1);assert.equal(read('voice-index.json').find(v=>v.key===voice).kind,'电话');assert.ok(read('offline-assets.json').includes(`spine/idols/stand/${fresh}/data.png`));assert.ok(!fs.existsSync(path.join(root,'asset-cache')));
 const pendingHome=read('home-catalog.json');pendingHome[0].outfits[1].label='官方模型 · 名称待核实 · '+fresh;write('home-catalog.json',pendingHome);
 const again=await syncContent(root,root,{newAssets:keys},()=>{},opts);assert.equal(again.newCards,0);assert.equal(again.newVoices,0);assert.equal(again.newModels,0);assert.equal(read('card-media.json').length,2);assert.equal(read('home-catalog.json')[0].outfits[1].label,'日常服装 · 新卡','An existing placeholder must be renamed on a later update');
 const partial=await syncContent(root,root,{},()=>{},{...opts,json:async()=>{throw Error('network failed')}});assert.ok(partial.warnings.length);assert.equal(read('card-media.json').length,2);assert.equal(read('voice-index.json').length,3);
 console.log('PASS all-content updates: cards/images/movies/rarity/models/voices/phones/casting/story linkage, idempotence, partial-failure preservation, metadata only');
 }finally{fs.rmSync(root,{recursive:true,force:true})}})().catch(e=>{console.error(e);process.exitCode=1});
