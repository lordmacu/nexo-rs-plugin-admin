// `agents` module manifest. Mounted at `/m/agents/*`.
//
// The agents module covers the operator's agent admin
// surface: listing, editing, and the per-agent workspace
// (persona + knowledge editor). The workspace lives behind a
// React.lazy boundary because the markdown editor adds
// ~1 MB pre-gzip — operators only hit it from the agent list,
// so we keep the main bundle slim.

import { Suspense, lazy } from "react";
import { Bot } from "lucide-react";

import type { ModuleManifest } from "../../shell/types";
import Agents from "./Agents";

const AgentWorkspace = lazy(() => import("./AgentWorkspace"));

export const manifest: ModuleManifest = {
  id: "agents",
  version: "1.0.0",
  rail: {
    icon: <Bot size={18} />,
    label: "Agentes",
    tooltip: "Configurar agentes",
    order: 200,
    badge: () => null,
  },
  routes: [
    { path: "", element: <Agents /> },
    {
      path: ":agent_id/workspace",
      element: (
        <Suspense
          fallback={
            <div className="p-6 text-sm text-text-secondary">
              Cargando editor…
            </div>
          }
        >
          <AgentWorkspace />
        </Suspense>
      ),
    },
  ],
  // No secondary sidebar in v1 — the Agents page renders its
  // own list-and-detail layout. M16.5 can add a dedicated
  // sidebar with the agent list if the operator finds the
  // dual scheme confusing.
  capabilities: {
    tenantSwitch: true,
  },
  cmdK: (ctx) => [
    {
      id: "agents:new",
      label: "Crear nuevo agente (wizard)",
      hotkey: "N",
      group: "Acciones",
      run: () => {
        // `?wizard=new-agent` forces BootstrapGate to mount
        // the wizard even when an agent already exists;
        // `?step=agent` skips directly to step 3 when a
        // device is already paired (the wizard ignores it
        // when no device is paired and runs the full flow).
        ctx.navigate("/m/chats?wizard=new-agent&step=agent");
      },
    },
  ],
};
