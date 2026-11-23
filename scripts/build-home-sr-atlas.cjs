const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'public/home-assets/madoka');
const fourK = process.argv.includes('--4k');
const scale = fourK ? 4 : 2;
const target = path.join(root, `public/home-assets/${fourK ? '4k' : 'sr'}/madoka`);
fs.mkdirSync(target, { recursive: true });
fs.copyFileSync(path.join(source, 'data.json'), path.join(target, 'data.json'));
let atlas = fs.readFileSync(path.join(source, 'data.atlas'), 'utf8');
atlas = atlas.replace(/(^|\r?\n)data\.png(?=\r?\n)/, `$1data@${scale}x.png`);
atlas = atlas.replace(/^(\s*(?:size|xy|orig|offset|bounds|offsets):\s*)(\d+(?:\s*,\s*\d+)+)\s*$/gm,
  (_, prefix, values) => prefix + values.split(',').map(value => Number(value.trim()) * scale).join(', '));
fs.writeFileSync(path.join(target, 'data.atlas'), atlas);
console.log('home fallback Spine atlas prepared');
