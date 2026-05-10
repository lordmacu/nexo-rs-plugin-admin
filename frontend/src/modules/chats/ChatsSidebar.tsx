// Phase 83.13 MVP — thin wrapper around the lib's
// `<ChatsSidebar>` composition primitive. The wrapper exists
// because `ModuleManifest.sidebar` expects a component matching
// `SidebarSlotProps` (`activePath` + `tenantId`); the lib
// component is shell-agnostic and accepts `banner` + `sidebar`
// ReactNode slots, so the agent-creator-specific
// `ConnectionBanner` + `Sidebar` get injected here.

import { ChatsSidebar as LibChatsSidebar } from "@lordmacu/nexo-microapp-ui-react";

import type { SidebarSlotProps } from "../../shell/types";
import ConnectionBanner from "./ConnectionBanner";
import Sidebar from "./Sidebar";

export default function ChatsSidebar(_props: SidebarSlotProps) {
  return (
    <LibChatsSidebar
      banner={<ConnectionBanner />}
      sidebar={<Sidebar />}
    />
  );
}
