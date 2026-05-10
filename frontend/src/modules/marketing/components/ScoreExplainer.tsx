// Heuristic score breakdown for one lead. Reads the
// `routing_decided` audit row (the AI scorer publishes it
// once per inbound) and renders the per-reason deltas so
// the operator sees WHY a lead landed at score N.
//
// Silent posture: hides when no `routing_decided` row
// exists for the lead (placeholder leads / pre-scoring
// rows). Scoring deltas use tone-keyed pills (positive /
// neutral / negative) so the operator scans the
// contributors at a glance.

import { useEffect, useState } from "react";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";

import { getAudit, type MarketingAuditEvent } from "../../../api/marketing";
import { useT } from "../../../i18n";

interface ScoreReasonRow {
  label: string;
  delta: number;
  detail?: string;
}

interface ScoreSummary {
  score: number;
  reasons: ScoreReasonRow[];
  at_ms: number;
  rule_id: string | null;
}

/** Pull the most recent `routing_decided` audit row from
 *  the result list and project it into the summary shape
 *  the card consumes. Audit list is descending by
 *  `at_ms`; pick first matching kind. Exported for
 *  testing. */
export function summarise(
  events: readonly MarketingAuditEvent[],
): ScoreSummary | null {
  for (const e of events) {
    if (e.kind !== "routing_decided") continue;
    return {
      score: e.score,
      reasons: e.score_reasons.map((r) => ({
        label: r.label,
        delta: r.delta,
        ...(r.detail !== undefined ? { detail: r.detail } : {}),
      })),
      at_ms: e.at_ms,
      rule_id: e.rule_id,
    };
  }
  return null;
}

interface Props {
  readonly leadId: string;
}

export default function ScoreExplainer({ leadId }: Props) {
  const t = useT();
  const [data, setData] = useState<ScoreSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    getAudit({ lead_id: leadId, kind: "routing_decided", limit: 1 })
      .then((r) => {
        if (cancelled) return;
        setData(summarise(r.events));
        setLoading(false);
      })
      .catch(() => {
        // Silent — lead drawer doesn't need a banner just
        // because the audit endpoint is down. The badge
        // stays hidden.
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  if (loading) return null;
  if (!data) return null;

  const positives = data.reasons.filter((r) => r.delta > 0);
  const negatives = data.reasons.filter((r) => r.delta < 0);
  const neutrals = data.reasons.filter((r) => r.delta === 0);
  const ordered = [...positives, ...neutrals, ...negatives];

  return (
    <div
      data-testid="score-explainer"
      className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-3 text-[11px]"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold text-indigo-700">
          <Sparkles size={12} />
          {t("score_explainer.title")}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200">
          {data.score}
        </span>
      </div>
      {data.rule_id && (
        <p className="mb-2 text-[10px] text-slate-500">
          {t("score_explainer.rule_matched")}{" "}
          <span className="font-mono">{data.rule_id}</span>
        </p>
      )}
      {ordered.length === 0 ? (
        <p className="italic text-slate-500">{t("score_explainer.no_breakdown")}</p>
      ) : (
        <ul className="space-y-1">
          {ordered.map((r, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 rounded bg-white/70 px-2 py-1 ring-1 ring-indigo-100"
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                  r.delta > 0
                    ? "bg-emerald-100 text-emerald-700"
                    : r.delta < 0
                      ? "bg-rose-100 text-rose-700"
                      : "bg-slate-100 text-slate-600"
                }`}
                aria-hidden
              >
                {r.delta > 0 ? (
                  <TrendingUp size={9} />
                ) : r.delta < 0 ? (
                  <TrendingDown size={9} />
                ) : (
                  "·"
                )}
              </span>
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-medium text-slate-700">{r.label}</span>
                  <span
                    className={`font-mono text-[10px] ${
                      r.delta > 0
                        ? "text-emerald-700"
                        : r.delta < 0
                          ? "text-rose-700"
                          : "text-slate-500"
                    }`}
                  >
                    {r.delta > 0 ? `+${r.delta}` : r.delta}
                  </span>
                </div>
                {r.detail && (
                  <p className="text-[10px] text-slate-500">{r.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
