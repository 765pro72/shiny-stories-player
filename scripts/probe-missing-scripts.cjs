// Recon: why do these catalog keys 404 on the public viewer? Probe alternate id forms and hosts.
const ids = process.argv.slice(2);
const HOSTS = ['https://viewer.shinycolors.moe/'];
const FORMS = [
  id => `json/special_communications/${id}.json`,
  id => `json/special_communications/${id}_1.json`,
  id => `json/special_communications/${id}a.json`,
];
async function head(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const text = r.ok ? await r.text() : '';
    return { status: r.status, len: text.length, head: text.slice(0, 120).replace(/\s+/g, ' ') };
  } catch (e) {
    return { status: 'ERR', len: 0, head: String(e.message || e).slice(0, 120) };
  }
}
(async () => {
  for (const id of ids) {
    for (const host of HOSTS) {
      for (const f of FORMS) {
        const p = f(id);
        const res = await head(host + p);
        console.log(`${id}\t${res.status}\t${res.len}\t${p}\t${res.head}`);
      }
    }
  }
})();
