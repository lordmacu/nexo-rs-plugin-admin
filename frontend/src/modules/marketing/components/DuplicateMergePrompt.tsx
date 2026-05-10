// Lead drawer banner that surfaces M15.23.e duplicate-
// person candidates the marketing extension's matcher
// recorded in the audit log. Operator confirms / dismisses
// per candidate.
//
// Backend is read-only at this slice — \"Confirm merge\" /
// \"Dismiss\" mutations land when the merge endpoint ships
// (deferred to F-merge or M22). Today the buttons are
// surfaced disabled with a tooltip so the operator
// understands the next step.

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

import { getAudit, type MarketingAuditEvent } from "../../../api/marketing";
import { Button } from "../../../components/ui";

interface DuplicateMergePromptProps {
  /** Lead id whose audit log we're scanning. */
  readonly lead_id: string;
}

/** Per-candidate row distilled from the audit events.
 *  Multiple audit rows for the same candidate collapse
 *  into one prompt entry — caller takes the highest
 *  confidence + concatenates the signals. */
export interface PromptCandidate {
  readonly candidate_person_id: string;
  readonly resolved_person_id: string;
  readonly best_confidence: number;
  readonly signals: string[];
  readonly detail: string;
  readonly first_seen_at_ms: number;
}

/** Collapse multiple `duplicate_person_detected` audit
 *  rows into per-candidate prompt entries. Multiple rows
 *  for the same candidate (different signals firing) merge
 *  into one row — best confidence + union of signals.
 *  Sorted desc by confidence. Exposed for unit testing. */
export function collapseAudit(
  rows: readonly MarketingAuditEvent[],
): readonly PromptCandidate[] {
  const out = new Map<string, PromptCandidate>();
  for (const r of rows) {
    if (r.kind !== "duplicate_person_detected") continue;
    const existing = out.get(r.candidate_person_id);
    if (existing) {
      out.set(r.candidate_person_id, {
        ...existing,
        best_confidence: Math.max(existing.best_confidence, r.confidence),
        signals: existing.signals.includes(r.signal)
          ? existing.signals
          : [...existing.signals, r.signal],
        detail:
          r.confidence > existing.best_confidence ? r.detail : existing.detail,
        first_seen_at_ms: Math.min(existing.first_seen_at_ms, r.at_ms),
      });
    } else {
      out.set(r.candidate_person_id, {
        candidate_person_id: r.candidate_person_id,
        resolved_person_id: r.resolved_person_id,
        best_confidence: r.confidence,
        signals: [r.signal],
        detail: r.detail,
        first_seen_at_ms: r.at_ms,
      });
    }
  }
  return Array.from(out.values()).sort(
    (a, b) => b.best_confidence - a.best_confidence,
  );
}

export default function DuplicateMergePrompt({
  lead_id,
}: DuplicateMergePromptProps) {
  const [candidates, setCandidates] = useState<
    readonly PromptCandidate[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  /** Operator-dismissed candidate ids — local state only;
   *  no backend mutation yet. Resets on lead change. */
  const [dismissed, setDismissed] = useState<readonly string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setCandidates(null);
    setError(null);
    setDismissed([]);
    void (async () => {
      try {
        const r = await getAudit({
          lead_id,
          kind: "duplicate_person_detected",
          limit: 50,
        });
        if (!cancelled) setCandidates(collapseAudit(r.events));
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setCandidates([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lead_id]);

  if (error) {
    // Non-fatal — operator sees a small inline error so
    // they know the prompt wasn't suppressed by a real
    // miss.
    return (
      <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
        🔀 Posibles duplicados — error consultando audit: {error}
      </div>
    );
  }
  if (!candidates) {
    return null; // Loading; keep silent so the drawer doesn't flicker.
  }
  const visible = candidates.filter(
    (c) => !dismissed.includes(c.candidate_person_id),
  );
  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="rounded border border-violet-200 bg-violet-50 px-3 py-2">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-violet-800">
        <Users size={12} />
        🔀 Posibles duplicados ({visible.length})
      </div>
      <p className="mt-1 text-[11px] text-violet-900">
        Este lead pudo haber llegado en otro canal. El operador confirma o
        descarta cada candidato.
      </p>
      <ul className="mt-2 space-y-1.5">
        {visible.map((c) => (
          <li
            key={c.candidate_person_id}
            className="rounded border border-violet-200 bg-white px-2.5 py-1.5 text-xs"
          >
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-text-primary">
                {c.candidate_person_id}
              </span>
              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
                {Math.round(c.best_confidence * 100)}%
              </span>
              {c.signals.map((s) => (
                <span
                  key={s}
                  className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-text-secondary"
                >
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-text-secondary">{c.detail}</p>
            <div className="mt-1.5 flex gap-2">
              <Button
                variant="primary"
                size="sm"
                disabled
                title="Merge endpoint pendiente — operador resuelve manualmente por ahora"
              >
                Confirmar merge
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setDismissed((prev) => [...prev, c.candidate_person_id])
                }
              >
                Descartar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
