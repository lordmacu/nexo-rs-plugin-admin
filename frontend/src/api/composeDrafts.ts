// API client for /api/marketing/compose-drafts/* — operator-
// saved WIP outbounds (Gmail "Drafts" semantics, distinct
// from AI drafts on inbound leads).

import { authedFetch, HttpError } from "./client";
import type { EmailBlock } from "./emailTemplates";

/** Full draft state. Mirrors the Rust ComposeDraft schema. */
export interface ComposeDraft {
  id: string;
  title: string;
  to_email: string;
  to_name: string;
  subject: string;
  body: string;
  seller_id: string;
  with_tracking: boolean;
  template_id: string | null;
  template_vars: Record<string, string> | null;
  blocks: EmailBlock[] | null;
  attachment_refs: string[];
  /** "rapid" → ComposeQuickView; "builder" → ComposeWithBuilder. */
  mode: "rapid" | "builder";
  created_at_ms: number;
  updated_at_ms: number;
}

/** Patch payload for create + update. All fields optional —
 *  the operator can save mid-fill. */
export interface ComposeDraftInput {
  title?: string;
  to_email?: string;
  to_name?: string;
  subject?: string;
  body?: string;
  seller_id?: string;
  with_tracking?: boolean;
  template_id?: string | null;
  template_vars?: Record<string, string>;
  blocks?: EmailBlock[];
  attachment_refs?: string[];
  mode?: "rapid" | "builder";
}

interface Envelope<T> { ok: true; result: T; }
interface ErrorEnvelope { ok: false; error: { code: string; message?: string }; }

async function call<T>(path: string, init?: RequestInit & { jsonBody?: unknown }): Promise<T> {
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
    throw new HttpError(res.status, "(non-JSON compose-drafts response)");
  }
  const wrapped = body as Envelope<T> | ErrorEnvelope;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ErrorEnvelope).error ?? { code: "unknown" };
    throw new HttpError(res.status, err);
  }
  return (wrapped as Envelope<T>).result;
}

export async function listComposeDrafts(): Promise<{
  drafts: ComposeDraft[];
  count: number;
}> {
  return call("/compose-drafts");
}

export async function getComposeDraft(id: string): Promise<{ draft: ComposeDraft }> {
  return call(`/compose-drafts/${encodeURIComponent(id)}`);
}

export async function createComposeDraft(
  input: ComposeDraftInput,
): Promise<{ draft: ComposeDraft }> {
  return call("/compose-drafts", { method: "POST", jsonBody: input });
}

export async function updateComposeDraft(
  id: string,
  input: ComposeDraftInput,
): Promise<{ draft: ComposeDraft }> {
  return call(`/compose-drafts/${encodeURIComponent(id)}`, {
    method: "PUT",
    jsonBody: input,
  });
}

export async function deleteComposeDraft(id: string): Promise<{
  id: string;
  deleted: boolean;
}> {
  return call(`/compose-drafts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
