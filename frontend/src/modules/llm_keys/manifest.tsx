// Phase 90.3.15 — `llm_keys` module. Consolidates list + create
// + rotate + delete of LLM provider instances. Reuses
// LlmInstanceCreateModal from the agents module for both
// create and rotate flows (modal supports editing_id + editing_factory).

import { Key } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import { t as tStatic } from "../../i18n";
import LlmKeysMain from "./LlmKeysMain";

export const manifest: ModuleManifest = {
  id: "llm_keys",
  version: "0.1.0",
  rail: {
    icon: <Key size={18} />,
    label: tStatic("llm_keys.title"),
    tooltip: tStatic("llm_keys.title"),
    order: 40,
  },
  routes: [{ path: "", element: <LlmKeysMain /> }],
  sidebar: () => null,
  capabilities: { tenantSwitch: true },
};
