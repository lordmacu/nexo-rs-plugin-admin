// Phase 90.3.17 — `memory` module placeholder. Admin RPCs for
// memory query + snapshot not yet exposed. CLI covers it via
// `agent memory snapshot --agent <id>`.

import { Database } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import { t as tStatic } from "../../i18n";
import MemoryMain from "./MemoryMain";

export const manifest: ModuleManifest = {
  id: "memory",
  version: "0.1.0",
  rail: {
    icon: <Database size={18} />,
    label: tStatic("memory.title"),
    tooltip: tStatic("memory.title"),
    order: 50,
  },
  routes: [{ path: "", element: <MemoryMain /> }],
  capabilities: { tenantSwitch: true },
};
