const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict'), vm = require('node:vm');
const { preserveExternal } = require('../external-translation-preserve.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-external-translations-'));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value)); };
try {
  const previous = path.join(root, 'previous'), next = path.join(root, 'next'), key = 'produce_events/test.json';
  write(path.join(previous, 'imported-translation-manifest.json'), { source: { id: 'test-import', credit: 'User package' }, keys: [key] });
  write(path.join(previous, 'translations', key), { translator: 'Community', rows: [{ id: '1', text: '原文A', trans: '补译A', sourceId: 'test-import' }, { id: '2', text: '原文B', trans: '补译B', sourceId: 'test-import' }] });
  write(path.join(next, 'translations', key), { translator: 'New Community', rows: [{ id: '1', text: '原文A', trans: '新版社区A' }, { id: '2', text: '原文B', trans: '' }] });
  const result = preserveExternal(previous, next), fresh = JSON.parse(fs.readFileSync(path.join(next, 'translations', key)));
  assert.equal(result.restored, 1); assert.equal(fresh.translator, 'New Community'); assert.equal(fresh.rows[0].trans, '新版社区A'); assert.equal(fresh.rows[1].trans, '补译B'); assert.equal(fresh.rows[1].exactOnly, true);
  const context = vm.createContext({ URLSearchParams, location: { search: '', origin: 'http://localhost' }, window: { addEventListener() {} }, parent: { postMessage() {} }, document: { querySelector() {} }, console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/player/bootstrap.js'), 'utf8'), context);
  vm.runInContext("translation={rows:[{id:'1',text:'原文A',trans:'补译A',exactOnly:true}]};names={};common={};tracks=[{id:'1',text:'更新后的原文'}];annotate()", context);
  assert.equal(vm.runInContext('tracks[0].translated_text', context), '更新后的原文');
  vm.runInContext("tracks=[{id:'9',text:'原文A'}];annotate()", context);
  assert.equal(vm.runInContext('tracks[0].translated_text', context), '补译A');
  console.log('PASS external imports survive updates, retain credits, defer to newer translations and never match changed source by ID');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
