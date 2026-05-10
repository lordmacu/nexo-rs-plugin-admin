// M15.24 — telemetry dashboard at `/m/marketing/health`.
//
// Renders a single GET `/api/marketing/telemetry` snapshot
// in a card grid: leads-by-state pills, drafts-pending
// headline, inbound / outbound counts over a configurable
// window. Operator picks the window via a select that
// re-fires the GET; counts auto-refresh every 30 seconds
// while the tab is open so the operator doesn't have to
// reload to see fresh numbers.

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  FileEdit,
  Inbox,
  RefreshCw,
} from "lucide-react";

import { getTelemetry, type MarketingTelemetry } from "../../api/marketing";
import { Button, Select } from "../../components/ui";
import { useT } from "../../i18n";
import type { CatalogKey } from "../../i18n";

const WINDOW_OPTIONS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "1h", value: 1 },
  { label: "24h", value: 24 },
  { label: "7d", value: 24 * 7 },
  { label: "30d", value: 24 * 30 },
];

const STATE_TONE: Record<keyof MarketingTelemetry["leads_by_state"], string> = {
  cold: "bg-slate-50 text-slate-700 ring-slate-200",
  engaged: "bg-sky-50 text-sky-700 ring-sky-200",
  meeting_scheduled: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  qualified: "bg-violet-50 text-violet-700 ring-violet-200",
  lost: "bg-rose-50 text-rose-700 ring-rose-200",
};

const STATE_LABEL_KEY: Record<
  keyof MarketingTelemetry["leads_by_state"],
  CatalogKey
> = {
  cold: "marketing.health.state.cold",
  engaged: "marketing.health.state.engaged",
  meeting_scheduled: "marketing.health.state.meeting_scheduled",
  qualified: "marketing.health.state.qualified",
  lost: "marketing.health.state.lost",
};

export default function HealthView() {
  const t = useT();
  const [data, setData] = useState<MarketingTelemetry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [windowHours, setWindowHours] = useState(24);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getTelemetry({ window_hours: windowHours })
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [windowHours, refreshTick]);

  // Auto-refresh every 30 s. Cheap GET, single query.
  useEffect(() => {
    const id = setInterval(() => setRefreshTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Activity size={16} className="text-indigo-600" />
            {t("marketing.health.title")}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {t("marketing.health.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="window-select"
            className="flex items-center gap-1.5 text-[11px] text-slate-500"
          >
            <Clock size={11} />
            {t("marketing.health.window_label")}
          </label>
          <Select
            id="window-select"
            value={windowHours}
            onChange={(e) => setWindowHours(Number(e.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
          >
            {WINDOW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefreshTick((tick) => tick + 1)}
          >
            <RefreshCw size={11} />
            {t("marketing.health.refresh")}
          </Button>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          {t("marketing.health.unavailable", { error })}
        </div>
      )}

      {!data && !error && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-xs text-slate-400">
          {t("marketing.health.loading_snapshot")}
        </div>
      )}

      {data && (
        <>
          <section
            data-testid="leads-by-state-grid"
            className="grid grid-cols-2 gap-2 sm:grid-cols-5"
          >
            {(
              Object.keys(data.leads_by_state) as Array<
                keyof MarketingTelemetry["leads_by_state"]
              >
            ).map((k) => (
              <div
                key={k}
                className={`rounded-lg px-3 py-2 ring-1 ${STATE_TONE[k]}`}
              >
                <p className="text-[10px] uppercase tracking-wider opacity-70">
                  {t(STATE_LABEL_KEY[k])}
                </p>
                <p className="mt-0.5 text-2xl font-semibold">
                  {data.leads_by_state[k]}
                </p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Headline
              icon={<FileEdit size={14} />}
              tone="from-amber-50 to-amber-100 ring-amber-200 text-amber-900"
              label={t("marketing.health.headline.drafts_pending")}
              value={data.drafts_pending}
              hint={t("marketing.health.headline.drafts_pending_hint")}
            />
            <Headline
              icon={<ArrowDownToLine size={14} />}
              tone="from-sky-50 to-sky-100 ring-sky-200 text-sky-900"
              label={t("marketing.health.headline.inbound")}
              value={data.inbound_messages}
              hint={t("marketing.health.headline.last_window_hours", {
                hours: data.window_hours,
              })}
            />
            <Headline
              icon={<ArrowUpFromLine size={14} />}
              tone="from-emerald-50 to-emerald-100 ring-emerald-200 text-emerald-900"
              label={t("marketing.health.headline.outbound")}
              value={data.outbound_messages}
              hint={t("marketing.health.headline.last_window_hours", {
                hours: data.window_hours,
              })}
            />
          </section>

          <footer className="mt-auto flex items-center gap-1.5 text-[10px] text-slate-400">
            <Inbox size={10} />
            {t("marketing.health.tenant_footer", {
              tenant: data.tenant_id,
              since: new Date(data.since_ms).toLocaleString(),
            })}
          </footer>
        </>
      )}
    </div>
  );
}

function Headline({
  icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-br p-3 ring-1 shadow-sm ${tone}`}
    >
      <div className="flex items-center justify-between text-[11px] font-medium opacity-80">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        {hint && <span className="opacity-60">{hint}</span>}
      </div>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
