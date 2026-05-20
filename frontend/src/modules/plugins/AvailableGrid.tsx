// Phase 98.12 / 98.13 / 98.14 — Available tab grid.
//
// State driven by `useAvailablePlugins`. Parent threads `onInstall`
// so a card click opens the SAME `<InstallPluginModal>` that the
// header's "Install plugin" button uses — modal state stays
// single-owned in `PluginsMain`.

import { useEffect } from "react";

import type { DiscoveredPlugin } from "../../api/plugin_discovery";
import { useAvailablePlugins } from "../../store/plugins";
import { useT } from "../../i18n";
import PartialFailureBanner from "./PartialFailureBanner";
import PluginCard from "./PluginCard";
import PluginsSearchBar from "./PluginsSearchBar";

interface AvailableGridProps {
  onInstall: (plugin: DiscoveredPlugin) => void;
}

export default function AvailableGrid({ onInstall }: AvailableGridProps) {
  const t = useT();
  const { data, isLoading, error, partialFailures, reload } =
    useAvailablePlugins();

  useEffect(() => {
    if (data === null && !isLoading && error === null) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      <PluginsSearchBar />
      <PartialFailureBanner failures={partialFailures} />
      {error !== null ? (
        <div className="rounded-lg border border-danger-soft bg-danger-soft p-6 text-sm text-danger">
          {t("plugins.available.error", { error })}
        </div>
      ) : isLoading ? (
        <div className="rounded-lg border bg-panel p-6 text-center text-sm text-text-secondary">
          {t("plugins.available.loading")}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border bg-panel p-6 text-center text-sm text-text-secondary">
          {t("plugins.available.empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <PluginCard key={p.name} plugin={p} onInstall={onInstall} />
          ))}
        </div>
      )}
    </div>
  );
}
