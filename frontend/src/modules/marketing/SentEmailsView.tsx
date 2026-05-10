// Gmail-style "Sent" view — every outbound the tenant has
// published, filterable by seller / recipient / date / text.
// Click a row → jumps to the lead drawer where the full
// thread + the freshly-sent message lives.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { HttpError } from "../../api/client";
import { getSellers, type ConfigSeller } from "../../api/marketing";
import {
  listSentEmails,
  type SentEmailRow,
} from "../../api/sentEmails";
import { Button, Input, Select } from "../../components/ui";
import { useT } from "../../i18n";

const PAGE_LIMIT = 50;

export default function SentEmailsView() {
  const t = useT();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SentEmailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters.
  const [sellers, setSellers] = useState<readonly ConfigSeller[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [sinceDate, setSinceDate] = useState(""); // yyyy-mm-dd
  const [untilDate, setUntilDate] = useState("");

  // Debounce search by 250 ms so a fast typist doesn't
  // hammer the endpoint on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setQDebounced(q.trim()), 250);
    return () => window.clearTimeout(id);
  }, [q]);

  // Reset offset when any filter changes — otherwise the
  // operator could land mid-pagination on a stale window.
  useEffect(() => {
    setOffset(0);
  }, [sellerId, qDebounced, sinceDate, untilDate]);

  // Load sellers once for the filter dropdown.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await getSellers();
        if (!cancelled) setSellers(r.sellers);
      } catch {
        // Non-fatal — filter just shows "all".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter → query effect.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const since_ms = sinceDate
          ? new Date(`${sinceDate}T00:00:00`).getTime()
          : undefined;
        // Until is inclusive end-of-day so a single-day filter
        // (since=until=today) matches all of today's rows.
        const until_ms = untilDate
          ? new Date(`${untilDate}T23:59:59.999`).getTime()
          : undefined;
        const r = await listSentEmails({
          ...(sellerId ? { seller_id: sellerId } : {}),
          ...(qDebounced ? { q: qDebounced } : {}),
          ...(since_ms !== undefined ? { since_ms } : {}),
          ...(until_ms !== undefined ? { until_ms } : {}),
          limit: PAGE_LIMIT,
          offset,
        });
        if (cancelled) return;
        setRows(r.sent);
        setTotal(r.total);
      } catch (e) {
        if (!cancelled) setError(formatErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId, qDebounced, sinceDate, untilDate, offset]);

  const sellerNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of sellers) m[s.id] = s.name;
    return m;
  }, [sellers]);

  const hasFilters = sellerId || qDebounced || sinceDate || untilDate;
  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + rows.length, total);

  return (
    <div className="space-y-3 p-3">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold">
          {t("marketing.sent.title")}
        </h1>
        <p className="text-xs text-text-secondary">
          {t("marketing.sent.subtitle")}
        </p>
      </header>

      {/* Filter bar — stacks on mobile, inline on desktop. */}
      <div className="grid grid-cols-1 gap-2 rounded border bg-panel p-3 sm:grid-cols-4">
        <label className="text-xs">
          <span className="block text-text-secondary">
            {t("marketing.sent.filter.seller")}
          </span>
          <Select
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
          >
            <option value="">{t("marketing.sent.filter.all_sellers")}</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </label>
        <label className="text-xs">
          <span className="block text-text-secondary">
            {t("marketing.sent.filter.from_date")}
          </span>
          <Input
            type="date"
            value={sinceDate}
            onChange={(e) => setSinceDate(e.target.value)}
          />
        </label>
        <label className="text-xs">
          <span className="block text-text-secondary">
            {t("marketing.sent.filter.to_date")}
          </span>
          <Input
            type="date"
            value={untilDate}
            onChange={(e) => setUntilDate(e.target.value)}
          />
        </label>
        <label className="text-xs">
          <span className="block text-text-secondary">
            {t("marketing.sent.filter.search")}
          </span>
          <div className="relative">
            <Search
              size={12}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("marketing.sent.filter.search_placeholder")}
              className="pl-7"
            />
          </div>
        </label>
      </div>

      {error && (
        <div className="rounded border border-danger bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Table — wraps in overflow-x-auto for narrow phones. */}
      <div className="overflow-x-auto rounded border bg-panel">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-panel-alt text-xs text-text-secondary">
            <tr>
              <th className="px-3 py-2 text-left">{t("marketing.sent.col.date")}</th>
              <th className="px-3 py-2 text-left">{t("marketing.sent.col.recipient")}</th>
              <th className="px-3 py-2 text-left">{t("marketing.sent.col.subject")}</th>
              <th className="px-3 py-2 text-left">{t("marketing.sent.col.seller")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-xs italic text-text-tertiary">
                  {t("marketing.sent.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-xs italic text-text-tertiary">
                  {hasFilters
                    ? t("marketing.sent.no_match")
                    : t("marketing.sent.empty")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={`${r.lead_id}:${r.message_id}`}
                  className="cursor-pointer border-t hover:bg-panel-hover"
                  onClick={() => navigate(`/m/marketing/leads/${r.lead_id}`)}
                >
                  <td className="px-3 py-2 text-xs text-text-secondary">
                    {formatDate(r.at_ms)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm">{r.recipient_name ?? r.recipient_email ?? r.person_id}</div>
                    {r.recipient_email && r.recipient_name && (
                      <div className="text-[11px] text-text-tertiary">
                        {r.recipient_email}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm">{r.subject || "(sin asunto)"}</div>
                    {r.preview && (
                      <div className="text-[11px] text-text-tertiary truncate max-w-[400px]">
                        {r.preview}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-text-secondary">
                    {sellerNameById[r.seller_id] ?? r.seller_id}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — only show when worth it. */}
      {total > PAGE_LIMIT && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-text-secondary">
            {t("marketing.sent.range", {
              start: String(pageStart),
              end: String(pageEnd),
              total: String(total),
            })}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
            >
              {t("marketing.sent.prev")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={offset + rows.length >= total || loading}
              onClick={() => setOffset(offset + PAGE_LIMIT)}
            >
              {t("marketing.sent.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  // Local YYYY-MM-DD HH:mm — same shape as the rest of the
  // marketing tables.
  return d.toLocaleString();
}

function formatErr(e: unknown): string {
  if (e instanceof HttpError) {
    const body = e.body as { code?: string; message?: string } | undefined;
    return body?.message ?? body?.code ?? `HTTP ${e.status}`;
  }
  return String(e);
}
