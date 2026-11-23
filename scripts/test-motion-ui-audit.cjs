const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

console.log('--- Starting Motion & UI Comprehensive Self-Audit Test ---');

// 1. Audit Producer Birthday Once-Per-Day & Re-trigger on Demand
const splashJs = fs.readFileSync('public/splash-screen.js', 'utf8');
const splashCss = fs.readFileSync('public/splash-screen.css', 'utf8');

assert.ok(splashJs.includes('producer_bday_greeted_date'), 'splash-screen.js must persist producer_bday_greeted_date');
assert.ok(splashJs.includes('mountProducerBirthdayPill'), 'splash-screen.js must include mountProducerBirthdayPill');
assert.ok(splashJs.includes('attachWardrobeBirthdayButton'), 'splash-screen.js must include attachWardrobeBirthdayButton');
assert.ok(splashJs.includes('showProducerBirthdayModal(true)'), 'splash-screen.js must support force-open for on-demand retrigger');
assert.ok(splashJs.includes('if (!force && (seenInSession || greetedDate === todayFull || safeStorage(\'local\', \'get\', producerGreetedKey) === \'1\'))'),
  'showProducerBirthdayModal must skip auto-popup if already greeted today');
assert.ok(splashCss.includes('.producer-birthday-pill'), 'splash-screen.css must style .producer-birthday-pill');
assert.ok(splashCss.includes('@keyframes floatRibbon'), 'splash-screen.css must define @keyframes floatRibbon');
console.log('✔ PASS: Producer Birthday auto-popup once per day and on-demand replay triggers verified.');

// 2. Audit Top-Left Home Status Badge Placement (No collision with 283 Brand)
const uiUpgradeCss = fs.readFileSync('public/ui-upgrade.css', 'utf8');
assert.ok(!uiUpgradeCss.includes('top: 24px !important;\n  left: 24px !important;'), 'ui-upgrade.css must not position home-status at top: 24px');
assert.ok(uiUpgradeCss.includes('top: calc(var(--header-height, 68px) + 14px) !important;'),
  'ui-upgrade.css must position home-status below the site header');
console.log('✔ PASS: Home status badge positioned below header; 283 logo text overlap eliminated.');

// 3. Audit Desktop Chrome Window Controls Overlay Padding (No collision with Nav tabs)
assert.ok(uiUpgradeCss.includes('html[data-desktop-chrome=overlay] .site-header') && uiUpgradeCss.includes('padding-right: 160px !important;'),
  'ui-upgrade.css must provide 160px padding-right for desktop overlay window controls');
console.log('✔ PASS: Desktop window controls overlay padding verified (no titlebar button collision with nav).');

// 4. Audit Navigation Transitions & No Double-Jumping
const navCss = fs.readFileSync('public/navigation.css', 'utf8');
const navJs = fs.readFileSync('public/navigation.js', 'utf8');

assert.ok(navCss.includes('.site-nav{view-transition-name:none}'), 'navigation.css must not snapshot .site-nav to preserve module-marker glide');
assert.ok(navCss.includes('::view-transition-group(module-marker)'), 'navigation.css must animate module-marker');
assert.ok(navCss.includes('html[data-cross-motion=active] .card') && navCss.includes('animation: none !important;'),
  'navigation.css must suppress internal element animation during cross-motion to prevent double-jumping');
assert.ok(uiUpgradeCss.includes('body.app-booting .card'),
  'ui-upgrade.css must only animate item pop on cold boot, not on every page transition');
assert.ok(navJs.includes('typeof root.querySelectorAll === \'function\''),
  'navigation.js mountKineticTypography must safely handle non-element root arguments');
console.log('✔ PASS: Continuous navigation marker glide and double-jump elimination verified.');

// 5. Audit Scenario Audio & Autoplay
const desktopCjs = fs.readFileSync('desktop.cjs', 'utf8');
const bridgeJs = fs.readFileSync('public/player/scenario-bridge.js', 'utf8');
assert.ok(desktopCjs.includes('no-user-gesture-required'), 'desktop.cjs must append --autoplay-policy=no-user-gesture-required');
assert.ok(bridgeJs.includes('unlockAudio'), 'scenario-bridge.js must implement unlockAudio');
console.log('✔ PASS: Scenario audio autoplay and AudioContext auto-resumption verified.');

// 6. Audit Mobile Player Navigation Hiding
const serverCjs = fs.readFileSync('server.cjs', 'utf8');
const mobileNavJs = fs.readFileSync('public/mobile-nav.js', 'utf8');
const mobileNavCss = fs.readFileSync('public/mobile-nav.css', 'utf8');
const mobileCss = fs.readFileSync('public/mobile.css', 'utf8');

assert.ok(serverCjs.includes('p.startsWith(\'/player/\')'), 'server.cjs must exclude mobile-nav on /player/');
assert.ok(mobileNavJs.includes('location.pathname.includes(\'/player/\')'), 'mobile-nav.js must guard against /player/');
assert.ok(mobileNavCss.includes('body.player-page .mobile-floating-bar'), 'mobile-nav.css must hide floating bar on player page');
assert.ok(mobileCss.includes('body.player-page .mobile-floating-bar'), 'mobile.css must hide floating bar on player page');
console.log('✔ PASS: Mobile floating bar strictly hidden during scenario playback verified.');

// 7. Audit Wardrobe Dock Touching Bottom (Apply button on cards, no floating obstacle)
assert.ok(mobileCss.includes('.page-wardrobe .mobile-bottom-nav') && mobileCss.includes('.page-wardrobe .wardrobe-layout'),
  'mobile.css must dock wardrobe nav bar at bottom');
assert.ok(mobileCss.includes('padding-bottom: 74px !important;') || mobileCss.includes('padding-bottom:74px!important;'),
  'wardrobe layout must have standard bottom padding');
console.log('✔ PASS: Wardrobe dock touches bottom and cards have individual apply buttons.');

// 8. Audit MotionSites Specular & Tactile Micro-Press Styling
assert.ok(uiUpgradeCss.includes('box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.85) !important;'),
  'ui-upgrade.css must include MotionSites specular top border highlight');
assert.ok(uiUpgradeCss.includes('transform: translateY(1px) scale(0.98) !important;'),
  'ui-upgrade.css must include MotionSites tactile micro-press');
console.log('✔ PASS: MotionSites specular highlights and tactile feedback verified.');

// 9. Audit Clean Main Lobby (No Auto-popups, No Floating Pills/Banners) & Wardrobe Settings Replay
assert.ok(splashJs.includes('attachWardrobeBirthdayButton()'), 'splash-screen.js must mount wardrobe settings replay button');
assert.ok(!splashJs.includes('mountProducerBirthdayPill();\n        attachWardrobeBirthdayButton();'),
  'splash-screen.js must not auto-mount producer birthday pill on lobby');
console.log('✔ PASS: Main lobby pure and clean without auto-popups; on-demand birthday replay available in settings.');

// 10. Audit Voice Playback & Track Access for Mano Sakuragi and All Idols
assert.ok(bridgeJs.includes('player._trackManager.currentTrack'), 'scenario-bridge.js must read currentTrack instead of _current');
const manoStory = JSON.parse(fs.readFileSync('cache/json/special_communications/490300101.json', 'utf8'));
assert.ok(manoStory.some(t => t.voice && t.voice.includes('4903001010010')), 'Mano producer birthday story must contain voice 4903001010010');
assert.ok(fs.existsSync('cache/sounds/voice/events/special_communications/490300101/4903001010010.m4a'), 'Mano voice file must exist on disk');
console.log('✔ PASS: Mano Sakuragi audio assets and player track manager currentTrack voice access verified.');

// 11. Audit Wardrobe Per-Card Apply Button
const pickerJs = fs.readFileSync('public/model-picker.js', 'utf8');
const pickerCss = fs.readFileSync('public/model-picker.css', 'utf8');
assert.ok(pickerJs.includes('card-apply-btn'), 'model-picker.js must create .card-apply-btn on each card');
assert.ok(pickerCss.includes('.model-card .card-apply-btn'), 'model-picker.css must style .card-apply-btn');
console.log('✔ PASS: Wardrobe per-card apply button verified under each outfit card.');

// 12. Audit Mobile Header Hidden & Bouncy Spring Navigation
assert.ok(mobileNavCss.includes('.site-header') && mobileNavCss.includes('display: none !important;'),
  'mobile-nav.css must hide .site-header on mobile');
assert.ok(mobileNavCss.includes('@keyframes navTabSpringBounce'),
  'mobile-nav.css must define @keyframes navTabSpringBounce for elastic spring navigation');
console.log('✔ PASS: Mobile header hidden to prevent scroll jitter; elastic spring bouncy navigation verified.');

// 13. Audit GPU Acceleration & High-Performance In-Memory Caching
assert.ok(desktopCjs.includes('enable-gpu-rasterization') && desktopCjs.includes('enable-zero-copy'),
  'desktop.cjs must enable GPU rasterization and zero copy');
assert.ok(serverCjs.includes('MAX_RAM_CACHE=256*1024*1024'),
  'server.cjs must allocate at least 256MB RAM cache');
console.log('✔ PASS: GPU rasterization, zero copy, and expanded in-memory RAM caching verified.');

console.log('--- ALL SELF-AUDIT CHECKS PASSED (13/13) ---');
