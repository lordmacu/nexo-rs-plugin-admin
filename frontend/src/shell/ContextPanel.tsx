// Right-hand context panel slot — renders the active
// module's `manifest.contextPanel` component when the active
// route opts in (`route.handle.contextPanel === true`).
// Width persistence + resize handle live in `ShellRoot`.

import { ComponentType } from "react";

import type { ContextSlotProps } from "./types";

interface ContextPanelProps {
  readonly activePath: string;
  readonly tenantId: string;
  readonly Component: ComponentType<ContextSlotProps> | undefined;
}

export function ContextPanel({
  activePath,
  tenantId,
  Component,
}: ContextPanelProps) {
  if (!Component) return null;
  return (
    <aside
      aria-label="Context panel"
      className="h-full w-full overflow-hidden border-l  bg-panel-alt"
    >
      <Component activePath={activePath} tenantId={tenantId} />
    </aside>
  );
}
