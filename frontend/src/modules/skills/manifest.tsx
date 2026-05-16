// Phase 90.3.14 — `skills` module manifest. List + view + delete
// agent skills. Backend: `nexo/admin/skills/{list,get,delete}`,
// gated on `skills_crud` (declared required in plugin.toml).

import { Sparkles } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import { t as tStatic } from "../../i18n";
import SkillsMain from "./SkillsMain";

export const manifest: ModuleManifest = {
  id: "skills",
  version: "0.1.0",
  rail: {
    icon: <Sparkles size={18} />,
    label: tStatic("skills.title"),
    tooltip: tStatic("skills.title"),
    order: 30,
  },
  routes: [{ path: "", element: <SkillsMain /> }],
  capabilities: { tenantSwitch: true },
};
