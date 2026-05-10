// Phase 90.3.16 — channels store. List + revoke per
// (agent_id, server_name) tuple.

import { create } from "zustand";

import {
  approveChannel,
  listChannels,
  revokeChannel,
  type ChannelEntry,
  type ChannelsApproveInput,
} from "../api/channels";

interface ChannelsState {
  entries: ChannelEntry[];
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  approve: (input: ChannelsApproveInput) => Promise<{ approved: boolean }>;
  revoke: (agent_id: string, server_name: string) => Promise<void>;
}

export const useChannels = create<ChannelsState>((set, get) => ({
  entries: [],
  isLoading: false,
  error: null,

  reload: async () => {
    set({ isLoading: true, error: null });
    try {
      const r = await listChannels();
      set({ entries: r.entries ?? [], isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        isLoading: false,
      });
    }
  },

  revoke: async (agent_id, server_name) => {
    try {
      await revokeChannel({ agent_id, server_name });
      set({
        entries: get().entries.filter(
          (e) => !(e.agent_id === agent_id && e.server_name === server_name),
        ),
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },

  approve: async (input) => {
    try {
      const r = await approveChannel(input);
      // Reload from daemon so any other approvals authored
      // server-side land in the local view too.
      const list = await listChannels();
      set({ entries: list.entries ?? [] });
      return { approved: r.approved };
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  },
}));
