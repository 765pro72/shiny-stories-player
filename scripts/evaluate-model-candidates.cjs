// Standalone sample evaluation only. Does not replace any game texture or shader.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'exports','sr-candidate-check');
// ORT's native binding currently expects Uint16 storage rather than Node 24's Float16Array.
globalThis.Float16Array=undefined;
const ort=require('onnxruntime-node'),PNG=require('pngjs').PNG;
const crop={x:435,y:105,width:260,height:290},source=PNG.sync.read(fs.readFileSync(path.join(root,'exports/实时超分-model-off.png')));
const original=new PNG({width:crop.width,height:crop.height});PNG.bitblt(source,original,crop.x,crop.y,crop.width,crop.height,0,0);fs.writeFileSync(path.join(out,'original-crop.png'),PNG.sync.write(original));
function lanczos(input,width,height){
 const sinc=x=>Math.abs(x)<1e-8?1:Math.sin(Math.PI*x)/(Math.PI*x),kernel=x=>Math.abs(x)>=3?0:sinc(x)*sinc(x/3),image=new PNG({width,height});
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const sy=(y+.5)*input.height/height-.5,sx=(x+.5)*input.width/width-.5,values=[0,0,0,0];let sum=0;
  for(let iy=Math.floor(sy)-2;iy<=Math.floor(sy)+3;iy++)for(let ix=Math.floor(sx)-2;ix<=Math.floor(sx)+3;ix++){
   const weight=kernel(sy-iy)*kernel(sx-ix),pixel=(Math.max(0,Math.min(input.height-1,iy))*input.width+Math.max(0,Math.min(input.width-1,ix)))*4;sum+=weight;for(let c=0;c<4;c++)values[c]+=input.data[pixel+c]*weight;
  }
  for(let c=0;c<4;c++)image.data[(y*width+x)*4+c]=Math.max(0,Math.min(255,Math.round(values[c]/sum)));
 }
 return image;
}
fs.writeFileSync(path.join(out,'original-Lanczos2x.png'),PNG.sync.write(lanczos(original,crop.width*2,crop.height*2)));

const toHalf=value=>{const f=new Float32Array([value]),bits=new Uint32Array(f.buffer)[0],exponent=((bits>>>23)&255)-127+15,mantissa=bits&0x7fffff;return exponent<=0?0:exponent>=31?0x7c00:(exponent<<10)|((mantissa+0x1000)>>>13)};
const fromHalf=value=>{const s=value&0x8000?-1:1,e=(value>>>10)&31,m=value&1023;return s*(e===0?Math.pow(2,-14)*(m/1024):e===31?Infinity:Math.pow(2,e-15)*(1+m/1024))};
(async()=>{const results=[];for(const model of ['AnimeSharpV4','AnimeSharpV4-Fast']){
 const file=path.join(out,model+'.onnx'),at=performance.now(),session=await ort.InferenceSession.create(file,{executionProviders:['dml'],enableMemPattern:false,intraOpNumThreads:1});
 const input=new Uint16Array(crop.width*crop.height*3);for(let i=0;i<crop.width*crop.height;i++)for(let c=0;c<3;c++)input[c*crop.width*crop.height+i]=toHalf(original.data[i*4+c]/255);
 const feeds={[session.inputNames[0]]:new ort.Tensor('float16',input,[1,3,crop.height,crop.width])};await session.run(feeds);const samples=[];let output;for(let run=0;run<5;run++){const begin=performance.now();output=(await session.run(feeds))[session.outputNames[0]];samples.push(performance.now()-begin)}const inferMs=samples.reduce((a,b)=>a+b,0)/samples.length;
 const [,channels,height,width]=output.dims,image=new PNG({width,height}),plane=width*height;
 for(let i=0;i<plane;i++){for(let c=0;c<channels;c++){const value=output.data[c*plane+i];image.data[i*4+c]=Math.round(Math.max(0,Math.min(1,output.type==='float16'?fromHalf(value):value))*255)}image.data[i*4+3]=255}
 fs.writeFileSync(path.join(out,model+'-crop.png'),PNG.sync.write(image));results.push({model,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),provider:'DirectML',input:[crop.width,crop.height],output:[width,height],inferMs,samplesMs:samples,loadAndRunMs:performance.now()-at});await session.release();console.log(results.at(-1));
 }
 fs.writeFileSync(path.join(out,'evaluation.json'),JSON.stringify({at:new Date().toISOString(),source:'Existing original-render comparison frame, 1136x640; game source texture unchanged',crop,results,alphaAndSpineSeamsValidated:false,realtimeValidated:false,integratedIntoApp:false},null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
