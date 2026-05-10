// Two-pane shell shared by every wizard step. Left rail lists
// the four steps with active / done / pending styling; right
// pane gets the step component as `children`.

import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../ui";
import type { WizardStep } from "../../store/wizard";
import { useT } from "../../i18n";
import type { CatalogKey } from "../../i18n";

interface StepDef {
  id: WizardStep;
  title_key: CatalogKey;
  blurb_key: CatalogKey;
}

const STEPS: StepDef[] = [
  {
    id: 0,
    title_key: "wizard.shell.rail.welcome.title",
    blurb_key: "wizard.shell.rail.welcome.blurb",
  },
  {
    id: 1,
    title_key: "wizard.shell.rail.llm.title",
    blurb_key: "wizard.shell.rail.llm.blurb",
  },
  {
    id: 2,
    title_key: "wizard.shell.rail.pairing.title",
    blurb_key: "wizard.shell.rail.pairing.blurb",
  },
  {
    id: 3,
    title_key: "wizard.shell.rail.agent.title",
    blurb_key: "wizard.shell.rail.agent.blurb",
  },
];

interface StepShellProps {
  current: WizardStep;
  children: ReactNode;
  footer?: ReactNode;
  /** Optional handler that lets the operator click any step in the
   *  left rail to navigate directly to it. The Wizard wires this to
   *  `setStep` so any step (back or forward) is reachable. The done
   *  step (id 4) is intentionally not in the rail so it stays out
   *  of free-navigation. */
  onSelect?: (step: WizardStep) => void;
}

export default function StepShell({
  current,
  children,
  footer,
  onSelect,
}: StepShellProps) {
  const t = useT();
  return (
    <div className="flex h-screen w-screen bg-surface">
      <aside className="w-72 bg-accent text-white flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <div className="text-lg font-semibold">
            {t("wizard.shell.app_title")}
          </div>
          <div className="text-sm text-white/80">
            {t("wizard.shell.app_subtitle")}
          </div>
        </div>
        <ol className="flex-1 px-3 py-4 space-y-1">
          {STEPS.map((s) => {
            const done = current > s.id;
            const active = current === s.id;
            const row_class = [
              "w-full text-left flex items-start gap-3 rounded-md px-3 py-3 text-sm transition-colors",
              active
                ? "bg-white/15"
                : done
                  ? "opacity-90 hover:bg-white/10"
                  : "opacity-60 hover:bg-white/10 hover:opacity-90",
            ].join(" ");
            const inner = (
              <>
                <div
                  className={[
                    "h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold",
                    done
                      ? "bg-white text-accent"
                      : active
                        ? "bg-white text-accent"
                        : "bg-white/20",
                  ].join(" ")}
                >
                  {done ? <Check size={14} /> : s.id + 1}
                </div>
                <div>
                  <div className="font-medium">{t(s.title_key)}</div>
                  <div className="text-xs text-white/70">{t(s.blurb_key)}</div>
                </div>
              </>
            );
            return (
              <li key={s.id}>
                {onSelect ? (
                  <Button
                    variant="unstyled"
                    onClick={() => onSelect(s.id)}
                    aria-current={active ? "step" : undefined}
                    className={row_class}
                  >
                    {inner}
                  </Button>
                ) : (
                  <div className={row_class}>{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
        <div className="px-5 py-4 text-[11px] text-white/60 border-t border-white/10">
          {t("wizard.shell.footer_note")}
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto px-10 py-8">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border  p-8">
            {children}
          </div>
        </div>
        {footer && (
          <div className="border-t  bg-panel-alt px-10 py-3">
            <div className="max-w-2xl mx-auto">{footer}</div>
          </div>
        )}
      </main>
    </div>
  );
}
