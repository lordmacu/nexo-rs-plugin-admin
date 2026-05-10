// Operator-defined chat labels (catalogue) + per-conversation
// assignments. Backed by the microapp's `chat_meta` sqlite table —
// every mutation fires a PUT/POST/DELETE to the backend; local
// state stays in sync optimistically. Boot snapshot lands via
// `useChatMetaBoot` in `init/chatMetaBoot.ts`.

import { create } from "zustand";
import {
  createLabel as apiCreateLabel,
  deleteLabel as apiDeleteLabel,
  setChatLabels as apiSetChatLabels,
  updateLabel as apiUpdateLabel,
} from "../api/chat_meta";

export interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelsState {
  labels: Map<string, Label>;
  /// `conversation_key → set of label ids`.
  assignments: Map<string, Set<string>>;
  /// Boot helper — replaces every entry with the freshly-fetched
  /// snapshot. Called once when the auth gate clears.
  hydrate: (labels: Label[], chat_label_pairs: [string, string][]) => void;
  create_label: (name: string, color: string) => Promise<Label>;
  update_label: (
    id: string,
    patch: { name?: string; color?: string },
  ) => Promise<void>;
  delete_label: (id: string) => Promise<void>;
  /// Replace the full set of labels assigned to a conversation.
  set_assignments: (
    conversation_key: string,
    label_ids: string[],
  ) => Promise<void>;
  /// Toggle a single label on/off for one conversation.
  toggle_assignment: (
    conversation_key: string,
    label_id: string,
  ) => Promise<void>;
  labels_for: (conversation_key: string) => Label[];
}

export const useLabels = create<LabelsState>((set, get) => ({
  labels: new Map(),
  assignments: new Map(),

  hydrate: (labels, chat_label_pairs) => {
    const labels_map = new Map<string, Label>(labels.map((l) => [l.id, l]));
    const assignments = new Map<string, Set<string>>();
    for (const [ck, lid] of chat_label_pairs) {
      const cur = assignments.get(ck) ?? new Set<string>();
      cur.add(lid);
      assignments.set(ck, cur);
    }
    set({ labels: labels_map, assignments });
  },

  create_label: async (name, color) => {
    const row = await apiCreateLabel(name, color);
    const labels = new Map(get().labels);
    labels.set(row.id, { id: row.id, name: row.name, color: row.color });
    set({ labels });
    return { id: row.id, name: row.name, color: row.color };
  },

  update_label: async (id, patch) => {
    const row = await apiUpdateLabel(id, patch);
    const labels = new Map(get().labels);
    labels.set(row.id, { id: row.id, name: row.name, color: row.color });
    set({ labels });
  },

  delete_label: async (id) => {
    await apiDeleteLabel(id);
    const labels = new Map(get().labels);
    labels.delete(id);
    const assignments = new Map(get().assignments);
    for (const [k, set_ids] of assignments) {
      if (set_ids.has(id)) {
        const next = new Set(set_ids);
        next.delete(id);
        if (next.size === 0) {
          assignments.delete(k);
        } else {
          assignments.set(k, next);
        }
      }
    }
    set({ labels, assignments });
  },

  set_assignments: async (conversation_key, label_ids) => {
    // Optimistic local update before the round-trip lands so the
    // sidebar reflects the change instantly.
    const valid = label_ids.filter((id) => get().labels.has(id));
    const assignments = new Map(get().assignments);
    if (valid.length === 0) {
      assignments.delete(conversation_key);
    } else {
      assignments.set(conversation_key, new Set(valid));
    }
    set({ assignments });
    try {
      await apiSetChatLabels(conversation_key, valid);
    } catch (e) {
      console.warn("set_assignments persist failed", e);
    }
  },

  toggle_assignment: async (conversation_key, label_id) => {
    if (!get().labels.has(label_id)) return;
    const current = new Set(get().assignments.get(conversation_key) ?? []);
    if (current.has(label_id)) {
      current.delete(label_id);
    } else {
      current.add(label_id);
    }
    await get().set_assignments(conversation_key, [...current]);
  },

  labels_for: (conversation_key) => {
    const ids = get().assignments.get(conversation_key);
    if (!ids) return [];
    const out: Label[] = [];
    for (const id of ids) {
      const l = get().labels.get(id);
      if (l) out.push(l);
    }
    return out;
  },
}));

/// Starter palette the create-label modal pre-fills from.
export const LABEL_PALETTE: string[] = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];
