// Wire-shape types shared across marketing module
// components. Mirror the marketing extension's
// `nexo-tool-meta::marketing` Rust enums so swapping
// fixtures → live API stays type-clean.

export type LeadState =
  | "cold"
  | "engaged"
  | "meeting_scheduled"
  | "qualified"
  | "lost";

export type DomainKind = "personal" | "corporate" | "disposable";

export type SentimentBand =
  | "very_negative"
  | "negative"
  | "neutral"
  | "positive"
  | "very_positive";

export type IntentClass =
  | "browsing"
  | "comparing"
  | "ready_to_buy"
  | "objecting"
  | "support_request"
  | "out_of_scope";

/** Thread row shape consumed by the lead drawer's
 *  ThreadBubble + AiDraftCard. Lines up with
 *  `nexo-rs-extension-marketing::lead::ThreadMessage`. */
export interface ThreadMessage {
  id: string;
  direction: "inbound" | "outbound" | "draft";
  from_label: string;
  body: string;
  at_ms: number;
  draft_status?: "pending" | "approved" | "rejected";
}
