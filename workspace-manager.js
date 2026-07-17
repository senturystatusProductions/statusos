/* StatusOS v2.1.1 Workspace State Engine */
(function () {
  const KEY = "statusos_workspace_state_v2";
  const DEFAULT_STATE = {
    activeView: "dashboard",
    selectedArtistId: null,
    openNavGroups: [],
    openDetails: [],
    controls: {},
    scrollByView: {},
    updatedAt: null
  };

  let state = load();
  let restoreTimer = null;
  let scrollTimer = null;
  let restoring = false;

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      return { ...DEFAULT_STATE, ...saved };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  function save(patch = {}) {
    state = { ...state, ...patch, updatedAt: new Date().toISOString() };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (error) { console.warn("Workspace save failed", error); }
    return state;
  }

  function activeView() {
    return document.querySelector(".view.active")?.id || state.activeView || "dashboard";
  }

  function saveView(view) {
    if (!view) return;
    save({ activeView: view });
  }

  function saveSelectedArtist(id) {
    save({ selectedArtistId: id || null });
  }

  function getSelectedArtist() {
    return state.selectedArtistId || null;
  }

  function saveDetails() {
    const navGroups = Array.from(document.querySelectorAll("#nav details.nav-group"));
    const openNavGroups = navGroups.map((el, index) => el.open ? index : null).filter(index => index !== null);
    const allDetails = Array.from(document.querySelectorAll("main details"));
    const openDetails = allDetails.map((el, index) => el.open ? index : null).filter(index => index !== null);
    save({ openNavGroups, openDetails });
  }

  function restoreDetails() {
    document.querySelectorAll("#nav details.nav-group").forEach((el, index) => {
      el.open = (state.openNavGroups || []).includes(index);
    });
    document.querySelectorAll("main details").forEach((el, index) => {
      el.open = (state.openDetails || []).includes(index);
    });
  }

  function controlKey(el) {
    return el.id || (el.name ? `${activeView()}:${el.name}` : null);
  }

  function saveControl(el) {
    const key = controlKey(el);
    if (!key) return;
    const controls = { ...(state.controls || {}) };
    controls[key] = el.type === "checkbox" ? Boolean(el.checked) : el.value;
    save({ controls });
  }

  function restoreControls() {
    const controls = state.controls || {};
    Object.entries(controls).forEach(([key, value]) => {
      const escaped = window.CSS?.escape ? CSS.escape(key) : key.replace(/([ #;?%&,.+*~\\':"!^$[\]()=>|/@])/g, "\\$1");
      const el = document.getElementById(key) || document.querySelector(`[name="${escaped}"]`);
      if (!el) return;
      if (el.type === "checkbox") el.checked = Boolean(value);
      else el.value = value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function saveScroll() {
    const view = activeView();
    const scrollByView = { ...(state.scrollByView || {}), [view]: window.scrollY || document.documentElement.scrollTop || 0 };
    save({ scrollByView });
  }

  function restoreScroll() {
    const y = Number(state.scrollByView?.[state.activeView] || 0);
    requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: "auto" })));
  }

  function restore() {
    if (restoring) return;
    restoring = true;
    const requested = state.activeView || "dashboard";
    const button = document.querySelector(`.nav-item[data-view="${requested}"]`) || document.querySelector('.nav-item[data-view="dashboard"]');
    button?.click();
    restoreDetails();
    restoreControls();
    window.dispatchEvent(new CustomEvent("statusos:workspace-restore", { detail: { ...state } }));
    restoreScroll();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("statusos:workspace-restored", { detail: { ...state } }));
      restoring = false;
    }));
  }

  function bind() {
    document.addEventListener("click", event => {
      const nav = event.target.closest?.("[data-view]");
      if (nav?.dataset.view) {
        saveView(nav.dataset.view);
        setTimeout(saveDetails, 0);
      }
    });

    document.addEventListener("toggle", event => {
      if (event.target.matches?.("details")) saveDetails();
    }, true);

    document.addEventListener("input", event => {
      const el = event.target;
      if (!el.matches?.("input, textarea, select")) return;
      if (el.closest("#authScreen") || el.type === "password" || el.type === "file") return;
      saveControl(el);
    }, true);

    document.addEventListener("change", event => {
      const el = event.target;
      if (!el.matches?.("input, textarea, select")) return;
      if (el.closest("#authScreen") || el.type === "password" || el.type === "file") return;
      saveControl(el);
    }, true);

    window.addEventListener("scroll", () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(saveScroll, 180);
    }, { passive: true });

    window.addEventListener("beforeunload", () => { saveScroll(); saveDetails(); });
    window.addEventListener("statusos:app-ready", () => {
      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(restore, 80);
    });
  }

  window.StatusOS = window.StatusOS || {};
  window.StatusOS.Workspace = { save, restore, saveView, saveSelectedArtist, getSelectedArtist, getState: () => ({ ...state }) };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
