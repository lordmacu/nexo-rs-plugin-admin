// Voice-mode toggle API. Mirrors `/api/voice_mode` in the
// microapp's `voice_mode/routes.rs`.

import { HttpError, authedFetch } from "./client";

export interface VoiceModeState {
  conversation_key: string;
  voice_id: string;
  enabled: boolean;
  /** `null` when no row exists yet — UI shows defaults. */
  updated_at_ms: number | null;
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

export async function getVoiceMode(
  conversation_key: string,
): Promise<VoiceModeState> {
  const res = await authedFetch(
    `/api/voice_mode?conversation_key=${encodeURIComponent(conversation_key)}`,
  );
  return unwrap<VoiceModeState>(res);
}

export async function putVoiceMode(
  conversation_key: string,
  enabled: boolean,
  voice_id?: string,
): Promise<VoiceModeState> {
  const res = await authedFetch("/api/voice_mode", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_key, enabled, voice_id }),
  });
  return unwrap<VoiceModeState>(res);
}
