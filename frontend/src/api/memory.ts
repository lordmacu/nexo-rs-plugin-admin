// Phase 90.x.memory — admin RPC client for `nexo/admin/memory/*`.
//
// Surface:
// - query (recall)
// - list_snapshots / delete_snapshot (Phase 90.x.memory-snapshot)
// - create_snapshot / restore_snapshot
//   (Phase 90.x.memory-snapshot.create-restore)

import { adminCall } from "./admin";

export interface MemoryEntry {
  id: string;
  agent_id: string;
  content: string;
  tags: string[];
  concept_tags: string[];
  created_at: string;
  memory_type?: string | null;
}

export interface MemoryQueryResponse {
  entries: MemoryEntry[];
}

export async function queryMemory(
  agent_id: string,
  query: string,
  limit = 20,
): Promise<MemoryQueryResponse> {
  return adminCall<MemoryQueryResponse>("nexo/admin/memory/query", {
    agent_id,
    query,
    limit,
  });
}

export interface SnapshotMeta {
  id: string;
  agent_id: string;
  tenant: string;
  label?: string | null;
  created_at_ms: number;
  bundle_path: string;
  bundle_size_bytes: number;
  bundle_sha256: string;
  git_oid?: string | null;
  encrypted: boolean;
  redactions_applied: boolean;
}

export interface MemorySnapshotsListResponse {
  snapshots: SnapshotMeta[];
  // Phase 90.x.memory-snapshot.create-restore — drives encrypt
  // toggle availability in the create-snapshot modal. `false`
  // when daemon has no recipients configured (or when an older
  // 0.1.11- daemon doesn't emit the field; serde(default)).
  encryption_available?: boolean;
}

export async function listSnapshots(
  agent_id: string,
  tenant = "default",
): Promise<MemorySnapshotsListResponse> {
  return adminCall<MemorySnapshotsListResponse>(
    "nexo/admin/memory/list_snapshots",
    { agent_id, tenant },
  );
}

export interface MemorySnapshotsDeleteResponse {
  removed: boolean;
}

export async function deleteSnapshot(
  agent_id: string,
  id: string,
  tenant = "default",
): Promise<MemorySnapshotsDeleteResponse> {
  return adminCall<MemorySnapshotsDeleteResponse>(
    "nexo/admin/memory/delete_snapshot",
    { agent_id, id, tenant },
  );
}

// ── Phase 90.x.memory-snapshot.create-restore ──

export interface MemorySnapshotsCreateResponse {
  snapshot: SnapshotMeta;
}

/**
 * Capture a fresh bundle. The daemon forces `redact_secrets=true`,
 * `created_by="admin-ui"`, and resolves the encryption recipient
 * from `memory.snapshot.encryption.recipients[0]` when
 * `encrypt=true`. Empty `label` is treated as no label.
 */
export async function createSnapshot(
  agent_id: string,
  options: { tenant?: string; label?: string; encrypt?: boolean } = {},
): Promise<MemorySnapshotsCreateResponse> {
  const { tenant = "default", label, encrypt = false } = options;
  return adminCall<MemorySnapshotsCreateResponse>(
    "nexo/admin/memory/create_snapshot",
    {
      agent_id,
      tenant,
      label: label && label.trim() ? label.trim() : null,
      encrypt,
    },
  );
}

export interface RestoreReport {
  agent_id: string;
  from_snapshot_id: string;
  pre_snapshot_id?: string | null;
  git_reset_oid?: string | null;
  sqlite_restored_dbs: string[];
  state_files_restored: string[];
  workers_restarted: boolean;
  dry_run: boolean;
}

export interface MemorySnapshotsRestoreResponse {
  report: RestoreReport;
}

/**
 * Restore from an existing snapshot id. The daemon resolves the
 * bundle path server-side via `list()` lookup — clients never
 * pass filesystem paths. `tenant` is REQUIRED — daemon validates
 * against the bundle manifest's recorded tenant. `dry_run=true`
 * returns the diff that would be applied without mutating live
 * state. The destructive path forces `auto_pre_snapshot=true`
 * server-side so every restore is reversible via the captured
 * pre-restore snapshot.
 */
export async function restoreSnapshot(
  agent_id: string,
  tenant: string,
  snapshot_id: string,
  dry_run: boolean,
): Promise<MemorySnapshotsRestoreResponse> {
  return adminCall<MemorySnapshotsRestoreResponse>(
    "nexo/admin/memory/restore_snapshot",
    { agent_id, tenant, snapshot_id, dry_run },
  );
}
