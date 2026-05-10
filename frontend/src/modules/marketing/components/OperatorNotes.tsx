// M15.21.notes — free-form operator scratch pad embedded in
// the lead drawer. Markdown textarea + Save / Cancel /
// Clear actions; persists via PUT /api/marketing/leads/:id/notes.
//
// The component is self-contained (its own dirty + busy
// state); the parent only owns the lead id + a refresh
// callback so the drawer's Lead row picks up the new value
// after save without a full re-fetch.
//
// Phase 6 sample — composes shared `<Card>`, `<Textarea>`,
// `<Button>`, `<Banner>`, `<Text>` primitives instead of
// hand-rolled styling.

import { useEffect, useState } from "react";
import { NotebookPen, Save, Trash2, X } from "lucide-react";

import { Banner, Button, Card, Text, Textarea } from "../../../components/ui";
import { useT } from "../../../i18n";
import { updateLeadNotes } from "../../../api/marketing";

export interface OperatorNotesProps {
  /** The lead being annotated — endpoint URL keys on this id. */
  leadId: string;
  /** Current persisted value from the lead row. `null` /
   *  `undefined` mean column NULL on disk. */
  initialNotes: string | null | undefined;
  /** Fires after a successful save with the refreshed notes
   *  string (or `null` if the operator cleared the field).
   *  Lets the parent stamp the cached Lead row without a
   *  re-fetch round-trip. */
  onSaved?: (notes: string | null) => void;
}

/** Normalise the wire shape into the editor's text-state.
 *  `null | undefined` collapse to empty string so the textarea
 *  always carries a defined value (React controlled-input rule). */
function normalise(notes: string | null | undefined): string {
  return notes ?? "";
}

/** Map an empty editor string back to `null` so the wire
 *  payload writes SQL NULL instead of an empty literal. The
 *  daemon accepts either, but `null` is the conventional
 *  "field never authored" sentinel and keeps the SELECT
 *  result tidy for downstream consumers. */
function toWireNotes(text: string): string | null {
  return text.length === 0 ? null : text;
}

export default function OperatorNotes({
  leadId,
  initialNotes,
  onSaved,
}: OperatorNotesProps) {
  const t = useT();
  const persisted = normalise(initialNotes);
  const [draft, setDraft] = useState(persisted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the draft when the lead id changes (operator
  // navigated to a different lead while the panel was open)
  // OR when the persisted value changes from outside (a
  // sibling save / firehose update). Comparing on the
  // normalised string avoids the trivial null↔"" oscillation.
  useEffect(() => {
    setDraft(persisted);
    setError(null);
  }, [leadId, persisted]);

  const dirty = draft !== persisted;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const wire = toWireNotes(draft);
      await updateLeadNotes(leadId, wire);
      // Keep the editor's draft in sync so `dirty` flips to
      // false without waiting for the parent's refresh.
      setDraft(normalise(wire));
      onSaved?.(wire);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    setDraft(persisted);
    setError(null);
  }

  async function clear() {
    setBusy(true);
    setError(null);
    try {
      await updateLeadNotes(leadId, null);
      setDraft("");
      onSaved?.(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div data-testid="operator-notes">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          placeholder={t("lead.notes.placeholder")}
          disabled={busy}
          data-testid="operator-notes-textarea"
        />
        {error && (
          <div className="mt-1.5">
            <Banner tone="danger">
              <span data-testid="operator-notes-error">{error}</span>
            </Banner>
          </div>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Button
            variant="primary"
            size="sm"
            disabled={!dirty}
            busy={busy}
            leadingIcon={<Save size={11} />}
            onClick={() => void save()}
            data-testid="operator-notes-save"
          >
            {t("common.save")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!dirty || busy}
            leadingIcon={<X size={11} />}
            onClick={cancel}
            data-testid="operator-notes-cancel"
          >
            {t("common.cancel")}
          </Button>
          {persisted.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              leadingIcon={<Trash2 size={11} />}
              onClick={() => void clear()}
              className="ml-auto"
              data-testid="operator-notes-clear"
              title={t("lead.notes.delete_title")}
            >
              {t("lead.notes.delete")}
            </Button>
          )}
        </div>
        {!dirty && !busy && persisted.length === 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <NotebookPen size={10} className="text-text-meta" />
            <Text tone="meta" size="xs">
              {t("lead.notes.empty_hint")}
            </Text>
          </div>
        )}
      </div>
    </Card>
  );
}
