/* StatusOS v2.2.1 Shared App Services */
(function(){
  "use strict";
  let syncTimer=null;

  const syncAll=async(silent=true)=>{
    if(!navigator.onLine||document.visibilityState==="hidden")return;
    try{
      await window.StatusOS?.Sync?.flushQueue?.();
      await window.StatusOS?.ArtistRepository?.flush?.();
      if(!silent)window.StatusOS?.Notify?.success?.("Everything is up to date",{key:"manual-sync"});
    }catch(error){
      console.warn("Background sync unavailable",error);
      if(!silent)window.StatusOS?.Notify?.warning?.("Sync will retry automatically",{key:"sync-retry"});
    }
  };

  function schedule(){
    clearInterval(syncTimer);
    syncTimer=setInterval(()=>syncAll(true),30000);
  }

  function openCommandPalette(){
    window.StatusOS?.Command?.open?.();
  }

  function bind(){
    schedule();
    window.addEventListener("online",()=>syncAll(true));
    window.addEventListener("focus",()=>syncAll(true));
    document.addEventListener("visibilitychange",()=>{
      if(document.visibilityState==="visible")syncAll(true);
    });
    window.addEventListener("statusos:app-ready",()=>setTimeout(()=>syncAll(true),500));
  }

  window.StatusOS=window.StatusOS||{};
  window.StatusOS.AppServices={
    syncNow:()=>syncAll(false),
    openCommandPalette
  };

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
  else bind();
})();
