(() => {
  const $ = s => document.querySelector(s); let serial = 0;
  async function preview() {
    const token = ++serial, person = homeStage.getCatalog().find(p => p.id === $('#idolSelect').value), choice = person?.outfits.find(o => o.key === $('#outfitSelect').value);
    if (!choice) return;
    $('#chosenOutfitName').textContent = person.name + ' · ' + choice.label;
    $('#chooseModel').href = 'model-picker.html?' + new URLSearchParams({ target: 'home', slot: String(window.homeMulti?.getEditingSlot?.() || 0), idol: person.id });
    $('#chosenOutfitImage').hidden = true; $('#chosenOutfitHint').textContent = '正在准备服装预览…';
    try { const image = await modelThumbnails.get(choice.path,{priority:100,valid:()=>token===serial,spineData:homeStage.getOutfit()?.path===choice.path?homeStage.getModel()?.spineData:undefined}); if (token !== serial) return; $('#chosenOutfitImage').src = image; $('#chosenOutfitImage').hidden = false; $('#chosenOutfitHint').textContent = ''; }
    catch { if (token === serial) $('#chosenOutfitHint').textContent = '预览暂未载入，点击进入衣装室重试。'; }
  }
  window.previewOutfit = preview;
  $('#wardrobe').addEventListener('click', () => queueMicrotask(preview));
  for (const id of ['homeSlot', 'homeCount', 'idolSelect', 'outfitSelect']) $('#' + id).addEventListener('change', () => queueMicrotask(preview));

  // Auto Sunrise/Sunset Day-Night Theme setting (default ON)
  const autoSunInput = $('#autoThemeSun');
  const autoSunHint = $('#autoThemeSunHint');
  function syncAutoSunUI() {
    if (!autoSunInput) return;
    let on = true;
    try { on = localStorage.getItem('shiny.autoTheme') !== '0'; } catch {}
    autoSunInput.checked = on;
    if (autoSunHint) {
      let sun = null;
      try { sun = window.parent?.__shinyShell?.getSunTimes?.(); } catch {}
      autoSunHint.textContent = sun
        ? `今日日出 ${sun.sunriseStr} · 日落 ${sun.sunsetStr}（${on ? '已开启自动切换' : '已关闭，仅手动切换'}）`
        : (on ? '已开启：按本地当日日出日落自动切换白天/夜间模式。' : '已关闭：仅通过顶栏按钮手动切换明暗主题。');
    }
  }
  autoSunInput?.addEventListener('change', () => {
    const enabled = !!autoSunInput.checked;
    try { localStorage.setItem('shiny.autoTheme', enabled ? '1' : '0'); } catch {}
    try { window.parent?.__shinyShell?.setAutoTheme?.(enabled); } catch {}
    try { window.parent?.postMessage({ type: 'shiny-auto-theme', enabled }, location.origin); } catch {}
    syncAutoSunUI();
  });
  $('#wardrobe')?.addEventListener('click', () => queueMicrotask(syncAutoSunUI));
  syncAutoSunUI();

  // Office background <-> Light/Dark theme binding toggle (default ON)
  const bindOfficeInput = $('#bindOfficeTheme');
  function syncBindOfficeUI() {
    if (!bindOfficeInput) return;
    let on = true;
    try { on = localStorage.getItem('shiny.bindOfficeTheme') !== '0'; } catch {}
    bindOfficeInput.checked = on;
  }
  bindOfficeInput?.addEventListener('change', () => {
    const enabled = !!bindOfficeInput.checked;
    try { localStorage.setItem('shiny.bindOfficeTheme', enabled ? '1' : '0'); } catch {}
    window.dispatchEvent(new CustomEvent('shiny-office-bind-changed', { detail: { enabled } }));
  });
  $('#wardrobe')?.addEventListener('click', () => queueMicrotask(syncBindOfficeUI));
  syncBindOfficeUI();

  // Arcade (斗地主 / 掼蛋 / 大富豪) Voice Volume setting (0–100%, synced live with arcade.html)
  const arcVolInput = $('#arcadeVoiceVolume');
  const arcVolVal = $('#arcadeVoiceVolVal');
  function syncArcadeVolUI() {
    if (!arcVolInput) return;
    let pct = 78;
    try {
      const saved = localStorage.getItem('shiny.arcade.voiceVolume');
      if (saved !== null && saved !== '' && Number.isFinite(Number(saved))) {
        pct = Math.max(0, Math.min(100, Math.round(Number(saved))));
      }
    } catch {}
    arcVolInput.value = String(pct);
    if (arcVolVal) arcVolVal.textContent = pct + '%';
  }
  arcVolInput?.addEventListener('input', () => {
    const pct = Math.max(0, Math.min(100, Math.round(Number(arcVolInput.value) || 0)));
    if (arcVolVal) arcVolVal.textContent = pct + '%';
    try { localStorage.setItem('shiny.arcade.voiceVolume', String(pct)); } catch {}
    try { window.desktop?.saveState?.({ 'shiny.arcade.voiceVolume': String(pct) }); } catch {}
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'shiny.arcade.voiceVolume') syncArcadeVolUI();
  });
  $('#wardrobe')?.addEventListener('click', () => queueMicrotask(syncArcadeVolUI));
  syncArcadeVolUI();

  // Archive Offline Update (.zip / .7z) inside Settings dialog
  const arcUpInput = $('#archiveUpdateInput');
  const arcUpPickBtn = $('#btnArchiveUpdatePick');
  const arcUpReloadBtn = $('#btnArchiveUpdateReload');
  const arcUpResetBtn = $('#btnArchiveUpdateReset');
  const arcUpStatus = $('#archiveUpdateStatus');
  const arcUpHint = $('#archiveUpdateHint');

  function formatArchiveMeta(meta) {
    if (!meta) return '当前使用程序内置版本（未导入压缩包覆盖）。';
    const c = meta.counts || {};
    const when = meta.appliedAt ? new Date(meta.appliedAt).toLocaleString() : '';
    const parts = [];
    if (c.public) parts.push(`界面 ${c.public}`);
    if (c.data) parts.push(`数据 ${c.data}`);
    if (c.cache) parts.push(`素材 ${c.cache}`);
    if (c.voices) parts.push(`语音 ${c.voices}`);
    const coreNote = c.skippedCore ? `（另有 ${c.skippedCore} 个底层主程序文件需直接解压覆盖程序目录）` : '';
    return `已应用「${meta.filename || '更新包'}」${when ? ' · ' + when : ''}（${parts.join(' / ') || `共 ${c.total || 0} 项`}）${coreNote}`;
  }

  async function refreshArchiveUpdateStatus() {
    if (!arcUpStatus) return;
    try {
      const r = await fetch('/api/archive-update/status');
      const j = await r.json();
      if (!j?.ok) return;
      if (arcUpHint) {
        arcUpHint.textContent = j.supports7z
          ? '支持导入 .zip / .7z 更新包，自动覆盖界面、汉化/数据与离线素材；保留收藏、阅读记录与自建怪文书。'
          : '支持导入 .zip 更新包（手机端请使用 .zip），自动覆盖界面、汉化/数据与离线素材；保留收藏、阅读记录与自建怪文书。';
      }
      arcUpStatus.textContent = formatArchiveMeta(j.active);
      if (arcUpResetBtn) arcUpResetBtn.hidden = !j.active;
    } catch {}
  }

  arcUpPickBtn?.addEventListener('click', () => {
    if (!arcUpInput) return;
    arcUpInput.value = '';
    arcUpInput.click();
  });

  arcUpInput?.addEventListener('change', async () => {
    const file = arcUpInput.files?.[0];
    if (!file) return;
    if (arcUpPickBtn) arcUpPickBtn.disabled = true;
    if (arcUpResetBtn) arcUpResetBtn.disabled = true;
    if (arcUpReloadBtn) arcUpReloadBtn.hidden = true;
    if (arcUpStatus) arcUpStatus.textContent = `正在导入并解压「${file.name}」（${(file.size / 1048576).toFixed(1)} MB），请稍候…`;
    try {
      const r = await fetch('/api/archive-update/apply?name=' + encodeURIComponent(file.name), {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: file
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || ('HTTP ' + r.status));
      if (arcUpStatus) arcUpStatus.textContent = '✓ 更新成功！' + formatArchiveMeta(j.active) + ' · 点击「刷新生效」立即载入新版本。';
      if (arcUpReloadBtn) arcUpReloadBtn.hidden = false;
      if (arcUpResetBtn) arcUpResetBtn.hidden = false;
    } catch (err) {
      if (arcUpStatus) arcUpStatus.textContent = '✕ 更新失败：' + (err?.message || String(err));
    } finally {
      if (arcUpPickBtn) arcUpPickBtn.disabled = false;
      if (arcUpResetBtn) arcUpResetBtn.disabled = false;
    }
  });

  arcUpReloadBtn?.addEventListener('click', () => {
    try { window.top.location.reload(); } catch { location.reload(); }
  });

  arcUpResetBtn?.addEventListener('click', async () => {
    if (!confirm('确定清除压缩包覆盖并恢复为程序内置版本吗？（已保存的离线素材、收藏与怪文书会完整保留）')) return;
    if (arcUpResetBtn) arcUpResetBtn.disabled = true;
    try {
      const r = await fetch('/api/archive-update/reset', { method: 'POST' });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || '恢复失败');
      if (arcUpStatus) arcUpStatus.textContent = '✓ 已清除压缩包覆盖，点击「刷新生效」恢复内置版本。';
      if (arcUpReloadBtn) arcUpReloadBtn.hidden = false;
      if (arcUpResetBtn) arcUpResetBtn.hidden = true;
    } catch (err) {
      if (arcUpStatus) arcUpStatus.textContent = '✕ 恢复失败：' + (err?.message || String(err));
    } finally {
      if (arcUpResetBtn) arcUpResetBtn.disabled = false;
    }
  });

  $('#wardrobe')?.addEventListener('click', () => queueMicrotask(refreshArchiveUpdateStatus));
})();
