// Phase 90.x.tenants — minimal create modal. Operator types id
// + display name; on submit we call tenantsUpsert. Daemon
// validates the id regex (`^[a-z0-9][a-z0-9-]{0,63}$`) and
// returns a clear error if the format is wrong.

import { useState } from "react";
import { X } from "lucide-react";

import { tenantsUpsert } from "../../api/tenants";
import { useT } from "../../i18n";
import { useEscapeKey, useBackdropClose } from "../../lib/useDialogClose";

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function TenantCreateModal({ onClose, onCreated }: Props) {
  const t = useT();
  const [id, setId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Phase 90 audit fix — Escape + backdrop-click close.
  // Disabled mid-RPC so a stray click can't lose the spinner +
  // error state.
  useEscapeKey({ onClose, disabled: busy });
  const handleBackdropClick = useBackdropClose({
    onClose,
    disabled: busy,
  });

  const idProblem =
    id.length > 0 && !ID_RE.test(id) ? t("tenants.create.id_problem") : null;
  const canSubmit =
    id.length > 0 &&
    displayName.trim().length > 0 &&
    idProblem === null &&
    !busy;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await tenantsUpsert({ id, display_name: displayName.trim() });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
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
            {t("tenants.create.title")}
          </h2>
          <button
            type="button"
            className="rounded p-1 text-text-secondary hover:bg-panel-hover disabled:opacity-50"
            onClick={onClose}
            aria-label="close"
            disabled={busy}
          >
            <X size={16} />
          </button>
        </header>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
            {t("tenants.create.id_label")}
          </span>
          <input
            type="text"
            className="w-full rounded border bg-surface px-2 py-1.5 font-mono text-sm text-text-primary"
            value={id}
            onChange={(e) => setId(e.target.value.toLowerCase())}
            placeholder="acme-corp"
            autoFocus
          />
          {idProblem && (
            <span className="mt-1 block text-xs text-danger">{idProblem}</span>
          )}
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-text-meta">
            {t("tenants.create.name_label")}
          </span>
          <input
            type="text"
            className="w-full rounded border bg-surface px-2 py-1.5 text-sm text-text-primary"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Acme Corporation"
          />
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
            disabled={busy}
          >
            {t("tenants.create.cancel")}
          </button>
          <button
            type="button"
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
          >
            {busy ? t("tenants.create.saving") : t("tenants.create.action")}
          </button>
        </div>
      </div>
    </div>
  );
}
