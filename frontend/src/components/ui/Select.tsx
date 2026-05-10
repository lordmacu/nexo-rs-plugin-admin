// Select — token-based dropdown. Wraps native `<select>`
// because (1) accessibility wins over a custom dropdown for
// 99 % of operator surfaces and (2) keyboard nav lands free.
// Pair with `<Field>` for the label + hint shell.

import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> {
  size?: "sm" | "md";
  invalid?: boolean;
}

const SIZE_CLASS: Record<NonNullable<SelectProps["size"]>, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-2 py-1.5 text-sm",
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = "md", invalid, className = "", children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={[
        "w-full rounded border bg-panel text-text-primary",
        "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
        "disabled:bg-panel-alt disabled:text-text-meta",
        invalid ? "border-danger" : "border-strong",
        SIZE_CLASS[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </select>
  );
});

export default Select;
