// Phase 90.3.21 — `tenants` module. Lists authorised tenants
// with active-now badge. Create / update / delete deferred until
// the api/tenants.ts wrappers ship (the wire shapes already exist
// daemon-side per Phase 83.8.12).

import { Building2 } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import { t as tStatic } from "../../i18n";
import TenantsMain from "./TenantsMain";

export const manifest: ModuleManifest = {
  id: "tenants",
  version: "0.1.0",
  rail: {
    icon: <Building2 size={18} />,
    label: tStatic("tenants.title"),
    tooltip: tStatic("tenants.title"),
    order: 85,
  },
  routes: [{ path: "", element: <TenantsMain /> }],
  capabilities: { tenantSwitch: false },
};
