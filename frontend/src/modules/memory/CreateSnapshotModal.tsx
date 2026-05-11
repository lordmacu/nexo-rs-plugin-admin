// Phase 90.x.memory-snapshot.create-restore — capture-bundle modal.
//
// Operator types an optional label and toggles encrypt. The
// daemon resolves the actual age recipient from
// `memory.snapshot.encryption.recipients[0]` server-side; the UI
// only needs to know whether the toggle is allowed (driven by
// `encryptionAvailable` from the list response).

import { useState } from "react";
import { Lock, X } from "lucide-react";

import { useMemory } from "../../store/memory";
import { useT } from "../../i18n";
import { useEscapeKey, useBackdropClose } from "../../lib/useDialogClose";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateSnapshotModal({ onClose, onCreated }: Props) {
  const t = useT();
  const { createNewSnapshot, encryptionAvailable, createInFlight } =
    useMemory();
  const [label, setLabel] = useState("");
  const [encrypt, setEncrypt] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !createInFlight;

  // Phase 90 audit fix — Escape + backdrop-click close. Disabled
  // mid-flight so a stray click can't dismiss the modal during
  // the create RPC (operator would lose the spinner + error
  // state).
  useEscapeKey({ onClose, disabled: createInFlight });
  const handleBackdropClick = useBackdropClose({
    onClose,
    disabled: createInFlight,
  });

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      await createNewSnapshot(label, encrypt);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-lg bg-panel p-6 shadow-xl">
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-text-primary">
            {t("memory.snapshots.create.title")}
          </h2>
          <button
            type="button"
            className="rounded p-1 text-text-secondary hover:bg-panel-hover disabled:opacity-50"
            onClick={onClose}
            aria-label="close"
            disabled={createInFlight}
          >
            <X size={16} />
          </button>
        </header>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
            {t("memory.snapshots.create.label_label")}
          </span>
          <input
            type="text"
            className="w-full rounded border bg-surface px-2 py-1.5 text-sm text-text-primary"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("memory.snapshots.create.label_placeholder")}
            autoFocus
            maxLength={120}
          />
          <span className="mt-1 block text-xs text-text-meta">
            {t("memory.snapshots.create.label_hint")}
          </span>
        </label>

        <label
          className={`mb-4 flex items-start gap-3 rounded border p-3 ${
            encryptionAvailable
              ? "cursor-pointer bg-surface hover:bg-panel-hover"
              : "cursor-not-allowed bg-panel/50 opacity-60"
          }`}
        >
          <input
            type="checkbox"
            checked={encrypt}
            disabled={!encryptionAvailable}
            onChange={(e) => setEncrypt(e.target.checked)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <Lock size={14} />
              {t("memory.snapshots.create.encrypt_label")}
            </div>
            <p className="mt-1 text-xs text-text-meta">
              {encryptionAvailable
                ? t("memory.snapshots.create.encrypt_hint")
                : t("memory.snapshots.create.encrypt_disabled_hint")}
            </p>
          </div>
        </label>

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
            disabled={createInFlight}
          >
            {t("memory.snapshots.create.cancel")}
          </button>
          <button
            type="button"
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {createInFlight
              ? t("memory.snapshots.create.saving")
              : t("memory.snapshots.create.action")}
          </button>
        </div>
      </div>
    </div>
  );
}
