// M9 — wizard orchestrator. Owns step routing, mounts the
// appropriate step component, and bridges the four steps via
// the shared Zustand draft.

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StepShell from "../components/wizard/StepShell";
import StepWelcome from "../components/wizard/StepWelcome";
import StepLlm from "../components/wizard/StepLlm";
import StepPairing from "../components/wizard/StepPairing";
import StepAgent from "../components/wizard/StepAgent";
import StepDone from "../components/wizard/StepDone";
import { finishOnboarding } from "../api/onboarding";
import type { BootstrapState } from "../api/types";
import { useWizard, type WizardStep } from "../store/wizard";
import { Button } from "../components/ui";
import { useT } from "../i18n";

interface WizardProps {
  initial: BootstrapState;
  onComplete: () => void;
}

export default function Wizard({ initial, onComplete }: WizardProps) {
  const t = useT();
  const step = useWizard((s) => s.step);
  const setStep = useWizard((s) => s.setStep);
  const reset = useWizard((s) => s.reset);
  const loadFromBootstrap = useWizard((s) => s.loadFromBootstrap);
  const pairing = useWizard((s) => s.pairing);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Operator entered the wizard via `?wizard=new-agent` (CmdK or
  // sidebar) but already has at least one agent — give them a
  // way to bail back to the dashboard without going through the
  // full flow (e.g. they changed their mind, or wandered in).
  const can_return_to_dashboard =
    searchParams.get("wizard") === "new-agent" && !initial.needs_wizard;

  useEffect(() => {
    // `?wizard=new-agent` (sidebar Users → Nuevo agente, or the
    // CmdK "Crear nuevo agente" action when no specific step is
    // requested) means the operator wants a fresh start. Wipe
    // the persisted draft so a stale `step: 4` from a completed
    // run doesn't drop them on the "Listo" screen, and skip the
    // bootstrap auto-skip so they always begin at "Bienvenida"
    // — matches how a wizard should feel after every completion.
    if (searchParams.get("wizard") === "new-agent") {
      reset();
      setStep(0);
    } else {
      loadFromBootstrap(initial);
    }
    // M7.cmdk — `?step=agent` jumps directly to step 3 (Agent
    // creation) when the operator has at least one paired
    // device. Used by the command-palette "Crear nuevo agente"
    // action so subsequent agents skip the LLM/pairing screens.
    if (
      searchParams.get("step") === "agent" &&
      initial.paired_devices.length > 0
    ) {
      setStep(3);
    }
    // setStep is stable from Zustand; intentional one-shot
    // sync against the initial bootstrap snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, loadFromBootstrap]);

  function advanceTo(s: WizardStep) {
    setStep(s);
  }

  async function finish() {
    try {
      await finishOnboarding();
    } catch {
      // Cache invalidation is best-effort — even if it fails
      // the dashboard's bootstrap fetch will see the new agent
      // after the 5 s TTL elapses.
    }
    onComplete();
  }

  function renderStep() {
    switch (step) {
      case 0:
        return <StepWelcome onStart={() => advanceTo(1)} />;
      case 1:
        return <StepLlm onContinue={() => advanceTo(2)} />;
      case 2: {
        const availableChannels = initial.paired_devices.map((d) => d.channel);
        return (
          <StepPairing
            onContinue={() => advanceTo(3)}
            availableChannels={availableChannels}
          />
        );
      }
      case 3: {
        const selectedChannel = pairing.selected_channel || "whatsapp";
        const matchedDevice = initial.paired_devices.find(
          (d) => d.channel === selectedChannel,
        );
        const instance = pairing.device_jid ?? matchedDevice?.instance;
        const agentProps =
          instance !== undefined
            ? {
                onContinue: () => advanceTo(4),
                pairedInstance: instance,
                selectedChannel,
              }
            : { onContinue: () => advanceTo(4), selectedChannel };
        return <StepAgent {...agentProps} />;
      }
      case 4:
        return <StepDone onGoToDashboard={finish} />;
    }
  }

  const footer =
    step < 4 ? (
      <div className="flex items-center justify-between">
        {step > 0 ? (
          <Button
            variant="ghost"
            size="md"
            onClick={() => advanceTo(Math.max(0, step - 1) as WizardStep)}
          >
            {t("wizard.page.back")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {can_return_to_dashboard && (
            <Button
              variant="ghost"
              size="md"
              onClick={() => navigate("/m/chats", { replace: true })}
            >
              {t("wizard.page.return_dashboard")}
            </Button>
          )}
          {step > 0 && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                if (confirm(t("wizard.page.restart_confirm"))) reset();
              }}
            >
              {t("wizard.page.restart")}
            </Button>
          )}
        </div>
      </div>
    ) : null;

  return (
    <StepShell current={step} footer={footer} onSelect={(s) => advanceTo(s)}>
      {renderStep()}
    </StepShell>
  );
}
