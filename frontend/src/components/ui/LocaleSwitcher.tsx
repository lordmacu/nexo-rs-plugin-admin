// LocaleSwitcher — dropdown that lets the operator flip the
// active locale between every entry in `SUPPORTED_LOCALES`.
// Persists the choice via `useSetLocale` (which writes to
// localStorage). Re-renders the entire app on flip via the
// Zustand subscription baked into `useT`.
//
// Compact UI variant: a small Select inline with the rest of
// the operator chrome. For a richer picker (with flag icons +
// native names), wrap this and override.

import {
  SUPPORTED_LOCALES,
  useLocale,
  useSetLocale,
  useT,
} from "../../i18n";

import Field from "./Field";
import Select from "./Select";

export interface LocaleSwitcherProps {
  /** When `false`, hides the wrapping `<Field>` label —
   *  useful when embedding in a menu row or compact toolbar.
   *  Default `true` shows the label "Idioma" / "Language". */
  showLabel?: boolean;
}

export default function LocaleSwitcher({
  showLabel = true,
}: LocaleSwitcherProps) {
  const t = useT();
  const locale = useLocale();
  const setLocale = useSetLocale();

  const select = (
    <Select
      size="sm"
      value={locale}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "es" || next === "en") setLocale(next);
      }}
      aria-label={t("locale.label")}
    >
      {SUPPORTED_LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.nativeLabel}
        </option>
      ))}
    </Select>
  );

  if (!showLabel) return select;
  return <Field label={t("locale.label")}>{select}</Field>;
}
