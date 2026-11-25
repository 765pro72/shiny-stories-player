/* ═══════════════════════════════════════════════════════════════════════════
   283 PRISM MOTION — 3D Holographic Foil Cards · Live Video Hover · Cascade
   Distinctive tactile motion with spring damping & reduced-motion respect
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  const CARD_SELECTOR = [
    '.card-archive .gallery-item',
    '.guide-unified #list .card',
    '.page-wardrobe .model-card',
    '.page-voice .voice',
    '.collection-overview',
    '.story-overview',
    '.archive-banner',
    '.voice-overview',
    '.studio-overview',
    '.writer-overview',
    '.turntable-deck'
  ].join(', ');

  /* ── 1. 3D Perspective Tilt + Holographic Specular Glint ────────────── */
  const tiltStates = new WeakMap();
  const activeTilts = new Set();
  let tiltRaf = 0;

  function stepTilts() {
    for (const el of activeTilts) {
      const s = tiltStates.get(el);
      if (!s) { activeTilts.delete(el); continue; }

      // Smooth critically-damped lerp (60/120fps buttery)
      const ease = s.hover ? 0.16 : 0.12;
      s.rx += (s.trx - s.rx) * ease;
      s.ry += (s.try - s.ry) * ease;
      s.mx += (s.tmx - s.mx) * 0.22;
      s.my += (s.tmy - s.my) * 0.22;
      s.glare += (s.tglare - s.glare) * 0.18;

      el.style.setProperty('--pm-rx', `${s.rx.toFixed(2)}deg`);
      el.style.setProperty('--pm-ry', `${s.ry.toFixed(2)}deg`);
      el.style.setProperty('--pm-mx', `${s.mx.toFixed(1)}%`);
      el.style.setProperty('--pm-my', `${s.my.toFixed(1)}%`);
      el.style.setProperty('--pm-glare', s.glare.toFixed(3));
      el.style.setProperty('--pm-px', `${(s.ry * -0.55).toFixed(2)}px`);
      el.style.setProperty('--pm-py', `${(s.rx * 0.55).toFixed(2)}px`);

      const done = !s.hover &&
        Math.abs(s.rx) < 0.04 &&
        Math.abs(s.ry) < 0.04 &&
        s.glare < 0.008;

      if (done) {
        el.classList.remove('pm-tilting');
        el.style.removeProperty('--pm-rx');
        el.style.removeProperty('--pm-ry');
        el.style.removeProperty('--pm-glare');
        el.style.removeProperty('--pm-px');
        el.style.removeProperty('--pm-py');
        activeTilts.delete(el);
      }
    }

    if (activeTilts.size > 0) {
      tiltRaf = requestAnimationFrame(stepTilts);
    } else {
      tiltRaf = 0;
    }
  }

  function ensureTiltState(el) {
    let s = tiltStates.get(el);
    if (!s) {
      s = { rx: 0, ry: 0, trx: 0, try: 0, mx: 50, my: 50, tmx: 50, tmy: 50, glare: 0, tglare: 0, hover: false };
      tiltStates.set(el, s);
    }
    return s;
  }

  if (!reduced && !coarse) {
    let currentCard = null;

    const releaseCard = (el) => {
      if (!el) return;
      const s = tiltStates.get(el);
      if (!s) return;
      s.hover = false;
      s.trx = 0;
      s.try = 0;
      s.tglare = 0;
      activeTilts.add(el);
      if (!tiltRaf) tiltRaf = requestAnimationFrame(stepTilts);
    };

    document.addEventListener('pointermove', (e) => {
      const card = e.target?.closest?.(CARD_SELECTOR) || null;
      if (currentCard && currentCard !== card) {
        releaseCard(currentCard);
      }
      currentCard = card;
      if (!card) return;

      const r = card.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0 || r.height > 680) {
        releaseCard(card);
        return;
      }

      const nx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      const ny = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));

      const isHero = card.classList.contains('collection-overview') ||
        card.classList.contains('story-overview') ||
        card.classList.contains('archive-banner') ||
        card.classList.contains('writer-overview') ||
        card.classList.contains('turntable-deck');
      const maxTilt = isHero ? 3.2 : (card.classList.contains('gallery-item') ? 8.5 : 5.5);

      const s = ensureTiltState(card);
      s.hover = true;
      s.trx = (0.5 - ny) * maxTilt * 2;
      s.try = (nx - 0.5) * maxTilt * 2;
      s.tmx = nx * 100;
      s.tmy = ny * 100;
      s.tglare = isHero ? 0.55 : 1;

      card.classList.add('pm-tilting');
      activeTilts.add(card);
      if (!tiltRaf) tiltRaf = requestAnimationFrame(stepTilts);
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      releaseCard(currentCard);
      currentCard = null;
    }, { passive: true });
  }

  /* ── 2. Dynamic Video Directly as Living Cards (card-gallery.html) ─────
        • Loads BOTH 觉醒前 (gasha) and 觉醒后 (costume) animations when available
        • Immediately plays whichever finishes loading first (never waits on the slower one!)
        • Once both are ready, automatically cycles 觉醒前 <-> 觉醒后 seamlessly
        • Syncs .card-phase-pill truthfully to the EXACT phase currently playing (zero mislabeling!) */
  if (!reduced && typeof IntersectionObserver !== 'undefined') {
    const activeCards = new Map(); // card -> { slots, activeIdx, fallbackTimer, disposed }
    const isLite = document.documentElement.dataset.mobile === '1'
      || document.documentElement.dataset.android === '1'
      || document.documentElement.dataset.joytrans === '1'
      || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    const MAX_LIVE_CARDS = isLite ? 2 : 12;
    let shellPageActive = !document.hidden;

    const syncCardPhaseUI = (card, slot) => {
      const stack = card.querySelector('.card-thumb-stack');
      const pill = card.querySelector('.card-phase-pill');
      const isAfter = slot.phase === 'after';
      if (stack) stack.classList.toggle('is-awakened', isAfter);
      if (pill) {
        pill.hidden = false;
        pill.textContent = slot.label || (isAfter ? '觉醒后' : '觉醒前');
      }
    };

    const parseCardMovies = (card) => {
      try {
        if (card.dataset.movies) {
          const arr = JSON.parse(card.dataset.movies);
          if (Array.isArray(arr) && arr.length) return arr.filter(x => x && x.path);
        }
      } catch {}
      if (card.dataset.movie) {
        const p = card.dataset.movie;
        const isAfter = /card_costume/i.test(p);
        return [{
          kind: isAfter ? 'costume' : 'gasha',
          phase: isAfter ? 'after' : 'before',
          label: isAfter ? '觉醒后' : '觉醒前',
          fullLabel: isAfter ? '觉醒后演出' : '觉醒前演出',
          path: p
        }];
      }
      return [];
    };

    const detachCardVideo = (card) => {
      const state = activeCards.get(card);
      if (!state) return;
      state.disposed = true;
      clearTimeout(state.fallbackTimer);
      activeCards.delete(card);
      delete card.dataset.videoControllingPhase;
      card.classList.remove('pm-video-active');
      for (const s of state.slots) {
        s.vid.classList.remove('is-ready');
      }
      setTimeout(() => {
        for (const s of state.slots) {
          try { s.vid.pause(); s.vid.removeAttribute('src'); s.vid.load(); } catch {}
          s.vid.remove();
        }
      }, 240);
    };

    const activateSlot = (card, state, idx) => {
      if (state.disposed || !card.isConnected) return;
      const slot = state.slots[idx];
      if (!slot || !slot.ready) return;

      const readyCount = state.slots.filter(s => s.ready).length;
      const shouldCycle = readyCount > 1;
      clearTimeout(state.fallbackTimer);

      state.activeIdx = idx;
      card.dataset.videoControllingPhase = '1';
      card.classList.add('pm-video-active');
      syncCardPhaseUI(card, slot);

      for (let i = 0; i < state.slots.length; i++) {
        const s = state.slots[i];
        if (i === idx) {
          s.vid.loop = !shouldCycle;
          try { s.vid.currentTime = 0; } catch {}
          s.vid.classList.add('is-ready');
          if (shellPageActive) s.vid.play().catch(() => {});
        } else {
          s.vid.loop = false;
          s.vid.classList.remove('is-ready');
          try { s.vid.pause(); } catch {}
        }
      }

      if (shouldCycle) {
        // Safety fallback in case a clip's ended event is delayed or duration is unusually long
        const durMs = (Number.isFinite(slot.vid.duration) && slot.vid.duration > 1.2 && slot.vid.duration < 20)
          ? Math.round(slot.vid.duration * 1000) + 250
          : 6500;
        state.fallbackTimer = setTimeout(() => {
          if (state.disposed || state.activeIdx !== idx || !shellPageActive) return;
          advanceCardSlot(card, state);
        }, durMs);
      }
    };

    const advanceCardSlot = (card, state) => {
      if (state.disposed) return;
      const readyIndices = [];
      for (let i = 0; i < state.slots.length; i++) {
        if (state.slots[i].ready) readyIndices.push(i);
      }
      if (readyIndices.length < 2) return;
      const curPos = readyIndices.indexOf(state.activeIdx);
      const nextIdx = readyIndices[(curPos + 1) % readyIndices.length];
      activateSlot(card, state, nextIdx);
    };

    const attachCardVideo = (card) => {
      if (activeCards.has(card) || !card.isConnected) return;
      const movies = parseCardMovies(card);
      if (!movies.length) return;

      // Keep active video pool bounded for silky 60fps scrolling
      if (activeCards.size >= MAX_LIVE_CARDS) {
        const oldest = activeCards.keys().next().value;
        if (oldest) detachCardVideo(oldest);
      }

      const host = card.querySelector('.card-thumb-stack') || card;
      const state = { slots: [], activeIdx: -1, fallbackTimer: 0, disposed: false };
      activeCards.set(card, state);

      const cardMeta = {
        id: card.dataset.cardId || '',
        name: card.dataset.cardName || '',
        idol: card.dataset.cardIdol || ''
      };

      movies.forEach((m, idx) => {
        const vid = document.createElement('video');
        vid.className = 'pm-live-preview';
        vid.dataset.phase = m.phase;
        vid.dataset.label = m.label;
        vid.muted = true;
        vid.loop = true;
        vid.autoplay = false;
        vid.playsInline = true;
        vid.preload = 'auto';
        vid.src = '/asset-original/' + m.path;

        const slot = { ...m, vid, ready: false, failed: false };
        state.slots.push(slot);

        vid.addEventListener('canplay', () => {
          if (state.disposed || activeCards.get(card) !== state) return;
          slot.ready = true;
          try {
            if (cardMeta.id) window.ShinyBanners?.registerLoadedMovie?.(cardMeta, m.path, m.fullLabel || m.label);
          } catch {}

          if (state.activeIdx === -1) {
            // Play whichever animation finishes loading FIRST immediately, with accurate phase badge!
            activateSlot(card, state, idx);
          } else {
            // Second animation just finished loading! Enable automatic 觉醒前 <-> 觉醒后 loop on the active video!
            const cur = state.slots[state.activeIdx];
            if (cur && cur.vid.loop) {
              cur.vid.loop = false;
              clearTimeout(state.fallbackTimer);
              const remSec = (Number.isFinite(cur.vid.duration) && cur.vid.duration > cur.vid.currentTime)
                ? (cur.vid.duration - cur.vid.currentTime)
                : 3.5;
              const waitMs = Math.max(1200, Math.min(8000, Math.round(remSec * 1000) + 200));
              state.fallbackTimer = setTimeout(() => {
                if (state.disposed || state.activeIdx !== state.slots.indexOf(cur) || !shellPageActive) return;
                advanceCardSlot(card, state);
              }, waitMs);
            }
          }
        }, { once: true });

        vid.addEventListener('ended', () => {
          if (state.disposed || activeCards.get(card) !== state) return;
          if (state.activeIdx !== idx) return;
          const readyCount = state.slots.filter(s => s.ready).length;
          if (readyCount > 1) {
            advanceCardSlot(card, state);
          } else {
            // Only 1 video available -> loop smoothly on itself
            try { vid.currentTime = 0; if (shellPageActive) vid.play().catch(() => {}); } catch {}
          }
        });

        vid.addEventListener('error', () => {
          slot.failed = true;
          if (state.slots.every(s => s.failed)) detachCardVideo(card);
        }, { once: true });

        const pill = host.querySelector('.card-phase-pill');
        if (pill) host.insertBefore(vid, pill);
        else host.appendChild(vid);
      });
    };

    const syncAllCardVideosPower = (active) => {
      shellPageActive = !!active && !document.hidden;
      for (const [card, state] of activeCards.entries()) {
        if (state.disposed || state.activeIdx < 0) continue;
        const cur = state.slots[state.activeIdx];
        if (!cur) continue;
        if (shellPageActive) {
          cur.vid.play().catch(() => {});
        } else {
          clearTimeout(state.fallbackTimer);
          try { cur.vid.pause(); } catch {}
        }
      }
    };

    document.addEventListener('visibilitychange', () => syncAllCardVideosPower(!document.hidden));
    window.addEventListener('message', (e) => {
      if (e.origin === location.origin && e.data?.type === 'shiny-shell-visibility') {
        syncAllCardVideosPower(!!e.data.active);
      }
    });

    const videoSeen = new WeakSet();
    const videoIO = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) attachCardVideo(entry.target);
        else detachCardVideo(entry.target);
      }
    }, { rootMargin: '60px 0px', threshold: 0.08 });

    const scanLiveCards = () => {
      document.querySelectorAll('.card-archive .gallery-item[data-movie], .card-archive .gallery-item[data-movies]').forEach(card => {
        if (videoSeen.has(card)) return;
        videoSeen.add(card);
        videoIO.observe(card);
      });
    };

    const bootLiveCards = () => {
      if (!document.body?.classList.contains('card-archive')) return;
      scanLiveCards();
      if (typeof MutationObserver !== 'undefined') {
        let vt = 0;
        new MutationObserver(() => {
          if (vt) return;
          vt = requestAnimationFrame(() => { vt = 0; scanLiveCards(); });
        }).observe(document.body, { childList: true, subtree: true });
      }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootLiveCards);
    else bootLiveCards();
  }

  /* ── Helper: Shell-Iframe Visibility Awareness ────────────────────────── */
  const isJoyTrans = document.documentElement.dataset.joytrans === '1'
    || /JoyTrans|Droitong/i.test(navigator.userAgent || '');
  const isMobileEnv = coarse
    || document.documentElement.dataset.mobile === '1'
    || document.documentElement.dataset.android === '1'
    || isJoyTrans
    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');

  const isFrameVisibleNow = () => {
    if (document.hidden) return false;
    try {
      if (window.self === window.top) return true;
      const fe = window.frameElement;
      if (fe && fe.classList) {
        if (fe.classList.contains('is-active') || fe.classList.contains('active')) return true;
        const st = getComputedStyle(fe);
        return st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity || '1') > 0.05;
      }
    } catch {}
    return true;
  };

  let pageEverVisible = isFrameVisibleNow();
  const onFirstVisibleCallbacks = [];
  const notifyPageVisible = () => {
    if (pageEverVisible) return;
    pageEverVisible = true;
    while (onFirstVisibleCallbacks.length) {
      const fn = onFirstVisibleCallbacks.shift();
      try { fn(); } catch {}
    }
  };

  window.addEventListener('message', (e) => {
    if (e.origin === location.origin && e.data?.type === 'shiny-shell-visibility' && e.data.active) {
      notifyPageVisible();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isFrameVisibleNow()) notifyPageVisible();
  });

  const whenVisible = (fn) => {
    if (pageEverVisible || isFrameVisibleNow()) {
      pageEverVisible = true;
      fn();
    } else {
      onFirstVisibleCallbacks.push(fn);
    }
  };

  /* ── 3. Scroll Reveal + Spatial Wave Stagger Animation ──────────────── */
  if (!reduced && typeof IntersectionObserver !== 'undefined') {
    const REVEAL_SELECTOR = [
      // Hero / section blocks
      '.collection-overview',
      '.story-overview',
      '.writer-overview',
      '.collection-heading',
      '.section-title',
      '.collection-stats .collection-stat',
      '.music-stats-summary .music-stats-item',
      '.writer-stats .collection-stat',
      // Long-scrolling grids & lists across all modules
      '.card-archive .gallery-item',
      '.guide-unified .unit',
      '.guide-unified #list .card',
      '.guide-unified section.section',
      '.page-wardrobe .model-card',
      '.page-voice .voice',
      '.page-music .song-row-item',
      '.page-music .account-pl-card',
      '.page-music .custom-playlist-card',
      '.page-music .idol-filter-section',
      '.page-custom .panel',
      '.page-custom .custom-story-card',
      '.page-custom .story-library-card',
      '.page-arcade .vq-card-shell'
    ].join(', ');

    const seen = new WeakSet();
    const pendingBatch = new Set();
    let batchRaf = 0;

    const flushRevealBatch = () => {
      batchRaf = 0;
      if (!pendingBatch.size) return;
      const items = Array.from(pendingBatch);
      pendingBatch.clear();

      const vh = window.innerHeight || 900;
      // Sort by visual spatial position (top row -> left column) for diagonal prism wave stagger!
      const measured = items.map(el => {
        const r = el.getBoundingClientRect();
        return { el, topPx: r.top, top: Math.round(r.top / 48), left: Math.round(r.left / 48) };
      });
      measured.sort((a, b) => (a.top - b.top) || (a.left - b.left));

      const stepMs = isJoyTrans ? 12 : (isMobileEnv ? 18 : 24);
      const maxDelayMs = isJoyTrans ? 60 : (isMobileEnv ? 96 : 130);

      measured.forEach((item, idx) => {
        const el = item.el;
        el.classList.remove('pm-resetting');
        const delay = Math.min(idx * stepMs, maxDelayMs);
        el.style.setProperty('--pm-delay', `${delay}ms`);
        el.classList.add('pm-revealed');
      });
    };

    const io = new IntersectionObserver((entries) => {
      const vh = window.innerHeight || 900;
      for (const entry of entries) {
        const el = entry.target;
        if (entry.isIntersecting) {
          if (!el.classList.contains('pm-revealed')) {
            pendingBatch.add(el);
          }
        } else {
          // ONLY reset silently when FAR outside the visible viewport (>140px away) — ZERO edge flicker!
          const r = entry.boundingClientRect;
          const farAbove = r.bottom < -140;
          const farBelow = r.top > vh + 140;
          if ((farAbove || farBelow) && el.classList.contains('pm-revealed')) {
            pendingBatch.delete(el);
            el.classList.add('pm-resetting');
            el.classList.remove('pm-revealed');
            el.classList.toggle('pm-from-top', farAbove);
            el.style.removeProperty('--pm-delay');
          }
        }
      }
      if (pendingBatch.size && !batchRaf) {
        batchRaf = requestAnimationFrame(flushRevealBatch);
      }
    }, { rootMargin: '150px 0px 150px 0px', threshold: 0.01 });

    // Safety sweep on fast scroll: ensure any currently visible cards never stay unrevealed
    let sweepTimer = 0;
    const sweepVisibleUnrevealed = () => {
      sweepTimer = 0;
      const vh = window.innerHeight || 900;
      document.querySelectorAll('.pm-cascade:not(.pm-revealed)').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.height > 0 && r.bottom > 0 && r.top < vh + 40) {
          pendingBatch.add(el);
        }
      });
      if (pendingBatch.size && !batchRaf) {
        batchRaf = requestAnimationFrame(flushRevealBatch);
      }
    };
    const onFastScroll = () => {
      if (!sweepTimer) sweepTimer = setTimeout(sweepVisibleUnrevealed, 120);
    };
    window.addEventListener('scroll', onFastScroll, { passive: true, capture: true });

    const scanReveal = (root = document) => {
      if (!root?.querySelectorAll) return;
      root.querySelectorAll(REVEAL_SELECTOR).forEach(el => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add('pm-cascade');
        if (el.matches('.collection-stat, .music-stats-item, .song-row-item, .voice')) {
          el.classList.add('pm-stagger-row');
        }
        io.observe(el);
      });
    };

    const bootReveal = () => {
      whenVisible(() => {
        scanReveal(document);
        if (typeof MutationObserver !== 'undefined' && document.body) {
          let moTimer = 0;
          new MutationObserver(() => {
            if (moTimer) return;
            moTimer = requestAnimationFrame(() => {
              moTimer = 0;
              scanReveal(document);
            });
          }).observe(document.body, { childList: true, subtree: true });
        }
      });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootReveal);
    else bootReveal();
  }

  /* ── 4. Parallax Scrolling (GPU Depth Layering on Hero Banners) ─────── */
  if (!reduced && !isJoyTrans) {
    const PARALLAX_HOST_SELECTOR = '.collection-overview, .story-overview, .writer-overview';
    const PARALLAX_ART_SELECTOR = '.archive-banner-art, .collection-cover-art, .overview-art, video.archive-banner-video, video.collection-cover-video';
    let parallaxHosts = [];
    let parallaxRaf = 0;

    const refreshParallaxHosts = () => {
      parallaxHosts = Array.from(document.querySelectorAll(PARALLAX_HOST_SELECTOR));
      parallaxHosts.forEach(host => {
        host.classList.add('pm-parallax-host');
        host.querySelectorAll(PARALLAX_ART_SELECTOR).forEach(art => art.classList.add('pm-parallax-art'));
        const copy = host.querySelector('.overview-copy');
        if (copy) copy.classList.add('pm-parallax-copy');
      });
    };

    const updateParallax = () => {
      parallaxRaf = 0;
      if (!parallaxHosts.length) return;
      const vh = window.innerHeight || 800;
      const artRange = isMobileEnv ? 16 : 30;
      const copyRange = isMobileEnv ? -5 : -11;

      for (const host of parallaxHosts) {
        if (!host.isConnected) continue;
        const r = host.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) continue;
        // Normalized viewport progress [-1, 1] around vertical center
        const center = r.top + r.height * 0.5;
        const progress = Math.max(-1, Math.min(1, (center - vh * 0.5) / (vh * 0.65)));

        const artY = (progress * artRange).toFixed(2);
        const copyY = (progress * copyRange).toFixed(2);
        host.style.setProperty('--pm-par-art-y', `${artY}px`);
        host.style.setProperty('--pm-par-copy-y', `${copyY}px`);
      }
    };

    const scheduleParallax = () => {
      if (!parallaxRaf) parallaxRaf = requestAnimationFrame(updateParallax);
    };

    const bootParallax = () => {
      refreshParallaxHosts();
      if (!parallaxHosts.length) return;
      updateParallax();
      window.addEventListener('scroll', scheduleParallax, { passive: true });
      window.addEventListener('resize', scheduleParallax, { passive: true });
      // Also listen to inner scroll containers if any page scrolls inside <main>
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.addEventListener('scroll', scheduleParallax, { passive: true });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootParallax);
    else bootParallax();
  }

  /* ── 5. Tuned Text Scramble (Unhurried 18fps Stepped Prism Decode) ─── */
  if (!reduced && typeof IntersectionObserver !== 'undefined') {
    const SCRAMBLE_SELECTOR = [
      '.collection-page-head .eyebrow',
      '.collection-page-head h1',
      '.overview-copy small',
      '.overview-copy h2',
      '.section-title h2',
      '.voice-directory .eyebrow',
      '.voice-directory h2',
      '.page-music h1',
      '.page-arcade h1',
      '.page-custom h1'
    ].join(', ');

    // Use strict width-matched glyph sets (full-width CJK for CJK, uniform-width caps for ASCII) to prevent line-wrap jitter!
    const ASCII_GLYPHS = 'ABCDEFGHKMNPRSTWXYZ23456789';
    const CJK_GLYPHS = '星耀光彩梦翼音律霓虹晨曦流萤羽织';
    const scrambleSeen = new WeakSet();
    const scrambleActive = new WeakMap();
    const scrambleOrigMap = new WeakMap();

    const collectTextNodes = (el) => {
      const nodes = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      let n;
      while ((n = walker.nextNode())) {
        if (n.nodeValue && n.nodeValue.trim().length > 0) nodes.push(n);
      }
      return nodes;
    };

    const pickGlyph = (ch) => {
      if (/\s|[，。、：；！？!?,.:;()（）「」『』·\-—]/.test(ch)) return ch;
      if (/[\u3000-\u9fff\u3040-\u30ff]/.test(ch)) {
        return CJK_GLYPHS[(Math.random() * CJK_GLYPHS.length) | 0];
      }
      return ASCII_GLYPHS[(Math.random() * ASCII_GLYPHS.length) | 0];
    };

    const runTextScramble = (el, durationMs = 460) => {
      if (!el || !el.isConnected) return;
      const prev = scrambleActive.get(el);
      if (prev) {
        cancelAnimationFrame(prev.raf);
        if (prev.releaseLock) prev.releaseLock();
      }

      let segments = scrambleOrigMap.get(el);
      if (!segments || segments.some(s => !s.node.isConnected)) {
        const textNodes = collectTextNodes(el);
        if (!textNodes.length) return;
        segments = textNodes.map(node => ({ node, orig: node.nodeValue }));
        scrambleOrigMap.set(el, segments);
      }
      const totalChars = segments.reduce((sum, s) => sum + s.orig.length, 0);
      if (totalChars === 0 || totalChars > 90) return;

      const dur = isJoyTrans ? Math.min(durationMs, 420) : durationMs;
      const glyphStepMs = 36; // ~28fps crisp, snappy prism decode
      let start = 0;
      let lastGlyphTick = -999;

      // Lock exact bounding height during scramble so surrounding UI NEVER shifts a single pixel!
      const boxRect = el.getBoundingClientRect();
      const lockedH = boxRect.height > 0 ? `${Math.ceil(boxRect.height)}px` : '';
      if (lockedH) {
        el.style.minHeight = lockedH;
        el.style.maxHeight = lockedH;
        el.style.overflow = 'hidden';
      }

      const releaseLock = () => {
        el.style.removeProperty('min-height');
        el.style.removeProperty('max-height');
        el.style.removeProperty('overflow');
        el.classList.remove('pm-scrambling');
      };

      const state = { raf: 0, releaseLock };
      scrambleActive.set(el, state);
      el.classList.add('pm-scrambling');

      const tick = (now) => {
        if (!start) start = now;
        const elapsed = Math.max(0, now - start);
        const progress = Math.max(0, Math.min(1, elapsed / dur));

        if (progress < 1 && (now - lastGlyphTick) < glyphStepMs) {
          state.raf = requestAnimationFrame(tick);
          return;
        }
        lastGlyphTick = now;

        // Smooth easeOutQuad reveal frontier
        const eased = 1 - (1 - progress) * (1 - progress);
        const settledCount = Math.floor(eased * totalChars);

        let globalIdx = 0;
        for (const seg of segments) {
          const orig = seg.orig;
          let out = '';
          for (let i = 0; i < orig.length; i++, globalIdx++) {
            const ch = orig[i];
            if (globalIdx < settledCount || progress >= 1) {
              out += ch;
            } else if (globalIdx < settledCount + 3) {
              out += pickGlyph(ch);
            } else {
              out += (progress > 0.08 && Math.random() < 0.35) ? pickGlyph(ch) : pickGlyph(ch);
            }
          }
          if (seg.node.nodeValue !== out) seg.node.nodeValue = out;
        }

        if (progress < 1) {
          state.raf = requestAnimationFrame(tick);
        } else {
          releaseLock();
          scrambleActive.delete(el);
        }
      };

      state.raf = requestAnimationFrame(tick);
    };

    const scramblePlayed = new WeakSet();
    const scrambleIO = new IntersectionObserver((entries) => {
      const vh = window.innerHeight || 900;
      let delayIdx = 0;
      for (const entry of entries) {
        const el = entry.target;
        if (entry.isIntersecting) {
          if (!scramblePlayed.has(el)) {
            scramblePlayed.add(el);
            const delay = Math.min(delayIdx * 45, 140);
            delayIdx++;
            setTimeout(() => runTextScramble(el, el.matches('h1, h2') ? 560 : 440), delay);
          }
        } else {
          const r = entry.boundingClientRect;
          if (r.bottom < -160 || r.top > vh + 160) {
            scramblePlayed.delete(el);
          }
        }
      }
    }, { rootMargin: '60px 0px 60px 0px', threshold: 0.1 });

    const bootScramble = () => {
      whenVisible(() => {
        document.querySelectorAll(SCRAMBLE_SELECTOR).forEach(el => {
          if (scrambleSeen.has(el)) return;
          scrambleSeen.add(el);
          scrambleIO.observe(el);
        });
        const heroTitle = document.getElementById('heroSongTitle');
        if (heroTitle && typeof MutationObserver !== 'undefined') {
          let lastTitle = heroTitle.textContent?.trim() || '';
          new MutationObserver(() => {
            if (heroTitle.classList.contains('pm-scrambling')) return;
            const cur = heroTitle.textContent?.trim() || '';
            if (cur && cur !== lastTitle) {
              lastTitle = cur;
              scrambleOrigMap.delete(heroTitle);
              runTextScramble(heroTitle, 420);
            }
          }).observe(heroTitle, { childList: true, characterData: true, subtree: true });
        }
      });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootScramble);
    else bootScramble();
  }

  /* ── 6. Tuned Number Count Up (Graceful easeOutCubic Roll) ──────────── */
  if (!reduced && typeof IntersectionObserver !== 'undefined') {
    const COUNTUP_SELECTOR = [
      '.collection-stat > b',
      '.writer-stats b',
      '.music-stats-item strong',
      '.music-stats-item b',
      '.vq-stats b',
      '.vq-stats strong'
    ].join(', ');

    const countSeen = new WeakSet();
    const countPlayed = new WeakSet();
    const countLastTarget = new WeakMap();
    const countActive = new WeakMap();

    const parseNumericText = (raw) => {
      const str = String(raw || '').trim();
      const m = str.match(/^([^\d\-+]*)([-+]?\d[\d,]*(?:\.\d+)?)(.*)$/);
      if (!m) return null;
      const prefix = m[1] || '';
      const numStr = m[2];
      const suffix = m[3] || '';
      const hasComma = numStr.includes(',');
      const dotIdx = numStr.indexOf('.');
      const decimals = dotIdx >= 0 ? (numStr.length - dotIdx - 1) : 0;
      const value = parseFloat(numStr.replace(/,/g, ''));
      if (!Number.isFinite(value)) return null;
      return { prefix, value, decimals, hasComma, suffix, raw: str };
    };

    const formatNumber = (val, spec) => {
      const fixed = spec.decimals > 0 ? val.toFixed(spec.decimals) : String(Math.round(val));
      if (!spec.hasComma) return `${spec.prefix}${fixed}${spec.suffix}`;
      const parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return `${spec.prefix}${parts.join('.')}${spec.suffix}`;
    };

    const animateCountUp = (el, forceReplay = false) => {
      if (!el || !el.isConnected) return;
      const spec = parseNumericText(countLastTarget.get(el) || el.textContent);
      if (!spec || spec.value === 0) return;

      if (!forceReplay && countLastTarget.get(el) === spec.raw && countPlayed.has(el)) return;
      countLastTarget.set(el, spec.raw);
      countPlayed.add(el);

      const running = countActive.get(el);
      if (running) cancelAnimationFrame(running.raf);

      // Snappy duration with crisp easeOutCubic deceleration & strict >= 0 clamp
      const duration = isJoyTrans ? 500 : (spec.value >= 100 ? 780 : 600);
      let start = 0;
      const state = { raf: 0, animating: true };
      countActive.set(el, state);
      el.classList.add('pm-counting');

      const step = (now) => {
        if (!start) start = now;
        const t = Math.max(0, Math.min(1, (now - start) / duration));
        // easeOutCubic: fast climb with crisp landing (never negative!)
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.max(0, spec.value * eased);
        const formatted = t >= 1 ? spec.raw : formatNumber(current, spec);
        if (el.textContent !== formatted) el.textContent = formatted;

        if (t < 1) {
          state.raf = requestAnimationFrame(step);
        } else {
          state.animating = false;
          el.classList.remove('pm-counting');
          countActive.delete(el);
        }
      };

      state.raf = requestAnimationFrame(step);
    };

    const countIO = new IntersectionObserver((entries) => {
      const vh = window.innerHeight || 900;
      let i = 0;
      for (const entry of entries) {
        const el = entry.target;
        if (entry.isIntersecting) {
          if (!countPlayed.has(el)) {
            const spec = parseNumericText(countLastTarget.get(el) || el.textContent);
            if (spec && spec.value > 0) {
              countLastTarget.set(el, spec.raw);
              el.textContent = formatNumber(0, spec);
            }
            const delay = Math.min(i * 40, 140);
            i++;
            setTimeout(() => animateCountUp(el, true), delay);
          }
        } else {
          const r = entry.boundingClientRect;
          if (r.bottom < -160 || r.top > vh + 160) {
            countPlayed.delete(el);
            const spec = parseNumericText(countLastTarget.get(el));
            if (spec && spec.value > 0) el.textContent = formatNumber(0, spec);
          }
        }
      }
    }, { rootMargin: '60px 0px 60px 0px', threshold: 0.1 });

    const watchCountEl = (el) => {
      if (countSeen.has(el)) return;
      countSeen.add(el);
      const initSpec = parseNumericText(el.textContent);
      if (initSpec && initSpec.value > 0) {
        countLastTarget.set(el, initSpec.raw);
        el.textContent = formatNumber(0, initSpec);
      }
      countIO.observe(el);

      if (typeof MutationObserver !== 'undefined') {
        new MutationObserver(() => {
          const st = countActive.get(el);
          if (st && st.animating) return;
          const spec = parseNumericText(el.textContent);
          // NEVER overwrite target with 0 (prevents our own reset-to-0 from wiping countLastTarget!)
          if (spec && spec.value > 0 && spec.raw !== countLastTarget.get(el) && pageEverVisible) {
            countLastTarget.set(el, spec.raw);
            el.textContent = formatNumber(0, spec);
            animateCountUp(el, true);
          }
        }).observe(el, { childList: true, characterData: true, subtree: true });
      }
    };

    const scanCountUps = (root = document) => {
      if (!root?.querySelectorAll) return;
      root.querySelectorAll(COUNTUP_SELECTOR).forEach(watchCountEl);
    };

    const bootCountUp = () => {
      whenVisible(() => {
        scanCountUps(document);
        if (typeof MutationObserver !== 'undefined' && document.body) {
          let cMo = 0;
          new MutationObserver(() => {
            if (cMo) return;
            cMo = requestAnimationFrame(() => {
              cMo = 0;
              scanCountUps(document);
            });
          }).observe(document.body, { childList: true, subtree: true });
        }
      });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootCountUp);
    else bootCountUp();
  }
})();
