// Phase 82.10.u — schema-driven wizard state machine for creating
// an LLM provider instance. Reads `credential_schema` from the
// catalog and renders one input per descriptor; gates each step
// on the previous one (no key persisted before validate=ok). Falls
// back to the legacy single-api_key UI when the catalog entry has
// no schema (pre-82.10.u daemons).
//
// State flow:
//   factory_pick → fill_credentials → validate → pick_model → saving → done
//                       ↓                  ↑
//                    oauth (auth_code/device_code)
//
// Wires:
//   nexo/admin/llm_providers/probe_draft → live model list
//   nexo/admin/llm_providers/oauth_start  → PKCE session
//   nexo/admin/llm_providers/oauth_finish → bundle + secret_id
//   nexo/admin/llm_providers/upsert       → persist (legacy or
//                                            schema-driven `fields`)

import { Plus, X, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminCall } from "../../api/admin";
import {
  useLlmCatalog,
  type AuthMode,
  type LlmCatalogEntry,
} from "../../lib/llmCatalog";
import { useOAuthFlow } from "../../lib/oauthFlow";
import { CredentialFieldRenderer } from "./CredentialFieldRenderer";
import { OAuthPane } from "./OAuthPane";
import { Button, Input, Select, Spinner } from "../../components/ui";
import { useT } from "../../i18n";
import type { CatalogKey } from "../../i18n";

const ID_RE = /^[a-z][a-z0-9-]{1,40}$/;

// Auto-generate `<factory>-<4 hex>` and re-roll on collision
// against `existing`. Operators rarely care about the exact
// instance id (they pick from a list later), so taking the
// human-friendly factory prefix + random suffix keeps the slug
// short, valid against ID_RE, and unique without manual entry.
function generateInstanceId(factoryId: string, existing: string[]): string {
  const taken = new Set(existing);
  for (let attempt = 0; attempt < 32; attempt++) {
    const buf = new Uint8Array(2);
    crypto.getRandomValues(buf);
    const suffix = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    const id = `${factoryId}-${suffix}`;
    if (!taken.has(id) && ID_RE.test(id)) return id;
  }
  return `${factoryId}-${Date.now().toString(36)}`;
}

interface ProbeDraftResponse {
  ok: boolean;
  status: number;
  latency_ms: number;
  model_count?: number;
  model_names?: string[];
  error?: string;
}

type WizardStage =
  | { kind: "factory_pick" }
  | { kind: "fill_credentials" }
  | { kind: "oauth" }
  | { kind: "validating" }
  | { kind: "validation_failed"; message: string }
  | { kind: "pick_model"; model_names: string[] }
  | { kind: "saving" };

interface Props {
  existing_ids: string[];
  onClose: () => void;
  /** Fired after the upsert lands. Carries the selected
   *  factory_type + model_id so the wizard can stamp them onto
   *  the agent draft (the daemon's `LlmProviderSummary` doesn't
   *  echo factory/model back, so we must thread them through
   *  this callback to avoid a stale `MiniMax-M2.5` default
   *  shipping with an Anthropic instance). */
  onCreated: (
    instance_id: string,
    factory_id: string,
    model_id: string,
  ) => void;
  /** When set, the modal opens against an existing instance:
   *  the slug is locked to this id (skip auto-generate), and the
   *  upsert at the end of the flow replaces the row. The caller
   *  is expected to have removed `editing_id` from `existing_ids`
   *  so the duplicate-id check passes. */
  editing_id?: string;
  /** Optional pre-selected factory for edit mode so the operator
   *  doesn't have to re-pick the provider. The flow still walks
   *  through fill_credentials → validate → pick_model → save. */
  editing_factory?: string;
}

export default function LlmInstanceCreateModal({
  existing_ids,
  onClose,
  onCreated,
  editing_id,
  editing_factory,
}: Props) {
  const t = useT();
  const catalog = useLlmCatalog((s) => s.entries);
  const load_catalog = useLlmCatalog((s) => s.load);
  const oauth_state = useOAuthFlow((s) => s.state);
  const oauth_start = useOAuthFlow((s) => s.start);
  const oauth_reset = useOAuthFlow((s) => s.reset);

  useEffect(() => {
    void load_catalog();
  }, [load_catalog]);

  const [stage, setStage] = useState<WizardStage>({ kind: "factory_pick" });
  const [factory_id, setFactoryId] = useState<string>("");
  const [instance_id, setInstanceId] = useState<string>("");
  const [base_url, setBaseUrl] = useState<string>("");
  const [auth_mode, setAuthMode] = useState<AuthMode>("api_key");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [model, setModel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const factory: LlmCatalogEntry | undefined = useMemo(
    () => catalog?.find((c) => c.id === factory_id),
    [catalog, factory_id],
  );

  // Default factory + base_url + auth_mode + auto-gen instance_id
  // on catalog load. In edit mode we use the supplied id +
  // factory verbatim; the operator just rotates credentials.
  useEffect(() => {
    if (!catalog || catalog.length === 0) return;
    if (factory_id === "") {
      const target = editing_factory
        ? (catalog.find((c) => c.id === editing_factory) ?? catalog[0])
        : catalog[0];
      if (target) {
        setFactoryId(target.id);
        setBaseUrl(target.base_url);
        setAuthMode(target.supported_auth_modes[0] ?? "api_key");
        setInstanceId(
          editing_id ?? generateInstanceId(target.id, existing_ids),
        );
      }
    }
  }, [catalog, factory_id, existing_ids, editing_id, editing_factory]);

  function selectFactory(id: string) {
    const entry = catalog?.find((c) => c.id === id);
    setFactoryId(id);
    if (entry) {
      setBaseUrl(entry.base_url);
      setAuthMode(entry.supported_auth_modes[0] ?? "api_key");
      setFields({});
      setError(null);
      // Lock the slug across factory swaps in edit mode so the
      // upsert keeps targeting the same yaml block.
      if (!editing_id) {
        setInstanceId(generateInstanceId(id, existing_ids));
      }
    }
  }

  const id_problem = useMemo<string | null>(() => {
    if (instance_id.length === 0) return null;
    if (!ID_RE.test(instance_id)) return t("agents.llm_modal.id_problem_format");
    if (existing_ids.includes(instance_id))
      return t("agents.llm_modal.id_problem_dup", { id: instance_id });
    return null;
  }, [instance_id, existing_ids, t]);

  const can_advance_factory =
    factory_id !== "" &&
    instance_id !== "" &&
    id_problem === null &&
    base_url !== "";

  // Schema-driven path — factory has declared a schema.
  const has_schema = (factory?.credential_schema.length ?? 0) > 0;

  // Whether the operator has filled every required + active field.
  const credentials_complete = useMemo(() => {
    if (!has_schema) return (fields["api_key"] ?? "").trim().length > 0;
    if (!factory) return false;
    for (const d of factory.credential_schema) {
      const dep_satisfied = !d.depends_on
        ? true
        : d.depends_on.any_of.includes(fields[d.depends_on.field] ?? "");
      if (d.required && dep_satisfied) {
        const v = (fields[d.name] ?? "").trim();
        if (!v) return false;
      }
    }
    return true;
  }, [factory, fields, has_schema]);

  const is_oauth_mode =
    auth_mode === "oauth_auth_code" || auth_mode === "oauth_device_code";

  // ── Step transitions ────────────────────────────────────────

  async function validate() {
    if (!factory) return;
    setError(null);
    setStage({ kind: "validating" });

    // Anthropic + factories with supports_models_probe=false:
    // skip live probe, jump straight to the static catalog list.
    if (!factory.supports_models_probe) {
      setStage({ kind: "pick_model", model_names: factory.models });
      setModel(factory.models[0] ?? "");
      return;
    }

    try {
      const resp = await adminCall<ProbeDraftResponse>(
        "nexo/admin/llm_providers/probe_draft",
        {
          factory_type: factory_id,
          base_url,
          auth_mode,
          fields,
        },
      );
      if (resp.ok && (resp.model_names?.length ?? 0) > 0) {
        const names = resp.model_names ?? [];
        setStage({ kind: "pick_model", model_names: names });
        setModel(names[0] ?? "");
      } else if (resp.ok) {
        // Probe ok but no models — fall back to the static catalog.
        const fallback = factory.models;
        setStage({ kind: "pick_model", model_names: fallback });
        setModel(fallback[0] ?? "");
      } else {
        setStage({
          kind: "validation_failed",
          message: resp.error ?? `HTTP ${resp.status}`,
        });
      }
    } catch (e) {
      setStage({
        kind: "validation_failed",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  async function save() {
    setStage({ kind: "saving" });
    setError(null);
    try {
      const params: Record<string, unknown> = {
        id: instance_id,
        factory_type: factory_id,
        base_url,
      };
      if (has_schema) {
        params.auth_mode = auth_mode;
        // Strip the oauth_bundle_secret_id tracking key — it was
        // stamped by oauthSucceeded() to track which bundle the
        // operator authorised, but the daemon's `oauth_finish`
        // already persisted the bundle path on yaml and the
        // schema doesn't declare a `oauth_bundle_secret_id`
        // field. Sending it triggers UNKNOWN_FIELD.
        const { oauth_bundle_secret_id: _bundle, ...rest } = fields;
        void _bundle;
        params.fields = rest;
      } else {
        // Legacy back-compat — pre-82.10.u factories.
        params.api_key_secret_value = fields["api_key"] ?? "";
      }
      await adminCall("nexo/admin/llm_providers/upsert", params);
      onCreated(instance_id, factory_id, model);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage({ kind: "fill_credentials" });
    }
  }

  // OAuth: when auth_mode flips to OAuth, the operator can't fill
  // a manual `api_key` field — instead they click "Iniciar OAuth"
  // which transitions to the oauth pane. Success returns a
  // `secret_id` that we splat into fields.
  function startOAuth() {
    if (!is_oauth_mode) return;
    setStage({ kind: "oauth" });
    void oauth_start(factory_id, auth_mode);
  }

  function oauthSucceeded(secret_id: string) {
    // Stamp the bundle reference into the schema-driven fields so
    // `upsert` lands the yaml `auth.bundle` reference cleanly.
    // The handler also persisted yaml `auth.mode = oauth_bundle` +
    // `auth.bundle = <path>` already in `oauth_finish`; the
    // subsequent upsert just needs the operator's chosen instance
    // metadata (base_url, model, etc).
    setFields((f) => ({ ...f, oauth_bundle_secret_id: secret_id }));
    oauth_reset();
    // OAuth flows always advance straight to the model picker —
    // probe_draft for OAuth is short-circuited daemon-side (the
    // bundle isn't in `fields`, only its `secret_id`), so there's
    // nothing more to validate at draft time. Falling back to
    // `factory.models` (the static catalog) gives the operator a
    // safe default; after upsert lands, the wizard can re-probe
    // via `nexo/admin/llm_providers/probe` against the persisted
    // instance for a tier-filtered live list.
    if (factory) {
      const fallback = factory.models;
      setStage({ kind: "pick_model", model_names: fallback });
      setModel(fallback[0] ?? "");
    } else {
      setStage({ kind: "fill_credentials" });
    }
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3 border-b ">
          <h2 className="text-base font-medium text-text-primary flex items-center gap-2">
            <Plus size={16} /> {t("agents.llm_modal.title")}
          </h2>
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={18} />
          </Button>
        </div>

        <StageBreadcrumb stage={stage} />

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {stage.kind === "factory_pick" && (
            <FactoryPickStep
              catalog={catalog}
              factory_id={factory_id}
              onSelectFactory={selectFactory}
            />
          )}

          {stage.kind === "fill_credentials" && factory && (
            <FillCredentialsStep
              factory={factory}
              auth_mode={auth_mode}
              fields={fields}
              is_oauth_mode={is_oauth_mode}
              onAuthMode={setAuthMode}
              onFields={setFields}
              onStartOAuth={startOAuth}
            />
          )}

          {stage.kind === "oauth" && (
            <OAuthPane
              instance_id={instance_id}
              onSuccess={oauthSucceeded}
              onCancel={() => {
                oauth_reset();
                setStage({ kind: "fill_credentials" });
              }}
            />
          )}

          {stage.kind === "validating" && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Spinner size="md" />
              {t("agents.llm_modal.validating")}
            </div>
          )}

          {stage.kind === "validation_failed" && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
              <div className="font-medium mb-1">
                {t("agents.llm_modal.validation_failed")}
              </div>
              <div className="text-xs font-mono break-words">
                {stage.message}
              </div>
              <p className="text-xs mt-2">
                {t("agents.llm_modal.validation_help")}
              </p>
            </div>
          )}

          {stage.kind === "pick_model" && (
            <PickModelStep
              model_names={stage.model_names}
              live={
                factory?.supports_models_probe === true &&
                stage.model_names.length > 0
              }
              model={model}
              onModel={setModel}
            />
          )}

          {stage.kind === "saving" && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Spinner size="md" />
              {t("agents.llm_modal.saving")}
            </div>
          )}

          {error && stage.kind !== "validation_failed" && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <Footer
          stage={stage}
          can_advance_factory={can_advance_factory}
          credentials_complete={credentials_complete}
          is_oauth_mode={is_oauth_mode}
          oauth_state_kind={oauth_state.kind}
          model={model}
          onCancel={onClose}
          onBack={() => {
            if (stage.kind === "fill_credentials")
              setStage({ kind: "factory_pick" });
            else if (
              stage.kind === "validation_failed" ||
              stage.kind === "pick_model"
            )
              setStage({ kind: "fill_credentials" });
          }}
          onAdvance={() => {
            if (stage.kind === "factory_pick") {
              setStage({ kind: "fill_credentials" });
            } else if (stage.kind === "fill_credentials") {
              if (is_oauth_mode) startOAuth();
              else void validate();
            } else if (stage.kind === "validation_failed") {
              setStage({ kind: "fill_credentials" });
            } else if (stage.kind === "pick_model") {
              void save();
            }
          }}
        />
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function StageBreadcrumb({ stage }: { stage: WizardStage }) {
  const t = useT();
  const steps: Array<[string, CatalogKey]> = [
    ["factory_pick", "agents.llm_modal.step_factory"],
    ["fill_credentials", "agents.llm_modal.step_credentials"],
    ["pick_model", "agents.llm_modal.step_model"],
  ];
  const current_idx = (() => {
    if (stage.kind === "factory_pick") return 0;
    if (
      stage.kind === "fill_credentials" ||
      stage.kind === "oauth" ||
      stage.kind === "validating" ||
      stage.kind === "validation_failed"
    )
      return 1;
    if (stage.kind === "pick_model" || stage.kind === "saving") return 2;
    return 0;
  })();
  return (
    <div className="flex items-center justify-between px-5 py-2 bg-gray-50 border-b  text-xs">
      {steps.map(([key, label_key], idx) => {
        const done = idx < current_idx;
        const active = idx === current_idx;
        return (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                done
                  ? "bg-accent text-white"
                  : active
                    ? "bg-accent/20 text-accent font-bold"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {done ? <Check size={12} /> : idx + 1}
            </div>
            <span
              className={
                active ? "font-medium text-text-primary" : "text-text-secondary"
              }
            >
              {t(label_key)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function FactoryPickStep({
  catalog,
  factory_id,
  onSelectFactory,
}: {
  catalog: LlmCatalogEntry[] | null;
  factory_id: string;
  onSelectFactory: (id: string) => void;
}) {
  const t = useT();
  return (
    <>
      <p className="text-xs text-text-secondary">
        {t("agents.llm_modal.factory_intro")}
      </p>
      <Field label={t("agents.llm_modal.field_factory")}>
        <Select
          value={factory_id}
          onChange={(e) => onSelectFactory(e.target.value)}
          disabled={!catalog || catalog.length === 0}
          className="w-full border rounded px-3 py-2 text-sm bg-white"
        >
          {(catalog ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

function FillCredentialsStep({
  factory,
  auth_mode,
  fields,
  is_oauth_mode,
  onAuthMode,
  onFields,
  onStartOAuth,
}: {
  factory: LlmCatalogEntry;
  auth_mode: AuthMode;
  fields: Record<string, string>;
  is_oauth_mode: boolean;
  onAuthMode: (m: AuthMode) => void;
  onFields: (f: Record<string, string>) => void;
  onStartOAuth: () => void;
}) {
  const t = useT();
  const has_schema = factory.credential_schema.length > 0;
  const multi_auth = factory.supported_auth_modes.length > 1;

  return (
    <>
      {multi_auth && (
        <Field label={t("agents.llm_modal.field_auth_mode")}>
          <Select
            value={auth_mode}
            onChange={(e) => onAuthMode(e.target.value as AuthMode)}
            className="w-full border rounded px-3 py-2 text-sm bg-white"
          >
            {factory.supported_auth_modes.map((m) => (
              <option key={m} value={m}>
                {t(auth_mode_key(m))}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {is_oauth_mode ? (
        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
          <p className="mb-2">{t("agents.llm_modal.oauth_intro")}</p>
          <Button variant="primary" size="sm" onClick={onStartOAuth}>
            {t("agents.llm_modal.oauth_start")}
          </Button>
        </div>
      ) : has_schema ? (
        <CredentialFieldRenderer
          schema={factory.credential_schema.filter((d) => {
            // Hide auth_mode descriptor from the renderer when we
            // already render it as a top-level dropdown.
            if (multi_auth && d.name === "auth_mode") return false;
            return true;
          })}
          values={{ ...fields, auth_mode }}
          onChange={(next) => {
            // Strip auth_mode from values we persist into `fields`
            // — it travels as a top-level upsert param, not inside
            // the schema-driven map.
            const { auth_mode: _drop, ...rest } = next;
            void _drop;
            onFields(rest);
          }}
        />
      ) : (
        // Legacy fallback — pre-82.10.u factory without schema.
        <Field label={t("agents.llm_modal.field_api_key")}>
          <Input
            type="password"
            value={fields["api_key"] ?? ""}
            onChange={(e) => onFields({ ...fields, api_key: e.target.value })}
            autoComplete="off"
            spellCheck={false}
            placeholder={t("agents.llm_modal.api_key_placeholder")}
            className="w-full border rounded px-3 py-2 text-sm font-mono"
          />
        </Field>
      )}
    </>
  );
}

function PickModelStep({
  model_names,
  live,
  model,
  onModel,
}: {
  model_names: string[];
  live: boolean;
  model: string;
  onModel: (m: string) => void;
}) {
  const t = useT();
  return (
    <>
      <div className="text-sm">
        {live ? (
          <span className="text-green-700">
            {t("agents.llm_modal.live_models", { count: model_names.length })}
          </span>
        ) : (
          <span className="text-text-secondary">
            {t("agents.llm_modal.static_catalog", { count: model_names.length })}
          </span>
        )}
      </div>
      <Field label={t("agents.llm_modal.field_model")}>
        <Select
          value={model}
          onChange={(e) => onModel(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm bg-white"
        >
          {model_names.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}

function Footer({
  stage,
  can_advance_factory,
  credentials_complete,
  is_oauth_mode,
  oauth_state_kind,
  model,
  onCancel,
  onBack,
  onAdvance,
}: {
  stage: WizardStage;
  can_advance_factory: boolean;
  credentials_complete: boolean;
  is_oauth_mode: boolean;
  oauth_state_kind: string;
  model: string;
  onCancel: () => void;
  onBack: () => void;
  onAdvance: () => void;
}) {
  const t = useT();
  if (stage.kind === "oauth") return null; // OAuthPane owns its own buttons.

  const can_advance = (() => {
    if (stage.kind === "factory_pick") return can_advance_factory;
    if (stage.kind === "fill_credentials") {
      if (is_oauth_mode) return oauth_state_kind === "idle";
      return credentials_complete;
    }
    if (stage.kind === "validation_failed") return true;
    if (stage.kind === "pick_model") return model.length > 0;
    return false;
  })();

  const advance_label = (() => {
    if (stage.kind === "factory_pick") return t("agents.llm_modal.next");
    if (stage.kind === "fill_credentials")
      return is_oauth_mode
        ? t("agents.llm_modal.start_oauth")
        : t("agents.llm_modal.validate");
    if (stage.kind === "validation_failed") return t("agents.llm_modal.retry");
    if (stage.kind === "pick_model") return t("agents.llm_modal.create");
    return t("agents.llm_modal.next");
  })();

  const show_back =
    stage.kind === "fill_credentials" ||
    stage.kind === "validation_failed" ||
    stage.kind === "pick_model";

  return (
    <div className="flex items-center justify-end gap-2 px-5 py-3 border-t ">
      <Button variant="ghost" size="sm" onClick={onCancel}>
        {t("common.cancel")}
      </Button>
      {show_back && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          {t("agents.llm_modal.back")}
        </Button>
      )}
      <Button
        variant="primary"
        size="sm"
        onClick={onAdvance}
        disabled={
          !can_advance || stage.kind === "validating" || stage.kind === "saving"
        }
      >
        {(stage.kind === "validating" || stage.kind === "saving") && (
          <Spinner size="md" />
        )}
        {advance_label}
      </Button>
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

function auth_mode_key(m: AuthMode): CatalogKey {
  switch (m) {
    case "api_key":
      return "agents.llm_modal.auth_api_key";
    case "setup_token":
      return "agents.llm_modal.auth_setup_token";
    case "oauth_auth_code":
      return "agents.llm_modal.auth_oauth_auth_code";
    case "oauth_device_code":
      return "agents.llm_modal.auth_oauth_device_code";
    case "oauth_bundle_import":
      return "agents.llm_modal.auth_oauth_bundle_import";
  }
}
