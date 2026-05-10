// Pulls the chat-meta snapshot once after auth and seeds the
// three operator-state stores. The in-flight singleton stops a
// flaky React strict-mode double-mount or a bouncy auth state
// (token rotation that briefly clears + re-sets the same token)
// from triggering N parallel boots while the first call is still
// awaiting the network.

import { fetchChatMetaSnapshot } from "../api/chat_meta";
import { applyChatMetaSnapshot } from "../store/conversations";
import { useLabels } from "../store/labels";
import { useProspects } from "../store/prospects";

let in_flight: Promise<void> | null = null;
let last_completed_at_ms = 0;
const MIN_INTERVAL_MS = 5_000;

export async function bootChatMeta(): Promise<void> {
  if (in_flight) return in_flight;
  if (Date.now() - last_completed_at_ms < MIN_INTERVAL_MS) return;
  in_flight = (async () => {
    try {
      const snap = await fetchChatMetaSnapshot();
      applyChatMetaSnapshot(snap.chats);
      useLabels.getState().hydrate(snap.labels, snap.chat_label_pairs);
      useProspects.getState().hydrate(snap.prospects);
    } catch (e) {
      console.warn("chat_meta boot snapshot failed", e);
    } finally {
      last_completed_at_ms = Date.now();
      in_flight = null;
    }
  })();
  return in_flight;
}
