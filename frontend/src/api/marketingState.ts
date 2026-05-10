// Marketing on/off toggle + scoring config — API clients for
// /api/marketing/state and /api/marketing/scoring/config.

import { authedFetch, HttpError } from "./client";

export interface MarketingState {
  tenant_id: string;
  enabled: boolean;
  paused_reason: string | null;
  updated_at_ms: number;
}

export interface ScoringConfig {
  corporate_domain_boost: number;
  personal_domain_penalty: number;
  substantive_body_min_words: number;
  substantive_body_boost: number;
  brief_body_max_words: number;
  brief_body_penalty: number;
  purchase_intent_boost: number;
  purchase_intent_keywords: string[];
  senior_signature_boost: number;
  senior_tokens: string[];
}

interface Envelope<T> {
  ok: true;
  result: T;
}
interface ErrorEnvelope {
  ok: false;
  error: { code: string; message?: string };
}

async function call<T>(
  path: string,
  init?: RequestInit & { jsonBody?: unknown },
): Promise<T> {
  const opts: RequestInit = { ...(init ?? {}) };
  if (init?.jsonBody !== undefined) {
    opts.headers = {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    };
    opts.body = JSON.stringify(init.jsonBody);
  }
  const res = await authedFetch(`/api/marketing${path}`, opts);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON marketing response)");
  }
  const wrapped = body as Envelope<T> | ErrorEnvelope;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ErrorEnvelope).error ?? {
      code: "unknown",
      message: String(res.status),
    };
    throw new HttpError(res.status, err);
  }
  return (wrapped as Envelope<T>).result;
}

// ── Marketing on/off ─────────────────────────────────────────────

export async function getMarketingState(): Promise<{ state: MarketingState }> {
  return call("/state");
}

export async function putMarketingState(body: {
  enabled: boolean;
  paused_reason?: string;
}): Promise<{ state: MarketingState }> {
  return call("/state", { method: "PUT", jsonBody: body });
}

// ── Scoring config ──────────────────────────────────────────────

export async function getScoringConfig(): Promise<{ config: ScoringConfig }> {
  return call("/scoring/config");
}

export async function putScoringConfig(
  body: ScoringConfig,
): Promise<{ config: ScoringConfig }> {
  return call("/scoring/config", { method: "PUT", jsonBody: body });
}

export async function resetScoringConfig(): Promise<{
  config: ScoringConfig;
  reset_to_defaults: boolean;
}> {
  return call("/scoring/config", { method: "DELETE" });
}
