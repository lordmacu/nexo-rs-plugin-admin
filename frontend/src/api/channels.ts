// Phase 90.3.16 — admin RPC client for `nexo/admin/channels/*`.
// The "channels" admin RPC family approves which MCP channel
// servers a given agent is allowed to use. Lists rows by
// (agent_id, server_name) tuples; revoke removes a row.

import { adminCall } from "./admin";

export interface ChannelEntry {
  agent_id: string;
  server_name: string;
  allowlist?: number[] | null;
}

export interface ChannelsListResponse {
  entries: ChannelEntry[];
}

export interface ChannelsListFilter {
  agent_id?: string | null;
}

export interface ChannelsApproveInput {
  agent_id: string;
  server_name: string;
  allowlist?: number[] | null;
}

export interface ChannelsRevokeParams {
  agent_id: string;
  server_name: string;
}

export interface ChannelsRevokeResponse {
  removed: boolean;
}

export async function listChannels(
  filter: ChannelsListFilter = {},
): Promise<ChannelsListResponse> {
  return adminCall<ChannelsListResponse>("nexo/admin/channels/list", filter);
}

export async function revokeChannel(
  params: ChannelsRevokeParams,
): Promise<ChannelsRevokeResponse> {
  return adminCall<ChannelsRevokeResponse>(
    "nexo/admin/channels/revoke",
    params,
  );
}
