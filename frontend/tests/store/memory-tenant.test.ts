// Phase 90 audit fix coverage — memory store actions must scope
// to the operator-selected tenant from `useTenantStore`. Without
// this, switching tenants in the rail had zero effect: list /
// create / delete were hardcoded to "default", silently exposing
// (or worse, deleting) wrong-tenant snapshots.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/api/memory", () => ({
  createSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
  listSnapshots: vi.fn(),
  queryMemory: vi.fn(),
  restoreSnapshot: vi.fn(),
}));

import {
  createSnapshot,
  deleteSnapshot,
  listSnapshots,
  restoreSnapshot,
} from "../../src/api/memory";
import { useMemory } from "../../src/store/memory";
import { useTenantStore } from "../../src/store/tenant";

const listMock = listSnapshots as unknown as ReturnType<typeof vi.fn>;
const deleteMock = deleteSnapshot as unknown as ReturnType<typeof vi.fn>;
const createMock = createSnapshot as unknown as ReturnType<typeof vi.fn>;
const restoreMock = restoreSnapshot as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  listMock.mockReset();
  deleteMock.mockReset();
  createMock.mockReset();
  restoreMock.mockReset();
  // Reset memory store agentId so tests can call without leakage.
  useMemory.setState({
    agentId: "ana",
    snapshots: [],
    snapshotsError: null,
  });
});

afterEach(() => {
  useTenantStore.setState({ activeTenantId: null });
});

describe("memory store tenant scoping", () => {
  it("loadSnapshots passes activeTenantId from rail", async () => {
    useTenantStore.setState({ activeTenantId: "staging" });
    listMock.mockResolvedValueOnce({
      snapshots: [],
      encryption_available: false,
    });
    await useMemory.getState().loadSnapshots();
    expect(listMock).toHaveBeenCalledWith("ana", "staging");
  });

  it("loadSnapshots falls back to 'default' when no active tenant", async () => {
    useTenantStore.setState({ activeTenantId: null });
    listMock.mockResolvedValueOnce({
      snapshots: [],
      encryption_available: false,
    });
    await useMemory.getState().loadSnapshots();
    expect(listMock).toHaveBeenCalledWith("ana", "default");
  });

  it("removeSnapshot passes activeTenantId from rail", async () => {
    useTenantStore.setState({ activeTenantId: "prod" });
    deleteMock.mockResolvedValueOnce({ removed: true });
    await useMemory.getState().removeSnapshot("snap-id");
    expect(deleteMock).toHaveBeenCalledWith("ana", "snap-id", "prod");
  });

  it("createNewSnapshot passes activeTenantId from rail", async () => {
    useTenantStore.setState({ activeTenantId: "prod" });
    createMock.mockResolvedValueOnce({
      snapshot: {
        id: "x",
        agent_id: "ana",
        tenant: "prod",
        created_at_ms: 1,
        bundle_path: "/tmp/x",
        bundle_size_bytes: 0,
        bundle_sha256: "",
        encrypted: false,
        redactions_applied: false,
      },
    });
    await useMemory.getState().createNewSnapshot("pre-deploy", false);
    expect(createMock).toHaveBeenCalledWith("ana", {
      tenant: "prod",
      label: "pre-deploy",
      encrypt: false,
    });
  });

  it("runRestore prefers explicit tenant param over rail (defends against mid-flight switch)", async () => {
    useTenantStore.setState({ activeTenantId: "prod" });
    restoreMock.mockResolvedValueOnce({
      report: {
        agent_id: "ana",
        from_snapshot_id: "snap",
        sqlite_restored_dbs: [],
        state_files_restored: [],
        workers_restarted: false,
        dry_run: true,
      },
    });
    await useMemory.getState().runRestore("snap", true, "staging");
    expect(restoreMock).toHaveBeenCalledWith("ana", "staging", "snap", true);
  });

  it("runRestore falls back to rail's activeTenantId when caller omits tenant", async () => {
    useTenantStore.setState({ activeTenantId: "prod" });
    restoreMock.mockResolvedValueOnce({
      report: {
        agent_id: "ana",
        from_snapshot_id: "snap",
        sqlite_restored_dbs: [],
        state_files_restored: [],
        workers_restarted: false,
        dry_run: true,
      },
    });
    await useMemory.getState().runRestore("snap", true);
    expect(restoreMock).toHaveBeenCalledWith("ana", "prod", "snap", true);
  });
});
