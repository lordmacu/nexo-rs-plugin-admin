// React hook + cache invalidation glue around `useTenantStore`.
//
// Three jobs:
//   1. Expose the active tenant id + list of authorised tenants.
//   2. Run cache + module-state purges when `switchTenant` is
//      called so empresa A's UI never bleeds into empresa B.
//   3. Reset on `nexo/notify/token_rotated` (the SSE listener
//      lives elsewhere; this hook just owns the response).

import { useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useTenantStore } from "../store/tenant";
import { clearTenantScope } from "./localStorage";

export interface UseTenantResult {
  readonly activeTenantId: string | null;
  readonly tenants: readonly { tenant_id: string; name?: string | null }[];
  readonly status: "idle" | "loading" | "ready" | "error";
  readonly error: string | null;
  /** Switch the active tenant. Purges every
   *  `module:*:tenant:<oldId>:*` localStorage key and writes
   *  the new active id. Callers that own React state should
   *  re-mount after this resolves (the shell does that via
   *  `key={activeTenantId}` on `<MainArea>`). */
  readonly switchTenant: (id: string) => void;
  /** Clear the cache + persisted active id. Called by the
   *  token-rotation listener so the next render forces a
   *  re-login + fresh tenant load. */
  readonly resetForLogout: () => void;
}

export function useTenant(): UseTenantResult {
  const {
    activeTenantId,
    tenants,
    status,
    error,
    loadTenants,
    setActiveTenantId,
    reset,
  } = useTenantStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Lazy first-load. Components that mount inside the shell
  // call this; outer auth guard ensures the bearer token is
  // already valid by the time we hit the store.
  useEffect(() => {
    if (status === "idle") {
      void loadTenants();
    }
  }, [status, loadTenants]);

  const switchTenant = useCallback(
    (id: string) => {
      const previous = activeTenantId;
      setActiveTenantId(id);
      if (previous && previous !== id) {
        clearTenantScope(previous);
        // Resource ids in the URL are tenant-scoped (lead-001
        // exists in empresa A but not B). Strip everything
        // past the module root so the operator lands on a
        // safe page in the new tenant. `/m/marketing/leads/x`
        // → `/m/marketing`.
        const moduleMatch = location.pathname.match(/^(\/m\/[^/]+)/);
        if (moduleMatch && location.pathname !== moduleMatch[1]) {
          navigate(moduleMatch[1], { replace: true });
        }
      }
    },
    [activeTenantId, setActiveTenantId, navigate, location.pathname],
  );

  return {
    activeTenantId,
    tenants,
    status,
    error,
    switchTenant,
    resetForLogout: reset,
  };
}
