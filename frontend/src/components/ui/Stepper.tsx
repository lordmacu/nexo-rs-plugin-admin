// Multi-step indicator — shows ordered steps with the
// current one highlighted, completed ones checked, and
// pending ones muted. Replaces the bespoke `Stepper` in
// MarketingWizard and (eventually) the onboarding wizard
// in `pages/Wizard.tsx`.

import { Check, ChevronRight } from "lucide-react";

export interface StepperProps {
  /** Ordered list of step IDs in display order. The current
   *  step's index in this array drives the visual state. */
  steps: ReadonlyArray<{ id: string; label: string }>;
  /** ID of the active step. Steps before this are rendered
   *  as completed (check mark, success tone); steps after
   *  are muted. */
  activeId: string;
}

export default function Stepper({ steps, activeId }: StepperProps) {
  const idx = Math.max(
    0,
    steps.findIndex((s) => s.id === activeId),
  );
  return (
    <div className="flex items-center gap-3 border-b px-8 py-4">
      {steps.map((s, i) => {
        const active = i === idx;
        const done = i < idx;
        return (
          <div key={s.id} className="flex items-center gap-2 text-xs">
            <span
              className={
                done
                  ? "flex h-6 w-6 items-center justify-center rounded-full bg-success text-white"
                  : active
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-text-primary text-white font-semibold"
                    : "flex h-6 w-6 items-center justify-center rounded-full bg-panel-alt text-text-meta"
              }
            >
              {done ? <Check size={11} /> : i + 1}
            </span>
            <span
              className={
                active
                  ? "font-medium text-text-primary"
                  : done
                    ? "text-success"
                    : "text-text-meta"
              }
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight size={11} className="text-text-meta" />
            )}
          </div>
        );
      })}
    </div>
  );
}
