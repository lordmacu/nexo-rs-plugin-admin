// Phase 90.x.plugins — plugin doctor store.
// Phase 81.21.b.b follow-up — manual restart action.
// Phase 98.12 — available-plugin catalogue store powered by
// `nexo/admin/plugins/search`.

import { create } from "zustand";

import { fetchPluginDoctor, type PluginsDoctorResponse } from "../api/plugin_doctor";
import {
  refreshPluginIndex,
  searchPlugins,
  type DiscoveredPlugin,
  type PluginsSearchParams,
  type PluginsSearchResponse,
  type SourceError,
} from "../api/plugin_discovery";
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

// ── Phase 98.12 — Available plugin catalogue ─────────────────────

interface AvailablePluginsState {
  /** Last successful catalogue payload. `null` until first load. */
  data: PluginsSearchResponse | null;
  isLoading: boolean;
  error: string | null;
  /** Active filter set; UI re-runs `reload()` whenever this mutates. */
  filters: PluginsSearchParams;
  /** Surfaced separately so the `<PartialFailureBanner>` renders
   *  even after the operator dismisses the inline catalogue error. */
  partialFailures: SourceError[];
  /** `true` while a refresh-index RPC is in-flight. */
  refreshInFlight: boolean;
  setFilters: (next: PluginsSearchParams) => void;
  reload: () => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

/** Selector helper: filtered + cached items list. */
export function availablePluginItems(
  s: AvailablePluginsState,
): DiscoveredPlugin[] {
  return s.data?.items ?? [];
}

export const useAvailablePlugins = create<AvailablePluginsState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  filters: {},
  partialFailures: [],
  refreshInFlight: false,
  setFilters: (next) => {
    set({ filters: next });
    void get().reload();
  },
  reload: async () => {
    set({ isLoading: true, error: null });
    try {
      const r = await searchPlugins(get().filters);
      set({
        data: r,
        partialFailures: r.partial_failures ?? [],
        isLoading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        isLoading: false,
      });
    }
  },
  refresh: async () => {
    set({ refreshInFlight: true, error: null });
    try {
      await refreshPluginIndex();
      set({ refreshInFlight: false });
      // Repopulate from the now-empty cache (forces cold fetch).
      void get().reload();
    } catch (e) {
      set({
        refreshInFlight: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
  clearError: () => set({ error: null }),
}));
