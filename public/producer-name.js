(() => {
  const KEY_NAME = 'shiny.producerName';
  const KEY_BDAY = 'producer_birthday';
  const KEY_BDAY_M = 'producer_birth_m';
  const KEY_BDAY_D = 'producer_birth_d';
  const PRODUCER = /^(?:制作人|製作人|プロデューサー|producer|p)(?:[（(].*[）)])?$/i;

  function getToday() {
    const now = new Date();
    return {
      m: String(now.getMonth() + 1).padStart(2, '0'),
      d: String(now.getDate()).padStart(2, '0')
    };
  }

  function readName() {
    try {
      const fromDesk = window.desktop?.getState()?.[KEY_NAME];
      const val = (localStorage.getItem(KEY_NAME) || fromDesk || '').trim();
      if (val && !localStorage.getItem(KEY_NAME)) {
        try { localStorage.setItem(KEY_NAME, val); } catch {}
      }
      return val;
    } catch {
      return '';
    }
  }

  function saveName(value) {
    const name = String(value || '').trim().slice(0, 16);
    try {
      if (name) localStorage.setItem(KEY_NAME, name);
      else localStorage.removeItem(KEY_NAME);
    } catch {}
    try { window.desktop?.saveState({ [KEY_NAME]: name }); } catch {}
    document.dispatchEvent(new CustomEvent('producer-name-change', { detail: { name } }));
    return name;
  }

  function readBirthday() {
    try {
      const fromDesk = window.desktop?.getState()?.[KEY_BDAY];
      const raw = localStorage.getItem(KEY_BDAY) || fromDesk || '';
      if (raw && raw.includes('-')) {
        const [m, d] = raw.split('-');
        const normalized = `${String(Number(m)).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`;
        try { localStorage.setItem(KEY_BDAY, normalized); } catch {}
        return normalized;
      }
      const m = localStorage.getItem(KEY_BDAY_M);
      const d = localStorage.getItem(KEY_BDAY_D);
      if (m && d) {
        const normalized = `${String(Number(m)).padStart(2, '0')}-${String(Number(d)).padStart(2, '0')}`;
        try { localStorage.setItem(KEY_BDAY, normalized); } catch {}
        return normalized;
      }
    } catch {}
    return '';
  }

  function launchOfficeCelebration() {
    // Office celebration effects on home screen
    try {
      if (typeof window.triggerHomeBirthdayCelebration === 'function') {
        window.triggerHomeBirthdayCelebration();
        return;
      }
    } catch {}
    try {
      window.homeStage?.speak?.();
    } catch {}
  }

  function triggerBirthdayCelebration(force = false) {
    if (typeof window.showProducerBirthdayModal === 'function') {
      window.showProducerBirthdayModal(force);
      return;
    }
    const today = getToday();
    const todayFull = `${new Date().getFullYear()}-${today.m}-${today.d}`;
    const greetedKey = `producer_bday_greeted_${todayFull}`;
    if (!force && localStorage.getItem(greetedKey) === '1') return;
    try { localStorage.setItem(greetedKey, '1'); } catch {}
    if (document.querySelector('.birthday-celebration-modal')) return;

    const pName = readName();
    const titleText = pName ? `祝【${pName}】制作人先生，生日快乐！` : '制作人先生，生日快乐！';

    const modal = document.createElement('div');
    modal.className = 'birthday-celebration-modal';
    modal.innerHTML = `
      <div class="birthday-card" role="dialog" aria-modal="true" aria-label="生日庆贺祝福">
        <button type="button" class="birthday-modal-close" id="bdayCloseX" aria-label="关闭">✕</button>
        <span class="birthday-icon">🎂</span>
        <h3>${titleText}</h3>
        <p>今天是您的诞生日！感谢您一直以来的陪伴与指导！在崭新的一岁里，283 事务所的大家也期待着与您一起走向更加闪耀的舞台！✨</p>
        <div class="birthday-actions">
          <button type="button" id="bdayPlayStory" class="birthday-primary">收下祝福并开启生日庆典 🎉</button>
          <button type="button" id="bdayClose" class="birthday-secondary">收下祝福</button>
        </div>
      </div>
    `;
    document.body.append(modal);

    const closeModal = (celebrate = false) => {
      try { localStorage.setItem(greetedKey, '1'); } catch {}
      modal.remove();
      if (celebrate) launchOfficeCelebration();
    };

    modal.querySelector('#bdayPlayStory').onclick = () => closeModal(true);
    modal.querySelector('#bdayClose').onclick = () => closeModal(false);
    modal.querySelector('#bdayCloseX')?.addEventListener('click', () => closeModal(false));
    modal.onclick = e => { if (e.target === modal) closeModal(false); };
    const escHandler = e => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        window.removeEventListener('keydown', escHandler);
        closeModal(false);
      }
    };
    window.addEventListener('keydown', escHandler);
  }

  function display(name) {
    const text = String(name == null ? '' : name);
    if (!PRODUCER.test(text.replace(/[\s　]/g, ''))) return text;
    return readName() || '制作人';
  }

  function mount() {
    const settings = document.querySelector('#wardrobeDialog .settings-scroll');
    if (!settings) return;
    const anchor = settings.querySelector('h2');
    const existing = document.getElementById('producerNameSetting');
    if (existing) {
      if (anchor && anchor.nextElementSibling !== existing) anchor.after(existing);
      return;
    }

    const section = document.createElement('section');
    section.id = 'producerNameSetting';
    section.className = 'producer-profile-card';
    section.innerHTML = `
      <div class="profile-card-header">
        <h3>制作人档案</h3>
        <span id="producerNameCurrent" class="profile-badge">当前：制作人（默认）</span>
      </div>
      <div class="profile-field-row">
        <label for="producerNameInput" class="profile-label">你的名字</label>
        <input id="producerNameInput" class="profile-input" maxlength="16" placeholder="留空即显示“制作人”" autocomplete="off">
      </div>
      <p class="profile-hint">剧情里“制作人”的台词与对话记录会显示成这个名字。</p>
      
      <div class="profile-field-row" style="margin-top: 14px;">
        <label class="profile-label">你的生日</label>
        <div class="profile-birthday-picker">
          <select id="producerBirthMonth" class="profile-select"></select>
          <span class="picker-unit">月</span>
          <select id="producerBirthDay" class="profile-select"></select>
          <span class="picker-unit">日</span>
        </div>
      </div>
      <p id="producerBirthdayHint" class="profile-hint">设定生日后，生日当天首次登录将触发专属庆贺与生日剧情播放。</p>
      <div id="producerBirthdayCelebrationSlot" style="margin-top: 8px;"></div>
    `;

    const input = section.querySelector('#producerNameInput');
    const current = section.querySelector('#producerNameCurrent');
    const mSelect = section.querySelector('#producerBirthMonth');
    const dSelect = section.querySelector('#producerBirthDay');
    const hint = section.querySelector('#producerBirthdayHint');
    const bdaySlot = section.querySelector('#producerBirthdayCelebrationSlot');

    // Populate birthday options
    mSelect.add(new Option('--', ''));
    for (let i = 1; i <= 12; i++) mSelect.add(new Option(String(i), String(i).padStart(2, '0')));

    dSelect.add(new Option('--', ''));
    for (let i = 1; i <= 31; i++) dSelect.add(new Option(String(i), String(i).padStart(2, '0')));

    const updateBirthdayHint = () => {
      const today = getToday();
      const todayStr = `${today.m}-${today.d}`;
      const savedBday = readBirthday();

      if (savedBday && savedBday === todayStr) {
        hint.innerHTML = '<strong style="color:#d14d7a">🎂 今天是您的诞生日！</strong>专属特别生日祝福演出已备齐。';
        bdaySlot.innerHTML = '<button type="button" id="producerBdayReplay" class="profile-bday-today-btn" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:linear-gradient(135deg,#ffe8ee,#fff0f5);border:1px solid #ffb6c1;color:#b33966;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(220,100,140,0.15)">🎂 观看制作人生日专属庆贺祝福 ↗</button>';
        const btn = bdaySlot.querySelector('#producerBdayReplay');
        if (btn) btn.onclick = () => {
          const dlg = document.getElementById('wardrobeDialog');
          if (dlg && dlg.open) dlg.close();
          setTimeout(() => triggerBirthdayCelebration(true), 150);
        };
      } else if (savedBday && savedBday.includes('-')) {
        const [m, d] = savedBday.split('-');
        hint.textContent = `已设定生日为 ${Number(m)}月${Number(d)}日。生日当天首次打开将自动呈现全屏祝福与特别庆贺。`;
        bdaySlot.innerHTML = '';
      } else {
        hint.textContent = '设定生日后，生日当天首次登录将触发专属庆贺与生日祝福。';
        bdaySlot.innerHTML = '';
      }
    };

    const sync = () => {
      const name = readName();
      input.value = name;
      current.textContent = name ? '当前：' + name : '当前：制作人（默认）';

      const savedBday = readBirthday();
      if (savedBday && savedBday.includes('-')) {
        const [m, d] = savedBday.split('-');
        mSelect.value = String(Number(m)).padStart(2, '0');
        dSelect.value = String(Number(d)).padStart(2, '0');
      } else {
        const m = localStorage.getItem(KEY_BDAY_M);
        const d = localStorage.getItem(KEY_BDAY_D);
        mSelect.value = m ? String(Number(m)).padStart(2, '0') : '';
        dSelect.value = d ? String(Number(d)).padStart(2, '0') : '';
      }
      updateBirthdayHint();
    };

    input.addEventListener('input', () => {
      const name = saveName(input.value);
      current.textContent = name ? '当前：' + name : '当前：制作人（默认）';
    });

    const saveBday = () => {
      const m = mSelect.value;
      const d = dSelect.value;

      if (m) {
        try { localStorage.setItem(KEY_BDAY_M, m); } catch {}
      } else {
        try { localStorage.removeItem(KEY_BDAY_M); } catch {}
      }

      if (d) {
        try { localStorage.setItem(KEY_BDAY_D, d); } catch {}
      } else {
        try { localStorage.removeItem(KEY_BDAY_D); } catch {}
      }

      if (m && d) {
        const bday = `${m}-${d}`;
        try { localStorage.setItem(KEY_BDAY, bday); } catch {}
        try { window.desktop?.saveState({ [KEY_BDAY]: bday }); } catch {}
        updateBirthdayHint();
      } else if (!m && !d) {
        try { localStorage.removeItem(KEY_BDAY); } catch {}
        try { window.desktop?.saveState({ [KEY_BDAY]: '' }); } catch {}
        updateBirthdayHint();
      } else {
        // One is selected, one still blank: keep intermediate state without clearing KEY_BDAY yet
        updateBirthdayHint();
      }
    };

    mSelect.addEventListener('change', saveBday);
    mSelect.addEventListener('input', saveBday);
    dSelect.addEventListener('change', saveBday);
    dSelect.addEventListener('input', saveBday);

    sync();
    document.addEventListener('producer-name-change', sync);

    // Watch for wardrobeDialog opening to always re-sync state
    const dlg = document.getElementById('wardrobeDialog');
    if (dlg) {
      const obs = new MutationObserver(() => {
        if (dlg.hasAttribute('open')) sync();
      });
      obs.observe(dlg, { attributes: true, attributeFilter: ['open'] });
      dlg.addEventListener('toggle', () => {
        if (dlg.open) sync();
      });
    }
    document.getElementById('wardrobe')?.addEventListener('click', () => setTimeout(sync, 30));

    if (anchor) anchor.after(section); else settings.prepend(section);
  }

  window.ProducerName = {
    read: readName,
    save: saveName,
    readBirthday,
    triggerCelebration: triggerBirthdayCelebration,
    display
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
  const wardrobe = document.getElementById('wardrobeDialog');
  if (wardrobe) {
    wardrobe.addEventListener('toggle', () => { if (wardrobe.open) mount(); });
  }
  document.getElementById('wardrobe')?.addEventListener('click', () => setTimeout(mount, 30));
})();
