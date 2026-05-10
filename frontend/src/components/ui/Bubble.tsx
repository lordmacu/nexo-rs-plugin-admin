// Conversation bubble — message body with direction
// (incoming / outgoing) and optional metadata footer
// (timestamp, sender label, status icon). Replaces
// chats/MessageBubble + chats/BotChatBubble + the inline
// timeline rows in marketing/LeadTimeline.

import type { ReactNode } from "react";

export type BubbleDirection = "in" | "out";

export interface BubbleProps {
  /** `in` = received, `out` = sent. Drives bubble color +
   *  alignment. */
  direction: BubbleDirection;
  /** Body content — string for plain text, ReactNode for
   *  rich content (markdown render, attachments, etc.). */
  children: ReactNode;
  /** Optional sender label rendered above the body. Used
   *  when the bubble represents a sub-actor inside the
   *  same conversation (operator takeover, AI draft). */
  senderLabel?: string | undefined;
  /** Optional small footer rendered to the bottom-right
   *  inside the bubble — typically a relative timestamp +
   *  delivery icon. */
  footer?: ReactNode;
  /** Optional accent strip on the leading edge of an
   *  outgoing bubble — used when the bubble represents a
   *  draft / pending / approved variant. */
  accentTone?: "info" | "success" | "warning" | "danger";
}

const ACCENT_CLASS: Record<NonNullable<BubbleProps["accentTone"]>, string> = {
  info: "border-l-info",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
};

export default function Bubble({
  direction,
  children,
  senderLabel,
  footer,
  accentTone,
}: BubbleProps) {
  const out = direction === "out";
  const accentClass = accentTone
    ? `border-l-4 ${ACCENT_CLASS[accentTone]}`
    : "";
  return (
    <div
      className={`flex w-full ${out ? "justify-end" : "justify-start"}`}
      data-testid={`bubble-${direction}`}
    >
      <div
        className={[
          "max-w-[78%] rounded-2xl px-3 py-2 shadow-sm",
          out
            ? "bg-bubble-out text-text-primary rounded-tr-sm"
            : "bg-bubble-in text-text-primary rounded-tl-sm border",
          accentClass,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {senderLabel && (
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            {senderLabel}
          </div>
        )}
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {children}
        </div>
        {footer && (
          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-text-meta">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
