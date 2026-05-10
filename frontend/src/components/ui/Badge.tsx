// Badge — small inline pill with a tone-driven background.
// Used for status labels (sentiment, intent, lead state),
// counts, and tags.

import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

export interface BadgeProps {
  tone?: BadgeTone;
  /** Optional leading icon — small (10-11 px). */
  icon?: ReactNode;
  children: ReactNode;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "bg-panel-alt text-text-secondary ring-border",
  accent: "bg-accent-soft text-accent ring-accent/20",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
  info: "bg-info-soft text-info ring-info/20",
};

export default function Badge({
  tone = "neutral",
  icon,
  children,
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
        TONE_CLASS[tone],
      ].join(" ")}
    >
      {icon}
      {children}
    </span>
  );
}
