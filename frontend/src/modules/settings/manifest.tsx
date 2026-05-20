// Phase 90.3.20 — `settings` module. Auth rotation + framework
// configuration (broker URL, system info — deferred until the
// matching admin RPCs ship).

import { Settings } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import { t as tStatic } from "../../i18n";
import SettingsMain from "./SettingsMain";
import PluginsSettings, { PluginScreenRoute } from "./PluginsSettings";

export const manifest: ModuleManifest = {
  id: "settings",
  version: "0.1.0",
  rail: {
    icon: <Settings size={18} />,
    label: tStatic("settings.title"),
    tooltip: tStatic("settings.title"),
    order: 90,
  },
  routes: [
    { path: "", element: <SettingsMain /> },
    // Phase 99 — "Plugins" sub-link inside Configuración.
    { path: "plugins", element: <PluginsSettings /> },
    { path: "plugins/:pluginId", element: <PluginScreenRoute /> },
  ],
  capabilities: { tenantSwitch: false },
};
