(function () {
  'use strict';

  const VERSION = '3.8.1';

  function getViewName(trigger) {
    return trigger && (trigger.dataset.view || trigger.dataset.viewJump || trigger.dataset.iosView || '');
  }

  function activateView(viewName, source) {
    if (!viewName) return false;
    const target = document.getElementById(viewName);
    if (!target || !target.classList.contains('view')) {
      console.warn('[StatusOS Navigation] Missing view:', viewName);
      return false;
    }

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

    try { history.replaceState(null, '', `#${viewName}`); } catch (_) {}
    window.dispatchEvent(new CustomEvent('statusos:view-change', { detail: { view: viewName, version: VERSION } }));
    target.scrollIntoView({ block: 'start' });
    return true;
  }

  // Delegated navigation remains reliable even when dashboard modules replace or add buttons.
  document.addEventListener('click', function (event) {
    const trigger = event.target.closest('[data-view], [data-view-jump], [data-ios-view]');
    if (!trigger) return;
    const viewName = getViewName(trigger);
    if (!viewName || !document.getElementById(viewName)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    activateView(viewName, trigger);
  }, true);

  function validateNavigation() {
    const missing = [];
    document.querySelectorAll('.nav-item[data-view]').forEach(button => {
      if (!document.getElementById(button.dataset.view)) missing.push(button.dataset.view);
    });
    if (missing.length) console.error('[StatusOS Navigation] Invalid sidebar targets:', missing);
    else console.info('[StatusOS Navigation] All sidebar targets verified.');
    return missing;
  }

  function boot() {
    const requested = location.hash.replace('#', '');
    if (requested && document.getElementById(requested)) activateView(requested);
    validateNavigation();
    window.StatusOS = window.StatusOS || {};
    window.StatusOS.Navigation = { activateView, validateNavigation, version: VERSION };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
