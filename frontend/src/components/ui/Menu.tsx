// Menu — popover-style dropdown menu. Anchored to a trigger
// button; items render in a vertical list below the trigger.
// Closes on item click, on outside click, and on Escape.
//
// Use when an icon row in a header would crowd the layout —
// the menu collapses N actions into a single entry-point
// while keeping every action one-click away.
//
// Items can be standalone actions or links; sub-menus are
// out of scope (lift to a richer primitive when needed).

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface MenuItem {
  /** Stable id — used as the React key. */
  id: string;
  /** Inline label rendered as the visible item text. */
  label: ReactNode;
  /** Optional leading icon (~14-16 px lucide). */
  icon?: ReactNode;
  /** Optional one-line hint rendered below the label. */
  hint?: string;
  /** Tone shifts the label colour — `danger` is used for
   *  destructive actions (logout, delete). Default neutral
   *  inherits the panel text colour. */
  tone?: "default" | "danger";
  /** Fired when the operator picks the item. The menu
   *  closes automatically afterwards. */
  onSelect: () => void;
  /** When `true`, the item paints muted and ignores clicks. */
  disabled?: boolean;
  /** Optional aria-pressed style (toggle items — sound on/off). */
  pressed?: boolean;
}

export interface MenuProps {
  /** Trigger element — usually an icon button. The menu
   *  toggles open/closed when this is clicked. */
  trigger: ReactNode;
  items: ReadonlyArray<MenuItem>;
  /** Optional separator IDs — when an item's `id` matches
   *  one of these strings, the menu draws a divider above
   *  it. Lightweight — for richer grouping use multiple
   *  Menu instances. */
  separatorsBefore?: ReadonlyArray<string>;
  /** Side the popover anchors to. `right` (default) lines
   *  up the right edge with the trigger's right edge —
   *  the standard pattern for header dropdowns where the
   *  trigger sits at the far right. */
  align?: "left" | "right";
}

export default function Menu({
  trigger,
  items,
  separatorsBefore,
  align = "right",
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        wrapRef.current &&
        e.target instanceof Node &&
        !wrapRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative inline-block">
      <span onClick={() => setOpen((v) => !v)}>{trigger}</span>
      {open && (
        <div
          className={[
            "absolute top-full z-30 mt-1 min-w-[180px] rounded-lg border bg-panel py-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
          role="menu"
          data-testid="menu-popover"
        >
          {items.map((it, i) => {
            const showDivider = separatorsBefore?.includes(it.id) && i > 0;
            return (
              <div key={it.id}>
                {showDivider && (
                  <div className="my-1 h-px bg-border" aria-hidden />
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={it.disabled}
                  aria-pressed={it.pressed}
                  onClick={() => {
                    if (it.disabled) return;
                    it.onSelect();
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-start gap-2 px-3 py-1.5 text-left text-xs transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    it.tone === "danger"
                      ? "text-danger hover:bg-danger-soft"
                      : "text-text-primary hover:bg-panel-hover",
                  ].join(" ")}
                  data-testid={`menu-item-${it.id}`}
                >
                  {it.icon && (
                    <span className="mt-0.5 shrink-0">{it.icon}</span>
                  )}
                  <span className="flex-1">
                    <span className="block">{it.label}</span>
                    {it.hint && (
                      <span className="mt-0.5 block text-[10px] text-text-meta">
                        {it.hint}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
