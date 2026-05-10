// Bearer-aware fetch wrapper. Lives at this layer so individual
// route helpers (`api/admin.ts`, `api/firehose.ts`) don't repeat
// auth header construction. 401 responses clear the auth store
// (login redirect on the next render).

import { useAuth } from "../store/auth";
import { useToast } from "../store/toast";

export class HttpError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`HTTP ${status}`);
  }
}

// M2.b.notify-spa — only push the toast once per "session
// became invalid" event so a burst of failed requests after a
// rotation doesn't stack identical toasts. Cleared on login.
let session_expired_toast_pushed = false;

/** Reset the dedup guard. Login flow calls this after a fresh
 *  token lands so the next 401 surfaces a toast again. */
export function reset_session_expired_dedup(): void {
  session_expired_toast_pushed = false;
}

export async function authedFetch(
  input: RequestInfo,
  init: RequestInit = {},
): Promise<Response> {
  const token = useAuth.getState().token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    // Token is stale or wrong — drop it. RequireAuth will
    // redirect to /login on the next render cycle.
    // M2.b.notify-spa — surface a toast first so the operator
    // understands the imminent redirect (typically caused by a
    // server-side token rotation, not a real expiry).
    if (token && !session_expired_toast_pushed) {
      session_expired_toast_pushed = true;
      useToast.getState().push({
        kind: "warn",
        text: "Tu sesión fue rotada. Inicia sesión de nuevo para continuar.",
        ttl_ms: 6000,
      });
    }
    useAuth.getState().logout();
    // M16.followup — token rotation invalidates tenant
    // bindings. Reset the cache so the next mount re-fetches
    // fresh; without this the store keeps the previous
    // operator's tenants until a hard reload.
    void resetTenantCache();
  }
  return res;
}

// Lazy import — `tenant` store imports `client` transitively
// for its admin call, so a static import here would create a
// cycle. The dynamic import resolves once at runtime.
async function resetTenantCache(): Promise<void> {
  try {
    const mod = await import("../store/tenant");
    mod.useTenantStore.getState().reset();
  } catch {
    /* tenant store not loaded yet — no cache to reset. */
  }
}
