// M15.21.b — enrichment confidence prompt + manual override.
//
// Sits in the lead drawer's header row, under the
// `DuplicateMergePrompt`. Reads the person via
// `/api/marketing/persons/:id`, surfaces the inferred
// enrichment status + confidence, and exposes
// Confirm / Edit / Discard buttons.
//
// Visibility logic (silent posture):
// - Person fetch fails (404 / 503 / network) ⇒ hide.
// - `enrichment_status === "manual"` ⇒ hide (operator
//   already confirmed).
// - `enrichment_confidence >= 0.95` AND status is one of
//   the high-confidence kinds ⇒ hide (no prompt
//   warranted).
// - Operator clicked "Discard" earlier this session ⇒
//   hide (local state only; resets on lead change).
//
// Confirm posture: one-click "Confirmar" persists the
// inferred values verbatim with status flipped to manual.
// "Editar" reveals an inline form so the operator can
// adjust the display name + company name before
// confirming.

import { useEffect, useState } from "react";
import { Building2, Check, Pencil, Sparkles, X } from "lucide-react";

import {
  confirmEnrichment,
  getPerson,
  type CompanyRecord,
  type EnrichmentStatus,
  type Person,
} from "../../../api/marketing";
import { HttpError } from "../../../api/client";
import { Button, Input } from "../../../components/ui";
import { useT } from "../../../i18n";
import type { CatalogKey } from "../../../i18n";

interface Props {
  readonly personId: string;
  /** Bumped after a confirm so the parent can refetch the
   *  lead context (person card / company chip). */
  readonly onConfirmed?: () => void;
}

/** Catalog-key label for each enrichment source. The operator
 *  should know whether a signature parse, LLM extraction, or
 *  cross-thread link informed the inference so they can weigh
 *  the confidence accordingly. */
const STATUS_KEY: Record<EnrichmentStatus, CatalogKey> = {
  none: "marketing.enrichment.source.none",
  signature_parsed: "marketing.enrichment.source.signature_parsed",
  llm_extracted: "marketing.enrichment.source.llm_extracted",
  cross_linked: "marketing.enrichment.source.cross_linked",
  api_enriched: "marketing.enrichment.source.api_enriched",
  manual: "marketing.enrichment.source.manual",
  personal_only_giveup: "marketing.enrichment.source.personal_only_giveup",
};

/** When to surface the prompt at all. Manual + very-high
 *  confidence inferences stay silent (no operator review
 *  warranted). */
function shouldPrompt(person: Person): boolean {
  if (person.enrichment_status === "manual") return false;
  if (person.enrichment_confidence >= 0.95) return false;
  return true;
}

function errorCode(e: unknown): string {
  if (e instanceof HttpError) {
    const body = e.body as { code?: string } | string;
    if (typeof body === "object" && body && "code" in body) {
      return body.code ?? `http_${e.status}`;
    }
    return `http_${e.status}`;
  }
  return e instanceof Error ? e.message : String(e);
}

export default function EnrichmentCard({ personId, onConfirmed }: Props) {
  const t = useT();
  const [person, setPerson] = useState<Person | null>(null);
  const [company, setCompany] = useState<CompanyRecord | null>(null);
  const [discarded, setDiscarded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [companyDraft, setCompanyDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDiscarded(false);
    setEditing(false);
    setError(null);
    setPerson(null);
    setCompany(null);
    getPerson(personId)
      .then((r) => {
        if (cancelled) return;
        setPerson(r.person);
        setCompany(r.company);
        setNameDraft(r.person.primary_name);
        setCompanyDraft(r.company?.name ?? "");
      })
      .catch(() => {
        // Silent fall-through — the lead drawer doesn't
        // need a banner just because enrichment lookup
        // missed.
      });
    return () => {
      cancelled = true;
    };
  }, [personId]);

  if (!person) return null;
  if (discarded) return null;
  if (!shouldPrompt(person)) return null;

  const onConfirm = async (
    overrides: { primary_name?: string; company_name?: string } = {},
  ): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const r = await confirmEnrichment(personId, overrides);
      setPerson(r.person);
      setCompany(r.company);
      setEditing(false);
      onConfirmed?.();
    } catch (e: unknown) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  const confidencePct = Math.round(person.enrichment_confidence * 100);
  const sourceLabel = t(STATUS_KEY[person.enrichment_status]);
  const inferredCompany = company?.name ?? t("marketing.enrichment.no_company");

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
          aria-hidden
        >
          <Sparkles size={12} />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">
          {t("marketing.enrichment.header_prefix", { source: sourceLabel })}
        </span>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-200">
          {confidencePct}%
        </span>
      </div>

      {!editing ? (
        <div className="space-y-1.5 text-xs text-slate-700">
          <div>
            <span className="text-slate-500">
              {t("marketing.enrichment.label_person")}
            </span>
            <span className="font-medium">{person.primary_name}</span>
            <span className="ml-1 text-slate-400">
              · {person.primary_email}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 size={11} className="text-slate-400" />
            <span className="text-slate-500">
              {t("marketing.enrichment.label_company")}
            </span>
            <span className={company ? "font-medium" : "italic text-slate-400"}>
              {inferredCompany}
            </span>
            {company && (
              <span className="text-slate-400">· {company.domain}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="flex flex-col gap-1 text-[11px] text-slate-600">
            {t("marketing.enrichment.field_person_name")}
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              disabled={busy}
              className="rounded-md border border-violet-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-violet-400 disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-slate-600">
            {t("marketing.enrichment.field_company_name")}
            <Input
              value={companyDraft}
              onChange={(e) => setCompanyDraft(e.target.value)}
              disabled={busy}
              placeholder={t("marketing.enrichment.company_placeholder")}
              className="rounded-md border border-violet-200 bg-white px-2 py-1 text-xs text-slate-800 outline-none focus:border-violet-400 disabled:opacity-60"
            />
          </label>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {!editing ? (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onConfirm()}
              disabled={busy}
            >
              <Check size={11} />
              {busy
                ? t("marketing.enrichment.confirming")
                : t("marketing.enrichment.confirm")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditing(true);
                setError(null);
              }}
              disabled={busy}
            >
              <Pencil size={11} />
              {t("common.edit")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDiscarded(true)}
              disabled={busy}
            >
              <X size={11} />
              {t("marketing.enrichment.discard")}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                onConfirm({
                  primary_name: nameDraft,
                  company_name: companyDraft,
                })
              }
              disabled={busy || nameDraft.trim().length === 0}
            >
              {busy
                ? t("marketing.enrichment.saving")
                : t("marketing.enrichment.save_and_confirm")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNameDraft(person.primary_name);
                setCompanyDraft(company?.name ?? "");
                setEditing(false);
                setError(null);
              }}
              disabled={busy}
            >
              {t("common.cancel")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
