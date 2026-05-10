// Phase 83.12.audit-page — admin RPC client for the
// `nexo/admin/microapp_audit/*` domain. Backed by
// `nexo_core::agent::admin_rpc::audit_sqlite::SqliteAdminAuditWriter`
// on the daemon side; types come from `types.gen.ts` via the
// ts-rs codegen pipeline (Phase 83.12.ts-types-codegen).

import { adminCall } from "./admin";
import type { AuditTailFilter, AuditTailPage } from "./types";

/**
 * Tail recent audit-log rows with optional filters + pagination.
 *
 * Filter shape is fully optional. `limit = 0` resolves
 * server-side to 50 rows; max clamped to 500. Newest-first order.
 *
 * Returns an `AuditTailPage` containing `entries`, `total`,
 * `has_more`, and `next_offset` so the caller can render
 * "showing N of M" labels and offer "load more" controls.
 */
export async function auditTail(
  filter: AuditTailFilter = { limit: 0, offset: 0 },
): Promise<AuditTailPage> {
  return adminCall<AuditTailPage>("nexo/admin/microapp_audit/tail", filter);
}
