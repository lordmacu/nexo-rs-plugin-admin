// __demo__ module — exists only to validate the
// ModuleManifest contract end-to-end before any production
// module migrates. Visible only when the env flag is on:
//
//   VITE_SHOW_DEMO_MODULE=1 npm run dev
//
// In a default build the manifest still exists but its rail
// icon order is set to a high number so it sits at the
// bottom; the env flag controls whether it appears at all
// via the conditional re-export below.

import { Beaker } from "lucide-react";
import type { ModuleManifest } from "../../shell/types";

const enabled = import.meta.env.VITE_SHOW_DEMO_MODULE === "1";

export const manifest: ModuleManifest | undefined = enabled
  ? {
      id: "__demo__",
      version: "1.0.0",
      rail: {
        icon: <Beaker size={18} />,
        label: "Demo",
        tooltip: "Demo module — VITE_SHOW_DEMO_MODULE=1",
        order: 9000,
      },
      routes: [
        {
          path: "",
          element: <DemoHome />,
        },
        {
          path: "ping",
          element: <DemoPing />,
        },
      ],
      sidebar: DemoSidebar,
      contextPanel: DemoContextPanel,
      cmdK: (ctx) => [
        {
          id: "demo:home",
          label: "Demo · Home",
          group: "Demo",
          run: () => ctx.navigate("/m/__demo__"),
        },
        {
          id: "demo:ping",
          label: "Demo · Ping",
          group: "Demo",
          run: () => ctx.navigate("/m/__demo__/ping"),
        },
      ],
      capabilities: { tenantSwitch: true },
    }
  : undefined;

function DemoSidebar() {
  return (
    <nav className="flex flex-col gap-1 p-3 text-sm">
      <a
        href="#/m/__demo__"
        className="rounded px-2 py-1 text-text-primary hover:bg-panel-hover"
      >
        Home
      </a>
      <a
        href="#/m/__demo__/ping"
        className="rounded px-2 py-1 text-text-primary hover:bg-panel-hover"
      >
        Ping
      </a>
    </nav>
  );
}

function DemoHome() {
  return (
    <div className="space-y-2 p-6 text-sm text-text-primary">
      <h1 className="text-lg font-semibold">Demo module home</h1>
      <p className="text-text-secondary">
        Validates the ModuleManifest contract end-to-end: rail icon, sidebar
        slot, main area, context panel.
      </p>
    </div>
  );
}

function DemoPing() {
  return (
    <div className="space-y-2 p-6 text-sm text-text-primary">
      <h1 className="text-lg font-semibold">Ping route</h1>
      <p>Active path resolves under /m/__demo__/ping.</p>
    </div>
  );
}

function DemoContextPanel() {
  return (
    <div className="space-y-2 p-4 text-xs text-text-secondary">
      <h2 className="text-sm font-semibold text-text-primary">Context</h2>
      <p>This is the context panel slot for the demo module.</p>
    </div>
  );
}
