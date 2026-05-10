// Phase 90.x.memory — admin RPC client for `nexo/admin/memory/*`.
// v1 surface: query (recall) + list_snapshots. Create / restore
// snapshots stay CLI-only.

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
