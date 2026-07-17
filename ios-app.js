/* StatusOS v2.6.1 iPhone App Experience + Pull to Refresh */
(function(){
  const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isMobile=()=>innerWidth<=760;
  function activate(view){
    document.querySelector(`.nav-item[data-view="${view}"]`)?.click();
    document.querySelectorAll('[data-ios-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.iosView===view));
    document.getElementById('nav')?.classList.remove('mobile-open');
    document.body.classList.remove('nav-open');
  }
  function ensurePullIndicator(){
    let el=document.getElementById('iosPullRefresh');
    if(el)return el;
    el=document.createElement('div');
    el.id='iosPullRefresh';
    el.className='ios-pull-refresh';
    el.innerHTML='<span class="ios-pull-spinner" aria-hidden="true">↻</span><strong>Pull to refresh</strong>';
    document.body.prepend(el);
    return el;
  }
  function bindPullToRefresh(){
    if(!isMobile()||!isStandalone())return;
    const indicator=ensurePullIndicator();
    let startY=0,drag=0,tracking=false,refreshing=false;
    const atTop=()=>Math.max(document.documentElement.scrollTop||0,document.body.scrollTop||0)<=0;
    document.addEventListener('touchstart',e=>{
      if(refreshing||!atTop()||e.touches.length!==1)return;
      startY=e.touches[0].clientY;drag=0;tracking=true;
    },{passive:true});
    document.addEventListener('touchmove',e=>{
      if(!tracking||refreshing)return;
      const raw=e.touches[0].clientY-startY;
      if(raw<=0){drag=0;return;}
      drag=Math.min(112,raw*.55);
      indicator.style.transform=`translate(-50%, ${drag}px)`;
      indicator.classList.toggle('ready',drag>=72);
      indicator.querySelector('strong').textContent=drag>=72?'Release to refresh':'Pull to refresh';
      if(drag>8)e.preventDefault();
    },{passive:false});
    document.addEventListener('touchend',async()=>{
      if(!tracking)return;tracking=false;
      if(drag>=72){
        refreshing=true;indicator.classList.add('refreshing');indicator.classList.remove('ready');
        indicator.style.transform='translate(-50%, 72px)';
        indicator.querySelector('strong').textContent='Refreshing…';
        try{
          await Promise.allSettled([
            window.StatusOS?.Sync?.flush?.(),
            window.StatusOS?.Planner?.pull?.(),
            window.StatusOS?.ArtistRepository?.sync?.()
          ].filter(Boolean));
        }catch{}
        setTimeout(()=>location.reload(),220);
      }else{
        indicator.style.transform='translate(-50%, 0)';
        indicator.classList.remove('ready');
        indicator.querySelector('strong').textContent='Pull to refresh';
      }
      drag=0;
    },{passive:true});
    document.addEventListener('touchcancel',()=>{tracking=false;drag=0;indicator.style.transform='translate(-50%, 0)';indicator.classList.remove('ready')},{passive:true});
  }
  async function manualSync(){
    const btn=document.getElementById('profileSyncNowBtn');
    const original=btn?.textContent;
    try{
      if(btn){btn.disabled=true;btn.textContent='Syncing…'}
      document.getElementById('profileMenu')?.classList.add('hidden');
      document.getElementById('profileMenuBtn')?.setAttribute('aria-expanded','false');
      await Promise.allSettled([
        window.StatusOS?.DataProtection?.syncNow?.(),
        window.StatusOS?.Sync?.flush?.(),
        window.StatusOS?.Planner?.push?.(),
        window.StatusOS?.ArtistRepository?.sync?.()
      ].filter(Boolean));
      window.dispatchEvent(new Event('statusos:manual-sync-complete'));
      try{navigator.vibrate?.(12)}catch{}
    }catch(error){
      window.dispatchEvent(new CustomEvent('statusos:manual-sync-error',{detail:{message:error?.message}}));
    }finally{if(btn){btn.disabled=false;btn.textContent=original||'Sync Now'}}
  }
  function bind(){
    document.documentElement.classList.toggle('standalone-app',isStandalone());
    document.querySelectorAll('[data-ios-view]').forEach(btn=>btn.addEventListener('click',()=>activate(btn.dataset.iosView)));
    document.getElementById('iosQuickAddBtn')?.addEventListener('click',()=>{window.StatusOS?.Planner?.selectDate?.(new Date().toISOString().slice(0,10));window.StatusOS?.Planner?.openAdd?.();try{navigator.vibrate?.(10)}catch{}});
    document.getElementById('iosMoreBtn')?.addEventListener('click',()=>{document.getElementById('nav')?.classList.toggle('mobile-open');document.body.classList.toggle('nav-open')});
    document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-ios-view]').forEach(tab=>tab.classList.toggle('active',tab.dataset.iosView===btn.dataset.view));if(isMobile()){document.getElementById('nav')?.classList.remove('mobile-open');document.body.classList.remove('nav-open')}}));
    document.getElementById('profileSyncNowBtn')?.addEventListener('click',manualSync);
    bindPullToRefresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
