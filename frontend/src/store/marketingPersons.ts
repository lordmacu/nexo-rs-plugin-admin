// Per-tenant person + company cache. Lookup hits
// `getPerson(id)` once per id and memoises the result;
// repeat consumers (lead drawer + sidebar row + cmdK
// suggestion) share the cache. Tenant scope flips on
// resetForTenant — the bearer + X-Tenant-Id middleware
// handles cross-tenant isolation server-side, but the
// in-memory cache is per-process and would leak rows if
// not cleared on tenant switch.

import { create } from "zustand";

import { getPerson, type CompanyRecord, type Person } from "../api/marketing";
import { useTenantStore } from "./tenant";

type Status = "loading" | "ok" | "error";

interface PersonEntry {
  status: Status;
  person?: Person;
  company?: CompanyRecord | null;
  error?: string;
  /** Wall-clock the entry hit "ok" — drives stale revalidation
   *  the lead drawer can opt into via `revalidate(id)`. */
  fetched_at_ms?: number;
}

interface MarketingPersonsState {
  /** Cache keyed by person_id. Missing key ⇒ never asked. */
  byId: Record<string, PersonEntry>;
  /** Trigger a fetch (or short-circuit if already cached + ok).
   *  Idempotent — concurrent calls dedupe via the in-flight
   *  Set. */
  ensure: (personId: string) => Promise<void>;
  /** Force-refetch even if cached. */
  revalidate: (personId: string) => Promise<void>;
  /** Drop everything — call from the tenant-switch effect. */
  resetForTenant: () => void;
}

const inFlight = new Set<string>();

export const useMarketingPersons = create<MarketingPersonsState>(
  (set, get) => ({
    byId: {},

    ensure: async (personId) => {
      if (!personId) return;
      const existing = get().byId[personId];
      if (existing?.status === "ok") return;
      if (inFlight.has(personId)) return;
      inFlight.add(personId);
      set((s) => ({
        byId: {
          ...s.byId,
          [personId]: { status: "loading" },
        },
      }));
      try {
        const r = await getPerson(personId);
        set((s) => ({
          byId: {
            ...s.byId,
            [personId]: {
              status: "ok",
              person: r.person,
              company: r.company,
              fetched_at_ms: Date.now(),
            },
          },
        }));
      } catch (e) {
        set((s) => ({
          byId: {
            ...s.byId,
            [personId]: {
              status: "error",
              error: e instanceof Error ? e.message : String(e),
            },
          },
        }));
      } finally {
        inFlight.delete(personId);
      }
    },

    revalidate: async (personId) => {
      if (!personId) return;
      // Drop the cache so `ensure` falls through to a real
      // fetch even when the entry was previously ok.
      set((s) => {
        const { [personId]: _drop, ...rest } = s.byId;
        return { byId: rest };
      });
      await get().ensure(personId);
    },

    resetForTenant: () => {
      inFlight.clear();
      set({ byId: {} });
    },
  }),
);

// Auto-reset on tenant switch. The shell remounts module
// subtrees via `key={activeTenantId}` but Zustand stores
// are module singletons that survive remounts — they need
// explicit invalidation. Subscribe at module load so the
// hook fires for every future tenant flip.
useTenantStore.subscribe((state, prev) => {
  if (state.activeTenantId !== prev.activeTenantId) {
    useMarketingPersons.getState().resetForTenant();
  }
});
