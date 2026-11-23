const path=require('node:path'),root=path.resolve(__dirname,'..');
const {sync}=require('../story-material-index.cjs');
console.log(sync(path.join(root,'data'),path.join(root,'data'),[path.join(root,'cache')]));
