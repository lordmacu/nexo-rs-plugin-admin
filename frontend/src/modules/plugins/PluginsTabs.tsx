// Phase 98.12 — WordPress-style tab navigator for `/m/plugins`.
//
// Hosts two tabs:
//   - "Installed" — the existing PluginsMain content
//     (Loaded list / Init outcomes / Diagnostics).
//   - "Available" — Phase 98.13/98.14 grid of `<PluginCard>`s.
//
// Tab state lives client-side (no URL hash) because the daemon
// admin RPC pages already encode their location in the route;
// adding a hash here would conflict with the existing
// admin-router. Operators expect the tab to reset on page reload.

import type { ReactNode } from "react";

import { useT } from "../../i18n";

export type PluginsTabKey = "installed" | "available";

interface PluginsTabsProps {
  active: PluginsTabKey;
  onChange: (next: PluginsTabKey) => void;
  /** Optional inline badge next to each tab label — typically the
   *  count of installed / available plugins. `exactOptionalPropertyTypes`
   *  is on in this project's tsconfig, so we accept explicit
   *  `undefined`. */
  installedCount?: number | undefined;
  availableCount?: number | undefined;
  children: ReactNode;
}

export default function PluginsTabs({
  active,
  onChange,
  installedCount,
  availableCount,
  children,
}: PluginsTabsProps) {
  const t = useT();
  return (
    <div className="flex h-full flex-col">
      <nav
        role="tablist"
        aria-label={t("plugins.tabs.aria_label")}
        className="flex border-b bg-panel-alt"
      >
        <TabButton
          active={active === "installed"}
          onClick={() => onChange("installed")}
          label={t("plugins.tabs.installed")}
          badge={installedCount}
        />
        <TabButton
          active={active === "available"}
          onClick={() => onChange("available")}
          label={t("plugins.tabs.available")}
          badge={availableCount}
        />
      </nav>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number | undefined;
}) {
  const cls = active
    ? "border-b-2 border-accent text-accent"
    : "border-b-2 border-transparent text-text-secondary hover:text-text-primary";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${cls}`}
      onClick={onClick}
    >
      {label}
      {typeof badge === "number" && (
        <span className="rounded bg-panel px-1.5 py-0.5 text-xs text-text-meta">
          {badge}
        </span>
      )}
    </button>
  );
}
