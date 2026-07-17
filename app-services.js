/* StatusOS v2.2.0 Shared App Services */
(function(){
  "use strict";
  let syncTimer=null;
  let palette=null;
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
  function schedule(){clearInterval(syncTimer);syncTimer=setInterval(()=>syncAll(true),30000)}
  function commands(){
    const views=Array.from(document.querySelectorAll(".nav-item[data-view]")).map(el=>({
      label:el.textContent.trim(),hint:"Open section",run:()=>el.click()
    }));
    const artists=(window.StatusOS?.ArtistRepository?.list?.()||[]).map(artist=>({
      label:artist.name,hint:"Open artist",run:()=>{
        document.querySelector('[data-view="artists"]')?.click();
        setTimeout(()=>document.querySelector(`.artist-directory-item[data-artist-id="${CSS.escape(artist.id)}"]`)?.click(),80);
      }
    }));
    return [
      ...views,
      ...artists,
      {label:"Sync now",hint:"Cloud sync",run:()=>syncAll(false)},
      {label:"Add artist",hint:"Artist OS",run:()=>document.querySelector('[data-open="artistModal"]')?.click()},
      {label:"Add task",hint:"Productivity",run:()=>{document.querySelector('[data-view="tasks"]')?.click();setTimeout(()=>document.getElementById("taskInput")?.focus(),80)}}
    ];
  }
  function ensurePalette(){
    if(palette?.isConnected)return palette;
    palette=document.createElement("div");
    palette.className="command-palette hidden";
    palette.innerHTML='<div class="command-palette-backdrop"></div><section class="command-palette-card" role="dialog" aria-modal="true" aria-label="StatusOS command palette"><div class="command-palette-search"><span>⌕</span><input id="commandPaletteInput" autocomplete="off" placeholder="Search StatusOS or type a command…"></div><div id="commandPaletteResults" class="command-palette-results"></div><small>Enter to open · Esc to close</small></section>';
    document.body.appendChild(palette);
    palette.querySelector(".command-palette-backdrop").addEventListener("click",closePalette);
    const input=palette.querySelector("input");
    input.addEventListener("input",renderPalette);
    input.addEventListener("keydown",e=>{
      const rows=[...palette.querySelectorAll(".command-palette-result")];
      let index=rows.findIndex(x=>x.classList.contains("active"));
      if(e.key==="ArrowDown"){e.preventDefault();index=Math.min(rows.length-1,index+1);rows.forEach((x,i)=>x.classList.toggle("active",i===index));rows[index]?.scrollIntoView({block:"nearest"})}
      if(e.key==="ArrowUp"){e.preventDefault();index=Math.max(0,index-1);rows.forEach((x,i)=>x.classList.toggle("active",i===index));rows[index]?.scrollIntoView({block:"nearest"})}
      if(e.key==="Enter"){e.preventDefault();rows[index<0?0:index]?.click()}
      if(e.key==="Escape")closePalette();
    });
    return palette;
  }
  function renderPalette(){
    const root=ensurePalette(),input=root.querySelector("input"),results=root.querySelector(".command-palette-results");
    const q=input.value.trim().toLowerCase();
    const list=commands().filter(x=>!q||`${x.label} ${x.hint}`.toLowerCase().includes(q)).slice(0,10);
    results.innerHTML="";
    list.forEach((command,index)=>{
      const row=document.createElement("button");row.type="button";row.className=`command-palette-result${index===0?" active":""}`;
      row.innerHTML=`<span>${escapeHtml(command.label)}</span><small>${escapeHtml(command.hint)}</small>`;
      row.addEventListener("click",()=>{closePalette();command.run()});results.appendChild(row);
    });
    if(!list.length)results.innerHTML='<div class="command-palette-empty">No matching commands</div>';
  }
  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  function openPalette(){const root=ensurePalette();root.classList.remove("hidden");renderPalette();setTimeout(()=>{const i=root.querySelector("input");i.value="";i.focus();renderPalette()},0)}
  function closePalette(){palette?.classList.add("hidden")}
  function bind(){
    schedule();
    window.addEventListener("online",()=>syncAll(true));
    window.addEventListener("focus",()=>syncAll(true));
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")syncAll(true)});
    document.addEventListener("keydown",e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openPalette()}
      else if(e.key==="Escape"&&!palette?.classList.contains("hidden"))closePalette();
    });
    window.addEventListener("statusos:app-ready",()=>setTimeout(()=>syncAll(true),500));
  }
  window.StatusOS=window.StatusOS||{};
  window.StatusOS.AppServices={syncNow:()=>syncAll(false),openCommandPalette:openPalette};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();
