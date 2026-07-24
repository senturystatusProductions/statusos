/* StatusOS v4.2.0 Mission Control */
(function () {
  'use strict';

  const APP_KEY = 'senturyStatusOS_v2';
  const SESSION_KEY = 'statusos_session_history_v1';
  const WIN_KEY = 'statusos_daily_wins_v1';
  const $ = id => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0, 10);
  const safeJSON = (key, fallback) => {
    try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value == null ? fallback : value; }
    catch { return fallback; }
  };
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = value => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(Number(value || 0));
  const sameDay = value => value && String(value).slice(0, 10) === today();
  const formatDuration = seconds => {
    const minutes = Math.max(0, Math.round(Number(seconds || 0) / 60));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim();
  };
  const humanTime = value => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  function appState() {
    return safeJSON(APP_KEY, { projects: [], revenue: [], artists: [], daily: { priorities: [] } });
  }

  function tasks() {
    try { return window.StatusOS?.Storage?.getTasks?.() || []; }
    catch { return safeJSON('statusos_tasks_v1', []); }
  }

  function sessions() {
    try { return window.StatusOSSessionEngine?.history?.() || []; }
    catch { return safeJSON(SESSION_KEY, []); }
  }

  function getTopTasks(all) {
    const rank = { critical: 0, high: 1, medium: 2, low: 3 };
    return all.filter(task => !task.done)
      .sort((a, b) => {
        const overdueA = a.dueDate && a.dueDate < today() ? 0 : 1;
        const overdueB = b.dueDate && b.dueDate < today() ? 0 : 1;
        return overdueA - overdueB || (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2) || String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999'));
      }).slice(0, 3);
  }

  function businessScore(allTasks, state, todaySessions) {
    const open = allTasks.filter(item => !item.done);
    const doneToday = allTasks.filter(item => item.done && sameDay(item.completedAt)).length;
    const overdue = open.filter(item => item.dueDate && item.dueDate < today()).length;
    const dueToday = open.filter(item => item.dueDate === today()).length;
    const activeProjects = (state.projects || []).filter(project => Number(project.progress || 0) < 100).length;
    const sessionMinutes = todaySessions.reduce((sum, item) => sum + Number(item.durationSeconds || 0), 0) / 60;
    let score = 55;
    score += Math.min(20, doneToday * 5);
    score += Math.min(15, sessionMinutes / 20);
    score -= Math.min(25, overdue * 6);
    if (dueToday && !doneToday) score -= 5;
    if (activeProjects) score += 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function latestProject(state) {
    const projects = Array.isArray(state.projects) ? state.projects : [];
    return projects.filter(project => Number(project.progress || 0) < 100)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || b.deadline || 0) - new Date(a.updatedAt || a.createdAt || a.deadline || 0))[0] || null;
  }

  function sessionTotals(todaySessions) {
    const totals = {};
    todaySessions.forEach(item => {
      const type = String(item.type || 'focus').replace(/[-_]/g, ' ');
      totals[type] = (totals[type] || 0) + Number(item.durationSeconds || 0);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }

  function activities(allTasks, state, allSessions) {
    const items = [];
    allSessions.filter(item => sameDay(item.completedAt)).forEach(item => items.push({
      at: item.completedAt,
      icon: '⏱',
      title: `${String(item.type || 'Session').replace(/[-_]/g, ' ')} completed`,
      meta: formatDuration(item.durationSeconds)
    }));
    allTasks.filter(item => item.done && sameDay(item.completedAt)).forEach(item => items.push({ at: item.completedAt, icon: '✓', title: item.text || item.title, meta: 'Task completed' }));
    (state.revenue || []).filter(item => sameDay(item.date || item.createdAt)).forEach(item => items.push({ at: item.createdAt || `${item.date}T12:00:00`, icon: '$', title: item.source || item.name || 'Revenue added', meta: money(item.amount) }));
    return items.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
  }

  function inject() {
    const dashboard = $('dashboard');
    const welcome = dashboard?.querySelector('.dashboard-welcome');
    if (!dashboard || !welcome || $('missionControlV42')) return;
    const section = document.createElement('section');
    section.id = 'missionControlV42';
    section.className = 'mc42';
    section.innerHTML = `
      <article class="card mc42-hero">
        <div><p class="eyebrow">MISSION CONTROL</p><h2 id="mc42Greeting">Your day at a glance.</h2><p id="mc42Summary" class="muted">Preparing your highest-impact work.</p></div>
        <div class="mc42-score"><span>Business Score</span><strong id="mc42Score">0</strong><small>/ 100</small></div>
      </article>
      <div class="mc42-grid mc42-main-grid">
        <article class="card mc42-mission"><div class="section-head"><div><p class="eyebrow">TODAY'S MISSION</p><h3>Your Big 3</h3></div><button class="text-button" data-view="tasks">Open Tasks</button></div><div id="mc42Tasks" class="mc42-task-list"></div></article>
        <article class="card mc42-continue"><div class="section-head"><div><p class="eyebrow">CONTINUE WORKING</p><h3>Pick up where you left off</h3></div></div><div id="mc42Continue"></div></article>
      </div>
      <div class="mc42-metrics">
        <article class="card"><span>Sessions today</span><strong id="mc42SessionCount">0</strong><small id="mc42SessionTime">0m total</small></article>
        <article class="card"><span>Revenue this month</span><strong id="mc42Revenue">$0</strong><small>Recorded income</small></article>
        <article class="card"><span>Open tasks</span><strong id="mc42OpenTasks">0</strong><small id="mc42Overdue">0 overdue</small></article>
        <article class="card"><span>Active projects</span><strong id="mc42Projects">0</strong><small>In progress</small></article>
      </div>
      <div class="mc42-grid mc42-support-grid">
        <article class="card"><div class="section-head"><div><p class="eyebrow">SESSION SUMMARY</p><h3>Productive time today</h3></div><button class="text-button" data-view="focus-planner">Start Session</button></div><div id="mc42Sessions" class="mc42-session-list"></div></article>
        <article class="card"><div class="section-head"><div><p class="eyebrow">TODAY'S TIMELINE</p><h3>Recent progress</h3></div></div><div id="mc42Timeline" class="mc42-timeline"></div></article>
      </div>
      <article class="card mc42-actions"><div class="section-head"><div><p class="eyebrow">QUICK ACTIONS</p><h3>Move forward now</h3></div></div><div class="mc42-action-grid">
        <button type="button" data-capture-action="task"><span>＋</span><b>New Task</b></button>
        <button type="button" data-capture-action="artist"><span>＋</span><b>New Artist</b></button>
        <button type="button" data-capture-action="project"><span>＋</span><b>New Project</b></button>
        <button type="button" data-view="focus-planner"><span>▶</span><b>Start Session</b></button>
        <button type="button" data-view="assistant"><span>✦</span><b>Ask AI</b></button>
      </div></article>
      <article class="card mc42-win"><div><p class="eyebrow">DAILY WIN</p><h3>What was today's biggest win?</h3></div><form id="mc42WinForm"><input id="mc42WinInput" maxlength="180" placeholder="Finished a beat, closed a client, completed a workout..."><button class="button" type="submit">Save Win</button></form><p id="mc42WinSaved" class="muted small"></p></article>`;
    welcome.insertAdjacentElement('afterend', section);
    document.body.classList.add('mission-control-v42-enabled');
    bind(section);
    render();
  }

  function bind(section) {
    section.addEventListener('click', event => {
      const complete = event.target.closest('[data-mc42-complete]');
      if (complete) {
        window.StatusOS?.Tasks?.complete?.(complete.dataset.mc42Complete);
        setTimeout(render, 50);
      }
      const project = event.target.closest('[data-mc42-project]');
      if (project) {
        document.querySelector('[data-view="projects"]')?.click();
      }
    });
    $('mc42WinForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const input = $('mc42WinInput');
      const text = input?.value.trim();
      if (!text) return;
      const wins = safeJSON(WIN_KEY, []);
      wins.unshift({ id: crypto.randomUUID?.() || String(Date.now()), date: today(), text, createdAt: new Date().toISOString() });
      localStorage.setItem(WIN_KEY, JSON.stringify(wins.slice(0, 365)));
      input.value = '';
      renderWin();
    });
    ['statusos:tasks-updated', 'statusos:session-completed', 'statusos:artists-updated', 'statusos:finance-updated', 'statusos:projects-updated'].forEach(name => window.addEventListener(name, render));
    window.addEventListener('storage', render);
  }

  function renderWin() {
    const win = safeJSON(WIN_KEY, []).find(item => item.date === today());
    if ($('mc42WinSaved')) $('mc42WinSaved').textContent = win ? `Today's win: ${win.text}` : 'Your saved win will appear here.';
  }

  function render() {
    if (!$('missionControlV42')) return;
    const state = appState();
    const allTasks = tasks();
    const allSessions = sessions();
    const todaySessions = allSessions.filter(item => sameDay(item.completedAt));
    const top = getTopTasks(allTasks);
    const score = businessScore(allTasks, state, todaySessions);
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning, Sam.' : hour < 18 ? 'Good afternoon, Sam.' : 'Good evening, Sam.';
    $('mc42Greeting').textContent = greeting;
    $('mc42Score').textContent = score;
    $('mc42Summary').textContent = top[0] ? `Start with: ${top[0].text || top[0].title}` : 'Your priority list is clear. Add your next important task.';

    const taskHost = $('mc42Tasks');
    taskHost.innerHTML = top.length ? top.map((task, index) => `<article class="mc42-task"><span class="mc42-task-number">${index + 1}</span><div><strong>${esc(task.text || task.title)}</strong><small>${esc(task.priority || 'medium')} priority${task.dueDate ? ` · due ${esc(task.dueDate)}` : ''}</small></div><button type="button" data-mc42-complete="${esc(task.id)}" aria-label="Complete task">✓</button></article>`).join('') : '<div class="mc42-empty">No open smart tasks. Add a task to set today’s mission.</div>';

    const project = latestProject(state);
    $('mc42Continue').innerHTML = project ? `<div class="mc42-project"><div><strong>${esc(project.name || 'Untitled Project')}</strong><p>${esc(project.nextStep || project.type || 'Continue your next step')}</p></div><div class="mc42-project-progress"><span><i style="width:${Math.max(0, Math.min(100, Number(project.progress || 0)))}%"></i></span><b>${Number(project.progress || 0)}%</b></div><button class="button secondary" type="button" data-mc42-project="${esc(project.id || '')}">Resume Project</button></div>` : '<div class="mc42-empty">No active project yet. Create one from Quick Actions.</div>';

    const open = allTasks.filter(item => !item.done);
    const overdue = open.filter(item => item.dueDate && item.dueDate < today());
    const activeProjects = (state.projects || []).filter(item => Number(item.progress || 0) < 100);
    const month = today().slice(0, 7);
    const revenue = (state.revenue || []).filter(item => String(item.date || item.createdAt || '').slice(0, 7) === month).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalSeconds = todaySessions.reduce((sum, item) => sum + Number(item.durationSeconds || 0), 0);
    $('mc42SessionCount').textContent = todaySessions.length;
    $('mc42SessionTime').textContent = `${formatDuration(totalSeconds)} total`;
    $('mc42Revenue').textContent = money(revenue);
    $('mc42OpenTasks').textContent = open.length;
    $('mc42Overdue').textContent = `${overdue.length} overdue`;
    $('mc42Projects').textContent = activeProjects.length;

    const totals = sessionTotals(todaySessions);
    $('mc42Sessions').innerHTML = totals.length ? totals.map(([type, seconds]) => `<div><span>${esc(type.replace(/\b\w/g, letter => letter.toUpperCase()))}</span><strong>${formatDuration(seconds)}</strong></div>`).join('') : '<div class="mc42-empty">No sessions logged today. Start one when you are ready.</div>';

    const timeline = activities(allTasks, state, allSessions);
    $('mc42Timeline').innerHTML = timeline.length ? timeline.map(item => `<div><time>${humanTime(item.at)}</time><span>${item.icon}</span><p><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></p></div>`).join('') : '<div class="mc42-empty">Your completed tasks and sessions will appear here.</div>';
    renderWin();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject, { once: true });
  else inject();
})();
