// Workspace shell root — mounted at `/m/*`. Composes the
// rail, secondary sidebar, main area, and optional context
// panel into the operator's primary work surface.
//
// Layout (left to right):
//   Rail (50 px fixed)
//   PanelGroup horizontal:
//     SecondarySidebar  (resizable %, persisted in shell:sidebar-width)
//     MainArea          (fluid)
//     ContextPanel      (resizable %, persisted in shell:context-width)
//
// The active module's manifest decides what each slot
// renders. If the route the URL points at doesn't exist in
// the registry, a fallback `<UnknownModule />` mounts.

import { ComponentType, useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Outlet, useLocation, useMatch, useRoutes } from "react-router-dom";

import { ContextPanel } from "./ContextPanel";
import { t } from "./i18n";
import type { ModuleEntry, ModuleRegistry } from "./ModuleRegistry";
import { ModuleErrorBoundary } from "./ModuleErrorBoundary";
import { Rail } from "./Rail";
import { SecondarySidebar } from "./SecondarySidebar";
import { TenantSwitcher } from "./TenantSwitcher";
import { useTenant } from "./useTenant";
import { useModuleInvalidation, useShellContext } from "./useShellContext";
import { usePersistedWidth } from "./usePersistedWidth";
import { useViewport } from "./useViewport";
import type { ContextSlotProps, SidebarSlotProps } from "./types";
import { Button } from "../components/ui";

interface ShellRootProps {
  readonly registry: ModuleRegistry;
}

export function ShellRoot({ registry }: ShellRootProps) {
  const { activeTenantId } = useTenant();
  const location = useLocation();
  const moduleMatch = useMatch({ path: "/m/:moduleId/*", end: false });
  const activeId = moduleMatch?.params.moduleId ?? null;
  const entry = activeId ? registry.get(activeId) : null;
  const shellContext = useShellContext();
  const { isNarrow } = useViewport();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [announce, setAnnounce] = useState("");

  // Close the mobile sidebar sheet on every route change so
  // tapping a sidebar entry returns the operator to the main
  // pane instead of staying covered.
  useEffect(() => {
    if (isNarrow) setSidebarOpen(false);
  }, [location.pathname, isNarrow]);

  // Announce module changes to screen readers via aria-live.
  // The hidden region updates on every active-id change so
  // sighted users see no flash, screen-reader users hear the
  // localised string.
  useEffect(() => {
    if (!entry || entry.disabled) return;
    setAnnounce(
      t("shell.announce.module_changed", {
        label: entry.manifest.rail.label,
      }),
    );
  }, [entry?.manifest.id, entry?.manifest.rail.label, entry?.disabled]);

  // Run the active module's onMount lifecycle. Re-runs when
  // the active module id or tenant changes; the previous
  // module's teardown (if any) fires on cleanup.
  useEffect(() => {
    if (!entry || entry.disabled || !entry.manifest.onMount) return;
    const teardown = entry.manifest.onMount(shellContext);
    return () => {
      if (typeof teardown === "function") teardown();
    };
    // shellContext is memoised; we only want to re-run when the
    // active module or tenant identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.manifest.id, activeTenantId]);

  const sidebarWidth = usePersistedWidth("sidebar-width", 22, 0);
  const contextWidth = usePersistedWidth("context-width", 28, 2);

  const moduleHasSidebar = Boolean(
    entry && !entry.disabled && entry.manifest.sidebar,
  );
  const showSidebar = moduleHasSidebar && !isNarrow;
  const showContext = useMemo(
    () =>
      !isNarrow && activeRouteOptsInToContextPanel(entry, location.pathname),
    [entry, location.pathname, isNarrow],
  );

  const moduleKey = useModuleInvalidation((s) =>
    activeId ? (s.counters[activeId] ?? 0) : 0,
  );

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden bg-surface ${
        isNarrow ? "flex-col pb-14" : "flex-row"
      }`}
    >
      {/* Live region for screen-reader announcements. Visually
          hidden via Tailwind sr-only — content updates on every
          module change. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announce}
      </div>
      {!isNarrow && (
        <Rail
          entries={registry.list()}
          tenantSwitcherSlot={<TenantSwitcher />}
        />
      )}

      {isNarrow && moduleHasSidebar && (
        <header className="flex h-12 shrink-0 items-center justify-between border-b  bg-panel-alt px-3">
          <Button
            variant="ghost"
            size="md"
            aria-label={t("shell.sheet.open_aria")}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={18} />
          </Button>
          <span className="text-sm font-semibold text-text-primary">
            {entry?.manifest.rail.label ?? ""}
          </span>
          <TenantSwitcher />
        </header>
      )}

      {isNarrow && sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          <Button
            variant="unstyled"
            aria-label={t("shell.sheet.close_aria")}
            onClick={() => setSidebarOpen(false)}
            className="flex-1 bg-black/40"
          >
            {/* Backdrop click target — closes the collapsed
                sidebar on mobile. */}
          </Button>
          <aside className="flex w-[80%] max-w-[320px] flex-col bg-panel-alt shadow-xl">
            <div className="flex items-center justify-between border-b  px-3 py-2">
              <span className="text-sm font-semibold text-text-primary">
                {entry?.manifest.rail.label ?? ""}
              </span>
              <Button
                variant="ghost"
                size="md"
                aria-label="Cerrar"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={16} />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {entry?.manifest.sidebar ? (
                <SidebarComponent
                  Component={
                    entry.manifest.sidebar as ComponentType<SidebarSlotProps>
                  }
                  activePath={location.pathname}
                  tenantId={activeTenantId ?? ""}
                />
              ) : null}
            </div>
          </aside>
        </div>
      )}

      <PanelGroup
        direction="horizontal"
        className="flex h-full flex-1"
        onLayout={showContext ? contextWidth.onLayout : sidebarWidth.onLayout}
        autoSaveId={undefined}
        // Re-mount the panel group when the active tenant
        // switches, the active module changes, the
        // invalidation counter bumps, or sidebar/context
        // visibility flips — needed because PanelGroup
        // doesn't re-balance on dynamic child changes.
        key={`${activeTenantId}-${activeId}-${moduleKey}-${showSidebar ? "sb" : "nosb"}-${showContext ? "ctx" : "noctx"}`}
      >
        {showSidebar && (
          <>
            <Panel
              defaultSize={sidebarWidth.initial}
              minSize={15}
              maxSize={50}
              order={1}
            >
              <SecondarySidebar
                activePath={location.pathname}
                tenantId={activeTenantId ?? ""}
                Component={
                  entry?.manifest.sidebar as
                    | ComponentType<SidebarSlotProps>
                    | undefined
                }
              />
            </Panel>
            <PanelResizeHandle
              className="w-px cursor-col-resize bg-border-DEFAULT hover:bg-accent/30"
              aria-label="Resize sidebar"
            />
          </>
        )}
        <Panel minSize={30} order={2}>
          <main
            className="h-full w-full overflow-auto bg-panel"
            data-testid="shell-main"
          >
            {entry && !entry.disabled ? (
              <ModuleErrorBoundary moduleId={entry.manifest.id}>
                <Outlet />
              </ModuleErrorBoundary>
            ) : (
              <UnknownModule moduleId={activeId} />
            )}
          </main>
        </Panel>
        {showContext && (
          <>
            <PanelResizeHandle
              className="w-px cursor-col-resize bg-border-DEFAULT hover:bg-accent/30"
              aria-label="Resize context panel"
            />
            <Panel
              defaultSize={contextWidth.initial}
              minSize={20}
              maxSize={45}
              order={3}
            >
              <ContextPanel
                activePath={location.pathname}
                tenantId={activeTenantId ?? ""}
                Component={
                  entry?.manifest.contextPanel as
                    | ComponentType<ContextSlotProps>
                    | undefined
                }
              />
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
}

/** Renders a module's sidebar Component with the same prop
 *  shape SecondarySidebar uses, without depending on the
 *  outer Panel chrome. Used by the narrow-viewport sheet. */
function SidebarComponent({
  Component,
  activePath,
  tenantId,
}: {
  Component: ComponentType<SidebarSlotProps>;
  activePath: string;
  tenantId: string;
}) {
  return <Component activePath={activePath} tenantId={tenantId} />;
}

function UnknownModule({ moduleId }: { moduleId: string | null }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <h2 className="text-base font-semibold text-text-primary">
        {moduleId
          ? t("shell.unknown_module.title_unknown", { module: moduleId })
          : t("shell.unknown_module.title_missing")}
      </h2>
      <p className="max-w-md text-sm text-text-secondary">
        {moduleId
          ? t("shell.unknown_module.body_unknown")
          : t("shell.unknown_module.body_missing")}
      </p>
    </div>
  );
}

/** Decides whether the context panel mounts for the active
 *  pathname. Layered:
 *
 *  1. Module declares no `contextPanel` → never shows.
 *  2. Module declares one but no `shouldShowContextPanel`
 *     predicate → shows on every page (legacy behaviour).
 *  3. Module declares both → predicate's return value wins,
 *     letting per-route opt-out without rewriting routes.
 *
 *  When `false`, the entire Panel + resize handle is skipped
 *  in `PanelGroup` and the main content stretches to the
 *  full available width. */
function activeRouteOptsInToContextPanel(
  entry: ModuleEntry | null,
  pathname: string,
): boolean {
  if (!entry || entry.disabled) return false;
  if (!entry.manifest.contextPanel) return false;
  const predicate = entry.manifest.shouldShowContextPanel;
  if (typeof predicate === "function") {
    try {
      return predicate(pathname);
    } catch {
      // Defensive — a buggy predicate falls back to "always
      // show" rather than crashing the shell.
      return true;
    }
  }
  return true;
}

/** Build the routes array the parent App's <Routes> mounts
 *  under `/m/*`. Splits per-module so each module's routes
 *  are nested at `/m/<id>/...` and resolve via <Outlet /> in
 *  ShellRoot's main area. */
export function buildShellRoutes(registry: ModuleRegistry) {
  return registry.listActive().map((entry) => ({
    path: entry.manifest.id,
    element: <Outlet />,
    children: [...entry.manifest.routes],
  }));
}

/** Hook variant for callers that already render `<ShellRoot/>`
 *  and want to mount the routes inside it. */
export function useShellRoutes(registry: ModuleRegistry) {
  return useRoutes(buildShellRoutes(registry));
}
