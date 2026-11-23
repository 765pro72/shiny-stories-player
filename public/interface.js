/* The visual shell is static HTML/CSS: it must never depend on PIXI finishing. */
(() => {
 document.querySelectorAll('[data-continue-reading]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();let recent=[];try{recent=JSON.parse(window.desktop?.getState()?.recent||localStorage.getItem('recent')||'[]')}catch{}const target='guide.html?'+(recent[0]?'story='+encodeURIComponent(recent[0]):'mode=recent')+'#archive';if(window.self!==window.top&&window.parent?.__shinyShell?.navigate)window.parent.__shinyShell.navigate(target);else location.href=target;}));
 document.querySelector('.filter-toggle')?.addEventListener('click', event => event.currentTarget.setAttribute('aria-expanded',String(document.body.classList.toggle('filters-open'))));
 document.addEventListener('toggle', event => {
  if(event.target.tagName!=='DETAILS'||!event.target.open)return;
  for(const node of [...event.target.children].filter(n=>n.tagName!=='SUMMARY'))node.animate([{opacity:0,transform:'translateY(-6px)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.16,1,.3,1)'});
 },true);
  // Load background music capsule across all modules
  if (!document.getElementById('musicCapsuleStyles')) {
    const l = document.createElement('link');
    l.id = 'musicCapsuleStyles';
    l.rel = 'stylesheet';
    l.href = '/music-capsule.css';
    document.head.appendChild(l);
  }
  if (!document.getElementById('musicCapsuleScript')) {
    const s = document.createElement('script');
    s.id = 'musicCapsuleScript';
    s.src = '/music-capsule.js';
    s.defer = true;
    document.head.appendChild(s);
  }
  // Load 283PRISM Live Stage Unified Design & Concert Motion System across every module
  if (!document.getElementById('prismLiveStageStyles')) {
    const l = document.createElement('link');
    l.id = 'prismLiveStageStyles';
    l.rel = 'stylesheet';
    l.href = '/live-stage.css';
    document.head.appendChild(l);
  }
  if (!document.getElementById('prismLiveStageScript')) {
    const s = document.createElement('script');
    s.id = 'prismLiveStageScript';
    s.src = '/live-stage.js';
    s.defer = true;
    document.head.appendChild(s);
  }
  // Load 20:9 & 21:9 Android Ultrawide + Cutout Safe-Area Adaptation across every module
  if (!document.getElementById('mobileUltrawideStyles')) {
    const l = document.createElement('link');
    l.id = 'mobileUltrawideStyles';
    l.rel = 'stylesheet';
    l.href = '/mobile-ultrawide.css';
    document.head.appendChild(l);
  }
})();
