const STORAGE_KEY = "senturyStatusOS_v2";

const today = () => new Date().toISOString().slice(0, 10);

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());

const money = value =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const fmtDate = value =>
  value
    ? new Date(`${value}T12:00:00`).toLocaleDateString()
    : "â€”";

const clone = value => JSON.parse(JSON.stringify(value));

const defaultState = {
  settings: {
    businessName: "Sentury Status Productions",
    weeklyOutreachGoal: 50,
    monthlyRevenueGoal: 2000
  },
  daily: {
    date: today(),
    priorities: [
      { id: uid(), title: "Post today's content", done: false },
      { id: uid(), title: "Message 10 new artists", done: false },
      { id: uid(), title: "Complete one business improvement", done: false }
    ],
    sections: [
      {
        title: "Sales",
        items: [
          "Find 20 artists",
          "Leave 10 meaningful comments",
          "Send 10 personalized DMs",
          "Follow up with 5 previous leads",
          "Update lead tracker"
        ].map(title => ({ id: uid(), title, done: false }))
      },
      {
        title: "Content",
        items: [
          "Study one strong post",
          "Write one hook",
          "Record one short video",
          "Post and share to Stories"
        ].map(title => ({ id: uid(), title, done: false }))
      },
      {
        title: "Business",
        items: [
          "Improve one page, product, or service",
          "Check website orders and inquiries"
        ].map(title => ({ id: uid(), title, done: false }))
      },
      {
        title: "End of Day",
        items: [
          "Record today's wins",
          "Write tomorrow's main priority",
          "Enter today's revenue"
        ].map(title => ({ id: uid(), title, done: false }))
      }
    ]
  },
  artists: [],
  content: [],
  sales: [],
  projects: [
    {
      id: uid(),
      name: "Instrumental CD Vol. 1",
      type: "Instrumental CD",
      deadline: "",
      progress: 10,
      nextStep: "Choose theme and track list"
    }
  ],
  revenue: [],
  goals: [
    {
      id: uid(),
      name: "Contact 50 artists this week",
      target: 50,
      current: 0,
      deadline: ""
    },
    {
      id: uid(),
      name: "Earn $2,000 this month",
      target: 2000,
      current: 0,
      deadline: ""
    }
  ],
  templates: [
    {
      id: uid(),
      name: "First Contact",
      message:
        "Hey, I came across your music and really liked your style. I produce West Coast, cinematic, and hard-hitting hip-hop. I think I have a few beats that would fit your sound well. I'd be glad to send over a few previews. No pressure."
    },
    {
      id: uid(),
      name: "Follow-up",
      message:
        "Just following up in case my last message got buried. I still think I have a few beats that would fit your sound. I can send a short private playlist whenever you're ready."
    }
  ]
};

function normalizeState(saved) {
  const base = clone(defaultState);
  const merged = {
    ...base,
    ...(saved || {}),
    settings: { ...base.settings, ...(saved?.settings || {}) },
    daily: saved?.daily || base.daily
  };

  ["artists", "content", "sales", "projects", "revenue", "goals", "templates"].forEach(
    key => {
      if (!Array.isArray(merged[key])) merged[key] = [];
    }
  );

  if (merged.daily?.date !== today()) {
    merged.daily = clone(defaultState).daily;
  }

  return merged;
}


function mergeArtistRecords(localArtists = [], cloudArtists = []) {
  const merged = new Map();
  [...cloudArtists, ...localArtists].forEach(item => {
    if (!item?.id) return;
    const current = merged.get(item.id);
    const itemTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
    const currentTime = new Date(current?.updatedAt || current?.createdAt || 0).getTime();
    if (!current || itemTime >= currentTime) merged.set(item.id, item);
  });
  return Array.from(merged.values());
}

function mergeCloudState(localState, cloudState) {
  const cloudWithoutArtists = { ...(cloudState || {}) };
  delete cloudWithoutArtists.artists;
  const merged = normalizeState({ ...localState, ...cloudWithoutArtists });
  // Artist OS v2 is stored in dedicated per-record tables and must never be
  // overwritten by the legacy whole-workspace record.
  merged.artists = Array.isArray(localState?.artists) ? localState.artists : [];
  return merged;
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.error("StatusOS local data could not be loaded:", error);
    return clone(defaultState);
  }
}

const WORKSPACE_BACKUPS_KEY = "statusos_workspace_backups_v1";
const MAX_WORKSPACE_BACKUPS = 20;
let lastAutomaticBackupAt = 0;

function readWorkspaceBackups() {
  try {
    const value = JSON.parse(localStorage.getItem(WORKSPACE_BACKUPS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function createWorkspaceBackup(reason = "Automatic backup", force = false) {
  const now = Date.now();
  if (!force && now - lastAutomaticBackupAt < 120000) return readWorkspaceBackups();
  const backups = readWorkspaceBackups();
  const snapshot = JSON.stringify(state);
  if (backups[0]?.snapshot === snapshot) return backups;
  backups.unshift({ id: uid(), createdAt: new Date().toISOString(), reason, snapshot });
  localStorage.setItem(WORKSPACE_BACKUPS_KEY, JSON.stringify(backups.slice(0, MAX_WORKSPACE_BACKUPS)));
  lastAutomaticBackupAt = now;
  window.dispatchEvent(new CustomEvent("statusos:backups-updated"));
  return backups;
}

function restoreWorkspaceBackup(backupId) {
  const backup = readWorkspaceBackups().find(item => item.id === backupId);
  if (!backup) throw new Error("Backup not found.");
  createWorkspaceBackup("Before restore", true);
  state = normalizeState(JSON.parse(backup.snapshot));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(saveCloud, 100);
  return state;
}

function mergeImportedArtists(importedArtists) {
  if (!Array.isArray(importedArtists)) throw new Error("Artist backup is invalid.");
  createWorkspaceBackup("Before artist import", true);
  state.artists = mergeArtistRecords(state.artists, importedArtists);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(saveCloud, 100);
  window.dispatchEvent(new CustomEvent("statusos:artists-updated"));
  return state.artists;
}

let state = loadLocal();
let cloudSaveTimer = null;
let appInitialized = false;
let realtimeChannel = null;
let suppressCloudSave = false;

function getSupabaseClient() {
  return window.statusOSSupabase || null;
}

async function getSignedInUser() {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser();

  if (error) {
    console.error("StatusOS user lookup failed:", error);
    return null;
  }

  return data?.user || null;
}

async function saveCloud() {
  createWorkspaceBackup("Before cloud sync");
  const client = getSupabaseClient();
  const user = await getSignedInUser();

  if (!client || !user) return;

  const { error } = await client
    .from("statusos_workspaces")
    .upsert(
      {
        user_id: user.id,
        app_state: (() => { const workspace = clone(state); delete workspace.artists; return workspace; })(),
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("StatusOS cloud save failed:", error);
  }
}

function save() {
  createWorkspaceBackup("Automatic save");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();

  if (suppressCloudSave) return;

  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(saveCloud, 500);
}

async function loadCloud() {
  const client = getSupabaseClient();
  const user = await getSignedInUser();

  if (!client || !user) return;

  const { data, error } = await client
    .from("statusos_workspaces")
    .select("app_state")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("StatusOS cloud load failed:", error);
    return;
  }

  if (data?.app_state && Object.keys(data.app_state).length) {
    createWorkspaceBackup("Before cloud merge", true);
    state = mergeCloudState(state, data.app_state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    await saveCloud();
    return;
  }

  const { error: insertError } = await client
    .from("statusos_workspaces")
    .insert({
      user_id: user.id,
      app_state: (() => { const workspace = clone(state); delete workspace.artists; return workspace; })(),
      updated_at: new Date().toISOString()
    });

  if (insertError) {
    console.error("StatusOS first cloud save failed:", insertError);
  }
}

async function startRealtimeSync() {
  const client = getSupabaseClient();
  const user = await getSignedInUser();

  if (!client || !user) return;

  if (realtimeChannel) {
    await client.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = client
    .channel(`statusos-workspace-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "statusos_workspaces",
        filter: `user_id=eq.${user.id}`
      },
      payload => {
        const incoming = payload?.new?.app_state;
        if (!incoming || !Object.keys(incoming).length) return;

        suppressCloudSave = true;
        createWorkspaceBackup("Before realtime merge", true);
        state = mergeCloudState(state, incoming);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        renderAll();

        setTimeout(() => {
          suppressCloudSave = false;
        }, 0);
      }
    )
    .subscribe(status => {
      if (status === "SUBSCRIBED") {
        console.log("StatusOS realtime sync connected.");
      }
    });
}

window.StatusOS = window.StatusOS || {};
window.StatusOS.DataProtection = {
  listBackups: readWorkspaceBackups,
  createBackup: (reason = "Manual backup") => createWorkspaceBackup(reason, true),
  restoreBackup: restoreWorkspaceBackup,
  exportArtists: () => clone(state.artists || []),
  importArtists: mergeImportedArtists,
  syncNow: async () => {
    createWorkspaceBackup("Before manual sync", true);
    await saveCloud();
    await loadCloud();
    renderAll();
    return true;
  },
  getLastCloudState: () => clone(state)
};

const dayThemes = {
  Sunday: ["Reset Day", ["Rest", "Family time", "Light planning"]],
  Monday: [
    "CEO Day",
    ["Plan the week", "Review leads", "Set revenue goal", "Schedule content"]
  ],
  Tuesday: [
    "Artist Outreach Day",
    ["Find new artists", "Personal DMs", "Follow-ups"]
  ],
  Wednesday: [
    "Content Day",
    ["Film multiple videos", "Edit content", "Build content bank"]
  ],
  Thursday: [
    "Client Day",
    ["Mixing", "Mastering", "Custom beats", "Orders"]
  ],
  Friday: [
    "Growth Day",
    ["Website", "SEO", "Products", "Weekly review"]
  ],
  Saturday: [
    "Creative Day",
    ["Make beats", "Sound design", "Experiment"]
  ]
};

function byId(id) {
  return document.getElementById(id);
}

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = value;
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-item")
        .forEach(item => item.classList.remove("active"));

      document
        .querySelectorAll(".view")
        .forEach(view => view.classList.remove("active"));

      const matchingNav = document.querySelector(`.nav-item[data-view="${button.dataset.view}"]`);
      if (matchingNav) matchingNav.classList.add("active");

      const target = byId(button.dataset.view);
      if (target) target.classList.add("active");

      setText("pageTitle", matchingNav ? matchingNav.textContent.trim() : button.textContent.trim());
      window.dispatchEvent(new CustomEvent("statusos:view-change", { detail: { view: button.dataset.view } }));
    });
  });
}

function bindModals() {
  document.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => {
      const dialog = byId(button.dataset.open);
      if (!dialog) return;

      if (dialog.id === "revenueModal") {
        const dateInput = dialog.querySelector('[name="date"]');
        if (dateInput) dateInput.value = today();
      }

      dialog.showModal();
    });
  });
}

function bindForm(id, handler) {
  const form = byId(id);
  if (!form) return;

  form.addEventListener("submit", event => {
    if (event.submitter?.value === "cancel") return;

    event.preventDefault();

    const data = Object.fromEntries(new FormData(form));
    handler(data);
    form.reset();

    const dialog = form.closest("dialog");
    if (dialog) dialog.close();

    save();
  });
}

function bindForms() {
  // Artist OS owns the artist form in v1.7.0.

  bindForm("contentForm", data => {
    state.content.push({ id: uid(), ...data });
  });

  bindForm("saleForm", data => {
    state.sales.push({
      id: uid(),
      ...data,
      value: Number(data.value || 0)
    });
  });

  bindForm("projectForm", data => {
    state.projects.push({
      id: uid(),
      ...data,
      progress: Number(data.progress || 0)
    });
  });

  bindForm("revenueForm", data => {
    state.revenue.push({
      id: uid(),
      ...data,
      amount: Number(data.amount || 0)
    });
  });

  bindForm("goalForm", data => {
    state.goals.push({
      id: uid(),
      ...data,
      target: Number(data.target || 1),
      current: Number(data.current || 0)
    });
  });

  bindForm("templateForm", data => {
    state.templates.push({ id: uid(), ...data });
  });
}

function bindControls() {
  const resetDailyButton = byId("resetDailyBtn");
  if (resetDailyButton) {
    resetDailyButton.addEventListener("click", () => {
      state.daily = clone(defaultState).daily;
      save();
    });
  }

  const saveSettingsButton = byId("saveSettingsBtn");
  if (saveSettingsButton) {
    saveSettingsButton.addEventListener("click", () => {
      state.settings.businessName = byId("businessName")?.value || "";
      state.settings.weeklyOutreachGoal = Number(
        byId("weeklyOutreachGoal")?.value || 50
      );
      state.settings.monthlyRevenueGoal = Number(
        byId("monthlyRevenueGoal")?.value || 2000
      );
      save();
    });
  }

  const resetAllButton = byId("resetAllBtn");
  if (resetAllButton) {
    resetAllButton.addEventListener("click", () => {
      if (confirm("Reset all app data on this device?")) {
        state = clone(defaultState);
        save();
      }
    });
  }

  const exportButton = byId("exportBtn");
  if (exportButton) {
    exportButton.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: "application/json"
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `sentury-status-backup-${today()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }

  const importInput = byId("importInput");
  if (importInput) {
    importInput.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        try {
          state = normalizeState(JSON.parse(reader.result));
          save();
        } catch {
          alert("Invalid backup file.");
        }
      };

      reader.readAsText(file);
    });
  }

  const crmSearch = byId("crmSearch");
  if (crmSearch) crmSearch.addEventListener("input", () => window.StatusOS?.ArtistOS?.render?.());

  const crmFilter = byId("crmFilter");
  if (crmFilter) crmFilter.addEventListener("change", () => window.StatusOS?.ArtistOS?.render?.());
}

function renderDashboardHeader() {
  const now = new Date();
  const hour = now.getHours();

  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 17
        ? "Good afternoon"
        : "Good evening";

  setText("welcomeHeading", `${greeting}, Sam.`);
  setText(
    "dashboardDay",
    now.toLocaleDateString(undefined, { weekday: "long" })
  );
  setText(
    "dashboardFullDate",
    now.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric"
    })
  );
  setText(
    "todayDate",
    now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    })
  );
}

function renderDaily() {
  const priorityList = byId("priorityList");

  if (priorityList) {
    priorityList.innerHTML = "";

    state.daily.priorities.forEach(item => {
      const row = document.createElement("div");
      row.className = "task-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "task-check";
      checkbox.checked = item.done;
      checkbox.addEventListener("change", () => {
        item.done = checkbox.checked;
        save();
      });

      const input = document.createElement("input");
      input.className = "priority-input";
      input.value = item.title;
      input.addEventListener("input", () => {
        item.title = input.value;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      });

      row.append(checkbox, input);
      priorityList.append(row);
    });
  }

  const sections = byId("dailySections");

  if (sections) {
    sections.innerHTML = "";

    state.daily.sections.forEach(section => {
      const card = document.createElement("article");
      card.className = "card";
      card.style.marginBottom = "14px";
      card.innerHTML = `<h3>${section.title}</h3>`;

      section.items.forEach(item => {
        const row = document.createElement("label");
        row.className = "task-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-check";
        checkbox.checked = item.done;
        checkbox.addEventListener("change", () => {
          item.done = checkbox.checked;
          save();
        });

        const label = document.createElement("span");
        label.className = "task-label";
        label.textContent = item.title;

        row.append(checkbox, label);
        card.append(row);
      });

      sections.append(card);
    });
  }

  const allItems = [
    ...state.daily.priorities,
    ...state.daily.sections.flatMap(section => section.items)
  ];

  const complete = allItems.filter(item => item.done).length;
  const percentage = allItems.length
    ? Math.round((complete / allItems.length) * 100)
    : 0;

  setText("dailyProgressText", `${complete} of ${allItems.length} complete`);

  const progressBar = byId("dailyProgressBar");
  if (progressBar) progressBar.style.width = `${percentage}%`;

  setText("scorePercent", `${percentage}%`);

  const scoreRing = byId("scoreRing");
  if (scoreRing) {
    scoreRing.style.strokeDashoffset =
      314.159 - (percentage / 100) * 314.159;
  }

  renderMorningSummary();

  const weekday = new Date().toLocaleDateString("en-US", {
    weekday: "long"
  });

  const theme = dayThemes[weekday] || dayThemes.Monday;

  setText("dayThemeTitle", theme[0]);

  const taskContainer = byId("dayThemeTasks");
  if (taskContainer) {
    taskContainer.innerHTML = theme[1]
      .map(task => `<div>${task}</div>`)
      .join("");
  }
}


function renderMorningSummary() {
  const sums = getRevenueSums();
  const activeProjects = state.projects.filter(
    project => Number(project.progress || 0) < 100
  ).length;
  const followups = state.artists.filter(
    artist => artist.followUp && artist.followUp <= today()
  ).length;

  setText("morningRevenueToday", money(sums.today));
  setText("morningRevenueMonth", money(sums.month));
  setText(
    "morningRevenueGoal",
    `Goal: ${money(state.settings.monthlyRevenueGoal)}`
  );
  setText("morningActiveProjects", String(activeProjects));
  setText("morningFollowups", String(followups));
}

function bindStartWork() {
  const startButton = byId("startWorkBtn");
  const sessionCard = byId("workSessionCard");
  const taskTitle = byId("currentWorkTask");
  const taskMessage = byId("currentWorkMessage");
  const completeButton = byId("completeCurrentTaskBtn");
  const closeButton = byId("closeWorkSessionBtn");

  if (!startButton || !sessionCard || !taskTitle) return;

  const showNextTask = () => {
    const nextTask = state.daily.priorities.find(item => !item.done);
    sessionCard.classList.remove("hidden");

    if (!nextTask) {
      taskTitle.textContent = "Top 3 complete.";
      if (taskMessage) {
        taskMessage.textContent =
          "Great work. Your most important tasks are finished for today.";
      }
      if (completeButton) completeButton.disabled = true;
      return;
    }

    taskTitle.textContent = nextTask.title || "Untitled priority";
    if (taskMessage) {
      const remaining = state.daily.priorities.filter(item => !item.done).length;
      taskMessage.textContent = `${remaining} priority${remaining === 1 ? "" : "ies"} remaining. Focus only on this task.`;
    }
    if (completeButton) completeButton.disabled = false;
    sessionCard.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  startButton.addEventListener("click", showNextTask);

  if (completeButton) {
    completeButton.addEventListener("click", () => {
      const nextTask = state.daily.priorities.find(item => !item.done);
      if (nextTask) {
        nextTask.done = true;
        save();
      }
      showNextTask();
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", () => {
      sessionCard.classList.add("hidden");
    });
  }
}

function renderLegacyCRM() {
  const query = (byId("crmSearch")?.value || "").toLowerCase();
  const filter = byId("crmFilter")?.value || "";

  const rows = state.artists
    .filter(artist => !filter || artist.status === filter)
    .filter(artist =>
      JSON.stringify(artist).toLowerCase().includes(query)
    );

  const table = byId("crmTable");
  if (!table) return;

  table.innerHTML =
    rows
      .map(
        artist => `
          <tr>
            <td>
              <strong>${artist.name}</strong><br>
              <small>${artist.contact || ""}</small>
            </td>
            <td>${artist.genre || "â€”"}</td>
            <td><span class="status">${artist.status}</span></td>
            <td>${fmtDate(artist.lastContact)}</td>
            <td>${fmtDate(artist.followUp)}</td>
            <td>
              <button
                class="mini-btn delete"
                onclick="removeItem('artists','${artist.id}')"
              >
                Delete
              </button>
            </td>
          </tr>
        `
      )
      .join("") ||
    `<tr><td colspan="6" class="muted">No artists added yet.</td></tr>`;
}

function renderBoard(key, stages, containerId, cardRenderer) {
  const container = byId(containerId);
  if (!container) return;

  container.innerHTML = "";

  stages.forEach(stage => {
    const column = document.createElement("div");
    column.className = "kanban-column";
    column.innerHTML = `<h3>${stage}</h3>`;

    state[key]
      .filter(item => item.stage === stage)
      .forEach(item => {
        const card = document.createElement("div");
        card.className = "kanban-card";
        card.innerHTML = cardRenderer(item);
        column.append(card);
      });

    container.append(column);
  });
}

function renderProjects() {
  const projectList = byId("projectList");
  if (!projectList) return;

  projectList.innerHTML =
    state.projects
      .map(
        project => `
          <article class="card project-card">
            <p class="eyebrow">${project.type}</p>
            <h3>${project.name}</h3>
            <p class="muted">${project.nextStep || "No next step set"}</p>
            <div class="meter">
              <span style="width:${Number(project.progress || 0)}%"></span>
            </div>
            <small>
              ${Number(project.progress || 0)}% â€¢
              ${project.deadline ? fmtDate(project.deadline) : "No deadline"}
            </small>
            <div class="card-actions">
              <button class="mini-btn" onclick="bumpProject('${project.id}')">
                +10%
              </button>
              <button
                class="mini-btn delete"
                onclick="removeItem('projects','${project.id}')"
              >
                Delete
              </button>
            </div>
          </article>
        `
      )
      .join("") ||
    `<p class="muted">No projects yet.</p>`;
}

function getRevenueSums() {
  const now = new Date();
  const startWeek = new Date(now);

  startWeek.setHours(0, 0, 0, 0);
  startWeek.setDate(now.getDate() - now.getDay());

  const sums = {
    today: 0,
    week: 0,
    month: 0,
    all: 0
  };

  state.revenue.forEach(item => {
    const date = new Date(`${item.date}T12:00:00`);
    const amount = Number(item.amount || 0);

    sums.all += amount;

    if (item.date === today()) sums.today += amount;
    if (date >= startWeek) sums.week += amount;

    if (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    ) {
      sums.month += amount;
    }
  });

  return sums;
}

function renderRevenue() {
  const sums = getRevenueSums();

  setText("revToday", money(sums.today));
  setText("revWeek", money(sums.week));
  setText("revMonth", money(sums.month));
  setText("revAll", money(sums.all));
  setText("statRevenue", money(sums.month));

  const table = byId("revenueTable");
  if (!table) return;

  table.innerHTML =
    [...state.revenue]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .map(
        item => `
          <tr>
            <td>${fmtDate(item.date)}</td>
            <td>${item.source}</td>
            <td>${item.name || "â€”"}</td>
            <td>${money(item.amount)}</td>
            <td>
              <button
                class="mini-btn delete"
                onclick="removeItem('revenue','${item.id}')"
              >
                Delete
              </button>
            </td>
          </tr>
        `
      )
      .join("") ||
    `<tr><td colspan="5" class="muted">No revenue entered yet.</td></tr>`;
}

function renderGoals() {
  const goalList = byId("goalList");
  if (!goalList) return;

  goalList.innerHTML =
    state.goals
      .map(goal => {
        const target = Number(goal.target || 1);
        const current = Number(goal.current || 0);
        const percentage = Math.min(
          100,
          Math.round((current / target) * 100)
        );

        return `
          <article class="card goal-card">
            <h3>${goal.name}</h3>
            <div class="meter">
              <span style="width:${percentage}%"></span>
            </div>
            <p>${current} / ${target}</p>
            <small class="muted">
              ${goal.deadline ? fmtDate(goal.deadline) : "No deadline"}
            </small>
            <div class="card-actions">
              <button
                class="mini-btn"
                onclick="incrementGoal('${goal.id}')"
              >
                Add Progress
              </button>
              <button
                class="mini-btn delete"
                onclick="removeItem('goals','${goal.id}')"
              >
                Delete
              </button>
            </div>
          </article>
        `;
      })
      .join("") ||
    `<p class="muted">No goals yet.</p>`;
}

function renderTemplates() {
  const templateList = byId("templateList");
  if (!templateList) return;

  templateList.innerHTML =
    state.templates
      .map(
        template => `
          <article class="card template-card">
            <h3>${template.name}</h3>
            <p class="muted">${template.message}</p>
            <div class="card-actions">
              <button
                class="mini-btn"
                onclick="copyTemplate('${template.id}')"
              >
                Copy
              </button>
              <button
                class="mini-btn delete"
                onclick="removeItem('templates','${template.id}')"
              >
                Delete
              </button>
            </div>
          </article>
        `
      )
      .join("") ||
    `<p class="muted">No templates yet.</p>`;
}

function renderStats() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const contacted = state.artists.filter(
    artist =>
      artist.lastContact &&
      new Date(`${artist.lastContact}T12:00:00`) >= weekAgo
  ).length;

  const followUps = state.artists.filter(
    artist => artist.followUp && artist.followUp <= today()
  ).length;

  const posts = state.content.filter(
    item =>
      item.stage === "Posted" &&
      (!item.date || new Date(`${item.date}T12:00:00`) >= weekAgo)
  ).length;

  setText("statContacted", contacted);
  setText("statFollowups", followUps);
  setText("statPosts", posts);
  setText("statRevenue", money(getRevenueSums().month));
}

function renderAIBrief() {
  const container = byId("aiBrief");
  if (!container) return;

  const dueFollowUps = state.artists.filter(
    artist => artist.followUp && artist.followUp <= today()
  ).length;

  const activeProjects = state.projects.filter(
    project => Number(project.progress || 0) < 100
  ).length;

  const waitingContent = state.content.filter(
    item => item.stage !== "Posted"
  ).length;

  const monthlyRevenue = getRevenueSums().month;

  let recommendation = "Complete your highest-priority task first.";

  if (dueFollowUps > 0) {
    recommendation = "Start with your overdue artist follow-ups.";
  } else if (activeProjects > 0) {
    recommendation = "Move one active project closer to completion.";
  } else if (waitingContent > 0) {
    recommendation = "Prepare and publish your next content item.";
  }

  container.innerHTML = `
    <div>You have <strong>${dueFollowUps}</strong> artist follow-ups due.</div>
    <div>You have <strong>${activeProjects}</strong> active projects.</div>
    <div>You have <strong>${waitingContent}</strong> content items waiting.</div>
    <div>Revenue this month: <strong>${money(monthlyRevenue)}</strong>.</div>
    <div><strong>Recommended next move:</strong> ${recommendation}</div>
  `;
}

function renderSettings() {
  const businessName = byId("businessName");
  const outreachGoal = byId("weeklyOutreachGoal");
  const revenueGoal = byId("monthlyRevenueGoal");

  if (businessName) {
    businessName.value = state.settings.businessName || "";
  }

  if (outreachGoal) {
    outreachGoal.value = state.settings.weeklyOutreachGoal || 50;
  }

  if (revenueGoal) {
    revenueGoal.value = state.settings.monthlyRevenueGoal || 2000;
  }
}

function renderRecentActivity() {
  const container = byId("recentActivity");
  if (!container) return;

  const activity = [];

  state.revenue.slice(-3).forEach(item => {
    activity.push({
      title: `Revenue added: ${money(item.amount)}`,
      detail: item.name || item.source || "Revenue",
      date: item.date || ""
    });
  });

  state.artists.slice(-3).forEach(item => {
    activity.push({
      title: `Artist added: ${item.name}`,
      detail: item.status || "New Lead",
      date: item.lastContact || ""
    });
  });

  state.projects.slice(-3).forEach(item => {
    activity.push({
      title: `Project updated: ${item.name}`,
      detail: item.nextStep || item.type || "Project",
      date: item.deadline || ""
    });
  });

  const latest = activity.slice(-6).reverse();

  container.innerHTML = latest.length
    ? latest
        .map(
          item => `
            <div class="activity-item">
              <div>
                <strong>${item.title}</strong>
                <small>${item.detail}</small>
              </div>
              <small>${item.date ? fmtDate(item.date) : "Recent"}</small>
            </div>
          `
        )
        .join("")
    : `<div class="activity-empty">No recent activity yet.</div>`;
}

function renderAll() {
  renderDashboardHeader();
  renderDaily();
  window.StatusOS?.ArtistOS?.render?.();

  renderBoard(
    "content",
    ["Ideas", "Writing", "Filming", "Ready", "Posted"],
    "contentBoard",
    item => `
      <strong>${item.title}</strong>
      <p>${item.platform}</p>
      <small>
        ${item.hook || "No hook yet"}
        ${item.date ? ` â€¢ ${fmtDate(item.date)}` : ""}
      </small>
      <div class="card-actions">
        <button
          class="mini-btn delete"
          onclick="removeItem('content','${item.id}')"
        >
          Delete
        </button>
      </div>
    `
  );

  renderBoard(
    "sales",
    ["Lead", "Contacted", "Conversation", "Proposal", "Won", "Lost"],
    "salesBoard",
    item => `
      <strong>${item.name}</strong>
      <p>${item.offer || "Opportunity"}</p>
      <small>
        ${money(item.value)} â€¢ ${item.nextAction || "No next action"}
      </small>
      <div class="card-actions">
        <button
          class="mini-btn delete"
          onclick="removeItem('sales','${item.id}')"
        >
          Delete
        </button>
      </div>
    `
  );

  renderProjects();
  renderRevenue();
  renderGoals();
  renderTemplates();
  renderStats();
  renderAIBrief();
  renderSettings();
  renderRecentActivity();
}

window.removeItem = (key, id) => {
  if (!Array.isArray(state[key])) return;
  state[key] = state[key].filter(item => item.id !== id);
  save();
};

window.bumpProject = id => {
  const project = state.projects.find(item => item.id === id);
  if (!project) return;

  project.progress = Math.min(
    100,
    Number(project.progress || 0) + 10
  );

  save();
};

window.incrementGoal = id => {
  const goal = state.goals.find(item => item.id === id);
  if (!goal) return;

  const amount = prompt("How much progress should be added?", "1");

  if (amount !== null) {
    goal.current = Number(goal.current || 0) + Number(amount || 0);
    save();
  }
};

window.copyTemplate = async id => {
  const template = state.templates.find(item => item.id === id);
  if (!template) return;

  try {
    await navigator.clipboard.writeText(template.message);
    alert("Template copied.");
  } catch {
    alert("Could not copy the template automatically.");
  }
};

function bindMobileNavigation(){
  const toggle=byId("mobileNavToggle"), nav=byId("nav");
  if(!toggle||!nav||toggle.dataset.bound)return;
  toggle.dataset.bound="1";
  toggle.addEventListener("click",()=>{const open=!nav.classList.contains("mobile-open");nav.classList.toggle("mobile-open",open);toggle.setAttribute("aria-expanded",String(open));});
  nav.addEventListener("click",e=>{if(e.target.closest(".nav-item")&&window.innerWidth<=980){nav.classList.remove("mobile-open");toggle.setAttribute("aria-expanded","false");}});
}

function initializeInterface() {
  bindNavigation();
  bindMobileNavigation();
  bindModals();
  bindForms();
  bindControls();
  bindStartWork();
  bindAssistant();
  bindDailyReset();
}

window.initStatusOSApp = async function initStatusOSApp() {
  if (!appInitialized) {
    initializeInterface();
    await loadCloud();
    await startRealtimeSync();
    appInitialized = true;
  }

  renderAll();
};


function bindDailyReset() {
  const thoughts = [
    "Focus on the next important thing.",
    "Finish one thing before starting another.",
    "Your attention creates your direction.",
    "See the result clearly, then begin.",
    "Calm work creates strong results.",
    "Small consistent actions build the vision.",
    "Keep your word to yourself today."
  ];

  const todayKey = new Date().toISOString().slice(0, 10);
  const storageKey = `statusos-reset-${todayKey}`;
  let resetState = {};

  try {
    resetState = JSON.parse(localStorage.getItem(storageKey) || "{}");
  } catch {
    resetState = {};
  }

  const dailyThought = document.getElementById("dailyThought");
  const morningResetDone = document.getElementById("morningResetDone");
  const startMyDayBtn = document.getElementById("startMyDayBtn");
  const eveningWins = document.getElementById("eveningWins");
  const eveningLesson = document.getElementById("eveningLesson");
  const tomorrowPriority = document.getElementById("tomorrowPriority");
  const saveEveningResetBtn = document.getElementById("saveEveningResetBtn");
  const eveningResetStatus = document.getElementById("eveningResetStatus");

  if (dailyThought) {
    const dayIndex = Math.floor(Date.now() / 86400000) % thoughts.length;
    dailyThought.textContent = thoughts[dayIndex];
  }

  if (morningResetDone) morningResetDone.checked = Boolean(resetState.morningDone);
  if (eveningWins) eveningWins.value = resetState.wins || "";
  if (eveningLesson) eveningLesson.value = resetState.lesson || "";
  if (tomorrowPriority) tomorrowPriority.value = resetState.tomorrow || "";

  function saveResetState() {
    localStorage.setItem(storageKey, JSON.stringify(resetState));
  }

  if (morningResetDone) {
    morningResetDone.addEventListener("change", () => {
      resetState.morningDone = morningResetDone.checked;
      saveResetState();
    });
  }

  if (startMyDayBtn) {
    startMyDayBtn.addEventListener("click", () => {
      resetState.morningDone = true;
      if (morningResetDone) morningResetDone.checked = true;
      saveResetState();

      const dashboardButton = document.querySelector('[data-view="dashboard"]');
      if (dashboardButton) dashboardButton.click();
    });
  }

  if (saveEveningResetBtn) {
    saveEveningResetBtn.addEventListener("click", () => {
      resetState.wins = eveningWins?.value.trim() || "";
      resetState.lesson = eveningLesson?.value.trim() || "";
      resetState.tomorrow = tomorrowPriority?.value.trim() || "";
      resetState.eveningDone = true;
      saveResetState();

      if (eveningResetStatus) {
        eveningResetStatus.textContent = "Evening reset saved.";
      }
    });
  }

  document.querySelectorAll("[data-view-jump]").forEach(button => {
    button.addEventListener("click", () => {
      const view = button.dataset.viewJump;
      const navButton = document.querySelector(`[data-view="${view}"]`);
      if (navButton) navButton.click();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderDashboardHeader();
});


function bindAssistant() {
  const input = document.getElementById("assistantInput");
  const sendButton = document.getElementById("assistantSend");
  const messages = document.getElementById("assistantMessages");

  if (!input || !sendButton || !messages) return;

  async function sendAssistantMessage() {
    const message = input.value.trim();

    if (!message) return;

    const userMessage = document.createElement("div");
    userMessage.className = "assistant-message user";
    userMessage.textContent = message;
    messages.appendChild(userMessage);

    const assistantReply = document.createElement("div");
    assistantReply.className = "assistant-message ai";
    assistantReply.textContent = "StatusOS AI is thinking...";
    messages.appendChild(assistantReply);

    input.value = "";
    messages.scrollTop = messages.scrollHeight;

    try {
      const { data, error } = await window.statusOSSupabase.functions.invoke(
        "statusos-ai",
        {
          body: { message }
        }
      );

      if (error) throw error;

      assistantReply.textContent =
        data?.reply || "StatusOS AI did not return a response.";
    } catch (error) {
      console.error("StatusOS AI request failed:", error);
      assistantReply.textContent =
        error?.message || "StatusOS AI could not complete the request.";
    }

    input.focus();
    messages.scrollTop = messages.scrollHeight;
  }

  sendButton.addEventListener("click", sendAssistantMessage);

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      sendAssistantMessage();
    }
  });
}

// Release 007 Mission Control + Cloud Task Engine
(function () {
  function getTasks() {
    return window.StatusOS?.Storage?.getTasks?.() || [];
  }

  function saveTasks(tasks) {
    window.StatusOS?.Storage?.saveTasks?.(tasks);
  }

  function persistTask(task) {
    task.updatedAt = new Date().toISOString();
    window.StatusOS?.Sync?.queueUpsert?.(task);
  }

  function setNodeText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function renderMissionControl(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(task => task.done).length;
    const remaining = total - completed;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    setNodeText("missionPercent", `${percent}%`);
    setNodeText("missionProgressText", `${completed} of ${total} tasks complete`);
    setNodeText("missionCompleted", String(completed));
    setNodeText("missionRemaining", String(remaining));
    setNodeText("missionProductivity", `${percent}%`);
    setNodeText("missionTotal", String(total));

    const bar = document.getElementById("missionProgressBar");
    if (bar) bar.style.width = `${percent}%`;

    const completeState = document.getElementById("missionCompleteState");
    if (completeState) completeState.classList.toggle("hidden", total === 0 || completed !== total);

    const focusList = document.getElementById("missionFocusList");
    if (!focusList) return;
    focusList.innerHTML = "";
    const focusTasks = tasks.filter(task => !task.done).slice(0, 5);

    if (!focusTasks.length) {
      const empty = document.createElement("div");
      empty.className = "mission-focus-empty";
      empty.innerHTML = total
        ? "<strong>Mission complete.</strong><span>Everything is finished for today.</span>"
        : "<strong>No tasks yet.</strong><span>Add tasks in the Task Engine to build today’s mission.</span>";
      focusList.appendChild(empty);
      return;
    }

    focusTasks.forEach(task => {
      const row = document.createElement("label");
      row.className = "mission-focus-item";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(task.done);
      checkbox.addEventListener("change", () => {
        const current = getTasks();
        const match = current.find(item => item.id === task.id);
        if (match) {
          match.done = checkbox.checked;
          persistTask(match);
        }
        saveTasks(current);
        renderTasks();
      });
      const text = document.createElement("span");
      text.textContent = task.text;
      row.append(checkbox, text);
      focusList.appendChild(row);
    });
  }

  function renderTasks() {
    const tasks = getTasks();
    const list = document.getElementById("taskList");
    const emptyState = document.getElementById("taskEmptyState");
    const completed = tasks.filter(task => task.done).length;
    setNodeText("taskEngineSummary", `${tasks.length} task${tasks.length === 1 ? "" : "s"} · ${completed} complete`);
    if (emptyState) emptyState.classList.toggle("hidden", tasks.length > 0);

    if (list) {
      list.innerHTML = "";
      tasks.forEach(task => {
        const li = document.createElement("li");
        li.className = `task-engine-item${task.done ? " completed" : ""}`;
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(task.done);
        checkbox.setAttribute("aria-label", `Mark ${task.text} complete`);
        checkbox.addEventListener("change", () => {
          task.done = checkbox.checked;
          persistTask(task);
          saveTasks(tasks);
          renderTasks();
        });
        const text = document.createElement("span");
        text.className = "task-engine-text";
        text.textContent = task.text;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "task-delete-button";
        remove.textContent = "Delete";
        remove.addEventListener("click", () => {
          saveTasks(tasks.filter(item => item.id !== task.id));
          window.StatusOS?.Sync?.queueDelete?.(task.id);
          renderTasks();
        });
        li.append(checkbox, text, remove);
        list.appendChild(li);
      });
    }
    renderMissionControl(tasks);
  }

  function addTask() {
    const input = document.getElementById("taskInput");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const now = new Date().toISOString();
    const tasks = getTasks();
    const task = window.StatusOS.Storage.normalizeTask({
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      text,
      done: false,
      createdAt: now,
      updatedAt: now
    });
    tasks.push(task);
    saveTasks(tasks);
    window.StatusOS?.Sync?.queueUpsert?.(task);
    input.value = "";
    renderTasks();
    input.focus();
  }

  function updateSyncIndicator(event) {
    const status = event?.detail?.status || window.StatusOS?.Sync?.status?.() || "local";
    const detail = event?.detail?.detail || "";
    const indicator = document.getElementById("syncIndicator");
    if (!indicator) return;
    const labels = { synced: "Synced", syncing: "Syncing…", offline: "Offline", pending: "Pending", setup: "Cloud setup needed", local: "Local only" };
    indicator.dataset.status = status;
    indicator.querySelector("span").textContent = labels[status] || "Local only";
    indicator.title = detail || labels[status] || "Sync status";
  }

  window.addEventListener("DOMContentLoaded", async () => {
    const addButton = document.getElementById("addTaskBtn");
    const input = document.getElementById("taskInput");
    const clearButton = document.getElementById("clearCompletedTasksBtn");
    if (addButton) addButton.addEventListener("click", addTask);
    if (input) input.addEventListener("keydown", event => { if (event.key === "Enter") addTask(); });
    if (clearButton) clearButton.addEventListener("click", () => {
      const tasks = getTasks();
      tasks.filter(task => task.done).forEach(task => window.StatusOS?.Sync?.queueDelete?.(task.id));
      saveTasks(tasks.filter(task => !task.done));
      renderTasks();
    });
    window.addEventListener("statusos:sync-status", updateSyncIndicator);
    window.addEventListener("statusos:tasks-updated", renderTasks);
    renderTasks();
    updateSyncIndicator();
    await window.StatusOS?.Sync?.initialize?.();
  });

  window.StatusOS = window.StatusOS || {};
  window.StatusOS.Tasks = { list: getTasks, render: renderTasks, add: addTask };
})();

// v1.2.1 Flexible Habit Goals
(function () {
  const api = () => window.StatusOS?.Habits;
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const periodWord = (habit, count = 1) => habit.period === "daily" ? (count === 1 ? "day" : "days") : habit.period === "monthly" ? (count === 1 ? "month" : "months") : (count === 1 ? "week" : "weeks");
  function renderHabits() {
    const habits = api()?.list?.() || [];
    const states = habits.map(h => ({ habit: h, progress: api().progress(h), streak: api().streak(h) }));
    const met = states.filter(s => s.progress.complete).length;
    const score = states.length ? Math.round(states.reduce((n,s)=>n+s.progress.percent,0)/states.length) : 0;
    const best = states.reduce((max,s)=>Math.max(max,s.streak),0);
    setText('habitCompletedToday', String(met));
    setText('habitCompletedLabel', `of ${habits.length} commitment${habits.length === 1 ? '' : 's'} met`);
    setText('habitDailyScore', `${score}%`); setText('habitBestStreak', String(best));
    setText('habitEngineSummary', `${habits.length} commitment${habits.length === 1 ? '' : 's'} · ${met} target${met === 1 ? '' : 's'} met`);
    setText('dashboardHabitScore', `${score}%`);
    setText('dashboardHabitText', habits.length ? `${met} of ${habits.length} current commitments met` : 'No habits added yet');
    const bar = document.getElementById('dashboardHabitBar'); if (bar) bar.style.width = `${score}%`;
    const empty = document.getElementById('habitEmptyState'); if (empty) empty.classList.toggle('hidden', habits.length > 0);
    const list = document.getElementById('habitList'); if (!list) return; list.innerHTML = '';
    states.forEach(({habit, progress, streak}) => {
      const doneToday = api().isDoneToday(habit); const li = document.createElement('li'); li.className = `habit-item${progress.complete ? ' completed' : ''}`;
      const check = document.createElement('input'); check.type='checkbox'; check.className='habit-check'; check.checked=doneToday;
      check.setAttribute('aria-label', `Log ${habit.name} today`);
      check.addEventListener('change', async()=>{ await api().save(api().toggleToday(habit, check.checked)); renderHabits(); });
      const main=document.createElement('div'); main.className='habit-main';
      const name=document.createElement('strong'); name.textContent=habit.name;
      const detail=document.createElement('small'); detail.textContent=`${progress.count} / ${progress.target} this ${periodWord(habit)} · ${progress.percent}%`;
      const track=document.createElement('div'); track.className='habit-progress-track'; const fill=document.createElement('span'); fill.style.width=`${progress.percent}%`; track.append(fill);
      main.append(name,detail,track);
      const streakEl=document.createElement('span'); streakEl.className='habit-streak'; streakEl.textContent=`🔥 ${streak} ${periodWord(habit, streak)}`;
      const actions=document.createElement('div'); actions.className='habit-actions';
      const logDate=document.createElement('button'); logDate.className='button secondary habit-log-date'; logDate.type='button'; logDate.textContent='Log Date';
      logDate.addEventListener('click',()=>openHabitLog(habit));
      const remove=document.createElement('button'); remove.className='task-delete-button'; remove.type='button'; remove.textContent='Delete';
      remove.addEventListener('click', async()=>{ await api().delete(habit.id); renderHabits(); });
      actions.append(logDate,remove);
      li.append(check,main,streakEl,actions); list.append(li);
    });
  }
  let activeHabitLogId = null;
  function openHabitLog(habit) {
    activeHabitLogId = habit.id;
    const modal=document.getElementById('habitLogModal'); const date=document.getElementById('habitLogDate');
    setText('habitLogName', habit.name);
    if (date) { date.value=api().todayKey(); date.max=api().todayKey(); }
    modal?.showModal();
    setTimeout(()=>date?.focus(),0);
  }
  async function saveHabitDate(remove=false) {
    const habit=(api()?.list?.()||[]).find(h=>h.id===activeHabitLogId);
    const date=document.getElementById('habitLogDate')?.value;
    if (!habit || !date) return;
    await api().save(api().toggleDate(habit,date,!remove));
    document.getElementById('habitLogModal')?.close();
    renderHabits();
  }
  async function addHabit() {
    const input=document.getElementById('habitInput'); const period=document.getElementById('habitPeriod'); const target=document.getElementById('habitTarget');
    if (!input?.value.trim()) return;
    const habit=api().normalize({name:input.value.trim(),period:period?.value||'weekly',target:Number(target?.value||1),completionDates:[]});
    input.value=''; await api().save(habit); renderHabits(); input.focus();
  }
  window.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('addHabitBtn')?.addEventListener('click',addHabit);
    document.getElementById('habitInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')addHabit();});
    document.getElementById('habitPeriod')?.addEventListener('change',e=>{const t=document.getElementById('habitTarget'); if(t) t.value=e.target.value==='daily'?'1':e.target.value==='monthly'?'4':'3';});
    document.getElementById('resetHabitsTodayBtn')?.addEventListener('click',async()=>{for(const h of api()?.list?.()||[]) if(api().isDoneToday(h)) await api().save(api().toggleToday(h,false)); renderHabits();});
    document.getElementById('habitLogForm')?.addEventListener('submit',e=>{e.preventDefault(); saveHabitDate(false);});
    document.getElementById('habitLogRemove')?.addEventListener('click',()=>saveHabitDate(true));
    document.getElementById('habitLogCancel')?.addEventListener('click',()=>document.getElementById('habitLogModal')?.close());
    window.addEventListener('statusos:habits-updated',renderHabits); renderHabits(); api()?.pull?.().then(renderHabits);
  });
  window.addEventListener('statusos:view-change',renderHabits);
})();

// v0.9.0 Music OS
(function () {
  const api = () => window.StatusOS?.Music;
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const escapeText = value => String(value || "");
  const activeStatuses = new Set(["Idea", "In Progress", "Waiting on Client", "Revisions", "Ready to Deliver"]);

  function daysUntil(date) {
    if (!date) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(`${date}T00:00:00`);
    return Math.ceil((target - today) / 86400000);
  }

  function stats(items) {
    const active = items.filter(item => activeStatuses.has(item.status)).length;
    const complete = items.filter(item => item.status === "Complete").length;
    const due = items.filter(item => { const days = daysUntil(item.deadline); return item.status !== "Complete" && days !== null && days >= 0 && days <= 7; }).length;
    return { active, complete, due, total: items.length };
  }

  function render() {
    const items = api()?.list?.() || [];
    const summary = stats(items);
    setText("musicActiveCount", summary.active);
    setText("musicDueSoonCount", summary.due);
    setText("musicCompletedCount", summary.complete);
    setText("musicTotalCount", summary.total);
    setText("musicDashboardActive", summary.active);
    setText("musicDashboardDue", summary.due);
    setText("musicDashboardComplete", summary.complete);

    const next = items.filter(item => item.status !== "Complete").sort((a,b) => {
      const pa = {High:0,Medium:1,Low:2}[a.priority] ?? 1;
      const pb = {High:0,Medium:1,Low:2}[b.priority] ?? 1;
      if (pa !== pb) return pa-pb;
      return (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
    })[0];
    setText("musicDashboardNext", next ? `Next: ${next.title}${next.client ? ` · ${next.client}` : ""}` : "No active music projects.");

    const filter = document.getElementById("musicFilter")?.value || "";
    const shown = filter ? items.filter(item => item.status === filter) : items;
    const list = document.getElementById("musicProjectList");
    const empty = document.getElementById("musicEmptyState");
    if (!list) return;
    list.innerHTML = "";
    if (empty) empty.classList.toggle("hidden", shown.length > 0);

    shown.sort((a,b) => (a.status === "Complete") - (b.status === "Complete") || (a.deadline || "9999").localeCompare(b.deadline || "9999")).forEach(item => {
      const row = document.createElement("div"); row.className = "music-project-item";
      const main = document.createElement("div"); main.className = "music-project-main";
      const title = document.createElement("strong"); title.textContent = escapeText(item.title);
      const subtitle = document.createElement("small"); subtitle.textContent = [item.client, item.notes].filter(Boolean).join(" · ") || "No client or notes";
      main.append(title, subtitle);

      const tags = document.createElement("div"); tags.className = "music-project-tags";
      [item.type, item.status].forEach(text => { const tag=document.createElement("span"); tag.className="music-tag"; tag.textContent=text; tags.append(tag); });
      const priority = document.createElement("span"); priority.className = `music-tag music-priority-${item.priority.toLowerCase()}`; priority.textContent = `${item.priority} priority`; tags.append(priority);

      const meta = document.createElement("div"); meta.className = "music-project-meta";
      const days = daysUntil(item.deadline);
      meta.textContent = item.deadline ? (days < 0 ? `Overdue by ${Math.abs(days)} day${Math.abs(days)===1?'':'s'}` : days === 0 ? "Due today" : `Due in ${days} day${days===1?'':'s'}`) : "No deadline";

      const actions = document.createElement("div"); actions.className = "music-project-actions";
      const advance = document.createElement("button"); advance.className = "text-button"; advance.type="button";
      const flow = ["Idea","In Progress","Waiting on Client","Revisions","Ready to Deliver","Complete"];
      const idx = flow.indexOf(item.status); advance.textContent = item.status === "Complete" ? "Reopen" : "Next Stage";
      advance.addEventListener("click", async () => { item.status = item.status === "Complete" ? "In Progress" : flow[Math.min(idx+1, flow.length-1)]; await api().save(item); render(); });
      const del = document.createElement("button"); del.className="task-delete-button"; del.type="button"; del.textContent="Delete";
      del.addEventListener("click", async () => { await api().delete(item.id); render(); });
      actions.append(advance, del);
      row.append(main, tags, meta, actions); list.append(row);
    });
  }

  async function addProject() {
    const title = document.getElementById("musicTitle")?.value.trim();
    if (!title) return;
    const item = api().normalize({
      title,
      client: document.getElementById("musicClient")?.value.trim(),
      type: document.getElementById("musicType")?.value,
      status: document.getElementById("musicStatus")?.value,
      deadline: document.getElementById("musicDeadline")?.value || null,
      priority: document.getElementById("musicPriority")?.value,
      notes: document.getElementById("musicNotes")?.value.trim()
    });
    await api().save(item);
    ["musicTitle","musicClient","musicDeadline","musicNotes"].forEach(id => { const el=document.getElementById(id); if(el) el.value=""; });
    document.getElementById("musicProjectFormCard")?.classList.add("hidden");
    render();
  }

  window.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("openMusicProjectForm")?.addEventListener("click", () => document.getElementById("musicProjectFormCard")?.classList.remove("hidden"));
    document.getElementById("closeMusicProjectForm")?.addEventListener("click", () => document.getElementById("musicProjectFormCard")?.classList.add("hidden"));
    document.getElementById("saveMusicProjectBtn")?.addEventListener("click", addProject);
    document.getElementById("musicFilter")?.addEventListener("change", render);
    window.addEventListener("statusos:music-updated", render);
    render();
    await api()?.pull?.();
    render();
  });
})();

/* StatusOS v1.4.1 Navigation Cleanup */
(function bindNavigationCleanup(){
  function init(){
    const profileButton = document.getElementById('profileMenuBtn');
    const profileMenu = document.getElementById('profileMenu');
    const developerNav = document.getElementById('developerNav');
    const exportButton = document.getElementById('exportBtn');
    const importInput = document.getElementById('importInput');
    const profileExport = document.getElementById('profileExportBtn');
    const profileImport = document.getElementById('profileImportBtn');
    const aboutButton = document.getElementById('profileAboutBtn');

    const closeProfile = () => {
      if (!profileMenu || !profileButton) return;
      profileMenu.classList.add('hidden');
      profileButton.setAttribute('aria-expanded', 'false');
    };

    profileButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      const opening = profileMenu?.classList.contains('hidden');
      profileMenu?.classList.toggle('hidden');
      profileButton.setAttribute('aria-expanded', opening ? 'true' : 'false');
    });

    profileMenu?.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', closeProfile);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeProfile();

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        developerNav?.classList.remove('hidden');
        developerNav?.click();
        closeProfile();
      }
    });

    document.querySelectorAll('#profileMenu [data-view]').forEach((button) => {
      button.addEventListener('click', closeProfile);
    });

    profileExport?.addEventListener('click', () => {
      closeProfile();
      exportButton?.click();
    });

    profileImport?.addEventListener('click', () => {
      closeProfile();
      importInput?.click();
    });

    aboutButton?.addEventListener('click', () => {
      closeProfile();
      alert('StatusOS v1.4.1\nYour Personal Operating System\n\nSimple. Fast. Intentional.');
    });

    document.querySelectorAll('.nav-group .nav-item').forEach((button) => {
      button.addEventListener('click', () => {
        const group = button.closest('details');
        if (group) group.open = true;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

// v1.5.0 Mission Control 2.0
(function(){
  const setHTML=(id,html)=>{const el=document.getElementById(id);if(el)el.innerHTML=html;};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderTop3(){
    const tasks=window.StatusOS?.Tasks?.list?.()||[];
    const open=tasks.filter(t=>!t.done).slice(0,3);
    if(!open.length){setHTML('missionV2Top3','<div class="mission-v2-empty">No unfinished tasks. Your mission is clear.</div>');return;}
    setHTML('missionV2Top3',open.map((t,i)=>`<div class="mission-v2-row"><div class="mission-v2-taskline"><span class="mission-v2-rank">${i+1}</span><strong>${esc(t.text)}</strong></div><small>${i===0?'Start here':'Next priority'}</small></div>`).join(''));
  }
  function renderHabits(){
    const api=window.StatusOS?.Habits; const habits=api?.list?.()||[];
    if(!habits.length){setHTML('missionV2Habits','<div class="mission-v2-empty">No commitments added yet.</div>');return;}
    setHTML('missionV2Habits',habits.slice(0,4).map(h=>{const p=api.progress(h);return `<div class="mission-v2-row"><div class="mission-v2-row-head"><strong>${esc(h.name)}</strong><small>${p.count} / ${p.target}</small></div><div class="mission-v2-mini-track"><span style="width:${p.percent}%"></span></div><small>${p.complete?'Commitment met':'Keep going'} · ${p.percent}%</small></div>`}).join(''));
  }
  function daysUntil(date){if(!date)return 9999;const a=new Date();a.setHours(0,0,0,0);return Math.ceil((new Date(date+'T00:00:00')-a)/86400000)}
  function renderMusic(){
    const items=window.StatusOS?.Music?.list?.()||[];
    const active=items.filter(x=>x.status!=='Complete').sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline)).slice(0,4);
    if(!active.length){setHTML('missionV2Music','<div class="mission-v2-empty">No active music projects.</div>');return;}
    setHTML('missionV2Music',active.map(x=>{const d=daysUntil(x.deadline);const due=!x.deadline?'No deadline':d<0?`${Math.abs(d)} day${Math.abs(d)===1?'':'s'} overdue`:d===0?'Due today':`${d} day${d===1?'':'s'} left`;return `<div class="mission-v2-row"><div class="mission-v2-row-head"><strong>${esc(x.title||x.name||'Untitled project')}</strong><small>${esc(x.status||'Active')}</small></div><small>${esc(x.client||x.artist||'Independent')} · ${due}</small></div>`}).join(''));
  }
  function render(){renderTop3();renderHabits();renderMusic();}
  window.addEventListener('DOMContentLoaded',render);
  ['statusos:tasks-updated','statusos:habits-updated','statusos:music-updated','statusos:view-change'].forEach(e=>window.addEventListener(e,render));
  window.StatusOS=window.StatusOS||{};window.StatusOS.MissionV2={render};
})();
