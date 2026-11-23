// Resumable 4x anime super-resolution generated directly from original cache assets.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const phase = process.argv.find(x => x.startsWith('--phase='))?.slice(8) || 'images';
const only = process.argv.find(x => x.startsWith('--only='))?.slice(7);
const limit = Number(process.argv.find(x => x.startsWith('--limit='))?.slice(8)) || Infinity;
// Engines are ncnn + Vulkan builds, so they run on AMD GPUs as well as NVIDIA.
const arg = name => process.argv.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const engineName = arg('engine') || 'realcugan';
const denoise = Number(arg('denoise'));
const toolRoot = path.join(root, 'tools', 'upscaler');
const engines = {
  realcugan: {
    label: 'Real-CUGAN se',
    exe: path.join(toolRoot, 'realcugan-ncnn-vulkan-20220728-windows', 'realcugan-ncnn-vulkan.exe'),
    models: path.join(toolRoot, 'realcugan-ncnn-vulkan-20220728-windows', 'models-se'),
    name: `up4x-denoise${Number.isFinite(denoise) ? denoise : 3}x`,
    args: (input, output, format) => ['-i', input, '-o', output, '-s', '4', '-n', String(Number.isFinite(denoise) ? denoise : 3), '-m', engines.realcugan.models, '-g', '0', '-t', '128', '-j', '1:2:2', '-f', format]
  },
  waifu2x: {
    label: 'waifu2x cunet',
    exe: path.join(toolRoot, 'waifu2x-ncnn-vulkan-20220728-windows', 'waifu2x-ncnn-vulkan.exe'),
    models: path.join(toolRoot, 'waifu2x-ncnn-vulkan-20220728-windows', 'models-cunet'),
    name: 'cunet',
    args: (input, output, format) => ['-i', input, '-o', output, '-s', '4', '-n', String(Number.isFinite(denoise) ? denoise : 1), '-m', engines.waifu2x.models, '-g', '0', '-t', '128', '-j', '1:2:2', '-f', format]
  },
  realesrgan: {
    label: 'Real-ESRGAN anime',
    exe: path.join(toolRoot, 'real-esrgan', 'realesrgan-ncnn-vulkan.exe'),
    models: path.join(toolRoot, 'real-esrgan', 'models'),
    name: 'realesr-animevideov3',
    args: (input, output, format) => ['-i', input, '-o', output, '-s', '4', '-n', arg('model') || 'realesr-animevideov3', '-m', engines.realesrgan.models, '-g', '0', '-t', '128', '-j', '1:2:2', '-f', format]
  }
};
const engine = engines[engineName];
if (!engine) throw Error(`Unknown engine ${engineName}; pick one of ${Object.keys(engines).join(', ')}`);
const exe = engine.exe;
const sourceRoot = path.join(root, 'cache');
const targetRoot = path.join(root, 'cache-4k');
const workRoot = path.join(root, 'upscale-work', 'assets-4k');
const reportPath = path.join(root, 'exports', `upscale-4k-${phase}-progress.json`);
if (!['images', 'spine'].includes(phase)) throw Error('phase must be images or spine');
if (!fs.existsSync(exe)) throw Error(`Upscaling executable is missing: ${exe}`);

function walk(dir, result = []) {
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, result);
    else result.push(file);
  }
  return result;
}
const relative = file => path.relative(sourceRoot, file).replace(/\\/g, '/');
function targetFor(file) {
  const rel = relative(file);
  return path.join(targetRoot, phase === 'spine' ? rel.replace(/data\.png$/, 'data@4x.png') : rel);
}
function scaleAtlas(file) {
  const source = file.replace(/data\.png$/, 'data.atlas');
  const target = path.join(targetRoot, relative(source));
  let text = fs.readFileSync(source, 'utf8');
  text = text.replace(/(^|\r?\n)data\.png(?=\r?\n)/, '$1data@4x.png');
  text = text.replace(/^(\s*(?:size|xy|orig|offset|bounds|offsets):\s*)(\d+(?:\s*,\s*\d+)+)\s*$/gm,
    (_, prefix, values) => prefix + values.split(',').map(v => Number(v.trim()) * 4).join(', '));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, text);
}

let files = phase === 'spine'
  ? walk(path.join(sourceRoot, 'spine')).filter(f => f.endsWith(path.sep + 'data.png'))
  : walk(path.join(sourceRoot, 'images')).filter(f => /\.(?:jpg|png)$/i.test(f));
files.sort();
if (only) files = files.filter(f => relative(f) === only);
files = files.filter(f => !fs.existsSync(targetFor(f)) || fs.statSync(targetFor(f)).size === 0).slice(0, limit);
const report = { phase, total: files.length, completed: 0, failed: [], engine: engineName, model: engine.name, scale: 4, startedAt: new Date().toISOString() };
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
save();

for (const ext of ['jpg', 'png']) {
  const group = files.filter(f => path.extname(f).toLowerCase() === '.' + ext);
  for (let start = 0; start < group.length; start += 20) {
    const batch = group.slice(start, start + 20);
    const stamp = `${phase}-${ext}-${start}-${process.pid}`;
    const input = path.join(workRoot, stamp, 'input');
    const output = path.join(workRoot, stamp, 'output');
    fs.mkdirSync(input, { recursive: true });
    fs.mkdirSync(output, { recursive: true });
    const names = batch.map((file, index) => {
      const name = String(index).padStart(4, '0') + '.' + ext;
      fs.copyFileSync(file, path.join(input, name));
      return name;
    });
    const run = spawnSync(exe, engine.args(input, output, ext), {
      cwd: path.dirname(exe), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
      timeout: 60 * 60 * 1000, windowsHide: true
    });
    for (let i = 0; i < batch.length; i++) {
      const dest = targetFor(batch[i]);
      const rendered = path.join(output, names[i]);
      if (fs.existsSync(rendered) && fs.statSync(rendered).size > 0) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.renameSync(rendered, dest);
        if (phase === 'spine') scaleAtlas(batch[i]);
        report.completed++;
      } else {
        report.failed.push({ path: relative(batch[i]), error: String(run.error || run.stderr || `exit ${run.status}`).slice(-500) });
      }
    }
    fs.rmSync(path.dirname(input), { recursive: true, force: true });
    save();
    console.log(`${phase}-4k: ${report.completed + report.failed.length}/${report.total}, completed ${report.completed}, failed ${report.failed.length}`);
  }
}
report.finishedAt = new Date().toISOString();
save();
if (report.failed.length) process.exitCode = 1;
