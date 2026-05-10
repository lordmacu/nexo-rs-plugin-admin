// Single row inside the SidebarList. Renders Avatar +
// title + optional subtitle / preview + optional trailing
// metadata (timestamp, badge). Replaces ChatListItem and
// the inline lead row in MarketingSidebar.

import type { ReactNode } from "react";
import Avatar from "./Avatar";

export interface SidebarListItemProps {
  /** Stable identifier — drives the avatar color hash.
   *  Pass the lead/chat/agent id, NOT the display name. */
  seed: string;
  /** Display name (chat sender / lead person / agent id). */
  title: string;
  /** Optional one-line subtitle — most recent message,
   *  state label, or any fast-glance signal. Truncated. */
  subtitle?: string;
  /** Optional trailing top-right slot — typically a relative
   *  timestamp. Style as small, muted text. */
  trailing?: ReactNode;
  /** Optional bottom-right slot — typically an unread badge
   *  or status pill. */
  badge?: ReactNode;
  /** `true` paints the row with the active highlight. */
  active?: boolean;
  onSelect?: () => void;
}

export default function SidebarListItem({
  seed,
  title,
  subtitle,
  trailing,
  badge,
  active,
  onSelect,
}: SidebarListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex w-full items-center gap-3 border-b px-3 py-2.5 text-left transition-colors",
        active ? "bg-accent-soft" : "bg-panel hover:bg-panel-hover",
      ].join(" ")}
      data-testid="sidebar-list-item"
      data-active={active ? "true" : undefined}
    >
      <Avatar name={title} seed={seed} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-text-primary">
            {title}
          </span>
          {trailing && (
            <span className="shrink-0 text-[10px] text-text-meta">
              {trailing}
            </span>
          )}
        </div>
        {subtitle && (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-text-secondary">
              {subtitle}
            </span>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
        )}
      </div>
    </button>
  );
}
