(function () {
  const HABIT_KEY = "statusos_habits_v1";
  const TABLE = "statusos_habits_v2";
  const DELETED_KEY = "statusos_habits_deleted_v1";
  const QUEUE_KEY = "statusos_habits_sync_queue_v1";
  const TOMBSTONES = "statusos_sync_tombstones";
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
  function readDeleted(){try{const x=JSON.parse(localStorage.getItem(DELETED_KEY)||"{}");return x&&typeof x==="object"?x:{};}catch{return {};}}
  function markDeleted(id, at=new Date().toISOString()){const x=readDeleted();x[id]=at;localStorage.setItem(DELETED_KEY,JSON.stringify(x));}
  function clearDeleted(id){const x=readDeleted();delete x[id];localStorage.setItem(DELETED_KEY,JSON.stringify(x));}
  function mergeDeleted(entries){const x=readDeleted();Object.entries(entries||{}).forEach(([id,at])=>{if(!x[id]||new Date(at)>new Date(x[id]))x[id]=at;});localStorage.setItem(DELETED_KEY,JSON.stringify(x));return x;}
  function readQueue(){try{const x=JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]");return Array.isArray(x)?x:[];}catch{return [];}}
  function writeQueue(q){localStorage.setItem(QUEUE_KEY,JSON.stringify(q));}
  function queue(op){const q=readQueue().filter(x=>x.id!==op.id);q.push({...op,queuedAt:new Date().toISOString()});writeQueue(q);}

  function normalizeHabit(habit) {
    const now = new Date().toISOString();
    const legacyDate = habit.completedDate || habit.completed_date || null;
    const dates = habit.completionDates || habit.completion_dates || (legacyDate ? [legacyDate] : []);
    const period = ["daily", "weekly", "monthly", "yearly"].includes(habit.period) ? habit.period : "daily";
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

  const parseDate = key => new Date(`${String(key).split("#")[0]}T12:00:00`);
  const startOfWeek = (date = new Date()) => {
    const copy = new Date(date); const day = copy.getDay();
    copy.setHours(12,0,0,0); copy.setDate(copy.getDate() - ((day + 6) % 7)); return copy;
  };
  const periodKey = (date, period) => {
    if (period === "daily") return localDateKey(date);
    if (period === "monthly") return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
    if (period === "yearly") return String(date.getFullYear());
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
    else if (period === "monthly") d.setMonth(d.getMonth()+amount);
    else d.setFullYear(d.getFullYear()+amount);
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
  function emitSync(status, detail = "") { window.dispatchEvent(new CustomEvent("statusos:habit-sync-status", { detail: { status, detail } })); }
  function isMissingTable(error) { const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase(); return text.includes("42p01") || text.includes("does not exist") || text.includes("schema cache"); }
  async function flushQueue() {
    const ctx = await context(); if (!ctx) { emitSync(navigator.onLine ? "local" : "offline", navigator.onLine ? "Sign in to sync habits." : "Habit changes are saved on this device."); return false; }
    const pending = readQueue(), remaining = []; if (pending.length) emitSync("syncing", `${pending.length} habit change${pending.length===1?"":"s"}`);
    for (const op of pending) {
      try {
        if (op.type === "delete") {
          const deletedAt = op.deletedAt || op.queuedAt || new Date().toISOString();
          const tomb = await ctx.client.from(TOMBSTONES).upsert({user_id:ctx.user.id,entity_type:"habit",entity_id:op.id,deleted_at:deletedAt},{onConflict:"user_id,entity_type,entity_id"});
          if (tomb.error) throw tomb.error;
          const del = await ctx.client.from(TABLE).delete().eq("id",op.id).eq("user_id",ctx.user.id); if(del.error) throw del.error;
        } else {
          const habit=normalizeHabit(op.habit);
          const up=await ctx.client.from(TABLE).upsert(toRow(habit,ctx.user.id),{onConflict:"id"}); if(up.error) throw up.error;
          await ctx.client.from(TOMBSTONES).delete().eq("user_id",ctx.user.id).eq("entity_type","habit").eq("entity_id",habit.id);
          clearDeleted(habit.id);
        }
      } catch(error){console.error("Habit sync failed",error); if (isMissingTable(error)) emitSync("setup", "Run STATUSOS_HABITS_SYNC_v3.4.6.sql in Supabase."); else emitSync("pending", error?.message || "Habit sync failed."); remaining.push(op);}
    }
    writeQueue(remaining); if (!remaining.length) emitSync("synced", "Habits synced across devices."); return remaining.length===0;
  }
  async function saveHabit(habit) {
    habit = normalizeHabit(habit); habit.updatedAt = new Date().toISOString();
    const habits = readLocal(); const index = habits.findIndex(item => item.id === habit.id);
    if (index >= 0) habits[index] = habit; else habits.push(habit);
    clearDeleted(habit.id); writeLocal(habits); queue({type:"upsert",id:habit.id,habit});
    window.dispatchEvent(new CustomEvent("statusos:habits-updated")); await flushQueue(); return habit;
  }
  async function deleteHabit(id) {
    const deletedAt=new Date().toISOString(); markDeleted(id,deletedAt); writeLocal(readLocal().filter(h => h.id !== id)); queue({type:"delete",id,deletedAt});
    window.dispatchEvent(new CustomEvent("statusos:habits-updated")); await flushQueue();
  }
  async function pullHabits() {
    const ctx = await context(); if (!ctx) return readLocal(); await flushQueue();
    const [habitResult,tombResult]=await Promise.all([
      ctx.client.from(TABLE).select("*").eq("user_id",ctx.user.id).order("created_at"),
      ctx.client.from(TOMBSTONES).select("entity_id,deleted_at").eq("user_id",ctx.user.id).eq("entity_type","habit")
    ]);
    if (habitResult.error || tombResult.error) { const error=habitResult.error||tombResult.error; console.error("Habit cloud load failed", error); if (isMissingTable(error)) emitSync("setup", "Run STATUSOS_HABITS_SYNC_v3.4.6.sql in Supabase."); else emitSync("pending", error?.message || "Using local habit cache."); return readLocal(); }
    const cloudDeleted=Object.fromEntries((tombResult.data||[]).map(x=>[x.entity_id,x.deleted_at]));
    const deleted=mergeDeleted(cloudDeleted); const cloud=(habitResult.data||[]).map(normalizeHabit).filter(h=>!deleted[h.id]);
    const merged = new Map(); [...cloud, ...readLocal()].filter(h=>!deleted[h.id]).forEach(h => {
      const old = merged.get(h.id); if (!old || new Date(h.updatedAt) >= new Date(old.updatedAt)) merged.set(h.id, h);
    });
    const habits = [...merged.values()]; writeLocal(habits);
    for (const h of habits) if (!cloud.some(row => row.id === h.id)) queue({type:"upsert",id:h.id,habit:h});
    await flushQueue(); emitSync("synced", "Habits synced across devices."); window.dispatchEvent(new CustomEvent("statusos:habits-updated", {detail:{source:"cloud"}})); return habits;
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
  function addProgress(habit, amount = 1) {
    habit = normalizeHabit(habit);
    const steps = Math.max(1, Math.floor(Number(amount) || 1));
    const stamp = localDateKey();
    for (let i = 0; i < steps; i++) {
      const token = `${stamp}#${Date.now()}-${i}-${Math.random().toString(36).slice(2,8)}`;
      habit.completionDates.push(token);
    }
    habit.completionDates = [...new Set(habit.completionDates)].sort();
    return habit;
  }
  function removeProgress(habit, amount = 1) {
    habit = normalizeHabit(habit);
    let remaining = Math.max(1, Math.floor(Number(amount) || 1));
    const currentKey = periodKey(new Date(), habit.period);
    const kept = [...habit.completionDates];
    for (let i = kept.length - 1; i >= 0 && remaining > 0; i--) {
      if (periodKey(parseDate(kept[i]), habit.period) === currentKey) { kept.splice(i, 1); remaining--; }
    }
    habit.completionDates = kept;
    return habit;
  }

  window.StatusOS = window.StatusOS || {};
  window.StatusOS.Habits = { list: readLocal, save: saveHabit, delete: deleteHabit, pull: pullHabits, flush: flushQueue, normalize: normalizeHabit, table: TABLE,
    isDoneToday, todayKey: localDateKey, toggleToday, toggleDate, addProgress, removeProgress, progress, streak, countInPeriod };
})();
