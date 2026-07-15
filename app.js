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

function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.error("StatusOS local data could not be loaded:", error);
    return clone(defaultState);
  }
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
  const client = getSupabaseClient();
  const user = await getSignedInUser();

  if (!client || !user) return;

  const { error } = await client
    .from("statusos_workspaces")
    .upsert(
      {
        user_id: user.id,
        app_state: state,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("StatusOS cloud save failed:", error);
  }
}

function save() {
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
    state = normalizeState(data.app_state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return;
  }

  const { error: insertError } = await client
    .from("statusos_workspaces")
    .insert({
      user_id: user.id,
      app_state: state,
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
        state = normalizeState(incoming);
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
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-item")
        .forEach(item => item.classList.remove("active"));

      document
        .querySelectorAll(".view")
        .forEach(view => view.classList.remove("active"));

      button.classList.add("active");

      const target = byId(button.dataset.view);
      if (target) target.classList.add("active");

      setText("pageTitle", button.textContent.trim());
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
  bindForm("artistForm", data => {
    state.artists.push({ id: uid(), ...data });
  });

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
  if (crmSearch) crmSearch.addEventListener("input", renderCRM);

  const crmFilter = byId("crmFilter");
  if (crmFilter) crmFilter.addEventListener("change", renderCRM);
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

function renderCRM() {
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
  renderCRM();

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

function initializeInterface() {
  bindNavigation();
  bindModals();
  bindForms();
  bindControls();
  bindAssistant();
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
