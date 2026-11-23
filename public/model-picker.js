(() => {
  const $ = s => document.querySelector(s), params = new URLSearchParams(location.search);
  const target = params.get('target') === 'voice' ? 'voice' : 'home', slot = Math.max(0, Math.min(4, Number(params.get('slot')) || 0));
  let prefs = {}; try { prefs = JSON.parse(window.desktop?.getState()?.home || localStorage.getItem('home') || '{}'); } catch {}
  let catalog = [], owner, choices = [], filtered = [], page = 0, selected, serial = 0, cardIndex = new Map();
  const pageSize = 12;let previewObserver,drawSerial=0;
  const voiceReturn = () => 'voice-gallery.html?' + new URLSearchParams({ idol: owner.id === 'staff' ? '91' : owner.id, outfit: selected.key, kind: params.get('kind') || '' });
  $('#back').href = target === 'voice' ? 'voice-gallery.html' : 'index.html';
  $('#applyHint').textContent = target === 'voice' ? '应用到语音试听角色。' : `应用到大厅位置 ${slot + 1}，其他位置保持当前选择。`;
  const kind = choice => /stand_costume|concert/.test(choice.path) ? 'stage' : choice.source === 'story-model' || choice.key.startsWith('story:') || /support_idols|characters|sub_characters/.test(choice.path) ? 'story' : 'daily';
  const rarity = c => { const card=cardIndex.get(c.preludeCardId||c.id);return card ? CardTaxonomy.rarity(card) : 'other'; };
  function pick(choice) {
    selected = choice; const token = ++serial;
    window.ModuleDirectory?.wardrobeCover(owner,choice.preludeCardId||choice.id);
    $('#selectedName').textContent = owner.name; $('#selectedLabel').textContent = choice.label;
    $('#selectedImage').hidden = true; $('#previewHint').hidden = false; $('#previewHint').textContent = '正在准备模型预览…'; $('#applyModel').disabled = false;
    document.querySelectorAll('.model-card').forEach(button => button.classList.toggle('active', button.dataset.key === choice.key));
    modelThumbnails.get(choice.path,{priority:100,valid:()=>token===serial}).then(image => {
      if (token !== serial) return; $('#selectedImage').src = image; $('#selectedImage').hidden = false; $('#previewHint').hidden = true;
    }).catch(() => { if (token === serial) $('#previewHint').textContent = '预览暂未载入；可重选重试，在线预览需要网络或已下载模型。'; });
  }
  function applyOutfit(choice) {
    if (!choice) return;
    if (target === 'voice') { location.href = voiceReturn(); return; }
    const members = Array.isArray(prefs.members) && prefs.members.length ? prefs.members.map(m => ({ ...m })) : [{ idol: prefs.idol || '1', outfit: prefs.outfit }];
    while (members.length <= slot) members.push({ ...members[0] });
    members[slot] = { idol: owner.id, outfit: choice.key }; prefs.members = members; prefs.count = Math.max(prefs.count || 1, members.length);
    if (slot === 0) { prefs.idol = owner.id; prefs.outfit = choice.key; }
    const value = JSON.stringify(prefs); localStorage.setItem('home', value); window.desktop?.saveState({ home: value }); location.href = 'index.html';
  }
  function draw() {
    const version=++drawSerial;previewObserver?.disconnect();$('#modelGrid').replaceChildren();
    previewObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){previewObserver.unobserve(entry.target);entry.target.loadPreview()}},{rootMargin:'180px'});
    for (const choice of filtered.slice(page * pageSize, (page + 1) * pageSize)) {
      const card = document.createElement('article'); card.className = 'model-card'; card.dataset.key = choice.key;
      if (window.ShinyNewBadges?.isNew('models', choice.path)) {
        card.classList.add('has-new-badge');
        card.append(window.ShinyNewBadges.badgeEl('models'));
      }
      const cardBody = document.createElement('div'); cardBody.className = 'model-card-body';
      const art = document.createElement('div'); art.className = 'art'; const loading = document.createElement('span'); loading.className = 'loading'; loading.textContent = '正在准备模型预览…'; art.append(loading);
      const label = document.createElement('strong'); label.textContent = choice.label;
      const meta = document.createElement('small'); meta.textContent = (rarity(choice)==='other'?'其他模型':rarity(choice))+' · '+(choice.id || choice.key);
      cardBody.append(art, label, meta);
      cardBody.onclick = () => { window.ShinyNewBadges?.markSeen('models', choice.path, card); pick(choice); };

      const applyBtn = document.createElement('button');
      applyBtn.type = 'button';
      applyBtn.className = 'card-apply-btn';
      applyBtn.textContent = '使用';
      applyBtn.title = `使用 ${choice.label}`;
      applyBtn.onclick = (e) => {
        e.stopPropagation();
        pick(choice);
        applyOutfit(choice);
      };

      card.append(cardBody, applyBtn);
      $('#modelGrid').append(card);
      card.loadPreview=()=>modelThumbnails.get(choice.path,{priority:1,valid:()=>card.isConnected&&version===drawSerial}).then(image=>{if(!card.isConnected)return;const img=new Image();img.src=image;img.alt=choice.label;art.replaceChildren(img)}).catch(()=>{if(card.isConnected)loading.textContent='预览暂不可用 · 点击重试'});previewObserver.observe(card);
    }
    window.UIFlow?.enter($('#modelGrid'));const count = Math.max(1, Math.ceil(filtered.length / pageSize)); $('#page').textContent = `${page + 1} / ${count}`; $('#previous').disabled = page === 0; $('#next').disabled = page + 1 === count;
    $('#modelCount').textContent = `${owner.name} · ${filtered.length} 套模型与服装`;
    document.querySelectorAll('.model-card').forEach(card => card.classList.toggle('active', card.dataset.key === selected?.key));
  }
  function filter() { const query = $('#modelSearch').value.toLowerCase(), type = $('#modelType').value, level = $('#modelRarity').value; document.querySelectorAll('#wardrobeScopes button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scope===type))); filtered = choices.filter(c => (!type || kind(c) === type) && (!level||rarity(c)===level) && `${c.label} ${c.id} ${c.key}`.toLowerCase().includes(query)); page = 0; draw(); }
  function chooseOwner(person) {
    owner = person;window.ModuleDirectory?.wardrobe(person); const unique = new Map(); for (const choice of person.outfits) if (!unique.has(choice.path)) unique.set(choice.path, choice); choices = [...unique.values()];
    document.querySelectorAll('#idolIndex button').forEach(button => button.classList.toggle('active', button.dataset.id === person.id));
    $('#modelSearch').value = ''; $('#modelType').value = ''; $('#modelRarity').value='';for(const option of $('#modelRarity').options){if(!option.value)continue;const n=choices.filter(c=>rarity(c)===option.value).length;option.textContent=(option.value==='other'?'其他模型':option.value)+' · '+n;option.disabled=!n;} selected = null; filter();
    const previous = target === 'home' ? prefs.members?.[slot]?.outfit || prefs.outfit : params.get('outfit');
    pick(choices.find(c => c.key === previous) || choices[0]);
  }
  $('#modelSearch').oninput = filter; $('#modelType').onchange = filter; $('#modelRarity').onchange=filter; $('#previous').onclick = () => { page--; draw(); }; $('#next').onclick = () => { page++; draw(); };
  document.querySelectorAll('#wardrobeScopes button').forEach(b=>b.onclick=()=>{$('#modelType').value=b.dataset.scope;filter()});
  $('#applyModel').onclick = () => applyOutfit(selected);
  Promise.all(['/home-assets/catalog.json','/data/card-media.json'].map(url=>(window.fetchDataset ? window.fetchDataset(url) : fetch(url).then(r=>{if(!r.ok)throw Error('目录加载失败');return r.json()})))).then(async([rows,cards]) => {
    cardIndex=new Map(cards.map(c=>[c.id,c]));window.ModuleDirectory?.setCards(cards);
    const every=[...new Map(rows.flatMap(p=>p.outfits).map(o=>[o.path,o])).values()];window.ModuleDirectory?.stats('wardrobe',[[every.length,'套衣装与模型'],[rows.length,'位可选角色'],[every.filter(o=>kind(o)==='daily').length,'套日常衣装'],[every.filter(o=>kind(o)==='stage').length,'套舞台衣装']]);
    if (window.ShinyNewBadges) {
      await window.ShinyNewBadges.ready;
      window.ShinyNewBadges.reconcile('models', every.map(o => o.path));
      window.ShinyNewBadges.mountClearButton(document.querySelector('.model-results .collection-heading'), 'models', () => draw());
    }
    catalog = rows; for (const person of rows) { const button = document.createElement('button'); button.dataset.id = person.id; button.textContent = person.name; button.onclick = () => chooseOwner(person); $('#idolIndex').append(button); }
    const id = params.get('idol') || prefs.members?.[slot]?.idol || prefs.idol || '1'; chooseOwner(catalog.find(p => p.id === id) || catalog[0]);
  }).catch(error => $('#modelCount').textContent = error.message);
})();
