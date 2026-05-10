// Phase 90.x.memory-snapshot.create-restore — readonly preview
// rendering of a `RestoreReport` returned by dry_run or the
// destructive apply.

import type { RestoreReport } from "../../api/memory";
import { useT } from "../../i18n";

interface Props {
  report: RestoreReport;
}

export default function RestoreReportTable({ report }: Props) {
  const t = useT();
  return (
    <div className="rounded border bg-surface p-3">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-meta">
        {report.dry_run
          ? t("memory.snapshots.restore.report_title_preview")
          : t("memory.snapshots.restore.report_title_applied")}
      </h3>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-text-meta">
            {t("memory.snapshots.restore.field.from_snapshot_id")}
          </dt>
          <dd className="font-mono text-text-primary">
            {report.from_snapshot_id}
          </dd>
        </div>
        <div>
          <dt className="text-text-meta">
            {t("memory.snapshots.restore.field.workers_restarted")}
          </dt>
          <dd className="text-text-primary">
            {report.workers_restarted ? "yes" : "no"}
          </dd>
        </div>
        {report.pre_snapshot_id && (
          <div>
            <dt className="text-text-meta">
              {t("memory.snapshots.restore.field.pre_snapshot_id")}
            </dt>
            <dd className="font-mono text-text-primary">
              {report.pre_snapshot_id}
            </dd>
          </div>
        )}
        {report.git_reset_oid && (
          <div>
            <dt className="text-text-meta">
              {t("memory.snapshots.restore.field.git_reset_oid")}
            </dt>
            <dd className="font-mono text-text-primary">
              {report.git_reset_oid.slice(0, 12)}
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-3">
        <h4 className="mb-1 text-xs uppercase tracking-wide text-text-meta">
          {t("memory.snapshots.restore.field.sqlite_restored_dbs")} (
          {report.sqlite_restored_dbs.length})
        </h4>
        <ul className="ml-4 list-disc text-xs text-text-primary">
          {report.sqlite_restored_dbs.length === 0 ? (
            <li className="text-text-meta">—</li>
          ) : (
            report.sqlite_restored_dbs.map((db) => (
              <li key={db} className="font-mono">
                {db}
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="mt-3">
        <h4 className="mb-1 text-xs uppercase tracking-wide text-text-meta">
          {t("memory.snapshots.restore.field.state_files_restored")} (
          {report.state_files_restored.length})
        </h4>
        <ul className="ml-4 list-disc text-xs text-text-primary">
          {report.state_files_restored.length === 0 ? (
            <li className="text-text-meta">—</li>
          ) : (
            report.state_files_restored.map((f) => (
              <li key={f} className="font-mono">
                {f}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
