// M16.7 — Cmd+K palette aggregator.
//
// Each loaded ModuleManifest contributes entries via its
// optional `cmdK(ctx)` function. The orchestrator merges
// them with a small global set (shortcuts, logout) and
// returns a flat ordered list:
//
//   1. active module's entries        (no group label)
//   2. other modules' entries          (grouped by module label)
//   3. global actions                  ('Acciones')
//
// fuzzyRank() reorders the flat list when the operator types.

import type { ModuleEntry } from "../shell/ModuleRegistry";
import type { CmdkActionLike, ShellContext } from "../shell/types";

export type ActionKind = "static" | "module";

/** ActionContext is the legacy shape passed by CmdK.tsx
 *  (navigate + logout + conversation hints). It extends
 *  ShellContext for module-contributed actions; static
 *  global actions read it for navigate/logout. */
export interface ActionContext extends ShellContext {
  readonly logout: () => void;
}

export interface CmdkAction {
  readonly id: string;
  readonly kind: ActionKind;
  readonly label: string;
  /** Single-letter hotkey hint shown on the right (decorative
   *  — actual dispatch is via Enter on the active row). */
  readonly hotkey?: string;
  /** Group label rendered as a divider when the previous
   *  action belongs to a different group. */
  readonly group?: string;
  readonly run: (ctx: ActionContext) => Promise<void> | void;
}

interface BuildArgs {
  readonly entries: readonly ModuleEntry[];
  readonly activeModuleId: string | null;
  readonly shellContext: ShellContext;
}

/** Compose the flat ordered action list. */
export function buildActions(args: BuildArgs): CmdkAction[] {
  const out: CmdkAction[] = [];
  const cmdKCtx = {
    ...args.shellContext,
    activeModuleId: args.activeModuleId ?? "",
  };

  // 1. Active module's entries first (un-grouped — they're
  //    the primary actions for the operator's current focus).
  if (args.activeModuleId) {
    const active = args.entries.find(
      (e) => !e.disabled && e.manifest.id === args.activeModuleId,
    );
    if (active && active.manifest.cmdK) {
      try {
        const items = active.manifest.cmdK(cmdKCtx);
        for (const item of items) out.push(adaptItem(item, undefined));
      } catch (cause) {
        // eslint-disable-next-line no-console
        console.warn(
          `[cmdk] active module "${args.activeModuleId}" cmdK threw`,
          cause,
        );
      }
    }
  }

  // 2. Other modules' entries grouped by their rail label.
  for (const entry of args.entries) {
    if (entry.disabled) continue;
    if (entry.manifest.id === args.activeModuleId) continue;
    if (!entry.manifest.cmdK) continue;
    try {
      const items = entry.manifest.cmdK(cmdKCtx);
      for (const item of items) {
        out.push(adaptItem(item, entry.manifest.rail.label));
      }
    } catch (cause) {
      // eslint-disable-next-line no-console
      console.warn(`[cmdk] module "${entry.manifest.id}" cmdK threw`, cause);
    }
  }

  // 3. Global actions — always last in the curated order.
  out.push({
    id: "shortcuts",
    kind: "static",
    label: "Mostrar atajos de teclado",
    hotkey: "?",
    group: "Acciones",
    // Sentinel: handler in CmdK.tsx flips local state.
    run: () => {
      /* handled in CmdK.tsx */
    },
  });

  out.push({
    id: "logout",
    kind: "static",
    label: "Cerrar sesión",
    group: "Acciones",
    run: ({ logout }) => {
      logout();
    },
  });

  return out;
}

function adaptItem(
  item: CmdkActionLike,
  group: string | undefined,
): CmdkAction {
  const out: CmdkAction = {
    id: item.id,
    kind: "module",
    label: item.label,
    run: (ctx) => item.run(ctx),
  };
  if (item.hotkey !== undefined)
    (out as { hotkey?: string }).hotkey = item.hotkey;
  const resolvedGroup = group ?? item.group;
  if (resolvedGroup !== undefined)
    (out as { group?: string }).group = resolvedGroup;
  return out;
}
