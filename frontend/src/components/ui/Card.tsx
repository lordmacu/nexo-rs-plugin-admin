// Card — content container with consistent padding, border,
// and shadow. Use as the canonical wrapper for self-contained
// content blocks (form sections, dashboard tiles, drawer
// rows). Variants tune the visual weight without changing the
// content shape.

import type { ReactNode } from "react";

export type CardVariant = "default" | "raised" | "subtle";

export interface CardProps {
  variant?: CardVariant;
  /** Tighten / widen the inner padding. `md` (default) is
   *  the standard form-section pad; `sm` for inline tiles;
   *  `lg` for hero cards in empty states. */
  padding?: "sm" | "md" | "lg";
  children: ReactNode;
}

const VARIANT_CLASS: Record<CardVariant, string> = {
  default: "border bg-panel",
  raised: "border bg-panel shadow-sm",
  subtle: "bg-panel-alt",
};

const PAD_CLASS: Record<NonNullable<CardProps["padding"]>, string> = {
  sm: "p-2",
  md: "p-3",
  lg: "p-5",
};

export default function Card({
  variant = "default",
  padding = "md",
  children,
}: CardProps) {
  return (
    <div
      className={[
        "rounded-lg",
        VARIANT_CLASS[variant],
        PAD_CLASS[padding],
      ].join(" ")}
    >
      {children}
    </div>
  );
}
