// Phase 90.3.13 — `dashboard` module manifest. Read-only
// overview of agent count + LLM providers + recent audit
// activity. Operators reach it via the workspace shell rail
// icon (LayoutDashboard, order 10 — first rail entry).
//
// No admin RPC capabilities required beyond what the underlying
// store consumes (agents_crud + llm_keys_crud + audit_read);
// they're already declared in plugin.toml.

import { LayoutDashboard } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import { t as tStatic } from "../../i18n";
import DashboardMain from "./DashboardMain";

export const manifest: ModuleManifest = {
  id: "dashboard",
  version: "0.1.0",
  rail: {
    icon: <LayoutDashboard size={18} />,
    label: tStatic("dashboard.title"),
    tooltip: tStatic("dashboard.title"),
    order: 10,
  },
  routes: [{ path: "", element: <DashboardMain /> }],
  capabilities: { tenantSwitch: true },
};
