// RadioCard — card-shaped radio entry. Distinct from
// `<RadioGroup>` (which renders a vanilla 4-px circle + label):
// here the *whole row* is the click target, with an accent
// border + accent-tinted background highlighting the selected
// state. Used for picking one of N richer rows where each
// row carries metadata (LLM instance + base URL, agent +
// system prompt preview, …).
//
// The radio dot itself stays — operators expect the visual
// affordance of "single select" — but it's slaved to the
// card click.

import { type ReactNode } from "react";

export interface RadioCardProps {
  /** Stable form name shared across the radio group so
   *  exactly one card can be selected at a time. */
  name: string;
  /** This card's selected? */
  selected: boolean;
  /** Fires when the operator clicks the card or focuses
   *  the radio. */
  onSelect: () => void;
  /** Body content — typically a stack of `<span class="block">`
   *  rows with id / metadata / hint. */
  children: ReactNode;
  /** Optional trailing slot for per-card action buttons
   *  (delete, edit, rotate). The slot sits to the right of
   *  the body and stops click propagation so action clicks
   *  don't accidentally select the card. */
  actions?: ReactNode;
  /** When `true`, the card paints disabled and refuses
   *  selection. */
  disabled?: boolean;
}

export default function RadioCard({
  name,
  selected,
  onSelect,
  children,
  actions,
  disabled,
}: RadioCardProps) {
  return (
    <li
      onClick={() => {
        if (disabled) return;
        onSelect();
      }}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={disabled ? -1 : 0}
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      className={[
        "flex items-center gap-3 rounded border px-3 py-2 transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-accent",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        selected ? "border-accent bg-accent-soft" : "hover:bg-panel-hover",
      ].join(" ")}
      data-testid="radio-card"
      data-selected={selected ? "true" : undefined}
    >
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={() => {
          if (disabled) return;
          onSelect();
        }}
        disabled={disabled}
        className="accent-accent"
        // Stop the keyboard / click events from bubbling to
        // the parent's `onClick` (would double-fire `onSelect`).
        onClick={(e) => e.stopPropagation()}
      />
      <div className="min-w-0 flex-1 text-left">{children}</div>
      {actions && (
        <div
          className="shrink-0"
          // Action clicks must not select the card.
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </li>
  );
}
