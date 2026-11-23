/* Android-only: turn long landing lists into tap-through steps. */
(() => {
  'use strict';
  let body = null;
  function platformReady() {
    const attr = document.documentElement.dataset.platform;
    if (attr) return attr === 'android';
    return /Android/i.test(navigator.userAgent);
  }

  function backButton(label, onBack) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mf-back';
    button.textContent = label;
    button.addEventListener('click', () => {
      onBack();
      window.scrollTo({ top: 0, behavior: 'instant' });
      button.hidden = true;
    });
    return button;
  }

  function showDetail(button, host) {
    body.classList.remove('mf-list', 'mf-unit');
    body.classList.add('mf-detail');
    if (host && !host.contains(button)) host.prepend(button);
    button.hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });
    setTimeout(() => {
      if (host && !host.contains(button)) host.prepend(button);
      button.hidden = false;
    }, 80);
  }


  const palette = [
    ['#759fbe', '#e4f0fa'],
    ['#a190bb', '#eee8f5'],
    ['#d593a8', '#f9e6ee'],
    ['#cfa278', '#fbefdf'],
    ['#b7a65c', '#f7f1d9'],
    ['#83b6bf', '#e2f1f2'],
    ['#9d9ac5', '#eceafa'],
    ['#839d92', '#e5eee9'],
  ];

  async function guideUnits(onMember) {
    let groups = [];
    try {
      groups = await (await fetch('/guide-groups.json')).json();
    } catch (error) {
      return null;
    }
    if (!Array.isArray(groups) || !groups.length) return null;
    let portraitRows = [];
    try {
      portraitRows = await (await fetch('/portraits.json')).json();
    } catch (error) {
      portraitRows = [];
    }
    const portraitsByName = new Map();
    for (const row of portraitRows) {
      for (const key of [row.name, ...(row.aliases || [])]) {
        if (key) portraitsByName.set(String(key), row);
      }
    }
    const portraitFor = (host, member) => {
      if (window.CharacterPortraits?.mount) {
        window.CharacterPortraits.mount(host, member);
        return;
      }
      const row = portraitsByName.get(member);
      if (!row) {
        host.textContent = member.slice(0, 1);
        return;
      }
      const img = new Image();
      img.src = '/asset-original/' + row.path;
      img.alt = row.name;
      img.loading = 'lazy';
      if (row.crop) {
        const [x, y, size] = row.crop;
        img.style.cssText = `position:absolute;max-width:none;width:${(1136 / size) * 100}%;height:${(640 / size) * 100}%;left:${(-x / size) * 100}%;top:${(-y / size) * 100}%;object-fit:fill`;
      }
      img.onerror = () => {
        host.textContent = row.name.slice(0, 1);
      };
      host.replaceChildren(img);
    };
    const wrap = document.createElement('div');
    wrap.className = 'mf-guide';
    groups.forEach((group, unitIndex) => {
      const [icon, name, members] = group;
      if (!Array.isArray(members) || !members.length) return;
      const [color, wash] = palette[unitIndex % palette.length];
      const unit = document.createElement('section');
      unit.className = 'unit';
      unit.style.setProperty('--unit-color', color);
      unit.style.setProperty('--unit-wash', wash);
      const visual = document.createElement('div');
      visual.className = 'unit-visual';
      visual.dataset.unitNumber = String(unitIndex + 1).padStart(2, '0');
      const label = document.createElement('small');
      label.textContent = 'UNIT ' + visual.dataset.unitNumber;
      visual.append(label);
      const portraits = document.createElement('div');
      portraits.className = 'unit-portraits';
      members.slice(0, 5).forEach((member) => {
        const portrait = document.createElement('button');
        portrait.type = 'button';
        portrait.className = 'unit-portrait';
        portrait.tabIndex = -1;
        portrait.dataset.portraitMounted = 'true';
        portrait.title = member;
        portraitFor(portrait, member);
        portraits.append(portrait);
      });
      visual.append(portraits);
      const title = document.createElement('h2');
      title.textContent = (icon ? icon + ' ' : '') + name;
      const meta = document.createElement('p');
      meta.className = 'unit-meta';
      meta.textContent = members.length + ' 位成员';
      unit.append(visual, title, meta);
      members.forEach((member) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'mf-member-row';
        row.dataset.portraitMounted = 'true';
        row.dataset.member = member;
        row.textContent = member;
        row.addEventListener('click', () => onMember(member));
        unit.append(row);
      });
      wrap.append(unit);
    });
    return wrap;
  }

  function cardGallery() {
    const index = document.querySelector('#unitIndex');
    const results = document.querySelector('.gallery-results');
    if (!index || !results) return;
    body.classList.add('mf-cards');

    // Rebuild the unit index with the story guide's own markup
    // (unit-visual / unit-portraits / unit-meta / details.idol), so the phone
    // layout matches 剧情馆 instead of a second, hand-rolled design.
    const palette = [
      ['#759fbe', '#e4f0fa'],
      ['#a190bb', '#eee8f5'],
      ['#d593a8', '#f9e6ee'],
      ['#cfa278', '#fbefdf'],
      ['#b7a65c', '#f7f1d9'],
      ['#83b6bf', '#e2f1f2'],
      ['#9d9ac5', '#eceafa'],
      ['#839d92', '#e5eee9'],
    ];

    function rebuild() {
      const units = [...index.querySelectorAll(':scope > .unit')];
      if (!units.length) return false;
      units.forEach((unit, unitIndex) => {
        const heading = unit.querySelector('.unit-heading');
        const idols = [...unit.querySelectorAll('.card-idol')];
        const [color, wash] = palette[unitIndex % palette.length];
        unit.style.setProperty('--unit-color', color);
        unit.style.setProperty('--unit-wash', wash);

        const visual = document.createElement('div');
        visual.className = 'unit-visual';
        visual.dataset.unitNumber = String(unitIndex + 1).padStart(2, '0');
        const label = document.createElement('small');
        label.textContent = `UNIT ${visual.dataset.unitNumber}`;
        visual.append(label);
        const portraits = document.createElement('div');
        portraits.className = 'unit-portraits';
        idols.slice(0, 5).forEach((idol) => {
          const button = idol.querySelector('button[data-idol]');
          const name = button
            ? (button.textContent || '').replace(button.querySelector('small')?.textContent || '', '').trim()
            : '';
          const portrait = document.createElement('button');
          portrait.type = 'button';
          portrait.className = 'unit-portrait';
          portrait.tabIndex = -1;
          portrait.title = name;
          if (window.CharacterPortraits?.mount) {
            window.CharacterPortraits.mount(portrait, button?.dataset?.idol || name);
          } else {
            const img = idol.querySelector('img');
            if (img) {
              const pic = new Image();
              pic.src = img.currentSrc || img.src;
              pic.alt = name;
              portrait.append(pic);
            }
          }
          portraits.append(portrait);
        });
        visual.append(portraits);

        const title = document.createElement('h2');
        if (heading) {
          const clone = heading.cloneNode(true);
          clone.querySelectorAll('small').forEach((node) => node.remove());
          title.innerHTML = clone.innerHTML;
        }
        const meta = document.createElement('p');
        meta.className = 'unit-meta';
        meta.textContent = `${idols.length} 位成员`;

        const rows = idols.map((idol) => {
          const button = idol.querySelector('button[data-idol]');
          if (!button) return null;
          const details = document.createElement('details');
          details.className = 'idol';
          const summary = document.createElement('summary');
          const countText = button.querySelector('small')?.textContent?.trim() || '';
          const fullText = button.textContent.replace(/\s+/g, ' ').trim();
          const name = document.createElement('span');
          name.textContent = countText ? fullText.replace(countText, '').trim() : fullText;
          const count = document.createElement('span');
          count.className = 'count';
          count.textContent = countText;
          summary.append(name, count);
          summary.addEventListener('click', (event) => {
            event.preventDefault();
            button.click();
            results.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
          details.append(summary);
          return details;
        });
        unit.prepend(visual, title, meta);
        if (heading) heading.style.display = 'none';
        rows.filter(Boolean).forEach((row) => unit.append(row));
        idols.forEach((idol) => {
          idol.style.display = 'none';
        });
      });
      return true;
    }

    if (!rebuild()) {
      const observer = new MutationObserver(() => {
        if (rebuild()) observer.disconnect();
      });
      observer.observe(index, { childList: true, subtree: true });
    }
  }

  function voiceGallery() {
    const kinds = document.querySelector('#voiceKinds');
    const browser = document.querySelector('.voice-browser');
    if (!kinds || !browser) return;
    // Keep voice cards immediately visible on mobile
    kinds.addEventListener('click', (event) => {
      if (event.target.closest('button')) {
        browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }


  async function voiceUnits() {
    const kinds = document.querySelector('#voiceKinds');
    const select = document.querySelector('#idol');
    if (!kinds || !select) return;
    const wrap = await guideUnits((member) => {
      const option = [...select.options].find((item) => item.textContent.trim() === member);
      if (!option) return;
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('.voice-browser')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    if (!wrap) return;
    kinds.before(wrap);
  }

  function mountTopButton() {
    if (document.querySelector('.mf-top')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mf-top';
    button.setAttribute('aria-label', '回到顶部');
    button.textContent = '↑';
    button.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.append(button);
    const sync = () => button.classList.toggle('on', window.scrollY > 240);
    window.addEventListener('scroll', sync, { passive: true });
    sync();
  }

  function guideSettings() {
    if (document.querySelector('.mf-display-settings')) return;
    const buttons = [...document.querySelectorAll('button, a')];
    const anchor = buttons.find((node) => (node.textContent || '').trim().startsWith('导出全部原文'));
    if (!anchor) return;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'mf-display-settings';
    trigger.textContent = '画面设置';
    anchor.after(trigger);

    const dialog = document.createElement('dialog');
    dialog.id = 'displaySettingsDialog';
    dialog.innerHTML =
      '<h2>画面设置</h2>' +
      '<label>剧情字幕字号 <input id="dsSize" type="range" min="60" max="180" step="5"></label>' +
      '<label><input id="dsFill" type="checkbox"> 剧情画面铺满（隐藏对话记录）</label>' +
      '<div class="ds-actions"><button id="dsFont" type="button">字体…</button><button id="dsClose" type="button">完成</button></div>';
    document.body.append(dialog);

    const size = dialog.querySelector('#dsSize');
    const fill = dialog.querySelector('#dsFill');
    const current = window.InterfaceFont?.get?.();
    size.value = String(current?.size ?? 100);
    fill.checked = localStorage.getItem('storyFill') !== '0';
    const applyFill = () => {
      localStorage.setItem('storyFill', fill.checked ? '1' : '0');
      for (const viewer of document.querySelectorAll('#storyViewer, #viewer')) {
        viewer.classList.toggle('story-fill', fill.checked);
      }
    };
    applyFill();
    size.oninput = () => {
      const value = Number(size.value);
      if (window.InterfaceFont?.set && current) {
        window.InterfaceFont.set({ ...current, size: value, uiSize: current.uiSize ?? 100 });
      }
    };
    fill.onchange = applyFill;
    dialog.querySelector('#dsFont').onclick = () => window.InterfaceFont?.open?.();
    dialog.querySelector('#dsClose').onclick = () => dialog.close();
    trigger.onclick = () => dialog.showModal();
  }

  async function wardrobeUnits() {
    const list = document.querySelector('#idolIndex');
    if (!list) return;
    const findIdol = (name) => [...list.querySelectorAll('button')].find((item) => {
      const text = (item.textContent || '').trim();
      return text === name || text.startsWith(name);
    });
    const wrap = await guideUnits((member) => {
      const scrollToCollection = (attempt = 0) => {
        const card = document.querySelector('#modelGrid .model-card');
        if (!card && attempt < 12) {
          setTimeout(() => scrollToCollection(attempt + 1), 120);
          return;
        }
        const target = card || document.querySelector('#wardrobeCollection') || document.querySelector('.wardrobe-layout');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (card) card.classList.add('mf-hit');
      };
      const pick = (attempt = 0) => {
        const button = findIdol(member);
        if (!button) {
          if (attempt < 20) setTimeout(() => pick(attempt + 1), 150);
          return;
        }
        button.click();
        setTimeout(scrollToCollection, 120);
      };
      pick();
    });
    if (!wrap) return;
    list.insertAdjacentElement('beforebegin', wrap);
    mountTopButton();
  }

  let attempts = 0;
  function boot() {
    if (!platformReady() && attempts < 60) {
      attempts += 1;
      setTimeout(boot, 100);
      return;
    }
    if (!platformReady()) return;
    body = document.body;
    const page = location.pathname.split('/').pop() || 'index.html';
    const pageReady =
      page === 'card-gallery.html'
        ? document.querySelector('#unitIndex')
        : page === 'voice-gallery.html'
          ? document.querySelector('#voiceKinds')
          : page === 'model-picker.html'
            ? document.querySelector('#idolIndex')
            : page === 'guide.html'
              ? document.querySelector('#storyStats')
              : null;
    if (!pageReady) {
      attempts += 1;
      if (attempts < 100) setTimeout(boot, 100);
      return;
    }
    if (page === 'card-gallery.html') { cardGallery(); mountTopButton(); }
    if (page === 'voice-gallery.html') { voiceGallery(); voiceUnits(); }
    if (page === 'model-picker.html') wardrobeUnits();
    if (page === 'guide.html') guideSettings();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
