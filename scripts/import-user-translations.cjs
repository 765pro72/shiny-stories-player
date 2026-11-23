// Import data only from the user-supplied package. Never execute its app/scripts.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), sourceDir = path.join(root, 'research/user-translation-2026-11-13');
const apply = process.argv.includes('--apply'), norm = value => String(value || '').trim().replace(/\\r?\\n|\\n|\r\n/g, '\n').replace(/\n+/g, '\n');
const sourceBytes = fs.readFileSync(path.join(sourceDir, 'zh_dynamic.json'));
const source = { id: 'user-enza-fix-2026-11-13', package: 'enza-player-app-fix.zip', dictionary: 'data/translations/zh_dynamic.json', sha256: crypto.createHash('sha256').update(sourceBytes).digest('hex'), credit: '用户提供汉化包（原译者未注明）' };
const dictionary = new Map(), ambiguous = new Set();
for (const [original, translated] of Object.entries(JSON.parse(sourceBytes))) {
  if (typeof translated !== 'string' || !translated.trim() || translated.includes('\ufffd') || norm(original) === norm(translated)) continue;
  const key = norm(original), value = norm(translated);
  if (dictionary.has(key) && dictionary.get(key) !== value) ambiguous.add(key);
  else dictionary.set(key, value);
}
for (const key of ambiguous) dictionary.delete(key);
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'))), manifest = { source, importedAt: new Date().toISOString(), keys: [] };
try { const previous = JSON.parse(fs.readFileSync(path.join(root, 'data/imported-translation-manifest.json'))); if (previous.source.sha256 === source.sha256) manifest.keys = [...previous.keys]; } catch {}
const changedFiles = [], log = path.join(root, 'translation-work/翻译变更日志.jsonl');
let filled = 0, newFiles = 0, preserved = 0, voiceFilled = 0;
for (const story of catalog) {
  const scriptFile = path.join(root, 'cache/json', story.key); if (!fs.existsSync(scriptFile)) continue;
  const file = path.join(root, 'data/translations', story.key), before = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : null;
  const after = before ? structuredClone(before) : { translator: source.credit, rows: [] };
  const tracks = JSON.parse(fs.readFileSync(scriptFile)), known = new Set(after.rows.map(row => norm(row.text)));
  let changes = 0;
  for (const row of after.rows) {
    const translation = dictionary.get(norm(row.text));
    if (row.trans?.trim() && norm(row.trans) !== norm(row.text)) { preserved++; continue; }
    if (translation) { row.trans = translation; row.sourceId = source.id; row.exactOnly = true; filled++; changes++; }
  }
  for (const [index, track] of tracks.entries()) {
    const original = track.text || track.select; if (typeof original !== 'string' || !original.trim() || known.has(norm(original))) continue;
    const translation = dictionary.get(norm(original));
    if (translation) {
      after.rows.push({ id: String(track.id || 'user-' + index), name: track.speaker || '', text: original, trans: translation, sourceId: source.id, exactOnly: true });
      known.add(norm(original)); filled++; changes++;
    }
  }
  if (!changes) continue;
  if (!before) newFiles++;
  after.additionalSources ||= []; if (!after.additionalSources.some(s => s.id === source.id)) after.additionalSources.push(source);
  // Preserve the original translator field. Supplemental attribution is kept in
  // metadata and shown separately by the player.
  const matched = new Map(after.rows.filter(r => r.trans?.trim()).map(r => [norm(r.text), r.trans]));
  const lines = tracks.map(t => t.text || t.select).filter(t => typeof t === 'string' && /[\p{L}\p{N}]/u.test(t));
  story.translated = true; story.lines = lines.length; story.missing = lines.filter(t => !matched.has(norm(t))).length;
  manifest.keys.push(story.key); changedFiles.push('data/translations/' + story.key);
  if (apply) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.mkdirSync(path.dirname(log), { recursive: true });
    fs.appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), action: 'external-translation-import', file: 'data/translations/' + story.key, source, before, after }) + '\n');
    fs.writeFileSync(file, JSON.stringify(after));
  }
}
for (const relative of ['data/voice-index.json', 'public/home-assets/catalog.json']) {
  const file = path.join(root, relative), value = JSON.parse(fs.readFileSync(file)); let count = 0;
  function visit(item, pointer = '') {
    if (!item || typeof item !== 'object') return;
    if (typeof item.original === 'string' && !item.translation?.trim()) {
      const candidate = dictionary.get(norm(item.original));
      if (candidate) {
        if (apply) fs.appendFileSync(log, JSON.stringify({ at: new Date().toISOString(), action: 'external-voice-translation-import', file: relative, pointer, source, before: { translation: item.translation, translationSource: item.translationSource }, after: { translation: candidate, translationSource: source.credit } }) + '\n');
        item.translation = candidate; item.translationSource = source.credit; item.translationSourceId = source.id; count++;
      }
    }
    for (const [key, child] of Object.entries(item)) if (child && typeof child === 'object') visit(child, pointer + '/' + key);
  }
  visit(value); voiceFilled += count;
  if (count && apply) { fs.writeFileSync(file, JSON.stringify(value)); changedFiles.push(relative); }
}
const report = { apply, source, dictionaryEntries: dictionary.size, ambiguousSkipped: ambiguous.size, filled, voiceFilled, newFiles, changedFiles: changedFiles.length, existingTranslationsPreserved: preserved };
fs.writeFileSync(path.join(root, 'exports/user-translation-import-report.json'), JSON.stringify(report, null, 2));
if (apply) {
  manifest.keys = [...new Set(manifest.keys)];
  fs.writeFileSync(path.join(root, 'data/imported-translation-manifest.json'), JSON.stringify(manifest));
  let previousFiles = []; try { previousFiles = JSON.parse(fs.readFileSync(path.join(root, 'exports/user-translation-release-files.json'))); } catch {}
  fs.writeFileSync(path.join(root, 'exports/user-translation-release-files.json'), JSON.stringify([...new Set([...previousFiles, ...changedFiles])]));
  fs.writeFileSync(path.join(root, 'data/catalog.json'), JSON.stringify(catalog));
  const summaryPath = path.join(root, 'data/summary.json'), summary = JSON.parse(fs.readFileSync(summaryPath));
  summary.translationFiles = catalog.filter(s => s.translated).length; summary.untranslatedEntries = catalog.filter(s => !s.translated).length;
  summary.translationCountNote = '有译文不代表全部句子完成；保留社区及AI署名，并含用户提供汉化包的精确匹配补译。';
  fs.writeFileSync(summaryPath, JSON.stringify(summary));
}
console.log(JSON.stringify(report, null, 2));
