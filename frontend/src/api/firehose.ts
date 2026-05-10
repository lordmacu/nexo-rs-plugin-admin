// Firehose backfill (HTTP) + live tail (SSE).
//
// EventSource cannot set custom headers, so the bearer token is
// passed as `?token=<value>` (microapp's auth middleware
// accepts both header AND query — see microapp `src/http/auth.rs`
// query fallback shipped alongside this).

import { authedFetch } from "./client";
import { useAuth } from "../store/auth";
import type { AgentEventKind } from "./types";

export interface BackfillFilter {
  agent_id?: string;
  kind?: string;
  tenant_id?: string;
  since_ms?: number;
  limit?: number;
}

export async function backfill(
  filter: BackfillFilter = {},
): Promise<AgentEventKind[]> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filter)) {
    if (v !== undefined && v !== null && v !== "") {
      params.set(k, String(v));
    }
  }
  const url = `/api/firehose${params.toString() ? `?${params}` : ""}`;
  const res = await authedFetch(url);
  if (!res.ok) {
    throw new Error(`backfill HTTP ${res.status}`);
  }
  const body = (await res.json()) as { ok: boolean; events?: AgentEventKind[] };
  return body.events ?? [];
}

export interface StreamFilter {
  agent_id?: string;
  tenant_id?: string;
}

export type StreamHandlers = {
  onEvent: (e: AgentEventKind) => void;
  onLagged?: (dropped: number) => void;
  onOpen?: () => void;
  onError?: () => void;
};

/**
 * Subscribe to live firehose via SSE. Returns an unsubscribe
 * function that closes the EventSource. Reconnect is handled by
 * the browser's built-in EventSource auto-reconnect; on
 * `onError` callers may also want to backfill `since_ms` to
 * recover missed events.
 */
export function subscribeStream(
  filter: StreamFilter,
  h: StreamHandlers,
): () => void {
  const token = useAuth.getState().token;
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  if (filter.agent_id) params.set("agent_id", filter.agent_id);
  if (filter.tenant_id) params.set("tenant_id", filter.tenant_id);
  const es = new EventSource(`/api/firehose/stream?${params}`);

  es.addEventListener("agent_event", (msg) => {
    try {
      const data = JSON.parse((msg as MessageEvent).data) as AgentEventKind;
      h.onEvent(data);
    } catch {
      // Malformed JSON shouldn't kill the stream.
    }
  });

  es.addEventListener("lagged", (msg) => {
    try {
      const data = JSON.parse((msg as MessageEvent).data) as {
        dropped: number;
      };
      h.onLagged?.(data.dropped);
    } catch {
      h.onLagged?.(0);
    }
  });

  es.onopen = () => {
    h.onOpen?.();
  };
  es.onerror = () => {
    h.onError?.();
  };

  return () => es.close();
}
