// Shared zustand store for the `BootstrapState` snapshot the
// app fetches from `nexo/admin/onboarding/bootstrap` at boot.
//
// `BootstrapGate` writes this once on mount + after the wizard
// completes. The Rail reads `paired_devices` to decide whether
// the `chats` module surfaces (an agent with at least one
// channel instance must exist); the chats Sidebar reads the
// same data to filter conversations down to currently-configured
// agents so events from deleted/orphaned agents don't pollute
// the operator's queue.

import { create } from "zustand";

import type { BootstrapState } from "../api/types";

interface BootstrapStore {
  /** Last successful bootstrap snapshot. `null` before the
   *  first fetch resolves; downstream gates treat `null` as
   *  "still loading — be optimistic" to avoid a flash of an
   *  empty rail / empty sidebar on first paint. */
  readonly bootstrap: BootstrapState | null;
  setBootstrap: (b: BootstrapState | null) => void;
}

export const useBootstrap = create<BootstrapStore>((set) => ({
  bootstrap: null,
  setBootstrap: (b) => set({ bootstrap: b }),
}));

/** Set of agent ids that have at least one paired channel
 *  instance. Empty when bootstrap has not loaded yet OR when
 *  no agent owns a pairing — callers should distinguish the
 *  two via the second tuple value (`loaded`). */
export function configuredAgentIds(
  b: BootstrapState | null,
): { readonly ids: ReadonlySet<string>; readonly loaded: boolean } {
  if (b === null) return { ids: new Set(), loaded: false };
  const ids = new Set<string>();
  for (const dev of b.paired_devices) {
    for (const id of dev.agent_ids) ids.add(id);
  }
  return { ids, loaded: true };
}

/** Predicate the chats module + RootRedirect share: at least
 *  one agent has at least one paired channel instance. */
export function hasAgentWithInstance(b: BootstrapState | null): boolean {
  if (b === null) return false;
  if (!b.has_agent) return false;
  return b.paired_devices.length > 0;
}
