// Main-area body when /m/marketing/leads/:lead_id is open.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowRight,
  Inbox,
  Mail,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";

import {
  generateDraft,
  getLeadThread,
  type ThreadMessage as ApiThreadMessage,
} from "../../api/marketing";
import { HttpError } from "../../api/client";
import { useMarketingConfig } from "../../store/marketingConfig";
import { useMarketingLeads } from "../../store/marketingLeads";
import { useMarketingPersons } from "../../store/marketingPersons";
import AiDraftCard from "./components/AiDraftCard";
import DuplicateMergePrompt from "./components/DuplicateMergePrompt";
import EngagementBadge from "./components/EngagementBadge";
import EnrichmentCard from "./components/EnrichmentCard";
import {
  colorForId,
  initialsFor,
  personDisplayName,
  sellerDisplayName,
  sellerEmail as sellerEmailOf,
} from "./data/liveAdapters";
import { formatRelative } from "./data/formatters";
import type { LeadState, ThreadMessage } from "./data/types";
import { Button, Textarea } from "../../components/ui";
import { useT } from "../../i18n";

const STATE_COLOR: Record<LeadState, string> = {
  cold: "bg-slate-100 text-slate-700 ring-slate-200",
  engaged: "bg-sky-50 text-sky-700 ring-sky-200",
  meeting_scheduled: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  qualified: "bg-violet-50 text-violet-700 ring-violet-200",
  lost: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function LeadDetail() {
  const t = useT();
  const { lead_id } = useParams();
  const lead = useMarketingLeads((s) =>
    lead_id ? s.leads.find((l) => l.id === lead_id) : undefined,
  );
  const source = useMarketingLeads((s) => s.source);

  // Hydrate person/company via the live store + ensure
  // helper. Idempotent — repeat renders short-circuit.
  const personEntry = useMarketingPersons((s) =>
    lead ? s.byId[lead.person_id] : undefined,
  );
  const ensurePerson = useMarketingPersons((s) => s.ensure);
  const sellersSlice = useMarketingConfig((s) => s.sellers);
  useEffect(() => {
    if (lead?.person_id) void ensurePerson(lead.person_id);
  }, [lead?.person_id, ensurePerson]);

  // Fetch the live thread on mount + when the threadRev tick
  // bumps after a draft mutation. Failures land in the empty-
  // state banner — the UI never crashes on a transient
  // extension outage.
  //
  // IMPORTANT — keep these hooks BEFORE the `if (!lead)` early
  // return below. React's "rules of hooks" forbid a render
  // path that calls fewer hooks than a previous one; on the
  // first render `lead` is `undefined` (zustand hydrating),
  // and on the next it is defined — moving these state hooks
  // below the early return would change the call count and
  // crash with "Rendered more hooks than during the previous
  // render".
  const [liveThread, setLiveThread] = useState<
    readonly ApiThreadMessage[] | null
  >(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [threadRev, setThreadRev] = useState(0);
  useEffect(() => {
    if (!lead_id) {
      setLiveThread(null);
      setThreadError(null);
      return;
    }
    let cancelled = false;
    setThreadError(null);
    getLeadThread(lead_id)
      .then((r) => {
        if (!cancelled) setLiveThread(r.messages);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setThreadError(e instanceof Error ? e.message : String(e));
          setLiveThread(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lead_id, threadRev]);

  if (!lead) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 text-slate-400">
        <Inbox size={40} className="opacity-40" />
        <p className="text-sm">
          {source === "loading"
            ? t("lead.detail.loading_leads")
            : source === "error"
              ? t("lead.detail.no_extension")
              : t("lead.detail.select_prompt")}
        </p>
      </div>
    );
  }

  const livePerson = personEntry?.person;
  const liveCompany = personEntry?.company ?? null;
  const liveSeller =
    sellersSlice.source === "api"
      ? sellersSlice.data.find((s) => String(s.id) === lead.seller_id)
      : null;

  const personName = livePerson
    ? personDisplayName(livePerson)
    : personEntry?.status === "loading"
      ? t("lead.detail.loading_person")
      : lead.person_id;
  const personEmail = livePerson?.primary_email ?? "";
  const companyName = liveCompany?.name ?? null;
  const sellerName = liveSeller
    ? sellerDisplayName(liveSeller)
    : lead.seller_id;
  const sellerEmail = liveSeller ? sellerEmailOf(liveSeller) : "";
  const sellerColor = colorForId(lead.seller_id);
  const initials = initialsFor(personName);

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white shadow-md"
              style={{ backgroundColor: sellerColor }}
            >
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900">
                  {personName}
                </h1>
                {personEmail && (
                  <span className="text-xs text-slate-400">
                    · {personEmail}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-slate-600">{lead.subject}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ring-1 ${
                    STATE_COLOR[lead.state]
                  }`}
                >
                  {lead.state.replace("_", " ")}
                </span>
                {companyName && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700 ring-1 ring-slate-200">
                    {companyName}
                  </span>
                )}
                {lead.topic_tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 ring-1 ring-indigo-200"
                  >
                    #{tag}
                  </span>
                ))}
                {source === "api" && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-200">
                    {t("lead.detail.tag.live")}
                  </span>
                )}
                {source === "error" && (
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700 ring-1 ring-rose-200">
                    {t("lead.detail.tag.demo_off")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ArrowRight size={11} />
              <span>{t("lead.detail.assigned_to")}</span>
              <span className="font-medium text-slate-700">{sellerName}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <TrendingUp size={10} />
              {t("lead.detail.score", { score: lead.score })}
            </div>
          </div>
        </div>
      </header>

      {/* M15.23.e — duplicate-person merge prompt sits
          right under the header so the operator catches a
          potential merge before scanning the thread. Only
          renders when the audit log carries
          `duplicate_person_detected` rows for this lead;
          silent otherwise. */}
      {lead_id && (
        <div className="border-b border-slate-200 bg-white/40 px-6 py-3">
          <div className="mx-auto max-w-3xl space-y-3">
            <DuplicateMergePrompt lead_id={lead_id} />
            {/* M15.21.b — enrichment override prompt.
                Self-silences when the person is already
                manually confirmed or above the high-
                confidence threshold; on confirm the
                threadRev bump refetches the live thread so
                downstream consumers see the new state. */}
            <EnrichmentCard
              personId={lead.person_id}
              onConfirmed={() => setThreadRev((r) => r + 1)}
            />
          </div>
        </div>
      )}

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-3xl space-y-3">
          {threadError ? (
            <div className="rounded-lg border border-dashed border-rose-300 bg-rose-50 px-6 py-10 text-center text-xs text-rose-700">
              {t("lead.detail.thread_unavailable", { error: threadError })}
            </div>
          ) : liveThread === null ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center text-xs text-slate-400">
              {t("lead.detail.thread_loading")}
            </div>
          ) : liveThread.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center text-xs text-slate-500">
              {t("lead.detail.thread_empty")}
            </div>
          ) : (
            liveThread.map((msg) => {
              // Drop the optional `draft_status` field unless
              // it's set — `exactOptionalPropertyTypes` rejects
              // an explicit `undefined` for an optional field.
              const adapted: ThreadMessage = {
                id: msg.id,
                direction: msg.direction,
                from_label: msg.from_label,
                body: msg.body,
                at_ms: msg.at_ms,
                ...(msg.draft_status ? { draft_status: msg.draft_status } : {}),
              };
              if (msg.direction === "draft" && lead_id) {
                return (
                  <AiDraftCard
                    key={msg.id}
                    leadId={lead_id}
                    draft={msg}
                    sellerColor={sellerColor}
                    onChanged={() => setThreadRev((r) => r + 1)}
                  />
                );
              }
              return (
                <ThreadBubble
                  key={msg.id}
                  msg={adapted}
                  sellerColor={sellerColor}
                />
              );
            })
          )}

          {/* Generate-draft button: visible when the live
              thread carries no pending draft. */}
          {lead_id &&
            liveThread &&
            !liveThread.some(
              (m) => m.direction === "draft" && m.draft_status === "pending",
            ) && (
              <GenerateDraftButton
                leadId={lead_id}
                onGenerated={() => setThreadRev((r) => r + 1)}
              />
            )}
        </div>
      </div>

      {/* Composer hint */}
      <div className="border-t border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <Mail size={13} />
            {t("lead.detail.outbound_from")}{" "}
            <span className="font-medium text-slate-700">{sellerEmail}</span>
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Star size={11} /> {t("lead.detail.draft_mode")}
          </span>
        </div>
      </div>
    </div>
  );
}

function ThreadBubble({
  msg,
  sellerColor,
}: {
  msg: ThreadMessage;
  sellerColor: string;
}) {
  const isOutbound = msg.direction === "outbound";
  return (
    <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
          isOutbound
            ? "bg-gradient-to-br from-emerald-50 to-emerald-100/70 ring-1 ring-emerald-200"
            : "bg-white ring-1 ring-slate-200"
        }`}
      >
        <div className="mb-1.5 flex items-center gap-2">
          {isOutbound ? (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white"
              style={{ backgroundColor: sellerColor }}
            >
              {msg.from_label
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-600">
              {msg.from_label
                .split(" ")
                .slice(0, 2)
                .map((p) => p[0])
                .join("")
                .toUpperCase()}
            </span>
          )}
          <span className="text-[11px] font-semibold text-slate-700">
            {msg.from_label}
          </span>
          <span className="text-[10px] text-slate-400">
            · {formatRelative(msg.at_ms)}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
          {msg.body}
        </p>
        {/* F20 — engagement badge for outbound rows. The
            tracking msg_id is the same id `prepare_outbound_email`
            stamped at send time + that the approve handler
            persists as the row's `id`, so we can query the
            aggregates directly. Pre-tracking rows
            (`outbound-<uuid>` placeholders) get an empty
            response and stay silent. */}
        {isOutbound && <EngagementBadge msgId={msg.id} />}
      </div>
    </div>
  );
}

/** Pull a stable error code out of an unknown thrown value
 *  so the inline banner is actionable for the operator. */
function generateErrorCode(e: unknown): string {
  if (e instanceof HttpError) {
    const body = e.body as { code?: string } | string;
    if (typeof body === "object" && body && "code" in body) {
      return body.code ?? `http_${e.status}`;
    }
    return `http_${e.status}`;
  }
  return e instanceof Error ? e.message : String(e);
}

/** M15.21 slice 4 — "Generate AI draft" affordance. Renders
 *  inline at the bottom of the thread when no pending draft
 *  exists yet. POSTs to `/drafts/generate`; on success the
 *  parent bumps `threadRev` and the new draft picks up via
 *  the live thread refetch. */
function GenerateDraftButton({
  leadId,
  onGenerated,
}: {
  leadId: string;
  onGenerated: () => void;
}) {
  const t = useT();
  const [hint, setHint] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      const trimmed = hint.trim();
      // Only forward `operator_hint` when the operator actually
      // typed something; the server filters whitespace anyway
      // but skipping the field keeps the wire payload tidy.
      await generateDraft(
        leadId,
        trimmed.length > 0 ? { operator_hint: trimmed } : {},
      );
      setHint("");
      setShowHint(false);
      onGenerated();
    } catch (e: unknown) {
      setError(generateErrorCode(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex justify-end">
      <div className="w-full max-w-[82%] rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-3">
        {showHint && (
          <Textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder={t("lead.detail.hint_placeholder")}
            rows={2}
            disabled={busy}
            className="mb-2 w-full rounded-lg border border-indigo-200 bg-white p-2 text-xs text-slate-700 outline-none focus:border-indigo-400 disabled:opacity-60"
          />
        )}
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onClick} disabled={busy}>
            <Sparkles size={13} />
            {busy ? t("lead.detail.generating") : t("lead.detail.generate_button")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowHint((s) => !s)}
            disabled={busy}
          >
            {showHint ? t("lead.detail.hide_hint") : t("lead.detail.add_hint")}
          </Button>
          {error && (
            <span
              role="alert"
              className="ml-auto text-[11px] font-medium text-rose-700"
            >
              {error}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
