// Phase 99 — Plugins sub-link under Settings.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("../../src/api/admin", () => ({
  adminCall: () =>
    Promise.resolve({
      plugin: "google",
      screen_id: "oauth",
      title: "Google OAuth",
      fields: [],
      actions: [],
    }),
}));

import PluginsSettings, {
  PluginScreenRoute,
} from "../../src/modules/settings/PluginsSettings";
import { usePluginContributions } from "../../src/store/pluginContributions";
import type { PluginUiEntry } from "../../src/api/types.gen";

const entry: PluginUiEntry = {
  id: "google",
  name: "Google",
  trust_tier: "official",
  contributions: [
    {
      id: "g",
      slot: "plugin.google.root",
      label: "Google",
      icon: "mail",
      order: 1000,
      screen: "oauth",
    },
  ],
  screens: [{ id: "oauth", title: "Google OAuth" }],
  hidden_count: 0,
};

beforeEach(() => {
  usePluginContributions.setState({
    entries: [],
    status: "idle",
    etag: "",
    error: null,
  });
});

describe("PluginsSettings (list)", () => {
  it("lists installed plugins", () => {
    usePluginContributions.setState({ entries: [entry], status: "ready" });
    render(
      <MemoryRouter>
        <PluginsSettings />
      </MemoryRouter>,
    );
    expect(screen.getByText("Google")).toBeInTheDocument();
    expect(screen.getByText("official")).toBeInTheDocument();
  });

  it("shows the empty state when no plugins contribute", () => {
    usePluginContributions.setState({ entries: [], status: "ready" });
    render(
      <MemoryRouter>
        <PluginsSettings />
      </MemoryRouter>,
    );
    // i18n pinned to Spanish in tests/setup.ts.
    expect(
      screen.getByText(/Ningún plugin instalado aporta/i),
    ).toBeInTheDocument();
  });

  it("shows the denied state without a grant", () => {
    usePluginContributions.setState({ entries: [], status: "denied" });
    render(
      <MemoryRouter>
        <PluginsSettings />
      </MemoryRouter>,
    );
    expect(screen.getByText(/No tienes permiso/i)).toBeInTheDocument();
  });
});

describe("PluginScreenRoute (detail)", () => {
  it("renders the plugin header for a known plugin", () => {
    usePluginContributions.setState({ entries: [entry], status: "ready" });
    render(
      <MemoryRouter initialEntries={["/google"]}>
        <Routes>
          <Route path=":pluginId" element={<PluginScreenRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    // Header shows the plugin name (exact — distinct from "Google OAuth").
    expect(screen.getByText("Google")).toBeInTheDocument();
  });

  it("falls back to a back-link for an unknown plugin", () => {
    usePluginContributions.setState({ entries: [entry], status: "ready" });
    render(
      <MemoryRouter initialEntries={["/ghost"]}>
        <Routes>
          <Route path=":pluginId" element={<PluginScreenRoute />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/Volver a plugins/i)).toBeInTheDocument();
  });
});
