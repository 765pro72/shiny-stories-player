// Scrape shinycolors.info community pages (namespace 3004) and build scriptId -> {activity, episode} map.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const OUT = path.join(root, 'data', 'wiki-titles.json');

const API = 'https://shinycolors.info/w/api.php';

async function main() {
  const { chromium } = require('playwright-core');
  const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--disable-blink-features=AutomationControlled'] });
  const context = await browser.newContext({ locale: 'ko-KR', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' });
  const page = await context.newPage();

  // First hit the site so the Cloudflare challenge can settle in this context.
  await page.goto('https://shinycolors.info/w/index.php?title=%ED%8A%B9%EC%88%98:%EB%AA%A8%EB%93%A0%EB%AC%B8%EC%84%9C', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(4000);
  const warmed = await page.evaluate(() => document.body.innerText.length);
  console.log('warmup text length', warmed);

  async function api(params) {
    const url = API + '?' + new URLSearchParams({ ...params, format: 'json', formatversion: '2' }).toString();
    const text = await page.evaluate(async (u) => {
      const r = await fetch(u, { credentials: 'include' });
      return r.status + '\u0000' + (await r.text());
    }, url);
    const [status, body] = text.split('\u0000');
    if (status !== '200') throw new Error('http ' + status);
    if (body.trim().startsWith('<')) throw new Error('blocked (html)');
    return JSON.parse(body);
  }

  const pages = [];
  let cont = null;
  for (let i = 0; i < 200; i++) {
    const params = { action: 'query', generator: 'allpages', gapnamespace: '3004', gaplimit: '50', prop: 'revisions', rvprop: 'content', rvslots: 'main' };
    if (cont) params.gapcontinue = cont;
    const data = await api(params);
    for (const p of (data.query && data.query.pages) || []) {
      const rev = p.revisions && p.revisions[0];
      const content = rev && rev.slots && rev.slots.main && rev.slots.main.content || '';
      pages.push({ title: p.title, content });
    }
    cont = data.continue && data.continue.gapcontinue;
    process.stdout.write('.' + pages.length);
    if (!cont) break;
  }
  console.log('\nfetched pages', pages.length, cont ? 'CONTINUE REMAINS' : 'complete');

  const map = {};
  const titleRe = /^커뮤니케이션:(?:Event\/)?(.+)\/(.+)$/;
  for (const p of pages) {
    const m = titleRe.exec(p.title);
    if (!m) continue;
    const info = /info\s*=\s*([A-Za-z0-9_\/]+\.json)/.exec(p.content);
    if (!info) continue;
    const key = info[1];
    const activity = m[1].trim();
    const episode = m[2].trim();
    if (!map[key]) map[key] = { activity, episodes: [] };
    if (!map[key].episodes.includes(episode)) map[key].episodes.push(episode);
  }
  const out = { generatedAt: new Date().toISOString(), source: 'https://shinycolors.info/w/ (namespace 3004)', entries: map };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.log('map keys', Object.keys(map).length);
  const sample = Object.keys(map).slice(0, 5).map(k => k + ' <= ' + map[k].activity + ' / ' + map[k].episodes.length + ' 話');
  console.log(sample.join('\n'));
  await browser.close();
}

main().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
