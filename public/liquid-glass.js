/* Delegated input feedback; no idle animation and no extra audio over the game's voices. */
(() => {
 const selector='.site-nav a,.page-home header a,.page-home .menus a,.page-home .side a,.page-home .side button,.page-home .tools button,dialog button';
 let frame=0,last=null,x=25;
 document.addEventListener('pointermove',event=>{
  const element=event.target.closest(selector);if(!element)return;
  const rect=element.getBoundingClientRect();last=element;x=Math.round((event.clientX-rect.left)/Math.max(1,rect.width)*100);
  if(!frame)frame=requestAnimationFrame(()=>{frame=0;last?.style.setProperty('--glass-x',x+'%')});
 },{passive:true});
 document.addEventListener('pointerdown',event=>{const element=event.target.closest(selector);if(element&&!element.disabled)element.classList.add('glass-press')},{capture:true});
 document.addEventListener('pointerup',event=>{
  const element=event.target.closest(selector);if(!element||element.disabled)return;
  element.getAnimations().filter(a=>a.id==='glass-release').forEach(a=>a.cancel());
  const animation=element.animate([{scale:.965},{scale:1.012,offset:.65},{scale:1}],{duration:380,easing:'cubic-bezier(.2,.7,.2,1)'});animation.id='glass-release';
 },{passive:true});
 window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);frame=0;last=null});
})();
