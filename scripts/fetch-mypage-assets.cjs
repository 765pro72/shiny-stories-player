// 补齐「主页剧情」（mypage_communications/）脚本引用但未镜像的素材：语音 / BGM / SE / 背景 / 前景 / 文字框 / 立绘
const fs = require('fs'), path = require('path');
const root = 'F:/sc', cache = path.join(root, 'cache');
const dir = path.join(cache, 'json/mypage_communications');
const needed = new Set();
const charKinds = [];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  let a; try { a = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
  for (const t of a) {
    if (t.textFrame && t.textFrame !== 'off') needed.add(`images/event/text_frame/${t.textFrame}.png`);
    if (t.bg && !['off', 'fade_out', 'out'].includes(t.bg)) needed.add(`images/event/bg/${t.bg}.jpg`);
    if (t.fg && !['off', 'fade_out'].includes(t.fg)) needed.add(`images/event/fg/${t.fg}.png`);
    for (const [k, d] of [['se', 'sounds/se/event'], ['voice', 'sounds/voice/events'], ['bgm', 'sounds/bgm']])
      if (t[k] && !['off', 'fade_out', 'pause', 'resume'].includes(t[k])) needed.add(`${d}/${t[k]}.m4a`);
    if (t.charId && t.charType) charKinds.push({ charType: t.charType, charId: t.charId, charCategory: t.charCategory || '' });
  }
}
// 立绘：主页剧情用 stand_fix（等身立绘），旧逻辑会误判成 stand；两种都试，取实际存在的那种
const variants = new Set();
for (const { charType, charId, charCategory } of charKinds) {
  const c = charCategory || '';
  const kinds = new Set(['stand']);
  if (c.startsWith('stand_fix')) kinds.add('stand_fix');
  const m = c.match(/^(stand_costume|stand_jersey|stand_silhouette)/);
  if (m) kinds.add(m[1]);
  for (const k of kinds) variants.add(`spine/${charType}/${k}/${charId}/data.json`);
}
const list = [...new Set([...needed, ...variants])];
const missing = list.filter((p) => !fs.existsSync(path.join(cache, p)));
console.log('素材需求', list.length, '其中缺失', missing.length);
const byKind = {};
for (const p of missing) { const k = p.split('/').slice(0, p.startsWith('sounds/voice') ? 3 : 2).join('/'); byKind[k] = (byKind[k] || 0) + 1; }
console.log(byKind);

const failures = []; let dl = 0, bytes = 0, skipped404 = 0;
async function get(p) {
  const target = path.join(cache, p);
  if (fs.existsSync(target) && fs.statSync(target).size > 0) return;
  for (let a = 0; a < 3; a++) try {
    const r = await fetch('https://viewer.shinycolors.moe/' + p, { signal: AbortSignal.timeout(45000) });
    if (!r.ok) throw Error(String(r.status));
    const b = Buffer.from(await r.arrayBuffer());
    if (!b.length || b.length > 100 * 1024 * 1024) throw Error('invalid size');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target + '.part', b); fs.renameSync(target + '.part', target);
    bytes += b.length; dl++; if (dl % 100 === 0) console.log(`下载 ${dl}/${missing.length}, ${(bytes / 1048576).toFixed(1)} MiB, 失败 ${failures.length}`);
    return;
  } catch (e) { if (a === 2) { if (String(e).includes('404')) skipped404++; else failures.push({ path: p, error: String(e) }); } }
}
(async () => {
  let i = 0;
  await Promise.all(Array.from({ length: 12 }, async () => { while (i < missing.length) await get(missing[i++]); }));
  console.log('\n=== 汇总 ===', { 需求: list.length, 新下载: dl, MiB: (bytes / 1048576).toFixed(1), 源站404: skipped404, 其他失败: failures.length });
  fs.writeFileSync(path.join(root, 'tmp/mypage-asset-fetch.json'), JSON.stringify({ list: list.length, missing: missing.length, downloaded: dl, notFound: skipped404, failures }, null, 2));
  const still = list.filter((p) => !fs.existsSync(path.join(cache, p)));
  console.log('仍然缺失', still.length, still.slice(0, 20).join('\n  '));
})();
