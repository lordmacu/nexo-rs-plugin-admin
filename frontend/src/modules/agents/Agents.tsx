// Agents admin page — lists every agent configured on the daemon
// (via `nexo/admin/agents/list`) and lets the operator edit the
// system prompt, model + language fields without touching yaml. Upsert
// hits `nexo/admin/agents/upsert`. The new wizard is still available
// via the `?wizard=new-agent` route param for adding additional agents.

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { adminCall } from "../../api/admin";
import {
  bindSellerToAgent,
  listSellersBoundToAgent,
  unbindSellerFromAgent,
  unbindSellersFromAgent,
} from "../../api/agents";
import { getSellers, type ConfigSeller } from "../../api/marketing";
import { groupLocales } from "../../data/locales";
import LlmInstanceCreateModal from "./LlmInstanceCreateModal";
import PairingModal from "./PairingModal";
import { modelsFor, useLiveModels, useLlmCatalog } from "../../lib/llmCatalog";

interface LlmProviderInstance {
  id: string;
  base_url: string;
  api_key_env: string;
  tenant_scope?: string;
}

// Per-instance model cache key — shared with wizard StepLlm so a
// freshly-created instance resolves its model automatically.
const INSTANCE_MODELS_KEY = "nexo-admin:instance-models:v1";

function loadInstanceModels(): Record<
  string,
  { factory: string; model: string }
> {
  try {
    const raw = localStorage.getItem(INSTANCE_MODELS_KEY);
    return raw
      ? (JSON.parse(raw) as Record<string, { factory: string; model: string }>)
      : {};
  } catch {
    return {};
  }
}

interface AgentSummary {
  id: string;
  active: boolean;
  model_provider: string;
  bindings_count: number;
}

interface BindingSummary {
  plugin: string;
  instance?: string;
}

import { HeartbeatField, type HeartbeatWire } from "./heartbeat";
import AgentAdvancedFields, {
  type AdvancedPatch,
} from "./AgentAdvancedFields";
import { Button, Code, Select, Spinner, Textarea } from "../../components/ui";
import { useT } from "../../i18n";

interface AgentDetail {
  id: string;
  model: { provider: string; model: string };
  active: boolean;
  allowed_tools: string[];
  inbound_bindings: BindingSummary[];
  system_prompt: string;
  language?: string;
  /** M15.18.d — proactive tick-loop block. Absent when the yaml
   *  block was never authored; the UI then surfaces the framework
   *  default (disabled, 5m). `Some(..)` = explicit operator config. */
  heartbeat?: HeartbeatWire;
  /** Phase 97.UI — entire agent yaml block as JSON. Powers the
   *  advanced-fields accordion (config_tool, team, repl, proactive,
   *  rate limits, remote_triggers, …). Empty object when the
   *  daemon couldn't slurp the block (legacy patcher). */
  raw_config?: Record<string, unknown>;
}

export default function Agents() {
  const t = useT();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<AgentSummary[] | null>(null);
  const [list_error, setListError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AgentDetail | null>(null);
  const [draft, setDraft] = useState<AgentDetail | null>(null);
  const [save_busy, setSaveBusy] = useState(false);
  const [save_error, setSaveError] = useState<string | null>(null);
  const [pairing_for, setPairingFor] = useState<string | null>(null);
  const [confirm_delete, setConfirmDelete] = useState<string | null>(null);
  const [delete_busy, setDeleteBusy] = useState(false);
  const [delete_error, setDeleteError] = useState<string | null>(null);
  // Phase 97 — inline toggle. Tracks the row currently flipping so
  // the switch disables itself + shows a subtle opacity hint. Error
  // surfaces in `toggle_error` as `<agent_id>: <msg>` so the
  // operator sees which row failed when toggling several quickly.
  const [toggle_busy, setToggleBusy] = useState<string | null>(null);
  const [toggle_error, setToggleError] = useState<string | null>(null);
  // Phase 97.UI — patch buffer for advanced capability gates
  // (tenant_id, plugins, config_tool, team, repl, ...). The
  // accordion writes here; save() folds into the upsert payload.
  const [advanced_patch, setAdvancedPatch] = useState<AdvancedPatch>({});
  const [llm_instances, setLlmInstances] = useState<LlmProviderInstance[]>([]);
  const [llm_create_open, setLlmCreateOpen] = useState(false);
  // Phase 82.10.u — when set, the create modal opens in "rotate
  // credentials" mode against an existing instance (factory +
  // id are pre-selected, the upsert call replaces the row).
  const [llm_editing_id, setLlmEditingId] = useState<string | null>(null);
  const [llm_delete_busy, setLlmDeleteBusy] = useState<string | null>(null);
  const [llm_error, setLlmError] = useState<string | null>(null);
  /** Marketing sellers keyed by their bound `agent_id` so each
   *  agent row can render the count + name list of email
   *  sellers reusing it. `null` while loading; `{}` on error
   *  (degraded silently — agents page still works without
   *  marketing extension). */
  const [sellers_by_agent, setSellersByAgent] = useState<Record<
    string,
    ConfigSeller[]
  > | null>(null);
  /** M15.42 — pre-flight count of sellers bound to the
   *  agent the operator is about to delete. `null` = not
   *  fetched yet; empty array = 0 affected. */
  const [delete_affected_sellers, setDeleteAffectedSellers] = useState<
    readonly { id: string; agent_id: string }[] | null
  >(null);

  // M15.54 / F13 — agent edit modal "Email sellers" section.
  // Holds bind/unbind in-flight state + error so the operator
  // sees a busy spinner + transient banner without unmounting
  // the modal.
  const [bindings_busy, setBindingsBusy] = useState(false);
  const [bindings_error, setBindingsError] = useState<string | null>(null);
  // Selected seller id in the "+ Vincular seller" dropdown,
  // before the operator clicks "Vincular". `""` = no selection.
  const [bind_pick, setBindPick] = useState<string>("");

  const catalog_entries = useLlmCatalog((s) => s.entries);
  const catalog_load = useLlmCatalog((s) => s.load);
  useEffect(() => {
    void catalog_load();
  }, [catalog_load]);

  // M15.36 / M15.51 — fetch marketing sellers + group by
  // agent_id so each agent row can show
  // "📧 N email seller(es)". Marketing extension may be
  // unreachable; in that case we silently drop the badge
  // column so the agents page keeps working.
  //
  // F14 — re-fetch every 30s + on tab-visibility change so
  // the badge stays fresh after a cross-tab edit. Marketing
  // doesn't publish a "sellers changed" event today; polling
  // is the simplest correct fix and the request is cheap
  // (single GET /api/marketing/config/sellers).
  // M15.54 / F13 — full sellers list (not just bound ones) for
  // the agent edit modal's "+ Vincular seller" dropdown. Refreshed
  // alongside `sellers_by_agent` so the picker reflects edits made
  // in /m/marketing.
  const [all_sellers, setAllSellers] = useState<readonly ConfigSeller[] | null>(
    null,
  );

  const refresh_sellers = useCallback(async () => {
    try {
      const r = await getSellers();
      const list = r.sellers ?? [];
      const grouped: Record<string, ConfigSeller[]> = {};
      for (const v of list) {
        const agentId = (v as { agent_id?: string }).agent_id;
        if (!agentId) continue;
        if (!grouped[agentId]) grouped[agentId] = [];
        grouped[agentId].push(v);
      }
      setSellersByAgent(grouped);
      setAllSellers(list);
    } catch {
      setSellersByAgent({});
      setAllSellers([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      if (cancelled) return;
      await refresh_sellers();
    }
    void refresh();
    // Poll every 30 s. Operators editing in a sibling tab see
    // the agent badge converge within one tick. Document hidden
    // → skip the poll to avoid waking laptops on idle tabs.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30_000);
    // Bonus refresh on tab focus — operators tabbing back from
    // /m/marketing/settings/sellers see the badge update
    // immediately instead of waiting up to 30 s.
    function onVisibility() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh_sellers]);

  // Phase 82.10.t.2 — live models per instance. Subscribed to the
  // whole map so a successful probe re-renders the dropdown.
  const live_by_instance = useLiveModels((s) => s.by_instance);
  const load_live_models = useLiveModels((s) => s.load);
  // Trigger probe whenever the operator opens the edit modal on
  // an instance — the store dedupes concurrent calls AND caches
  // for 60 s, so reopening is cheap.
  useEffect(() => {
    if (editing && draft) {
      void load_live_models(draft.model.provider);
    }
    // We intentionally only fire on the *initial* draft.model.provider
    // for the open-modal session — switching providers inside the
    // modal triggers a separate effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);
  useEffect(() => {
    if (draft?.model.provider) {
      void load_live_models(draft.model.provider);
    }
  }, [draft?.model.provider, load_live_models]);

  /**
   * Models to show in the dropdown for a given INSTANCE id, in
   * priority order:
   *   1. Live names from `/v1/models` (when probe succeeded).
   *   2. Static factory catalog (fallback for Anthropic / Gemini
   *      shapes where probe returns None).
   *   3. Empty array (operator can still type, dropdown disables).
   *
   * Resolves the factory_type for the instance via two paths:
   *   a. The instance is itself a factory id (legacy: `minimax`).
   *   b. The instance is in `llm_instances` with no factory_type
   *      surfaced — fall back to a name match against the catalog.
   *
   * Uses `live_by_instance` so React re-renders when the probe
   * resolves.
   */
  /** Resolve the factory type for an instance id. Uses localStorage
   *  cache from instance creation first, then falls back to prefix-match
   *  against catalog entries (e.g. "deepseek-abc123" → "deepseek"). */
  function factoryForInstance(instance_id: string): string | null {
    const cached = loadInstanceModels()[instance_id];
    if (cached) return cached.factory;
    if (!catalog_entries || catalog_entries.length === 0) return null;
    const sorted = [...catalog_entries].sort(
      (a, b) => b.id.length - a.id.length,
    );
    const match = sorted.find(
      (c) => instance_id === c.id || instance_id.startsWith(`${c.id}-`),
    );
    return match?.id ?? null;
  }

  /** Best-effort model for an instance that has no localStorage cache.
   *  Matches instance id prefix against catalog factory ids. */
  function defaultModelForInstance(instance_id: string): string | null {
    if (!catalog_entries || catalog_entries.length === 0) return null;
    const sorted = [...catalog_entries].sort(
      (a, b) => b.id.length - a.id.length,
    );
    const match = sorted.find(
      (c) => instance_id === c.id || instance_id.startsWith(`${c.id}-`),
    );
    return match?.models[0] ?? null;
  }

  function modelsForInstance(instance_id: string): string[] {
    const live = live_by_instance.get(instance_id);
    if (live && !live.error && live.names && live.names.length > 0) {
      return live.names;
    }
    // Resolve factory from instance, then lookup catalog by factory id.
    const factory = factoryForInstance(instance_id);
    if (factory) return modelsFor(factory);
    // Last resort: try instance id directly (legacy: instance id == factory id).
    return modelsFor(instance_id);
  }

  const reload = useCallback(async () => {
    setListError(null);
    try {
      const res = await adminCall<{ agents: AgentSummary[] }>(
        "nexo/admin/agents/list",
        { active_only: false },
      );
      setAgents(res.agents);
    } catch (e) {
      setListError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Phase 82.10.s.4 — list every configured LLM provider instance
  // so the operator sees what's available before creating agents.
  // Failures here are tolerated (UI degrades gracefully — the
  // instances list just stays empty) so a transient daemon error
  // doesn't block the agents page.
  const reload_llm_instances = useCallback(async () => {
    try {
      const res = await adminCall<{ providers: LlmProviderInstance[] }>(
        "nexo/admin/llm_providers/list",
        {},
      );
      setLlmInstances(res.providers ?? []);
    } catch {
      // Best-effort: keep prior list rather than blank it out so a
      // flaky network doesn't make the operator think instances
      // disappeared.
    }
  }, []);

  useEffect(() => {
    void reload();
    void reload_llm_instances();
  }, [reload, reload_llm_instances]);

  async function deleteLlmInstance(id: string) {
    if (!confirm(t("agents.delete_instance_confirm", { id }))) return;
    setLlmDeleteBusy(id);
    setLlmError(null);
    try {
      await adminCall("nexo/admin/llm_providers/delete", { provider_id: id });
      await reload_llm_instances();
    } catch (e) {
      setLlmError(e instanceof Error ? e.message : String(e));
    } finally {
      setLlmDeleteBusy(null);
    }
  }

  async function openEdit(id: string) {
    setSaveError(null);
    setBindingsError(null);
    setBindPick("");
    try {
      const detail = await adminCall<AgentDetail>("nexo/admin/agents/get", {
        agent_id: id,
      });
      setEditing(detail);
      setDraft(detail);
      // Phase 97.UI — reset the advanced-fields patch buffer on
      // every modal open so a prior agent's pending edits don't
      // leak into this one.
      setAdvancedPatch({});
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    }
  }

  // M15.54 / F13 — refetch the agent detail so `inbound_bindings`
  // mirrors the post-bind / post-unbind state the reconciler just
  // wrote. Keeps the modal open + the rest of the draft intact —
  // we only refresh the bindings array, not the operator's
  // unsaved system_prompt / language / model edits.
  async function refresh_inbound_bindings(agent_id: string) {
    try {
      const detail = await adminCall<AgentDetail>("nexo/admin/agents/get", {
        agent_id,
      });
      setDraft((d) =>
        d && d.id === agent_id
          ? { ...d, inbound_bindings: detail.inbound_bindings }
          : d,
      );
    } catch {
      // Reconciler succeeded; the local view is stale until the
      // next reopen. Non-fatal.
    }
  }

  async function bind_seller(seller_id: string, agent_id: string) {
    setBindingsBusy(true);
    setBindingsError(null);
    try {
      const r = await bindSellerToAgent(seller_id, agent_id);
      if (r.failed.length > 0) {
        const first = r.failed[0]!;
        setBindingsError(
          t("agents.edit.bind_partial_failure", {
            agent: first.agent_id,
            error: first.error,
          }),
        );
      }
      setBindPick("");
      await Promise.all([
        refresh_sellers(),
        refresh_inbound_bindings(agent_id),
      ]);
    } catch (e) {
      setBindingsError(e instanceof Error ? e.message : String(e));
    } finally {
      setBindingsBusy(false);
    }
  }

  async function unbind_seller(seller_id: string, agent_id: string) {
    setBindingsBusy(true);
    setBindingsError(null);
    try {
      const r = await unbindSellerFromAgent(seller_id);
      if (r.failed.length > 0) {
        const first = r.failed[0]!;
        setBindingsError(
          t("agents.edit.unbind_partial_failure", {
            agent: first.agent_id,
            error: first.error,
          }),
        );
      }
      await Promise.all([
        refresh_sellers(),
        refresh_inbound_bindings(agent_id),
      ]);
    } catch (e) {
      setBindingsError(e instanceof Error ? e.message : String(e));
    } finally {
      setBindingsBusy(false);
    }
  }

  async function deleteAgent(id: string) {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      // M15.42 — unbind sellers BEFORE the daemon delete so
      // marketing.yaml never carries a stale agent_id. Failure
      // here aborts the delete (we don't want orphans).
      // Marketing extension unreachable → unboundCount = 0 +
      // no throw (graceful degrade for agent-only deployments).
      try {
        const unbound = await unbindSellersFromAgent(id);
        if (unbound > 0) {
          tracing_info(`unbound ${unbound} seller record(s) from ${id}`);
        }
      } catch (e) {
        // Bubble up so the operator sees "marketing failed —
        // delete aborted" instead of a partial state.
        throw new Error(
          `pre-delete unbind failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      await adminCall("nexo/admin/agents/delete", { agent_id: id });
      setConfirmDelete(null);
      setDeleteAffectedSellers(null);
      await reload();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleteBusy(false);
    }
  }

  // No-op placeholder for "tracing" — keeps the call site tidy
  // while the real tracing wire (firehose / console) lives in
  // a sibling milestone. Today it just routes to console.info.
  function tracing_info(msg: string) {
    // eslint-disable-next-line no-console
    console.info(`[agents] ${msg}`);
  }

  // Phase 97 — inline enable/disable handler. Partial upsert: we
  // send empty strings for model.provider/model so daemon-side
  // `upsert_yaml` skips writing them (it gates on
  // `!is_empty()`), and only `active` lands on disk. The reload
  // signal fires from inside agents/upsert → `ConfigReloadCoordinator`
  // hot-spawns (active=true) or hot-removes (active=false) the
  // runtime without restarting the daemon.
  async function toggleActive(id: string, next_active: boolean) {
    setToggleBusy(id);
    setToggleError(null);
    // Optimistic update so the switch flips immediately.
    setAgents((prev) =>
      prev
        ? prev.map((a) => (a.id === id ? { ...a, active: next_active } : a))
        : prev,
    );
    try {
      await adminCall("nexo/admin/agents/upsert", {
        id,
        model: { provider: "", model: "" },
        active: next_active,
      });
      tracing_info(
        `toggled ${id} → ${next_active ? "enabled" : "disabled"} via /m/agents`,
      );
      await reload();
    } catch (e) {
      // Roll back optimistic update on failure so the UI matches
      // what the daemon actually persisted.
      setAgents((prev) =>
        prev
          ? prev.map((a) => (a.id === id ? { ...a, active: !next_active } : a))
          : prev,
      );
      const msg = e instanceof Error ? e.message : String(e);
      setToggleError(`${id}: ${msg}`);
    } finally {
      setToggleBusy(null);
    }
  }

  async function save() {
    if (!draft) return;
    setSaveBusy(true);
    setSaveError(null);
    try {
      // Phase 97.UI — fold the advanced accordion patch alongside
      // the core fields. Each entry in `advanced_patch` is already
      // shaped as the daemon's `AgentUpsertInput` field — strings,
      // string vecs, or opaque JSON values. Missing keys preserve
      // the existing yaml block; explicit `null` clears.
      await adminCall("nexo/admin/agents/upsert", {
        id: draft.id,
        model: draft.model,
        system_prompt: draft.system_prompt,
        language: draft.language,
        allowed_tools: draft.allowed_tools,
        inbound_bindings: draft.inbound_bindings,
        // M15.18.d — only forward heartbeat when the operator
        // touched the toggle in this drawer session. `undefined`
        // makes the daemon skip the write entirely (preserves
        // the existing yaml block).
        heartbeat: draft.heartbeat,
        // Tier 1 + 2 + 3 + 4 capability gates from the accordion.
        // Spread so the typed core fields above stay authoritative.
        ...advanced_patch,
      });
      setEditing(null);
      setDraft(null);
      setAdvancedPatch({});
      await reload();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-surface">
      <header className="bg-panel-alt border-b  px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate("/m/chats")}
            title={t("agents.back_to_chat")}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-base font-medium text-text-primary">
            {t("agents.title")}
          </h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate("/m/chats?wizard=new-agent&step=agent")}
        >
          <Plus size={16} />
          {t("agents.new_agent")}
        </Button>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
        {/* Phase 82.10.s.4 — LLM provider INSTANCES panel.
            Operator runs e.g. minimax-cliente-a + minimax-cliente-b
            with independent api keys (each in the SecretsStore, not
            a shared env var). Agents below pick which instance they
            consume — that's how per-agent token tracking works in
            practice: each agent has its own key + quota. */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-medium text-text-primary">
              {t("agents.section.instances")}
            </h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setLlmCreateOpen(true)}
            >
              <Plus size={14} />
              {t("agents.new_instance")}
            </Button>
          </div>
          {llm_error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800 mb-2">
              {llm_error}
            </div>
          )}
          {llm_instances.length === 0 ? (
            <p className="text-xs text-text-meta">
              {t("agents.no_instances")}
            </p>
          ) : (
            <ul className="bg-white rounded border  divide-y divide-border-DEFAULT text-sm">
              {llm_instances.map((inst) => (
                <li
                  key={`${inst.tenant_scope ?? "global"}.${inst.id}`}
                  className="px-4 py-2 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-text-primary truncate">
                      {inst.id}
                      {inst.tenant_scope && (
                        <span className="ml-2 text-xs text-text-meta">
                          {t("agents.tenant_prefix", {
                            scope: inst.tenant_scope,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-meta font-mono truncate">
                      {inst.api_key_env || t("agents.secret_backed")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        setLlmEditingId(inst.id);
                        setLlmCreateOpen(true);
                      }}
                      title={t("agents.rotate_credentials")}
                    >
                      <Pencil size={14} />
                      {t("agents.edit_button")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => void deleteLlmInstance(inst.id)}
                      disabled={llm_delete_busy === inst.id}
                      title={t("agents.delete_instance")}
                    >
                      {llm_delete_busy === inst.id ? (
                        <Spinner size="md" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      {t("agents.delete_instance_button")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {list_error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 mb-4">
            {list_error}
          </div>
        )}
        {toggle_error && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900 mb-4 flex items-center justify-between gap-3">
            <span>{t("agents.toggle.error", { error: toggle_error })}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setToggleError(null)}
              title="dismiss"
            >
              <X size={14} />
            </Button>
          </div>
        )}
        {agents === null ? (
          <div className="text-text-meta text-sm flex items-center gap-2">
            <Spinner size="md" /> {t("common.loading")}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-text-meta text-sm">
            {t("agents.list.empty")}
          </div>
        ) : (
          <div className="bg-white rounded border  divide-y divide-border-DEFAULT">
            {agents.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between px-4 py-3 ${
                  a.active ? "" : "opacity-60"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text-primary flex items-center gap-2">
                    {/* Phase 97 — inline enable/disable switch.
                        Daemon-side hot-spawn/hot-remove fires off
                        `agents/upsert { active }`; no restart. */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={a.active}
                      aria-label={
                        a.active
                          ? t("agents.toggle.disable_title")
                          : t("agents.toggle.enable_title")
                      }
                      title={
                        a.active
                          ? t("agents.toggle.disable_title")
                          : t("agents.toggle.enable_title")
                      }
                      disabled={toggle_busy === a.id}
                      onClick={() => void toggleActive(a.id, !a.active)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        a.active ? "bg-accent" : "bg-border-DEFAULT"
                      } ${toggle_busy === a.id ? "opacity-50 cursor-wait" : ""}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          a.active ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                    <span className="font-mono">{a.id}</span>
                    {!a.active && (
                      <span className="text-xs text-text-meta px-1.5 py-0.5 rounded bg-panel-alt">
                        {t("agents.inactive")}
                      </span>
                    )}
                    {(() => {
                      const v = sellers_by_agent?.[a.id] ?? [];
                      if (v.length === 0) return null;
                      const names = v
                        .map((x) => `${x.id} <${x.primary_email}>`)
                        .join("\n");
                      return (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            // M15.46 — pre-filter the sellers
                            // tab to only those bound to this
                            // agent. The tab reads the query
                            // param via useUrlState and renders
                            // a "Filtered to <agent>" banner
                            // with a clear-filter affordance.
                            navigate(
                              `/m/marketing/settings/sellers?agent_id=${encodeURIComponent(a.id)}`,
                            )
                          }
                          title={t("agents.sellers_tooltip", { names })}
                        >
                          {v.length === 1
                            ? t("agents.sellers_count_one", { count: v.length })
                            : t("agents.sellers_count_other", {
                                count: v.length,
                              })}
                        </Button>
                      );
                    })()}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">
                    {a.bindings_count === 1
                      ? t("agents.bindings_count_one", {
                          provider: a.model_provider,
                          count: a.bindings_count,
                        })
                      : t("agents.bindings_count_other", {
                          provider: a.model_provider,
                          count: a.bindings_count,
                        })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() =>
                      navigate(`/agents/${encodeURIComponent(a.id)}/workspace`)
                    }
                    title={t("agents.persona_title")}
                  >
                    <BookOpen size={14} />
                    {t("agents.persona_button")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setPairingFor(a.id)}
                    title={t("agents.repair_title")}
                  >
                    <RefreshCcw size={14} />
                    {t("agents.repair_button")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => void openEdit(a.id)}
                  >
                    <Pencil size={14} />
                    {t("agents.edit_button")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={async () => {
                      setConfirmDelete(a.id);
                      // M15.42 — pre-flight: fetch the count of
                      // sellers bound to this agent so the
                      // confirm modal surfaces the cascade.
                      // Marketing unreachable → empty list +
                      // banner stays neutral.
                      setDeleteAffectedSellers(null);
                      const affected = await listSellersBoundToAgent(a.id);
                      setDeleteAffectedSellers(affected);
                    }}
                    title={t("agents.delete_title")}
                  >
                    <Trash2 size={14} />
                    {t("agents.delete_button")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {pairing_for && (
        <PairingModal
          agent_id={pairing_for}
          onClose={() => setPairingFor(null)}
          onLinked={() => {
            setPairingFor(null);
            void reload();
          }}
        />
      )}

      {llm_create_open && (
        <LlmInstanceCreateModal
          existing_ids={llm_instances
            .filter((i) => i.id !== llm_editing_id)
            .map((i) => i.id)}
          {...(llm_editing_id !== null ? { editing_id: llm_editing_id } : {})}
          onClose={() => {
            setLlmCreateOpen(false);
            setLlmEditingId(null);
          }}
          onCreated={() => {
            setLlmCreateOpen(false);
            setLlmEditingId(null);
            void reload_llm_instances();
          }}
        />
      )}

      {confirm_delete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b ">
              <h2 className="text-base font-medium text-text-primary">
                {t("agents.delete.confirm_heading", {
                  id: confirm_delete,
                })}
              </h2>
            </div>
            <div className="px-5 py-4 text-sm text-text-secondary space-y-2">
              <p>{t("agents.delete.body")}</p>
              <p className="text-xs text-text-meta">
                {t("agents.delete.warning")}
              </p>
              {/* M15.42 — cascade preview: sellers bound to
                  this agent will be unbound BEFORE the daemon
                  delete fires. Marketing unreachable → null;
                  empty array → no banner; non-empty → amber. */}
              {delete_affected_sellers === null ? (
                <p className="text-[11px] text-text-meta">
                  {t("agents.delete.checking_sellers")}
                </p>
              ) : delete_affected_sellers.length > 0 ? (
                <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                  <p className="font-medium">
                    {delete_affected_sellers.length === 1
                      ? t("agents.delete.affected_one", {
                          count: delete_affected_sellers.length,
                        })
                      : t("agents.delete.affected_other", {
                          count: delete_affected_sellers.length,
                        })}
                  </p>
                  <ul className="mt-1 ml-3 list-disc">
                    {delete_affected_sellers.map((v) => (
                      <li key={v.id} className="font-mono">
                        {v.id}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1">{t("agents.delete.cascade_note")}</p>
                </div>
              ) : null}
              {delete_error && (
                <div className="bg-red-50 border border-red-200 rounded p-2 text-red-800">
                  {delete_error}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t ">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirmDelete(null);
                  setDeleteError(null);
                }}
                disabled={delete_busy}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void deleteAgent(confirm_delete)}
                disabled={delete_busy}
              >
                {delete_busy ? <Spinner size="md" /> : <Trash2 size={14} />}
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editing && draft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b ">
              <h2 className="text-base font-medium text-text-primary">
                {t("agents.edit.title", { id: editing.id })}
              </h2>
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                  setSaveError(null);
                }}
                aria-label={t("common.close")}
              >
                <X size={18} />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
              {/* Instance selector — pick from configured LLM instances.
                  Each instance already owns its API key, base_url and
                  factory type. The operator only picks instance + model. */}
              <Field label={t("agents.edit.field_instance")}>
                {llm_instances.length === 0 ? (
                  <p className="text-xs text-text-meta">
                    {t("agents.edit.no_instances")}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {llm_instances.map((inst) => {
                      const selected = draft.model.provider === inst.id;
                      const select = () => {
                        if (selected) return;
                        const cached = loadInstanceModels()[inst.id];
                        const resolved =
                          cached?.model ?? defaultModelForInstance(inst.id);
                        void load_live_models(inst.id);
                        setDraft({
                          ...draft,
                          model: {
                            provider: inst.id,
                            model: resolved ?? draft.model.model,
                          },
                        });
                      };
                      return (
                        <li
                          key={inst.id}
                          className={`flex items-center gap-3 border rounded px-3 py-2 ${
                            selected
                              ? "border-accent bg-accent/5"
                              : " hover:bg-panel-hover"
                          }`}
                        >
                          <input
                            type="radio"
                            id={`llm-inst-${inst.id}`}
                            name="llm-instance"
                            checked={selected}
                            onChange={select}
                            className="accent-accent"
                          />
                          <label
                            htmlFor={`llm-inst-${inst.id}`}
                            className="flex-1 min-w-0 text-left cursor-pointer"
                          >
                            <span className="block text-sm font-mono text-text-primary">
                              {inst.id}
                              {inst.tenant_scope
                                ? t("wizard.llm.tenant_suffix", {
                                    tenant: inst.tenant_scope,
                                  })
                                : ""}
                            </span>
                            <span className="block text-xs text-text-meta font-mono truncate">
                              {inst.base_url || inst.api_key_env}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Field>
              {draft.model.provider && (
                <Field label={t("agents.edit.field_model")}>
                  <Select
                    value={draft.model.model}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        model: { ...draft.model, model: e.target.value },
                      })
                    }
                    className="w-full border rounded px-3 py-2 text-sm bg-white"
                    disabled={
                      modelsForInstance(draft.model.provider).length === 0
                    }
                  >
                    {modelsForInstance(draft.model.provider).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    {!modelsForInstance(draft.model.provider).includes(
                      draft.model.model,
                    ) &&
                      draft.model.model && (
                        <option value={draft.model.model}>
                          {t("agents.edit.model_uncatalogued", {
                            model: draft.model.model,
                          })}
                        </option>
                      )}
                  </Select>
                  {(() => {
                    const live = live_by_instance.get(draft.model.provider);
                    if (!live) {
                      return null;
                    }
                    if (live.error) {
                      return null;
                    }
                    if (live.names && live.names.length > 0) {
                      return (
                        <p className="text-xs text-emerald-700 mt-1">
                          {t("agents.edit.live_models", {
                            count: live.names.length,
                          })}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </Field>
              )}
              <Field label={t("agents.edit.field_language")}>
                <Select
                  value={draft.language ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) setDraft({ ...draft, language: v });
                    else {
                      const { language: _drop, ...rest } = draft;
                      setDraft(rest as AgentDetail);
                    }
                  }}
                  className="w-full border rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="">{t("agents.edit.language_auto")}</option>
                  {Array.from(groupLocales().entries()).map(
                    ([group, locales]) => (
                      <optgroup key={group} label={group}>
                        {locales.map((loc) => (
                          <option key={loc.code} value={loc.code}>
                            {loc.label}
                          </option>
                        ))}
                      </optgroup>
                    ),
                  )}
                </Select>
                <p className="mt-1 text-xs text-gray-500">
                  {t("agents.edit.locale_help_prefix")}
                  <Code>es-AR</Code>
                  {t("agents.edit.locale_help_es_ar")}
                  <Code>es-ES</Code>
                  {t("agents.edit.locale_help_es_es")}
                  <Code>en-GB</Code>
                  {t("agents.edit.locale_help_en_gb")}
                </p>
              </Field>
              <Field label={t("agents.edit.field_system_prompt")}>
                <Textarea
                  rows={10}
                  value={draft.system_prompt}
                  onChange={(e) =>
                    setDraft({ ...draft, system_prompt: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2 text-sm leading-relaxed font-mono"
                />
                <span className="block text-xs text-text-meta mt-1">
                  {draft.system_prompt.length}/10000
                </span>
              </Field>
              {/* M15.18.d — proactive tick-loop. The toggle defaults
                  off (mirrors the framework default for back-compat
                  agents). When on, the agent fires `on_heartbeat`
                  on the chosen interval — used for proactive
                  reminders, drip campaigns, external-state polling. */}
              <HeartbeatField
                value={draft.heartbeat}
                onChange={(hb) => setDraft({ ...draft, heartbeat: hb })}
              />
              {(() => {
                // M15.54 / F13 — split bindings into marketing
                // (editable) + non-marketing (read-only). Marketing
                // section always renders so the operator has a
                // "+ Vincular seller" widget even when zero sellers
                // are bound. Non-marketing stays read-only — those
                // are channel bindings (whatsapp / telegram /
                // future) owned by their own forms.
                const marketing_bindings = draft.inbound_bindings.filter(
                  (b) => b.plugin === "marketing",
                );
                const other_bindings = draft.inbound_bindings.filter(
                  (b) => b.plugin !== "marketing",
                );
                return (
                  <>
                    <div>
                      <span className="block text-xs font-medium text-text-secondary mb-1">
                        {t("agents.edit.email_sellers")}
                      </span>
                      <div className="text-xs text-text-secondary bg-panel-alt rounded px-3 py-2 space-y-2">
                        {marketing_bindings.length === 0 ? (
                          <p className="text-text-meta italic">
                            {t("agents.edit.no_sellers_bound")}
                          </p>
                        ) : (
                          <ul className="space-y-1">
                            {marketing_bindings.map((b, i) => (
                              <li
                                key={`m-${i}-${b.instance ?? ""}`}
                                className="flex items-center gap-2"
                              >
                                <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-800">
                                  {t("agents.edit.via_seller")}
                                </span>
                                <Button
                                  variant="secondary"
                                  size="md"
                                  onClick={() =>
                                    navigate(
                                      `/m/marketing/settings/sellers?agent_id=${encodeURIComponent(draft.id)}`,
                                    )
                                  }
                                  title={t("agents.edit.open_seller_title")}
                                >
                                  {b.instance ?? t("agents.edit.unbound_label")}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    if (!b.instance) return;
                                    void unbind_seller(b.instance, draft.id);
                                  }}
                                  disabled={
                                    bindings_busy || b.instance === undefined
                                  }
                                  title={t("agents.edit.unbind_title")}
                                >
                                  {t("agents.edit.unbind")}
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {(() => {
                          // Sellers available to bind: every seller
                          // not yet bound to THIS agent. Sellers
                          // bound to other agents are still
                          // pickable — picking them moves the
                          // binding (the reconciler drops the old
                          // agent's marketing entry on next save).
                          const bound_here = new Set(
                            marketing_bindings
                              .map((b) => b.instance)
                              .filter((x): x is string => Boolean(x)),
                          );
                          const candidates = (all_sellers ?? []).filter(
                            (s) => !bound_here.has(s.id),
                          );
                          if (all_sellers === null) {
                            return (
                              <p className="text-text-meta italic">
                                {t("agents.edit.loading_sellers")}
                              </p>
                            );
                          }
                          if (candidates.length === 0) {
                            return (
                              <p className="text-text-meta italic">
                                {t("agents.edit.all_bound")}
                              </p>
                            );
                          }
                          return (
                            <div className="flex items-center gap-2 pt-1 border-t /60">
                              <Select
                                value={bind_pick}
                                onChange={(e) => setBindPick(e.target.value)}
                                disabled={bindings_busy}
                                className="flex-1 border rounded px-2 py-1 text-xs bg-white"
                              >
                                <option value="">
                                  {t("agents.edit.bind_pick_placeholder")}
                                </option>
                                {candidates.map((s) => {
                                  const other = (s as { agent_id?: string })
                                    .agent_id;
                                  const label = other
                                    ? t("agents.edit.bind_move_label", {
                                        seller: s.id,
                                        agent: other,
                                      })
                                    : s.id;
                                  return (
                                    <option key={s.id} value={s.id}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </Select>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  if (!bind_pick) return;
                                  void bind_seller(bind_pick, draft.id);
                                }}
                                disabled={bindings_busy || !bind_pick}
                              >
                                {bindings_busy
                                  ? t("agents.edit.bind_busy")
                                  : t("agents.edit.bind_button")}
                              </Button>
                            </div>
                          );
                        })()}
                        {bindings_error && (
                          <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                            {bindings_error}
                          </p>
                        )}
                      </div>
                    </div>
                    {other_bindings.length > 0 && (
                      <div>
                        <span className="block text-xs font-medium text-text-secondary mb-1">
                          {t("agents.edit.other_bindings")}
                        </span>
                        <ul className="text-xs text-text-secondary bg-panel-alt rounded px-3 py-2 space-y-1">
                          {other_bindings.map((b, i) => (
                            <li key={`o-${i}`} className="font-mono">
                              {b.plugin}
                              {b.instance ? ` · ${b.instance}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                );
              })()}
              {/* Phase 97.UI — accordion with the long-tail capability
                  gates: tenant_id, plugins, allowed_delegates,
                  config_tool, team, repl, proactive, lsp,
                  dispatch_policy, rate limits, remote_triggers,
                  workspace_git, outbound_allowlist, credentials… */}
              <AgentAdvancedFields
                rawConfig={
                  (draft.raw_config as Record<string, unknown> | undefined) ?? {}
                }
                patch={advanced_patch}
                onPatch={setAdvancedPatch}
              />
              {save_error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                  {save_error}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t ">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDraft(null);
                  setSaveError(null);
                  setAdvancedPatch({});
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => void save()}
                disabled={save_busy}
              >
                {save_busy ? <Spinner size="md" /> : <Save size={14} />}
                {t("common.save")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
