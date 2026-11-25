const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { spawn, execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
];
const DOC = 'https://docs.qq.com/aio/DTHRnREJ1TWdHWE9D';
const UNIT_HEADERS = [
  '⭐组合活动', '⚙️组合活动', '🏫组合活动', '🌸组合活动',
  '⚡组合活动', '💧组合活动', '💄组合活动', '☄组合活动'
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const httpGetJson = (port, p) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port, path: p }, r => {
    let d = '';
    r.on('data', c => { d += c; });
    r.on('end', () => {
      try { res(JSON.parse(d || '{}')); } catch (e) { rej(e); }
    });
  }).on('error', rej);
});

function parseExtractedText(fullText) {
  const lines = String(fullText || '').replace(/\u00a0/g, ' ').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const events = UNIT_HEADERS.map(name => ({ name, text: name }));
  const timelineMap = new Map();

  let mode = null; // 'unit' | 'year'
  let curUnitIdx = -1;
  let curYear = '';

  const isDateLine = s => /^20\d{2}\/\d{2}\/\d{2}\s+/.test(s);

  for (const line of lines) {
    const unitIdx = UNIT_HEADERS.findIndex(h => line === h || line.endsWith(h));
    if (unitIdx >= 0) {
      mode = 'unit';
      curUnitIdx = unitIdx;
      continue;
    }
    if (/^20\d{2}$/.test(line) && Number(line) >= 2018 && Number(line) <= 2035) {
      mode = 'year';
      curYear = line;
      if (!timelineMap.has(curYear)) timelineMap.set(curYear, [curYear]);
      continue;
    }
    if (isDateLine(line)) {
      if (mode === 'unit' && curUnitIdx >= 0) {
        events[curUnitIdx].text += '\n' + line;
      } else if (mode === 'year' && curYear) {
        timelineMap.get(curYear).push(line);
      } else {
        // Fallback: infer year directly from date line if inside timeline area
        const y = line.slice(0, 4);
        if (timelineMap.has(y)) timelineMap.get(y).push(line);
      }
    } else if (/^(⭐|⚙️|🏫|🌸|⚡|💧|💄|☄|🪞|💼|🍩|🖇|🪓|⌛|🎁|🎉|🧷)/.test(line)) {
      // Hit a new non-date section heading
      if (mode === 'unit') {
        mode = null;
        curUnitIdx = -1;
      }
    }
  }

  const timeline = [...timelineMap.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([year, arr]) => ({ year, text: arr.join('\n') }));

  const totalTimelineLines = timeline.reduce((n, y) => n + y.text.split('\n').filter(isDateLine).length, 0);
  const matchedUnits = events.filter(u => u.text.split('\n').filter(isDateLine).length > 0).length;
  return { events, timeline, totalTimelineLines, matchedUnits };
}

function writeAtomicJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

async function runSync() {
  const chrome = CHROME_CANDIDATES.find(p => fs.existsSync(p));
  if (!chrome) {
    console.log(JSON.stringify({ ok: false, skipped: 'no browser' }));
    return;
  }
  const port = 9370 + Math.floor(Math.random() * 60);
  const profile = path.join(os.tmpdir(), 'shiny-doc-sync-' + process.pid);
  const child = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + profile,
    '--window-size=1500,1200',
    'about:blank'
  ], { stdio: 'ignore', windowsHide: true });

  let ws = null;
  try {
    let list = null;
    for (let i = 0; i < 60 && !list; i++) {
      await sleep(250);
      try { list = await httpGetJson(port, '/json/list'); } catch {}
    }
    if (!Array.isArray(list) || !list.length) {
      console.log(JSON.stringify({ ok: false, skipped: 'no devtools' }));
      return;
    }
    const page = list.find(t => t.type === 'page') || list[0];
    ws = new WebSocket(page.webSocketDebuggerUrl);
    const pending = new Map();
    let seq = 0;
    ws.addEventListener('message', e => {
      try {
        const m = JSON.parse(e.data);
        if (m.id && pending.has(m.id)) {
          pending.get(m.id)(m);
          pending.delete(m.id);
        }
      } catch {}
    });
    const send = (method, params = {}) => new Promise(res => {
      const i = ++seq;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
    await new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true });
      ws.addEventListener('error', rej, { once: true });
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url: DOC });
    await sleep(9000);

    const ev = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      return r?.result?.result ? r.result.result.value : null;
    };

    // Click main guide tab if multiple sub-pages exist
    await ev(`(() => {
      const t = [...document.querySelectorAll('*')].filter(x => x.children.length === 0 && /闪耀色彩入坑指引/.test(x.textContent || ''));
      if (t.length) t[t.length - 1].click();
      return t.length;
    })()`);
    await sleep(4000);

    // Helper: surgically click .sc-toggle-arrow-icon on matching .sc-block-toggle blocks
    const expandByRegex = async (patternStr) => ev(`(() => {
      const re = new RegExp(${JSON.stringify(patternStr)});
      let clicked = 0;
      const blocks = [...document.querySelectorAll('.sc-block-toggle')];
      for (const blk of blocks) {
        const labelEl = blk.querySelector('.sc-text-input-content');
        const label = (labelEl ? labelEl.textContent : '').trim();
        if (!re.test(label)) continue;
        const btn = blk.querySelector('.sc-toggle-arrow-icon');
        if (!btn) continue;
        const alreadyOpen = btn.getAttribute('aria-expanded') === 'true' || /open|expand|rotate/i.test(btn.className || '');
        if (alreadyOpen) continue;
        btn.scrollIntoView({ block: 'center' });
        try {
          btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          btn.click();
          clicked++;
        } catch {}
      }
      return clicked;
    })()`);

    // Pass 1: expand 组合活动 + ⌛整体时序 directly
    await expandByRegex('(组合活动|整体时序)');
    await sleep(2500);

    // Pass 2: expand 全游戏时序 inside ⌛整体时序
    await expandByRegex('全游戏时序');
    await sleep(2500);

    // Pass 3: expand year toggles 2018..2035 inside 全游戏时序
    await expandByRegex('^20(1[89]|2[0-9]|3[0-5])$');
    await sleep(3500);

    // Scroll through page to trigger any virtualized/lazy blocks
    await ev(`(async () => {
      const scrollers = [document.scrollingElement, ...document.querySelectorAll('[class*="scroll"], [class*="editor"], [class*="container"]')].filter(Boolean);
      const target = scrollers.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight))[0];
      if (!target) return 0;
      for (let y = 0; y <= target.scrollHeight; y += 900) {
        target.scrollTop = y;
        await new Promise(r => setTimeout(r, 120));
      }
      return target.scrollHeight;
    })()`);
    await sleep(1500);

    const text = await ev(`document.body.innerText || ''`);
    fs.mkdirSync(path.join(root, 'tmp'), { recursive: true });
    fs.writeFileSync(path.join(root, 'tmp', 'doc-page2.txt'), text || '', 'utf8');

    const parsed = parseExtractedText(text);
    const updated = {
      ok: true,
      bytes: (text || '').length,
      totalTimelineLines: parsed.totalTimelineLines,
      matchedUnits: parsed.matchedUnits,
      wroteTimeline: false,
      wroteEvents: false,
      rebuiltOrder: false
    };

    if (parsed.totalTimelineLines >= 500) {
      writeAtomicJson(path.join(root, 'research', 'guide-timeline.json'), parsed.timeline);
      updated.wroteTimeline = true;
    }
    if (parsed.matchedUnits >= 6) {
      writeAtomicJson(path.join(root, 'research', 'guide-events.json'), parsed.events);
      updated.wroteEvents = true;
    }

    if (updated.wroteTimeline || updated.wroteEvents) {
      const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
      execFileSync(process.execPath, [path.join(root, 'scripts', 'import-guide.cjs')], { cwd: root, stdio: 'ignore', windowsHide: true, env });
      execFileSync(process.execPath, [path.join(root, 'scripts', 'build-navigation-order.cjs')], { cwd: root, stdio: 'ignore', windowsHide: true, env });
      updated.rebuiltOrder = true;
    }

    console.log(JSON.stringify(updated));
  } finally {
    try { ws?.close(); } catch {}
    try { child.kill(); } catch {}
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}

runSync().catch(e => {
  console.log(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
  process.exit(0);
});
