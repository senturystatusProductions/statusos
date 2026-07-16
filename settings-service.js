(function () {
  const KEY = "statusos_preferences_v1";
  const defaults = {
    appearance: "system",
    accent: "gold",
    startView: "dashboard",
    compact: false,
    reducedMotion: false
  };
  window.StatusOS = window.StatusOS || {};
  const byId = id => document.getElementById(id);
  const read = () => {
    try { return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY) || "null") || {}) }; }
    catch { return { ...defaults }; }
  };
  const write = value => localStorage.setItem(KEY, JSON.stringify(value));

  function resolvedAppearance(value) {
    if (value !== "system") return value;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function apply(preferences = read()) {
    const root = document.documentElement;
    root.dataset.theme = resolvedAppearance(preferences.appearance);
    root.dataset.accent = preferences.accent;
    root.classList.toggle("compact-mode", !!preferences.compact);
    root.classList.toggle("reduce-motion", !!preferences.reducedMotion);
    root.style.colorScheme = root.dataset.theme;
    window.StatusOS.Logger?.info?.("Settings preferences applied", { theme: root.dataset.theme, accent: preferences.accent });
  }

  function populate() {
    const p = read();
    if (byId("appearancePreference")) byId("appearancePreference").value = p.appearance;
    if (byId("accentPreference")) byId("accentPreference").value = p.accent;
    if (byId("startViewPreference")) byId("startViewPreference").value = p.startView;
    if (byId("compactModePreference")) byId("compactModePreference").checked = !!p.compact;
    if (byId("reducedMotionPreference")) byId("reducedMotionPreference").checked = !!p.reducedMotion;
  }

  function collect() {
    return {
      appearance: byId("appearancePreference")?.value || defaults.appearance,
      accent: byId("accentPreference")?.value || defaults.accent,
      startView: byId("startViewPreference")?.value || defaults.startView,
      compact: !!byId("compactModePreference")?.checked,
      reducedMotion: !!byId("reducedMotionPreference")?.checked
    };
  }

  function save() {
    const p = collect();
    write(p);
    apply(p);
    const status = byId("profileSettingsStatus");
    if (status) {
      status.textContent = "Profile and app preferences saved.";
      setTimeout(() => { if (status.textContent.includes("preferences")) status.textContent = ""; }, 2400);
    }
  }

  function openStartView() {
    const p = read();
    const target = document.querySelector(`[data-view="${p.startView}"]`);
    if (target && !sessionStorage.getItem("statusos_start_view_applied")) {
      sessionStorage.setItem("statusos_start_view_applied", "1");
      setTimeout(() => target.click(), 250);
    }
  }

  window.StatusOS.Settings = { get: read, save, apply, populate };
  apply();

  window.addEventListener("DOMContentLoaded", () => {
    populate();
    byId("saveSettingsBtn")?.addEventListener("click", () => setTimeout(save, 0));
    ["appearancePreference", "accentPreference", "compactModePreference", "reducedMotionPreference"].forEach(id => {
      byId(id)?.addEventListener("change", () => apply(collect()));
    });
    openStartView();
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => {
        if (read().appearance === "system") apply();
      });
    }
  });
})();
