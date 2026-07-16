(function () {
  const REVIEW_KEY = "statusos_weekly_reviews_v1";
  const dayMs = 86400000;
  const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
  const esc = value => String(value || "");

  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  }
  function startOfWeek(date = new Date()) {
    const d = new Date(date); d.setHours(12,0,0,0); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d;
  }
  function endOfWeek(date = new Date()) { const d = startOfWeek(date); d.setDate(d.getDate()+6); return d; }
  function weekKey() { return localDate(startOfWeek()); }
  function readReviews() { try { return JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}"); } catch { return {}; } }
  function writeReviews(value) { localStorage.setItem(REVIEW_KEY, JSON.stringify(value)); }
  function currentReview() { return readReviews()[weekKey()] || { wins:"", lessons:"", focus:"" }; }
  function saveReview() {
    const reviews = readReviews();
    reviews[weekKey()] = {
      wins: document.getElementById("weeklyWinsInput")?.value.trim() || "",
      lessons: document.getElementById("weeklyLessonsInput")?.value.trim() || "",
      focus: document.getElementById("weeklyFocusInput")?.value.trim() || "",
      updatedAt: new Date().toISOString()
    };
    writeReviews(reviews);
    setText("weeklyReviewSaved", "Saved just now");
    window.StatusOS?.Logger?.info?.("Weekly review saved", { week: weekKey() });
  }

  function musicStats(items) {
    const active = items.filter(i => i.status !== "Complete");
    const dueSoon = active.filter(i => { if (!i.deadline) return false; const days=Math.ceil((new Date(`${i.deadline}T00:00:00`)-new Date().setHours(0,0,0,0))/dayMs); return days <= 7; });
    const overdue = active.filter(i => i.deadline && new Date(`${i.deadline}T23:59:59`) < new Date());
    return { active:active.length, complete:items.length-active.length, dueSoon:dueSoon.length, overdue:overdue.length };
  }
  function scoreLabel(score) { return score >= 90 ? "Excellent week" : score >= 75 ? "Strong week" : score >= 55 ? "Solid progress" : score > 0 ? "Room to improve" : "Start building momentum"; }
  function addSummary(container, title, detail, tone="") {
    if (!container) return; const row=document.createElement("div"); row.className=`review-summary-item ${tone}`;
    const strong=document.createElement("strong"); strong.textContent=title; const small=document.createElement("small"); small.textContent=detail; row.append(strong,small); container.append(row);
  }
  function render() {
    const tasks = window.StatusOS?.Storage?.getTasks?.() || [];
    const habits = window.StatusOS?.Habits?.list?.() || [];
    const music = window.StatusOS?.Music?.list?.() || [];
    const taskDone = tasks.filter(t => t.done).length;
    const taskPercent = tasks.length ? Math.round(taskDone/tasks.length*100) : 0;
    const habitStates = habits.map(h => ({habit:h, progress:window.StatusOS.Habits.progress(h)}));
    const habitsMet = habitStates.filter(x => x.progress.complete).length;
    const habitPercent = habits.length ? Math.round(habitsMet/habits.length*100) : 0;
    const ms = musicStats(music);
    const musicHealth = music.length ? Math.max(0, 100 - ms.overdue*25 - ms.dueSoon*5) : 100;
    const parts = [tasks.length ? taskPercent : null, habits.length ? habitPercent : null, music.length ? musicHealth : null].filter(v => v !== null);
    const score = parts.length ? Math.round(parts.reduce((a,b)=>a+b,0)/parts.length) : 0;
    const start=startOfWeek(), end=endOfWeek();
    setText("weeklyReviewRange", `${start.toLocaleDateString(undefined,{month:"long",day:"numeric"})} to ${end.toLocaleDateString(undefined,{month:"long",day:"numeric",year:"numeric"})}`);
    setText("weeklyReviewScore", `${score}%`); setText("weeklyReviewScoreLabel", scoreLabel(score));
    setText("weeklyReviewTasks", `${taskDone} / ${tasks.length}`); setText("weeklyReviewHabits", `${habitsMet} / ${habits.length}`);
    setText("weeklyReviewMusic", `${ms.active} active`); setText("weeklyReviewMusicMeta", `${ms.dueSoon} due soon · ${ms.complete} complete`);
    const summary=document.getElementById("weeklyReviewSummary"); const priorities=document.getElementById("weeklyReviewPriorities");
    if (summary) summary.innerHTML=""; if (priorities) priorities.innerHTML="";
    addSummary(summary,"Task progress",tasks.length?`${taskDone} completed and ${tasks.length-taskDone} remaining.`:"No current tasks yet.",taskPercent>=75?"good":"");
    addSummary(summary,"Habit commitments",habits.length?`${habitsMet} of ${habits.length} targets are currently met.`:"No habits are being tracked yet.",habitPercent>=75?"good":"");
    addSummary(summary,"Music pipeline",music.length?`${ms.active} active, ${ms.complete} completed, and ${ms.overdue} overdue.`:"No music projects in the pipeline.",ms.overdue?"warning":"good");
    const unfinished=tasks.filter(t=>!t.done).slice(0,2); unfinished.forEach(t=>addSummary(priorities,`Finish: ${t.text}`,"Carry this task forward with intention."));
    const unmet=habitStates.filter(x=>!x.progress.complete).slice(0,2); unmet.forEach(x=>addSummary(priorities,`Keep commitment: ${x.habit.name}`,`${x.progress.count} of ${x.progress.target} completed this ${x.habit.period.replace("ly","")}.`));
    const urgent=music.filter(i=>i.status!=="Complete").sort((a,b)=>(a.deadline||"9999").localeCompare(b.deadline||"9999")).slice(0,2); urgent.forEach(i=>addSummary(priorities,`Music: ${i.title}`,i.deadline?`Deadline ${i.deadline}.`:`Status: ${i.status}.`));
    if (priorities && !priorities.children.length) addSummary(priorities,"Plan one meaningful priority","Your current commitments are clear. Choose the highest-value next move.","good");
    const saved=currentReview();
    const wins=document.getElementById("weeklyWinsInput"), lessons=document.getElementById("weeklyLessonsInput"), focus=document.getElementById("weeklyFocusInput");
    if (wins && document.activeElement!==wins) wins.value=saved.wins||""; if (lessons && document.activeElement!==lessons) lessons.value=saved.lessons||""; if (focus && document.activeElement!==focus) focus.value=saved.focus||"";
    setText("weeklyReviewSaved", saved.updatedAt ? `Last saved ${new Date(saved.updatedAt).toLocaleString()}` : "Not saved yet");
    window.StatusOS = window.StatusOS || {}; window.StatusOS.WeeklyReview = { render, score:()=>score, current:currentReview, save:saveReview };
  }
  async function copySummary() {
    const saved=currentReview(); const text=[`StatusOS Weekly Review — ${document.getElementById("weeklyReviewRange")?.textContent||""}`,`Score: ${document.getElementById("weeklyReviewScore")?.textContent||"0%"}`,`Tasks: ${document.getElementById("weeklyReviewTasks")?.textContent||"0 / 0"}`,`Habits: ${document.getElementById("weeklyReviewHabits")?.textContent||"0 / 0"}`,`Music: ${document.getElementById("weeklyReviewMusic")?.textContent||"0 active"}`,saved.wins?`Wins: ${saved.wins}`:"",saved.lessons?`Lessons: ${saved.lessons}`:"",saved.focus?`Next focus: ${saved.focus}`:""].filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(text); setText("weeklyReviewSaved","Summary copied"); } catch { setText("weeklyReviewSaved","Unable to copy automatically"); }
  }
  window.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("refreshWeeklyReviewBtn")?.addEventListener("click",render);
    document.getElementById("saveWeeklyReviewBtn")?.addEventListener("click",saveReview);
    document.getElementById("copyWeeklyReviewBtn")?.addEventListener("click",copySummary);
    ["statusos:habits-updated","statusos:music-updated","statusos:tasks-updated"].forEach(name=>window.addEventListener(name,render));
    render();
  });
  window.addEventListener("statusos:view-change",render);
})();
