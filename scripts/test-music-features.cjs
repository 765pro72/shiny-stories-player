const { chromium } = require('playwright-core');
const path = require('node:path');
const { start } = require('../server.cjs');

(async () => {
  const instance = await start(path.join(__dirname, '../cache'), 18774);
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto(`${instance.url}/music.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Test Favorite button click
  console.log('Testing Favorite click...');
  const firstFavBtn = await page.$('.song-row-item .row-fav-btn');
  await firstFavBtn.click();
  await page.waitForTimeout(300);

  // Switch to "我的收藏" tab
  await page.click('.tab-btn[data-tab="fav"]');
  await page.waitForTimeout(300);
  const favSongsCount = await page.$$eval('.song-row-item', els => els.length);
  console.log('Favorited songs count in fav tab:', favSongsCount);
  if (favSongsCount < 1) throw new Error('Expected at least 1 favorited song, got ' + favSongsCount);

  // 2. Test Custom Playlists tab
  console.log('Testing Custom Playlist creation...');
  await page.click('.tab-btn[data-tab="custom"]');
  await page.waitForTimeout(300);

  const btnCreate = await page.$('#btnOpenNewPlaylistDialog, #btnCreatePlaylistInitial');
  if (btnCreate) {
    await btnCreate.click();
    await page.waitForTimeout(300);
    await page.fill('#inputNewPlaylistName', '我的最爱精选歌单');
    await page.click('#btnConfirmNewPlaylist');
    await page.waitForTimeout(400);
  }

  const plCardsCount = await page.$$eval('.custom-playlist-card', els => els.length);
  console.log('Created custom playlists count:', plCardsCount);
  if (plCardsCount < 1) throw new Error('Custom playlist was not created');

  console.log('✓ All Music features verified successfully!');
  await browser.close();
  instance.server.close();
  process.exit(0);
})();
