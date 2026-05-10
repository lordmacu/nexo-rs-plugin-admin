// Chat conversation bubble. Phase 3 rewrite: composes the
// shared `<Bubble>` primitive instead of redefining the
// in/out shape locally. Operator-stamped messages get the
// `senderLabel="Operador"` accent; system events render as a
// centered pill.

import { format } from "date-fns";
import type { AgentEventKind } from "../../api/types";
import { eventAtMs } from "../../api/types";
import { Bubble } from "../../components/ui";
import { useT, t as tStatic } from "../../i18n";

// Drop voice-mode operator markers (`[em]X[/em]`, `[pause=300ms]`,
// `[strong]…[/strong]`, …) from the visible body. The audio path
// already converted them to SSML; the chat panel is the
// human-readable transcript.
const RE_PAUSE = /\[pause=\d{1,5}ms\]/g;
const RE_TAG =
  /\[(?:em|strong|spell|slow|fast)\](.*?)\[\/(?:em|strong|spell|slow|fast)\]/g;
function stripVoiceMarkers(input: string): string {
  return input
    .replace(RE_PAUSE, "")
    .replace(RE_TAG, "$1")
    .replace(/\s{2,}/g, "")
    .trim();
}

export default function MessageBubble({ event }: { event: AgentEventKind }) {
  const t = useT();

  // Non-transcript events render as a centered system pill.
  if (event.kind !== "transcript_appended") {
    return (
      <div className="my-3 flex justify-center">
        <div className="rounded-full bg-panel-alt px-3 py-1 text-xs text-text-secondary shadow-sm">
          {systemLabel(event)}
        </div>
      </div>
    );
  }

  const outgoing = event.role === "assistant";
  const time = format(new Date(event.sent_at_ms), "HH:mm");
  // Operator-stamped messages have sender_id like"operator:abc...".
  const fromOperator = event.sender_id?.startsWith("operator:");

  return (
    <Bubble
      direction={outgoing ? "out" : "in"}
      senderLabel={
        fromOperator ? t("chat.message.sender_operator") : undefined
      }
      footer={time}
    >
      {stripVoiceMarkers(event.body)}
    </Bubble>
  );
}

function systemLabel(event: AgentEventKind): string {
  const time = format(new Date(eventAtMs(event)), "HH:mm");
  switch (event.kind) {
    case "processing_state_changed":
      return event.new_state.state === "paused_by_operator"
        ? tStatic("chat.message.system.paused", { time })
        : tStatic("chat.message.system.resumed", { time });
    case "escalation_requested":
      return tStatic("chat.message.system.escalation_requested", {
        summary: event.summary,
        time,
      });
    case "escalation_resolved":
      return tStatic("chat.message.system.escalation_resolved", { time });
    case "pending_inbounds_dropped":
      return tStatic("chat.message.system.pending_dropped", {
        count: event.dropped,
        time,
      });
    case "transcript_appended":
      return "";
    case "peer_typing":
    case "whatsapp_bot_message":
      return "";
  }
}
