/* StatusOS v2.5.2 iPhone App Experience */
(function(){
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  function activate(view){
    document.querySelector(`.nav-item[data-view="${view}"]`)?.click();
    document.querySelectorAll('[data-ios-view]').forEach(btn=>btn.classList.toggle('active',btn.dataset.iosView===view));
    document.getElementById('nav')?.classList.remove('mobile-open');
    document.body.classList.remove('nav-open');
  }
  function bind(){
    document.documentElement.classList.toggle('standalone-app',isStandalone());
    document.querySelectorAll('[data-ios-view]').forEach(btn=>btn.addEventListener('click',()=>activate(btn.dataset.iosView)));
    document.getElementById('iosQuickAddBtn')?.addEventListener('click',()=>{ window.StatusOS?.Planner?.selectDate?.(new Date().toISOString().slice(0,10)); window.StatusOS?.Planner?.openAdd?.(); try{navigator.vibrate?.(10)}catch{} });
    document.getElementById('iosMoreBtn')?.addEventListener('click',()=>{
      document.getElementById('nav')?.classList.toggle('mobile-open');
      document.body.classList.toggle('nav-open');
    });
    document.querySelectorAll('.nav-item').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-ios-view]').forEach(tab=>tab.classList.toggle('active',tab.dataset.iosView===btn.dataset.view));
      if(innerWidth<=760){document.getElementById('nav')?.classList.remove('mobile-open');document.body.classList.remove('nav-open');}
    }));
    let startY=0;
    document.addEventListener('touchstart',e=>{startY=e.touches[0]?.clientY||0},{passive:true});
    document.addEventListener('touchend',e=>{
      const endY=e.changedTouches[0]?.clientY||0;
      if(startY<90 && endY-startY>80){ document.getElementById('nav')?.classList.add('mobile-open'); document.body.classList.add('nav-open'); }
    },{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
