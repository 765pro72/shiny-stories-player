const { app, BrowserWindow } = require('electron');
const path = require('path');

async function check() {
  const serverModule = require('../server.cjs');
  const s = await serverModule.start(path.join(__dirname, '..', 'cache'), 0, () => path.join(__dirname, '..', 'data'));
  await app.whenReady();
  const win = new BrowserWindow({ width: 1280, height: 800, show: false });

  for (const page of ['index.html', 'guide.html', 'card-gallery.html', 'voice-gallery.html', 'music.html']) {
    await win.loadURL(s.url + '/' + page);
    await new Promise(r => setTimeout(r, 600));
    const info = await win.webContents.executeJavaScript(`(() => {
      const b = document.querySelector('.site-brand');
      const h = document.querySelector('.site-header');
      const bBox = b ? b.getBoundingClientRect() : null;
      const bComp = b ? getComputedStyle(b) : null;
      const hBox = h ? h.getBoundingClientRect() : null;
      const hComp = h ? getComputedStyle(h) : null;
      return {
        brand: {
          x: Math.round(bBox?.x || 0), y: Math.round(bBox?.y || 0),
          width: Math.round(bBox?.width || 0), height: Math.round(bBox?.height || 0),
          padding: bComp?.padding, heightProp: bComp?.height,
          bFontSize: b ? getComputedStyle(b.querySelector('b')).fontSize : null,
          bMargin: b ? getComputedStyle(b.querySelector('b')).margin : null
        },
        header: {
          x: Math.round(hBox?.x || 0), y: Math.round(hBox?.y || 0),
          width: Math.round(hBox?.width || 0), height: Math.round(hBox?.height || 0),
          padding: hComp?.padding, heightProp: hComp?.height, position: hComp?.position
        }
      };
    })()`);
    console.log(`=== ${page} ===`);
    console.log(`  Brand rect: ${info.brand.width}x${info.brand.height} at (${info.brand.x}, ${info.brand.y}), padding: ${info.brand.padding}`);
    console.log(`  Header rect: ${info.header.width}x${info.header.height} at (${info.header.x}, ${info.header.y}), padding: ${info.header.padding}, pos: ${info.header.position}`);
  }
  win.destroy();
  s.server.close();
  app.quit();
}
check().catch(console.error);
