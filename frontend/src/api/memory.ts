// Phase 90.x.memory — admin RPC client for `nexo/admin/memory/*`.
// v1 surface: query (recall) only. Snapshot ops still go via CLI.

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
