const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

async function testFrames() {
  const serverModule = require('../server.cjs');
  const s = await serverModule.start(path.join(__dirname, '..', 'cache'), 0, () => path.join(__dirname, '..', 'data'));
  await app.whenReady();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: { offscreen: true }
  });

  await win.loadURL(s.url + '/index.html');
  await new Promise(r => setTimeout(r, 1000));

  const shot1 = await win.webContents.capturePage();
  fs.writeFileSync('f:/sc/scripts/shot1_index.png', shot1.toPNG());

  // Trigger navigation to guide.html
  await win.webContents.executeJavaScript(`
    document.querySelector('.site-nav a[href*="guide"]').click();
  `);

  // Capture immediately during transition
  await new Promise(r => setTimeout(r, 30));
  const shot2 = await win.webContents.capturePage();
  fs.writeFileSync('f:/sc/scripts/shot2_transition_30ms.png', shot2.toPNG());

  await new Promise(r => setTimeout(r, 60));
  const shot3 = await win.webContents.capturePage();
  fs.writeFileSync('f:/sc/scripts/shot3_transition_90ms.png', shot3.toPNG());

  await new Promise(r => setTimeout(r, 400));
  const shot4 = await win.webContents.capturePage();
  fs.writeFileSync('f:/sc/scripts/shot4_settled.png', shot4.toPNG());

  console.log('Screenshots saved');
  win.destroy();
  s.server.close();
  app.quit();
}
testFrames().catch(console.error);
