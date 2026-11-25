(() => {
  'use strict';

  function getDesktop() {
    try {
      if (window.desktop?.get4kPackStatus) return window.desktop;
      if (window.parent && window.parent !== window && window.parent.desktop?.get4kPackStatus) return window.parent.desktop;
    } catch {}
    return null;
  }

  async function fetchStatus() {
    const d = getDesktop();
    if (d?.get4kPackStatus) {
      try { return await d.get4kPackStatus(); } catch {}
    }
    try {
      const r = await fetch('/api/4k-pack/status', { cache: 'no-store' });
      return await r.json();
    } catch {
      return { ok: false, installed: false, enabled: false };
    }
  }

  async function toggleEnabled(flag) {
    const d = getDesktop();
    if (d?.toggle4kPack) {
      try { return await d.toggle4kPack(!!flag); } catch {}
    }
    const r = await fetch('/api/4k-pack/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !!flag })
    });
    return await r.json();
  }

  function formatStatusText(st) {
    if (!st || !st.installed) {
      return '未加载 4K 包（当前显示原图）';
    }
    const parts = [];
    if (st.hasImages) parts.push('静态 4K');
    if (st.hasSpine) parts.push('Spine 动态 2x');
    if (st.hasMovies) parts.push('动态视频 4K');
    const detail = parts.length ? ` · 含 ${parts.join(' + ')}` : '';
    return st.enabled
      ? `✨ 当前模式：4K 超清${detail}`
      : `🖼️ 当前模式：原图（已加载 4K 包${detail}，可随时切回 4K）`;
  }

  function disableRealtimeUpscalerForNative4k() {
    try {
      // Avoid real-time Anime4K downscaling the PIXI stage back to 640p before re-upscaling
      localStorage.setItem('anime4k', 'off');
      localStorage.setItem('qualityPipeline', JSON.stringify([{ id: 'anime4k', enabled: false, level: 'fine' }, { id: 'artcnn', enabled: false, level: 'c16' }]));
      const d = getDesktop();
      d?.saveState?.({ anime4k: 'off', qualityPipeline: JSON.stringify([{ id: 'anime4k', enabled: false, level: 'fine' }, { id: 'artcnn', enabled: false, level: 'c16' }]) });
      window.ShinyAnime4K?.setMode?.('off');
    } catch {}
  }

  function reloadVisibleStage() {
    try {
      const d = getDesktop();
      if (d?.reloadIgnoringCache) {
        d.reloadIgnoringCache();
        return;
      }
      const topWin = (window.parent && window.parent !== window) ? window.parent : window;
      const frames = topWin.document.querySelectorAll('#shellStage iframe');
      if (frames.length) {
        frames.forEach(f => {
          try { f.contentWindow.location.reload(); } catch {}
        });
        return;
      }
    } catch {}
    location.reload();
  }

  function bindContainer(root) {
    if (!root || root.dataset.pack4kBound === '1') return;
    root.dataset.pack4kBound = '1';

    const statusEl = root.querySelector('[data-p4k-status]');
    const hintEl = root.querySelector('[data-p4k-hint]');
    const btnArchive = root.querySelector('[data-p4k-archive]');
    const btnFolder = root.querySelector('[data-p4k-folder]');
    const btnToggle = root.querySelector('[data-p4k-toggle]');

    let latest = { installed: false, enabled: false };
    let busy = false;

    const desktop = getDesktop();
    const setBusy = (v, msg) => {
      busy = v;
      [btnArchive, btnFolder, btnToggle].forEach(b => { if (b) b.disabled = v; });
      if (msg && statusEl) statusEl.textContent = msg;
    };

    const render = (st) => {
      latest = st || { installed: false, enabled: false };
      if (statusEl) statusEl.textContent = formatStatusText(latest);
      if (hintEl) {
        hintEl.textContent = latest.installed
          ? `已加载路径：${latest.activeDir || latest.source || 'cache-4k'}。切换 4K / 原图后将自动刷新画面生效。`
          : '支持选择 ShinyStories-4K-Pack.zip / .7z 一键自动解压加载，或直接挂载已解压的 cache-4k 文件夹；加载后默认开启 4K，随时可切换原图。';
      }
      if (btnToggle) {
        btnToggle.hidden = !latest.installed;
        btnToggle.disabled = busy || !latest.installed;
        btnToggle.textContent = latest.enabled ? '🖼️ 切换为原图' : '✨ 切换为 4K 超清';
        btnToggle.setAttribute('aria-pressed', String(Boolean(latest.enabled)));
      }
      if (!desktop) {
        if (btnArchive) btnArchive.hidden = true;
        if (btnFolder) btnFolder.hidden = true;
      }
    };

    if (desktop?.on4kPackProgress) {
      desktop.on4kPackProgress(msg => {
        if (busy && statusEl && msg) statusEl.textContent = msg;
      });
    }

    btnArchive?.addEventListener('click', async () => {
      if (busy || !desktop?.load4kPackArchive) return;
      setBusy(true, '正在选择并解压 4K 超清画质包，请稍候…');
      try {
        const res = await desktop.load4kPackArchive();
        if (res?.canceled) {
          render(latest);
          return;
        }
        if (!res?.ok) {
          if (statusEl) statusEl.textContent = '❌ ' + (res?.error || '加载失败');
          return;
        }
        if (res?.enabled) disableRealtimeUpscalerForNative4k();
        render(res);
        setTimeout(reloadVisibleStage, 450);
      } catch (e) {
        if (statusEl) statusEl.textContent = '❌ 加载异常：' + e.message;
      } finally {
        setBusy(false);
        render(latest);
      }
    });

    btnFolder?.addEventListener('click', async () => {
      if (busy || !desktop?.load4kPackFolder) return;
      setBusy(true, '正在检测并挂载 cache-4k 文件夹…');
      try {
        const res = await desktop.load4kPackFolder();
        if (res?.canceled) {
          render(latest);
          return;
        }
        if (!res?.ok) {
          if (statusEl) statusEl.textContent = '❌ ' + (res?.error || '文件夹无效');
          return;
        }
        if (res?.enabled) disableRealtimeUpscalerForNative4k();
        render(res);
        setTimeout(reloadVisibleStage, 350);
      } catch (e) {
        if (statusEl) statusEl.textContent = '❌ 挂载异常：' + e.message;
      } finally {
        setBusy(false);
        render(latest);
      }
    });

    btnToggle?.addEventListener('click', async () => {
      if (busy || !latest.installed) return;
      const next = !latest.enabled;
      setBusy(true, next ? '正在切换为 4K 超清画质…' : '正在切换为原图画质…');
      try {
        const res = await toggleEnabled(next);
        if (res?.enabled) disableRealtimeUpscalerForNative4k();
        render(res);
        setTimeout(reloadVisibleStage, 250);
      } catch (e) {
        if (statusEl) statusEl.textContent = '❌ 切换失败：' + e.message;
      } finally {
        setBusy(false);
        render(latest);
      }
    });

    fetchStatus().then(render);
  }

  function init() {
    const el = document.getElementById('pack4kSetting');
    if (el) bindContainer(el);
    fetchStatus().then(st => {
      if (st?.installed && st?.enabled && localStorage.getItem('shiny.pack4kAutoNativeV1') !== '1') {
        localStorage.setItem('shiny.pack4kAutoNativeV1', '1');
        disableRealtimeUpscalerForNative4k();
      }
    }).catch(() => {});
  }

  window.Pack4kUI = { fetchStatus, toggleEnabled, bindContainer, formatStatusText };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
