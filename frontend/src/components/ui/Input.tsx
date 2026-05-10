// Input — token-based text input. Wraps native `<input>` so
// every form on the platform shares the same border / focus
// ring / disabled treatment. Pair with `<Field>` for the
// label + hint shell.

import { forwardRef, type InputHTMLAttributes } from "react";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  /** Layout density — `sm` for inline toolbar inputs, `md`
   *  default. Vertical rhythm matches `<Button size="md">`. */
  size?: "sm" | "md";
  /** When `true`, paints the border red to flag a validation
   *  error. The actual error message lives on the `<Field>`
   *  hint slot — this is purely visual. */
  invalid?: boolean;
  /** When `true`, renders the input with a monospace font.
   *  Useful for hostnames, env-var names, ids. */
  mono?: boolean;
}

const SIZE_CLASS: Record<NonNullable<InputProps["size"]>, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-2 py-1.5 text-sm",
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", invalid, mono, className = "", type = "text", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={[
        "w-full rounded border bg-panel text-text-primary",
        "placeholder:text-text-meta",
        "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
        "disabled:bg-panel-alt disabled:text-text-meta",
        invalid ? "border-danger" : "border-strong",
        mono ? "font-mono" : "",
        SIZE_CLASS[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
});

export default Input;
