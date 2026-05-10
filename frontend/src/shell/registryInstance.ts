// Module-level singleton holding the active ModuleRegistry.
// `<ShellMount>` sets it after building per-tenant; the
// global Cmd+K palette reads it via `useRegistry()` to
// surface module-contributed entries even when mounted
// outside the shell tree.

import { create } from "zustand";

import type { ModuleRegistry } from "./ModuleRegistry";

interface RegistryStore {
  registry: ModuleRegistry | null;
  setRegistry: (r: ModuleRegistry | null) => void;
}

export const useRegistry = create<RegistryStore>((set) => ({
  registry: null,
  setRegistry: (registry) => set({ registry }),
}));
