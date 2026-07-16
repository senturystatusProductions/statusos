(function () {
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const daysUntil = date => {
    if (!date) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(`${date}T00:00:00`);
    return Math.ceil((target - today) / 86400000);
  };
  function collect() {
    const alerts = [];
    const tasks = window.StatusOS?.Tasks?.list?.() || [];
    const openTasks = tasks.filter(task => !task.done);
    if (openTasks.length >= 8) alerts.push({level:"info", title:`${openTasks.length} open tasks`, detail:"Choose your Top 3 and ignore the rest until those are done.", view:"tasks"});

    const habitsApi = window.StatusOS?.Habits;
    const habits = habitsApi?.list?.() || [];
    habits.forEach(habit => {
      const progress = habitsApi.progress(habit);
      if (!progress.complete) {
        const remaining = Math.max(0, progress.target - progress.count);
        const label = habit.period === "daily" ? "today" : habit.period === "monthly" ? "this month" : "this week";
        alerts.push({level:"warning", title:`${habit.name}: ${remaining} remaining`, detail:`${progress.count} of ${progress.target} completed ${label}.`, view:"habits"});
      }
    });

    const music = window.StatusOS?.Music?.list?.() || [];
    music.filter(item => item.status !== "Complete").forEach(item => {
      const days = daysUntil(item.deadline);
      if (days !== null && days < 0) alerts.push({level:"danger", title:`Overdue: ${item.title}`, detail:`Deadline passed ${Math.abs(days)} day${Math.abs(days)===1?"":"s"} ago${item.client ? ` · ${item.client}` : ""}.`, view:"music"});
      else if (days !== null && days <= 2) alerts.push({level:"warning", title:`Due ${days===0?"today":days===1?"tomorrow":`in ${days} days`}: ${item.title}`, detail:`${item.status}${item.client ? ` · ${item.client}` : ""}.`, view:"music"});
      else if (item.priority === "High") alerts.push({level:"info", title:`High priority: ${item.title}`, detail:`${item.status}${item.client ? ` · ${item.client}` : ""}.`, view:"music"});
    });

    const order = {danger:0, warning:1, info:2};
    return alerts.sort((a,b)=>order[a.level]-order[b.level]).slice(0,6);
  }
  function render() {
    const list = document.getElementById("smartAlertsList");
    const count = document.getElementById("smartAlertCount");
    if (!list || !count) return;
    const alerts = collect();
    count.textContent = String(alerts.length);
    count.classList.toggle("is-clear", alerts.length === 0);
    if (!alerts.length) {
      list.innerHTML = '<div class="smart-alert-empty"><strong>All clear</strong><span>No urgent items need your attention right now.</span></div>';
      return;
    }
    list.innerHTML = alerts.map(alert => `
      <button class="smart-alert-item ${alert.level}" type="button" data-alert-view="${alert.view}">
        <span class="smart-alert-dot" aria-hidden="true"></span>
        <span><strong>${escapeHtml(alert.title)}</strong><small>${escapeHtml(alert.detail)}</small></span>
      </button>`).join("");
    list.querySelectorAll("[data-alert-view]").forEach(button => button.addEventListener("click", () => {
      const view = button.dataset.alertView;
      document.querySelector(`[data-view="${view}"]`)?.click();
    }));
  }
  window.addEventListener("DOMContentLoaded", render);
  ["statusos:tasks-updated","statusos:habits-updated","statusos:music-updated","statusos:view-change"].forEach(name => window.addEventListener(name, render));
  window.StatusOS = window.StatusOS || {};
  window.StatusOS.Alerts = { collect, render };
})();
