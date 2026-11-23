/* ═══════════════════════════════════════════════════════════════════
   ShinyStories Mobile Floating Liquid Glass Navigation Bar
   Manages the floating island pill bar, custom order preferences,
   More popup menu, and Settings UI customization.
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  if (typeof location !== 'undefined' && (location.pathname.includes('/player/') || location.search.includes('birthday='))) return;
  if (typeof document !== 'undefined' && document.body?.classList.contains('player-page')) return;

  function isAndroidOrMobile() {
    const attr = document.documentElement.dataset.platform;
    if (attr) return attr === 'android';
    return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  }

  /* ── SVG Icon Definitions ────────────────────────────────── */
  const icons = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    story: '<svg viewBox="0 0 24 24"><path d="M4 5a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-2"/><path d="M8 8h5M8 12h5M8 16h3"/></svg>',
    card: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>',
    voice: '<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="17" r="2.5"/></svg>',
    wardrobe: '<svg viewBox="0 0 24 24"><path d="M20.38 3.46L16 2 12 5.5 8 2l-4.38 1.46a1 1 0 0 0-.62.94v14.2a1 1 0 0 0 .62.94L8 21l4-3.5L16 21l4.38-1.46a1 1 0 0 0 .62-.94V4.4a1 1 0 0 0-.62-.94z"/></svg>',
    custom: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="currentColor" stroke="none"/></svg>',
  };

  /* ── All Module Definitions ──────────────────────────────── */
  const ALL_MODULES = [
    { id: 'home',     label: '事务所', href: 'index.html',        icon: icons.home },
    { id: 'story',    label: '剧情馆', href: 'guide.html',        icon: icons.story },
    { id: 'card',     label: '卡片相册', href: 'card-gallery.html', icon: icons.card },
    { id: 'voice',    label: '语音馆', href: 'voice-gallery.html',icon: icons.voice },
    { id: 'music',    label: '音乐馆', href: 'music.html',        icon: icons.music },
    { id: 'wardrobe', label: '衣装室', href: 'model-picker.html', icon: icons.wardrobe },
    { id: 'custom',   label: '怪文书', href: 'custom-story.html', icon: icons.custom },
  ];

  const DEFAULT_ORDER = ['home', 'story', 'card', 'voice', 'music', 'wardrobe', 'custom'];
  const STORAGE_KEY = 'shiny.mobileNavOrder';

  function getNavOrder() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved) && saved.length > 0) {
        const validIds = new Set(ALL_MODULES.map(m => m.id));
        const filtered = saved.filter(id => validIds.has(id));
        for (const m of ALL_MODULES) {
          if (!filtered.includes(m.id)) filtered.push(m.id);
        }
        return filtered;
      }
    } catch {}
    return [...DEFAULT_ORDER];
  }

  function saveNavOrder(newOrder) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder));
    document.dispatchEvent(new CustomEvent('mobile-nav-order-changed', { detail: { order: newOrder } }));
  }

  /* ── Detect Active Page ──────────────────────────────────── */
  function getActiveModuleId() {
    const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (page === 'index.html' || page === '') return 'home';
    if (page === 'guide.html' || page === 'library.html') return 'story';
    if (page === 'card-gallery.html') return 'card';
    if (page === 'voice-gallery.html') return 'voice';
    if (page === 'model-picker.html') return 'wardrobe';
    if (page === 'custom-story.html') return 'custom';
    return null;
  }

  let currentNav = null;
  let currentMenu = null;
  let currentBackdrop = null;

  function isPlayerPage() {
    const p = location.pathname.toLowerCase();
    return p.includes('/player/') || p.endsWith('main.html') || !!document.querySelector('#ShinyColors, .player-exit-btn, #loading') || document.body?.classList.contains('player-page');
  }

  /* ── Render Bottom Floating Nav ──────────────────────────── */
  function renderNav() {
    if (currentNav) currentNav.remove();
    if (currentMenu) currentMenu.remove();
    if (currentBackdrop) currentBackdrop.remove();

    if (isPlayerPage()) return;

    const order = getNavOrder();
    const activeModuleId = getActiveModuleId();

    // Top 4 items go to the floating bar, remaining items go into "More"
    const priorityIds = order.slice(0, 4);
    const overflowIds = order.slice(4);

    const priorityModules = priorityIds.map(id => ALL_MODULES.find(m => m.id === id)).filter(Boolean);
    const overflowModules = overflowIds.map(id => ALL_MODULES.find(m => m.id === id)).filter(Boolean);

    // 1. Create Nav Bar
    const nav = document.createElement('nav');
    nav.className = 'mobile-bottom-nav is-floating';
    nav.setAttribute('aria-label', '底部悬浮液态玻璃导航');

    const indicator = document.createElement('div');
    indicator.className = 'nav-indicator';
    indicator.setAttribute('aria-hidden', 'true');
    nav.append(indicator);

    function updateIndicator(tab, animate = true) {
      if (!tab || !indicator || !nav.isConnected) return;
      const navRect = nav.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      if (!navRect.width || !tabRect.width) return;
      const left = tabRect.left - navRect.left;
      if (!animate) indicator.style.transition = 'none';
      indicator.style.transform = `translateX(${left}px)`;
      indicator.style.width = `${tabRect.width}px`;
      if (!animate) {
        void indicator.offsetHeight;
        indicator.style.transition = '';
      }
    }

    const wireTab = (link, href) => {
      link.addEventListener('click', (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (location.pathname.endsWith(href) || location.href.endsWith(href)) {
          e.preventDefault();
          return;
        }
      });
    };

    for (const mod of priorityModules) {
      const link = document.createElement('a');
      link.className = 'nav-tab';
      link.href = mod.href;
      if (mod.id === activeModuleId) link.classList.add('is-active');
      link.innerHTML = `${mod.icon}<span>${mod.label}</span>`;
      link.setAttribute('aria-label', mod.label);
      wireTab(link, mod.href);
      nav.append(link);
    }

    // Add "More" Button
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'nav-tab';
    moreBtn.dataset.action = 'more';
    const isOverflowActive = overflowIds.includes(activeModuleId);
    if (isOverflowActive) moreBtn.classList.add('is-active');
    moreBtn.innerHTML = `${icons.more}<span>更多</span>`;
    moreBtn.setAttribute('aria-label', '更多选项');
    moreBtn.addEventListener('click', () => updateIndicator(moreBtn, true));
    nav.append(moreBtn);

    // 2. Create More Menu
    const menu = document.createElement('div');
    menu.className = 'mobile-more-menu is-floating';
    menu.setAttribute('role', 'menu');

    for (const mod of overflowModules) {
      const link = document.createElement('a');
      link.href = mod.href;
      link.setAttribute('role', 'menuitem');
      if (mod.id === activeModuleId) link.classList.add('is-active');
      link.innerHTML = `${mod.icon}<span>${mod.label}</span>`;
      wireTab(link, mod.href);
      menu.append(link);
    }

    // Add "Continue Reading" option in More menu
    const continueLink = document.createElement('a');
    continueLink.href = 'guide.html?mode=recent#archive';
    continueLink.setAttribute('role', 'menuitem');
    continueLink.innerHTML = `${icons.bookmark}<span>继续阅读</span>`;
    continueLink.style.borderTop = '1px solid rgba(220,210,225,0.45)';
    continueLink.style.marginTop = '4px';
    continueLink.style.paddingTop = '10px';
    menu.append(continueLink);

    // 3. Create Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'mobile-more-backdrop is-floating';

    // Event wiring
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.contains('is-open');
      menu.classList.toggle('is-open', !isOpen);
      backdrop.classList.toggle('is-open', !isOpen);
      moreBtn.classList.toggle('is-active', !isOpen || isOverflowActive);
    });

    backdrop.addEventListener('click', () => {
      menu.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      if (!isOverflowActive) moreBtn.classList.remove('is-active');
    });

    menu.addEventListener('click', () => {
      menu.classList.remove('is-open');
      backdrop.classList.remove('is-open');
    });

    document.body.append(backdrop, menu, nav);
    currentNav = nav;
    currentMenu = menu;
    currentBackdrop = backdrop;

    requestAnimationFrame(() => {
      const active = nav.querySelector('.nav-tab.is-active') || nav.querySelector('.nav-tab');
      if (active) updateIndicator(active, false);
    });
    window.addEventListener('resize', () => {
      const active = nav.querySelector('.nav-tab.is-active') || nav.querySelector('.nav-tab');
      if (active) updateIndicator(active, false);
    }, { passive: true });
  }

  /* ── Mount Settings Card in #wardrobeDialog ───────────────── */
  function mountSettingsCard() {
    const settings = document.querySelector('#wardrobeDialog .settings-scroll');
    if (!settings) return;

    if (document.getElementById('mobileNavSettingsCard')) {
      return;
    }

    const order = getNavOrder();
    const card = document.createElement('section');
    card.id = 'mobileNavSettingsCard';
    card.className = 'mobile-nav-settings-card';

    const renderList = () => {
      const currentOrder = getNavOrder();
      const listEl = card.querySelector('.mobile-nav-order-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      currentOrder.forEach((id, index) => {
        const mod = ALL_MODULES.find(m => m.id === id);
        if (!mod) return;
        const isPriority = index < 4;

        const row = document.createElement('div');
        row.className = `mobile-nav-order-item ${isPriority ? 'is-priority' : ''}`;
        row.innerHTML = `
          <div class="mobile-nav-order-info">
            <span class="mobile-nav-order-icon">${mod.icon}</span>
            <span class="mobile-nav-order-name">${mod.label}</span>
            <span class="mobile-nav-order-tag">${isPriority ? '前排直达' : '收进“更多”'}</span>
          </div>
          <div class="mobile-nav-order-actions">
            <button type="button" class="mobile-nav-order-btn btn-up" title="向上移动" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="mobile-nav-order-btn btn-down" title="向下移动" ${index === currentOrder.length - 1 ? 'disabled' : ''}>↓</button>
          </div>
        `;

        row.querySelector('.btn-up').onclick = () => {
          if (index > 0) {
            const temp = currentOrder[index];
            currentOrder[index] = currentOrder[index - 1];
            currentOrder[index - 1] = temp;
            saveNavOrder(currentOrder);
            renderList();
          }
        };

        row.querySelector('.btn-down').onclick = () => {
          if (index < currentOrder.length - 1) {
            const temp = currentOrder[index];
            currentOrder[index] = currentOrder[index + 1];
            currentOrder[index + 1] = temp;
            saveNavOrder(currentOrder);
            renderList();
          }
        };

        listEl.append(row);
      });
    };

    card.innerHTML = `
      <div class="mobile-nav-settings-header">
        <h3>手机端悬浮液态玻璃状态栏</h3>
        <span class="mobile-nav-settings-badge">个性化排序</span>
      </div>
      <p class="mobile-nav-settings-hint">
        排在前 4 位的模块将直接展示在手机底部的悬浮玻璃栏前排，其余选项自动收纳在“更多”菜单中。
      </p>
      <div class="mobile-nav-order-list"></div>
      <button type="button" class="mobile-nav-reset-btn">恢复默认排序</button>
    `;

    card.querySelector('.mobile-nav-reset-btn').onclick = () => {
      saveNavOrder([...DEFAULT_ORDER]);
      renderList();
    };

    settings.append(card);
    renderList();
  }

  /* ── Ultra-Smooth Swipe Navigation Engine ── */
  function setupSwipeNavigation() {
    if (isPlayerPage()) return;
    // 1. Clean any lingering animation classes
    try {
      sessionStorage.removeItem('mobile_slide_dir');
      document.body.classList.remove('mobile-page-slide-active', 'mobile-slide-in-right', 'mobile-slide-in-left', 'mobile-slide-out-left', 'mobile-slide-out-right');
    } catch {}

    // 2. Touch gesture detection
    let startX = 0, startY = 0, startTime = 0;
    let isHorizontalSwipe = false;
    let targetUrl = null;
    let isNavigating = false;

    // Prefetch helper to warm up HTTP cache
    const prefetched = new Set();
    const prefetchLink = href => {
      if (!href || prefetched.has(href)) return;
      prefetched.add(href);
      try {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = href;
        document.head.append(link);
      } catch {}
    };

    const getAdjacentTarget = (dx) => {
      const order = getNavOrder();
      const currentId = getActiveModuleId();
      if (!currentId) return null;
      const currentIndex = order.indexOf(currentId);
      if (currentIndex === -1) return null;

      let nextIndex = -1;
      if (dx < 0 && currentIndex < order.length - 1) {
        // Swipe left -> Next module
        nextIndex = currentIndex + 1;
      } else if (dx > 0 && currentIndex > 0) {
        // Swipe right -> Previous module
        nextIndex = currentIndex - 1;
      }

      if (nextIndex !== -1) {
        const nextId = order[nextIndex];
        const mod = ALL_MODULES.find(m => m.id === nextId);
        return mod ? mod.href : null;
      }
      return null;
    };

    window.addEventListener('touchstart', (e) => {
      if (isNavigating || e.touches.length !== 1) return;

      // Ignore touch in dialogs, panels, sliders, or horizontal scrolls
      const target = e.target;
      if (document.querySelector('dialog[open], .modal.is-open, #wardrobeDialog[open]')) return;
      if (target.closest('input[type=range], .story-text-toolbar, select, textarea, [data-prevent-swipe]')) return;

      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      isHorizontalSwipe = false;
      targetUrl = null;
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (isNavigating || e.touches.length !== 1 || !startX) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - startX;
      const dy = currentY - startY;

      // Angle gating: strictly require horizontal intent (dx > 1.6 * dy)
      if (!isHorizontalSwipe && Math.abs(dx) > 24) {
        if (Math.abs(dx) > Math.abs(dy) * 1.6) {
          isHorizontalSwipe = true;
          targetUrl = getAdjacentTarget(dx);
          if (targetUrl) prefetchLink(targetUrl);
        } else {
          // It's a vertical scroll, cancel tracking
          startX = 0;
          return;
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
      if (isNavigating || !startX || !isHorizontalSwipe) {
        startX = 0;
        return;
      }

      const endX = e.changedTouches[0].clientX;
      const dx = endX - startX;
      const dt = Date.now() - startTime;
      startX = 0;

      // Velocity or distance threshold: fast flick (>45px in <350ms) or definite swipe (>70px)
      const isFastFlick = Math.abs(dx) > 45 && dt < 350;
      const isLongSwipe = Math.abs(dx) > 70;

      if ((isFastFlick || isLongSwipe) && targetUrl) {
        isNavigating = true;
        location.href = targetUrl;
      }
    }, { passive: true });
  }

  /* ── Boot & Global Hooks ──────────────────────────────────── */
  function boot() {
    if (isPlayerPage()) return;
    // Inside shell.html (or shell.html itself), the unified Prism Dock owns navigation —
    // never mount a duplicate legacy bottom bar or hijack horizontal swipe gestures!
    const inUnifiedShell = (window.self !== window.top)
      || /(?:^|\/)shell\.html$/i.test(location.pathname || '');
    if (inUnifiedShell) return;
    if (!document.body) {
      requestAnimationFrame(boot);
      return;
    }

    // Only active on mobile or android platform
    if (isAndroidOrMobile() || document.documentElement.dataset.platform === 'android') {
      renderNav();
      setupSwipeNavigation();
    }

    // Listen to order change event
    document.addEventListener('mobile-nav-order-changed', () => {
      if (isAndroidOrMobile() || document.documentElement.dataset.platform === 'android') {
        renderNav();
      }
    });

    // Mount settings card whenever wardrobe dialog opens or exists
    const observeSettings = () => {
      mountSettingsCard();
      const wardrobe = document.getElementById('wardrobeDialog');
      if (wardrobe) {
        wardrobe.addEventListener('toggle', () => {
          if (wardrobe.open) mountSettingsCard();
        });
      }
      document.getElementById('wardrobe')?.addEventListener('click', () => {
        setTimeout(mountSettingsCard, 50);
      });
    };
    observeSettings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
