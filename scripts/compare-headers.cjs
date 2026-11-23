const {app, BrowserWindow} = require('electron');
const path = require('path');
const {start} = require('../server.cjs');

app.whenReady().then(async () => {
  const s = await start(path.join(__dirname, 'cache'), 0, () => path.join(__dirname, 'data'));
  const win = new BrowserWindow({ width: 1380, height: 900, show: false, webPreferences: { offscreen: true } });
  
  const pages = ['index.html', 'guide.html', 'card-gallery.html', 'voice-gallery.html', 'model-picker.html'];
  const results = {};
  
  for (const page of pages) {
    await win.loadURL(s.url + '/' + page);
    await new Promise(r => setTimeout(r, 600));
    
    results[page] = await win.webContents.executeJavaScript(`
      (() => {
        const header = document.querySelector('.site-header');
        const brand = document.querySelector('.site-brand');
        const b = brand ? brand.querySelector('b') : null;
        const span = brand ? brand.querySelector('span') : null;
        const nav = document.querySelector('.site-nav');
        
        const r = el => {
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right };
        };
        
        return {
          brand: r(brand),
          b: r(b),
          span: r(span),
          nav: r(nav)
        };
      })()
    `);
  }
  
  console.log('RESULTS:');
  console.log(JSON.stringify(results, null, 2));
  app.quit();
  s.server.close();
});
