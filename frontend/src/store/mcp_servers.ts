// Phase 90.x.mcp — mcp_servers store. List + delete + upsert.

import { create } from "zustand";

import {
  deleteMcpServer,
  listMcpServers,
  upsertMcpServer,
  type McpServerDetail,
  type McpServerSummary,
} from "../api/mcp_servers";

interface McpServersState {
  servers: McpServerSummary[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  remove: (name: string) => Promise<void>;
  upsert: (detail: McpServerDetail) => Promise<{ created: boolean }>;
}

export const useMcpServers = create<McpServersState>((set, get) => ({
  servers: [],
  isLoading: false,
  error: null,

  reload: async () => {
    set({ isLoading: true, error: null });
    try {
      const r = await listMcpServers();
      set({ servers: r.servers ?? [], isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        isLoading: false,
      });
    }
  },

  remove: async (name) => {
    try {
      await deleteMcpServer(name);
      set({ servers: get().servers.filter((s) => s.name !== name) });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },

  upsert: async (detail) => {
    try {
      const r = await upsertMcpServer(detail);
      // Reload list so the optimistic update reflects the
      // daemon's view (in case the daemon mutated anything).
      await get().reload();
      return { created: r.created };
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },
}));
