// Phase 90.x.plugins — plugins module main panel.
// LIVE in Phase 90.x.plugins (was placeholder in 90.3.18).
//
// Renders 4 sections from the daemon's PluginDiscoveryReport:
//   - Summary tiles (loaded / scanned / invalid / disabled)
//   - Loaded plugins list (one per id)
//   - Init outcomes (per-plugin spawn status)
//   - Diagnostics (Warn/Error from discovery + capability aggregation)

import { useEffect } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

import { usePluginsDoctor } from "../../store/plugins";
import type { PluginDiagnostic } from "../../api/plugin_doctor";
import { useT } from "../../i18n";

export default function PluginsMain() {
  const t = useT();
  const { data, isLoading, error, reload } = usePluginsDoctor();

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

  const loadedIds = report.loaded_ids ?? [];
  const initOutcomes = report.init_outcomes ?? {};
  const diagnostics = report.diagnostics ?? [];

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
        <button
          type="button"
          className="flex items-center gap-1.5 rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          onClick={() => void reload()}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          {t("plugins.action.reload")}
        </button>
      </header>

      {error !== null && (
        <div className="border-b border-danger-soft bg-danger-soft px-6 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary tiles */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryTile
            label={t("plugins.summary.loaded")}
            value={(report.loaded_ids ?? []).length}
            tone="success"
          />
          <SummaryTile
            label={t("plugins.summary.scanned")}
            value={report.scanned ?? 0}
            tone="default"
          />
          <SummaryTile
            label={t("plugins.summary.invalid")}
            value={report.invalid ?? 0}
            tone={(report.invalid ?? 0) > 0 ? "danger" : "default"}
          />
          <SummaryTile
            label={t("plugins.summary.disabled")}
            value={report.disabled ?? 0}
            tone="default"
          />
        </section>

        {/* Loaded plugins */}
        <section className="rounded-lg border bg-panel">
          <header className="flex items-center gap-2 border-b px-4 py-2 text-sm font-bold text-text-primary">
            <CheckCircle2 size={14} className="text-success" />
            {t("plugins.loaded.title")} ({loadedIds.length})
          </header>
          {loadedIds.length === 0 ? (
            <div className="px-4 py-6 text-sm text-text-secondary">
              {t("plugins.loaded.empty")}
            </div>
          ) : (
            <ul className="divide-y">
              {loadedIds.map((id) => (
                <li
                  key={id}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-text-primary">
                    {id}
                  </span>
                  <InitOutcomeBadge outcome={initOutcomes[id]} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Diagnostics */}
        {diagnostics.length > 0 && (
          <section className="rounded-lg border bg-panel">
            <header className="flex items-center gap-2 border-b px-4 py-2 text-sm font-bold text-text-primary">
              <AlertTriangle size={14} className="text-warning" />
              {t("plugins.diagnostics.title")} ({diagnostics.length})
            </header>
            <ul className="divide-y">
              {diagnostics.map((d, idx) => (
                <DiagnosticRow key={idx} diag={d} />
              ))}
            </ul>
          </section>
        )}

        {/* Empty state when no diagnostics + nothing loaded */}
        {loadedIds.length === 0 && diagnostics.length === 0 && !isLoading && (
          <section className="rounded-lg border bg-panel p-6 text-center text-sm text-text-secondary">
            <Activity size={28} className="mx-auto mb-3 text-text-meta" />
            {t("plugins.empty.body")}
          </section>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "danger"
        ? "bg-danger-soft text-danger"
        : "bg-panel-alt text-text-primary";
  return (
    <div className="rounded-lg border bg-panel px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-text-meta">
        {label}
      </div>
      <div className={`mt-1 inline-block rounded px-2 py-0.5 text-2xl font-bold ${toneClass}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function InitOutcomeBadge({ outcome }: { outcome: unknown }) {
  if (outcome === undefined || outcome === null) {
    return <span className="text-xs text-text-meta">—</span>;
  }
  // PluginInitOutcome enum from nexo-core. Unit variants serialise
  // as bare strings; tagged variants as `{ VariantName: { ... } }`.
  if (typeof outcome === "string") {
    if (outcome === "Spawned") {
      return (
        <span className="rounded bg-success-soft px-2 py-0.5 text-xs text-success">
          spawned
        </span>
      );
    }
    if (outcome === "NoHandle") {
      return (
        <span className="rounded bg-warning-soft px-2 py-0.5 text-xs text-warning">
          no handle
        </span>
      );
    }
    return (
      <span className="rounded bg-panel-alt px-2 py-0.5 text-xs text-text-secondary">
        {outcome}
      </span>
    );
  }
  if (typeof outcome !== "object") {
    return <span className="text-xs text-text-meta">—</span>;
  }
  const obj = outcome as Record<string, unknown>;
  if ("Failed" in obj) {
    const failed = obj.Failed as { reason?: string } | undefined;
    return (
      <span
        className="rounded bg-danger-soft px-2 py-0.5 text-xs text-danger"
        title={failed?.reason}
      >
        failed
      </span>
    );
  }
  return (
    <span className="rounded bg-panel-alt px-2 py-0.5 text-xs text-text-secondary">
      {JSON.stringify(outcome).slice(0, 32)}
    </span>
  );
}

function DiagnosticRow({ diag }: { diag: PluginDiagnostic }) {
  const level = (diag.level ?? "Info").toString();
  const tone =
    level.toLowerCase() === "error"
      ? "text-danger"
      : level.toLowerCase() === "warn"
        ? "text-warning"
        : "text-text-secondary";
  return (
    <li className="px-4 py-2 text-xs">
      <div className={`flex items-center gap-2 ${tone}`}>
        <span className="font-mono uppercase">{level}</span>
        {typeof diag.path === "string" && diag.path.length > 0 && (
          <span className="font-mono text-text-meta">{diag.path}</span>
        )}
      </div>
      {typeof diag.message === "string" && (
        <p className="mt-0.5 text-text-primary">{diag.message}</p>
      )}
    </li>
  );
}
