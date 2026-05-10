import { useEffect } from "react";
import { useParams } from "react-router-dom";

import Sidebar from "./Sidebar";
import Conversation from "./Conversation";
import {
  EmptyState,
  CmdKHint,
} from "@lordmacu/nexo-microapp-ui-react";
import ConnectionBanner from "./ConnectionBanner";
// Bot bubble experimental — hidden until the send-side envelope
// reverse-engineering lands (decrypt/receive works, send doesn't
// trigger Meta AI replies yet). Re-enable by re-importing and
// mounting `<BotChatBubble />` below `<CmdKHint />`.
// import BotChatBubble from "./BotChatBubble";
import { backfill, subscribeStream } from "../../api/firehose";
import { useConversations } from "../../store/conversations";
import { useFirehose } from "../../store/firehose";
import { useT } from "../../i18n";

export default function Chat() {
  const t = useT();
  const ingest = useConversations((s) => s.ingest);
  const set_active = useConversations((s) => s.set_active);
  const active_key = useConversations((s) => s.active_key);
  const { key } = useParams();
  const set_status = useFirehose((s) => s.set_status);
  const on_lagged = useFirehose((s) => s.on_lagged);
  const on_event_at = useFirehose((s) => s.on_event_at);

  // URL ↔ store sync. When `/chat/:key` changes, update active.
  useEffect(() => {
    if (key) set_active(decodeURIComponent(key));
  }, [key, set_active]);

  // One-time backfill + SSE subscribe on mount.
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const events = await backfill({ limit: 500 });
        for (const e of events) ingest(e);
      } catch (e) {
        console.warn("backfill failed", e);
      }

      unsubscribe = subscribeStream(
        {},
        {
          onEvent: (e) => {
            ingest(e);
            const at_ms =
              "sent_at_ms" in e
                ? e.sent_at_ms
                : "at_ms" in e
                  ? e.at_ms
                  : "requested_at_ms" in e
                    ? e.requested_at_ms
                    : "resolved_at_ms" in e
                      ? e.resolved_at_ms
                      : 0;
            on_event_at(at_ms);
          },
          onOpen: () => set_status("connected"),
          onError: () => set_status("disconnected"),
          onLagged: (n) => on_lagged(n),
        },
      );
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen bg-panel-alt">
      <ConnectionBanner />
      <Sidebar />
      <div className="flex-1 flex flex-col bg-surface min-h-0">
        {active_key ? (
          <Conversation conversationKey={active_key} />
        ) : (
          <EmptyState
            title={t("chat.main.empty.title")}
            body={t("chat.main.empty.body")}
          />
        )}
      </div>
      <CmdKHint
        translations={{
          tipTitle: t("chat.cmdk_hint.tip_title"),
          instructionPrefix: t("chat.cmdk_hint.instruction_prefix"),
          instructionSuffix: t("chat.cmdk_hint.instruction_suffix"),
          closeLabel: t("chat.cmdk_hint.close_label"),
        }}
      />
    </div>
  );
}
