(function () {
  window.StatusOS = window.StatusOS || {};

  const byId = id => document.getElementById(id);
  const safeDate = value => value ? new Date(`${value}T12:00:00`) : null;
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const completeStatuses = new Set(["Complete", "Completed", "Released", "Delivered", "Archived"]);

  function escapeHTML(value) {
    const node = document.createElement("div");
    node.textContent = String(value ?? "");
    return node.innerHTML;
  }

  function daysUntil(dateValue) {
    const target = safeDate(dateValue);
    if (!target || Number.isNaN(target.getTime())) return null;
    const today = safeDate(todayKey());
    return Math.ceil((target - today) / 86400000);
  }

  function taskRank(task) {
    const priority = String(task.priority || "medium").toLowerCase();
    return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
  }

  function collect() {
    const tasks = window.StatusOS.Storage?.getTasks?.() || [];
    const habits = window.StatusOS.Habits?.list?.() || [];
    const music = window.StatusOS.Music?.list?.() || [];
    const profile = window.StatusOS.Profile?.get?.() || { displayName: "Sam", focusStatement: "Finish the important work first." };

    const unfinished = tasks.filter(task => !task.done).sort((a, b) => taskRank(a) - taskRank(b) || new Date(a.createdAt) - new Date(b.createdAt));
    const completed = tasks.filter(task => task.done).length;
    const habitsDone = habits.filter(habit => window.StatusOS.Habits?.isDoneToday?.(habit)).length;
    const activeMusic = music.filter(project => !completeStatuses.has(project.status));
    const urgentMusic = activeMusic
      .map(project => ({ ...project, days: daysUntil(project.deadline) }))
      .filter(project => project.days !== null && project.days <= 3)
      .sort((a, b) => a.days - b.days);

    const priorities = [];
    unfinished.slice(0, 3).forEach(task => priorities.push({ type: "task", title: task.text, meta: `${task.priority || "Medium"} priority task` }));
    if (priorities.length < 3 && urgentMusic.length) {
      urgentMusic.slice(0, 3 - priorities.length).forEach(project => {
        const timing = project.days < 0 ? `${Math.abs(project.days)} day${Math.abs(project.days) === 1 ? "" : "s"} overdue` : project.days === 0 ? "Due today" : `Due in ${project.days} day${project.days === 1 ? "" : "s"}`;
        priorities.push({ type: "music", title: project.title, meta: `${timing}${project.client ? ` · ${project.client}` : ""}` });
      });
    }
    if (priorities.length < 3 && habits.length > habitsDone) {
      habits.filter(habit => !window.StatusOS.Habits?.isDoneToday?.(habit)).slice(0, 3 - priorities.length).forEach(habit => priorities.push({ type: "habit", title: habit.name, meta: `Habit · ${habit.streak || 0} day streak` }));
    }

    return { tasks, unfinished, completed, habits, habitsDone, activeMusic, urgentMusic, priorities, profile };
  }

  function phaseGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Start with the highest-value work while your energy is fresh.";
    if (hour < 18) return "Use the rest of the day to close your most important open loops.";
    return "Finish what matters, then protect time for your evening reset.";
  }

  function renderList(container, items, emptyText) {
    if (!container) return;
    if (!items.length) {
      container.innerHTML = `<div class="daily-briefing-empty">${escapeHTML(emptyText)}</div>`;
      return;
    }
    container.innerHTML = items.map((item, index) => `
      <div class="daily-briefing-item">
        <span class="daily-briefing-number">${index + 1}</span>
        <div><strong>${escapeHTML(item.title)}</strong><small>${escapeHTML(item.meta)}</small></div>
      </div>`).join("");
  }

  function render() {
    const intro = byId("dailyBriefingIntro");
    if (!intro) return;
    const data = collect();
    const name = data.profile.displayName || "Sam";
    intro.textContent = `${name}, ${phaseGreeting()} ${data.profile.focusStatement || ""}`.trim();

    renderList(byId("dailyBriefingPriorities"), data.priorities, data.tasks.length || data.habits.length || data.activeMusic.length ? "Nothing urgent is waiting." : "Add tasks, habits, or music projects to build today’s plan.");

    const taskPercent = data.tasks.length ? Math.round(data.completed / data.tasks.length * 100) : 0;
    const habitPercent = data.habits.length ? Math.round(data.habitsDone / data.habits.length * 100) : 0;
    const statusItems = [
      { title: `${data.completed} of ${data.tasks.length} tasks complete`, meta: `${taskPercent}% task progress` },
      { title: `${data.habitsDone} of ${data.habits.length} habits complete`, meta: `${habitPercent}% habit progress` },
      { title: `${data.activeMusic.length} active music project${data.activeMusic.length === 1 ? "" : "s"}`, meta: data.urgentMusic.length ? `${data.urgentMusic.length} due soon or overdue` : "No urgent deadlines" }
    ];
    renderList(byId("dailyBriefingStatus"), statusItems, "No status data yet.");

    let insight = "Your day is clear. Choose one priority and begin.";
    if (data.urgentMusic.some(project => project.days < 0)) insight = "Highest risk: a music project is overdue. Handle that before lower-priority work.";
    else if (data.unfinished.length >= 5) insight = "Your task list is heavy. Complete the first three before adding anything new.";
    else if (data.habits.length && data.habitsDone === data.habits.length) insight = "All habits are complete today. Put your remaining energy into the top unfinished task.";
    else if (!data.unfinished.length && data.tasks.length) insight = "Mission complete. Review tomorrow or move one music project forward.";
    byId("dailyBriefingInsight").textContent = insight;
    byId("dailyBriefingUpdated").textContent = `Updated ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    window.StatusOS.Logger?.info?.("Daily briefing refreshed");
  }

  document.addEventListener("DOMContentLoaded", () => {
    byId("refreshDailyBriefingBtn")?.addEventListener("click", render);
    ["statusos:tasks-updated", "statusos:habits-updated", "statusos:music-updated"].forEach(name => window.addEventListener(name, render));
    window.addEventListener("storage", render);
    setTimeout(render, 250);
  });

  window.StatusOS.Briefing = { collect, render };
})();
