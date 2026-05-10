// Public i18n surface. Consumers import from this barrel.
//
// Usage:
//   import { useT } from "../../i18n";
//   const t = useT();
//   ...
//   <h1>{t("chat.sidebar.title")}</h1>
//   <p>{t("chat.sidebar.subtitle", { count: 3 })}</p>
//
// Adding a new string:
//   1. Add the key + Spanish copy to `catalogs/es.ts`.
//   2. Add the same key + English copy to `catalogs/en.ts`.
//   3. The TypeScript compiler errors out at build time if
//      the catalogs drift.

import { useMemo } from "react";

import es, { type CatalogKey } from "./catalogs/es";
import en from "./catalogs/en";
import { useLocaleStore } from "./store";
import { type Catalog, type Locale } from "./types";

const CATALOGS: Record<Locale, Catalog> = { es, en };

/** Pure interpolation — replaces `{var}` tokens with values
 *  from `vars`. Missing vars render as `{var}` (visible
 *  TODO for the developer). */
function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    String(vars[name] ?? `{${name}}`),
  );
}

/** Stand-alone translator — used outside React (logs,
 *  zustand middleware, anywhere a hook isn't reachable).
 *  Defaults to the active locale from the store at the
 *  moment of the call; pass `locale` to override. */
export function t(
  key: CatalogKey,
  vars: Record<string, string | number> = {},
  locale: Locale = useLocaleStore.getState().locale,
): string {
  const catalog = CATALOGS[locale];
  const fallback = CATALOGS.en;
  const tpl = catalog[key] ?? fallback[key] ?? key;
  return interpolate(tpl, vars);
}

/** Hook variant — subscribes to the active locale so the
 *  component rerenders on language flip. Memoised per
 *  locale for stable identity. */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return useMemo(
    () =>
      (key: CatalogKey, vars?: Record<string, string | number>): string =>
        t(key, vars ?? {}, locale),
    [locale],
  );
}

/** Direct-access locale state for surfaces that need to
 *  know the active locale without translating (e.g. a
 *  date-picker that picks `Intl.DateTimeFormat` based on
 *  current locale). */
export function useLocale() {
  return useLocaleStore((s) => s.locale);
}

/** Action hook — pairs with `<LocaleSwitcher>` and any
 *  programmatic flips (e.g. an admin overriding the locale
 *  per tenant in a future M22 follow-up). */
export function useSetLocale() {
  return useLocaleStore((s) => s.setLocale);
}

export { SUPPORTED_LOCALES } from "./types";
export type { Locale, CatalogKey };
