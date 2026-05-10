// Phase 90.x.memory — memory store. Holds last query + entries.

import { create } from "zustand";

import { queryMemory, type MemoryEntry } from "../api/memory";

interface MemoryState {
  agentId: string;
  query: string;
  entries: MemoryEntry[];
  isLoading: boolean;
  error: string | null;
  setAgentId: (id: string) => void;
  setQuery: (q: string) => void;
  search: () => Promise<void>;
}

export const useMemory = create<MemoryState>((set, get) => ({
  agentId: "",
  query: "",
  entries: [],
  isLoading: false,
  error: null,
  setAgentId: (id) => set({ agentId: id }),
  setQuery: (q) => set({ query: q }),
  search: async () => {
    const { agentId, query } = get();
    if (agentId.trim().length === 0) {
      set({ error: "agent_id required", entries: [] });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const r = await queryMemory(agentId.trim(), query.trim(), 20);
      set({ entries: r.entries ?? [], isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        isLoading: false,
        entries: [],
      });
    }
  },
}));
