// Lightweight toast queue. Used for one-off notifications that
// don't fit a modal (session-expired warning, permission CTA,
// future browser-notification opt-in re-prompt).
//
// Each toast carries an auto-dismiss timer; the host component
// renders stacked entries top-right with kind-specific
// styling. Manual dismiss is also available.

import { create } from "zustand";

export type ToastKind = "info" | "warn" | "error";

export interface ToastMsg {
  id: number;
  kind: ToastKind;
  text: string;
  /** Milliseconds before auto-dismiss. `null` = sticky. */
  ttl_ms: number | null;
}

interface ToastState {
  messages: ToastMsg[];
  push: (input: {
    kind?: ToastKind;
    text: string;
    ttl_ms?: number | null;
  }) => number;
  dismiss: (id: number) => void;
}

let next_id = 1;
const DEFAULT_TTL_MS = 4000;

export const useToast = create<ToastState>((set, get) => ({
  messages: [],
  push: ({ kind = "info", text, ttl_ms }) => {
    const id = next_id++;
    const msg: ToastMsg = {
      id,
      kind,
      text,
      ttl_ms: ttl_ms === undefined ? DEFAULT_TTL_MS : ttl_ms,
    };
    set((s) => ({ messages: [...s.messages, msg] }));
    if (msg.ttl_ms !== null) {
      window.setTimeout(() => {
        get().dismiss(id);
      }, msg.ttl_ms);
    }
    return id;
  },
  dismiss: (id) => {
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) }));
  },
}));
