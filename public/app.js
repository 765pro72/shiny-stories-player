const persisted=window.desktop?.getState();if(persisted)for(const k of ['favorites','recent','overrides'])if(persisted[k])localStorage.setItem(k,persisted[k]);
const $=s=>document.querySelector(s);let cardArt={},unavailable=new Set(),catalog=[],filtered=[],page=0,mode='all',active=null,lines=[],currentPlayedLine=null,overrides=JSON.parse(localStorage.getItem('overrides')||'{}');let favorites=new Set(JSON.parse(localStorage.getItem('favorites')||'[]')),recent=JSON.parse(localStorage.getItem('recent')||'[]');
const assetUrl=p=>'/asset-original/'+p;
function save(){window.desktop?.saveState({favorites:JSON.stringify([...favorites]),recent:JSON.stringify(recent),overrides:JSON.stringify(overrides)});localStorage.setItem('favorites',JSON.stringify([...favorites]));localStorage.setItem('recent',JSON.stringify(recent));}
function options(id,values){const s=$(id),old=s.value;s.length=1;[...new Set(values)].filter(Boolean).sort((a,b)=>a.localeCompare(b,'zh-CN')).forEach(v=>s.add(new Option(v,v)));s.value=old;}
function filter(reset=true){if(reset)page=0;const customMode=mode==='custom';document.body.classList.toggle('custom-story-mode',customMode);const heading=$('#archive .section-title h2');if(heading)heading.textContent=customMode?'怪文书作品与搜索':'全部剧情与搜索';$('#search').placeholder=customMode?'搜索怪文书标题、人物、分类或台词…':'搜索剧情、偶像、卡片或剧情编号…';const groupLabel=$('#group').parentElement.firstChild;if(groupLabel?.nodeType===3)groupLabel.textContent=customMode?'作品分类':'系列 / 卡片';$('#translated').parentElement.hidden=customMode;$('#group').options[0].textContent=customMode?'所有作品分类':'所有系列与卡片';const scope=$('#scope');if(!scope.dataset.catalogNote)scope.dataset.catalogNote=scope.textContent;scope.textContent=customMode?'本机保存与导入的作品；点击作品直接观看，也可收藏、导出或继续编辑。':scope.dataset.catalogNote;const q=$('#search').value.toLowerCase();const wf=$('#watchedFilter')?.value||'';const ff=$('#flavorFilter')?.value||'';filtered=catalog.filter(s=>(mode!=='custom'||s.custom)&&(!s.custom||mode!=='custom'||!$('#customOrigin').value||s.origin===$('#customOrigin').value)&&(mode!=='favorites'||favorites.has(s.key))&&(mode!=='recent'||recent.includes(s.key))&&(!$('#category').value||s.category===$('#category').value)&&(!$('#idol').value||s.idol===$('#idol').value)&&(!$('#group').value||s.group===$('#group').value)&&(!$('#translated').value||s.translated===($('#translated').value==='yes'))&&(!wf||(wf==='watched'?window.ShinyWatchedStories?.isWatched(s.key):!window.ShinyWatchedStories?.isWatched(s.key)))&&(!ff||window.ShinyStoryEnhancements?.getStoryFlavor(s)?.key===ff)&&`${s.title} ${s.idol} ${s.group} ${s.key} ${s.description||''} ${s.custom?s.searchText||'':''}`.toLowerCase().includes(q));if(mode==='custom'&&$('#customSort')){const sort=$('#customSort').value;filtered.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'zh-CN'):sort==='oldest'?a.updatedAt.localeCompare(b.updatedAt):b.updatedAt.localeCompare(a.updatedAt))}$('#customStoryControls')?.toggleAttribute('hidden',mode!=='custom');if(mode==='recent')filtered.sort((a,b)=>recent.indexOf(a.key)-recent.indexOf(b.key));render();}
function el(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
function render(){page=Math.min(page,Math.max(0,Math.ceil(filtered.length/36)-1));const list=$('#list');list.replaceChildren();filtered.slice(page*36,(page+1)*36).forEach(s=>{const b=el('button','','card');b.dataset.storyKey=s.key;const isWatched=window.ShinyWatchedStories?.isWatched(s.key);if(isWatched)b.classList.add('is-watched');const isNewStory=window.ShinyNewBadges?.isNew('stories',s.key);if(isNewStory){b.classList.add('has-new-badge');b.append(window.ShinyNewBadges.badgeEl('stories'));}const art=cardArt[s.key],evCov=!art&&window.__eventCovers&&(window.__eventCovers[s.group]||window.__eventCovers[s.originalGroup]);if(art||evCov){const img=el('img','','cardArt');img.src=art?assetUrl('images/content/'+art.type+'/card/'+art.id+'.jpg'):evCov;img.alt='剧情封面：'+(art?art.name:s.group);img.loading='lazy';img.onerror=()=>img.remove();b.append(img)}const flv=window.ShinyStoryEnhancements?.getStoryFlavor(s);b.append(el('span',`${s.category} / ${s.idol}${flv?' · '+flv.label:''}`,'tag'),el('h3',s.title),el('span',s.group,'series'));const bottom=el('span','','bottom');bottom.append(el('span',s.custom?('本机怪文书 · '+s.scenes+' 分镜'):s.ai?'社区机翻 · 未校对':s.translated?(s.missing?`汉化 · ${s.missing} 句待补`:'已有汉化'):'待汉化',s.translated?'good':'pending'),el('span',isWatched?'✓ 已观看':(favorites.has(s.key)?'★ 已收藏':'阅读 →'),isWatched?'watched-tag':''));b.append(bottom);b.onclick=()=>{window.ShinyNewBadges?.markSeen('stories',s.key,b);open(s);};if(unavailable.has(s.key)){b.disabled=true;b.title='公开资源服务器无此剧情脚本';bottom.lastChild.textContent='脚本暂缺'}const wrap=el('div','','archive-story-entry');if(s.custom)wrap.append(b,CustomStoryLibrary.actions(s,{favorite:favorites.has(s.key),toggle:()=>{favorites.has(s.key)?favorites.delete(s.key):favorites.add(s.key);save();filter(false)}}));else{const cluster=el('div','','story-actions-cluster');cluster.append(window.storyDownloadButton(s.key),window.storyTextActions(s));wrap.append(b,cluster);}list.append(wrap);});if(!filtered.length)list.append(el('p','没有找到符合条件的剧情。'));$('#count').textContent=`${filtered.length.toLocaleString()} 篇`;$('#page').value=page+1;$('#page').max=Math.max(1,Math.ceil(filtered.length/36));$('#pageTotal').textContent=$('#page').max;$('#prev').disabled=page===0;$('#next').disabled=(page+1)*36>=filtered.length;}
function load(){lines=[];currentPlayedLine=null;const biBtn=$('#btnBranchInspector');if(biBtn){biBtn.hidden=true;biBtn.classList.remove('has-branches','pulse-choice');}$('#transcript').replaceChildren();$('#status').textContent='正在载入剧情脚本与翻译…';$('#frame').src=active.custom?'/custom-story-viewer.html?work='+encodeURIComponent(active.id)+'&lang='+$('#lang').value:'/player/main.html?key='+encodeURIComponent(active.key)+'&lang='+$('#lang').value;$('#auto').textContent='自动播放：关';}
function open(s){active=s;const edit=document.querySelector('#editCustomStory');if(edit){edit.hidden=!s.custom;edit.href=s.custom?CustomStoryLibrary.url(s.id):'#'}$('#export').textContent=s.custom?'导出本篇文本':'导出本篇缺译';$('#storyTitle').textContent=s.title;$('#storyGroup').textContent=s.idol+' / '+s.group;const art=cardArt[s.key],evCov=!art&&window.__eventCovers&&(window.__eventCovers[s.group]||window.__eventCovers[s.originalGroup]),cover=$('#storyArt');cover.hidden=!(art||evCov);if(art||evCov){cover.src=art?assetUrl('images/content/'+art.type+'/card/'+art.id+'.jpg'):evCov;cover.alt='剧情封面：'+(art?art.name:s.group);cover.onerror=()=>cover.hidden=true}$('#favorite').textContent=favorites.has(s.key)?'★ 已收藏':'☆ 收藏';window.ShinyWatchedStories?.syncViewerButton?.(s.key);window.syncViewerEnhancements?.(s,catalog,cardArt);recent=[s.key,...recent.filter(k=>k!==s.key)].slice(0,100);save();$('#viewer').showModal();load();}
function send(type,value){$('#frame').contentWindow.postMessage({type,value},location.origin);}
window.openStoryByKey=key=>{const row=catalog.find(s=>s.key===key)||window.navigationCatalog?.find(s=>s.key===key);if(row&&!unavailable.has(key))open(row)};
function download(name,data){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

if(window.CustomStoryLibrary){const customNav=el('button','怪文书','nav');customNav.id='custom';document.querySelector('#recent').after(customNav);const customImport=el('button','导入怪文书 .gwa');customImport.id='importCustomStories';const customFile=document.createElement('input');customFile.type='file';customFile.accept='.gwa';customFile.multiple=true;customFile.hidden=true;customImport.onclick=()=>customFile.click();customFile.onchange=async()=>{try{const count=await CustomStoryLibrary.importFiles(customFile.files);location.href='guide.html?mode=custom#archive'}catch(e){$('#scope').textContent='怪文书导入失败：'+e.message}finally{customFile.value=''}};document.querySelector('#archive .section-title')?.append(customImport,customFile);const controls=document.createElement('div');controls.id='customStoryControls';controls.hidden=true;controls.className='custom-story-controls';controls.innerHTML='<label>来源<select id="customOrigin"><option value="">全部作品</option><option value="created">本机保存</option><option value="imported">导入作品</option></select></label><label>排序<select id="customSort"><option value="newest">最近更新</option><option value="oldest">最早更新</option><option value="title">作品名称</option></select></label>';document.querySelector('#archive .searchrow')?.after(controls);controls.querySelectorAll('select').forEach(e=>e.onchange=()=>filter());const notices=el('div');controls.after(notices);CustomStoryLibrary.mountUndo(notices);window.addEventListener('custom-story-library-changed',async e=>{try{const custom=await CustomStoryLibrary.list();catalog=[...catalog.filter(s=>!s.custom),...custom];const count=$('#custom span');if(count)count.textContent=String(custom.length);for(const id of ['category','idol','group'])options('#'+id,catalog.map(s=>s[id]));if(e.detail.action==='deleted'&&active?.custom&&active.id===e.detail.id&&$('#viewer').open)$('#viewer').close();filter(false)}catch(err){$('#scope').textContent='作品目录刷新失败：'+err.message}});}
$('#close').onclick=()=>$('#viewer').close();$('#viewer').onclose=()=>{$('#frame').src='about:blank';filter(false);};$('#search').oninput=()=>filter();['category','idol','group','translated','watchedFilter','flavorFilter'].forEach(id=>{if($('#'+id))$('#'+id).onchange=()=>{if(id==='idol')options('#group',catalog.filter(s=>!$('#idol').value||s.idol===$('#idol').value).map(s=>s.group));filter();};});['all','favorites','recent','custom'].forEach(id=>{if($('#'+id))$('#'+id).onclick=()=>{if(mode==='custom'&&id!=='custom')for(const name of ['category','idol','group','translated'])$('#'+name).value='';mode=id;if(id==='custom'){for(const name of ['idol','group','translated'])$('#'+name).value='';$('#category').value='怪文书'}document.querySelectorAll('.nav').forEach(e=>e.classList.toggle('active',e.id===id));filter();if(id==='custom')$('#archive')?.scrollIntoView({block:'start',behavior:'smooth'});}});$('#prev').onclick=()=>{page--;render();};$('#next').onclick=()=>{page++;render();};function jumpToPage(){const input=$('#page');const requested=Number(input.value);if(!Number.isInteger(requested)){input.value=page+1;return}page=Math.min(Math.max(requested,1),Math.max(1,Math.ceil(filtered.length/36)))-1;render();$('#list').scrollIntoView({block:'start'});}$('#page').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();jumpToPage();$('#page').blur()}else if(e.key==='Escape'){e.preventDefault();$('#page').value=page+1;$('#page').blur()}};$('#page').onchange=jumpToPage;$('#favorite').onclick=()=>{favorites.has(active.key)?favorites.delete(active.key):favorites.add(active.key);save();$('#favorite').textContent=favorites.has(active.key)?'★ 已收藏':'☆ 收藏';};$('#advance').onclick=()=>send('next');$('#auto').onclick=()=>send('auto');$('#lang').onchange=()=>send('lang',$('#lang').value);$('#volume').oninput=()=>send('volume',Number($('#volume').value)/100);$('#restart').onclick=load;const btnBi=$('#btnBranchInspector');if(btnBi)btnBi.onclick=()=>send('openBranchInspector');
$('#export').onclick=()=>active.custom?StoryText.exportStory(active.key,'translated'):download('待翻译-'+active.key.replace(/[/.]/g,'-')+'.json',TranslationExchange.bundle(lines.filter(r=>!r.translation).map(r=>({...r,story:active.key,translation:'',review:'',polished:''}))));$('#exportAll').onclick=async()=>download('已发现缺译文本.json',TranslationExchange.bundle(await(await fetch('/data/missing-translations.json')).json()));
$('#import').onclick=()=>$('#importFile').click();$('#importFile').onchange=async e=>{try{const rows=JSON.parse(await e.target.files[0].text());if(!Array.isArray(rows))throw Error('必须为 JSON 数组');let n=0;for(const r of rows){const value=r.polished||r.translation;if(r.story&&r.original&&typeof value==='string'&&value.trim()){(overrides[r.story]??={})[r.original]=value;n++;}}localStorage.setItem('overrides',JSON.stringify(overrides));save();$('#status').textContent=`已保存 ${n} 句补译。重新播放后生效。`;}catch(err){$('#status').textContent='导入失败：'+err.message;}e.target.value='';};
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==$('#frame').contentWindow)return;const d=e.data;if(d.type==='close'){if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});if(window.desktop?.setFullScreen)window.desktop.setFullScreen(false);if($('#viewer')?.open)$('#viewer').close();return;}if(d.type==='ready')send('settings',{overrides:overrides[active.key]||{},volume:Number($('#volume').value)/100});if(d.type==='status'){$('#status').textContent=d.value;if(active?.key&&typeof d.value==='string'&&/播放完毕|播放结束|已看完/.test(d.value)){window.ShinyWatchedStories?.mark?.(active.key,true);window.triggerBingeNextIfReady?.(active.key);}}if(d.type==='currentLine'&&d.value){currentPlayedLine=d.value;}if(d.type==='auto')$('#auto').textContent='自动播放：'+(d.value?'开':'关');if(d.type==='branchInfo'&&d.value){const biBtn=$('#btnBranchInspector');if(biBtn){biBtn.hidden=false;biBtn.classList.toggle('has-branches',!!d.value.hasBranches);biBtn.classList.remove('pulse-choice');biBtn.textContent=d.value.hasBranches?`🌳 分支透视 (${d.value.groupCount}组·${d.value.optionCount}项)`:'📋 剧本大纲';}}if(d.type==='branchChoiceActive'){$('#btnBranchInspector')?.classList.toggle('pulse-choice',!!d.value);}if(d.type==='lines'){
  lines=d.value;
  const div=$('#transcript');
  if(window.mountTranscriptLines){
    window.mountTranscriptLines(div,lines,active?.key,updatedOverrides=>{
      send('settings',{overrides:updatedOverrides,volume:Number($('#volume').value)/100});
    },trackIndex=>{
      send('jump',trackIndex);
      $('#stage')?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
    });
  }else{
    div.replaceChildren();
    for(const r of lines){
      const p=el('div','','line');
      p.append(el('strong',r.speaker+'：'),el('div',r.translation||'【待翻译】'+r.original),el('small',r.original));
      div.append(p);
    }
  }
}});
(async()=>{try{const [c,s,art,missing,custom,cIdx]=await Promise.all(['/data/catalog.json','/data/summary.json','/data/card-art.json','/data/unavailable.json'].map(async p=>window.fetchDataset ? window.fetchDataset(p) : (await fetch(p)).json()).concat(window.CustomStoryLibrary?CustomStoryLibrary.list():Promise.resolve([]),fetch('/constellation-index.json').then(r=>r.json()).catch(()=>({}))));window.__eventCovers=(cIdx&&cIdx.eventCovers)||{};catalog=[...c,...custom];if(window.ShinyNewBadges){await window.ShinyNewBadges.ready;window.ShinyNewBadges.reconcile('stories',c.map(x=>x.key));window.ShinyNewBadges.mountClearButton($('#guideToolbar'),'stories',()=>render());}if($('#custom'))$('#custom').append(el('span',String(custom.length)));cardArt=art;unavailable=new Set(missing);$('#total').textContent=c.length.toLocaleString();options('#category',catalog.map(s=>s.category));options('#idol',catalog.map(s=>s.idol));options('#group',catalog.map(s=>s.group));$('#scope').textContent=`收录 ${s.catalog} 篇目录，${s.translationFiles} 篇有翻译文件。${window.desktop?'已收录资源可离线使用；缺失脚本已标记。':'首次播放可能需要联网，已加载资源保存在本机。'}目录来自公开资料快照，不代表全游戏无遗漏。`;const params=new URLSearchParams(location.search);for(const id of ['category','translated','idol'])if(params.has(id))$('#'+id).value=params.get(id);if(params.has('group')){const reqGroup=params.get('group');const gSel=$('#group');gSel.value=reqGroup;if(gSel.value!==reqGroup){const norm=s=>String(s||'').replace(/編/g,'篇').replace(/[·・•･]/g,'·').replace(/[―─—–-]/g,'-').replace(/[：:]/g,':').replace(/[～~]/g,'~').replace(/\s+/g,'').toLowerCase();const want=norm(reqGroup);const matched=[...gSel.options].find(o=>o.value&&norm(o.value)===want);if(matched)gSel.value=matched.value;else if(reqGroup)$('#search').value=reqGroup;}}if(params.has('watched')&&$('#watchedFilter'))$('#watchedFilter').value=params.get('watched');if(params.has('q'))$('#search').value=params.get('q');if(['favorites','recent','custom'].includes(params.get('mode')))mode=params.get('mode');document.querySelectorAll('.nav').forEach(e=>e.classList.toggle('active',e.id===mode));filter();const target=catalog.find(x=>x.key===params.get('story'));if(target&&!unavailable.has(target.key))open(target);}catch(e){$('#scope').textContent='目录加载失败：'+e.message;}})();

$('#update').onclick=async()=>{if(window.ShinyUpdates)return window.ShinyUpdates.open();if(!window.desktop){$('#scope').textContent='请在桌面 EXE 中使用在线更新；浏览器预览使用当前本地目录。';return;}$('#update').disabled=true;try{const r=await window.desktop.update();if(!r.ok)throw Error(r.error);$('#scope').textContent='更新成功：'+r.summary.catalog+' 篇剧情。正在刷新目录…';location.reload();}catch(e){$('#scope').textContent='更新失败，已保留原版本：'+e.message;}finally{$('#update').disabled=false;}};window.desktop?.onProgress(s=>$('#scope').textContent=s);
const guideDisplaySettings=$('#guideDisplaySettings');if(guideDisplaySettings)guideDisplaySettings.onclick=()=>window.InterfaceFont?.open?.();

TranslationExchange.attach({getOverrides:()=>overrides,setOverrides:next=>{localStorage.setItem("overrides",JSON.stringify(next));overrides=next;save()},keys:()=>catalog.map(s=>s.key),download,message:text=>{document.querySelector("#scope").textContent=text;document.querySelector("#status").textContent=text}});
$('#import').onclick=()=>active&&TranslationExchange.controller.importStory(active.key);
window.addEventListener('translation-overrides-changed',()=>{overrides=JSON.parse(localStorage.getItem('overrides')||'{}');if(active&&$('#viewer').open)send('settings',{overrides:overrides[active.key]||{},volume:Number($('#volume').value)/100})});

/* ── Watched Stories Tracker + Auto-Mark on Finish + Right-Click Context Menu ── */
(() => {
  const KEY_STORIES = 'shiny.watchedStories';
  const KEY_GROUPS = 'shiny.watchedGroups';
  if (persisted) {
    if (persisted[KEY_STORIES] && !localStorage.getItem(KEY_STORIES)) localStorage.setItem(KEY_STORIES, persisted[KEY_STORIES]);
    if (persisted[KEY_GROUPS] && !localStorage.getItem(KEY_GROUPS)) localStorage.setItem(KEY_GROUPS, persisted[KEY_GROUPS]);
  }
  const loadSet = (k) => {
    try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')); }
    catch { return new Set(); }
  };
  const watchedStories = loadSet(KEY_STORIES);
  const watchedGroups = loadSet(KEY_GROUPS);

  const persistWatched = () => {
    const sJson = JSON.stringify([...watchedStories]);
    const gJson = JSON.stringify([...watchedGroups]);
    try { localStorage.setItem(KEY_STORIES, sJson); localStorage.setItem(KEY_GROUPS, gJson); } catch {}
    try { window.desktop?.saveState({ [KEY_STORIES]: sJson, [KEY_GROUPS]: gJson }); } catch {}
  };

  const keysForGroup = (group) => {
    const src = (catalog && catalog.length) ? catalog : (window.navigationCatalog || []);
    return src.filter(r => r.group === group).map(r => r.key);
  };

  const isWatched = (key) => !!key && watchedStories.has(key);

  const isGroupWatched = (group) => {
    if (!group) return false;
    const keys = keysForGroup(group);
    if (keys.length) return keys.every(k => watchedStories.has(k));
    return watchedGroups.has(group);
  };

  const isTimelineKeyWatched = (tkey) => !!tkey && watchedGroups.has(tkey);

  const decorateInlineStory = (btn, key) => {
    if (!btn) return;
    const w = isWatched(key || btn.dataset.storyKey);
    btn.classList.toggle('is-watched', w);
    let badge = btn.querySelector('.watched-pill');
    if (w) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'watched-pill';
        badge.textContent = '✓ 已观看';
        btn.append(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  };

  const decorateSeries = (detailsEl) => {
    if (!detailsEl) return;
    const summary = detailsEl.querySelector(':scope > summary');
    if (!summary) return;
    let keys = [];
    try { keys = JSON.parse(detailsEl.dataset.storyKeys || '[]'); } catch {}
    if (!keys.length) return;
    const done = keys.filter(k => watchedStories.has(k)).length;
    const allDone = done === keys.length;
    detailsEl.classList.toggle('is-watched', allDone);
    let badge = summary.querySelector('.watched-pill');
    if (done > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'watched-pill';
        summary.append(badge);
      }
      badge.textContent = allDone ? '✓ 已观看' : `已看 ${done}/${keys.length}`;
      badge.classList.toggle('is-partial', !allDone);
    } else if (badge) {
      badge.remove();
    }
  };

  const decorateTimelineLink = (el) => {
    const group = el.dataset.timelineGroup;
    const tkey = el.dataset.timelineKey;
    const w = group ? isGroupWatched(group) : isTimelineKeyWatched(tkey);
    el.classList.toggle('is-watched', w);
    let badge = el.querySelector('.watched-pill');
    if (w) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'watched-pill';
        badge.textContent = '✓ 已观看';
        el.append(badge);
      }
    } else if (badge) {
      badge.remove();
    }
  };

  // Mount viewer "已观看" toggle button next to favorite
  let viewerWatchedBtn = null;
  const favBtn = document.querySelector('#favorite');
  if (favBtn && !document.querySelector('#watchedToggle')) {
    viewerWatchedBtn = document.createElement('button');
    viewerWatchedBtn.id = 'watchedToggle';
    viewerWatchedBtn.type = 'button';
    viewerWatchedBtn.textContent = '○ 标记已观看';
    viewerWatchedBtn.onclick = () => {
      if (!active?.key) return;
      api.mark(active.key, !isWatched(active.key));
    };
    favBtn.after(viewerWatchedBtn);
  }

  const syncViewerButton = (key) => {
    if (!viewerWatchedBtn) return;
    const w = isWatched(key);
    viewerWatchedBtn.textContent = w ? '✓ 已观看' : '○ 标记已观看';
    viewerWatchedBtn.classList.toggle('is-watched', w);
  };

  const syncAll = () => {
    document.querySelectorAll('.inline-story[data-story-key]').forEach(b => decorateInlineStory(b, b.dataset.storyKey));
    document.querySelectorAll('.inline-series[data-story-keys]').forEach(d => decorateSeries(d));
    document.querySelectorAll('a[data-timeline-group], span[data-timeline-key]').forEach(el => decorateTimelineLink(el));
    document.querySelectorAll('#list .card[data-story-key]').forEach(c => {
      const k = c.dataset.storyKey;
      const w = isWatched(k);
      c.classList.toggle('is-watched', w);
      const right = c.querySelector('.bottom > span:last-child');
      if (right && !c.disabled) {
        right.textContent = w ? '✓ 已观看' : (favorites.has(k) ? '★ 已收藏' : '阅读 →');
        right.classList.toggle('watched-tag', w);
      }
    });
    // Sync Unit & Idol completion progress bars!
    document.querySelectorAll('.unit[data-unit-keys]').forEach(unitEl => {
      let keys = [];
      try { keys = JSON.parse(unitEl.dataset.unitKeys || '[]'); } catch {}
      const total = keys.length;
      const done = keys.filter(k => watchedStories.has(k)).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      const fill = unitEl.querySelector('.unit-progress-fill');
      const txt = unitEl.querySelector('.unit-progress-text');
      if (fill) fill.style.width = `${pct}%`;
      if (txt) txt.textContent = `已看 ${done} / ${total} (${pct}%)`;
      unitEl.classList.toggle('unit-completed', total > 0 && done === total);
    });
    document.querySelectorAll('.idol[data-idol-keys]').forEach(idolEl => {
      let keys = [];
      try { keys = JSON.parse(idolEl.dataset.idolKeys || '[]'); } catch {}
      const total = keys.length;
      const done = keys.filter(k => watchedStories.has(k)).length;
      const pill = idolEl.querySelector(':scope > summary .idol-progress-pill');
      if (pill) {
        if (done > 0) {
          const pct = Math.round((done / total) * 100);
          pill.textContent = done === total ? '✓ 全部看完' : `已看 ${done}/${total} (${pct}%)`;
          pill.classList.toggle('is-complete', done === total);
          pill.hidden = false;
        } else {
          pill.textContent = '';
          pill.hidden = true;
        }
      }
    });
    if (active?.key) syncViewerButton(active.key);
  };

  const api = {
    isWatched,
    isGroupWatched,
    mark(key, val = true) {
      if (!key) return;
      if (val) watchedStories.add(key);
      else watchedStories.delete(key);
      persistWatched();
      syncAll();
    },
    markKeys(keys, val = true) {
      if (!Array.isArray(keys)) return;
      for (const k of keys) {
        if (val) watchedStories.add(k);
        else watchedStories.delete(k);
      }
      persistWatched();
      syncAll();
    },
    markGroup(group, val = true) {
      if (!group) return;
      const keys = keysForGroup(group);
      for (const k of keys) {
        if (val) watchedStories.add(k);
        else watchedStories.delete(k);
      }
      if (val) watchedGroups.add(group);
      else watchedGroups.delete(group);
      persistWatched();
      syncAll();
    },
    markTimelineKey(tkey, val = true) {
      if (!tkey) return;
      if (val) watchedGroups.add(tkey);
      else watchedGroups.delete(tkey);
      persistWatched();
      syncAll();
    },
    decorateInlineStory,
    decorateSeries,
    syncViewerButton,
    syncAll
  };

  window.ShinyWatchedStories = api;

  // Sleek Floating Right-Click Context Menu for Manual Watched Marking
  const menu = document.createElement('div');
  menu.id = 'watchedCtxMenu';
  menu.className = 'watched-ctx-menu';
  menu.hidden = true;
  document.body.append(menu);

  const closeMenu = () => { menu.hidden = true; };
  document.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('scroll', closeMenu, { passive: true, capture: true });

  const openMenu = (x, y, items) => {
    menu.innerHTML = '';
    for (const item of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'watched-ctx-item' + (item.danger ? ' is-unmark' : '');
      btn.textContent = item.label;
      btn.onclick = (ev) => {
        ev.stopPropagation();
        closeMenu();
        item.action();
      };
      menu.append(btn);
    }
    menu.hidden = false;
    const rect = menu.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - 10);
    const top = Math.min(y, window.innerHeight - rect.height - 10);
    menu.style.left = `${Math.max(8, left)}px`;
    menu.style.top = `${Math.max(8, top)}px`;
  };

  document.addEventListener('contextmenu', (e) => {
    const storyEl = e.target.closest('#list .card[data-story-key], .inline-story[data-story-key]');
    if (storyEl) {
      e.preventDefault();
      const key = storyEl.dataset.storyKey;
      const w = isWatched(key);
      openMenu(e.clientX, e.clientY, [{
        label: w ? '✕ 取消「已观看」标记' : '✓ 标记为「已观看」',
        danger: w,
        action: () => api.mark(key, !w)
      }]);
      return;
    }

    const seriesSummary = e.target.closest('.inline-series > summary[data-story-keys]');
    if (seriesSummary) {
      e.preventDefault();
      let keys = [];
      try { keys = JSON.parse(seriesSummary.dataset.storyKeys || '[]'); } catch {}
      if (!keys.length) return;
      const allDone = keys.every(k => watchedStories.has(k));
      openMenu(e.clientX, e.clientY, [{
        label: allDone ? `✕ 取消本系列全部 ${keys.length} 篇已观看` : `✓ 标记本系列全部 ${keys.length} 篇为「已观看」`,
        danger: allDone,
        action: () => api.markKeys(keys, !allDone)
      }]);
      return;
    }

    const timelineLink = e.target.closest('a[data-timeline-group]');
    if (timelineLink) {
      e.preventDefault();
      const group = timelineLink.dataset.timelineGroup;
      const w = isGroupWatched(group);
      openMenu(e.clientX, e.clientY, [{
        label: w ? '✕ 取消该时序「已观看」标记' : '✓ 标记该时序为「已观看」',
        danger: w,
        action: () => api.markGroup(group, !w)
      }]);
      return;
    }

    const unmatchedEl = e.target.closest('span[data-timeline-key]');
    if (unmatchedEl) {
      e.preventDefault();
      const tkey = unmatchedEl.dataset.timelineKey;
      const w = isTimelineKeyWatched(tkey);
      openMenu(e.clientX, e.clientY, [{
        label: w ? '✕ 取消该条目「已观看」标记' : '✓ 标记该条目为「已观看」',
        danger: w,
        action: () => api.markTimelineKey(tkey, !w)
      }]);
    }
  });

  // Initial sync once catalog & directory load
  setTimeout(syncAll, 600);
  setTimeout(syncAll, 1600);
})();

/* ── Quote Bookmarks (名台词本) & Cinematic 283 Postcard Exporter (明信片) ── */
(() => {
  const KEY_QUOTES = 'shiny.quoteBookmarks';
  if (persisted && persisted[KEY_QUOTES] && !localStorage.getItem(KEY_QUOTES)) {
    localStorage.setItem(KEY_QUOTES, persisted[KEY_QUOTES]);
  }

  let quotes = [];
  try { quotes = JSON.parse(localStorage.getItem(KEY_QUOTES) || '[]'); } catch { quotes = []; }
  if (!Array.isArray(quotes)) quotes = [];

  const saveQuotes = () => {
    const json = JSON.stringify(quotes);
    try { localStorage.setItem(KEY_QUOTES, json); } catch {}
    try { window.desktop?.saveState({ [KEY_QUOTES]: json }); } catch {}
    updateCount();
  };

  const updateCount = () => {
    const badge = document.querySelector('#quotesCount');
    if (badge) badge.textContent = String(quotes.length);
  };

  const getActiveQuoteSnapshot = () => {
    if (!active) return null;
    const picked = currentPlayedLine || (lines && lines.find(r => r && (r.translation || r.original)));
    if (!picked) return null;
    const art = cardArt[active.key];
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      storyKey: active.key,
      storyTitle: active.title || '',
      storyGroup: active.group || '',
      idol: active.idol || '',
      speaker: String(picked.speaker || active.idol || '283').trim(),
      translation: String(picked.translation || picked.original || '').trim(),
      original: String(picked.original || '').trim(),
      artUrl: art ? assetUrl('images/content/' + art.type + '/card/' + art.id + '.jpg') : '',
      savedAt: new Date().toISOString().slice(0, 10)
    };
  };

  const wrapCanvasText = (ctx, text, maxW, maxLines = 4) => {
    const out = [];
    for (const para of String(text || '').split(/\r?\n/)) {
      let cur = '';
      for (const ch of para) {
        if (ctx.measureText(cur + ch).width > maxW && cur) {
          out.push(cur);
          cur = ch;
          if (out.length >= maxLines) return out;
        } else {
          cur += ch;
        }
      }
      if (cur) out.push(cur);
      if (out.length >= maxLines) return out.slice(0, maxLines);
    }
    return out;
  };

  const exportQuotePostcard = async (q) => {
    if (!q) return;
    const W = 1200, H = 675;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 1. Deep cinematic base gradient
    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.55, '#171f33');
    bgGrad.addColorStop(1, '#1e1b30');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // 2. Draw card artwork backdrop if available
    if (q.artUrl) {
      await new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;
          ctx.save();
          ctx.globalAlpha = 0.42;
          ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
          ctx.restore();
          resolve();
        };
        img.onerror = resolve;
        img.src = q.artUrl;
      });
    }

    // 3. Cinematic prism vignette & readability veil
    const veil = ctx.createLinearGradient(0, 0, 0, H);
    veil.addColorStop(0, 'rgba(12, 18, 32, 0.45)');
    veil.addColorStop(0.55, 'rgba(12, 18, 32, 0.72)');
    veil.addColorStop(1, 'rgba(10, 14, 24, 0.94)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);

    // Subtle prism frame border
    const frameGrad = ctx.createLinearGradient(0, 0, W, H);
    frameGrad.addColorStop(0, 'rgba(56, 189, 248, 0.55)');
    frameGrad.addColorStop(0.5, 'rgba(129, 140, 248, 0.45)');
    frameGrad.addColorStop(1, 'rgba(244, 114, 182, 0.55)');
    ctx.strokeStyle = frameGrad;
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, W - 56, H - 56);

    // Top-left 283 brand mark
    ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
    ctx.font = '700 16px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText('283 PRODUCTION · SHINY COLORS', 66, 78);

    // Speaker pill
    const spText = q.speaker || '283';
    ctx.font = '700 24px "Segoe UI", "Microsoft YaHei", sans-serif';
    const spW = Math.min(340, ctx.measureText(spText).width + 44);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.beginPath();
    ctx.roundRect(66, 224, spW, 44, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText(spText, 88, 254);

    // Main Chinese quote
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 38px "Segoe UI", "Microsoft YaHei", sans-serif';
    const zhLines = wrapCanvasText(ctx, `「${q.translation}」`, W - 132, 4);
    let y = 326;
    for (const line of zhLines) {
      ctx.fillText(line, 66, y);
      y += 54;
    }

    // Japanese original (if distinct)
    if (q.original && q.original !== q.translation) {
      ctx.fillStyle = 'rgba(203, 213, 225, 0.72)';
      ctx.font = '400 22px "Segoe UI", "Meiryo", "Microsoft YaHei", sans-serif';
      const jpLines = wrapCanvasText(ctx, q.original, W - 132, 2);
      y += 12;
      for (const line of jpLines) {
        ctx.fillText(line, 66, y);
        y += 34;
      }
    }

    // Footer metadata
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.font = '500 18px "Segoe UI", "Microsoft YaHei", sans-serif';
    const footer = [q.storyTitle, q.storyGroup].filter(Boolean).join(' · ');
    ctx.fillText(footer, 66, H - 56);
    ctx.textAlign = 'right';
    ctx.fillText(q.savedAt || '', W - 66, H - 56);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `283-名台词-${(q.speaker || 'story').replace(/[\\/:*?"<>|]/g, '')}-${Date.now()}.png`;
    a.click();
  };

  const renderQuotesDialog = () => {
    const host = document.querySelector('#quotesList');
    if (!host) return;
    host.replaceChildren();
    if (!quotes.length) {
      const empty = document.createElement('p');
      empty.className = 'quotes-empty';
      empty.textContent = '还没有收藏名台词哦。观看剧情时点击播放器下方的「❝ 收藏名台词」，就能把打动你的台词收进这里。';
      host.append(empty);
      return;
    }
    for (const q of quotes) {
      const card = document.createElement('article');
      card.className = 'quote-card';
      if (q.artUrl) {
        const bg = document.createElement('img');
        bg.className = 'quote-card-bg';
        bg.src = q.artUrl;
        bg.alt = '';
        bg.loading = 'lazy';
        card.append(bg);
      }
      const head = document.createElement('div');
      head.className = 'quote-card-head';
      head.append(
        el('span', q.speaker || q.idol || '283', 'quote-speaker'),
        el('small', [q.storyTitle, q.savedAt].filter(Boolean).join(' · '), 'quote-source')
      );
      const body = document.createElement('blockquote');
      body.className = 'quote-text';
      body.textContent = `「${q.translation}」`;
      card.append(head, body);
      if (q.original && q.original !== q.translation) {
        card.append(el('p', q.original, 'quote-orig'));
      }
      const actions = document.createElement('div');
      actions.className = 'quote-actions';

      const btnJump = el('button', '▶ 重温本篇');
      btnJump.type = 'button';
      btnJump.onclick = () => {
        document.querySelector('#quotesDialog')?.close();
        window.openStoryByKey?.(q.storyKey);
      };

      const btnCard = el('button', '🖼 导出明信片');
      btnCard.type = 'button';
      btnCard.onclick = () => exportQuotePostcard(q);

      const btnCopy = el('button', '📋 复制');
      btnCopy.type = 'button';
      btnCopy.onclick = () => {
        const txt = `${q.speaker}：「${q.translation}」${q.original && q.original !== q.translation ? '\n' + q.original : ''}\n——《${q.storyTitle}》`;
        navigator.clipboard?.writeText(txt).then(() => {
          btnCopy.textContent = '✓ 已复制';
          setTimeout(() => { btnCopy.textContent = '📋 复制'; }, 1400);
        }).catch(() => {});
      };

      const btnDel = el('button', '删除', 'quote-del');
      btnDel.type = 'button';
      btnDel.onclick = () => {
        quotes = quotes.filter(item => item.id !== q.id);
        saveQuotes();
        renderQuotesDialog();
      };

      actions.append(btnJump, btnCard, btnCopy, btnDel);
      card.append(actions);
      host.append(card);
    }
  };

  const openQuotesDialog = () => {
    renderQuotesDialog();
    document.querySelector('#quotesDialog')?.showModal();
  };

  document.querySelector('#quotesNav')?.addEventListener('click', openQuotesDialog);
  document.querySelector('#openQuotesShortcut')?.addEventListener('click', (e) => {
    e.preventDefault();
    openQuotesDialog();
  });
  document.querySelector('#closeQuotes')?.addEventListener('click', () => {
    document.querySelector('#quotesDialog')?.close();
  });

  const btnBookmark = document.querySelector('#bookmarkQuote');
  if (btnBookmark) {
    btnBookmark.onclick = () => {
      const snap = getActiveQuoteSnapshot();
      if (!snap || !snap.translation) {
        $('#status').textContent = '请先等待剧情出现台词后再收藏名台词。';
        return;
      }
      const dup = quotes.some(q => q.storyKey === snap.storyKey && q.translation === snap.translation);
      if (!dup) {
        quotes.unshift(snap);
        quotes = quotes.slice(0, 300);
        saveQuotes();
      }
      btnBookmark.textContent = dup ? '✓ 已在名台词本中' : '✓ 已收藏名台词';
      $('#status').textContent = `已收藏 ${snap.speaker} 的名台词至「名台词本」。`;
      setTimeout(() => { btnBookmark.textContent = '❝ 收藏名台词'; }, 1600);
    };
  }

  const btnPostcard = document.querySelector('#exportPostcard');
  if (btnPostcard) {
    btnPostcard.onclick = async () => {
      const snap = getActiveQuoteSnapshot();
      if (!snap || !snap.translation) {
        $('#status').textContent = '请先等待剧情出现台词后再导出明信片。';
        return;
      }
      btnPostcard.disabled = true;
      btnPostcard.textContent = '正在合成明信片…';
      try {
        await exportQuotePostcard(snap);
        $('#status').textContent = '电影感 283 明信片已导出为 PNG！';
      } finally {
        btnPostcard.disabled = false;
        btnPostcard.textContent = '🖼 导出明信片';
      }
    };
  }

  updateCount();
  window.ShinyQuoteBookmarks = { open: openQuotesDialog, exportPostcard: exportQuotePostcard };
})();
