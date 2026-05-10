// Spam / promo filter — API client for /api/marketing/spam-filter/*
//
// The microapp proxies these requests to the marketing extension's
// admin HTTP API; bearer auth is injected by `authedFetch` and
// the X-Tenant-Id is stamped server-side from the operator's
// session — the frontend never sets the tenant id directly.
//
// Wire shapes mirror the marketing extension's Rust types:
// - Strictness          — `Lax | Balanced | Strict | Custom`
// - ThresholdSet        — image-only / image-heavy / role-keyword /
//                         multi-weak toggles + min counts
// - RuleKind            — domain_block | domain_allow |
//                         keyword_block | keyword_allow |
//                         sender_block | sender_allow
// - PromoVerdict        — `{ kind: "human" } | { kind: "promo", reason }`

import { authedFetch, HttpError } from "./client";

export type Strictness = "lax" | "balanced" | "strict" | "custom";

export interface ThresholdSet {
  image_only_drop: boolean;
  image_heavy_drop: boolean;
  image_heavy_min_count: number;
  image_heavy_max_text_chars: number;
  role_keyword_drop: boolean;
  multi_weak_drop: boolean;
  multi_weak_threshold: number;
}

export interface SpamFilterConfig {
  tenant_id: string;
  strictness: Strictness;
  thresholds: ThresholdSet;
  updated_at_ms: number;
}

export type RuleKind =
  | "domain_block"
  | "domain_allow"
  | "keyword_block"
  | "keyword_allow"
  | "sender_block"
  | "sender_allow";

export interface SpamFilterRule {
  id: number;
  tenant_id: string;
  kind: RuleKind;
  value: string;
  note: string | null;
  enabled: boolean;
  created_at_ms: number;
}

export interface SpamFilterState {
  config: SpamFilterConfig;
  rules: SpamFilterRule[];
  rule_count: number;
}

export type BlockReason =
  | "domain_blocklist"
  | "sender_blocklist"
  | "image_only"
  | "image_heavy_low_text"
  | "noreply_with_keyword"
  | "multi_weak_signals";

export type PromoVerdict =
  | { kind: "human" }
  | { kind: "promo"; reason: BlockReason };

export interface PromoSignals {
  image_count: number;
  visible_text_chars: number;
  html_bytes: number;
  keyword_hits: number;
  matched_keywords: string[];
  sender_role: boolean;
  allow_match: "domain" | "sender" | null;
}

export interface TestResult {
  verdict: PromoVerdict;
  signals: PromoSignals;
  active_strictness: Strictness;
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
    throw new HttpError(res.status, "(non-JSON spam-filter response)");
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

/** GET /api/marketing/spam-filter — full state (config + rules). */
export async function getSpamFilter(): Promise<SpamFilterState> {
  return call<SpamFilterState>("/spam-filter");
}

/** PUT /api/marketing/spam-filter/config — strictness + thresholds. */
export async function putSpamFilterConfig(body: {
  strictness: Strictness;
  thresholds?: ThresholdSet;
}): Promise<{ config: SpamFilterConfig }> {
  return call("/spam-filter/config", { method: "PUT", jsonBody: body });
}

/** POST /api/marketing/spam-filter/rules — add a single rule. */
export async function addSpamFilterRule(body: {
  kind: RuleKind;
  value: string;
  note?: string;
}): Promise<{ rule: SpamFilterRule }> {
  return call("/spam-filter/rules", { method: "POST", jsonBody: body });
}

/** DELETE /api/marketing/spam-filter/rules/:id — remove one rule. */
export async function deleteSpamFilterRule(
  ruleId: number,
): Promise<{ deleted: number }> {
  return call(`/spam-filter/rules/${ruleId}`, { method: "DELETE" });
}

/** POST /api/marketing/spam-filter/test — dry-run a sample message
 *  against the active rules without persisting anything. */
export async function testSpamFilter(body: {
  raw_eml?: string;
  subject?: string;
  from_email?: string;
  body?: string;
  html?: string;
}): Promise<TestResult> {
  return call("/spam-filter/test", { method: "POST", jsonBody: body });
}
