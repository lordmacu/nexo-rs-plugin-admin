// Workspace API — persona MD files + knowledge upload.
// Backend handlers live in `src/workspace/routes.rs`.

import { HttpError, authedFetch } from "./client";
import { useAuth } from "../store/auth";

export type PersonaFileKey = "identity" | "soul" | "user" | "agents";

export interface PersonaState {
  workspace: string;
  identity: string;
  soul: string;
  user: string;
  agents: string;
}

export interface KnowledgeEntry {
  filename: string;
  size_bytes: number;
  est_tokens: number;
}

export interface KnowledgeListResponse {
  workspace: string;
  files: KnowledgeEntry[];
  total_est_tokens: number;
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

export async function getPersona(agent_id: string): Promise<PersonaState> {
  const res = await authedFetch(
    `/api/workspace/persona?agent_id=${encodeURIComponent(agent_id)}`,
  );
  return unwrap<PersonaState>(res);
}

export async function savePersonaFile(
  agent_id: string,
  file: PersonaFileKey,
  content: string,
): Promise<void> {
  const res = await authedFetch("/api/workspace/persona", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id, file, content }),
  });
  await unwrap<unknown>(res);
}

export async function listKnowledge(
  agent_id: string,
): Promise<KnowledgeListResponse> {
  const res = await authedFetch(
    `/api/workspace/knowledge?agent_id=${encodeURIComponent(agent_id)}`,
  );
  return unwrap<KnowledgeListResponse>(res);
}

export interface KnowledgeUploadResult {
  filename: string;
  size_bytes: number;
  est_tokens: number;
  extra_doc: string;
}

/** Multipart upload (.txt / .md / .pdf). Backend extracts to MD,
 *  saves under `<workspace>/knowledge/<slug>.md` and appends to the
 *  agent's `extra_docs` so the framework picks it up next turn. */
export async function uploadKnowledge(
  agent_id: string,
  file: File,
): Promise<KnowledgeUploadResult> {
  const token = useAuth.getState().token;
  if (!token) throw new HttpError(401, "no auth token");
  const form = new FormData();
  form.append("agent_id", agent_id);
  form.append("file", file);
  // FormData sets its own Content-Type with the multipart boundary;
  // we MUST NOT override it via headers or browsers will drop it.
  const res = await fetch("/api/workspace/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return unwrap<KnowledgeUploadResult>(res);
}

export async function deleteKnowledge(
  agent_id: string,
  filename: string,
): Promise<void> {
  const res = await authedFetch(
    `/api/workspace/file?agent_id=${encodeURIComponent(agent_id)}&filename=${encodeURIComponent(filename)}`,
    { method: "DELETE" },
  );
  await unwrap<unknown>(res);
}
