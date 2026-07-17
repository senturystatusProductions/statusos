/* StatusOS v2.4.2 Actionable Daily Command Center */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const isoToday=()=>new Date().toISOString().slice(0,10);
  const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const formatTime=value=>window.StatusOS?.Planner?.formatTime?.(value)||(value||"Anytime");
  function workspace(){try{return JSON.parse(localStorage.getItem("senturyStatusOS_v2")||"{}");}catch{return {};}}
  function artists(){try{return JSON.parse(localStorage.getItem("statusos_artists_v2")||"[]").filter(a=>!a.deletedAt);}catch{return [];}}
  function planner(){return window.StatusOS?.Planner?.list?.()||[];}
  function priorities(){const d=workspace().daily||{};return Array.isArray(d.priorities)?d.priorities:[];}
  function dueFollowups(){const today=isoToday();return artists().filter(a=>a.followUp&&a.followUp<=today&&a.status!=="Won"&&a.status!=="Archived").sort((a,b)=>String(a.followUp).localeCompare(String(b.followUp)));}
  function greeting(){const h=new Date().getHours();return h<12?"Good morning":h<17?"Good afternoon":"Good evening";}
  function openPlanner(){document.querySelector('[data-view="planner"]')?.click();}
  function action(label,className,handler){const b=document.createElement("button");b.type="button";b.className=className;b.textContent=label;b.addEventListener("click",e=>{e.stopPropagation();handler();});return b;}
  function renderScheduleItem(item,host){
    const row=document.createElement("article");row.className=`command-task${item.completed?" completed":""}`;
    const check=action(item.completed?"✓":"","command-task-check",()=>window.StatusOS?.Planner?.toggle?.(item.id));check.setAttribute("aria-label",item.completed?"Mark incomplete":"Mark complete");
    const body=document.createElement("button");body.type="button";body.className="command-task-body";body.innerHTML=`<span class="command-time">${escapeHtml(formatTime(item.time))}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category||"Plan")}${item.completed?" · Completed":""}</small></span>`;body.addEventListener("click",()=>window.StatusOS?.Planner?.openEdit?.(item.id));
    const controls=document.createElement("div");controls.className="command-task-actions";
    controls.append(action("Edit","command-task-action",()=>window.StatusOS?.Planner?.openEdit?.(item.id)),action("Snooze","command-task-action",()=>window.StatusOS?.Planner?.openSnooze?.(item.id)),action("Delete","command-task-action danger",()=>window.StatusOS?.Planner?.remove?.(item.id)));
    row.append(check,body,controls);host.appendChild(row);
  }
  function render(){
    if(!$("commandGreeting"))return;
    const today=isoToday(),dayItems=planner().filter(x=>x.date===today).sort((a,b)=>(a.completed-b.completed)||((a.time||"99:99").localeCompare(b.time||"99:99")));
    const open=dayItems.filter(x=>!x.completed),done=dayItems.length-open.length,p=priorities(),remaining=p.filter(x=>!x.done),follows=dueFollowups();
    $("commandGreeting").textContent=`${greeting()}, Sam.`;$("commandDate").textContent=new Intl.DateTimeFormat(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date());
    $("commandOpenCount").textContent=open.length;$("commandPriorityCount").textContent=remaining.length;$("commandFollowupCount").textContent=follows.length;$("commandProgress").textContent=dayItems.length?`${Math.round(done/dayItems.length*100)}%`:"0%";
    const progress=$("commandProgressBar");if(progress)progress.style.width=dayItems.length?`${Math.round(done/dayItems.length*100)}%`:"0%";
    const schedule=$("commandSchedule");schedule.innerHTML="";
    if(!dayItems.length)schedule.innerHTML='<div class="command-empty"><strong>Your day is open.</strong><span>Press Plan My Day to build a practical schedule.</span></div>';
    dayItems.forEach(item=>renderScheduleItem(item,schedule));
    const next=open[0]||null;$("commandNextTitle").textContent=next?.title||remaining[0]?.title||follows[0]?.name||"Your day is clear";$("commandNextDetail").textContent=next?`${formatTime(next.time)} · ${next.category||"Plan"}`:remaining[0]?"This is your first unfinished priority.":follows[0]?`Follow-up due ${follows[0].followUp}.`:"Add an item or let StatusOS build a practical plan.";
    const priorityHost=$("commandPriorities");priorityHost.innerHTML="";if(!remaining.length)priorityHost.innerHTML='<div class="command-empty small"><span>All priorities complete.</span></div>';remaining.slice(0,5).forEach(x=>{const r=document.createElement("button");r.type="button";r.className="command-row compact";r.innerHTML=`<span class="command-dot"></span><span><strong>${escapeHtml(x.title)}</strong><small>Daily priority</small></span><b>›</b>`;r.onclick=()=>document.querySelector('[data-view="dashboard"]')?.click();priorityHost.appendChild(r);});
    const followHost=$("commandFollowups");followHost.innerHTML="";if(!follows.length)followHost.innerHTML='<div class="command-empty small"><span>No artist follow-ups are due.</span></div>';follows.slice(0,5).forEach(a=>{const r=document.createElement("button");r.type="button";r.className="command-row compact";r.innerHTML=`<span class="command-avatar">${escapeHtml((a.name||"?").slice(0,1).toUpperCase())}</span><span><strong>${escapeHtml(a.name)}</strong><small>${escapeHtml(a.status||"Artist")} · ${escapeHtml(a.followUp)}</small></span><b>›</b>`;r.onclick=()=>document.querySelector('[data-view="artists"]')?.click();followHost.appendChild(r);});
  }
  function buildPlan(){const api=window.StatusOS?.Planner;if(!api?.addMany)return;const today=isoToday(),existing=api.list().filter(x=>x.date===today),rows=[];let hour=9;priorities().filter(x=>!x.done).slice(0,3).forEach(x=>{rows.push({title:x.title,date:today,time:`${String(hour).padStart(2,"0")}:00`,category:"Priority"});hour++;});dueFollowups().slice(0,3).forEach(a=>{rows.push({title:`Follow up with ${a.name}`,date:today,time:`${String(hour).padStart(2,"0")}:00`,category:"Artist Follow-up"});hour++;});if(!rows.length&&!existing.length)rows.push({title:"Create one important win",date:today,time:"10:00",category:"Priority"});const created=api.addMany(rows);render();const msg=created.length?`Planned ${created.length} item${created.length===1?"":"s"} for today`:"Today is already planned";window.StatusOS?.Notify?.success?.(msg)||window.dispatchEvent(new CustomEvent("statusos:notify",{detail:{message:msg,type:"success"}}));}
  function bind(){$("planMyDayBtn")?.addEventListener("click",buildPlan);$("commandAddItemBtn")?.addEventListener("click",()=>{window.StatusOS?.Planner?.selectDate?.(isoToday());window.StatusOS?.Planner?.openAdd?.();});$("commandStartNextBtn")?.addEventListener("click",openPlanner);["statusos:planner-updated","statusos:artists-updated","statusos:app-ready"].forEach(name=>window.addEventListener(name,render));document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});render();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
})();
