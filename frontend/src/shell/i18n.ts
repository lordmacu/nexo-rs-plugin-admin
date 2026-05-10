// Thin re-export proxy for back-compat. The canonical i18n
// surface lives at `src/i18n/`. Existing call sites that
// import from `../shell/i18n` continue to work; new code
// should reach for `../../i18n` (or relative equivalent).

export { t, useT, useLocale, useSetLocale, SUPPORTED_LOCALES } from "../i18n";
export type { Locale } from "../i18n";

// Backwards-compat aliases — older shell code declared
// `ShellLocale` + `useShellLocale`. Both point at the same
// `Locale` / `useLocale` now.
export type { Locale as ShellLocale } from "../i18n";
export { useLocale as useShellLocale } from "../i18n";
