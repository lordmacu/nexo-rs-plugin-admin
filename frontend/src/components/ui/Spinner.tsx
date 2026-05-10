// Spinner — single primitive replacing the 33 inline
// `<Loader2 className="animate-spin" />` invocations across
// the codebase. Pixel size + tone are token-driven so a
// "cargando" indicator looks identical wherever it lands.

import { Loader2 } from "lucide-react";

export interface SpinnerProps {
  /** Pixel size — `sm` (10px), `md` (14px, default),
   *  `lg` (20px). Match the surrounding text size. */
  size?: "sm" | "md" | "lg";
  /** Tone — `current` (default) inherits text colour from
   *  the parent so a spinner inside a primary button stays
   *  white, inside a secondary button stays slate-600.
   *  `accent` / `meta` / `danger` force a specific tone for
   *  standalone surfaces. */
  tone?: "current" | "accent" | "meta" | "danger";
}

const SIZE_PX: Record<NonNullable<SpinnerProps["size"]>, number> = {
  sm: 10,
  md: 14,
  lg: 20,
};

const TONE_CLASS: Record<NonNullable<SpinnerProps["tone"]>, string> = {
  current: "",
  accent: "text-accent",
  meta: "text-text-meta",
  danger: "text-danger",
};

export default function Spinner({
  size = "md",
  tone = "current",
}: SpinnerProps) {
  return (
    <Loader2
      size={SIZE_PX[size]}
      className={`animate-spin ${TONE_CLASS[tone]}`}
      aria-label="Cargando"
    />
  );
}
