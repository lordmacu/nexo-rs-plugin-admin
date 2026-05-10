// Real client for the marketing extension via the microapp's
// /api/marketing/* proxy. Wire shapes mirror
// nexo-tool-meta::marketing — keep these aligned with
// modules/marketing/data/mockData.ts so swapping mock → real
// is path-only.
//
// Bearer auth comes from the microapp's existing client
// (Authorization header injected by authedFetch). The
// microapp resolves tenant id server-side and stamps
// X-Tenant-Id on the proxied request — the frontend never
// sends a tenant id.

import { authedFetch, HttpError } from "./client";
import { useAuth } from "../store/auth";

export type LeadState =
  | "cold"
  | "engaged"
  | "meeting_scheduled"
  | "qualified"
  | "lost";

export type SentimentBand =
  | "very_negative"
  | "negative"
  | "neutral"
  | "positive"
  | "very_positive";

export type IntentClass =
  | "browsing"
  | "comparing"
  | "ready_to_buy"
  | "objecting"
  | "support_request"
  | "out_of_scope";

export interface Lead {
  readonly id: string;
  readonly tenant_id: string;
  readonly thread_id: string;
  readonly subject: string;
  readonly person_id: string;
  readonly seller_id: string;
  readonly state: LeadState;
  readonly score: number;
  readonly sentiment: SentimentBand;
  readonly intent: IntentClass;
  readonly topic_tags: readonly string[];
  readonly last_activity_ms: number;
  readonly next_check_at_ms: number | null;
  readonly followup_attempts: number;
  readonly why_routed: readonly string[];
  /** M15.21.notes — free-form operator scratch pad (markdown).
   *  `null` / omitted = column NULL on disk; empty string is
   *  also legal and round-trips. Never authored by the LLM. */
  readonly operator_notes?: string | null;
}

export interface MarketingHealth {
  readonly ok: boolean;
  readonly status: string;
  readonly version: string;
}

interface ApiOk<T> {
  ok: true;
  result: T;
}

interface ApiError {
  ok: false;
  error: { code: string; message?: string };
}

async function call<T>(path: string): Promise<T> {
  const res = await authedFetch(`/api/marketing${path}`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON marketing response)");
  }
  const wrapped = body as ApiOk<T> | ApiError;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ApiError).error ?? {
      code: "unknown",
      message: String(res.status),
    };
    throw new HttpError(res.status, err);
  }
  return (wrapped as ApiOk<T>).result;
}

/** GET /api/marketing/healthz — extension up / down. */
export async function marketingHealthz(): Promise<MarketingHealth> {
  const res = await authedFetch(`/api/marketing/healthz`);
  return (await res.json()) as MarketingHealth;
}

/** GET /api/marketing/leads — list. With ?state= returns
 *  count_by_state; without returns the followup-due envelope. */
export async function listLeads(opts: {
  state?: LeadState;
  limit?: number;
}): Promise<{
  leads?: readonly Lead[];
  now_ms?: number;
  limit?: number;
  filter?: { state: string };
  count?: number;
}> {
  const qs = new URLSearchParams();
  if (opts.state) qs.set("state", opts.state);
  if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
  const q = qs.toString();
  return call(`/leads${q ? `?${q}` : ""}`);
}

/** GET /api/marketing/leads/:lead_id — single fetch.
 *  Throws HttpError(404) when missing. */
export async function getLead(leadId: string): Promise<{ lead: Lead }> {
  return call(`/leads/${encodeURIComponent(leadId)}`);
}

/** Mirror of `nexo-rs-extension-marketing::lead::store::ThreadMessage`.
 *  Field names line up with the mock fixture so swapping is
 *  path-only. */
export type MessageDirection = "inbound" | "outbound" | "draft";
export type DraftStatus = "pending" | "approved" | "rejected";

export interface ThreadMessage {
  readonly id: string;
  readonly direction: MessageDirection;
  readonly from_label: string;
  readonly body: string;
  readonly at_ms: number;
  readonly draft_status?: DraftStatus;
  /** Optional per-draft subject override. Server omits
   *  the field when null; UI falls back to the lead
   *  subject in that case. */
  readonly subject?: string;
}

/** POST /api/marketing/leads/:lead_id/transition — manual
 *  state transition driven by the operator from the lead
 *  drawer's StateMachine. Server validates target legality
 *  via the state machine + records audit + publishes
 *  firehose. Typed errors:
 *  - 400 invalid_state         — target garbled
 *  - 404 lead_not_found        — wrong tenant / id
 *  - 422 illegal_transition    — state machine refused */
export async function transitionLead(
  leadId: string,
  body: { to: LeadState; reason?: string },
): Promise<{
  lead: Lead;
  from: LeadState;
  to: LeadState;
  reason: string;
}> {
  return putOrPostJson(
    `/leads/${encodeURIComponent(leadId)}/transition`,
    "POST",
    body,
  );
}

/** PUT /api/marketing/leads/:lead_id/notes — replace the
 *  free-form operator scratch pad (markdown). `null` clears
 *  the column to SQL NULL; empty string persists faithfully
 *  so the editor can clear without re-introducing nulls.
 *  Returns the refreshed Lead so callers can stamp the
 *  drawer state without a second round-trip.
 *  Typed errors:
 *  - 404 lead_not_found        — wrong tenant / id */
export async function updateLeadNotes(
  leadId: string,
  notes: string | null,
): Promise<{ lead: Lead }> {
  return putOrPostJson(`/leads/${encodeURIComponent(leadId)}/notes`, "PUT", {
    notes,
  });
}

/** Body shape for the followup override endpoint — matches
 *  the daemon's `FollowupOverrideBody` tagged union. */
export type FollowupOverrideBody =
  | { action: "skip"; reason?: string }
  | { action: "postpone"; until_ms: number; reason?: string };

/** POST /api/marketing/leads/:lead_id/followup/override —
 *  operator skip / postpone bypass. `skip` clears
 *  `next_check_at_ms`; `postpone` bumps it forward to the
 *  operator-chosen wall-clock ms. Returns the refreshed
 *  Lead so the drawer can stamp the new value without a
 *  second round-trip.
 *  Typed errors:
 *  - 400 invalid_body            — missing fields per action
 *  - 400 postpone_in_past        — until_ms <= now
 *  - 404 lead_not_found          — wrong tenant / id */
export async function followupOverride(
  leadId: string,
  body: FollowupOverrideBody,
): Promise<{
  lead: Lead;
  action: "skip" | "postpone";
  next_check_at_ms: number | null;
  reason: string;
}> {
  return putOrPostJson(
    `/leads/${encodeURIComponent(leadId)}/followup/override`,
    "POST",
    body,
  );
}

/** GET /api/marketing/leads/:lead_id/thread — chronological
 *  message list. Empty thread is a 200 with `messages: []`;
 *  404 when the lead doesn't exist for the active tenant. */
export async function getLeadThread(leadId: string): Promise<{
  lead_id: string;
  messages: readonly ThreadMessage[];
  count: number;
}> {
  return call(`/leads/${encodeURIComponent(leadId)}/thread`);
}

// ── Per-tenant draft template config ───────────────────────

export interface DraftTemplateConfig {
  readonly template: string;
  readonly source: "tenant" | "default";
  readonly default_template: string;
}

/** GET /api/marketing/config/draft_template — returns the
 *  active body, source ("tenant" / "default"), and the
 *  bundled default for the "reset" affordance. */
export async function getDraftTemplate(): Promise<DraftTemplateConfig> {
  return call(`/config/draft_template`);
}

/** PUT /api/marketing/config/draft_template. Server
 *  sandbox-renders the template against a fixture context
 *  before persisting; broken Handlebars surface as
 *  HttpError 400 `invalid_template` so the editor can
 *  paint the textarea red without crashing draft
 *  generation. */
export async function saveDraftTemplate(
  template: string,
): Promise<{ template: string; source: "tenant"; reloaded: boolean }> {
  return putJson(`/config/draft_template`, { template });
}

/** POST /api/marketing/config/draft_template/preview —
 *  sandbox-render the supplied Handlebars body against
 *  a fixture context and return the rendered string.
 *  Doesn't persist or hot-swap. Same typed errors as
 *  saveDraftTemplate (invalid_template / empty_template). */
export async function previewDraftTemplate(body: {
  template: string;
  operator_hint?: string;
}): Promise<{ rendered: string; fixture_summary: string }> {
  return putOrPostJson(`/config/draft_template/preview`, "POST", body);
}

// ── M15.21 — draft pipeline ─────────────────────────────────
//
// Wire shapes mirror `nexo-rs-extension-marketing::admin::leads`
// handlers. Operator UI uses these to render the AI draft card
// (pending / approved / rejected) in the lead drawer.

/** GET /api/marketing/leads/:lead_id/drafts?status=
 *  Lists `direction=draft` thread rows for a lead.
 *  Without a status filter returns every draft regardless of
 *  state; pass `status=pending` to scope the lead-drawer card
 *  to actionable rows. */
export async function listDrafts(
  leadId: string,
  opts: { status?: DraftStatus } = {},
): Promise<{
  lead_id: string;
  drafts: readonly ThreadMessage[];
  count: number;
}> {
  const qs = new URLSearchParams();
  if (opts.status) qs.set("status", opts.status);
  const suffix = qs.toString();
  return call(
    `/leads/${encodeURIComponent(leadId)}/drafts${suffix ? `?${suffix}` : ""}`,
  );
}

/** POST /api/marketing/leads/:lead_id/drafts — operator-authored
 *  draft. Server stamps `draft-<uuid>` id + `pending` status.
 *  Optional `subject` override is honoured by the approve
 *  handler instead of inheriting the lead subject. */
export async function createDraft(
  leadId: string,
  body: { body: string; from_label?: string; subject?: string },
): Promise<{ draft: ThreadMessage }> {
  return putOrPostJson(
    `/leads/${encodeURIComponent(leadId)}/drafts`,
    "POST",
    body,
  );
}

/** PUT /api/marketing/leads/:lead_id/drafts/:message_id — edits
 *  the body and optionally the per-draft subject override.
 *  Subject semantics:
 *  - `undefined` / not passed ⇒ leave subject untouched.
 *  - `""` (empty string) ⇒ clear the override (revert to
 *    inheriting the lead's subject at approve time).
 *  - any other string ⇒ persist verbatim.
 *
 *  Only valid while the draft is still `pending`;
 *  approved/rejected rows return `409 draft_locked`. */
export async function updateDraft(
  leadId: string,
  messageId: string,
  body: string,
  subject?: string,
): Promise<{ draft_id: string }> {
  const payload: { body: string; subject?: string } = { body };
  if (subject !== undefined) payload.subject = subject;
  return putOrPostJson(
    `/leads/${encodeURIComponent(leadId)}/drafts/${encodeURIComponent(messageId)}`,
    "PUT",
    payload,
  );
}

/** POST /api/marketing/leads/:lead_id/drafts/:message_id/reject —
 *  flips status to `rejected`. Idempotent: 409 once locked. */
export async function rejectDraft(
  leadId: string,
  messageId: string,
): Promise<{ draft_id: string; status: "rejected" }> {
  return putOrPostJson(
    `/leads/${encodeURIComponent(leadId)}/drafts/${encodeURIComponent(messageId)}/reject`,
    "POST",
    {},
  );
}

/** POST /api/marketing/leads/:lead_id/drafts/:message_id/approve —
 *  M15.21 slice 2: validates wiring, composes the outbound
 *  email, runs compliance gate + tracking prep, publishes
 *  through the broker, persists status + thread row + audit.
 *  Response carries the broker topic + outbound message id +
 *  optional tracking msg_id. */
export async function approveDraft(
  leadId: string,
  messageId: string,
  options: { attachmentRefs?: string[] } = {},
): Promise<{
  draft_id: string;
  status: "approved";
  topic: string;
  outbound_message_id: string;
  tracking_msg_id: string | null;
}> {
  // Body is optional server-side. Only include
  // attachment_refs when the operator picked any so the wire
  // payload stays empty for the legacy zero-attachment path.
  const body =
    options.attachmentRefs && options.attachmentRefs.length > 0
      ? { attachment_refs: options.attachmentRefs }
      : {};
  return putOrPostJson(
    `/leads/${encodeURIComponent(leadId)}/drafts/${encodeURIComponent(messageId)}/approve`,
    "POST",
    body,
  );
}

/** Tenant-wide pending draft row joined with lead context.
 *  Mirrors `nexo-rs-extension-marketing::lead::PendingDraftRow`.
 *  Powers the operator's drafts inbox queue. */
export interface PendingDraftRow {
  readonly lead_id: string;
  readonly message_id: string;
  readonly from_label: string;
  readonly body: string;
  readonly at_ms: number;
  readonly lead_subject: string;
  readonly lead_seller_id: string;
  readonly lead_person_id: string;
  readonly lead_state: string;
}

/** GET /api/marketing/drafts?limit=N — every pending
 *  draft across every lead. Default limit 50, clamped
 *  server-side to [1, 200]. Newest first. */
export async function listDraftsInbox(opts: { limit?: number } = {}): Promise<{
  drafts: readonly PendingDraftRow[];
  count: number;
  limit: number;
}> {
  const qs = new URLSearchParams();
  if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
  const suffix = qs.toString();
  return call(`/drafts${suffix ? `?${suffix}` : ""}`);
}

/** POST /api/marketing/leads/:lead_id/drafts/generate —
 *  M15.21 slice 4: operator pulls a fresh AI draft. The
 *  marketing extension resolves the lead + seller + last
 *  inbound, hands the structured context to the wired
 *  `DraftGenerator`, and persists the response as a
 *  pending draft row. Returns the canonical row so the
 *  caller can render it without a follow-up GET.
 *
 *  Both body fields are optional: `operator_hint` flows
 *  into the generator's context (default template renders
 *  it verbatim); `from_label` defaults to `"AI"`.
 *
 *  Typed error codes the lead drawer surfaces:
 *  - `503 draft_generator_disabled` — boot didn't wire one
 *  - `503 sellers_not_loaded`       — sellers.yaml missing
 *  - `404 lead_not_found`           — wrong tenant / id
 *  - `404 seller_not_found`         — lead bound to a
 *    seller missing from sellers.yaml
 *  - `500 template_invalid`         — operator template
 *    has bad Handlebars syntax
 *  - `502 generator_unavailable`    — LLM/agent backend
 *    refused (future LLM-backed impl)
 *  - `422 generator_empty_body`     — generator returned
 *    only whitespace */
export async function generateDraft(
  leadId: string,
  body: { operator_hint?: string; from_label?: string } = {},
): Promise<{ draft: ThreadMessage }> {
  return putOrPostJson(
    `/leads/${encodeURIComponent(leadId)}/drafts/generate`,
    "POST",
    body,
  );
}

/** DELETE /api/marketing/leads/:lead_id/drafts/:message_id —
 *  hard delete. Operator dismisses without leaving an audit
 *  trail (`reject` is the soft alternative). */
export async function deleteDraft(
  leadId: string,
  messageId: string,
): Promise<{ draft_id: string; deleted: true }> {
  const res = await authedFetch(
    `/api/marketing/leads/${encodeURIComponent(leadId)}/drafts/${encodeURIComponent(messageId)}`,
    { method: "DELETE" },
  );
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON marketing response)");
  }
  const wrapped = parsed as
    | ApiOk<{ draft_id: string; deleted: true }>
    | ApiError;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ApiError).error ?? { code: "unknown" };
    throw new HttpError(res.status, err);
  }
  return (wrapped as ApiOk<{ draft_id: string; deleted: true }>).result;
}

/** Internal — POST/PUT JSON helper used by the draft endpoints.
 *  Accepts 200 (PUT/approve/reject) and 201 (create), unwraps
 *  the same `{ ok, result }` envelope `call()` uses. */
async function putOrPostJson<T>(
  path: string,
  method: "POST" | "PUT",
  body: unknown,
): Promise<T> {
  const res = await authedFetch(`/api/marketing${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON marketing response)");
  }
  const wrapped = parsed as ApiOk<T> | ApiError;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ApiError).error ?? { code: "unknown" };
    throw new HttpError(res.status, err);
  }
  return (wrapped as ApiOk<T>).result;
}

// ── Config (read-only YAML) ─────────────────────────────────

/** Loose JSON shape for `/config/*` rows. Keep the shape
 *  permissive here; the Settings UI reads only a handful of
 *  fields per tab and ignores extras. The wire shapes track
 *  `nexo-tool-meta::marketing::{Seller,MailboxConfig,
 *  RuleSet,FollowupProfile}` byte-for-byte; pin per-tab when
 *  the operator UI starts validating. */
export type ConfigSeller = Record<string, unknown> & {
  id: string;
  name: string;
  primary_email: string;
};
export type ConfigMailbox = Record<string, unknown> & {
  id: string;
  address: string;
  provider: string;
};
export type ConfigFollowupProfile = Record<string, unknown> & {
  id: string;
  cadence: readonly string[];
  max_attempts: number;
};
export type ConfigRuleSet = Record<string, unknown> & {
  rules: ReadonlyArray<Record<string, unknown>>;
};

/** GET /api/marketing/config/mailboxes — list of mailbox
 *  configs from the per-tenant `mailboxes.yaml`. */
export async function getMailboxes(): Promise<{
  mailboxes: readonly ConfigMailbox[];
  count: number;
}> {
  return call(`/config/mailboxes`);
}

/** GET /api/marketing/config/sellers. */
export async function getSellers(): Promise<{
  sellers: readonly ConfigSeller[];
  count: number;
}> {
  return call(`/config/sellers`);
}

/** GET /api/marketing/config/rules — full RuleSet document. */
export async function getRules(): Promise<{ rule_set: ConfigRuleSet }> {
  return call(`/config/rules`);
}

/** GET /api/marketing/config/followup_profiles. */
export async function getFollowupProfiles(): Promise<{
  profiles: readonly ConfigFollowupProfile[];
  count: number;
}> {
  return call(`/config/followup_profiles`);
}

// ── Config writes (PUT) ─────────────────────────────────────

/** Internal helper for PUT JSON requests with the same envelope
 *  unwrapping the GET path uses. Throws `HttpError` on non-200
 *  so callers can react to validation failures with a typed
 *  surface (e.g. `error.code === "invalid_payload"`). */
async function putJson<T>(path: string, body: unknown): Promise<T> {
  const res = await authedFetch(`/api/marketing${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON marketing response)");
  }
  const wrapped = parsed as
    | { ok: true; result: T }
    | { ok: false; error: { code: string; message?: string } };
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as { ok: false; error: { code: string } }).error ?? {
      code: "unknown",
    };
    throw new HttpError(res.status, err);
  }
  return (wrapped as { ok: true; result: T }).result;
}

/** Internal helper for POST JSON requests, same envelope as `putJson`. */
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await authedFetch(`/api/marketing${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON marketing response)");
  }
  const wrapped = parsed as
    | { ok: true; result: T }
    | { ok: false; error: { code: string; message?: string } };
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as { ok: false; error: { code: string } }).error ?? {
      code: "unknown",
    };
    throw new HttpError(res.status, err);
  }
  return (wrapped as { ok: true; result: T }).result;
}

/** Persist a mailbox / seller password as a daemon-managed
 *  secret. Server generates the env-var name from
 *  `(scope, id)`, writes the secret, and returns the env name
 *  the caller should stamp on the next mailbox / seller PUT.
 *  The operator never sees the env name.
 *
 *  `scope` ⇒ `"imap"` for mailbox passwords, `"smtp"` for
 *  seller passwords. */
export async function saveCredential(
  scope: "imap" | "smtp",
  id: string,
  password: string,
): Promise<{ env_name: string; path: string; overwrote_env: boolean }> {
  return postJson(`/config/credentials`, { scope, id, password });
}

export interface CredentialProbeResponse {
  ok: boolean;
  message: string;
}

/** Open a one-shot live IMAP connection against operator-typed
 *  credentials. No save side-effect — only validates that the
 *  host / port / TLS / username / password tuple authenticates. */
export async function probeImap(req: {
  host: string;
  port: number;
  username: string;
  password: string;
  tls?: "implicittls" | "starttls";
}): Promise<CredentialProbeResponse> {
  return postJson(`/config/credentials/probe/imap`, req);
}

/** Open a one-shot live SMTP connection. Mirrors `probeImap`. */
export async function probeSmtp(req: {
  host: string;
  port: number;
  username: string;
  password: string;
  starttls?: boolean;
}): Promise<CredentialProbeResponse> {
  return postJson(`/config/credentials/probe/smtp`, req);
}

export interface EmailAutoconfigResult {
  found: boolean;
  imap?: { host?: string; port?: number; socket_type?: string };
  smtp?: { host?: string; port?: number; socket_type?: string };
  reason?: string;
  status?: number;
}

/** Mozilla `autoconfig.thunderbird.net` lookup, proxied
 *  through the microapp to dodge browser CORS. Used as a
 *  fallback when the operator's domain isn't in the hardcoded
 *  provider table. Returns `{ found: false }` for unknown
 *  domains; never throws on negative results. */
export async function lookupEmailAutoconfig(
  domain: string,
): Promise<EmailAutoconfigResult> {
  // Soft-fail on every error path: this lookup is purely a UX
  // hint, never a blocker. Network outages, jsdom test stubs,
  // and 5xx from the upstream service all collapse to
  // `{ found: false }` so the caller's auto-fill silently
  // becomes a no-op.
  try {
    const qs = new URLSearchParams({ domain }).toString();
    const res = await authedFetch(
      `/api/marketing/config/email_autoconfig?${qs}`,
    );
    const parsed = (await res.json()) as
      | { ok: true; result: EmailAutoconfigResult }
      | { ok: false; error: { code: string; message?: string } };
    if (!parsed.ok) {
      return { found: false, reason: parsed.error.code };
    }
    return parsed.result;
  } catch (e) {
    return { found: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** PUT /api/marketing/config/mailboxes — full-replace write. */
export async function saveMailboxes(
  mailboxes: readonly ConfigMailbox[],
): Promise<{ mailboxes: readonly ConfigMailbox[]; count: number }> {
  return putJson(`/config/mailboxes`, { mailboxes });
}

/** PUT /api/marketing/config/sellers. */
export async function saveSellers(
  sellers: readonly ConfigSeller[],
): Promise<{ sellers: readonly ConfigSeller[]; count: number }> {
  return putJson(`/config/sellers`, { sellers });
}

/** PUT /api/marketing/config/rules — server hot-swaps the
 *  router via `arc_swap` (M15.33) when `with_router` is wired
 *  in `AdminState`; response carries `reloaded` + `restart_required`. */
export async function saveRules(ruleSet: ConfigRuleSet): Promise<{
  rule_set: ConfigRuleSet;
  reloaded: boolean;
  restart_required: boolean;
}> {
  return putJson(`/config/rules`, { rule_set: ruleSet });
}

/** PUT /api/marketing/config/followup_profiles. */
export async function saveFollowupProfiles(
  profiles: readonly ConfigFollowupProfile[],
): Promise<{ profiles: readonly ConfigFollowupProfile[]; count: number }> {
  return putJson(`/config/followup_profiles`, { profiles });
}

// ── M15.44 — notification template overrides ───────────────

/** Permissive shape — server's `NotificationTemplates`
 *  carries optional per-kind locale sets. UI lets the
 *  operator edit via JSON; validation is server-side. */
export type ConfigNotificationTemplates = Record<string, unknown>;

/** GET /api/marketing/config/notification_templates. */
export async function getNotificationTemplates(): Promise<{
  templates: ConfigNotificationTemplates;
}> {
  return call(`/config/notification_templates`);
}

/** PUT /api/marketing/config/notification_templates. Server
 *  hot-swaps the in-memory template lookup so the next render
 *  picks up the override; legacy embedders without
 *  `with_template_lookup` return `restart_required: true`. */
export async function saveNotificationTemplates(
  templates: ConfigNotificationTemplates,
): Promise<{
  templates: ConfigNotificationTemplates;
  reloaded: boolean;
  restart_required: boolean;
}> {
  return putJson(`/config/notification_templates`, { templates });
}

// ── M15.23.b — operator template library + snippets ────────

/** Named operator-authored draft template. Mirrors the SDK's
 *  `nexo_microapp_sdk::templating::Template`. */
export interface ConfigTemplate {
  id: string;
  name: string;
  description?: string;
  body: string;
}

/** Inline reusable snippet. Mirrors the SDK's `Snippet`. */
export interface ConfigSnippet {
  id: string;
  name: string;
  shortcut?: string;
  body: string;
}

/** GET /api/marketing/config/templates. */
export async function getTemplates(): Promise<{
  templates: ConfigTemplate[];
  count: number;
}> {
  return call(`/config/templates`);
}

/** PUT /api/marketing/config/templates. */
export async function saveTemplates(
  templates: ConfigTemplate[],
): Promise<{ templates: ConfigTemplate[]; count: number }> {
  return putJson(`/config/templates`, { templates });
}

/** GET /api/marketing/config/snippets. */
export async function getSnippets(): Promise<{
  snippets: ConfigSnippet[];
  count: number;
}> {
  return call(`/config/snippets`);
}

/** PUT /api/marketing/config/snippets. */
export async function saveSnippets(
  snippets: ConfigSnippet[],
): Promise<{ snippets: ConfigSnippet[]; count: number }> {
  return putJson(`/config/snippets`, { snippets });
}

// ── M15.23.d — topic guardrails ────────────────────────────

/** One guardrail rule the operator authored. Mirrors the
 *  SDK's `nexo_microapp_sdk::guardrails::GuardrailRule`. */
export interface ConfigGuardrailRule {
  id: string;
  name: string;
  patterns: string[];
  action: "force_approval" | "block";
}

/** GET /api/marketing/config/topic_guardrails. */
export async function getTopicGuardrails(): Promise<{
  guardrails: ConfigGuardrailRule[];
  count: number;
}> {
  return call(`/config/topic_guardrails`);
}

/** PUT /api/marketing/config/topic_guardrails. Server
 *  compiles the rules first (refuses bad regex / dup ids /
 *  empty patterns with HTTP 400) before persisting +
 *  hot-swapping the in-memory handle. */
export async function saveTopicGuardrails(
  guardrails: ConfigGuardrailRule[],
): Promise<{
  guardrails: ConfigGuardrailRule[];
  count: number;
  reloaded: boolean;
  restart_required: boolean;
}> {
  return putJson(`/config/topic_guardrails`, { guardrails });
}

// ── M15.23.c — AI decision audit log ───────────────────────

/** Tagged union mirror of the extension's `AuditEvent`.
 *  Keep aligned with `nexo-rs-extension-marketing/src/audit.rs`. */
export type MarketingAuditEvent =
  | {
      kind: "routing_decided";
      tenant_id: string;
      lead_id: string | null;
      from_email: string;
      chosen_seller_id: string | null;
      rule_id: string | null;
      why: string[];
      score: number;
      score_reasons: { label: string; detail?: string; delta: number }[];
      at_ms: number;
    }
  | {
      kind: "lead_transitioned";
      tenant_id: string;
      lead_id: string;
      from: string;
      to: string;
      reason: string;
      at_ms: number;
    }
  | {
      kind: "notification_published";
      tenant_id: string;
      lead_id: string;
      seller_id: string;
      notification_kind: string;
      channel: string;
      at_ms: number;
    }
  | {
      kind: "topic_guardrail_fired";
      tenant_id: string;
      lead_id: string | null;
      from_email: string;
      rule_id: string;
      rule_name: string;
      action: "force_approval" | "block";
      excerpt: string;
      at_ms: number;
    }
  | {
      kind: "duplicate_person_detected";
      tenant_id: string;
      lead_id: string;
      candidate_person_id: string;
      resolved_person_id: string;
      signal: string;
      confidence: number;
      detail: string;
      at_ms: number;
    };

// ── M15.21.b — person + enrichment override ────────────────

export type EnrichmentStatus =
  | "none"
  | "signature_parsed"
  | "llm_extracted"
  | "cross_linked"
  | "api_enriched"
  | "manual"
  | "personal_only_giveup";

/** Mirrors `nexo-tool-meta::marketing::Person`. Operator UI
 *  cares about a handful of fields; rest stays permissive
 *  via index signature so future SDK additions don't break
 *  the wire. */
export interface Person {
  readonly id: string;
  readonly tenant_id: string;
  readonly primary_name: string;
  readonly primary_email: string;
  readonly alt_emails: readonly string[];
  readonly company_id: string | null;
  readonly enrichment_status: EnrichmentStatus;
  /** 0.0..=1.0; manual confirmations land at 1.0. */
  readonly enrichment_confidence: number;
  readonly tags: readonly string[];
  readonly created_at_ms: number;
  readonly last_seen_at_ms: number;
}

/** Mirrors `nexo-tool-meta::marketing::Company`. */
export interface CompanyRecord {
  readonly id: string;
  readonly tenant_id: string;
  readonly domain: string;
  readonly name: string;
  readonly industry: string | null;
  readonly size_band: string | null;
  readonly enriched_at_ms: number | null;
  readonly is_personal_domain: boolean;
}

/** GET /api/marketing/persons/:person_id — single fetch
 *  returning the Person + linked Company (when any). 404
 *  when missing for the active tenant. */
export async function getPerson(
  personId: string,
): Promise<{ person: Person; company: CompanyRecord | null }> {
  return call(`/persons/${encodeURIComponent(personId)}`);
}

/** POST /api/marketing/persons/:person_id/confirm-enrichment.
 *  Operator-driven manual confirmation. Always sets
 *  `enrichment_status = "manual"` + `enrichment_confidence = 1.0`
 *  on the server. Optional fields tweak the row before the
 *  flip lands. Returns the updated `{ person, company }`
 *  envelope so the lead drawer can re-render without a GET. */
export async function confirmEnrichment(
  personId: string,
  body: {
    primary_name?: string;
    company_name?: string;
    company_domain?: string;
  } = {},
): Promise<{ person: Person; company: CompanyRecord | null }> {
  return putOrPostJson(
    `/persons/${encodeURIComponent(personId)}/confirm-enrichment`,
    "POST",
    body,
  );
}

// ── M15.24 — telemetry dashboard ────────────────────────────

export interface MarketingTelemetry {
  readonly tenant_id: string;
  readonly now_ms: number;
  readonly window_hours: number;
  readonly since_ms: number;
  readonly leads_by_state: {
    readonly cold: number;
    readonly engaged: number;
    readonly meeting_scheduled: number;
    readonly qualified: number;
    readonly lost: number;
  };
  readonly drafts_pending: number;
  readonly inbound_messages: number;
  readonly outbound_messages: number;
}

/** GET /api/marketing/telemetry?window_hours=N — aggregate
 *  counts the dashboard renders. `window_hours` defaults
 *  server-side to 24; clamped to [1, 720] (30 days max). */
export async function getTelemetry(
  opts: {
    window_hours?: number;
  } = {},
): Promise<MarketingTelemetry> {
  const qs = new URLSearchParams();
  if (opts.window_hours !== undefined) {
    qs.set("window_hours", String(opts.window_hours));
  }
  const suffix = qs.toString();
  return call(`/telemetry${suffix ? `?${suffix}` : ""}`);
}

// ── F20 — engagement aggregates per outbound msg_id ────────

/** One row of the per-link click histogram returned by the
 *  engagement endpoint. `link_id` is the short signed-link
 *  identifier `prepare_outbound_email` stamped during the
 *  outbound prep; matched on click ingestion. */
export interface LinkClickCount {
  readonly link_id: string;
  readonly count: number;
}

/** Aggregate engagement for one outbound `msg_id`. Empty
 *  result is a legitimate `{ opens: 0, clicks_by_link: [] }` —
 *  fresh sends won't have any signal until recipients open
 *  the pixel / click a tracked link. */
export interface MessageEngagement {
  readonly msg_id: string;
  readonly tenant_id: string;
  readonly opens: number;
  readonly clicks_by_link: readonly LinkClickCount[];
}

/** GET /api/marketing/tracking/msg/:msg_id/engagement.
 *
 *  Wire shape is flat (no `{ ok, result }` envelope) — the
 *  marketing extension renders the aggregates directly. The
 *  endpoint 404s with `{ error: { code: "tracking_disabled" } }`
 *  when the operator hasn't wired tracking yet; the badge
 *  caller treats that as "no engagement signal" and stays
 *  silent rather than surfacing the error.
 *
 *  Throws `HttpError(status, body)` for any non-200; callers
 *  decide whether to render the alert or stay quiet. */
export async function getEngagement(msgId: string): Promise<MessageEngagement> {
  const res = await authedFetch(
    `/api/marketing/tracking/msg/${encodeURIComponent(msgId)}/engagement`,
  );
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON marketing response)");
  }
  if (!res.ok) {
    throw new HttpError(res.status, parsed);
  }
  return parsed as MessageEngagement;
}

/** GET /api/marketing/audit?lead_id=&kind=&since_ms=&limit= */
export async function getAudit(opts: {
  lead_id?: string;
  kind?: string;
  since_ms?: number;
  limit?: number;
}): Promise<{
  events: MarketingAuditEvent[];
  count: number;
}> {
  const qs = new URLSearchParams();
  if (opts.lead_id) qs.set("lead_id", opts.lead_id);
  if (opts.kind) qs.set("kind", opts.kind);
  if (opts.since_ms !== undefined) qs.set("since_ms", String(opts.since_ms));
  if (opts.limit !== undefined) qs.set("limit", String(opts.limit));
  const suffix = qs.toString();
  return call(`/audit${suffix ? `?${suffix}` : ""}`);
}

// ── SSE firehose for live lead lifecycle ────────────────────

/** Tagged union mirror of the extension's `LeadFirehoseEvent`.
 *  Keep aligned with `nexo-rs-extension-marketing/src/firehose/mod.rs`
 *  — wire shapes are operator-visible. */
export type MarketingFirehoseEvent =
  | {
      kind: "created";
      tenant_id: string;
      lead_id: string;
      thread_id: string;
      subject: string;
      from_email: string;
      seller_id: string;
      state: LeadState;
      at_ms: number;
      why_routed: readonly string[];
    }
  | {
      kind: "thread_bumped";
      tenant_id: string;
      lead_id: string;
      thread_id: string;
      at_ms: number;
    }
  | {
      kind: "transitioned";
      tenant_id: string;
      lead_id: string;
      from: LeadState;
      to: LeadState;
      at_ms: number;
      reason: string;
    }
  | {
      kind: "followup_overridden";
      tenant_id: string;
      lead_id: string;
      action: "skip" | "postpone";
      next_check_at_ms: number | null;
      reason: string;
      at_ms: number;
    };

export interface MarketingStreamHandlers {
  onEvent: (e: MarketingFirehoseEvent) => void;
  onLagged?: (dropped: number) => void;
  onOpen?: () => void;
  onError?: () => void;
}

/** Subscribe to `/api/marketing/firehose` SSE. Returns the
 *  unsubscribe function (closes the EventSource). The browser's
 *  EventSource auto-reconnects on transient drops; persistent
 *  failures call `onError` so the caller can fall back to
 *  REST polling. */
export function subscribeMarketingStream(
  h: MarketingStreamHandlers,
): () => void {
  const token = useAuth.getState().token;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  const url = `/api/marketing/firehose${params.toString() ? `?${params}` : ""}`;
  const es = new EventSource(url);

  es.addEventListener("lead", (msg) => {
    try {
      const data = JSON.parse(
        (msg as MessageEvent).data,
      ) as MarketingFirehoseEvent;
      h.onEvent(data);
    } catch {
      // Malformed JSON shouldn't kill the stream.
    }
  });

  es.addEventListener("lagged", (msg) => {
    try {
      const data = JSON.parse((msg as MessageEvent).data) as {
        dropped: number;
      };
      h.onLagged?.(data.dropped);
    } catch {
      h.onLagged?.(0);
    }
  });

  es.onopen = () => {
    h.onOpen?.();
  };
  es.onerror = () => {
    h.onError?.();
  };

  return () => es.close();
}
