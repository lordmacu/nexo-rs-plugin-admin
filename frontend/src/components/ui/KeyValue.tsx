// KeyValue — labeled value pill. Replaces the bespoke
// `<Pill label value>` in marketing/LeadContextPanel and
// any future label/value pair display.
//
// Three layouts:
//   - `pill` (default) — boxed, label above value, used for
//     dashboard-style key facts.
//   - `row`             — label left, value right, used for
//     drawer detail rows.
//   - `inline`          — label and value on one line, used
//     for compact metadata strips.

import type { ReactNode } from "react";

export type KeyValueLayout = "pill" | "row" | "inline";

export interface KeyValueProps {
  /** Label text — short, descriptive. */
  label: string;
  /** Value content — usually a string but can be JSX
   *  (Code primitive, Badge, etc.). */
  value: ReactNode;
  layout?: KeyValueLayout;
}

export default function KeyValue({
  label,
  value,
  layout = "pill",
}: KeyValueProps) {
  if (layout === "row") {
    return (
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-text-meta">{label}</span>
        <span className="text-text-secondary">{value}</span>
      </div>
    );
  }
  if (layout === "inline") {
    return (
      <span className="inline-flex items-baseline gap-1 text-[11px]">
        <span className="text-text-meta">{label}</span>
        <span className="text-text-secondary">{value}</span>
      </span>
    );
  }
  return (
    <div className="rounded-md bg-panel-alt px-2 py-1 ring-1 ring-border">
      <p className="text-[10px] uppercase tracking-wider text-text-meta">
        {label}
      </p>
      <p className="text-xs text-text-primary">{value}</p>
    </div>
  );
}
