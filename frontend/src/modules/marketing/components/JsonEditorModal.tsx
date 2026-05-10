// Generic JSON-textarea editor for the Settings tabs (M15.34).
//
// The full-form-per-entity treatment lands when product proves
// the workflow; today operators get a power-user surface that
// still beats hand-editing YAML files via SSH:
//
//   - Modal opens with the current rows pretty-printed.
//   - Edit → JSON.parse client-side (catches syntax errors
//     immediately, no round-trip).
//   - Save → onSave(parsed) — the parent's store action POSTs
//     to /api/marketing/config/* + re-fetches.
//   - Server-side validation errors land in the modal body
//     with the typed code so the operator sees `invalid_payload`
//     vs `tenant_mismatch` etc.

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import type { SaveOutcome } from "../../../store/marketingConfig";
import { Button, Textarea } from "../../../components/ui";
import { useT } from "../../../i18n";

interface JsonEditorModalProps {
  /** Title bar text. e.g. "Editar sellers". */
  title: string;
  /** Initial JSON value — pretty-printed into the textarea on
   *  open. The shape is whatever the server expects; the modal
   *  is type-agnostic by design. */
  initial: unknown;
  /** Hint shown above the textarea — e.g. "Array de sellers
   *  con id / primary_email / signature_text". Operator-facing. */
  hint?: string;
  /** Called when the user clicks Save with a valid-JSON
   *  textarea. Returns the SaveOutcome from the store. */
  onSave: (parsed: unknown) => Promise<SaveOutcome>;
  /** Called when the user closes / cancels. */
  onClose: () => void;
}

export default function JsonEditorModal({
  title,
  initial,
  hint,
  onSave,
  onClose,
}: JsonEditorModalProps) {
  const t = useT();
  const [text, setText] = useState<string>(() =>
    JSON.stringify(initial, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [restartNote, setRestartNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAtMs, setSavedAtMs] = useState<number | null>(null);

  // Reset state if a new `initial` arrives (rare — modals close
  // on save, but cheap insurance against stale state).
  useEffect(() => {
    setText(JSON.stringify(initial, null, 2));
    setParseError(null);
    setServerError(null);
    setRestartNote(null);
    setSavedAtMs(null);
  }, [initial]);

  async function handleSave() {
    setParseError(null);
    setServerError(null);
    setRestartNote(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
      return;
    }
    setSaving(true);
    const outcome = await onSave(parsed);
    setSaving(false);
    if (outcome.kind === "error") {
      setServerError(outcome.message);
      return;
    }
    if (
      outcome.kind === "ok_restart_required" ||
      outcome.kind === "ok_with_partial_warning"
    ) {
      setRestartNote(outcome.note);
    }
    setSavedAtMs(Date.now());
    // Auto-close after a beat so the operator sees the
    // confirmation. Skip auto-close when a banner needs to
    // be read (restart required or partial-warning sync).
    if (outcome.kind === "ok") {
      setTimeout(() => onClose(), 700);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="json-editor-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2
            id="json-editor-title"
            className="text-sm font-semibold text-slate-900"
          >
            {title}
          </h2>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={16} />
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {hint && <p className="text-[11px] text-slate-500">{hint}</p>}

          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (parseError) setParseError(null);
              if (serverError) setServerError(null);
            }}
            spellCheck={false}
            className="min-h-[280px] flex-1 rounded border border-slate-300 bg-slate-50 p-3 font-mono text-xs leading-snug text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            aria-label={t("marketing.json_editor.aria_label")}
          />

          {parseError && (
            <div
              className="rounded-md bg-rose-50 px-3 py-2 text-[11px] text-rose-700 ring-1 ring-rose-200"
              role="alert"
            >
              {t("marketing.json_editor.json_invalid", { error: parseError })}
            </div>
          )}
          {serverError && (
            <div
              className="rounded-md bg-rose-50 px-3 py-2 text-[11px] text-rose-700 ring-1 ring-rose-200"
              role="alert"
            >
              {t("marketing.json_editor.server_rejected", { error: serverError })}
            </div>
          )}
          {restartNote && (
            <div
              className="rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200"
              role="status"
            >
              {restartNote}
            </div>
          )}
          {savedAtMs && !serverError && (
            <div
              className="rounded-md bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 ring-1 ring-emerald-200"
              role="status"
            >
              {t("marketing.json_editor.saved")}{" "}
              {restartNote
                ? t("marketing.json_editor.banner_persists")
                : t("marketing.json_editor.closing")}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t("marketing.seller_form.saving") : t("common.save")}
          </Button>
        </footer>
      </div>
    </div>
  );
}
