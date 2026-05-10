// Zustand store for the marketing module's read-only config:
// mailboxes / sellers / rules / followup_profiles.
//
// Each slice fetches independently — Settings tabs land on
// loading / error states without blocking the others. Failures
// fall through to the mock fixture so the UI never blanks
// during dev / extension-not-installed setups.

import { create } from "zustand";

import { reconcileAgentMarketingBindings } from "../api/agents";
import {
  getFollowupProfiles,
  getMailboxes,
  getRules,
  getSellers,
  saveFollowupProfiles,
  saveMailboxes,
  saveRules,
  saveSellers,
  type ConfigFollowupProfile,
  type ConfigMailbox,
  type ConfigRuleSet,
  type ConfigSeller,
} from "../api/marketing";
import { useTenantStore } from "./tenant";

type Source = "api" | "mock" | "loading" | "error";

interface SliceState<T> {
  data: T;
  source: Source;
  error: string | null;
}

/** Outcome surface for save actions — discriminated so the
 *  modal renders success vs error vs server-side restart-
 *  required differently.
 *
 *  `ok_with_partial_warning` is the M15.37 seller-save
 *  surface: marketing.yaml saved fine but the agent-binding
 *  reconciliation hit per-agent failures. The save itself
 *  succeeded — the caller should close the form but show a
 *  warning banner. */
export type SaveOutcome =
  | { kind: "ok" }
  | { kind: "ok_restart_required"; note: string }
  | { kind: "ok_with_partial_warning"; note: string }
  | { kind: "error"; message: string };

interface MarketingConfigState {
  mailboxes: SliceState<readonly ConfigMailbox[]>;
  sellers: SliceState<readonly ConfigSeller[]>;
  followups: SliceState<readonly ConfigFollowupProfile[]>;
  rules: SliceState<ConfigRuleSet | null>;
  fetchAll: () => Promise<void>;
  fetchMailboxes: () => Promise<void>;
  fetchSellers: () => Promise<void>;
  fetchFollowups: () => Promise<void>;
  fetchRules: () => Promise<void>;
  // Saves take the FULL post-edit list / RuleSet (server is
  // full-replace — no diff / merge). On success the slice is
  // refreshed from disk so any server-side coercion is
  // visible to the operator.
  saveMailboxes: (rows: readonly ConfigMailbox[]) => Promise<SaveOutcome>;
  saveSellers: (rows: readonly ConfigSeller[]) => Promise<SaveOutcome>;
  saveFollowups: (
    rows: readonly ConfigFollowupProfile[],
  ) => Promise<SaveOutcome>;
  saveRules: (rs: ConfigRuleSet) => Promise<SaveOutcome>;
}

const empty = <T>(data: T): SliceState<T> => ({
  data,
  source: "mock",
  error: null,
});

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export const useMarketingConfig = create<MarketingConfigState>((set, get) => ({
  mailboxes: empty<readonly ConfigMailbox[]>([]),
  sellers: empty<readonly ConfigSeller[]>([]),
  followups: empty<readonly ConfigFollowupProfile[]>([]),
  rules: empty<ConfigRuleSet | null>(null),

  async fetchAll() {
    // Independent — let the slowest slice not block the others.
    const s = get();
    await Promise.all([
      s.fetchMailboxes(),
      s.fetchSellers(),
      s.fetchFollowups(),
      s.fetchRules(),
    ]);
  },

  async fetchMailboxes() {
    set((s) => ({ mailboxes: { ...s.mailboxes, source: "loading" } }));
    try {
      const r = await getMailboxes();
      set({
        mailboxes: {
          data: r.mailboxes ?? [],
          source: r.mailboxes && r.mailboxes.length > 0 ? "api" : "mock",
          error: null,
        },
      });
    } catch (e) {
      set({
        mailboxes: { data: [], source: "error", error: errMsg(e) },
      });
    }
  },

  async fetchSellers() {
    set((s) => ({ sellers: { ...s.sellers, source: "loading" } }));
    try {
      const r = await getSellers();
      set({
        sellers: {
          data: r.sellers ?? [],
          source: r.sellers && r.sellers.length > 0 ? "api" : "mock",
          error: null,
        },
      });
    } catch (e) {
      set({
        sellers: { data: [], source: "error", error: errMsg(e) },
      });
    }
  },

  async fetchFollowups() {
    set((s) => ({ followups: { ...s.followups, source: "loading" } }));
    try {
      const r = await getFollowupProfiles();
      set({
        followups: {
          data: r.profiles ?? [],
          source: r.profiles && r.profiles.length > 0 ? "api" : "mock",
          error: null,
        },
      });
    } catch (e) {
      set({
        followups: { data: [], source: "error", error: errMsg(e) },
      });
    }
  },

  async fetchRules() {
    set((s) => ({ rules: { ...s.rules, source: "loading" } }));
    try {
      const r = await getRules();
      const ruleCount = r.rule_set?.rules?.length ?? 0;
      set({
        rules: {
          data: r.rule_set ?? null,
          source: ruleCount > 0 ? "api" : "mock",
          error: null,
        },
      });
    } catch (e) {
      set({
        rules: { data: null, source: "error", error: errMsg(e) },
      });
    }
  },

  async saveMailboxes(rows) {
    try {
      await saveMailboxes(rows);
      // Re-fetch so any server-side coercion (defaults
      // applied on round-trip) is visible. Awaited so the UI
      // shows the result before the modal closes.
      await get().fetchMailboxes();
      return { kind: "ok" };
    } catch (e) {
      return { kind: "error", message: errMsg(e) };
    }
  },

  async saveSellers(rows) {
    // Snapshot the slice's pre-save state for the F6 perf
    // path — reconciler walks only agents that appear in
    // (previous.agent_id ∪ next.agent_id) instead of every
    // agent in the deployment.
    const previousData = get().sellers.data;
    try {
      await saveSellers(rows);
      await get().fetchSellers();
    } catch (e) {
      return { kind: "error", message: errMsg(e) };
    }
    // M15.37 — after the marketing PUT lands, sync the
    // `agents.<id>.inbound_bindings` so each agent reflects
    // the updated email-channel binding. Failures here are
    // non-fatal: the marketing config IS saved; the operator
    // can retry the binding sync later.
    try {
      // Build the lite shape — drop undefined `agent_id`
      // explicitly so `exactOptionalPropertyTypes` is happy.
      const toLite = (r: { id: unknown; agent_id?: string }) => {
        const agent_id = r.agent_id;
        return agent_id !== undefined
          ? { id: String(r.id), agent_id }
          : { id: String(r.id) };
      };
      const lite = rows.map(toLite);
      const previousLite = previousData.map(toLite);
      const reconcile = await reconcileAgentMarketingBindings(
        lite,
        previousLite,
      );
      if (reconcile.failed.length === 0) {
        return { kind: "ok" };
      }
      const failedSummary = reconcile.failed
        .map((f) => `${f.agent_id}: ${f.error}`)
        .join("; ");
      return {
        kind: "ok_with_partial_warning",
        note: `Sellers guardados. Sincronización de canales falló para algunos agentes — ${failedSummary}. Re-intenta el save o revisa los logs del daemon.`,
      };
    } catch (e) {
      return {
        kind: "ok_with_partial_warning",
        note: `Sellers guardados. Sincronización de canales no se pudo completar (${errMsg(e)}). Reabre el agente para forzar refresh.`,
      };
    }
  },

  async saveFollowups(rows) {
    try {
      await saveFollowupProfiles(rows);
      await get().fetchFollowups();
      return { kind: "ok" };
    } catch (e) {
      return { kind: "error", message: errMsg(e) };
    }
  },

  async saveRules(rs) {
    try {
      const result = await saveRules(rs);
      await get().fetchRules();
      // The extension's `with_router` path returns
      // `restart_required: false`; legacy embedders without
      // the router handle return `true` so the operator
      // banner is accurate. M15.33 is the live-reload origin.
      if (result.restart_required) {
        return {
          kind: "ok_restart_required",
          note: "Cambios guardados. Reinicia el extension para que el router los tome (live reload no disponible en este deployment).",
        };
      }
      return { kind: "ok" };
    } catch (e) {
      return { kind: "error", message: errMsg(e) };
    }
  },
}));

// Auto-reset slices on tenant switch — every config row is
// tenant-scoped server-side, so the cached snapshots from
// the previous tenant must not bleed into the new one's
// Settings UI. The slowest slice's fetchAll() will repopulate
// when the operator lands on a Settings tab again.
useTenantStore.subscribe((state, prev) => {
  if (state.activeTenantId !== prev.activeTenantId) {
    useMarketingConfig.setState({
      mailboxes: empty<readonly ConfigMailbox[]>([]),
      sellers: empty<readonly ConfigSeller[]>([]),
      followups: empty<readonly ConfigFollowupProfile[]>([]),
      rules: empty<ConfigRuleSet | null>(null),
    });
  }
});
