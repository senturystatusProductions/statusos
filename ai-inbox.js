/* StatusOS v2.6.0 AI Inbox + Guided Day */
(function(){
  "use strict";
  const $=id=>document.getElementById(id);
  const today=()=>new Date().toISOString().slice(0,10);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const buzz=()=>{try{navigator.vibrate?.(12);}catch{}};
  function workspace(){try{return JSON.parse(localStorage.getItem("senturyStatusOS_v2")||"{}");}catch{return {};}}
  function artists(){try{return JSON.parse(localStorage.getItem("statusos_artists_v2")||"[]").filter(a=>!a.deletedAt);}catch{return [];}}
  function planner(){return window.StatusOS?.Planner?.list?.()||[];}
  function smartTasks(){try{return JSON.parse(localStorage.getItem("statusos_smart_tasks_v1")||"[]");}catch{return [];}}
  function priorities(){const p=workspace().daily?.priorities;return Array.isArray(p)?p:[];}
  function data(){
    const d=today(), items=planner().filter(x=>x.date===d), open=items.filter(x=>!x.completed), done=items.length-open.length;
    const follows=artists().filter(a=>a.followUp&&a.followUp<=d&&!['Won','Archived'].includes(a.status));
    const pri=priorities().filter(x=>!x.done);
    const tasks=smartTasks().filter(x=>x.status!=="completed");
    const overdue=tasks.filter(x=>x.dueDate&&x.dueDate<d);
    return {items,open,done,follows,pri,tasks,overdue};
  }
  function chooseNext(d){
    if(d.open.length){const x=[...d.open].sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99"))[0];return {kind:'planner',id:x.id,title:x.title,detail:`${window.StatusOS?.Planner?.formatTime?.(x.time)||x.time||'Anytime'} · ${x.category||'Plan'}`,time:x.time||'',source:x};}
    if(d.overdue.length){const x=d.overdue[0];return {kind:'tasks',id:x.id,title:x.text||x.title,detail:'Overdue smart task',time:'',source:x};}
    if(d.pri.length){const x=d.pri[0];return {kind:'dashboard',title:x.title,detail:'First unfinished daily priority',time:'',source:x};}
    if(d.follows.length){const x=d.follows[0];return {kind:'crm',title:`Follow up with ${x.name}`,detail:`Artist follow-up due ${x.followUp}`,time:'',source:x};}
    return {kind:'planner',title:"Build today's plan",detail:'Create one meaningful win and give it a time.',time:'',source:null};
  }
  function render(){
    if(!$('aiInboxBrief'))return;
    const d=data(), next=chooseNext(d), pct=d.items.length?Math.round(d.done/d.items.length*100):0;
    const lines=[];
    lines.push(`<p><strong>${d.open.length}</strong> planner item${d.open.length===1?'':'s'} still open today.</p>`);
    if(d.follows.length)lines.push(`<p><strong>${d.follows.length}</strong> artist follow-up${d.follows.length===1?' is':'s are'} due.</p>`);
    if(d.overdue.length)lines.push(`<p><strong>${d.overdue.length}</strong> smart task${d.overdue.length===1?' is':'s are'} overdue.</p>`);
    if(d.pri.length)lines.push(`<p><strong>${d.pri.length}</strong> daily priorit${d.pri.length===1?'y remains':'ies remain'}.</p>`);
    if(!d.open.length&&!d.follows.length&&!d.overdue.length&&!d.pri.length)lines.push('<p><strong>Your urgent queue is clear.</strong> This is a good time for creative work or planning ahead.</p>');
    lines.push(`<p class="ai-inbox-progress-copy">Today's scheduled progress: <strong>${pct}%</strong>.</p>`);
    $('aiInboxBrief').innerHTML=lines.join('');
    $('aiInboxRecommendation').textContent=next.title;
    $('aiInboxReason').textContent=next.detail;
    $('aiInboxStatus').textContent=d.overdue.length||d.follows.length?'Attention':'Ready';
    window.StatusOS=window.StatusOS||{}; window.StatusOS.AIInbox={render,start:openGuide};
  }
  let queue=[],index=0;
  function buildQueue(){
    const d=data();
    queue=[...d.open].sort((a,b)=>(a.time||"99:99").localeCompare(b.time||"99:99")).map(x=>({kind:'planner',id:x.id,title:x.title,detail:x.category||'Planner item',time:x.time||''}));
    d.overdue.forEach(x=>queue.push({kind:'tasks',id:x.id,title:x.text||x.title,detail:'Overdue task',time:''}));
    d.follows.forEach(x=>queue.push({kind:'crm',title:`Follow up with ${x.name}`,detail:`Due ${x.followUp}`,time:''}));
    d.pri.forEach(x=>queue.push({kind:'dashboard',title:x.title,detail:'Daily priority',time:''}));
    if(!queue.length)queue=[{kind:'planner',title:'Create one important win',detail:'Your urgent queue is clear. Add a focused item to today.',time:''}];
  }
  function renderGuide(){
    const x=queue[index]; if(!x){$('guidedDayModal')?.close();render();return;}
    $('guidedDayHeading').textContent=index===0?'Start with this':'Keep moving';
    $('guidedDayCounter').textContent=`Step ${index+1} of ${queue.length}`;
    $('guidedDayProgressBar').style.width=`${Math.round(index/queue.length*100)}%`;
    $('guidedDayTitle').textContent=x.title;
    $('guidedDayDetail').textContent=x.detail;
    $('guidedDayTime').textContent=x.time?(window.StatusOS?.Planner?.formatTime?.(x.time)||x.time):'Next';
  }
  function openGuide(){buildQueue();index=0;renderGuide();$('guidedDayModal')?.showModal();buzz();}
  function openCurrent(){const x=queue[index];document.querySelector(`[data-view="${x?.kind||'today'}"]`)?.click();$('guidedDayModal')?.close();}
  function completeCurrent(){const x=queue[index];if(x?.kind==='planner'&&x.id)window.StatusOS?.Planner?.toggle?.(x.id);index++;buzz();renderGuide();}
  function skip(){index++;renderGuide();}
  function bind(){
    $('aiInboxStartBtn')?.addEventListener('click',openGuide);
    $('refreshAiInboxBtn')?.addEventListener('click',()=>{render();buzz();window.StatusOS?.Notify?.success?.('Daily brief refreshed');});
    $('guidedDayClose')?.addEventListener('click',()=>$('guidedDayModal')?.close());
    $('guidedDayOpenBtn')?.addEventListener('click',openCurrent);
    $('guidedDayCompleteBtn')?.addEventListener('click',completeCurrent);
    $('guidedDaySkipBtn')?.addEventListener('click',skip);
    ['statusos:planner-updated','statusos:artists-updated','statusos:app-ready'].forEach(n=>window.addEventListener(n,render));
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
