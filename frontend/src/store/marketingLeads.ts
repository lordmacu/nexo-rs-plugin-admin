// Zustand store for the marketing module's lead list.
//
// Fetches via `api/marketing.ts` → `/api/marketing/leads`
// (which the microapp proxies to the extension's loopback
// admin). When the extension is offline / unreachable the
// store goes to `source: "error"` with an empty list — the
// UI shows an empty state banner instead of falling
// through to a mock fixture.

import { create } from "zustand";

import {
  listLeads,
  subscribeMarketingStream,
  type Lead,
  type MarketingFirehoseEvent,
} from "../api/marketing";
import { useTenantStore } from "./tenant";

type Source = "api" | "loading" | "error";
type LiveStatus = "off" | "connecting" | "open" | "lagged" | "error";

interface MarketingLeadsState {
  leads: readonly Lead[];
  source: Source;
  error: string | null;
  /** Wall-clock ms of last successful API hit. `null` when
   *  we've never reached the extension. */
  last_synced_at_ms: number | null;
  /** SSE firehose connection state. Mirrors the EventSource
   *  lifecycle so the UI can distinguish "polling fallback"
   *  from "live wire". */
  live_status: LiveStatus;
  /** Number of frames dropped by the broadcast buffer (sum
   *  of all `lagged` events). Reset on successful re-fetch. */
  lagged_dropped_total: number;
  fetch: () => Promise<void>;
  /** Open the SSE firehose. Idempotent — calling twice replaces
   *  the existing subscription. Returns the unsubscribe
   *  function the caller stores in a `useEffect` cleanup. */
  startLive: () => () => void;
  /** Internal — exposed for testability. Apply a single
   *  firehose event to the lead list without an extra REST
   *  round-trip. */
  applyEvent: (e: MarketingFirehoseEvent) => void;
  /** M15.21.notes — stamp an operator-driven mutation
   *  (notes, future skip / postpone) onto the cached lead row
   *  so the drawer reflects the new value immediately. No-op
   *  when the lead id isn't in the cache (it'll arrive on the
   *  next list / firehose event). */
  patchLead: (id: string, patch: Partial<Lead>) => void;
}

export const useMarketingLeads = create<MarketingLeadsState>((set, get) => ({
  leads: [],
  source: "loading",
  error: null,
  last_synced_at_ms: null,
  live_status: "off",
  lagged_dropped_total: 0,

  async fetch() {
    set({ source: "loading", error: null });
    try {
      const r = await listLeads({});
      const leads = (r.leads ?? []) as readonly Lead[];
      set({
        leads,
        source: "api",
        last_synced_at_ms: Date.now(),
        error: null,
      });
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : String(cause);
      // Extension unreachable / not configured → empty list +
      // error banner. UI shows the empty-state placeholder.
      set({
        leads: [],
        source: "error",
        error: msg,
      });
    }
  },

  applyEvent(e: MarketingFirehoseEvent) {
    const { leads, source } = get();
    // Live events take precedence; the baseline is whatever
    // the REST seed left us (empty when the seed failed).
    const baseline: readonly Lead[] = source === "api" ? leads : [];
    switch (e.kind) {
      case "created": {
        // De-dupe by id (broadcast can replay on reconnect).
        if (baseline.some((l) => l.id === e.lead_id)) {
          return;
        }
        const lead: Lead = {
          id: e.lead_id,
          tenant_id: e.tenant_id,
          thread_id: e.thread_id,
          subject: e.subject,
          person_id: `placeholder:${e.from_email}`,
          seller_id: e.seller_id,
          state: e.state,
          score: 0,
          sentiment: "neutral",
          intent: "browsing",
          topic_tags: [],
          last_activity_ms: e.at_ms,
          next_check_at_ms: null,
          followup_attempts: 0,
          why_routed: e.why_routed,
        };
        set({
          leads: [lead, ...baseline],
          source: "api",
          last_synced_at_ms: Date.now(),
          error: null,
        });
        return;
      }
      case "thread_bumped": {
        const next = baseline.map((l) =>
          l.id === e.lead_id ? { ...l, last_activity_ms: e.at_ms } : l,
        );
        set({
          leads: next,
          source: "api",
          last_synced_at_ms: Date.now(),
        });
        return;
      }
      case "transitioned": {
        const next = baseline.map((l) =>
          l.id === e.lead_id ? { ...l, state: e.to } : l,
        );
        set({
          leads: next,
          source: "api",
          last_synced_at_ms: Date.now(),
        });
        return;
      }
      case "followup_overridden": {
        // Stamp the new `next_check_at_ms` (and 0 attempts —
        // override is operator-driven, not a retry; the
        // backend doesn't increment attempts on this path).
        const next = baseline.map((l) =>
          l.id === e.lead_id
            ? { ...l, next_check_at_ms: e.next_check_at_ms }
            : l,
        );
        set({
          leads: next,
          source: "api",
          last_synced_at_ms: Date.now(),
        });
        return;
      }
    }
  },

  patchLead(id, patch) {
    const baseline = get().leads;
    let touched = false;
    const next = baseline.map((l) => {
      if (l.id !== id) return l;
      touched = true;
      return { ...l, ...patch };
    });
    if (!touched) return;
    set({ leads: next });
  },

  startLive() {
    set({ live_status: "connecting" });
    const unsub = subscribeMarketingStream({
      onOpen: () => set({ live_status: "open", error: null }),
      onEvent: (e) => get().applyEvent(e),
      onLagged: (dropped) => {
        set({
          live_status: "lagged",
          lagged_dropped_total: get().lagged_dropped_total + dropped,
        });
        // Reconcile via REST so the operator's list converges
        // back to the extension's source-of-truth.
        void get().fetch();
      },
      onError: () => set({ live_status: "error" }),
    });
    return () => {
      unsub();
      set({ live_status: "off" });
    };
  },
}));

// Auto-reset on tenant switch. The firehose subscription
// itself is cleaned up by component unmount via the
// returned teardown; here we just wipe the cached lead
// list + source flag so the new tenant's UI starts fresh.
useTenantStore.subscribe((state, prev) => {
  if (state.activeTenantId !== prev.activeTenantId) {
    useMarketingLeads.setState({
      leads: [],
      source: "loading",
      error: null,
      last_synced_at_ms: null,
      live_status: "off",
      lagged_dropped_total: 0,
    });
  }
});
