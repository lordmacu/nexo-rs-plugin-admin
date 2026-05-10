// Curated BCP-47 locale list shown in the agent edit form.
//
// Mirrors the closed-enum surface in
// `proyecto/crates/microapp-sdk/src/locale.rs`. Adding a row
// here without the matching Rust enum variant means the UI
// emits values the daemon will reject with `invalid_locale`.
//
// Keep grouped by language; the language-only "neutral" row
// (`es`, `en`, `pt`, …) sits at the end of each group so it's
// the natural fallback choice for operators who don't care
// about region.

export type Locale = {
  /** Canonical BCP-47 string sent to the daemon (`es-AR`, `en-GB`, `es`). */
  code: string;
  /** ISO-639-1 language subtag (`es`, `en`, …). Used for grouping. */
  language: string;
  /** ISO-3166-1 alpha-2 region subtag, or null for language-only entries. */
  region: string | null;
  /**
   * Human label rendered in the dropdown, in the language itself
   * so an operator who doesn't read English still finds their
   * locale (e.g. "España", "United Kingdom", "Brasil").
   */
  label: string;
  /** Group label for the surrounding `<optgroup>`. */
  group: string;
};

export const SUPPORTED_LOCALES: readonly Locale[] = [
  // Spanish — voseo + tuteo splits matter most to operators.
  {
    code: "es-AR",
    language: "es",
    region: "AR",
    label: "Argentina (es-AR)",
    group: "Español",
  },
  {
    code: "es-MX",
    language: "es",
    region: "MX",
    label: "México (es-MX)",
    group: "Español",
  },
  {
    code: "es-ES",
    language: "es",
    region: "ES",
    label: "España (es-ES)",
    group: "Español",
  },
  {
    code: "es-CO",
    language: "es",
    region: "CO",
    label: "Colombia (es-CO)",
    group: "Español",
  },
  {
    code: "es-PE",
    language: "es",
    region: "PE",
    label: "Perú (es-PE)",
    group: "Español",
  },
  {
    code: "es-CL",
    language: "es",
    region: "CL",
    label: "Chile (es-CL)",
    group: "Español",
  },
  {
    code: "es-US",
    language: "es",
    region: "US",
    label: "Estados Unidos (es-US)",
    group: "Español",
  },
  {
    code: "es",
    language: "es",
    region: null,
    label: "Español neutro Latam (es)",
    group: "Español",
  },

  // English — British / American / Australian / Canadian.
  {
    code: "en-US",
    language: "en",
    region: "US",
    label: "United States (en-US)",
    group: "English",
  },
  {
    code: "en-GB",
    language: "en",
    region: "GB",
    label: "United Kingdom (en-GB)",
    group: "English",
  },
  {
    code: "en-AU",
    language: "en",
    region: "AU",
    label: "Australia (en-AU)",
    group: "English",
  },
  {
    code: "en-CA",
    language: "en",
    region: "CA",
    label: "Canada (en-CA)",
    group: "English",
  },
  {
    code: "en",
    language: "en",
    region: null,
    label: "English (en)",
    group: "English",
  },

  // Portuguese.
  {
    code: "pt-BR",
    language: "pt",
    region: "BR",
    label: "Brasil (pt-BR)",
    group: "Português",
  },
  {
    code: "pt-PT",
    language: "pt",
    region: "PT",
    label: "Portugal (pt-PT)",
    group: "Português",
  },
  {
    code: "pt",
    language: "pt",
    region: null,
    label: "Português neutro (pt)",
    group: "Português",
  },

  // French.
  {
    code: "fr-FR",
    language: "fr",
    region: "FR",
    label: "France (fr-FR)",
    group: "Français",
  },
  {
    code: "fr-CA",
    language: "fr",
    region: "CA",
    label: "Canada (fr-CA)",
    group: "Français",
  },
  {
    code: "fr",
    language: "fr",
    region: null,
    label: "Français (fr)",
    group: "Français",
  },

  // Other languages — no regional dialect splits in v1.
  {
    code: "it-IT",
    language: "it",
    region: "IT",
    label: "Italia (it-IT)",
    group: "Italiano",
  },
  {
    code: "it",
    language: "it",
    region: null,
    label: "Italiano (it)",
    group: "Italiano",
  },
  {
    code: "de-DE",
    language: "de",
    region: "DE",
    label: "Deutschland (de-DE)",
    group: "Deutsch",
  },
  {
    code: "de",
    language: "de",
    region: null,
    label: "Deutsch (de)",
    group: "Deutsch",
  },
  {
    code: "ja-JP",
    language: "ja",
    region: "JP",
    label: "日本 (ja-JP)",
    group: "日本語",
  },
  {
    code: "ja",
    language: "ja",
    region: null,
    label: "日本語 (ja)",
    group: "日本語",
  },
  {
    code: "zh-CN",
    language: "zh",
    region: "CN",
    label: "中国 (zh-CN)",
    group: "中文",
  },
  {
    code: "zh",
    language: "zh",
    region: null,
    label: "中文 (zh)",
    group: "中文",
  },
];

/**
 * Group locales by `<optgroup>` label preserving the curated
 * within-group order. Returns a Map so `Array.from(...)` keeps
 * insertion order when the caller renders.
 */
export function groupLocales(): Map<string, Locale[]> {
  const groups = new Map<string, Locale[]>();
  for (const loc of SUPPORTED_LOCALES) {
    const bucket = groups.get(loc.group);
    if (bucket) {
      bucket.push(loc);
    } else {
      groups.set(loc.group, [loc]);
    }
  }
  return groups;
}
