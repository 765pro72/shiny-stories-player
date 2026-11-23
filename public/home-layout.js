/* Home camera math follows the official Shiny Colors animation-mode zoom presets.
   Character bounds stay native; one shared camera scale preserves authored height differences. */
(function (scope) {
 const distances = {
  short: {scale:1.5, offset:210},
  middle: {scale:1, offset:0},
  long: {scale:.7, offset:-200},
  super_long: {scale:.65, offset:-160}
 };
 const spans = {1:0,2:330,3:520,4:660,5:760};
 const targetHeight = .81;
 function frame(width,height){const cover=Math.max(width/1136,height/640);return{left:(1136-width/cover)/2,top:(640-height/cover)/2,width:width/cover,height:height/cover};}
 function distanceForCount(count){return count<=1?'short':count===2?'middle':count===3?'long':'super_long';}
 function sharedScale(boundsList,viewport,distance='middle'){
  const valid=(boundsList||[]).map(b=>Number(b?.height)).filter(h=>Number.isFinite(h)&&h>0).sort((a,b)=>a-b);
  const adults=valid.filter(h=>h>=860);
  const reference=adults.length?adults[adults.length-1]:(valid.length?Math.max(960,valid[valid.length-1]):960);
  return frame(viewport.width,viewport.height).height*targetHeight/reference*(distances[distance]||distances.middle).scale;
 }
 function place(bounds,slot,count,viewport,distance='middle',scale=null){
  count=Math.min(5,Math.max(1,count));const zoom=distances[distance]||distances[distanceForCount(count)],v=frame(viewport.width,viewport.height);
  const effectiveScale=Number.isFinite(Number(scale))&&Number(scale)>0?Number(scale):sharedScale([bounds],viewport,distance);
  const lift=Number(zoom.offset)||0;
  const baseline=v.top+v.height+14+lift;
  const span=Math.min(spans[count],v.width*.78),center=568+(count===1?0:(slot/(count-1)-.5)*span);
  const y=baseline-(bounds.y+bounds.height)*effectiveScale;
  return{x:center-(bounds.x+bounds.width/2)*effectiveScale,y,scale:effectiveScale,center,top:y+bounds.y*effectiveScale,bottom:baseline,distance};
 }
 function packCenters(halves,viewport,gap=8,margin=12,minScale=.94){
  const list=(halves||[]).map(h=>Math.abs(Number(h)||0));
  const count=list.length;if(!count)return{centers:[],scale:1};
  const v=frame(viewport.width,viewport.height),usable=Math.max(1,v.width-margin*2);
  const sum=list.reduce((a,b)=>a+b*2,0);
  const wanted=sum+gap*Math.max(0,count-1);
  // A group wider than the stage gets a slightly wider camera instead of piling up.
  const fit=Math.max(minScale,Math.min(1,usable/Math.max(1,wanted)));
  const step=count>1?gap:0;
  const scaled=list.map(half=>half*fit);
  const total=scaled.reduce((a,b)=>a+b*2,0)+step*Math.max(0,count-1);
  let cursor=v.left+(v.width-total)/2;
  const centers=[];
  scaled.forEach(half=>{centers.push(cursor+half);cursor+=half*2+step});
  return{centers,scale:fit};
 }
 function clampSlot(bounds,slot,count,viewport,distance='middle',scale=null){
  const to=place(bounds,slot,count,viewport,distance,scale);
  const half=Math.abs(Number(bounds?.width)||0)*to.scale/2,edge=12;
  // A packed group must never push someone off the stage: squeeze the centre back inside
  // instead, so five at the normal zoom overlap slightly rather than losing an idol.
  const minCenter=edge+half,maxCenter=1136-edge-half;
  if(minCenter>=maxCenter)return{...to,x:568-(bounds.x+bounds.width/2)*to.scale,center:568};
  const center=Math.min(maxCenter,Math.max(minCenter,to.center));
  if(center===to.center)return to;
  return{...to,x:center-(bounds.x+bounds.width/2)*to.scale,center};
 } function layoutGroup(items,viewport,distance='middle'){
  const list=(items||[]).filter(item=>item&&item.bounds);
  const count=list.length;if(!count)return[];
  const scale=sharedScale(list.map(item=>item.bounds),viewport,distance);
  return list.map((item,index)=>place(item.bounds,index,count,viewport,distance,scale));
 }
 const api={place,clampSlot,packCenters,layoutGroup,frame,distances,distanceForCount,sharedScale,targetHeight};
 if(typeof module==='object'&&module.exports)module.exports=api;else scope.HomeLayout=api;
})(typeof window==='object'?window:globalThis);


