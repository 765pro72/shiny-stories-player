(() => {
  const castingThemes = [
    '新婚妻子', '强势女友', '邻家大姐姐', '未婚妻', '吃醋女孩', '内向女主角',
    '公司前辈', '一夏恋人', '撒娇女友', '秘密练习伙伴', '妹妹', '怪物'
  ];

  function describe(voice) {
    if (voice.kind === '扮演主页') {
      const match = voice.key.match(/mypage_casting_voice_\d+_(\d+)\.m4a$/);
      const theme = castingThemes[Number(match?.[1]) - 1];
      return { ...voice, theme: theme || '主题待核实', needsReview: voice.subtitleReviewed !== true };
    }
    if (voice.kind === '卡片语音' && /\/(?:script_|mypage_support_idol_talking_)/.test(voice.key) && !voice.speakerVerified) {
      return { ...voice, cardOwner: voice.idol, idol: '说话人待核实', speaker: '', characterId: '' };
    }
    return voice;
  }

  function overrideFor(voice) {
    try {
      const overrides = JSON.parse(localStorage.getItem('overrides') || '{}');
      const legacy = overrides['home:voices'] || {};
      return overrides['voice:key']?.[voice.key] || legacy[voice.key] ||
        legacy[voice.id] || (voice.original && legacy[voice.original]) || '';
    } catch { return ''; }
  }

  function setupImport(voices) {
    const picker = document.querySelector('#importVoiceTextsFile');
    const status = document.querySelector('#voiceImportStatus');
    const permitted = new Map(voices.map(voice => [voice.key, voice]));
    document.querySelector('#importVoiceTexts').onclick = () => picker.click();
    picker.onchange = async () => {
      const file = picker.files[0];
      picker.value = '';
      if (!file) return;
      try {
        const parsed = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
        const entries = Array.isArray(parsed) ? parsed.map(row => [row?.key, row?.translation]) : Object.entries(parsed.voices || parsed);
        const overrides = JSON.parse(localStorage.getItem('overrides') || '{}');
        const exact = overrides['voice:key'] ||= {};
        let added = 0, skipped = 0;
        for (const [key, value] of entries) {
          const text = typeof value === 'string' ? value : value?.translation;
          if (!permitted.has(key) || typeof text !== 'string' || !text.trim() || overrideFor(permitted.get(key))) { skipped++; continue; }
          if (exact[key]) { skipped++; continue; }
          exact[key] = text.trim();
          added++;
        }
        if (added) {
          const json = JSON.stringify(overrides);
          localStorage.setItem('overrides', json);
          window.desktop?.saveState?.({ overrides: json });
          window.dispatchEvent(new CustomEvent('translation-overrides-changed', { detail: overrides }));
        }
        status.textContent = `已导入 ${added} 条。跳过 ${skipped} 条未匹配、空白或已有补译的记录。`;
      } catch {
        status.textContent = '无法读取字幕 JSON。请使用音频路径和对应的中文译文。';
      }
    };
  }

  window.VoiceCatalog = { describe, overrideFor, setupImport };
})();
