// Phase 98.10/98.12 — admin RPC client for the discovery layer.
// Wire shape mirrors `nexo_tool_meta::admin::plugin_discovery` 1:1.
//
// The daemon returns the structured catalogue verbatim; we type the
// fields the UI renders + leave forward-compat extension via the
// catch-all `[key: string]: unknown` on each card so future daemon
// additions don't break the UI.

import { adminCall } from "./admin";

// ── enums + supporting types ─────────────────────────────────────

export type PluginCategory =
  | "channel"
  | "poller"
  | "webhook"
  | "persona"
  | "tool"
  | "unknown";

export type TrustTier = "official" | "community_indexed" | "unverified";

// `tag = "kind"` discriminator on the Rust side; serde emits it
// literally so TypeScript handles each variant via switch.
export type CompatStatus =
  | { kind: "compatible" }
  | { kind: "needs_upgrade"; required: string; current: string }
  | { kind: "incompatible"; reason: string }
  | { kind: "unknown" };

export type PluginSource =
  | { kind: "crates_io" }
  | { kind: "github_topic"; repo: string }
  | { kind: "curated_index" };

export interface PluginsInstallParams {
  crate_name: string;
  version?: string | null;
  repo?: string | null;
  source: "release" | "cargo";
  force: boolean;
  require_signature: boolean;
  skip_signature_verify: boolean;
}

export interface ManifestSummary {
  plugin_id: string;
  plugin_version: string;
  manifest_version: number;
  sdk_requires?: string | null;
  category: PluginCategory;
}

export interface SourceError {
  source: string;
  message: string;
}

export interface DiscoveredPlugin {
  name: string;
  version?: string | null;
  description?: string | null;
  owner: string;
  sources: PluginSource[];
  repo_url?: string | null;
  homepage?: string | null;
  tags: string[];
  category: PluginCategory;
  trust_tier: TrustTier;
  compat: CompatStatus;
  manifest_url?: string | null;
  install_cmd: string;
  install_params: PluginsInstallParams;
  // forward-compat
  [key: string]: unknown;
}

// ── request / response shapes ────────────────────────────────────

export interface PluginsSearchParams {
  query?: string;
  compat_only?: boolean;
  category?: PluginCategory;
  source?: "crates_io" | "github_topic" | "curated_index";
}

export interface PluginsSearchResponse {
  items: DiscoveredPlugin[];
  fetched_at_ms: number;
  partial_failures: SourceError[];
}

export interface PluginsCompatCheckParams {
  crate_name: string;
  version?: string;
}

export interface PluginsCompatCheckResponse {
  compat: CompatStatus;
  manifest_summary?: ManifestSummary | null;
}

export interface PluginsRefreshIndexResponse {
  items_count: number;
  sources_ok: string[];
  sources_err: SourceError[];
}

// ── admin RPC client fns ─────────────────────────────────────────

export async function searchPlugins(
  params: PluginsSearchParams,
): Promise<PluginsSearchResponse> {
  return adminCall<PluginsSearchResponse>("nexo/admin/plugins/search", params);
}

export async function compatCheckPlugin(
  params: PluginsCompatCheckParams,
): Promise<PluginsCompatCheckResponse> {
  return adminCall<PluginsCompatCheckResponse>(
    "nexo/admin/plugins/compat_check",
    params,
  );
}

export async function refreshPluginIndex(): Promise<PluginsRefreshIndexResponse> {
  return adminCall<PluginsRefreshIndexResponse>(
    "nexo/admin/plugins/refresh_index",
    {},
  );
}
