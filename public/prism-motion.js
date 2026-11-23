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

  /* ── 3. Choreographed Staggered Cascade Entrance (Desktop only — skip on mobile for silky 60fps scroll!) ── */
  const isMobileSkipCascade = coarse
    || document.documentElement.dataset.mobile === '1'
    || document.documentElement.dataset.android === '1'
    || document.documentElement.dataset.joytrans === '1'
    || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  if (!reduced && !isMobileSkipCascade && typeof IntersectionObserver !== 'undefined') {
    const CASCADE_SELECTOR = '.card-archive .gallery-item, .guide-unified .unit, .guide-unified #list .card, .page-wardrobe .model-card, .page-voice .voice';
    const seen = new WeakSet();

    const io = new IntersectionObserver((entries) => {
      let batchIndex = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        io.unobserve(el);
        el.style.setProperty('--pm-delay', `${Math.min(batchIndex * 28, 220)}ms`);
        el.classList.add('pm-revealed');
        batchIndex++;
      }
    }, { rootMargin: '40px 0px', threshold: 0.04 });

    const scan = (root = document) => {
      if (!root?.querySelectorAll) return;
      root.querySelectorAll(CASCADE_SELECTOR).forEach(el => {
        if (seen.has(el)) return;
        seen.add(el);
        el.classList.add('pm-cascade');
        io.observe(el);
      });
    };

    const bootCascade = () => {
      scan(document);
      if (typeof MutationObserver !== 'undefined' && document.body) {
        let moTimer = 0;
        new MutationObserver(() => {
          if (moTimer) return;
          moTimer = requestAnimationFrame(() => {
            moTimer = 0;
            scan(document);
          });
        }).observe(document.body, { childList: true, subtree: true });
      }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootCascade);
    else bootCascade();
  }
})();
