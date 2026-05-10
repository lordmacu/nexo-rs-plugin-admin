// M9.b — SSE subscriber for pairing status push.
//
// Browser EventSource doesn't support custom headers, so the
// bearer is passed as a `?token=<value>` query parameter (same
// convention as `/api/firehose/stream`). The microapp's auth
// middleware accepts both `Authorization: Bearer …` and the
// query fallback.
//
// Server emits `data: <json>` per `PairingStatus` whose
// `challenge_id` matches the query param. Server closes the
// connection on terminal state (`linked`, `expired`,
// `cancelled`) so the cleanup path is deterministic.

import { useAuth } from "../store/auth";
import type { PairingStatus } from "./types";

interface SubscribeOpts {
  challenge_id: string;
  onUpdate: (status: PairingStatus) => void;
  onError?: (err: Event) => void;
}

/** Open an EventSource on the pairing stream. Returns a cleanup
 *  that closes the connection. No-op when the auth store has
 *  no token (caller should already be authed before triggering
 *  pairing). */
export function subscribePairingStream(opts: SubscribeOpts): () => void {
  const token = useAuth.getState().token;
  if (!token) return () => {};
  const url =
    `/api/pairing/stream` +
    `?challenge_id=${encodeURIComponent(opts.challenge_id)}` +
    `&token=${encodeURIComponent(token)}`;
  const es = new EventSource(url);
  es.onmessage = (ev) => {
    try {
      const status = JSON.parse(ev.data) as PairingStatus;
      opts.onUpdate(status);
    } catch (e) {
      console.warn("pairing SSE: malformed event", e);
    }
  };
  if (opts.onError) {
    es.onerror = opts.onError;
  }
  return () => es.close();
}
