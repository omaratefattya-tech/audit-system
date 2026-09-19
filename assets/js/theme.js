(function(){
  'use strict';

  const STORAGE_KEY='auditTheme';
  const THEMES=new Set(['dark','light']);
  const DARK_THEME_COLOR='#003c2d';
  const LIGHT_THEME_COLOR='#f3f6f5';

  function normalizeTheme(value){return THEMES.has(value)?value:'dark';}
  function storedTheme(){
    try{return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));}
    catch(_){return 'dark';}
  }
  function currentTheme(){return normalizeTheme(document.documentElement.getAttribute('data-theme') || storedTheme());}
  function persistTheme(theme){
    try{window.localStorage.setItem(STORAGE_KEY,theme);}catch(_){ }
  }
  function updateThemeColor(theme){
    const meta=document.getElementById('appThemeColorMeta') || document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content',theme==='light'?LIGHT_THEME_COLOR:DARK_THEME_COLOR);
  }
  function syncToggle(theme){
    const button=document.getElementById('themeToggleBtn');
    if(!button) return;
    const nextIsLight=theme==='dark';
    const label=nextIsLight?'تفعيل الوضع النهاري':'تفعيل الوضع الليلي';
    button.setAttribute('aria-label',label);
    button.setAttribute('title',label);
    button.setAttribute('aria-pressed',theme==='light'?'true':'false');
    button.dataset.theme=theme;
  }
  function applyTheme(value,options={}){
    const theme=normalizeTheme(value);
    document.documentElement.setAttribute('data-theme',theme);
    if(options.persist!==false) persistTheme(theme);
    updateThemeColor(theme);
    syncToggle(theme);
    if(options.emit!==false){
      document.dispatchEvent(new CustomEvent('audit-theme-change',{detail:{theme}}));
    }
    return theme;
  }
  function toggleTheme(){return applyTheme(currentTheme()==='dark'?'light':'dark');}
  function initTheme(){
    applyTheme(currentTheme(),{persist:false,emit:false});
    const button=document.getElementById('themeToggleBtn');
    if(button && !button.dataset.themeBound){
      button.dataset.themeBound='1';
      button.addEventListener('click',toggleTheme);
    }
  }

  window.AuditTheme=Object.freeze({
    get:currentTheme,
    set:theme=>applyTheme(theme),
    toggle:toggleTheme,
    storageKey:STORAGE_KEY
  });

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initTheme,{once:true});
  else initTheme();
})();
