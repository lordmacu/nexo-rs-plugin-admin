// Phase 83.12.audit-page — single audit-log row card. Renders:
//   - Timestamp (formatted, locale-aware via date-fns).
//   - Microapp id (badge).
//   - Method (monospace, full RPC method name).
//   - Capability tag.
//   - Result badge (green/red/yellow per `ok`/`error`/`denied`).
//   - Duration (ms).
//   - Args-hash (8-char prefix + click-to-copy with toast).

import { useState } from "react";
import { format } from "date-fns";

import { useT } from "../../i18n";
import type { AdminAuditResult, AdminAuditRow } from "../../api/types";

const RESULT_BADGE_CLASS: Record<AdminAuditResult, string> = {
  ok: "bg-success-soft text-success",
  error: "bg-danger-soft text-danger",
  denied: "bg-warning-soft text-warning",
};

interface Props {
  row: AdminAuditRow;
}

export default function AuditRow({ row }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(row.args_hash).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  const tsLabel = format(new Date(row.started_at_ms), "yyyy-MM-dd HH:mm:ss");
  const hashPreview = `${row.args_hash.slice(0, 8)}…`;

  return (
    <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] items-center gap-3 px-6 py-2 text-sm hover:bg-panel-hover">
      <span className="font-mono text-xs text-text-meta">{tsLabel}</span>
      <span className="rounded bg-panel-alt px-2 py-0.5 text-xs text-text-secondary">
        {row.microapp_id}
      </span>
      <span className="font-mono text-xs text-text-primary">{row.method}</span>
      <span className="text-xs text-text-meta">{row.capability}</span>
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${
          RESULT_BADGE_CLASS[row.result]
        }`}
      >
        {row.result.toUpperCase()}
      </span>
      <span className="text-xs text-text-meta">{row.duration_ms}ms</span>
      <button
        type="button"
        className="rounded border bg-panel px-2 py-0.5 font-mono text-xs text-text-secondary hover:bg-panel-hover"
        onClick={onCopy}
        title={copied ? t("audit.row.copied") : t("audit.row.copy_hash")}
      >
        {copied ? t("audit.row.copied") : hashPreview}
      </button>
    </div>
  );
}
