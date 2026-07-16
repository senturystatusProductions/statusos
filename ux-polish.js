(() => {
  "use strict";

  const dialogs = () => Array.from(document.querySelectorAll("dialog.modal"));

  function closeDialog(dialog) {
    if (!dialog || !dialog.open) return;
    try { dialog.close("cancel"); } catch (_) { dialog.removeAttribute("open"); }
  }

  function enhanceDialog(dialog) {
    if (!dialog || dialog.dataset.uxEnhanced === "true") return;
    dialog.dataset.uxEnhanced = "true";

    const form = dialog.querySelector("form");
    const closeButton = dialog.querySelector(".icon-btn");

    if (closeButton) {
      closeButton.type = "button";
      closeButton.setAttribute("aria-label", "Close dialog");
      closeButton.setAttribute("title", "Close");
      closeButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        closeDialog(dialog);
      });
    }

    if (form && !form.querySelector(".modal-actions")) {
      const saveButton = Array.from(form.querySelectorAll("button")).find(button =>
        button !== closeButton && !button.classList.contains("modal-cancel-button")
      );

      if (saveButton) {
        saveButton.type = "submit";
        const actions = document.createElement("div");
        actions.className = "modal-actions";

        const cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "button secondary modal-cancel-button";
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", () => closeDialog(dialog));

        saveButton.parentNode.insertBefore(actions, saveButton);
        actions.append(cancelButton, saveButton);
      }
    }

    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      closeDialog(dialog);
    });

    dialog.addEventListener("click", event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom;
      if (!inside) closeDialog(dialog);
    });
  }

  function focusFirstField(dialog) {
    const field = dialog?.querySelector("input:not([type='hidden']), select, textarea, button");
    if (field) window.setTimeout(() => field.focus({ preventScroll: true }), 50);
  }

  function initialize() {
    dialogs().forEach(enhanceDialog);

    document.addEventListener("click", event => {
      const opener = event.target.closest("[data-open]");
      if (!opener) return;
      const dialog = document.getElementById(opener.dataset.open);
      if (!dialog) return;
      enhanceDialog(dialog);
      focusFirstField(dialog);
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      const openDialog = dialogs().reverse().find(dialog => dialog.open);
      if (openDialog) {
        event.preventDefault();
        closeDialog(openDialog);
      }
    });

    if (window.StatusOS) {
      window.StatusOS.Modal = {
        close: closeDialog,
        enhance: enhanceDialog,
        closeAll: () => dialogs().filter(dialog => dialog.open).forEach(closeDialog)
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
