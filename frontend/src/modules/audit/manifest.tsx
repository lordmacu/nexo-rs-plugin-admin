// Phase 83.12.audit-page — `audit` module manifest. Renders
// the `microapp_admin_audit` table tail with filters +
// pagination. Operators reach it via the workspace shell rail
// icon (FileText, order 60).
//
// Backend: `nexo/admin/microapp_audit/tail` admin RPC, gated
// on the `audit_read` capability (declared optional in the
// microapp's `plugin.toml`). When the capability isn't granted,
// the page renders a denial banner instead of a list.

import { FileText } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import { t as tStatic } from "../../i18n";
import AuditMain from "./AuditMain";

export const manifest: ModuleManifest = {
  id: "audit",
  version: "0.1.0",
  rail: {
    icon: <FileText size={18} />,
    label: tStatic("audit.title"),
    tooltip: tStatic("audit.title"),
    order: 60,
  },
  routes: [{ path: "", element: <AuditMain /> }],
  // No secondary sidebar — the audit table panel takes the full
  // workspace main area (filters live above the list, no per-
  // row drilldown side surface in v0).
  sidebar: () => null,
  capabilities: { tenantSwitch: true },
};
