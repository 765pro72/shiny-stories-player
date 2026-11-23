// 补齐 joke 系列（主页剧情路径）脚本：按 id 探测 mypage_communications 并下载
const fs = require('fs'), path = require('path');
const root = 'F:/sc', cache = path.join(root, 'cache');
const cat = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog.json'), 'utf8'));
const jokes = cat.filter((r) => String(r.group).startsWith('joke'));
const base = 'https://viewer.shinycolors.moe/';
const mapping = {}; const failures = []; let dl = 0, bytes = 0, skip = 0;
async function get(p) {
  const target = path.join(cache, p);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) { skip++; return 'local'; }
  for (let a = 0; a < 3; a++) try {
    const r = await fetch(base + p, { signal: AbortSignal.timeout(45000) });
    if (!r.ok) throw Error(String(r.status));
    const b = Buffer.from(await r.arrayBuffer());
    if (!b.length || b.length > 100 * 1024 * 1024) throw Error('invalid size');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target + '.part', b); fs.renameSync(target + '.part', target);
    bytes += b.length; dl++; return 'downloaded';
  } catch (e) { if (a === 2) { failures.push({ path: p, error: String(e) }); return 'failed'; } }
}
(async () => {
  let i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < jokes.length) {
      const j = jokes[i++];
      const id = j.key.split('/').pop().replace('.json', '');
      const p = `json/mypage_communications/${id}.json`;
      const r = await get(p);
      mapping[id] = { group: j.group, path: r === 'failed' ? null : p, result: r };
      if (r === 'downloaded') console.log('OK  ', j.group, id, (fs.statSync(path.join(cache, p)).size / 1024).toFixed(1) + 'KB');
    }
  }));
  fs.writeFileSync(path.join(root, 'tmp/joke-mapping.json'), JSON.stringify(mapping, null, 2));
  const okPaths = Object.values(mapping).filter((m) => m.path).length;
  console.log('\n=== 汇总 ===');
  console.log({ total: jokes.length, 本地已有: skip, 新下载: dl, 下载失败: failures.length, 可用路径: okPaths, 新下载MiB: (bytes / 1048576).toFixed(1) });
  fs.writeFileSync(path.join(root, 'tmp/joke-download-failures.json'), JSON.stringify(failures, null, 2));
  console.log('不可用:', Object.entries(mapping).filter(([, m]) => !m.path).map(([k, m]) => m.group + ':' + k).join(', '));
})();
