// Chip — toggleable pill-shaped button. Distinct from `<Button>`
// (rectangular, fills CTAs) and `<Badge>` (non-interactive).
// Use for filter chips, preset selectors, tag toggles, day-of-week
// pickers — anything where the operator picks one or more from
// a small horizontal group.

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface ChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Active = filled accent + white text. Inactive = bordered
   *  panel + secondary text. Drives the visual without the
   *  caller having to write the conditional className. */
  active?: boolean;
  /** Optional leading icon (~10-12px lucide). */
  icon?: ReactNode;
  children: ReactNode;
}

const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { active, icon, children, className = "", type = "button", disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "bg-accent font-medium text-white hover:bg-accent-hover"
          : "border bg-panel text-text-secondary hover:bg-panel-hover",
        className,
      ].join(" ")}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export default Chip;
