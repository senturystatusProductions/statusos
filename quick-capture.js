(function () {
  'use strict';

  function openDialog(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return false;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    return true;
  }

  function navigate(view) {
    if (window.StatusOS?.Navigation?.activateView) return window.StatusOS.Navigation.activateView(view);
    document.querySelector(`.nav-item[data-view="${view}"]`)?.click();
  }

  function closeMenu() {
    document.getElementById('quickCaptureMenu')?.classList.add('hidden');
    document.getElementById('quickCaptureBtn')?.setAttribute('aria-expanded', 'false');
  }

  function boot() {
    const button = document.getElementById('quickCaptureBtn');
    const menu = document.getElementById('quickCaptureMenu');
    if (!button || !menu) return;

    button.addEventListener('click', event => {
      event.stopPropagation();
      const opening = menu.classList.contains('hidden');
      menu.classList.toggle('hidden');
      button.setAttribute('aria-expanded', String(opening));
    });

    menu.addEventListener('click', event => {
      const action = event.target.closest('[data-capture-action]')?.dataset.captureAction;
      if (!action) return;
      closeMenu();
      if (action === 'task') {
        navigate('tasks');
        setTimeout(() => document.getElementById('smartTaskAddBtn')?.click(), 80);
      } else if (action === 'artist') openDialog('artistModal');
      else if (action === 'project') openDialog('projectModal');
      else if (action === 'content') openDialog('contentModal');
      else if (action === 'revenue') {
        navigate('revenue');
        setTimeout(() => document.querySelector('[data-open="revenueModal"]')?.click(), 80);
      } else if (action === 'workout') {
        navigate('planner');
        setTimeout(() => document.querySelector('[data-performance-mode="tabata"], #performanceModeTabata')?.click(), 100);
      }
    });

    document.addEventListener('click', event => {
      if (!event.target.closest('.quick-capture-shell')) closeMenu();
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
