const { app, BrowserWindow } = require('electron');
const path = require('path');

async function audit() {
  const serverModule = require('../server.cjs');
  const s = await serverModule.start(path.join(__dirname, '..', 'cache'), 0, () => path.join(__dirname, '..', 'data'));
  await app.whenReady();

  const pages = [
    'index.html',
    'guide.html',
    'card-gallery.html',
    'voice-gallery.html',
    'model-picker.html',
    'custom-story.html',
    'memorial-gallery.html',
    'music.html'
  ];

  const results = {};
  const page404s = [];

  const session = win => win.webContents.session;

  for (const page of pages) {
    const win = new BrowserWindow({
      width: 1280,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const pageErrors = [];

    win.webContents.on('console-message', (event) => {
      if (event.level === 'error') {
        pageErrors.push(event.message);
      }
    });

    try {
      await win.loadURL(`${s.url}/${page}`);
      await new Promise(r => setTimeout(r, 600));

      const domCheck = await win.webContents.executeJavaScript(`(() => {
        const header = document.querySelector('.site-header');
        const brand = document.querySelector('.site-brand');
        const nav = document.querySelector('.site-nav');
        const activeNav = document.querySelector('.site-nav a.active');
        return {
          hasHeader: !!header,
          hasBrand: !!brand,
          hasNav: !!nav,
          activeNavText: activeNav?.textContent?.trim() || 'none'
        };
      })()`);

      results[page] = {
        domCheck,
        errors: pageErrors
      };
    } catch (err) {
      results[page] = { loadError: err.message };
    } finally {
      win.destroy();
    }
  }

  console.log(JSON.stringify(results, null, 2));
  s.server.close();
  app.quit();
}

audit().catch(console.error);
