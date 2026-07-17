/* StatusOS v2.6.1 Quiet Sync Notification Manager */
(function(){
  "use strict";
  let host=null;
  const recent=new Map();
  function ensureHost(){
    if(host?.isConnected)return host;
    host=document.createElement("div");
    host.id="statusosToastHost";
    host.className="statusos-toast-host";
    host.setAttribute("aria-live","polite");
    host.setAttribute("aria-atomic","false");
    document.body.appendChild(host);
    return host;
  }
  function notify(message,options={}){
    if(!message)return null;
    const type=options.type||"info";
    const duration=Number(options.duration??2600);
    const key=options.key||`${type}:${message}`;
    const now=Date.now();
    if(now-(recent.get(key)||0)<900)return null;
    recent.set(key,now);
    const toast=document.createElement("div");
    toast.className=`statusos-toast statusos-toast-${type}`;
    toast.setAttribute("role",type==="error"?"alert":"status");
    const icon=document.createElement("span");
    icon.className="statusos-toast-icon";
    icon.textContent=type==="success"?"✓":type==="error"?"!":type==="warning"?"•":"i";
    const text=document.createElement("span");
    text.className="statusos-toast-text";
    text.textContent=message;
    toast.append(icon,text);
    ensureHost().appendChild(toast);
    requestAnimationFrame(()=>toast.classList.add("is-visible"));
    const close=()=>{toast.classList.remove("is-visible");setTimeout(()=>toast.remove(),180)};
    if(duration>0)setTimeout(close,duration);
    toast.addEventListener("click",close);
    return {close,element:toast};
  }
  function bind(){
    window.addEventListener("statusos:notify",e=>notify(e.detail?.message,e.detail||{}));
    let taskStatus="";
    window.addEventListener("statusos:sync-status",e=>{
      const s=e.detail?.status||"";
      if(s===taskStatus)return;
      taskStatus=s;
      if(s==="offline")notify("Offline. Changes will sync later.",{type:"warning",key:"offline",duration:3200});
      else if(s==="setup")notify("Task cloud setup is required",{type:"error",key:"task-setup",duration:4500});
    });
    let artistStatus="";
    window.addEventListener("statusos:artist-sync-status",e=>{
      const s=e.detail?.status||"";
      if(s===artistStatus)return;
      artistStatus=s;
      if(s==="pending"&&e.detail?.pending)notify(`${e.detail.pending} artist change${e.detail.pending===1?"":"s"} saved locally`,{type:"info",key:"artists-pending"});
    });
    window.addEventListener("statusos:manual-sync-complete",()=>notify("StatusOS synced",{type:"success",key:`manual-sync-${Date.now()}`,duration:2600}));
    window.addEventListener("statusos:manual-sync-error",e=>notify(e.detail?.message||"Manual sync could not finish",{type:"error",key:`manual-sync-error-${Date.now()}`,duration:4200}));
  }
  window.StatusOS=window.StatusOS||{};
  window.StatusOS.Notify={show:notify,success:(m,o={})=>notify(m,{...o,type:"success"}),error:(m,o={})=>notify(m,{...o,type:"error"}),warning:(m,o={})=>notify(m,{...o,type:"warning"})};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();
