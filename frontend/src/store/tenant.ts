// Active-tenant Zustand store + cache of the operator's
// authorised tenant list.
//
// Single source of truth for "which empresa is the operator
// looking at right now". Module state (sidebar selection,
// cached lists, etc.) is keyed by `tenantId` via
// `localStorage.ts` so a switch never leaks data across
// empresas. Actual cache invalidation lives in `useTenant.ts`
// — this store just owns the id + the list of valid options.

import { create } from "zustand";
import { z } from "zod";

import { tenantsList, type TenantSummary } from "../api/tenants";
import { readShellState, writeShellState } from "../shell/localStorage";

const ACTIVE_TENANT_KEY = "active-tenant";
const ActiveTenantSchema = z.object({ tenantId: z.string().min(1) });

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface TenantStoreState {
  /** id of the empresa whose data the UI currently shows.
   *  `null` until the first `loadTenants()` resolves; once
   *  set, persisted to `shell:active-tenant` so a refresh
   *  restores the same scope. */
  activeTenantId: string | null;

  /** Cached list from the last `loadTenants()` call. */
  tenants: readonly TenantSummary[];

  status: LoadStatus;
  error: string | null;

  /** Fetch the operator's authorised tenants. Picks the
   *  first active tenant as `activeTenantId` if none is
   *  persisted; keeps the persisted choice if it's still
   *  in the list. */
  loadTenants: () => Promise<void>;

  /** Switch the active tenant. Caller is responsible for
   *  invalidating any tenant-scoped state (`useTenant`
   *  wraps this). Throws `tenant_unauthorised`-shaped
   *  error when the id is not in the cached list. */
  setActiveTenantId: (id: string) => void;

  /** Used during token rotation — drops the cache and
   *  forces a fresh load on next mount. */
  reset: () => void;
}

export const useTenantStore = create<TenantStoreState>((set, get) => ({
  activeTenantId:
    readShellState(ACTIVE_TENANT_KEY, ActiveTenantSchema, {
      tenantId: "",
    }).tenantId || null,
  tenants: [],
  status: "idle",
  error: null,

  async loadTenants() {
    set({ status: "loading", error: null });
    try {
      const tenants = await tenantsList(true);
      const persistedId = get().activeTenantId;
      const activeStillValid =
        persistedId !== null &&
        tenants.some((t) => t.tenant_id === persistedId);
      const activeTenantId = activeStillValid
        ? persistedId
        : (tenants[0]?.tenant_id ?? null);
      if (activeTenantId !== persistedId && activeTenantId !== null) {
        writeShellState(ACTIVE_TENANT_KEY, { tenantId: activeTenantId });
      }
      set({ tenants, activeTenantId, status: "ready", error: null });
    } catch (cause) {
      // Special-case: operator hasn't granted `tenants_crud`.
      // The microapp still works in single-tenant mode — degrade
      // silently to status: 'ready' with an empty list so the
      // rail hides the switcher entirely and we never retry.
      if (isCapabilityDenied(cause)) {
        set({
          tenants: [],
          activeTenantId: null,
          status: "ready",
          error: null,
        });
        return;
      }
      set({
        status: "error",
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  },

  setActiveTenantId(id) {
    const tenant = get().tenants.find((t) => t.tenant_id === id);
    if (!tenant) {
      throw {
        kind: "tenant_unauthorised" as const,
        tenantId: id,
      };
    }
    writeShellState(ACTIVE_TENANT_KEY, { tenantId: id });
    set({ activeTenantId: id });
  },

  reset() {
    set({ tenants: [], activeTenantId: null, status: "idle", error: null });
  },
}));

/** Recognises the `capability_not_granted` shape returned by
 *  the daemon's admin handler when the microapp hasn't been
 *  granted `tenants_crud`. We treat that as "single-tenant
 *  mode — hide the switcher" instead of an error condition;
 *  the app is fully usable without it. */
function isCapabilityDenied(cause: unknown): boolean {
  if (typeof cause !== "object" || cause === null) return false;
  const c = cause as { body?: unknown; message?: unknown };
  // HttpError stamps the daemon body under `.body`.
  const body = (c as { body?: { error?: { code?: unknown } } }).body;
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "object" &&
    body.error !== null &&
    "code" in body.error &&
    body.error.code === "capability_not_granted"
  ) {
    return true;
  }
  return (
    typeof c.message === "string" &&
    c.message.includes("capability_not_granted")
  );
}
