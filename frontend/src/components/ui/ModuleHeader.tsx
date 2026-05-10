// ModuleHeader — sidebar header for each top-level module
// (marketing, chats, agents, …). Composes a gradient-tile
// logo + title + subtitle + optional trailing actions, all
// pinned to the top of the sidebar with a bottom separator.
//
// Centralising this component is what makes the marketing
// + chats panes feel like the same product: every module
// gets the identical layout, only the icon and gradient
// change to mark identity.

import type { ReactNode } from "react";

export interface ModuleHeaderProps {
  /** Icon rendered inside the gradient tile (~14px lucide). */
  icon: ReactNode;
  /** Module name — short ("Marketing", "Chats", "Agentes"). */
  title: string;
  /** Optional subtitle line — counts, status, last sync.
   *  Rendered in 10-px uppercase tracking-wider style. */
  subtitle?: ReactNode;
  /** Optional inline trailing slot inside the title row —
   *  status dot, badge, kbd shortcut hint. */
  titleTrailing?: ReactNode;
  /** Optional trailing actions on the right of the header
   *  (filter button, settings cog, refresh). When more
   *  actions than fit in the row are passed, they wrap to
   *  the next line via `flex-wrap`. Use `secondaryActions`
   *  to force a second row even when the first would fit. */
  actions?: ReactNode;
  /** Optional second row of icon-buttons rendered below the
   *  main title row. Use when the icon count is large enough
   *  that crowding the title row hurts legibility on narrow
   *  sidebars (≤ 320px). */
  secondaryActions?: ReactNode;
  /** Tailwind gradient class fragment — `from-X to-Y`.
   *  Default `from-accent to-accent-hover` keeps the brand
   *  colour. Per-module overrides flag identity (e.g. chat
   *  picks a teal pair to differentiate from marketing's
   *  indigo). */
  gradient?: string;
}

export default function ModuleHeader({
  icon,
  title,
  subtitle,
  titleTrailing,
  actions,
  secondaryActions,
  gradient = "from-accent to-accent-hover",
}: ModuleHeaderProps) {
  return (
    <div className="border-b bg-panel">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-sm`}
            aria-hidden
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
              <span className="truncate">{title}</span>
              {titleTrailing}
            </h2>
            {subtitle && (
              <p className="truncate text-[10px] uppercase tracking-wider text-text-meta">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 items-center justify-end gap-1">
            {actions}
          </div>
        )}
      </div>
      {secondaryActions && (
        <div className="flex flex-wrap items-center gap-1 border-t bg-panel-alt px-4 py-1.5">
          {secondaryActions}
        </div>
      )}
    </div>
  );
}
