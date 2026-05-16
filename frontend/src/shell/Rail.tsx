// Vertical icon rail — primary navigation between modules.
//
// 50 px wide, fixed left, full height. ARIA tablist with
// vertical orientation so screen readers announce module
// switches. Keyboard nav: ArrowUp / ArrowDown moves the
// roving tabindex; Enter / Space activates. Tooltip on hover
// rendered via the native title attribute (good enough for v1
// + a11y-friendly without an extra dep).
//
// Disabled modules (manifest_invalid / migration_failed) are
// rendered greyed-out with the failure tooltip — the operator
// can still see them so resetting state from a future
// settings UI is discoverable.

import { useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { ModuleEntry } from "./ModuleRegistry";
import { useViewport } from "./useViewport";
import { useBootstrap } from "../store/bootstrap";
import { Button } from "../components/ui";

function isVisibleEntry(entry: ModuleEntry): boolean {
  if (entry.disabled) return false;
  const predicate = entry.manifest.visible;
  if (typeof predicate !== "function") return true;
  try {
    return predicate();
  } catch {
    // Defensive — a buggy predicate keeps the entry visible
    // rather than silently dropping a whole module from the
    // rail. The operator can still surface the bug via the
    // dev console.
    return true;
  }
}

interface RailProps {
  readonly entries: readonly ModuleEntry[];
  readonly tenantSwitcherSlot?: React.ReactNode;
}

export function Rail({ entries, tenantSwitcherSlot }: RailProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isNarrow } = useViewport();
  // Subscribe to the bootstrap snapshot so a state change
  // (wizard completion, fresh pairing) re-renders the rail and
  // surfaces / hides entries whose `visible` predicate reads
  // the same store.
  useBootstrap((s) => s.bootstrap);

  // Active id is the second segment of /m/<id>/...
  const activeId = useMemo(() => {
    const m = location.pathname.match(/^\/m\/([^/]+)/);
    return m?.[1] ?? null;
  }, [location.pathname]);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      const enabled = entries.filter(isVisibleEntry);
      const isHorizontal = isNarrow;
      const next_keys = isHorizontal
        ? ["ArrowRight", "ArrowLeft"]
        : ["ArrowDown", "ArrowUp"];
      if (next_keys.includes(event.key)) {
        event.preventDefault();
        const direction = event.key === next_keys[0] ? 1 : -1;
        const next = (index + direction + enabled.length) % enabled.length;
        const target = tabRefs.current[next];
        target?.focus();
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const entry = enabled[index];
        if (entry) navigate(`/m/${entry.manifest.id}`);
      }
    },
    [entries, navigate, isNarrow],
  );

  const enabledEntries = entries.filter(isVisibleEntry);
  // `disabledEntries` keeps showing manifest_invalid /
  // migration_failed modules greyed-out so the operator can
  // discover the failure. A `visible: () => false` entry is a
  // deliberate hide (not a bug) so it stays out of both
  // groups.
  const disabledEntries = entries.filter(
    (e) => e.disabled && (e.manifest.visible?.() ?? true),
  );

  // ── Narrow viewport: bottom-nav ──────────────────────────────
  if (isNarrow) {
    // 5 enabled icons fit comfortably; overflow goes behind a
    // "More" button that opens a sheet (kept for a follow-up).
    const visible = enabledEntries.slice(0, 5);
    return (
      <nav
        role="tablist"
        aria-orientation="horizontal"
        aria-label="Workspace modules"
        className="fixed bottom-0 left-0 right-0 z-30 flex h-14 items-center justify-around border-t  bg-panel-alt/95 px-2 backdrop-blur-md"
      >
        {visible.map((entry, index) => {
          const { id, rail } = entry.manifest;
          const isActive = activeId === id;
          const badge = rail.badge ? rail.badge() : null;
          return (
            <Button
              variant="ghost"
              size="md"
              key={id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              aria-selected={isActive}
              aria-label={rail.label}
              tabIndex={isActive ? 0 : -1}
              onClick={() => navigate(`/m/${id}`)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              data-testid={`rail-icon-${id}`}
            >
              <span aria-hidden="true">{rail.icon}</span>
              <span className="text-[10px] font-medium">{rail.label}</span>
              {badge !== null && (
                <span className="pointer-events-none absolute right-2 top-1.5 flex min-h-3.5 min-w-3.5 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-semibold leading-none text-white">
                  {badge}
                </span>
              )}
            </Button>
          );
        })}
      </nav>
    );
  }

  // ── Desktop: vertical rail ───────────────────────────────────
  return (
    <nav
      role="tablist"
      aria-orientation="vertical"
      aria-label="Workspace modules"
      className="flex h-full w-[50px] shrink-0 flex-col items-center gap-1 border-r  bg-panel-alt py-2"
    >
      {tenantSwitcherSlot}
      {tenantSwitcherSlot && (
        <div className="my-1 h-px w-6 bg-border-DEFAULT" />
      )}

      {enabledEntries.map((entry, index) => {
        const { id, rail } = entry.manifest;
        const isActive = activeId === id;
        const badge = rail.badge ? rail.badge() : null;
        return (
          <button
            type="button"
            key={id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            aria-selected={isActive}
            aria-label={rail.label}
            title={rail.tooltip ?? rail.label}
            tabIndex={isActive ? 0 : -1}
            onClick={() => navigate(`/m/${id}`)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            data-testid={`rail-icon-${id}`}
            className={[
              "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-accent",
              isActive
                ? "bg-accent text-white shadow-sm"
                : "bg-panel text-accent ring-1 ring-border hover:bg-accent-soft",
            ].join(" ")}
          >
            <span aria-hidden="true">{rail.icon}</span>
            {badge !== null && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-semibold leading-none text-white"
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}

      {disabledEntries.length > 0 && (
        <>
          <div className="my-1 h-px w-6 bg-border-DEFAULT" />
          {disabledEntries.map((entry) => {
            const { id, rail } = entry.manifest;
            const reason =
              entry.error?.kind === "manifest_invalid"
                ? "Manifest invalid"
                : entry.error?.kind === "migration_failed"
                  ? `Migration failed (${entry.error.from} → ${entry.error.to})`
                  : "Disabled";
            return (
              <div
                key={id}
                role="tab"
                aria-disabled="true"
                aria-label={`${rail.label} (${reason})`}
                title={`${rail.label} — ${reason}`}
                className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded text-text-meta opacity-40"
                data-testid={`rail-icon-${id}-disabled`}
              >
                <span aria-hidden="true">{rail.icon}</span>
              </div>
            );
          })}
        </>
      )}
    </nav>
  );
}
