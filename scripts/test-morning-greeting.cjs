const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const electron = require('electron');

if (!electron.app) {
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  process.exit(require('node:child_process').spawnSync(electron, [__filename], { env, stdio: 'inherit' }).status ?? 1);
}

const key = 'produce_communications/morning-fixture.json';
const script = fs.readFileSync(path.join(__dirname, '../public/prism-hub.js'));
const server = http.createServer((req, res) => {
  if (req.url === '/prism-hub.js') {
    res.setHeader('Content-Type', 'text/javascript');
    return res.end(script);
  }
  if (req.url === '/api/morning-greeting') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true, key, idol: '测试偶像' }));
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (req.url.startsWith('/player/')) return res.end('<!doctype html><title>Fixture player</title>');
  res.end('<!doctype html><script>Date.prototype.getHours=()=>8</script><div class="shell-utils"></div><script src="/prism-hub.js"></script>');
});

electron.app.whenReady().then(async () => {
  let win;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    win = new electron.BrowserWindow({ show: false, webPreferences: { partition: 'morning-fixture', backgroundThrottling: false } });
    const run = source => win.webContents.executeJavaScript(source);
    await win.loadURL(url);
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    for (let i = 0; i < 30 && !await run('!!document.querySelector(".ph-toast-close")'); i++) await delay(100);
    await run('document.querySelector(".ph-toast-close").click()');
    await win.loadURL(url);
    await delay(1500);
    assert.equal(await run('!!document.querySelector("#phMorningToast")'), false);
    await run(`window.PrismHub.openMorning({ok:true,key:${JSON.stringify(key)},idol:'测试偶像'})`);
    assert.equal(await run('!!document.querySelector("#phMornCheckinBtn")'), false);
    await delay(100);
    const emit = value => run(`document.querySelector('#phMornFrame').contentWindow.eval(${JSON.stringify(
      `parent.postMessage({type:'status',value:${JSON.stringify(value)}},location.origin)`
    )})`);
    await emit('连接已结束，加载失败');
    assert.equal(await run('localStorage.getItem("shiny.morningGreeting.lastDate")'), null);
    await emit('本篇剧情播放完毕。');
    await emit('本篇剧情播放完毕。');
    assert.equal(await run('localStorage.getItem("shiny.morningGreeting.streak")'), '1');
    assert.deepEqual(JSON.parse(await run('localStorage.getItem("shiny.watchedStories")')), [key]);
    console.log('Morning completion marks watched once, and dismissed reminders stay closed after reload.');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    win?.destroy();
    server.close();
    electron.app.exit(process.exitCode || 0);
  }
});
