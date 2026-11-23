/* Shared title artwork. Independent module preferences live in lobby settings. */
(()=>{
 const KEY='moduleBanners',definitions={
  guide:{label:'剧情馆',selector:'.story-overview .overview-art',fallback:{mode:'random'}},
  cards:{label:'卡片相册',selector:'#archiveBannerImage',fallback:{mode:'random'}},
  voice:{label:'语音馆',selector:'#voiceCover',fallback:{mode:'random'}},
  wardrobe:{label:'衣装室',selector:'#wardrobeCover',fallback:{mode:'random'}}
 };
 const current=document.body.matches('.guide-unified')?'guide':document.body.matches('.card-archive')?'cards':document.body.matches('.page-voice')?'voice':document.body.matches('.page-wardrobe')?'wardrobe':null;
 let preferences={},cardsPromise,entriesPromise,settings,dialog,pickerPage,page=0,search,grid,status;
 const contexts={},chosen={},settingsRows=new Map();
 function readPreloadedBanner(key){
  try{
   const raw=JSON.parse(sessionStorage.getItem('shiny.preloadedBanners')||'null');
   return raw&&raw[key]?raw[key]:null;
  }catch{return null;}
 }
 function bindBannerCardJump(image, cardId, cardName, hasMovie){
  const host=image?.closest('section');
  if(!host||!cardId)return;
  host.dataset.bannerCardId=String(cardId);
  host.dataset.bannerHasMovie=hasMovie?'1':'0';
  host.style.cursor='pointer';
  host.title='点击直达这张动态卡面：'+(cardName||cardId);
  if(host.dataset.bannerJumpBound)return;
  host.dataset.bannerJumpBound='1';
  host.addEventListener('click',e=>{
   if(e.target.closest('a,button,input,select'))return;
   const cid=host.dataset.bannerCardId;
   const wantMovie=host.dataset.bannerHasMovie==='1';
   if(!cid)return;
   if(current==='cards'&&typeof window.openCardById==='function'){
    window.openCardById(cid,wantMovie);
    return;
   }
   const url='card-gallery.html?card='+encodeURIComponent(cid)+(wantMovie?'&movie=1':'');
   try{
    if(window.parent!==window&&window.parent.__shinyShell?.navigate){
     window.parent.__shinyShell.navigate(url);
     setTimeout(()=>{
      try{
       const frames=window.parent.document.querySelectorAll('iframe.stage-frame');
       for(const f of frames){
        if(f.dataset.page==='card-gallery.html'){
         f.contentWindow?.postMessage({type:'shiny-open-card',cardId:cid,preferMovie:wantMovie},location.origin);
        }
       }
      }catch{}
     },240);
     return;
    }
   }catch{}
   location.href=url;
  });
 }

 // Pre-hydrate preloaded dynamic card or cached banner instantly (zero static flash)
 if(current){
  try{
   const pre=readPreloadedBanner(current);
   const img=document.querySelector(definitions[current]?.selector);
   if(pre&&img){
    img.src='/asset-original/'+pre.imagePath;
    img.alt=(pre.name||'')+' · 动态卡面';
    img.classList.add('ready');
    if(pre.moviePath)mountBannerVideo(img,'/asset-original/'+pre.moviePath);
    if(pre.cardId)bindBannerCardJump(img,pre.cardId,pre.name,!!pre.moviePath);
   }else{
    const cachedUrl=localStorage.getItem('banner_last_'+current);
    if(cachedUrl&&img&&!img.getAttribute('src')){img.src=cachedUrl;img.classList.add('ready');}
   }
  }catch{}
 }

 function mountBannerVideo(image, movieUrl){
  if(!image||!image.parentElement)return;
  let vid=image.parentElement.querySelector('video.archive-banner-video');
  if(!movieUrl){
   image.classList.remove('video-covered');
   if(vid){try{vid.pause();vid.remove();}catch{}}
   return;
  }
  if(!vid){
   vid=document.createElement('video');
   vid.className=image.className.replace(/\bready\b|\bvideo-covered\b/g,'').trim()+' archive-banner-video';
   vid.muted=true;
   vid.loop=true;
   vid.autoplay=true;
   vid.playsInline=true;
   vid.preload='auto';
   vid.setAttribute('aria-hidden','true');
   image.after(vid);
  }
  if(vid.dataset.movieUrl===movieUrl){
   if(vid.readyState>=2){vid.classList.add('ready');image.classList.add('video-covered');}
   vid.play().catch(()=>{});
   return;
  }
  vid.dataset.movieUrl=movieUrl;
  vid.classList.remove('ready');
  image.classList.remove('video-covered');
  vid.oncanplay=()=>{vid.classList.add('ready');image.classList.add('video-covered');vid.play().catch(()=>{});};
  vid.onerror=()=>{vid.classList.remove('ready');image.classList.remove('video-covered');};
  vid.src=movieUrl;
  vid.load();
  vid.play().catch(()=>{});
 }
 // Resume & randomly decide whether to switch dynamic hero video when Shell activates this tab
 window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.data?.type!=='shiny-shell-visibility')return;
  if(e.data.active){
   if(current&&config(current).mode==='random'){
    const curEntry=chosen[current]?.entry||null;
    const sp=getSharedPool();
    const hasFresh=(sp.userLocalPool.length+sp.readyOnline.length)>0;
    // If still on one-time initial fallback and fresh video is ready -> switch immediately;
    // Otherwise randomly decide (~50% chance) whether to switch or keep current video playing!
    const shouldSwitch=!curEntry||(curEntry.isInitialFallback&&hasFresh)||(hasFresh&&Math.random()<0.52);
    if(shouldSwitch){
     apply(current,true);
     return;
    }
   }
   const v=document.querySelector('video.archive-banner-video');
   if(v){
    if(v.readyState>=2){v.classList.add('ready');v.previousElementSibling?.classList.add('video-covered');}
    v.play().catch(()=>{});
   }
  }else{
   const v=document.querySelector('video.archive-banner-video');
   if(v){try{v.pause();}catch{}}
  }
 });
 try{preferences=JSON.parse(window.desktop?.getState()?.[KEY]||localStorage.getItem(KEY)||'{}')}catch{}
 if(!preferences||typeof preferences!=='object'||Array.isArray(preferences))preferences={};
 if(!preferences.cards)try{const legacy=JSON.parse(window.desktop?.getState()?.archiveBanner||localStorage.getItem('archiveBanner')||'null');if(legacy)preferences.cards=legacy}catch{}
 const config=key=>({...definitions[key].fallback,...preferences[key]});
 function save(){const value=JSON.stringify(preferences);try{localStorage.setItem(KEY,value);window.desktop?.saveState({[KEY]:value})}catch{}renderSettings()}
 function setCards(rows){cardsPromise=Promise.resolve(rows);entriesPromise=null;if(current==='cards')setTimeout(()=>apply(current),600);else if(current)apply(current)}

 const inMemoryCardCache = new Map();
 const inMemoryRandomPool = [];
 const COLLAB_NAMES = new Set(['露比', '有馬かな', '有马加奈', 'MEMちょ', 'MEM啾']);

 function isOfficial283Card(card) {
  if (!card) return false;
  if (card.name?.includes('白いツバサ')) return false;
  if (COLLAB_NAMES.has(card.idol)) return false;
  const charNum = Number(String(card.id || '').slice(3, 6));
  return Number.isFinite(charNum) && charNum >= 1 && charNum <= 28;
 }

 // Shared cross-iframe banner video pool (lives on parent shell so all 4 tabs share preloaded videos!)
 function getSharedPool() {
  const host = (window.parent && window.parent !== window) ? window.parent : window;
  try {
   if (!host.__shinyBannerPool) {
    host.__shinyBannerPool = {
     fallbacks: null,
     fallbackPromise: null,
     fallbackIdSet: new Set(),
     userLocalPool: [], // User-downloaded local movies (always eligible for random draws!)
     userLocalLoaded: false,
     readyOnline: [], // Background-loaded online videos (always eligible once ready!)
     queuedIds: new Set(),
     loading: false,
     initialFallbackRetired: false, // Once initial fallback serves first duty, NEVER re-enter random pool!
     initialFallbackEntry: null, // Hold steady on this single fallback until a new video finishes loading!
     lastShownId: '',
     hasSwappedInitial: {}
    };
   }
   return host.__shinyBannerPool;
  } catch {
   if (!window.__shinyBannerPool) {
    window.__shinyBannerPool = {
     fallbacks: null, fallbackPromise: null, fallbackIdSet: new Set(),
     userLocalPool: [], userLocalLoaded: false,
     readyOnline: [], queuedIds: new Set(), loading: false,
     initialFallbackRetired: false, initialFallbackEntry: null,
     lastShownId: '', hasSwappedInitial: {}
    };
   }
   return window.__shinyBannerPool;
  }
 }

 function loadFallbacks() {
  const sp = getSharedPool();
  if (sp.fallbacks) return Promise.resolve(sp.fallbacks);
  if (sp.fallbackPromise) return sp.fallbackPromise;
  sp.fallbackPromise = fetch('/banner-fallbacks/manifest.json')
   .then(r => r.ok ? r.json() : [])
   .then(list => {
    const arr = Array.isArray(list) ? list : [];
    sp.fallbacks = arr;
    for (const item of arr) sp.fallbackIdSet.add(String(item.cardId));
    return arr;
   })
   .catch(() => { sp.fallbacks = []; return []; });
  return sp.fallbackPromise;
 }

 // Discover user-downloaded local movies (/api/local-banner-movies); these join the permanent random pool!
 function refreshUserLocalMovies(allEntries) {
  const sp = getSharedPool();
  return fetch('/api/local-banner-movies')
   .then(r => r.ok ? r.json() : [])
   .then(paths => {
    if (!Array.isArray(paths) || !paths.length) { sp.userLocalLoaded = true; return sp.userLocalPool; }
    const pathSet = new Set(paths);
    const seen = new Set(sp.userLocalPool.map(x => String(x.cardId)));
    for (const e of allEntries) {
     if (!e.moviePath || !pathSet.has(e.moviePath)) continue;
     if (!isOfficial283Card(e.card)) continue;
     const cid = String(e.card.id);
     if (seen.has(cid)) continue;
     seen.add(cid);
     sp.userLocalPool.push({
      cardId: cid,
      name: e.card.name,
      label: e.label || '本地动态',
      imagePath: e.path,
      moviePath: e.moviePath,
      card: e.card,
      isUserLocal: true
     });
    }
    sp.userLocalLoaded = true;
    return sp.userLocalPool;
   })
   .catch(() => { sp.userLocalLoaded = true; return sp.userLocalPool; });
 }

 const MAX_ONLINE_VIDEOS = 100;

 // Polite 1-at-a-time background preloader for non-fallback, non-collab animated cards
 // Includes BOTH 觉醒前 & 觉醒后 movies; stops automatically once 100 videos are cached!
 function pumpBackgroundOnlineVideo(allEntries, onReady) {
  const sp = getSharedPool();
  if (sp.loading || sp.readyOnline.length >= MAX_ONLINE_VIDEOS) return;
  const userLocalPaths = new Set(sp.userLocalPool.map(x => x.moviePath));
  const candidates = allEntries.filter(e =>
   e.moviePath &&
   isOfficial283Card(e.card) &&
   !sp.fallbackIdSet.has(String(e.card.id)) &&
   !userLocalPaths.has(e.moviePath) &&
   !sp.queuedIds.has(e.moviePath)
  );
  if (!candidates.length) return;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const cid = String(pick.card.id);
  sp.queuedIds.add(pick.moviePath);
  sp.loading = true;

  fetch('/asset-original/' + pick.moviePath)
   .then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.blob();
   })
   .then(blob => {
    if (!blob || blob.size < 30000) throw new Error('small');
    const blobUrl = URL.createObjectURL(blob);
    preloadCardImage(pick.path);
    const item = {
     cardId: cid,
     movieKey: pick.moviePath,
     name: pick.card.name,
     label: pick.label,
     imagePath: pick.path,
     moviePath: pick.moviePath,
     blobUrl,
     card: pick.card,
     isOnline: true
    };
    sp.readyOnline.push(item);
    sp.initialFallbackRetired = true; // New video is ready -> initial bundled fallbacks retire permanently!
    sp.loading = false;
    if (typeof onReady === 'function') onReady(item);
    // Keep politely loading in background up to 100 videos total, then stop!
    if (sp.readyOnline.length < MAX_ONLINE_VIDEOS) {
     setTimeout(() => pumpBackgroundOnlineVideo(allEntries), 3500);
    }
   })
   .catch(() => {
    sp.loading = false;
    if (sp.readyOnline.length < MAX_ONLINE_VIDEOS) {
     setTimeout(() => pumpBackgroundOnlineVideo(allEntries), 5500);
    }
   });
 }

 // Exact anti-fatigue banner picker:
 // 1. Permanent pool = user-downloaded local videos + background-loaded online videos (NEVER initial 8 fallbacks once retired!).
 // 2. If permanent pool has videos:
 //    - If there is another video different from current -> pick randomly from permanent pool (excluding current).
 //    - If only 1 video exists and it's already showing -> KEEP IT STEADY (don't flicker/repeat).
 // 3. If permanent pool is still EMPTY (nothing downloaded & online still buffering):
 //    - Pick ONE initial fallback on very first load, and HOLD IT STEADY (do NOT keep shuffling among the 8 fallbacks!).
 function pickSmartRandomBanner(fallbacks, currentEntry) {
  const sp = getSharedPool();
  const permanentPool = [...sp.userLocalPool, ...sp.readyOnline];
  const curId = String(currentEntry?.cardId || currentEntry?.card?.id || sp.lastShownId || '');

  if (permanentPool.length > 0) {
   sp.initialFallbackRetired = true;
   const others = permanentPool.filter(x => String(x.cardId) !== curId);
   if (others.length > 0) {
    const chosenItem = others[Math.floor(Math.random() * others.length)];
    sp.lastShownId = String(chosenItem.cardId);
    return chosenItem;
   }
   // Only 1 ready video so far: keep playing it steadily without switching back to initial fallbacks!
   const stay = permanentPool[0];
   sp.lastShownId = String(stay.cardId);
   return stay;
  }

  // No user-downloaded or online videos ready yet:
  // If we already picked an initial fallback, HOLD IT STEADY (do not cycle through the 8 fallbacks!)
  if (sp.initialFallbackEntry) {
   return sp.initialFallbackEntry;
  }
  if (!sp.initialFallbackRetired && fallbacks.length > 0) {
   const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)];
   const item = {
    cardId: fb.cardId,
    name: fb.name,
    label: fb.rarity + ' 动态',
    localImage: fb.localImage,
    localMovie: fb.localMovie,
    imagePath: fb.imagePath,
    moviePath: fb.moviePath,
    card: { id: fb.cardId, name: fb.name, idol: fb.idol },
    isInitialFallback: true
   };
   sp.initialFallbackEntry = item;
   sp.initialFallbackRetired = true; // Served its one-time initial fallback duty; won't re-enter random draws!
   sp.lastShownId = String(item.cardId);
   return item;
  }
  return currentEntry || null;
 }

 function preloadCardImage(path) {
  if (!path) return null;
  if (inMemoryCardCache.has(path)) return inMemoryCardCache.get(path);
  const img = new Image();
  img.decoding = 'async';
  img.src = '/asset-original/' + path;
  inMemoryCardCache.set(path, img);
  return img;
 }
 function warmCardMemoryPool(pool) {
  if (!pool || !pool.length || inMemoryRandomPool.length) return;
  const characters = new Set();
  for (const e of pool) {
   if (!isOfficial283Card(e.card)) continue;
   const charId = String(e.card.id).slice(3, 6);
   if (!characters.has(charId) && e.card.type === 'idols' && String(e.card.id)[2] === '4') {
    characters.add(charId);
    inMemoryRandomPool.push(e);
   }
  }
 }

 function entries(){return entriesPromise||=(cardsPromise||=fetch('/data/card-media.json').then(r=>{if(!r.ok)throw Error('卡面目录暂未载入');return r.json()}).catch(e=>{cardsPromise=null;throw e})).then(rows=>{const flat=rows.filter(card=>!card.metadataPending).flatMap(card=>{const mvs=(card.name?.includes('白いツバサ')?[]:(card.movies||[])).filter(m=>m&&/^movies\/.+\.mp4$/i.test(m.path));const imgs=(card.images||[]).filter(i=>i&&/^images\//.test(i.path));if(!imgs.length)return [];if(mvs.length<=1){const mv=mvs[0]?.path||'';return imgs.map(i=>({...i,moviePath:mv,card}));}return mvs.map((m,idx)=>{const matchImg=imgs.find(i=>m.label&&i.label===m.label)||imgs[Math.min(idx,imgs.length-1)]||imgs[0];return {...matchImg,label:m.label||matchImg.label,moviePath:m.path,card};});});warmCardMemoryPool(flat);return flat;})}
 function follow(pool,key){
  const context=contexts[key]||{owner:'1'},character=String(context.owner==='staff'?91:Number(context.owner||1)).padStart(3,'0');
  const matching=pool.filter(e=>String(e.card.id).slice(3,6)===character);
  return matching.find(e=>String(e.card.id)===String(context.cardId))||matching.find(e=>e.card.type==='idols'&&String(e.card.id)[2]==='4')||matching[0];
 }
 function show(key,entry,request){
  const image=document.querySelector(definitions[key].selector);if(!image||!entry)return;
  const url=entry.localImage||('/asset-original/'+(entry.imagePath||entry.path));
  try{localStorage.setItem('banner_last_'+key,url)}catch{}
  const movieUrl=entry.blobUrl||entry.localMovie||(entry.moviePath?('/asset-original/'+entry.moviePath):'');
  bindBannerCardJump(image,entry.cardId||entry.card?.id,entry.name||entry.card?.name,!!movieUrl);
  if(image.getAttribute('src')===url&&image.complete&&image.naturalWidth){image.classList.add('ready');mountBannerVideo(image,movieUrl);return}
  const cached=inMemoryCardCache.get(entry.imagePath||entry.path);
  if(cached&&cached.complete&&cached.naturalWidth){
   image.src=url;image.alt=(entry.name||entry.card?.name||'')+' · '+(entry.label||'动态卡面');image.classList.add('ready');mountBannerVideo(image,movieUrl);return;
  }
  image.classList.remove('ready');const loader=new Image();
  loader.onload=()=>{if(image.dataset.bannerRequest!==request)return;image.src=url;image.alt=(entry.name||entry.card?.name||'')+' · '+(entry.label||'动态卡面');image.classList.add('ready');mountBannerVideo(image,movieUrl)};
  loader.onerror=()=>{if(image.dataset.bannerRequest===request&&movieUrl)mountBannerVideo(image,movieUrl)};
  loader.src=url;
  if(!entry.localImage&&(entry.imagePath||entry.path))preloadCardImage(entry.imagePath||entry.path);
 }
 function apply(key, forceReshuffle = false){
  const image=document.querySelector(definitions[key]?.selector);if(!image)return;
  const pref=config(key),signature=JSON.stringify(pref),request=signature+'/'+JSON.stringify(contexts[key]||{})+(forceReshuffle?'/'+Date.now():'');
  image.dataset.bannerRequest=request;

  // For random mode: show instant local video (user-downloaded or 1-time initial fallback),
  // hold steady while new videos load, and retire initial fallbacks once any new video is ready!
  if(pref.mode==='random'){
   loadFallbacks().then(fallbacks=>{
    if(image.dataset.bannerRequest!==request)return;
    const sp=getSharedPool();
    const curEntry=chosen[key]?.entry||null;
    if(!forceReshuffle&&chosen[key]?.signature===signature&&curEntry){
     show(key,curEntry,request);
     return;
    }
    const picked=pickSmartRandomBanner(fallbacks, curEntry);
    if(picked){
     const sameAsBefore=curEntry&&String(curEntry.cardId||curEntry.card?.id)===String(picked.cardId||picked.card?.id);
     chosen[key]={signature,entry:picked};
     if(!sameAsBefore||!image.getAttribute('src')){
      show(key,picked,request);
     }else{
      // Same video still playing steadily: just ensure it resumes playing cleanly without reloading!
      const v=document.querySelector('video.archive-banner-video');
      if(v)v.play().catch(()=>{});
     }
    }
    // Load user-downloaded local movies + kick off polite background online video loader
    entries().then(pool=>{
     refreshUserLocalMovies(pool).then(userLocals=>{
      if(userLocals.length&&!sp.hasSwappedInitial[key]&&chosen[key]?.entry?.isInitialFallback&&config(key).mode==='random'){
       sp.hasSwappedInitial[key]=true;
       const nextItem=pickSmartRandomBanner(fallbacks, chosen[key].entry);
       if(nextItem&&!nextItem.isInitialFallback){
        const swapReq=signature+'/local-ready/'+Date.now();
        image.dataset.bannerRequest=swapReq;
        chosen[key]={signature,entry:nextItem};
        show(key,nextItem,swapReq);
       }
      }
      pumpBackgroundOnlineVideo(pool, (freshOnline)=>{
       if(!sp.hasSwappedInitial[key]&&chosen[key]?.entry?.isInitialFallback&&config(key).mode==='random'){
        sp.hasSwappedInitial[key]=true;
        const swapReq=signature+'/online-ready/'+Date.now();
        image.dataset.bannerRequest=swapReq;
        chosen[key]={signature,entry:freshOnline};
        show(key,freshOnline,swapReq);
       }
      });
     });
    }).catch(()=>{});
   });
   return;
  }

  entries().then(pool=>{
   if(image.dataset.bannerRequest!==request)return;let entry;
   if(pref.mode==='fixed')entry=pool.find(e=>e.path===pref.path);
   else if(pref.mode==='follow')entry=follow(pool,key);
   entry||=follow(pool,key)||pool[0];if(!entry)return;
   chosen[key]={signature,entry};show(key,entry,request);
  }).catch(()=>{/* The readable title and gradient remain without artwork. */});
 }
 function setContext(key,value){contexts[key]=value;if(key===current)apply(key)}
 function renderSettings(){
  if(!settings)return;
  for(const [key,row]of settingsRows){const pref=config(key);row.select.value=pref.mode;row.note.textContent=pref.mode==='random'?'每次打开，从已收录卡面中随机展示。':pref.mode==='follow'?'随当前角色或衣装切换。':'正在读取指定卡面…'}
  entries().then(pool=>{for(const [key,row]of settingsRows){const pref=config(key);row.pick.disabled=false;if(pref.mode==='fixed'){const entry=pool.find(e=>e.path===pref.path);row.note.textContent=entry?entry.card.name+' · '+entry.label:'指定卡面暂不在目录中，可重新挑选。'}}}).catch(()=>{for(const row of settingsRows.values())row.note.textContent='卡面目录暂未载入，请稍后重试。'});
 }
 function mountSettings(){
  const host=document.querySelector('#wardrobeDialog .settings-scroll');if(!host||settings)return;
  settings=document.createElement('section');settings.className='banner-settings';settings.setAttribute('aria-label','页面展示卡面');
  const title=document.createElement('h3'),hint=document.createElement('p');title.textContent='页面展示卡面';hint.className='hint';hint.textContent='分别设置各个页面的展示图；每次随机或挑选喜欢的一张。';settings.append(title,hint);
  for(const [key,definition]of Object.entries(definitions)){
   const row=document.createElement('div');row.className='banner-setting-row';
   const label=document.createElement('label'),select=document.createElement('select'),pick=document.createElement('button'),note=document.createElement('small');
   label.textContent=definition.label;label.htmlFor='banner-mode-'+key;select.id=label.htmlFor;select.setAttribute('aria-label',definition.label+'标题卡面');
   select.add(new Option('每次打开随机','random'));select.add(new Option('指定卡面','fixed'));if(['voice','wardrobe'].includes(key))select.add(new Option('跟随当前角色','follow'));
   pick.type='button';pick.textContent='挑选卡面';pick.setAttribute('aria-label','挑选'+definition.label+'标题卡面');pick.disabled=true;note.setAttribute('role','status');
   select.onchange=()=>{const previous=config(key);if(select.value==='fixed'&&!previous.path){select.value=previous.mode;openPicker(key);return}preferences[key]={...previous,mode:select.value};delete chosen[key];save();if(key===current)apply(key)};
   pick.onclick=()=>openPicker(key);row.append(label,select,pick,note);settings.append(row);settingsRows.set(key,{select,pick,note});
  }
  host.querySelector('#wardrobeClose')?.before(settings);if(!settings.isConnected)host.append(settings);renderSettings();
 }
 function mountPicker(){
  if(dialog)return;dialog=document.createElement('dialog');dialog.className='banner-picker';dialog.setAttribute('aria-label','选择页面展示卡面');
  dialog.innerHTML='<div class="banner-picker-head"><h2>选择展示卡面</h2><button type="button" data-close>关闭 ×</button></div><label class="collection-field">搜索卡片或偶像<input type="search" placeholder="输入卡名、偶像或编号"></label><div class="banner-picker-grid"></div><nav><button type="button" data-prev>上一页</button><span role="status"></span><button type="button" data-next>下一页</button></nav>';
  document.body.append(dialog);grid=dialog.querySelector('.banner-picker-grid');search=dialog.querySelector('input');status=dialog.querySelector('nav span');
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('[data-prev]').onclick=()=>{page--;drawPicker()};dialog.querySelector('[data-next]').onclick=()=>{page++;drawPicker()};search.oninput=()=>{page=0;drawPicker()};
 }
 async function drawPicker(){
  const key=pickerPage,query=search.value.trim().toLowerCase(),pool=await entries();if(key!==pickerPage)return;
  const rows=pool.filter(e=>[e.card.name,e.card.idol,e.card.id,e.label].join(' ').toLowerCase().includes(query)),pages=Math.max(1,Math.ceil(rows.length/24));page=Math.min(page,pages-1);grid.replaceChildren();
  for(const entry of rows.slice(page*24,(page+1)*24)){
   const button=document.createElement('button'),img=new Image(),label=document.createElement('span');button.type='button';img.src='/asset-original/'+entry.path;img.loading='lazy';img.alt=entry.card.name;label.textContent=entry.card.name+' · '+entry.label;button.append(img,label);
   button.onclick=()=>{preferences[key]={mode:'fixed',path:entry.path};delete chosen[key];save();if(current===key)apply(key);dialog.close()};grid.append(button);
  }
  status.textContent=rows.length+' 张 · '+(page+1)+' / '+pages;dialog.querySelector('[data-prev]').disabled=!page;dialog.querySelector('[data-next]').disabled=page+1>=pages;window.UIFlow?.enter(grid);
 }
 async function openPicker(key){if(!definitions[key])return;mountPicker();pickerPage=key;page=0;search.value='';dialog.querySelector('h2').textContent='挑选'+definitions[key].label+'卡面';try{await drawPicker();if(pickerPage!==key)return;if(!dialog.open)dialog.showModal();search.focus()}catch{if(settingsRows.has(key))settingsRows.get(key).note.textContent='卡面目录未载入，请稍后重试。'}}
 window.addEventListener('storage',event=>{if(event.key!==KEY)return;try{preferences=JSON.parse(event.newValue||'{}');if(current){delete chosen[current];apply(current)}renderSettings()}catch{}});
 document.querySelector('#wardrobe')?.addEventListener('click',mountSettings);
 function registerLoadedMovie(card, moviePath, label) {
  if (!card || !moviePath || !/^movies\/.+\.mp4$/i.test(moviePath)) return;
  if (!isOfficial283Card(card)) return;
  const sp = getSharedPool();
  if (sp.readyOnline.length >= MAX_ONLINE_VIDEOS) return;
  if (sp.readyOnline.some(x => x.moviePath === moviePath)) return;
  const img = (card.images || []).find(i => i && /^images\//.test(i.path));
  sp.queuedIds.add(moviePath);
  sp.readyOnline.push({
   cardId: String(card.id),
   movieKey: moviePath,
   name: card.name || card.idol || '',
   label: label || '动态演出',
   imagePath: img?.path || '',
   moviePath,
   card,
   isOnline: true
  });
  sp.initialFallbackRetired = true;
 }

 window.ShinyBanners={setCards,setContext,openPicker,registerLoadedMovie};
 if(current==='cards'){
  const sp=getSharedPool();
  const hasNonFallback=(sp.userLocalPool.length+sp.readyOnline.length)>0;
  // Prioritize rendering the card preview grid below when non-fallback videos are already cached;
  // otherwise mount instant fallback immediately so the hero isn't blank while the grid renders.
  if(hasNonFallback)setTimeout(()=>apply(current), 800);
  else apply(current);
 }else if(current){
  apply(current);
 }
})();
