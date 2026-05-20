// Phase 99.8 — tests for plugin->module synthesis + registry merge.

import { describe, it, expect, vi } from "vitest";
import { ModuleRegistry } from "../../src/shell/ModuleRegistry";
import {
  pluginEntriesToModules,
  pluginModuleId,
  iconFor,
} from "../../src/shell/pluginContributionModules";
import type { PluginUiEntry } from "../../src/api/types.gen";

const entry = (over: Partial<PluginUiEntry> = {}): PluginUiEntry => ({
  id: "google",
  name: "Google",
  trust_tier: "official",
  contributions: [
    {
      id: "g",
      slot: "core.sidebar.integrations",
      label: "Google",
      icon: "mail",
      order: 5,
      screen: "smtp",
    },
  ],
  screens: [{ id: "smtp", title: "SMTP" }],
  hidden_count: 0,
  ...over,
});

// Minimal valid builtin manifest for `fromGlob`.
const builtinManifest = (id: string, label = id) => ({
  id,
  version: "1.0.0",
  rail: { icon: null, label, order: 1 },
  routes: [],
});

describe("pluginEntriesToModules", () => {
  it("maps one synthetic module per contributing plugin", () => {
    const render = vi.fn(() => null);
    const mods = pluginEntriesToModules([entry()], render);
    expect(mods).toHaveLength(1);
    const m = mods[0].manifest;
    expect(m.id).toBe("plugin-google");
    expect(m.rail.label).toBe("Google");
    expect(m.rail.order).toBeGreaterThanOrEqual(1000);
    expect(m.routes).toHaveLength(1);
    expect(mods[0].disabled).toBe(false);
    expect(mods[0].error).toBeNull();
    expect(render).toHaveBeenCalledWith(entry());
  });

  it("skips plugins with no contributions", () => {
    const mods = pluginEntriesToModules(
      [entry({ contributions: [] })],
      () => null,
    );
    expect(mods).toHaveLength(0);
  });

  it("falls back to plugin name when top contribution has no label", () => {
    const mods = pluginEntriesToModules(
      [
        entry({
          contributions: [
            { id: "g", parent: "x", label: "", icon: null, order: 0 },
          ],
        }),
      ],
      () => null,
    );
    // empty label -> falls back to plugin name
    expect(mods[0].manifest.rail.label).toBe("Google");
  });

  it("pluginModuleId namespaces ids", () => {
    expect(pluginModuleId("google")).toBe("plugin-google");
  });
});

describe("iconFor", () => {
  it("resolves a known lucide name", () => {
    expect(iconFor("mail")).toBeTruthy();
  });
  it("falls back for unknown / absent names", () => {
    expect(iconFor("definitely-not-an-icon")).toBeTruthy();
    expect(iconFor(null)).toBeTruthy();
    expect(iconFor(undefined)).toBeTruthy();
  });
});

describe("ModuleRegistry.merge", () => {
  it("combines builtins + runtime entries", () => {
    const builtins = ModuleRegistry.fromGlob(
      { "../modules/settings/manifest.tsx": { manifest: builtinManifest("settings") } },
      "tenant-1",
    );
    const extra = pluginEntriesToModules([entry()], () => null);
    const merged = ModuleRegistry.merge(builtins, extra);
    const ids = merged.list().map((e) => e.manifest.id);
    expect(ids).toContain("settings");
    expect(ids).toContain("plugin-google");
  });

  it("builtins win on id collision", () => {
    const builtins = ModuleRegistry.fromGlob(
      { "../modules/x/manifest.tsx": { manifest: builtinManifest("x", "builtin") } },
      "tenant-1",
    );
    const extra = pluginEntriesToModules([entry()], () => null).map((m) => ({
      ...m,
      manifest: { ...m.manifest, id: "x", rail: { ...m.manifest.rail, label: "plugin" } },
    }));
    const merged = ModuleRegistry.merge(builtins, extra);
    expect(merged.get("x")?.manifest.rail.label).toBe("builtin");
  });
});
