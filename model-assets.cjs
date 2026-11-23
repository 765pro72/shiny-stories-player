// This published atlas refers to date.png, while its original texture is
// data.png. Keep the atlas bytes untouched and resolve that exact known alias.
exports.originalKey=key=>key==='spine/idols/stand/1040100140/date.png'?'spine/idols/stand/1040100140/data.png':key;
