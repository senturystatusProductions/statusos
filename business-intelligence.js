/* StatusOS v5.0.0 Business Intelligence Foundation */
(function () {
  "use strict";

  const GRAPH_KEY = "statusos_business_graph_v1";
  const clean = value => String(value ?? "").trim();
  const lower = value => clean(value).toLowerCase();
  const now = () => new Date().toISOString();
  const safeJson = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };
  const daysSince = value => {
    if (!value) return null;
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return null;
    return Math.max(0, Math.floor((Date.now() - time) / 86400000));
  };
  const dateOnly = value => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  };
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  function appState() {
    return safeJson("senturyStatusOS_v2", {});
  }

  function artists() {
    const api = window.StatusOS?.ArtistOS?.list?.() || window.StatusOS?.ArtistRepository?.list?.();
    return (Array.isArray(api) ? api : safeJson("statusos_artists_v2", [])).filter(x => !x?.deletedAt);
  }

  function projects() {
    const state = appState();
    const sources = [
      ...(Array.isArray(state.projects) ? state.projects : []),
      ...safeJson("statusos_projects_v1", []),
      ...safeJson("statusos_music_projects_v1", [])
    ];
    const map = new Map();
    sources.forEach(p => {
      if (!p) return;
      const id = clean(p.id) || `project:${lower(p.name || p.title)}`;
      if (!id) return;
      map.set(id, { ...map.get(id), ...p, id });
    });
    return [...map.values()].filter(p => !p.deletedAt);
  }

  function tasks() {
    const state = appState();
    const sources = [
      ...safeJson("statusos_tasks_v1", []),
      ...safeJson("statusos_smart_tasks_v1", []),
      ...safeJson("statusos_planner_items_v1", []),
      ...(Array.isArray(state.daily?.priorities) ? state.daily.priorities : [])
    ];
    const map = new Map();
    sources.forEach(t => {
      if (!t) return;
      const title = clean(t.title || t.text || t.name);
      if (!title) return;
      const id = clean(t.id) || `task:${lower(title)}`;
      map.set(id, { ...map.get(id), ...t, id, title });
    });
    return [...map.values()].filter(t => !t.deletedAt);
  }

  function finance() {
    const state = appState();
    return {
      revenue: Array.isArray(state.revenue) ? state.revenue : [],
      invoices: Array.isArray(state.invoices) ? state.invoices : [],
      expenses: Array.isArray(state.expenses) ? state.expenses : []
    };
  }

  function timeline() {
    return [
      ...safeJson("statusos_knowledge_timeline_v1", []),
      ...safeJson("statusos_timeline_manual_v1", [])
    ];
  }

  function buildGraph() {
    const nodes = [];
    const edges = [];
    const artistRows = artists();
    const projectRows = projects();
    const taskRows = tasks();
    const money = finance();

    artistRows.forEach(a => {
      nodes.push({ id: `artist:${a.id}`, type: "artist", label: clean(a.name) || "Unnamed artist", data: a });
      (a.activities || []).filter(x => !x.deletedAt).forEach(activity => {
        const eventId = `activity:${a.id}:${activity.id || clean(activity.createdAt || activity.date || activity.title)}`;
        nodes.push({ id: eventId, type: "activity", label: clean(activity.title || activity.type) || "Activity", data: activity });
        edges.push({ from: `artist:${a.id}`, to: eventId, type: "has_activity" });
      });
    });

    projectRows.forEach(p => {
      nodes.push({ id: `project:${p.id}`, type: "project", label: clean(p.name || p.title) || "Untitled project", data: p });
      const artistId = p.artistId || p.clientId || p.artist_id;
      if (artistId) edges.push({ from: `artist:${artistId}`, to: `project:${p.id}`, type: "has_project" });
      else {
        const client = lower(p.artist || p.client || p.clientName);
        const match = artistRows.find(a => client && lower(a.name) === client);
        if (match) edges.push({ from: `artist:${match.id}`, to: `project:${p.id}`, type: "has_project" });
      }
    });

    taskRows.forEach(t => {
      nodes.push({ id: `task:${t.id}`, type: "task", label: t.title, data: t });
      const artistId = t.artistId || t.artist_id;
      const projectId = t.projectId || t.project_id;
      if (artistId) edges.push({ from: `artist:${artistId}`, to: `task:${t.id}`, type: "has_task" });
      if (projectId) edges.push({ from: `project:${projectId}`, to: `task:${t.id}`, type: "has_task" });
    });

    money.invoices.forEach(inv => {
      const id = clean(inv.id) || `invoice:${clean(inv.client || inv.artist)}:${clean(inv.date || inv.dueDate)}`;
      nodes.push({ id: `invoice:${id}`, type: "invoice", label: clean(inv.client || inv.artist || inv.name) || "Invoice", data: inv });
      const artistName = lower(inv.client || inv.artist || inv.clientName);
      const match = artistRows.find(a => artistName && lower(a.name) === artistName);
      if (match) edges.push({ from: `artist:${match.id}`, to: `invoice:${id}`, type: "has_invoice" });
    });

    const graph = { version: 1, builtAt: now(), nodes, edges };
    localStorage.setItem(GRAPH_KEY, JSON.stringify(graph));
    window.dispatchEvent(new CustomEvent("statusos:business-graph-updated", { detail: graph }));
    return graph;
  }

  function scoreArtist(artist) {
    let score = 20;
    const reasons = [];
    const trust = lower(artist.trustLevel);
    if (trust === "high") { score += 22; reasons.push("high trust relationship"); }
    else if (trust === "medium") { score += 12; reasons.push("established relationship"); }
    const status = lower(artist.status);
    if (/client|paid|negotiat|interested|album|project/.test(status)) { score += 18; reasons.push("active business stage"); }
    const inactiveDays = daysSince(artist.lastContact);
    if (inactiveDays != null && inactiveDays >= 5 && inactiveDays <= 21) { score += 18; reasons.push(`${inactiveDays} days since last contact`); }
    if (inactiveDays != null && inactiveDays > 30) { score -= 8; reasons.push("relationship has gone cold"); }
    const follow = dateOnly(artist.followUp);
    const today = new Date().toISOString().slice(0, 10);
    if (follow && follow <= today) { score += 25; reasons.push("follow-up is due"); }
    if (clean(artist.currentSituation)) { score += 5; reasons.push("current situation is documented"); }
    if (number(artist.revenue) > 0) { score += Math.min(15, number(artist.revenue) / 100); reasons.push("has generated revenue"); }
    return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
  }

  function scoreProject(project) {
    let score = 20;
    const reasons = [];
    const progress = number(project.progress);
    if (progress >= 70 && progress < 100) { score += 30; reasons.push("close to completion"); }
    else if (progress > 0) { score += 15; reasons.push("active progress"); }
    if (/active|recording|mix|production|in progress/.test(lower(project.status))) { score += 20; reasons.push("currently active"); }
    const deadline = dateOnly(project.deadline || project.dueDate);
    const today = new Date().toISOString().slice(0, 10);
    if (deadline && deadline <= today) { score += 25; reasons.push("deadline is due or overdue"); }
    if (clean(project.nextStep)) { score += 8; reasons.push("clear next step exists"); }
    return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
  }

  function openTasks() {
    return tasks().filter(t => !(t.done || t.completed || t.status === "completed"));
  }

  function opportunities() {
    const rows = [
      ...artists().map(a => ({ kind: "artist", id: a.id, name: clean(a.name), ...scoreArtist(a), target: a })),
      ...projects().map(p => ({ kind: "project", id: p.id, name: clean(p.name || p.title), ...scoreProject(p), target: p }))
    ];
    return rows.filter(x => x.name).sort((a, b) => b.score - a.score).slice(0, 8);
  }

  function snapshot() {
    const artistRows = artists();
    const projectRows = projects();
    const open = openTasks();
    const money = finance();
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const revenueThisMonth = money.revenue
      .filter(x => clean(x.date || x.createdAt).slice(0, 7) === month)
      .reduce((sum, x) => sum + number(x.amount), 0);
    const outstanding = money.invoices
      .filter(x => !/paid|complete/.test(lower(x.status)))
      .reduce((sum, x) => sum + number(x.balance ?? x.amount), 0);
    const overdue = open.filter(t => {
      const due = dateOnly(t.dueDate || t.date);
      return due && due < today;
    });
    return {
      generatedAt: now(),
      artists: artistRows.length,
      activeProjects: projectRows.filter(p => !/complete|archived|cancel/.test(lower(p.status))).length,
      openTasks: open.length,
      overdueTasks: overdue.length,
      revenueThisMonth,
      outstanding,
      topOpportunities: opportunities().slice(0, 5)
    };
  }

  function promptContext() {
    const s = snapshot();
    const lines = [
      "BUSINESS INTELLIGENCE SNAPSHOT:",
      `Artists in CRM: ${s.artists}`,
      `Active projects: ${s.activeProjects}`,
      `Open tasks: ${s.openTasks}`,
      `Overdue tasks: ${s.overdueTasks}`,
      `Revenue this month: $${Math.round(s.revenueThisMonth)} CAD`,
      `Outstanding invoice value: $${Math.round(s.outstanding)} CAD`
    ];
    if (s.topOpportunities.length) {
      lines.push("Top opportunities:");
      s.topOpportunities.forEach((x, i) => lines.push(`${i + 1}. ${x.name} (${x.kind}, score ${x.score}) because ${x.reasons.slice(0, 3).join(", ") || "it needs attention"}.`));
    }
    return lines.join("\n");
  }

  function recommendation() {
    const top = opportunities()[0];
    if (top) {
      return {
        title: top.kind === "artist" ? `Review ${top.name}` : `Move ${top.name} forward`,
        detail: top.reasons.length ? `Priority score ${top.score}: ${top.reasons.slice(0, 3).join(", ")}.` : `Priority score ${top.score}.`,
        view: top.kind === "artist" ? "crm" : "projects"
      };
    }
    const task = openTasks()[0];
    if (task) return { title: task.title, detail: "Your highest available open task.", view: "planner" };
    return { title: "Your business is clear", detail: "Add an artist, project, or task to receive recommendations.", view: "mission" };
  }

  function render() {
    const host = document.getElementById("businessIntelligencePanel");
    if (!host) return;
    const s = snapshot();
    const rec = recommendation();
    const cards = s.topOpportunities.slice(0, 3).map(x => `
      <button class="bi-opportunity" type="button" data-bi-view="${x.kind === "artist" ? "crm" : "projects"}">
        <span><b>${escapeHtml(x.name)}</b><small>${x.kind === "artist" ? "Artist" : "Project"}</small></span>
        <strong>${x.score}</strong>
      </button>`).join("") || '<p class="muted">Add CRM and project information to generate opportunity scores.</p>';
    host.innerHTML = `
      <div class="bi-header"><div><p class="eyebrow">BUSINESS INTELLIGENCE</p><h3>Your business at a glance</h3></div><button id="biRefresh" class="mini-btn" type="button">Refresh</button></div>
      <div class="bi-metrics">
        <div><strong>${s.openTasks}</strong><span>Open tasks</span></div>
        <div><strong>${s.activeProjects}</strong><span>Active projects</span></div>
        <div><strong>$${Math.round(s.outstanding).toLocaleString()}</strong><span>Outstanding</span></div>
        <div><strong>$${Math.round(s.revenueThisMonth).toLocaleString()}</strong><span>This month</span></div>
      </div>
      <div class="bi-grid">
        <section><p class="eyebrow">RECOMMENDED NEXT MOVE</p><h4>${escapeHtml(rec.title)}</h4><p class="muted">${escapeHtml(rec.detail)}</p><button class="button secondary" data-bi-view="${rec.view}" type="button">Open</button></section>
        <section><p class="eyebrow">TOP OPPORTUNITIES</p><div class="bi-opportunity-list">${cards}</div></section>
      </div>`;
    host.querySelector("#biRefresh")?.addEventListener("click", () => { buildGraph(); render(); });
    host.querySelectorAll("[data-bi-view]").forEach(button => button.addEventListener("click", () => {
      const view = button.dataset.biView;
      document.querySelector(`[data-view="${view}"]`)?.click();
    }));
  }

  function escapeHtml(value) {
    return clean(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function init() {
    buildGraph();
    render();
    ["statusos:artists-updated", "statusos:timeline-updated", "statusos:projects-updated", "statusos:tasks-updated"].forEach(name => {
      window.addEventListener(name, () => { buildGraph(); render(); });
    });
    window.addEventListener("storage", () => render());
  }

  window.StatusOS = window.StatusOS || {};
  window.StatusOS.BusinessIntelligence = { buildGraph, getGraph: () => safeJson(GRAPH_KEY, buildGraph()), snapshot, opportunities, recommendation, promptContext, render };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
