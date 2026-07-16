(function () {
  const TABLE = "tasks";
  let currentStatus = "local";
  let syncTimer = null;
  let realtimeChannel = null;
  let syncInProgress = false;

  function emitStatus(status, detail = "") {
    currentStatus = status;
    window.dispatchEvent(new CustomEvent("statusos:sync-status", { detail: { status, detail } }));
  }

  async function getContext() {
    const client = window.statusOSSupabase;
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error || !data?.session?.user) return null;
    return { client, user: data.session.user };
  }

  function toRow(task, userId) {
    return {
      id: task.id,
      user_id: userId,
      title: task.text,
      completed: Boolean(task.done),
      priority: task.priority || "medium",
      category: task.category || "Productivity",
      created_at: task.createdAt,
      updated_at: task.updatedAt
    };
  }

  function fromRow(row) {
    return window.StatusOS.Storage.normalizeTask({
      id: row.id,
      text: row.title,
      done: row.completed,
      priority: row.priority,
      category: row.category,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  function isMissingTable(error) {
    const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
    return text.includes("42p01") || text.includes("does not exist") || text.includes("schema cache");
  }

  async function pushOperation(operation, context) {
    const { client, user } = context;
    if (operation.type === "delete") {
      const { error } = await client.from(TABLE).delete().eq("id", operation.taskId).eq("user_id", user.id);
      if (error) throw error;
      return;
    }
    const task = window.StatusOS.Storage.normalizeTask(operation.task);
    const { error } = await client.from(TABLE).upsert(toRow(task, user.id), { onConflict: "id" });
    if (error) throw error;
  }

  async function flushQueue() {
    if (syncInProgress) return;
    if (!navigator.onLine) {
      emitStatus("offline", "Changes are saved locally.");
      return;
    }
    const context = await getContext();
    if (!context) {
      emitStatus("local", "Sign in to enable cloud sync.");
      return;
    }

    const queue = window.StatusOS.Storage.getQueue();
    if (!queue.length) {
      emitStatus("synced");
      return;
    }

    syncInProgress = true;
    emitStatus("syncing", `${queue.length} pending change${queue.length === 1 ? "" : "s"}`);
    const remaining = [];
    try {
      for (const operation of queue) {
        try {
          await pushOperation(operation, context);
        } catch (error) {
          if (isMissingTable(error)) {
            emitStatus("setup", "Cloud table setup required.");
            remaining.push(operation);
            break;
          }
          console.error("StatusOS sync operation failed:", error);
          remaining.push(operation);
        }
      }
      window.StatusOS.Storage.saveQueue(remaining);
      if (!remaining.length) emitStatus("synced");
      else if (currentStatus !== "setup") emitStatus("pending", `${remaining.length} change${remaining.length === 1 ? "" : "s"} pending`);
    } finally {
      syncInProgress = false;
    }
  }

  async function pullTasks() {
    if (!navigator.onLine) return window.StatusOS.Storage.getTasks();
    const context = await getContext();
    if (!context) return window.StatusOS.Storage.getTasks();

    emitStatus("syncing", "Loading cloud tasks");
    const { data, error } = await context.client.from(TABLE).select("*").eq("user_id", context.user.id).order("created_at", { ascending: true });
    if (error) {
      if (isMissingTable(error)) emitStatus("setup", "Cloud table setup required.");
      else {
        console.error("StatusOS cloud task load failed:", error);
        emitStatus("pending", "Using local task cache.");
      }
      return window.StatusOS.Storage.getTasks();
    }

    const cloudTasks = (data || []).map(fromRow);
    const localTasks = window.StatusOS.Storage.getTasks();
    const merged = new Map();
    [...cloudTasks, ...localTasks].forEach(task => {
      const existing = merged.get(task.id);
      if (!existing || new Date(task.updatedAt) >= new Date(existing.updatedAt)) merged.set(task.id, task);
    });
    const tasks = Array.from(merged.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    window.StatusOS.Storage.saveTasks(tasks);

    for (const task of tasks) {
      if (!cloudTasks.some(item => item.id === task.id)) {
        window.StatusOS.Storage.queueOperation({ type: "upsert", taskId: task.id, task });
      }
    }
    await flushQueue();
    window.dispatchEvent(new CustomEvent("statusos:tasks-updated", { detail: { source: "cloud" } }));
    return tasks;
  }

  function queueUpsert(task) {
    window.StatusOS.Storage.queueOperation({ type: "upsert", taskId: task.id, task });
    emitStatus(navigator.onLine ? "pending" : "offline");
    scheduleSync();
  }

  function queueDelete(taskId) {
    window.StatusOS.Storage.queueOperation({ type: "delete", taskId });
    emitStatus(navigator.onLine ? "pending" : "offline");
    scheduleSync();
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(flushQueue, 300);
  }

  async function subscribeRealtime() {
    const context = await getContext();
    if (!context || !context.client.channel) return;
    if (realtimeChannel) context.client.removeChannel(realtimeChannel);
    realtimeChannel = context.client
      .channel(`statusos-tasks-${context.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `user_id=eq.${context.user.id}` }, () => pullTasks())
      .subscribe();
  }

  async function initialize() {
    emitStatus(navigator.onLine ? "syncing" : "offline");
    await flushQueue();
    await pullTasks();
    await subscribeRealtime();
  }

  window.addEventListener("online", () => { emitStatus("syncing", "Connection restored"); initialize(); });
  window.addEventListener("offline", () => emitStatus("offline", "Changes are saved locally."));

  window.StatusOS = window.StatusOS || {};
  window.StatusOS.Sync = {
    initialize,
    pullTasks,
    flushQueue,
    queueUpsert,
    queueDelete,
    status: () => currentStatus
  };
})();
