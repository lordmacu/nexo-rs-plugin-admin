// Compact vertical state-machine indicator for a lead.
//
// When `leadId` is supplied, each non-active state is
// click-able: operator picks the target → optional reason
// modal → POST `/leads/:id/transition`. State machine
// legality (cold → qualified jumps, etc.) is enforced
// server-side; refusals surface inline.

import { useState } from "react";

import { transitionLead } from "../../../api/marketing";
import { HttpError } from "../../../api/client";
import type { LeadState } from "../data/types";
import { Button } from "../../../components/ui";
import { t as tStatic, useT } from "../../../i18n";

const ORDER: { id: LeadState; label: string }[] = [
  { id: "cold", label: "cold" },
  { id: "engaged", label: "engaged" },
  { id: "meeting_scheduled", label: "meeting" },
  { id: "qualified", label: "qualified" },
];

interface Props {
  readonly state: LeadState;
  /** When supplied, each non-active row exposes a
   *  click affordance to fire the manual transition.
   *  Mock-mode panels omit it; live panels pass the
   *  real lead id. */
  readonly leadId?: string;
  /** Bumped after a successful transition so the
   *  parent panel can refetch the lead row. */
  readonly onTransitioned?: () => void;
}

function errorCode(e: unknown): string {
  if (e instanceof HttpError) {
    const body = e.body as { code?: string; message?: string } | string;
    if (typeof body === "object" && body && "code" in body) {
      return body.message
        ? `${body.code} · ${body.message}`
        : (body.code ?? `http_${e.status}`);
    }
    return `http_${e.status}`;
  }
  return e instanceof Error ? e.message : String(e);
}

export default function StateMachine({ state, leadId, onTransitioned }: Props) {
  const t = useT();
  const activeIdx =
    state === "lost" ? -1 : ORDER.findIndex((s) => s.id === state);
  const [busy, setBusy] = useState<LeadState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const interactive = Boolean(leadId);

  const fire = async (target: LeadState) => {
    if (!leadId) return;
    setBusy(target);
    setError(null);
    try {
      const reason = window.prompt(
        tStatic("state_machine.reason_prompt", { state: target }),
        "",
      );
      // Cancel ⇒ null. Empty string ⇒ server default.
      if (reason === null) {
        setBusy(null);
        return;
      }
      await transitionLead(leadId, {
        to: target,
        ...(reason.trim().length > 0 ? { reason } : {}),
      });
      onTransitioned?.();
    } catch (e: unknown) {
      setError(errorCode(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-1.5">
      <ol className="relative ml-1 space-y-2 border-l-2 border-dashed border-slate-200 pl-3">
        {ORDER.map((s, idx) => {
          const isActive = idx === activeIdx;
          const isPast = idx < activeIdx;
          const tone = isActive
            ? "font-semibold text-slate-900"
            : isPast
              ? "text-emerald-600"
              : "text-slate-400";
          const dot = isActive
            ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm"
            : isPast
              ? "bg-emerald-500 text-white"
              : "bg-slate-200 text-slate-500";
          return (
            <li
              key={s.id}
              className={`relative flex items-center gap-2 ${tone}`}
            >
              <span
                className={`absolute -left-[19px] flex h-4 w-4 items-center justify-center rounded-full text-[9px] ring-2 ring-white ${dot}`}
              >
                {isPast ? "✓" : idx + 1}
              </span>
              <span className="text-[11px]">{s.label}</span>
              {isActive && (
                <span className="ml-auto rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-700 ring-1 ring-indigo-200">
                  {t("state_machine.current")}
                </span>
              )}
              {!isActive && interactive && (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => fire(s.id)}
                  disabled={busy !== null}
                  aria-label={`transition-to-${s.id}`}
                >
                  {busy === s.id ? "…" : t("state_machine.move")}
                </Button>
              )}
            </li>
          );
        })}
        {state === "lost" && (
          <li className="relative flex items-center gap-2 font-semibold text-rose-700">
            <span className="absolute -left-[19px] flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] text-white ring-2 ring-white">
              ✗
            </span>
            <span className="text-[11px]">lost</span>
          </li>
        )}
        {state !== "lost" && interactive && (
          <li className="relative flex items-center gap-2 text-rose-500">
            <span className="absolute -left-[19px] flex h-4 w-4 items-center justify-center rounded-full bg-rose-100 text-[9px] text-rose-500 ring-2 ring-white">
              ✗
            </span>
            <span className="text-[11px]">lost</span>
            <Button
              variant="secondary"
              size="md"
              onClick={() => fire("lost")}
              disabled={busy !== null}
              aria-label="transition-to-lost"
            >
              {busy === "lost" ? "…" : t("state_machine.mark_lost")}
            </Button>
          </li>
        )}
      </ol>
      {error && (
        <p
          role="alert"
          className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
