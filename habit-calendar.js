(function(){
  const state={month:new Date(new Date().getFullYear(),new Date().getMonth(),1),habitId:null};
  const api=()=>window.StatusOS?.Habits;
  const key=d=>api()?.todayKey?.(d)||`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  function habits(){return api()?.list?.()||[];}
  function selected(){return habits().find(h=>h.id===state.habitId)||habits()[0]||null;}
  function populate(){
    const select=document.getElementById('habitCalendarSelect'); if(!select)return;
    const list=habits(); const current=state.habitId;
    select.innerHTML='';
    if(!list.length){select.innerHTML='<option value="">No habits yet</option>';state.habitId=null;return;}
    list.forEach(h=>{const o=document.createElement('option');o.value=h.id;o.textContent=h.name;select.append(o);});
    state.habitId=list.some(h=>h.id===current)?current:list[0].id; select.value=state.habitId;
  }
  async function toggleDate(dateKey){
    const h=selected(); if(!h)return;
    await api().save(api().toggleDate(h,dateKey)); render();
  }
  function render(){
    populate();
    const grid=document.getElementById('habitCalendarGrid'); if(!grid)return;
    const h=selected(); const today=new Date(); today.setHours(0,0,0,0);
    document.getElementById('habitCalendarMonth').textContent=state.month.toLocaleDateString(undefined,{month:'long',year:'numeric'});
    grid.innerHTML='';
    const first=new Date(state.month); const offset=(first.getDay()+6)%7;
    const start=new Date(first); start.setDate(first.getDate()-offset);
    let monthCount=0;
    for(let i=0;i<42;i++){
      const d=new Date(start); d.setDate(start.getDate()+i); d.setHours(0,0,0,0);
      const k=key(d), inMonth=d.getMonth()===state.month.getMonth(), checked=!!h?.completionDates?.includes(k), future=d>today;
      const b=document.createElement('button'); b.type='button'; b.className=`habit-calendar-day${inMonth?'':' outside'}${checked?' checked':''}${future?' future':''}`;
      b.innerHTML=`<span>${d.getDate()}</span>${checked?'<small>✓</small>':''}`;
      b.setAttribute('aria-label',`${checked?'Remove':'Add'} ${h?.name||'habit'} check-in for ${d.toLocaleDateString()}`);
      b.disabled=!h||future; if(!future&&h)b.addEventListener('click',()=>toggleDate(k)); grid.append(b);
      if(inMonth&&checked)monthCount++;
    }
    const summary=document.getElementById('habitCalendarSummary');
    if(summary) summary.textContent=h?`${monthCount} ${monthCount===1?'check-in':'check-ins'} for ${h.name} this month. Tap any past date to add or remove one.`:'Add a habit to begin tracking.';
  }
  window.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('habitCalendarSelect')?.addEventListener('change',e=>{state.habitId=e.target.value;render();});
    document.getElementById('habitCalendarPrev')?.addEventListener('click',()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);render();});
    document.getElementById('habitCalendarNext')?.addEventListener('click',()=>{const next=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);const now=new Date();if(next<=new Date(now.getFullYear(),now.getMonth(),1))state.month=next;render();});
    window.addEventListener('statusos:habits-updated',render); render();
  });
  window.addEventListener('statusos:view-change',render);
  window.StatusOS=window.StatusOS||{}; window.StatusOS.HabitCalendar={render};
})();
