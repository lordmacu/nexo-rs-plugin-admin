// Operator-initiated outbound (cold outreach) — POST
// /api/marketing/compose/send wrapper.

import { authedFetch, HttpError } from "./client";

export interface ComposeBody {
  to_email: string;
  to_name?: string;
  subject: string;
  body: string;
  seller_id: string;
  with_tracking?: boolean;
  /** When set, the server renders this template (with
   *  template_vars substituted) and uses the result as the
   *  body. Required for CID-embedded images so the server
   *  can attach inline asset bytes. */
  template_id?: string;
  template_vars?: Record<string, string>;
  /** Ad-hoc blocks the operator just authored in the compose-
   *  with-builder UI. Mutually exclusive with `template_id`
   *  (when both are set, blocks wins). Same CID resolution
   *  path as the template route. */
  blocks?: import("./emailTemplates").EmailBlock[];
  /** SHA refs into the per-tenant compose-attachment store.
   *  Each becomes a download-style attachment on the outbound
   *  (PDFs, docs, archives the operator picked). */
  attachment_refs?: string[];
}

export interface ComposeResult {
  lead_id: string;
  thread_id: string;
  outbound_message_id: string;
  tracking_msg_id: string | null;
  topic: string;
}

interface Envelope<T> {
  ok: true;
  result: T;
}
interface ErrorEnvelope {
  ok: false;
  error: { code: string; message?: string };
}

/** POST /api/marketing/compose/send — fire a cold outbound. */
export async function composeEmail(body: ComposeBody): Promise<ComposeResult> {
  const res = await authedFetch(`/api/marketing/compose/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON compose response)");
  }
  const wrapped = parsed as Envelope<ComposeResult> | ErrorEnvelope;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ErrorEnvelope).error ?? {
      code: "unknown",
      message: String(res.status),
    };
    throw new HttpError(res.status, err);
  }
  return (wrapped as Envelope<ComposeResult>).result;
}
