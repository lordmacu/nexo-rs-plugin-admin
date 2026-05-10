// Phase 82.10.u — wizard step 1. List the LLM provider instances
// already configured (`nexo/admin/llm_providers/list`) and let
// the operator pick one. If none exist, surface the
// `LlmInstanceCreateModal` so the operator can create one without
// leaving the wizard.
//
// Pre-82.10.u this step asked for the api_key directly. Now keys
// live inside instances (Phase 82.10.s onwards), so the wizard
// just selects one — no key entry, no probe.

import { useEffect, useState } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { adminCall } from "../../api/admin";
import { useLlmCatalog } from "../../lib/llmCatalog";
import { useWizard } from "../../store/wizard";
import LlmInstanceCreateModal from "../../modules/agents/LlmInstanceCreateModal";
import { Button } from "../ui";
import { useT } from "../../i18n";

// Per-instance metadata captured at creation time. The daemon's
// `LlmProviderSummary` carries id + base_url + api_key_env but
// not factory_type or model — both are operator-picked in the
// modal flow. We persist them locally so a follow-up
// `selectInstance` can stamp `agent.model_id` correctly (so an
// Anthropic instance never inherits the wizard's MiniMax-M2.5
// default and silently 400s the LLM call). Cleared when the
// browser cache is cleared; pre-existing instances created
// before this version stay on whatever default was active when
// the operator first hit the wizard — limitation accepted; the
// fix scopes to the create+pair-in-one-flow path which is what
// the agent-creator wizard actually does.
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

function rememberInstanceModel(
  id: string,
  factory: string,
  model: string,
): void {
  try {
    const map = loadInstanceModels();
    map[id] = { factory, model };
    localStorage.setItem(INSTANCE_MODELS_KEY, JSON.stringify(map));
  } catch {
    // localStorage disabled — operator will see fallback model
    // in StepAgent; daemon-side validation catches the mismatch
    // either way.
  }
}

interface StepLlmProps {
  onContinue: () => void;
}

interface InstanceRow {
  id: string;
  base_url: string;
  api_key_env: string;
  tenant_scope?: string;
}

export default function StepLlm({ onContinue }: StepLlmProps) {
  const t = useT();
  const llm = useWizard((s) => s.llm);
  const updateLlm = useWizard((s) => s.updateLlm);
  const updateAgent = useWizard((s) => s.updateAgent);

  const [instances, setInstances] = useState<InstanceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Catalog feeds the heuristic that recovers the right model
  // for an existing instance whose factory we can guess from the
  // id prefix (e.g. `anthropic-eb7e` → factory `anthropic` →
  // `claude-opus-4-7`). Without this fallback, picking an
  // existing Anthropic instance leaves `agent.model_id` at the
  // wizard store's MiniMax-M2.5 default and the LLM call 400s.
  const catalog_load = useLlmCatalog((s) => s.load);
  const catalog = useLlmCatalog((s) => s.entries);
  useEffect(() => {
    void catalog_load();
  }, [catalog_load]);

  function defaultModelForInstance(instance_id: string): string | null {
    if (!catalog || catalog.length === 0) return null;
    // Prefer factory whose id is a literal prefix of the instance id
    // (created via the wizard modal which slugs as `<factory>-<hex>`).
    const sorted = [...catalog].sort((a, b) => b.id.length - a.id.length);
    const match = sorted.find(
      (c) => instance_id === c.id || instance_id.startsWith(`${c.id}-`),
    );
    return match?.models[0] ?? null;
  }

  async function reload() {
    setError(null);
    try {
      const res = await adminCall<{ providers: InstanceRow[] }>(
        "nexo/admin/llm_providers/list",
        {},
      );
      setInstances(res.providers);
      // Snap onto the first instance when the persisted draft is
      // stale (or never set) and at least one exists. We can't
      // call selectInstance() here — `setInstances` is async, so
      // the lookup-by-id inside selectInstance would miss. Inline
      // the same logic against the freshly-fetched array.
      if (res.providers.length > 0) {
        const matched = res.providers.find((i) => i.id === llm.provider_id);
        if (!matched) {
          const first = res.providers[0];
          if (first) {
            updateLlm({
              provider_id: first.id,
              base_url: first.base_url,
              api_key_env: first.api_key_env,
              probed_ok: true,
              saved: false,
            });
            const cached = loadInstanceModels()[first.id];
            const resolved_model =
              cached?.model ?? defaultModelForInstance(first.id);
            const patch: Partial<{
              model_provider: string;
              model_id: string;
            }> = { model_provider: first.id };
            if (resolved_model) patch.model_id = resolved_model;
            updateAgent(patch);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setInstances([]);
    }
  }

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectInstance(id: string) {
    const inst = instances?.find((i) => i.id === id);
    if (!inst) return;
    updateLlm({
      provider_id: inst.id,
      base_url: inst.base_url,
      api_key_env: inst.api_key_env,
      probed_ok: true,
      saved: false,
    });
    // Bind the agent draft to the selected instance and pick a
    // valid model. Three fallbacks in priority order:
    //   1. localStorage cache from a fresh modal creation.
    //   2. Catalog lookup via factory-id-prefix heuristic
    //      (covers existing instances + new browser sessions).
    //   3. Leave model_id alone (operator picks manually).
    // Without this, an Anthropic instance kept the wizard
    // store's MiniMax-M2.5 default and the LLM call 400s.
    const cached = loadInstanceModels()[id];
    const patch: Partial<{ model_provider: string; model_id: string }> = {
      model_provider: inst.id,
    };
    const resolved_model = cached?.model ?? defaultModelForInstance(id);
    if (resolved_model) patch.model_id = resolved_model;
    updateAgent(patch);
  }

  async function deleteInstance(id: string) {
    if (!confirm(t("wizard.llm.delete_confirm", { id }))) return;
    setError(null);
    try {
      await adminCall("nexo/admin/llm_providers/delete", { provider_id: id });
      // If the operator killed the currently-selected one, the
      // reload() snap-onto-first logic re-binds the wizard draft.
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function persistAndContinue() {
    // Instance already exists — its secret_id reference owns the
    // api_key on the daemon side. Selecting it is enough; the
    // wizard just stamps `saved: true` and advances. No legacy
    // `/api/onboarding/llm/save` call (that route writes a
    // cleartext key, which we no longer have).
    setSaving(true);
    try {
      updateLlm({ saved: true });
      onContinue();
    } finally {
      setSaving(false);
    }
  }

  const has_instances = (instances?.length ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          {t("wizard.llm.title")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("wizard.llm.subtitle")}
        </p>
      </div>

      {!has_instances && instances !== null && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 space-y-2">
          <p className="text-sm text-amber-900">{t("wizard.llm.empty")}</p>
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus size={14} /> {t("wizard.llm.create_first")}
          </Button>
        </div>
      )}

      {has_instances && (
        <Field label={t("wizard.llm.field_instance")}>
          <ul className="space-y-1.5">
            {(instances ?? []).map((i) => {
              const selected = llm.provider_id === i.id;
              return (
                <li
                  key={i.id}
                  className={`flex items-center gap-3 border rounded px-3 py-2 ${
                    selected
                      ? "border-accent bg-accent/5"
                      : " hover:bg-panel-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name="llm-instance"
                    checked={selected}
                    onChange={() => selectInstance(i.id)}
                    className="accent-accent"
                  />
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => selectInstance(i.id)}
                  >
                    <span className="block text-sm font-mono text-text-primary">
                      {i.id}
                      {i.tenant_scope
                        ? t("wizard.llm.tenant_suffix", {
                            tenant: i.tenant_scope,
                          })
                        : ""}
                    </span>
                    <span className="block text-xs text-text-meta font-mono">
                      {i.base_url}
                    </span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => void deleteInstance(i.id)}
                    title={t("wizard.llm.delete_title")}
                  >
                    <Trash2 size={14} />
                  </Button>
                </li>
              );
            })}
          </ul>
        </Field>
      )}

      {has_instances && (
        <Button variant="secondary" size="md" onClick={() => setCreating(true)}>
          <Plus size={14} /> {t("wizard.llm.create_more")}
        </Button>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {has_instances && (
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => void persistAndContinue()}
            disabled={saving || !llm.provider_id}
          >
            <CheckCircle2 size={16} />
            {saving ? t("wizard.llm.saving") : t("wizard.llm.continue")}
          </Button>
        </div>
      )}

      {creating && (
        <LlmInstanceCreateModal
          existing_ids={(instances ?? []).map((i) => i.id)}
          onClose={() => setCreating(false)}
          onCreated={(id, factory, model) => {
            // Persist what the operator picked so a later
            // selectInstance() can re-stamp `agent.model_id`
            // from this cache (the daemon's instance summary
            // doesn't echo factory/model back).
            rememberInstanceModel(id, factory, model);
            setCreating(false);
            void reload().then(() => {
              selectInstance(id);
            });
          }}
        />
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
