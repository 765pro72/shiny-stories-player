const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),source=path.join(root,'node_modules/pinyin-pro'),target=path.join(root,'public/vendor');
if(require(path.join(source,'package.json')).version!=='3.29.5')throw Error('Unexpected pronunciation dictionary version');
fs.copyFileSync(path.join(source,'dist/index.js'),path.join(target,'pinyin-pro.js'));
fs.copyFileSync(path.join(source,'LICENSE'),path.join(target,'pinyin-pro-LICENSE.txt'));
console.log('Bundled pinyin-pro 3.29.5 and MIT license');
