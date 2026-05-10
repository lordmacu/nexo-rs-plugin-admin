// Per-kind / per-locale form for the notification
// templates document. Shape: Record<kind, { es?, en? }>.
// Operator edits 5 kinds × 2 locales side by side; empty
// fields drop to framework defaults at render time.
//
// The 5 kinds are stable per the marketing extension's
// notification surface; placeholder hints live above the
// textareas so the operator knows which {{vars}} expand
// in each kind.

import { useEffect, useState } from "react";

import type { ConfigNotificationTemplates } from "../../../api/marketing";
import { Button, Textarea } from "../../../components/ui";
import { useT } from "../../../i18n";
import type { CatalogKey } from "../../../i18n";

const KINDS: ReadonlyArray<{
  id: "lead_created" | "lead_replied" | "lead_transitioned" | "meeting_intent" | "draft_pending";
  labelKey: CatalogKey;
  placeholderHint: string;
}> = [
  {
    id: "lead_created",
    labelKey: "marketing.notification_template.kind.lead_created",
    placeholderHint:
      "{{from}} · {{from_email}} · {{subject}} · {{seller}} · {{seller_email}} · {{lead_id}}",
  },
  {
    id: "lead_replied",
    labelKey: "marketing.notification_template.kind.lead_replied",
    placeholderHint:
      "{{from}} · {{from_email}} · {{subject}} · {{seller}} · {{seller_email}} · {{lead_id}}",
  },
  {
    id: "lead_transitioned",
    labelKey: "marketing.notification_template.kind.lead_transitioned",
    placeholderHint:
      "{{from}} · {{state_from}} → {{state_to}} · {{reason}} · {{seller}} · {{lead_id}}",
  },
  {
    id: "meeting_intent",
    labelKey: "marketing.notification_template.kind.meeting_intent",
    placeholderHint:
      "{{from}} · {{confidence_pct}} · {{evidence}} · {{seller}} · {{lead_id}}",
  },
  {
    id: "draft_pending",
    labelKey: "marketing.notification_template.kind.draft_pending",
    placeholderHint:
      "{{from}} · {{subject}} · {{seller}} · {{seller_email}} · {{lead_id}}",
  },
] as const;

type KindId = (typeof KINDS)[number]["id"];
type Locale = "es" | "en";

/** Pull a string at `doc[kind][locale]` defensively — the
 *  wire shape is permissive, so missing keys / wrong types
 *  fall back to the empty string. */
export function readField(
  doc: ConfigNotificationTemplates,
  kind: string,
  locale: Locale,
): string {
  const block = (doc as Record<string, unknown>)[kind];
  if (typeof block !== "object" || block === null) return "";
  const v = (block as Record<string, unknown>)[locale];
  return typeof v === "string" ? v : "";
}

/** Trim + drop empty locale fields so the persisted doc
 *  stays clean. Empty kind objects also drop entirely so
 *  the snapshot pre-save never carries
 *  `{ lead_created: {} }` placeholder noise. */
export function buildPayload(
  draft: Record<KindId, { es: string; en: string }>,
): ConfigNotificationTemplates {
  const out: Record<string, Record<string, string>> = {};
  for (const k of Object.keys(draft) as KindId[]) {
    const block: Record<string, string> = {};
    const es = draft[k].es.trim();
    const en = draft[k].en.trim();
    if (es) block.es = draft[k].es;
    if (en) block.en = draft[k].en;
    if (Object.keys(block).length > 0) out[k] = block;
  }
  return out;
}

interface Props {
  readonly initial: ConfigNotificationTemplates;
  readonly onSave: (
    next: ConfigNotificationTemplates,
  ) => Promise<
    | { kind: "ok" }
    | { kind: "ok_restart_required"; note?: string }
    | { kind: "error"; message: string }
  >;
}

function emptyDraft(): Record<KindId, { es: string; en: string }> {
  return KINDS.reduce(
    (acc, k) => {
      acc[k.id] = { es: "", en: "" };
      return acc;
    },
    {} as Record<KindId, { es: string; en: string }>,
  );
}

export default function NotificationTemplatesEditor({
  initial,
  onSave,
}: Props) {
  const t = useT();
  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    { kind: "ok"; note?: string } | { kind: "error"; message: string } | null
  >(null);

  useEffect(() => {
    const next = emptyDraft();
    for (const k of KINDS) {
      next[k.id] = {
        es: readField(initial, k.id, "es"),
        en: readField(initial, k.id, "en"),
      };
    }
    setDraft(next);
  }, [initial]);

  const setField = (kind: KindId, locale: Locale, value: string) =>
    setDraft((d) => ({ ...d, [kind]: { ...d[kind], [locale]: value } }));

  const onSubmit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const payload = buildPayload(draft);
      const r = await onSave(payload);
      if (r.kind === "ok") setStatus({ kind: "ok" });
      else if (r.kind === "ok_restart_required") {
        const next: { kind: "ok"; note?: string } = { kind: "ok" };
        if (r.note !== undefined) next.note = r.note;
        setStatus(next);
      } else setStatus({ kind: "error", message: r.message });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="notification-templates-editor" className="space-y-3">
      {KINDS.map((k) => (
        <div
          key={k.id}
          data-testid={`notif-kind-${k.id}`}
          className="rounded border  bg-white p-3"
        >
          <p className="text-sm font-medium text-text-primary">
            {t(k.labelKey)}
          </p>
          <p className="mt-0.5 text-[10px] font-mono text-text-meta">
            {k.placeholderHint}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
              {t("marketing.notification_template.locale_es")}
              <Textarea
                value={draft[k.id].es}
                onChange={(e) => setField(k.id, "es", e.target.value)}
                rows={3}
                disabled={busy}
                aria-label={`notif-${k.id}-es`}
                className="rounded border  bg-white p-2 font-mono text-[11px] text-text-primary outline-none focus:border-indigo-400 disabled:opacity-60"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-text-secondary">
              {t("marketing.notification_template.locale_en")}
              <Textarea
                value={draft[k.id].en}
                onChange={(e) => setField(k.id, "en", e.target.value)}
                rows={3}
                disabled={busy}
                aria-label={`notif-${k.id}-en`}
                className="rounded border  bg-white p-2 font-mono text-[11px] text-text-primary outline-none focus:border-indigo-400 disabled:opacity-60"
              />
            </label>
          </div>
        </div>
      ))}

      {status?.kind === "ok" && (
        <div
          role="status"
          className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700"
        >
          {status.note
            ? t("marketing.notification_template.saved_with_note", {
                note: status.note,
              })
            : t("marketing.notification_template.saved")}
        </div>
      )}
      {status?.kind === "error" && (
        <div
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700"
        >
          {status.message}
        </div>
      )}

      <Button variant="primary" size="sm" onClick={onSubmit} disabled={busy}>
        {busy
          ? t("marketing.notification_template.saving")
          : t("marketing.notification_template.save_button")}
      </Button>
    </div>
  );
}
