/* StatusOS v2.9.1 Daily Use Polish */
(function(){
  'use strict';
  const SUCCESS_KEY='statusos_success_os_v2';
  const isoToday=()=>{const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,10)};
  function successState(){try{return JSON.parse(localStorage.getItem(SUCCESS_KEY)||'{}')}catch{return {}}}
  function chooseSuccessTab(){
    const today=successState()?.days?.[isoToday()]||{};
    const hour=new Date().getHours();
    let tab='morning';
    if(today.morning?.complete&&!today.night?.complete&&hour>=17)tab='night';
    else if(today.morning?.complete&&today.night?.complete)tab='progress';
    requestAnimationFrame(()=>document.querySelector(`[data-success-tab="${tab}"]`)?.click());
  }
  function bindSuccessLaunch(){
    document.getElementById('dashboardSuccessBtn')?.addEventListener('click',chooseSuccessTab);
    document.querySelectorAll('.nav-item[data-view="reset"],[data-ios-view="reset"]').forEach(el=>el.addEventListener('click',chooseSuccessTab));
  }
  function bindKeyboardComfort(){
    if(!window.visualViewport)return;
    const update=()=>{
      const keyboard=Math.max(0,window.innerHeight-window.visualViewport.height-window.visualViewport.offsetTop);
      document.documentElement.style.setProperty('--keyboard-inset',`${keyboard}px`);
      document.body.classList.toggle('keyboard-open',keyboard>120);
    };
    window.visualViewport.addEventListener('resize',update);
    window.visualViewport.addEventListener('scroll',update);
    update();
  }
  function safeStorageSummary(){
    const rows=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(/key|token|secret|password|auth/i.test(key))continue;
      const value=localStorage.getItem(key)||'';
      rows.push({key,size:value.length});
    }
    return rows.sort((a,b)=>a.key.localeCompare(b.key));
  }
  function downloadProblemReport(){
    const description=document.getElementById('problemDescription')?.value.trim()||'No description entered.';
    const meta=window.StatusOS?.Meta||{};
    const report={
      createdAt:new Date().toISOString(),
      app:{version:meta.version||'unknown',codename:meta.codename||'unknown',buildDate:meta.buildDate||'unknown'},
      device:{userAgent:navigator.userAgent,standalone:window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true,online:navigator.onLine,viewport:`${innerWidth}x${innerHeight}`},
      description,
      storage:safeStorageSummary(),
      note:'Passwords, API keys, authentication tokens, and stored record contents are intentionally excluded.'
    };
    const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`StatusOS-Problem-Report-${isoToday()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    const status=document.getElementById('problemReportStatus');if(status)status.textContent='Problem report downloaded. Attach it when describing the issue.';
  }
  function bindProblemReport(){document.getElementById('exportProblemReportBtn')?.addEventListener('click',downloadProblemReport)}
  function bind(){bindSuccessLaunch();bindKeyboardComfort();bindProblemReport()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
