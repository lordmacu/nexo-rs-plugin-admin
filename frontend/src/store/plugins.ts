// Phase 90.x.plugins — plugin doctor store.

import { create } from "zustand";

import { fetchPluginDoctor, type PluginsDoctorResponse } from "../api/plugin_doctor";

interface PluginsState {
  data: PluginsDoctorResponse | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export const usePluginsDoctor = create<PluginsState>((set) => ({
  data: null,
  isLoading: false,
  error: null,
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
}));
