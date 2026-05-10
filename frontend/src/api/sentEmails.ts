// API client for /api/marketing/sent-emails — Gmail-style
// "Sent" view of every outbound the operator can browse.

import { authedFetch, HttpError } from "./client";

export interface SentEmailRow {
  lead_id: string;
  message_id: string;
  from_label: string;
  subject: string;
  preview: string;
  at_ms: number;
  seller_id: string;
  person_id: string;
  recipient_email: string | null;
  recipient_name: string | null;
}

export interface SentEmailsFilters {
  seller_id?: string;
  person_id?: string;
  since_ms?: number;
  until_ms?: number;
  q?: string;
  limit?: number;
  offset?: number;
}

interface Envelope<T> { ok: true; result: T; }
interface ErrorEnvelope { ok: false; error: { code: string; message?: string }; }

export async function listSentEmails(
  filters: SentEmailsFilters = {},
): Promise<{
  sent: SentEmailRow[];
  total: number;
  limit: number;
  offset: number;
}> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") {
      params.set(k, String(v));
    }
  }
  const qs = params.toString();
  const url = qs
    ? `/api/marketing/sent-emails?${qs}`
    : `/api/marketing/sent-emails`;
  const res = await authedFetch(url);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON sent-emails response)");
  }
  const wrapped = body as
    | Envelope<{ sent: SentEmailRow[]; total: number; limit: number; offset: number }>
    | ErrorEnvelope;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ErrorEnvelope).error ?? { code: "unknown" };
    throw new HttpError(res.status, err);
  }
  return wrapped.result;
}
