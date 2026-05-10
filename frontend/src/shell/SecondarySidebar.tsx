// Secondary sidebar body — renders the active module's
// `manifest.sidebar` component or a generic empty-state.
//
// Width persistence + resize handle live in `ShellRoot` (the
// `react-resizable-panels` `<Panel>` children must be direct
// descendants of a `<PanelGroup>`, so the orchestration sits
// at the shell level).

import { ComponentType } from "react";

import type { SidebarSlotProps } from "./types";

interface SecondarySidebarProps {
  readonly activePath: string;
  readonly tenantId: string;
  readonly Component: ComponentType<SidebarSlotProps> | undefined;
}

export function SecondarySidebar({
  activePath,
  tenantId,
  Component,
}: SecondarySidebarProps) {
  if (!Component) return null;
  return (
    <div className="h-full w-full overflow-hidden border-r  bg-panel-alt">
      <Component activePath={activePath} tenantId={tenantId} />
    </div>
  );
}
