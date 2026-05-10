// Phase 83.12.audit-page — filter row. 3 inputs:
//   - Microapp id (text, debounced 300ms).
//   - Method (text, debounced 300ms).
//   - Result (select: all/ok/error/denied).
//   - Since (select: 24h/7d/30d).
// Reload button on the right.
//
// Values plumbed into the Zustand store; the store handles
// reset of `offset` to 0 when the filter changes. Operator
// hits Reload to apply.

import { useEffect, useState } from "react";

import { useAudit } from "../../store/audit";
import { useT } from "../../i18n";
import type { AdminAuditResult } from "../../api/types";

const HOUR_MS = 60 * 60 * 1000;
const SINCE_OPTIONS: Array<{ key: string; ms: number }> = [
  { key: "24h", ms: 24 * HOUR_MS },
  { key: "7d", ms: 7 * 24 * HOUR_MS },
  { key: "30d", ms: 30 * 24 * HOUR_MS },
];

const RESULT_OPTIONS: Array<AdminAuditResult | "all"> = [
  "all",
  "ok",
  "error",
  "denied",
];

export default function AuditFilters() {
  const t = useT();
  const { filter, setFilter, reload, isLoading } = useAudit();

  // Local mirror so the inputs feel responsive; debounced 300ms
  // before pushing to the store.
  const [microappId, setMicroappId] = useState(filter.microapp_id ?? "");
  const [method, setMethod] = useState(filter.method ?? "");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setFilter({
        microapp_id: microappId.trim() || null,
        method: method.trim() || null,
      });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [microappId, method, setFilter]);

  return (
    <div className="flex flex-wrap items-end gap-3 border-b bg-panel-alt px-6 py-3">
      <label className="flex flex-col text-xs text-text-secondary">
        <span className="mb-1">{t("audit.filter.microapp")}</span>
        <input
          type="text"
          value={microappId}
          onChange={(e) => setMicroappId(e.target.value)}
          placeholder={t("audit.filter.microapp_placeholder")}
          className="rounded border bg-panel px-2 py-1 text-sm text-text-primary"
        />
      </label>
      <label className="flex flex-col text-xs text-text-secondary">
        <span className="mb-1">{t("audit.filter.method")}</span>
        <input
          type="text"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          placeholder={t("audit.filter.method_placeholder")}
          className="rounded border bg-panel px-2 py-1 text-sm text-text-primary"
        />
      </label>
      <label className="flex flex-col text-xs text-text-secondary">
        <span className="mb-1">{t("audit.filter.result")}</span>
        <select
          value={filter.result ?? "all"}
          onChange={(e) => {
            const v = e.target.value as AdminAuditResult | "all";
            setFilter({ result: v === "all" ? null : v });
          }}
          className="rounded border bg-panel px-2 py-1 text-sm text-text-primary"
        >
          {RESULT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(
                `audit.filter.result.${opt}` as
                  | "audit.filter.result.all"
                  | "audit.filter.result.ok"
                  | "audit.filter.result.error"
                  | "audit.filter.result.denied",
              )}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-xs text-text-secondary">
        <span className="mb-1">{t("audit.filter.since")}</span>
        <select
          onChange={(e) => {
            const choice = SINCE_OPTIONS.find((o) => o.key === e.target.value);
            if (choice) {
              setFilter({ since_ms: Date.now() - choice.ms });
            }
          }}
          className="rounded border bg-panel px-2 py-1 text-sm text-text-primary"
        >
          {SINCE_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {t(
                `audit.filter.since.${opt.key}` as
                  | "audit.filter.since.24h"
                  | "audit.filter.since.7d"
                  | "audit.filter.since.30d",
              )}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="ml-auto rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        onClick={() => void reload()}
        disabled={isLoading}
      >
        {t("audit.filter.reload")}
      </button>
    </div>
  );
}
