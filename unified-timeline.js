/* StatusOS v3.1.0 Unified Timeline */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(Number(v||0));
  const asDate=v=>{if(!v)return null;const d=new Date(String(v).length===10?v+'T12:00:00':v);return Number.isNaN(d.getTime())?null:d};
  const iso=d=>{const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)};
  const storeKey='statusos_timeline_manual_v1';
  let filter='all',query='',range='30';
  function manual(){try{return JSON.parse(localStorage.getItem(storeKey)||'[]')}catch{return []}}
  function saveManual(rows){localStorage.setItem(storeKey,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('statusos:timeline-updated'));}
  function push(out,e){const d=asDate(e.date);if(!d)return;out.push({...e,date:d,id:e.id||`${e.category}-${d.getTime()}-${out.length}`});}
  function collect(){
    const out=[],s=window.state||{};
    (s.artists||[]).forEach(a=>{
      (a.activities||a.activity||[]).forEach(x=>push(out,{id:`artist-${a.id}-${x.id}`,category:'artists',kind:x.type||'Artist activity',title:x.title||x.type||'Artist update',detail:[a.name,x.details].filter(Boolean).join(' · '),date:x.date||x.createdAt||a.updatedAt,entity:a.name}));
      if(a.createdAt)push(out,{id:`artist-created-${a.id}`,category:'artists',kind:'Artist added',title:a.name||'Artist added',detail:a.status||'',date:a.createdAt,entity:a.name});
    });
    (s.projects||[]).forEach(p=>{
      push(out,{id:`project-created-${p.id}`,category:'projects',kind:'Project',title:p.name||p.title||'Project created',detail:[p.artist||p.client,p.status].filter(Boolean).join(' · '),date:p.createdAt||p.date||p.updatedAt,entity:p.name||p.title});
      (p.activity||[]).forEach(x=>push(out,{id:`project-${p.id}-${x.id}`,category:x.type==='Payment Received'?'finance':'projects',kind:x.type||'Project update',title:p.name||p.title||'Project',detail:x.detail||'',date:x.date,entity:p.name||p.title}));
    });
    (s.tasks||[]).forEach(t=>{
      const done=t.completedAt||(t.done?t.updatedAt||t.date:null);if(done)push(out,{id:`task-${t.id}`,category:'tasks',kind:'Task completed',title:t.text||t.title||'Task completed',detail:[t.project,t.artist].filter(Boolean).join(' · '),date:done,entity:t.project||t.artist||''});
    });
    (s.revenue||[]).forEach(r=>push(out,{id:`revenue-${r.id}`,category:'finance',kind:'Payment received',title:`${money(r.amount)} received`,detail:[r.source,r.name||r.client].filter(Boolean).join(' · '),date:r.date||r.createdAt,entity:r.name||r.client||''}));
    const planner=s.planner||s.dayPlan||s.plannerItems||[];
    (Array.isArray(planner)?planner:[]).forEach(p=>{if(p.done||p.completed)push(out,{id:`planner-${p.id}`,category:'planner',kind:'Planner completed',title:p.title||p.text||'Planner item',detail:p.time||'',date:p.completedAt||p.date,entity:''})});
    try{const success=JSON.parse(localStorage.getItem('statusos_success_os_v2')||'{}');Object.entries(success.days||{}).forEach(([day,x])=>{if(x.morning?.complete)push(out,{id:`success-morning-${day}`,category:'success',kind:'Morning ritual',title:'Morning Success OS completed',detail:x.morning.action?`Major win: ${x.morning.action}`:'Purpose, faith, and action',date:x.morning.completedAt||day});if(x.night?.complete)push(out,{id:`success-night-${day}`,category:'success',kind:'Night review',title:'Evening Success OS completed',detail:x.night.priority?`Tomorrow: ${x.night.priority}`:'Daily reflection completed',date:x.night.completedAt||day});});}catch{}
    manual().forEach(x=>push(out,{...x,category:x.category||'notes',kind:x.kind||'Manual note'}));
    return out.sort((a,b)=>b.date-a.date);
  }
  function filtered(){const now=new Date(),cut=range==='all'?null:new Date(now.getTime()-Number(range)*864e5);return collect().filter(x=>(filter==='all'||x.category===filter)&&(!cut||x.date>=cut)&&(!query||`${x.title} ${x.detail} ${x.kind} ${x.entity}`.toLowerCase().includes(query.toLowerCase())));}
  function label(day){const today=iso(new Date()),y=new Date();y.setDate(y.getDate()-1);if(day===today)return'Today';if(day===iso(y))return'Yesterday';return new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',year:new Date(day).getFullYear()===new Date().getFullYear()?undefined:'numeric'});}
  function render(){
    const rows=filtered(),host=$('unifiedTimelineFeed');if(!host)return;
    const today=iso(new Date()),todayRows=rows.filter(x=>iso(x.date)===today),weekCut=Date.now()-7*864e5,week=rows.filter(x=>x.date.getTime()>=weekCut),rev=week.filter(x=>x.category==='finance').reduce((n,x)=>{const m=x.title.match(/[\d,.]+/);return n+(m?Number(m[0].replace(/,/g,'')):0)},0);
    if($('timelineTodayCount'))$('timelineTodayCount').textContent=todayRows.length;
    if($('timelineWeekCount'))$('timelineWeekCount').textContent=week.length;
    if($('timelineRevenueCount'))$('timelineRevenueCount').textContent=money(rev);
    if($('timelineResultCount'))$('timelineResultCount').textContent=`${rows.length} event${rows.length===1?'':'s'}`;
    if(!rows.length){host.innerHTML='<article class="card timeline-empty"><strong>No timeline events found.</strong><span>Try a different filter, or add a manual note.</span></article>';return;}
    const groups={};rows.forEach(x=>{const k=iso(x.date);(groups[k]||=[]).push(x)});
    host.innerHTML=Object.entries(groups).map(([day,items])=>`<section class="timeline-day"><h3>${label(day)}</h3><div>${items.map(x=>`<article class="timeline-event"><span class="timeline-dot ${esc(x.category)}"></span><time>${x.date.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</time><div><small>${esc(x.kind)}</small><strong>${esc(x.title)}</strong>${x.detail?`<p>${esc(x.detail)}</p>`:''}</div>${x.manual?`<button type="button" data-remove-timeline="${esc(x.id)}" aria-label="Delete note">×</button>`:''}</article>`).join('')}</div></section>`).join('');
  }
  function addNote(){const title=prompt('Timeline note','');if(!title)return;const detail=prompt('Optional details','')||'';const rows=manual();rows.unshift({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),manual:true,category:'notes',kind:'Manual note',title,detail,date:new Date().toISOString()});saveManual(rows);render();}
  function bind(){
    document.querySelectorAll('[data-timeline-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.timelineFilter;document.querySelectorAll('[data-timeline-filter]').forEach(x=>x.classList.toggle('active',x===b));render()}));
    $('timelineSearch')?.addEventListener('input',e=>{query=e.target.value;render()});
    $('timelineRange')?.addEventListener('change',e=>{range=e.target.value;render()});
    $('addTimelineNoteBtn')?.addEventListener('click',addNote);
    $('unifiedTimelineFeed')?.addEventListener('click',e=>{const b=e.target.closest('[data-remove-timeline]');if(!b)return;if(!confirm('Delete this timeline note?'))return;saveManual(manual().filter(x=>x.id!==b.dataset.removeTimeline));render()});
    ['statusos:artists-updated','statusos:projects-updated','statusos:tasks-updated','statusos:success-updated','statusos:timeline-updated','statusos:view-change'].forEach(n=>window.addEventListener(n,e=>{if(n!=='statusos:view-change'||e.detail?.view==='timeline')render()}));
    render();
  }
  window.StatusOS=window.StatusOS||{};window.StatusOS.Timeline={render,collect};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
