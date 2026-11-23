const fs=require('fs'),path=require('path');const base=path.resolve(__dirname,'../public/player');
function edit(p,fn){const f=path.join(base,p);fs.writeFileSync(f,fn(fs.readFileSync(f,'utf8')));}
edit('scripts/SharedConstants.js',s=>s.replace('https://viewer.shinycolors.moe','/asset'));
edit('main.html',s=>s.replace('<body onload="init();">','<body onload="init();"><div id="loading" style="position:fixed;inset:0;z-index:9;display:grid;place-content:center;background:#211b26;color:#ecd9e5;font:16px Microsoft YaHei;text-align:center;padding:40px">正在准备剧情…</div><script src="bootstrap.js"></script>'));
edit('scripts/TrackManager.js',s=>s.replace('console.log(`${this._current}/${this._tracks.length - 1}`, this.currentTrack);','').replace('if (this.currentTrack.label == "end") {','if (!this.currentTrack || this.currentTrack.label == "end") {'));
edit('scripts/TextManager.js',s=>s.replace('new PIXI.Text(speaker, {','new PIXI.Text(window.storyNames?.[speaker] || speaker, {').replace('fontFamily: usedFont,','fontFamily: zhcnFont,').replace('padding: 3\n        });','padding: 3, wordWrap: true, wordWrapWidth: 700\n        });'));
edit('scripts/SelectManager.js',s=>s.replace('}, { once: true });','});'));
