// Plain-text export of every Japanese original currently present in local data.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'exports', '全部日语原文-2026-10-15.txt');
const catalog = require('../data/catalog.json');
const home = require('../public/home-assets/catalog.json');
const common = require('../data/common.json');
const names = require('../data/names.json');
const fd = fs.openSync(output, 'w');
let buffer = '';
function write(value = '') {
  buffer += String(value) + '\r\n';
  if (buffer.length > 1024 * 1024) {
    fs.writeSync(fd, buffer);
    buffer = '';
  }
}
function clean(value) {
  return String(value ?? '').replace(/\\n|\r\n|\r/g, '\n').trim();
}
function block(value) {
  for (const line of clean(value).split('\n')) write('    ' + line);
}

write('\ufeff闪耀色彩中文剧情馆｜全部可取得日语原文');
write('生成日期：2026-10-15。UTF-8 文本。仅收录目前本地已取得的公开资料，未取得的脚本无法凭空补出原文。');
write('剧情按目录顺序排列；“轨道”是原始脚本数组中的位置。同一句重复出现时保留，便于按剧情核对。');
write();
let stories = 0, rows = 0, missing = [];
for (const story of catalog) {
  const file = path.join(root, 'cache', 'json', story.key);
  if (!fs.existsSync(file)) {
    missing.push(`${story.key}\t${story.originalTitle || story.title}`);
    continue;
  }
  let tracks;
  try {
    tracks = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(tracks)) throw Error('not an array');
  } catch {
    missing.push(`${story.key}\t${story.originalTitle || story.title}\t脚本无法解析`);
    continue;
  }
  stories++;
  write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  write(`剧情 ${stories}｜${story.key}`);
  write(`原题：${story.originalTitle || story.title}`);
  write(`原分组：${story.originalGroup || story.group || ''}`);
  write(`分类：${story.category}｜偶像：${story.idol}`);
  tracks.forEach((track, index) => {
    const value = track.text || track.select;
    if (!value) return;
    rows++;
    write(`[轨道 ${index + 1}${track.id ? `｜ID ${track.id}` : ''}] ${track.speaker || ''}`);
    block(value);
  });
  write();
}

write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
write('主页语音原文');
let voiceRows = 0;
for (const idol of home) for (const voice of idol.voices) {
  if (!voice.original) continue;
  voiceRows++;
  write(`[${idol.name}｜${voice.id}] ${voice.speaker || ''}`);
  block(voice.original);
  write();
}

write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
write('服装原名与解锁条件');
for (const idol of home) {
  write(`[${idol.name}]`);
  for (const outfit of idol.outfits) write(`  ${outfit.key}｜${outfit.label}`);
  for (const voice of idol.voices) if (voice.releaseCondition) write(`  ${voice.id} 解锁条件｜${voice.releaseCondition}`);
  write();
}

write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
write('公共词条日文原文');
for (const key of Object.keys(common)) write(key);
write();
write('人物姓名日文原文');
for (const key of Object.keys(names)) write(key);
write();

write('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
write(`无法取得脚本的剧情：${missing.length} 篇；以下只有标题，没有剧情台词。`);
for (const item of missing) write(item);
write();
write(`统计：已取得 ${stories} 篇剧情、${rows} 条剧情原文、${voiceRows} 条有日文原文的主页语音。`);
if (buffer) fs.writeSync(fd, buffer);
fs.closeSync(fd);
console.log(JSON.stringify({ output, stories, rows, voiceRows, missing: missing.length, bytes: fs.statSync(output).size }, null, 2));
