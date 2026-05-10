// Phase 90.3.16 — `channels` module. Lists (agent_id, server_name)
// approval rows and supports revoke. Approve UX deferred (needs
// server-name picker + allowlist editor).

import { Radio } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import { t as tStatic } from "../../i18n";
import ChannelsMain from "./ChannelsMain";

export const manifest: ModuleManifest = {
  id: "channels",
  version: "0.1.0",
  rail: {
    icon: <Radio size={18} />,
    label: tStatic("channels.title"),
    tooltip: tStatic("channels.title"),
    order: 45,
  },
  routes: [{ path: "", element: <ChannelsMain /> }],
  sidebar: () => null,
  capabilities: { tenantSwitch: true },
};
