/* StatusOS v4.0.0 Artist CRM Pro */
(function () {
  "use strict";

  const STAGES = ["New Lead", "Contacted", "Free Beat Sent", "Interested", "Negotiating", "Client", "Returning Client"];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money = value => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Number(value || 0));
  const today = () => new Date().toISOString().slice(0, 10);
  const repo = () => window.StatusOS?.ArtistRepository;
  let activeMode = localStorage.getItem("statusos_crm_view_v1") || "directory";

  function artists() { return repo()?.list?.() || window.state?.artists || []; }
  function daysSince(value) {
    if (!value) return 999;
    const date = new Date(`${value}T12:00:00`);
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
  }
  function scoreArtist(a) {
    let score = 20;
    if (["Interested", "Negotiating"].includes(a.status)) score += 28;
    if (["Client", "Returning Client"].includes(a.status)) score += 38;
    if (a.relationship === "Hot Lead") score += 18;
    if (a.relationship === "VIP") score += 24;
    if (Number(a.revenue || 0) > 0) score += Math.min(20, Math.round(Number(a.revenue) / 250));
    const replies = (a.activities || []).filter(x => !x.deletedAt && x.type === "Reply Received").length;
    score += Math.min(12, replies * 4);
    const age = daysSince(a.lastContact);
    if (age <= 3) score += 12;
    else if (age <= 7) score += 8;
    else if (age <= 14) score += 4;
    else if (age > 30) score -= 12;
    if (a.followUp && a.followUp <= today()) score += 5;
    if (a.status === "Inactive") score = Math.min(score, 25);
    return Math.max(0, Math.min(100, score));
  }
  function scoreLabel(score) {
    if (score >= 85) return "Priority relationship";
    if (score >= 70) return "Strong opportunity";
    if (score >= 50) return "Warm relationship";
    if (score >= 30) return "Developing lead";
    return "Cold lead";
  }
  function ensureUI() {
    const section = document.getElementById("crm");
    const tracker = document.getElementById("artistContactTracker");
    if (!section || !tracker || document.getElementById("crmProToolbar")) return;

    const toolbar = document.createElement("div");
    toolbar.id = "crmProToolbar";
    toolbar.className = "crm-pro-toolbar";
    toolbar.innerHTML = `
      <div class="crm-pro-view-switch" role="group" aria-label="Artist CRM view">
        <button type="button" data-crm-mode="directory">Directory</button>
        <button type="button" data-crm-mode="pipeline">Pipeline</button>
      </div>
      <div class="crm-pro-summary" id="crmProSummary"></div>`;
    tracker.insertAdjacentElement("afterend", toolbar);

    const pipeline = document.createElement("section");
    pipeline.id = "crmPipelineView";
    pipeline.className = "crm-pipeline-view hidden";
    pipeline.innerHTML = `<div class="crm-pipeline-head"><div><p class="eyebrow">SALES PIPELINE</p><h3>Move relationships forward</h3></div><small class="muted">Drag artists between stages</small></div><div id="crmPipelineBoard" class="crm-pipeline-board"></div>`;
    const layout = section.querySelector(".artist-os-layout");
    layout?.insertAdjacentElement("beforebegin", pipeline);

    toolbar.querySelectorAll("[data-crm-mode]").forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.crmMode)));
    setMode(activeMode);
  }
  function setMode(mode) {
    activeMode = mode === "pipeline" ? "pipeline" : "directory";
    localStorage.setItem("statusos_crm_view_v1", activeMode);
    document.querySelectorAll("[data-crm-mode]").forEach(btn => btn.classList.toggle("active", btn.dataset.crmMode === activeMode));
    document.querySelector("#crm .artist-os-layout")?.classList.toggle("hidden", activeMode === "pipeline");
    document.getElementById("crmPipelineView")?.classList.toggle("hidden", activeMode !== "pipeline");
    if (activeMode === "pipeline") renderPipeline();
  }
  function renderSummary() {
    const rows = artists();
    const pipelineValue = rows.filter(a => !["Inactive"].includes(a.status)).reduce((sum, a) => sum + Number(a.potentialValue || a.revenue || 0), 0);
    const due = rows.filter(a => a.followUp && a.followUp <= today() && a.status !== "Inactive").length;
    const priority = rows.filter(a => scoreArtist(a) >= 70).length;
    const node = document.getElementById("crmProSummary");
    if (node) node.innerHTML = `<span><strong>${priority}</strong> priority</span><span><strong>${due}</strong> due</span><span><strong>${money(pipelineValue)}</strong> pipeline</span>`;
  }
  function renderPipeline() {
    const board = document.getElementById("crmPipelineBoard");
    if (!board) return;
    const rows = artists();
    board.innerHTML = STAGES.map(stage => {
      const stageRows = rows.filter(a => a.status === stage).sort((a,b) => scoreArtist(b)-scoreArtist(a));
      const total = stageRows.reduce((sum,a)=>sum+Number(a.potentialValue || a.revenue || 0),0);
      return `<section class="crm-pipeline-column" data-pipeline-stage="${esc(stage)}">
        <header><div><strong>${esc(stage)}</strong><small>${stageRows.length} artist${stageRows.length===1?'':'s'}</small></div><span>${money(total)}</span></header>
        <div class="crm-pipeline-dropzone">${stageRows.map(a => {
          const score = scoreArtist(a);
          return `<article class="crm-pipeline-card" draggable="true" data-pipeline-artist="${esc(a.id)}">
            <div class="crm-pipeline-card-head"><strong>${esc(a.name)}</strong><span>${score}</span></div>
            <small>${esc(a.contact || a.email || a.genre || "No contact")}</small>
            <div class="crm-score-bar"><i style="width:${score}%"></i></div>
            <footer><span>${esc(scoreLabel(score))}</span><b>${money(a.potentialValue || a.revenue || 0)}</b></footer>
          </article>`;
        }).join("") || `<div class="crm-pipeline-empty">Drop artist here</div>`}</div>
      </section>`;
    }).join("");

    board.querySelectorAll("[data-pipeline-artist]").forEach(card => {
      card.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", card.dataset.pipelineArtist); card.classList.add("dragging"); });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      card.addEventListener("click", () => openArtist(card.dataset.pipelineArtist));
    });
    board.querySelectorAll("[data-pipeline-stage]").forEach(column => {
      column.addEventListener("dragover", e => { e.preventDefault(); column.classList.add("drag-over"); });
      column.addEventListener("dragleave", () => column.classList.remove("drag-over"));
      column.addEventListener("drop", e => {
        e.preventDefault(); column.classList.remove("drag-over");
        const id = e.dataTransfer.getData("text/plain");
        const artist = repo()?.get?.(id);
        if (!artist || artist.status === column.dataset.pipelineStage) return;
        artist.status = column.dataset.pipelineStage;
        artist.updatedAt = new Date().toISOString();
        repo()?.save?.(artist);
        renderAll();
      });
    });
  }
  function openArtist(id) {
    window.StatusOS?.Workspace?.saveSelectedArtist?.(id);
    setMode("directory");
    const button = document.querySelector(`[data-artist-id="${CSS.escape(id)}"]`);
    button?.click();
  }
  function decorateDirectory() {
    document.querySelectorAll("#artistDirectory [data-artist-id]").forEach(item => {
      if (item.querySelector(".crm-relationship-score")) return;
      const artist = repo()?.get?.(item.dataset.artistId);
      if (!artist) return;
      const score = scoreArtist(artist);
      const badge = document.createElement("span");
      badge.className = "crm-relationship-score";
      badge.title = scoreLabel(score);
      badge.textContent = score;
      item.querySelector(".artist-directory-meta")?.prepend(badge);
    });
  }
  function renderAll() {
    ensureUI();
    renderSummary();
    if (activeMode === "pipeline") renderPipeline();
    requestAnimationFrame(decorateDirectory);
  }
  const observer = new MutationObserver(() => requestAnimationFrame(decorateDirectory));
  function init() {
    ensureUI(); renderAll();
    const directory = document.getElementById("artistDirectory");
    if (directory) observer.observe(directory, { childList: true, subtree: true });
    window.addEventListener("statusos:artists-updated", renderAll);
    window.addEventListener("statusos:artists-ready", renderAll);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.StatusOS = window.StatusOS || {};
  window.StatusOS.CRMPro = { render: renderAll, scoreArtist, setMode };
})();
