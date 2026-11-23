// Build-time only. The generated browser bundle works without npm or a network.
const { execFileSync } = require('child_process');
const path = require('path');
const root = path.resolve(__dirname, '..');
const args = ['exec', '--yes', '--package=esbuild@0.25.12', '--', 'esbuild',
  'vendor/anime4k/src/entry.ts', '--bundle', '--minify', '--format=iife',
  '--global-name=Anime4KCore', '--legal-comments=inline',
  '--outfile=public/vendor/anime4k/core.js'];
if (process.platform === 'win32') {
  execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm ' + args.join(' ')], { cwd: root, stdio: 'inherit' });
} else execFileSync('npm', args, { cwd: root, stdio: 'inherit' });
