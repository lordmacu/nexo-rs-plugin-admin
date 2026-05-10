// Phase 90.x.memory — memory store. Holds last query + entries.
// Phase 90.x.memory-snapshot — snapshot list cache.

import { create } from "zustand";

import {
  deleteSnapshot,
  listSnapshots,
  queryMemory,
  type MemoryEntry,
  type SnapshotMeta,
} from "../api/memory";

interface MemoryState {
  agentId: string;
  query: string;
  entries: MemoryEntry[];
  snapshots: SnapshotMeta[];
  snapshotsError: string | null;
  isLoading: boolean;
  error: string | null;
  setAgentId: (id: string) => void;
  setQuery: (q: string) => void;
  search: () => Promise<void>;
  loadSnapshots: () => Promise<void>;
  removeSnapshot: (id: string) => Promise<void>;
}

export const useMemory = create<MemoryState>((set, get) => ({
  agentId: "",
  query: "",
  entries: [],
  snapshots: [],
  snapshotsError: null,
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
  loadSnapshots: async () => {
    const { agentId } = get();
    if (agentId.trim().length === 0) {
      set({ snapshots: [], snapshotsError: null });
      return;
    }
    try {
      const r = await listSnapshots(agentId.trim());
      set({ snapshots: r.snapshots ?? [], snapshotsError: null });
    } catch (e) {
      set({
        snapshotsError: e instanceof Error ? e.message : String(e),
        snapshots: [],
      });
    }
  },
  removeSnapshot: async (id) => {
    const { agentId } = get();
    if (agentId.trim().length === 0) return;
    try {
      await deleteSnapshot(agentId.trim(), id);
      set({
        snapshots: get().snapshots.filter((s) => s.id !== id),
      });
    } catch (e) {
      set({
        snapshotsError: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },
}));
