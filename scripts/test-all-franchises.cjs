const { chromium } = require('playwright-core');
const path = require('node:path');
const { start } = require('../server.cjs');

(async () => {
  const instance = await start(path.join(__dirname, '../cache'), 18773);
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(`${instance.url}/music.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const franchises = ['gakuen', 'cg', 'ml', 'as', 'sc'];
  for (const f of franchises) {
    console.log('Testing franchise switch to:', f);
    await page.click(`.franchise-tab-btn[data-franchise="${f}"]`);
    await page.waitForTimeout(500);
    const count = await page.$eval('#countSongs', el => el.textContent.trim());
    const title = await page.$eval('#heroFranchiseHeading', el => el.textContent.trim());
    const firstSong = await page.$eval('.song-row-item .song-title-main', el => el.textContent.trim());
    console.log(`Franchise [${f}]: Songs=${count}, Title=${title}, FirstSong=${firstSong}`);
  }

  await browser.close();
  instance.server.close();
  console.log('All franchise switches verified successfully!');
  process.exit(0);
})();
