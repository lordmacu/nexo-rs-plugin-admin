// `chats` module manifest. Mounted at `/m/chats/*`.
//
// onMount runs the firehose backfill + SSE subscription
// once per active-tenant lifetime (the shell remounts the
// module on tenant switch, so this fires fresh per empresa).

import { MessageSquare } from "lucide-react";

import type { CmdkActionLike, ModuleManifest } from "../../shell/types";
import { adminCall } from "../../api/admin";
import { backfill, subscribeStream } from "../../api/firehose";
import { useConversations } from "../../store/conversations";
import { useFirehose } from "../../store/firehose";
import { t as tStatic } from "../../i18n";
import ChatsMain from "./ChatsMain";
import ChatsSidebar from "./ChatsSidebar";

const MAX_CONVERSATION_ROWS = 20;
const RECENT_GROUP_SIZE = 3;
const RECENT_GROUP_THRESHOLD = 5;

export const manifest: ModuleManifest = {
  id: "chats",
  version: "1.0.0",
  rail: {
    icon: <MessageSquare size={18} />,
    label: tStatic("chat.manifest.label"),
    tooltip: tStatic("chat.manifest.tooltip"),
    order: 100,
    // Badge intentionally null in v1. M17 (engagement
    // tracking) wires unread + escalation counters here.
    badge: () => null,
  },
  routes: [
    { path: "", element: <ChatsMain /> },
    { path: ":key", element: <ChatsMain /> },
  ],
  sidebar: ChatsSidebar,
  capabilities: {
    tenantSwitch: true,
    firehose: true,
    notificationsOptIn: true,
  },
  cmdK: (ctx) => {
    const out: CmdkActionLike[] = [];

    // Conversation jumps — top N by recency, optionally
    // split into 'Recientes' + 'Conversaciones' groups.
    const conversations = [
      ...useConversations.getState().conversations.values(),
    ];
    const sorted = conversations
      .sort((a, b) => b.last_message_at - a.last_message_at)
      .slice(0, MAX_CONVERSATION_ROWS);
    const split_recent = sorted.length > RECENT_GROUP_THRESHOLD;
    sorted.forEach((conv, idx) => {
      const is_recent = split_recent && idx < RECENT_GROUP_SIZE;
      out.push({
        id: `goto:${conv.key}`,
        label: tStatic("chat.manifest.cmdk.go_to", {
          label: conv.contact_label,
        }),
        group: is_recent
          ? tStatic("chat.manifest.cmdk.group_recent")
          : tStatic("chat.manifest.cmdk.group_conversations"),
        run: () => {
          ctx.navigate(`/m/chats/${encodeURIComponent(conv.key)}`);
        },
      });
    });

    // Pause / resume the active conversation.
    const active_key = useConversations.getState().active_key;
    const active_conv = active_key
      ? (useConversations.getState().conversations.get(active_key) ?? null)
      : null;
    if (active_conv && !active_conv.is_paused) {
      out.push({
        id: "chats:pause-active",
        label: tStatic("chat.manifest.cmdk.pause_active"),
        hotkey: "P",
        group: tStatic("chat.manifest.cmdk.group_actions"),
        run: async () => {
          await adminCall("nexo/admin/processing/pause", {
            scope: {
              kind: "conversation",
              agent_id: active_conv.agent_id,
              channel: active_conv.channel,
              account_id: "",
              contact_id: active_conv.contact_id,
            },
          });
        },
      });
    }
    if (active_conv && active_conv.is_paused) {
      out.push({
        id: "chats:resume-active",
        label: tStatic("chat.manifest.cmdk.resume_active"),
        hotkey: "R",
        group: tStatic("chat.manifest.cmdk.group_actions"),
        run: async () => {
          await adminCall("nexo/admin/processing/resume", {
            scope: {
              kind: "conversation",
              agent_id: active_conv.agent_id,
              channel: active_conv.channel,
              account_id: "",
              contact_id: active_conv.contact_id,
            },
          });
        },
      });
    }

    return out;
  },
  onMount: (ctx) => {
    let unsubscribe: (() => void) | null = null;
    const { ingest } = useConversations.getState();
    const { set_status, on_lagged, on_event_at } = useFirehose.getState();

    void (async () => {
      try {
        const events = await backfill({ limit: 500 });
        for (const e of events) ingest(e);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[chats] backfill failed", e);
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

    // Reserve `ctx` for future tenant-aware routing /
    // notifications. Touch it so the prop isn't flagged
    // unused at type-check time.
    void ctx;

    return () => {
      if (unsubscribe) unsubscribe();
    };
  },
};
