(function () {
  const HABIT_KEY = "statusos_habits_v1";
  const TABLE = "habits";
  const todayKey = () => new Date().toISOString().slice(0, 10);

  function readLocal() {
    try {
      const value = JSON.parse(localStorage.getItem(HABIT_KEY) || "[]");
      return Array.isArray(value) ? value.map(normalizeHabit) : [];
    } catch { return []; }
  }

  function writeLocal(habits) {
    localStorage.setItem(HABIT_KEY, JSON.stringify(habits.map(normalizeHabit)));
  }

  function normalizeHabit(habit) {
    const now = new Date().toISOString();
    return {
      id: habit.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      name: String(habit.name || "Untitled habit"),
      completedDate: habit.completedDate || habit.completed_date || null,
      streak: Number(habit.streak || 0),
      createdAt: habit.createdAt || habit.created_at || now,
      updatedAt: habit.updatedAt || habit.updated_at || now
    };
  }

  function isDoneToday(habit) { return habit.completedDate === todayKey(); }

  async function context() {
    const client = window.statusOSSupabase;
    if (!client || !navigator.onLine) return null;
    const { data } = await client.auth.getSession();
    return data?.session?.user ? { client, user: data.session.user } : null;
  }

  function toRow(habit, userId) {
    return { id: habit.id, user_id: userId, name: habit.name, completed_date: habit.completedDate, streak: habit.streak, created_at: habit.createdAt, updated_at: habit.updatedAt };
  }

  async function saveHabit(habit) {
    habit.updatedAt = new Date().toISOString();
    const habits = readLocal();
    const index = habits.findIndex(item => item.id === habit.id);
    if (index >= 0) habits[index] = normalizeHabit(habit); else habits.push(normalizeHabit(habit));
    writeLocal(habits);
    window.dispatchEvent(new CustomEvent("statusos:habits-updated"));
    const ctx = await context();
    if (ctx) {
      const { error } = await ctx.client.from(TABLE).upsert(toRow(habit, ctx.user.id), { onConflict: "id" });
      if (error) console.warn("Habit cloud save failed", error);
    }
  }

  async function deleteHabit(id) {
    writeLocal(readLocal().filter(h => h.id !== id));
    window.dispatchEvent(new CustomEvent("statusos:habits-updated"));
    const ctx = await context();
    if (ctx) await ctx.client.from(TABLE).delete().eq("id", id).eq("user_id", ctx.user.id);
  }

  async function pullHabits() {
    const ctx = await context();
    if (!ctx) return readLocal();
    const { data, error } = await ctx.client.from(TABLE).select("*").eq("user_id", ctx.user.id).order("created_at");
    if (error) return readLocal();
    const merged = new Map();
    [...(data || []).map(normalizeHabit), ...readLocal()].forEach(h => {
      const old = merged.get(h.id);
      if (!old || new Date(h.updatedAt) >= new Date(old.updatedAt)) merged.set(h.id, h);
    });
    const habits = [...merged.values()];
    writeLocal(habits);
    for (const h of habits) if (!(data || []).some(row => row.id === h.id)) await ctx.client.from(TABLE).upsert(toRow(h, ctx.user.id), { onConflict: "id" });
    window.dispatchEvent(new CustomEvent("statusos:habits-updated"));
    return habits;
  }

  window.StatusOS = window.StatusOS || {};
  window.StatusOS.Habits = { list: readLocal, save: saveHabit, delete: deleteHabit, pull: pullHabits, normalize: normalizeHabit, isDoneToday, todayKey };
})();
