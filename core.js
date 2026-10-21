/* Shared: theme, toast, PWA */
(()=>{
  const root=document.documentElement;
  const saved=localStorage.getItem('theme');
  const pref=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  root.dataset.theme=saved||pref;
  const apply=()=>{const b=document.querySelector('#btn-theme');if(b)b.textContent=root.dataset.theme==='dark'?'☀':'☾';};
  document.addEventListener('DOMContentLoaded',()=>{
    const b=document.querySelector('#btn-theme');
    if(b)b.onclick=()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';localStorage.setItem('theme',root.dataset.theme);apply();window.dispatchEvent(new Event('themechange'));};
    apply();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',e=>{
    if(!localStorage.getItem('theme')){root.dataset.theme=e.matches?'dark':'light';apply();}
  });
  window.toast=(msg)=>{let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.append(t);}
    t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600);};
  let deferred;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;const b=document.querySelector('#btn-install');if(b)b.hidden=false;});
  document.addEventListener('DOMContentLoaded',()=>{const b=document.querySelector('#btn-install');if(b)b.onclick=()=>{deferred&&deferred.prompt();};});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('.modal.open')?.classList.remove('open');});
})();
