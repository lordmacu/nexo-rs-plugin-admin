import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/api/tenants", () => ({
  tenantsList: vi.fn(),
}));

import { tenantsList } from "../../src/api/tenants";
import { useTenantStore } from "../../src/store/tenant";

const tenantsListMock = tenantsList as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  useTenantStore.getState().reset();
  tenantsListMock.mockReset();
});

afterEach(() => {
  tenantsListMock.mockReset();
});

describe("tenant store — loadTenants", () => {
  it("stores the cached list + picks the first active tenant when none persisted", async () => {
    tenantsListMock.mockResolvedValueOnce([
      { tenant_id: "alpha", active: true },
      { tenant_id: "beta", active: true },
    ]);
    await useTenantStore.getState().loadTenants();
    const s = useTenantStore.getState();
    expect(s.status).toBe("ready");
    expect(s.tenants).toHaveLength(2);
    expect(s.activeTenantId).toBe("alpha");
  });

  it("preserves the persisted active id if it is still in the list", async () => {
    localStorage.setItem(
      "shell:active-tenant",
      JSON.stringify({ tenantId: "beta" }),
    );
    // Re-create the store with the persisted value applied to
    // its initial state. Easier to bypass: write the state
    // directly before loadTenants picks it up.
    useTenantStore.setState({ activeTenantId: "beta" });
    tenantsListMock.mockResolvedValueOnce([
      { tenant_id: "alpha", active: true },
      { tenant_id: "beta", active: true },
    ]);
    await useTenantStore.getState().loadTenants();
    expect(useTenantStore.getState().activeTenantId).toBe("beta");
  });

  it("falls back to first tenant when persisted id is no longer authorised", async () => {
    useTenantStore.setState({ activeTenantId: "ghost" });
    tenantsListMock.mockResolvedValueOnce([
      { tenant_id: "alpha", active: true },
    ]);
    await useTenantStore.getState().loadTenants();
    expect(useTenantStore.getState().activeTenantId).toBe("alpha");
  });

  it("captures fetch error in store state", async () => {
    tenantsListMock.mockRejectedValueOnce(new Error("network down"));
    await useTenantStore.getState().loadTenants();
    const s = useTenantStore.getState();
    expect(s.status).toBe("error");
    expect(s.error).toContain("network down");
  });
});

describe("tenant store — setActiveTenantId", () => {
  it("switches when the id is in the cached list", async () => {
    tenantsListMock.mockResolvedValueOnce([
      { tenant_id: "alpha", active: true },
      { tenant_id: "beta", active: true },
    ]);
    await useTenantStore.getState().loadTenants();
    useTenantStore.getState().setActiveTenantId("beta");
    expect(useTenantStore.getState().activeTenantId).toBe("beta");
  });

  it("throws tenant_unauthorised for an unknown id", async () => {
    tenantsListMock.mockResolvedValueOnce([
      { tenant_id: "alpha", active: true },
    ]);
    await useTenantStore.getState().loadTenants();
    expect(() =>
      useTenantStore.getState().setActiveTenantId("ghost"),
    ).toThrow();
  });
});
