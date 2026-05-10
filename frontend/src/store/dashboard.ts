// Phase 90.3.13 — dashboard store. Aggregates read-only counts
// from already-wired admin RPCs. Uses Promise.allSettled so a
// partial daemon outage (e.g. agents endpoint up but audit
// table missing) still renders the tiles that DID succeed.

import { create } from "zustand";

import { listAgents } from "../api/agents";
import { auditTail } from "../api/audit";
import { adminCall } from "../api/admin";

export interface DashboardCounts {
  agents: number | null;
  llmProviders: number | null;
  auditRecent: number | null; // rows in last 24h
  errors: string[]; // per-tile failures, surfaced in UI banner
}

interface DashboardState {
  counts: DashboardCounts;
  isLoading: boolean;
  reload: () => Promise<void>;
}

const HOUR_MS = 60 * 60 * 1000;

const EMPTY_COUNTS: DashboardCounts = {
  agents: null,
  llmProviders: null,
  auditRecent: null,
  errors: [],
};

export const useDashboard = create<DashboardState>((set) => ({
  counts: EMPTY_COUNTS,
  isLoading: false,

  reload: async () => {
    set({ isLoading: true, counts: { ...EMPTY_COUNTS, errors: [] } });
    const errors: string[] = [];

    const [agentsRes, providersRes, auditRes] = await Promise.allSettled([
      listAgents(),
      adminCall<{ providers: unknown[] }>(
        "nexo/admin/llm_providers/list",
        {},
      ),
      auditTail({
        limit: 0,
        offset: 0,
        since_ms: Date.now() - 24 * HOUR_MS,
      }),
    ]);

    const agents =
      agentsRes.status === "fulfilled" ? agentsRes.value.length : null;
    if (agentsRes.status === "rejected") {
      errors.push(`agents: ${describeError(agentsRes.reason)}`);
    }

    const llmProviders =
      providersRes.status === "fulfilled"
        ? (providersRes.value.providers ?? []).length
        : null;
    if (providersRes.status === "rejected") {
      errors.push(`llm_providers: ${describeError(providersRes.reason)}`);
    }

    const auditRecent =
      auditRes.status === "fulfilled" ? auditRes.value.total : null;
    if (auditRes.status === "rejected") {
      errors.push(`audit: ${describeError(auditRes.reason)}`);
    }

    set({
      counts: { agents, llmProviders, auditRecent, errors },
      isLoading: false,
    });
  },
}));

function describeError(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  return String(reason);
}
