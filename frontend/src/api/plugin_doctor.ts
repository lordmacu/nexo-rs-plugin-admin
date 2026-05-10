// Phase 90.x.plugins — admin RPC client for nexo/admin/plugins/doctor.
// The wire shape mirrors `agent doctor plugins --json` verbatim;
// we declare a permissive type that surfaces the fields we render.

import { adminCall } from "./admin";

export interface PluginDiagnostic {
  level: string;
  path?: string;
  message?: string;
  // open object — daemon may add fields per phase.
  [key: string]: unknown;
}

export interface PluginInitOutcome {
  // Variants from nexo-core: "Spawned" | "NoHandle" | "Failed { reason }"
  // — leave as unknown so future variants don't break the UI.
  [key: string]: unknown;
}

export interface PluginDiscoveryReport {
  loaded_ids?: string[];
  scanned?: number;
  invalid?: number;
  disabled?: number;
  duplicates?: number;
  diagnostics?: PluginDiagnostic[];
  init_outcomes?: Record<string, PluginInitOutcome>;
  contributed_agents_per_plugin?: Record<string, string[]>;
  contributed_skills_per_plugin?: Record<string, string[]>;
  plugin_capability_gates?: Record<string, unknown>;
  unmet_required_capabilities?: unknown[];
  // catch-all for forward-compat
  [key: string]: unknown;
}

export interface PluginsDoctorResponse {
  report: PluginDiscoveryReport;
  generated_at_ms: number;
}

export async function fetchPluginDoctor(): Promise<PluginsDoctorResponse> {
  return adminCall<PluginsDoctorResponse>("nexo/admin/plugins/doctor", {});
}
