(function(){
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const cash=v=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(Number(v||0));
  const date=v=>v?new Date(v+'T12:00:00').toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'}):'No deadline';
  const uid=()=>crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random());
  let selectedId=null;

  function normalize(p){
    p.status=p.status||((Number(p.progress||0)>=100)?'Complete':'In Progress');
    p.artist=p.artist||p.client||'';
    p.budget=Number(p.budget||p.price||0);
    p.paid=Number(p.paid||0);
    p.notes=p.notes||'';
    p.deliverables=Array.isArray(p.deliverables)?p.deliverables:[];
    p.activity=Array.isArray(p.activity)?p.activity:[];
    p.resources=Array.isArray(p.resources)?p.resources:[];
    p.sessions=Array.isArray(p.sessions)?p.sessions:[];
    return p;
  }
  function tasksFor(p){return (window.StatusOS?.Tasks?.list?.()||window.StatusOS?.Storage?.getTasks?.()||[]).filter(t=>String(t.project||'').trim().toLowerCase()===String(p.name||'').trim().toLowerCase());}
  function progress(p){const ts=tasksFor(p);if(ts.length)return Math.round(ts.filter(t=>t.done||t.status==='completed').length/ts.length*100);const ds=p.deliverables||[];if(ds.length)return Math.round(ds.filter(d=>d.done).length/ds.length*100);return Math.max(0,Math.min(100,Number(p.progress||0)));}
  function activity(p,type,detail){p.activity.unshift({id:uid(),type,detail,date:new Date().toISOString()});p.activity=p.activity.slice(0,100);}
  function persist(){save();window.dispatchEvent(new CustomEvent('statusos:projects-updated'));rerender();}
  function project(id){return state.projects.find(x=>x.id===id);}
  function summary(){const box=$('projectCommandSummary');if(!box)return;const all=state.projects.map(normalize),active=all.filter(p=>p.status!=='Complete'&&progress(p)<100),due=active.filter(p=>p.deadline&&new Date(p.deadline+'T23:59:59')-Date.now()<7*864e5),balance=all.reduce((n,p)=>n+Math.max(0,p.budget-p.paid),0);box.innerHTML=`<article><span>Active</span><strong>${active.length}</strong></article><article><span>Due Soon</span><strong>${due.length}</strong></article><article><span>Outstanding</span><strong>${cash(balance)}</strong></article><article><span>Complete</span><strong>${all.filter(p=>p.status==='Complete'||progress(p)>=100).length}</strong></article>`;}

  window.renderProjects=function(){
    summary();
    const list=$('projectList'),work=$('projectWorkspace');if(!list)return;
    const items=state.projects.map(normalize);
    if(selectedId&&!items.some(p=>p.id===selectedId))selectedId=null;
    list.classList.toggle('hidden',!!selectedId);work?.classList.toggle('hidden',!selectedId);
    if(selectedId){renderWorkspace(items.find(p=>p.id===selectedId));return;}
    list.innerHTML=items.map(p=>{const pct=progress(p),bal=Math.max(0,p.budget-p.paid);return `<button class="card project-command-card" onclick="StatusOS.ProjectCommand.open('${p.id}')"><div class="project-card-top"><span class="status-pill">${esc(p.status)}</span><small>${esc(p.type||'Project')}</small></div><h3>${esc(p.name)}</h3><p>${esc(p.artist||'Independent')}</p><div class="meter"><span style="width:${pct}%"></span></div><div class="project-card-metrics"><strong>${pct}%</strong><span>${p.deadline?date(p.deadline):'No deadline'}</span><span>${bal?cash(bal)+' remaining':'Paid / no budget'}</span></div><div class="project-next"><span>NEXT ACTION</span><b>${esc(p.nextStep||'Set the next action')}</b></div></button>`}).join('')||'<article class="card"><p class="muted">No projects yet. Add your first project to create a command center.</p></article>';
  };

  function renderWorkspace(p){
    const work=$('projectWorkspace');if(!work||!p)return;
    const ts=tasksFor(p),pct=progress(p),bal=Math.max(0,p.budget-p.paid),ds=p.deliverables||[],resources=p.resources||[],sessions=p.sessions||[];
    work.innerHTML=`
      <button class="text-button project-back" onclick="StatusOS.ProjectCommand.back()">← All Projects</button>
      <article class="card project-workspace-hero"><div><p class="eyebrow">${esc(p.type||'PROJECT')}</p><h2>${esc(p.name)}</h2><p>${esc(p.artist||'Independent')} · ${esc(p.status)}</p></div><div class="project-progress-large"><strong>${pct}%</strong><span>complete</span></div></article>
      <article class="card project-settings-strip"><label>Status<select id="projectStatus"><option ${p.status==='Planning'?'selected':''}>Planning</option><option ${p.status==='In Progress'?'selected':''}>In Progress</option><option ${p.status==='Waiting'?'selected':''}>Waiting</option><option ${p.status==='On Hold'?'selected':''}>On Hold</option><option ${p.status==='Complete'?'selected':''}>Complete</option></select></label><label>Deadline<input id="projectDeadline" type="date" value="${esc(p.deadline||'')}"></label><button class="mini-btn" onclick="StatusOS.ProjectCommand.saveDetails('${p.id}')">Save Details</button></article>
      <div class="project-command-grid"><article class="card"><p class="eyebrow">NEXT ACTION</p><h3>${esc(p.nextStep||'Choose the next action')}</h3><div class="inline-edit"><input id="projectNextAction" value="${esc(p.nextStep||'')}"><button class="mini-btn" onclick="StatusOS.ProjectCommand.saveNext('${p.id}')">Save</button></div></article><article class="card project-money"><div><span>Budget</span><strong>${cash(p.budget)}</strong></div><div><span>Paid</span><strong>${cash(p.paid)}</strong></div><div><span>Balance</span><strong>${cash(bal)}</strong></div><button class="mini-btn" onclick="StatusOS.ProjectCommand.logPayment('${p.id}')">Log Payment</button></article></div>
      <div class="project-detail-grid"><article class="card"><div class="section-head"><div><p class="eyebrow">TASKS</p><h3>${ts.filter(t=>t.done).length} of ${ts.length} complete</h3></div><button class="mini-btn" onclick="StatusOS.ProjectCommand.addTask('${p.id}')">Add Task</button></div><div class="project-task-list">${ts.map(t=>`<label><input type="checkbox" ${t.done?'checked':''} onchange="StatusOS.ProjectCommand.toggleTask('${t.id}')"><span>${esc(t.text||t.title)}</span></label>`).join('')||'<p class="muted">No linked tasks yet.</p>'}</div></article><article class="card"><div class="section-head"><div><p class="eyebrow">DELIVERABLES</p><h3>${ds.filter(d=>d.done).length} of ${ds.length} complete</h3></div><button class="mini-btn" onclick="StatusOS.ProjectCommand.addDeliverable('${p.id}')">Add</button></div><div class="project-task-list">${ds.map(d=>`<label><input type="checkbox" ${d.done?'checked':''} onchange="StatusOS.ProjectCommand.toggleDeliverable('${p.id}','${d.id}')"><span>${esc(d.name)}</span></label>`).join('')||'<p class="muted">Add songs, mixes, masters, artwork, contracts, or other deliverables.</p>'}</div></article></div>
      <div class="project-detail-grid"><article class="card"><div class="section-head"><div><p class="eyebrow">RESOURCES</p><h3>Files and links</h3></div><button class="mini-btn" onclick="StatusOS.ProjectCommand.addResource('${p.id}')">Add Link</button></div><div class="project-resource-list">${resources.map(r=>`<div><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a><button aria-label="Remove resource" onclick="StatusOS.ProjectCommand.removeResource('${p.id}','${r.id}')">×</button></div>`).join('')||'<p class="muted">Add Google Drive folders, Dropbox links, contracts, reference tracks, or artwork.</p>'}</div></article><article class="card"><div class="section-head"><div><p class="eyebrow">SESSIONS</p><h3>${sessions.length} logged</h3></div><button class="mini-btn" onclick="StatusOS.ProjectCommand.addSession('${p.id}')">Log Session</button></div><div class="project-session-list">${sessions.map(s=>`<div><strong>${esc(s.title)}</strong><span>${esc(s.notes||'')}</span><small>${new Date(s.date).toLocaleString()}</small></div>`).join('')||'<p class="muted">Log recording, production, mixing, or review sessions here.</p>'}</div></article></div>
      <div class="project-detail-grid"><article class="card"><p class="eyebrow">NOTES</p><textarea id="projectNotes" rows="7" placeholder="Project notes...">${esc(p.notes)}</textarea><button class="mini-btn" onclick="StatusOS.ProjectCommand.saveNotes('${p.id}')">Save Notes</button></article><article class="card"><p class="eyebrow">ACTIVITY</p><div class="project-activity">${(p.activity||[]).map(a=>`<div><strong>${esc(a.type)}</strong><span>${esc(a.detail||'')}</span><small>${new Date(a.date).toLocaleString()}</small></div>`).join('')||'<p class="muted">Project activity will appear here.</p>'}</div></article></div>
      <div class="project-danger"><button class="mini-btn delete" onclick="StatusOS.ProjectCommand.remove('${p.id}')">Delete Project</button></div>`;
  }

  function rerender(){window.renderProjects();}
  window.StatusOS=window.StatusOS||{};
  function createProject(input={}){
    const p=normalize({
      id:uid(),
      name:String(input.name||'').trim(),
      artist:String(input.artist||'').trim(),
      artistId:input.artistId||null,
      type:String(input.type||'Project').trim()||'Project',
      status:String(input.status||'Planning').trim()||'Planning',
      deadline:String(input.deadline||'').trim(),
      budget:Number(input.budget||0),
      paid:Number(input.paid||0),
      progress:Number(input.progress||0),
      notes:String(input.notes||'').trim(),
      nextStep:String(input.nextStep||'').trim(),
      deliverables:[], activity:[], resources:[], sessions:[]
    });
    if(!p.name)return null;
    activity(p,'Project Created',input.source?`Created via ${input.source}`:'Project workspace created');
    state.projects.push(p);
    persist();
    return p;
  }

  window.StatusOS.ProjectCommand={
    create:createProject,
    open:id=>{selectedId=id;rerender();},
    back:()=>{selectedId=null;rerender();},
    saveDetails:id=>{const p=project(id);if(!p)return;p.status=$('projectStatus').value;p.deadline=$('projectDeadline').value;activity(p,'Project Details Updated',`${p.status}${p.deadline?' · '+date(p.deadline):''}`);persist();},
    saveNext:id=>{const p=project(id);if(!p)return;p.nextStep=$('projectNextAction').value.trim();activity(p,'Next Action Updated',p.nextStep);persist();},
    saveNotes:id=>{const p=project(id);if(!p)return;p.notes=$('projectNotes').value;activity(p,'Notes Updated','Project notes saved');persist();},
    logPayment:id=>{const p=project(id);if(!p)return;const amount=Number(prompt('Payment amount','0'));if(!amount||amount<0)return;p.paid=Number(p.paid||0)+amount;state.revenue.push({id:uid(),date:new Date().toISOString().slice(0,10),source:'Project Payment',name:p.name,amount});activity(p,'Payment Received',cash(amount));persist();},
    addDeliverable:id=>{const p=project(id),name=prompt('Deliverable name','');if(!p||!name)return;p.deliverables.push({id:uid(),name:name.trim(),done:false});activity(p,'Deliverable Added',name.trim());persist();},
    toggleDeliverable:(id,did)=>{const p=project(id),d=p?.deliverables.find(x=>x.id===did);if(!d)return;d.done=!d.done;activity(p,d.done?'Deliverable Completed':'Deliverable Reopened',d.name);if(progress(p)>=100)p.status='Complete';persist();},
    addResource:id=>{const p=project(id);if(!p)return;const name=prompt('Link name','Project Files');if(!name)return;let url=prompt('Paste the full link','https://');if(!url)return;url=url.trim();if(!/^https?:\/\//i.test(url))url='https://'+url;p.resources.unshift({id:uid(),name:name.trim(),url});activity(p,'Resource Added',name.trim());persist();},
    removeResource:(id,rid)=>{const p=project(id);if(!p)return;p.resources=p.resources.filter(r=>r.id!==rid);activity(p,'Resource Removed','Project link removed');persist();},
    addSession:id=>{const p=project(id);if(!p)return;const title=prompt('Session type or title','Studio Session');if(!title)return;const notes=prompt('What was completed?','')||'';p.sessions.unshift({id:uid(),title:title.trim(),notes:notes.trim(),date:new Date().toISOString()});activity(p,'Session Logged',title.trim());persist();},
    addTask:id=>{const p=project(id);if(!p)return;window.StatusOS?.Tasks?.openAdd?.();setTimeout(()=>{const f=$('smartTaskForm');if(f?.elements?.project)f.elements.project.value=p.name;if(f?.elements?.artist)f.elements.artist.value=p.artist||'';},60);},
    toggleTask:id=>window.StatusOS?.Tasks?.complete?.(id),
    remove:id=>{if(!confirm('Delete this project?'))return;state.projects=state.projects.filter(x=>x.id!==id);selectedId=null;persist();}
  };
  window.addEventListener('statusos:tasks-updated',rerender);
  document.addEventListener('DOMContentLoaded',()=>{state.projects.forEach(normalize);setTimeout(rerender,0);const form=$('projectForm');form?.addEventListener('submit',()=>setTimeout(()=>{const p=state.projects[state.projects.length-1];if(p){normalize(p);activity(p,'Project Created','Project workspace created');persist();}},0));});
})();
