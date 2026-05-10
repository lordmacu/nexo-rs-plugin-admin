// React hook exposing the `ShellContext` handed to module
// `onMount` callbacks + Cmd+K builders.
//
// The shell binds three things together for modules:
//   - the active tenant id (from `useTenant`)
//   - a navigate function (from react-router-dom)
//   - module-invalidation hooks (we re-mount via the
//     `key={activeTenantId}` trick on `<MainArea>`, so
//     `invalidateModule` is a thin wrapper that bumps an
//     internal counter to force a remount even when the
//     tenant didn't change — useful after a manual "reset
//     module state" action from settings).

import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { create } from "zustand";

import type { ShellContext } from "./types";
import { useTenant } from "./useTenant";

interface InvalidationStore {
  /** Per-module counter. Bumped to force a remount of the
   *  module's subtree even when the tenant didn't change. */
  readonly counters: Readonly<Record<string, number>>;
  bump: (moduleId: string) => void;
}

export const useModuleInvalidation = create<InvalidationStore>((set) => ({
  counters: {},
  bump(moduleId) {
    set((state) => ({
      counters: {
        ...state.counters,
        [moduleId]: (state.counters[moduleId] ?? 0) + 1,
      },
    }));
  },
}));

/** Compose the shell-side context for a single render.
 *  Memoised on the inputs so passing it as a prop doesn't
 *  re-render unrelated subtrees on each shell tick. */
export function useShellContext(): ShellContext {
  const { activeTenantId, switchTenant } = useTenant();
  const navigate = useNavigate();
  const bump = useModuleInvalidation((s) => s.bump);

  const memoNavigate = useCallback((to: string) => navigate(to), [navigate]);

  const memoInvalidate = useCallback((id: string) => bump(id), [bump]);

  return useMemo<ShellContext>(
    () => ({
      tenantId: activeTenantId ?? "",
      switchTenant,
      navigate: memoNavigate,
      invalidateModule: memoInvalidate,
    }),
    [activeTenantId, switchTenant, memoNavigate, memoInvalidate],
  );
}
