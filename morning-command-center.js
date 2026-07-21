/* StatusOS v3.4.8 Morning Command Center */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function state(){try{return JSON.parse(localStorage.getItem("senturyStatusOS_v2")||"{}");}catch{return {};}}
  function artists(){try{return JSON.parse(localStorage.getItem("statusos_artists_v2")||"[]").filter(x=>!x.deletedAt);}catch{return [];}}
  function planner(){return window.StatusOS?.Planner?.list?.()||[];}
  function habits(){return window.StatusOS?.Habits?.list?.()||[];}
  function dateLabel(value){if(!value)return "No date";const d=new Date(`${value}T12:00:00`);return new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"}).format(d);}
  function go(view){document.querySelector(`[data-view="${view}"]`)?.click();}
  function row(item,index){return `<button type="button" class="morning-command-item" data-morning-view="${esc(item.view||"tasks")}"><span class="morning-command-index">${index+1}</span><span class="morning-command-copy"><strong>${esc(item.title)}</strong><small>${esc(item.detail||"")}</small></span><span class="morning-command-tag${item.urgent?" urgent":""}">${esc(item.tag||"")}</span></button>`;}
  function empty(text){return `<div class="morning-command-empty">${esc(text)}</div>`;}
  function getData(){
    const now=todayKey(),weekEnd=new Date();weekEnd.setDate(weekEnd.getDate()+7);const weekKey=`${weekEnd.getFullYear()}-${String(weekEnd.getMonth()+1).padStart(2,"0")}-${String(weekEnd.getDate()).padStart(2,"0")}`;
    const s=state(),daily=Array.isArray(s.daily?.priorities)?s.daily.priorities:[];
    const plan=planner();
    const overdue=plan.filter(x=>!x.completed&&x.date&&x.date<now).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const todayPlan=plan.filter(x=>!x.completed&&x.date===now).sort((a,b)=>String(a.time||"99:99").localeCompare(String(b.time||"99:99")));
    const followups=artists().filter(a=>a.followUp&&a.followUp<=now&&!["Won","Archived"].includes(a.status)).sort((a,b)=>String(a.followUp).localeCompare(String(b.followUp)));
    const priorities=[];
    overdue.slice(0,2).forEach(x=>priorities.push({title:x.title,detail:`Overdue since ${dateLabel(x.date)}`,tag:"OVERDUE",urgent:true,view:"planner"}));
    todayPlan.forEach(x=>priorities.push({title:x.title,detail:`${x.time||"Anytime"} · ${x.category||"Today"}`,tag:"TODAY",view:"planner"}));
    daily.filter(x=>!x.done).forEach(x=>priorities.push({title:x.title,detail:"Daily priority",tag:"FOCUS",view:"tasks"}));
    followups.forEach(a=>priorities.push({title:`Follow up with ${a.name}`,detail:`${a.status||"Artist"} · due ${dateLabel(a.followUp)}`,tag:"FOLLOW-UP",view:"artists"}));
    const seen=new Set(),ranked=priorities.filter(x=>{const k=x.title.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;}).slice(0,5);
    const dueHabits=habits().map(h=>({habit:h,progress:window.StatusOS?.Habits?.progress?.(h)||{count:0,target:h.target||1,complete:false}})).filter(x=>!x.progress.complete).sort((a,b)=>(b.progress.percent||0)-(a.progress.percent||0));
    const upcomingPlan=plan.filter(x=>!x.completed&&x.date>now&&x.date<=weekKey).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.time||"99:99").localeCompare(String(b.time||"99:99"))).map(x=>({title:x.title,detail:`${dateLabel(x.date)} · ${x.time||"Anytime"}`,tag:"PLANNER",view:"planner"}));
    const music=(window.StatusOS?.Music?.list?.()||[]).filter(x=>x.status!=="Complete"&&x.deadline&&x.deadline>now&&x.deadline<=weekKey).sort((a,b)=>String(a.deadline).localeCompare(String(b.deadline))).map(x=>({title:x.title||x.name||"Music project",detail:`Due ${dateLabel(x.deadline)}${x.client?` · ${x.client}`:""}`,tag:"PROJECT",view:"music"}));
    return {ranked,overdue,dueHabits,upcoming:[...upcomingPlan,...music].sort((a,b)=>a.detail.localeCompare(b.detail)).slice(0,6)};
  }
  function render(){
    if(!$('morningCommandPriorities'))return;
    const d=getData();
    $('morningPriorityCount').textContent=d.ranked.length;
    $('morningOverdueCount').textContent=d.overdue.length;
    $('morningHabitCount').textContent=d.dueHabits.length;
    $('morningUpcomingCount').textContent=d.upcoming.length;
    $('morningCommandTitle').textContent=d.ranked.length?"Here is what matters today.":"Your day is under control.";
    $('morningCommandSummary').textContent=d.overdue.length?`${d.overdue.length} overdue item${d.overdue.length===1?" needs":"s need"} attention before new work.`:d.ranked.length?`Start with ${d.ranked[0].title}. Complete the important work first.`:"No urgent work is waiting. Choose one meaningful win.";
    $('morningCommandPriorities').innerHTML=d.ranked.length?d.ranked.map(row).join(''):empty('No urgent priorities. Add a task or plan your day.');
    $('morningCommandHabits').innerHTML=d.dueHabits.length?d.dueHabits.slice(0,5).map((x,i)=>row({title:x.habit.name,detail:`${x.progress.count} of ${x.progress.target} this ${x.habit.period.replace('daily','day').replace('weekly','week').replace('monthly','month').replace('yearly','year')}`,tag:`${x.progress.percent||0}%`,view:'habits'},i)).join(''):empty('All current habit commitments are complete.');
    $('morningCommandUpcoming').innerHTML=d.upcoming.length?d.upcoming.map(row).join(''):empty('Nothing is scheduled in the next seven days.');
    document.querySelectorAll('[data-morning-view]').forEach(button=>button.onclick=()=>go(button.dataset.morningView));
  }
  function planDay(){
    const api=window.StatusOS?.Planner;if(!api?.addMany){go('planner');return;}
    const now=todayKey(),existing=api.list().filter(x=>x.date===now),data=getData();let hour=9;
    const rows=data.ranked.slice(0,3).filter(x=>!existing.some(e=>String(e.title).toLowerCase()===x.title.toLowerCase())).map(x=>({title:x.title,date:now,time:`${String(hour++).padStart(2,'0')}:00`,category:x.tag==='FOLLOW-UP'?'Artist Follow-up':'Priority'}));
    if(rows.length)api.addMany(rows);
    const msg=rows.length?`Added ${rows.length} priority${rows.length===1?'':'ies'} to today's planner.`:'Today is already planned.';
    window.StatusOS?.Notify?.success?.(msg)||window.dispatchEvent(new CustomEvent('statusos:notify',{detail:{message:msg,type:'success'}}));render();go('planner');
  }
  function bind(){
    $('morningPlanDayBtn')?.addEventListener('click',planDay);
    $('morningReviewBtn')?.addEventListener('click',()=>go('reset'));
    ['statusos:app-ready','statusos:planner-updated','statusos:tasks-updated','statusos:habits-updated','statusos:artists-updated','statusos:music-updated','statusos:view-change'].forEach(e=>window.addEventListener(e,render));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
