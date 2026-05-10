// Sidebar for the marketing module — filters + lead list.

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  FileEdit,
  Filter,
  Inbox as InboxIcon,
  Mail,
  RefreshCw,
  Search,
  Send,
  Settings as SettingsIcon,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useUrlState } from "../../shell/useUrlState";
import { useMarketingConfig } from "../../store/marketingConfig";
import { useMarketingLeads } from "../../store/marketingLeads";
import { useMarketingPersons } from "../../store/marketingPersons";
import {
  colorForId,
  initialsFor,
  personDisplayName,
  sellerDisplayName,
} from "./data/liveAdapters";
import { formatRelative } from "./data/formatters";
import type { LeadState } from "./data/types";
import MarketingPauseBanner from "./MarketingPauseBanner";
import {
  Button,
  ModuleHeader,
  SearchInput,
  Select,
  StatusDot,
} from "../../components/ui";
import { useT } from "../../i18n";

const STATE_BADGE: Record<LeadState, { label: string; tone: string }> = {
  cold: {
    label: "cold",
    tone: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  },
  engaged: {
    label: "engaged",
    tone: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  },
  meeting_scheduled: {
    label: "meeting",
    tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  },
  qualified: {
    label: "qualified",
    tone: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  },
  lost: {
    label: "lost",
    tone: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  },
};

function scoreColor(s: number): string {
  if (s >= 70) return "text-emerald-600";
  if (s >= 40) return "text-amber-600";
  return "text-slate-400";
}

export default function MarketingSidebar() {
  const navigate = useNavigate();
  const t = useT();
  // Active-lead highlight: the leads route is
  // `/m/marketing/leads/:lead_id`. When the operator opens a
  // lead drawer the matching row gets a left border + tinted
  // bg so they don't lose context in a long inbox.
  const { lead_id: activeLeadId } = useParams<{ lead_id: string }>();
  // URL-mirrored filters → deep-linkable + survive refresh.
  // 'q' / 'state' / 'vendor' / 'mb' kept short so the URL
  // doesn't bloat for daily use.
  const [query, setQuery] = useUrlState<string>("marketing.q", "");
  const [stateFilter, setStateFilter] = useUrlState<LeadState | "all">(
    "marketing.state",
    "all",
  );
  const [sellerFilter, setSellerFilter] = useUrlState<string>(
    "marketing.vendor",
    "all",
  );
  const [mailboxFilter, setMailboxFilter] = useUrlState<string>(
    "marketing.mb",
    "all",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Compose is a full-page route now (no more popup). The
  // 'Nuevo email' button navigates to /m/marketing/compose
  // directly; SavedDraftsView passes the draft sentinel via
  // sessionStorage and triggers the same nav.

  // Live leads from the marketing extension via the microapp's
  // `/api/marketing/leads` proxy. Falls back to mock data when
  // the extension is unreachable (dev / not-configured) — see
  // `store/marketingLeads.ts` for the source-tracking flag.
  const leads = useMarketingLeads((s) => s.leads);
  const source = useMarketingLeads((s) => s.source);
  const lastSyncedAtMs = useMarketingLeads((s) => s.last_synced_at_ms);
  const fetchLeads = useMarketingLeads((s) => s.fetch);
  const startLive = useMarketingLeads((s) => s.startLive);
  const liveStatus = useMarketingLeads((s) => s.live_status);

  // Live config slices feed the filter dropdowns + lead row
  // renderer. Hydrate-on-mount; fall back to the mock
  // fixtures when the slice is still loading or the
  // extension is offline.
  const sellersSlice = useMarketingConfig((s) => s.sellers);
  const mailboxesSlice = useMarketingConfig((s) => s.mailboxes);
  const fetchAllConfig = useMarketingConfig((s) => s.fetchAll);
  const liveMailboxes =
    mailboxesSlice.source === "api"
      ? mailboxesSlice.data.map((m) => ({
          id: String(m.id),
          address: String(m.address),
        }))
      : [];
  const liveSellers =
    sellersSlice.source === "api"
      ? sellersSlice.data.map((s) => ({
          id: String(s.id),
          name: sellerDisplayName(s),
        }))
      : [];

  // Person cache — `ensure(id)` is idempotent + memoised so
  // repeat renders for the same lead skip the round-trip.
  const personsById = useMarketingPersons((s) => s.byId);
  const ensurePerson = useMarketingPersons((s) => s.ensure);

  useEffect(() => {
    void fetchLeads();
    void fetchAllConfig();
  }, [fetchLeads, fetchAllConfig]);
  // Live SSE subscription mounted alongside the REST seed —
  // the EventSource auto-reconnects on transient drops; we
  // close it on unmount via the returned teardown.
  useEffect(() => {
    return startLive();
  }, [startLive]);
  // Hydrate the person cache for every visible lead so the
  // row renderer can read display names without N round-trips
  // staggered across renders.
  useEffect(() => {
    for (const lead of leads) {
      void ensurePerson(lead.person_id);
    }
  }, [leads, ensurePerson]);

  const filtered = useMemo(() => {
    return [...leads]
      .filter((l) => {
        if (stateFilter !== "all" && l.state !== stateFilter) return false;
        if (sellerFilter !== "all" && l.seller_id !== sellerFilter)
          return false;
        if (query.trim().length > 0) {
          const livePerson = personsById[l.person_id]?.person;
          const name = livePerson?.primary_name ?? "";
          const email = livePerson?.primary_email ?? "";
          const haystack = `${l.subject} ${name} ${email}`.toLowerCase();
          if (!haystack.includes(query.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => b.last_activity_ms - a.last_activity_ms);
  }, [leads, query, stateFilter, sellerFilter, personsById]);

  // Mailbox unread counts ride on the email plugin's broker
  // events, not the marketing extension's mailbox config —
  // we don't have a live aggregate yet, so the counter
  // stays at 0 until that surfaces.
  const totalUnread = 0;
  const activeFilterCount =
    (stateFilter !== "all" ? 1 : 0) +
    (sellerFilter !== "all" ? 1 : 0) +
    (mailboxFilter !== "all" ? 1 : 0);

  // Firehose live indicator — green pulsing dot when the
  // SSE stream is open, amber when lagging, red when down.
  const liveDot =
    liveStatus === "open" ? (
      <StatusDot
        tone="success"
        pulse
        label={t("marketing.sidebar.firehose_live")}
      />
    ) : liveStatus === "lagged" ? (
      <StatusDot
        tone="warning"
        label={t("marketing.sidebar.firehose_lagged")}
      />
    ) : liveStatus === "error" ? (
      <StatusDot
        tone="danger"
        label={t("marketing.sidebar.firehose_disconnected")}
      />
    ) : null;

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-surface to-panel">
      <MarketingPauseBanner />
      <ModuleHeader
        icon={<Mail size={14} />}
        gradient="from-indigo-500 to-violet-600"
        title={t("marketing.sidebar.title")}
        titleTrailing={liveDot}
        subtitle={t("marketing.sidebar.subtitle", {
          leads: filtered.length,
          unread: totalUnread,
        })}
        actions={
          <>
            {/* "Nuevo email" used to live here as a primary
                action; moved down to the Filtros row so the
                header isn't a 6-button traffic jam. The icon
                row stays for navigation-only affordances. */}
            <Button
              variant="ghost"
              size="md"
              aria-label="Drafts inbox"
              onClick={() => navigate("/m/marketing/drafts")}
            >
              <FileEdit size={16} />
            </Button>
            <Button
              variant="ghost"
              size="md"
              aria-label="Saved drafts"
              onClick={() => navigate("/m/marketing/drafts-saved")}
            >
              <InboxIcon size={16} />
            </Button>
            <Button
              variant="ghost"
              size="md"
              aria-label="Sent"
              onClick={() => navigate("/m/marketing/sent")}
            >
              <Send size={16} />
            </Button>
            <Button
              variant="ghost"
              size="md"
              aria-label="Health"
              onClick={() => navigate("/m/marketing/health")}
            >
              <Activity size={16} />
            </Button>
            <Button
              variant="ghost"
              size="md"
              aria-label="Settings"
              onClick={() => navigate("/m/marketing/settings/mailboxes")}
            >
              <SettingsIcon size={16} />
            </Button>
          </>
        }
      />

      {/* Source banner — surfaces when the extension is unreachable
       *  or the tenant's lead store is empty so operators don't
       *  confuse mock data for live data. */}
      {source !== "api" && (
        <div
          className={`mx-4 mt-3 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[10px] ${
            source === "error"
              ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
              : source === "loading"
                ? "bg-slate-50 text-slate-500 ring-1 ring-slate-200"
                : "bg-amber-50 text-amber-800 ring-1 ring-amber-200"
          }`}
        >
          <RefreshCw
            size={11}
            className={source === "loading" ? "animate-spin" : ""}
          />
          <span className="flex-1 truncate">
            {source === "error"
              ? "Extension no disponible — datos demo"
              : source === "loading"
                ? "Sincronizando…"
                : "Datos demo (extension sin leads)"}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchLeads()}
            title={
              lastSyncedAtMs
                ? `Última sync: ${formatRelative(lastSyncedAtMs)}`
                : undefined
            }
          >
            sync
          </Button>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-3">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("marketing.sidebar.search_placeholder")}
          clearable
          onClear={() => setQuery("")}
        />
      </div>

      {/* Filter toggle + primary 'Nuevo email' action. The
          compose button used to sit in the header next to the
          icon row but it crowded the layout — moving it here
          gives it proper breathing room AND keeps the most-
          used action a thumb's reach from the lead list. */}
      <div className="px-4 pt-2">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <span className="flex items-center gap-1.5">
              <Filter size={11} /> Filtros
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] font-semibold text-indigo-700">
                  {activeFilterCount}
                </span>
              )}
            </span>
            <span className="text-slate-400">{filtersOpen ? "▴" : "▾"}</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/m/marketing/compose")}
          >
            {t("marketing.compose.button")}
          </Button>
        </div>

        {filtersOpen && (
          <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <FilterRow label="Mailbox">
              <FilterSelect
                value={mailboxFilter}
                onChange={(v) => setMailboxFilter(v)}
                options={[
                  { v: "all", l: "Todas" },
                  ...liveMailboxes.map((m) => ({ v: m.id, l: m.address })),
                ]}
              />
            </FilterRow>
            <FilterRow label="Estado">
              <FilterSelect
                value={stateFilter}
                onChange={(v) => setStateFilter(v as LeadState | "all")}
                options={[
                  { v: "all", l: "Todos" },
                  { v: "cold", l: "cold" },
                  { v: "engaged", l: "engaged" },
                  { v: "meeting_scheduled", l: "meeting_scheduled" },
                  { v: "qualified", l: "qualified" },
                  { v: "lost", l: "lost" },
                ]}
              />
            </FilterRow>
            <FilterRow label="Seller">
              <FilterSelect
                value={sellerFilter}
                onChange={(v) => setSellerFilter(v)}
                options={[
                  { v: "all", l: "Todos" },
                  ...liveSellers.map((v) => ({ v: v.id, l: v.name })),
                ]}
              />
            </FilterRow>
          </div>
        )}
      </div>

      {/* List */}
      <div className="mt-3 flex-1 overflow-y-auto px-2 pb-3">
        {filtered.length === 0 ? (
          <div className="mt-12 px-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Search size={18} className="text-slate-400" />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {t("marketing.sidebar.no_match")}
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((lead) => {
              const livePerson = personsById[lead.person_id]?.person;
              const personName = livePerson
                ? personDisplayName(livePerson)
                : lead.person_id;
              const personEmail = livePerson?.primary_email ?? "";
              const liveSeller =
                sellersSlice.source === "api"
                  ? sellersSlice.data.find(
                      (s) => String(s.id) === lead.seller_id,
                    )
                  : null;
              const sellerColor = colorForId(lead.seller_id);
              const badge = STATE_BADGE[lead.state];
              const initials = initialsFor(personName);
              const isActive = activeLeadId === lead.id;
              // Inbox-row layout: full-width clickable surface,
              // subtle hover, left accent border on the active
              // row. Avoiding the `Button primary` variant
              // (filled-accent CTA) so the list doesn't read as
              // "every row is a button" — only the row's hover
              // state + the active stripe signal interactivity.
              const rowClass = [
                "block w-full text-left rounded-md px-2.5 py-2",
                "transition-colors",
                isActive
                  ? "bg-violet-50 ring-1 ring-violet-200"
                  : "hover:bg-slate-50",
              ].join(" ");
              return (
                <li key={lead.id}>
                  <Button
                    variant="unstyled"
                    onClick={() => navigate(`/m/marketing/leads/${lead.id}`)}
                    className={rowClass}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <div className="flex w-full items-start gap-2.5">
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm"
                        style={{ backgroundColor: sellerColor }}
                        aria-hidden
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-slate-900">
                            {personName}
                          </span>
                          <span className="shrink-0 text-[10px] text-slate-400">
                            {formatRelative(lead.last_activity_ms)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-slate-600">
                          {lead.subject}
                          {personEmail && (
                            <span className="ml-1 text-slate-400">
                              · {personEmail}
                            </span>
                          )}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-px text-[10px] font-medium ${badge.tone}`}
                          >
                            {badge.label}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${scoreColor(
                              lead.score,
                            )}`}
                          >
                            {lead.score}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ·{" "}
                            {liveSeller
                              ? sellerDisplayName(liveSeller).split(" ")[0]
                              : lead.seller_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-medium text-slate-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ v: string; l: string }>;
}) {
  return (
    <Select
      size="sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </Select>
  );
}
