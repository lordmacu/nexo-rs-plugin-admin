// M9 — onboarding wizard draft state.
//
// Persisted to `localStorage` under `nexo-admin:wizard:v1`
// behind a versioned shape so a future schema bump can wipe stale
// drafts cleanly. The raw API key (`llm.api_key_raw`) is held in
// memory only — the `partialize` callback strips it before write.
// Reload ⇒ operator re-enters; acceptable given the wizard is a
// short flow (single session).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BootstrapState } from "../api/types";
import {
  PERSONA_TEMPLATES,
  DEFAULT_TEMPLATE_ID,
} from "../components/wizard/personaTemplates";

export type WizardStep = 0 | 1 | 2 | 3 | 4;

export interface WizardLlm {
  provider_id: string;
  base_url: string;
  api_key_env: string;
  /** Raw key — in-memory only, never persisted. */
  api_key_raw?: string;
  probed_ok: boolean;
  saved: boolean;
}

export interface WizardPairing {
  challenge_id?: string;
  device_jid?: string;
  state: "idle" | "qr_ready" | "awaiting_user" | "linked" | "expired" | "error";
  /** Base64 PNG payload from `pairing/start`. Persisted so the
   *  same QR re-renders after a tab reload (until expiry). */
  last_qr_png?: string;
  expires_at_ms?: number;
}

export interface WizardAgent {
  id: string;
  name: string;
  system_prompt: string;
  language: "es" | "en";
  model_provider: string;
  model_id: string;
}

export interface WizardDraft {
  version: 1;
  step: WizardStep;
  llm: WizardLlm;
  pairing: WizardPairing;
  agent: WizardAgent;
}

const DEFAULT_DRAFT: WizardDraft = {
  version: 1,
  step: 0,
  llm: {
    provider_id: "minimax",
    base_url: "https://api.minimax.chat/v1",
    api_key_env: "MINIMAX_API_KEY",
    probed_ok: false,
    saved: false,
  },
  pairing: {
    state: "idle",
  },
  agent: {
    id: "",
    name: "",
    // M9.c — default agent prompt is the `support_general`
    // template's text (same flavour as the previous hardcoded
    // string, just centrally sourced). Wizard's Plantilla
    // dropdown auto-reflects this choice.
    system_prompt: PERSONA_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!
      .system_prompt,
    language: "es",
    model_provider: "minimax",
    model_id: "MiniMax-M2.5",
  },
};

interface WizardActions {
  setStep: (step: WizardStep) => void;
  updateLlm: (patch: Partial<WizardLlm>) => void;
  updatePairing: (patch: Partial<WizardPairing>) => void;
  updateAgent: (patch: Partial<WizardAgent>) => void;
  reset: () => void;
  /** Skip steps that bootstrap reports as already complete. Run
   *  once on wizard mount with the freshest snapshot. */
  loadFromBootstrap: (b: BootstrapState) => void;
}

export type WizardStoreState = WizardDraft & WizardActions;

const STORAGE_KEY = "nexo-admin:wizard:v1";

export const useWizard = create<WizardStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_DRAFT,
      setStep: (step) => set({ step }),
      updateLlm: (patch) => set((s) => ({ llm: { ...s.llm, ...patch } })),
      updatePairing: (patch) =>
        set((s) => ({ pairing: { ...s.pairing, ...patch } })),
      updateAgent: (patch) => set((s) => ({ agent: { ...s.agent, ...patch } })),
      reset: () => set({ ...DEFAULT_DRAFT }),
      loadFromBootstrap: (b) =>
        set((s) => {
          // Trust the daemon. If the operator paired then later
          // revoked the device (web UI delete + WhatsApp app
          // unlink), bootstrap regresses `has_pairing` to false
          // and we must not let a stale persisted `step: 3` skip
          // them past pairing — they'd land on StepAgent without
          // an inbound binding.
          let step: WizardStep = 0;
          if (b.has_llm) step = 2;
          if (b.has_llm && b.has_pairing) step = 3;
          if (b.has_llm && b.has_pairing && b.has_agent) step = 4;
          // Forward bias only: keep an in-progress draft that's
          // ahead of bootstrap when the prerequisite is met.
          // (e.g. the 5 s bootstrap cache hasn't refreshed yet
          // after a fresh upsert.) Never let the draft skip a
          // step whose prerequisite bootstrap reports as missing.
          if (s.step > step && s.step <= step + 1) step = s.step;
          // Clear stale pairing draft when the daemon no longer
          // owns the credential. Without this the operator gets
          // stuck on the green "✅ emparejado" pane (frontend
          // remembers a JID the daemon already revoked → no QR,
          // no escape, even after deleting from WhatsApp + web).
          let pairing = s.pairing;
          if (!b.has_pairing && pairing.state !== "idle") {
            pairing = { state: "idle" };
          }
          // Pre-fill the agent step's instance from the first
          // paired device when present.
          const firstWa = b.paired_devices.find(
            (d) => d.channel === "whatsapp",
          );
          const agent = firstWa?.instance
            ? { ...s.agent /* instance saved separately on submit */ }
            : s.agent;
          return { step, agent, llm: { ...s.llm, saved: b.has_llm }, pairing };
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // Strip volatile fields before write. Raw API key NEVER
      // touches localStorage; expired QR PNGs aren't worth
      // persisting either.
      partialize: (state) =>
        ({
          version: state.version,
          step: state.step,
          llm: { ...state.llm, api_key_raw: undefined },
          pairing: state.pairing,
          agent: state.agent,
        }) as unknown as WizardStoreState,
      // Wipe drafts from older schema versions outright. Cleaner
      // than risking partial migration in a wizard where re-entry
      // costs ~30 s.
      migrate: (persisted, version) => {
        if (version !== 1) return DEFAULT_DRAFT as unknown as WizardStoreState;
        return persisted as WizardStoreState;
      },
    },
  ),
);
