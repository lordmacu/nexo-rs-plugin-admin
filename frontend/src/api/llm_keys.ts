// Phase 90.3.15 — admin RPC client for `nexo/admin/llm_providers/*`.
// Wraps the same endpoints Agents.tsx already uses; this module
// is the dedicated CRUD surface for the operator UI.

import { adminCall } from "./admin";

export interface LlmProviderSummary {
  id: string;
  base_url: string;
  api_key_env: string;
  tenant_scope?: string | null;
  factory_type?: string | null;
}

export interface LlmProvidersListResponse {
  providers: LlmProviderSummary[];
}

export interface LlmProvidersListFilter {
  tenant_id?: string | null;
}

export interface LlmProvidersDeleteParams {
  provider_id: string;
}

export interface LlmProvidersDeleteResponse {
  removed: boolean;
}

export async function listKeys(
  filter: LlmProvidersListFilter = {},
): Promise<LlmProvidersListResponse> {
  return adminCall<LlmProvidersListResponse>(
    "nexo/admin/llm_providers/list",
    filter,
  );
}

export async function deleteKey(
  provider_id: string,
): Promise<LlmProvidersDeleteResponse> {
  return adminCall<LlmProvidersDeleteResponse>(
    "nexo/admin/llm_providers/delete",
    { provider_id },
  );
}
