// Bot-bubble API. Mirrors `/api/bots*` in the microapp's
// `bot_chat/routes.rs`.

import { HttpError, authedFetch } from "./client";

export interface BotInfo {
  jid: string;
  persona_id: string;
}

export interface BotListResponse {
  agent_id: string;
  bots: BotInfo[];
}

export interface BotMessageRow {
  row_id: number;
  instance: string;
  bot_jid: string;
  /** `user` (operator) or `bot`. */
  role: "user" | "bot";
  msg_id: string;
  /** Outbound id this row is a reply to. Bot rows always have it;
   *  user rows mirror their own msg_id. */
  target_id: string | null;
  /** `first` / `inner` / `last` for streamed bot chunks. */
  edit: string | null;
  text: string;
  at_ms: number;
}

export interface BotSendResponse {
  msg_id: string;
}

async function unwrap<T>(res: Response): Promise<T> {
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON response)");
  }
  if (!res.ok) throw new HttpError(res.status, body);
  const okBody = body as { ok: boolean; result?: T; error?: unknown };
  if (!okBody.ok) throw new HttpError(res.status, okBody.error ?? body);
  return okBody.result as T;
}

export async function listBots(instance: string): Promise<BotListResponse> {
  const res = await authedFetch(
    `/api/bots?instance=${encodeURIComponent(instance)}`,
  );
  return unwrap<BotListResponse>(res);
}

export async function sendToBot(
  instance: string,
  bot_jid: string,
  text: string,
): Promise<BotSendResponse> {
  const res = await authedFetch("/api/bots/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instance, bot_jid, text }),
  });
  return unwrap<BotSendResponse>(res);
}

export async function botHistory(
  instance: string,
  bot_jid: string,
  limit = 200,
): Promise<BotMessageRow[]> {
  const res = await authedFetch(
    `/api/bots/history?instance=${encodeURIComponent(instance)}&bot_jid=${encodeURIComponent(
      bot_jid,
    )}&limit=${limit}`,
  );
  return unwrap<BotMessageRow[]>(res);
}
