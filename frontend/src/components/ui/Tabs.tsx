// Tabs — horizontal tab strip + content slot. Replaces the
// hand-rolled tab switchers in Settings, demo, etc. Pure
// presentational — caller owns the active state + wires
// each label to a route or local state.
//
// The active tab carries the accent underline; inactive
// tabs render in the secondary tone with a hover treatment.

import type { ReactNode } from "react";

export interface TabItem {
  /** Stable identifier — drives the active comparison. */
  id: string;
  label: ReactNode;
  /** Optional badge / count rendered to the right of the
   *  label (pending count, error indicator). */
  trailing?: ReactNode;
  /** When `true`, the tab is rendered but cannot be
   *  selected (pending availability of an upstream feature). */
  disabled?: boolean;
}

export interface TabsProps {
  items: ReadonlyArray<TabItem>;
  /** ID of the currently active tab. Must match one of the
   *  `items[].id` values; mismatch renders no underline. */
  activeId: string;
  onSelect: (id: string) => void;
  /** Optional content rendered below the strip — the panel
   *  body. Caller filters by `activeId` to show the matching
   *  panel. Skipping this slot keeps the component as a
   *  pure tab strip. */
  children?: ReactNode;
}

export default function Tabs({
  items,
  activeId,
  onSelect,
  children,
}: TabsProps) {
  return (
    <div>
      <div className="flex items-center gap-1 border-b" role="tablist">
        {items.map((t) => {
          const active = t.id === activeId;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={t.disabled}
              onClick={() => onSelect(t.id)}
              className={[
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-40",
                active
                  ? "border-accent text-text-primary font-medium"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:bg-panel-hover",
              ].join(" ")}
            >
              {t.label}
              {t.trailing}
            </button>
          );
        })}
      </div>
      {children && <div className="pt-4">{children}</div>}
    </div>
  );
}
