// HTTP client for `/api/chat_meta/*`. Mirrors the wire shape the
// microapp's `chat_meta::routes` exposes.

import { HttpError, authedFetch } from "./client";

export interface ChatMetaRow {
  conversation_key: string;
  alias: string | null;
  dismissed_at_ms: number | null;
  last_read_at_ms: number | null;
  updated_at_ms: number;
}

export interface LabelRow {
  id: string;
  name: string;
  color: string;
  created_at_ms: number;
  updated_at_ms: number;
}

export interface ProspectRow {
  conversation_key: string;
  name: string;
  email?: string | undefined;
  phone?: string | undefined;
  notes?: string | undefined;
  label_ids: string[];
  created_at_ms: number;
  updated_at_ms: number;
}

export interface Snapshot {
  chats: ChatMetaRow[];
  labels: LabelRow[];
  /// `(conversation_key, label_id)` pairs.
  chat_label_pairs: [string, string][];
  prospects: ProspectRow[];
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

export async function fetchChatMetaSnapshot(): Promise<Snapshot> {
  const res = await authedFetch("/api/chat_meta/snapshot");
  return unwrap<Snapshot>(res);
}

export interface ConvPatch {
  conversation_key: string;
  /// `null` clears, `undefined` keeps. JSON null vs absent distinguishes
  /// the two on the wire (serde `Option<Option<T>>`).
  alias?: string | null;
  dismissed_at_ms?: number | null;
  last_read_at_ms?: number | null;
}

export async function putChatConv(patch: ConvPatch): Promise<ChatMetaRow> {
  const res = await authedFetch("/api/chat_meta/conv", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return unwrap<ChatMetaRow>(res);
}

export async function createLabel(
  name: string,
  color: string,
): Promise<LabelRow> {
  const res = await authedFetch("/api/chat_meta/labels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
  return unwrap<LabelRow>(res);
}

export async function updateLabel(
  id: string,
  patch: { name?: string; color?: string },
): Promise<LabelRow> {
  const res = await authedFetch(
    `/api/chat_meta/labels/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );
  return unwrap<LabelRow>(res);
}

export async function deleteLabel(id: string): Promise<void> {
  const res = await authedFetch(
    `/api/chat_meta/labels/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
  await unwrap<unknown>(res);
}

export async function setChatLabels(
  conversation_key: string,
  label_ids: string[],
): Promise<void> {
  const res = await authedFetch("/api/chat_meta/chat_labels", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_key, label_ids }),
  });
  await unwrap<unknown>(res);
}

export async function upsertProspect(
  prospect: Omit<ProspectRow, "created_at_ms" | "updated_at_ms">,
): Promise<ProspectRow> {
  const res = await authedFetch("/api/chat_meta/prospects", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prospect),
  });
  return unwrap<ProspectRow>(res);
}

export async function deleteProspect(conversation_key: string): Promise<void> {
  const res = await authedFetch(
    `/api/chat_meta/prospects/${encodeURIComponent(conversation_key)}`,
    { method: "DELETE" },
  );
  await unwrap<unknown>(res);
}
