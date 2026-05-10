// Main-area body for the chats module. Renders the active
// conversation or an empty state based on the URL.
//
// The firehose backfill + SSE subscription live in the
// manifest's onMount lifecycle so they persist across route
// changes (operator navigating between conversations
// shouldn't tear down the SSE connection).

import { useEffect } from "react";
import { useParams } from "react-router-dom";

import {
  CmdKHint,
  EmptyState,
} from "@lordmacu/nexo-microapp-ui-react";
import Conversation from "./Conversation";
import { useConversations } from "../../store/conversations";
import { useT } from "../../i18n";

export default function ChatsMain() {
  const t = useT();
  const { key } = useParams();
  const set_active = useConversations((s) => s.set_active);
  const active_key = useConversations((s) => s.active_key);

  // Keep the store's active_key in sync with the URL so
  // existing components that read from the store keep
  // working unchanged.
  useEffect(() => {
    if (key) set_active(decodeURIComponent(key));
    else set_active(null);
  }, [key, set_active]);

  return (
    <div className="flex h-full flex-col bg-surface">
      {active_key ? (
        <Conversation conversationKey={active_key} />
      ) : (
        <EmptyState
          title={t("chat.main.empty.title")}
          body={t("chat.main.empty.body")}
        />
      )}
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
