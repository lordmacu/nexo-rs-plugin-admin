// Phase 81.21.b.b follow-up — admin RPC client for
// `nexo/admin/plugins/restart`. Distinct from the read-only
// `plugin_doctor` flow: this is a write+destructive verb that
// kills the running plugin process + spawns a fresh one + emits
// `plugin.lifecycle.<id>.restarted_manually`. Operators recover
// from `gave_up` state without restarting the daemon.

import { adminCall } from "./admin";

export interface PluginsRestartResponse {
  plugin_id: string;
  /** Wallclock duration the previous Inner survived. */
  previous_uptime_ms: number;
  /** Wallclock millis since epoch when the new Inner was installed. */
  restarted_at_ms: number;
  /** PID of the freshly spawned child. May be absent in race-with-shutdown. */
  new_pid?: number;
}

/**
 * Force-restart a subprocess plugin by id. Errors:
 *   - "plugin {id} not found" → InvalidParams (refresh page)
 *   - "plugin {id} is in-tree" → InvalidParams (use daemon restart)
 *   - "restart timed out" → Internal (degraded state)
 */
export async function pluginsRestart(
  plugin_id: string,
): Promise<PluginsRestartResponse> {
  return adminCall<PluginsRestartResponse>("nexo/admin/plugins/restart", {
    plugin_id,
  });
}
