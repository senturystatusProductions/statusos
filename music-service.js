(function () {
  const KEY = "statusos_music_projects_v1";
  const TABLE = "music_projects";
  const now = () => new Date().toISOString();

  function normalize(project) {
    const created = project.createdAt || project.created_at || now();
    return {
      id: project.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      title: String(project.title || "Untitled project"),
      client: String(project.client || ""),
      type: String(project.type || "Other"),
      status: String(project.status || "Idea"),
      deadline: project.deadline || null,
      priority: String(project.priority || "Medium"),
      notes: String(project.notes || ""),
      createdAt: created,
      updatedAt: project.updatedAt || project.updated_at || created
    };
  }

  function list() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(value) ? value.map(normalize) : [];
    } catch { return []; }
  }

  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items.map(normalize)));
    window.dispatchEvent(new CustomEvent("statusos:music-updated"));
  }

  async function context() {
    const client = window.statusOSSupabase;
    if (!client || !navigator.onLine) return null;
    const { data } = await client.auth.getSession();
    return data?.session?.user ? { client, user: data.session.user } : null;
  }

  function toRow(project, userId) {
    return {
      id: project.id,
      user_id: userId,
      title: project.title,
      client: project.client || null,
      project_type: project.type,
      status: project.status,
      deadline: project.deadline || null,
      priority: project.priority,
      notes: project.notes || null,
      created_at: project.createdAt,
      updated_at: project.updatedAt
    };
  }

  async function save(project) {
    const item = normalize(project);
    item.updatedAt = now();
    const items = list();
    const index = items.findIndex(entry => entry.id === item.id);
    if (index >= 0) items[index] = item; else items.push(item);
    write(items);
    const ctx = await context();
    if (ctx) {
      const { error } = await ctx.client.from(TABLE).upsert(toRow(item, ctx.user.id), { onConflict: "id" });
      if (error) console.warn("Music project cloud save failed", error);
    }
    return item;
  }

  async function remove(id) {
    write(list().filter(item => item.id !== id));
    const ctx = await context();
    if (ctx) await ctx.client.from(TABLE).delete().eq("id", id).eq("user_id", ctx.user.id);
  }

  async function pull() {
    const ctx = await context();
    if (!ctx) return list();
    const { data, error } = await ctx.client.from(TABLE).select("*").eq("user_id", ctx.user.id).order("created_at");
    if (error) return list();
    const local = list();
    const merged = new Map();
    [...(data || []).map(row => normalize({ ...row, type: row.project_type })), ...local].forEach(item => {
      const current = merged.get(item.id);
      if (!current || new Date(item.updatedAt) >= new Date(current.updatedAt)) merged.set(item.id, item);
    });
    const items = [...merged.values()];
    write(items);
    for (const item of items) {
      if (!(data || []).some(row => row.id === item.id)) {
        await ctx.client.from(TABLE).upsert(toRow(item, ctx.user.id), { onConflict: "id" });
      }
    }
    return items;
  }

  window.StatusOS = window.StatusOS || {};
  window.StatusOS.Music = { list, save, delete: remove, pull, normalize };
})();
