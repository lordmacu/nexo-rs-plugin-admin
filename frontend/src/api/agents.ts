// Thin wrappers around the daemon admin RPC for agents.
//
// Used by the marketing module's seller form to resolve
// `agent_id` → human-readable label + the agent's default
// `ModelRef` (so the override picker can show "current model:
// xxx" hints).

import { adminCall } from "./admin";

export interface AgentSummary {
  readonly id: string;
  readonly active: boolean;
  readonly model_provider: string;
  readonly bindings_count: number;
}

export interface ModelRef {
  readonly provider: string;
  readonly model: string;
}

export interface AgentDetail {
  readonly id: string;
  readonly active: boolean;
  readonly model: ModelRef;
  readonly allowed_tools: readonly string[];
  readonly inbound_bindings: ReadonlyArray<{
    readonly plugin: string;
    readonly instance?: string;
  }>;
  readonly system_prompt: string;
  readonly language?: string;
  readonly workspace?: string;
  readonly extra_docs?: readonly string[];
}

/** `nexo/admin/agents/list` — returns the operator-visible
 *  agents in stable id order. Used by the seller form's
 *  agent dropdown. */
export async function listAgents(): Promise<readonly AgentSummary[]> {
  const r = await adminCall<{ agents?: readonly AgentSummary[] }>(
    "nexo/admin/agents/list",
    {},
  );
  return r.agents ?? [];
}

/** `nexo/admin/agents/get` — full detail for the selected
 *  agent. Seller form fetches this when the operator picks
 *  an `agent_id` so the override picker can show "current
 *  default: <provider>/<model>" as a hint. */
export async function getAgent(agent_id: string): Promise<AgentDetail | null> {
  try {
    return await adminCall<AgentDetail>("nexo/admin/agents/get", {
      agent_id,
    });
  } catch {
    return null;
  }
}

// ── M15.42 — protect seller.agent_id from agent-delete ──

interface SellerRowLite {
  readonly id: string;
  readonly agent_id: string;
}

/** Pre-flight check for agent deletion: returns the list of
 *  sellers whose `agent_id` points at `target_agent_id`.
 *  The Agents UI uses this to surface a count + names in the
 *  confirmation modal. Marketing extension unreachable
 *  → returns `[]` (we don't block the delete on missing
 *  marketing — agent-only deployments still work).
 *
 *  Uses the existing `getSellers` helper so bearer auth +
 *  envelope unwrap stay centralised in `api/marketing.ts`. */
export async function listSellersBoundToAgent(
  target_agent_id: string,
): Promise<readonly SellerRowLite[]> {
  // Lazy-import to keep the dependency direction clean —
  // api/agents.ts is generic admin-RPC; api/marketing.ts is
  // the marketing wire client; agents → marketing is fine.
  const { getSellers } = await import("./marketing");
  try {
    const r = await getSellers();
    return r.sellers
      .filter((v) => (v as { agent_id?: string }).agent_id === target_agent_id)
      .map((v) => ({
        id: String(v.id),
        agent_id: String((v as { agent_id?: string }).agent_id ?? ""),
      }));
  } catch {
    return [];
  }
}

/** Unbind every seller referencing `agent_id`. Called from
 *  the Agents UI BEFORE `agents/delete` so sellers never
 *  carry stale references.
 *
 *  Implementation:
 *  - Fetches the full sellers list via `getSellers`.
 *  - Strips `agent_id` + `notification_settings` +
 *    `model_override` from rows matching `target_agent_id`.
 *    Notifications without an agent target would silently
 *    skip every event — cleaner to surface "needs re-binding"
 *    on next form edit.
 *  - PUTs the patched list via `saveSellers` (which also
 *    runs the M15.37 reconciler — but since the agent is
 *    about to be deleted, the reconciler's `agents/upsert`
 *    on `target_agent_id` will fail with a "no such agent"
 *    that we don't care about. Caller should call this
 *    BEFORE `agents/delete`).
 *  - Returns the count of unbound rows.
 *
 *  Failures bubble — the caller should NOT proceed with the
 *  agent delete since we'd leave stale rows. */
export async function unbindSellersFromAgent(
  target_agent_id: string,
): Promise<number> {
  const { getSellers, saveSellers } = await import("./marketing");
  const r = await getSellers();
  let unboundCount = 0;
  const patched = r.sellers.map((v) => {
    if ((v as { agent_id?: string }).agent_id !== target_agent_id) return v;
    unboundCount += 1;
    const next = { ...v } as Record<string, unknown>;
    delete next.agent_id;
    delete next.notification_settings;
    delete next.model_override;
    return next as typeof v;
  });
  if (unboundCount === 0) return 0;
  await saveSellers(patched);
  return unboundCount;
}

// ── M15.54 / F13 — single-seller bind/unbind from agent edit ──

/** Bind one seller to `target_agent_id`. Used by the agent
 *  edit modal's "Email sellers" section so the operator can
 *  associate / re-associate sellers without leaving the agents
 *  tab. Errors bubble — caller surfaces a toast.
 *
 *  Implementation reads the full sellers list, mutates the
 *  matching row's `agent_id`, PUTs through `saveSellers`, then
 *  runs the M15.37 reconciler so the agent's `inbound_bindings`
 *  pick up the new marketing instance.
 *
 *  Returns the reconciler outcome so callers can surface
 *  partial-failure banners. */
export async function bindSellerToAgent(
  seller_id: string,
  target_agent_id: string,
): Promise<AgentBindingReconcileResult> {
  const { getSellers, saveSellers } = await import("./marketing");
  const r = await getSellers();
  const previous = r.sellers.map((v) => ({
    id: v.id,
    ...((v as { agent_id?: string }).agent_id !== undefined
      ? { agent_id: (v as { agent_id?: string }).agent_id }
      : {}),
  }));
  const patched = r.sellers.map((v) =>
    v.id === seller_id ? ({ ...v, agent_id: target_agent_id } as typeof v) : v,
  );
  await saveSellers(patched);
  return reconcileAgentMarketingBindings(
    patched.map((v) => ({
      id: v.id,
      ...((v as { agent_id?: string }).agent_id !== undefined
        ? { agent_id: (v as { agent_id?: string }).agent_id }
        : {}),
    })),
    previous,
  );
}

/** Unbind one seller (set `agent_id` to nothing). Strips
 *  `notification_settings` + `model_override` too — those
 *  fields only make sense in the context of a bound agent.
 *  Reconciles afterwards so the previously-bound agent's
 *  `inbound_bindings` drops the marketing entry. Errors
 *  bubble. */
export async function unbindSellerFromAgent(
  seller_id: string,
): Promise<AgentBindingReconcileResult> {
  const { getSellers, saveSellers } = await import("./marketing");
  const r = await getSellers();
  const previous = r.sellers.map((v) => ({
    id: v.id,
    ...((v as { agent_id?: string }).agent_id !== undefined
      ? { agent_id: (v as { agent_id?: string }).agent_id }
      : {}),
  }));
  const patched = r.sellers.map((v) => {
    if (v.id !== seller_id) return v;
    const next = { ...v } as Record<string, unknown>;
    delete next.agent_id;
    delete next.notification_settings;
    delete next.model_override;
    return next as typeof v;
  });
  await saveSellers(patched);
  return reconcileAgentMarketingBindings(
    patched.map((v) => ({
      id: v.id,
      ...((v as { agent_id?: string }).agent_id !== undefined
        ? { agent_id: (v as { agent_id?: string }).agent_id }
        : {}),
    })),
    previous,
  );
}

// ── M15.37 — Auto-bind email channel via inbound_bindings ─────

/** Plugin id used in `BindingSummary.plugin` for the email
 *  channel auto-managed by the marketing extension's seller
 *  binding. We never touch bindings whose plugin is not this
 *  literal — operator-configured WhatsApp / telegram bindings
 *  stay untouched. */
const MARKETING_BINDING_PLUGIN = "marketing";

interface BindingLite {
  readonly plugin: string;
  readonly instance?: string;
}

/** Per-agent reconciliation outcome. Aggregated by the
 *  reconciler so the caller can surface partial failures
 *  ("seller saved, but binding to ana-agent failed"). */
export interface AgentBindingReconcileResult {
  readonly synced: readonly string[]; // agents whose marketing bindings changed
  readonly skipped: readonly string[]; // agents already in desired state
  readonly failed: ReadonlyArray<{ agent_id: string; error: string }>;
}

interface SellerLite {
  readonly id: string;
  readonly agent_id?: string;
}

/** Compare two binding lists for equivalence ignoring order.
 *  Marketing bindings only — every entry has `plugin: "marketing"`
 *  so we just need `instance` set equality. */
function sameMarketingBindings(
  a: readonly BindingLite[],
  b: readonly BindingLite[],
): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a.map((x) => x.instance ?? ""));
  return b.every((x) => setA.has(x.instance ?? ""));
}

/** Reconcile every agent's marketing-plugin bindings against
 *  the post-edit sellers list:
 *
 *  - For each agent referenced by some `seller.agent_id`,
 *    ensure its `inbound_bindings` carries
 *    `{plugin: "marketing", instance: <seller.id>}` for
 *    every bound seller.
 *  - For each agent that previously had marketing bindings
 *    no longer pointed-to by any seller, drop those.
 *  - Non-marketing bindings (whatsapp / telegram / future)
 *    are preserved verbatim — we only edit our own plugin's
 *    rows.
 *
 *  Caller's responsibility: invoke after a successful
 *  `saveSellers` so the agent UI's binding count reflects
 *  the fresh marketing state.
 *
 *  ## Performance — F6 (M15.52)
 *
 *  Without `previousSellers`, the reconciler walks every
 *  agent in the deployment (`agents/list` + `agents/get`
 *  per agent). Fine for ~5 agents, slow at ~50.
 *
 *  Pass `previousSellers` (the slice's `data` BEFORE the
 *  save) and the reconciler walks only agents that appear
 *  in `(previous.agent_id ∪ next.agent_id)`. Common case:
 *  operator edits one seller → 1 or 2 agents touched
 *  regardless of total agent count.
 *
 *  Caveat: agents with stale marketing bindings caused by
 *  out-of-band YAML edits (operator manually edits
 *  agents.yaml or sellers.yaml on disk) won't be detected
 *  unless they appear in the union. The next regular save
 *  covers them. Tracked posture, not a correctness issue.
 *
 *  Failure modes (partial — never throws):
 *  - `agents/list` failure → returns `{synced: [], skipped: [], failed: [...]}`
 *    with one synthetic entry; caller surfaces banner.
 *  - Per-agent `agents/get` or `agents/upsert` failure →
 *    captured in `failed[]` so the caller can show "synced
 *    pedro-agent ✓, ana-agent ✗ (timeout)".
 */
export async function reconcileAgentMarketingBindings(
  sellers: readonly SellerLite[],
  previousSellers?: readonly SellerLite[],
): Promise<AgentBindingReconcileResult> {
  // Group: agent_id → desired marketing instance set.
  const desired = new Map<string, string[]>();
  for (const v of sellers) {
    if (!v.agent_id) continue;
    const list = desired.get(v.agent_id) ?? [];
    list.push(v.id);
    desired.set(v.agent_id, list);
  }

  // M15.52 / F6 — when the caller passes the previous list,
  // we know exactly which agents could possibly need a touch.
  // Build the affected set as previous.agent_id ∪ next.agent_id;
  // only walk those. Without `previousSellers`, fall back to
  // the original "walk all" for backwards-compat + correctness
  // when callers can't compute the diff.
  const affectedAgentIds: ReadonlySet<string> | null = (() => {
    if (previousSellers === undefined) return null;
    const set = new Set<string>();
    for (const v of previousSellers) {
      if (v.agent_id) set.add(v.agent_id);
    }
    for (const v of sellers) {
      if (v.agent_id) set.add(v.agent_id);
    }
    return set;
  })();

  let agents: readonly AgentSummary[];
  try {
    agents = await listAgents();
  } catch (e) {
    return {
      synced: [],
      skipped: [],
      failed: [
        {
          agent_id: "(list)",
          error: e instanceof Error ? e.message : String(e),
        },
      ],
    };
  }

  // Filter to the affected set when the caller opted into the
  // perf path. Fast-path: empty affected set → nothing to do
  // (caller didn't change any agent_id binding).
  const candidates = affectedAgentIds
    ? agents.filter((a) => affectedAgentIds.has(a.id))
    : agents;

  const synced: string[] = [];
  const skipped: string[] = [];
  const failed: { agent_id: string; error: string }[] = [];

  for (const a of candidates) {
    let detail: AgentDetail | null;
    try {
      detail = await getAgent(a.id);
    } catch (e) {
      failed.push({
        agent_id: a.id,
        error: e instanceof Error ? e.message : String(e),
      });
      continue;
    }
    if (!detail) continue;

    const currentMarketing = detail.inbound_bindings.filter(
      (b) => b.plugin === MARKETING_BINDING_PLUGIN,
    );
    const desiredInstances = desired.get(a.id) ?? [];
    const desiredMarketing = desiredInstances.map((id) => ({
      plugin: MARKETING_BINDING_PLUGIN,
      instance: id,
    }));

    if (sameMarketingBindings(currentMarketing, desiredMarketing)) {
      skipped.push(a.id);
      continue;
    }

    // Preserve every non-marketing binding (whatsapp/telegram
    // are operator-managed; we don't own them).
    const nonMarketing = detail.inbound_bindings.filter(
      (b) => b.plugin !== MARKETING_BINDING_PLUGIN,
    );
    const next = [...nonMarketing, ...desiredMarketing];

    try {
      await adminCall("nexo/admin/agents/upsert", {
        id: a.id,
        model: detail.model,
        inbound_bindings: next,
      });
      synced.push(a.id);
    } catch (e) {
      failed.push({
        agent_id: a.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { synced, skipped, failed };
}
