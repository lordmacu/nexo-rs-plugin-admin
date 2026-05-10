// Phase 90.x.plugins — plugin doctor store.
// Phase 81.21.b.b follow-up — manual restart action.

import { create } from "zustand";

import { fetchPluginDoctor, type PluginsDoctorResponse } from "../api/plugin_doctor";
import { pluginsRestart, type PluginsRestartResponse } from "../api/plugin_restart";

interface PluginsState {
  data: PluginsDoctorResponse | null;
  isLoading: boolean;
  error: string | null;
  /** Phase 81.21.b.b — non-null while a restart RPC is in flight. */
  restartInFlight: string | null;
  /** Last successful restart report — drives toast / inline display. */
  lastRestartReport: PluginsRestartResponse | null;
  reload: () => Promise<void>;
  restart: (plugin_id: string) => Promise<PluginsRestartResponse>;
  clearLastRestartReport: () => void;
}

export const usePluginsDoctor = create<PluginsState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  restartInFlight: null,
  lastRestartReport: null,
  reload: async () => {
    set({ isLoading: true, error: null });
    try {
      const r = await fetchPluginDoctor();
      set({ data: r, isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        isLoading: false,
      });
    }
  },
  restart: async (plugin_id: string) => {
    set({ restartInFlight: plugin_id, error: null });
    try {
      const report = await pluginsRestart(plugin_id);
      set({ restartInFlight: null, lastRestartReport: report });
      // Refresh doctor view so operator sees fresh InitOutcome.
      void get().reload();
      return report;
    } catch (e) {
      set({
        restartInFlight: null,
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },
  clearLastRestartReport: () => set({ lastRestartReport: null }),
}));
