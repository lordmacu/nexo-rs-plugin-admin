// Marketing on/off — global cache so the sidebar banner +
// any other component sees the same state.
//
// Hydrates on first read via `getMarketingState()`. Polls
// every 30 s in the background while the marketing module is
// mounted (a sibling effect kicks the polling on mount). The
// settings tab calls `setEnabled(...)` after a successful PUT
// so the banner updates without waiting for the next poll.
//
// Audit fix #7 — same-origin tabs sync via BroadcastChannel:
// when the operator toggles in tab A we post the new state to
// `marketing-state` channel and tab B's subscriber updates the
// store immediately. Polling stays as backstop for closed-and-
// reopened tabs that missed the broadcast.

import { create } from "zustand";

import {
  getMarketingState,
  putMarketingState,
  type MarketingState,
} from "../api/marketingState";

const CHANNEL_NAME = "marketing-state";
type BroadcastEnvelope = { kind: "state_changed"; state: MarketingState };

// Lazy singleton — `BroadcastChannel` may be undefined under
// SSR / older browsers. Falls through gracefully when not
// available; polling still keeps the store eventually fresh.
let broadcaster: BroadcastChannel | null = null;
function broadcastChannel(): BroadcastChannel | null {
  if (broadcaster) return broadcaster;
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  broadcaster = new BroadcastChannel(CHANNEL_NAME);
  return broadcaster;
}

interface MarketingStateSlice {
  state: MarketingState | null;
  loading: boolean;
  error: string | null;
  /** Last fetch timestamp — `0` means never fetched. */
  lastFetchedMs: number;
  fetch: () => Promise<void>;
  setEnabled: (enabled: boolean, reason?: string) => Promise<void>;
  /** Internal — apply a state from a peer-tab broadcast. */
  applyExternal: (state: MarketingState) => void;
}

export const useMarketingState = create<MarketingStateSlice>((set, get) => ({
  state: null,
  loading: false,
  error: null,
  lastFetchedMs: 0,

  fetch: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const r = await getMarketingState();
      set({
        state: r.state,
        loading: false,
        lastFetchedMs: Date.now(),
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  setEnabled: async (enabled, reason) => {
    const body: { enabled: boolean; paused_reason?: string } = { enabled };
    if (!enabled && reason && reason.trim()) {
      body.paused_reason = reason.trim();
    }
    const r = await putMarketingState(body);
    set({
      state: r.state,
      lastFetchedMs: Date.now(),
    });
    // Broadcast to peer tabs so their banners + settings
    // panes update without waiting for the 30 s poll. Same
    // origin only — BroadcastChannel scopes to current
    // origin + cleared on tab close.
    const ch = broadcastChannel();
    if (ch) {
      const envelope: BroadcastEnvelope = {
        kind: "state_changed",
        state: r.state,
      };
      ch.postMessage(envelope);
    }
  },

  applyExternal: (state) => {
    set({ state, lastFetchedMs: Date.now() });
  },
}));

// Wire the receiver — runs once at module load. Drops messages
// from outside the typed envelope so a future channel reuse
// can't poison the store.
const receiver = broadcastChannel();
if (receiver) {
  receiver.addEventListener("message", (e: MessageEvent) => {
    const data = e.data as BroadcastEnvelope | null;
    if (data && data.kind === "state_changed" && data.state) {
      useMarketingState.getState().applyExternal(data.state);
    }
  });
}
