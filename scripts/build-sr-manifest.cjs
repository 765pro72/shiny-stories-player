const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const fourK = process.argv.includes('--4k');
const cache = path.join(root, fourK ? 'cache-4k' : 'cache-sr');
function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, files);
    else files.push(path.relative(cache, file).replace(/\\/g, '/'));
  }
  return files;
}
const files = walk(cache);
const manifest = {
  scale: fourK ? 4 : 2,
  model: 'realesr-animevideov3',
  images: files.filter(x => x.startsWith('images/') && /\.(?:jpg|png)$/.test(x)).sort(),
  spineAtlases: files.filter(x => x.startsWith('spine/') && x.endsWith('/data.atlas')).length,
  videos: files.filter(x => x.startsWith('movies/') && x.endsWith('.mp4')).length,
  generatedAt: new Date().toISOString()
};
fs.writeFileSync(path.join(root, 'data', fourK ? 'sr-4k-manifest.json' : 'sr-manifest.json'), JSON.stringify(manifest));
console.log({ images: manifest.images.length, spineAtlases: manifest.spineAtlases, videos: manifest.videos });
