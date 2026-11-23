/* ═══════════════════════════════════════════════════════════════════════════
   283 NEW CONTENT BADGE SYSTEM (新剧情 / 新衣装 / 新卡片 NEW 角标 + 一键消除)
   Automatically marks items added by updates; clicking an item clears its
   NEW badge immediately; provides a one-click Clear All NEW Badges button.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const SEEN_KEY = 'shiny.newBadges.seen.v1';
  const KNOWN_KEY = 'shiny.newBadges.known.v1';
  const DETECTED_KEY = 'shiny.newBadges.detected.v1';
  const KINDS = ['stories', 'cards', 'models'];

  function readBucket(storageKey) {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return {
        stories: new Set(Array.isArray(raw.stories) ? raw.stories : []),
        cards: new Set(Array.isArray(raw.cards) ? raw.cards : []),
        models: new Set(Array.isArray(raw.models) ? raw.models : [])
      };
    } catch {
      return { stories: new Set(), cards: new Set(), models: new Set() };
    }
  }

  function writeBucket(storageKey, bucket) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        stories: [...bucket.stories],
        cards: [...bucket.cards],
        models: [...bucket.models]
      }));
    } catch {}
  }

  const seen = readBucket(SEEN_KEY);
  const known = readBucket(KNOWN_KEY);
  const detected = readBucket(DETECTED_KEY);
  const manifest = { stories: new Set(), cards: new Set(), models: new Set() };
  const listeners = new Set();

  const ready = fetch('/data/new-items.json', { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      if (!data || typeof data !== 'object') return;
      for (const k of KINDS) {
        if (Array.isArray(data[k])) {
          for (const id of data[k]) {
            if (id) manifest[k].add(String(id));
          }
        }
      }
      notify();
    })
    .catch(() => {});

  function isNew(kind, id) {
    if (!id || !KINDS.includes(kind)) return false;
    const key = String(id);
    if (seen[kind].has(key)) return false;
    return manifest[kind].has(key) || detected[kind].has(key);
  }

  function count(kind) {
    if (!KINDS.includes(kind)) return 0;
    const union = new Set([...manifest[kind], ...detected[kind]]);
    let n = 0;
    for (const id of union) {
      if (!seen[kind].has(id)) n++;
    }
    return n;
  }

  function totalCount() {
    return count('stories') + count('cards') + count('models');
  }

  function notify() {
    for (const fn of listeners) {
      try { fn(); } catch {}
    }
    try {
      window.dispatchEvent(new CustomEvent('shiny-new-badges-changed', {
        detail: {
          stories: count('stories'),
          cards: count('cards'),
          models: count('models'),
          total: totalCount()
        }
      }));
    } catch {}
  }

  function reconcile(kind, allIds) {
    if (!KINDS.includes(kind) || !Array.isArray(allIds) || !allIds.length) return;
    const idStrings = allIds.map(x => String(x)).filter(Boolean);
    if (known[kind].size > 0) {
      let added = false;
      for (const id of idStrings) {
        if (!known[kind].has(id)) {
          detected[kind].add(id);
          known[kind].add(id);
          added = true;
        }
      }
      if (added) {
        writeBucket(DETECTED_KEY, detected);
        writeBucket(KNOWN_KEY, known);
        notify();
      }
    } else {
      for (const id of idStrings) known[kind].add(id);
      writeBucket(KNOWN_KEY, known);
    }
  }

  function markSeen(kind, id, cardEl) {
    if (!id || !KINDS.includes(kind)) return;
    const key = String(id);
    if (isNew(kind, key)) {
      seen[kind].add(key);
      detected[kind].delete(key);
      writeBucket(SEEN_KEY, seen);
      writeBucket(DETECTED_KEY, detected);
      notify();
    }
    if (cardEl) {
      cardEl.querySelectorAll('.shiny-new-badge').forEach(el => el.remove());
      cardEl.classList.remove('has-new-badge');
    }
  }

  function clearKind(kind) {
    if (!KINDS.includes(kind)) return;
    for (const id of manifest[kind]) seen[kind].add(id);
    for (const id of detected[kind]) seen[kind].add(id);
    detected[kind].clear();
    writeBucket(SEEN_KEY, seen);
    writeBucket(DETECTED_KEY, detected);
    document.querySelectorAll(`.shiny-new-badge[data-new-kind="${kind}"], .shiny-new-badge`).forEach(el => el.remove());
    document.querySelectorAll('.has-new-badge').forEach(el => el.classList.remove('has-new-badge'));
    notify();
  }

  function clearAll() {
    for (const kind of KINDS) {
      for (const id of manifest[kind]) seen[kind].add(id);
      for (const id of detected[kind]) seen[kind].add(id);
      detected[kind].clear();
    }
    writeBucket(SEEN_KEY, seen);
    writeBucket(DETECTED_KEY, detected);
    document.querySelectorAll('.shiny-new-badge').forEach(el => el.remove());
    document.querySelectorAll('.has-new-badge').forEach(el => el.classList.remove('has-new-badge'));
    notify();
  }

  function badgeEl(kind) {
    const span = document.createElement('span');
    span.className = 'shiny-new-badge';
    if (kind) span.dataset.newKind = kind;
    span.textContent = 'NEW';
    span.title = '本次更新新增内容（点击后自动消除）';
    return span;
  }

  function mountClearButton(container, kind, onAfterClear) {
    if (!container) return null;
    const existing = container.querySelector('.btn-clear-new-badges');
    if (existing) return existing;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-clear-new-badges';
    const sync = () => {
      const n = count(kind);
      btn.hidden = n <= 0;
      btn.textContent = n > 0 ? `✨ 一键消除 NEW 角标 (${n})` : '✨ 一键消除 NEW 角标';
    };
    btn.addEventListener('click', () => {
      clearKind(kind);
      if (typeof onAfterClear === 'function') onAfterClear();
    });
    listeners.add(sync);
    sync();
    container.append(btn);
    return btn;
  }

  window.ShinyNewBadges = {
    ready,
    reconcile,
    isNew,
    count,
    totalCount,
    markSeen,
    clearKind,
    clearAll,
    badgeEl,
    mountClearButton,
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
  };
})();
