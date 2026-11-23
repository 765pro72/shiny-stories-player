// Resumable anime super-resolution for locally mirrored card movies.
// Engines are ncnn + Vulkan builds, so they run on AMD GPUs as well as NVIDIA.
//   node scripts/upscale-videos.cjs --4k --engine=realcugan --denoise=3
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const arg = name => process.argv.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const fourK = process.argv.includes('--4k');
const scale = fourK ? 4 : 2;
const engineName = arg('engine') || 'realcugan';
const denoise = Number(arg('denoise'));
const factor = Number(arg('factor'));
const dryRun = process.argv.includes('--dry-run');
const sourceRoot = path.join(root, 'cache', 'movies');
const targetRoot = path.join(root, fourK ? 'cache-4k' : 'cache-sr', 'movies');
const workRoot = path.join(root, 'upscale-work', fourK ? 'video-4k' : 'video');
const reportPath = path.join(root, 'exports', fourK ? 'upscale-videos-4k-progress.json' : 'upscale-videos-progress.json');
const bin = path.join(root, 'tools/upscaler/ffmpeg/ffmpeg-9.0.2-essentials_build/bin');
const ffmpeg = path.join(bin, 'ffmpeg.exe');
const ffprobe = path.join(bin, 'ffprobe.exe');

const toolRoot = path.join(root, 'tools/upscaler');
const engines = {
  realcugan: {
    label: 'Real-CUGAN se',
    exe: path.join(toolRoot, 'realcugan-ncnn-vulkan-20220728-windows/realcugan-ncnn-vulkan.exe'),
    models: path.join(toolRoot, 'realcugan-ncnn-vulkan-20220728-windows/models-se'),
    model: `up${scale}x-denoise${Number.isFinite(denoise) ? denoise : 3}x`,
    args: (input, output, format) => ['-i', input, '-o', output, '-s', String(scale),
      '-n', String(Number.isFinite(denoise) ? denoise : 3), '-m', engines.realcugan.models,
      '-g', '0', '-t', '128', '-j', '1:2:2', '-f', format]
  },
  waifu2x: {
    label: 'waifu2x cunet',
    exe: path.join(toolRoot, 'waifu2x-ncnn-vulkan-20220728-windows/waifu2x-ncnn-vulkan.exe'),
    models: path.join(toolRoot, 'waifu2x-ncnn-vulkan-20220728-windows/models-cunet'),
    model: 'cunet',
    args: (input, output, format) => ['-i', input, '-o', output, '-s', String(scale),
      '-n', String(Number.isFinite(denoise) ? denoise : 1), '-m', engines.waifu2x.models,
      '-g', '0', '-t', '128', '-j', '1:2:2', '-f', format]
  },
  realesrgan: {
    label: 'Real-ESRGAN anime',
    exe: path.join(toolRoot, 'real-esrgan/realesrgan-ncnn-vulkan.exe'),
    models: path.join(toolRoot, 'real-esrgan/models'),
    model: arg('model') || 'realesr-animevideov3',
    args: (input, output, format) => ['-i', input, '-o', output, '-s', String(scale),
      '-n', arg('model') || 'realesr-animevideov3', '-m', engines.realesrgan.models,
      '-g', '0', '-t', '128', '-j', '1:2:2', '-f', format]
  }
};
const engine = engines[engineName];
if (!engine) throw Error(`Unknown engine ${engineName}; pick one of ${Object.keys(engines).join(', ')}`);
if (![ffmpeg, ffprobe, engine.exe].every(fs.existsSync)) throw Error(`Upscaling tools are missing (${engine.exe})`);
const only = arg('only');
const limit = Number(arg('limit')) || Infinity;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else if (file.toLowerCase().endsWith('.mp4')) files.push(file);
  }
  return files;
}
function call(exe, args, timeout = 30 * 60 * 1000) {
  if (dryRun) {
    console.log(`[dry-run] ${path.basename(exe)} ${args.join(' ')}`);
    return '';
  }
  const result = spawnSync(exe, args, { encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw Error(String(result.error || result.stderr || `exit ${result.status}`).slice(-1500));
  return result.stdout;
}
function info(file) {
  if (dryRun) return { width: 1136, height: 640, avg_frame_rate: '30/1', nb_frames: '0', duration: '0' };
  const json = JSON.parse(call(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate,nb_frames,duration', '-of', 'json', file]));
  return json.streams[0];
}
function count(dir) { return fs.readdirSync(dir).filter(x => x.endsWith('.png')).length; }
function clear(dir) { for (const name of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, name)); fs.rmdirSync(dir); }

let files = walk(sourceRoot).sort();
if (only) files = files.filter(x => path.relative(path.join(root, 'cache'), x).replace(/\\/g, '/') === only);
files = files.filter(x => !fs.existsSync(path.join(targetRoot, path.relative(sourceRoot, x)))).slice(0, limit);
const report = { total: files.length, completed: 0, failed: [], engine: engineName, model: engine.model, scale, startedAt: new Date().toISOString() };
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
const save = () => fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
save();

for (const source of files) {
  const relative = path.relative(sourceRoot, source);
  const target = path.join(targetRoot, relative);
  const stage = path.join(workRoot, path.basename(source, '.mp4'));
  const inputFrames = path.join(stage, 'original');
  const outputFrames = path.join(stage, 'enhanced');
  try {
    fs.mkdirSync(inputFrames, { recursive: true });
    fs.mkdirSync(outputFrames, { recursive: true });
    const original = info(source);
    const fps = original.avg_frame_rate || '30/1';
    call(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', source, '-fps_mode', 'passthrough', path.join(inputFrames, 'frame%08d.png')]);
    if (dryRun) { call(engine.exe, engine.args(inputFrames, outputFrames, 'png')); continue; }
    const frames = count(inputFrames);
    if (!frames) throw Error('No video frames extracted');
    call(engine.exe, engine.args(inputFrames, outputFrames, 'png'), 8 * 60 * 60 * 1000);
    if (count(outputFrames) !== frames) throw Error(`Only ${count(outputFrames)}/${frames} frames enhanced`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const temp = target + '.part.mp4';
    call(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-framerate', fps, '-start_number', '1', '-i', path.join(outputFrames, 'frame%08d.png'), '-i', source, '-map', '0:v:0', '-map', '1:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', '-y', temp]);
    const enhanced = info(temp);
    if (Number(enhanced.width) !== Number(original.width) * scale || Number(enhanced.height) !== Number(original.height) * scale || Math.abs(Number(enhanced.duration) - Number(original.duration)) > 0.2) throw Error('Output dimensions or duration mismatch');
    fs.renameSync(temp, target);
    clear(inputFrames);
    clear(outputFrames);
    fs.rmdirSync(stage);
    report.completed++;
    console.log(`videos: ${report.completed + report.failed.length}/${report.total}, ${relative}, ${frames} frames`);
  } catch (error) {
    report.failed.push({ path: relative.replace(/\\/g, '/'), error: String(error) });
    console.error(`videos: failed ${relative}: ${error}`);
  }
  save();
}
report.finishedAt = new Date().toISOString();
save();
if (report.failed.length) process.exitCode = 1;
