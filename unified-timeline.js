/* StatusOS v4.6.0 Unified Timeline powered by Knowledge Engine */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(Number(v||0));
  const iso=d=>{const x=new Date(d);return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  let filter='all',query='',range='30';
  const engine=()=>window.StatusOS?.Knowledge;
  function rows(){ engine()?.snapshotFromState(); return (engine()?.query({category:filter,query,days:range})||[]).map(x=>({...x,date:new Date(x.date)})); }
  function label(day){const today=iso(new Date()),y=new Date();y.setDate(y.getDate()-1);if(day===today)return'Today';if(day===iso(y))return'Yesterday';return new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric',year:new Date(day).getFullYear()===new Date().getFullYear()?undefined:'numeric'});}
  function render(){
    const data=rows(),host=$('unifiedTimelineFeed');if(!host)return;
    const today=iso(new Date()),weekCut=Date.now()-7*864e5,week=data.filter(x=>x.date.getTime()>=weekCut);
    const rev=week.filter(x=>x.category==='finance').reduce((n,x)=>n+Number(x.metadata?.amount||0),0);
    $('timelineTodayCount')&&($('timelineTodayCount').textContent=data.filter(x=>iso(x.date)===today).length);
    $('timelineWeekCount')&&($('timelineWeekCount').textContent=week.length);
    $('timelineRevenueCount')&&($('timelineRevenueCount').textContent=money(rev));
    $('timelineResultCount')&&($('timelineResultCount').textContent=`${data.length} event${data.length===1?'':'s'}`);
    if(!data.length){host.innerHTML='<article class="card timeline-empty"><strong>No timeline events found.</strong><span>Try another filter or add a note.</span></article>';return;}
    const groups={};data.forEach(x=>(groups[iso(x.date)]||=[]).push(x));
    host.innerHTML=Object.entries(groups).map(([day,items])=>`<section class="timeline-day"><h3>${label(day)}</h3><div>${items.map(x=>`<article class="timeline-event"><span class="timeline-dot ${esc(x.category)}"></span><time>${x.date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time><div><small>${esc(x.kind)}</small><strong>${esc(x.title)}</strong>${x.detail?`<p>${esc(x.detail)}</p>`:''}${x.entity?.name?`<span class="muted small">${esc(x.entity.name)}</span>`:''}</div>${x.manual?`<button type="button" data-remove-timeline="${esc(x.id)}" aria-label="Delete note">×</button>`:''}</article>`).join('')}</div></section>`).join('');
  }
  function addNote(){const title=prompt('Timeline note','');if(!title)return;const detail=prompt('Optional details','')||'';engine()?.record({manual:true,category:'notes',kind:'Manual note',title,detail,date:new Date().toISOString(),source:'user',entity:{type:'note'}});render();}
  function bind(){
    document.querySelectorAll('[data-timeline-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.timelineFilter;document.querySelectorAll('[data-timeline-filter]').forEach(x=>x.classList.toggle('active',x===b));render()}));
    $('timelineSearch')?.addEventListener('input',e=>{query=e.target.value;render()});
    $('timelineRange')?.addEventListener('change',e=>{range=e.target.value;render()});
    $('addTimelineNoteBtn')?.addEventListener('click',addNote);
    $('unifiedTimelineFeed')?.addEventListener('click',e=>{const b=e.target.closest('[data-remove-timeline]');if(!b||!confirm('Delete this timeline note?'))return;engine()?.remove(b.dataset.removeTimeline);render()});
    ['statusos:timeline-updated','statusos:view-change'].forEach(n=>window.addEventListener(n,e=>{if(n!=='statusos:view-change'||e.detail?.view==='timeline')render()}));
    render();
  }
  window.StatusOS=window.StatusOS||{};window.StatusOS.Timeline={render,collect:()=>engine()?.all()||[],contextFor:(type,id,limit)=>engine()?.contextFor(type,id,limit)||[]};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
