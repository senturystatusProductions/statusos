/* StatusOS v5.0.1 AI Actions Engine */
(function () {
  "use strict";

  const clean = value => String(value ?? "").trim();
  const lower = value => clean(value).toLowerCase();
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function listArtists() {
    const api = window.StatusOS?.ArtistOS?.list?.();
    if (Array.isArray(api)) return api.filter(a => !a?.deletedAt);
    try { return JSON.parse(localStorage.getItem("statusos_artists_v2") || "[]").filter(a => !a?.deletedAt); }
    catch { return []; }
  }

  function findArtist(name) {
    const wanted = lower(name);
    if (!wanted) return null;
    const artists = listArtists();
    return artists.find(a => lower(a.name) === wanted)
      || artists.find(a => lower(a.name).includes(wanted) || wanted.includes(lower(a.name)))
      || null;
  }

  function parseDate(text) {
    const iso = clean(text).match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (iso) return iso[1];
    return "";
  }

  function parseCreateProject(message) {
    const text = clean(message);
    const low = lower(text);
    if (!/(add|create|start|make)\s+(a\s+)?(new\s+)?project\b/.test(low)) return null;

    let name = "";
    let artistName = "";

    const called = text.match(/(?:called|named|titled)\s+["']?(.+?)["']?(?=\s+(?:for|with|under|status|type|deadline|due)\b|[.!?]|$)/i);
    if (called) name = clean(called[1]);

    const forMatch = text.match(/\bfor\s+["']?(.+?)["']?(?=\s+(?:called|named|titled|status|type|deadline|due)\b|[.!?]|$)/i);
    if (forMatch) artistName = clean(forMatch[1]);

    if (!name) {
      const afterProject = text.match(/\bproject\s+["']?(.+?)["']?(?=\s+for\b|[.!?]|$)/i);
      if (afterProject) name = clean(afterProject[1]).replace(/^(called|named|titled)\s+/i, "");
    }

    const artist = findArtist(artistName);
    const typeMatch = text.match(/\b(?:type|as)\s+(album|mixing|mastering|beat pack|custom beats?|single|ep|project)\b/i);
    const statusMatch = text.match(/\bstatus\s+(planning|in progress|waiting|on hold|complete)\b/i);
    const budgetMatch = text.match(/\b(?:budget|value|price)\s*\$?([\d,]+(?:\.\d{1,2})?)/i);

    return {
      type: "create_project",
      requiresConfirmation: true,
      data: {
        name,
        artist: artist?.name || artistName,
        artistId: artist?.id || null,
        projectType: typeMatch ? typeMatch[1].replace(/\b\w/g, c => c.toUpperCase()) : "Project",
        status: statusMatch ? statusMatch[1].replace(/\b\w/g, c => c.toUpperCase()) : "Planning",
        deadline: parseDate(text),
        budget: budgetMatch ? Number(budgetMatch[1].replace(/,/g, "")) : 0,
        notes: "Created through AI Actions Engine"
      }
    };
  }

  function parse(message) {
    return parseCreateProject(message);
  }

  function validate(action) {
    if (!action) return { ok: false, message: "No supported action detected." };
    if (action.type === "create_project") {
      if (!clean(action.data.name)) return { ok: false, needs: "project_name", message: "What should the project be called?" };
      return { ok: true };
    }
    return { ok: false, message: "That action is not supported yet." };
  }

  function execute(action) {
    const check = validate(action);
    if (!check.ok) return { ok: false, message: check.message };

    if (action.type === "create_project") {
      const result = window.StatusOS?.ProjectCommand?.create?.({
        name: action.data.name,
        artist: action.data.artist,
        artistId: action.data.artistId,
        type: action.data.projectType,
        status: action.data.status,
        deadline: action.data.deadline,
        budget: action.data.budget,
        notes: action.data.notes,
        source: "AI Actions Engine"
      });
      if (!result) return { ok: false, message: "StatusOS could not create the project." };
      return { ok: true, message: `Project “${result.name}” was created${result.artist ? ` for ${result.artist}` : ""}.`, record: result };
    }
    return { ok: false, message: "That action is not supported yet." };
  }

  function summary(action) {
    if (action.type !== "create_project") return "Unsupported action";
    const d = action.data;
    return {
      title: "Create Project",
      rows: [
        ["Project", d.name || "Not provided"],
        ["Artist", d.artist || "Not linked"],
        ["Type", d.projectType || "Project"],
        ["Status", d.status || "Planning"],
        ["Deadline", d.deadline || "Not set"],
        ["Budget", d.budget ? `$${Number(d.budget).toLocaleString("en-CA")}` : "Not set"]
      ]
    };
  }

  window.StatusOS = window.StatusOS || {};
  window.StatusOS.AIActions = { parse, validate, execute, summary };
})();
