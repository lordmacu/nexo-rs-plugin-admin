// Phase 90.2 — empty stub for the marketing api so the admin
// plugin compiles without dragging in the marketing extension's
// wire shapes. The agent-creator-microapp's UI surfaces marketing
// sellers + leads + email templates because it IS the SaaS demo
// for that workflow; the admin plugin only administers the
// FRAMEWORK and intentionally has no marketing features.
//
// Callers (Agents.tsx + agents.ts helpers) treat empty results
// gracefully — the "Marketing sellers" panel just renders empty,
// the seller-binding dropdowns hide themselves, etc.

export type ConfigSeller = Record<string, unknown> & {
  id: string;
  name: string;
  primary_email: string;
};

export async function getSellers(): Promise<{
  sellers: readonly ConfigSeller[];
  count: number;
}> {
  return { sellers: [], count: 0 };
}

export async function saveSellers(_sellers: readonly ConfigSeller[]): Promise<void> {
  // No-op: admin plugin doesn't manage marketing.
}
