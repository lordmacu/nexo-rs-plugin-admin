// Right context panel — lead profile + scoring + state +
// "why this lead" explainer + replay timeline.

import { useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  Clock,
  NotebookPen,
  Sparkles,
  Tag,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";

import { useMarketingConfig } from "../../store/marketingConfig";
import { useMarketingLeads } from "../../store/marketingLeads";
import { useMarketingPersons } from "../../store/marketingPersons";
import { Button, Section } from "../../components/ui";
import { useT } from "../../i18n";
import FollowupOverride from "./components/FollowupOverride";
import LeadTimeline from "./components/LeadTimeline";
import NextStepHint from "./components/NextStepHint";
import OperatorNotes from "./components/OperatorNotes";
import ScoreExplainer from "./components/ScoreExplainer";
import StateMachine from "./components/StateMachine";
import {
  colorForId,
  personDisplayName,
  sellerDisplayName,
  sellerEmail as sellerEmailOf,
} from "./data/liveAdapters";
import { formatRelative } from "./data/formatters";
import type { SentimentBand } from "./data/types";

const SENTIMENT_TONE: Record<SentimentBand, string> = {
  very_negative: "text-rose-700 bg-rose-50 ring-rose-200",
  negative: "text-rose-600 bg-rose-50 ring-rose-200",
  neutral: "text-slate-600 bg-slate-100 ring-slate-200",
  positive: "text-emerald-700 bg-emerald-50 ring-emerald-200",
  very_positive: "text-emerald-700 bg-emerald-50 ring-emerald-200",
};

function scoreColors(s: number) {
  if (s >= 70)
    return {
      ring: "ring-emerald-200",
      bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
      text: "text-emerald-700",
      bar: "bg-emerald-500",
    };
  if (s >= 40)
    return {
      ring: "ring-amber-200",
      bg: "bg-gradient-to-br from-amber-50 to-amber-100/50",
      text: "text-amber-700",
      bar: "bg-amber-500",
    };
  return {
    ring: "ring-slate-200",
    bg: "bg-gradient-to-br from-slate-50 to-slate-100/50",
    text: "text-slate-600",
    bar: "bg-slate-400",
  };
}

export default function LeadContextPanel() {
  const t = useT();
  const { lead_id } = useParams();
  const lead = useMarketingLeads((s) =>
    lead_id ? s.leads.find((l) => l.id === lead_id) : undefined,
  );

  const personEntry = useMarketingPersons((s) =>
    lead ? s.byId[lead.person_id] : undefined,
  );
  const ensurePerson = useMarketingPersons((s) => s.ensure);
  const sellersSlice = useMarketingConfig((s) => s.sellers);
  const patchLead = useMarketingLeads((s) => s.patchLead);

  useEffect(() => {
    if (lead?.person_id) void ensurePerson(lead.person_id);
  }, [lead?.person_id, ensurePerson]);

  if (!lead) return null;

  const livePerson = personEntry?.person;
  const liveCompany = personEntry?.company ?? null;
  const liveSeller =
    sellersSlice.source === "api"
      ? sellersSlice.data.find((s) => String(s.id) === lead.seller_id)
      : null;

  const personName = livePerson
    ? personDisplayName(livePerson)
    : personEntry?.status === "loading"
      ? t("lead.person.loading")
      : lead.person_id;
  const personEmail = livePerson?.primary_email ?? "";
  const personAltEmails: readonly string[] = livePerson?.alt_emails ?? [];
  const personTags: readonly string[] = livePerson?.tags ?? [];
  const companyName = liveCompany?.name ?? null;
  const companyDomain = liveCompany?.domain ?? null;
  const companyIndustry = liveCompany?.industry ?? null;
  const sellerName = liveSeller
    ? sellerDisplayName(liveSeller)
    : lead.seller_id;
  const sellerEmail = liveSeller ? sellerEmailOf(liveSeller) : "";
  const sellerColor = colorForId(lead.seller_id);
  const score = scoreColors(lead.score);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-gradient-to-b from-white via-slate-50 to-white p-5 text-xs">
      {/* Person */}
      <Section title={t("lead.section.person")} icon={<User size={11} />}>
        <p className="text-sm font-semibold text-slate-900">{personName}</p>
        {personEmail && <p className="mt-0.5 text-slate-600">{personEmail}</p>}
        {personAltEmails.length > 0 && (
          <p className="mt-1 text-[10px] text-slate-400">
            {t("lead.person.alt_emails_prefix")} · {personAltEmails.join(" · ")}
          </p>
        )}
        {personTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {personTags.map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 ring-1 ring-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Company */}
      <Section title={t("lead.section.company")} icon={<Building2 size={11} />}>
        {companyName ? (
          <>
            <p className="text-sm font-semibold text-slate-900">
              {companyName}
            </p>
            {companyDomain && (
              <p className="mt-0.5 text-slate-600">{companyDomain}</p>
            )}
            <div className="mt-2 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
              <Pill label={t("lead.company.industry")} value={companyIndustry ?? "—"} />
              <Pill label={t("lead.company.size")} value={liveCompany?.size_band ?? "—"} />
            </div>
            {liveCompany?.enriched_at_ms && (
              <p className="mt-2 text-[10px] text-slate-400">
                {t("lead.company.scraped", {
                  when: formatRelative(liveCompany.enriched_at_ms),
                })}
              </p>
            )}
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
            <AlertTriangle
              size={14}
              className="mt-0.5 shrink-0 text-amber-600"
            />
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-amber-800">
                {t("lead.company.no_corporate_email")}
              </p>
              <p className="text-[11px] text-amber-700">
                {t("lead.company.enrichment_confidence", {
                  percent: Math.round(
                    (livePerson?.enrichment_confidence ?? 0) * 100,
                  ),
                })}
              </p>
              <Button variant="secondary" size="sm">
                {t("lead.company.search_manual")}
              </Button>
            </div>
          </div>
        )}
      </Section>

      {/* Score card */}
      <div
        className={`rounded-xl ${score.bg} p-4 ring-1 ${score.ring} shadow-sm`}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <TrendingUp size={11} />
            {t("lead.score.label")}
          </span>
          <span className={`text-[10px] font-semibold ${score.text}`}>
            {lead.score >= 70
              ? t("lead.score.high")
              : lead.score >= 40
                ? t("lead.score.medium")
                : t("lead.score.low")}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className={`text-3xl font-bold tracking-tight ${score.text}`}>
            {lead.score}
          </span>
          <span className="text-xs text-slate-400">{t("lead.score.suffix")}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
          <div
            className={`h-full ${score.bar}`}
            style={{ width: `${lead.score}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2">
          <div className="flex flex-col">
            <span className="text-slate-400">{t("lead.score.sentiment")}</span>
            <span
              className={`mt-0.5 inline-flex w-fit rounded-md px-1.5 py-0.5 font-medium ring-1 ${
                SENTIMENT_TONE[lead.sentiment]
              }`}
            >
              {humanSentiment(lead.sentiment)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400">{t("lead.score.intent")}</span>
            <span className="mt-0.5 inline-flex w-fit rounded-md bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-700 ring-1 ring-indigo-200">
              {lead.intent.replace("_", " ")}
            </span>
          </div>
        </div>
        {lead.topic_tags.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <Tag size={10} className="text-slate-400" />
            <span className="text-[10px] text-slate-500">
              {lead.topic_tags.join(" · ")}
            </span>
          </div>
        )}
      </div>

      {/* State machine — interactive when the panel is
          rendering a live lead. Mock-mode panels still show
          the read-only ladder. The heuristic hint card sits
          above it so the operator's eye lands on the
          one-click suggestion before scanning the full
          ladder. */}
      <Section title={t("lead.section.state")} icon={<Zap size={11} />}>
        <div className="space-y-2">
          {lead_id && <ScoreExplainer leadId={lead_id} />}
          {lead_id && (
            <NextStepHint
              leadId={lead_id}
              state={lead.state}
              intent={lead.intent}
              sentiment={lead.sentiment}
            />
          )}
          <StateMachine
            state={lead.state}
            {...(lead_id ? { leadId: lead_id } : {})}
          />
        </div>
      </Section>

      {/* Seller */}
      <Section title={t("lead.section.seller")} icon={<User size={11} />}>
        <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: sellerColor }}
          >
            {sellerName
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0] ?? "")
              .join("")
              .toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {sellerName}
            </p>
            {sellerEmail && (
              <p className="truncate text-[10px] text-slate-500">
                {sellerEmail}
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* Why explainer */}
      <Section title={t("lead.section.why")} icon={<Sparkles size={11} />}>
        <ul className="space-y-1.5">
          {lead.why_routed.map((reason, idx) => (
            <li
              key={idx}
              className="flex gap-2 rounded-md bg-white px-2 py-1.5 ring-1 ring-slate-100"
            >
              <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                {idx + 1}
              </span>
              <span className="text-[11px] leading-relaxed text-slate-700">
                {reason}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {/* M15.21.followup-override — Skip / Postpone bypass.
          Replaces the inert Skip / Editar pair the panel
          carried before the override endpoint landed. */}
      {lead_id && (
        <Section title={t("lead.section.followup")} icon={<Clock size={11} />}>
          <FollowupOverride
            leadId={lead_id}
            nextCheckAtMs={lead.next_check_at_ms}
            attempts={lead.followup_attempts}
            onApplied={(nextCheckAtMs) =>
              patchLead(lead_id, { next_check_at_ms: nextCheckAtMs })
            }
          />
        </Section>
      )}

      {/* M15.21.notes — free-form operator scratch pad.
          Markdown supported, persisted per-lead. Never seen by
          the LLM (only used as operator-facing context). */}
      {lead_id && (
        <Section title={t("lead.section.notes")} icon={<NotebookPen size={11} />}>
          <OperatorNotes
            leadId={lead_id}
            initialNotes={lead.operator_notes}
            onSaved={(notes) => patchLead(lead_id, { operator_notes: notes })}
          />
        </Section>
      )}

      {/* M15.22 — replay timeline. Combines audit backfill
          + firehose live tail keyed on this lead. */}
      {lead_id && (
        <Section title={t("lead.section.timeline")} icon={<Sparkles size={11} />}>
          <LeadTimeline leadId={lead_id} />
        </Section>
      )}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="font-medium text-slate-700">{value}</p>
    </div>
  );
}

function humanSentiment(s: string): string {
  return s.replace("_", " ").replace(/^./, (c) => c.toUpperCase());
}
