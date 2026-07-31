/* StatusOS v4.9.0 AI Conversation Memory */
(function () {
  "use strict";

  const PRODUCER_DNA = [
    "Sam prefers concise, natural, friendly messages that sound human.",
    "Avoid corporate or overly formal wording unless the user explicitly asks for it.",
    "Do not sound pushy. Protect long-term relationships while still moving business forward.",
    "Use phrases such as 'Hey brother', 'just checking in', and 'hope all is well' only when they fit the relationship.",
    "Do not use em dashes.",
    "When context is incomplete, state exactly what is missing instead of inventing details."
  ];

  const safeJson = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };


  const MEMORY_KEY = "statusos_ai_conversation_memory_v1";
  const MAX_TURNS = 12;

  function loadMemory() {
    const value = safeJson(MEMORY_KEY, {});
    return {
      currentArtistId: value.currentArtistId || null,
      currentArtistName: value.currentArtistName || null,
      currentProjectId: value.currentProjectId || null,
      currentProjectName: value.currentProjectName || null,
      currentTopic: value.currentTopic || null,
      turns: Array.isArray(value.turns) ? value.turns.slice(-MAX_TURNS) : [],
      updatedAt: value.updatedAt || null
    };
  }

  function saveMemory(memory) {
    const next = { ...memory, turns: (memory.turns || []).slice(-MAX_TURNS), updatedAt: new Date().toISOString() };
    localStorage.setItem(MEMORY_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("statusos:ai-memory-updated", { detail: next }));
    return next;
  }

  function inferTopic(message, previousTopic) {
    const text = lower(message);
    const topics = [
      ["deposit", /deposit|down payment|upfront|payment/],
      ["follow-up", /follow up|follow-up|check in|ask again|message again|when should i/],
      ["beats", /beat|instrumental|stems/],
      ["mixing", /mix|master|vocals|revision/],
      ["project", /album|project|track|song/],
      ["invoice", /invoice|balance|owed|outstanding/],
      ["outreach", /contact|dm|email|reach out/]
    ];
    const match = topics.find(([, pattern]) => pattern.test(text));
    return match ? match[0] : previousTopic || null;
  }

  function memoryArtist(memory) {
    if (!memory.currentArtistId && !memory.currentArtistName) return null;
    const artists = listArtists();
    return artists.find(a => String(a.id) === String(memory.currentArtistId))
      || artists.find(a => lower(a.name) === lower(memory.currentArtistName))
      || null;
  }

  function rememberUser(message, contextPackage) {
    const memory = loadMemory();
    const artist = contextPackage?.artist || null;
    if (artist) {
      memory.currentArtistId = artist.id || null;
      memory.currentArtistName = artist.name || null;
    }
    memory.currentTopic = inferTopic(message, memory.currentTopic);
    memory.turns.push({ role: "user", content: clean(message), createdAt: new Date().toISOString() });
    return saveMemory(memory);
  }

  function rememberAssistant(message) {
    const memory = loadMemory();
    memory.turns.push({ role: "assistant", content: clean(message), createdAt: new Date().toISOString() });
    return saveMemory(memory);
  }

  function resetMemory() {
    localStorage.removeItem(MEMORY_KEY);
    window.dispatchEvent(new CustomEvent("statusos:ai-memory-updated", { detail: loadMemory() }));
  }

  const clean = value => String(value ?? "").trim();
  const lower = value => clean(value).toLowerCase();
  const formatDate = value => {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return clean(value);
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
  };

  function listArtists() {
    const apiArtists = window.StatusOS?.ArtistOS?.list?.();
    if (Array.isArray(apiArtists)) return apiArtists.filter(a => !a?.deletedAt);
    return safeJson("statusos_artists_v2", []).filter(a => !a?.deletedAt);
  }

  function selectedArtistId() {
    const workspace = safeJson("statusos_workspace_v1", {});
    return workspace.selectedArtistId || safeJson("statusos_app_state_v1", {}).selectedArtistId || null;
  }

  function detectArtist(message) {
    const artists = listArtists();
    if (!artists.length) return null;
    const text = lower(message);

    const exact = artists
      .filter(a => clean(a.name))
      .sort((a, b) => clean(b.name).length - clean(a.name).length)
      .find(a => text.includes(lower(a.name)));
    if (exact) return exact;

    const tokens = text.split(/[^a-z0-9@._-]+/i).filter(Boolean);
    const fuzzy = artists.find(a => {
      const nameTokens = lower(a.name).split(/[^a-z0-9@._-]+/i).filter(Boolean);
      return nameTokens.some(token => token.length >= 3 && tokens.includes(token));
    });
    if (fuzzy) return fuzzy;

    const selected = selectedArtistId();
    if (selected) return artists.find(a => String(a.id) === String(selected)) || null;
    return null;
  }

  function artistContext(artist) {
    if (!artist) return null;
    const apiContext = window.StatusOS?.ArtistOS?.contextFor?.(artist.id || artist.name);
    const context = apiContext || { artist };
    const a = context.artist || artist;
    const timeline = Array.isArray(context.timeline) ? context.timeline : Array.isArray(a.activities) ? a.activities : [];
    const projects = Array.isArray(context.projects) ? context.projects : [];
    const tasks = Array.isArray(context.tasks) ? context.tasks : [];
    const payments = context.payments || {};

    const lines = [
      `Artist: ${clean(a.name) || "Unknown"}`,
      `Role: ${clean(a.role) || "Not recorded"}`,
      `Pipeline status: ${clean(a.status) || "Not recorded"}`,
      `Relationship: ${clean(a.relationship) || "Not recorded"}`,
      `Trust level: ${clean(a.trustLevel) || "Not recorded"}`,
      `Preferred contact: ${clean(a.preferredChannel) || "Not recorded"}`,
      `Last contact: ${formatDate(a.lastContact)}`,
      `Next follow-up: ${formatDate(a.followUp)}`,
      `Current situation: ${clean(a.currentSituation) || "Not recorded"}`,
      `Communication style: ${clean(a.communicationStyle) || "Not recorded"}`,
      `General notes: ${clean(a.notes) || "Not recorded"}`,
      `Suggested next action from StatusOS: ${clean(context.nextAction) || "Not calculated"}`,
      `Payments logged: ${Number(payments.count || 0)}; total: ${Number(payments.total || a.revenue || 0)} CAD`
    ];

    if (projects.length) {
      lines.push("Linked projects:");
      projects.slice(0, 8).forEach(p => lines.push(`- ${clean(p.name || p.title) || "Untitled"}: ${clean(p.status) || "No status"}${p.progress != null ? `, ${p.progress}% complete` : ""}`));
    }
    if (tasks.length) {
      lines.push("Open linked tasks:");
      tasks.slice(0, 8).forEach(t => lines.push(`- ${clean(t.title || t.text) || "Untitled"}${t.dueDate ? `, due ${formatDate(t.dueDate)}` : ""}`));
    }
    if (timeline.length) {
      lines.push("Recent timeline:");
      timeline.slice(0, 12).forEach(item => lines.push(`- ${formatDate(item.date || item.createdAt)}: ${clean(item.title || item.type) || "Activity"}${clean(item.details) ? ` | ${clean(item.details)}` : ""}`));
    }
    return lines.join("\n");
  }

  function build(message) {
    const memory = loadMemory();
    const explicitArtist = detectArtist(message);
    const artist = explicitArtist || memoryArtist(memory);
    const topic = inferTopic(message, memory.currentTopic);
    const sections = [
      "You are the StatusOS AI Business Manager for Sam Cannarella / Sentury Status Productions.",
      "Use the supplied StatusOS data as the source of truth. Never invent missing facts.",
      "PRODUCER DNA:",
      ...PRODUCER_DNA.map(x => `- ${x}`)
    ];

    if (artist) {
      sections.push("", "ARTIST CONTEXT:", artistContext(artist));
    } else {
      sections.push("", "ARTIST CONTEXT:", "No matching artist was found in StatusOS for this question. If the question requires a specific artist, briefly say that the artist needs to be added or named.");
    }

    if (topic) sections.push("", `CURRENT TOPIC: ${topic}`);
    if (memory.turns.length) {
      sections.push("", "RECENT CONVERSATION:");
      memory.turns.slice(-8).forEach(turn => {
        sections.push(`${turn.role === "assistant" ? "ASSISTANT" : "USER"}: ${clean(turn.content)}`);
      });
      sections.push("Maintain continuity. Resolve words such as he, she, they, it, that, again, and next from this recent conversation and the current artist context.");
    }

    sections.push("", "USER QUESTION:", clean(message), "", "RESPONSE RULES:", "Answer the current question directly. Continue the existing conversation instead of asking the user to repeat details already present above. Use the artist history when available. For message-writing requests, provide one polished message first, then a brief reason only if useful. Do not repeat the full context back to the user.");

    return {
      prompt: sections.join("\n"),
      artist: artist ? { id: artist.id, name: artist.name } : null,
      hasContext: Boolean(artist),
      topic,
      memoryTurns: memory.turns.length
    };
  }

  window.StatusOS = window.StatusOS || {};
  window.StatusOS.ContextEngine = {
    build, detectArtist, artistContext, producerDNA: [...PRODUCER_DNA],
    rememberUser, rememberAssistant, resetMemory, getMemory: loadMemory
  };
})();
