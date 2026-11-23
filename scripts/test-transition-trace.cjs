const { app, BrowserWindow } = require('electron');
const path = require('path');

async function testTransition() {
  const serverModule = require('../server.cjs');
  const s = await serverModule.start(path.join(__dirname, '..', 'cache'), 0, () => path.join(__dirname, '..', 'data'));
  await app.whenReady();
  const win = new BrowserWindow({ width: 1280, height: 800, show: false });

  await win.loadURL(s.url + '/index.html');
  await new Promise(r => setTimeout(r, 800));

  // Trace the brand position before, during, and after click
  const trace = await win.webContents.executeJavaScript(`(async () => {
    const samples = [];
    const record = (stage) => {
      const b = document.querySelector('.site-brand');
      const bB = b?.querySelector('b');
      const r = b?.getBoundingClientRect();
      const rB = bB?.getBoundingClientRect();
      const comp = b ? getComputedStyle(b) : null;
      samples.push({
        stage,
        time: performance.now(),
        brand: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null,
        bTag: rB ? { x: rB.x, y: rB.y, w: rB.width, h: rB.height, font: comp?.font } : null
      });
    };

    record('initial');

    // Click guide tab
    const guideLink = document.querySelector('.site-nav a[href*=\"guide\"]');
    if (!guideLink) return { error: 'No guide link' };

    let timer = setInterval(() => record('transitioning'), 16);
    guideLink.click();

    await new Promise(r => setTimeout(r, 600));
    clearInterval(timer);
    record('settled');
    return samples;
  })()`);

  console.log('Trace samples count:', trace?.length);
  if (Array.isArray(trace)) {
    trace.forEach(s => {
      console.log(s.stage, 'brand:', s.brand?.w + 'x' + s.brand?.h, 'bTag:', s.bTag?.w + 'x' + s.bTag?.h);
    });
  } else {
    console.log('Trace error:', trace);
  }

  win.destroy();
  s.server.close();
  app.quit();
}
testTransition().catch(console.error);
