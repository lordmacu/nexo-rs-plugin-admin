// Phase 98.12 — Available tab placeholder.
// Phase 98.13 fills this with `<PluginCard>` grid + badges +
// pre-fill click. Phase 98.14 adds `<PluginsSearchBar>` +
// `<PartialFailureBanner>`.
//
// Renders a friendly "Loading…" / "No matches" / data state so the
// tab switch is visually live as of 98.12 even though the grid
// itself ships in the next sub-phase.

import { useEffect } from "react";

import { useAvailablePlugins } from "../../store/plugins";
import { useT } from "../../i18n";

export default function AvailableGrid() {
  const t = useT();
  const { data, isLoading, error, reload } = useAvailablePlugins();

  useEffect(() => {
    if (data === null && !isLoading && error === null) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error !== null) {
    return (
      <div className="rounded-lg border border-danger-soft bg-danger-soft p-6 text-sm text-danger">
        {t("plugins.available.error", { error })}
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="rounded-lg border bg-panel p-6 text-center text-sm text-text-secondary">
        {t("plugins.available.loading")}
      </div>
    );
  }
  const items = data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-panel p-6 text-center text-sm text-text-secondary">
        {t("plugins.available.empty")}
      </div>
    );
  }

  // Phase 98.13 swaps this for the real `<PluginCard>` grid + badges.
  return (
    <div className="space-y-2">
      <p className="text-xs text-text-meta">
        {t("plugins.available.placeholder_count", { count: items.length })}
      </p>
      <ul className="divide-y rounded-lg border bg-panel">
        {items.map((p) => (
          <li
            key={p.name}
            className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
          >
            <span className="font-mono text-xs text-text-primary">{p.name}</span>
            <span className="text-xs text-text-meta">
              {p.version ?? "—"} · {p.owner}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
