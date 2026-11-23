/* ═══════════════════════════════════════════════════════════════════
   ShinyStories UI Upgrade — Interaction Enhancements
   Shimmer management, cursor lighting, and smooth opening choreography.
   ═══════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  /* ── 1. App Launch Awakening ──────────────────────────────── */
  function setupAppAwakening() {
    // Only run awakening on cold boot/initial session launch to avoid clashing with View Transitions
    if (sessionStorage.getItem('app-booted')) return;
    sessionStorage.setItem('app-booted', '1');

    document.body.classList.add('app-booting');
    window.addEventListener(
      'animationend',
      (e) => {
        if (e.target === document.body) {
          document.body.classList.remove('app-booting');
        }
      },
      { once: true }
    );
    // Safety fallback
    setTimeout(() => {
      document.body.classList.remove('app-booting');
    }, 1000);
  }

  /* ── 2. Shimmer Skeleton Loader ──────────────────────────── */
  function setupShimmer() {
    // Add shimmer to loading stats
    document.querySelectorAll('#count, #translated').forEach((el) => {
      if (el.textContent.trim() === '…' || el.textContent.trim() === '') {
        el.classList.add('shimmer');
        el.style.minWidth = '3em';
        el.style.display = 'inline-block';

        const mo = new MutationObserver(() => {
          if (el.textContent.trim() !== '…' && el.textContent.trim() !== '') {
            el.classList.remove('shimmer');
            el.style.minWidth = '';
            mo.disconnect();
          }
        });
        mo.observe(el, { childList: true, characterData: true, subtree: true });
      }
    });
  }

  /* ── 3. Glass Cursor Glow (desktop only) ─────────────────── */
  function setupGlassGlow() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const header = document.querySelector('.site-header');
    if (!header) return;

    let rafId = 0;
    function handleMove(event) {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const target = event.target.closest('.site-nav a, .site-brand');
        if (!target) return;
        const rect = target.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const x = ((event.clientX - rect.left) / rect.width) * 100;
          const y = ((event.clientY - rect.top) / rect.height) * 100;
          target.style.setProperty('--glass-x', `${x}%`);
          target.style.setProperty('--glass-y', `${y}%`);
        }
      });
    }

    header.addEventListener('pointermove', handleMove, { passive: true });
  }

  /* ── 4. Smooth Stats Counter ─────────────────────────────── */
  function setupCounters() {
    const statElements = document.querySelectorAll(
      '.collection-stat > b, .story-stat b'
    );

    for (const el of statElements) {
      const mo = new MutationObserver(() => {
        const text = el.textContent.trim();
        const num = parseInt(text.replace(/[^\d]/g, ''), 10);
        if (!isNaN(num) && num > 0 && !el.dataset.counted) {
          el.dataset.counted = 'true';
          animateCounter(el, num, text.replace(/\d+/, '{N}'));
          mo.disconnect();
        }
      });
      mo.observe(el, { childList: true, characterData: true, subtree: true });
    }
  }

  function animateCounter(el, target, template) {
    const duration = Math.min(800, Math.max(300, target * 2));
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);
      el.textContent = template.replace('{N}', String(current));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  /* ── 5. Page Load Choreography ───────────────────────────── */
  function choreographLoad() {
    // Mark body as loaded for CSS entrance triggers
    requestAnimationFrame(() => {
      document.body.classList.add('ui-loaded');
    });
  }

  /* ── 6. Warm Glass Hover for Home Controls ───────────────── */
  function setupHomeGlass() {
    if (!document.body.classList.contains('page-home')) return;

    const glassElements = document.querySelectorAll(
      '.page-home .side a, .page-home .side button, .page-home .tools button'
    );

    for (const el of glassElements) {
      el.addEventListener(
        'pointerenter',
        (e) => {
          const rect = el.getBoundingClientRect();
          el.style.setProperty(
            '--glass-x',
            `${((e.clientX - rect.left) / rect.width) * 100}%`
          );
        },
        { passive: true }
      );
    }
  }

  /* ── 7. Intuitive Backdrop Dismiss for all Dialogs ─────────── */
  function setupDialogBackdropDismiss() {
    let pointerDownOutside = false;

    document.addEventListener('pointerdown', (event) => {
      pointerDownOutside = false;
      const dialog = event.target;
      if (dialog instanceof HTMLDialogElement && dialog.open) {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (
          rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX && event.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          pointerDownOutside = true;
        }
      }
    });

    document.addEventListener('click', (event) => {
      if (!pointerDownOutside) return;
      pointerDownOutside = false;
      const dialog = event.target;
      if (dialog instanceof HTMLDialogElement && dialog.open) {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (
          rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX && event.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          dialog.close();
        }
      }
    });
  }

  /* ── Boot ─────────────────────────────────────────────────── */
  function boot() {
    setupAppAwakening();
    choreographLoad();
    setupShimmer();
    setupGlassGlow();
    setupHomeGlass();
    setupDialogBackdropDismiss();

    requestAnimationFrame(() => {
      setupCounters();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
