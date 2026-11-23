const { chromium } = require('playwright-core');
const path = require('node:path');
const { start } = require('../server.cjs');

(async () => {
  console.log('--- Comprehensive Health Check of All Application Pages ---');
  const instance = await start(path.join(__dirname, '../cache'), 18775);
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const errors = [];
  page.on('pageerror', err => {
    errors.push(`[${page.url()}] ${err.message}`);
  });

  const pages = [
    'index.html',
    'guide.html',
    'card-gallery.html',
    'voice-gallery.html',
    'model-picker.html',
    'music.html',
    'custom-story.html'
  ];

  for (const p of pages) {
    console.log(`Checking page: ${p}...`);
    await page.goto(`${instance.url}/${p}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const title = await page.title();
    console.log(`  ✓ Title: "${title}"`);
  }

  await browser.close();
  instance.server.close();

  if (errors.length > 0) {
    console.error('Errors found:', errors);
    process.exit(1);
  } else {
    console.log('✓ All 7 pages passed with 0 JavaScript / rendering errors!');
    process.exit(0);
  }
})();
