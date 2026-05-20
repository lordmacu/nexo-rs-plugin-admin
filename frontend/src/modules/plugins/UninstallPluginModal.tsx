// Phase 98 follow-up — uninstall confirmation modal.
// Mirrors RestartPluginModal's confirm-by-typing-id-prefix pattern
// for the destructive guard. Adds a `cargo uninstall` opt-in
// checkbox: unchecked leaves the binary on disk (re-enable without
// re-download); checked also shells out to `cargo uninstall`.

import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

import { pluginsUninstall } from "../../api/plugin_uninstall";
import { useT } from "../../i18n";

interface Props {
  pluginId: string;
  onClose: () => void;
  onApplied: () => void;
}

export default function UninstallPluginModal({
  pluginId,
  onClose,
  onApplied,
}: Props) {
  const t = useT();
  const [confirmText, setConfirmText] = useState("");
  const [cargoUninstall, setCargoUninstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idPrefix = pluginId.slice(0, Math.min(8, pluginId.length));
  const confirmOk = confirmText.trim() === idPrefix;
  const canApply = confirmOk && !busy;

  const runUninstall = async () => {
    if (!canApply) return;
    setBusy(true);
    setError(null);
    try {
      await pluginsUninstall(pluginId, cargoUninstall);
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-panel p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <Trash2 size={18} className="text-danger" />
            {t("plugins.uninstall.title")}
          </h2>
          <button
            type="button"
            className="rounded p-1 text-text-meta hover:bg-panel-alt"
            onClick={onClose}
            disabled={busy}
          >
            <X size={16} />
          </button>
        </header>

        <div className="mb-4 flex items-start gap-2 rounded border border-danger-soft bg-danger-soft p-3 text-sm text-danger">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{t("plugins.uninstall.warning")}</span>
        </div>

        <p className="mb-2 text-sm text-text-secondary">
          {t("plugins.uninstall.field.plugin_id")}:{" "}
          <span className="font-mono text-text-primary">{pluginId}</span>
        </p>

        <label className="mb-3 flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={cargoUninstall}
            onChange={(e) => setCargoUninstall(e.target.checked)}
            className="rounded border-border-DEFAULT"
            disabled={busy}
          />
          {t("plugins.uninstall.cargo_uninstall")}
        </label>

        <label className="mb-1 block text-xs text-text-meta">
          {t("plugins.uninstall.confirm_prompt", { prefix: idPrefix })}
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="mb-4 w-full rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-danger"
          placeholder={idPrefix}
          disabled={busy}
        />

        {error !== null && (
          <div className="mb-3 rounded border border-danger-soft bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-panel-hover"
            onClick={onClose}
            disabled={busy}
          >
            {t("plugins.uninstall.cancel")}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-hover disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void runUninstall()}
            disabled={!canApply}
          >
            <Trash2 size={14} />
            {busy ? t("plugins.uninstall.applying") : t("plugins.uninstall.action")}
          </button>
        </div>
      </div>
    </div>
  );
}
