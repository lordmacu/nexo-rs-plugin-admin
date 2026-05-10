// useUrlState — drop-in `useState` replacement that mirrors
// the value to a URL search param. Used by module sidebars
// so deep-links restore the operator's filter / search /
// open-detail state across refresh + tenant switch.
//
//   const [search, setSearch] = useUrlState("search", "");
//   const [label, setLabel] = useUrlState<string | null>("label", null);
//
// Convention:
//   - Empty string / null / undefined → param removed from URL
//     (clean URLs when state is at default)
//   - JSON serialised — `null`, numbers, booleans, objects all
//     ride through `JSON.stringify`
//   - Param key collisions across modules avoided by namespacing
//     in the caller (`useUrlState("chats.search", ...)`)
//
// Width / pure layout state stays in localStorage (per the
// shell's `usePersistedWidth` hook) — URL is for state the
// operator might want to share or bookmark.

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export function useUrlState<T>(
  key: string,
  fallback: T,
): [T, (value: T) => void] {
  const [params, setParams] = useSearchParams();

  const value = useMemo<T>(() => {
    const raw = params.get(key);
    if (raw === null || raw === "") return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Operator hand-edited the URL with a non-JSON value —
      // fall back rather than throw. Useful when a module
      // bumps a state schema and old bookmarks linger.
      return fallback;
    }
  }, [params, key, fallback]);

  const setValue = useCallback(
    (next: T) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          if (next === null || next === undefined || next === "") {
            updated.delete(key);
          } else {
            updated.set(key, JSON.stringify(next));
          }
          return updated;
        },
        { replace: true },
      );
    },
    [setParams, key],
  );

  return [value, setValue];
}
