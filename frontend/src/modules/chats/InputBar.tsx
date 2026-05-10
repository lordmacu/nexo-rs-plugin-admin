import { KeyboardEvent, useEffect, useState } from "react";
import { Mic, MicOff, Paperclip, Pause, Play, Send, Smile } from "lucide-react";
import { adminCall } from "../../api/admin";
import { getVoiceMode, putVoiceMode } from "../../api/voice_mode";
import { useConversations, type Conversation } from "../../store/conversations";
import type { AgentEventKind } from "../../api/types";
import { useT } from "../../i18n";
import { Button, Textarea } from "../../components/ui";

export default function InputBar({ conv }: { conv: Conversation }) {
  const t = useT();
  const draft = useConversations((s) => s.drafts.get(conv.key) ?? "");
  const set_draft = useConversations((s) => s.set_draft);
  const events = useConversations((s) => s.events_by_key.get(conv.key) ?? []);
  const [busy, setBusy] = useState(false);
  const [pause_busy, setPauseBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voice_mode_enabled, setVoiceModeEnabled] = useState(false);
  const [voice_mode_busy, setVoiceModeBusy] = useState(false);

  // Pull current voice-mode flag for this conversation when the
  // bar mounts / the conversation switches. Failure leaves the
  // toggle off — safer default than auto-enabling.
  useEffect(() => {
    let cancelled = false;
    void getVoiceMode(conv.key)
      .then((s) => {
        if (!cancelled) setVoiceModeEnabled(s.enabled);
      })
      .catch(() => {
        // 404 / network — fall back to disabled.
        if (!cancelled) setVoiceModeEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conv.key]);

  async function toggleVoiceMode() {
    if (voice_mode_busy) return;
    setVoiceModeBusy(true);
    setError(null);
    try {
      const next = !voice_mode_enabled;
      const updated = await putVoiceMode(conv.key, next);
      setVoiceModeEnabled(updated.enabled);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setVoiceModeBusy(false);
    }
  }

  function buildScope() {
    return {
      kind: "conversation",
      agent_id: conv.agent_id,
      channel: conv.channel,
      account_id: conv.channel === "whatsapp" ? "smoketest" : "",
      contact_id: conv.contact_id,
    };
  }

  async function togglePause() {
    if (pause_busy) return;
    setPauseBusy(true);
    setError(null);
    try {
      const method = conv.is_paused
        ? "nexo/admin/processing/resume"
        : "nexo/admin/processing/pause";
      await adminCall(method, { scope: buildScope() });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("chat.input.error_state_change");
      setError(msg);
    } finally {
      setPauseBusy(false);
    }
  }

  // Latest TranscriptAppended in this chat — used to derive
  // session_id for the intervention.Reply call.
  const latestSession = (() => {
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e && e.kind === "transcript_appended") return e.session_id;
    }
    return null;
  })();

  async function send() {
    if (!draft.trim() || busy) return;
    if (!conv.to_jid) {
      setError(t("chat.input.error_no_recipient"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const scope = {
        kind: "conversation",
        agent_id: conv.agent_id,
        channel: conv.channel,
        // Phase 82.13.b — the WhatsappTranslator routes
        // outbound to `plugin.outbound.whatsapp.<account_id>`
        // and the plugin only subscribes to the instance-suffixed
        // topic. Empty `account_id` lands on the base topic
        // (`plugin.outbound.whatsapp`) which has no subscriber →
        // the message disappears silently. Hardcoded to the
        // smoke-test instance for now; proper fix is to thread
        // the instance through the inbound metadata so the UI
        // can pick it per conversation.
        account_id: conv.channel === "whatsapp" ? "smoketest" : "", // operator UI doesn't always know the
        // sender account; daemon resolves from
        // pairing config.
        contact_id: conv.contact_id,
      };
      // Phase 82.13 requires the scope to be paused before
      // `processing/intervention` accepts a manual reply
      // (otherwise the daemon returns
      // `invalid_params: scope_not_paused`). Auto-pause when the
      // operator presses Send and the conversation isn't already
      // paused — this matches the WhatsApp Web UX where typing
      // implies takeover. We surface a friendly error if the
      // pause itself fails.
      if (!conv.is_paused) {
        await adminCall("nexo/admin/processing/pause", { scope });
      }
      const action = {
        kind: "reply",
        channel: conv.channel,
        // Phase 82.13.b — the WhatsappTranslator routes
        // outbound to `plugin.outbound.whatsapp.<account_id>`
        // and the plugin only subscribes to the instance-suffixed
        // topic. Empty `account_id` lands on the base topic
        // (`plugin.outbound.whatsapp`) which has no subscriber →
        // the message disappears silently. Hardcoded to the
        // smoke-test instance for now; proper fix is to thread
        // the instance through the inbound metadata so the UI
        // can pick it per conversation.
        account_id: conv.channel === "whatsapp" ? "smoketest" : "",
        // `to` must be the channel-native JID (e.g.
        // `573154645370@s.whatsapp.net`) — the outbound
        // dispatcher can't route to a session_id UUID. Fallback
        // to `contact_id` only as a last resort when no inbound
        // has populated `to_jid` yet (the early-return above
        // catches the common case).
        to: conv.to_jid ?? conv.contact_id,
        body: draft.trim(),
        msg_kind: "text",
        attachments: [],
        reply_to_msg_id: null,
      };
      // M7.c — `operator_token_hash` is stamped server-side by
      // the microapp's `/api/admin` proxy from the validated
      // bearer. The SPA no longer hashes the token client-side.
      await adminCall("nexo/admin/processing/intervention", {
        scope,
        action,
        session_id: latestSession,
      });
      // Phase 82.13.b.2 — optimistic UI append. The daemon's
      // `processing/intervention` handler does NOT yet stamp the
      // operator reply on the agent transcript (the
      // `TranscriptWriterAppender` wire is `None` because the
      // writer + emitter are co-built inside `AdminBootstrap`).
      // Without this local append, the operator's message lands
      // on the peer phone but never appears in our own
      // conversation pane. Synth a `transcript_appended` event
      // so the conversation view shows it immediately. The
      // proper transcript stamp will land when the framework
      // wires the appender (tracked in FOLLOWUPS).
      if (latestSession) {
        const synth: AgentEventKind = {
          kind: "transcript_appended",
          agent_id: conv.agent_id,
          session_id: latestSession,
          seq: Date.now(),
          role: "assistant",
          body: action.body,
          sent_at_ms: Date.now(),
          source_plugin: `intervention:${conv.channel}`,
        };
        useConversations.getState().ingest(synth);
      }
      set_draft(conv.key, "");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("chat.input.error_send");
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="bg-panel-alt">
      {error && (
        <div className="bg-red-100 text-red-800 text-sm px-4 py-1 border-b border-red-200">
          {error}
        </div>
      )}
      <div className="flex items-end gap-2 px-4 py-2">
        {/* Emoji + adjuntar son placeholders disabled hoy.
            Hidden en mobile para liberar ancho del textarea —
            cuando se cableen, drop the `hidden sm:inline-flex`. */}
        <Button
          variant="ghost"
          size="md"
          title={t("chat.input.emoji_soon")}
          disabled
          className="hidden sm:inline-flex"
        >
          <Smile size={22} />
        </Button>
        <Button
          variant="ghost"
          size="md"
          title={t("chat.input.attach_soon")}
          disabled
          className="hidden sm:inline-flex"
        >
          <Paperclip size={22} />
        </Button>
        {/* Voice-mode toggle. When ON, the framework's reply
 transformer pipeline runs the agent's text reply through
 Microsoft Edge TTS and the channel plugin sends a PTT
 voice note instead. */}
        <Button
          variant="ghost"
          size="md"
          onClick={() => void toggleVoiceMode()}
          disabled={voice_mode_busy}
          className={
            voice_mode_enabled
              ? "text-accent hover:text-accent-hover"
              : ""
          }
          title={
            voice_mode_enabled
              ? t("chat.input.voice_on")
              : t("chat.input.voice_off")
          }
          aria-pressed={voice_mode_enabled}
        >
          {voice_mode_enabled ? <Mic size={22} /> : <MicOff size={22} />}
        </Button>
        {/* Phase 82.13 — operator can manually pause the IA so the
 agent stops responding while a human takes over, then
 resume so the next inbound message goes back through the
 agent (with the full intervening transcript as context).
 Mirrors the WhatsApp Web"you"handoff pattern. */}
        <Button
          variant="ghost"
          size="md"
          onClick={() => void togglePause()}
          disabled={pause_busy}
          className={
            conv.is_paused ? "text-accent hover:text-accent-hover" : ""
          }
          title={
            conv.is_paused
              ? t("chat.input.pause_on")
              : t("chat.input.pause_off")
          }
          aria-pressed={conv.is_paused}
        >
          {conv.is_paused ? <Play size={22} /> : <Pause size={22} />}
        </Button>
        <Textarea
          value={draft}
          onChange={(e) => set_draft(conv.key, e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("chat.input.placeholder")}
          rows={1}
          className="flex-1 resize-none bg-white rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary outline-none border border-transparent focus: max-h-32"
        />
        <Button
          variant="secondary"
          size="md"
          onClick={() => void send()}
          disabled={!draft.trim() || busy}
          title={t("chat.input.send")}
        >
          <Send size={22} />
        </Button>
      </div>
    </div>
  );
}
