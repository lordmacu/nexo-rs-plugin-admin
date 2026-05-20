// Phase 98 follow-up — admin RPC client for
// `nexo/admin/plugins/uninstall` (Phase 97.1.β backend). A
// write+destructive verb: stops the subprocess, drops the handle
// from the live registry, and (when `cargo_uninstall = true`) shells
// out to `cargo uninstall <crate>` so the binary leaves disk.
// Idempotent — a missing plugin reports `removed: false`.

import { adminCall } from "./admin";

export interface PluginsUninstallResponse {
  plugin_id: string;
  /** `true` when the plugin was stopped + dropped from the registry. */
  removed: boolean;
  /** `true` when `cargo uninstall` also ran successfully. */
  cargo_uninstalled: boolean;
  cargo_stdout?: string;
  cargo_stderr?: string;
}

/**
 * Uninstall a subprocess plugin by id.
 *   - `cargo_uninstall = true` also deletes the on-disk binary via
 *     `cargo uninstall`; `false` (default) leaves it on disk so the
 *     operator can re-enable later without a fresh download.
 *   - `crate_name` is only consulted when `cargo_uninstall = true`
 *     and the manifest doesn't declare `[plugin.cargo].crate_name`.
 *
 * Errors:
 *   - "plugin {id} not found" → InvalidParams (refresh page)
 *   - "not yet populated" → InvalidParams (daemon still booting)
 */
export async function pluginsUninstall(
  plugin_id: string,
  cargo_uninstall: boolean,
  crate_name?: string,
): Promise<PluginsUninstallResponse> {
  const params: Record<string, unknown> = { plugin_id, cargo_uninstall };
  if (crate_name && crate_name.trim() !== "") {
    params.crate_name = crate_name.trim();
  }
  return adminCall<PluginsUninstallResponse>(
    "nexo/admin/plugins/uninstall",
    params,
  );
}
