/* StatusOS v1.7.3 Data Integrity & Sync Protection */
(function () {
  const api = () => window.StatusOS?.DataProtection;
  const downloadJSON = (name, value) => {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  };
  const closeProfile = () => {
    document.getElementById("profileMenu")?.classList.add("hidden");
    document.getElementById("profileMenuBtn")?.setAttribute("aria-expanded", "false");
  };
  const formatTime = value => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  function restoreRecent() {
    closeProfile();
    const backups = api()?.listBackups?.() || [];
    if (!backups.length) return alert("No StatusOS backups are available yet.");
    const lines = backups.slice(0, 10).map((b, i) => `${i + 1}. ${formatTime(b.createdAt)} — ${b.reason}`).join("\n");
    const choice = prompt(`Choose a backup number to restore:\n\n${lines}`);
    if (!choice) return;
    const backup = backups[Number(choice) - 1];
    if (!backup) return alert("That backup number is not available.");
    if (!confirm(`Restore the backup from ${formatTime(backup.createdAt)}?\n\nYour current workspace will be backed up first.`)) return;
    try {
      api().restoreBackup(backup.id);
      alert("Backup restored successfully. StatusOS will now sync the recovered workspace.");
    } catch (error) {
      console.error(error);
      alert("StatusOS could not restore that backup.");
    }
  }

  function bind() {
    document.getElementById("profileRestoreBtn")?.addEventListener("click", restoreRecent);
    document.getElementById("profileArtistExportBtn")?.addEventListener("click", () => {
      closeProfile();
      const artists = api()?.exportArtists?.() || [];
      downloadJSON(`statusos-artists-${new Date().toISOString().slice(0, 10)}.json`, { version: "1.7.3", exportedAt: new Date().toISOString(), artists });
    });
    const input = document.getElementById("artistImportInput");
    document.getElementById("profileArtistImportBtn")?.addEventListener("click", () => { closeProfile(); input?.click(); });
    input?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const artists = Array.isArray(parsed) ? parsed : parsed.artists;
          api().importArtists(artists);
          alert("Artist OS import complete. Existing artists were merged, not replaced.");
        } catch (error) {
          console.error(error);
          alert("That Artist OS backup could not be imported.");
        } finally {
          input.value = "";
        }
      };
      reader.readAsText(file);
    });
    document.getElementById("profileSyncNowBtn")?.addEventListener("click", async () => {
      closeProfile();
      const button = document.getElementById("profileSyncNowBtn");
      if (button) button.disabled = true;
      try {
        await api()?.syncNow?.();
        alert("StatusOS sync completed. Local and cloud artist records were merged safely.");
      } catch (error) {
        console.error(error);
        alert("Sync could not finish. Your local data and backup remain safe.");
      } finally {
        if (button) button.disabled = false;
      }
    });
    api()?.createBackup?.("v1.7.3 safety checkpoint");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();
})();
