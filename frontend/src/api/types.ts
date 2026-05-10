// Mirrors `nexo_tool_meta::admin::agent_events::AgentEventKind`
// + dependent shapes.
//
// Phase 83.12.ts-types-codegen (2026-05-10) — wire types
// generated from `nexo_tool_meta` `#[ts(export)]` structs by
// `proyecto/scripts/regen-ts-types.sh` and live in
// `./types.gen.ts`. Selectively re-exported below so existing
// consumers (`import { BindingContext } from "../api/types"`)
// keep working without a per-file edit.
//
// `AgentEventKind` and the 7 sub-event interfaces stay
// hand-written in this file because the frontend extends the
// wire enum with `WhatsappBotMessageEvent` (a CSR-only variant
// that never crosses the wire). The generated `AgentEventKind`
// in `types.gen.ts` is the wire-faithful version; consumers
// should import from THIS file.
// Re-export NEW types added by Phase 83.12.ts-types-codegen.
// `ProcessingScope` / `ProcessingControlState` / `ResolvedBy`
// stay hand-written below (frontend uses narrower variants).
// `AgentEventKind` + sub-event interfaces also stay
// hand-written because the frontend extends the wire enum with
// the CSR-only `WhatsappBotMessageEvent` variant.
export type {
  TranscriptRole,
  SecurityEventKind,
  EscalationReason,
  EscalationUrgency,
  BindingContext,
  InboundKind,
  InboundMessageMeta,
  EventSourceMeta,
  OutboundReplyContext,
  WebhookEnvelope,
  MicroappError,
  MicroappErrorKind,
  JsonValue,
  // Phase 83.12.audit-page — `nexo/admin/microapp_audit/tail`
  // wire types.
  AdminAuditRow,
  AdminAuditResult,
  AuditTailFilter,
  AuditTailPage,
} from "./types.gen";

export type ConversationKey = string; // `${agent_id}:${channel}:${contact_id}`

export type AgentEventKind =
  | TranscriptAppendedEvent
  | ProcessingStateChangedEvent
  | EscalationRequestedEvent
  | EscalationResolvedEvent
  | PendingInboundsDroppedEvent
  | PeerTypingEvent
  | WhatsappBotMessageEvent;

/** Streamed bot reply chunk (Meta AI etc.). The bubble keys on
 * `target_id` to collapse `first`/`inner`/`last` chunks into a
 * single rendered bubble. */
export interface WhatsappBotMessageEvent {
  kind: "whatsapp_bot_message";
  instance: string;
  bot_jid: string;
  msg_id: string;
  target_id: string;
  edit: string;
  text: string;
  at_ms: number;
}

// Phase 82.10.r — peer-side typing presence forwarded by the
// channel plugin (e.g. wa-agent's `MessageEvent::Typing`). Operator
// dashboards render an "X está escribiendo…" hint with a 6 s TTL
// fallback because the "paused" packet is occasionally lost.
export interface PeerTypingEvent {
  kind: "peer_typing";
  channel: string;
  account_id: string;
  sender_id: string;
  composing: boolean;
  at_ms: number;
  agent_id?: string;
  tenant_id?: string;
}

export interface TranscriptAppendedEvent {
  kind: "transcript_appended";
  agent_id: string;
  session_id: string;
  seq: number;
  role: "user" | "assistant" | "tool" | "system";
  body: string;
  sent_at_ms: number;
  sender_id?: string;
  source_plugin: string;
  tenant_id?: string;
}

export interface ProcessingStateChangedEvent {
  kind: "processing_state_changed";
  agent_id: string;
  scope: ProcessingScope;
  prev_state: ProcessingControlState;
  new_state: ProcessingControlState;
  at_ms: number;
  tenant_id?: string;
}

export interface EscalationRequestedEvent {
  kind: "escalation_requested";
  agent_id: string;
  scope: ProcessingScope;
  summary: string;
  reason: string;
  urgency: string;
  requested_at_ms: number;
  tenant_id?: string;
}

export interface EscalationResolvedEvent {
  kind: "escalation_resolved";
  agent_id: string;
  scope: ProcessingScope;
  resolved_at_ms: number;
  by: ResolvedBy;
  tenant_id?: string;
}

export interface PendingInboundsDroppedEvent {
  kind: "pending_inbounds_dropped";
  agent_id: string;
  scope: ProcessingScope;
  dropped: number;
  at_ms: number;
}

// Phase 83.12.ts-types-codegen — `ProcessingScope`,
// `ProcessingControlState`, and `ResolvedBy` stay HAND-WRITTEN
// here because the Rust enums are wider unions than the frontend
// uses. The wire `ProcessingScope` has variants `conversation`
// + `agent` + `agent_binding`; the frontend transcript firehose
// only surfaces `conversation` events, so the narrower hand-written
// type avoids TS narrowing friction without losing wire fidelity
// at the seam where events come from the network. The fully-typed
// generated versions live in `types.gen.ts` for any future code
// that needs the wider union.
export type ProcessingScope = {
  kind: "conversation";
  agent_id: string;
  channel: string;
  account_id: string;
  contact_id: string;
  mcp_channel_source?: string;
};

export type ProcessingControlState =
  | { state: "agent_active" }
  | {
      state: "paused_by_operator";
      scope: ProcessingScope;
      paused_at_ms: number;
      operator_token_hash: string;
      reason?: string;
    };

export type ResolvedBy =
  | { kind: "operator_dismissed"; reason: string }
  | { kind: "operator_takeover" }
  | { kind: "agent_resolved" };

/** Derive the conversation key from any event that carries a
 * conversation scope. Returns `null` for events without one. */
export function eventKey(event: AgentEventKind): ConversationKey | null {
  switch (event.kind) {
    case "transcript_appended": {
      // Transcripts don't carry a scope; we can't group them by
      // (channel, account, contact) without it. v0: bucket per
      // (agent_id, session_id) instead — UI calls it "session".
      return `${event.agent_id}:session:${event.session_id}`;
    }
    case "processing_state_changed":
    case "escalation_requested":
    case "escalation_resolved":
    case "pending_inbounds_dropped": {
      const s = event.scope;
      return `${s.agent_id}:${s.channel}:${s.contact_id}`;
    }
    case "peer_typing":
    case "whatsapp_bot_message": {
      // Typing + bot replies carry no chat scope — the bubble
      // store matches by (instance, bot_jid) instead.
      return null;
    }
  }
}

/** Stable identity for an event so backfill and SSE replays don't
 * append the same record twice. For transcripts we mix `seq`,
 * `role` and `sent_at_ms` — `seq` alone collapses user/assistant
 * pairs together when the framework produces zero-based seqs, and
 * `sent_at_ms` differs between turns so it disambiguates. The
 * rest fall back to `(kind, at_ms, agent_id)` which is unique
 * enough in practice. */
export function eventDedupeKey(event: AgentEventKind): string {
  switch (event.kind) {
    case "transcript_appended":
      return `t:${event.session_id}:${event.role}:${event.seq}:${event.sent_at_ms}`;
    case "processing_state_changed":
      return `p:${event.agent_id}:${event.at_ms}`;
    case "pending_inbounds_dropped":
      return `d:${event.agent_id}:${event.at_ms}`;
    case "escalation_requested":
      return `er:${event.agent_id}:${event.requested_at_ms}`;
    case "escalation_resolved":
      return `ez:${event.agent_id}:${event.resolved_at_ms}`;
    case "peer_typing":
      return `pt:${event.agent_id}:${event.at_ms}:${event.composing}`;
    case "whatsapp_bot_message":
      return `bm:${event.target_id}:${event.msg_id}`;
  }
}

/** Extract the timestamp from any event variant. */
export function eventAtMs(event: AgentEventKind): number {
  switch (event.kind) {
    case "transcript_appended":
      return event.sent_at_ms;
    case "processing_state_changed":
    case "pending_inbounds_dropped":
      return event.at_ms;
    case "escalation_requested":
      return event.requested_at_ms;
    case "escalation_resolved":
      return event.resolved_at_ms;
    case "peer_typing":
    case "whatsapp_bot_message":
      return event.at_ms;
  }
}

// ────────────────────────────────────────────────────────────────
// M9 — onboarding wizard wire shapes.
// Mirrors `crates/.../src/onboarding/{bootstrap,llm_probe,routes}.rs`
// in the microapp. Keep field names + nullability identical or the
// SPA fails silently in production.
// ────────────────────────────────────────────────────────────────

export interface PairedDevice {
  channel: string;
  instance?: string;
  agent_ids: string[];
}

export interface BootstrapState {
  needs_wizard: boolean;
  has_llm: boolean;
  has_pairing: boolean;
  has_agent: boolean;
  providers: string[];
  paired_devices: PairedDevice[];
}

export interface ProbeRequest {
  provider_id: string;
  base_url: string;
  api_key: string;
  model_hint?: string;
}

export interface ProbeResult {
  ok: boolean;
  status: number;
  latency_ms: number;
  model_count?: number;
  error?: string;
}

export interface AgentSaveRequest {
  id: string;
  model_provider: string;
  model_id: string;
  system_prompt: string;
  language?: string;
  channel: string;
  instance?: string;
}

// `nexo/admin/agents/upsert` response — minimal subset the wizard
// needs after agent_save returns.
export interface AgentDetail {
  id: string;
  active: boolean;
}

// ────────────────────────────────────────────────────────────────
// M9.b — pairing wire shapes (mirrors
// `crates/tool-meta/src/admin/pairing.rs::PairingStatus`).
// Used both for `nexo/admin/pairing/status` REST polling and the
// SSE push at `/api/pairing/stream`.
// ────────────────────────────────────────────────────────────────

export type PairingStateWire =
  | "pending"
  | "qr_ready"
  | "awaiting_user"
  | "linked"
  | "expired"
  | "cancelled";

export interface PairingStatusData {
  qr_ascii?: string;
  qr_png_base64?: string;
  device_jid?: string;
  error?: string;
}

export interface PairingStatus {
  challenge_id: string;
  state: PairingStateWire;
  data?: PairingStatusData;
}
