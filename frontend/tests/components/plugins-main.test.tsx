// Phase 98 follow-up #6 — `<PluginsMain>` integration coverage.
//
// `PluginsMain` is the tabs host that wires the header (Scan /
// Install / Reload) + the active tab (Installed | Available) +
// the install modal. The internal stores (`usePluginsDoctor`,
// `useAvailablePlugins`) own the data flow; we mock the API
// modules they depend on so the test stays hermetic.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// Mocks BEFORE imports of the modules under test so the stub
// modules are seen by the lazy zustand stores at first call.
vi.mock("../../src/api/plugin_doctor", () => ({
  fetchPluginDoctor: vi.fn().mockResolvedValue({
    report: {
      loaded_ids: ["nexo-plugin-telegram"],
      scanned: 1,
      invalid: 0,
      disabled: 0,
      diagnostics: [],
      init_outcomes: { "nexo-plugin-telegram": "Spawned" },
    },
    generated_at_ms: Date.now(),
  }),
}));
vi.mock("../../src/api/plugin_discovery", () => ({
  searchPlugins: vi.fn().mockResolvedValue({
    items: [],
    fetched_at_ms: Date.now(),
    partial_failures: [],
  }),
  refreshPluginIndex: vi.fn().mockResolvedValue({
    items_count: 0,
    sources_ok: [],
    sources_err: [],
  }),
  compatCheckPlugin: vi.fn(),
}));
vi.mock("../../src/api/admin", () => ({
  adminCall: vi.fn().mockResolvedValue({
    spawned: [],
    stale: [],
    warnings: [],
  }),
}));

import PluginsMain from "../../src/modules/plugins/PluginsMain";
import {
  useAvailablePlugins,
  usePluginsDoctor,
} from "../../src/store/plugins";

beforeEach(() => {
  // Reset zustand state between tests so the previous run's
  // populated catalogue / doctor data doesn't bleed.
  usePluginsDoctor.setState({
    data: null,
    isLoading: false,
    error: null,
    restartInFlight: null,
    lastRestartReport: null,
  });
  useAvailablePlugins.setState({
    data: null,
    isLoading: false,
    error: null,
    filters: {},
    partialFailures: [],
    refreshInFlight: false,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PluginsMain", () => {
  it("renders title + 3 header buttons + 2 tabs", async () => {
    render(<PluginsMain />);
    // Plugins title (i18n key resolves to "Plugins" EN / "Plugins" ES — same).
    expect(screen.getAllByText(/Plugins/).length).toBeGreaterThan(0);
    // 3 header actions: Scan / Install / Reload.
    // Locale-agnostic via regex covering EN+ES labels.
    expect(
      screen.getByRole("button", { name: /^(Scan|Escanear)$/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^(Install plugin|Instalar plugin)$/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^(Reload|Actualizar)$/i }),
    ).toBeTruthy();
    // 2 tabs.
    expect(screen.getAllByRole("tab").length).toBe(2);
  });

  it("starts on Installed tab + switches to Available on click", async () => {
    render(<PluginsMain />);
    // Wait for the doctor data to populate the Installed list.
    await waitFor(() => {
      expect(screen.getByText("nexo-plugin-telegram")).toBeTruthy();
    });
    // Click the Available tab.
    const tabs = screen.getAllByRole("tab");
    const availTab = tabs.find(
      (t) => t.getAttribute("aria-selected") === "false",
    );
    expect(availTab).toBeTruthy();
    fireEvent.click(availTab as HTMLElement);
    // Available tab is now selected; "Installed" tab is not.
    const tabsAfter = screen.getAllByRole("tab");
    const selectedAfter = tabsAfter.find(
      (t) => t.getAttribute("aria-selected") === "true",
    );
    // Selected tab should have the Available label.
    expect(
      selectedAfter?.textContent?.match(/(Available|Disponibles)/i),
    ).toBeTruthy();
  });

  it("opens install modal when header Install button clicked", async () => {
    render(<PluginsMain />);
    const installBtn = screen.getByRole("button", {
      name: /^(Install plugin|Instalar plugin)$/i,
    });
    fireEvent.click(installBtn);
    // Modal renders its own "Install plugin" heading; checking
    // that *some* dialog content appeared is enough (modal has a
    // close button in a way the plain page does not).
    await waitFor(() => {
      // Modal has its own crate-name input. The label text
      // "Crate name" / "Nombre del crate" surfaces.
      const cn =
        screen.queryByText(/Crate name/i) ?? screen.queryByText(/Nombre del crate/i);
      expect(cn).toBeTruthy();
    });
  });
});
