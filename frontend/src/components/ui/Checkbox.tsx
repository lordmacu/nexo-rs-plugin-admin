// Checkbox — token-styled control + label slot. Replaces
// the 23 inline `<input type="checkbox">` patterns that
// each picked their own border / hover / disabled style.
//
// The label is rendered inline next to the box so callers
// pass the descriptive text as `children` and skip the
// boilerplate `<label>` / `htmlFor` dance.

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  /** Inline label rendered to the right of the box. Skip
   *  to render a bare control (e.g. inside a list row
   *  where the row IS the label). */
  children?: ReactNode;
  /** Optional sub-label rendered below the main label —
   *  supporting copy ("Operator override; agent never
   *  sends without approval"). */
  hint?: ReactNode;
  /** When `true`, the box renders the danger border so a
   *  validation error is visually obvious. */
  invalid?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { children, hint, invalid, className = "", disabled, ...rest },
  ref,
) {
  const box = (
    <input
      ref={ref}
      type="checkbox"
      disabled={disabled}
      className={[
        "h-4 w-4 cursor-pointer rounded border bg-panel",
        "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1",
        "checked:accent-accent",
        invalid ? "border-danger" : "border-strong",
        disabled ? "cursor-not-allowed opacity-50" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
  if (!children) return box;
  return (
    <label
      className={[
        "flex items-start gap-2 text-sm",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <span className="mt-0.5">{box}</span>
      <span className="flex-1">
        <span className="block text-text-primary">{children}</span>
        {hint && (
          <span className="mt-0.5 block text-[11px] text-text-meta">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
});

export default Checkbox;
