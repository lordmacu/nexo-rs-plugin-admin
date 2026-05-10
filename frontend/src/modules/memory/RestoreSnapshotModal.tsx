// Phase 90.x.memory-snapshot.create-restore — 2-step restore
// modal. Step 1: dry-run preview. Step 2: confirm-by-typing-id-
// prefix + destructive apply. The daemon forces
// `auto_pre_snapshot=true` so every apply captures a
// pre-restore bundle the operator can roll back to.

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { useMemory } from "../../store/memory";
import { useT } from "../../i18n";
import RestoreReportTable from "./RestoreReportTable";
import type { SnapshotMeta } from "../../api/memory";

interface Props {
  snapshot: SnapshotMeta;
  onClose: () => void;
  onApplied: () => void;
}

export default function RestoreSnapshotModal({
  snapshot,
  onClose,
  onApplied,
}: Props) {
  const t = useT();
  const {
    runRestore,
    restoreInFlight,
    lastRestoreReport,
    clearLastRestoreReport,
  } = useMemory();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  // 2-step state: until the operator runs a dry_run preview the
  // destructive apply stays disabled. Resets when the snapshot
  // changes.
  const [previewed, setPreviewed] = useState(false);

  // Cleanup on unmount so the next open starts fresh.
  useEffect(() => {
    return () => {
      clearLastRestoreReport();
    };
  }, [clearLastRestoreReport]);

  const idPrefix = snapshot.id.slice(0, 8);
  const confirmOk = confirmText.trim() === idPrefix;
  const canPreview = !restoreInFlight;
  const canApply = previewed && confirmOk && !restoreInFlight;

  const runPreview = async () => {
    if (!canPreview) return;
    setError(null);
    try {
      await runRestore(snapshot.id, true, snapshot.tenant);
      setPreviewed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runApply = async () => {
    if (!canApply) return;
    setError(null);
    try {
      await runRestore(snapshot.id, false, snapshot.tenant);
      onApplied();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-panel p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            {t("memory.snapshots.restore.title")}
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
              {t("memory.snapshots.restore.field.snapshot_id")}
            </span>
            <span className="font-mono text-text-primary">{snapshot.id}</span>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <span className="text-text-meta">
              {t("memory.snapshots.restore.field.tenant")}
            </span>
            <span className="font-mono text-text-primary">
              {snapshot.tenant}
            </span>
          </div>
          {snapshot.label && (
            <div className="mt-1 flex justify-between gap-3">
              <span className="text-text-meta">
                {t("memory.snapshots.restore.field.label")}
              </span>
              <span className="text-text-primary">{snapshot.label}</span>
            </div>
          )}
          {snapshot.encrypted && (
            <div className="mt-1 text-text-meta">
              {t("memory.snapshots.restore.encrypted_note")}
            </div>
          )}
        </div>

        <div className="mb-4 flex gap-3">
          <button
            type="button"
            className="rounded border bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-panel-hover disabled:opacity-50"
            onClick={() => void runPreview()}
            disabled={!canPreview}
          >
            {restoreInFlight && !previewed
              ? t("memory.snapshots.restore.previewing")
              : t("memory.snapshots.restore.preview_action")}
          </button>
          {previewed && (
            <span className="text-xs text-text-meta self-center">
              {t("memory.snapshots.restore.preview_done_hint")}
            </span>
          )}
        </div>

        {lastRestoreReport && (
          <div className="mb-4">
            <RestoreReportTable report={lastRestoreReport} />
          </div>
        )}

        {previewed && (
          <div className="mb-4 rounded border border-warning/40 bg-warning-soft p-3">
            <div className="mb-2 flex items-start gap-2 text-sm text-warning">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <p>{t("memory.snapshots.restore.warning")}</p>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
                {t("memory.snapshots.restore.confirm_prompt", {
                  prefix: idPrefix,
                })}
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
        )}

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
            disabled={restoreInFlight}
          >
            {t("memory.snapshots.restore.cancel")}
          </button>
          <button
            type="button"
            className="rounded bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-hover disabled:opacity-50"
            onClick={() => void runApply()}
            disabled={!canApply}
          >
            {restoreInFlight && previewed
              ? t("memory.snapshots.restore.applying")
              : t("memory.snapshots.restore.apply_action")}
          </button>
        </div>
      </div>
    </div>
  );
}
