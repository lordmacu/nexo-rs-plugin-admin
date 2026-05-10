// `POST /api/admin {method, params}` proxy → `nexo/admin/*`.

import { HttpError, authedFetch } from "./client";

export async function adminCall<T = unknown>(
  method: string,
  params: object = {},
): Promise<T> {
  const res = await authedFetch("/api/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, params }),
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new HttpError(res.status, "(non-JSON response)");
  }
  if (!res.ok) {
    throw new HttpError(res.status, body);
  }
  const okBody = body as { ok: boolean; result?: T; error?: unknown };
  if (!okBody.ok) {
    throw new HttpError(res.status, okBody.error ?? body);
  }
  return okBody.result as T;
}
