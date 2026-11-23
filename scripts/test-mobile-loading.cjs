const {app, BrowserWindow} = require('electron');
const path = require('path');
const {start} = require('../server.cjs');

app.whenReady().then(async () => {
  const s = await start(path.join(__dirname, 'cache'), 0, () => path.join(__dirname, 'data'), { mobile: true });
  const win = new BrowserWindow({
    width: 390,
    height: 844,
    show: false,
    webPreferences: {
      offscreen: true
    }
  });

  // Emulate Android User Agent
  win.webContents.setUserAgent('Mozilla/5.0 (Linux; U; Android 14; zh-cn; Pixel 8 Pro Build/UD1A.230803.041) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36');

  win.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`[BROWSER CONSOLE] L${level} (${sourceId}:${line}): ${message}`);
  });

  win.webContents.on('page-error', (e, err) => {
    console.error('[BROWSER PAGE ERROR]', err);
  });

  console.log('Loading mobile home page at:', s.url);
  await win.loadURL(s.url + '/index.html');

  // Check state at 1s, 2s, 4s
  for (const delay of [1000, 2000, 4000]) {
    await new Promise(r => setTimeout(r, delay));
    const splashState = await win.webContents.executeJavaScript(`
      (() => {
        const splash = document.getElementById('appSplash');
        const loading = document.getElementById('loading');
        const idol = document.getElementById('idol');
        const homeReady = window.homeReady;
        return {
          splashExists: !!splash,
          splashDisplay: splash ? splash.style.display : null,
          splashClass: splash ? splash.className : null,
          splashStatusText: splash?.querySelector('#splashStatus')?.textContent,
          loadingExists: !!loading,
          loadingDisplay: loading ? loading.style.display : null,
          homeReady,
          idolChildren: idol ? idol.children.length : 0
        };
      })()
    `);
    console.log(`State at ${delay}ms:`, JSON.stringify(splashState, null, 2));
  }

  app.quit();
  s.server.close();
});
