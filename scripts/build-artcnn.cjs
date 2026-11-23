// Convert the author's pinned compute kernels to WebGL2 fragment MRT passes.
// Coefficients/skip connections are unchanged. Workgroup shared memory becomes
// clamped texel fetches; packed features become separate RGBA16F attachments.
const fs=require('node:fs'),crypto=require('node:crypto');
const variants={};
for(const channels of [16,32]){
 const file=`public/vendor/artcnn/ArtCNN_C4F${channels}.glsl`,source=fs.readFileSync(file,'utf8'),features=channels/4;
 const layers=source.split('//!DESC ').slice(0,-1).slice(1).map(chunk=>{
  const binds=[...chunk.matchAll(/\/\/!BIND (\w+)/g)].map(m=>m[1]),save=chunk.match(/\/\/!SAVE (\w+)/)[1],outputs=[...chunk.matchAll(/imageStore\(out_image, output_base \+ ivec2\(\d, \d\), (.+)\);/g)].map(m=>m[1]);
  const reads={};for(const m of chunk.matchAll(/inp\[(\d+)\]\[y\]\[x\] = (.+);/g))reads[m[1]]=m[2];
  const sample=(expression,x,y)=>expression.replace(/\b(?:V4|F)\(/g,x=>x==='F('?'float(':'vec4(').replace(/\w+_mul \* /g,'').replace(/texelFetch\((\w+)_raw, input_base \+ ivec2\(\d, \d\), 0\)/g,(_,name)=>`texelFetch(${name}_${sample.slot},clamp(ivec2(gl_FragCoord.xy)+ivec2(${x},${y}),ivec2(0),uSize-1),0)`);
  let declarations=chunk.split('\n').filter(l=>/const (?:V4|F) inp_\d+_\d+_\d+ =/.test(l)).map(line=>line.replace(/inp\[(\d+)\]\[local_xy.y \+ (\d+)\]\[local_xy.x \+ (\d+)\]/g,(_,slot,y,x)=>{sample.slot=Number(slot);return sample(reads[slot],Number(x)-1,Number(y)-1)}).replace(/\bV4\b/g,'vec4').replace(/\bF\b/g,'float').replace(/\bconst /g,'')).join('\n');
  const passes=[];for(let begin=0;begin<outputs.length;begin+=4){const indices=Array.from({length:Math.min(4,outputs.length-begin)},(_,n)=>n+begin);const arithmetic=chunk.split('\n').filter(l=>indices.some(i=>new RegExp('(?:\\bresult'+i+'\\s*(?:=|\\+=))').test(l))).map(l=>l.replace(/\bV4\b/g,'vec4').replace(/\bM4\b/g,'mat4').replace(/\bF\b/g,'float')).join('\n');
   const samplers=binds.flatMap(name=>Array.from({length:name==='LUMA'?1:features},(_,n)=>name+'_'+n));
   const code=`#version 300 es\nprecision highp float;precision highp int;uniform ivec2 uSize;\n${samplers.map(n=>'uniform sampler2D '+n+';').join('\n')}\n${indices.map((n,i)=>'layout(location='+i+') out vec4 out'+n+';').join('\n')}\nvoid main(){\n${declarations}\n${arithmetic}\n${indices.map(n=>'out'+n+'='+outputs[n].replace(/V4/g,'vec4')+';').join('\n')}\n}`;
   passes.push({code,samplers,begin,count:indices.length});
  }
  return{binds,save,outputs:outputs.length,passes};
 });
 variants[channels]={layers,sourceSha256:crypto.createHash('sha256').update(source).digest('hex')};
}
fs.writeFileSync('public/vendor/artcnn/kernels.json',JSON.stringify({version:'1.6.2',variants}));
console.log(Object.entries(variants).map(([name,v])=>({name,layers:v.layers.length,passes:v.layers.reduce((n,l)=>n+l.passes.length,0),hash:v.sourceSha256})));
