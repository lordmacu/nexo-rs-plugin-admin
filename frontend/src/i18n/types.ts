// Catalog type — every locale must implement the same key
// set. The compiler enforces parity at build time so a
// missing English translation surfaces as a TypeScript error
// before deploy.

export type Catalog = Record<string, string>;

export type Locale = "es" | "en";

export const SUPPORTED_LOCALES: ReadonlyArray<{
  code: Locale;
  /** Native-language label rendered in the switcher. */
  nativeLabel: string;
}> = [
  { code: "es", nativeLabel: "Español" },
  { code: "en", nativeLabel: "English" },
];

/** localStorage key the operator's choice persists at. */
export const LOCALE_STORAGE_KEY = "agent-creator:locale:v1";
