const path=require('node:path');
exports.windowOptions=base=>({
 icon:path.join(base,'assets/app.ico'),width:1380,height:940,minWidth:960,minHeight:700,
 title:'闪耀色彩 · 中文剧情馆',titleBarStyle:'hidden',
 titleBarOverlay:{color:'rgba(0,0,0,0)',symbolColor:'#344d63',height:36},
 backgroundColor:'#f6f5f1',autoHideMenuBar:true,
 webPreferences:{preload:path.join(base,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}
});
// Keep native caption controls compact independently of the navigation size.
exports.watchWindowChrome=win=>{
 let previous=0;
 const update=()=>{if(win.isDestroyed())return;const height=36;if(height===previous)return;previous=height;win.setTitleBarOverlay({height})};
 win.on('resize',update);update();
};

// Electron otherwise silently cancels navigation when an editor prevents unload.
exports.watchUnsaved=(win,dialog)=>win.webContents.on('will-prevent-unload',event=>{
 const response=dialog.showMessageBoxSync(win,{type:'question',title:'怪文书尚未保存',message:'当前作品有未保存的修改。',detail:'选择留在编辑器后，可先保存作品；离开会放弃未保存的修改。',buttons:['留在编辑器','放弃修改并离开'],defaultId:0,cancelId:0,noLink:true});
 if(response===1)event.preventDefault();
});

