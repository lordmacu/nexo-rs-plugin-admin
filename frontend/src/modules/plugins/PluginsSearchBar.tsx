// Phase 98.14 — search + filter bar above the Available grid.
//
// Three orthogonal filters that combine in the server-side
// `nexo/admin/plugins/search` request:
//   - `query`: free-form substring (case-insensitive, matched
//     against name + description + tags). Debounced 250ms so each
//     keystroke doesn't fire an RPC.
//   - `category`: PluginCategory enum (channel / poller / tool /
//     webhook / persona). `null` = no filter.
//   - `compat_only`: drops NeedsUpgrade/Incompatible but keeps
//     Unknown (manifest fetch failures still surface).
//
// The bar drives the `useAvailablePlugins` store directly via
// `setFilters` — the store auto-triggers a `reload()` on every
// filter mutation, so the grid below updates without imperative
// coupling.

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import type { PluginCategory } from "../../api/plugin_discovery";
import { useAvailablePlugins } from "../../store/plugins";
import { useT } from "../../i18n";

/** Debounce window for the query input. 250ms keeps the UI
 *  responsive without firing one RPC per keystroke. */
const QUERY_DEBOUNCE_MS = 250;

const CATEGORY_OPTIONS: PluginCategory[] = [
  "channel",
  "poller",
  "tool",
  "webhook",
  "persona",
];

export default function PluginsSearchBar() {
  const t = useT();
  const { filters, setFilters } = useAvailablePlugins();
  const [draftQuery, setDraftQuery] = useState(filters.query ?? "");
  // Hold the timer so we can cancel pending debounces on rapid
  // keystrokes or unmount.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      // Only fire when the value actually changed — avoids a
      // redundant RPC when the operator focuses then blurs without
      // typing.
      const next = draftQuery.trim();
      if (next !== (filters.query ?? "")) {
        setFilters({ ...filters, query: next || undefined });
      }
    }, QUERY_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftQuery]);

  function clearQuery() {
    setDraftQuery("");
    setFilters({ ...filters, query: undefined });
  }

  function setCategory(value: string) {
    if (value === "") {
      setFilters({ ...filters, category: undefined });
    } else {
      setFilters({ ...filters, category: value as PluginCategory });
    }
  }

  function toggleCompatOnly() {
    setFilters({ ...filters, compat_only: !filters.compat_only });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-panel-alt p-2">
      <div className="relative flex flex-1 items-center min-w-[200px]">
        <Search
          size={14}
          className="absolute left-2 text-text-meta pointer-events-none"
        />
        <input
          type="text"
          value={draftQuery}
          onChange={(e) => setDraftQuery(e.target.value)}
          placeholder={t("plugins.search.placeholder")}
          className="w-full rounded border border-border-DEFAULT bg-panel pl-7 pr-7 py-1.5 text-sm text-text-primary placeholder:text-text-meta focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label={t("plugins.search.aria_label")}
        />
        {draftQuery !== "" && (
          <button
            type="button"
            onClick={clearQuery}
            aria-label={t("plugins.search.clear")}
            className="absolute right-2 rounded p-0.5 text-text-meta hover:bg-panel hover:text-text-primary"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <label className="flex items-center gap-1.5 text-xs text-text-secondary">
        {t("plugins.search.category_label")}
        <select
          value={filters.category ?? ""}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded border border-border-DEFAULT bg-panel px-2 py-1 text-xs"
        >
          <option value="">{t("plugins.search.category_all")}</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {t(`plugins.badge.source.${c}` as never, {}) /* placeholder */}
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={filters.compat_only ?? false}
          onChange={toggleCompatOnly}
          className="rounded border-border-DEFAULT"
        />
        {t("plugins.search.compat_only")}
      </label>
    </div>
  );
}
