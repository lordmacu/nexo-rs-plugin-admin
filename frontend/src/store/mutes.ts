// M7.notify.granular — per-conversation mute toggle.
//
// Stores a Set<string> of conversation keys for which OS-level
// browser notifications should be suppressed even when the
// global permission is granted. Persisted to localStorage so a
// noisy chat stays silenced across reloads. ChatHeader exposes
// the toggle; conversations store consults the set before
// firing fireNotification.

import { create } from "zustand";

const STORAGE_KEY = "agent-creator:mutes:v1";

function load_initial(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persist(muted: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...muted]));
  } catch {
    /* private mode */
  }
}

interface MutesState {
  muted: Set<string>;
  toggle: (key: string) => void;
  isMuted: (key: string) => boolean;
}

export const useMutes = create<MutesState>((set, get) => ({
  muted: load_initial(),
  toggle: (key) => {
    const next = new Set(get().muted);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persist(next);
    set({ muted: next });
  },
  isMuted: (key) => get().muted.has(key),
}));
