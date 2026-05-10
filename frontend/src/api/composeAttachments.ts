// API client for /api/marketing/compose-attachments/*.
// Sibling of emailTemplates.uploadTemplateAsset() but for
// regular attachments (PDFs, docs, archives) — broader mime
// whitelist + larger size cap. Bytes never leave the admin
// surface; recipients see them inside the email envelope.

import { authedFetch, HttpError } from "./client";

export interface LibraryAttachment {
  sha256: string;
  mime: string;
  size_bytes: number;
  filename: string;
  created_at_ms: number;
}

export interface UploadedAttachment {
  sha256: string;
  mime: string;
  filename: string;
  size_bytes: number;
}

interface Envelope<T> { ok: true; result: T; }
interface ErrorEnvelope { ok: false; error: { code: string; message?: string }; }

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await authedFetch(`/api/marketing${path}`, init);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON compose-attachments response)");
  }
  const wrapped = body as Envelope<T> | ErrorEnvelope;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ErrorEnvelope).error ?? { code: "unknown" };
    throw new HttpError(res.status, err);
  }
  return (wrapped as Envelope<T>).result;
}

/** GET /api/marketing/compose-attachments — newest-first
 *  metadata for the attachment-picker. */
export async function listComposeAttachments(): Promise<{
  attachments: LibraryAttachment[];
  count: number;
}> {
  return call("/compose-attachments");
}

/** POST /api/marketing/compose-attachments — multipart upload
 *  of one PDF/doc/etc. Browser stamps the boundary; server
 *  validates mime against the broader whitelist + caps at
 *  20 MB. Filename comes from the File object and lands on
 *  Content-Disposition for the recipient to see. */
export async function uploadComposeAttachment(
  file: File,
): Promise<UploadedAttachment> {
  const form = new FormData();
  form.append("file", file);
  const res = await authedFetch(`/api/marketing/compose-attachments`, {
    method: "POST",
    body: form,
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON compose-attachments response)");
  }
  const wrapped = body as Envelope<UploadedAttachment> | ErrorEnvelope;
  if (!res.ok || !wrapped.ok) {
    const err = (wrapped as ErrorEnvelope).error ?? { code: "unknown" };
    throw new HttpError(res.status, err);
  }
  return (wrapped as Envelope<UploadedAttachment>).result;
}

export async function deleteComposeAttachment(sha: string): Promise<{
  sha256: string;
  deleted: boolean;
}> {
  return call(`/compose-attachments/${encodeURIComponent(sha)}`, {
    method: "DELETE",
  });
}
