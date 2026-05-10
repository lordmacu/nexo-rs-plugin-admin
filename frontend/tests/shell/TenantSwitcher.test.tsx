import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../src/api/tenants", () => ({
  tenantsList: vi.fn(),
}));

import { TenantSwitcher } from "../../src/shell/TenantSwitcher";
import { useTenantStore } from "../../src/store/tenant";
import { tenantsList } from "../../src/api/tenants";

const tenantsListMock = tenantsList as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  useTenantStore.getState().reset();
  tenantsListMock.mockReset();
});

afterEach(() => {
  tenantsListMock.mockReset();
});

async function loadWith(tenants: Array<{ tenant_id: string; name?: string; active: boolean }>) {
  tenantsListMock.mockResolvedValueOnce(tenants);
  await useTenantStore.getState().loadTenants();
}

describe("TenantSwitcher", () => {
  it("renders a placeholder while loading", () => {
    render(<MemoryRouter><TenantSwitcher /></MemoryRouter>);
    expect(
      screen.getByTestId("tenant-indicator-placeholder"),
    ).toBeInTheDocument();
  });

  it("renders a non-interactive avatar with a single tenant", async () => {
    await loadWith([{ tenant_id: "alpha", name: "Acme", active: true }]);
    render(<MemoryRouter><TenantSwitcher /></MemoryRouter>);
    const indicator = screen.getByTestId("tenant-indicator");
    expect(indicator.tagName.toLowerCase()).toBe("div");
    expect(indicator).toHaveTextContent("A");
  });

  it("renders a button with N tenants and opens a dropdown", async () => {
    await loadWith([
      { tenant_id: "alpha", name: "Acme", active: true },
      { tenant_id: "beta", name: "Beta", active: true },
    ]);
    render(<MemoryRouter><TenantSwitcher /></MemoryRouter>);
    const trigger = screen.getByTestId("tenant-indicator");
    expect(trigger.tagName.toLowerCase()).toBe("button");
    fireEvent.click(trigger);
    expect(screen.getByTestId("tenant-popover")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("switching to another tenant updates the active id", async () => {
    await loadWith([
      { tenant_id: "alpha", name: "Acme", active: true },
      { tenant_id: "beta", name: "Beta", active: true },
    ]);
    render(<MemoryRouter><TenantSwitcher /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("tenant-indicator"));
    fireEvent.click(screen.getByText("Beta"));
    expect(useTenantStore.getState().activeTenantId).toBe("beta");
  });
});
