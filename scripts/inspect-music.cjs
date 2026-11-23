const { chromium } = require('playwright-core');
const path = require('node:path');
const { start } = require('../server.cjs');

(async () => {
  const instance = await start(path.join(__dirname, '../cache'), 18771);
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => consoleLogs.push(`[PAGE ERROR] ${err.message}\n${err.stack}`));

  await page.goto(`${instance.url}/music.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const songsCount = await page.$$eval('.song-row-item', els => els.length);
  const songListHtml = await page.$eval('#songListScroll', el => el.innerHTML);

  console.log('Rendered song rows count:', songsCount);
  console.log('Song list innerHTML preview (length ' + songListHtml.length + '):', songListHtml.slice(0, 300));
  console.log('Console logs count:', consoleLogs.length);
  consoleLogs.forEach(l => console.log('LOG:', l));

  await page.screenshot({ path: path.join(__dirname, '../test-music-inspect.png') });
  await browser.close();
  instance.server.close();
  process.exit(0);
})();
