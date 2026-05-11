// Phase 81.21.b.b follow-up — manual restart confirmation modal.
// Mirrors RestoreSnapshotModal's confirm-by-typing-id pattern:
// the operator must type the plugin id prefix before the
// destructive button enables. Backend wraps spawn in 60s timeout
// so the spinner has a generous upper bound.

import { useState } from "react";
import { AlertTriangle, RotateCcw, X } from "lucide-react";

import { usePluginsDoctor } from "../../store/plugins";
import { useT } from "../../i18n";
import { confirmPrefix, confirmPrefixMatches } from "../../lib/confirmPrefix";
import { useEscapeKey, useBackdropClose } from "../../lib/useDialogClose";

interface Props {
  pluginId: string;
  onClose: () => void;
  onApplied: () => void;
}

export default function RestartPluginModal({
  pluginId,
  onClose,
  onApplied,
}: Props) {
  const t = useT();
  const { restart, restartInFlight } = usePluginsDoctor();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Phase 90 audit fix — shared `confirmPrefix` helper. Same
  // 8-char default as RestoreSnapshotModal so operators don't
  // have to learn two patterns.
  const idPrefix = confirmPrefix(pluginId);
  const confirmOk = confirmPrefixMatches(confirmText, pluginId);

  // Phase 90 audit fix — Escape + backdrop-click close. Disabled
  // mid-flight (60s upper bound on the spawn handshake) so a
  // stray click can't dismiss the modal and orphan operator
  // attention.
  useEscapeKey({ onClose, disabled: restartInFlight === pluginId });
  const handleBackdropClick = useBackdropClose({
    onClose,
    disabled: restartInFlight === pluginId,
  });
  const inFlight = restartInFlight === pluginId;
  const canApply = confirmOk && !inFlight;

  const runRestart = async () => {
    if (!canApply) return;
    setError(null);
    try {
      await restart(pluginId);
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-lg bg-panel p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <RotateCcw size={18} />
            {t("plugins.restart.title")}
          </h2>
          <button
            type="button"
            className="rounded p-1 text-text-secondary hover:bg-panel-hover"
            onClick={onClose}
            aria-label="close"
          >
            <X size={16} />
          </button>
        </header>

        <div className="mb-4 rounded bg-surface p-3 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-text-meta">
              {t("plugins.restart.field.plugin_id")}
            </span>
            <span className="font-mono text-text-primary">{pluginId}</span>
          </div>
        </div>

        <div className="mb-4 rounded border border-warning/40 bg-warning-soft p-3">
          <div className="flex items-start gap-2 text-sm text-warning">
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <p>{t("plugins.restart.warning")}</p>
          </div>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
              {t("plugins.restart.confirm_prompt", { prefix: idPrefix })}
            </span>
            <input
              type="text"
              className="w-full rounded border bg-surface px-2 py-1.5 font-mono text-sm text-text-primary"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={idPrefix}
              autoComplete="off"
            />
          </label>
        </div>

        {error && (
          <div className="mb-4 rounded bg-danger-soft px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded border px-3 py-1.5 text-sm text-text-secondary hover:bg-panel-hover"
            onClick={onClose}
            disabled={inFlight}
          >
            {t("plugins.restart.cancel")}
          </button>
          <button
            type="button"
            className="rounded bg-warning px-3 py-1.5 text-sm font-medium text-white hover:bg-warning-hover disabled:opacity-50"
            onClick={() => void runRestart()}
            disabled={!canApply}
          >
            {inFlight ? t("plugins.restart.applying") : t("plugins.restart.action")}
          </button>
        </div>
      </div>
    </div>
  );
}
