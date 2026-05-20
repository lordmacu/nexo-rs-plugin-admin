// Phase 99 — "Plugins" sub-link under Settings (Configuración).
//
// Installed plugins that contribute admin UI are surfaced HERE
// (not as top-level rail entries). The list reads the shared
// `usePluginContributions` store (booted + firehose-subscribed in
// App's ShellMount); each plugin opens its declarative screens via
// the generic renderer.

import { useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import * as Lucide from "lucide-react";
import { ArrowLeft, Puzzle } from "lucide-react";

import { useT } from "../../i18n";
import { usePluginContributions } from "../../store/pluginContributions";
import { GenericScreen } from "../../components/plugin-ui/GenericScreen";

function pascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join("");
}

/** Resolve a lucide icon name → element, falling back to a puzzle. */
function iconFor(name: string | null | undefined): ReactNode {
  if (!name) return <Puzzle size={18} />;
  const Comp = (Lucide as Record<string, unknown>)[pascalCase(name)] as
    | React.ComponentType<{ size?: number }>
    | undefined;
  return Comp ? <Comp size={18} /> : <Puzzle size={18} />;
}

/** `/m/settings/plugins` — list installed plugins. */
export default function PluginsSettings() {
  const t = useT();
  const entries = usePluginContributions((s) => s.entries);
  const status = usePluginContributions((s) => s.status);

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="border-b bg-panel px-6 py-4">
        <h1 className="text-lg font-bold text-text-primary">
          {t("settings.plugins.title")}
        </h1>
        <p className="mt-1 text-xs text-text-secondary">
          {t("settings.plugins.subtitle")}
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {status === "denied" ? (
          <p className="text-sm text-text-secondary">
            {t("settings.plugins.denied")}
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {t("settings.plugins.empty")}
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {entries.map((e) => (
              <li key={e.id}>
                <Link
                  to={e.id}
                  className="flex items-center gap-3 rounded-lg border bg-panel p-4 hover:border-accent"
                  data-plugin={e.id}
                >
                  <span className="text-text-secondary">
                    {iconFor(e.contributions[0]?.icon)}
                  </span>
                  <span className="flex-1 text-sm font-medium text-text-primary">
                    {e.name}
                  </span>
                  <span className="rounded bg-surface px-2 py-0.5 text-[10px] uppercase text-text-secondary">
                    {e.trust_tier}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** `/m/settings/plugins/:pluginId` — a plugin's screens. */
export function PluginScreenRoute() {
  const t = useT();
  const { pluginId } = useParams<{ pluginId: string }>();
  const entry = usePluginContributions((s) =>
    s.entries.find((e) => e.id === pluginId),
  );
  const [active, setActive] = useState<string>("");

  if (!entry) {
    return (
      <div className="flex h-full flex-col bg-surface">
        <div className="p-6">
          <Link
            to="/m/settings/plugins"
            className="text-sm text-accent hover:underline"
          >
            {t("settings.plugins.back")}
          </Link>
        </div>
      </div>
    );
  }

  const screens = entry.screens;
  const current = active || screens[0]?.id || "";

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex items-center gap-3 border-b bg-panel px-6 py-4">
        <Link
          to="/m/settings/plugins"
          className="text-text-secondary hover:text-text-primary"
          aria-label={t("settings.plugins.back")}
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-bold text-text-primary">{entry.name}</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        {screens.length === 0 ? (
          <p className="text-sm text-text-secondary">
            {t("settings.plugins.no_screens")}
          </p>
        ) : (
          <>
            {screens.length > 1 ? (
              <nav className="mb-4 flex gap-2">
                {screens.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-current={s.id === current}
                    onClick={() => setActive(s.id)}
                    className={`rounded px-3 py-1.5 text-sm ${
                      s.id === current
                        ? "bg-accent text-white"
                        : "bg-panel text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </nav>
            ) : null}
            {current ? (
              <GenericScreen plugin={entry.id} screen={current} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
