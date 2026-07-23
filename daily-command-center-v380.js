/* StatusOS v3.8.0 Daily Command Center */
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today=()=>new Date().toISOString().slice(0,10);
  function workspace(){try{return JSON.parse(localStorage.getItem('senturyStatusOS_v2')||'{}');}catch{return {};}}
  function tasks(){try{return window.StatusOS?.Storage?.getTasks?.()||[];}catch{return [];}}
  function artists(){try{return JSON.parse(localStorage.getItem('statusos_artists_v2')||'[]').filter(a=>!a.deletedAt);}catch{return [];}}
  function habits(){try{return window.StatusOS?.Habits?.getHabits?.()||JSON.parse(localStorage.getItem('statusos_habits_v1')||'[]');}catch{return [];}}
  function openView(view){document.querySelector(`[data-view="${view}"]`)?.click();document.querySelector(`[data-ios-view="${view}"]`)?.click();}
  function showDialog(id){const d=$(id);if(d?.showModal)d.showModal();}

  function rebuildNav(){
    const nav=$('nav'); if(!nav)return;
    const developer=$('developerNav');
    nav.innerHTML=`
      <button class="nav-item active" data-view="dashboard">Daily Command Center</button>
      <details class="nav-group" open><summary>Today</summary><div class="nav-group-items">
        <button class="nav-item" data-view="today">Today Queue</button>
        <button class="nav-item" data-view="planner">Focus Planner</button>
        <button class="nav-item" data-view="habits">Daily Habits</button>
        <button class="nav-item" data-view="reset">Success OS</button>
      </div></details>
      <details class="nav-group"><summary>Business</summary><div class="nav-group-items">
        <button class="nav-item" data-view="crm">Artist Leads</button>
        <button class="nav-item" data-view="projects">Projects</button>
        <button class="nav-item" data-view="music">Beat Catalog</button>
        <button class="nav-item" data-view="sales">Sales Pipeline</button>
        <button class="nav-item" data-view="revenue">Finances</button>
        <button class="nav-item" data-view="content">Content Planner</button>
      </div></details>
      <details class="nav-group"><summary>Tools</summary><div class="nav-group-items">
        <button class="nav-item" data-view="assistant">AI Assistant</button>
        <button class="nav-item" data-view="tasks">Task Engine</button>
        <button class="nav-item" data-view="timeline">Timeline</button>
        <button class="nav-item" data-view="review">Weekly Review</button>
        <button class="nav-item" data-view="goals">Goals</button>
        <button class="nav-item" data-view="templates">Templates</button>
        <button class="nav-item" data-view="settings">Settings</button>
      </div></details>`;
    if(developer)nav.appendChild(developer);
  }

  function insertCommandCenter(){
    const dashboard=$('dashboard'); if(!dashboard||$('dailyCommandCenter380'))return;
    const welcome=dashboard.querySelector('.dashboard-welcome');
    const section=document.createElement('section');
    section.id='dailyCommandCenter380'; section.className='dcc380';
    section.innerHTML=`
      <article class="card dcc380-hero">
        <div><p class="eyebrow">DAILY COMMAND CENTER</p><h2 id="dccGreeting">Good morning, Sam.</h2><p id="dccSummary" class="muted">Here is what matters today.</p></div>
        <div class="dcc380-hero-actions"><button class="button" id="dccStartFocus">Start Focus</button><button class="button secondary" id="dccStartWorkout">Start Workout</button></div>
      </article>
      <div class="dcc380-grid">
        <article class="card dcc380-big3"><div class="section-head"><div><p class="eyebrow">TODAY'S BIG 3</p><h3>Finish these first</h3></div><button class="text-button" id="dccEditBig3">Edit</button></div><div id="dccBig3List" class="dcc380-list"></div></article>
        <article class="card dcc380-next"><div class="section-head"><div><p class="eyebrow">NEXT ACTION</p><h3>Continue where you left off</h3></div></div><div id="dccNextAction"></div></article>
      </div>
      <article class="card dcc380-queue"><div class="section-head"><div><p class="eyebrow">TODAY'S QUEUE</p><h3>Everything needing attention</h3></div><button class="text-button" id="dccOpenToday">Open Today</button></div><div id="dccQueue" class="dcc380-queue-grid"></div></article>`;
    welcome?.insertAdjacentElement('afterend',section);
    $('dccStartFocus').onclick=()=>openView('planner');
    $('dccStartWorkout').onclick=()=>{openView('planner');setTimeout(()=>document.querySelector('[data-performance-mode="boxing"], [data-mode="boxing"]')?.click(),250);};
    $('dccEditBig3').onclick=()=>openView('tasks');
    $('dccOpenToday').onclick=()=>openView('today');
  }

  function render(){
    if(!$('dailyCommandCenter380'))return;
    const hour=new Date().getHours(); const part=hour<12?'morning':hour<18?'afternoon':'evening';
    $('dccGreeting').textContent=`Good ${part}, Sam.`;
    const all=tasks(); const open=all.filter(t=>!t.done); const rank={critical:0,high:1,medium:2,low:3};
    open.sort((a,b)=>(rank[a.priority]??2)-(rank[b.priority]??2)||String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));
    const ws=workspace(); const legacy=(ws.daily?.priorities||[]).filter(x=>!x.done).map(x=>({text:x.title,id:x.id,legacy:true}));
    const big3=[...open,...legacy].slice(0,3);
    $('dccBig3List').innerHTML=big3.length?big3.map((t,i)=>`<button class="dcc380-row" data-task-id="${esc(t.id)}"><span>${i+1}</span><strong>${esc(t.text||t.title)}</strong><small>${esc(t.priority||'priority')}</small></button>`).join(''):`<div class="dcc380-empty">Your Big 3 is clear. Add a task to plan the day.</div>`;
    $('dccBig3List').querySelectorAll('.dcc380-row').forEach(el=>el.onclick=()=>openView('tasks'));
    const next=open.find(t=>t.status==='in_progress')||open[0];
    const project=(ws.projects||[]).find(p=>Number(p.progress||0)<100);
    $('dccNextAction').innerHTML=next?`<div class="dcc380-next-body"><span>Task</span><strong>${esc(next.text)}</strong><small>${next.project?esc(next.project):`${Number(next.estimatedMinutes)||30} min`}</small><button class="button" id="dccResume">Resume</button></div>`:project?`<div class="dcc380-next-body"><span>Project</span><strong>${esc(project.name)}</strong><small>${esc(project.nextStep||'Continue project')}</small><button class="button" id="dccResume">Resume</button></div>`:`<div class="dcc380-empty">Nothing urgent. Choose your next meaningful action.</div>`;
    $('dccResume')?.addEventListener('click',()=>openView(next?'tasks':'projects'));
    const due=open.filter(t=>t.dueDate&&t.dueDate<=today()).length;
    const follow=artists().filter(a=>{const d=a.followUpDate||a.nextFollowUp||a.next_follow_up;return d&&d<=today();}).length;
    const activeProjects=(ws.projects||[]).filter(p=>Number(p.progress||0)<100).length;
    const habitList=habits(); const habitsDue=habitList.filter(h=>!h.done&&!h.completedToday).length;
    const queue=[['Tasks due',due||open.length,'tasks'],['Artist follow-ups',follow,'crm'],['Active projects',activeProjects,'projects'],['Habits remaining',habitsDue,'habits']];
    $('dccQueue').innerHTML=queue.map(([label,count,view])=>`<button class="dcc380-queue-item" data-jump="${view}"><strong>${count}</strong><span>${label}</span></button>`).join('');
    $('dccQueue').querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>openView(b.dataset.jump));
    $('dccSummary').textContent=`${open.length} open tasks · ${follow} follow-ups · ${activeProjects} active projects`;
  }

  function installQuickCapture(){
    const btn=$('iosQuickAddBtn'); if(!btn)return;
    let dialog=$('quickCapture380');
    if(!dialog){dialog=document.createElement('dialog');dialog.id='quickCapture380';dialog.className='modal quick-capture-380';dialog.innerHTML=`<div class="quick-capture-shell"><div class="section-head"><div><p class="eyebrow">QUICK CAPTURE</p><h2>Add something</h2></div><button class="icon-btn" id="qc380Close" type="button">×</button></div><div class="quick-capture-grid"><button data-qc="task"><span>✓</span><b>Task</b></button><button data-qc="artist"><span>◎</span><b>Artist</b></button><button data-qc="project"><span>◇</span><b>Project</b></button><button data-qc="note"><span>✎</span><b>Note</b></button><button data-qc="expense"><span>$</span><b>Expense</b></button><button data-qc="workout"><span>⚡</span><b>Workout</b></button></div></div>`;document.body.appendChild(dialog);}
    btn.onclick=e=>{e.preventDefault();dialog.showModal();};
    $('qc380Close').onclick=()=>dialog.close();
    const actions={task:()=>window.StatusOS?.Tasks?.openAdd?.()||showDialog('smartTaskModal'),artist:()=>showDialog('artistModal'),project:()=>showDialog('projectModal'),expense:()=>showDialog('expenseModal'),workout:()=>{openView('planner');},note:()=>{openView('today');setTimeout(()=>showDialog('plannerModal'),150);}};
    dialog.querySelectorAll('[data-qc]').forEach(b=>b.onclick=()=>{dialog.close();actions[b.dataset.qc]?.();});
  }

  function cleanDashboard(){
    document.body.classList.add('statusos-v380');
    const old=document.querySelector('.morning-command-center'); if(old)old.classList.add('dcc380-secondary');
    const exec=$('executiveDashboard'); if(exec)exec.classList.add('dcc380-secondary');
    const details=document.querySelector('.mission-supporting-details'); if(details)details.open=false;
    const pageTitle=$('pageTitle'); if(pageTitle&&pageTitle.textContent==='Mission Control')pageTitle.textContent='Daily Command Center';
  }

  function init(){rebuildNav();insertCommandCenter();installQuickCapture();cleanDashboard();render();
    ['statusos:tasks-updated','statusos:artists-updated','statusos:habits-updated','statusos:workspace-updated'].forEach(n=>window.addEventListener(n,render));
    setInterval(render,60000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,50),{once:true});else setTimeout(init,50);
})();
