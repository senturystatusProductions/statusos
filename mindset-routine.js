/* StatusOS v2.8.0 Daily Mindset Routine */
(function(){
  'use strict';
  const KEY='statusos_mindset_v1';
  const today=()=>new Date().toISOString().slice(0,10);
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{"days":{}}')}catch{return {days:{}}}}
  function write(data){localStorage.setItem(KEY,JSON.stringify(data));window.dispatchEvent(new CustomEvent('statusos:mindset-updated'));}
  function day(){const data=read();data.days ||= {};data.days[today()] ||= {morning:{checks:{}},night:{}};return [data,data.days[today()]];}
  function show(which){
    const morning=which==='morning';
    document.getElementById('morningMindsetPanel')?.classList.toggle('hidden',!morning);
    document.getElementById('nightMindsetPanel')?.classList.toggle('hidden',morning);
    document.getElementById('morningMindsetTab')?.classList.toggle('active',morning);
    document.getElementById('nightMindsetTab')?.classList.toggle('active',!morning);
  }
  function streak(days){let count=0,d=new Date();for(;;){const key=d.toISOString().slice(0,10),x=days[key];if(x?.morning?.complete&&x?.night?.complete){count++;d.setDate(d.getDate()-1)}else break;}return count;}
  function render(){
    const [data,current]=day();
    document.querySelectorAll('[data-mindset-check]').forEach(el=>el.checked=!!current.morning.checks?.[el.dataset.mindsetCheck]);
    const fields={morningGratitude:current.morning.gratitude||'',mindsetAction:current.morning.action||'',eveningWins:current.night.wins||'',eveningLesson:current.night.lesson||'',eveningEvidence:current.night.evidence||'',tomorrowPriority:current.night.priority||''};
    Object.entries(fields).forEach(([id,v])=>{const el=document.getElementById(id);if(el&&document.activeElement!==el)el.value=v});
    const done=Object.values(current.morning.checks||{}).filter(Boolean).length;
    const progress=document.getElementById('morningMindsetProgress');if(progress)progress.textContent=`${done} of 5 complete`;
    const bar=document.getElementById('morningMindsetBar');if(bar)bar.style.width=`${done*20}%`;
    const streakEl=document.getElementById('mindsetStreak');if(streakEl){const n=streak(data.days);streakEl.textContent=`${n} day streak`;}
  }
  function saveMorning(){
    const [data,current]=day();
    current.morning.checks={};document.querySelectorAll('[data-mindset-check]').forEach(el=>current.morning.checks[el.dataset.mindsetCheck]=el.checked);
    current.morning.gratitude=document.getElementById('morningGratitude')?.value.trim()||'';
    current.morning.action=document.getElementById('mindsetAction')?.value.trim()||'';
    current.morning.complete=Object.values(current.morning.checks).every(Boolean)&&Object.keys(current.morning.checks).length===5;
    current.morning.completedAt=current.morning.complete?new Date().toISOString():null;write(data);render();
  }
  function bind(){
    document.getElementById('morningMindsetTab')?.addEventListener('click',()=>show('morning'));
    document.getElementById('nightMindsetTab')?.addEventListener('click',()=>show('night'));
    document.querySelectorAll('[data-mindset-check]').forEach(el=>el.addEventListener('change',saveMorning));
    ['morningGratitude','mindsetAction'].forEach(id=>document.getElementById(id)?.addEventListener('input',saveMorning));
    document.getElementById('completeMorningMindset')?.addEventListener('click',()=>{saveMorning();const [,current]=day();const status=document.getElementById('morningMindsetStatus');if(status)status.textContent=current.morning.complete?'Morning routine complete. Now prove it with action.':'Complete all five steps first.';if(current.morning.complete)try{navigator.vibrate?.(15)}catch{}});
    document.getElementById('saveEveningResetBtn')?.addEventListener('click',()=>{const [data,current]=day();current.night={wins:document.getElementById('eveningWins')?.value.trim()||'',lesson:document.getElementById('eveningLesson')?.value.trim()||'',evidence:document.getElementById('eveningEvidence')?.value.trim()||'',priority:document.getElementById('tomorrowPriority')?.value.trim()||'',complete:true,completedAt:new Date().toISOString()};write(data);render();const el=document.getElementById('eveningResetStatus');if(el)el.textContent='Night routine saved. Tomorrow begins with a clear mind.';try{navigator.vibrate?.(15)}catch{}});
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
