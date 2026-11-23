// Texture/image inference, never animation-frame inference. Logical UVs stay intact.
const {parentPort}=require('node:worker_threads');
globalThis.Float16Array=undefined;
const ort=require('onnxruntime-node'),{PNG}=require('pngjs');
let session,provider;
const half=v=>{const f=new Float32Array([v]),b=new Uint32Array(f.buffer)[0],e=((b>>>23)&255)-112;return e<=0?0:e>=31?0x7c00:(e<<10)|(((b&0x7fffff)+4096)>>>13)};
const number=v=>{const e=(v>>>10)&31,m=v&1023;return(v&32768?-1:1)*(e===0?2**-14*m/1024:e===31?Infinity:2**(e-15)*(1+m/1024))};
function pixel(image,x,y,c){return image.data[(Math.max(0,Math.min(image.height-1,y))*image.width+Math.max(0,Math.min(image.width-1,x)))*4+c]}
function linear(image,x,y,c){const ix=Math.floor(x),iy=Math.floor(y),dx=x-ix,dy=y-iy;return pixel(image,ix,iy,c)*(1-dx)*(1-dy)+pixel(image,ix+1,iy,c)*dx*(1-dy)+pixel(image,ix,iy+1,c)*(1-dx)*dy+pixel(image,ix+1,iy+1,c)*dx*dy}
function extrude(image){const n=image.width*image.height,queue=new Uint32Array(n),known=new Uint8Array(n);let head=0,tail=0;for(let i=0;i<n;i++)if(image.data[i*4+3]){known[i]=1;queue[tail++]=i}while(head<tail){const i=queue[head++],x=i%image.width;for(const j of [x?i-1:-1,x+1<image.width?i+1:-1,i-image.width,i+image.width])if(j>=0&&j<n&&!known[j]){known[j]=1;queue[tail++]=j;for(let c=0;c<3;c++)image.data[j*4+c]=image.data[i*4+c]}}return tail>0}
async function infer(image){
 const width=image.width*2,height=image.height*2,out=new Float32Array(width*height*3),weights=new Float32Array(width*height),step=224,overlap=16,padding=16;
 for(let top=0;top<image.height;top+=step)for(let left=0;left<image.width;left+=step){
  const cw=Math.min(step+overlap,image.width-left),ch=Math.min(step+overlap,image.height-top),w=cw+padding*2,h=ch+padding*2,input=new Uint16Array(w*h*3);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++)input[c*w*h+y*w+x]=half(pixel(image,left+x-padding,top+y-padding,c)/255);
  const result=(await session.run({[session.inputNames[0]]:new ort.Tensor('float16',input,[1,3,h,w])}))[session.outputNames[0]],ow=result.dims[3],oh=result.dims[2];
  for(let y=0;y<ch*2;y++)for(let x=0;x<cw*2;x++){
   const gx=left*2+x,gy=top*2+y,dst=gy*width+gx,fadeX=left&&x<overlap*2?(x+.5)/(overlap*2):1,fadeY=top&&y<overlap*2?(y+.5)/(overlap*2):1;
   const endX=left+cw<image.width&&x>cw*2-overlap*2?(cw*2-x-.5)/(overlap*2):1,endY=top+ch<image.height&&y>ch*2-overlap*2?(ch*2-y-.5)/(overlap*2):1,weight=Math.max(.00001,fadeX*fadeY*endX*endY);
   weights[dst]+=weight;for(let c=0;c<3;c++){const v=result.data[c*ow*oh+(y+padding*2)*ow+x+padding*2];out[c*width*height+dst]+=(result.type==='float16'?number(v):v)*weight}
  }
 }
 for(let i=0;i<weights.length;i++)for(let c=0;c<3;c++)out[c*weights.length+i]/=weights[i];return out;
}
async function processImage(message){
 const image=PNG.sync.read(Buffer.from(message.png)),output=new PNG({width:image.width*2,height:image.height*2});
 if(image.width>8192||image.height>8192)throw Error('图像尺寸过大');
 // Alpha is resampled independently, not predicted by an RGB network.
 for(let y=0;y<output.height;y++)for(let x=0;x<output.width;x++)for(let c=0;c<4;c++)output.data[(y*output.width+x)*4+c]=Math.round(linear(image,(x+.5)/2-.5,(y+.5)/2-.5,c));
 const regions=message.regions?.length?message.regions:[{x:0,y:0,width:image.width,height:image.height}];let done=0;
 for(const region of regions){const {x,y,width,height}=region;if(![x,y,width,height].every(Number.isInteger)||x<0||y<0||width<1||height<1||x+width>image.width||y+height>image.height)throw Error('图集部件坐标无效');
  const part=new PNG({width,height});PNG.bitblt(image,part,x,y,width,height,0,0);if(extrude(part)){
   const rgb=await infer(part),plane=width*height*4;
   for(let py=0;py<height*2;py++)for(let px=0;px<width*2;px++){const index=((y*2+py)*output.width+x*2+px)*4,source=py*width*2+px;
    // Keep the outer texel colours continuous with the original packed atlas.
    const edge=message.regions?.length?Math.min(1,(Math.min(px,py,width*2-1-px,height*2-1-py)+.5)/2):1;
    let contrast=0;const sx=Math.floor(px/2),sy=Math.floor(py/2);for(let c=0;c<3;c++){let lo=255,hi=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const v=pixel(part,sx+dx,sy+dy,c);lo=Math.min(lo,v);hi=Math.max(hi,v)}contrast=Math.max(contrast,hi-lo)}const blend=edge*Math.min(1,Math.max(0,(contrast-3)/15));
    for(let c=0;c<3;c++){const value=Math.max(0,Math.min(255,rgb[c*plane+source]*255));output.data[index+c]=Math.round(value*blend+output.data[index+c]*(1-blend))}
   }
  }
  parentPort.postMessage({type:'progress',done:++done,total:regions.length,provider});
 }
 return PNG.sync.write(output);
}
parentPort.on('message',async message=>{try{
 if(message.type==='init'){await session?.release();provider='dml';try{session=await ort.InferenceSession.create(message.model,{executionProviders:['dml'],enableMemPattern:false,intraOpNumThreads:1})}catch{provider='cpu';session=await ort.InferenceSession.create(message.model,{executionProviders:['cpu'],intraOpNumThreads:2})}parentPort.postMessage({type:'ready',provider})}
 else if(message.type==='image'){const bytes=await processImage(message);parentPort.postMessage({type:'result',bytes,provider})}
 }catch(error){parentPort.postMessage({type:'error',error:error.message})}});
