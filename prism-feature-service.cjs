'use strict';
const fs = require('fs');
const path = require('path');

function createPrismFeatureService({ base, dataRoot }) {
  let corpusCache = null; // [{ key, title, idol, group, category, rows: [{ name, text, trans, id }] }]
  let catalogByKey = null;
  let addressMatrixCache = null;

  function ensureCorpus() {
    if (corpusCache) return corpusCache;
    const dRoot = typeof dataRoot === 'function' ? dataRoot() : dataRoot;
    const catPath = fs.existsSync(path.join(dRoot, 'catalog.json'))
      ? path.join(dRoot, 'catalog.json')
      : path.join(base, 'data/catalog.json');
    const catalog = JSON.parse(fs.readFileSync(catPath, 'utf8'));
    catalogByKey = new Map(catalog.map(s => [s.key, s]));
    const transRoot = fs.existsSync(path.join(dRoot, 'translations'))
      ? path.join(dRoot, 'translations')
      : path.join(base, 'data/translations');

    const list = [];
    for (const s of catalog) {
      const fp = path.join(transRoot, s.key);
      if (!fs.existsSync(fp)) continue;
      try {
        const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
        const rows = Array.isArray(raw.rows) ? raw.rows : (Array.isArray(raw) ? raw : []);
        if (!rows.length) continue;
        list.push({
          key: s.key,
          title: s.title || '',
          idol: s.idol || '',
          group: s.group || '',
          category: s.category || '',
          rows: rows.map(r => ({
            id: r.id || '',
            name: String(r.name || r.speaker || '').trim(),
            text: String(r.text || r.original || '').trim(),
            trans: String(r.trans || r.translation || '').trim()
          }))
        });
      } catch {}
    }
    corpusCache = list;
    return corpusCache;
  }

  function searchDialogues(query, speakerFilter = '', limit = 60) {
    const t0 = Date.now();
    const q = String(query || '').trim().toLowerCase();
    const spk = String(speakerFilter || '').trim().toLowerCase();
    if (!q && !spk) return { ok: true, tookMs: 0, total: 0, hits: [] };

    const corpus = ensureCorpus();
    const terms = q.split(/\s+/).filter(Boolean);
    const hits = [];
    let total = 0;

    for (const doc of corpus) {
      const rows = doc.rows;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (spk && !r.name.toLowerCase().includes(spk) && !doc.idol.toLowerCase().includes(spk)) continue;
        if (terms.length) {
          const hay = `${r.trans}\n${r.text}\n${r.name}`.toLowerCase();
          let allMatch = true;
          for (let t = 0; t < terms.length; t++) {
            if (!hay.includes(terms[t])) { allMatch = false; break; }
          }
          if (!allMatch) continue;
        }
        total++;
        if (hits.length < limit) {
          const prev = i > 0 ? rows[i - 1] : null;
          const next = i + 1 < rows.length ? rows[i + 1] : null;
          hits.push({
            key: doc.key,
            title: doc.title,
            idol: doc.idol,
            group: doc.group,
            category: doc.category,
            lineIndex: i,
            lineId: r.id,
            speaker: r.name || doc.idol || '旁白',
            text: r.text,
            trans: r.trans,
            prev: prev ? { speaker: prev.name, text: prev.trans || prev.text } : null,
            next: next ? { speaker: next.name, text: next.trans || next.text } : null
          });
        }
      }
    }
    return { ok: true, tookMs: Date.now() - t0, total, hits };
  }

  function getIdolInteractions(idolFilter = '', mode = 'chain') {
    const corpus = ensureCorpus();
    const qIdol = String(idolFilter || '').trim();

    if (mode === '1v1') {
      // Aggregate Morning (晨间问候), Promise (约定), Audition (试镜前), Cheers (应援) into a continuous 1v1 collection
      const episodes = [];
      for (const doc of corpus) {
        const is1v1 = doc.group === 'Morning'
          || /promise|audition|cheer|judge/i.test(doc.key)
          || /^(Morning|Audition|Promise)$/i.test(doc.group);
        if (!is1v1) continue;
        if (qIdol && doc.idol !== qIdol && !doc.rows.some(r => r.name.includes(qIdol))) continue;
        const kindLabel = doc.group === 'Morning' ? '☀ 晨间 1v1 问候'
          : /audition/i.test(doc.key) ? '🎤 试镜前 1v1 鼓劲'
          : /promise/i.test(doc.key) ? '🤝 制作人约定互动'
          : '💬 育成 1v1 互动';
        episodes.push({
          key: doc.key,
          idol: doc.idol,
          kind: kindLabel,
          title: doc.title,
          lines: doc.rows.filter(r => r.text || r.trans).slice(0, 18)
        });
        if (episodes.length >= 60) break;
      }
      return { ok: true, mode: '1v1', count: episodes.length, episodes };
    }

    // mode === 'chain': Combine 283 Chain group chats (home-conversations + business_unit) & Phone/Mypage calls
    const threads = [];
    try {
      const convPath = path.join(base, 'data/home-conversations.json');
      if (fs.existsSync(convPath)) {
        const convs = JSON.parse(fs.readFileSync(convPath, 'utf8'));
        for (const c of convs) {
          const seq = Array.isArray(c.sequence) ? c.sequence : [];
          if (!seq.length) continue;
          const speakers = [...new Set(seq.map(l => String(l.speaker || l.characterName || '').trim()).filter(Boolean))];
          if (qIdol && !speakers.some(s => s.includes(qIdol))) continue;
          threads.push({
            id: 'hc_' + c.id,
            kind: speakers.length > 2 ? '📱 283 Chain 组合群聊' : '📱 283 Chain 双人私聊',
            title: speakers.join(' × ') || ('283 事务所群聊 #' + c.id),
            participants: speakers,
            lines: seq.map(l => ({
              speaker: l.speaker || l.characterName || '偶像',
              text: l.original || l.text || '',
              trans: l.translation || l.trans || '',
              voice: l.path ? '/asset/' + l.path : ''
            }))
          });
          if (threads.length >= 45) break;
        }
      }
    } catch {}

    // Add business_unit_communication & mypage phone/talk scripts
    for (const doc of corpus) {
      if (!doc.key.startsWith('business_unit_communication/') && !doc.key.startsWith('mypage_communications/')) continue;
      if (qIdol && doc.idol !== qIdol && !doc.rows.some(r => r.name.includes(qIdol))) continue;
      const speakers = [...new Set(doc.rows.map(r => r.name).filter(Boolean))];
      threads.push({
        id: doc.key,
        storyKey: doc.key,
        kind: doc.key.startsWith('mypage') ? '📞 制作人私密来电 / 主页留言' : '📱 283 营业工作群聊',
        title: `${doc.idol} · ${doc.title}`,
        participants: speakers.length ? speakers : [doc.idol],
        lines: doc.rows.filter(r => r.text || r.trans).slice(0, 20).map(r => ({
          speaker: r.name || doc.idol,
          text: r.text,
          trans: r.trans
        }))
      });
      if (threads.length >= 80) break;
    }

    return { ok: true, mode: 'chain', count: threads.length, threads };
  }

  function getAddressMatrix() {
    if (addressMatrixCache) return addressMatrixCache;
    let wikiData = { addresses: [] };
    let evidenceData = { entries: [] };
    let langData = { characters: {} };
    try { wikiData = require('./public/story-character-addresses.js'); } catch {}
    try {
      const ep = path.join(base, 'data/story-character-address-evidence.json');
      if (fs.existsSync(ep)) evidenceData = JSON.parse(fs.readFileSync(ep, 'utf8'));
    } catch {}
    try {
      const lp = path.join(base, 'data/story-character-language-evidence.json');
      if (fs.existsSync(lp)) langData = JSON.parse(fs.readFileSync(lp, 'utf8'));
    } catch {}

    ensureCorpus();
    const evidenceWithTitles = (evidenceData.entries || []).map(e => {
      const s = catalogByKey?.get(e.key);
      return {
        ...e,
        storyTitle: s ? `${s.group ? s.group + ' · ' : ''}${s.title}` : e.key
      };
    });

    addressMatrixCache = {
      ok: true,
      addresses: wikiData.addresses || [],
      evidence: evidenceWithTitles,
      language: langData.characters || langData
    };
    return addressMatrixCache;
  }

  return async function handler(req, res, u) {
    const p = decodeURIComponent(u.pathname);
    if (p === '/api/dialogue-search') {
      const q = u.searchParams.get('q') || '';
      const speaker = u.searchParams.get('speaker') || '';
      const limit = Math.min(120, Math.max(10, Number(u.searchParams.get('limit')) || 60));
      const out = searchDialogues(q, speaker, limit);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(out));
      return true;
    }
    if (p === '/api/idol-interactions') {
      const idol = u.searchParams.get('idol') || '';
      const mode = u.searchParams.get('mode') || 'chain';
      const out = getIdolInteractions(idol, mode);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify(out));
      return true;
    }
    if (p === '/api/address-matrix') {
      const out = getAddressMatrix();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.end(JSON.stringify(out));
      return true;
    }
    return false;
  };
}

module.exports = { createPrismFeatureService };
