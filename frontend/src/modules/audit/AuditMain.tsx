// Phase 83.12.audit-page — main panel for the audit-log
// module. Mounts on `/m/audit`, fires an initial reload on
// mount, then renders filters + list + load-more in a flex
// column.

import { useEffect } from "react";

import { useAudit } from "../../store/audit";
import { useT } from "../../i18n";
import AuditEmpty from "./AuditEmpty";
import AuditFilters from "./AuditFilters";
import AuditList from "./AuditList";

export default function AuditMain() {
  const t = useT();
  const { entries, isLoading, error, reload, total, hasMore, loadMore } =
    useAudit();

  // Boot fetch on first mount. Subsequent navigations preserve
  // the cached state (Zustand singleton). Operator hits Reload
  // explicitly to refresh.
  useEffect(() => {
    if (entries.length === 0 && !isLoading && error === null) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("audit.title")}
        </h1>
      </header>
      <AuditFilters />
      {error !== null && (
        <div className="border-b border-danger-soft bg-danger-soft px-6 py-3 text-sm text-danger">
          {t("audit.error.banner", { message: error })}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 && !isLoading && error === null ? (
          <AuditEmpty />
        ) : (
          <AuditList />
        )}
      </div>
      {entries.length > 0 && (
        <footer className="border-t bg-panel px-6 py-3 text-xs text-text-secondary">
          {t("audit.load_more_count", {
            shown: String(entries.length),
            total: String(total),
          })}
          {hasMore && (
            <button
              type="button"
              className="ml-3 rounded bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent-hover disabled:opacity-50"
              onClick={() => void loadMore()}
              disabled={isLoading}
            >
              {t("audit.load_more")}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
