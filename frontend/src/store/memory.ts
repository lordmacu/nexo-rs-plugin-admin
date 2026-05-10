// Phase 90.x.memory — memory store. Holds last query + entries.
// Phase 90.x.memory-snapshot — snapshot list cache.
// Phase 90.x.memory-snapshot.create-restore — create + restore
// flows with dry-run preview state.

import { create } from "zustand";

import {
  createSnapshot,
  deleteSnapshot,
  listSnapshots,
  queryMemory,
  restoreSnapshot,
  type MemoryEntry,
  type RestoreReport,
  type SnapshotMeta,
} from "../api/memory";

interface MemoryState {
  agentId: string;
  query: string;
  entries: MemoryEntry[];
  snapshots: SnapshotMeta[];
  snapshotsError: string | null;
  // Phase 90.x.memory-snapshot.create-restore — drives encrypt
  // toggle availability in the create modal. Refreshed on every
  // loadSnapshots() call.
  encryptionAvailable: boolean;
  // Last dry-run report — rendered as the preview table in the
  // restore modal before the operator commits to destructive
  // apply. Cleared on modal close.
  lastRestoreReport: RestoreReport | null;
  // Distinct in-flight flags so the UI can disable submit
  // buttons + render spinners without colliding with the
  // generic `isLoading` (which is for query).
  createInFlight: boolean;
  restoreInFlight: boolean;
  isLoading: boolean;
  error: string | null;
  setAgentId: (id: string) => void;
  setQuery: (q: string) => void;
  search: () => Promise<void>;
  loadSnapshots: () => Promise<void>;
  removeSnapshot: (id: string) => Promise<void>;
  createNewSnapshot: (
    label: string,
    encrypt: boolean,
  ) => Promise<SnapshotMeta>;
  runRestore: (
    snapshotId: string,
    dryRun: boolean,
    tenant?: string,
  ) => Promise<RestoreReport>;
  clearLastRestoreReport: () => void;
}

export const useMemory = create<MemoryState>((set, get) => ({
  agentId: "",
  query: "",
  entries: [],
  snapshots: [],
  snapshotsError: null,
  encryptionAvailable: false,
  lastRestoreReport: null,
  createInFlight: false,
  restoreInFlight: false,
  isLoading: false,
  error: null,
  setAgentId: (id) => set({ agentId: id }),
  setQuery: (q) => set({ query: q }),
  search: async () => {
    const { agentId, query } = get();
    if (agentId.trim().length === 0) {
      set({ error: "agent_id required", entries: [] });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const r = await queryMemory(agentId.trim(), query.trim(), 20);
      set({ entries: r.entries ?? [], isLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        isLoading: false,
        entries: [],
      });
    }
  },
  loadSnapshots: async () => {
    const { agentId } = get();
    if (agentId.trim().length === 0) {
      set({
        snapshots: [],
        snapshotsError: null,
        encryptionAvailable: false,
      });
      return;
    }
    try {
      const r = await listSnapshots(agentId.trim());
      set({
        snapshots: r.snapshots ?? [],
        snapshotsError: null,
        encryptionAvailable: r.encryption_available === true,
      });
    } catch (e) {
      set({
        snapshotsError: e instanceof Error ? e.message : String(e),
        snapshots: [],
        encryptionAvailable: false,
      });
    }
  },
  removeSnapshot: async (id) => {
    const { agentId } = get();
    if (agentId.trim().length === 0) return;
    try {
      await deleteSnapshot(agentId.trim(), id);
      set({
        snapshots: get().snapshots.filter((s) => s.id !== id),
      });
    } catch (e) {
      set({
        snapshotsError: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  },
  createNewSnapshot: async (label, encrypt) => {
    const { agentId } = get();
    if (agentId.trim().length === 0) {
      throw new Error("agent_id required");
    }
    set({ createInFlight: true, snapshotsError: null });
    try {
      const r = await createSnapshot(agentId.trim(), {
        // The store doesn't carry a tenant selector yet; default
        // matches list/delete behaviour. Multi-tenant operators
        // hit the CLI for non-default until a tenant picker
        // lands in the UI.
        tenant: "default",
        label,
        encrypt,
      });
      // Prepend the fresh snapshot so the panel reflects it
      // without an extra round-trip to listSnapshots.
      set({
        snapshots: [r.snapshot, ...get().snapshots],
        createInFlight: false,
      });
      return r.snapshot;
    } catch (e) {
      set({
        snapshotsError: e instanceof Error ? e.message : String(e),
        createInFlight: false,
      });
      throw e;
    }
  },
  runRestore: async (snapshotId, dryRun, tenant = "default") => {
    const { agentId } = get();
    if (agentId.trim().length === 0) {
      throw new Error("agent_id required");
    }
    set({ restoreInFlight: true, snapshotsError: null });
    try {
      const r = await restoreSnapshot(
        agentId.trim(),
        tenant,
        snapshotId,
        dryRun,
      );
      set({
        lastRestoreReport: r.report,
        restoreInFlight: false,
      });
      // Destructive run captures a pre-restore snapshot — refresh
      // the list so the operator sees it.
      if (!dryRun) {
        // Fire-and-forget; we already returned the report.
        void get().loadSnapshots();
      }
      return r.report;
    } catch (e) {
      set({
        snapshotsError: e instanceof Error ? e.message : String(e),
        restoreInFlight: false,
      });
      throw e;
    }
  },
  clearLastRestoreReport: () => set({ lastRestoreReport: null }),
}));
