// Heading — typography primitive. Replaces ad-hoc
// `text-lg font-semibold text-slate-900` strings scattered
// across forms / drawers / wizards. Variants follow the
// `<h1>` … `<h6>` semantic; visual size is decoupled via
// `size`.

import type { ReactNode } from "react";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type HeadingSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface HeadingProps {
  /** Semantic HTML level — drives the rendered tag. Use
   *  `1` for the page title, `2` for major sections, etc.
   *  Visual size defaults to a sensible match but can be
   *  overridden via `size`. */
  level?: HeadingLevel;
  /** Visual size — `sm` (panel section), `md` (default),
   *  `lg` (page title). */
  size?: HeadingSize;
  /** Optional leading icon — small (~14-16px) lucide. */
  icon?: ReactNode;
  children: ReactNode;
}

const SIZE_CLASS: Record<HeadingSize, string> = {
  xs: "text-[10px] uppercase tracking-wider font-semibold text-text-secondary",
  sm: "text-xs font-semibold text-text-primary",
  md: "text-sm font-semibold text-text-primary",
  lg: "text-lg font-semibold tracking-tight text-text-primary",
  xl: "text-2xl font-bold tracking-tight text-text-primary",
};

const DEFAULT_SIZE: Record<HeadingLevel, HeadingSize> = {
  1: "xl",
  2: "lg",
  3: "md",
  4: "sm",
  5: "xs",
  6: "xs",
};

export default function Heading({
  level = 2,
  size,
  icon,
  children,
}: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const cls = SIZE_CLASS[size ?? DEFAULT_SIZE[level]];
  return (
    <Tag className={["flex items-center gap-1.5", cls].join(" ")}>
      {icon}
      {children}
    </Tag>
  );
}
