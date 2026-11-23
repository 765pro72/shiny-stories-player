// Reapply exact-text supplemental translations after a public catalog refresh.
// Existing fresh translations always win, and imports never use ID-only fallback.
const fs = require('node:fs'), path = require('node:path');
const norm = value => String(value || '').trim().replace(/\\r?\\n|\\n|\r\n/g, '\n').replace(/\n+/g, '\n');
function preserveExternal(previous, next) {
  const manifestPath = path.join(previous, 'imported-translation-manifest.json');
  if (!fs.existsSync(manifestPath)) return { restored: 0 };
  const manifest = JSON.parse(fs.readFileSync(manifestPath)); let restored = 0;
  for (const key of manifest.keys) {
    if (!/^[\w-]+\/[\w-]+\.json$/.test(key)) continue;
    const oldPath = path.join(previous, 'translations', key), newPath = path.join(next, 'translations', key);
    if (!fs.existsSync(oldPath)) continue;
    const old = JSON.parse(fs.readFileSync(oldPath));
    const fresh = fs.existsSync(newPath) ? JSON.parse(fs.readFileSync(newPath)) : { translator: old.translator, rows: [] };
    let changed = false;
    for (const row of old.rows.filter(r => r.sourceId === manifest.source.id)) {
      const match = fresh.rows.find(r => norm(r.text) === norm(row.text));
      if (match?.trans?.trim() && norm(match.trans) !== norm(match.text)) continue;
      if (match) Object.assign(match, { trans: row.trans, sourceId: row.sourceId, exactOnly: true });
      else fresh.rows.push({ ...row, exactOnly: true });
      restored++; changed = true;
    }
    if (changed) {
      fresh.additionalSources ||= []; if (!fresh.additionalSources.some(s => s.id === manifest.source.id)) fresh.additionalSources.push(manifest.source);
      fs.mkdirSync(path.dirname(newPath), { recursive: true }); fs.writeFileSync(newPath, JSON.stringify(fresh));
    }
  }
  fs.writeFileSync(path.join(next, 'imported-translation-manifest.json'), JSON.stringify(manifest));
  const catalogPath = path.join(next, 'catalog.json');
  if (fs.existsSync(catalogPath)) {
    const catalog = JSON.parse(fs.readFileSync(catalogPath));
    for (const item of catalog) if (manifest.keys.includes(item.key) && fs.existsSync(path.join(next, 'translations', item.key))) item.translated = true;
    fs.writeFileSync(catalogPath, JSON.stringify(catalog));
    const summaryPath = path.join(next, 'summary.json');
    if (fs.existsSync(summaryPath)) { const summary = JSON.parse(fs.readFileSync(summaryPath)); summary.translationFiles = catalog.filter(s => s.translated).length; summary.untranslatedEntries = catalog.filter(s => !s.translated).length; fs.writeFileSync(summaryPath, JSON.stringify(summary)); }
  }
  return { restored };
}
module.exports = { preserveExternal };
