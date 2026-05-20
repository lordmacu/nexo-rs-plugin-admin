// Phase 90.x.plugins — plugins module main panel.
// Phase 98.12 — refactored into a thin tabs host. The pre-98.12
// Loaded / Init outcomes / Diagnostics content moved to
// `InstalledList.tsx` (no functional change); a new "Available"
// tab surfaces the public catalogue from
// `nexo/admin/plugins/search` (filled by 98.13/98.14).
//
// Header keeps the global Scan / Install / Reload buttons — they
// operate on the daemon-side install state regardless of which tab
// is active.

import { useEffect, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";

import { useAvailablePlugins, usePluginsDoctor } from "../../store/plugins";
import { adminCall } from "../../api/admin";
import type { DiscoveredPlugin } from "../../api/plugin_discovery";
import { pluginsSetEnabled } from "../../api/plugin_uninstall";
import { useT } from "../../i18n";
import AvailableGrid from "./AvailableGrid";
import InstalledList from "./InstalledList";
import InstallPluginModal, {
  type InstallModalInitialValues,
} from "./InstallPluginModal";
import PluginsTabs, { type PluginsTabKey } from "./PluginsTabs";
import RestartPluginModal from "./RestartPluginModal";
import UninstallPluginModal from "./UninstallPluginModal";

interface ScanResponse {
  spawned: string[];
  stale: string[];
  warnings: string[];
}

export default function PluginsMain() {
  const t = useT();
  const { data, isLoading, error, reload } = usePluginsDoctor();
  const available = useAvailablePlugins();
  const [restartTarget, setRestartTarget] = useState<string | null>(null);
  const [uninstallTarget, setUninstallTarget] = useState<string | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installInitialValues, setInstallInitialValues] = useState<
    InstallModalInitialValues | undefined
  >(undefined);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PluginsTabKey>("installed");

  async function runScan() {
    setScanBusy(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await adminCall<ScanResponse>("nexo/admin/plugins/scan", {});
      setScanResult(res);
      void reload();
    } catch (e) {
      setScanError(e instanceof Error ? e.message : String(e));
    } finally {
      setScanBusy(false);
    }
  }

  useEffect(() => {
    if (data === null && !isLoading && error === null) {
      void reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const report = data?.report ?? {};
  const generatedAt = data?.generated_at_ms
    ? new Date(data.generated_at_ms).toLocaleString()
    : null;
  const installedCount = (report.loaded_ids ?? []).length;
  const availableCount = available.data?.items.length;

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center justify-between border-b bg-panel px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-text-primary">
            {t("plugins.title")}
          </h1>
          {generatedAt && (
            <p className="mt-0.5 text-xs text-text-meta">
              {t("plugins.generated_at", { ts: generatedAt })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-panel-hover disabled:opacity-50"
            onClick={() => void runScan()}
            disabled={scanBusy}
            title={t("plugins.action.scan_title")}
          >
            <Search size={14} className={scanBusy ? "animate-spin" : ""} />
            {scanBusy ? t("plugins.action.scanning") : t("plugins.action.scan")}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded border border-border-DEFAULT bg-panel-alt px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-panel-hover"
            onClick={() => setInstallOpen(true)}
          >
            <Download size={14} />
            {t("plugins.action.install")}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            onClick={() => void reload()}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            {t("plugins.action.reload")}
          </button>
        </div>
      </header>

      {scanResult && (
        <div className="border-b border-green-300 bg-green-50 px-6 py-3 text-sm text-green-900 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-medium">
              {t("plugins.scan.heading", {
                spawned: scanResult.spawned.length,
                stale: scanResult.stale.length,
              })}
            </p>
            {scanResult.spawned.length > 0 && (
              <p className="text-xs">
                {t("plugins.scan.spawned", {
                  ids: scanResult.spawned.join(", "),
                })}
              </p>
            )}
            {scanResult.stale.length > 0 && (
              <p className="text-xs text-amber-800">
                {t("plugins.scan.stale", { ids: scanResult.stale.join(", ") })}
              </p>
            )}
            {scanResult.warnings.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer">
                  {t("plugins.scan.warnings_summary", {
                    count: scanResult.warnings.length,
                  })}
                </summary>
                <pre className="mt-1 whitespace-pre-wrap">
                  {scanResult.warnings.join("\n")}
                </pre>
              </details>
            )}
          </div>
          <button
            type="button"
            className="rounded p-1 hover:bg-green-100"
            onClick={() => setScanResult(null)}
            title="dismiss"
          >
            ✕
          </button>
        </div>
      )}
      {scanError && (
        <div className="border-b border-danger-soft bg-danger-soft px-6 py-3 text-sm text-danger flex items-center justify-between">
          <span>{t("plugins.scan.error", { error: scanError })}</span>
          <button
            type="button"
            className="rounded p-1 hover:bg-red-100"
            onClick={() => setScanError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {error !== null && (
        <div className="border-b border-danger-soft bg-danger-soft px-6 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <PluginsTabs
        active={activeTab}
        onChange={setActiveTab}
        installedCount={installedCount}
        availableCount={availableCount}
      >
        {activeTab === "installed" ? (
          <InstalledList
            data={data}
            isLoading={isLoading}
            onRequestRestart={setRestartTarget}
            onRequestUninstall={setUninstallTarget}
            onToggleEnabled={(pluginId, enabled) => {
              void (async () => {
                try {
                  await pluginsSetEnabled(pluginId, enabled);
                  void reload();
                } catch {
                  // Surface via the doctor view's error slice on
                  // next reload; the toggle is best-effort + the
                  // operator can retry.
                  void reload();
                }
              })();
            }}
          />
        ) : (
          <AvailableGrid
            onInstall={(plugin: DiscoveredPlugin) => {
              setInstallInitialValues({
                crate_name: plugin.install_params.crate_name,
                version: plugin.install_params.version ?? undefined,
                repo: plugin.install_params.repo ?? undefined,
                source: plugin.install_params.source,
                force: plugin.install_params.force,
              });
              setInstallOpen(true);
            }}
          />
        )}
      </PluginsTabs>

      {restartTarget && (
        <RestartPluginModal
          pluginId={restartTarget}
          onClose={() => setRestartTarget(null)}
          onApplied={() => {
            setRestartTarget(null);
            void reload();
          }}
        />
      )}
      {uninstallTarget && (
        <UninstallPluginModal
          pluginId={uninstallTarget}
          onClose={() => setUninstallTarget(null)}
          onApplied={() => {
            setUninstallTarget(null);
            void reload();
          }}
        />
      )}
      {installOpen && (
        <InstallPluginModal
          onClose={() => {
            setInstallOpen(false);
            setInstallInitialValues(undefined);
          }}
          onInstalled={() => {
            setInstallOpen(false);
            setInstallInitialValues(undefined);
            void reload();
          }}
          initialValues={installInitialValues}
        />
      )}
    </div>
  );
}
