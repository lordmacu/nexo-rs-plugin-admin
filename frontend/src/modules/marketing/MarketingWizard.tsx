// Marketing module first-run wizard. Surfaces a 2-step
// guided setup (mailbox + seller) when the operator lands
// on `/m/marketing` with an empty config.
//
// Dismiss behaviour: "Saltar por ahora" hides the wizard
// for the current browser tab only — in-memory React
// state, not localStorage. Once the operator actually
// configures a mailbox + seller, the wizard auto-hides
// forever (visibility derives from
// `isConfigured(mailboxes, sellers)`). If the config is
// still empty after a full page reload, the wizard
// returns — the dismiss flag intentionally does NOT
// persist so an operator who skipped on accident gets
// another chance.
//
// Why not a separate route: the wizard fires once per
// tenant lifecycle and competes with the empty inbox for
// real estate. Embedding it as an overlay on InboxEmpty
// keeps the URL stable so the operator's bookmark to
// `/m/marketing` always works.

import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Check,
  ChevronRight,
  Inbox,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";

import {
  Button,
  Checkbox,
  Field,
  Heading,
  Input,
  Modal,
  Select,
  Stepper,
  Text,
  Textarea,
} from "../../components/ui";
import { useT } from "../../i18n";
import {
  lookupEmailAutoconfig,
  saveCredential,
  saveMailboxes,
  saveSellers,
} from "../../api/marketing";
import { adminCall } from "../../api/admin";
import { listAgents, type AgentSummary } from "../../api/agents";
import CredentialField from "./components/CredentialField";
import { lookupEmailProvider } from "./data/emailProviders";
import { useMarketingConfig } from "../../store/marketingConfig";
import { useTenantStore } from "../../store/tenant";

type Step = "welcome" | "mailbox" | "seller" | "done";

interface MailboxDraft {
  id: string;
  address: string;
  provider: "imap";
  imap_host: string;
  imap_port: string;
  username: string;
  /** Plaintext password the operator types in the wizard.
   *  Persisted as a daemon-managed secret on save via
   *  `nexo/admin/credentials/register` (channel=email) — the
   *  email plugin reads it back at runtime. Cleared on
   *  successful save. */
  password: string;
  /** `true` ⇒ port 993 (implicit TLS). `false` ⇒ port 143 +
   *  STARTTLS upgrade. Mapped to `imap.tls` on the
   *  credentials/register metadata. */
  use_ssl: boolean;
  /** SMTP outbound coords for the same email plugin instance.
   *  The persister requires both IMAP + SMTP blocks under one
   *  instance entry; auto-filled from the provider table when
   *  the address domain is known. */
  smtp_host: string;
  smtp_port: string;
  smtp_starttls: boolean;
  poll_mode: "idle" | "adaptive" | "poll";
  poll_interval_seconds: string;
}

interface SellerDraft {
  id: string;
  name: string;
  primary_email: string;
  signature_text: string;
  smtp_host: string;
  smtp_port: string;
  smtp_username: string;
  /** Plaintext SMTP password — same secret-management story
   *  as `MailboxDraft.password`. */
  smtp_password: string;
  smtp_starttls: boolean;
  /** Bound `agents.yaml.<id>`. Marketing uses the agent's
   *  `ModelRef` + `system_prompt` for AI drafts. Empty string
   *  ⇒ seller has no AI assist (operator writes drafts
   *  manually) — almost always the wrong choice for a
   *  first-run setup, so the wizard nudges the operator to
   *  pick one. */
  agent_id: string;
}

const DEFAULT_MAILBOX: MailboxDraft = {
  id: "primary",
  address: "",
  provider: "imap",
  imap_host: "",
  imap_port: "993",
  username: "",
  password: "",
  use_ssl: true,
  smtp_host: "",
  smtp_port: "587",
  smtp_starttls: true,
  poll_mode: "idle",
  poll_interval_seconds: "60",
};

const DEFAULT_SELLER: SellerDraft = {
  id: "default",
  name: "",
  primary_email: "",
  signature_text: "",
  smtp_host: "smtp.gmail.com",
  smtp_port: "587",
  smtp_username: "",
  smtp_password: "",
  smtp_starttls: true,
  agent_id: "",
};

/** Returns `true` when the marketing config carries at
 *  least one mailbox AND one seller — the operator has
 *  done the minimal first-run setup, so the wizard never
 *  needs to surface again. */
export function isConfigured(
  mailboxesLen: number,
  sellersLen: number,
): boolean {
  return mailboxesLen > 0 && sellersLen > 0;
}

/** Hook the parent (InboxEmpty) consumes to decide whether
 *  to render the wizard. Returns `{ visible, dismiss }`.
 *  Visible iff the config is empty AND the operator has
 *  not pressed "Saltar por ahora" yet during this mount AND
 *  we aren't still loading the config slice.
 *
 *  Dismiss is intentionally NOT persisted across sessions —
 *  if the operator dismissed on accident and refreshes, they
 *  get another chance. The wizard ONLY auto-hides forever
 *  after the config actually goes non-empty. */
export function useMarketingWizardVisibility() {
  // Tenant id is read so the hook re-runs on tenant switch
  // (clears the in-memory dismissed flag because it was
  // tied to the previous tenant's intent).
  const tenantId = useTenantStore((s) => s.activeTenantId);
  const mailboxes = useMarketingConfig((s) => s.mailboxes);
  const sellers = useMarketingConfig((s) => s.sellers);
  const [dismissed, setDismissedState] = useState(false);

  // Tenant switch resets the dismissed flag — the new
  // tenant's "skip for now" intent is independent.
  useEffect(() => {
    setDismissedState(false);
  }, [tenantId]);

  const stillLoading =
    mailboxes.source === "loading" || sellers.source === "loading";
  const configured = isConfigured(mailboxes.data.length, sellers.data.length);
  // Hide while the slices are still hydrating from the API
  // so we don't flash the wizard for an instant.
  const visible = !stillLoading && !configured && !dismissed;

  return {
    visible,
    dismiss: () => setDismissedState(true),
  };
}

interface Props {
  onClose: () => void;
}

export default function MarketingWizard({ onClose }: Props) {
  const t = useT();
  const [step, setStep] = useState<Step>("welcome");
  const [mailbox, setMailbox] = useState<MailboxDraft>(DEFAULT_MAILBOX);
  const [seller, setSeller] = useState<SellerDraft>(DEFAULT_SELLER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshConfig = useMarketingConfig((s) => s.fetchAll);
  const activeTenantId = useTenantStore((s) => s.activeTenantId);

  // Pre-fill the seller's primary_email from the mailbox
  // address once the operator finishes step 1 — the common
  // case is the first seller IS the mailbox owner. We also
  // derive the seller `id` from the email's local part here
  // (same sanitisation as the manual `setPrimaryEmail` path)
  // so a wizard run that never edits the email field still
  // ends up with a meaningful id (`yo`, `pedro`, …) instead
  // of the placeholder `default` from `DEFAULT_SELLER`.
  useEffect(() => {
    if (step !== "seller") return;
    setSeller((cur) => {
      if (cur.primary_email.length > 0) return cur;
      if (mailbox.address.length === 0) return cur;
      const at = mailbox.address.lastIndexOf("@");
      const local = at > 0 ? mailbox.address.slice(0, at) : "";
      const derivedId =
        local
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "") || "default";
      return {
        ...cur,
        id: derivedId,
        primary_email: mailbox.address,
        smtp_username: mailbox.address,
      };
    });
  }, [step, mailbox.address]);

  function gotoMailbox() {
    setError(null);
    setStep("mailbox");
  }

  async function saveMailboxStep() {
    setError(null);
    if (!mailbox.address.includes("@")) {
      setError(t("marketing.wizard.error.address_invalid"));
      return;
    }
    if (!mailbox.imap_host.trim()) {
      setError(t("marketing.wizard.error.imap_host_required"));
      return;
    }
    if (!mailbox.username.trim()) {
      setError(t("marketing.wizard.error.imap_username_required"));
      return;
    }
    if (!mailbox.password) {
      setError(t("marketing.credentials.probe_need_password"));
      return;
    }
    // Fallback when neither the hardcoded provider table nor
    // autoconfig filled SMTP — derive from the IMAP host by
    // prefix swap (`imap.example.com` → `smtp.example.com`).
    // Most ISPs follow that convention; if not, the
    // credentials/register probe will fail loudly and the
    // operator can re-run after fixing.
    let smtpHost = mailbox.smtp_host.trim();
    if (!smtpHost) {
      smtpHost = mailbox.imap_host
        .trim()
        .replace(/^imap\./i, "smtp.")
        .replace(/^mail\./i, "smtp.");
    }
    setBusy(true);
    try {
      // Step A — register the email channel credential. The
      // daemon's `EmailPersister` writes
      // `<state_root>/secrets/email/<instance>.toml` (mode 0600)
      // + appends an entry to `plugins/email.yaml` with both
      // IMAP + SMTP transport coords. The marketing extension's
      // mailbox row only references the instance id; the email
      // plugin resolves credentials at runtime from the daemon
      // config.
      await adminCall("nexo/admin/credentials/register", {
        channel: "email",
        instance: mailbox.id,
        agent_ids: [],
        payload: {
          address: mailbox.address.trim(),
          password: mailbox.password,
        },
        metadata: {
          imap: {
            host: mailbox.imap_host.trim(),
            port: Number(mailbox.imap_port) || 993,
            tls: mailbox.use_ssl ? "implicit_tls" : "starttls",
          },
          smtp: {
            host: smtpHost,
            port: Number(mailbox.smtp_port) || 587,
            tls: mailbox.smtp_starttls ? "starttls" : "implicit_tls",
          },
          // Bootstrap-limit so the first run on a populated
          // inbox doesn't churn through years of historicals.
          // 50 covers "the last few days of mail" for most
          // operators; advanced users can tune via direct YAML
          // edit (or future Settings UI) once the wizard saves.
          bootstrap_limit: 50,
        },
      });
      // Step B — write the marketing mailbox row pointing at
      // the email plugin instance we just registered. Schema
      // matches `nexo_tool_meta::marketing::MailboxConfig` —
      // see `proyecto/crates/tool-meta/src/marketing.rs`.
      await saveMailboxes([
        {
          id: mailbox.id,
          tenant_id: activeTenantId ?? "default",
          address: mailbox.address.trim(),
          provider: "imap_password",
          mode: mailbox.poll_mode,
          poll_interval_seconds: Number(mailbox.poll_interval_seconds) || 60,
          active: true,
          draft_mode: true,
          active_hours: null,
          email_plugin_instance: mailbox.id,
        } as never,
      ]);
      setStep("seller");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function saveSellerStep() {
    setError(null);
    if (!seller.name.trim()) {
      setError(t("marketing.wizard.error.name_required"));
      return;
    }
    if (!seller.primary_email.includes("@")) {
      setError(t("marketing.wizard.error.primary_email_invalid"));
      return;
    }
    if (!seller.smtp_host.trim() || !seller.smtp_username.trim()) {
      setError(t("marketing.wizard.error.smtp_host_username_required"));
      return;
    }
    if (!seller.smtp_password) {
      setError(t("marketing.credentials.probe_need_password"));
      return;
    }
    if (!seller.agent_id) {
      setError(t("marketing.wizard.error.agent_required"));
      return;
    }
    setBusy(true);
    try {
      const sig =
        seller.signature_text.trim().length > 0
          ? seller.signature_text
          : `—\n${seller.name.trim()}`;
      const cred = await saveCredential("smtp", seller.id, seller.smtp_password);
      // Schema mirrors `nexo_tool_meta::marketing::Seller`. Every
      // non-`#[serde(default)]` field has to be present in the
      // body — `tenant_id`, `working_hours`, `vacation_until`,
      // `preferred_language`. The optional fields with
      // `#[serde(default)]` (`agent_id`, `model_override`,
      // `notification_settings`, `draft_template`) we drop
      // entirely; the `Some` payload only flows once the
      // operator wires those from the Settings UI.
      await saveSellers([
        {
          id: seller.id,
          tenant_id: activeTenantId ?? "default",
          name: seller.name.trim(),
          primary_email: seller.primary_email.trim(),
          alt_emails: [],
          signature_text: sig,
          working_hours: null,
          on_vacation: false,
          vacation_until: null,
          preferred_language: null,
          // `agent_id` is what wires the seller into AI drafts
          // — without it marketing has no LLM to call. The
          // wizard's Step 2 surface forces a pick before save
          // (validation above), so this branch always emits it.
          ...(seller.agent_id ? { agent_id: seller.agent_id } : {}),
          smtp_credential: {
            // `instance` is the broker-topic discriminator
            // (`plugin.outbound.email.<instance>`). The email
            // plugin only subscribes to instances declared in
            // its yaml; we route through the mailbox's
            // already-registered instance so outbound publishes
            // land on a topic the daemon-side plugin actually
            // listens to. When a seller needs a separate SMTP
            // identity (different account from the mailbox),
            // the operator wires that via Settings → register
            // a second email plugin instance and edit the
            // seller's row to point at it.
            instance: mailbox.id,
            host: seller.smtp_host.trim(),
            port: Number(seller.smtp_port) || 587,
            username: seller.smtp_username.trim(),
            password_env: cred.env_name,
            starttls: seller.smtp_starttls,
          },
        } as never,
      ]);
      // Re-fetch the config slice so the InboxEmpty
      // detection logic sees mailbox + seller as configured
      // and the wizard auto-hides on next mount.
      await refreshConfig();
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const wizardSteps = [
    { id: "welcome", label: t("marketing.wizard.step.welcome") },
    { id: "mailbox", label: t("marketing.wizard.step.mailbox") },
    { id: "seller", label: t("marketing.wizard.step.seller") },
    { id: "done", label: t("marketing.wizard.step.done") },
  ];

  return (
    <Modal onClose={onClose} size="lg">
      <div data-testid="marketing-wizard">
        <Stepper steps={wizardSteps} activeId={step} />

        <div className="px-8 pb-8 pt-6">
          {step === "welcome" && (
            <WelcomeStep onNext={gotoMailbox} onSkip={onClose} />
          )}
          {step === "mailbox" && (
            <MailboxStep
              draft={mailbox}
              onChange={setMailbox}
              onContinue={() => void saveMailboxStep()}
              busy={busy}
              error={error}
            />
          )}
          {step === "seller" && (
            <SellerStep
              draft={seller}
              onChange={setSeller}
              onContinue={() => void saveSellerStep()}
              busy={busy}
              error={error}
            />
          )}
          {step === "done" && <DoneStep onClose={onClose} />}
        </div>
      </div>
    </Modal>
  );
}

function WelcomeStep({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const t = useT();
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Sparkles size={20} />
      </div>
      <Heading level={2} size="lg">
        <span className="mx-auto">{t("marketing.wizard.welcome.title")}</span>
      </Heading>
      <Text as="p" tone="secondary" size="sm">
        {t("marketing.wizard.welcome.body")}
      </Text>
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button
          variant="secondary"
          size="md"
          onClick={onSkip}
          data-testid="marketing-wizard-skip"
        >
          {t("common.skip")}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onNext}
          data-testid="marketing-wizard-start"
        >
          {t("common.start")}
        </Button>
      </div>
    </div>
  );
}

function MailboxStep({
  draft,
  onChange,
  onContinue,
  busy,
  error,
}: {
  draft: MailboxDraft;
  /** Accepts both the next-value and updater-fn form so we can
   *  apply async autoconfig results without racing against the
   *  operator's typing. Matches `useState`'s setter shape. */
  onChange: Dispatch<SetStateAction<MailboxDraft>>;
  onContinue: () => void;
  busy: boolean;
  error: string | null;
}) {
  const t = useT();
  const [autoDetected, setAutoDetected] = useState<string | null>(null);
  const set = <K extends keyof MailboxDraft>(k: K, v: MailboxDraft[K]) =>
    onChange({ ...draft, [k]: v });
  // Address auto-syncs into Username + auto-detects IMAP host
  // from the email domain (Gmail, Outlook, Zoho hardcoded;
  // unknown domains hit Mozilla's autoconfig service via the
  // backend). Operator edits override either auto-fill: the
  // Username mirror stops the moment Username diverges, the
  // host stays whatever the operator last typed.
  const setAddress = (next: string) => {
    const usernameWasMirroring = draft.username === draft.address;
    const hostWasEmpty = !draft.imap_host.trim();
    // Auto-derive the mailbox id from the email's local part
    // — same sanitisation as the seller step so a single
    // wizard run ends up with `<address-local>` ids on both
    // mailbox + seller (cleaner audit + easier to map). Server
    // re-uses this id as the email plugin instance, so a stable
    // derivation also keeps the secret filename stable across
    // re-runs.
    const at = next.lastIndexOf("@");
    const localPart = at > 0 ? next.slice(0, at) : "";
    const derivedId =
      localPart
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "primary";
    let updated: MailboxDraft = {
      ...draft,
      address: next,
      id: derivedId,
      ...(usernameWasMirroring ? { username: next } : {}),
    };
    // Hardcoded provider lookup runs synchronously on every
    // keystroke — cheap, no network.
    const provider = lookupEmailProvider(next);
    if (provider && hostWasEmpty) {
      updated = {
        ...updated,
        imap_host: provider.imap_host,
        imap_port: String(provider.imap_port),
        use_ssl: provider.imap_implicit_tls,
        smtp_host: provider.smtp_host,
        smtp_port: String(provider.smtp_port),
        smtp_starttls: provider.smtp_starttls,
      };
      setAutoDetected(provider.label);
    } else if (!provider) {
      setAutoDetected(null);
    }
    onChange(updated);
    // Async fallback to Mozilla autoconfig for domains not in
    // the hardcoded table. Only fires when the email looks
    // complete (`@` + a dot-suffixed domain) and the host field
    // is still empty — otherwise we'd clobber the operator's
    // manual edits.
    if (!provider && next.includes("@") && hostWasEmpty) {
      const at = next.lastIndexOf("@");
      const domain = next.slice(at + 1);
      if (domain.includes(".") && domain.length > 3) {
        void lookupEmailAutoconfig(domain).then((r) => {
          if (!r.found || !r.imap?.host) return;
          // Re-check host emptiness in case the operator typed
          // something while we were awaiting the network call.
          onChange((cur: MailboxDraft) =>
            cur.imap_host.trim()
              ? cur
              : ({
                  ...cur,
                  imap_host: r.imap?.host ?? cur.imap_host,
                  imap_port: r.imap?.port
                    ? String(r.imap.port)
                    : cur.imap_port,
                  use_ssl:
                    r.imap?.socket_type === "SSL" ||
                    r.imap?.socket_type === "TLS",
                  smtp_host: r.smtp?.host ?? cur.smtp_host,
                  smtp_port: r.smtp?.port
                    ? String(r.smtp.port)
                    : cur.smtp_port,
                  smtp_starttls: r.smtp?.socket_type === "STARTTLS",
                } satisfies MailboxDraft),
          );
          setAutoDetected(domain);
        });
      }
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail size={16} className="text-accent" />
        <Heading level={3} size="md">
          {t("marketing.wizard.mailbox.title")}
        </Heading>
      </div>
      <Text as="p" tone="meta" size="xs">
        {t("marketing.wizard.mailbox.body")}
      </Text>

      <Field label="Address (email del mailbox)">
        <Input
          type="email"
          value={draft.address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="ventas@acme.com"
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          data-testid="wiz-mb-address"
        />
        {autoDetected && (
          <p
            className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700"
            data-testid="wiz-mb-auto-detected"
          >
            ✓ {t("marketing.wizard.field.auto_detected", { provider: autoDetected })}
          </p>
        )}
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="IMAP host">
          <Input
            value={draft.imap_host}
            onChange={(e) => set("imap_host", e.target.value)}
            placeholder="imap.gmail.com"
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
            data-testid="wiz-mb-imap-host"
          />
        </Field>
        <Field label="Port">
          <Input
            type="number"
            value={draft.imap_port}
            onChange={(e) => set("imap_port", e.target.value)}
            min={1}
            max={65535}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </Field>
        <Field label="SSL">
          <label className="mt-2 flex items-center gap-2 text-xs">
            <Checkbox
              checked={draft.use_ssl}
              onChange={(e) => set("use_ssl", e.target.checked)}
            />
            <span>STARTTLS / TLS</span>
          </label>
        </Field>
      </div>
      <Field label={t("marketing.wizard.field.imap_username")}>
        <Input
          value={draft.username}
          onChange={(e) => set("username", e.target.value)}
          placeholder="ventas@acme.com"
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
          data-testid="wiz-mb-username"
        />
      </Field>
      <CredentialField
        scope="imap"
        value={draft.password}
        onChange={(v) => set("password", v)}
        probe={{
          host: draft.imap_host.trim(),
          port: Number(draft.imap_port) || 993,
          username: draft.username.trim(),
          tls: draft.use_ssl ? "implicittls" : "starttls",
        }}
        inputTestId="wiz-mb-password"
      />

      {error && (
        <p
          className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700"
          data-testid="marketing-wizard-error"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          size="md"
          busy={busy}
          trailingIcon={<ChevronRight size={12} />}
          onClick={onContinue}
          data-testid="marketing-wizard-mailbox-save"
        >
          {t("marketing.wizard.save_mailbox")}
        </Button>
      </div>
    </div>
  );
}

function SellerStep({
  draft,
  onChange,
  onContinue,
  busy,
  error,
}: {
  draft: SellerDraft;
  onChange: Dispatch<SetStateAction<SellerDraft>>;
  onContinue: () => void;
  busy: boolean;
  error: string | null;
}) {
  const t = useT();
  const set = <K extends keyof SellerDraft>(k: K, v: SellerDraft[K]) =>
    onChange({ ...draft, [k]: v });
  // Fetch the agents list once on mount. The seller MUST be
  // bound to an agent for AI drafts to fire — without it
  // marketing has no `ModelRef` to call. We also auto-select
  // the only agent when there's just one (very common in
  // first-run setups) so the operator can advance without
  // touching the dropdown.
  const [agents, setAgents] = useState<readonly AgentSummary[]>([]);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    listAgents()
      .then((list) => {
        if (cancelled) return;
        setAgents(list);
        if (list.length === 1 && !draft.agent_id) {
          onChange((cur) => ({ ...cur, agent_id: list[0]!.id }));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setAgentsError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
    // Run once — `onChange` / `draft.agent_id` are stable enough
    // that re-running on every keystroke would just re-fetch the
    // same list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Mirror the mailbox step's auto-detect for SMTP outbound:
  // the moment the operator types primary_email, fill SMTP
  // host / port from the hardcoded provider table (or Mozilla
  // autoconfig for unknown domains). Operator edits to
  // smtp_host always win.
  const setPrimaryEmail = (next: string) => {
    const usernameWasMirroring = draft.smtp_username === draft.primary_email;
    const hostWasEmpty = !draft.smtp_host.trim();
    // Auto-derive the seller id from the email's local part —
    // hidden in the UI, kept stable so the marketing config
    // points at a deterministic instance. `pedro@acme.com`
    // → `pedro`. Falls back to `default` when no `@` yet.
    const at = next.lastIndexOf("@");
    const localPart = at > 0 ? next.slice(0, at) : "";
    const derivedId =
      localPart
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "") || "default";
    let updated: SellerDraft = {
      ...draft,
      primary_email: next,
      id: derivedId,
      ...(usernameWasMirroring ? { smtp_username: next } : {}),
    };
    const provider = lookupEmailProvider(next);
    if (provider && hostWasEmpty) {
      updated = {
        ...updated,
        smtp_host: provider.smtp_host,
        smtp_port: String(provider.smtp_port),
        smtp_starttls: provider.smtp_starttls,
      };
    }
    onChange(updated);
    if (!provider && next.includes("@") && hostWasEmpty) {
      const at = next.lastIndexOf("@");
      const domain = next.slice(at + 1);
      if (domain.includes(".") && domain.length > 3) {
        void lookupEmailAutoconfig(domain).then((r) => {
          if (!r.found || !r.smtp?.host) return;
          onChange((cur: SellerDraft) =>
            cur.smtp_host.trim()
              ? cur
              : ({
                  ...cur,
                  smtp_host: r.smtp?.host ?? cur.smtp_host,
                  smtp_port: r.smtp?.port
                    ? String(r.smtp.port)
                    : cur.smtp_port,
                  smtp_starttls: r.smtp?.socket_type === "STARTTLS",
                } satisfies SellerDraft),
          );
        });
      }
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserRound size={16} className="text-accent" />
        <Heading level={3} size="md">
          {t("marketing.wizard.seller.title")}
        </Heading>
      </div>
      <Text as="p" tone="meta" size="xs">
        {t("marketing.wizard.seller.body")}
      </Text>
      <Field label="Nombre">
        <Input
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("marketing.wizard.field.seller_name_placeholder")}
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          data-testid="wiz-seller-name"
        />
      </Field>
      <Field label="Email primario">
        <Input
          type="email"
          value={draft.primary_email}
          onChange={(e) => setPrimaryEmail(e.target.value)}
          placeholder="pedro@acme.com"
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          data-testid="wiz-seller-email"
        />
      </Field>
      <Field
        label={t("marketing.wizard.field.agent_label")}
        hint={t("marketing.wizard.field.agent_hint")}
      >
        <Select
          value={draft.agent_id}
          onChange={(e) => set("agent_id", e.target.value)}
          data-testid="wiz-seller-agent"
        >
          <option value="">{t("marketing.wizard.field.agent_pick")}</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.id}
              {a.active ? "" : t("marketing.wizard.field.agent_inactive")}
            </option>
          ))}
        </Select>
        {agentsError && (
          <Text tone="meta" size="xs">
            {agentsError}
          </Text>
        )}
        {agents.length === 0 && !agentsError && (
          <Text tone="meta" size="xs">
            {t("marketing.wizard.field.agent_none_yet")}
          </Text>
        )}
      </Field>
      <Field
        label="Firma"
        hint={t("marketing.wizard.field.signature_hint")}
      >
        <Textarea
          value={draft.signature_text}
          onChange={(e) => set("signature_text", e.target.value)}
          rows={3}
          placeholder={`—\n${draft.name || "Nombre"}`}
          className="w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
          data-testid="wiz-seller-signature"
        />
      </Field>

      <div className="rounded border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-medium text-slate-700">SMTP outbound</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Host">
            <Input
              value={draft.smtp_host}
              onChange={(e) => set("smtp_host", e.target.value)}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
              data-testid="wiz-seller-smtp-host"
            />
          </Field>
          <Field label="Port">
            <Input
              type="number"
              value={draft.smtp_port}
              onChange={(e) => set("smtp_port", e.target.value)}
              min={1}
              max={65535}
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="STARTTLS">
            <label className="mt-2 flex items-center gap-2 text-xs">
              <Checkbox
                checked={draft.smtp_starttls}
                onChange={(e) => set("smtp_starttls", e.target.checked)}
              />
              <span>587 STARTTLS</span>
            </label>
          </Field>
        </div>
        <Field label="Username">
          <Input
            value={draft.smtp_username}
            onChange={(e) => set("smtp_username", e.target.value)}
            placeholder="(igual a primary_email para Gmail)"
            className="mt-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm font-mono"
            data-testid="wiz-seller-smtp-username"
          />
        </Field>
        <CredentialField
          scope="smtp"
          value={draft.smtp_password}
          onChange={(v) => set("smtp_password", v)}
          probe={{
            host: draft.smtp_host.trim(),
            port: Number(draft.smtp_port) || 587,
            username: draft.smtp_username.trim(),
            starttls: draft.smtp_starttls,
          }}
          inputTestId="wiz-seller-smtp-password"
        />
      </div>

      {error && (
        <p
          className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-700"
          data-testid="marketing-wizard-error"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          size="md"
          busy={busy}
          trailingIcon={<Check size={12} />}
          onClick={onContinue}
          data-testid="marketing-wizard-seller-save"
        >
          {t("marketing.wizard.save_seller")}
        </Button>
      </div>
    </div>
  );
}

function DoneStep({ onClose }: { onClose: () => void }) {
  const t = useT();
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
        <Check size={20} />
      </div>
      <Heading level={2} size="lg">
        <span className="mx-auto">{t("marketing.wizard.done.title")}</span>
      </Heading>
      <Text as="p" tone="secondary" size="sm">
        {t("marketing.wizard.done.body")}
      </Text>
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button
          variant="primary"
          size="md"
          leadingIcon={<Inbox size={12} />}
          onClick={onClose}
          data-testid="marketing-wizard-done"
        >
          {t("marketing.wizard.see_inbox")}
        </Button>
      </div>
    </div>
  );
}
