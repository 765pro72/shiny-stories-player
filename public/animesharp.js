/* Full AnimeSharpV4 RCAN: reusable original-texture enhancement, not frame skipping. */
(() => {
 const records=new WeakMap();
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 function record(base){let value=records.get(base);if(!value){const resource=base.resource,source=resource?.source;if(!source||source instanceof HTMLVideoElement||base.realWidth<16||base.realHeight<16)return null;value={base,resource,source,width:base.realWidth,height:base.realHeight,resolution:base.resolution,refs:new Set(),frames:new Map(),promise:null,image:null};records.set(base,value)}return value}
 function collect(stage){const found=new Set();function texture(t){if(!t?.baseTexture)return;const r=record(t.baseTexture);if(!r)return;found.add(r);if(t.frame){const f=t.frame,scale=r.resolution,x=Math.round(f.x*scale),y=Math.round(f.y*scale),width=Math.round(f.width*scale),height=Math.round(f.height*scale);if(width&&height&&x>=0&&y>=0&&x+width<=r.width&&y+height<=r.height)r.frames.set([x,y,width,height].join(','),{x,y,width,height})}}
  function walk(node){if(node instanceof PIXI.Text||(PIXI.BitmapText&&node instanceof PIXI.BitmapText))return;texture(node.texture);if(node.spineData)for(const skin of node.spineData.skins||[])for(const slot of Object.values(skin.attachments||{}))for(const attachment of Object.values(slot||{}))texture(attachment.region?.texture);for(const child of node.children||[])walk(child)}walk(stage);return found;
 }
 function swap(r,enhanced){const image=enhanced?r.image:r.source;if(!image||r.base.destroyed)return;r.resource.source=image;r.base.setResolution(enhanced?r.resolution*r.factor:r.resolution);r.resource.resize(enhanced?r.width*r.factor:r.width,enhanced?r.height*r.factor:r.height);r.resource.update();r.base.update()}
 let corePromise;
 function core(){return corePromise ||= new Promise((resolve,reject)=>{if(window.Anime4KCore)return resolve(window.Anime4KCore);const script=document.createElement('script');script.src='/vendor/anime4k/core.js';script.onload=()=>resolve(window.Anime4KCore);script.onerror=()=>{corePromise=null;reject(Error('Anime4K 组件加载失败'))};document.head.append(script)})}
 async function enhance(r,pipeline,update){
  const key=JSON.stringify(pipeline);r.wanted=key;if(r.image&&r.variant===key)return;
  if(r.promise){await r.promise;return enhance(r,pipeline,update)}
  return r.promise=(async()=>{
   let input=r.source,scale=1;const temporary=[],steps=pipeline.flatMap(stage=>stage.id==='animesharp'&&stage.level.endsWith('4x')?[{...stage,level:stage.level.slice(0,-2)},{...stage,level:stage.level.slice(0,-2)}]:[stage]);
   try{for(const stage of steps){
    update('正在执行 '+(stage.id==='anime4k'?'Anime4K':'AnimeSharpV4')+' · 第 '+(steps.indexOf(stage)+1)+' / '+steps.length+' 阶段…');
    if(stage.id==='anime4k'){
     const api=await core(),canvas=document.createElement('canvas'),source=document.createElement('canvas');source.width=r.width*scale;source.height=r.height*scale;source.getContext('2d').drawImage(input,0,0,source.width,source.height);
     const highest=[api.Clamp,api.Restore_UL,api.CNN_UL],profile=stage.level==='ultra'?[...highest,api.CNN_UL]:stage.level==='max2x'?highest:[stage.level==='fine'?api.CNN_L:stage.level==='quality'?api.CNN_M:api.CNN_S];
     const upscaler=new api.ImageUpscaler(profile);upscaler.attachSource(source,canvas);const gl=canvas.getContext('webgl');temporary.push({upscaler,gl});if(!gl||canvas.width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||canvas.height>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('该处理链输出尺寸超出显卡能力，请调低档位');upscaler.upscale();gl.finish();const image=new Image();image.src=canvas.toDataURL('image/png');await image.decode();input=image;scale*=stage.level==='ultra'?4:2;
    }else{
     const canvas=document.createElement('canvas');canvas.width=r.width*scale;canvas.height=r.height*scale;canvas.getContext('2d').drawImage(input,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('纹理读取失败');
     const frames=[...r.frames.values()].sort((a,b)=>a.y-b.y||a.x-b.x||a.width-b.width||a.height-b.height),regions=frames.length>1?frames.map(f=>({x:f.x*scale,y:f.y*scale,width:f.width*scale,height:f.height*scale})):[];
     let response=await fetch('/api/animesharp',{method:'POST',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'image/png','X-SR-Preset':stage.level,'X-SR-Regions':encodeURIComponent(JSON.stringify(regions))},body:blob});if(!response.ok)throw Error(await response.text());let job=await response.json();
     while(job.state!=='ready'){update(job.message);if(job.state==='failed')throw Error(job.message);await pause(600);response=await fetch('/api/animesharp/status/'+job.id,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('超分任务中断，请重新启用');job=await response.json()}
     const image=new Image();image.src=job.url;await image.decode();input=image;scale*=2;
    }
   }
   if(input.naturalWidth!==r.width*scale||input.naturalHeight!==r.height*scale)throw Error('超分图集尺寸不匹配');if(r.wanted!==key)return;r.image=input;r.factor=scale;r.variant=key;if(r.refs.size)swap(r,true);
   }finally{for(const t of temporary){t.upscaler.detachSource();t.gl?.getExtension('WEBGL_lose_context')?.loseContext()}}
  })().finally(()=>{r.promise=null})
 }
 function attach(app,update=()=>{}){
  const renderer=app.renderer,source=app.view,originalResolution=renderer.resolution,owned=new Set();let enabled=false,disposed=false,busy=false,scanAt=0,error='',generation=0,pipeline=[{id:'animesharp',level:'full'}],previous=0,slow=0,started=0;
  const size=()=>{const width=renderer.screen.width,height=renderer.screen.height;renderer.resolution=enabled?originalResolution*2:originalResolution;const cssWidth=source.style.width,cssHeight=source.style.height;renderer.resize(width,height);source.style.width=cssWidth;source.style.height=cssHeight;if(renderer.plugins?.interaction)renderer.plugins.interaction.resolution=renderer.resolution};
  function release(){for(const r of owned){r.refs.delete(controller);if(!r.refs.size){swap(r,false);r.image=null;r.wanted=null}}owned.clear()}
  async function scan(force=false){if(!enabled||disposed||busy||(!force&&performance.now()-scanAt<500))return;busy=true;scanAt=performance.now();const token=generation;
   try{const found=collect(app.stage);if(!found.size){const hasVideo=node=>node.texture?.baseTexture?.resource?.source instanceof HTMLVideoElement||(node.children||[]).some(hasVideo);if(hasVideo(app.stage))throw Error('视频目前只支持单独开启 Anime4K');update('正在等待角色或卡面纹理加载…');}for(const r of found){r.refs.add(controller);owned.add(r)}for(const r of [...owned])if(!found.has(r)){r.refs.delete(controller);if(!r.refs.size){swap(r,false);r.image=null}owned.delete(r)}
    let done=0;for(const r of found){if(!enabled||disposed||token!==generation)break;await enhance(r,pipeline,message=>{if(enabled&&token===generation)update(message)});done++;if(!enabled||disposed||token!==generation)break;swap(r,true);update(pipeline.map(s=>s.id==='animesharp'?'AnimeSharpV4':'Anime4K').join(' → ')+'：'+done+' / '+found.size+' 张纹理就绪');if(!app.ticker?.started)app.render()}
   }catch(e){if(token===generation){error=e.message;enabled=false;release();size();update('AnimeSharpV4：'+error+'，已恢复原图。',true)}}finally{busy=false}
  }
  const controller={source,get error(){return error},get enabled(){return enabled},get ready(){return owned.size>0&&[...owned].every(r=>r.image&&r.variant===JSON.stringify(pipeline))},getOutput(){return owned.size===1?[...owned][0].image||source:source},configure(value,stages){generation++;if(stages)pipeline=stages;previous=slow=started=0;error='';enabled=!!value;if(!enabled)release();size();if(enabled){update('正在准备 AnimeSharpV4，原图继续显示…');scan(true)}},destroy(){clearInterval(scanTimer);disposed=true;generation++;enabled=false;renderer.off('postrender',postrender);release();size()}};
  const scanTimer=setInterval(()=>{if(enabled&&!disposed)scan()},1000);
  const postrender=()=>{const now=performance.now();if(enabled&&app.ticker?.started){started ||= now;if(previous&&now-previous<1000){slow=now-previous>100?slow+1:0;if(now-started>3500&&slow>=15){enabled=false;generation++;release();size();update('持续低帧率，已停用增强并恢复原图；首选处理链保留。',true)}}previous=now}scan()};renderer.on('postrender',postrender);return controller;
 }
 window.ShinyAnimeSharp={attach};
})();
