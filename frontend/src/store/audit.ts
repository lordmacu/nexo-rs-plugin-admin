// Phase 83.12.audit-page — Zustand store for the audit-log
// page. Pagination state machine + filter slice, mirroring the
// OpenClaw `cron.runs` paging shape (`research/ui/src/ui/
// controllers/cron.test.ts:1235-1265`):
//   - `reload()` resets entries + offset, fetches first page.
//   - `loadMore()` appends from `nextOffset` until `hasMore`
//     is false.
//   - `setFilter()` merges a partial filter; caller must
//     follow with `reload()` to apply.

import { create } from "zustand";

import { auditTail } from "../api/audit";
import type { AdminAuditRow, AuditTailFilter } from "../api/types";

const DEFAULT_LIMIT = 50;
const DEFAULT_SINCE_MS_AGO = 24 * 60 * 60 * 1000;

interface AuditState {
  entries: AdminAuditRow[];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
  filter: AuditTailFilter;
  isLoading: boolean;
  error: string | null;

  /** Merge a partial filter; `offset` is reset to 0 so the next
   *  `reload()` starts a fresh page chain. */
  setFilter: (filter: Partial<AuditTailFilter>) => void;

  /** Discard current entries + fetch the first page of the
   *  current filter. Sets `isLoading` for the duration. */
  reload: () => Promise<void>;

  /** Fetch the next page (offset = previous `nextOffset`) and
   *  append to `entries`. No-op when `hasMore` is false or a
   *  fetch is already in flight. */
  loadMore: () => Promise<void>;
}

function defaultFilter(): AuditTailFilter {
  return {
    limit: DEFAULT_LIMIT,
    offset: 0,
    since_ms: Date.now() - DEFAULT_SINCE_MS_AGO,
  };
}

export const useAudit = create<AuditState>((set, get) => ({
  entries: [],
  total: 0,
  hasMore: false,
  nextOffset: null,
  filter: defaultFilter(),
  isLoading: false,
  error: null,

  setFilter: (partial) => {
    set((state) => ({
      filter: { ...state.filter, ...partial, offset: 0 },
    }));
  },

  reload: async () => {
    if (get().isLoading) return;
    set({ isLoading: true, error: null });
    try {
      const filter = { ...get().filter, offset: 0 };
      const page = await auditTail(filter);
      set({
        entries: page.entries,
        total: page.total,
        hasMore: page.has_more,
        nextOffset: page.next_offset ?? null,
        filter,
        isLoading: false,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ isLoading: false, error: msg });
    }
  },

  loadMore: async () => {
    const state = get();
    if (state.isLoading || !state.hasMore || state.nextOffset === null) return;
    set({ isLoading: true, error: null });
    try {
      const filter = { ...state.filter, offset: state.nextOffset };
      const page = await auditTail(filter);
      set((s) => ({
        entries: [...s.entries, ...page.entries],
        total: page.total,
        hasMore: page.has_more,
        nextOffset: page.next_offset ?? null,
        filter,
        isLoading: false,
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ isLoading: false, error: msg });
    }
  },
}));
