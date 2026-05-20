// Phase 99.8 — module page for a runtime plugin contribution.
//
// Mounted at `/m/plugin-<id>` by the synthetic module entry
// (`pluginContributionModules`). Renders a screen selector (when
// the plugin contributes more than one screen) + the active
// screen's `GenericScreen`.

import { useState } from "react";

import type { PluginUiEntry } from "../api/types.gen";
import { GenericScreen } from "../components/plugin-ui/GenericScreen";

export function PluginModulePage({ entry }: { entry: PluginUiEntry }) {
  const screens = entry.screens;
  const [active, setActive] = useState(screens[0]?.id ?? "");

  if (screens.length === 0) {
    return (
      <section className="plugin-module">
        <h1>{entry.name}</h1>
        <p>This plugin contributes no screens.</p>
      </section>
    );
  }

  return (
    <section className="plugin-module" data-plugin={entry.id}>
      {screens.length > 1 ? (
        <nav className="plugin-module__nav">
          {screens.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-current={s.id === active}
              onClick={() => setActive(s.id)}
            >
              {s.title}
            </button>
          ))}
        </nav>
      ) : null}
      <GenericScreen plugin={entry.id} screen={active} />
    </section>
  );
}
