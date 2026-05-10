// Compact stat tile — icon + count + label. Used in the
// inbox empty state and any dashboard rail that needs a
// horizontal row of headline numbers.

import type { ReactNode } from "react";

export interface StatProps {
  /** Icon rendered above the count. ~16-20px lucide icon. */
  icon: ReactNode;
  /** Headline number. Pass `null` to render an em-dash so
   *  the row keeps its baseline while the data is loading. */
  n: number | null;
  /** One-line label rendered under the count. */
  label: string;
  /** Optional tone — picks the icon halo color. Defaults
   *  to `accent`. */
  tone?: "accent" | "success" | "warning" | "danger" | "info";
}

const TONE_CLASS: Record<NonNullable<StatProps["tone"]>, string> = {
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
};

export default function Stat({ icon, n, label, tone = "accent" }: StatProps) {
  return (
    <div className="rounded-xl border bg-panel p-4 shadow-sm">
      <div
        className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${TONE_CLASS[tone]}`}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold tracking-tight text-text-primary">
        {n === null ? "—" : n}
      </div>
      <div className="mt-1 text-xs text-text-secondary">{label}</div>
    </div>
  );
}
