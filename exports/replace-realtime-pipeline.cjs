const fs=require('fs');let p='public/anime4k.js',s=fs.readFileSync(p,'utf8');s=s.replaceAll('animesharp','artcnn').replaceAll('AnimeSharpV4','ArtCNN').replaceAll('sharpPromise','artPromise');s=s.replace("ArtCNN · 完整 RCAN · 2×","ArtCNN · 实时 C4F16 · 2×").replace("level:'full'","level:'c16'").replace("['full','fast','full4x','fast4x']","['c16','c32','c164x','c324x']");s=s.replace("function loadSharp(){return artPromise ||= new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/artcnn.js';script.onload=()=>resolve(window.ShinyAnimeSharp);script.onerror=()=>{artPromise=null;script.remove();reject(Error('ArtCNN 组件加载失败'))};document.head.append(script)})}","function loadArt(){return artPromise ||= new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/artcnn.js';script.onload=()=>resolve(window.ArtCNN);script.onerror=()=>{artPromise=null;script.remove();reject(Error('ArtCNN 组件加载失败'))};document.head.append(script)})}");
s=s.replace("animesharp:","artcnn:");s=s.replace("[['full','完整 RCAN · 2×'],['fast','快速 RCAN-PU · 2×'],['full4x','完整 RCAN · 4×（两次 2×）'],['fast4x','快速 RCAN-PU · 4×（两次 2×）']]", "[['c16','实时 C4F16 · 2×'],['c32','精细 C4F32 · 2×'],['c164x','实时 C4F16 · 4×（两次 2×）'],['c324x','精细 C4F32 · 4×（两次 2×）']]");
s=s.replace("hint.textContent='拖动模型", "hint.textContent='拖动模型");let a=s.indexOf("      hint.textContent="),b=s.indexOf("\n",a);s=s.slice(0,a)+"      hint.textContent='拖动调整实时处理顺序，关闭项跳过，默认全部关闭。ArtCNN C4F16 优先速度，C4F32 更精细但更耗性能；4×连续运行两次2×。全部在显卡本地处理，无需下载大权重、上传图片或等待图集推理。角色、卡面和视频共用实时链；持续低帧率会降档并提示。';"+s.slice(b);
s=s.replace('    let sharp=null;','');s=s.replace("if(state.effectiveMode==='artcnn'){output.style.display='none';source.style.opacity=initialOpacity;return}",'');s=s.replace('pipelineReady = false;sharp?.configure(false);','pipelineReady = false;');s=s.replace('reset();sharp?.destroy();output.remove();','reset();output.remove();');s=s.replace(' || sharp?.enabled','');
a=s.indexOf("        if(preset==='artcnn'){");b=s.indexOf("        if (background && !backgroundSprite)",a);
s=s.slice(0,a)+`        const stages=override|| (preset==='artcnn'?enabledStages():[{id:'anime4k',level:preset}]);
        state.actualStages=stages.map(s=>({...s}));
        const core=stages.some(s=>s.id==='anime4k')?await loadCore():null,art=stages.some(s=>s.id==='artcnn')?await loadArt():null;
        if(destroyed||token!==generation)return;
        const fresh=document.createElement('canvas');fresh.className=output.className;fresh.setAttribute('aria-hidden','true');output.replaceWith(fresh);output=fresh;state.output=fresh;
        let input=source;for(let index=0;index<stages.length;index++){
          const stage=stages[index],canvas=index===stages.length-1?fresh:document.createElement('canvas');let upscaler,gl;
          if(stage.id==='artcnn'){
            upscaler=await art.Upscaler.create(input,canvas,stage.level,message=>{if(token===generation){state.message=message;notify()}});gl=upscaler.gl;
            if(destroyed||token!==generation){upscaler.detachSource();gl.getExtension('WEBGL_lose_context')?.loseContext();return}
          }else{const highest=[core.Clamp,core.Restore_UL,core.CNN_UL],profile=stage.level==='ultra'?[...highest,core.CNN_UL]:stage.level==='max2x'?highest:[stage.level==='fine'?core.CNN_L:stage.level==='quality'?core.CNN_M:core.CNN_S];upscaler=new core.ImageUpscaler(profile);upscaler.attachSource(input,canvas);gl=canvas.getContext('webgl');}
          passes.push({upscaler,canvas,gl,id:stage.id,level:stage.level});
          if(!gl||gl.isContextLost()||canvas.width>gl.getParameter(gl.MAX_TEXTURE_SIZE)||canvas.height>gl.getParameter(gl.MAX_TEXTURE_SIZE))throw Error('显卡不支持此输出尺寸');
          canvas.addEventListener('webglcontextlost',()=>{if(!destroyed&&state.active&&state.output===fresh)fallback('显卡上下文丢失')},{once:true});input=canvas;
        }
`+s.slice(b);
s=s.replace('async function configure(preset = mode, adapted = false)', 'async function configure(preset = mode, adapted = false, override = null)');
s=s.replace("if (next) {", "if(state.effectiveMode==='artcnn'){const current=state.actualStages,nextStages=current.map(s=>({...s,level:s.level==='c324x'?'c32':s.level==='c164x'?'c16':s.level==='c32'?'c16':s.id==='anime4k'?'balanced':s.level}));if(JSON.stringify(nextStages)!==JSON.stringify(current)){announce('持续低帧率，实时处理链已降低档位；首选保持不变。');configure('artcnn',true,nextStages)}else fallback('持续帧率过低');return}\n            if (next) {");
// Status represents rendered chain, not the retired server-based preparatory state.
s=s.replace("active?.effectiveMode==='artcnn' ? (active.error||enabledStages().map(s=>s.id==='artcnn'?'ArtCNN':'Anime4K').join(' → ')+' · '+(active.message||'正在准备，原图继续显示')) :", "active?.effectiveMode==='artcnn' ? ((active.actualStages||enabledStages()).map(s=>(s.id==='artcnn'?'ArtCNN '+s.level:'Anime4K '+s.level)).join(' → ')+' · 实时已启用'+(active.adapted?'（自动降档）':'')) :");
s=s.replace("engine(state.effectiveMode),输出:[p.canvas.width,p.canvas.height]", "p.id==='artcnn'?'ArtCNN':'Anime4K',档位:p.level,输出:[p.canvas.width,p.canvas.height]");
s=s.replace("state.effectiveMode==='artcnn'?enabledStages().map(s=>({引擎:s.id==='artcnn'?'ArtCNN':'Anime4K',档位:s.level})):passes.map", "passes.map");
fs.writeFileSync(p,s);
p='public/card-upscale.js';s=fs.readFileSync(p,'utf8').replace("controller.effectiveMode==='animesharp'?'-AnimeSharpV4.png'","controller.effectiveMode==='artcnn'?'-ArtCNN.png'");fs.writeFileSync(p,s);
