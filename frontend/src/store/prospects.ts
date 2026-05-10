// Phase 90.2 — empty prospects stub. The CRM `prospects` concept
// belongs to the marketing extension (lead pipeline per conversation);
// the admin plugin doesn't surface lead management. Stub returns
// an empty Map so ChatListItem renders the chat list without the
// "prospect" badge cell, but with no errors.
//
// Original lives in agent-creator-microapp/src/store/prospects.ts
// — restored intact when the marketing demo runs alongside.

import { create } from "zustand";

export interface Prospect {
  conversation_key: string;
  name: string;
  email?: string | undefined;
  phone?: string | undefined;
  notes?: string | undefined;
  label_ids: string[];
  created_at_ms: number;
  updated_at_ms: number;
}

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
    // No-op upsert in admin plugin — the CRM table doesn't exist.
    const row: Prospect = {
      conversation_key: input.conversation_key,
      name: input.name,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      label_ids: input.label_ids ?? [],
      created_at_ms: Date.now(),
      updated_at_ms: Date.now(),
    };
    const next = new Map(get().prospects);
    next.set(row.conversation_key, row);
    set({ prospects: next });
    return row;
  },

  remove: async (conversation_key) => {
    const next = new Map(get().prospects);
    next.delete(conversation_key);
    set({ prospects: next });
  },

  get: (key) => get().prospects.get(key),
}));
