/* Continuity for the existing multi-page app. No SPA routing, asset downloads or click delays.
   Inspired by onetake's carry principle; implemented with browser View Transitions. */
(() => {
  const root = document.documentElement;
  const inShell = (() => {
    try { return window.self !== window.top && !!window.parent?.__shinyShell; }
    catch { return false; }
  })();
  if (inShell && root?.classList) {
    root.classList.add('in-shell');
    try {
      const t = window.parent.__shinyShell.getTheme?.();
      if (t) root.dataset.theme = t;
    } catch {}
  } else {
    try {
      const savedTheme = typeof localStorage !== 'undefined' && localStorage.getItem('shiny.theme');
      if ((savedTheme === 'dark' || savedTheme === 'light') && root?.dataset) root.dataset.theme = savedTheme;
    } catch {}
  }
  if(typeof document.querySelector==='function'){
    if(window.top===window.self&&!document.querySelector('script[data-idol-assistant]')&&document.head){const script=document.createElement('script');script.src='/assistant.js?v=2026-11-16.77';script.dataset.idolAssistant='';script.defer=true;document.head.append(script)}
    if(!document.querySelector('link[href*="ui-upgrade.css"]')&&document.head){const link=document.createElement('link');link.rel='stylesheet';link.href='/ui-upgrade.css';document.head.append(link)}
    if(!document.querySelector('link[href*="apple-reset.css"]')&&document.head){const link=document.createElement('link');link.rel='stylesheet';link.href='/apple-reset.css';document.head.append(link)}
    if(!document.querySelector('script[data-ui-upgrade]')&&document.head){const script=document.createElement('script');script.src='/ui-upgrade.js';script.dataset.uiUpgrade='';script.defer=true;document.head.append(script)}
    if(!document.querySelector('script[data-prism-motion]')&&document.head){const script=document.createElement('script');script.src='/prism-motion.js';script.dataset.prismMotion='';script.defer=true;document.head.append(script)}
  }
  if(window.desktop?.windowControlsOverlay)root.dataset.desktopChrome='overlay';
  const moduleOf = value => {
    try { const name = new URL(value, location.href).pathname.split('/').pop() || 'index.html'; return name === 'library.html' ? 'guide.html' : name; }
    catch { return ''; }
  };
  const order = ['index.html','guide.html','card-gallery.html','voice-gallery.html','model-picker.html','music.html','custom-story.html','memorial-gallery.html'];
  let local = null, cross = null, carriedLink = null;
  function direction(from, to) {
    const a = order.indexOf(moduleOf(from)), b = order.indexOf(moduleOf(to));
    root.dataset.motionDirection = a >= 0 && b >= 0 && b < a ? 'back' : 'forward';
    root.dataset.motionRoute = moduleOf(from) === 'index.html' ? 'from-home' : moduleOf(to) === 'index.html' ? 'to-home' : 'module';
  }
  window.addEventListener('pageswap', event => {
    if (!event.viewTransition) return;
    direction(location.href, event.activation?.entry?.url || location.href);
    settleLocal();
    event.viewTransition.ready?.catch(() => {});
    event.viewTransition.finished?.catch(() => {});
  });
  window.addEventListener('pagereveal', event => {
    if (!event.viewTransition) return;
    const activation = window.navigation?.activation;
    direction(activation?.from?.url || location.href, location.href);
    cross = event.viewTransition;
    root.dataset.crossMotion = 'active';
    event.viewTransition.ready?.catch(() => {});
  const finish = () => {
    if (cross !== event.viewTransition) return;
    cross = null;
    delete root.dataset.crossMotion;
  };
    event.viewTransition.finished?.then(finish, finish).catch(() => {});
  });
  document.addEventListener('pointerdown', event => {
    carriedLink = null;
    if(!cross)return;
    // Captured View Transition elements are not hit-testable: Chromium reports
    // <html> instead of the visible link. Cancelling alone loses that first
    // click (down on html, up on a). Carry the intended nav click through once.
    if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){
      const modal=document.querySelector('dialog:modal');
      const link=[...document.querySelectorAll('a[href],button,summary')].map(a=>({a,r:a.getBoundingClientRect()})).filter(({a,r})=>
        !a.disabled&&!a.closest('[inert]')&&(!modal||modal.contains(a))&&r.width>0&&r.height>0&&getComputedStyle(a).visibility!=='hidden'&&event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom
      ).sort((a,b)=>a.r.width*a.r.height-b.r.width*b.r.height)[0]?.a;
      if(link&&event.target.closest('a[href],button,summary')!==link)carriedLink={link,x:event.clientX,y:event.clientY};
    }
    cross.skipTransition();
  }, { capture: true });
  document.addEventListener('pointercancel',()=>{carriedLink=null},{capture:true});
  document.addEventListener('click', event => {
    const carried=carriedLink;carriedLink=null;
    if(carried&&carried.link.isConnected&&Math.hypot(event.clientX-carried.x,event.clientY-carried.y)<8&&event.target.closest('a[href],button,summary')!==carried.link){
      event.preventDefault();event.stopImmediatePropagation();settleLocal();carried.link.click();return;
    }
    if (event.target.closest('a[href]')) settleLocal();
  }, true);
  window.addEventListener('pageshow', () => { carriedLink=null;delete root.dataset.localMotion; });
  function settleLocal() {
    if (!local) return;
    const previous = local; local = null;
    previous.apply(); previous.transition?.skipTransition(); previous.clean();
  }
  window.UIFlow = {
    enter(host) {
      if (!host) return;
      [...host.children].slice(0,12).forEach((item,index) => {
        item.getAnimations().forEach(animation => animation.cancel());
        item.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],
          {duration:340,delay:Math.min(index*16,130),easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
      });
    },
    /* Update runs exactly once, including capture failures and interrupted opening. */
    morph(source, target, update) {
      settleLocal(); cross?.skipTransition();
      if (!document.startViewTransition || !source?.isConnected) { update(); return; }
      const record = { named: [], applied: false, transition: null };
      const name = node => { if (node?.isConnected) { record.named.push([node,node.style.viewTransitionName]); node.style.viewTransitionName = 'selected-art'; } };
      record.apply = () => {
        if (record.applied) return;
        record.applied = true; update();
        source.style.viewTransitionName = '';
        name(typeof target === 'function' ? target() : target);
      };
      record.clean = () => {
        for (const [node,before] of record.named) node.style.viewTransitionName = before;
        if (local === record || !local) delete root.dataset.localMotion;
      };
      root.dataset.localMotion = 'art'; local = record; name(source);
      try {
        record.transition = document.startViewTransition(record.apply);
        record.transition.ready?.catch(() => {});
        record.transition.finished?.catch(() => {});
        const finish = () => { if (local === record) { local = null; record.clean(); } };
        record.transition.finished?.then(finish, finish).catch(() => {});
      } catch { record.apply(); local = null; record.clean(); }
    }
  };

  // Zero-latency shared dataset cache across multi-page navigation
  const DATA_CACHE_NAME = 'shiny-dataset-v6';
  try {
    if ('caches' in window) {
      caches.keys().then(keys => {
        for (const k of keys) {
          if (k.startsWith('shiny-dataset-') && k !== DATA_CACHE_NAME) caches.delete(k);
        }
      }).catch(() => {});
    }
  } catch {}
  const memCache = (window.top && window.top !== window) ? (window.top.__shinyDataMem = window.top.__shinyDataMem || new Map()) : (window.__shinyDataMem = window.__shinyDataMem || new Map());
  
  window.fetchDataset = async function(url) {
    if (memCache.has(url)) return memCache.get(url);
    try {
      if ('caches' in window) {
        const cache = await caches.open(DATA_CACHE_NAME);
        const match = await cache.match(url);
        if (match) {
          const data = await match.json();
          memCache.set(url, data);
          return data;
        }
        const resp = await fetch(url);
        if (resp.ok) {
          cache.put(url, resp.clone()).catch(() => {});
          const data = await resp.json();
          memCache.set(url, data);
          return data;
        }
      }
    } catch {}
    const r = await fetch(url);
    const data = await r.json();
    memCache.set(url, data);
    return data;
  };

  // Instant Speculative Prefetch for landing pages (both mobile touch & desktop)
  const prefetched = new Set();
  function prefetchLink(url) {
    if (!url || prefetched.has(url)) return;
    try {
      const u = new URL(url, location.href);
      if (u.origin !== location.origin || !u.pathname.endsWith('.html')) return;
      prefetched.add(url);
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.append(link);
    } catch {}
  }
  document.addEventListener('pointerover', e => {
    const a = e.target.closest('a[href]');
    if (a && a.href) prefetchLink(a.href);
  }, { passive: true });
  document.addEventListener('touchstart', e => {
    const a = e.target.closest('a[href]');
    if (a && a.href) prefetchLink(a.href);
  }, { passive: true });

  // Immediate idle preloading for landing pages and heavy datasets (Zero-lag switching)
  const immediateWarmup = () => {
    ['index.html', 'guide.html', 'card-gallery.html', 'voice-gallery.html', 'model-picker.html'].forEach(prefetchLink);
    const targets = [
      '/data/summary.json',
      '/guide-groups.json',
      '/data/card-media.json',
      '/data/voice-index.json',
      '/home-assets/catalog.json',
      '/data/catalog.json'
    ];
    targets.forEach(url => {
      window.fetchDataset(url).catch(() => {});
    });
  };
  if (typeof setTimeout === 'function') setTimeout(immediateWarmup, 180);

  /* ── Apple-Grade SF-Symbol Icon Navigation System ── */
  const NAV_ICONS = {
    'index.html': '<svg class="apple-nav-icon" viewBox="0 0 24 24"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5z"/></svg>',
    'guide.html': '<svg class="apple-nav-icon" viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z"/><path d="M6 6h10M6 10h10M6 14h6"/></svg>',
    'card-gallery.html': '<svg class="apple-nav-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    'voice-gallery.html': '<svg class="apple-nav-icon" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>',
    'model-picker.html': '<svg class="apple-nav-icon" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-2.83 2H4a2 2 0 0 0-2 2l3 15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2l3-15a2 2 0 0 0-2-2h-5.17A3 3 0 0 0 12 2z"/></svg>',
    'music.html': '<svg class="apple-nav-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v6"/></svg>',
    'custom-story.html': '<svg class="apple-nav-icon" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    'continue': '<svg class="apple-nav-icon" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
  };

  function enhanceAppleNavigation() {
    document.querySelectorAll('.site-nav a').forEach(a => {
      if (a.querySelector('.apple-nav-icon')) return;
      const href = a.getAttribute('href') || '';
      const isContinue = a.classList.contains('nav-continue') || href.includes('mode=recent');
      const iconKey = isContinue ? 'continue' : (href.split('?')[0].split('#')[0] || 'index.html');
      const svg = NAV_ICONS[iconKey] || NAV_ICONS['index.html'];
      if (svg) {
        const text = a.textContent.trim();
        a.innerHTML = `${svg}<span>${text}</span>`;
      }
    });

    // Add Live Studio pulse dot to 283 Brand if not present
    const brand = document.querySelector('.site-brand');
    if (brand && !brand.querySelector('.live-studio-pulse')) {
      const pulse = document.createElement('span');
      pulse.className = 'live-studio-pulse';
      pulse.title = '283 Production Online';
      pulse.innerHTML = '<span class="live-dot-ping"></span><span class="live-dot-core"></span>';
      brand.prepend(pulse);
    }
  }

  function ensureAppleResetLast() {
    if (!document.head) return;
    let resetLink = document.querySelector('link[href*="apple-reset.css"]');
    if (!resetLink) {
      resetLink = document.createElement('link');
      resetLink.rel = 'stylesheet';
      resetLink.href = '/apple-reset.css';
    }
    if (document.head.lastElementChild !== resetLink) {
      document.head.appendChild(resetLink);
    }
  }

  if (typeof document.readyState === 'string') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => { enhanceAppleNavigation(); ensureAppleResetLast(); });
    } else {
      enhanceAppleNavigation();
      ensureAppleResetLast();
    }
  }

  /* ── Persistent Shell Bridge (When Running Inside shell.html) ── */
  if (inShell) {
    // Route cross-module link clicks to the persistent shell
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const a = event.target?.closest?.('a[href]');
      if (!a || a.hasAttribute('download') || a.target === '_blank') return;
      const raw = a.getAttribute('href') || '';
      if (!raw || raw.startsWith('#') || raw.startsWith('javascript:') || raw.startsWith('mailto:')) return;
      try {
        const dest = new URL(raw, location.href);
        if (dest.origin !== location.origin) return;
        const page = dest.pathname.split('/').pop() || 'index.html';
        if (dest.pathname.startsWith('/player/') || page === 'custom-story-viewer.html') return;
        if (dest.pathname === '/' || page.endsWith('.html')) {
          const curPage = location.pathname.split('/').pop() || 'index.html';
          // Let same-page query/hash navigation in guide.html work if same page without leaving shell
          if (page === curPage && dest.search === location.search && dest.hash) return;
          event.preventDefault();
          event.stopPropagation();
          const rel = (dest.pathname === '/' ? 'index.html' : page) + dest.search + dest.hash;
          window.parent.__shinyShell.navigate(rel);
        }
      } catch {}
    }, true);

    // Forward global Spotlight (Ctrl+K) & Alt+1..7 shortcuts from inside iframes
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.parent.__shinyShell.openSpotlight?.();
      } else if (e.altKey && !e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '7') {
        const pages = ['index.html','guide.html','card-gallery.html','voice-gallery.html','model-picker.html','music.html','custom-story.html'];
        const target = pages[Number(e.key) - 1];
        if (target) {
          e.preventDefault();
          window.parent.__shinyShell.navigate(target);
        }
      }
    });

    // Pause heavy WebGL/PIXI loops & home audio when module frame is hidden; resume instantly on return
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.type === 'shiny-shell-theme' && e.data.theme) {
        root.dataset.theme = e.data.theme;
      } else if (e.data.type === 'shiny-shell-visibility') {
        const active = !!e.data.active;
        try {
          if (window.homeStage?.app?.ticker) {
            if (active) {
              if (typeof window.homeStage.app.render === 'function') window.homeStage.app.render();
              window.homeStage.app.ticker.start();
            } else {
              window.homeStage.app.ticker.stop();
            }
          }
          if (!active) {
            window.homeStage?.stop?.();
            document.querySelectorAll('audio').forEach(au => {
              if (!au.paused && au !== window.__musicAudio) {
                au.dataset.shellPaused = '1';
                au.pause();
              }
            });
          } else {
            document.querySelectorAll('audio[data-shell-paused="1"]').forEach(au => {
              delete au.dataset.shellPaused;
              if (au.id === 'homeMusicAudio') au.play().catch(() => {});
            });
          }
        } catch {}
      }
    });

    // Notify shell when a story viewer dialog opens (so Jukebox pauses politely) & sync Zen mode
    const bindShellObservers = () => {
      for (const id of ['viewer', 'storyViewer']) {
        const dlg = document.getElementById(id);
        if (!dlg || typeof MutationObserver === 'undefined') continue;
        new MutationObserver(() => {
          if (dlg.open) {
            window.parent.postMessage({ type: 'shiny-shell-story-open' }, location.origin);
          }
        }).observe(dlg, { attributes: true, attributeFilter: ['open'] });
      }
      const hideBtn = document.getElementById('hide');
      if (hideBtn) {
        hideBtn.addEventListener('click', () => {
          setTimeout(() => {
            window.parent.postMessage({
              type: 'shiny-shell-chrome-hidden',
              hidden: document.body.classList.contains('clean')
            }, location.origin);
          }, 0);
        });
      }
      // Make sure apple-reset.css sits after page links, AND mobile-ultrawide.css sits VERY LAST so mobile perf rules always win!
      const resetLink = document.querySelector('link[href*="apple-reset.css"]');
      if (resetLink && document.head && document.head.lastElementChild !== resetLink) {
        document.head.appendChild(resetLink);
      }
      const mobLink = document.getElementById('mobileUltrawideStyles') || document.querySelector('link[href*="mobile-ultrawide.css"]');
      if (mobLink && document.head && document.head.lastElementChild !== mobLink) {
        document.head.appendChild(mobLink);
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindShellObservers);
    else bindShellObservers();

    // Mirror any child iframe `shiny.*` localStorage writes directly to Shell's native persistent store
    try {
      if (!window.__shinyChildPrefsBridgeInstalled && window.parent && window.parent !== window && typeof window.parent.__shinyMirrorPref === 'function') {
        window.__shinyChildPrefsBridgeInstalled = true;
        const origSet = Storage.prototype.setItem;
        const origRem = Storage.prototype.removeItem;
        Storage.prototype.setItem = function (k, v) {
          const res = origSet.call(this, k, v);
          if (this === window.localStorage && typeof k === 'string' && k.startsWith('shiny.')) {
            try { window.parent.__shinyMirrorPref(k, String(v)); } catch {}
          }
          return res;
        };
        Storage.prototype.removeItem = function (k) {
          const res = origRem.call(this, k);
          if (this === window.localStorage && typeof k === 'string' && k.startsWith('shiny.')) {
            try { window.parent.__shinyMirrorPref(k, null); } catch {}
          }
          return res;
        };
      }
    } catch {}

    // Stamp mobile/Android/Huawei flags synchronously on every subpage iframe for zero-lag mobile CSS fast-path
    const uaStr = navigator.userAgent || '';
    const pData = (() => { try { return window.parent?.document?.documentElement?.dataset || {}; } catch { return {}; } })();
    const isAnd = /ShinyStoriesAndroid|Android/i.test(uaStr) || pData.android === '1' || typeof window.ShinyAndroid !== 'undefined';
    const isJt = /JoyTrans|Droitong|HarmonyOS|HUAWEI|HONOR/i.test(uaStr) || pData.joytrans === '1';
    const isHm = /HarmonyOS|OHOS/i.test(uaStr) || pData.harmony === '1';
    const isKr = /KirinSoC|Kirin|HiSilicon|Maleoon/i.test(uaStr) || pData.kirin === '1';
    const isMob = isAnd || isJt || isHm || isKr || /iPhone|iPad|iPod|Mobile/i.test(uaStr) || pData.mobile === '1';
    if (isMob) root.dataset.mobile = '1';
    if (isAnd) root.dataset.android = '1';
    if (isJt) root.dataset.joytrans = '1';
    if (isHm) root.dataset.harmony = '1';
    if (isKr) root.dataset.kirin = '1';

    // Mobile Touch Left/Right Swipe to Switch Tabs (conflict-free with sliders, horizontal scrollers, dialogs & card games!)
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      let sx = 0, sy = 0, st = 0, lock = '', activeSwipe = false;
      const hasHorizScrollAncestor = (el) => {
        let cur = el;
        while (cur && cur !== document.body && cur !== document.documentElement) {
          if (cur.scrollWidth > cur.clientWidth + 8) {
            const ox = getComputedStyle(cur).overflowX;
            if (ox === 'auto' || ox === 'scroll') return true;
          }
          cur = cur.parentElement;
        }
        return false;
      };
      const isSwipeBlocked = (el) => {
        if (!el || !el.closest) return false;
        if (document.querySelector('dialog[open]')) return true;
        if (document.querySelector('.lyrics-full-overlay.open, .lyrics-full-overlay.is-open')) return true;
        if (el.closest('input, textarea, select, [contenteditable], .card-fan, .card-table, .mj-table, .poker-card, .timeline-track, .stage-canvas, .director-stage, .assistant-panel')) return true;
        return hasHorizScrollAncestor(el);
      };
      window.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1 || isSwipeBlocked(e.target)) { activeSwipe = false; return; }
        const t = e.touches[0];
        sx = t.clientX; sy = t.clientY; st = Date.now(); lock = ''; activeSwipe = true;
      }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (!activeSwipe || e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = t.clientX - sx, dy = t.clientY - sy;
        if (!lock) {
          if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
          lock = Math.abs(dx) > Math.abs(dy) * 1.65 ? 'h' : 'v';
        }
        if (lock !== 'h') return;
        try {
          const sh = window.parent?.__shinyShell;
          const delta = dx < 0 ? 1 : -1;
          const lbl = sh?.getNeighborLabel?.(delta);
          if (lbl && Math.abs(dx) >= 28) sh.setSwipeHint?.(delta, lbl);
          else sh?.setSwipeHint?.(0, '');
        } catch {}
      }, { passive: true });
      const finishSwipe = (e) => {
        if (!activeSwipe) return;
        activeSwipe = false;
        try {
          const sh = window.parent?.__shinyShell;
          if (lock === 'h' && e.changedTouches && e.changedTouches.length) {
            const dx = e.changedTouches[0].clientX - sx;
            const dt = Date.now() - st;
            if (Math.abs(dx) >= 68 || (Math.abs(dx) >= 46 && dt < 260)) {
              sh?.stepPage?.(dx < 0 ? 1 : -1);
              return;
            }
          }
          sh?.setSwipeHint?.(0, '');
        } catch {}
      };
      window.addEventListener('touchend', finishSwipe, { passive: true });
      window.addEventListener('touchcancel', () => {
        activeSwipe = false;
        try { window.parent?.__shinyShell?.setSwipeHint?.(0, ''); } catch {}
      }, { passive: true });
    }
  }
})();
































