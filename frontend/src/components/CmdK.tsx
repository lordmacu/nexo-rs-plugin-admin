// M7.cmdk — command palette modal (Cmd+K / Ctrl+K).
//
// Renders nothing when `useCmdk.open === false`. Opens centered
// over the dashboard with a search input + filtered action list.
// Substring match via `matchesQuery` (reused from M7.search.local
// — diacritic-insensitive, AND across whitespace tokens).
// Keyboard: ↑/↓ wraps the active row, Enter dispatches, Esc
// closes. Hover sets the active row. Backdrop click closes.

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCmdk } from "../store/cmdk";
import { buildActions, type CmdkAction, type ActionContext } from "../lib/cmdk";
import { useAuth } from "../store/auth";
import { useTenantStore } from "../store/tenant";
import { useRegistry } from "../shell/registryInstance";
import { fuzzyRank } from "../lib/fuzzyRank";
import { Button, Input } from "../components/ui";
import { useT } from "../i18n";
import type { CatalogKey } from "../i18n";

const MAX_VISIBLE_ROWS = 8;
const ERROR_DISMISS_MS = 2000;

const SHORTCUTS_HELP: Array<[string, CatalogKey]> = [
  ["Cmd / Ctrl + K", "cmdk.shortcut_toggle"],
  ["↑ / ↓", "cmdk.shortcut_navigate"],
  ["Enter", "cmdk.shortcut_run"],
  ["Esc", "cmdk.shortcut_close"],
  ["/", "cmdk.shortcut_focus_search"],
];

export default function CmdK() {
  const t = useT();
  const open = useCmdk((s) => s.open);
  const setOpen = useCmdk((s) => s.setOpen);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuth((s) => s.logout);
  const registry = useRegistry((s) => s.registry);

  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Active module id derived from `/m/<id>/...`. Empty when
  // the operator is on a legacy path (/login, /wizard) — in
  // that case no module-contributed entries fire.
  const activeModuleId = useMemo(() => {
    const m = location.pathname.match(/^\/m\/([^/]+)/);
    return m?.[1] ?? null;
  }, [location.pathname]);

  // Build the action list given current registry + active
  // module. Re-derives when the modal opens (so each open
  // grabs fresh conversation lists / pause state from the
  // chats manifest's cmdK).
  const actions = useMemo(() => {
    if (!registry) return [];
    const tenantState = useTenantStore.getState();
    return buildActions({
      entries: registry.list(),
      activeModuleId,
      shellContext: {
        tenantId: tenantState.activeTenantId ?? "",
        switchTenant: () => {
          /* not used inside the palette */
        },
        navigate,
        invalidateModule: () => {
          /* not used inside the palette */
        },
      },
    });
    // The `open` dep is intentional: each open should grab a
    // fresh snapshot of module state (conversation list,
    // pause flags, etc.) without hooking into every store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry, activeModuleId, navigate, open]);

  // M7.cmdk.fuzzy — when there's a query, rank by subsequence
  // density so "log" surfaces "Logout" above "Mostrar atajos
  // de teclado". Empty query keeps the curated buildActions
  // order (Recientes / Conversaciones / Acciones groups).
  const filtered = useMemo(() => {
    if (query.trim().length === 0) return actions;
    return fuzzyRank(actions, query, (a) => a.label);
  }, [actions, query]);

  // Reset active row + clear error/shortcuts on open and on
  // query change.
  useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setError(null);
      setShowShortcuts(false);
      // Restore focus to whatever held it before the modal
      // opened. Defensive guard: only call .focus() on real
      // HTMLElements (Element doesn't expose it).
      const prev = previouslyFocused.current;
      if (prev instanceof HTMLElement) {
        try {
          prev.focus();
        } catch {
          /* ignore */
        }
      }
      previouslyFocused.current = null;
      return;
    }
    // open === true: snapshot current focus + grab modal input.
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      previouslyFocused.current = active;
    }
    inputRef.current?.focus();
  }, [open]);

  // Auto-dismiss inline errors after ERROR_DISMISS_MS.
  useEffect(() => {
    if (!error) return;
    const t = window.setTimeout(() => setError(null), ERROR_DISMISS_MS);
    return () => window.clearTimeout(t);
  }, [error]);

  if (!open) return null;

  const ctx: ActionContext = {
    tenantId: useTenantStore.getState().activeTenantId ?? "",
    switchTenant: (id: string) =>
      useTenantStore.getState().setActiveTenantId(id),
    navigate,
    invalidateModule: () => {
      /* invalidation only used by the shell itself */
    },
    logout,
  };

  async function execute(action: CmdkAction) {
    if (busy) return;
    if (action.id === "shortcuts") {
      // Sentinel: don't run handler; toggle the help panel.
      setShowShortcuts((v) => !v);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await action.run(ctx);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % filtered.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const action = filtered[activeIdx];
      if (action) void execute(action);
      return;
    }
  }

  return (
    <div
      role="dialog"
      aria-label={t("cmdk.dialog_label")}
      className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4 bg-black/30"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-[520px] bg-white rounded-lg shadow-xl border  overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b ">
          <Search size={16} className="text-text-secondary" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("cmdk.search_placeholder")}
            className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-secondary"
          />
        </div>
        {showShortcuts ? (
          <div className="p-4 space-y-2">
            <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">
              {t("cmdk.shortcuts_title")}
            </div>
            <ul className="space-y-1.5 text-sm">
              {SHORTCUTS_HELP.map(([keys, desc_key]) => (
                <li key={keys} className="flex items-center justify-between">
                  <span className="text-text-primary">{t(desc_key)}</span>
                  <kbd className="text-xs font-mono border  rounded px-1.5 py-0.5 bg-panel-alt">
                    {keys}
                  </kbd>
                </li>
              ))}
            </ul>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowShortcuts(false)}
            >
              {t("cmdk.back_to_list")}
            </Button>
          </div>
        ) : (
          <ul role="listbox" className="max-h-[400px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-sm text-text-meta text-center">
                {t("cmdk.no_results")}
              </li>
            ) : (
              renderRowsWithGroupDividers(
                filtered,
                activeIdx,
                setActiveIdx,
                execute,
              )
            )}
            {filtered.length > MAX_VISIBLE_ROWS && (
              <li className="px-4 py-1 text-[11px] text-text-meta text-center">
                {t("cmdk.results_overflow", { count: filtered.length })}
              </li>
            )}
          </ul>
        )}
        {error && (
          <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-t border-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

/** Render the action rows with group dividers between actions
 *  whose `group` differs from the previous. Click + hover
 *  handlers wired here. */
function renderRowsWithGroupDividers(
  filtered: CmdkAction[],
  activeIdx: number,
  setActiveIdx: (i: number) => void,
  execute: (a: CmdkAction) => Promise<void> | void,
): React.ReactNode {
  let prevGroup: string | undefined;
  const out: React.ReactNode[] = [];
  filtered.forEach((action, idx) => {
    if (action.group && action.group !== prevGroup) {
      out.push(
        <li
          key={`group:${action.group}:${idx}`}
          className="px-4 py-1 text-[10px] uppercase tracking-wide text-text-meta"
        >
          {action.group}
        </li>,
      );
    }
    prevGroup = action.group;
    const isActive = idx === activeIdx;
    out.push(
      <li
        key={action.id}
        role="option"
        aria-selected={isActive}
        onMouseEnter={() => setActiveIdx(idx)}
        onClick={() => void execute(action)}
        className={[
          "px-4 py-2 flex items-center justify-between cursor-pointer text-sm",
          isActive ? "bg-panel-alt" : "hover:bg-panel-hover",
        ].join(" ")}
      >
        <span className="text-text-primary truncate">{action.label}</span>
        {action.hotkey && (
          <kbd className="ml-3 text-[11px] font-mono border  rounded px-1.5 py-0.5 bg-panel-alt text-text-secondary">
            {action.hotkey}
          </kbd>
        )}
      </li>,
    );
  });
  return out;
}
