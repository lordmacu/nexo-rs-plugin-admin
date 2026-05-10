// Thin client for the `nexo/admin/tenants/*` admin RPC family
// (Phase 83.8.12.8). adminCall() proxies straight to the
// daemon's admin RPC so the path here is the FULL daemon
// method, not the microapp tool name.

import { adminCall } from "./admin";

export interface TenantSummary {
  readonly tenant_id: string;
  readonly name?: string | null;
  readonly active: boolean;
}

interface TenantsListResponse {
  readonly tenants: readonly TenantSummary[];
}

/** List every tenant the bearer token can see. The daemon
 *  filters by the operator's binding so an operator scoped
 *  to a single empresa only ever gets that tenant back. */
export async function tenantsList(
  active_only = true,
): Promise<readonly TenantSummary[]> {
  const r = await adminCall<TenantsListResponse>("nexo/admin/tenants/list", {
    active_only,
  });
  return r.tenants;
}
