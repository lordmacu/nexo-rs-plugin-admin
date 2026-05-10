// Code — inline monospace pill for env-var names, file
// paths, IDs, JSON keys. Replaces 48 ad-hoc `<code>` tags
// that each picked their own padding / background / size.
//
// Two variants: `inline` (default — small pill inline with
// surrounding text) and `block` (multi-line code box with
// scroll, used for sample payloads / config snippets).

import type { ReactNode } from "react";

export interface CodeProps {
  variant?: "inline" | "block";
  children: ReactNode;
}

export default function Code({ variant = "inline", children }: CodeProps) {
  if (variant === "block") {
    return (
      <pre className="overflow-x-auto rounded border bg-panel-alt px-3 py-2 font-mono text-xs leading-relaxed text-text-primary">
        <code>{children}</code>
      </pre>
    );
  }
  return (
    <code className="rounded bg-panel-alt px-1 py-0.5 font-mono text-[0.85em] text-text-primary">
      {children}
    </code>
  );
}
