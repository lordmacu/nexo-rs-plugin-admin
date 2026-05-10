// CRM card per conversation. Backed by the microapp's `prospects`
// sqlite table. Boot snapshot lands via `chatMetaBoot.ts`; every
// mutation fires a PUT/DELETE so other devices/tabs can converge
// next time they refetch.

import { create } from "zustand";
import {
  deleteProspect as apiDeleteProspect,
  upsertProspect as apiUpsertProspect,
  type ProspectRow,
} from "../api/chat_meta";

export type Prospect = ProspectRow;

interface ProspectsState {
  prospects: Map<string, Prospect>;
  hydrate: (rows: Prospect[]) => void;
  upsert: (
    p: Omit<Prospect, "created_at_ms" | "updated_at_ms">,
  ) => Promise<Prospect>;
  remove: (conversation_key: string) => Promise<void>;
  get: (conversation_key: string) => Prospect | undefined;
}

export const useProspects = create<ProspectsState>((set, get) => ({
  prospects: new Map(),

  hydrate: (rows) => {
    const map = new Map<string, Prospect>(
      rows.map((p) => [p.conversation_key, p]),
    );
    set({ prospects: map });
  },

  upsert: async (input) => {
    const row = await apiUpsertProspect(input);
    const next = new Map(get().prospects);
    next.set(row.conversation_key, row);
    set({ prospects: next });
    return row;
  },

  remove: async (conversation_key) => {
    await apiDeleteProspect(conversation_key);
    const next = new Map(get().prospects);
    next.delete(conversation_key);
    set({ prospects: next });
  },

  get: (key) => get().prospects.get(key),
}));
