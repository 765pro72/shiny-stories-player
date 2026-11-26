const $=s=>document.querySelector(s),perPage=60;
let cards=[],filtered=[],page=0,current=null,currentIdol='',currentUnit='',pt=null,lines=[],activeMedia=null,cardZoom=1,cardOrigin=null;
let overrides=JSON.parse((window.desktop?.getState()?.overrides)||localStorage.getItem('overrides')||'{}');
const volume=Number(localStorage.getItem('volume')||40);
const asset=p=>'/asset-original/'+p;
const art=c=>asset(c.images?.[0]?.path||`images/content/${c.type}/card/${c.id}.jpg`);
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e};
const idolOf=c=>c.idol||c.stories.find(s=>s.idol)?.idol||'其他';
let dualThumbObserver=null,dualCycleTimer=0,dualPageActive=true;
const visibleDualStacks=new Set();
function ensureDualCycleTimer(){
  if(dualCycleTimer)return;
  dualCycleTimer=setInterval(()=>{
    if(!dualPageActive||document.hidden||!visibleDualStacks.size)return;
    const now=Date.now();
    for(const stack of visibleDualStacks){
      if(!stack.isConnected){visibleDualStacks.delete(stack);continue;}
      if(stack.matches(':hover'))continue;
      const cardBtn=stack.closest('.gallery-item');
      if(cardBtn?.dataset.videoControllingPhase==='1')continue;
      const altImg=stack.querySelector('img.card-thumb-alt');
      if(!altImg||!altImg.dataset.loaded)continue;
      const nextAt=Number(stack.dataset.nextFlipAt||0);
      if(now>=nextAt){
        const showAfter=!stack.classList.contains('is-awakened');
        stack.classList.toggle('is-awakened',showAfter);
        const pill=stack.querySelector('.card-phase-pill');
        if(pill)pill.textContent=showAfter?(stack.dataset.afterLabel||'觉醒后'):(stack.dataset.beforeLabel||'觉醒前');
        stack.dataset.nextFlipAt=String(now+3400);
      }
    }
  },420);
}
window.addEventListener('message',e=>{
  if(e.origin===location.origin&&e.data?.type==='shiny-shell-visibility')dualPageActive=!!e.data.active;
});
function render(){
  dualThumbObserver?.disconnect();
  visibleDualStacks.clear();
  const grid=$('#cardGrid');grid.replaceChildren();const start=page*perPage;
  dualThumbObserver=new IntersectionObserver(entries=>{
    const now=Date.now();
    for(const entry of entries){
      const stack=entry.target;
      if(entry.isIntersecting){
        visibleDualStacks.add(stack);
        const altImg=stack.querySelector('img.card-thumb-alt');
        if(altImg&&!altImg.src&&altImg.dataset.src){
          altImg.onload=()=>{
            altImg.dataset.loaded='1';
            if(!stack.dataset.nextFlipAt)stack.dataset.nextFlipAt=String(Date.now()+1800+(Number(stack.dataset.stagger||0)%7)*320);
          };
          altImg.src=altImg.dataset.src;
        }else if(altImg?.dataset.loaded&&!stack.dataset.nextFlipAt){
          stack.dataset.nextFlipAt=String(now+1800+(Number(stack.dataset.stagger||0)%7)*320);
        }
      }else{
        visibleDualStacks.delete(stack);
      }
    }
  },{rootMargin:'120px'});
  let cardIdx=0;
  for(const c of filtered.slice(start,start+perPage)){
    const b=el('button',null,'gallery-item'+(c.movies?.length?' has-movie':''));
    b.dataset.rarity=CardTaxonomy.rarity(c);
    b.dataset.cardId=String(c.id||'');
    b.dataset.cardName=c.name||'';
    b.dataset.cardIdol=idolOf(c);
    if(c.movies?.length){
      b.dataset.movie=c.movies[0].path;
      const movieList=c.movies.map(m=>({
        kind:m.kind||'',
        phase:m.kind==='gasha'?'before':'after',
        label:m.kind==='gasha'?'觉醒前':'觉醒后',
        fullLabel:m.label||(m.kind==='gasha'?'觉醒前演出':'觉醒后演出'),
        path:m.path
      }));
      b.dataset.movies=JSON.stringify(movieList);
    }
    const hasDual=Array.isArray(c.images)&&c.images.length>1&&c.images[1]?.path;
    const hasMovies=Array.isArray(c.movies)&&c.movies.length>0;
    let originEl;
    if(hasDual||hasMovies){
      const stack=el('div',null,'card-thumb-stack');
      stack.dataset.stagger=String(cardIdx);
      stack.dataset.beforeLabel=c.images?.[0]?.label||'觉醒前';
      stack.dataset.afterLabel=c.images?.[1]?.label||'觉醒后';
      const img0=el('img',null,'card-thumb-base');img0.src=art(c);img0.alt=c.name;img0.loading='lazy';img0.onerror=()=>img0.remove();
      stack.append(img0);
      if(hasDual){
        const img1=el('img',null,'card-thumb-alt');img1.dataset.src=asset(c.images[1].path);img1.alt='';img1.loading='lazy';img1.onerror=()=>img1.remove();
        stack.append(img1);
      }
      const pill=el('span',hasDual?(c.images[0]?.label||'觉醒前'):'','card-phase-pill');
      if(!hasDual)pill.hidden=true;
      stack.append(pill);
      if(hasDual)dualThumbObserver.observe(stack);
      originEl=img0;
      const label=el('span',c.name);label.append(el('small',`${CardTaxonomy.rarity(c)} · ${idolOf(c)} · ${c.images?.length||1} 张卡面 · ${c.movies?.length||0} 段演出 · ${c.stories.length} 篇剧情`));
      const badge=el('small',CardTaxonomy.rarity(c),'card-rarity-badge');
      b.append(stack,badge,label);
    }else{
      const img=el('img');img.src=art(c);img.alt=c.name;img.loading='lazy';img.onerror=()=>img.remove();
      originEl=img;
      const label=el('span',c.name);label.append(el('small',`${CardTaxonomy.rarity(c)} · ${idolOf(c)} · ${c.images?.length||1} 张卡面 · ${c.movies?.length||0} 段演出 · ${c.stories.length} 篇剧情`));
      const badge=el('small',CardTaxonomy.rarity(c),'card-rarity-badge');
      b.append(img,badge,label);
    }
    if(window.ShinyNewBadges?.isNew('cards',c.id)){
      b.classList.add('has-new-badge');
      b.append(window.ShinyNewBadges.badgeEl('cards'));
    }
    b.onclick=()=>{window.ShinyNewBadges?.markSeen('cards',c.id,b);show(c,originEl);};grid.append(b);
    cardIdx++;
  }
  ensureDualCycleTimer();
  window.UIFlow?.enter(grid);if(!filtered.length)grid.append(el('p','没有找到符合条件的卡片。','notice'));
  const dualImages=filtered.filter(c=>c.images?.length>1).length,dualMovies=filtered.filter(c=>c.movies?.length>1).length;
  $('#cardCount').textContent=`${filtered.length} 张 · ${dualImages} 张双卡面 · ${dualMovies} 张双演出`;
  $('#activeFilter').textContent=currentIdol?`${currentUnit} / ${currentIdol}`:currentUnit?`当前组合：${currentUnit}`:'全部组合与成员';
  const total=Math.max(1,Math.ceil(filtered.length/perPage));$('#cardPageInput').value=page+1;$('#cardPageInput').max=total;$('#cardPageTotal').textContent=total;$('#prevCards').disabled=page===0;$('#nextCards').disabled=(page+1)*perPage>=filtered.length;
}
function filter(){
  const q=$('#cardSearch').value.trim().toLowerCase(),type=$('#typeFilter').value,media=$('#mediaFilter').value,rarity=$('#rarityFilter').value;
  filtered=cards.filter(c=>{
    if((media==='movie'||media==='two-movies')&&c.name?.includes('白いツバサ'))return false;
    return (!rarity||CardTaxonomy.rarity(c)===rarity)&&(!type||c.type===type)&&(!currentIdol||idolOf(c)===currentIdol)&&(!currentUnit||unitMembers(currentUnit).includes(idolOf(c)))&&(!media||(media==='prelude'&&c.collection==='PreludeCollection')||(media==='two-images'&&c.images?.length>1)||(media==='two-movies'&&c.movies?.length>1)||(media==='movie'&&c.movies?.length))&&`${c.name} ${c.id} ${idolOf(c)}`.toLowerCase().includes(q);
  });
  filtered.sort((a,b)=>CardTaxonomy.compare(a,b,$('#sortField').value,$('#sortDirection').value));page=0;render();
}
let groups=[];
const unitMembers=name=>groups.find(g=>g[1]===name)?.[2]||[];
function buildIndex(){
  const counts=new Map;for(const c of cards)counts.set(idolOf(c),(counts.get(idolOf(c))||0)+1);
  const host=$('#unitIndex');host.replaceChildren();
  for(const [icon,name,members] of groups){
    const total=members.reduce((n,idol)=>n+(counts.get(idol)||0),0),unit=el('section',null,'unit');unit.dataset.unit=name;unit.dataset.unitNumber=String(host.children.length+1).padStart(2,'0');
    const heading=el('button',null,'unit-heading');heading.append(el('span',`${icon} ${name}`),el('small',`${total} 张`));heading.onclick=()=>selectUnit(name);unit.append(heading);
    for(const idol of members){const count=counts.get(idol)||0,details=el('div',null,'card-idol');const b=el('button');b.dataset.idol=idol;b.append(el('span',idol),el('small',`${count} 张`));b.disabled=!count;b.onclick=()=>selectIdol(idol,name);details.append(b);unit.append(details)}host.append(unit)
  }
}
function markUnit(unit){document.querySelectorAll('#unitIndex>.unit').forEach(node=>{node.classList.toggle('is-selected',node.dataset.unit===unit);const heading=node.querySelector('.unit-heading');if(matchMedia('(max-width:850px)').matches)heading?.setAttribute('aria-expanded',String(node.dataset.unit===unit));else heading?.removeAttribute('aria-expanded')})}
function clearSelection(){currentIdol='';currentUnit='';markUnit('');document.querySelectorAll('#unitIndex button').forEach(b=>b.classList.remove('active'));filter()}
function selectUnit(unit){currentIdol='';currentUnit=unit;markUnit(unit);document.querySelectorAll('#unitIndex button').forEach(b=>b.classList.toggle('active',b.classList.contains('unit-heading')&&b.textContent.includes(unit)));filter();if(matchMedia('(min-width:851px)').matches)$('#cardArchive').scrollIntoView({behavior:'smooth',block:'start'})}
function selectIdol(idol,unit){if(currentIdol===idol){clearSelection();return;}currentIdol=idol;currentUnit=unit;markUnit(unit);document.querySelectorAll('#unitIndex button').forEach(b=>b.classList.toggle('active',b.dataset.idol===idol));filter();$('#cardArchive').scrollIntoView({behavior:'smooth',block:'start'})}
function jump(){const n=Number($('#cardPageInput').value);if(Number.isInteger(n))page=Math.min(Math.max(n,1),Math.max(1,Math.ceil(filtered.length/perPage)))-1;render();$('#cardGrid').scrollIntoView({block:'start'})}
let currentMovieIsCostume=false,currentMovieHasBgm=false,activeMovie=null,activeMovieItem=null;
function clearCardMovie(){
  activeMovie=null;
  activeMovieItem=null;
  movieSubtitleBar.hidden=true;
  movieSubZh.textContent=movieSubJa.textContent='';
  $('#cardMovie').pause();
  cardVoiceAudio?.pause();
  cardBgmAudio?.pause();
}
function syncMovieBgmButton(){
  if(!currentMovieHasBgm){
    btnBgmToggle.disabled=true;
    btnBgmToggle.textContent='🎵 本段无BGM';
    btnBgmToggle.classList.add('is-muted');
  }else{
    btnBgmToggle.disabled=false;
    btnBgmToggle.textContent=cardBgmEnabled?'🎵 剧情原配BGM：开':'🔇 剧情原配BGM：关';
    btnBgmToggle.classList.toggle('is-muted',!cardBgmEnabled);
  }
}
function showMedia(item,type){
  window.cardUpscale?.clear();$('#cardDetail').dataset.content=type;
  $('#mediaTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.key===`${type}:${item?.kind||''}`));
  $('#cardStoryPane').hidden=true;$('#cardMediaPane').hidden=false;const img=$('#fullCard'),video=$('#cardMovie');
  video.onplay=video.onplaying=video.onwaiting=video.onpause=video.onseeking=video.onended=video.oncanplay=null;
  clearCardMovie();video.removeAttribute('src');video.muted=false;video.load();
  if(cardVoiceAudio){cardVoiceAudio.onerror=null;cardVoiceAudio.pause();cardVoiceAudio.removeAttribute('src');}
  if(cardBgmAudio){cardBgmAudio.pause();cardBgmAudio.removeAttribute('src');}
  currentMovieIsCostume=false;currentMovieHasBgm=false;
  activeMedia=type==='image'?item:null;$('.card-media-tools').hidden=false;$('.card-media-tools').dataset.kind=type==='image'?'image':'video';$('#cardImageViewport').hidden=type!=='image';$('#downloadMovie').hidden=type!=='movie';setCardZoom(1);
  activeMovieItem=type==='movie'?item:null;
  btnVoiceToggle.hidden=type!=='movie';btnBgmToggle.hidden=type!=='movie';
  if(type==='image'){video.hidden=true;img.hidden=false;movieSubtitleBar.hidden=true;img.src=asset(item.path);window.cardUpscale?.show(img);$('#cardMediaStatus').textContent=item.label+' · 可缩放并保存'}
  else{
    img.hidden=true;video.hidden=false;window.cardUpscale?.show(video);$('#cardMediaStatus').textContent=`${item.label}：${item.path}`;
    const card=current;
    const movie={resumeVoice:null};
    activeMovie=movie;
    video.oncanplay=()=>{
      if(activeMovie!==movie||!$('#cardDetail').open)return;
      video.oncanplay=null;
      window.ShinyBanners?.registerLoadedMovie?.(card,item.path,item.label);
    };
    const isCostume=item.kind==='costume'||String(item.path||'').includes('/card_costume/');
    currentMovieIsCostume=isCostume;
    const movieId=String(item.path||'').split('/').pop().replace(/\.mp4$/i,'');
    if(isCostume){
      btnBgmToggle.hidden=true;
      video.muted=!cardVoiceEnabled;
      video.src=asset(item.path);video.load();
      return;
    }
    const vKind=item.kind==='awake'?'awake':'gasha';
    const applyGashaAudio=()=>{
      if(activeMovie!==movie||!$('#cardDetail').open)return;
      const voiceEntry=cardVoiceIndex?.get(String(card.id))?.[vKind];
      const audioInfo=cardMovieAudioIndex?.[movieId]||null;
      const sePath=audioInfo?.se||(/^\d{8,}$/.test(movieId)?`sounds/se/event/${movieId}.m4a`:'');
      if(!cardVoiceAudio)cardVoiceAudio=new Audio();
      cardVoiceAudio.volume=0.9;
      const voicePath=voiceEntry?.key||'';
      let audioPath=sePath||voicePath;
      const hideSubtitle=()=>{movieSubtitleBar.hidden=true;};
      cardVoiceAudio.onplaying=()=>{
        if(activeMovie!==movie||!$('#cardDetail').open||!cardVoiceEnabled||video.paused||video.seeking||cardVoiceAudio.paused||!voicePath||audioPath!==voicePath)return;
        movieSubZh.textContent=voiceEntry.translation||'';
        movieSubJa.textContent=voiceEntry.original||'';
        movieSubtitleBar.hidden=!movieSubZh.textContent&&!movieSubJa.textContent;
      };
      cardVoiceAudio.onpause=cardVoiceAudio.onwaiting=cardVoiceAudio.onseeking=cardVoiceAudio.onended=hideSubtitle;
      cardVoiceAudio.onerror=()=>{
        hideSubtitle();
        if(activeMovie!==movie||!$('#cardDetail').open)return;
        if(voicePath&&audioPath!==voicePath){
          audioPath=voicePath;
          cardVoiceAudio.src=asset(voicePath);
          if(!video.paused&&!video.seeking)movie.resumeVoice();
        }else{
          cardVoiceAudio.onerror=null;
          cardVoiceAudio.removeAttribute('src');
        }
      };
      if(audioPath)cardVoiceAudio.src=asset(audioPath);
      if(!cardBgmAudio){cardBgmAudio=new Audio();cardBgmAudio.loop=true;}
      cardBgmAudio.volume=0.32;
      if(audioInfo?.bgm){
        currentMovieHasBgm=true;
        cardBgmAudio.src=asset(audioInfo.bgm);
      }else{
        currentMovieHasBgm=false;
        cardBgmAudio.removeAttribute('src');
      }
      syncMovieBgmButton();
      video.muted=true;
      const syncSe=()=>{
        if(!cardVoiceAudio?.src)return;
        const vt=Number(video.currentTime)||0;
        const ct=Number(cardVoiceAudio.currentTime)||0;
        if(Math.abs(ct-vt)>0.15){
          const dur=Number.isFinite(cardVoiceAudio.duration)?cardVoiceAudio.duration:999;
          cardVoiceAudio.currentTime=Math.max(0,Math.min(vt,dur));
        }
      };
      movie.resumeVoice=()=>{
        if(!cardVoiceEnabled||!cardVoiceAudio.hasAttribute('src'))return;
        syncSe();
        if(cardVoiceAudio.paused)cardVoiceAudio.play().catch(()=>{});
      };
      video.onplay=video.onplaying=()=>{movie.resumeVoice();if(cardBgmEnabled&&cardBgmAudio?.src&&cardBgmAudio.paused)cardBgmAudio.play().catch(()=>{});};
      video.onwaiting=()=>{hideSubtitle();cardVoiceAudio.pause();};
      video.onpause=video.onended=()=>{hideSubtitle();cardVoiceAudio.pause();cardBgmAudio?.pause();};
      video.onseeking=()=>{hideSubtitle();syncSe();};
      video.src=asset(item.path);video.load();
    };
    if(cardMovieAudioIndex&&cardVoiceIndex)applyGashaAudio();
    else Promise.all([cardMovieAudioReady,cardVoiceReady]).then(applyGashaAudio);
  }
}
async function downloadCurrentMovie(){
  const item=activeMovieItem;if(!item?.path)return;
  await cardMovieAudioReady.catch(()=>{});await cardVoiceReady.catch(()=>{});
  const keys=[item.path];
  // Costume videos carry their soundtrack in the MP4. Gasha videos use the
  // same companion files as playback (SE/voice and optional original BGM).
  if(!currentMovieIsCostume){
    const id=String(item.path).split('/').pop().replace(/\.mp4$/i,'');
    const kind=item.kind==='awake'?'awake':'gasha';
    const info=cardMovieAudioIndex?.[id];
    const voice=cardVoiceIndex?.get(String(current?.id))?.[kind];
    for(const p of [info?.se,info?.bgm,voice?.key])if(typeof p==='string'&&p)keys.push(p);
  }
  const b=$('#downloadMovie');await window.downloadResources([...new Set(keys)],b);
}
function setCardZoom(value){cardZoom=Math.min(4,Math.max(.5,value));$('#fullCard').style.setProperty('--card-zoom',cardZoom);$('#cardZoomValue').textContent=Math.round(cardZoom*100)+'%';window.cardUpscale?.setZoom(cardZoom)}
function saveCurrentCard(){if(!activeMedia)return;const a=document.createElement('a');a.href=asset(activeMedia.path);a.download=`${current?.name||current?.id||'card'}-${activeMedia.label||activeMedia.kind}.jpg`.replace(/[\\/:*?"<>|]/g,'_');document.body.append(a);a.click();a.remove()}
function showStories(){$('#cardDetail').dataset.content='stories';clearCardMovie();window.cardUpscale?.clear();$('#mediaTabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.key==='stories'));$('#cardMediaPane').hidden=true;$('#cardStoryPane').hidden=false}
function renderTabs(c){
  const tabs=$('#mediaTabs');tabs.replaceChildren();for(const item of c.images||[]){const b=el('button',item.label);b.dataset.key=`image:${item.kind}`;b.onclick=()=>showMedia(item,'image');tabs.append(b)}for(const item of c.movies||[]){const b=el('button',item.label);b.dataset.key=`movie:${item.kind}`;b.onclick=()=>showMedia(item,'movie');tabs.append(b)}const stories=el('button',`关联剧情 ${c.stories.length}`);stories.dataset.key='stories';stories.onclick=showStories;tabs.append(stories)
}
function renderStories(c){const list=$('#cardStoryList');list.replaceChildren();for(const s of c.stories){const b=el('button',null,'story-item'),img=el('img');img.src=art(c);img.alt='';img.loading='lazy';img.onerror=()=>img.remove();const info=el('span',null,'story-item-info');info.append(el('span',s.category||'卡片剧情','tag'),el('b',s.title),el('small',[s.idol,s.group].filter(Boolean).join(' / ')));b.append(img,info,el('span',!s.translated?'待汉化':s.missing?`汉化 · ${s.missing} 句待补`:'已有汉化',s.missing?'pending':'good'));b.onclick=()=>playStory(s);const row=el('div',null,'story-download-row');const cluster=el('div',null,'story-actions-cluster');cluster.append(window.storyDownloadButton(s.key),window.storyTextActions(s));row.append(b,cluster);list.append(row)}$('#cardStoryHint').textContent=c.stories.length?'点任意一篇即可在此播放。':'当前目录未收录这张卡片的剧情。'}
function show(c,origin){
 cardOrigin=origin;
 const open=()=>{current=c;$('#cardTitle').textContent=c.name;$('#cardMeta').textContent=`${c.id} · ${c.type==='idols'?'偶像卡':'支援卡'} · ${CardTaxonomy.rarity(c)} · ${idolOf(c)}`;renderTabs(c);renderStories(c);showMedia(c.images[0],'image');if(!$('#cardDetail').open)$('#cardDetail').showModal()};
 if(window.UIFlow)UIFlow.morph(origin,()=>$('#cardImageViewport'),open);else open();
}
function closeCard(){
 const close=()=>$('#cardDetail').close();
 if(window.UIFlow&&cardOrigin?.isConnected&&!$('#cardImageViewport').hidden)UIFlow.morph($('#cardImageViewport'),cardOrigin,close);else close();
}
function init(){lines=[];const biBtn=$('#btnBranchInspector');if(biBtn){biBtn.hidden=true;biBtn.classList.remove('has-branches','pulse-choice');}$('#transcript').replaceChildren();$('#status').textContent='正在载入剧情脚本与翻译…';$('#auto').textContent='自动播放：关';$('#frame').src='/player/main.html?key='+encodeURIComponent(pt.key)+'&lang='+$('#lang').value}
function playStory(s){pt=s;$('#storyTitle').textContent=s.title;$('#storyGroup').textContent=[s.idol,s.group].filter(Boolean).join(' / ');const cover=$('#storyArt');cover.hidden=false;cover.src=art(current);$('#cardDetail').close();$('#storyViewer').showModal();init()}
function send(type,value){$('#frame').contentWindow.postMessage({type,value},location.origin)}
const imageViewport=document.createElement('div');imageViewport.id='cardImageViewport';$('#fullCard').before(imageViewport);imageViewport.append($('#fullCard'));const mediaTools=document.createElement('div');mediaTools.className='card-media-tools';mediaTools.innerHTML='<button id="cardZoomOut" title="缩小卡面">−</button><output id="cardZoomValue">100%</output><button id="cardZoomIn" title="放大卡面">＋</button><button id="cardZoomReset">适应窗口</button><button id="saveCard">保存当前卡面</button><button id="downloadMovie" hidden>下载动态视频和声音</button>';imageViewport.before(mediaTools);window.cardUpscale?.mountTools(mediaTools);$('#cardZoomOut').onclick=()=>setCardZoom(cardZoom-.25);$('#cardZoomIn').onclick=()=>setCardZoom(cardZoom+.25);$('#cardZoomReset').onclick=()=>setCardZoom(1);$('#saveCard').onclick=saveCurrentCard;$('#downloadMovie').onclick=downloadCurrentMovie;imageViewport.ondblclick=()=>setCardZoom(cardZoom===1?2:1);imageViewport.onwheel=e=>{if(!e.ctrlKey)return;e.preventDefault();setCardZoom(cardZoom+(e.deltaY<0?.25:-.25))};

const movieSubtitleBar=document.createElement('div');movieSubtitleBar.id='cardMovieSubtitleBar';movieSubtitleBar.className='card-movie-subtitle-bar';movieSubtitleBar.hidden=true;const movieSubZh=document.createElement('div');movieSubZh.id='cardMovieSubZh';movieSubZh.className='card-movie-sub-zh';const movieSubJa=document.createElement('div');movieSubJa.id='cardMovieSubJa';movieSubJa.className='card-movie-sub-ja';movieSubtitleBar.append(movieSubZh,movieSubJa);$('#cardMovie').after(movieSubtitleBar);
let cardVoiceAudio=null,cardBgmAudio=null,cardVoiceEnabled=localStorage.getItem('shiny.cardVoiceEnabled')!=='0',cardBgmEnabled=localStorage.getItem('shiny.cardBgmEnabled')!=='0',cardVoiceIndex=null,cardMovieAudioIndex=null;
const cardMovieAudioReady=fetch('/data/card-movie-audio.json').then(r=>r.json()).then(m=>{cardMovieAudioIndex=m||{};}).catch(()=>{cardMovieAudioIndex={};});
const cardVoiceReady=fetch('/data/voice-index.json?v=20261126').then(r=>r.json()).then(vi=>{cardVoiceIndex=new Map();vi.filter(x=>x.kind==='卡片语音').forEach(v=>{const m=v.key.match(/sounds\/voice\/idols\/(\d+)\/(\w+)\.m4a/);if(m){const [,cId,vKind]=m;if(!cardVoiceIndex.has(cId))cardVoiceIndex.set(cId,{});cardVoiceIndex.get(cId)[vKind]=v;}});}).catch(()=>{cardVoiceIndex=new Map();});
const btnVoiceToggle=document.createElement('button');btnVoiceToggle.id='btnCardVoiceToggle';btnVoiceToggle.className='btn-card-voice-toggle';btnVoiceToggle.textContent=cardVoiceEnabled?'🔊 演出原声：开':'🔈 演出原声：关';
btnVoiceToggle.onclick=()=>{
  cardVoiceEnabled=!cardVoiceEnabled;
  localStorage.setItem('shiny.cardVoiceEnabled',cardVoiceEnabled?'1':'0');
  btnVoiceToggle.textContent=cardVoiceEnabled?'🔊 演出原声：开':'🔈 演出原声：关';
  btnVoiceToggle.classList.toggle('is-muted',!cardVoiceEnabled);
  const video=$('#cardMovie');
  if(currentMovieIsCostume){video.muted=!cardVoiceEnabled;return;}
  if(!cardVoiceEnabled){cardVoiceAudio?.pause();movieSubtitleBar.hidden=true;}
  else if(!video.paused&&!video.seeking)activeMovie?.resumeVoice?.();
};
const btnBgmToggle=document.createElement('button');btnBgmToggle.id='btnCardBgmToggle';btnBgmToggle.className='btn-card-voice-toggle';btnBgmToggle.textContent=cardBgmEnabled?'🎵 剧情原配BGM：开':'🔇 剧情原配BGM：关';btnBgmToggle.onclick=()=>{if(!currentMovieHasBgm)return;cardBgmEnabled=!cardBgmEnabled;localStorage.setItem('shiny.cardBgmEnabled',cardBgmEnabled?'1':'0');syncMovieBgmButton();if(!cardBgmEnabled){cardBgmAudio?.pause();}else if($('#cardDetail').dataset.content==='movie'&&!$('#cardMovie').paused&&cardBgmAudio?.src){cardBgmAudio.play().catch(()=>{});}};
mediaTools.append(btnVoiceToggle,btnBgmToggle);
$('#closeCard').onclick=closeCard;$('#cardDetail').oncancel=e=>{e.preventDefault();closeCard()};$('#cardDetail').onclose=()=>{clearCardMovie();window.cardUpscale?.clear();if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})};$('#cardSearch').oninput=filter;$('#typeFilter').onchange=filter;$('#mediaFilter').onchange=filter;$('#rarityFilter').onchange=filter;$('#sortField').onchange=filter;$('#sortDirection').onchange=filter;$('#prevCards').onclick=()=>{page--;render()};$('#nextCards').onclick=()=>{page++;render()};$('#cardPageInput').onchange=jump;$('#cardPageInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jump()}};
$('#allCards').onclick=clearSelection;
$('#closeStory').onclick=()=>$('#storyViewer').close();$('#storyViewer').onclose=()=>{$('#frame').src='about:blank';if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})};$('#advance').onclick=()=>send('next');$('#auto').onclick=()=>send('auto');$('#lang').onchange=()=>send('lang',$('#lang').value);$('#volume').value=volume;$('#volume').oninput=()=>send('volume',Number($('#volume').value)/100);$('#restart').onclick=init;const btnBi=$('#btnBranchInspector');if(btnBi)btnBi.onclick=()=>send('openBranchInspector');
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('#frame').contentWindow||!pt)return;const d=e.data;if(d.type==='ready')send('settings',{overrides:overrides[pt.key]||{},volume:Number($('#volume').value)/100});if(d.type==='status')$('#status').textContent=d.value;if(d.type==='auto')$('#auto').textContent='自动播放：'+(d.value?'开':'关');if(d.type==='branchInfo'&&d.value){const biBtn=$('#btnBranchInspector');if(biBtn){biBtn.hidden=false;biBtn.classList.toggle('has-branches',!!d.value.hasBranches);biBtn.classList.remove('pulse-choice');biBtn.textContent=d.value.hasBranches?`🌳 分支透视 (${d.value.groupCount}组·${d.value.optionCount}项)`:'📋 剧本大纲';}}if(d.type==='branchChoiceActive'){$('#btnBranchInspector')?.classList.toggle('pulse-choice',!!d.value);}if(d.type==='lines'){
  lines=d.value;
  const div=$('#transcript');
  if(window.mountTranscriptLines){
    window.mountTranscriptLines(div,lines,pt?.key,updatedOverrides=>{
      send('settings',{overrides:updatedOverrides,volume:Number($('#volume').value)/100});
    },trackIndex=>{
      send('jump',trackIndex);
      $('#stage')?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
    });
  }else{
    div.replaceChildren();
    for(const r of lines){
      const p=el('div',null,'line');
      p.append(el('strong',r.speaker+'：'),el('div',r.translation||'【待翻译】'+r.original),el('small',r.original));
      div.append(p);
    }
  }
}});
function openCardById(cardId,preferMovie=true){
  if(!cardId||!cards.length)return false;
  const c=cards.find(x=>String(x.id)===String(cardId));
  if(!c)return false;
  current=c;$('#cardTitle').textContent=c.name;$('#cardMeta').textContent=`${c.id} · ${c.type==='idols'?'偶像卡':'支援卡'} · ${CardTaxonomy.rarity(c)} · ${idolOf(c)}`;
  renderTabs(c);renderStories(c);
  if(preferMovie&&c.movies?.length)showMedia(c.movies[0],'movie');
  else if(c.images?.length)showMedia(c.images[0],'image');
  if(!$('#cardDetail').open)$('#cardDetail').showModal();
  return true;
}
window.openCardById=openCardById;
window.addEventListener('message',e=>{
  if(e.origin!==location.origin||e.data?.type!=='shiny-open-card')return;
  openCardById(e.data.cardId,e.data.preferMovie!==false);
});
Promise.all(['/data/card-media.json','/guide-groups.json'].map(p=>(window.fetchDataset ? window.fetchDataset(p) : fetch(p).then(r=>{if(!r.ok)throw Error(`${p} HTTP ${r.status}`);return r.json()})))).then(async([rows,unitGroups])=>{cards=rows.map(c=>(c.name?.includes('白いツバサ')?{...c,movies:[],hasMovie:false}:c));groups=unitGroups;if(window.ShinyNewBadges){await window.ShinyNewBadges.ready;window.ShinyNewBadges.reconcile('cards',cards.map(c=>c.id));window.ShinyNewBadges.mountClearButton(document.querySelector('#cardArchive .collection-heading'),'cards',()=>render());}window.ModuleDirectory?.stats('cards',[[cards.length,'条卡片目录'],[cards.filter(c=>!c.metadataPending).reduce((n,c)=>n+(c.images?.length||0),0),'张静态卡面'],[cards.filter(c=>!c.metadataPending).reduce((n,c)=>n+(c.movies?.length||0),0),'段动态演出'],[new Set(cards.flatMap(c=>c.stories.map(s=>s.key))).size,'篇关联剧情']]);for(const o of $('#rarityFilter').options){if(o.value){const n=cards.filter(c=>CardTaxonomy.rarity(c)===o.value).length;o.textContent=o.value+' · '+n;o.disabled=!n}}buildIndex();markUnit('');filter();const qp=new URLSearchParams(location.search);if(qp.get('card'))openCardById(qp.get('card'),qp.get('movie')!=='0');}).catch(e=>$('#cardCount').textContent='相册加载失败：'+e.message);

window.addEventListener('translation-overrides-changed',e=>{overrides=e.detail});
