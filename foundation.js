(function () {
  const VERSION = "3.3.0";
  const CODENAME = "Executive Dashboard";
  const BUILD_DATE = "2026-07-20";
  const LOG_KEY = "statusos_diagnostic_log_v1";
  const MAX_LOGS = 100;

  window.StatusOS = window.StatusOS || {};

  function safeRead(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { console.warn("StatusOS storage write failed", error); }
  }

  function addLog(level, message, context) {
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      level,
      message: String(message),
      context: context || null,
      createdAt: new Date().toISOString()
    };
    const logs = safeRead(LOG_KEY, []);
    logs.unshift(entry);
    safeWrite(LOG_KEY, logs.slice(0, MAX_LOGS));
    window.dispatchEvent(new CustomEvent("statusos:diagnostic-log", { detail: entry }));
    return entry;
  }

  const Logger = {
    info(message, context) { return addLog("info", message, context); },
    warn(message, context) { return addLog("warn", message, context); },
    error(message, context) { return addLog("error", message, context); },
    list() { return safeRead(LOG_KEY, []); },
    clear() { safeWrite(LOG_KEY, []); window.dispatchEvent(new Event("statusos:diagnostic-log")); }
  };

  async function getDiagnostics() {
    const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : null;
    let session = null;
    try {
      session = await window.statusOSSupabase?.auth?.getSession?.();
    } catch (error) {
      Logger.warn("Unable to inspect Supabase session", { message: error.message });
    }
    const tasks = window.StatusOS.Storage?.getTasks?.() || [];
    const queue = window.StatusOS.Storage?.getQueue?.() || [];
    return {
      version: VERSION,
      codename: CODENAME,
      buildDate: BUILD_DATE,
      online: navigator.onLine,
      syncStatus: window.StatusOS.Sync?.status?.() || "local",
      signedIn: Boolean(session?.data?.session?.user),
      taskCount: tasks.length,
      pendingChanges: queue.length,
      serviceWorker: registration?.active ? "Active" : registration ? "Installed" : "Unavailable",
      cacheCount: "caches" in window ? (await caches.keys()).length : 0,
      localStorageKB: Math.round(new Blob(Object.values(localStorage)).size / 1024)
    };
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function statusClass(value) {
    return ["Synced", "Active", "Online", "Yes"].includes(value) ? "good" : ["Offline", "Unavailable", "No"].includes(value) ? "bad" : "neutral";
  }

  async function renderDeveloper() {
    if (!document.getElementById("developer")) return;
    const data = await getDiagnostics();
    const fields = {
      devVersion: `v${data.version}`,
      devCodename: data.codename,
      devBuildDate: data.buildDate,
      devConnection: data.online ? "Online" : "Offline",
      devSync: data.syncStatus.charAt(0).toUpperCase() + data.syncStatus.slice(1),
      devAuth: data.signedIn ? "Yes" : "No",
      devTaskCount: String(data.taskCount),
      devPending: String(data.pendingChanges),
      devServiceWorker: data.serviceWorker,
      devCacheCount: String(data.cacheCount),
      devStorage: `${data.localStorageKB} KB`
    };
    Object.entries(fields).forEach(([id, value]) => {
      setText(id, value);
      const node = document.getElementById(id);
      if (node) node.dataset.health = statusClass(value);
    });
    renderLogs();
  }

  function renderLogs() {
    const container = document.getElementById("developerLogs");
    if (!container) return;
    const logs = Logger.list().slice(0, 20);
    container.innerHTML = "";
    if (!logs.length) {
      container.innerHTML = '<p class="muted small">No diagnostic events recorded.</p>';
      return;
    }
    logs.forEach(log => {
      const item = document.createElement("div");
      item.className = `developer-log ${log.level}`;
      const time = new Date(log.createdAt).toLocaleString();
      item.innerHTML = `<div><strong>${log.level.toUpperCase()}</strong><span>${time}</span></div><p>${escapeHTML(log.message)}</p>`;
      container.appendChild(item);
    });
  }

  function escapeHTML(value) {
    const node = document.createElement("div");
    node.textContent = value;
    return node.innerHTML;
  }

  async function clearCaches() {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    Logger.info("Application caches cleared");
    await renderDeveloper();
  }

  function exportDiagnostics() {
    getDiagnostics().then(data => {
      const payload = { generatedAt: new Date().toISOString(), diagnostics: data, logs: Logger.list() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `statusos-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      Logger.info("Diagnostics exported");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    setText("appVersionLabel", `v${VERSION} ${CODENAME}`);
    document.getElementById("refreshDiagnosticsBtn")?.addEventListener("click", renderDeveloper);
    document.getElementById("clearDiagnosticLogsBtn")?.addEventListener("click", () => { Logger.clear(); renderLogs(); });
    document.getElementById("exportDiagnosticsBtn")?.addEventListener("click", exportDiagnostics);
    document.getElementById("clearAppCachesBtn")?.addEventListener("click", clearCaches);
    document.querySelector('[data-view="developer"]')?.addEventListener("click", renderDeveloper);
    window.addEventListener("statusos:sync-status", renderDeveloper);
    window.addEventListener("statusos:tasks-updated", renderDeveloper);
    window.addEventListener("online", () => { Logger.info("Network connection restored"); renderDeveloper(); });
    window.addEventListener("offline", () => { Logger.warn("Application entered offline mode"); renderDeveloper(); });
    Logger.info(`StatusOS v${VERSION} initialized`);
  });

  window.StatusOS.Meta = Object.freeze({ version: VERSION, codename: CODENAME, buildDate: BUILD_DATE });
  window.StatusOS.Logger = Logger;
  window.StatusOS.Diagnostics = { collect: getDiagnostics, render: renderDeveloper, export: exportDiagnostics };
})();
