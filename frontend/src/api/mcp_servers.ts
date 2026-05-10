// Phase 90.x.mcp — admin RPC client for `nexo/admin/mcp/*`.
// Local types until ts-rs codegen registers them in types.gen.ts.

import { adminCall } from "./admin";

export interface McpServerSummary {
  name: string;
  transport: string;
  log_level?: string | null;
}

export interface McpServerDetail {
  name: string;
  transport: string;
  command?: string | null;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string | null;
  url?: string | null;
  headers?: Record<string, string>;
  log_level?: string | null;
  context_passthrough?: boolean | null;
}

export interface McpServersListResponse {
  servers: McpServerSummary[];
}

export interface McpServersGetResponse {
  server: McpServerDetail | null;
}

export interface McpServersUpsertResponse {
  server: McpServerDetail;
  created: boolean;
}

export interface McpServersDeleteResponse {
  removed: boolean;
}

export async function listMcpServers(): Promise<McpServersListResponse> {
  return adminCall<McpServersListResponse>("nexo/admin/mcp/list", {});
}

export async function getMcpServer(name: string): Promise<McpServersGetResponse> {
  return adminCall<McpServersGetResponse>("nexo/admin/mcp/get", { name });
}

export async function upsertMcpServer(
  detail: McpServerDetail,
): Promise<McpServersUpsertResponse> {
  return adminCall<McpServersUpsertResponse>(
    "nexo/admin/mcp/upsert",
    detail,
  );
}

export async function deleteMcpServer(
  name: string,
): Promise<McpServersDeleteResponse> {
  return adminCall<McpServersDeleteResponse>("nexo/admin/mcp/delete", {
    name,
  });
}
