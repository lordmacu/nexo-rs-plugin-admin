import { useEffect, useRef } from "react";
import { useConversations } from "../../store/conversations";
import ChatHeader from "./ChatHeader";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import PauseIndicator from "./PauseIndicator";
import { eventAtMs } from "../../api/types";

export default function Conversation({
  conversationKey,
}: {
  conversationKey: string;
}) {
  const conv = useConversations((s) => s.conversations.get(conversationKey));
  const events =
    useConversations((s) => s.events_by_key.get(conversationKey)) ?? [];
  const scroller = useRef<HTMLDivElement>(null);
  const eventCount = events.length;

  // Track whether the operator is"stuck to bottom". When they
  // scroll up to read history we pause auto-scroll; new messages
  // arriving while pinned-to-bottom keep the latest visible.
  const stuckToBottom = useRef(true);

  function onScroll() {
    const el = scroller.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stuckToBottom.current = fromBottom < 80;
  }

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (stuckToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [eventCount, conversationKey]);

  // First mount + every conversation switch: jump to bottom so
  // operators land on the latest message instead of the top.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stuckToBottom.current = true;
  }, [conversationKey]);

  if (!conv) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-secondary">
        Cargando…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <ChatHeader conv={conv} />
      {conv.is_paused && <PauseIndicator conv={conv} />}
      <div
        ref={scroller}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto px-8 py-4 space-y-1"
        style={{ backgroundColor: "#efeae2" }}
      >
        {events
          .slice()
          .sort((a, b) => eventAtMs(a) - eventAtMs(b))
          .map((event, idx) => (
            <MessageBubble key={`${idx}-${eventAtMs(event)}`} event={event} />
          ))}
      </div>
      <InputBar conv={conv} />
    </div>
  );
}
