// Firehose connection-status store. Surfaces SSE state for the
// `<ConnectionBanner>`.

import { create } from "zustand";

export type FirehoseStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "lagged";

export interface FirehoseState {
  status: FirehoseStatus;
  lagged_count: number;
  last_event_at_ms: number;
  set_status: (s: FirehoseStatus) => void;
  on_lagged: (n: number) => void;
  on_event_at: (at_ms: number) => void;
}

export const useFirehose = create<FirehoseState>((set, get) => ({
  status: "connecting",
  lagged_count: 0,
  last_event_at_ms: 0,
  set_status: (s) => set({ status: s }),
  on_lagged: (n) =>
    set({ status: "lagged", lagged_count: get().lagged_count + n }),
  on_event_at: (at_ms) =>
    set({ last_event_at_ms: Math.max(get().last_event_at_ms, at_ms) }),
}));
