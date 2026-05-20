// Phase 99.8 — turn runtime plugin admin-UI contributions
// (Phase 99 `plugin_ui/list`) into synthetic shell `ModuleEntry`s
// so the rail renders one entry per contributing plugin and routes
// open the plugin's `GenericScreen`s.
//
// Slot/trust gating already happened server-side (only allowed
// contributions reach the client). v1 maps each plugin to ONE rail
// module (`plugin-<id>`); the module page lists the plugin's
// contributions + screens. Finer slot placement (injecting into
// core sidebar sections) is a follow-up.

import type { ComponentType, ReactNode } from "react";
import * as Lucide from "lucide-react";
import { Puzzle } from "lucide-react";

import type { PluginUiEntry } from "../api/types.gen";
import type { ModuleEntry } from "./ModuleRegistry";
import type { ModuleManifest } from "./types";

/** `"message-circle"` / `"bar_chart"` -> `"MessageCircle"`. */
function pascalCase(name: string): string {
  return name
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join("");
}

/** Resolve a lucide icon name to an element, falling back to a
 *  generic puzzle-piece when the name is absent / unknown. */
export function iconFor(name: string | null | undefined): ReactNode {
  if (!name) return <Puzzle size={18} />;
  const Comp = (Lucide as Record<string, unknown>)[pascalCase(name)] as
    | ComponentType<{ size?: number }>
    | undefined;
  return Comp ? <Comp size={18} /> : <Puzzle size={18} />;
}

/** Synthetic module id namespace so a plugin can never collide with
 *  (or shadow) a builtin module id. */
export function pluginModuleId(pluginId: string): string {
  return `plugin-${pluginId}`;
}

/**
 * Convert the contribution list into synthetic rail modules.
 * `renderScreen` builds the route element for a plugin (injected so
 * this stays decoupled from `GenericScreen` for testing).
 */
export function pluginEntriesToModules(
  entries: readonly PluginUiEntry[],
  renderScreen: (entry: PluginUiEntry) => ReactNode,
): ModuleEntry[] {
  return entries
    .filter((e) => e.contributions.length > 0)
    .map((entry) => {
      // Prefer a top-level (slotted) contribution for the rail
      // icon/label; fall back to the first contribution / plugin name.
      const top =
        entry.contributions.find((c) => c.slot != null) ??
        entry.contributions[0];
      const manifest: ModuleManifest = {
        id: pluginModuleId(entry.id),
        version: "0.1.0",
        rail: {
          icon: iconFor(top?.icon),
          // `||` (not `??`) so an empty label also falls back.
          label: top?.label || entry.name,
          tooltip: entry.name,
          order: 1000 + (top?.order ?? 0),
        },
        routes: [{ path: "*", element: renderScreen(entry) }],
        capabilities: { tenantSwitch: false },
      };
      return { manifest, error: null, disabled: false };
    });
}
