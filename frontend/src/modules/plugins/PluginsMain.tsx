// Phase 90.x.plugins — plugins module main panel.
// LIVE in Phase 90.x.plugins (was placeholder in 90.3.18).
//
// Renders 4 sections from the daemon's PluginDiscoveryReport:
//   - Summary tiles (loaded / scanned / invalid / disabled)
//   - Loaded plugins list (one per id)
//   - Init outcomes (per-plugin spawn status)
//   - Diagnostics (Warn/Error from discovery + capability aggregation)

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";

import { usePluginsDoctor } from "../../store/plugins";
import type { PluginDiagnostic } from "../../api/plugin_doctor";
import { useT } from "../../i18n";
import RestartPluginModal from "./RestartPluginModal";

export default function PluginsMain() {
  const t = useT();
  const {
    data,
    isLoading,
    error,
    reload,
    // Phase 90 audit fix — surface the last restart report inline
    // so the operator sees previous_uptime_ms + new_pid +
    // restarted_at without dropping to firehose / journal logs.
    lastRestartReport,
    clearLastRestartReport,
  } = usePluginsDoctor();
  const [restartTarget, setRestartTarget] = useState<string | null>(null);

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
  // Phase 90 audit fix — surface the 5/9 PluginDiscoveryReport
  // fields the prior UI ignored. Operators previously had to
  // drop to `agent doctor plugins --json` for these.
  const duplicates = report.duplicates ?? 0;
  const contributedAgents = report.contributed_agents_per_plugin ?? {};
  const contributedSkills = report.contributed_skills_per_plugin ?? {};
  const capabilityGates = report.plugin_capability_gates ?? {};
  const unmetRequired = (report.unmet_required_capabilities ?? []) as unknown[];

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

      {/* Phase 90 audit fix — lastRestartReport banner. Operator
          sees previous_uptime_ms + new_pid + restarted_at after a
          successful restart without scraping logs. Dismissible. */}
      {lastRestartReport !== null && (
        <div className="flex items-center justify-between gap-3 border-b border-success/40 bg-success-soft px-6 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-success">
            <span className="font-medium">
              {t("plugins.restart.report.banner", {
                plugin_id: lastRestartReport.plugin_id,
              })}
            </span>
            <span className="text-text-secondary">
              {t("plugins.restart.report.previous_uptime", {
                ms: lastRestartReport.previous_uptime_ms.toLocaleString(),
              })}
            </span>
            {lastRestartReport.new_pid !== undefined &&
              lastRestartReport.new_pid !== null && (
                <span className="text-text-secondary">
                  {t("plugins.restart.report.new_pid", {
                    pid: lastRestartReport.new_pid,
                  })}
                </span>
              )}
            <span className="text-text-meta">
              {t("plugins.restart.report.restarted_at", {
                ts: new Date(
                  lastRestartReport.restarted_at_ms,
                ).toLocaleTimeString(),
              })}
            </span>
          </div>
          <button
            type="button"
            className="rounded p-1 text-success hover:bg-success/20"
            onClick={() => clearLastRestartReport()}
            aria-label={t("plugins.restart.report.dismiss")}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary tiles. Phase 90 audit fix — added duplicates
            tile so the 5th doctor field surfaces inline. */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
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
          <SummaryTile
            label={t("plugins.summary.duplicates")}
            value={duplicates}
            tone={duplicates > 0 ? "danger" : "default"}
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
                  className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-text-primary">
                    {id}
                  </span>
                  <div className="flex items-center gap-2">
                    <InitOutcomeBadge outcome={initOutcomes[id]} />
                    <button
                      type="button"
                      className="rounded p-1 text-text-meta hover:bg-warning-soft hover:text-warning"
                      onClick={() => setRestartTarget(id)}
                      title={t("plugins.restart.action")}
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
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

        {/* Phase 90 audit fix — Unmet required capabilities. The
            daemon's discovery walker flags every (microapp,
            capability) pair where the manifest declares a
            required capability that the operator never granted.
            Plugins surface as `Failed { reason }` in init
            outcomes; this list shows the why up front. */}
        {unmetRequired.length > 0 && (
          <section className="rounded-lg border border-danger/40 bg-danger-soft">
            <header className="flex items-center gap-2 border-b border-danger/20 px-4 py-2 text-sm font-bold text-danger">
              <AlertTriangle size={14} />
              {t("plugins.unmet_required.title")} ({unmetRequired.length})
            </header>
            <ul className="divide-y divide-danger/20">
              {unmetRequired.map((entry, idx) => (
                <li key={idx} className="px-4 py-2 text-xs">
                  <pre className="whitespace-pre-wrap break-all text-danger">
                    {typeof entry === "string"
                      ? entry
                      : JSON.stringify(entry, null, 2)}
                  </pre>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Phase 90 audit fix — Per-plugin contributions
            (agents.yaml entries + skill files). Operators see
            what ships from each plugin without reading the
            agents.yaml manifest by hand. */}
        {(Object.keys(contributedAgents).length > 0 ||
          Object.keys(contributedSkills).length > 0) && (
          <section className="rounded-lg border bg-panel">
            <header className="flex items-center gap-2 border-b px-4 py-2 text-sm font-bold text-text-primary">
              {t("plugins.contributions.title")}
            </header>
            <div className="grid grid-cols-1 gap-3 px-4 py-3 text-xs md:grid-cols-2">
              <div>
                <div className="mb-1 text-text-meta uppercase tracking-wide">
                  {t("plugins.contributions.agents")}
                </div>
                {Object.keys(contributedAgents).length === 0 ? (
                  <div className="text-text-secondary">
                    {t("plugins.contributions.empty")}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {Object.entries(contributedAgents).map(([plugin, ids]) => (
                      <li key={plugin}>
                        <span className="font-mono text-text-primary">
                          {plugin}
                        </span>{" "}
                        <span className="text-text-secondary">
                          {ids.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-1 text-text-meta uppercase tracking-wide">
                  {t("plugins.contributions.skills")}
                </div>
                {Object.keys(contributedSkills).length === 0 ? (
                  <div className="text-text-secondary">
                    {t("plugins.contributions.empty")}
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {Object.entries(contributedSkills).map(([plugin, ids]) => (
                      <li key={plugin}>
                        <span className="font-mono text-text-primary">
                          {plugin}
                        </span>{" "}
                        <span className="text-text-secondary">
                          {ids.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Phase 90 audit fix — Plugin capability gates declared
            in the manifest. Each entry exposes the env-var name
            the operator can flip to disable the capability. The
            payload shape is plugin-defined (open object); we
            render it as JSON so the operator sees the full
            contract without dropping to the CLI. */}
        {Object.keys(capabilityGates).length > 0 && (
          <section className="rounded-lg border bg-panel">
            <header className="flex items-center gap-2 border-b px-4 py-2 text-sm font-bold text-text-primary">
              {t("plugins.capability_gates.title")} (
              {Object.keys(capabilityGates).length})
            </header>
            <ul className="divide-y">
              {Object.entries(capabilityGates).map(([plugin, gate]) => (
                <li key={plugin} className="px-4 py-2 text-xs">
                  <div className="mb-1 font-mono text-text-primary">{plugin}</div>
                  <pre className="whitespace-pre-wrap break-all text-text-secondary">
                    {JSON.stringify(gate, null, 2)}
                  </pre>
                </li>
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
