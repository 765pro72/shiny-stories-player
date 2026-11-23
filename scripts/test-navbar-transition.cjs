const { chromium } = require('playwright-core');
const path = require('node:path');
const { start } = require('../server.cjs');

(async () => {
  console.log('Testing Cross-Page Navigation Transition & 283 Brand Box Stability...');
  const instance = await start(path.join(__dirname, '../cache'), 18772);
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(`${instance.url}/index.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const brandBoxIndex = await page.$eval('.site-brand b', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  console.log('Index page 283 box:', brandBoxIndex);

  // Navigate to guide.html
  await page.click('a[href="guide.html"]');
  // Sample during transition
  await page.waitForTimeout(50);
  const brandBoxTransition = await page.$eval('.site-brand b', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  console.log('Transition 50ms 283 box:', brandBoxTransition);

  await page.waitForTimeout(400);
  const brandBoxSettled = await page.$eval('.site-brand b', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  console.log('Settled guide page 283 box:', brandBoxSettled);

  // Navigate to music.html
  await page.click('a[href="music.html"]');
  await page.waitForTimeout(50);
  const brandBoxMusicTransition = await page.$eval('.site-brand b', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  console.log('Music Transition 50ms 283 box:', brandBoxMusicTransition);

  await page.waitForTimeout(400);
  const brandBoxMusicSettled = await page.$eval('.site-brand b', el => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  });
  console.log('Settled music page 283 box:', brandBoxMusicSettled);

  await browser.close();
  instance.server.close();
  process.exit(0);
})();
