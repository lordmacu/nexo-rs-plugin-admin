// Seller edit form — replaces the JSON editor for the
// seller tab with a proper UI. Operator picks the bound
// `agent_id` from a dropdown that pulls live from
// `nexo/admin/agents/list`; the form resolves the agent's
// default `ModelRef` to seed a hint next to the override
// picker.
//
// Fields:
//   - id (immutable on edit)
//   - name
//   - primary_email
//   - signature_text (textarea)
//   - agent_id (dropdown — empty = "no AI assist")
//   - model_override.provider + .model (text inputs, optional)

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  getAgent,
  listAgents,
  type AgentDetail,
  type AgentSummary,
} from "../../../api/agents";
import { saveCredential, type ConfigSeller } from "../../../api/marketing";
import CredentialField from "./CredentialField";
import { useLiveModels, useLlmCatalog } from "../../../lib/llmCatalog";
import type { SaveOutcome } from "../../../store/marketingConfig";
import {
  Button,
  Checkbox,
  Code,
  Input,
  Select,
  Textarea,
} from "../../../components/ui";
import { useT } from "../../../i18n";

interface SellerFormProps {
  /** Existing seller for edit, or `null` for "create new". */
  initial: ConfigSeller | null;
  /** Tenant id so the form can stamp it on new rows. */
  tenant_id: string;
  /** Save action — receives the FULL post-edit list (caller
   *  composes the new row into the existing list). */
  onSave: (next: ConfigSeller) => Promise<SaveOutcome>;
  onClose: () => void;
}

interface FormState {
  id: string;
  name: string;
  primary_email: string;
  /** M15.45 — chip-input field. Empty array = no alts. */
  alt_emails: readonly string[];
  signature_text: string;
  agent_id: string; // "" = none
  override_provider: string; // "" = no override
  override_model: string; // "" = no override
  // M15.38 notification settings — empty = settings: None.
  notify_enabled: boolean;
  notify_on_lead_created: boolean;
  notify_on_lead_replied: boolean;
  notify_on_lead_transitioned: boolean;
  notify_on_draft_pending: boolean;
  notify_on_meeting_intent: boolean;
  notify_channel: "whatsapp" | "email" | "disabled";
  notify_email_from_instance: string; // valid only when channel === "email"
  notify_email_to: string; // valid only when channel === "email"
  // M15.16 — SMTP credential fields. When `smtp_enabled = false`
  // the seller has no outbound SMTP wired and the M15.21 publish
  // pipeline refuses to send. `smtp_password_env` names the
  // environment variable the operator's deployment unit / docker
  // compose sets — the secret value never lands in the YAML.
  smtp_enabled: boolean;
  smtp_instance: string;
  smtp_host: string;
  smtp_port: string; // numeric, kept as string in form state
  smtp_username: string;
  /** Existing env-var name loaded from disk on edit. Hidden
   *  from the operator; used as a fallback so an existing
   *  seller can be saved without re-typing the password. */
  smtp_password_env: string;
  /** New plaintext password the operator types. Empty on
   *  edit ⇒ keep the existing secret. Non-empty ⇒ persisted
   *  via `saveCredential`, which generates a fresh env name. */
  smtp_password: string;
  smtp_starttls: boolean;
  /** M15.45 — toggling reveals the working hours editor. When
   *  off, working_hours is serialised as null on save. */
  hours_enabled: boolean;
  hours_timezone: string;
  hours_mon_fri_enabled: boolean;
  hours_mon_fri_start: string;
  hours_mon_fri_end: string;
  hours_sat_enabled: boolean;
  hours_sat_start: string;
  hours_sat_end: string;
  hours_sun_enabled: boolean;
  hours_sun_start: string;
  hours_sun_end: string;
  /** M15.23.g — vacation toggle + optional ISO date the
   *  vacation ends. When `on_vacation = false`,
   *  `vacation_until` is dropped from the saved payload.
   *  Routing dispatcher refuses to assign during the
   *  active window. */
  on_vacation: boolean;
  /** YYYY-MM-DD; empty when no end date set. The wire
   *  shape is RFC 3339 — we serialise as
   *  `<YYYY-MM-DD>T23:59:59Z` at save time. */
  vacation_until: string;
  /** M15.21.seller-template — per-seller Handlebars override
   *  for the draft generator. Empty string = inherit the
   *  tenant template (the renderer treats whitespace-only
   *  the same way). The wire field is `Option<String>`; we
   *  drop the key entirely on save when this is empty. */
  draft_template: string;
}

interface DayWindowPayload {
  start: string;
  end: string;
}

interface WorkingHoursPayload {
  timezone: string;
  mon_fri: DayWindowPayload | null;
  saturday: DayWindowPayload | null;
  sunday: DayWindowPayload | null;
}

/** M15.39 — resolved instance fields baked at save time so the
 *  forwarder plugin (subprocess) can route without admin RPC. */
type NotificationChannelPayload =
  | { kind: "disabled" }
  | { kind: "whatsapp"; instance: string }
  | { kind: "email"; from_instance: string; to: string };

interface NotificationSettingsPayload {
  on_lead_created: boolean;
  on_lead_replied: boolean;
  on_lead_transitioned: boolean;
  on_draft_pending: boolean;
  on_meeting_intent: boolean;
  channel: NotificationChannelPayload;
}

/** Operator-friendly defaults — 9-to-5 weekdays in the
 *  operator's most common timezone. The user picks IANA tz at
 *  save-time; "America/Bogota" is a sane default for Latam
 *  deployments and round-trips ASCII-clean. */
const DEFAULT_HOURS_TIMEZONE = "America/Bogota";
const DEFAULT_DAY_START = "09:00";
const DEFAULT_DAY_END = "18:00";

function emptyHoursState(): Pick<
  FormState,
  | "hours_enabled"
  | "hours_timezone"
  | "hours_mon_fri_enabled"
  | "hours_mon_fri_start"
  | "hours_mon_fri_end"
  | "hours_sat_enabled"
  | "hours_sat_start"
  | "hours_sat_end"
  | "hours_sun_enabled"
  | "hours_sun_start"
  | "hours_sun_end"
> {
  return {
    hours_enabled: false,
    hours_timezone: DEFAULT_HOURS_TIMEZONE,
    hours_mon_fri_enabled: true,
    hours_mon_fri_start: DEFAULT_DAY_START,
    hours_mon_fri_end: DEFAULT_DAY_END,
    hours_sat_enabled: false,
    hours_sat_start: DEFAULT_DAY_START,
    hours_sat_end: DEFAULT_DAY_END,
    hours_sun_enabled: false,
    hours_sun_start: DEFAULT_DAY_START,
    hours_sun_end: DEFAULT_DAY_END,
  };
}

/** Round-trip an existing `working_hours` block back into form
 *  state. Each `null` window in the wire shape becomes
 *  `enabled: false` with the persisted defaults preserved. */
function pickHoursState(
  initial: {
    working_hours?: {
      timezone?: string;
      mon_fri?: DayWindowPayload | null;
      saturday?: DayWindowPayload | null;
      sunday?: DayWindowPayload | null;
    } | null;
  } | null,
): Pick<
  FormState,
  | "hours_enabled"
  | "hours_timezone"
  | "hours_mon_fri_enabled"
  | "hours_mon_fri_start"
  | "hours_mon_fri_end"
  | "hours_sat_enabled"
  | "hours_sat_start"
  | "hours_sat_end"
  | "hours_sun_enabled"
  | "hours_sun_start"
  | "hours_sun_end"
> {
  const wh = initial?.working_hours;
  if (!wh) return emptyHoursState();
  return {
    hours_enabled: true,
    hours_timezone: String(wh.timezone ?? DEFAULT_HOURS_TIMEZONE),
    hours_mon_fri_enabled: wh.mon_fri !== null && wh.mon_fri !== undefined,
    hours_mon_fri_start: String(wh.mon_fri?.start ?? DEFAULT_DAY_START),
    hours_mon_fri_end: String(wh.mon_fri?.end ?? DEFAULT_DAY_END),
    hours_sat_enabled: wh.saturday !== null && wh.saturday !== undefined,
    hours_sat_start: String(wh.saturday?.start ?? DEFAULT_DAY_START),
    hours_sat_end: String(wh.saturday?.end ?? DEFAULT_DAY_END),
    hours_sun_enabled: wh.sunday !== null && wh.sunday !== undefined,
    hours_sun_start: String(wh.sunday?.start ?? DEFAULT_DAY_START),
    hours_sun_end: String(wh.sunday?.end ?? DEFAULT_DAY_END),
  };
}

function pickFormState(initial: ConfigSeller | null): FormState {
  if (!initial) {
    return {
      id: "",
      name: "",
      primary_email: "",
      alt_emails: [],
      signature_text: "",
      agent_id: "",
      override_provider: "",
      override_model: "",
      notify_enabled: false,
      notify_on_lead_created: true,
      notify_on_lead_replied: true,
      notify_on_lead_transitioned: false,
      notify_on_draft_pending: true,
      notify_on_meeting_intent: true,
      notify_channel: "whatsapp",
      notify_email_from_instance: "",
      notify_email_to: "",
      smtp_enabled: false,
      smtp_instance: "",
      smtp_host: "",
      smtp_port: "587",
      smtp_username: "",
      smtp_password_env: "",
      smtp_password: "",
      smtp_starttls: true,
      ...emptyHoursState(),
      on_vacation: false,
      vacation_until: "",
      draft_template: "",
    };
  }
  const override = (
    initial as { model_override?: { provider?: string; model?: string } }
  ).model_override;
  const ns = (
    initial as { notification_settings?: NotificationSettingsPayload | null }
  ).notification_settings;
  const channel = ns?.channel;
  const channelKind = channel?.kind ?? "whatsapp";
  // Pull the resolved instance fields back into the form when
  // round-tripping an existing seller — operator sees them as
  // read-only hints since the form re-resolves on save anyway.
  const emailFromInstance =
    channel?.kind === "email" ? channel.from_instance : "";
  const emailTo = channel?.kind === "email" ? channel.to : "";
  const altEmailsRaw = (initial as { alt_emails?: readonly string[] })
    .alt_emails;
  // M15.16 — SMTP credential round-trip from the persisted row.
  const smtp = (
    initial as {
      smtp_credential?: {
        instance?: string;
        host?: string;
        port?: number;
        username?: string;
        password_env?: string;
        starttls?: boolean;
      } | null;
    }
  ).smtp_credential;
  return {
    id: String(initial.id ?? ""),
    name: String(initial.name ?? ""),
    primary_email: String(initial.primary_email ?? ""),
    alt_emails: Array.isArray(altEmailsRaw)
      ? altEmailsRaw.map((e) => String(e))
      : [],
    signature_text: String(
      (initial as { signature_text?: string }).signature_text ?? "",
    ),
    agent_id: String((initial as { agent_id?: string }).agent_id ?? ""),
    override_provider: String(override?.provider ?? ""),
    override_model: String(override?.model ?? ""),
    notify_enabled: ns !== undefined && ns !== null,
    notify_on_lead_created: ns?.on_lead_created ?? true,
    notify_on_lead_replied: ns?.on_lead_replied ?? true,
    notify_on_lead_transitioned: ns?.on_lead_transitioned ?? false,
    notify_on_draft_pending: ns?.on_draft_pending ?? true,
    notify_on_meeting_intent: ns?.on_meeting_intent ?? true,
    notify_channel: channelKind,
    notify_email_from_instance: emailFromInstance,
    notify_email_to: emailTo,
    smtp_enabled: smtp != null,
    smtp_instance: String(smtp?.instance ?? ""),
    smtp_host: String(smtp?.host ?? ""),
    smtp_port: String(smtp?.port ?? 587),
    smtp_username: String(smtp?.username ?? ""),
    smtp_password_env: String(smtp?.password_env ?? ""),
    smtp_password: "",
    smtp_starttls: smtp?.starttls ?? true,
    ...pickHoursState(
      initial as { working_hours?: WorkingHoursPayload | null } | null,
    ),
    on_vacation: (initial as { on_vacation?: boolean }).on_vacation ?? false,
    vacation_until: pickVacationDate(initial),
    // M15.21.seller-template — empty string means "inherit
    // tenant default"; the renderer treats whitespace-only
    // overrides the same way for symmetry.
    draft_template: String(
      (initial as { draft_template?: string | null }).draft_template ?? "",
    ),
  };
}

/** Normalise the persisted `vacation_until` (RFC 3339 in
 *  the Rust struct) into the form's YYYY-MM-DD shape.
 *  Returns "" when missing / unparseable; the form
 *  treats both as "no end date set". */
function pickVacationDate(initial: ConfigSeller): string {
  const raw = (initial as { vacation_until?: string | null }).vacation_until;
  if (typeof raw !== "string" || raw.length === 0) return "";
  // Slice the YYYY-MM-DD prefix; falls back to the full
  // string when the input doesn't carry a 'T' separator
  // (operator-edited YAML may persist a date-only value).
  const idx = raw.indexOf("T");
  return idx === -1 ? raw.slice(0, 10) : raw.slice(0, idx);
}

export default function SellerForm({
  initial,
  tenant_id,
  onSave,
  onClose,
}: SellerFormProps) {
  const t = useT();
  const [form, setForm] = useState<FormState>(() => pickFormState(initial));
  const [agents, setAgents] = useState<readonly AgentSummary[] | null>(null);
  const [agentDetail, setAgentDetail] = useState<AgentDetail | null>(null);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [restartNote, setRestartNote] = useState<string | null>(null);
  // Provider catalog drives the model-override dropdown — entries
  // arrive lazily via `nexo/admin/llm_providers/catalog`. Single
  // shared zustand store; first caller triggers the fetch.
  const llmCatalog = useLlmCatalog((s) => s.entries);
  const loadLlmCatalog = useLlmCatalog((s) => s.load);
  // Live `/v1/models` probe per provider instance — covers
  // factories whose static `known_models` list lags reality
  // (DeepSeek's `v4-pro` etc.). Union with the static catalog so
  // the operator sees every model the provider actually exposes.
  const liveModels = useLiveModels((s) => s.by_instance);
  const loadLiveModels = useLiveModels((s) => s.load);
  useEffect(() => {
    void loadLlmCatalog();
  }, [loadLlmCatalog]);
  useEffect(() => {
    if (agentDetail?.model.provider) {
      void loadLiveModels(agentDetail.model.provider);
    }
  }, [agentDetail?.model.provider, loadLiveModels]);

  // Hydrate the agents dropdown.
  useEffect(() => {
    let cancelled = false;
    listAgents()
      .then((list) => {
        if (!cancelled) setAgents(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setAgentsError(e instanceof Error ? e.message : String(e));
          setAgents([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // When the operator picks an agent, fetch its detail so we can
  // hint at the default model next to the override input.
  useEffect(() => {
    if (!form.agent_id) {
      setAgentDetail(null);
      return;
    }
    let cancelled = false;
    getAgent(form.agent_id).then((d) => {
      if (!cancelled) setAgentDetail(d);
    });
    return () => {
      cancelled = true;
    };
  }, [form.agent_id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  /** Auto-derive the seller id from the email's local part when
   *  the operator is creating a new row. On edit the id stays
   *  locked — server-side rename isn't supported. The local-part
   *  is sanitised the same way the wizard does it so the wire
   *  shape matches whichever surface created the seller. */
  function setPrimaryEmail(next: string) {
    const editing = initial !== null;
    setForm((s) => {
      const at = next.lastIndexOf("@");
      const local = at > 0 ? next.slice(0, at) : "";
      const derivedId =
        local
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "") || "default";
      return {
        ...s,
        primary_email: next,
        ...(editing ? {} : { id: derivedId }),
      };
    });
  }

  async function buildPayload(): Promise<ConfigSeller | { error: string }> {
    if (!form.id.trim())
      return { error: t("marketing.seller_form.error_id_required") };
    if (!form.name.trim())
      return { error: t("marketing.seller_form.error_name_required") };
    if (!form.primary_email.includes("@")) {
      return { error: t("marketing.seller_form.error_email_invalid") };
    }
    // Override is all-or-nothing — provider AND model OR neither.
    const hasProvider = form.override_provider.trim().length > 0;
    const hasModel = form.override_model.trim().length > 0;
    if (hasProvider !== hasModel) {
      return {
        error: t("marketing.seller_form.error_override_partial"),
      };
    }
    // M15.45 — validate alt_emails entries (every chip is a
    // working address). Empty list is valid (most sellers
    // only have a primary).
    for (const e of form.alt_emails) {
      if (!e.includes("@")) {
        return {
          error: t("marketing.seller_form.error_alt_email_invalid", {
            email: e,
          }),
        };
      }
    }
    // M15.45 — validate working_hours when enabled. HH:MM
    // format end > start per active window.
    let workingHours: WorkingHoursPayload | null = null;
    if (form.hours_enabled) {
      if (!form.hours_timezone.trim()) {
        return {
          error: t("marketing.seller_form.error_timezone_required"),
        };
      }
      const checkWindow = (
        enabled: boolean,
        start: string,
        end: string,
        label: string,
      ): { ok: DayWindowPayload | null } | { error: string } => {
        if (!enabled) return { ok: null };
        if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
          return {
            error: t("marketing.seller_form.error_window_format", {
              label,
              start,
              end,
            }),
          };
        }
        if (start >= end) {
          return {
            error: t("marketing.seller_form.error_window_order", {
              label,
              start,
              end,
            }),
          };
        }
        return { ok: { start, end } };
      };
      const monFri = checkWindow(
        form.hours_mon_fri_enabled,
        form.hours_mon_fri_start,
        form.hours_mon_fri_end,
        "mon_fri",
      );
      if ("error" in monFri) return { error: monFri.error };
      const sat = checkWindow(
        form.hours_sat_enabled,
        form.hours_sat_start,
        form.hours_sat_end,
        "saturday",
      );
      if ("error" in sat) return { error: sat.error };
      const sun = checkWindow(
        form.hours_sun_enabled,
        form.hours_sun_start,
        form.hours_sun_end,
        "sunday",
      );
      if ("error" in sun) return { error: sun.error };
      workingHours = {
        timezone: form.hours_timezone.trim(),
        mon_fri: monFri.ok,
        saturday: sat.ok,
        sunday: sun.ok,
      };
    }
    const base: ConfigSeller = {
      id: form.id.trim(),
      tenant_id,
      name: form.name.trim(),
      primary_email: form.primary_email.trim(),
      alt_emails: form.alt_emails
        .map((e) => e.trim())
        .filter((e) => e.length > 0),
      signature_text: form.signature_text,
      working_hours: workingHours,
      on_vacation: form.on_vacation,
    };
    if (form.on_vacation && form.vacation_until.length > 0) {
      // Round-trip the YYYY-MM-DD picker as an end-of-day
      // RFC 3339 stamp so the routing dispatcher's
      // tz-aware comparison treats the day as inclusive.
      (base as Record<string, unknown>).vacation_until =
        `${form.vacation_until}T23:59:59Z`;
    }
    if (form.agent_id) {
      (base as Record<string, unknown>).agent_id = form.agent_id;
    }
    if (hasProvider && hasModel) {
      (base as Record<string, unknown>).model_override = {
        provider: form.override_provider.trim(),
        model: form.override_model.trim(),
      };
    }
    if (form.notify_enabled) {
      let channel: NotificationChannelPayload;
      if (form.notify_channel === "email") {
        if (!form.notify_email_to.includes("@")) {
          return {
            error: t("marketing.seller_form.error_notify_email_to"),
          };
        }
        if (!form.notify_email_from_instance.trim()) {
          return {
            error: t("marketing.seller_form.error_notify_email_from"),
          };
        }
        channel = {
          kind: "email",
          from_instance: form.notify_email_from_instance.trim(),
          to: form.notify_email_to.trim(),
        };
      } else if (form.notify_channel === "disabled") {
        channel = { kind: "disabled" };
      } else {
        // M15.39 — resolve the WA bridge instance from the
        // bound agent's inbound_bindings AT SAVE TIME and
        // bake it into the channel. Forwarder plugin needs
        // it to publish to plugin.outbound.whatsapp.<instance>
        // without admin-RPC access.
        if (!agentDetail) {
          return {
            error: t("marketing.seller_form.error_notify_agent_loading"),
          };
        }
        const wa = agentDetail.inbound_bindings.find(
          (b) => b.plugin === "whatsapp",
        );
        if (!wa || !wa.instance) {
          return {
            error: t("marketing.seller_form.error_notify_no_whatsapp", {
              agent: form.agent_id,
            }),
          };
        }
        channel = { kind: "whatsapp", instance: wa.instance };
      }
      (base as Record<string, unknown>).notification_settings = {
        on_lead_created: form.notify_on_lead_created,
        on_lead_replied: form.notify_on_lead_replied,
        on_lead_transitioned: form.notify_on_lead_transitioned,
        on_draft_pending: form.notify_on_draft_pending,
        on_meeting_intent: form.notify_on_meeting_intent,
        channel,
      } satisfies NotificationSettingsPayload;
    }
    // M15.16 — SMTP credential payload. All-or-nothing: every
    // field must be filled when the operator enables SMTP.
    if (form.smtp_enabled) {
      const portNum = Number(form.smtp_port);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        return { error: t("marketing.seller_form.error_smtp_port") };
      }
      if (!form.smtp_instance.trim()) {
        return {
          error: t("marketing.seller_form.error_smtp_instance"),
        };
      }
      if (!form.smtp_host.trim())
        return { error: t("marketing.seller_form.error_smtp_host") };
      if (!form.smtp_username.trim()) {
        return { error: t("marketing.seller_form.error_smtp_username") };
      }
      // Operator-typed password takes precedence; persist it
      // first so we can stamp the freshly-generated env name on
      // the seller payload. Empty password on an existing
      // seller ⇒ keep the previously-saved env name (UX:
      // "leave blank to keep current").
      let resolvedEnv = form.smtp_password_env.trim();
      if (form.smtp_password.length > 0) {
        try {
          const cred = await saveCredential(
            "smtp",
            form.id || form.smtp_instance || "default",
            form.smtp_password,
          );
          resolvedEnv = cred.env_name;
        } catch (e) {
          return {
            error: t("marketing.credentials.save_failed", {
              message: e instanceof Error ? e.message : String(e),
            }),
          };
        }
      }
      if (!resolvedEnv) {
        return {
          error: t("marketing.seller_form.error_smtp_password_env"),
        };
      }
      (base as Record<string, unknown>).smtp_credential = {
        instance: form.smtp_instance.trim(),
        host: form.smtp_host.trim(),
        port: portNum,
        username: form.smtp_username.trim(),
        password_env: resolvedEnv,
        starttls: form.smtp_starttls,
      };
    }
    // M15.21.seller-template — only emit the field when the
    // operator authored a non-empty override. Empty / whitespace
    // means inherit the tenant template; dropping the key keeps
    // the YAML clean (`#[serde(skip_serializing_if = "Option::is_none")]`).
    const tplBody = form.draft_template;
    if (tplBody.trim().length > 0) {
      (base as Record<string, unknown>).draft_template = tplBody;
    }
    return base;
  }

  async function handleSave() {
    setServerError(null);
    setRestartNote(null);
    const payload = await buildPayload();
    if ("error" in payload && typeof payload.error === "string") {
      setServerError(payload.error);
      return;
    }
    setSaving(true);
    const outcome = await onSave(payload as ConfigSeller);
    setSaving(false);
    if (outcome.kind === "error") {
      setServerError(outcome.message);
      return;
    }
    if (
      outcome.kind === "ok_restart_required" ||
      outcome.kind === "ok_with_partial_warning"
    ) {
      // Keep the modal open so the operator reads the note —
      // partial-warning means the marketing save succeeded
      // but the agent-binding sync hit per-agent failures.
      setRestartNote(outcome.note);
      return;
    }
    onClose();
  }

  const isEdit = initial !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seller-form-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2
            id="seller-form-title"
            className="text-sm font-semibold text-slate-900"
          >
            {isEdit
              ? t("marketing.seller_form.title_edit", { id: form.id })
              : t("marketing.seller_form.title_new")}
          </h2>
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <X size={16} />
          </Button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {/* ID is auto-derived server-side and stays internal —
              never surfaced to the operator. Server-side rename
              isn't supported, but the operator doesn't need to
              think about it on either flow (create or edit). */}

          <Field label={t("marketing.seller_form.name_label")}>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </Field>

          <Field
            label={t("marketing.seller_form.primary_email_label")}
            hint={t("marketing.seller_form.primary_email_hint")}
          >
            <Input
              type="email"
              value={form.primary_email}
              onChange={(e) => setPrimaryEmail(e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            />
          </Field>

          <Field
            label={t("marketing.seller_form.alt_emails_label")}
            hint={t("marketing.seller_form.alt_emails_hint")}
          >
            <ChipInput
              values={form.alt_emails}
              onChange={(next) => set("alt_emails", next)}
              placeholder={t("marketing.seller_form.alt_emails_placeholder")}
            />
          </Field>

          <Field
            label={t("marketing.seller_form.signature_label")}
            hint={t("marketing.seller_form.signature_hint")}
          >
            <Textarea
              value={form.signature_text}
              onChange={(e) => set("signature_text", e.target.value)}
              rows={4}
              className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
            />
          </Field>

          {/* M15.21.seller-template — per-seller Handlebars
              override for the draft generator. Empty (default)
              inherits the tenant template configured under
              /config/draft_template. Useful when one seller
              writes in a distinctly different voice or
              structure than the rest of the team. */}
          <Field
            label={t("marketing.seller_form.draft_template_label")}
            hint={t("marketing.seller_form.draft_template_hint")}
          >
            <Textarea
              value={form.draft_template}
              onChange={(e) => set("draft_template", e.target.value)}
              rows={6}
              placeholder={t("marketing.seller_form.draft_template_placeholder")}
              className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs"
              data-testid="seller-draft-template"
            />
            {form.draft_template.trim().length === 0 && (
              <p className="mt-1 text-[10px] text-slate-400">
                {t("marketing.seller_form.draft_template_empty")}
              </p>
            )}
          </Field>

          {/* M15.16 — SMTP credentials. Disabled = seller has
              no outbound; the M15.21 publish pipeline refuses
              to send. password_env names an env var; the
              actual secret never enters the YAML. */}
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <Checkbox
                checked={form.smtp_enabled}
                onChange={(e) => set("smtp_enabled", e.target.checked)}
              />
              {t("marketing.seller_form.smtp_section")}
            </label>
            {form.smtp_enabled && (
              <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                <Field
                  label={t("marketing.seller_form.smtp_instance_label")}
                  hint={t("marketing.seller_form.smtp_instance_hint")}
                >
                  <Input
                    value={form.smtp_instance}
                    onChange={(e) => set("smtp_instance", e.target.value)}
                    placeholder={t(
                      "marketing.seller_form.smtp_instance_placeholder",
                    )}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-mono"
                  />
                </Field>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field
                    label={t("marketing.seller_form.smtp_host_label")}
                    hint={t("marketing.seller_form.smtp_host_hint")}
                  >
                    <Input
                      value={form.smtp_host}
                      onChange={(e) => set("smtp_host", e.target.value)}
                      placeholder={t(
                        "marketing.seller_form.smtp_host_placeholder",
                      )}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-mono"
                    />
                  </Field>
                  <Field
                    label={t("marketing.seller_form.smtp_port_label")}
                    hint={t("marketing.seller_form.smtp_port_hint")}
                  >
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      value={form.smtp_port}
                      onChange={(e) => set("smtp_port", e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-mono"
                    />
                  </Field>
                  <Field
                    label={t("marketing.seller_form.smtp_starttls_label")}
                    hint={t("marketing.seller_form.smtp_starttls_hint")}
                  >
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={form.smtp_starttls}
                        onChange={(e) => set("smtp_starttls", e.target.checked)}
                      />
                      {t("marketing.seller_form.smtp_starttls_enabled")}
                    </label>
                  </Field>
                </div>
                <Field
                  label={t("marketing.seller_form.smtp_username_label")}
                  hint={t("marketing.seller_form.smtp_username_hint")}
                >
                  <Input
                    value={form.smtp_username}
                    onChange={(e) => set("smtp_username", e.target.value)}
                    placeholder={t(
                      "marketing.seller_form.smtp_username_placeholder",
                    )}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-mono"
                  />
                </Field>
                <CredentialField
                  scope="smtp"
                  value={form.smtp_password}
                  onChange={(v) => set("smtp_password", v)}
                  hasExistingSecret={form.smtp_password_env.length > 0}
                  probe={{
                    host: form.smtp_host.trim(),
                    port: Number(form.smtp_port) || 587,
                    username: form.smtp_username.trim(),
                    starttls: form.smtp_starttls,
                  }}
                  inputTestId="seller-smtp-password"
                />
              </div>
            )}
          </div>

          {/* M15.45 — working hours editor (optional). When
              disabled, working_hours serialises as null. */}
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <Checkbox
                checked={form.hours_enabled}
                onChange={(e) => set("hours_enabled", e.target.checked)}
              />
              {t("marketing.seller_form.hours_section")}
            </label>
            {form.hours_enabled && (
              <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                <Field
                  label={t("marketing.seller_form.timezone_label")}
                  hint={t("marketing.seller_form.timezone_hint")}
                >
                  <Input
                    value={form.hours_timezone}
                    onChange={(e) => set("hours_timezone", e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-mono"
                  />
                </Field>
                <DayRow
                  label={t("marketing.seller_form.day_mon_fri")}
                  enabled={form.hours_mon_fri_enabled}
                  start={form.hours_mon_fri_start}
                  end={form.hours_mon_fri_end}
                  onToggle={(v) => set("hours_mon_fri_enabled", v)}
                  onStart={(v) => set("hours_mon_fri_start", v)}
                  onEnd={(v) => set("hours_mon_fri_end", v)}
                />
                <DayRow
                  label={t("marketing.seller_form.day_saturday")}
                  enabled={form.hours_sat_enabled}
                  start={form.hours_sat_start}
                  end={form.hours_sat_end}
                  onToggle={(v) => set("hours_sat_enabled", v)}
                  onStart={(v) => set("hours_sat_start", v)}
                  onEnd={(v) => set("hours_sat_end", v)}
                />
                <DayRow
                  label={t("marketing.seller_form.day_sunday")}
                  enabled={form.hours_sun_enabled}
                  start={form.hours_sun_start}
                  end={form.hours_sun_end}
                  onToggle={(v) => set("hours_sun_enabled", v)}
                  onStart={(v) => set("hours_sun_start", v)}
                  onEnd={(v) => set("hours_sun_end", v)}
                />
              </div>
            )}
          </div>

          {/* M15.23.g — vacation toggle + optional end
              date. Routing dispatcher refuses to assign
              this seller during the active window. */}
          <div
            data-testid="seller-vacation"
            className="rounded border border-slate-200 bg-white p-3"
          >
            <label className="flex items-center gap-2 text-[11px] text-slate-700">
              <Checkbox
                checked={form.on_vacation}
                onChange={(e) => set("on_vacation", e.target.checked)}
                aria-label="seller-on-vacation"
              />
              <span className="font-semibold text-slate-900">
                {t("marketing.seller_form.vacation_label")}
              </span>
            </label>
            {form.on_vacation && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                <label className="flex items-center gap-2">
                  {t("marketing.seller_form.vacation_until")}
                  <Input
                    type="date"
                    value={form.vacation_until}
                    onChange={(e) => set("vacation_until", e.target.value)}
                    aria-label="seller-vacation-until"
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px]"
                  />
                </label>
                {form.vacation_until && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => set("vacation_until", "")}
                    aria-label="seller-vacation-until-clear"
                  >
                    {t("marketing.seller_form.vacation_clear")}
                  </Button>
                )}
                <span className="text-[10px] text-slate-400">
                  {t("marketing.seller_form.vacation_indefinite")}
                </span>
              </div>
            )}
          </div>

          <Field
            label={t("marketing.seller_form.agent_label")}
            hint={t("marketing.seller_form.agent_hint")}
          >
            {agents === null ? (
              <p className="text-xs text-slate-400">
                {t("marketing.seller_form.agent_loading")}
              </p>
            ) : agentsError ? (
              <p className="text-xs text-rose-600">
                {t("marketing.seller_form.agent_error", { error: agentsError })}
              </p>
            ) : (
              <Select
                value={form.agent_id}
                onChange={(e) => set("agent_id", e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
              >
                <option value="">
                  {t("marketing.seller_form.agent_none")}
                </option>
                {/* M15.42 — filter to active agents only.
                    Inactive agents are soft-deleted (drain in
                    flight) — re-binding a seller to one would
                    immediately produce stale notifications. The
                    operator can still SEE the existing binding
                    on edit (the form preserves the value verbatim),
                    just can't pick an inactive agent fresh. */}
                {agents
                  .filter((a) => a.active || a.id === form.agent_id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {t("marketing.seller_form.agent_option", {
                        id: a.id,
                        provider: a.model_provider,
                        count: a.bindings_count,
                        plural: a.bindings_count === 1 ? "" : "es",
                      })}
                      {!a.active &&
                        t("marketing.seller_form.agent_inactive_suffix")}
                    </option>
                  ))}
              </Select>
            )}
            {agentDetail && (
              <p className="mt-1 text-[11px] text-slate-500">
                {t("marketing.seller_form.agent_default_model")}
                <Code>
                  {agentDetail.model.provider}/{agentDetail.model.model}
                </Code>
              </p>
            )}
          </Field>

          {agentDetail &&
            (() => {
              // Scope the override dropdown to the AGENT'S provider
              // — picking a different model from the same factory
              // is the 95% case (e.g. `claude-haiku-4-5` instead of
              // `claude-opus-4-7` to save tokens on email replies).
              // We hide the field entirely when no agent is bound
              // because `model_override` only makes sense on top of
              // an agent's `ModelRef`. Cross-provider switches are
              // a corner case that can be done via the agents
              // module instead.
              const provider = agentDetail.model.provider;
              const agentModel = agentDetail.model.model;
              // The agent's `provider` is an INSTANCE id (e.g.
              // `deepseek-19c7`); the catalog is keyed by FACTORY
              // id (`deepseek`). Resolve via longest-prefix match
              // — same heuristic the agents module uses for its
              // own dropdowns. Once we have the factory entry,
              // the static `known_models` list expands beyond
              // whatever the live probe reported.
              const entry = (() => {
                const cat = llmCatalog ?? [];
                const exact = cat.find((p) => p.id === provider);
                if (exact) return exact;
                const sorted = [...cat].sort(
                  (a, b) => b.id.length - a.id.length,
                );
                return sorted.find((p) => provider.startsWith(`${p.id}-`));
              })();
              // Live probe is keyed by INSTANCE id (each instance
              // can use a different api key → different model
              // surface), so we keep that part instance-scoped.
              const live = liveModels.get(provider);
              // Build the union: live `/v1/models` (when the
              // probe answered) + factory's `known_models` +
              // whatever the agent currently uses (so it never
              // disappears from the list, even on an unknown id).
              // Dedupe + stable sort so the dropdown order is
              // predictable across renders.
              const seen = new Set<string>();
              const union: string[] = [];
              const push = (m: string) => {
                if (!m || seen.has(m)) return;
                seen.add(m);
                union.push(m);
              };
              (live?.names ?? []).forEach(push);
              (entry?.models ?? []).forEach(push);
              push(agentModel);
              union.sort();
              const models = union;
              // Empty `model_override` ⇒ the agent's model is in
              // effect. We surface that as the agent's model id
              // selected in the dropdown (with a "(del agente)"
              // marker) instead of a separate "Usar el del agente"
              // sentinel — feels less abstract to the operator.
              const hasOverride =
                form.override_provider === provider &&
                form.override_model.length > 0 &&
                form.override_model !== agentModel;
              const value = hasOverride ? form.override_model : agentModel;
              const onSelect = (raw: string) => {
                // Selecting the agent's own model ⇒ clear the
                // override stamp; the wire payload skips
                // `model_override` and the renderer falls back to
                // the agent's `ModelRef` at runtime.
                if (raw === agentModel) {
                  set("override_provider", "");
                  set("override_model", "");
                  return;
                }
                set("override_provider", provider);
                set("override_model", raw);
              };
              return (
                <Field
                  label={t("marketing.seller_form.override_label")}
                  hint={t("marketing.seller_form.override_hint")}
                >
                  <Select
                    value={value}
                    onChange={(e) => onSelect(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                        {m === agentModel
                          ? ` ${t(
                              "marketing.seller_form.override_agent_marker",
                            )}`
                          : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              );
            })()}

          {/* M15.38 — notifications block */}
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <Checkbox
                checked={form.notify_enabled}
                onChange={(e) => set("notify_enabled", e.target.checked)}
              />
              {t("marketing.seller_form.notify_section")}
            </label>
            {form.notify_enabled && (
              <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                    {t("marketing.seller_form.notify_events")}
                  </p>
                  <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={form.notify_on_lead_created}
                        onChange={(e) =>
                          set("notify_on_lead_created", e.target.checked)
                        }
                      />
                      {t("marketing.seller_form.notify_lead_created")}
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={form.notify_on_lead_replied}
                        onChange={(e) =>
                          set("notify_on_lead_replied", e.target.checked)
                        }
                      />
                      {t("marketing.seller_form.notify_lead_replied")}
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={form.notify_on_lead_transitioned}
                        onChange={(e) =>
                          set("notify_on_lead_transitioned", e.target.checked)
                        }
                      />
                      {t("marketing.seller_form.notify_lead_transitioned")}
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={form.notify_on_draft_pending}
                        onChange={(e) =>
                          set("notify_on_draft_pending", e.target.checked)
                        }
                      />
                      {t("marketing.seller_form.notify_draft_pending")}
                    </label>
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={form.notify_on_meeting_intent}
                        onChange={(e) =>
                          set("notify_on_meeting_intent", e.target.checked)
                        }
                      />
                      {t("marketing.seller_form.notify_meeting_intent")}
                    </label>
                  </div>
                </div>

                <Field
                  label={t("marketing.seller_form.notify_channel_label")}
                  hint={t("marketing.seller_form.notify_channel_hint")}
                >
                  <Select
                    value={form.notify_channel}
                    onChange={(e) =>
                      set(
                        "notify_channel",
                        e.target.value as FormState["notify_channel"],
                      )
                    }
                    className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
                  >
                    <option value="whatsapp">
                      {t("marketing.seller_form.notify_channel_whatsapp")}
                    </option>
                    <option value="email">
                      {t("marketing.seller_form.notify_channel_email")}
                    </option>
                    <option value="disabled">
                      {t("marketing.seller_form.notify_channel_disabled")}
                    </option>
                  </Select>
                </Field>

                {form.notify_channel === "email" && (
                  <>
                    <Field
                      label={t(
                        "marketing.seller_form.notify_from_instance_label",
                      )}
                      hint={t(
                        "marketing.seller_form.notify_from_instance_hint",
                      )}
                    >
                      <Input
                        placeholder={t(
                          "marketing.seller_form.notify_from_instance_placeholder",
                        )}
                        value={form.notify_email_from_instance}
                        onChange={(e) =>
                          set("notify_email_from_instance", e.target.value)
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </Field>
                    <Field
                      label={t("marketing.seller_form.notify_email_to_label")}
                    >
                      <Input
                        type="email"
                        placeholder={t(
                          "marketing.seller_form.notify_email_to_placeholder",
                        )}
                        value={form.notify_email_to}
                        onChange={(e) => set("notify_email_to", e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      />
                    </Field>
                  </>
                )}

                {form.notify_channel === "whatsapp" &&
                  agentDetail &&
                  !agentDetail.inbound_bindings.some(
                    (b) => b.plugin === "whatsapp",
                  ) && (
                    <div
                      className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 ring-1 ring-amber-200"
                      role="status"
                    >
                      {t(
                        "marketing.seller_form.notify_whatsapp_warning_prefix",
                      )}
                      <Code>{form.agent_id}</Code>
                      {t(
                        "marketing.seller_form.notify_whatsapp_warning_suffix",
                      )}
                    </div>
                  )}

                {!form.agent_id && (
                  <div
                    className="rounded-md bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 ring-1 ring-rose-200"
                    role="status"
                  >
                    {t("marketing.seller_form.notify_no_agent_warning")}
                  </div>
                )}
              </div>
            )}
          </div>

          {serverError && (
            <div
              className="rounded-md bg-rose-50 px-3 py-2 text-[11px] text-rose-700 ring-1 ring-rose-200"
              role="alert"
            >
              {serverError}
            </div>
          )}
          {restartNote && (
            <div
              className="rounded-md bg-amber-50 px-3 py-2 text-[11px] text-amber-800 ring-1 ring-amber-200"
              role="status"
            >
              {restartNote}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? t("marketing.seller_form.saving")
              : isEdit
                ? t("marketing.seller_form.save_changes")
                : t("marketing.seller_form.create")}
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className="mt-1">{children}</div>
      </label>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

/** M15.45 — chip input for `alt_emails`. Enter / comma adds the
 *  draft as a chip; backspace on empty removes the last chip;
 *  click × on a chip removes it. Pure controlled component —
 *  parent owns the array. */
function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: readonly string[];
  onChange: (next: readonly string[]) => void;
  placeholder?: string;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");
  function commit(value: string) {
    const trimmed = value.trim().replace(/,$/, "");
    if (!trimmed) return;
    if (values.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...values, trimmed]);
    setDraft("");
  }
  return (
    <div className="flex flex-wrap items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1.5 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700"
        >
          {v}
          <Button
            variant="secondary"
            size="md"
            onClick={() => onChange(values.filter((e) => e !== v))}
            aria-label={t("marketing.seller_form.aria_remove_chip", { value: v })}
          >
            ×
          </Button>
        </span>
      ))}
      <Input
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          // Trailing comma → commit + reset draft.
          if (v.endsWith(",")) {
            commit(v);
          } else {
            setDraft(v);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (
            e.key === "Backspace" &&
            draft === "" &&
            values.length > 0
          ) {
            onChange(values.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (draft.trim()) commit(draft);
        }}
        placeholder={placeholder}
        className="flex-1 min-w-[140px] bg-transparent px-1 text-sm outline-none"
      />
    </div>
  );
}

/** M15.45 — single weekday window row inside the working-hours
 *  editor. Toggle (enabled) + start + end time inputs. */
function DayRow({
  label,
  enabled,
  start,
  end,
  onToggle,
  onStart,
  onEnd,
}: {
  label: string;
  enabled: boolean;
  start: string;
  end: string;
  onToggle: (v: boolean) => void;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <label className="flex w-24 items-center gap-2">
        <Checkbox
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="font-medium text-slate-700">{label}</span>
      </label>
      <Input
        type="time"
        value={start}
        onChange={(e) => onStart(e.target.value)}
        disabled={!enabled}
        className="rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100 disabled:text-slate-400"
      />
      <span className="text-slate-400">—</span>
      <Input
        type="time"
        value={end}
        onChange={(e) => onEnd(e.target.value)}
        disabled={!enabled}
        className="rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}
