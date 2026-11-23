(()=>{
  const $ = s => document.querySelector(s);

  function getActiveVoice() {
    return window.currentSubtitleVoice || null;
  }

  function showToast(msg) {
    let toast = $('#captionToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'captionToast';
      toast.className = 'caption-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  function updatePopoverPosition() {
    const caption = $('.caption');
    const popover = $('#captionEditPopover');
    if (!caption || !popover || popover.hidden) return;

    const rect = caption.getBoundingClientRect();
    const popWidth = popover.offsetWidth || 340;
    let left = rect.left;
    if (left + popWidth > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - popWidth - 16);
    }
    popover.style.left = Math.max(16, left) + 'px';
    popover.style.bottom = Math.max(16, (window.innerHeight - rect.top + 10)) + 'px';
  }

  function openEditor() {
    const v = getActiveVoice();
    const greeting = $('#greeting');
    const popover = $('#captionEditPopover');
    const textarea = $('#captionEditText');
    const origRow = $('#captionEditOrigRow');
    const origText = $('#captionEditOrigText');
    const speakerEl = $('#captionEditSpeaker');

    if (!popover || !textarea) return;

    let initialText = '';
    if (v) {
      const overrides = JSON.parse(localStorage.getItem('overrides') || '{}')['home:voices'] || {};
      initialText = overrides[v.id] || overrides[v.original] || overrides[v.path] || v.translation || '';
      if (!initialText && v.original) initialText = v.original;
    } else {
      initialText = greeting ? greeting.textContent.trim() : '';
      if (initialText.includes('点击偶像，听听她想说什么')) initialText = '';
    }

    if (speakerEl) {
      speakerEl.textContent = v?.speaker || $('#homeSpeaker')?.textContent || '看板偶像';
    }

    if (v && v.original) {
      origText.textContent = v.original;
      origRow.hidden = false;
    } else {
      origRow.hidden = true;
    }

    textarea.value = initialText;
    popover.hidden = false;
    updatePopoverPosition();

    setTimeout(() => {
      textarea.focus();
      textarea.select();
    }, 50);

    // Click outside to close
    setTimeout(() => {
      document.addEventListener('pointerdown', onDocClick);
    }, 100);
  }

  function onDocClick(e) {
    const popover = $('#captionEditPopover');
    const editBtn = $('#editSubtitle');
    if (!popover || popover.hidden) {
      document.removeEventListener('pointerdown', onDocClick);
      return;
    }
    if (popover.contains(e.target) || (editBtn && editBtn.contains(e.target))) {
      return;
    }
    closeEditor();
  }

  function closeEditor() {
    const popover = $('#captionEditPopover');
    if (popover) popover.hidden = true;
    document.removeEventListener('pointerdown', onDocClick);
  }

  async function saveEdit() {
    const textarea = $('#captionEditText');
    if (!textarea) return;
    const newText = textarea.value.trim();
    if (!newText) {
      showToast('⚠️ 字幕内容不能为空');
      textarea.focus();
      return;
    }

    const v = getActiveVoice();
    const allOverrides = JSON.parse(localStorage.getItem('overrides') || '{}');
    allOverrides['home:voices'] = allOverrides['home:voices'] || {};

    if (v) {
      if (v.id) allOverrides['home:voices'][v.id] = newText;
      if (v.original) allOverrides['home:voices'][v.original] = newText;
      if (v.path) allOverrides['home:voices'][v.path] = newText;
      v.translation = newText;
    } else {
      const currentGreeting = $('#greeting')?.textContent?.trim();
      if (currentGreeting) allOverrides['home:voices'][currentGreeting] = newText;
    }

    const jsonStr = JSON.stringify(allOverrides);
    localStorage.setItem('overrides', jsonStr);
    window.desktop?.saveState?.({ overrides: jsonStr });

    // Sync with backend files and changelog if server available
    try {
      fetch('/api/save-subtitle-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          id: v?.id,
          original: v?.original,
          translation: newText,
          speaker: v?.speaker || $('#homeSpeaker')?.textContent,
          path: v?.path
        })
      }).catch(() => {});
    } catch {}

    const greeting = $('#greeting');
    if (greeting) greeting.textContent = newText;

    window.dispatchEvent(new CustomEvent('translation-overrides-changed', { detail: allOverrides }));

    closeEditor();
    showToast('✓ 字幕已修改并保存');
  }

  function resetEdit() {
    const v = getActiveVoice();
    if (!v) {
      closeEditor();
      return;
    }

    const allOverrides = JSON.parse(localStorage.getItem('overrides') || '{}');
    if (allOverrides['home:voices']) {
      if (v.id) delete allOverrides['home:voices'][v.id];
      if (v.original) delete allOverrides['home:voices'][v.original];
      if (v.path) delete allOverrides['home:voices'][v.path];
      const jsonStr = JSON.stringify(allOverrides);
      localStorage.setItem('overrides', jsonStr);
      window.desktop?.saveState?.({ overrides: jsonStr });
    }

    // Revert greeting text
    const defaultText = v.translation || v.original || '';
    const greeting = $('#greeting');
    if (greeting && defaultText) greeting.textContent = defaultText;

    closeEditor();
    window.dispatchEvent(new CustomEvent('translation-overrides-changed', { detail: allOverrides }));
    showToast('↩ 已恢复默认台词');
  }

  function init() {
    const editBtn = $('#editSubtitle');
    const saveBtn = $('#captionEditSave');
    const cancelBtn = $('#captionEditCancel');
    const closeBtn = $('#captionEditClose');
    const resetBtn = $('#captionEditReset');
    const textarea = $('#captionEditText');
    const greeting = $('#greeting');

    if (editBtn) editBtn.onclick = openEditor;
    if (saveBtn) saveBtn.onclick = saveEdit;
    if (cancelBtn) cancelBtn.onclick = closeEditor;
    if (closeBtn) closeBtn.onclick = closeEditor;
    if (resetBtn) resetBtn.onclick = resetEdit;

    if (greeting) {
      greeting.ondblclick = openEditor;
      greeting.title = '双击或点击右下角铅笔图标可直接修改字幕';
    }

    if (textarea) {
      textarea.onkeydown = e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          saveEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeEditor();
        }
      };
    }

    window.addEventListener('resize', updatePopoverPosition);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
