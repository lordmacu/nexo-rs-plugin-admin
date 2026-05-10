// Text — inline / paragraph typography primitive. Replaces
// the ~30 places that paint `text-slate-X text-Ypx` ad-hoc.
// Tone drives color (primary / secondary / meta); size drives
// font size; mono switches to font-family monospace.

import type { ElementType, ReactNode } from "react";

export type TextTone = "primary" | "secondary" | "meta";
export type TextSize = "xs" | "sm" | "md";

export interface TextProps {
  /** Underlying element — defaults to `<span>` so multiple
   *  `<Text>` instances can compose inline. Use `<Text as="p">`
   *  for paragraphs that need block-level layout. */
  as?: ElementType;
  tone?: TextTone;
  size?: TextSize;
  /** Switch the font family to monospace (hostnames, env-var
   *  names, IDs). */
  mono?: boolean;
  /** When `true`, prevents long content from breaking
   *  layout — overflow is hidden + ellipsis appended. The
   *  parent must constrain the width for this to take effect. */
  truncate?: boolean;
  /** When `true`, applies stronger weight (medium → semibold
   *  → bold depending on size). */
  strong?: boolean;
  className?: string;
  children: ReactNode;
}

const TONE_CLASS: Record<TextTone, string> = {
  primary: "text-text-primary",
  secondary: "text-text-secondary",
  meta: "text-text-meta",
};

const SIZE_CLASS: Record<TextSize, string> = {
  xs: "text-[11px] leading-relaxed",
  sm: "text-xs leading-relaxed",
  md: "text-sm leading-relaxed",
};

export default function Text({
  as: Tag = "span",
  tone = "primary",
  size = "sm",
  mono,
  truncate,
  strong,
  className = "",
  children,
}: TextProps) {
  return (
    <Tag
      className={[
        TONE_CLASS[tone],
        SIZE_CLASS[size],
        mono ? "font-mono" : "",
        truncate ? "truncate" : "",
        strong ? "font-semibold" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
