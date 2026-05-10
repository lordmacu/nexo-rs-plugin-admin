// Phase 90.3.15 — llm_keys store. Mirror of the audit store
// pattern: entries + isLoading + error + reload + remove.

import { create } from "zustand";

import {
  deleteKey,
  listKeys,
  type LlmProviderSummary,
  type LlmProvidersListFilter,
} from "../api/llm_keys";

interface LlmKeysState {
  entries: LlmProviderSummary[];
  isLoading: boolean;
  error: string | null;
  filter: LlmProvidersListFilter;
  reload: () => Promise<void>;
  remove: (provider_id: string) => Promise<void>;
  setFilter: (patch: Partial<LlmProvidersListFilter>) => void;
}

export const useLlmKeys = create<LlmKeysState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,
  filter: { tenant_id: null },

  reload: async () => {
    set({ isLoading: true, error: null });
    try {
      const r = await listKeys(get().filter);
      set({ entries: r.providers ?? [], isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        isLoading: false,
      });
    }
  },

  remove: async (provider_id) => {
    try {
      await deleteKey(provider_id);
      set({
        entries: get().entries.filter((e) => e.id !== provider_id),
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },

  setFilter: (patch) => {
    set({ filter: { ...get().filter, ...patch } });
  },
}));
