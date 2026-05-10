// Textarea — token-based multi-line text input. Wraps
// native `<textarea>` with the same focus-ring + disabled
// treatment as `<Input>`. Pair with `<Field>`.

import { forwardRef, type TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  mono?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid, mono, className = "", rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={[
          "w-full resize-y rounded border bg-panel text-text-primary",
          "placeholder:text-text-meta",
          "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
          "disabled:bg-panel-alt disabled:text-text-meta",
          invalid ? "border-danger" : "border-strong",
          mono ? "font-mono text-xs" : "px-2 py-1.5 text-sm",
          mono ? "px-2 py-1.5" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />
    );
  },
);

export default Textarea;
