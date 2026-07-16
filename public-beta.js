(function () {
  const PROFILE_KEY = "statusos_profile_v1";
  const TOUR_KEY = "statusos_onboarding_complete_v1";
  window.StatusOS = window.StatusOS || {};

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const byId = id => document.getElementById(id);

  const defaultProfile = { displayName: "Sam", focusStatement: "Finish the important work first." };
  const profile = () => ({ ...defaultProfile, ...read(PROFILE_KEY, {}) });

  function greeting() {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  }

  function applyProfile() {
    const data = profile();
    const heading = byId("welcomeHeading");
    const focus = byId("personalFocusLine");
    const nameInput = byId("profileDisplayName");
    const focusInput = byId("profileFocusStatement");
    if (heading) heading.textContent = `${greeting()}, ${data.displayName}.`;
    if (focus) focus.textContent = `Your Personal Operating System. ${data.focusStatement}`;
    if (nameInput) nameInput.value = data.displayName;
    if (focusInput) focusInput.value = data.focusStatement;
  }

  function saveProfile() {
    const data = {
      displayName: byId("profileDisplayName")?.value.trim() || "Sam",
      focusStatement: byId("profileFocusStatement")?.value.trim() || defaultProfile.focusStatement
    };
    write(PROFILE_KEY, data);
    applyProfile();
    const status = byId("profileSettingsStatus");
    if (status) {
      status.textContent = "Profile preferences saved.";
      setTimeout(() => { status.textContent = ""; }, 2200);
    }
    window.StatusOS.Logger?.info?.("Public beta profile preferences saved");
  }

  const tourSlides = [
    ["Start every day with clarity.", "Mission Control brings your tasks, habits, music projects, and AI guidance into one focused starting point."],
    ["Your progress follows you.", "Cloud Sync keeps your tasks, habits, and music workflow available across your computer, phone, and other signed-in devices."],
    ["Move faster with Quick Launch.", "Press Ctrl + K anywhere to jump between engines, add a task, open your AI Command Center, or begin your Daily Reset."]
  ];
  let tourIndex = 0;

  function renderTour() {
    const [title, text] = tourSlides[tourIndex];
    byId("onboardingTitle").textContent = title;
    byId("onboardingText").textContent = text;
    document.querySelectorAll(".onboarding-dots span").forEach((dot, i) => dot.classList.toggle("active", i === tourIndex));
    byId("onboardingNext").textContent = tourIndex === tourSlides.length - 1 ? "Enter StatusOS" : "Next";
  }

  function openTour() {
    tourIndex = 0;
    renderTour();
    byId("onboardingDialog")?.showModal();
  }

  function closeTour() {
    write(TOUR_KEY, true);
    byId("onboardingDialog")?.close();
  }

  const commands = [
    ["Mission Control", "See today’s priorities and progress", "dashboard"],
    ["Task Engine", "Create and complete tasks", "tasks"],
    ["Habit Engine", "Track consistency and streaks", "habits"],
    ["Music OS", "Manage your creative pipeline", "music"],
    ["Command Center", "Ask StatusOS AI what to do next", "assistant"],
    ["Daily Reset", "Start or close your day intentionally", "reset"],
    ["Settings", "Update goals and profile preferences", "settings"],
    ["Developer Console", "Inspect application health", "developer"]
  ];
  let filteredCommands = commands;
  let selectedCommand = 0;

  function navigate(view) {
    const button = document.querySelector(`[data-view="${view}"]`);
    if (button) button.click();
  }

  function renderCommands(query = "") {
    const q = query.trim().toLowerCase();
    filteredCommands = commands.filter(item => `${item[0]} ${item[1]}`.toLowerCase().includes(q));
    selectedCommand = Math.min(selectedCommand, Math.max(filteredCommands.length - 1, 0));
    const results = byId("commandResults");
    if (!results) return;
    results.innerHTML = "";
    filteredCommands.forEach((item, index) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = `command-result${index === selectedCommand ? " selected" : ""}`;
      row.innerHTML = `<span><strong>${item[0]}</strong><small>${item[1]}</small></span><kbd>Enter</kbd>`;
      row.addEventListener("click", () => { navigate(item[2]); closePalette(); });
      results.appendChild(row);
    });
    if (!filteredCommands.length) results.innerHTML = '<p class="muted command-empty">No matching command.</p>';
  }

  function openPalette() {
    const dialog = byId("commandPalette");
    if (!dialog) return;
    selectedCommand = 0;
    renderCommands("");
    dialog.showModal();
    setTimeout(() => { const input = byId("commandSearch"); if (input) { input.value = ""; input.focus(); } }, 20);
  }

  function closePalette() { byId("commandPalette")?.close(); }

  window.StatusOS.Profile = { get: profile, save: saveProfile, apply: applyProfile };
  window.StatusOS.Command = { open: openPalette };

  window.addEventListener("DOMContentLoaded", () => {
    applyProfile();
    byId("saveSettingsBtn")?.addEventListener("click", () => setTimeout(saveProfile, 0));
    byId("showOnboardingBtn")?.addEventListener("click", openTour);
    byId("onboardingSkip")?.addEventListener("click", closeTour);
    byId("onboardingNext")?.addEventListener("click", () => {
      if (tourIndex < tourSlides.length - 1) { tourIndex += 1; renderTour(); }
      else closeTour();
    });
    if (!read(TOUR_KEY, false)) setTimeout(openTour, 700);

    byId("openCommandPaletteBtn")?.addEventListener("click", openPalette);
    byId("commandSearch")?.addEventListener("input", event => { selectedCommand = 0; renderCommands(event.target.value); });
    byId("commandSearch")?.addEventListener("keydown", event => {
      if (event.key === "ArrowDown") { event.preventDefault(); selectedCommand = Math.min(selectedCommand + 1, filteredCommands.length - 1); renderCommands(event.currentTarget.value); }
      if (event.key === "ArrowUp") { event.preventDefault(); selectedCommand = Math.max(selectedCommand - 1, 0); renderCommands(event.currentTarget.value); }
      if (event.key === "Enter" && filteredCommands[selectedCommand]) { event.preventDefault(); navigate(filteredCommands[selectedCommand][2]); closePalette(); }
    });
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openPalette(); }
      if (event.key === "Escape" && byId("commandPalette")?.open) closePalette();
    });
  });
})();
