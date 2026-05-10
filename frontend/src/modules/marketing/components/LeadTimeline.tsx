// M15.22 — replay timeline for one lead.
//
// Combines the audit log backfill (`getAudit({lead_id})`)
// with the firehose live tail (`subscribeMarketingStream`)
// scoped to events the lead emits going forward.
// Renders chronologically — each row is a typed event
// (routing decision / state transition / notification
// publish / guardrail fire / duplicate detected / thread
// bump). Operator scrolls through to understand
// "what happened to this lead" in one place.
//
// Live updates: the firehose stream is process-wide; this
// component filters by `lead_id` and merges fresh events
// onto the timeline keyed by their `(kind, at_ms)` tuple
// so the same event arriving twice (audit backfill +
// firehose) doesn't duplicate.

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CornerDownRight,
  GitBranch,
  Mail,
  Sparkles,
  Users,
} from "lucide-react";

import {
  getAudit,
  subscribeMarketingStream,
  type MarketingAuditEvent,
  type MarketingFirehoseEvent,
} from "../../../api/marketing";
import { useT } from "../../../i18n";

interface Props {
  readonly leadId: string;
}

/** Tagged-union row the timeline renders. Audit + firehose
 *  events fold into the same shape so the renderer doesn't
 *  branch on source. `kind` is the union discriminator. */
type TimelineRow =
  | {
      kind: "routing_decided";
      at_ms: number;
      from_email: string;
      seller_id: string | null;
      rule_id: string | null;
      score: number;
    }
  | {
      kind: "lead_transitioned";
      at_ms: number;
      from: string;
      to: string;
      reason: string;
    }
  | {
      kind: "notification_published";
      at_ms: number;
      seller_id: string;
      notification_kind: string;
      channel: string;
    }
  | {
      kind: "topic_guardrail_fired";
      at_ms: number;
      rule_name: string;
      action: "force_approval" | "block";
      excerpt: string;
    }
  | {
      kind: "duplicate_person_detected";
      at_ms: number;
      candidate_person_id: string;
      signal: string;
      confidence: number;
    }
  | {
      kind: "created";
      at_ms: number;
      subject: string;
      from_email: string;
      seller_id: string;
    }
  | { kind: "thread_bumped"; at_ms: number }
  | {
      kind: "followup_overridden";
      at_ms: number;
      action: "skip" | "postpone";
      next_check_at_ms: number | null;
      reason: string;
    };

/** Stable dedup key — same event arriving twice (once from
 *  the audit backfill + once from the firehose live tail)
 *  collapses onto a single row. */
function rowKey(r: TimelineRow): string {
  return `${r.kind}:${r.at_ms}`;
}

/** Map an audit event into the timeline shape. Drops
 *  cross-tenant fields the renderer doesn't need. */
function fromAudit(e: MarketingAuditEvent): TimelineRow | null {
  switch (e.kind) {
    case "routing_decided":
      return {
        kind: "routing_decided",
        at_ms: e.at_ms,
        from_email: e.from_email,
        seller_id: e.chosen_seller_id,
        rule_id: e.rule_id,
        score: e.score,
      };
    case "lead_transitioned":
      return {
        kind: "lead_transitioned",
        at_ms: e.at_ms,
        from: e.from,
        to: e.to,
        reason: e.reason,
      };
    case "notification_published":
      return {
        kind: "notification_published",
        at_ms: e.at_ms,
        seller_id: e.seller_id,
        notification_kind: e.notification_kind,
        channel: e.channel,
      };
    case "topic_guardrail_fired":
      return {
        kind: "topic_guardrail_fired",
        at_ms: e.at_ms,
        rule_name: e.rule_name,
        action: e.action,
        excerpt: e.excerpt,
      };
    case "duplicate_person_detected":
      return {
        kind: "duplicate_person_detected",
        at_ms: e.at_ms,
        candidate_person_id: e.candidate_person_id,
        signal: e.signal,
        confidence: e.confidence,
      };
  }
}

/** Map a firehose live event for this lead into the
 *  timeline shape. Returns null when the event belongs to
 *  a different lead. */
function fromFirehose(
  leadId: string,
  e: MarketingFirehoseEvent,
): TimelineRow | null {
  if (e.lead_id !== leadId) return null;
  switch (e.kind) {
    case "created":
      return {
        kind: "created",
        at_ms: e.at_ms,
        subject: e.subject,
        from_email: e.from_email,
        seller_id: e.seller_id,
      };
    case "thread_bumped":
      return { kind: "thread_bumped", at_ms: e.at_ms };
    case "transitioned":
      return {
        kind: "lead_transitioned",
        at_ms: e.at_ms,
        from: e.from,
        to: e.to,
        reason: e.reason,
      };
    case "followup_overridden":
      return {
        kind: "followup_overridden",
        at_ms: e.at_ms,
        action: e.action,
        next_check_at_ms: e.next_check_at_ms,
        reason: e.reason,
      };
  }
}

/** Merge a fresh row into the existing timeline, deduping
 *  by `rowKey` and re-sorting ascending by `at_ms`. */
export function mergeRows(
  existing: readonly TimelineRow[],
  fresh: TimelineRow,
): TimelineRow[] {
  const key = rowKey(fresh);
  const seen = new Set(existing.map(rowKey));
  if (seen.has(key)) return [...existing];
  return [...existing, fresh].sort((a, b) => a.at_ms - b.at_ms);
}

function formatTime(at_ms: number): string {
  const date = new Date(at_ms);
  return date.toLocaleString();
}

export default function LeadTimeline({ leadId }: Props) {
  const t = useT();
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Backfill ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRows([]);
    setError(null);
    getAudit({ lead_id: leadId, limit: 200 })
      .then((r) => {
        if (cancelled) return;
        const seeded = r.events
          .map(fromAudit)
          .filter((row): row is TimelineRow => row !== null)
          .sort((a, b) => a.at_ms - b.at_ms);
        setRows(seeded);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  // ── Live tail ───────────────────────────────────────────
  useEffect(() => {
    const stop = subscribeMarketingStream({
      onEvent: (e) => {
        const row = fromFirehose(leadId, e);
        if (!row) return;
        setRows((existing) => mergeRows(existing, row));
      },
    });
    return () => {
      stop();
    };
  }, [leadId]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.at_ms - b.at_ms),
    [rows],
  );

  if (loading && rows.length === 0) {
    return (
      <div className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
        {t("marketing.timeline.loading")}
      </div>
    );
  }
  if (error && rows.length === 0) {
    return (
      <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
        {t("marketing.timeline.unavailable", { error })}
      </div>
    );
  }
  if (sorted.length === 0) {
    return (
      <div className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
        {t("marketing.timeline.empty")}
      </div>
    );
  }
  return (
    <ol
      data-testid="lead-timeline-list"
      className="space-y-2 border-l border-slate-200 pl-3"
    >
      {sorted.map((row) => (
        <TimelineEntry key={rowKey(row)} row={row} />
      ))}
    </ol>
  );
}

function TimelineEntry({ row }: { row: TimelineRow }) {
  const t = useT();
  const { icon, tone, title, detail } = describe(row, t);
  return (
    <li className="relative">
      <span
        className={`absolute -left-[18px] flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-white ${tone}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-700">
            {title}
          </span>
          <span className="text-[10px] text-slate-400">
            {formatTime(row.at_ms)}
          </span>
        </div>
        {detail && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
            {detail}
          </p>
        )}
      </div>
    </li>
  );
}

interface EntryView {
  icon: React.ReactNode;
  tone: string;
  title: string;
  detail?: string;
}

type Translator = ReturnType<typeof useT>;

function describe(row: TimelineRow, t: Translator): EntryView {
  switch (row.kind) {
    case "created":
      return {
        icon: <Sparkles size={9} className="text-white" />,
        tone: "bg-emerald-500",
        title: t("marketing.timeline.lead_created"),
        detail: t("marketing.timeline.lead_created_detail", {
          from: row.from_email,
          seller: row.seller_id,
        }),
      };
    case "routing_decided":
      return {
        icon: <GitBranch size={9} className="text-white" />,
        tone: "bg-indigo-500",
        title: row.seller_id
          ? t("marketing.timeline.routed_score", { score: row.score })
          : t("marketing.timeline.no_route_score", { score: row.score }),
        detail: `${row.from_email}${
          row.rule_id ? ` · rule:${row.rule_id}` : ""
        }${row.seller_id ? ` → ${row.seller_id}` : ""}`,
      };
    case "lead_transitioned":
      return {
        icon: <CornerDownRight size={9} className="text-white" />,
        tone: "bg-amber-500",
        title: t("marketing.timeline.transitioned", {
          from: row.from,
          to: row.to,
        }),
        detail: row.reason,
      };
    case "notification_published":
      return {
        icon: <Bell size={9} className="text-white" />,
        tone: "bg-violet-500",
        title: t("marketing.timeline.notification", {
          kind: row.notification_kind,
        }),
        detail: t("marketing.timeline.notification_detail", {
          seller: row.seller_id,
          channel: row.channel,
        }),
      };
    case "topic_guardrail_fired":
      return {
        icon: <AlertTriangle size={9} className="text-white" />,
        tone: row.action === "block" ? "bg-rose-500" : "bg-amber-500",
        title: t("marketing.timeline.guardrail", { rule: row.rule_name }),
        detail: t("marketing.timeline.guardrail_detail", {
          action:
            row.action === "block"
              ? t("marketing.timeline.guardrail_action_block")
              : t("marketing.timeline.guardrail_action_force_approval"),
          excerpt: row.excerpt,
        }),
      };
    case "duplicate_person_detected":
      return {
        icon: <Users size={9} className="text-white" />,
        tone: "bg-fuchsia-500",
        title: t("marketing.timeline.duplicate", {
          id: row.candidate_person_id,
        }),
        detail: t("marketing.timeline.duplicate_detail", {
          signal: row.signal,
          percent: Math.round(row.confidence * 100),
        }),
      };
    case "thread_bumped":
      return {
        icon: <Mail size={9} className="text-white" />,
        tone: "bg-slate-400",
        title: t("marketing.timeline.thread_bumped"),
      };
    case "followup_overridden":
      return {
        icon: <CornerDownRight size={9} className="text-white" />,
        tone: "bg-sky-500",
        title:
          row.action === "skip"
            ? t("marketing.timeline.followup_skipped")
            : row.next_check_at_ms
              ? t("marketing.timeline.followup_postponed", {
                  when: new Date(row.next_check_at_ms).toLocaleString(),
                })
              : t("marketing.timeline.followup_postponed_unknown"),
        detail: row.reason,
      };
  }
}
