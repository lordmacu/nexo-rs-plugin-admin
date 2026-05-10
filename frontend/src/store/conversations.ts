// Conversation store. Groups firehose events into chats, caps
// memory, exposes ingest hook for the SSE subscriber.

import { create } from "zustand";
import {
  AgentEventKind,
  ConversationKey,
  eventAtMs,
  eventDedupeKey,
  eventKey,
} from "../api/types";
import { canNotify, ensurePermission, fireNotification } from "../lib/notify";
import { formatContactLabel, isWhatsappJid } from "../lib/contactLabel";
import { playBeep } from "../lib/notifySound";
import { useMutes } from "./mutes";
import { useSoundPref } from "./soundPref";

const MAX_CONVERSATIONS = 200;
const MAX_EVENTS_PER_CHAT = 500;
const NOTIFY_BODY_MAX_CHARS = 120;

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

// In-memory caches for chat metadata sourced from sqlite via the
// `chat_meta::routes` snapshot endpoint. Hydrated at app boot
// (`init/chatMetaBoot.ts`); every mutation below fires a PUT to
// keep the backend in sync. We keep these as module-level Records
// (not inside the Zustand store) because `ingest` needs them on
// the synchronous critical path — pulling them through a
// `useStore.getState()` selector adds reflow noise.
//
// `DISMISS_STATE` ALSO persists in localStorage so a fresh boot
// has the dismissal watermark available BEFORE the chat-meta
// snapshot round-trip resolves. Without that mirror, the firehose
// backfill races the snapshot: SSE events for dismissed chats
// land with an empty DISMISS_STATE → ingest lets them through →
// the operator sees the deleted chat flash for a frame until the
// snapshot retroactively prunes. Persisting locally turns the
// race into a no-op on subsequent boots.
const DISMISS_STORAGE_KEY = "nexo-admin:chat-dismiss:v1";

function loadDismissCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
      }
      return out;
    }
  } catch {
    /* private mode / corrupt JSON — start empty */
  }
  return {};
}

function saveDismissCache(state: Record<string, number>): void {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode — stay in-memory only */
  }
}

const READ_STATE: Record<string, number> = {};
const DISMISS_STATE: Record<string, number> = loadDismissCache();
const ALIAS_STATE: Record<string, string> = {};

import { putChatConv, type ChatMetaRow } from "../api/chat_meta";

export function applyChatMetaSnapshot(rows: ChatMetaRow[]): void {
  // Wipe + reseed so a re-hydrate doesn't leave stale entries
  // around if the backend forgot a key.
  for (const k of Object.keys(READ_STATE)) delete READ_STATE[k];
  for (const k of Object.keys(DISMISS_STATE)) delete DISMISS_STATE[k];
  for (const k of Object.keys(ALIAS_STATE)) delete ALIAS_STATE[k];
  for (const row of rows) {
    if (row.last_read_at_ms !== null)
      READ_STATE[row.conversation_key] = row.last_read_at_ms;
    if (row.dismissed_at_ms !== null)
      DISMISS_STATE[row.conversation_key] = row.dismissed_at_ms;
    if (row.alias !== null) ALIAS_STATE[row.conversation_key] = row.alias;
  }
  // Mirror the server-authoritative dismiss watermark to
  // localStorage so the next cold boot sees it without a
  // round-trip — eliminating the firehose race entirely.
  saveDismissCache(DISMISS_STATE);
  // Retroactively prune already-ingested conversations whose
  // dismissal landed AFTER the firehose backfill (race on first
  // boot: SSE events arrive before the chat_meta snapshot does, so
  // the ingest sees an empty DISMISS_STATE and lets the dismissed
  // chat through). Drop every chat whose latest event is older or
  // equal to its dismissal watermark.
  const store = useConversations.getState();
  let mutated = false;
  const conversations = new Map(store.conversations);
  for (const [key, conv] of conversations) {
    const dismissed_at = DISMISS_STATE[key];
    if (dismissed_at !== undefined && conv.last_message_at <= dismissed_at) {
      conversations.delete(key);
      mutated = true;
    }
  }
  if (mutated) {
    useConversations.setState({ conversations });
  }
}

function bumpRead(key: string, at_ms: number): void {
  const prev = READ_STATE[key] ?? 0;
  if (at_ms > prev) {
    READ_STATE[key] = at_ms;
    void putChatConv({ conversation_key: key, last_read_at_ms: at_ms }).catch(
      (e) => console.warn("bumpRead persist failed", e),
    );
  }
}

function markDismissed(key: string, at_ms: number): void {
  DISMISS_STATE[key] = at_ms;
  saveDismissCache(DISMISS_STATE);
  void putChatConv({ conversation_key: key, dismissed_at_ms: at_ms }).catch(
    (e) => console.warn("markDismissed persist failed", e),
  );
}

function clearDismissed(key: string): void {
  if (DISMISS_STATE[key] !== undefined) {
    delete DISMISS_STATE[key];
    saveDismissCache(DISMISS_STATE);
    void putChatConv({ conversation_key: key, dismissed_at_ms: null }).catch(
      (e) => console.warn("clearDismissed persist failed", e),
    );
  }
}

export function getConversationAlias(key: string): string | undefined {
  const trimmed = ALIAS_STATE[key]?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function persistAlias(key: string, alias: string | null): void {
  if (alias === null) {
    delete ALIAS_STATE[key];
  } else {
    ALIAS_STATE[key] = alias;
  }
  void putChatConv({ conversation_key: key, alias }).catch((e) =>
    console.warn("persistAlias failed", e),
  );
}

export interface Conversation {
  key: ConversationKey;
  agent_id: string;
  channel: string; // "session" for transcript-derived buckets
  contact_id: string;
  contact_label: string;
  last_message_preview: string;
  last_message_at: number;
  unread_count: number;
  is_paused: boolean;
  has_pending_escalation: boolean;
  // Latest known outbound recipient JID for this conversation —
  // taken from the most recent inbound TranscriptAppended event's
  // `sender_id`. `null` when no inbound has arrived yet (e.g.
  // proactive-only buckets). Used by the operator-takeover input
  // bar so the `intervention.reply.to` field is the channel-native
  // destination (e.g. `573154645370@s.whatsapp.net`) rather than
  // the abstract `session_id` UUID — outbound dispatchers can't
  // route to UUIDs.
  to_jid: string | null;
  // Phase 82.10.r — peer-side composing presence forwarded from
  // wa-agent's `MessageEvent::Typing`. Stamped with `at_ms + TTL`
  // when `composing=true`, cleared (set to `null`) when the peer
  // stops or the TTL expires. UI checks `peer_typing_until_ms >
  // Date.now()` and refreshes via a 1 s ticker so the indicator
  // self-clears even if the "paused" packet was lost over the
  // wire (a known WhatsApp quirk).
  peer_typing_until_ms: number | null;
}

// Phase 82.10.r — TTL for the peer-typing indicator. 6 s matches
// what wa-agent uses on the outbound side and absorbs occasional
// dropped "paused" packets without the dot-dot-dot getting stuck.
const PEER_TYPING_TTL_MS = 6000;

export interface ConversationsState {
  conversations: Map<ConversationKey, Conversation>;
  events_by_key: Map<ConversationKey, AgentEventKind[]>;
  active_key: ConversationKey | null;
  drafts: Map<ConversationKey, string>;
  ingest: (event: AgentEventKind) => void;
  set_active: (key: ConversationKey | null) => void;
  set_draft: (key: ConversationKey, body: string) => void;
  mark_read: (key: ConversationKey) => void;
  /// Hide the conversation from the sidebar. Same UX as WhatsApp
  /// Web's "delete chat": gone until the contact pings again, no
  /// transcript wipe on the daemon.
  dismiss: (key: ConversationKey) => void;
  /// Operator-set alias shown instead of the auto-derived
  /// `contact_label`. Pass `null` to clear; empty string clears too.
  set_alias: (key: ConversationKey, alias: string | null) => void;
}

// Looks like a UUID (8-4-4-4-12 hex). The framework's
// session_id surfaces here when a chat appears via an
// assistant-only turn or a `processing_state_changed` event
// (no peer JID yet) — showing the raw UUID in the sidebar is
// useless. Render as `Chat <first 6 hex>` instead.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function friendlyFallback(raw: string): string {
  if (UUID_RE.test(raw)) return `Chat ${raw.slice(0, 6)}`;
  return raw;
}

// Strip voice-mode markers from the sidebar preview so the chat
// list doesn't show `[em]X[/em]` / `[pause=300ms]` literal.
const RE_VOICE_PAUSE = /\[pause=\d{1,5}ms\]/g;
const RE_VOICE_TAG =
  /\[(?:em|strong|spell|slow|fast)\](.*?)\[\/(?:em|strong|spell|slow|fast)\]/g;
function cleanForPreview(s: string): string {
  return s
    .replace(RE_VOICE_PAUSE, "")
    .replace(RE_VOICE_TAG, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function preview(event: AgentEventKind): string {
  switch (event.kind) {
    case "transcript_appended": {
      const body = cleanForPreview(event.body);
      return body.length > 60 ? body.slice(0, 60) + "…" : body;
    }
    case "processing_state_changed":
      return event.new_state.state === "paused_by_operator"
        ? "Conversación pausada por operador"
        : "Conversación reanudada";
    case "escalation_requested":
      return `Escalación: ${event.summary}`;
    case "escalation_resolved":
      return "Escalación resuelta";
    case "pending_inbounds_dropped":
      return `${event.dropped} mensajes en cola descartados`;
    case "peer_typing":
    case "whatsapp_bot_message":
      // Filtered out before this helper runs; exhaustiveness-only.
      return "";
  }
}

function deriveChannel(event: AgentEventKind): string {
  switch (event.kind) {
    case "transcript_appended":
      return event.source_plugin;
    case "processing_state_changed":
    case "escalation_requested":
    case "escalation_resolved":
    case "pending_inbounds_dropped":
      return event.scope.channel;
    case "peer_typing":
      return event.channel;
    case "whatsapp_bot_message":
      return "whatsapp";
  }
}

function deriveContactId(event: AgentEventKind): string {
  switch (event.kind) {
    case "transcript_appended":
      return event.session_id;
    case "processing_state_changed":
    case "escalation_requested":
    case "escalation_resolved":
    case "pending_inbounds_dropped":
      return event.scope.contact_id;
    case "peer_typing":
      return event.sender_id;
    case "whatsapp_bot_message":
      return event.bot_jid;
  }
}

export const useConversations = create<ConversationsState>((set, get) => ({
  conversations: new Map(),
  events_by_key: new Map(),
  active_key: null,
  drafts: new Map(),

  ingest: (event) => {
    // Phase 82.10.r — peer_typing has no scope/session_id and
    // therefore no eventKey; match it by (channel, account_id,
    // sender_id == to_jid) against existing conversations and
    // stamp `peer_typing_until_ms`. We special-case this BEFORE
    // the eventKey null-bail below so the indicator works without
    // turning typing into its own conversation row.
    // Bot bubble events live in their own UI surface — the
    // floating BotChatBubble taps the firehose broadcast
    // directly. Don't pollute the conversation list with them.
    if (event.kind === "whatsapp_bot_message") return;
    if (event.kind === "peer_typing") {
      const conversations = new Map(get().conversations);
      let mutated = false;
      for (const [k, conv] of conversations) {
        if (conv.channel !== event.channel) continue;
        if (conv.to_jid !== event.sender_id) continue;
        const next_until = event.composing
          ? event.at_ms + PEER_TYPING_TTL_MS
          : null;
        if (conv.peer_typing_until_ms === next_until) continue;
        conversations.set(k, { ...conv, peer_typing_until_ms: next_until });
        mutated = true;
      }
      if (mutated) set({ conversations });
      return;
    }

    const key = eventKey(event);
    if (key === null) return;

    const at_ms = eventAtMs(event);
    // Honour the dismissal watermark: the operator hid this chat
    // and the event is older than that hide. Skip — chat stays out
    // of the sidebar. A fresher event clears the dismissal below.
    const dismissed_at = DISMISS_STATE[key];
    if (dismissed_at !== undefined && at_ms <= dismissed_at) {
      return;
    }
    if (dismissed_at !== undefined && at_ms > dismissed_at) {
      clearDismissed(key);
    }
    const conversations = new Map(get().conversations);
    const events_by_key = new Map(get().events_by_key);

    // Update or create the conversation row.
    const prev = conversations.get(key);
    // Derive the channel-native recipient JID from inbound
    // transcript events. `sender_id` is `Some(jid)` for inbound
    // user messages and `None` for assistant turns — keep the
    // previous value across assistant-only events so the operator
    // takeover keeps a working `to` after the agent replies.
    const next_to_jid: string | null =
      event.kind === "transcript_appended" && event.role === "user"
        ? (event.sender_id ?? prev?.to_jid ?? null)
        : (prev?.to_jid ?? null);
    // Prefer a humane label derived from the JID over the raw
    // session_id UUID. Until the framework forwards the peer's push
    // name (FOLLOWUPS — `sender_display_name` on TranscriptAppended),
    // we format the JID as a phone number. We refresh the label
    // whenever a fresher JID arrives so an early
    // `processing_state_changed` placeholder gets upgraded once the
    // first inbound `transcript_appended` lands.
    const candidate_jid = next_to_jid ?? prev?.to_jid ?? null;
    const raw_fallback = prev?.contact_label ?? deriveContactId(event);
    const computed_label =
      candidate_jid && isWhatsappJid(candidate_jid)
        ? formatContactLabel(candidate_jid)
        : friendlyFallback(raw_fallback);
    // Only let the incoming event drive the preview when it's
    // the newest seen for this chat. SSE backfill can replay
    // history in either direction; without this gate, an older
    // event arriving last would clobber the last_message_preview
    // and make the sidebar show the FIRST message of the chat.
    const prev_at = prev?.last_message_at ?? 0;
    const is_newer = at_ms >= prev_at;
    const next: Conversation = {
      key,
      agent_id: event.agent_id,
      channel: deriveChannel(event),
      contact_id: deriveContactId(event),
      contact_label: computed_label,
      last_message_preview: is_newer
        ? preview(event)
        : (prev?.last_message_preview ?? preview(event)),
      last_message_at: Math.max(prev_at, at_ms),
      // Three reasons NOT to bump the unread counter:
      // 1. Operator is currently looking at this conversation.
      // 2. The event predates the persisted "last read" watermark
      //    for this key (firehose backfill replay after a daemon
      //    restart — operator already saw it).
      // 3. The event is OLDER than the conversation's existing
      //    `last_message_at` (out-of-order delivery — incrementing
      //    would lie about new activity).
      unread_count:
        get().active_key === key
          ? (prev?.unread_count ?? 0)
          : at_ms <= (READ_STATE[key] ?? 0)
            ? (prev?.unread_count ?? 0)
            : !is_newer
              ? (prev?.unread_count ?? 0)
              : (prev?.unread_count ?? 0) + 1,
      is_paused:
        event.kind === "processing_state_changed"
          ? event.new_state.state === "paused_by_operator"
          : (prev?.is_paused ?? false),
      has_pending_escalation:
        event.kind === "escalation_requested"
          ? true
          : event.kind === "escalation_resolved"
            ? false
            : (prev?.has_pending_escalation ?? false),
      to_jid: next_to_jid,
      peer_typing_until_ms: prev?.peer_typing_until_ms ?? null,
    };
    conversations.set(key, next);

    // Cap conversations by oldest last_message_at.
    if (conversations.size > MAX_CONVERSATIONS) {
      const sorted = [...conversations.entries()].sort(
        (a, b) => b[1].last_message_at - a[1].last_message_at,
      );
      conversations.clear();
      for (const [k, v] of sorted.slice(0, MAX_CONVERSATIONS)) {
        conversations.set(k, v);
      }
    }

    // Append event to per-chat list, cap to last N. Dedupe so
    // SSE replays after a backfill (or a React StrictMode
    // double-mount) don't show the same message twice in the
    // chat panel.
    const list = events_by_key.get(key) ?? [];
    const incoming_key = eventDedupeKey(event);
    const already_have = list.some((e) => eventDedupeKey(e) === incoming_key);
    if (!already_have) {
      list.push(event);
      list.sort((a, b) => eventAtMs(a) - eventAtMs(b));
      if (list.length > MAX_EVENTS_PER_CHAT) {
        list.splice(0, list.length - MAX_EVENTS_PER_CHAT);
      }
      events_by_key.set(key, list);
    }

    set({ conversations, events_by_key });

    // M7.notify — fire OS notification for operator-actionable
    // events when the tab is hidden. Visibility + permission +
    // support are all gated inside `canNotify` / `fireNotification`.
    // M7.notify.granular — per-conversation mute also gates the
    // fire. Tab-visible feed is unaffected; only OS-level
    // notification is suppressed.
    const conv_muted = useMutes.getState().isMuted(key);
    if (canNotify() && !conv_muted) {
      let fired = false;
      if (event.kind === "transcript_appended" && event.role === "user") {
        // Skip operator-side intervention echoes — those have
        // role=user but `sender_id` prefixed `operator:` (M7.c
        // server-stamp wires the prefix).
        if (!event.sender_id?.startsWith("operator:")) {
          fireNotification({
            tag: key,
            title: next.contact_label || "Mensaje nuevo",
            body: truncate(event.body, NOTIFY_BODY_MAX_CHARS),
            navigate_to: `/chat/${encodeURIComponent(key)}`,
          });
          fired = true;
        }
      } else if (event.kind === "escalation_requested") {
        fireNotification({
          tag: key,
          title: `Escalación: ${event.agent_id}`,
          body: truncate(event.summary, NOTIFY_BODY_MAX_CHARS),
          navigate_to: `/chat/${encodeURIComponent(key)}`,
        });
        fired = true;
      }
      // M7.notify.sound — beep alongside the OS notification
      // when the operator opted in. Same gates: tab hidden,
      // permission granted, chat not muted. `playBeep` is
      // gesture-primed via the sidebar toggle so it fires even
      // on iOS Safari background tabs.
      if (fired && useSoundPref.getState().enabled) {
        playBeep();
      }
    }
  },

  set_active: (key) => {
    const conversations = new Map(get().conversations);
    if (key !== null) {
      // M7.notify — first-gesture permission request. Sticky
      // per-origin; subsequent calls are cheap no-ops once the
      // operator answered.
      void ensurePermission();
      const conv = conversations.get(key);
      if (conv) {
        conversations.set(key, { ...conv, unread_count: 0 });
      }
      // Stamp the read watermark — covers daemon restart / page
      // reload so the unread counter doesn't climb on backfill
      // replay of events the operator already saw.
      bumpRead(key, Date.now());
    }
    set({ active_key: key, conversations });
  },

  set_draft: (key, body) => {
    const drafts = new Map(get().drafts);
    if (body.length === 0) {
      drafts.delete(key);
    } else {
      drafts.set(key, body);
    }
    set({ drafts });
  },

  mark_read: (key) => {
    const conversations = new Map(get().conversations);
    const conv = conversations.get(key);
    if (conv) {
      conversations.set(key, { ...conv, unread_count: 0 });
      set({ conversations });
    }
    bumpRead(key, Date.now());
  },

  dismiss: (key) => {
    const conversations = new Map(get().conversations);
    conversations.delete(key);
    const events_by_key = new Map(get().events_by_key);
    events_by_key.delete(key);
    const next_active = get().active_key === key ? null : get().active_key;
    markDismissed(key, Date.now());
    set({ conversations, events_by_key, active_key: next_active });
  },

  set_alias: (key, alias) => {
    const trimmed = alias?.trim() ?? "";
    persistAlias(key, trimmed.length > 0 ? trimmed : null);
    // Force a re-render so subscribers re-read the alias.
    const conversations = new Map(get().conversations);
    set({ conversations });
  },
}));
