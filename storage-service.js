(function () {
  const TASK_KEY = "statusos_tasks_v1";
  const QUEUE_KEY = "statusos_sync_queue_v1";

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value == null ? fallback : value;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeTask(task) {
    const now = new Date().toISOString();
    return {
      id: task.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      text: String(task.text || task.title || "Untitled task"),
      done: Boolean(task.done ?? task.completed),
      priority: task.priority || "medium",
      category: task.category || "Productivity",
      createdAt: task.createdAt || task.created_at || now,
      updatedAt: task.updatedAt || task.updated_at || now
    };
  }

  function getTasks() {
    const tasks = readJSON(TASK_KEY, []);
    return Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
  }

  function saveTasks(tasks) {
    writeJSON(TASK_KEY, tasks.map(normalizeTask));
  }

  function getQueue() {
    const queue = readJSON(QUEUE_KEY, []);
    return Array.isArray(queue) ? queue : [];
  }

  function saveQueue(queue) {
    writeJSON(QUEUE_KEY, queue);
  }

  function queueOperation(operation) {
    const queue = getQueue();
    const filtered = queue.filter(item => item.taskId !== operation.taskId);
    filtered.push({ ...operation, queuedAt: new Date().toISOString() });
    saveQueue(filtered);
    return filtered.length;
  }

  function clearQueue() {
    saveQueue([]);
  }

  window.StatusOS = window.StatusOS || {};
  window.StatusOS.Storage = {
    getTasks,
    saveTasks,
    normalizeTask,
    getQueue,
    saveQueue,
    queueOperation,
    clearQueue
  };
})();
