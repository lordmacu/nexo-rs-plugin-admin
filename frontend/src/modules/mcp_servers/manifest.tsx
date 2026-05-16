// Phase 90.3.19 — `mcp_servers` module placeholder. Awaits
// `nexo/admin/mcp/{list,upsert,delete}` admin RPCs.

import { Plug } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import { t as tStatic } from "../../i18n";
import McpServersMain from "./McpServersMain";

export const manifest: ModuleManifest = {
  id: "mcp_servers",
  version: "0.1.0",
  rail: {
    icon: <Plug size={18} />,
    label: tStatic("mcp_servers.title"),
    tooltip: tStatic("mcp_servers.title"),
    order: 80,
  },
  routes: [{ path: "", element: <McpServersMain /> }],
  capabilities: { tenantSwitch: false },
};
