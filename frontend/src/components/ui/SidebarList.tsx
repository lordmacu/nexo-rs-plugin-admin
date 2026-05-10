// Scrollable left-rail container — chats / leads / agents
// list. Pure layout: callers stamp `<SidebarListItem>`
// children. Matches the marketing module's MarketingSidebar
// outline so chat / marketing / future modules render the
// same column shell.

import type { ReactNode } from "react";

export interface SidebarListProps {
  /** Optional header rendered above the scrolling list —
   *  typically a search input + filter chips. */
  header?: ReactNode;
  /** Optional footer pinned to the bottom — power-user
   *  shortcuts, account row, etc. */
  footer?: ReactNode;
  children: ReactNode;
}

export default function SidebarList({
  header,
  footer,
  children,
}: SidebarListProps) {
  return (
    <aside className="flex h-full w-full flex-col bg-panel-alt">
      {header && <div className="border-b bg-panel px-3 py-2.5">{header}</div>}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="border-t bg-panel px-3 py-2.5">{footer}</div>}
    </aside>
  );
}
