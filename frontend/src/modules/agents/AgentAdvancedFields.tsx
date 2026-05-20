// Phase 97.UI — accordion of advanced agent capability gates.
//
// Lives next to Agents.tsx so its edit modal can mount a single
// component instead of inflating the host file with 600+ lines of
// form code. Reads existing values from `raw_config` (the agent's
// full yaml-block-as-JSON, populated by the daemon's
// `read_agent_block` adapter) and emits patches via the `onPatch`
// callback into the modal's `draft` state.
//
// Tier breakdown (per /home/familia/chat/CLAUDE.md schema):
//   - Tier 1 (typed simple): tenant_id, description, plugins,
//     allowed_delegates, accept_delegates_from, skills, skills_dir.
//   - Tier 2 (toggleable power features): config_tool, team, repl,
//     proactive, lsp, dispatch_policy, brief, channels,
//     away_summary, workspace_git, auto_dream, assistant_mode.
//   - Tier 3 (form-heavy): tool_rate_limits, sender_rate_limit,
//     tool_args_validation, remote_triggers, dreaming,
//     context_optimization, outbound_allowlist, pairing_policy,
//     link_understanding, web_search.
//   - Tier 4 (auto-managed / credentials): credentials, google_auth.
//
// Tier 1 + 2 render typed inputs. Tier 3 + 4 render a JSON
// textarea with parse-time validation so the operator never sees
// a "yaml only" stop sign — they can still touch any block,
// just with less ergonomic guard rails.

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useT } from "../../i18n";

// ── shared types ────────────────────────────────────────────────

export type RawConfig = Record<string, unknown>;

/** Field patches emitted by the accordion. Each is the same shape
 *  the backend's `agents/upsert` accepts. `null` clears a block;
 *  `undefined` (missing key) means "no change". */
export interface AdvancedPatch {
  tenant_id?: string;
  description?: string;
  plugins?: string[];
  allowed_delegates?: string[];
  accept_delegates_from?: string[];
  skills?: string[];
  skills_dir?: string;
  config_tool?: unknown;
  team?: unknown;
  repl?: unknown;
  proactive?: unknown;
  lsp?: unknown;
  dispatch_policy?: unknown;
  auto_dream?: unknown;
  assistant_mode?: unknown;
  away_summary?: unknown;
  channels?: unknown;
  brief?: unknown;
  tool_rate_limits?: unknown;
  sender_rate_limit?: unknown;
  tool_args_validation?: unknown;
  remote_triggers?: unknown;
  dreaming?: unknown;
  workspace_git?: unknown;
  context_optimization?: unknown;
  outbound_allowlist?: unknown;
  pairing_policy?: unknown;
  link_understanding?: unknown;
  web_search?: unknown;
  credentials?: unknown;
  google_auth?: unknown;
}

interface Props {
  rawConfig: RawConfig;
  patch: AdvancedPatch;
  onPatch: (p: AdvancedPatch) => void;
}

// ── helpers ─────────────────────────────────────────────────────

function asStringList(v: unknown): string[] {
  if (Array.isArray(v))
    return v.filter((x): x is string => typeof x === "string");
  return [];
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Returns the value patch override falls back to raw_config. */
function resolved<T>(
  rawConfig: RawConfig,
  patch: AdvancedPatch,
  key: keyof AdvancedPatch,
): T | undefined {
  if (key in patch) return patch[key] as T | undefined;
  return rawConfig[key] as T | undefined;
}

// ── primitive editors ───────────────────────────────────────────

function StringInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-sm font-mono"
    />
  );
}

function StringListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      {values.map((v, idx) => (
        <div key={idx} className="flex gap-1">
          <input
            type="text"
            value={v}
            onChange={(e) => {
              const copy = [...values];
              copy[idx] = e.target.value;
              onChange(copy);
            }}
            placeholder={placeholder}
            className="flex-1 rounded border border-border-DEFAULT bg-panel-alt px-2 py-1 text-sm font-mono"
          />
          <button
            type="button"
            onClick={() => onChange(values.filter((_, i) => i !== idx))}
            className="rounded p-1 text-text-meta hover:bg-panel-hover"
            title="remove"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary"
      >
        <Plus size={12} /> add
      </button>
    </div>
  );
}

function JsonTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  placeholder?: string;
}) {
  const t = useT();
  const [text, setText] = useState(
    value === undefined || value === null ? "" : JSON.stringify(value, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value.trim() === "") {
            setParseError(null);
            onChange(null);
            return;
          }
          try {
            const parsed = JSON.parse(e.target.value);
            setParseError(null);
            onChange(parsed);
          } catch (err) {
            setParseError(err instanceof Error ? err.message : String(err));
          }
        }}
        placeholder={placeholder}
        rows={5}
        className="w-full rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-xs font-mono"
      />
      {parseError && (
        <p className="text-xs text-danger">
          {t("agents.advanced.json_parse_error", { error: parseError })}
        </p>
      )}
    </div>
  );
}

function ToggleField({
  label,
  enabled,
  onToggle,
  help,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  help?: string;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="text-sm font-medium">{label}</span>
        {help && <span className="block text-xs text-text-meta">{help}</span>}
      </span>
    </label>
  );
}

// ── section primitive ──────────────────────────────────────────

function Section({
  title,
  subtitle,
  defaultOpen,
  children,
  dangerLevel,
}: {
  title: string;
  subtitle?: string | undefined;
  defaultOpen?: boolean | undefined;
  children: React.ReactNode;
  dangerLevel?: "warn" | "danger" | undefined;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const tone =
    dangerLevel === "danger"
      ? "border-danger-soft"
      : dangerLevel === "warn"
        ? "border-amber-300"
        : "border-border-DEFAULT";
  return (
    <section
      className={`rounded border ${tone} bg-panel-alt overflow-hidden`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between px-3 py-2 text-left hover:bg-panel-hover"
      >
        <span>
          <span className="text-sm font-medium text-text-primary">{title}</span>
          {subtitle && (
            <span className="block text-xs text-text-meta">{subtitle}</span>
          )}
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && <div className="px-3 py-2 space-y-3 border-t">{children}</div>}
    </section>
  );
}

// ── feature toggle helper ──────────────────────────────────────
// For Tier 2 policy blocks shaped `{ enabled: bool, ... }`, expose
// a single checkbox that flips `enabled` while preserving every
// other field. Operators wanting to tweak the deeper params open
// the "advanced JSON" sub-section.

function PolicyToggleWithJson({
  fieldKey,
  label,
  help,
  rawConfig,
  patch,
  onPatch,
  dangerLevel,
}: {
  fieldKey: keyof AdvancedPatch;
  label: string;
  help: string;
  rawConfig: RawConfig;
  patch: AdvancedPatch;
  onPatch: (p: AdvancedPatch) => void;
  dangerLevel?: "warn" | "danger";
}) {
  const t = useT();
  const current = resolved<Record<string, unknown>>(rawConfig, patch, fieldKey);
  const enabled =
    typeof current === "object" && current !== null
      ? Boolean((current as Record<string, unknown>).enabled)
      : false;
  return (
    <Section title={label} subtitle={help} dangerLevel={dangerLevel}>
      <ToggleField
        label={t("agents.advanced.enabled")}
        enabled={enabled}
        onToggle={(v) => {
          const base =
            typeof current === "object" && current !== null
              ? { ...current }
              : {};
          base.enabled = v;
          onPatch({ ...patch, [fieldKey]: base });
        }}
        help={t("agents.advanced.toggle_help")}
      />
      <details className="text-xs">
        <summary className="cursor-pointer text-text-secondary hover:text-text-primary">
          {t("agents.advanced.show_json")}
        </summary>
        <div className="mt-2">
          <JsonTextarea
            value={current}
            onChange={(v) => onPatch({ ...patch, [fieldKey]: v })}
            placeholder='{ "enabled": true }'
          />
        </div>
      </details>
    </Section>
  );
}

// ── main component ─────────────────────────────────────────────

export default function AgentAdvancedFields({
  rawConfig,
  patch,
  onPatch,
}: Props) {
  const t = useT();

  function patchField<K extends keyof AdvancedPatch>(k: K, v: AdvancedPatch[K]) {
    onPatch({ ...patch, [k]: v });
  }

  const tenantId = asString(resolved(rawConfig, patch, "tenant_id"));
  const description = asString(resolved(rawConfig, patch, "description"));
  const plugins = asStringList(resolved(rawConfig, patch, "plugins"));
  const allowedDelegates = asStringList(
    resolved(rawConfig, patch, "allowed_delegates"),
  );
  const acceptDelegates = asStringList(
    resolved(rawConfig, patch, "accept_delegates_from"),
  );
  const skills = asStringList(resolved(rawConfig, patch, "skills"));
  const skillsDir = asString(resolved(rawConfig, patch, "skills_dir"));

  return (
    <div className="space-y-2">
      {/* ── TIER 1 — Operator-critical ─────────────────────── */}
      <Section
        title={t("agents.advanced.tier1.title")}
        subtitle={t("agents.advanced.tier1.subtitle")}
        defaultOpen={true}
      >
        <Field label={t("agents.advanced.tenant_id")}>
          <StringInput
            value={tenantId}
            onChange={(v) => patchField("tenant_id", v)}
            placeholder="empresa-x"
          />
          <p className="text-xs text-text-meta mt-1">
            {t("agents.advanced.tenant_id_help")}
          </p>
        </Field>
        <Field label={t("agents.advanced.description")}>
          <StringInput
            value={description}
            onChange={(v) => patchField("description", v)}
            placeholder="Asistente de soporte WhatsApp"
          />
          <p className="text-xs text-text-meta mt-1">
            {t("agents.advanced.description_help")}
          </p>
        </Field>
        <Field label={t("agents.advanced.plugins")}>
          <StringListEditor
            values={plugins}
            onChange={(v) => patchField("plugins", v)}
            placeholder="whatsapp"
          />
          <p className="text-xs text-text-meta mt-1">
            {t("agents.advanced.plugins_help")}
          </p>
        </Field>
        <Field label={t("agents.advanced.allowed_delegates")}>
          <StringListEditor
            values={allowedDelegates}
            onChange={(v) => patchField("allowed_delegates", v)}
            placeholder="support_*"
          />
          <p className="text-xs text-text-meta mt-1">
            {t("agents.advanced.allowed_delegates_help")}
          </p>
        </Field>
        <Field label={t("agents.advanced.accept_delegates_from")}>
          <StringListEditor
            values={acceptDelegates}
            onChange={(v) => patchField("accept_delegates_from", v)}
            placeholder="coordinator"
          />
          <p className="text-xs text-text-meta mt-1">
            {t("agents.advanced.accept_delegates_from_help")}
          </p>
        </Field>
        <Field label={t("agents.advanced.skills")}>
          <StringListEditor
            values={skills}
            onChange={(v) => patchField("skills", v)}
            placeholder="weather"
          />
        </Field>
        <Field label={t("agents.advanced.skills_dir")}>
          <StringInput
            value={skillsDir}
            onChange={(v) => patchField("skills_dir", v)}
            placeholder="../skills"
          />
        </Field>
      </Section>

      {/* ── TIER 2 — Power features (dangerous opt-in) ───────── */}
      <PolicyToggleWithJson
        fieldKey="config_tool"
        label={t("agents.advanced.config_tool")}
        help={t("agents.advanced.config_tool_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
        dangerLevel="danger"
      />
      <PolicyToggleWithJson
        fieldKey="team"
        label={t("agents.advanced.team")}
        help={t("agents.advanced.team_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
        dangerLevel="warn"
      />
      <PolicyToggleWithJson
        fieldKey="repl"
        label={t("agents.advanced.repl")}
        help={t("agents.advanced.repl_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
        dangerLevel="danger"
      />
      <PolicyToggleWithJson
        fieldKey="proactive"
        label={t("agents.advanced.proactive")}
        help={t("agents.advanced.proactive_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
      />
      <PolicyToggleWithJson
        fieldKey="lsp"
        label={t("agents.advanced.lsp")}
        help={t("agents.advanced.lsp_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
      />
      <PolicyToggleWithJson
        fieldKey="brief"
        label={t("agents.advanced.brief")}
        help={t("agents.advanced.brief_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
      />
      <PolicyToggleWithJson
        fieldKey="channels"
        label={t("agents.advanced.channels")}
        help={t("agents.advanced.channels_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
      />
      <PolicyToggleWithJson
        fieldKey="away_summary"
        label={t("agents.advanced.away_summary")}
        help={t("agents.advanced.away_summary_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
      />
      <PolicyToggleWithJson
        fieldKey="workspace_git"
        label={t("agents.advanced.workspace_git")}
        help={t("agents.advanced.workspace_git_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
      />
      <PolicyToggleWithJson
        fieldKey="auto_dream"
        label={t("agents.advanced.auto_dream")}
        help={t("agents.advanced.auto_dream_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
      />
      <PolicyToggleWithJson
        fieldKey="assistant_mode"
        label={t("agents.advanced.assistant_mode")}
        help={t("agents.advanced.assistant_mode_help")}
        rawConfig={rawConfig}
        patch={patch}
        onPatch={onPatch}
      />

      {/* Dispatch policy — special: enum mode rather than bool */}
      <Section
        title={t("agents.advanced.dispatch_policy")}
        subtitle={t("agents.advanced.dispatch_policy_help")}
      >
        {(() => {
          const current = resolved<Record<string, unknown>>(
            rawConfig,
            patch,
            "dispatch_policy",
          );
          const mode =
            (current as { mode?: string } | undefined)?.mode ?? "off";
          return (
            <Field label={t("agents.advanced.dispatch_mode")}>
              <select
                value={mode}
                onChange={(e) =>
                  patchField("dispatch_policy", {
                    ...(typeof current === "object" && current !== null
                      ? current
                      : {}),
                    mode: e.target.value,
                  })
                }
                className="w-full rounded border border-border-DEFAULT bg-panel-alt px-2 py-1 text-sm"
              >
                <option value="off">off</option>
                <option value="read_only">read_only</option>
                <option value="full">full</option>
              </select>
            </Field>
          );
        })()}
      </Section>

      {/* ── TIER 3 — Form-heavy: JSON textarea fallback ──── */}
      <Section
        title={t("agents.advanced.tier3.title")}
        subtitle={t("agents.advanced.tier3.subtitle")}
      >
        <RawJsonField
          label={t("agents.advanced.tool_rate_limits")}
          help={t("agents.advanced.tool_rate_limits_help")}
          fieldKey="tool_rate_limits"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
        <RawJsonField
          label={t("agents.advanced.sender_rate_limit")}
          help={t("agents.advanced.sender_rate_limit_help")}
          fieldKey="sender_rate_limit"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
        <RawJsonField
          label={t("agents.advanced.tool_args_validation")}
          help={t("agents.advanced.tool_args_validation_help")}
          fieldKey="tool_args_validation"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
        <RawJsonField
          label={t("agents.advanced.remote_triggers")}
          help={t("agents.advanced.remote_triggers_help")}
          fieldKey="remote_triggers"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
        <RawJsonField
          label={t("agents.advanced.dreaming")}
          help={t("agents.advanced.dreaming_help")}
          fieldKey="dreaming"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
        <RawJsonField
          label={t("agents.advanced.context_optimization")}
          help={t("agents.advanced.context_optimization_help")}
          fieldKey="context_optimization"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
        <RawJsonField
          label={t("agents.advanced.outbound_allowlist")}
          help={t("agents.advanced.outbound_allowlist_help")}
          fieldKey="outbound_allowlist"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
        <RawJsonField
          label={t("agents.advanced.pairing_policy")}
          help={t("agents.advanced.pairing_policy_help")}
          fieldKey="pairing_policy"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
        <RawJsonField
          label={t("agents.advanced.link_understanding")}
          help={t("agents.advanced.link_understanding_help")}
          fieldKey="link_understanding"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
        <RawJsonField
          label={t("agents.advanced.web_search")}
          help={t("agents.advanced.web_search_help")}
          fieldKey="web_search"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
      </Section>

      {/* ── TIER 4 — Credentials (raw JSON, advanced) ───── */}
      <Section
        title={t("agents.advanced.tier4.title")}
        subtitle={t("agents.advanced.tier4.subtitle")}
        dangerLevel="warn"
      >
        <RawJsonField
          label={t("agents.advanced.credentials")}
          help={t("agents.advanced.credentials_help")}
          fieldKey="credentials"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
        <RawJsonField
          label={t("agents.advanced.google_auth")}
          help={t("agents.advanced.google_auth_help")}
          fieldKey="google_auth"
          rawConfig={rawConfig}
          patch={patch}
          onPatch={onPatch}
        />
      </Section>
    </div>
  );
}

// ── inner helpers ──────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function RawJsonField({
  label,
  help,
  fieldKey,
  rawConfig,
  patch,
  onPatch,
}: {
  label: string;
  help: string;
  fieldKey: keyof AdvancedPatch;
  rawConfig: RawConfig;
  patch: AdvancedPatch;
  onPatch: (p: AdvancedPatch) => void;
}) {
  const current = resolved(rawConfig, patch, fieldKey);
  return (
    <Field label={label}>
      <JsonTextarea
        value={current}
        onChange={(v) => onPatch({ ...patch, [fieldKey]: v })}
        placeholder='{ ... } or empty to clear'
      />
      <p className="text-xs text-text-meta mt-1">{help}</p>
    </Field>
  );
}
