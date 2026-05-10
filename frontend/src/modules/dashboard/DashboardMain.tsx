// Phase 90.3.13 — dashboard main panel. Read-only overview tiles
// fed by `useDashboard`. Layout: 3-column tile grid with the
// "errors banner" on top (only when partial fetch failed).
//
// Mirrors the audit module pattern: boot fetch on first mount,
// explicit reload button in the header. No filters.

import { useEffect } from "react";
import { Bot, Key, FileText, RefreshCw } from "lucide-react";

import { useDashboard } from "../../store/dashboard";
import { useT } from "../../i18n";
import MetricTile from "./MetricTile";

export default function DashboardMain() {
  const t = useT();
  const { counts, isLoading, reload } = useDashboard();

  useEffect(() => {
    if (counts.agents === null && !isLoading) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center justify-between border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("dashboard.title")}
        </h1>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          onClick={() => void reload()}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          {t("dashboard.action.reload")}
        </button>
      </header>
      {counts.errors.length > 0 && (
        <div className="border-b border-warning-soft bg-warning-soft px-6 py-3 text-xs text-warning">
          <strong className="font-medium">
            {t("dashboard.partial_outage")}
          </strong>{" "}
          {counts.errors.join(" · ")}
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricTile
            label={t("dashboard.metric.agents")}
            hint={t("dashboard.metric.agents_hint")}
            value={counts.agents}
            isLoading={isLoading && counts.agents === null}
            icon={<Bot size={18} />}
          />
          <MetricTile
            label={t("dashboard.metric.llm_providers")}
            hint={t("dashboard.metric.llm_providers_hint")}
            value={counts.llmProviders}
            isLoading={isLoading && counts.llmProviders === null}
            icon={<Key size={18} />}
          />
          <MetricTile
            label={t("dashboard.metric.audit_recent")}
            hint={t("dashboard.metric.audit_recent_hint")}
            value={counts.auditRecent}
            isLoading={isLoading && counts.auditRecent === null}
            icon={<FileText size={18} />}
          />
        </div>
      </div>
    </div>
  );
}
