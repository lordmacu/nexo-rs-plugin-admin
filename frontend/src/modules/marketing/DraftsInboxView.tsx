// Drafts inbox queue at `/m/marketing/drafts`. Lists every
// pending draft across every lead so the operator can
// triage in batch instead of clicking through each lead
// drawer. Each row renders compact context (lead subject +
// person + seller + draft body preview) with inline
// approve / reject buttons + a "Ir al lead" deep link.
//
// Bulk mode: selection checkboxes per row + a header bar
// that surfaces "Aprobar N" / "Descartar N" once at least
// one row is checked. Approve fires sequential calls + a
// confirm dialog (each approve is a real outbound).
// Failures aggregate into a final summary so a
// compliance-blocked draft mid-batch doesn't abort the
// rest.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ExternalLink,
  FileEdit,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";

import {
  approveDraft,
  listDraftsInbox,
  rejectDraft,
  type PendingDraftRow,
} from "../../api/marketing";
import { HttpError } from "../../api/client";
import { Button, Checkbox } from "../../components/ui";
import { useT, t as tStatic } from "../../i18n";

/** Stable per-row dedup key — same draft re-rendered after
 *  refetch keeps its local error/busy state via React's
 *  reconciler. */
function rowKey(r: PendingDraftRow): string {
  return `${r.lead_id}:${r.message_id}`;
}

function errorCode(e: unknown): string {
  if (e instanceof HttpError) {
    const body = e.body as { code?: string } | string;
    if (typeof body === "object" && body && "code" in body) {
      return body.code ?? `http_${e.status}`;
    }
    return `http_${e.status}`;
  }
  return e instanceof Error ? e.message : String(e);
}

interface BulkSummary {
  succeeded: number;
  failed: { key: string; code: string }[];
}

/** Pure filter — rows whose seller / state match the
 *  active chips. `null` ⇒ no filter on that axis.
 *  Exported for unit testing. */
export function filterRows(
  rows: readonly PendingDraftRow[],
  filter: { seller: string | null; state: string | null },
): PendingDraftRow[] {
  return rows.filter((r) => {
    if (filter.seller && r.lead_seller_id !== filter.seller) return false;
    if (filter.state && r.lead_state !== filter.state) return false;
    return true;
  });
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

export default function DraftsInboxView() {
  const t = useT();
  const [rows, setRows] = useState<readonly PendingDraftRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<"approve" | "reject" | null>(null);
  const [bulkSummary, setBulkSummary] = useState<BulkSummary | null>(null);
  const [sellerFilter, setSellerFilter] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    listDraftsInbox({ limit: 200 })
      .then((r) => {
        if (cancelled) return;
        setRows(r.drafts);
        // Drop selections that no longer exist post-refetch.
        const present = new Set(r.drafts.map(rowKey));
        setSelected((prev) => {
          const next = new Set<string>();
          prev.forEach((k) => {
            if (present.has(k)) next.add(k);
          });
          return next;
        });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(errorCode(e));
          setRows(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const refresh = () => setRefreshTick((t) => t + 1);

  // Apply the active filter chips before any selection /
  // bulk surface kicks in. Filter axes derive from the
  // raw rows so chips disappear when the only seller in
  // their bucket gets approved out of the inbox.
  const filteredRows = useMemo(
    () =>
      filterRows(rows ?? [], {
        seller: sellerFilter,
        state: stateFilter,
      }),
    [rows, sellerFilter, stateFilter],
  );
  const sellers = useMemo(
    () => uniqueSorted((rows ?? []).map((r) => r.lead_seller_id)),
    [rows],
  );
  const states = useMemo(
    () => uniqueSorted((rows ?? []).map((r) => r.lead_state)),
    [rows],
  );

  const visibleKeys = useMemo(
    () => new Set(filteredRows.map(rowKey)),
    [filteredRows],
  );
  // "All selected" tracks the visible (filtered) set so
  // toggling chips doesn't flip the master checkbox into
  // a misleading state.
  const visibleSelectedCount = filteredRows.filter((r) =>
    selected.has(rowKey(r)),
  ).length;
  const allSelected =
    filteredRows.length > 0 && visibleSelectedCount === filteredRows.length;

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // select-all only flips the visible (filtered) rows;
  // selections of rows hidden by the active filter stay
  // intact so the operator can layer filters without
  // losing context.
  const selectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visibleKeys.forEach((k) => next.add(k));
      return next;
    });
  const clearSelection = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      visibleKeys.forEach((k) => next.delete(k));
      return next;
    });

  const runBulk = async (kind: "approve" | "reject") => {
    // Bulk only operates on visible+selected rows so a
    // hidden selection (filtered out) doesn't get
    // accidentally fired.
    const targets = filteredRows.filter((r) => selected.has(rowKey(r)));
    if (targets.length === 0) return;
    if (kind === "approve") {
      const ok = window.confirm(
        tStatic("marketing.drafts_inbox.confirm_bulk_approve", {
          count: targets.length,
        }),
      );
      if (!ok) return;
    }
    setBulkBusy(kind);
    setBulkSummary(null);
    setError(null);
    let succeeded = 0;
    const failed: BulkSummary["failed"] = [];
    for (const row of targets) {
      try {
        if (kind === "approve") {
          await approveDraft(row.lead_id, row.message_id);
        } else {
          await rejectDraft(row.lead_id, row.message_id);
        }
        succeeded += 1;
      } catch (e: unknown) {
        failed.push({ key: rowKey(row), code: errorCode(e) });
      }
    }
    setBulkBusy(null);
    setBulkSummary({ succeeded, failed });
    refresh();
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <FileEdit size={16} className="text-amber-600" />
            {t("marketing.drafts_inbox.title")}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {rows === null
              ? t("marketing.drafts_inbox.loading")
              : rows.length === 0
                ? t("marketing.drafts_inbox.empty_short")
                : rows.length === 1
                  ? t("marketing.drafts_inbox.count_singular", {
                      count: rows.length,
                    })
                  : t("marketing.drafts_inbox.count_plural", {
                      count: rows.length,
                    })}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={refresh}>
          <RefreshCw size={11} />
          {t("marketing.drafts_inbox.refresh")}
        </Button>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          {t("marketing.drafts_inbox.unavailable", { error })}
        </div>
      )}

      {bulkSummary && (
        <div
          role="status"
          data-testid="drafts-bulk-summary"
          className={`rounded-md px-3 py-2 text-[11px] ring-1 ${
            bulkSummary.failed.length === 0
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-800 ring-amber-200"
          }`}
        >
          <span className="font-semibold">
            {t("marketing.drafts_inbox.bulk_ok", { count: bulkSummary.succeeded })}
          </span>
          {bulkSummary.failed.length > 0 && (
            <>
              {" · "}
              <span className="font-semibold">
                {t("marketing.drafts_inbox.bulk_failed", {
                  count: bulkSummary.failed.length,
                })}
              </span>
              <ul className="mt-1 ml-4 list-disc">
                {bulkSummary.failed.map((f) => (
                  <li key={f.key}>
                    <span className="font-mono text-[10px]">{f.key}</span>
                    {" · "}
                    {f.code}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {rows && rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-emerald-200 bg-emerald-50/50 px-6 py-10 text-center text-xs text-emerald-700">
          {t("marketing.drafts_inbox.empty_done")}
        </div>
      )}

      {rows && rows.length > 0 && (
        <>
          {(sellers.length > 1 || states.length > 1) && (
            <div
              data-testid="drafts-filter-bar"
              className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px]"
            >
              <Filter size={11} className="text-slate-400" />
              {sellers.length > 1 && (
                <FilterChips
                  axisLabel={t("marketing.drafts_inbox.filter_seller")}
                  values={sellers}
                  active={sellerFilter}
                  onChange={setSellerFilter}
                />
              )}
              {states.length > 1 && (
                <FilterChips
                  axisLabel={t("marketing.drafts_inbox.filter_state")}
                  values={states}
                  active={stateFilter}
                  onChange={setStateFilter}
                />
              )}
              {(sellerFilter !== null || stateFilter !== null) && (
                <span className="ml-auto text-[10px] text-slate-500">
                  {t("marketing.drafts_inbox.visible_count", {
                    visible: filteredRows.length,
                    total: rows.length,
                  })}
                </span>
              )}
            </div>
          )}

          <div
            data-testid="drafts-bulk-bar"
            className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px]"
          >
            <Checkbox
              aria-label="select-all"
              checked={allSelected}
              onChange={() => (allSelected ? clearSelection() : selectAll())}
              className="h-3.5 w-3.5"
            />
            <span className="text-slate-500">
              {visibleSelectedCount === 0
                ? t("marketing.drafts_inbox.selection_empty")
                : visibleSelectedCount === 1
                  ? t("marketing.drafts_inbox.selection_singular", {
                      count: visibleSelectedCount,
                    })
                  : t("marketing.drafts_inbox.selection_plural", {
                      count: visibleSelectedCount,
                    })}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => runBulk("approve")}
              disabled={visibleSelectedCount === 0 || bulkBusy !== null}
              aria-label="bulk-approve"
            >
              <Check size={11} />
              {bulkBusy === "approve"
                ? t("marketing.drafts_inbox.bulk_approve_busy", {
                    count: visibleSelectedCount,
                  })
                : t("marketing.drafts_inbox.bulk_approve_label", {
                    count: visibleSelectedCount,
                  })}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => runBulk("reject")}
              disabled={visibleSelectedCount === 0 || bulkBusy !== null}
              aria-label="bulk-reject"
            >
              <X size={11} />
              {t("marketing.drafts_inbox.bulk_reject_label", {
                count: visibleSelectedCount,
              })}
            </Button>
          </div>

          {filteredRows.length === 0 && (
            <p className="rounded border border-dashed border-slate-200 bg-white px-3 py-2 text-[11px] italic text-slate-500">
              {t("marketing.drafts_inbox.no_match")}
            </p>
          )}
          <ul data-testid="drafts-inbox-list" className="space-y-2">
            {filteredRows.map((row) => {
              const key = rowKey(row);
              return (
                <DraftRow
                  key={key}
                  row={row}
                  onMutated={refresh}
                  selected={selected.has(key)}
                  onToggleSelect={() => toggle(key)}
                />
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function DraftRow({
  row,
  onMutated,
  selected,
  onToggleSelect,
}: {
  row: PendingDraftRow;
  onMutated: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onApprove = async () => {
    setBusy("approve");
    setError(null);
    try {
      await approveDraft(row.lead_id, row.message_id);
      onMutated();
    } catch (e: unknown) {
      setError(errorCode(e));
    } finally {
      setBusy(null);
    }
  };

  const onReject = async () => {
    setBusy("reject");
    setError(null);
    try {
      await rejectDraft(row.lead_id, row.message_id);
      onMutated();
    } catch (e: unknown) {
      setError(errorCode(e));
    } finally {
      setBusy(null);
    }
  };

  const isBusy = busy !== null;

  return (
    <li
      className={`rounded-lg border bg-white p-3 shadow-sm ${
        selected
          ? "border-indigo-300 ring-1 ring-indigo-200"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] text-slate-500">
        <Checkbox
          aria-label={`select-${rowKey(row)}`}
          checked={selected}
          onChange={onToggleSelect}
          className="h-3.5 w-3.5"
        />
        <span className="font-semibold text-slate-700">{row.lead_subject}</span>
        <span>·</span>
        <span>{row.lead_person_id}</span>
        <span>·</span>
        <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-indigo-200">
          {row.lead_seller_id}
        </span>
        <span className="rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200">
          {row.lead_state.replace("_", " ")}
        </span>
        <span className="ml-auto text-[10px] text-slate-400">
          {new Date(row.at_ms).toLocaleString()}
        </span>
      </div>

      <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
        {row.body}
      </p>

      {error && (
        <div
          role="alert"
          className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700"
        >
          {error}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={onApprove}
          disabled={isBusy}
        >
          <Check size={11} />
          {busy === "approve"
            ? t("marketing.drafts_inbox.row_sending")
            : t("marketing.drafts_inbox.row_approve")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onReject}
          disabled={isBusy}
        >
          <X size={11} />
          {busy === "reject"
            ? t("marketing.drafts_inbox.row_discarding")
            : t("marketing.drafts_inbox.row_discard")}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/m/marketing/leads/${row.lead_id}`)}
        >
          <ExternalLink size={11} />
          {t("marketing.drafts_inbox.row_go_to_lead")}
          <ArrowRight size={11} />
        </Button>
      </div>
    </li>
  );
}

/** Inline pill-style filter chips. Click an active chip
 *  to clear the axis. Stays compact even when the row
 *  carries many distinct sellers / states. */
function FilterChips({
  axisLabel,
  values,
  active,
  onChange,
}: {
  axisLabel: string;
  values: readonly string[];
  active: string | null;
  onChange: (next: string | null) => void;
}) {
  return (
    <span className="flex flex-wrap items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-slate-400">
        {axisLabel}
      </span>
      {values.map((v) => {
        const isActive = active === v;
        return (
          <Button
            variant="primary"
            size="sm"
            key={v}
            onClick={() => onChange(isActive ? null : v)}
            aria-label={`filter-${axisLabel.toLowerCase()}-${v}`}
            aria-pressed={isActive}
          >
            {v.replace("_", " ")}
          </Button>
        );
      })}
    </span>
  );
}
