/* StatusOS v4.2.2 Navigation & Session Restore */
(function () {
  'use strict';

  const VERSION = '4.2.2';
  const SESSION_KEY = 'statusos_navigation_session_v1';
  const WORKSPACE_KEY = 'statusos_workspace_state_v2';
  const DEFAULT_VIEW = 'dashboard';

  function getViewName(trigger) {
    return trigger && (trigger.dataset.view || trigger.dataset.viewJump || trigger.dataset.iosView || '');
  }

  function validView(viewName) {
    const target = viewName && document.getElementById(viewName);
    return Boolean(target?.classList.contains('view'));
  }

  function readWorkspaceView() {
    try {
      const saved = JSON.parse(localStorage.getItem(WORKSPACE_KEY) || '{}');
      return validView(saved.activeView) ? saved.activeView : '';
    } catch {
      return '';
    }
  }

  function saveWorkspaceView(viewName) {
    window.StatusOS?.Workspace?.saveView?.(viewName);
    if (window.StatusOS?.Workspace?.saveView) return;
    try {
      const saved = JSON.parse(localStorage.getItem(WORKSPACE_KEY) || '{}');
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify({ ...saved, activeView: viewName, updatedAt: new Date().toISOString() }));
    } catch (_) {}
  }

  function activateView(viewName, source, options = {}) {
    if (!validView(viewName)) return false;
    const target = document.getElementById(viewName);

    document.querySelectorAll('.view.active').forEach(view => view.classList.remove('active'));
    target.classList.add('active');

    document.querySelectorAll('.nav-item.active').forEach(item => item.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-view="${CSS.escape(viewName)}"]`);
    if (navItem) {
      navItem.classList.add('active');
      const group = navItem.closest('details.nav-group');
      if (group) group.open = true;
    }

    const title = navItem?.textContent?.trim() || source?.textContent?.trim() || viewName;
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = title;

    const nav = document.getElementById('nav');
    const toggle = document.getElementById('mobileNavToggle');
    if (window.innerWidth <= 980) {
      nav?.classList.remove('mobile-open');
      document.body.classList.remove('nav-open');
      toggle?.setAttribute('aria-expanded', 'false');
    }

    saveWorkspaceView(viewName);
    try { history.replaceState(null, '', `#${viewName}`); } catch (_) {}
    window.dispatchEvent(new CustomEvent('statusos:view-change', { detail: { view: viewName, version: VERSION } }));

    if (!options.preserveScroll) target.scrollIntoView({ block: 'start' });
    return true;
  }

  document.addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-view], [data-view-jump], [data-ios-view]');
    if (!trigger) return;
    const viewName = getViewName(trigger);
    if (!validView(viewName)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activateView(viewName, trigger);
  }, true);

  function validateNavigation() {
    const missing = [];
    document.querySelectorAll('.nav-item[data-view]').forEach(button => {
      if (!validView(button.dataset.view)) missing.push(button.dataset.view);
    });
    if (missing.length) console.error('[StatusOS Navigation] Invalid sidebar targets:', missing);
    else console.info('[StatusOS Navigation] All sidebar targets verified.');
    return missing;
  }

  function boot() {
    const sessionStarted = sessionStorage.getItem(SESSION_KEY) === '1';
    let requested;

    if (!sessionStarted) {
      sessionStorage.setItem(SESSION_KEY, '1');
      requested = DEFAULT_VIEW;
    } else {
      const hashView = location.hash.replace('#', '');
      requested = validView(hashView) ? hashView : (readWorkspaceView() || DEFAULT_VIEW);
    }

    activateView(requested, null, { preserveScroll: sessionStarted });
    validateNavigation();
    window.StatusOS = window.StatusOS || {};
    window.StatusOS.Navigation = { activateView, validateNavigation, version: VERSION };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
