const { chromium } = require('playwright-core');
const path = require('node:path');
const { start } = require('../server.cjs');

(async () => {
  console.log('--- Verifying Titlebar Clearance Across Multiple Pages ---');
  const instance = await start(path.join(__dirname, '../cache'), 18769);
  
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }

  const page = await browser.newPage({ viewport: { width: 1380, height: 940 } });

  const testPages = ['voice-gallery.html', 'index.html', 'music.html', 'card-gallery.html'];

  try {
    for (const p of testPages) {
      await page.goto(`${instance.url}/${p}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        document.documentElement.dataset.desktopChrome = 'overlay';
      });
      await page.waitForTimeout(300);

      const navBox = await page.$eval('.site-nav', el => {
        const rect = el.getBoundingClientRect();
        return { right: rect.right, width: rect.width, left: rect.left };
      });
      const clearance = 1380 - navBox.right;
      console.log(`Page: ${p.padEnd(20)} -> Nav Right: ${navBox.right.toFixed(1)}px, Clearance: ${clearance.toFixed(1)}px`);
      if (clearance < 160) {
        throw new Error(`Clearance too small on ${p}: ${clearance}px < 160px`);
      }
    }

    console.log('--- ALL PAGES PASSED TITLEBAR CLEARANCE TEST ---');
  } finally {
    await browser.close();
    instance.server.close();
  }
})();
