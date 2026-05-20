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
  /** Base plugin ids already loaded in the runtime (instance suffixes
   *  stripped, e.g. `telegram.bot1` → `telegram`). A discovered plugin
   *  whose `install_params.plugin_id` is in here is shown as installed
   *  rather than offering a redundant install. */
  installedBaseIds: Set<string>;
}

export default function AvailableGrid({
  onInstall,
  installedBaseIds,
}: AvailableGridProps) {
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

  // Map a crate name to its runtime plugin id by stripping the
  // `nexo-[rs-]plugin-` convention prefix (`nexo-plugin-telegram` →
  // `telegram`), so a discovered crate matches the live loaded base id.
  const pluginIdFromCrate = (crate: string): string =>
    crate.replace(/^nexo-(?:rs-)?plugin-/, "");

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
            <PluginCard
              key={p.name}
              plugin={p}
              onInstall={onInstall}
              installed={installedBaseIds.has(
                pluginIdFromCrate(p.install_params.crate_name),
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
