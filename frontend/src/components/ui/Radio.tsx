// Radio + RadioGroup — single-select toggle group. Replaces
// the inline `<input type="radio">` patterns that each
// hand-rolled their own border / focus / label dance.
//
// Usage:
//   <RadioGroup
//     name="poll-mode"
//     value={mode}
//     onChange={setMode}
//     options={[
//       { value: "idle", label: "IDLE", hint: "Push, ~1-3s" },
//       { value: "poll", label: "Poll", hint: "Every N seconds" },
//     ]}
//   />

import { type ReactNode } from "react";

export interface RadioOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /** Optional supporting copy rendered below the label. */
  hint?: ReactNode;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string = string> {
  /** Stable form name — drives the underlying radio group
   *  semantics so a single selection is enforced. */
  name: string;
  value: T;
  onChange: (next: T) => void;
  options: ReadonlyArray<RadioOption<T>>;
  /** Layout: `vertical` (default) stacks options; `horizontal`
   *  lays them out inline (good for ≤3 short options). */
  layout?: "vertical" | "horizontal";
  /** When `true`, the whole group is read-only — every radio
   *  paints disabled and refuses input. */
  disabled?: boolean;
}

export default function RadioGroup<T extends string = string>({
  name,
  value,
  onChange,
  options,
  layout = "vertical",
  disabled,
}: RadioGroupProps<T>) {
  const wrapClass =
    layout === "horizontal" ? "flex flex-wrap gap-3" : "flex flex-col gap-2";
  return (
    <div className={wrapClass} role="radiogroup">
      {options.map((opt) => {
        const checked = opt.value === value;
        const optDisabled = disabled || opt.disabled;
        return (
          <label
            key={opt.value}
            className={[
              "flex items-start gap-2 text-sm",
              optDisabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer",
            ].join(" ")}
          >
            <span className="mt-0.5">
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                disabled={optDisabled}
                onChange={() => {
                  // Defence in depth — synthetic test events
                  // bypass the native `disabled` block, so
                  // reject explicitly.
                  if (optDisabled) return;
                  onChange(opt.value);
                }}
                className={[
                  "h-4 w-4 cursor-pointer border bg-panel",
                  "focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1",
                  "checked:accent-accent",
                  "border-strong",
                  optDisabled ? "cursor-not-allowed opacity-50" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </span>
            <span className="flex-1">
              <span className="block text-text-primary">{opt.label}</span>
              {opt.hint && (
                <span className="mt-0.5 block text-[11px] text-text-meta">
                  {opt.hint}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}
