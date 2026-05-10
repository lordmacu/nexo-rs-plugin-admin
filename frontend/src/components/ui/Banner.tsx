// Banner — full-width inline alert / status row. Used for
// connection state, error messages, info nudges. Tone drives
// background + leading icon color; the icon itself comes from
// the caller so we don't lock the wording to a specific glyph.

import type { ReactNode } from "react";

export type BannerTone = "info" | "success" | "warning" | "danger";

export interface BannerProps {
  tone?: BannerTone;
  /** Optional leading icon (~14-16 px lucide). */
  icon?: ReactNode;
  /** Optional trailing actions (typically a dismiss / retry
   *  button). */
  actions?: ReactNode;
  children: ReactNode;
}

const TONE_CLASS: Record<BannerTone, string> = {
  info: "bg-info-soft text-info border-info/30",
  success: "bg-success-soft text-success border-success/30",
  warning: "bg-warning-soft text-warning border-warning/30",
  danger: "bg-danger-soft text-danger border-danger/30",
};

export default function Banner({
  tone = "info",
  icon,
  actions,
  children,
}: BannerProps) {
  return (
    <div
      className={[
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
        TONE_CLASS[tone],
      ].join(" ")}
      role="status"
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="flex-1 leading-relaxed">{children}</div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
