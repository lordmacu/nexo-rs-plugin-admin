// Zustand store for the active locale. Single source of
// truth — every component that reads `useT()` subscribes via
// the store, so flipping the locale rerenders everything
// without an app reload.

import { create } from "zustand";

import { LOCALE_STORAGE_KEY, SUPPORTED_LOCALES, type Locale } from "./types";

interface LocaleState {
  locale: Locale;
  setLocale: (next: Locale) => void;
}

/** Best-effort detection of the operator's preferred locale.
 *  Order:
 *  1. Persisted choice in localStorage.
 *  2. Browser `navigator.language` matched to a supported
 *     locale by 2-letter prefix.
 *  3. Spanish default (operator base is Latam-first). */
function detectInitial(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === "es" || stored === "en") return stored;
  } catch {
    /* private mode — ignore */
  }
  if (typeof navigator !== "undefined" && navigator.language) {
    const prefix = navigator.language.slice(0, 2).toLowerCase();
    const match = SUPPORTED_LOCALES.find((l) => l.code === prefix);
    if (match) return match.code;
  }
  return "es";
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: detectInitial(),
  setLocale: (next) => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* private mode — ignore */
    }
    set({ locale: next });
  },
}));
