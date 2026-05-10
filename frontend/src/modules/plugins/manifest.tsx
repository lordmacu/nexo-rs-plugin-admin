// Phase 90.3.18 — `plugins` module placeholder. Admin RPC for
// plugin doctor output not yet exposed (agent doctor plugins CLI
// covers it locally). Module rail entry kept so operators can
// see where the feature will land once the backend ships.

import { PuzzleIcon } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import { t as tStatic } from "../../i18n";
import PluginsMain from "./PluginsMain";

export const manifest: ModuleManifest = {
  id: "plugins",
  version: "0.1.0",
  rail: {
    icon: <PuzzleIcon size={18} />,
    label: tStatic("plugins.title"),
    tooltip: tStatic("plugins.title"),
    order: 70,
  },
  routes: [{ path: "", element: <PluginsMain /> }],
  sidebar: () => null,
  capabilities: { tenantSwitch: false },
};
