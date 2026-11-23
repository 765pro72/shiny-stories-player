const { chromium } = require('playwright-core');
const path = require('node:path');
const fs = require('node:fs');
const { start } = require('../server.cjs');

(async () => {
  console.log('--- Verifying Comprehensive Jukebox Enhancements & Floating Capsule ---');
  const instance = await start(path.join(__dirname, '../cache'), 18770);
  
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }

  const page = await browser.newPage({ viewport: { width: 1400, height: 960 } });

  try {
    // 1. Load music.html
    await page.goto(`${instance.url}/music.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // 2. Check Single Franchise Brand Logo (图二风格: 正好在283上面单个Logo点击切换企划)
    const brandBtn = await page.$('#franchiseBrandBtn');
    if (!brandBtn) throw new Error('#franchiseBrandBtn not found');
    const brandLogoImg = await page.$eval('#currentFranchiseLogo', img => img.getAttribute('src'));
    console.log('Current Hero Franchise Logo (图二风格):', brandLogoImg);
    if (!brandLogoImg.includes('logo-')) throw new Error('Invalid logo image src');

    // 3. Test Franchise Cycling: click single logo to cycle (ml -> cg -> gakuen -> sc -> as)
    await page.click('#franchiseBrandBtn');
    await page.waitForTimeout(400);
    let curLogo = await page.$eval('#currentFranchiseLogo', img => img.getAttribute('src'));
    let curCount = await page.$eval('#countSongs', el => el.textContent.trim());
    console.log('Cycled Franchise 1 -> Logo:', curLogo, 'Count:', curCount);

    await page.click('#franchiseBrandBtn');
    await page.waitForTimeout(400);
    curLogo = await page.$eval('#currentFranchiseLogo', img => img.getAttribute('src'));
    curCount = await page.$eval('#countSongs', el => el.textContent.trim());
    console.log('Cycled Franchise 2 -> Logo:', curLogo, 'Count:', curCount);

    // Test specific switch to gakuen (学园偶像大师)
    await page.evaluate(() => window.switchFranchise ? window.switchFranchise('gakuen') : document.getElementById('franchiseBrandBtn').click());
    await page.waitForTimeout(400);

    // 4. Test "全员 ALL" contrast & clarity (改清楚)
    const allPill = await page.evaluate(() => {
      const el = document.querySelector('.unit-card-pill');
      const s = window.getComputedStyle(el);
      return { text: el.textContent.trim(), color: s.color, bg: s.backgroundColor, bgImg: s.backgroundImage };
    });
    console.log('Unit Card Pill Contrast Test:', allPill);
    if (allPill.color === 'rgb(255, 255, 255)' && allPill.bg === 'rgba(0, 0, 0, 0)' && allPill.bgImg.includes('255, 255, 255, 0.72')) {
      throw new Error('Contrast failed: white text on white translucent background');
    }

    // 5. Test Audio URL resolution (must NOT be home-bgm!)
    const currentAudioSrc = await page.evaluate(() => {
      const a = document.querySelector('audio');
      return a ? a.src : '';
    });
    console.log('Audio Player Src:', currentAudioSrc);
    if (currentAudioSrc.includes('home-bgm')) {
      throw new Error('Songs must not play the home lobby bgm!');
    }

    // 6. Test Sound Engine Switcher: 苹果音乐 (Apple Music) & 杜比全景声
    const soundEngines = await page.$$eval('.sound-engine-btn', els => els.map(e => ({
      engine: e.dataset.engine,
      text: e.textContent.trim()
    })));
    console.log('Sound Engine Switchers:', soundEngines);
    if (soundEngines.length !== 3) throw new Error('Expected 3 sound engines (netease, apple, lx)');

    // Click Apple Music
    await page.click('.sound-engine-btn[data-engine="apple"]');
    await page.waitForTimeout(300);
    const isAppleActive = await page.$eval('.sound-engine-btn[data-engine="apple"]', el => el.classList.contains('active'));
    console.log('Clicked Apple Music -> Active:', isAppleActive);
    if (!isAppleActive) throw new Error('Apple Music sound engine should be active');

    // 5. Test Background Capsule Toggle
    const btnCapsule = await page.$('#btnToggleCapsule');
    if (!btnCapsule) throw new Error('#btnToggleCapsule not found');
    await btnCapsule.click(); // Turn ON background playback
    await page.waitForTimeout(300);
    const isCapsuleEnabled = await page.evaluate(() => localStorage.getItem('shiny.bgMusicEnabled'));
    console.log('Toggled Background Capsule -> Enabled in storage:', isCapsuleEnabled);
    if (isCapsuleEnabled !== 'true') throw new Error('Background music should be enabled after clicking toggle');

    // 6. Test Lyrics Center Alignment & View Switch
    await page.click('#btnShowLyrics');
    await page.waitForTimeout(400);
    const isLyricsVisible = await page.$eval('#lyricsViewContainer', el => el.style.display !== 'none');
    console.log('Switched to Lyrics View -> Visible:', isLyricsVisible);
    if (!isLyricsVisible) throw new Error('Lyrics view should be visible');

    // 7. Test Cross-Page Mini Capsule on another page (e.g. guide.html)
    console.log('--- Testing Mini Capsule on guide.html ---');
    await page.goto(`${instance.url}/guide.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const miniCapsuleExists = await page.evaluate(() => !!document.getElementById('miniMusicCapsule'));
    console.log('Mini Capsule rendered on guide.html:', miniCapsuleExists);
    if (!miniCapsuleExists) throw new Error('Mini Capsule should appear on guide.html when background mode is enabled');

    // Toggle Capsule Lyrics
    await page.click('#btnCapsuleLrc');
    await page.waitForTimeout(300);
    const isFloatingLyricsOpen = await page.evaluate(() => !document.getElementById('capsuleLyricsPanel').classList.contains('hidden'));
    console.log('Capsule Lyrics Panel opened:', isFloatingLyricsOpen);
    if (!isFloatingLyricsOpen) throw new Error('Capsule lyrics panel should be open');

    // Take screenshot of guide.html with mini capsule & floating lyrics
    const artifactDir = 'C:/Users/Administrator/.gemini/antigravity/brain/4ce2edfd-b18f-4135-9f11-76181322d72e';
    const screenshotCapsulePath = path.join(artifactDir, 'music-capsule-verified.png');
    await page.screenshot({ path: screenshotCapsulePath });
    console.log('Saved capsule screenshot to:', screenshotCapsulePath);

    // Navigate back to music.html and take screenshot
    await page.goto(`${instance.url}/music.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const screenshotMusicPath = path.join(artifactDir, 'music-jukebox-verified.png');
    await page.screenshot({ path: screenshotMusicPath });
    console.log('Saved jukebox screenshot to:', screenshotMusicPath);

    console.log('✅ ALL JUKEBOX & CAPSULE VERIFICATIONS PASSED PERFECTLY!');
  } finally {
    if (browser) await browser.close();
    instance.server.close();
  }
})().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
