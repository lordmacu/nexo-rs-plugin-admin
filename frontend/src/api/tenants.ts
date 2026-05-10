// Thin client for the `nexo/admin/tenants/*` admin RPC family
// (Phase 83.8.12.8). adminCall() proxies straight to the
// daemon's admin RPC so the path here is the FULL daemon
// method, not the microapp tool name.
//
// Phase 90.x.tenants — added create / upsert / delete wrappers
// covering the full Phase 83.8.12 admin RPC surface. The
// frontend's `TenantSummary` shape stays as-is (consumers
// reference `tenant_id` + `name`); the wrapper translates
// daemon-side `id` + `display_name` to those legacy field
// names for back-compat.

import { adminCall } from "./admin";

export interface TenantSummary {
  readonly tenant_id: string;
  readonly name?: string | null;
  readonly active: boolean;
}

interface DaemonTenantSummary {
  readonly id: string;
  readonly display_name: string;
  readonly active: boolean;
}

interface TenantsListResponse {
  readonly tenants: readonly DaemonTenantSummary[];
}

export interface TenantDetail {
  readonly tenant_id: string;
  readonly name: string;
  readonly active: boolean;
}

interface DaemonTenantDetail {
  readonly id: string;
  readonly display_name: string;
  readonly active: boolean;
}

interface TenantsUpsertResponse {
  readonly tenant: DaemonTenantDetail;
  readonly created: boolean;
}

interface TenantsDeleteResponse {
  readonly removed: boolean;
  readonly orphaned_agents?: readonly string[];
}

function fromDaemon(row: DaemonTenantSummary): TenantSummary {
  return {
    tenant_id: row.id,
    name: row.display_name,
    active: row.active,
  };
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
  return r.tenants.map(fromDaemon);
}

/** Create-or-update a tenant. `active: undefined` keeps the
 *  existing flag (or defaults to `true` for new tenants). */
export async function tenantsUpsert(input: {
  id: string;
  display_name: string;
  active?: boolean;
}): Promise<{ tenant: TenantSummary; created: boolean }> {
  const r = await adminCall<TenantsUpsertResponse>(
    "nexo/admin/tenants/upsert",
    input,
  );
  return {
    tenant: {
      tenant_id: r.tenant.id,
      name: r.tenant.display_name,
      active: r.tenant.active,
    },
    created: r.created,
  };
}

/** Toggle the active flag — convenience over `tenantsUpsert`
 *  when the operator just wants to deactivate / reactivate. */
export async function tenantsSetActive(
  tenant_id: string,
  display_name: string,
  active: boolean,
): Promise<{ tenant: TenantSummary; created: boolean }> {
  return tenantsUpsert({ id: tenant_id, display_name, active });
}

/** Remove a tenant. `purge: false` (default) succeeds only when
 *  no agents reference the tenant — response carries the orphan
 *  list so the UI can confirm before retrying with `purge: true`.
 */
export async function tenantsDelete(
  tenant_id: string,
  purge = false,
): Promise<{ removed: boolean; orphaned_agents: readonly string[] }> {
  const r = await adminCall<TenantsDeleteResponse>(
    "nexo/admin/tenants/delete",
    { tenant_id, purge },
  );
  return {
    removed: r.removed,
    orphaned_agents: r.orphaned_agents ?? [],
  };
}
