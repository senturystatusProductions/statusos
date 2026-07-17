/* StatusOS v1.7.0 Artist OS */
(function () {
  let selectedArtistId = window.StatusOS?.Workspace?.getSelectedArtist?.() || null;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const cleanDate = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString("en-CA", {month:"short",day:"numeric",year:"numeric"}) : "Not set";
  const isoToday = () => new Date().toISOString().slice(0,10);
  const statuses = ["New Lead","Contacted","Replied","Interested","Free Beat Sent","Negotiating","Client","Inactive"];
  const DRAFT_KEY = "statusos_artist_activity_drafts_v1";
  let saveTimer = null;
  function readDrafts(){ try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||"{}");}catch{return {};} }
  function getDraft(id){ return readDrafts()[id]||{}; }
  function setDraft(id,draft){ const all=readDrafts(); all[id]=draft; localStorage.setItem(DRAFT_KEY,JSON.stringify(all)); }
  function clearDraft(id){ const all=readDrafts(); delete all[id]; localStorage.setItem(DRAFT_KEY,JSON.stringify(all)); }
  function schedulePersist(artist){ clearTimeout(saveTimer); saveTimer=setTimeout(()=>persistArtist(artist),700); }


  function normalizeArtist(artist) {
    artist.email ||= "";
    artist.status ||= "New Lead";
    artist.notes ||= "";
    artist.createdAt ||= new Date().toISOString();
    artist.updatedAt ||= artist.createdAt;
    artist.activities = Array.isArray(artist.activities) ? artist.activities : [];
    artist.songs = Array.isArray(artist.songs) ? artist.songs : [];
    artist.beats = Array.isArray(artist.beats) ? artist.beats : [];
    return artist;
  }

  const repo=()=>window.StatusOS?.ArtistRepository;
  function all() { const rows=repo()?.list?.() || state.artists || []; rows.forEach(normalizeArtist); state.artists=rows; return rows; }
  function selected() { return all().find(a => a.id === selectedArtistId); }
  function persistArtist(artist) { repo()?.save?.(artist); state.artists=repo()?.list?.()||state.artists; window.dispatchEvent(new CustomEvent("statusos:artists-updated")); render(); }
  function addActivity(artist, type, title, details, date) {
    artist.activities.unshift({ id: uid(), type, title, details: details || "", date: date || isoToday(), createdAt: new Date().toISOString() });
    artist.lastContact = ["DM Sent","Email Sent","Follow-up","Reply Received","Beat Sent"].includes(type) ? (date || isoToday()) : artist.lastContact;
    artist.updatedAt = new Date().toISOString();
  }

  function renderStats() {
    const artists = all();
    const due = artists.filter(a => a.followUp && a.followUp <= isoToday() && a.status !== "Client" && a.status !== "Inactive").length;
    const contacted = artists.filter(a => !["New Lead","Inactive"].includes(a.status) || a.activities.length).length;
    const interested = artists.filter(a => ["Replied","Interested","Free Beat Sent","Negotiating","Client"].includes(a.status)).length;
    [["artistTotalCount",artists.length],["artistContactedCount",contacted],["artistInterestedCount",interested],["artistFollowupCount",due]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v;});
  }

  function filteredArtists() {
    const q=(document.getElementById("crmSearch")?.value||"").toLowerCase();
    const f=document.getElementById("crmFilter")?.value||"";
    return all().filter(a=>!f||a.status===f).filter(a=>!q||JSON.stringify(a).toLowerCase().includes(q)).sort((a,b)=>{
      const ad=a.followUp&&a.followUp<=isoToday()?0:1, bd=b.followUp&&b.followUp<=isoToday()?0:1;
      return ad-bd || String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
  }

  function renderDirectory() {
    const artists=filteredArtists(), box=document.getElementById("artistDirectory"), empty=document.getElementById("artistEmptyState");
    if(!box)return;
    document.getElementById("artistDirectoryCount").textContent=`${artists.length} artist${artists.length===1?"":"s"}`;
    empty?.classList.toggle("hidden", artists.length>0);
    box.innerHTML=artists.map(a=>{
      const due=a.followUp&&a.followUp<=isoToday()&&a.status!=="Client"&&a.status!=="Inactive";
      return `<button class="artist-directory-item ${a.id===selectedArtistId?"active":""}" data-artist-id="${a.id}">
        <span class="artist-avatar">${esc((a.name||"?").slice(0,1).toUpperCase())}</span>
        <span class="artist-directory-main"><strong>${esc(a.name)}</strong><small>${esc(a.contact||a.email||a.genre||"No contact added")}</small><span class="artist-status-chip">${esc(a.status)}</span></span>
        <span class="artist-directory-meta">${due?'<b class="followup-due">Follow up</b>':`<small>${esc(a.followUp?cleanDate(a.followUp):"No follow-up")}</small>`}</span>
      </button>`}).join("");
    box.querySelectorAll("[data-artist-id]").forEach(btn=>btn.addEventListener("click",()=>{selectedArtistId=btn.dataset.artistId;window.StatusOS?.Workspace?.saveSelectedArtist?.(selectedArtistId);render();}));
  }

  function activityIcon(type){return ({"Song Researched":"♫","DM Sent":"↗","Email Sent":"✉","Reply Received":"💬","Beat Sent":"◆","Follow-up":"↻","Note":"•","Call":"☎"})[type]||"•";}
  function renderWorkspace() {
    const a=selected(), empty=document.getElementById("artistWorkspaceEmpty"), content=document.getElementById("artistWorkspaceContent");
    if(!content)return;
    empty?.classList.toggle("hidden",!!a); content.classList.toggle("hidden",!a); if(!a)return;
    const draft=getDraft(a.id);
    const timeline=[...a.activities].sort((x,y)=>String(y.date).localeCompare(String(x.date))||String(y.createdAt).localeCompare(String(x.createdAt)));
    content.innerHTML=`
      <div class="artist-profile-head"><div class="artist-profile-identity"><span class="artist-avatar large">${esc(a.name.slice(0,1).toUpperCase())}</span><div><p class="eyebrow">ARTIST PROFILE</p><h2>${esc(a.name)}</h2><p class="muted">${esc([a.contact,a.email,a.genre].filter(Boolean).join(" · ")||"Add contact details")}</p></div></div><button class="mini-btn delete" id="deleteArtistBtn">Delete</button></div>
      <div class="artist-profile-controls">
        <label>Status<select id="artistStatusSelect">${statuses.map(x=>`<option ${a.status===x?"selected":""}>${x}</option>`).join("")}</select></label>
        <label>Next Follow-up<input id="artistFollowupInput" type="date" value="${esc(a.followUp||"")}"></label>
        <label>Instagram<input id="artistContactInput" value="${esc(a.contact||"")}" placeholder="@handle"></label>
        <label>Email<input id="artistEmailInput" type="email" value="${esc(a.email||"")}" placeholder="artist@email.com"></label>
      </div>
      <div class="artist-workspace-grid">
        <section><div class="section-head"><div><p class="eyebrow">ACTIVITY</p><h3>Relationship Timeline</h3></div></div>
          <form id="artistActivityForm" class="artist-activity-form"><select name="type">${["Song Researched","DM Sent","Email Sent","Reply Received","Beat Sent","Follow-up","Call","Note"].map(x=>`<option ${draft.type===x?"selected":""}>${x}</option>`).join("")}</select><input name="title" required placeholder="What happened?" value="${esc(draft.title||"")}"><input name="details" placeholder="Song, beat, email subject or notes" value="${esc(draft.details||"")}"><input name="date" type="date" value="${esc(draft.date||isoToday())}"><button class="button" type="submit">Log</button></form>
          <div class="artist-timeline">${timeline.length?timeline.map(x=>`<article class="artist-timeline-item"><span class="artist-timeline-icon">${activityIcon(x.type)}</span><div><div class="artist-timeline-title"><strong>${esc(x.title)}</strong><small>${esc(cleanDate(x.date))}</small></div><span class="artist-status-chip">${esc(x.type)}</span>${x.details?`<p>${esc(x.details)}</p>`:""}</div><button class="timeline-delete" data-delete-activity="${x.id}" title="Delete">×</button></article>`).join(""):'<div class="mission-v2-empty">No activity yet. Log the songs you heard or the message you sent.</div>'}</div>
        </section>
        <aside><div class="artist-notes-panel"><p class="eyebrow">RESEARCH NOTES</p><h3>Sound and preferences</h3><textarea id="artistNotesInput" rows="7" placeholder="Song references, beat preferences, lyrical style, personal details...">${esc(a.notes||"")}</textarea><button id="saveArtistNotesBtn" class="button secondary" type="button">Save Notes</button></div>
        <div class="artist-mini-summary"><div><span>Activities</span><strong>${a.activities.length}</strong></div><div><span>Songs researched</span><strong>${a.activities.filter(x=>x.type==="Song Researched").length}</strong></div><div><span>Beats sent</span><strong>${a.activities.filter(x=>x.type==="Beat Sent").length}</strong></div><div><span>Emails sent</span><strong>${a.activities.filter(x=>x.type==="Email Sent").length}</strong></div></div></aside>
      </div>`;
    bindWorkspace(a);
  }

  function bindWorkspace(a){
    document.getElementById("artistStatusSelect")?.addEventListener("change",e=>{a.status=e.target.value;a.updatedAt=new Date().toISOString();persistArtist(a);});
    document.getElementById("artistFollowupInput")?.addEventListener("change",e=>{a.followUp=e.target.value;a.updatedAt=new Date().toISOString();persistArtist(a);});
    document.getElementById("artistContactInput")?.addEventListener("input",e=>{a.contact=e.target.value.trim();a.updatedAt=new Date().toISOString();schedulePersist(a);});
    document.getElementById("artistEmailInput")?.addEventListener("input",e=>{a.email=e.target.value.trim();a.updatedAt=new Date().toISOString();schedulePersist(a);});
    document.getElementById("artistNotesInput")?.addEventListener("input",e=>{a.notes=e.target.value;a.updatedAt=new Date().toISOString();clearTimeout(saveTimer);saveTimer=setTimeout(()=>persistArtist(a),700);});
    document.getElementById("saveArtistNotesBtn")?.addEventListener("click",()=>{a.notes=document.getElementById("artistNotesInput").value.trim();a.updatedAt=new Date().toISOString();persistArtist(a);});
    const activityForm=document.getElementById("artistActivityForm");
    activityForm?.addEventListener("input",()=>setDraft(a.id,Object.fromEntries(new FormData(activityForm))));
    activityForm?.addEventListener("change",()=>setDraft(a.id,Object.fromEntries(new FormData(activityForm))));
    activityForm?.addEventListener("submit",e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));addActivity(a,d.type,d.title,d.details,d.date); clearDraft(a.id); if(d.type==="Reply Received"&&["New Lead","Contacted"].includes(a.status))a.status="Replied"; if(d.type==="Beat Sent")a.status="Free Beat Sent"; persistArtist(a);});
    document.querySelectorAll("[data-delete-activity]").forEach(btn=>btn.addEventListener("click",()=>{a.activities=a.activities.filter(x=>x.id!==btn.dataset.deleteActivity);persistArtist(a);}));
    document.getElementById("deleteArtistBtn")?.addEventListener("click",()=>{if(confirm(`Move ${a.name} to the Recycle Bin?`)){repo()?.softDelete?.(a.id);selectedArtistId=null;window.StatusOS?.Workspace?.saveSelectedArtist?.(null);state.artists=repo()?.list?.()||[];render();}});
  }

  function bindAddForm(){
    const form=document.getElementById("artistForm"); if(!form||form.dataset.artistOsBound)return; form.dataset.artistOsBound="1";
    form.addEventListener("submit",e=>{if(e.submitter?.value==="cancel")return;e.preventDefault();e.stopImmediatePropagation();const d=Object.fromEntries(new FormData(form));const a=normalizeArtist({id:uid(),...d,lastContact:d.status==="New Lead"?"":isoToday()});if(d.notes)addActivity(a,"Note","Artist added",d.notes,isoToday()); repo()?.save?.(a); state.artists=repo()?.list?.()||[]; selectedArtistId=a.id;window.StatusOS?.Workspace?.saveSelectedArtist?.(selectedArtistId);form.reset();form.closest("dialog")?.close();render();},true);
  }

  function render(){renderStats();renderDirectory();renderWorkspace();}
  async function init(){await repo()?.init?.();all();bindAddForm();document.getElementById("crmSearch")?.addEventListener("input",render);document.getElementById("crmFilter")?.addEventListener("change",render);const savedId=window.StatusOS?.Workspace?.getSelectedArtist?.();if(savedId&&all().some(a=>a.id===savedId))selectedArtistId=savedId;if(!selectedArtistId&&all().length)selectedArtistId=all()[0].id;window.StatusOS?.Workspace?.saveSelectedArtist?.(selectedArtistId);render();}
  window.addEventListener("DOMContentLoaded",init);
  window.addEventListener("statusos:view-change",e=>{if(e.detail?.view==="crm"||document.getElementById("crm")?.classList.contains("active"))render();});
  window.addEventListener("statusos:workspace-restore",e=>{const id=e.detail?.selectedArtistId;if(id&&all().some(a=>a.id===id)){selectedArtistId=id;render();}});
  window.StatusOS=window.StatusOS||{};window.StatusOS.ArtistOS={render,list:all}; window.addEventListener("statusos:artists-updated",()=>{state.artists=repo()?.list?.()||[];render();});
})();
