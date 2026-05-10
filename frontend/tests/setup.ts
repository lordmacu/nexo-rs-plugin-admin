// Vitest setup — extends jest-dom matchers + provides a stable
// localStorage mock per test (jsdom's default leaks across
// tests; we want clean state).
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";

import { LOCALE_STORAGE_KEY } from "../src/i18n/types";
import { useLocaleStore } from "../src/i18n/store";

// Pin locale to Spanish for tests. jsdom's navigator.language
// is `en-US` so without this pin every component would render
// in English and the existing Spanish-string assertions would
// all fail. Tests that exercise the EN locale should call
// `useLocaleStore.getState().setLocale("en")` themselves.
beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, "es");
  useLocaleStore.setState({ locale: "es" });
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
