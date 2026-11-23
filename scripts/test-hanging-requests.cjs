const {app, BrowserWindow, session} = require('electron');
const path = require('path');
const {start} = require('../server.cjs');

app.whenReady().then(async () => {
  const s = await start(path.join(__dirname, 'cache'), 0, () => path.join(__dirname, 'data'), { mobile: true });
  
  const customSession = session.fromPartition('test-net-' + Date.now());
  const pendingRequests = new Map();
  
  customSession.webRequest.onBeforeRequest((details, callback) => {
    if (!details.url.startsWith('devtools:')) {
      pendingRequests.set(details.id, { url: details.url, start: Date.now() });
      console.log('[REQ START]', details.method, details.url);
    }
    callback({});
  });

  customSession.webRequest.onCompleted((details) => {
    const req = pendingRequests.get(details.id);
    const duration = req ? Date.now() - req.start : 0;
    pendingRequests.delete(details.id);
    console.log('[REQ DONE]', details.statusCode, details.url, `(${duration}ms)`);
  });

  customSession.webRequest.onErrorOccurred((details) => {
    const req = pendingRequests.get(details.id);
    const duration = req ? Date.now() - req.start : 0;
    pendingRequests.delete(details.id);
    console.log('[REQ ERROR]', details.error, details.url, `(${duration}ms)`);
  });

  const win = new BrowserWindow({
    width: 390,
    height: 844,
    show: false,
    webPreferences: {
      session: customSession,
      offscreen: true
    }
  });

  win.webContents.setUserAgent('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0 Mobile');
  
  // Timeout navigation after 8 seconds
  const loadPromise = win.loadURL(s.url + '/index.html');
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation TIMEOUT after 8s')), 8000));
  
  try {
    await Promise.race([loadPromise, timeoutPromise]);
    console.log('Page loaded successfully!');
  } catch (err) {
    console.error('Page load failed:', err.message);
    console.log('Still PENDING requests:');
    for (const [id, req] of pendingRequests.entries()) {
      console.log(' - HANGING:', req.url, `(elapsed: ${Date.now() - req.start}ms)`);
    }
  }

  app.quit();
  s.server.close();
});
