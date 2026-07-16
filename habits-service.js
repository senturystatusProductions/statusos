(function () {
  const HABIT_KEY = "statusos_habits_v1";
  const TABLE = "habits";
  const localDateKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  function readLocal() {
    try {
      const value = JSON.parse(localStorage.getItem(HABIT_KEY) || "[]");
      return Array.isArray(value) ? value.map(normalizeHabit) : [];
    } catch { return []; }
  }

  function writeLocal(habits) { localStorage.setItem(HABIT_KEY, JSON.stringify(habits.map(normalizeHabit))); }

  function normalizeHabit(habit) {
    const now = new Date().toISOString();
    const legacyDate = habit.completedDate || habit.completed_date || null;
    const dates = habit.completionDates || habit.completion_dates || (legacyDate ? [legacyDate] : []);
    const period = ["daily", "weekly", "monthly"].includes(habit.period) ? habit.period : "daily";
    return {
      id: habit.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      name: String(habit.name || "Untitled habit"),
      period,
      target: Math.max(1, Number(habit.target || 1)),
      completionDates: [...new Set((Array.isArray(dates) ? dates : []).filter(Boolean))].sort(),
      createdAt: habit.createdAt || habit.created_at || now,
      updatedAt: habit.updatedAt || habit.updated_at || now
    };
  }

  const parseDate = key => new Date(`${key}T12:00:00`);
  const startOfWeek = (date = new Date()) => {
    const copy = new Date(date); const day = copy.getDay();
    copy.setHours(12,0,0,0); copy.setDate(copy.getDate() - ((day + 6) % 7)); return copy;
  };
  const periodKey = (date, period) => {
    if (period === "daily") return localDateKey(date);
    if (period === "monthly") return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
    return localDateKey(startOfWeek(date));
  };
  function countInPeriod(habit, date = new Date()) {
    const key = periodKey(date, habit.period);
    return habit.completionDates.filter(d => periodKey(parseDate(d), habit.period) === key).length;
  }
  function progress(habit, date = new Date()) {
    const count = countInPeriod(habit, date);
    return { count, target: habit.target, percent: Math.min(100, Math.round(count / habit.target * 100)), complete: count >= habit.target };
  }
  function isDoneToday(habit) { return habit.completionDates.includes(localDateKey()); }
  function shiftPeriod(date, period, amount) {
    const d = new Date(date);
    if (period === "daily") d.setDate(d.getDate()+amount);
    else if (period === "weekly") d.setDate(d.getDate()+amount*7);
    else d.setMonth(d.getMonth()+amount);
    return d;
  }
  function streak(habit) {
    let cursor = new Date();
    let current = progress(habit, cursor);
    if (!current.complete) cursor = shiftPeriod(cursor, habit.period, -1);
    let total = 0;
    for (let i=0; i<520; i++) {
      if (!progress(habit, cursor).complete) break;
      total++; cursor = shiftPeriod(cursor, habit.period, -1);
    }
    return total;
  }

  async function context() {
    const client = window.statusOSSupabase;
    if (!client || !navigator.onLine) return null;
    const { data } = await client.auth.getSession();
    return data?.session?.user ? { client, user: data.session.user } : null;
  }
  function toRow(habit, userId) {
    return { id: habit.id, user_id: userId, name: habit.name, period: habit.period, target: habit.target,
      completion_dates: habit.completionDates, completed_date: habit.completionDates.at(-1) || null,
      streak: streak(habit), created_at: habit.createdAt, updated_at: habit.updatedAt };
  }
  async function saveHabit(habit) {
    habit = normalizeHabit(habit); habit.updatedAt = new Date().toISOString();
    const habits = readLocal(); const index = habits.findIndex(item => item.id === habit.id);
    if (index >= 0) habits[index] = habit; else habits.push(habit);
    writeLocal(habits); window.dispatchEvent(new CustomEvent("statusos:habits-updated"));
    const ctx = await context();
    if (ctx) { const { error } = await ctx.client.from(TABLE).upsert(toRow(habit, ctx.user.id), { onConflict: "id" }); if (error) console.warn("Habit cloud save failed", error); }
    return habit;
  }
  async function deleteHabit(id) {
    writeLocal(readLocal().filter(h => h.id !== id)); window.dispatchEvent(new CustomEvent("statusos:habits-updated"));
    const ctx = await context(); if (ctx) await ctx.client.from(TABLE).delete().eq("id", id).eq("user_id", ctx.user.id);
  }
  async function pullHabits() {
    const ctx = await context(); if (!ctx) return readLocal();
    const { data, error } = await ctx.client.from(TABLE).select("*").eq("user_id", ctx.user.id).order("created_at");
    if (error) return readLocal();
    const merged = new Map(); [...(data || []).map(normalizeHabit), ...readLocal()].forEach(h => {
      const old = merged.get(h.id); if (!old || new Date(h.updatedAt) >= new Date(old.updatedAt)) merged.set(h.id, h);
    });
    const habits = [...merged.values()]; writeLocal(habits);
    for (const h of habits) if (!(data || []).some(row => row.id === h.id)) await ctx.client.from(TABLE).upsert(toRow(h, ctx.user.id), { onConflict: "id" });
    window.dispatchEvent(new CustomEvent("statusos:habits-updated")); return habits;
  }
  function toggleDate(habit, dateKey, force) {
    habit = normalizeHabit(habit);
    const key = /^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || "")) ? String(dateKey) : localDateKey();
    const has = habit.completionDates.includes(key);
    const shouldAdd = typeof force === "boolean" ? force : !has;
    habit.completionDates = shouldAdd
      ? [...new Set([...habit.completionDates, key])].sort()
      : habit.completionDates.filter(d => d !== key);
    return habit;
  }
  function toggleToday(habit, force) { return toggleDate(habit, localDateKey(), force); }
  window.StatusOS = window.StatusOS || {};
  window.StatusOS.Habits = { list: readLocal, save: saveHabit, delete: deleteHabit, pull: pullHabits, normalize: normalizeHabit,
    isDoneToday, todayKey: localDateKey, toggleToday, toggleDate, progress, streak, countInPeriod };
})();
