// StatusDot — small (~6px) coloured circle indicating live /
// idle / error / pending state. Used inline next to titles
// + list rows + tile headers. Replaces the bespoke
// `h-1.5 w-1.5 rounded-full bg-X-500` patterns in
// MarketingSidebar (firehose live indicator) and AiDraftCard.

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export interface StatusDotProps {
  tone?: StatusTone;
  /** When `true`, applies a subtle pulse animation — useful
   *  for "currently active / live" indicators. */
  pulse?: boolean;
  /** Optional `title` attribute for the native browser
   *  tooltip (1-line description of what the colour means). */
  label?: string;
}

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-text-meta",
};

export default function StatusDot({
  tone = "neutral",
  pulse,
  label,
}: StatusDotProps) {
  return (
    <span
      title={label}
      aria-label={label}
      className={[
        "inline-block h-1.5 w-1.5 rounded-full",
        TONE_CLASS[tone],
        pulse ? "animate-pulse" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
