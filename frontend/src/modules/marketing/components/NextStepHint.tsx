// Heuristic "what should happen next?" card. Reads the
// lead's state + intent + sentiment and proposes a single
// next-state transition with a pre-filled reason. Operator
// clicks the suggestion → fires `transitionLead` directly
// (skipping the StateMachine's window.prompt path) since
// the reason is already canned.
//
// Pure deterministic mapping — no LLM call, no side
// effects beyond the one transition. The mapping below is
// the operator's heuristic; future iteration can swap in
// a proper score-based suggester without changing the
// surface.

import { useState } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";

import { transitionLead } from "../../../api/marketing";
import { HttpError } from "../../../api/client";
import type { IntentClass, LeadState, SentimentBand } from "../data/types";
import { Button } from "../../../components/ui";
import { useT } from "../../../i18n";
import type { CatalogKey } from "../../../i18n/catalogs/es";

export interface NextStepSuggestion {
  readonly to: LeadState;
  readonly reasonKey: CatalogKey;
  /** Vars for `{intent}` / `{state}` interpolation in
   *  `reasonKey`. Empty when no interpolation is needed. */
  readonly reasonVars: Record<string, string>;
  /** Tone hint for the action button — emerald (advance) /
   *  amber (caution) / rose (lost). */
  readonly tone: "advance" | "caution" | "lost";
}

/** Map a lead's signals to a suggested next transition.
 *  Returns `null` for terminal states (qualified / lost)
 *  or when no rule matches strongly enough — the operator
 *  falls back to the StateMachine ladder.
 *
 *  Exported for unit testing. */
export function suggestNextStep(input: {
  state: LeadState;
  intent: IntentClass;
  sentiment: SentimentBand;
}): NextStepSuggestion | null {
  const { state, intent, sentiment } = input;
  // Terminal states — nothing to suggest.
  if (state === "qualified" || state === "lost") return null;

  // Out-of-scope leads ⇒ recommend lost regardless of
  // the current pre-terminal state. Operator double-checks
  // before clicking.
  if (intent === "out_of_scope") {
    return {
      to: "lost",
      reasonKey: "next_step.reason.out_of_scope",
      reasonVars: {},
      tone: "lost",
    };
  }

  if (state === "cold") {
    if (intent === "ready_to_buy" && isPositive(sentiment)) {
      return {
        to: "engaged",
        reasonKey: "next_step.reason.ready_pos",
        reasonVars: {},
        tone: "advance",
      };
    }
    if (intent === "browsing" || intent === "comparing") {
      return {
        to: "engaged",
        reasonKey: "next_step.reason.intent_start",
        reasonVars: { intent },
        tone: "advance",
      };
    }
    if (intent === "support_request") {
      return {
        to: "engaged",
        reasonKey: "next_step.reason.support",
        reasonVars: {},
        tone: "caution",
      };
    }
    return null;
  }

  if (state === "engaged") {
    if (intent === "ready_to_buy" && sentiment === "very_positive") {
      return {
        to: "meeting_scheduled",
        reasonKey: "next_step.reason.ready_very_pos",
        reasonVars: {},
        tone: "advance",
      };
    }
    if (intent === "objecting" && isNegative(sentiment)) {
      return {
        to: "lost",
        reasonKey: "next_step.reason.objecting_neg",
        reasonVars: {},
        tone: "lost",
      };
    }
    if (intent === "ready_to_buy") {
      return {
        to: "meeting_scheduled",
        reasonKey: "next_step.reason.ready_meeting",
        reasonVars: {},
        tone: "advance",
      };
    }
    return null;
  }

  if (state === "meeting_scheduled") {
    if (intent === "ready_to_buy") {
      return {
        to: "qualified",
        reasonKey: "next_step.reason.post_meeting",
        reasonVars: {},
        tone: "advance",
      };
    }
    if (intent === "objecting" && isNegative(sentiment)) {
      return {
        to: "lost",
        reasonKey: "next_step.reason.objecting_post_meeting",
        reasonVars: {},
        tone: "lost",
      };
    }
    return null;
  }

  return null;
}

function isPositive(s: SentimentBand): boolean {
  return s === "positive" || s === "very_positive";
}

function isNegative(s: SentimentBand): boolean {
  return s === "negative" || s === "very_negative";
}

interface Props {
  readonly leadId: string;
  readonly state: LeadState;
  readonly intent: IntentClass;
  readonly sentiment: SentimentBand;
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

const TONE_CLASS: Record<NextStepSuggestion["tone"], string> = {
  advance:
    "from-emerald-50 to-emerald-100/50 ring-emerald-200 text-emerald-800",
  caution: "from-amber-50 to-amber-100/50 ring-amber-200 text-amber-800",
  lost: "from-rose-50 to-rose-100/50 ring-rose-200 text-rose-800",
};

export default function NextStepHint({
  leadId,
  state,
  intent,
  sentiment,
  onTransitioned,
}: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestion = suggestNextStep({ state, intent, sentiment });
  if (!suggestion) return null;
  const reasonText = t(suggestion.reasonKey, suggestion.reasonVars);

  const fire = async () => {
    setBusy(true);
    setError(null);
    try {
      await transitionLead(leadId, {
        to: suggestion.to,
        reason: reasonText,
      });
      onTransitioned?.();
    } catch (e: unknown) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="next-step-hint"
      className={`rounded-lg bg-gradient-to-br p-2.5 text-[11px] ring-1 ${TONE_CLASS[suggestion.tone]}`}
    >
      <div className="mb-1.5 flex items-center gap-1.5 font-semibold">
        <Lightbulb size={12} />
        <span>{t("next_step.title")}</span>
      </div>
      <p className="mb-2 leading-relaxed">{reasonText}</p>
      <Button
        variant="secondary"
        size="sm"
        onClick={fire}
        disabled={busy}
        aria-label={`apply-next-step-${suggestion.to}`}
      >
        {busy
          ? t("next_step.applying")
          : t("next_step.move_to", { state: suggestion.to.replace("_", " ") })}
        <ArrowRight size={11} />
      </Button>
      {error && (
        <p
          role="alert"
          className="mt-1 rounded border border-rose-200 bg-white/70 px-2 py-1 text-[10px] text-rose-700"
        >
          {error}
        </p>
      )}
    </div>
  );
}
