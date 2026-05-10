// M7.notify.sound — operator preference for audio cues.
// Default off (opt-in) so the dashboard never surprises a new
// operator with a sound on the first message. Persisted to
// localStorage so the choice survives reloads.

import { create } from "zustand";
import { primeAudioContext } from "../lib/notifySound";

const STORAGE_KEY = "agent-creator:notify:sound:v1";

function load_initial(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function persist(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  } catch {
    /* private mode */
  }
}

interface SoundPrefState {
  enabled: boolean;
  /** Toggle the preference. Enabling primes the AudioContext so
   *  subsequent background-tab beeps fire even on iOS Safari
   *  (the toggle click is the user gesture). */
  toggle: () => Promise<void>;
}

export const useSoundPref = create<SoundPrefState>((set, get) => ({
  enabled: load_initial(),
  toggle: async () => {
    const next = !get().enabled;
    if (next) {
      // User just opted in — capture the gesture to unblock the
      // AudioContext before we ever try to fire from a non-
      // gesture event-loop tick.
      await primeAudioContext();
    }
    persist(next);
    set({ enabled: next });
  },
}));
