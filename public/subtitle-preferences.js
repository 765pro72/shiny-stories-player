(()=>{
 const valid=value=>['zh','both','jp'].includes(value),key='storySubtitleLanguage';
 function get(){const saved=window.desktop?.getState()?.[key]||localStorage.getItem(key);return valid(saved)?saved:'zh'}
 function set(value){if(!valid(value))return;localStorage.setItem(key,value);window.desktop?.saveState({[key]:value});for(const id of ['lang','storySubtitleLanguage']){const input=document.getElementById(id);if(input)input.value=value}const button=document.getElementById('useOriginalSubtitles');if(button)button.setAttribute('aria-pressed',String(value==='jp'));window.dispatchEvent(new CustomEvent('story-subtitle-preference',{detail:value}))}
 function init(){for(const id of ['lang','storySubtitleLanguage']){const input=document.getElementById(id);if(input){input.value=get();input.addEventListener('change',()=>set(input.value))}}const button=document.getElementById('useOriginalSubtitles');if(button){button.setAttribute('aria-pressed',String(get()==='jp'));button.onclick=()=>set(get()==='jp'?'zh':'jp')}}
 window.StorySubtitle={get,set};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
