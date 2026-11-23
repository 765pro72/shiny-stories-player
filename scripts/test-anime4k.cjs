// GPU integration test in an isolated, invisible Electron window. No game data
// or user preferences are read/written. Exercises the actual shipped shaders.
const fs = require('fs'), path = require('path'), http = require('http');
const electron = require('electron');
if (!electron.app) {
  const { spawnSync } = require('child_process');
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
  const result = spawnSync(electron, [__filename], { stdio: 'inherit', env });
  process.exit(result.status ?? 1);
}
const { app, BrowserWindow } = electron;
const root = path.resolve(__dirname, '..');
const page = `<!doctype html><meta charset="utf-8"><style>
#host{position:relative;width:640px;height:360px}#host canvas{width:100%;height:100%;object-fit:cover}
</style><div id="host"></div><script src="/player/lib/pixi.js"></script><script src="/anime4k.js"></script>`;
const run = async () => {
  const check = (condition, message) => { if (!condition) throw Error(message); };
  const wait = async predicate => {
    const start = performance.now();
    while (!predicate()) { if (performance.now() - start > 15000) throw Error('GPU test timeout'); await new Promise(r => setTimeout(r, 20)); }
  };
  const app = new PIXI.Application({ width: 64, height: 36, resolution: 1, transparent: true, autoStart: false });
  const host = document.querySelector('#host'); host.append(app.view);
  const shape = new PIXI.Graphics();
  shape.beginFill(0x7386c5, .65).drawCircle(30, 18, 14).endFill();
  shape.lineStyle(1, 0x19334a, 1).moveTo(4, 30).lineTo(58, 3);
  app.stage.addChild(shape);
  ShinyAnime4K.setMode('balanced');
  let monitor=true;const state = ShinyAnime4K.attach(app, { fill: true,monitorPerformance:()=>monitor });
  await wait(() => state.effectiveMode !== 'off' || state.error);
  check(!state.error, state.error);
  const snapshots = [];
  app.renderer.on('postrender', () => {
    if (!state.active) return;
    const gl = state.output.getContext('webgl2') || state.output.getContext('webgl'), w = state.output.width, h = state.output.height;
    const bytes = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    const reference = document.createElement('canvas'); reference.width = w; reference.height = h;
    const ctx = reference.getContext('2d'); ctx.drawImage(app.view, 0, 0, w, h);
    const linear = ctx.getImageData(0, 0, w, h).data;
    let rgbError = 0, alphaError = 0, visible = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = (y*w+x)*4, b = ((h-1-y)*w+x)*4;
      alphaError += Math.abs(bytes[b+3]-linear[a+3]);
      if (linear[a+3] > 200) { visible++; for (let c = 0; c < 3; c++) rgbError += Math.abs(bytes[b+c]-linear[a+c]); }
    }
    snapshots.push({ mode: state.effectiveMode, width: w, height: h, visible, rgbDifference: rgbError / Math.max(1, visible*3), alphaDifference: alphaError / (w*h) });
  });
  app.render();
  check(state.active && state.output.width === 128 && state.output.height === 72, 'CNN must produce a 2x framebuffer');
  check(snapshots[0].visible > 0 && snapshots[0].rgbDifference > .1, 'Output must differ from ordinary bilinear resizing');
  check(snapshots[0].alphaDifference < 2, 'Transparent model edges must preserve alpha');
  const bounds = () => { const a = app.view.getBoundingClientRect(), b = state.output.getBoundingClientRect(); return ['x','y','width','height'].every(k => Math.abs(a[k]-b[k]) < .1); };
  check(bounds(), 'Source and output geometry must match');
  host.style.width = '1920px'; host.style.height = '1080px';
  await new Promise(r => setTimeout(r, 80)); check(bounds(), 'Resize must preserve model alignment');
  for (let i = 0; i < 10; i++) {
    ShinyAnime4K.setMode('off');
    check(app.view.style.opacity !== '0' && !state.active, 'Off must restore original immediately');
    const nextMode = ['balanced', 'quality', 'fine', 'max2x', 'ultra'][i % 5];
    ShinyAnime4K.setMode(nextMode);
    await wait(() => state.effectiveMode !== 'off' || state.error); check(!state.error, state.error);
    app.render(); check(state.active && !app.renderer.gl.isContextLost(), 'Repeated switching must not evict the game context');
    check(state.output.width === (nextMode === 'ultra' ? 256 : 128), '4x must run two CNN passes, not ordinary resizing');
    check(snapshots.at(-1).alphaDifference < 2, nextMode + ' must preserve transparent edges');
    check(bounds(), 'Mode change must not move the model');
  }
  state.output.getContext('webgl').getExtension('WEBGL_lose_context').loseContext();
  await wait(() => !!state.error);
  check(app.view.style.opacity !== '0', 'GPU context loss must restore original');
  ShinyAnime4K.setMode('balanced');
  await wait(() => state.effectiveMode !== 'off' || state.error); check(!state.error, state.error); app.render();
  // Simulate sustained low presentation FPS without a slow/flaky wall-clock
  // test. Verify both the real fallback pipeline and the visible notification.
  ShinyAnime4K.setMode('ultra');
  await wait(() => state.effectiveMode === 'ultra' || state.error); check(!state.error, state.error);
  const nativeNow = performance.now.bind(performance); let time = nativeNow();
  monitor=false;Object.defineProperty(performance,'now',{configurable:true,value:()=>time});for(let i=0;i<12;i++){time+=1200;app.render()}delete performance.now;check(state.effectiveMode==='ultra'&&!state.adapted,'On-demand still images must not be downgraded for idle time');monitor=true;ShinyAnime4K.setMode('ultra');await wait(()=>state.effectiveMode==='ultra'||state.error);time=nativeNow();
  Object.defineProperty(performance, 'now', { configurable: true, value: () => time });
  for (let i = 0; i < 50 && state.effectiveMode === 'ultra'; i++) { time += 150; app.render(); }
  delete performance.now;
  await wait(() => state.effectiveMode === 'max2x' || state.error); check(!state.error, state.error); app.render();
  check(ShinyAnime4K.mode === 'ultra', 'Auto downgrade must retain the preferred highest quality');
  const notice = document.querySelector('.anime4k-toast');
  check(!notice.hidden && notice.textContent.includes('4×') && notice.textContent.includes('2×') && notice.textContent.includes('降为'), 'Auto downgrade must visibly announce the previous and new levels');
  check(state.adapted && state.output.width === 128, 'Auto downgrade must actually apply the lower output');
  state.destroy();
  check(host.querySelectorAll('canvas').length === 1 && app.view.style.opacity !== '0', 'Cleanup must remove the extra canvas');
  check(!app.renderer.gl.isContextLost(), 'Original renderer must survive cleanup');
  return { ok: true, snapshots: [...new Map(snapshots.map(s => [s.mode, s])).values()], resize: '1920x1080', switches: 6, contextLossRecovery: true, onDemandIdleGuard:true, adaptiveDowngrade: true, downgradeNotification: true, preferredModeRetained: true, cleanup: true };
};
let server, win;
app.whenReady().then(async () => {
  const timeout = setTimeout(() => { console.error('Realtime SR GPU test timed out'); app.exit(1); }, 150000);
  try {
    server = http.createServer((req, res) => {
      if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); return res.end(page); }
      const file = path.resolve(root, 'public', '.' + req.url);
      if (!file.startsWith(path.join(root, 'public') + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/plain'); fs.createReadStream(file).pipe(res);
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    win = new BrowserWindow({ show: false, width: 1000, height: 800, webPreferences: { backgroundThrottling: false, offscreen: true, contextIsolation: true, sandbox: true } });
    await win.loadURL('http://127.0.0.1:' + server.address().port);
    const result = await win.webContents.executeJavaScript('(' + run.toString() + ')()');
    fs.mkdirSync(path.join(root, 'exports'), { recursive: true });
    fs.writeFileSync(path.join(root, 'exports/anime4k-gpu-verification.json'), JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2));
    console.log(JSON.stringify(result, null, 2)); clearTimeout(timeout); win.destroy(); server.close(); app.exit(0);
  } catch (error) { console.error(error); clearTimeout(timeout); win?.destroy(); server?.close(); app.exit(1); }
});
