const {app, BrowserWindow} = require('electron');
const path = require('path');
const {start} = require('../server.cjs');

app.whenReady().then(async () => {
  const s = await start(path.join(__dirname, 'cache'), 0, () => path.join(__dirname, 'data'), { mobile: true });
  const win = new BrowserWindow({
    width: 390,
    height: 844,
    show: false,
    webPreferences: { offscreen: true }
  });

  win.webContents.setUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile');
  
  win.webContents.on('console-message', (e, level, msg, line, src) => {
    console.log(`[CONSOLE] ${msg} (${src}:${line})`);
  });

  win.webContents.on('dom-ready', async () => {
    console.log('DOM READY! Checking splash state...');
    for (let t = 1; t <= 4; t++) {
      await new Promise(r => setTimeout(r, 600));
      try {
        const state = await win.webContents.executeJavaScript(`
          (() => {
            const splash = document.getElementById('appSplash');
            return {
              t: ${t * 600},
              hasSplash: !!splash,
              dismissed: splash ? splash.classList.contains('splash-dismissed') : true,
              display: splash ? splash.style.display : 'none'
            };
          })()
        `);
        console.log(`Check at ${t * 600}ms:`, JSON.stringify(state));
      } catch (err) {
        console.log('Eval error:', err.message);
      }
    }
    app.quit();
    s.server.close();
  });

  win.loadURL(s.url + '/index.html').catch(e => console.log('loadURL error:', e.message));
});
