// Helper for the shell's resizable panels: read the persisted
// width on mount, debounce writes back via the panel-group's
// onLayout callback. Width is stored as a percent (0..100) so
// it survives viewport resizes — react-resizable-panels works
// in % too.

import { useCallback, useEffect, useRef } from "react";
import { z } from "zod";

import { readShellState, writeShellState } from "./localStorage";

const widthSchema = z.number().min(5).max(80);

export interface PersistedWidth {
  /** Percent of the parent group, clamped 5..80. */
  readonly initial: number;
  /** Wire this into `<PanelGroup onLayout={onLayout}>`. */
  readonly onLayout: (sizes: number[]) => void;
}

/** `index` is which panel of the group owns the persisted
 *  width. The hook only writes when that one panel's size
 *  changes; the other panels are derived. */
export function usePersistedWidth(
  storageKey: string,
  defaultPct: number,
  index = 0,
): PersistedWidth {
  const initial = readShellState(storageKey, widthSchema, defaultPct);
  const timer = useRef<number | null>(null);

  const onLayout = useCallback(
    (sizes: number[]) => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const w = sizes[index];
        if (typeof w === "number") writeShellState(storageKey, w);
      }, 120);
    },
    [storageKey, index],
  );

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  return { initial, onLayout };
}
