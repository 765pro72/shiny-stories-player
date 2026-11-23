/* Reuse the exact same Anime4K pipeline for gallery photos and movie frames. */
(() => {
  let app, texture, controller, wrapper, media, frameRequest = null, generation = 0, zoom = 1;
  const tools = document.createElement('div'); tools.className = 'card-quality-tools';
  const fullscreen = document.createElement('button'); fullscreen.textContent = '全屏查看';
  const save = document.createElement('button'); save.textContent = '保存超分卡面';
  const status = document.createElement('span'); status.className = 'media-quality-status'; status.setAttribute('role', 'status');
  const retry=document.createElement('button');retry.textContent='重新加载';retry.hidden=true;retry.onclick=()=>{if(!media)return;retry.hidden=true;status.textContent='正在重新加载素材…';if(media.tagName==='VIDEO')media.load();else{const url=new URL(media.src);url.searchParams.set('retry',Date.now());media.src=url.href}};tools.append(fullscreen, save, retry, status); document.querySelector('#cardMediaPane').prepend(tools);
  function clear() {
    generation++;
    if (frameRequest !== null && media?.cancelVideoFrameCallback) media.cancelVideoFrameCallback(frameRequest);
    frameRequest = null; controller?.destroy(); controller = null;
    if (app) app.destroy(true, { children: true, texture: false, baseTexture: false });
    texture?.destroy(true); texture = null; app = null;
    if (media) {
      media.removeEventListener('load', ready); media.removeEventListener('loadeddata', ready);
      media.removeEventListener('error',failed);media.removeEventListener('seeked', renderFrame); media.removeEventListener('play', startVideo);
      media.style.display = ''; media.style.position = ''; media.style.inset = '';
      if (wrapper?.contains(media)) wrapper.before(media);
    }
    wrapper?.remove(); wrapper = null; media = null; retry.hidden=true; status.textContent = '';
  }
  function renderFrame() {
    if (!app || !texture || media?.hidden || !document.querySelector('#cardDetail').open) return;
    texture.baseTexture.update(); app.render();
  }
  function startVideo() {
    if (!media || media.tagName !== 'VIDEO' || frameRequest !== null) return;
    const token = generation;
    const tick = () => {
      frameRequest = null; if (token !== generation || !app) return;
      renderFrame();
      if (!media.paused && !media.ended) frameRequest = media.requestVideoFrameCallback(tick);
    };
    if (media.requestVideoFrameCallback) frameRequest = media.requestVideoFrameCallback(tick);
  }
  function ready() {
    retry.hidden=true;status.textContent='';
    if (!media || app) return;
    const video = media.tagName === 'VIDEO', width = video ? media.videoWidth : media.naturalWidth, height = video ? media.videoHeight : media.naturalHeight;
    if (!width || !height) return;
    const element = media;
    wrapper = document.createElement('div'); wrapper.className = video ? 'card-video-render' : 'card-image-render';
    wrapper.style.aspectRatio = width + '/' + height; element.before(wrapper);
    document.querySelector('#cardImageViewport').style.setProperty('--image-ratio', width / height);document.querySelector('#cardDetail').style.setProperty('--media-ratio',width/height);
    if (video) {
      wrapper.append(element); element.controlsList.add('nofullscreen');
      // Play movies natively: uploading every frame into the Anime4K pipeline tore the
      // picture and stuttered, and it covered the native controls. Stills keep the overlay.
      wrapper.style.setProperty('--card-zoom', zoom);
      status.textContent = '影片按原画质播放（实时超分只用于卡面静图）。';
      return;
    }
    else element.style.display = 'none';
    app = new PIXI.Application({ width, height, resolution: 1, autoStart: false, antialias: false, backgroundColor: 0x111722 });
    texture = PIXI.Texture.from(element, { resourceOptions: { autoPlay: false, autoUpdate: false } });
    const picture = new PIXI.Sprite(texture); picture.width = width; picture.height = height; app.stage.addChild(picture);
    wrapper.append(app.view); app.view.style.width = '100%'; app.view.style.height = '100%'; app.view.style.objectFit = 'contain';
    app.view.style.pointerEvents = 'none'; controller = ShinyAnime4K.attach(app, { fill: true,monitorPerformance:()=>video&&!media.paused&&!media.ended });
    wrapper.style.setProperty('--card-zoom', zoom); app.render();
  }
  async function failed(){const failedMedia=media,token=generation;if(!failedMedia)return;retry.hidden=false;const code=failedMedia.error?.code;status.textContent=code===3?'视频解码失败，请重新加载。':code===4?'视频不可播放，正在检查资源请求…':'素材加载失败，正在检查资源请求…';try{const url=new URL(failedMedia.currentSrc||failedMedia.src,location.href),key=url.pathname.replace(/^\/asset(?:-original)?\//,'');const result=await fetch('/api/resource-error?key='+encodeURIComponent(key)).then(r=>r.json());if(token!==generation||media!==failedMedia)return;status.textContent=result.message?'素材拉取失败：'+result.message:code===3?'视频解码失败，请重新加载；原文件未修改。':code===4?'视频格式不可播放，或返回的素材无效。':'素材加载失败，请重新加载。'}catch{if(token===generation)status.textContent='素材加载失败，请重新加载。'}}
  function show(element) {
    clear(); media = element;media.addEventListener('error',failed); save.hidden = media.tagName === 'VIDEO';
    media.addEventListener(media.tagName === 'VIDEO' ? 'loadeddata' : 'load', ready);
    if (media.tagName === 'VIDEO' ? media.readyState >= 2 : media.complete && media.naturalWidth) ready();
  }
  fullscreen.onclick = async () => {
    const target = media?.tagName === 'VIDEO' ? wrapper || media : document.querySelector('#cardImageViewport');
    if (!target) return;
    if (document.fullscreenElement) await document.exitFullscreen(); else await target.requestFullscreen();
  };
  save.onclick = () => {
    if (!controller?.active || (controller.isReady&&!controller.isReady()) || media?.tagName === 'VIDEO') { status.textContent = '先开启超分，再保存处理后的卡面。'; return; }
    app.renderer.once('postrender', () => {
      const link = document.createElement('a'); link.download = (document.querySelector('#cardTitle').textContent + (controller.effectiveMode==='artcnn'?'-ArtCNN.png':'-Anime4K.png')).replace(/[\\/:*?"<>|]/g, '_');
      const output=controller.exportImage?.()||controller.output;if(output.toDataURL)link.href=output.toDataURL('image/png');else{const canvas=document.createElement('canvas');canvas.width=output.naturalWidth||output.width;canvas.height=output.naturalHeight||output.height;canvas.getContext('2d').drawImage(output,0,0);link.href=canvas.toDataURL('image/png')} link.click(); status.textContent = '已导出当前档位的超分卡面。';
    }); app.render();
  };
  window.cardUpscale = {
    show, clear,
    mountTools(target) { target.append(...tools.childNodes); tools.remove(); },
    setZoom(value) {
      zoom = value; wrapper?.style.setProperty('--card-zoom', value);
      const viewport = document.querySelector('#cardImageViewport');
      viewport.style.setProperty('--card-zoom', value); viewport.classList.toggle('zoomed', value > 1);
    }
  };
  window.addEventListener('pagehide', clear);
})();

